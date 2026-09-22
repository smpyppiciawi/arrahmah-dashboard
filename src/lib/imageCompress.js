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

// Foto siswa: validasi ketentuan upload, center-crop otomatis ke rasio 3:4 (pasfoto),
// lalu resize maks 1600px sisi terpanjang & konversi JPEG 75% — hasil konsisten
// untuk unggahan perorangan maupun massal, tajam saat dicetak di Buku Induk A4.
export async function processFotoSiswa(file, maxDim = 1600, quality = 0.75) {
  if (!file.type.startsWith('image/')) throw new Error('File bukan gambar');
  if (file.size > 10 * 1024 * 1024) throw new Error('Ukuran file melebihi 10 MB');
  const bitmap = await createImageBitmap(file);
  if (bitmap.width < 200 || bitmap.height < 267) {
    bitmap.close();
    throw new Error('Resolusi terlalu kecil (minimal 200x267 px)');
  }
  const ratio = 3 / 4;
  let sw = bitmap.width;
  let sh = bitmap.height;
  let sx = 0;
  let sy = 0;
  if (sw / sh > ratio) {
    const nw = Math.round(sh * ratio);
    sx = Math.round((sw - nw) / 2);
    sw = nw;
  } else {
    const nh = Math.round(sw / ratio);
    sy = Math.round((sh - nh) / 2);
    sh = nh;
  }
  const scale = Math.min(1, maxDim / Math.max(sw, sh));
  const w = Math.max(1, Math.round(sw * scale));
  const h = Math.max(1, Math.round(sh * scale));
  const canvas = document.createElement('canvas');
  canvas.width = w;
  canvas.height = h;
  const ctx = canvas.getContext('2d');
  ctx.drawImage(bitmap, sx, sy, sw, sh, 0, 0, w, h);
  bitmap.close();
  const blob = await new Promise((resolve) => canvas.toBlob(resolve, 'image/jpeg', quality));
  if (!blob) throw new Error('Gagal memproses gambar');
  const name = (file.name || 'foto').replace(/\.\w+$/, '') + '.jpg';
  return new File([blob], name, { type: 'image/jpeg' });
}