import Dashboard from './pages/Dashboard';
import Siswa from './pages/Siswa';
import Kelas from './pages/Kelas';
import Absensi from './pages/Absensi';
import Keuangan from './pages/Keuangan';
import Nilai from './pages/Nilai';


export const PAGES = {
    "Dashboard": Dashboard,
    "Siswa": Siswa,
    "Kelas": Kelas,
    "Absensi": Absensi,
    "Keuangan": Keuangan,
    "Nilai": Nilai,
}

export const pagesConfig = {
    mainPage: "Dashboard",
    Pages: PAGES,
};