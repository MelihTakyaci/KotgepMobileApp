// HomeScreen.tsx
import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { StyleSheet, View, ActivityIndicator, Text, Platform } from 'react-native';
import { useRoute, useFocusEffect } from '@react-navigation/native';
import * as FileSystem from 'expo-file-system/legacy';
import { WebView } from 'react-native-webview';
import type { WebViewMessageEvent } from 'react-native-webview';
import {
  downloadPdf as downloadForOffline,
  findExistingPdfUri,
  resolveFilename,
} from '../hooks/useDownloadedMagazines';

// =======================
// AYARLAR / SABİTLER
// =======================
const DEFAULT_PDF_URL = 'https://kotgep.com/dergi/Dergi-Sayi-8.pdf';

type RouteParams = {
  mode?: 'offline' | 'online'; // offline: yerelden aç, online: DB'den URL çek
  articleId?: string;          // online modda DB'den URL çekerken referans
  uri?: string;                // override için: özel PDF linki (remote veya local)
  storageKey?: string;         // indirme klasöründe kullanılacak anahtar
};

// =======================
// PLACEHOLDER: DB'DEN URL ÇEKME
// Burayı kendi API'nle değiştir (Supabase/Firestore/REST vs.)
// =======================
async function fetchPdfUrlFromDB(articleId?: string): Promise<string> {
  // Örnek: id geldiyse onun URL'sini ver, yoksa default
  // TODO: kendi endpoint’ine GET çağrısı yapıp JSON’dan pdfUrl al:
  // const res = await fetch(`https://api.senin-domenin.com/articles/${articleId}`);
  // const { pdfUrl } = await res.json();
  // return pdfUrl;

  return DEFAULT_PDF_URL;
}

const isRemoteUri = (value: string | null | undefined) =>
  typeof value === 'string' ? /^https?:\/\//i.test(value) : false;

const isFileUri = (value: string | null | undefined) =>
  typeof value === 'string' ? value.startsWith('file://') : false;

const ensureTrailingSlash = (value: string) => (value.endsWith('/') ? value : `${value}/`);

const getTempViewerDirectory = () => {
  const base = FileSystem.cacheDirectory ?? FileSystem.documentDirectory;
  if (!base) {
    throw new Error('Geçici depolama dizinine erişilemedi.');
  }
  return `${ensureTrailingSlash(base)}pdf-viewer-temp/`;
};

const getPdfJsCacheDirectory = () => {
  const base = FileSystem.cacheDirectory ?? FileSystem.documentDirectory;
  if (!base) {
    throw new Error('PDF görüntüleyici önbelleğine erişilemedi.');
  }
  return `${ensureTrailingSlash(base)}pdfjs-cache/`;
};

const PDF_JS_VERSION = '3.11.174';
const PDF_JS_BASE_URL = `https://cdn.jsdelivr.net/npm/pdfjs-dist@${PDF_JS_VERSION}/build`;

const escapeForScriptTag = (value: string) => value.replace(/<\/script>/gi, '<\\/script>');

const fetchAndCacheScript = async (fileName: string, url: string) => {
  const cacheDir = getPdfJsCacheDirectory();
  const versionedDir = `${cacheDir}${PDF_JS_VERSION}/`;
  await FileSystem.makeDirectoryAsync(versionedDir, { intermediates: true });
  const targetPath = `${versionedDir}${fileName}`;

  const info = await FileSystem.getInfoAsync(targetPath);
  if (info.exists) {
    return FileSystem.readAsStringAsync(targetPath, {
      encoding: FileSystem.EncodingType.UTF8,
    });
  }

  const response = await fetch(url);
  if (!response.ok) {
    throw new Error(`PDF görüntüleyici betiği indirilemedi (durum ${response.status}).`);
  }
  const scriptBody = await response.text();
  await FileSystem.writeAsStringAsync(targetPath, scriptBody, {
    encoding: FileSystem.EncodingType.UTF8,
  });
  return scriptBody;
};

const loadPdfViewerScripts = async () => {
  const [pdfJs, pdfWorker] = await Promise.all([
    fetchAndCacheScript('pdf.min.js', `${PDF_JS_BASE_URL}/pdf.min.js`),
    fetchAndCacheScript('pdf.worker.min.js', `${PDF_JS_BASE_URL}/pdf.worker.min.js`),
  ]);

  return {
    pdfJs: escapeForScriptTag(pdfJs),
    pdfWorker,
  } as const;
};

