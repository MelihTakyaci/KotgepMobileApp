import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { StyleSheet, View, ActivityIndicator, Text, Platform, TouchableOpacity } from 'react-native';
import { useRoute, useFocusEffect, useNavigation } from '@react-navigation/native';
import * as FileSystem from 'expo-file-system/legacy';
import { WebView } from 'react-native-webview';
import type { WebViewMessageEvent } from 'react-native-webview';
import {
  downloadPdf as downloadForOffline,
  findExistingPdfUri,
  resolveFilename,
} from '../hooks/useDownloadedMagazines';
import { COLORS } from '../theme/theme';
import { PDF_STORAGE_URL } from '../config/constants';

type RouteParams = {
  mode?: 'offline' | 'online';
  uri?: string;
  storageKey?: string;
  articleId?: string;
};

const DEFAULT_PDF_URL = 'https://kotgep.com/dergi/Dergi-Sayi-8.pdf';
const BASE_PDF_URL = PDF_STORAGE_URL;

const isRemoteUri = (value: string | null | undefined) =>
  typeof value === 'string' ? /^https?:\/\//i.test(value) : false;

const isFileUri = (value: string | null | undefined) =>
  typeof value === 'string' ? value.startsWith('file://') : false;

const ensureTrailingSlash = (value: string) => (value.endsWith('/') ? value : `${value}/`);

const getTempViewerDirectory = () => {
  const base = FileSystem.cacheDirectory ?? FileSystem.documentDirectory;
  if (!base) throw new Error('Geçici dizin yok');
  return `${ensureTrailingSlash(base)}pdf-viewer-temp/`;
};

const getPdfJsCacheDirectory = () => {
  const base = FileSystem.cacheDirectory ?? FileSystem.documentDirectory;
  if (!base) throw new Error('Önbellek dizinine erişilemiyor');
  return `${ensureTrailingSlash(base)}pdfjs-cache/`;
};

const PDF_JS_VERSION = '3.11.174';
const PDF_JS_BASE_URL = `https://cdn.jsdelivr.net/npm/pdfjs-dist@${PDF_JS_VERSION}/build`;

type PdfResources = { pdfJs: string; pdfWorker: string };

const escapeForScriptTag = (value: string) => value.replace(/<\/script>/gi, '<\\/script>');

const fetchAndCacheScript = async (fileName: string, url: string) => {
  const cacheDir = getPdfJsCacheDirectory();
  const versionedDir = `${cacheDir}${PDF_JS_VERSION}/`;
  await FileSystem.makeDirectoryAsync(versionedDir, { intermediates: true });
  const targetPath = `${versionedDir}${fileName}`;
  const info = await FileSystem.getInfoAsync(targetPath);
  if (info.exists) return FileSystem.readAsStringAsync(targetPath, { encoding: FileSystem.EncodingType.UTF8 });
  const res = await fetch(url);
  if (!res.ok) throw new Error('PDF.JS indirilemedi');
  const txt = await res.text();
  await FileSystem.writeAsStringAsync(targetPath, txt, { encoding: FileSystem.EncodingType.UTF8 });
  return txt;
};

const loadPdfViewerScripts = async (): Promise<PdfResources> => {
  const [pdfJs, pdfWorker] = await Promise.all([
    fetchAndCacheScript('pdf.min.js', `${PDF_JS_BASE_URL}/pdf.min.js`),
    fetchAndCacheScript('pdf.worker.min.js', `${PDF_JS_BASE_URL}/pdf.worker.min.js`),
  ]);
  return { pdfJs: escapeForScriptTag(pdfJs), pdfWorker };
};

/**
 * Android fast path: PDF referenced via file:// URI — no base64, no bridge transfer.
 * The WebView fetches the PDF natively via fetch(file://...) which bypasses the JS bridge.
 * Requires allowUniversalAccessFromFileURLs={true} on Android.
 */
