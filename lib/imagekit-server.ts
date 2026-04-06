import 'server-only';

const IMAGEKIT_UPLOAD_URL = 'https://upload.imagekit.io/api/v1/files/upload';

export type ImageKitUploadResult = {
  fileId: string;
  url: string;
  thumbnailUrl?: string;
  name?: string;
  filePath?: string;
  size?: number;
  fileType?: string;
};

export function isImageKitConfigured(env: NodeJS.ProcessEnv = process.env) {
  const privateKey = env.IMAGEKIT_PRIVATE_KEY;
  return typeof privateKey === 'string' && privateKey.trim().length > 0;
}

export async function uploadToImageKit(
  file: File,
  {
    folder,
    tags,
    useUniqueFileName = true,
  }: { folder?: string; tags?: string[]; useUniqueFileName?: boolean } = {}
): Promise<ImageKitUploadResult> {
  const privateKey = process.env.IMAGEKIT_PRIVATE_KEY?.trim();
  if (!privateKey) {
    const err: any = new Error('IMAGEKIT_NOT_CONFIGURED');
    err.status = 503;
    throw err;
  }

  const fileName = file.name || `file-${Date.now()}`;
  const arrayBuffer = await file.arrayBuffer();
  const blob = new Blob([arrayBuffer], { type: file.type || 'application/octet-stream' });

  const uploadForm = new FormData();
  uploadForm.append('file', blob, fileName);
  uploadForm.append('fileName', fileName);
  if (folder) uploadForm.append('folder', folder);
  if (tags?.length) uploadForm.append('tags', tags.join(','));
  uploadForm.append('useUniqueFileName', useUniqueFileName ? 'true' : 'false');

  const auth = Buffer.from(`${privateKey}:`).toString('base64');
  const res = await fetch(IMAGEKIT_UPLOAD_URL, {
    method: 'POST',
    headers: { Authorization: `Basic ${auth}` },
    body: uploadForm,
  });

  const data: any = await res.json().catch(() => ({}));
  if (!res.ok) {
    const message =
      data?.message ||
      data?.error?.message ||
      data?.error ||
      'Gagal upload file ke ImageKit';
    const err: any = new Error(message);
    err.status = 502;
    throw err;
  }

  return {
    fileId: data.fileId,
    url: data.url,
    thumbnailUrl: data.thumbnailUrl,
    name: data.name,
    filePath: data.filePath,
    size: data.size,
    fileType: data.fileType,
  };
}
