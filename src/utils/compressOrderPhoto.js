import imageCompression from 'browser-image-compression';

const MAX_KB = 600;
const MAX_MB = MAX_KB / 1024;

const baseOptions = {
  maxSizeMB: MAX_MB,
  useWebWorker: true,
  fileType: 'image/jpeg',
};

/**
 * Kompres gambar ke JPEG mendekati ≤ ~600KB sebelum upload ke server.
 * @param {File} file
 * @returns {Promise<File>}
 */
export async function compressOrderPhoto(file) {
  if (!file?.type?.startsWith('image/')) {
    throw new Error('Berkas harus berupa gambar');
  }

  let compressed = await imageCompression(file, {
    ...baseOptions,
    maxWidthOrHeight: 2048,
    initialQuality: 0.85,
  });

  if (compressed.size > MAX_KB * 1024) {
    compressed = await imageCompression(file, {
      ...baseOptions,
      maxWidthOrHeight: 1600,
      initialQuality: 0.72,
    });
  }

  if (compressed.size > MAX_KB * 1024) {
    compressed = await imageCompression(file, {
      ...baseOptions,
      maxWidthOrHeight: 1280,
      initialQuality: 0.6,
    });
  }

  const base = String(file.name || 'foto').replace(/\.[^.]+$/, '') || 'foto';
  return new File([compressed], `${base}.jpg`, {
    type: 'image/jpeg',
    lastModified: Date.now(),
  });
}
