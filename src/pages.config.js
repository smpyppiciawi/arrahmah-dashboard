import Absensi from './pages/Absensi';
import CatatanSiswa from './pages/CatatanSiswa';
import Dashboard from './pages/Dashboard';
import Guru from './pages/Guru';
import Home from './pages/Home';
import Kelas from './pages/Kelas';
import Kepsek from './pages/Kepsek';
import Keuangan from './pages/Keuangan';
import Materi from './pages/Materi';
import Nilai from './pages/Nilai';
import Siswa from './pages/Siswa';
import __Layout from './Layout.jsx';


export const PAGES = {
    "Absensi": Absensi,
    "CatatanSiswa": CatatanSiswa,
    "Dashboard": Dashboard,
    "Guru": Guru,
    "Home": Home,
    "Kelas": Kelas,
    "Kepsek": Kepsek,
    "Keuangan": Keuangan,
    "Materi": Materi,
    "Nilai": Nilai,
    "Siswa": Siswa,
}

export const pagesConfig = {
    mainPage: "Dashboard",
    Pages: PAGES,
    Layout: __Layout,
};