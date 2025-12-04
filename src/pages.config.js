import Dashboard from './pages/Dashboard';
import Siswa from './pages/Siswa';
import Kelas from './pages/Kelas';
import Absensi from './pages/Absensi';
import Keuangan from './pages/Keuangan';
import Nilai from './pages/Nilai';
import Materi from './pages/Materi';
import Guru from './pages/Guru';
import __Layout from './Layout.jsx';


export const PAGES = {
    "Dashboard": Dashboard,
    "Siswa": Siswa,
    "Kelas": Kelas,
    "Absensi": Absensi,
    "Keuangan": Keuangan,
    "Nilai": Nilai,
    "Materi": Materi,
    "Guru": Guru,
}

export const pagesConfig = {
    mainPage: "Dashboard",
    Pages: PAGES,
    Layout: __Layout,
};