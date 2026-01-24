import Absensi from './pages/Absensi';
import Dashboard from './pages/Dashboard';
import Guru from './pages/Guru';
import Home from './pages/Home';
import Kelas from './pages/Kelas';
import Keuangan from './pages/Keuangan';
import Materi from './pages/Materi';
import Nilai from './pages/Nilai';
import Siswa from './pages/Siswa';
import CatatanSiswa from './pages/CatatanSiswa';
import __Layout from './Layout.jsx';


export const PAGES = {
    "Absensi": Absensi,
    "Dashboard": Dashboard,
    "Guru": Guru,
    "Home": Home,
    "Kelas": Kelas,
    "Keuangan": Keuangan,
    "Materi": Materi,
    "Nilai": Nilai,
    "Siswa": Siswa,
    "CatatanSiswa": CatatanSiswa,
}

export const pagesConfig = {
    mainPage: "Dashboard",
    Pages: PAGES,
    Layout: __Layout,
};