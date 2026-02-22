import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { StyleSheet, View, ActivityIndicator, Text, Platform } from 'react-native';
import { useRoute, useFocusEffect, useNavigation } from '@react-navigation/native';
import * as FileSystem from 'expo-file-system/legacy';
import { WebView } from 'react-native-webview';
import type { WebViewMessageEvent } from 'react-native-webview';
import {
  downloadPdf as downloadForOffline,
  findExistingPdfUri,
  resolveFilename,
} from '../hooks/useDownloadedMagazines';
import { supabase } from '../services/supabase';
import { COLORS } from '../theme/theme';
import { PDF_STORAGE_URL } from '../config/constants';

type RouteParams = {
  mode?: 'offline' | 'online';
  uri?: string; // remote url or file://
  storageKey?: string; // key used for local storage
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

const buildPdfJsHtml = (base64Data: string, pdfJsSource: string, pdfWorkerSource: string) => {
  const workerInitializer = JSON.stringify(pdfWorkerSource);
  const pdfBase64Json = JSON.stringify(base64Data);
  // Render pages responsively: compute a scale per page so canvases fit the device width
  return `<!doctype html><html><head><meta charset="utf-8" /><meta name="viewport" content="width=device-width,initial-scale=1" /><style>html,body{margin:0;padding:0;background:#0f0f0f;color:#fff;height:100%}#viewer{display:flex;flex-direction:column;gap:12px;align-items:center;padding:16px;box-sizing:border-box;max-width:100%;overflow:hidden}canvas{display:block;max-width:100%;height:auto}</style><script>${pdfJsSource}</script></head><body><div id="viewer"></div><script>(function(){const viewer=document.getElementById('viewer');const workerBlob=new Blob([${workerInitializer}],{type:'text/javascript'});const workerUrl=URL.createObjectURL(workerBlob);pdfjsLib.GlobalWorkerOptions.workerSrc=workerUrl;function notify(m){if(window.ReactNativeWebView)window.ReactNativeWebView.postMessage(m);}function showError(msg){viewer.innerHTML='';const box=document.createElement('div');box.style.padding='16px';box.style.background='rgba(255,85,85,0.15)';box.style.borderRadius='8px';box.textContent=msg||'PDF açılamadı';viewer.appendChild(box);notify(JSON.stringify({type:'error',message:msg||'render-error'}));}try{const base64=${pdfBase64Json};const binary=atob(base64);const len=binary.length;const bytes=new Uint8Array(len);for(let i=0;i<len;i++)bytes[i]=binary.charCodeAt(i);pdfjsLib.getDocument({data:bytes}).promise.then(function(pdf){const total=pdf.numPages;let rendered=0;const containerPadding = 32;const maxContainerWidth = Math.max(320, Math.min(window.innerWidth || 800, 1200) - containerPadding);const renderPage=function(pageNumber){pdf.getPage(pageNumber).then(function(page){const baseViewport = page.getViewport({scale:1});const targetScale = Math.min(1.25, Math.max(0.5, maxContainerWidth / baseViewport.width));const viewport = page.getViewport({scale: targetScale});const canvas=document.createElement('canvas');const ctx=canvas.getContext('2d');canvas.height=viewport.height;canvas.width=viewport.width;viewer.appendChild(canvas); // ensure canvas visually fits
canvas.style.width = '100%';canvas.style.height = 'auto';page.render({canvasContext:ctx,viewport:viewport}).promise.then(function(){rendered++;if(rendered===total){notify('pdf-render-complete');}}).catch(function(){showError('Sayfa çizilemedi');});}).catch(function(){showError('Sayfa yüklenemedi');});};const renderSequentially=function(n){if(n>total)return;renderPage(n);requestAnimationFrame(function(){renderSequentially(n+1);});};renderSequentially(1);}).catch(function(){showError('PDF açılamadı');});}catch(e){console.error(e);showError('PDF işlenemedi');}window.addEventListener('unload',function(){URL.revokeObjectURL(workerUrl);});})();</script></body></html>`;
};

const pdfResourcesCache: { promise: Promise<PdfResources> | null; data: PdfResources | null } = { promise: null, data: null };
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
      .then((r) => {
        pdfResourcesCache.data = r;
        pdfResourcesCache.promise = null;
        return r;
      })
      .catch((e) => {
        pdfResourcesCache.promise = null;
        throw e;
      });
  }
  return pdfResourcesCache.promise;
};

