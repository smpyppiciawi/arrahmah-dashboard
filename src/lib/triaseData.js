// Data keluhan & indikator triase UKS berdasarkan dokumen resmi SMP YPPI ARRAHMAH

export const KELUHAN_DATA = [
  // ===== HIJAU (Ringan) =====
  { id: 'h1', label: 'Lecet atau luka kecil', kategori: 'Hijau', indikator: 'Kondisi stabil; luka permukaan kulit ringan, tidak dalam, tidak perlu jahitan.' },
  { id: 'h2', label: 'Memar ringan', kategori: 'Hijau', indikator: 'Kondisi stabil; memar tanpa pembengkakan signifikan atau nyeri berat.' },
  { id: 'h3', label: 'Terkilir ringan', kategori: 'Hijau', indikator: 'Masih dapat menggerakkan anggota tubuh; tidak ada dugaan patah tulang.' },
  { id: 'h4', label: 'Sakit kepala ringan', kategori: 'Hijau', indikator: 'Tanpa muntah, kebingungan, atau gangguan penglihatan. Sadar penuh dan dapat berkomunikasi.' },
  { id: 'h5', label: 'Pusing ringan (lapar/kurang minum)', kategori: 'Hijau', indikator: 'Pusing ringan karena lapar, kurang minum, kelelahan, atau kurang tidur. Kondisi stabil.' },
  { id: 'h6', label: 'Batuk ringan', kategori: 'Hijau', indikator: 'Batuk tanpa sesak napas; dapat berbicara dan bernapas normal.' },
  { id: 'h7', label: 'Pilek / sakit tenggorokan ringan', kategori: 'Hijau', indikator: 'Tanpa sesak napas; kondisi umum baik, masih bisa minum.' },
  { id: 'h8', label: 'Sakit perut ringan', kategori: 'Hijau', indikator: 'Tanpa muntah berulang atau nyeri hebat; kondisi umum stabil.' },
  { id: 'h9', label: 'Nyeri haid ringan', kategori: 'Hijau', indikator: 'Nyeri haid ringan; tidak disertai perdarahan berlebihan atau lemas berat.' },
  { id: 'h10', label: 'Gigitan serangga ringan', kategori: 'Hijau', indikator: 'Tanpa pembengkakan berat, sesak napas, atau reaksi alergi sistemik.' },
  { id: 'h11', label: 'Mimisan ringan', kategori: 'Hijau', indikator: 'Mimisan yang berhenti setelah pertolongan pertama (penekanan hidung 10 menit).' },
  { id: 'h12', label: 'Cemas ringan', kategori: 'Hijau', indikator: 'Cemas ringan yang membaik setelah ditenangkan; tanpa tanda fisik yang mengancam.' },
  { id: 'h13', label: 'Demam ringan', kategori: 'Hijau', indikator: 'Suhu <38°C; kondisi umum baik, masih aktif dan dapat minum.' },
  { id: 'h14', label: 'Mual tanpa muntah', kategori: 'Hijau', indikator: 'Mual ringan tanpa muntah berulang; kondisi umum masih baik.' },

  // ===== KUNING (Sedang) =====
  { id: 'k1', label: 'Demam tinggi disertai lemas', kategori: 'Kuning', indikator: 'Demam tinggi (≥38,5°C) disertai lemas nyata, menggigil, atau sakit kepala; tidak mampu mengikuti pembelajaran.' },
  { id: 'k2', label: 'Muntah atau diare berulang', kategori: 'Kuning', indikator: 'Muntah atau diare berulang ≥3x; siswa masih sadar dan masih dapat minum sedikit.' },
  { id: 'k3', label: 'Tanda kekurangan cairan (dehidrasi sedang)', kategori: 'Kuning', indikator: 'Mulut kering, sangat haus, pusing ketika berdiri, atau berkurangnya buang air kecil.' },
  { id: 'k4', label: 'Sesak napas ringan-sedang', kategori: 'Kuning', indikator: 'Sesak atau mengi ringan-sedang; siswa masih dapat berbicara dengan kalimat lengkap.' },
  { id: 'k5', label: 'Reaksi alergi (ruam/gatal/bengkak terbatas)', kategori: 'Kuning', indikator: 'Reaksi alergi berupa ruam, gatal, atau bengkak terbatas; tanpa kesulitan bernapas dan menelan.' },
  { id: 'k6', label: 'Pingsan singkat (sudah sadar)', kategori: 'Kuning', indikator: 'Pingsan singkat; sudah sadar penuh kembali. Perlu observasi dan pemeriksaan.' },
  { id: 'k7', label: 'Cedera menyebabkan sulit berjalan', kategori: 'Kuning', indikator: 'Cedera yang menyebabkan siswa sulit berjalan atau menggerakkan anggota tubuh.' },
  { id: 'k8', label: 'Dugaan patah tulang tertutup', kategori: 'Kuning', indikator: 'Dugaan patah tulang tertutup, pergeseran sendi, atau luka yang mungkin memerlukan jahitan; perdarahan telah terkendali.' },
  { id: 'k9', label: 'Cedera kepala ringan (sakit kepala/pusing/mual)', kategori: 'Kuning', indikator: 'Cedera kepala ringan dengan sakit kepala, pusing, atau mual; tanpa tanda bahaya kategori merah.' },
  { id: 'k10', label: 'Sakit perut sedang atau menetap', kategori: 'Kuning', indikator: 'Nyeri sedang, menetap, atau semakin bertambah; tidak mampu beraktivitas normal.' },
  { id: 'k11', label: 'Nyeri haid berat / perdarahan haid berlebihan', kategori: 'Kuning', indikator: 'Nyeri haid berat atau perdarahan haid berlebihan; kondisi siswa masih stabil.' },
  { id: 'k12', label: 'Serangan panik / tekanan emosional berat', kategori: 'Kuning', indikator: 'Serangan panik atau tekanan emosional berat dengan kondisi fisik stabil.' },
  { id: 'k13', label: 'Pernyataan ingin menyakiti diri', kategori: 'Kuning', indikator: 'Pernyataan ingin menyakiti diri tanpa tindakan yang sedang berlangsung. Siswa TIDAK BOLEH dibiarkan sendirian.' },
  { id: 'k14', label: 'Demam disertai sakit kepala berat', kategori: 'Kuning', indikator: 'Demam tinggi disertai sakit kepala hebat tanpa tanda merah lain; perlu observasi ketat.' },

  // ===== MERAH (Gawat Darurat) =====
  { id: 'm1', label: 'Tersedak / tidak bisa bernapas / berbicara', kategori: 'Merah', indikator: 'DARURAT — Gangguan jalan napas: tersedak, tidak dapat berbicara, batuk efektif, atau bernapas. Aktifkan prosedur darurat segera.' },
  { id: 'm2', label: 'Sesak napas berat / megap-megap', kategori: 'Merah', indikator: 'DARURAT — Sesak napas berat atau megap-megap; siswa hanya mampu mengucapkan satu atau dua kata.' },
  { id: 'm3', label: 'Tidak bernapas / napas tidak normal', kategori: 'Merah', indikator: 'DARURAT — Henti napas atau napas tidak normal. Lakukan RJP jika terlatih; hubungi 119 segera.' },
  { id: 'm4', label: 'Serangan asma berat', kategori: 'Merah', indikator: 'DARURAT — Serangan asma berat atau tidak membaik setelah obat pelega yang diresepkan.' },
  { id: 'm5', label: 'Pembengkakan mendadak lidah/tenggorokan', kategori: 'Merah', indikator: 'DARURAT — Pembengkakan mendadak pada lidah atau tenggorokan (reaksi anafilaksis). Hubungi 119 segera.' },
  { id: 'm6', label: 'Tidak sadar / sulit dibangunkan', kategori: 'Merah', indikator: 'DARURAT — Gangguan kesadaran: tidak sadar atau sulit dibangunkan. Jangan tinggalkan siswa.' },
  { id: 'm7', label: 'Kejang', kategori: 'Merah', indikator: 'DARURAT — Kejang, baik pertama kali maupun berulang. Cegah cedera, miringkan badan, hubungi 119.' },
  { id: 'm8', label: 'Kebingungan mendadak / bicara pelo', kategori: 'Merah', indikator: 'DARURAT — Kebingungan mendadak, bicara pelo, kelemahan/mati rasa satu sisi tubuh. Curiga stroke.' },
  { id: 'm9', label: 'Cedera kepala berat', kategori: 'Merah', indikator: 'DARURAT — Kehilangan kesadaran setelah benturan, muntah berulang, sakit kepala makin berat, satu pupil lebih besar.' },
  { id: 'm10', label: 'Perdarahan banyak / tidak berhenti', kategori: 'Merah', indikator: 'DARURAT — Perdarahan banyak atau tidak berhenti setelah penekanan langsung. Tekan kuat, hubungi 119.' },
  { id: 'm11', label: 'Muntah darah / BAB berdarah', kategori: 'Merah', indikator: 'DARURAT — Muntah darah atau buang air besar berdarah signifikan.' },
  { id: 'm12', label: 'Kulit pucat, dingin, berkeringat / hampir pingsan', kategori: 'Merah', indikator: 'DARURAT — Tanda syok: kulit sangat pucat, dingin, berkeringat; denyut nadi lemah. Baringkan, tinggikan kaki, hubungi 119.' },
  { id: 'm13', label: 'Dugaan cedera leher / tulang belakang', kategori: 'Merah', indikator: 'DARURAT — Jangan gerakkan siswa; imobilisasi kepala-leher; hubungi 119 segera.' },
  { id: 'm14', label: 'Luka bakar luas / wajah / akibat listrik', kategori: 'Merah', indikator: 'DARURAT — Luka bakar luas, wajah, atau akibat listrik. Siram air mengalir, jangan diolesi apapun, hubungi 119.' },
  { id: 'm15', label: 'Keracunan / overdosis obat / bahan kimia', kategori: 'Merah', indikator: 'DARURAT — Keracunan, menelan obat berlebihan, bahan kimia, atau zat terlarang. Hubungi 119 dan Poison Control.' },
  { id: 'm16', label: 'Gigitan ular', kategori: 'Merah', indikator: 'DARURAT — Gigitan ular; imobilisasi anggota yang tergigit di bawah jantung, jangan dihisap, hubungi 119 segera.' },
  { id: 'm17', label: 'Demam dengan kejang / kaku kuduk / kebingungan', kategori: 'Merah', indikator: 'DARURAT — Demam disertai sesak, kejang, kaku kuduk, kebingungan, atau tidak mampu berdiri.' },
  { id: 'm18', label: 'Kondisi panas berlebih dengan penurunan kesadaran', kategori: 'Merah', indikator: 'DARURAT — Heat stroke: kondisi panas berlebih disertai kebingungan, kejang, atau penurunan kesadaran.' },
];

export const KATEGORI_TRIASE_CONFIG = {
  Hijau: { color: 'bg-emerald-100 text-emerald-800 border-emerald-300', dot: 'bg-emerald-500', label: 'Hijau — Ringan', badge: 'bg-emerald-500' },
  Kuning: { color: 'bg-yellow-100 text-yellow-800 border-yellow-300', dot: 'bg-yellow-500', label: 'Kuning — Sedang', badge: 'bg-yellow-500' },
  Merah: { color: 'bg-red-100 text-red-800 border-red-300', dot: 'bg-red-500', label: 'Merah — Gawat Darurat', badge: 'bg-red-500' },
};