const buildPdfJsHtml = (base64Data: string, pdfJsSource: string, pdfWorkerSource: string) => {
  const workerInitializer = JSON.stringify(pdfWorkerSource);
  const pdfBase64Json = JSON.stringify(base64Data);

  return `<!DOCTYPE html>
<html lang="tr">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=3.0" />
    <style>
      html, body {
        margin: 0;
        padding: 0;
        background-color: #0f0f0f;
        color: #ffffff;
        height: 100%;
        overflow-y: auto;
        -webkit-overflow-scrolling: touch;
      }
      #viewer {
        position: relative;
        min-height: 100%;
        width: 100%;
        display: flex;
        flex-direction: column;
        gap: 12px;
        align-items: center;
        padding: 16px 8px 32px;
        box-sizing: border-box;
      }
      canvas {
        max-width: 900px;
        width: 100%;
        background-color: #ffffff;
        border-radius: 4px;
        box-shadow: 0 6px 18px rgba(0, 0, 0, 0.45);
      }
      .error {
        padding: 16px;
        background-color: rgba(255, 85, 85, 0.2);
        border: 1px solid rgba(255, 85, 85, 0.35);
        color: #ffaaaa;
        border-radius: 4px;
        max-width: 640px;
        margin: 48px auto;
        font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
        font-size: 14px;
        text-align: center;
      }
    </style>
    <script>${pdfJsSource}</script>
  </head>
  <body>
    <div id="viewer"></div>
    <script>
      (function () {
        const viewer = document.getElementById('viewer');
        const workerBlob = new Blob([${workerInitializer}], { type: 'text/javascript' });
        const workerUrl = URL.createObjectURL(workerBlob);
        pdfjsLib.GlobalWorkerOptions.workerSrc = workerUrl;

        function notify(message) {
          if (window.ReactNativeWebView) {
            window.ReactNativeWebView.postMessage(message);
          }
        }

        function showError(message) {
          viewer.innerHTML = '';
          const box = document.createElement('div');
          box.className = 'error';
          box.textContent = message || 'PDF görüntülenemedi.';
          viewer.appendChild(box);
          notify(JSON.stringify({ type: 'error', message: message || 'render-error' }));
        }

        try {
          const base64 = ${pdfBase64Json};
          const binary = atob(base64);
          const length = binary.length;
          const bytes = new Uint8Array(length);
          for (let i = 0; i < length; i++) {
            bytes[i] = binary.charCodeAt(i);
          }

          pdfjsLib.getDocument({ data: bytes }).promise.then(function (pdf) {
            const total = pdf.numPages;
            let rendered = 0;

            const renderPage = function (pageNumber) {
              pdf.getPage(pageNumber).then(function (page) {
                const viewport = page.getViewport({ scale: 1.15 });
                const canvas = document.createElement('canvas');
                const context = canvas.getContext('2d');
                canvas.height = viewport.height;
                canvas.width = viewport.width;
                viewer.appendChild(canvas);

                page.render({ canvasContext: context, viewport: viewport }).promise.then(function () {
                  rendered += 1;
                  if (rendered === total) {
                    notify('pdf-render-complete');
                  }
                }).catch(function () {
                  showError('PDF sayfası çizilemedi.');
                });
              }).catch(function () {
                showError('PDF sayfası yüklenemedi.');
              });
            };

            const renderSequentially = function (pageNumber) {
              if (pageNumber > total) {
                return;
              }
              renderPage(pageNumber);
              requestAnimationFrame(function () {
                renderSequentially(pageNumber + 1);
              });
            };

            renderSequentially(1);
          }).catch(function () {
            showError('PDF dosyası açılamadı.');
          });
        } catch (error) {
          console.error(error);
          showError('PDF verisi işlenemedi.');
        }

        window.addEventListener('unload', function () {
          URL.revokeObjectURL(workerUrl);
        });
      })();
    </script>
  </body>
</html>`;
};

