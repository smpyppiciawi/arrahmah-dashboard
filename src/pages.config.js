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
import Absensi from './pages/Absensi';
import CatatanSiswa from './pages/CatatanSiswa';
import Dashboard from './pages/Dashboard';
import Guru from './pages/Guru';
import Home from './pages/Home';
import Kelas from './pages/Kelas';
import Kepsek from './pages/Kepsek';
import Materi from './pages/Materi';
import Nilai from './pages/Nilai';
import Siswa from './pages/Siswa';
import Transaksi from './pages/Transaksi';
import LaporanKeuangan from './pages/LaporanKeuangan';
import KelolaDataKeuangan from './pages/KelolaDataKeuangan';
import __Layout from './Layout.jsx';


export const PAGES = {
    "Absensi": Absensi,
    "CatatanSiswa": CatatanSiswa,
    "Dashboard": Dashboard,
    "Guru": Guru,
    "Home": Home,
    "Kelas": Kelas,
    "Kepsek": Kepsek,
    "Materi": Materi,
    "Nilai": Nilai,
    "Siswa": Siswa,
    "Transaksi": Transaksi,
    "LaporanKeuangan": LaporanKeuangan,
    "KelolaDataKeuangan": KelolaDataKeuangan,
}

export const pagesConfig = {
    mainPage: "Dashboard",
    Pages: PAGES,
    Layout: __Layout,
};