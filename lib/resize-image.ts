// Browser-only: scales a photo or sketch down and re-encodes it as JPEG so it fits the request limit.
const MAX_SIDE = 1600;

export type ResizedImage = { data: string; mediaType: "image/jpeg"; previewUrl: string };

export async function resizeImage(file: File): Promise<ResizedImage> {
  const bitmap = await createImageBitmap(file).catch(() => {
    throw new Error("Das Bild konnte nicht gelesen werden.");
  });
  const scale = Math.min(1, MAX_SIDE / Math.max(bitmap.width, bitmap.height));
  const width = Math.max(1, Math.round(bitmap.width * scale));
  const height = Math.max(1, Math.round(bitmap.height * scale));

  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("Canvas ist nicht verfügbar.");
  // Transparent PNG sketches would turn black as JPEG.
  ctx.fillStyle = "#ffffff";
  ctx.fillRect(0, 0, width, height);
  ctx.drawImage(bitmap, 0, 0, width, height);
  bitmap.close();

  const dataUrl = canvas.toDataURL("image/jpeg", 0.85);
  return { data: dataUrl.slice(dataUrl.indexOf(",") + 1), mediaType: "image/jpeg", previewUrl: dataUrl };
}
