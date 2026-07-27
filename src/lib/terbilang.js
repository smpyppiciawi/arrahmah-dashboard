/**
 * Konversi angka ke terbilang dalam Bahasa Indonesia
 * Contoh: 1500000 → "Satu juta lima ratus ribu rupiah"
 */

const SATUAN = ['', 'Satu', 'Dua', 'Tiga', 'Empat', 'Lima', 'Enam', 'Tujuh', 'Delapan', 'Sembilan', 'Sepuluh', 'Sebelas'];

function bilangRatusan(n) {
  if (n < 12) return SATUAN[n];
  if (n < 20) return SATUAN[n - 10] + ' Belas';
  if (n < 100) {
    const puluhan = Math.floor(n / 10);
    const sisa = n % 10;
    return (SATUAN[puluhan] ? SATUAN[puluhan] + ' Puluh' : '') + (sisa > 0 ? ' ' + SATUAN[sisa] : '');
  }
  if (n < 200) return 'Seratus' + (n - 100 > 0 ? ' ' + bilangRatusan(n - 100) : '');
  const ratusan = Math.floor(n / 100);
  const sisa = n % 100;
  return SATUAN[ratusan] + ' Ratus' + (sisa > 0 ? ' ' + bilangRatusan(sisa) : '');
}

function bilangRibuan(n) {
  if (n < 1000) return bilangRatusan(n);
  if (n < 2000) return 'Seribu' + (n - 1000 > 0 ? ' ' + bilangRatusan(n - 1000) : '');
  const ribuan = Math.floor(n / 1000);
  const sisa = n % 1000;
  return bilangRatusan(ribuan) + ' Ribu' + (sisa > 0 ? ' ' + bilangRatusan(sisa) : '');
}

function bilangJuta(n) {
  if (n < 1000000) return bilangRibuan(n);
  const juta = Math.floor(n / 1000000);
  const sisa = n % 1000000;
  if (juta < 1000) {
    return bilangRatusan(juta) + ' Juta' + (sisa > 0 ? ' ' + bilangRibuan(sisa) : '');
  }
  return bilangRibuan(juta) + ' Juta' + (sisa > 0 ? ' ' + bilangRibuan(sisa) : '');
}

function bilangMiliar(n) {
  if (n < 1000000000) return bilangJuta(n);
  const miliar = Math.floor(n / 1000000000);
  const sisa = n % 1000000000;
  return bilangRatusan(miliar) + ' Miliar' + (sisa > 0 ? ' ' + bilangJuta(sisa) : '');
}

export function terbilang(angka) {
  const n = Math.floor(Math.abs(Number(angka) || 0));
  if (n === 0) return 'Nol rupiah';
  let result = bilangMiliar(n);
  // Capitalize first letter
  result = result.charAt(0).toUpperCase() + result.slice(1);
  return result + ' rupiah';
}

export default terbilang;