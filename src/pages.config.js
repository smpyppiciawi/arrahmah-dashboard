/**
 * pages.config.js - Page routing configuration
 * 
 * This file is AUTO-GENERATED. Do not add imports or modify PAGES manually.
 * Pages are auto-registered when you create files in the ./pages/ folder.
 * 
 * THE ONLY EDITABLE VALUE: mainPage
 * This controls which page is the landing page (shown when users visit the app).
 * 
 * Example file structure:
 * 
 *   import HomePage from './pages/HomePage';
 *   import Dashboard from './pages/Dashboard';
 *   import Settings from './pages/Settings';
 *   
 *   export const PAGES = {
 *       "HomePage": HomePage,
 *       "Dashboard": Dashboard,
 *       "Settings": Settings,
 *   }
 *   
 *   export const pagesConfig = {
 *       mainPage: "HomePage",
 *       Pages: PAGES,
 *   };
 * 
 * Example with Layout (wraps all pages):
 *
 *   import Home from './pages/Home';
 *   import Settings from './pages/Settings';
 *   import __Layout from './Layout.jsx';
 *
 *   export const PAGES = {
 *       "Home": Home,
 *       "Settings": Settings,
 *   }
 *
 *   export const pagesConfig = {
 *       mainPage: "Home",
 *       Pages: PAGES,
 *       Layout: __Layout,
 *   };
 *
 * To change the main page from HomePage to Dashboard, use find_replace:
 *   Old: mainPage: "HomePage",
 *   New: mainPage: "Dashboard",
 *
 * The mainPage value must match a key in the PAGES object exactly.
 */
import CatatanSiswa from './pages/CatatanSiswa';
import ProfilGuru from './pages/ProfilGuru';
import WaliKelas from './pages/WaliKelas';
import Dashboard from './pages/Dashboard';
import Home from './pages/Home';
import Kelas from './pages/Kelas';
import KelolaDataKeuangan from './pages/KelolaDataKeuangan';
import Kepsek from './pages/Kepsek';
import LaporanKeuangan from './pages/LaporanKeuangan';
import Materi from './pages/Materi';
import Absensi from './pages/Absensi';
import Guru from './pages/Guru';
import Masuk from './pages/Masuk';
import Nilai from './pages/Nilai';
import Siswa from './pages/Siswa';
import SiswaPortal from './pages/SiswaPortal';
import Transaksi from './pages/Transaksi';
import KalenderAkademik from './pages/KalenderAkademik';
import DataLulusan from './pages/DataLulusan';
import SiswaKeluar from './pages/SiswaKeluar';
import __Layout from './Layout.jsx';


export const PAGES = {
    "CatatanSiswa": CatatanSiswa,
    "ProfilGuru": ProfilGuru,
    "WaliKelas": WaliKelas,
    "Dashboard": Dashboard,
    "Home": Home,
    "Kelas": Kelas,
    "KelolaDataKeuangan": KelolaDataKeuangan,
    "Kepsek": Kepsek,
    "LaporanKeuangan": LaporanKeuangan,
    "Materi": Materi,
    "Absensi": Absensi,
    "Guru": Guru,
    "Masuk": Masuk,
    "Nilai": Nilai,
    "Siswa": Siswa,
    "SiswaPortal": SiswaPortal,
    "Transaksi": Transaksi,
    "KalenderAkademik": KalenderAkademik,
    "DataLulusan": DataLulusan,
    "SiswaKeluar": SiswaKeluar,
}

export const pagesConfig = {
    mainPage: "Dashboard",
    Pages: PAGES,
    Layout: __Layout,
};