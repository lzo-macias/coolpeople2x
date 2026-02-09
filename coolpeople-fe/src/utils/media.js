const IMAGE_EXTENSIONS = /\.(jpg|jpeg|png|gif|webp|bmp|svg|heic|heif|avif|tiff|tif)(\?.*)?$/i;

export function isImageUrl(url) {
  if (!url) return false;
  if (url.startsWith('data:image/')) return true;
  return IMAGE_EXTENSIONS.test(url);
}
