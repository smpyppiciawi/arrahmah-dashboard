// Kuesioner wawancara SPMB — pertanyaan, kelompok, dan pemetaan ke interview_answers.
// Disimpan sebagai array interview_answers: [{ no: 'q1', jawaban: '...' }]

export const WAWANCARA_QUESTIONS = {
  q25: { label: 'Tinggal dengan siapa?', type: 'text' },
  q26: { label: 'Pengasuh utama siswa?', type: 'text' },
  q1: { label: 'Melalui siapa dan dari mana orangtua/wali mengetahui sekolah kami?', type: 'text' },
  q2: { label: 'Apa alasan utama memilih sekolah ini?', type: 'text' },
  q10: { label: 'Apakah siswa memiliki prestasi akademik/non akademik?', type: 'text' },
  q3: { label: 'Apakah Bapak/Ibu dapat membaca Al-Quran?', type: 'text' },
  q6: { label: 'Apakah siswa mengaji di rumah?', type: 'text' },
  q7: { label: 'Bagaimana kebiasaan siswa dalam belajar di rumah?', type: 'text' },
  q8: { label: 'Mata pelajaran yang disukai siswa', type: 'text' },
  q9: { label: 'Mata pelajaran yang tidak disukai siswa', type: 'text' },
  q27: { label: 'Riwayat penyakit?', type: 'text' },
  q27_detail: { label: 'Detail riwayat penyakit', type: 'text' },
  q11: { label: 'Apakah siswa memiliki alergi?', type: 'text' },
  q11_detail: { label: 'Detail alergi', type: 'text' },
  q12: { label: 'Keinginan siswa apakah selalu dipenuhi?', type: 'text' },
  q13: { label: 'Reaksi anak jika tidak dituruti keinginannya?', type: 'text' },
  q14: { label: 'Tingkat kemandirian siswa dalam aktivitas harian?', type: 'text' },
  q15: { label: 'Sikap siswa bertemu orang/lingkungan baru?', type: 'text' },
  q16: { label: 'Uang saku/jajan siswa dalam sehari?', type: 'text' },
  q17: { label: 'Apakah siswa memiliki HP pribadi?', type: 'text' },
  q18: { label: 'Seberapa sering HP siswa diperiksa orangtua?', type: 'text' },
  q19: { label: 'Orangtua memantau pergaulan siswa di rumah & luar sekolah?', type: 'text' },
  q20: { label: 'Orangtua memiliki batasan waktu bermain?', type: 'text' },
  q4: { label: 'Apakah Bapak/Ibu merokok?', type: 'text' },
  q5: { label: 'Apakah siswa merokok/vape diketahui orangtua?', type: 'text' },
  q21: { label: 'Orangtua mengizinkan siswa ikuti kegiatan keagamaan?', type: 'bool' },
  q22: { label: 'Orangtua bersedia siswa mengikuti tata tertib sekolah?', type: 'bool' },
  q23: { label: 'Orangtua bersedia memenuhi panggilan sekolah?', type: 'bool' },
  q24: { label: 'Orangtua menerima jika siswa mendapat improvement/point?', type: 'bool' },
};

export const WAWANCARA_SECTIONS = [
  { title: 'Latar Belakang', fields: ['q25', 'q26', 'q1', 'q2', 'q10'] },
  { title: 'Kebiasaan & Agama', fields: ['q3', 'q6', 'q7', 'q8', 'q9', 'q27', 'q27_detail', 'q11', 'q11_detail'] },
  { title: 'Perilaku & Gawai', fields: ['q12', 'q13', 'q14', 'q15', 'q16', 'q17', 'q18', 'q19', 'q20'] },
  { title: 'Komitmen', fields: ['q4', 'q5', 'q21', 'q22', 'q23', 'q24'] },
];

export const WAWANCARA_BOOL = ['q21', 'q22', 'q23', 'q24'];

// Semua kode pertanyaan berurutan (untuk ekspor/detail)
export const WAWANCARA_ORDER = WAWANCARA_SECTIONS.flatMap((s) => s.fields);

export function answersToMap(list) {
  const map = {};
  (list || []).forEach((a) => { if (a && a.no) map[a.no] = a.jawaban ?? ''; });
  return map;
}

export function mapToAnswers(map) {
  return WAWANCARA_ORDER
    .filter((no) => map[no] !== undefined && map[no] !== null && String(map[no]).trim() !== '')
    .map((no) => ({ no, jawaban: String(map[no]) }));
}