const buildPdfJsHtmlForFile = (pdfFileUri: string, pdfJsSource: string, pdfWorkerSource: string): string => {
  const workerInit = JSON.stringify(pdfWorkerSource);
  const pdfUriJson = JSON.stringify(pdfFileUri);
  return `<!doctype html><html><head><meta charset="utf-8"/><meta name="viewport" content="width=device-width,initial-scale=1"/><style>html,body{margin:0;padding:0;background:#0f0f0f;color:#fff;height:100%}#viewer{display:flex;flex-direction:column;gap:12px;align-items:center;padding:16px;box-sizing:border-box;max-width:100%;overflow:hidden}canvas{display:block;max-width:100%;height:auto}</style><script>${pdfJsSource}</script></head><body><div id="viewer"></div><script>(function(){var viewer=document.getElementById('viewer');var wb=new Blob([${workerInit}],{type:'text/javascript'});var wu=URL.createObjectURL(wb);pdfjsLib.GlobalWorkerOptions.workerSrc=wu;function notify(m){if(window.ReactNativeWebView)window.ReactNativeWebView.postMessage(m);}function showError(msg){viewer.innerHTML='';var b=document.createElement('div');b.style.padding='16px';b.style.background='rgba(255,85,85,0.15)';b.style.borderRadius='8px';b.textContent=msg||'PDF açılamadı';viewer.appendChild(b);notify(JSON.stringify({type:'error',message:msg||'render-error'}));}function renderPage(pdf,n,total,maxW){pdf.getPage(n).then(function(page){var base=page.getViewport({scale:1});var scale=Math.min(1.25,Math.max(0.5,maxW/base.width));var vp=page.getViewport({scale:scale});var canvas=document.createElement('canvas');var ctx=canvas.getContext('2d');canvas.height=vp.height;canvas.width=vp.width;canvas.style.width='100%';canvas.style.height='auto';viewer.appendChild(canvas);page.render({canvasContext:ctx,viewport:vp}).promise.then(function(){if(n===1){notify(JSON.stringify({type:'firstPage',total:total}));}if(n===total){notify('pdf-render-complete');}}).catch(function(){showError('Sayfa çizilemedi');});}).catch(function(){showError('Sayfa yüklenemedi');});}var pdfUri=${pdfUriJson};var maxW=Math.max(320,Math.min((window.innerWidth||800)-32,1200));fetch(pdfUri).then(function(r){if(!r.ok)throw new Error('HTTP '+r.status);return r.arrayBuffer();}).then(function(buf){return pdfjsLib.getDocument({data:new Uint8Array(buf)}).promise;}).then(function(pdf){var total=pdf.numPages;notify(JSON.stringify({type:'total',total:total}));renderPage(pdf,1,total,maxW);for(var i=2;i<=total;i++){(function(n){setTimeout(function(){renderPage(pdf,n,total,maxW);},(n-1)*80);})(i);}}).catch(function(e){showError('PDF yüklenemedi: '+(e&&e.message));});window.addEventListener('unload',function(){URL.revokeObjectURL(wu);});})();</script></body></html>`;
};

/**
 * iOS / fallback: base64 embedded approach (existing, unchanged logic).
 * Sends the entire PDF as a base64 string through the JS bridge.
 */
