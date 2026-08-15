import { Directory, File, Paths } from 'expo-file-system';

const PHOTOS_DIR_NAME = 'garden-photos';

function getPhotosDirectory(): Directory {
  const dir = new Directory(Paths.document, PHOTOS_DIR_NAME);
  if (!dir.exists) {
    dir.create({ intermediates: true, idempotent: true });
  }
  return dir;
}

/**
 * Copies a photo from a transient picker/camera cache URI into the app's
 * document directory so it survives cache clears and app restarts.
 */
export async function persistPickedPhoto(sourceUri: string): Promise<string> {
  const dir = getPhotosDirectory();
  const extMatch = sourceUri.split('?')[0].match(/\.(\w+)$/);
  const ext = extMatch ? extMatch[1] : 'jpg';
  const filename = `photo-${Date.now()}-${Math.floor(Math.random() * 1e6)}.${ext}`;
  const sourceFile = new File(sourceUri);
  const destFile = new File(dir, filename);
  await sourceFile.copy(destFile);
  return destFile.uri;
}

export function deletePhotoFile(uri: string): void {
  try {
    const file = new File(uri);
    if (file.exists) {
      file.delete();
    }
  } catch {
    // Best-effort cleanup; ignore if already gone.
  }
}
