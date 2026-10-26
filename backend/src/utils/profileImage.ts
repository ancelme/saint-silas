export function isValidProfileImage(value: unknown, maxBytes = 5 * 1024 * 1024): value is string {
  if (typeof value !== 'string') return false;

  const match = value.match(/^data:image\/(jpeg|png|webp);base64,([A-Za-z0-9+/]+={0,2})$/);
  if (!match) return false;

  const imageBytes = Buffer.from(match[2], 'base64');
  if (
    imageBytes.length === 0 ||
    imageBytes.length > maxBytes ||
    imageBytes.toString('base64') !== match[2]
  ) {
    return false;
  }

  if (match[1] === 'jpeg') {
    return imageBytes[0] === 0xff && imageBytes[1] === 0xd8 && imageBytes[2] === 0xff;
  }
  if (match[1] === 'png') {
    return imageBytes.subarray(0, 8).equals(Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]));
  }
  return imageBytes.toString('ascii', 0, 4) === 'RIFF' &&
    imageBytes.toString('ascii', 8, 12) === 'WEBP';
}
