// Kompresi gambar di sisi klien sebelum diunggah:
// resize ke dimensi maksimum & konversi ke JPEG dengan kualitas terjaga,
// sehingga foto tetap jelas saat dicetak/dilihat namun ringan untuk diunggah.
export async function compressImage(file, maxDim = 1600, quality = 0.75) {
  if (!file.type.startsWith('image/')) throw new Error('File bukan gambar');
  const bitmap = await createImageBitmap(file);
  const scale = Math.min(1, maxDim / Math.max(bitmap.width, bitmap.height));
  const w = Math.max(1, Math.round(bitmap.width * scale));
  const h = Math.max(1, Math.round(bitmap.height * scale));
  const canvas = document.createElement('canvas');
  canvas.width = w;
  canvas.height = h;
  const ctx = canvas.getContext('2d');
  ctx.drawImage(bitmap, 0, 0, w, h);
  bitmap.close();
  const blob = await new Promise((resolve) => canvas.toBlob(resolve, 'image/jpeg', quality));
  if (!blob) throw new Error('Gagal mengompresi gambar');
  const name = (file.name || 'foto').replace(/\.\w+$/, '') + '.jpg';
  return new File([blob], name, { type: 'image/jpeg' });
}