const downloadPdfForOnlineViewing = async (remoteUrl: string, key: string) => {
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

export default function PdfReaderScreen() {
  const route = useRoute();
  const navigation = useNavigation();
  const { mode = 'offline', uri, storageKey, articleId } = (route.params || {}) as RouteParams;

  const [loading, setLoading] = useState(true);
  const [localFileUri, setLocalFileUri] = useState<string | null>(null);
  const [viewerHtml, setViewerHtml] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const tempOnlineFileRef = useRef<string | null>(null);
  const cleanupTempFile = useCallback(async () => {
    if (!tempOnlineFileRef.current) return;
    const p = tempOnlineFileRef.current;
    tempOnlineFileRef.current = null;
    try {
      await FileSystem.deleteAsync(p, { idempotent: true });
    } catch {
      // cleanup failure is non-critical
    }
  }, []);

  useEffect(() => () => { cleanupTempFile().catch(() => {}); }, [cleanupTempFile]);

  const effectiveKey = useMemo(() => storageKey ?? uri ?? DEFAULT_PDF_URL, [storageKey, uri]);

  useFocusEffect(
    useCallback(() => {
      let cancelled = false;
      const prepare = async () => {
        setLoading(true);
        setError(null);
        setLocalFileUri(null);
        setViewerHtml(null);

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
              } catch { /* local check failed, proceed to download */ }
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
          } catch { /* local lookup failed, proceed to download */ }

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

  useEffect(() => {
    let cancelled = false;
    const prepareHtml = async () => {
      if (!localFileUri) { setViewerHtml(null); return; }
      try {
        const fileInfo = await FileSystem.getInfoAsync(localFileUri);
        if (!fileInfo.exists) throw new Error('Yerel PDF yok');
        const signature = `${fileInfo.size ?? 'na'}-${fileInfo.modificationTime ?? 'na'}`;
        const cacheKey = `${effectiveKey}|${signature}`;

        if (viewerHtmlCache.has(cacheKey)) { if (!cancelled) setViewerHtml(viewerHtmlCache.get(cacheKey)!); return; }

        let base64 = pdfBase64Cache.get(cacheKey);
        const base64Promise = base64 ? Promise.resolve(base64) : (() => {
          if (!pdfBase64Promises.has(cacheKey)) {
            const p = FileSystem.readAsStringAsync(localFileUri, { encoding: FileSystem.EncodingType.Base64 })
              .then((d) => { pdfBase64Cache.set(cacheKey, d); trimCache(pdfBase64Cache); pdfBase64Promises.delete(cacheKey); return d; })
              .catch((e) => { pdfBase64Promises.delete(cacheKey); throw e; });
            pdfBase64Promises.set(cacheKey, p);
          }
          return pdfBase64Promises.get(cacheKey)!;
        })();

        const [resolvedBase64, { pdfJs, pdfWorker }] = await Promise.all([base64Promise, getPdfJsResources()]);
        const html = buildPdfJsHtml(resolvedBase64, pdfJs, pdfWorker);
        if (!cancelled) { viewerHtmlCache.set(cacheKey, html); trimCache(viewerHtmlCache); setViewerHtml(html); }
      } catch {
        if (!cancelled) { setError('PDF içerik hazırlanamıyor'); setLoading(false); }
      }
    };
    prepareHtml();
    return () => { cancelled = true; };
  }, [localFileUri, effectiveKey]);

  const handleWebViewMessage = (event: WebViewMessageEvent) => {
    const payload = event.nativeEvent.data;
    if (payload === 'pdf-render-complete') { setLoading(false); return; }
    try { const parsed = JSON.parse(payload); if (parsed?.type === 'error') { setError('Görüntüleyici hata verdi'); setLoading(false); } } catch (e) { }
  };

  const handleWebViewError = () => { setError('Görüntüleyici hata verdi'); setLoading(false); };

  return (
    <View style={styles.container}>
      {loading && (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={COLORS.primary} />
          <Text style={styles.loadingLabel}>PDF hazırlanıyor…</Text>
        </View>
      )}

      {error ? (
        <View style={styles.errorBox}><Text style={styles.errorText}>{error}</Text></View>
      ) : viewerHtml ? (
        <WebView
          originWhitelist={["*"]}
          source={{ html: viewerHtml, baseUrl: '' }}
          style={styles.webView}
          onError={handleWebViewError}
          onHttpError={handleWebViewError}
          allowFileAccess={Platform.OS === 'android'}
          allowFileAccessFromFileURLs={Platform.OS === 'android'}
          allowUniversalAccessFromFileURLs={Platform.OS === 'android'}
          javaScriptEnabled
          domStorageEnabled
          androidLayerType="hardware"
          startInLoadingState
          overScrollMode="never"
          onMessage={handleWebViewMessage}
        />
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#fff' },
  loadingContainer: { position: 'absolute', zIndex: 10, left: 0, right: 0, top: 0, bottom: 0, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 16, backgroundColor: 'rgba(255,255,255,0.6)' },
  loadingLabel: { marginTop: 12, fontSize: 14, fontWeight: '500', color: '#1F2933' },
  errorBox: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 24 },
  errorText: { color: 'red', textAlign: 'center' },
  webView: { flex: 1, backgroundColor: '#1c1c1c' },
});