const buildPdfJsHtml = (base64Data: string, pdfJsSource: string, pdfWorkerSource: string): string => {
  const workerInit = JSON.stringify(pdfWorkerSource);
  const pdfBase64Json = JSON.stringify(base64Data);
  return `<!doctype html><html><head><meta charset="utf-8" /><meta name="viewport" content="width=device-width,initial-scale=1" /><style>html,body{margin:0;padding:0;background:#0f0f0f;color:#fff;height:100%}#viewer{display:flex;flex-direction:column;gap:12px;align-items:center;padding:16px;box-sizing:border-box;max-width:100%;overflow:hidden}canvas{display:block;max-width:100%;height:auto}</style><script>${pdfJsSource}</script></head><body><div id="viewer"></div><script>(function(){const viewer=document.getElementById('viewer');const wb=new Blob([${workerInit}],{type:'text/javascript'});const wu=URL.createObjectURL(wb);pdfjsLib.GlobalWorkerOptions.workerSrc=wu;function notify(m){if(window.ReactNativeWebView)window.ReactNativeWebView.postMessage(m);}function showError(msg){viewer.innerHTML='';const b=document.createElement('div');b.style.padding='16px';b.style.background='rgba(255,85,85,0.15)';b.style.borderRadius='8px';b.textContent=msg||'PDF açılamadı';viewer.appendChild(b);notify(JSON.stringify({type:'error',message:msg||'render-error'}));}try{const base64=${pdfBase64Json};const binary=atob(base64);const len=binary.length;const bytes=new Uint8Array(len);for(let i=0;i<len;i++)bytes[i]=binary.charCodeAt(i);const maxW=Math.max(320,Math.min((window.innerWidth||800)-32,1200));pdfjsLib.getDocument({data:bytes}).promise.then(function(pdf){const total=pdf.numPages;notify(JSON.stringify({type:'total',total:total}));let rendered=0;const renderPage=function(n){pdf.getPage(n).then(function(page){const base=page.getViewport({scale:1});const scale=Math.min(1.25,Math.max(0.5,maxW/base.width));const vp=page.getViewport({scale:scale});const canvas=document.createElement('canvas');const ctx=canvas.getContext('2d');canvas.height=vp.height;canvas.width=vp.width;canvas.style.width='100%';canvas.style.height='auto';viewer.appendChild(canvas);page.render({canvasContext:ctx,viewport:vp}).promise.then(function(){rendered++;if(rendered===1){notify(JSON.stringify({type:'firstPage',total:total}));}if(rendered===total){notify('pdf-render-complete');}}).catch(function(){showError('Sayfa çizilemedi');});}).catch(function(){showError('Sayfa yüklenemedi');});};const seq=function(n){if(n>total)return;renderPage(n);requestAnimationFrame(function(){seq(n+1);});};seq(1);}).catch(function(){showError('PDF açılamadı');});}catch(e){showError('PDF işlenemedi');}window.addEventListener('unload',function(){URL.revokeObjectURL(wu);});})();</script></body></html>`;
};

// ── Module-level caches (persist across screen navigations) ──────────────────

const pdfResourcesCache: { promise: Promise<PdfResources> | null; data: PdfResources | null } = {
  promise: null,
  data: null,
};

/** Android: localFileUri → viewer HTML file path on disk */
const viewerFileUriCache = new Map<string, string>();

/** iOS/fallback: signature key → rendered HTML string */
const pdfBase64Cache = new Map<string, string>();
const pdfBase64Promises = new Map<string, Promise<string>>();
const viewerHtmlCache = new Map<string, string>();

const tempDownloadPromises = new Map<string, Promise<string>>();
const MAX_CACHED_VIEWS = 6;

const trimCache = <T,>(map: Map<string, T>) => {
  while (map.size > MAX_CACHED_VIEWS) {
    const k = map.keys().next().value;
    if (typeof k === 'undefined') break;
    map.delete(k);
  }
};

const getPdfJsResources = async () => {
  if (pdfResourcesCache.data) return pdfResourcesCache.data;
  if (!pdfResourcesCache.promise) {
    pdfResourcesCache.promise = loadPdfViewerScripts()
      .then((r) => { pdfResourcesCache.data = r; pdfResourcesCache.promise = null; return r; })
      .catch((e) => { pdfResourcesCache.promise = null; throw e; });
  }
  return pdfResourcesCache.promise;
};

const downloadPdfForOnlineViewing = async (remoteUrl: string, key: string): Promise<string> => {
  const cacheKey = `${key}::${remoteUrl}`;
  if (tempDownloadPromises.has(cacheKey)) return tempDownloadPromises.get(cacheKey)!;
  const promise = (async () => {
    const tempDir = getTempViewerDirectory();
    await FileSystem.makeDirectoryAsync(tempDir, { intermediates: true });
    const targetPath = `${tempDir}${resolveFilename(key)}`;
    const tempPath = `${targetPath}.download`;
    try {
      const { status, uri } = await FileSystem.downloadAsync(remoteUrl, tempPath);
      if (status && (status < 200 || status >= 300)) throw new Error('İndirme başarısız');
      await FileSystem.deleteAsync(targetPath, { idempotent: true });
      await FileSystem.moveAsync({ from: uri, to: targetPath });
      return targetPath;
    } catch (e) {
      await FileSystem.deleteAsync(tempPath, { idempotent: true });
      throw e;
    }
  })().finally(() => tempDownloadPromises.delete(cacheKey));
  tempDownloadPromises.set(cacheKey, promise);
  return promise;
};