const downloadPdfForOnlineViewing = async (remoteUrl: string, key: string) => {
  const tempDir = getTempViewerDirectory();
  await FileSystem.makeDirectoryAsync(tempDir, { intermediates: true });

  const targetPath = `${tempDir}${resolveFilename(key)}`;
  const tempPath = `${targetPath}.download`;

  try {
    const { status, uri } = await FileSystem.downloadAsync(remoteUrl, tempPath);
    if (status && (status < 200 || status >= 300)) {
      throw new Error(`PDF uzaktan indirilemedi (durum kodu: ${status})`);
    }

    await FileSystem.deleteAsync(targetPath, { idempotent: true });
    await FileSystem.moveAsync({ from: uri, to: targetPath });
    return targetPath;
  } catch (error) {
    await FileSystem.deleteAsync(tempPath, { idempotent: true });
    throw error;
  }
};

// =======================
// ANA EKRAN
// =======================

export default function HomeScreen() {
  const route = useRoute();
  const { mode = 'offline', articleId, uri, storageKey } = (route.params || {}) as RouteParams;

  const [loading, setLoading] = useState(true);
  const [localFileUri, setLocalFileUri] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [viewerHtml, setViewerHtml] = useState<string | null>(null);

  const tempOnlineFileRef = useRef<string | null>(null);
  const pdfResourcesRef = useRef<{ pdfJs: string; pdfWorker: string } | null>(null);
  const pdfResourcesPromiseRef = useRef<Promise<{ pdfJs: string; pdfWorker: string }> | null>(null);
  const cleanupTempFile = useCallback(async () => {
    if (!tempOnlineFileRef.current) {
      return;
    }
    const path = tempOnlineFileRef.current;
    tempOnlineFileRef.current = null;
    try {
      await FileSystem.deleteAsync(path, { idempotent: true });
    } catch (cleanupError) {
      console.log('Geçici PDF dosyası silinemedi:', cleanupError);
    }
  }, []);

  useEffect(() => {
    return () => {
      cleanupTempFile().catch(() => {});
    };
  }, [cleanupTempFile]);

  const effectiveStorageKey = useMemo(
    () => storageKey ?? uri ?? DEFAULT_PDF_URL,
    [storageKey, uri]
  );

  const ensurePdfJsResources = useCallback(async () => {
    if (pdfResourcesRef.current) {
      return pdfResourcesRef.current;
    }

    if (!pdfResourcesPromiseRef.current) {
      pdfResourcesPromiseRef.current = loadPdfViewerScripts();
    }

    const resources = await pdfResourcesPromiseRef.current;
    pdfResourcesRef.current = resources;
    return resources;
  }, []);

  // Ekran odaklandığında PDF'i hazırla
  useFocusEffect(
    useCallback(() => {
      let cancelled = false;

      const prepare = async () => {
        setLoading(true);
        setError(null);
        setLocalFileUri(null);
        setViewerHtml(null);

        ensurePdfJsResources().catch((resourceError) => {
          console.log('PDF viewer kaynakları indirilemedi:', resourceError);
        });

        try {
          if (mode === 'online') {
            const remoteUrl =
              (isRemoteUri(uri) && uri) || (await fetchPdfUrlFromDB(articleId));
            if (cancelled) return;

            if (storageKey) {
              try {
                const existing = await findExistingPdfUri(storageKey);
                if (!cancelled && existing) {
                  await cleanupTempFile();
                  setLocalFileUri(existing.uri);
                  return;
                }
              } catch (checkError) {
                console.log('Yerel PDF doğrulanamadı:', checkError);
              }
            }

            await cleanupTempFile();
            const tempPath = await downloadPdfForOnlineViewing(remoteUrl, effectiveStorageKey);
            if (cancelled) {
              await FileSystem.deleteAsync(tempPath, { idempotent: true });
              return;
            }
            tempOnlineFileRef.current = tempPath;
            setLocalFileUri(tempPath);
            return;
          }

          await cleanupTempFile();

          // Offline mod: öncelikle parametre olarak gelen yerel URI'yi doğrula
          if (uri && isFileUri(uri)) {
            const info = await FileSystem.getInfoAsync(uri);
            if (!info.exists) {
              throw new Error('Yerel PDF dosyası bulunamadı.');
            }
            if (!cancelled) {
              setLocalFileUri(uri);
              return;
            }
          }

          // storageKey üzerinden indirilen kopyayı kontrol et
          try {
            const existing = await findExistingPdfUri(effectiveStorageKey);
            if (!cancelled && existing) {
              setLocalFileUri(existing.uri);
              return;
            }
          } catch (lookupError) {
            console.log('Önceden indirilen PDF okunamadı:', lookupError);
          }

          // Gerekirse uzaktan indirip diske kaydet
          const downloadSource =
            (uri && isRemoteUri(uri) && uri) || DEFAULT_PDF_URL;
          const localPath = await downloadForOffline(effectiveStorageKey, downloadSource);
          if (!cancelled) {
            setLocalFileUri(localPath);
          }
        } catch (err: any) {
          console.log('PDF hazırlama hatası:', err?.message || err);
          if (!cancelled) {
            setError('PDF yüklenemedi.');
            setLoading(false);
          }
        }
      };

      prepare();

      return () => {
        cancelled = true;
      };
    }, [mode, articleId, uri, storageKey, cleanupTempFile, effectiveStorageKey])
  );

  useEffect(() => {
    let cancelled = false;

    const prepareHtml = async () => {
      if (!localFileUri) {
        setViewerHtml(null);
        return;
      }

      try {
        const base64 = await FileSystem.readAsStringAsync(localFileUri, {
          encoding: FileSystem.EncodingType.Base64,
        });
        const { pdfJs, pdfWorker } = await ensurePdfJsResources();
        if (!cancelled) {
          setViewerHtml(buildPdfJsHtml(base64, pdfJs, pdfWorker));
        }
      } catch (readError: any) {
        console.log('PDF içeriği okunamadı:', readError?.message || readError);
        const messageText =
          typeof readError?.message === 'string' && readError.message.includes('PDF görüntüleyici betiği')
            ? 'PDF görüntüleyici kaynakları indirilemedi. Lütfen internet bağlantınızı kontrol edin.'
            : 'PDF içeriği hazırlanamadı.';
        if (!cancelled) {
          setError(messageText);
          setLoading(false);
        }
      }
    };

    prepareHtml();

    return () => {
      cancelled = true;
    };
  }, [localFileUri]);

  const handleWebViewError = (event: any) => {
    console.log('PDF viewer error:', event.nativeEvent);
    setError('PDF görüntüleyici hata verdi.');
    setLoading(false);
  };

  const handleWebViewMessage = (event: WebViewMessageEvent) => {
    const payload = event.nativeEvent.data;

    if (payload === 'pdf-render-complete') {
      setLoading(false);
      return;
    }

    try {
      const parsed = JSON.parse(payload);
      if (parsed?.type === 'error') {
        setError('PDF görüntüleyici hata verdi.');
        setLoading(false);
      }
    } catch (parseError) {
      console.log('PDF viewer message parse error:', parseError);
    }
  };

  return (
    <View style={styles.container}>
      {loading && (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" />
        </View>
      )}

      {error ? (
        <View style={styles.errorBox}>
          <Text style={styles.errorText}>{error}</Text>
        </View>
      ) : viewerHtml ? (
        <WebView
          originWhitelist={['*']}
          source={{ html: viewerHtml, baseUrl: '' }}
          style={styles.webView}
          onError={handleWebViewError}
          onHttpError={handleWebViewError}
          allowFileAccess={Platform.OS === 'android'}
          allowFileAccessFromFileURLs={Platform.OS === 'android'}
          allowUniversalAccessFromFileURLs={Platform.OS === 'android'}
          javaScriptEnabled
          domStorageEnabled
          onMessage={handleWebViewMessage}
        />
      ) : null}
    </View>
  );
}

// =======================
// STİLLER
// =======================
const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
  },
  loadingContainer: {
    position: 'absolute',
    zIndex: 10,
    left: 0,
    right: 0,
    top: 0,
    bottom: 0,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 16,
    backgroundColor: 'rgba(255,255,255,0.6)',
  },
  errorBox: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 24,
  },
  errorText: {
    color: 'red',
    textAlign: 'center',
  },
  webView: {
    flex: 1,
    backgroundColor: '#1c1c1c',
  },
});