import * as FileSystem from 'expo-file-system/legacy';

const ensureTrailingSlash = (value: string) => (value.endsWith('/') ? value : `${value}/`);

export type DownloadedPdfInfo = {
  uri: string;
  size: number;
  modificationTime: number | null;
};

const directoryCache: {
  all?: string[];
  primary?: string;
} = {};

const resolveStorageRoots = () => {
  if (directoryCache.all) {
    return directoryCache.all;
  }

  const rawRoots = [FileSystem.documentDirectory, FileSystem.cacheDirectory].filter(
    (root): root is string => typeof root === 'string' && root.length > 0
  );

  if (rawRoots.length === 0) {
    throw new Error('Dosya sistemi kullanıma hazır değil.');
  }

  const uniqueRoots = Array.from(new Set(rawRoots.map(ensureTrailingSlash)));
  const directories = uniqueRoots.map((root) => `${root}pdfs/`);

  directoryCache.all = directories;
  directoryCache.primary = directories[0];
  return directories;
};

const getPrimaryPdfDirectory = () => {
  if (directoryCache.primary) {
    return directoryCache.primary;
  }
  const directories = resolveStorageRoots();
  directoryCache.primary = directories[0];
  return directoryCache.primary;
};

const ensurePrimaryPdfDirectory = async () => {
  const dir = getPrimaryPdfDirectory();
  await FileSystem.makeDirectoryAsync(dir, { intermediates: true });
  return dir;
};

export const resolveFilename = (path: string) => {
  const withoutQuery = path.split('?')[0];
  const parts = withoutQuery.split('/');
  const last = parts.pop();
  return last && last.length > 0 ? last : `magazine-${Date.now()}.pdf`;
};

export const getLocalPdfPath = (path: string) => `${getPrimaryPdfDirectory()}${resolveFilename(path)}`;

const toCandidatePaths = (fileName: string) => resolveStorageRoots().map((dir) => `${dir}${fileName}`);

export const findExistingPdfUri = async (path: string): Promise<DownloadedPdfInfo | null> => {
  const fileName = resolveFilename(path);
  const candidates = toCandidatePaths(fileName);

  for (const candidate of candidates) {
    try {
      const info = await FileSystem.getInfoAsync(candidate);
      if (info.exists) {
        return {
          uri: candidate,
          size: info.size ?? 0,
          modificationTime: info.modificationTime ?? null,
        };
      }
    } catch {
      // location check failed — treat as not found
    }
  }

  return null;
};

export const isPdfDownloaded = async (path: string) => {
  const info = await findExistingPdfUri(path);
  return !!info && info.size > 0;
};

export const listDownloadedPdfs = async () => {
  const directories = resolveStorageRoots();
  const files = new Set<string>();

  for (const dir of directories) {
    try {
      const entries = await FileSystem.readDirectoryAsync(dir);
      entries.forEach((entry) => files.add(entry));
    } catch (error: any) {
      const message = typeof error?.message === 'string' ? error.message : '';
      const code = error?.code ?? '';
      if (
        code === 'E_DIRECTORY_NOT_FOUND' ||
        code === 'ERR_FILESYSTEM_DIR_NOT_EXIST' ||
        message.includes('Directory does not exist') ||
        message.includes('No such file') ||
        message.includes('No such file or directory')
      ) {
        continue;
      }
      /* unexpected read error — skip directory */
    }
  }

  return Array.from(files);
};

export const downloadPdf = async (path: string, remoteUrl: string) => {
  const dir = await ensurePrimaryPdfDirectory();
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
  const fileName = resolveFilename(path);
  const candidates = toCandidatePaths(fileName);

  for (const candidate of candidates) {
    try {
      await FileSystem.deleteAsync(candidate, { idempotent: true });
    } catch {
      // delete failed — file may already be gone, safe to ignore
    }
  }
};