// ── Component ─────────────────────────────────────────────────────────────────

export default function PdfReaderScreen() {
  const route = useRoute();
  const navigation = useNavigation();
  const { mode = 'offline', uri, storageKey } = (route.params || {}) as RouteParams;

  const [loading, setLoading] = useState(true);
  const [localFileUri, setLocalFileUri] = useState<string | null>(null);
  /** Android: file:// URI of viewer HTML written to disk */
  const [viewerFileUri, setViewerFileUri] = useState<string | null>(null);
  /** iOS/fallback: HTML string passed through the bridge */
  const [viewerHtml, setViewerHtml] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [totalPages, setTotalPages] = useState<number | null>(null);
  const [firstPageReady, setFirstPageReady] = useState(false);
  const [loadingStage, setLoadingStage] = useState<'download' | 'prepare' | 'render'>('download');

  const tempOnlineFileRef = useRef<string | null>(null);

  const cleanupTempFile = useCallback(async () => {
    if (!tempOnlineFileRef.current) return;
    const p = tempOnlineFileRef.current;
    tempOnlineFileRef.current = null;
    try { await FileSystem.deleteAsync(p, { idempotent: true }); } catch {}
  }, []);

  useEffect(() => () => {
    if (tempOnlineFileRef.current) {
      const p = tempOnlineFileRef.current;
      tempOnlineFileRef.current = null;
      FileSystem.deleteAsync(p, { idempotent: true }).catch(() => {});
    }
  }, []);

  const effectiveKey = useMemo(() => storageKey ?? uri ?? DEFAULT_PDF_URL, [storageKey, uri]);

  // ── Phase 1: Resolve local file URI ─────────────────────────────────────────
  useFocusEffect(
    useCallback(() => {
      let cancelled = false;
      const prepare = async () => {
        setLoading(true);
        setError(null);
        setLocalFileUri(null);
        setViewerFileUri(null);
        setViewerHtml(null);
        setTotalPages(null);
        setFirstPageReady(false);
        setLoadingStage('download');

        // Start pre-fetching PDF.js resources in the background immediately
        getPdfJsResources().catch(() => {});

        try {
          if (mode === 'online') {
            const remoteUrl = (isRemoteUri(uri) && uri) || DEFAULT_PDF_URL;
            if (cancelled) return;

            if (storageKey) {
              try {
                const existing = await findExistingPdfUri(storageKey);
                if (!cancelled && existing) {
                  await cleanupTempFile();
                  setLocalFileUri(existing.uri);
                  return;
                }
              } catch {}
            }

            await cleanupTempFile();
            const tempPath = await downloadPdfForOnlineViewing(remoteUrl, effectiveKey);
            if (cancelled) { await FileSystem.deleteAsync(tempPath, { idempotent: true }); return; }
            tempOnlineFileRef.current = tempPath;
            setLocalFileUri(tempPath);
            return;
          }

          await cleanupTempFile();

          if (uri && isFileUri(uri)) {
            const info = await FileSystem.getInfoAsync(uri);
            if (!info.exists) throw new Error('Yerel PDF bulunamadı');
            if (!cancelled) { setLocalFileUri(uri); return; }
          }

          try {
            const existing = await findExistingPdfUri(effectiveKey);
            if (!cancelled && existing) { setLocalFileUri(existing.uri); return; }
          } catch {}

          const downloadSource = (uri && isRemoteUri(uri) && uri) || DEFAULT_PDF_URL;
          const localPath = await downloadForOffline(effectiveKey, downloadSource);
          if (!cancelled) setLocalFileUri(localPath);
        } catch {
          if (!cancelled) { setError('PDF hazırlanamadı'); setLoading(false); }
        }
      };
      prepare();
      return () => { cancelled = true; };
    }, [mode, uri, storageKey, effectiveKey, cleanupTempFile])
  );

  // ── Phase 2: Build viewer (Android: write HTML file; iOS: build HTML string) ─
  useEffect(() => {
    let cancelled = false;
    const prepareViewer = async () => {
      if (!localFileUri) { setViewerFileUri(null); setViewerHtml(null); return; }

      setLoadingStage('prepare');

      try {
        const { pdfJs, pdfWorker } = await getPdfJsResources();

        if (Platform.OS === 'android') {
          // ── Android fast path ─────────────────────────────────────────────
          // Write a small HTML file (~400KB, pdfJs embedded) that references the
          // PDF via its file:// URI. The WebView fetches the PDF natively —
          // no base64 encoding, no JS bridge serialization of the PDF bytes.
          const cacheKey = localFileUri;
          if (viewerFileUriCache.has(cacheKey)) {
            if (!cancelled) { setViewerFileUri(viewerFileUriCache.get(cacheKey)!); }
            return;
          }

          const html = buildPdfJsHtmlForFile(localFileUri, pdfJs, pdfWorker);
          const tempDir = getTempViewerDirectory();
          await FileSystem.makeDirectoryAsync(tempDir, { intermediates: true });
          const safeKey = effectiveKey.replace(/[^a-zA-Z0-9]/g, '_').slice(-40);
          const htmlPath = `${tempDir}viewer_${safeKey}.html`;
          await FileSystem.writeAsStringAsync(htmlPath, html, { encoding: FileSystem.EncodingType.UTF8 });

          if (!cancelled) {
            viewerFileUriCache.set(cacheKey, htmlPath);
            trimCache(viewerFileUriCache);
            setViewerFileUri(htmlPath);
          }
        } else {
          // ── iOS / fallback: base64 approach ──────────────────────────────
          const fileInfo = await FileSystem.getInfoAsync(localFileUri);
          if (!fileInfo.exists) throw new Error('Yerel PDF yok');
          const signature = `${fileInfo.size ?? 'na'}-${fileInfo.modificationTime ?? 'na'}`;
          const cacheKey = `${effectiveKey}|${signature}`;

          if (viewerHtmlCache.has(cacheKey)) {
            if (!cancelled) setViewerHtml(viewerHtmlCache.get(cacheKey)!);
            return;
          }

          const base64Promise = pdfBase64Cache.has(cacheKey)
            ? Promise.resolve(pdfBase64Cache.get(cacheKey)!)
            : (() => {
                if (!pdfBase64Promises.has(cacheKey)) {
                  const p = FileSystem.readAsStringAsync(localFileUri, { encoding: FileSystem.EncodingType.Base64 })
                    .then((d) => { pdfBase64Cache.set(cacheKey, d); trimCache(pdfBase64Cache); pdfBase64Promises.delete(cacheKey); return d; })
                    .catch((e) => { pdfBase64Promises.delete(cacheKey); throw e; });
                  pdfBase64Promises.set(cacheKey, p);
                }
                return pdfBase64Promises.get(cacheKey)!;
              })();

          const resolvedBase64 = await base64Promise;
          const html = buildPdfJsHtml(resolvedBase64, pdfJs, pdfWorker);
          if (!cancelled) {
            viewerHtmlCache.set(cacheKey, html);
            trimCache(viewerHtmlCache);
            setViewerHtml(html);
          }
        }
      } catch {
        if (!cancelled) { setError('PDF içerik hazırlanamıyor'); setLoading(false); }
      }
    };
    prepareViewer();
    return () => { cancelled = true; };
  }, [localFileUri, effectiveKey]);

  // ── WebView message handler ───────────────────────────────────────────────
  const handleWebViewMessage = useCallback((event: WebViewMessageEvent) => {
    const payload = event.nativeEvent.data;

    if (payload === 'pdf-render-complete') {
      setLoading(false);
      return;
    }

    try {
      const parsed = JSON.parse(payload);
      if (parsed?.type === 'total') {
        setTotalPages(parsed.total);
      } else if (parsed?.type === 'firstPage') {
        setFirstPageReady(true);
        setTotalPages(parsed.total ?? totalPages);
        setLoading(false); // hide overlay after first page — user can already read
      } else if (parsed?.type === 'error') {
        setError('Görüntüleyici hata verdi');
        setLoading(false);
      }
    } catch {}
  }, [totalPages]);

  const handleWebViewError = useCallback(() => {
    setError('Görüntüleyici hata verdi');
    setLoading(false);
  }, []);

  // ── Render ────────────────────────────────────────────────────────────────
  const hasViewer = Platform.OS === 'android' ? !!viewerFileUri : !!viewerHtml;

  const webViewSource = Platform.OS === 'android' && viewerFileUri
    ? ({ uri: viewerFileUri } as const)
    : viewerHtml
    ? ({ html: viewerHtml, baseUrl: '' } as const)
    : null;

  const loadingMessage =
    loadingStage === 'download' ? 'PDF indiriliyor…' :
    loadingStage === 'prepare'  ? 'PDF hazırlanıyor…' :
    'Sayfalar yükleniyor…';

  return (
    <View style={styles.container}>
      {/* Loading overlay — hidden after first page renders */}
      {loading && (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={COLORS.primary} />
          <Text style={styles.loadingLabel}>{loadingMessage}</Text>
          <TouchableOpacity style={styles.cancelButton} onPress={() => navigation.goBack()}>
            <Text style={styles.cancelButtonText}>İptal</Text>
          </TouchableOpacity>
        </View>
      )}

      {error ? (
        <View style={styles.errorBox}>
          <Text style={styles.errorText}>{error}</Text>
          <TouchableOpacity style={styles.retryButton} onPress={() => navigation.goBack()}>
            <Text style={styles.retryButtonText}>Geri Dön</Text>
          </TouchableOpacity>
        </View>
      ) : webViewSource ? (
        <WebView
          originWhitelist={['*']}
          source={webViewSource}
          style={styles.webView}
          onError={handleWebViewError}
          onHttpError={handleWebViewError}
          allowFileAccess
          allowFileAccessFromFileURLs
          allowUniversalAccessFromFileURLs={Platform.OS === 'android'}
          javaScriptEnabled
          domStorageEnabled
          androidLayerType="hardware"
          startInLoadingState={false}
          overScrollMode="never"
          onMessage={handleWebViewMessage}
        />
      ) : null}

      {/* Page count badge — visible after first page renders */}
      {firstPageReady && totalPages !== null && totalPages > 1 && (
        <View style={styles.pageBadge}>
          <Text style={styles.pageBadgeText}>{totalPages} sayfa</Text>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#fff' },
  loadingContainer: {
    position: 'absolute',
    zIndex: 10,
    left: 0, right: 0, top: 0, bottom: 0,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 16,
    backgroundColor: 'rgba(255,255,255,0.93)',
  },
  loadingLabel: { marginTop: 12, fontSize: 14, fontWeight: '500', color: '#1F2933' },
  cancelButton: {
    marginTop: 24,
    paddingVertical: 10,
    paddingHorizontal: 28,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  cancelButtonText: { fontSize: 14, fontWeight: '600', color: '#6B7280' },
  errorBox: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 24 },
  errorText: { color: '#DC2626', textAlign: 'center', fontSize: 15, marginBottom: 20 },
  retryButton: {
    paddingVertical: 10,
    paddingHorizontal: 28,
    borderRadius: 8,
    backgroundColor: COLORS.primary,
  },
  retryButtonText: { color: '#fff', fontWeight: '700', fontSize: 14 },
  webView: { flex: 1, backgroundColor: '#1c1c1c' },
  pageBadge: {
    position: 'absolute',
    bottom: 20,
    right: 16,
    backgroundColor: 'rgba(0,0,0,0.6)',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 999,
  },
  pageBadgeText: { color: '#fff', fontSize: 12, fontWeight: '600' },
});
