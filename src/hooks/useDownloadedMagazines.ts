import * as FileSystem from 'expo-file-system/legacy';

const ensureTrailingSlash = (value: string) => (value.endsWith('/') ? value : `${value}/`);

const getStorageRoot = () => {
  const base = FileSystem.documentDirectory ?? FileSystem.cacheDirectory;
  if (!base) {
    throw new Error('Dosya sistemi kullanıma hazır değil.');
  }
  return ensureTrailingSlash(base);
};

const getPdfDirectory = () => `${getStorageRoot()}pdfs/`;

const ensurePdfDirectory = async () => {
  const dir = getPdfDirectory();
  await FileSystem.makeDirectoryAsync(dir, { intermediates: true });
  return dir;
};

export const resolveFilename = (path: string) => {
  const withoutQuery = path.split('?')[0];
  const parts = withoutQuery.split('/');
  const last = parts.pop();
  return last && last.length > 0 ? last : `magazine-${Date.now()}.pdf`;
};

export const getLocalPdfPath = (path: string) => `${getPdfDirectory()}${resolveFilename(path)}`;

export const isPdfDownloaded = async (path: string) => {
  try {
    const fileUri = getLocalPdfPath(path);
    const info = await FileSystem.getInfoAsync(fileUri);
    return info.exists;
  } catch (error) {
    console.warn('PDF indirme durumu kontrolü başarısız:', error);
    return false;
  }
};

export const downloadPdf = async (path: string, remoteUrl: string) => {
  const dir = await ensurePdfDirectory();
  const finalPath = `${dir}${resolveFilename(path)}`;
  const tempPath = `${finalPath}.download`;

  try {
    const { status, uri } = await FileSystem.downloadAsync(remoteUrl, tempPath);
    if (status && (status < 200 || status >= 300)) {
      throw new Error(`İndirme isteği ${status} durum kodu ile sonuçlandı`);
    }

    await FileSystem.deleteAsync(finalPath, { idempotent: true });
    await FileSystem.moveAsync({ from: uri, to: finalPath });
    return finalPath;
  } catch (error) {
    await FileSystem.deleteAsync(tempPath, { idempotent: true });
    throw error;
  }
};

export const deletePdf = async (path: string) => {
  try {
    const fileUri = getLocalPdfPath(path);
    await FileSystem.deleteAsync(fileUri, { idempotent: true });
  } catch (error) {
    console.warn('PDF silinirken hata oluştu:', error);
  }
};