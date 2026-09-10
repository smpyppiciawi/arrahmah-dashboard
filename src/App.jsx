import './App.css'
import { Toaster } from "@/components/ui/toaster"
import { QueryClientProvider } from '@tanstack/react-query'
import { queryClientInstance } from '@/lib/query-client'
import VisualEditAgent from '@/lib/VisualEditAgent'
import NavigationTracker from '@/lib/NavigationTracker'
import { pagesConfig } from './pages.config'
import { BrowserRouter as Router, Route, Routes, Navigate } from 'react-router-dom';
import PageNotFound from './lib/PageNotFound';
import { AuthProvider, useAuth } from '@/lib/AuthContext';
import UserNotRegisteredError from '@/components/UserNotRegisteredError';
import Masuk from './pages/Masuk';
import Pengaturan from './pages/Pengaturan';
import { ActiveAcademicYearProvider } from './context/ActiveAcademicYearContext';
import RealtimeSyncProvider from './lib/RealtimeSyncProvider';
import SiswaPortal from './pages/SiswaPortal';
import Kepsek from './pages/Kepsek';
import HomeVisit from './pages/HomeVisit';
import AbsensiPegawai from './pages/AbsensiPegawai';
import PeriodikSiswa from './pages/PeriodikSiswa';
import Sarpras from './pages/Sarpras';
import ScanAbsensi from './pages/ScanAbsensi';
import ProsesTahunAjaran from './pages/ProsesTahunAjaran';
import JadwalPiketPegawai from './pages/JadwalPiketPegawai';
import Hapalan from './pages/Hapalan';
import ProfilSekolah from './pages/ProfilSekolah';
import BukuTamu from './pages/BukuTamu';

const { Pages, Layout, mainPage } = pagesConfig;
const mainPageKey = mainPage ?? Object.keys(Pages)[0];
const MainPage = mainPageKey ? Pages[mainPageKey] : <></>;

const LayoutWrapper = ({ children, currentPageName }) => Layout ?
  <Layout currentPageName={currentPageName}>{children}</Layout>
  : <>{children}</>;

const AuthenticatedApp = () => {
  const { isLoadingAuth, isLoadingPublicSettings, authError, isAuthenticated, navigateToLogin, siswaUser, user } = useAuth();
  const isKepsek = user?.role === 'kepsek';

  // Show loading spinner
  if (isLoadingPublicSettings || isLoadingAuth) {
    return (
      <div className="fixed inset-0 flex items-center justify-center">
        <div className="w-8 h-8 border-4 border-slate-200 border-t-slate-800 rounded-full animate-spin"></div>
      </div>
    );
  }

  // Handle authentication errors
  // Jika siswa sudah login via NIS, skip auth error redirect (biarkan akses Portal Siswa)
  if (authError && !siswaUser) {
    if (authError.type === 'user_not_registered') {
      return <UserNotRegisteredError />;
    } else if (authError.type === 'auth_required') {
      // Don't redirect to base44 login, show our custom page
      return <Navigate to="/Masuk" replace />;
    }
  }

  return (
    <Routes>
      {/* Public routes - no layout/auth needed */}
      <Route path="/Masuk" element={<Masuk />} />
      <Route path="/Pengaturan" element={
        isAuthenticated
          ? <LayoutWrapper currentPageName="Pengaturan"><Pengaturan /></LayoutWrapper>
          : <Navigate to="/Masuk" replace />
      } />
      <Route path="/SiswaPortal" element={
        siswaUser ? <SiswaPortal /> : <Navigate to="/Masuk" replace />
      } />

      {/* Staff routes - require Base44 auth */}
      <Route path="/" element={
        isAuthenticated
          ? (isKepsek
            ? <Kepsek />
            : <LayoutWrapper currentPageName={mainPageKey}><MainPage /></LayoutWrapper>)
          : <Navigate to="/Masuk" replace />
      } />
      <Route path="/Kepsek" element={
        isAuthenticated
          ? <Kepsek />
          : <Navigate to="/Masuk" replace />
      } />
      <Route path="/HomeVisit" element={
        isAuthenticated
          ? <LayoutWrapper currentPageName="HomeVisit"><HomeVisit /></LayoutWrapper>
          : <Navigate to="/Masuk" replace />
      } />
      <Route path="/AbsensiPegawai" element={
        isAuthenticated
          ? <LayoutWrapper currentPageName="AbsensiPegawai"><AbsensiPegawai /></LayoutWrapper>
          : <Navigate to="/Masuk" replace />
      } />
      <Route path="/PeriodikSiswa" element={
        isAuthenticated
          ? <LayoutWrapper currentPageName="PeriodikSiswa"><PeriodikSiswa /></LayoutWrapper>
          : <Navigate to="/Masuk" replace />
      } />
      <Route path="/Sarpras" element={
        isAuthenticated
          ? <LayoutWrapper currentPageName="Sarpras"><Sarpras /></LayoutWrapper>
          : <Navigate to="/Masuk" replace />
      } />
      <Route path="/ScanAbsensi" element={
        isAuthenticated
          ? <LayoutWrapper currentPageName="ScanAbsensi"><ScanAbsensi /></LayoutWrapper>
          : <Navigate to="/Masuk" replace />
      } />
      <Route path="/ProsesTahunAjaran" element={
        isAuthenticated
          ? <LayoutWrapper currentPageName="ProsesTahunAjaran"><ProsesTahunAjaran /></LayoutWrapper>
          : <Navigate to="/Masuk" replace />
      } />
      <Route path="/JadwalPiketPegawai" element={
        isAuthenticated
          ? <LayoutWrapper currentPageName="JadwalPiketPegawai"><JadwalPiketPegawai /></LayoutWrapper>
          : <Navigate to="/Masuk" replace />
      } />
      <Route path="/Hapalan" element={
        isAuthenticated
          ? <LayoutWrapper currentPageName="Hapalan"><Hapalan /></LayoutWrapper>
          : <Navigate to="/Masuk" replace />
      } />
      <Route path="/ProfilSekolah" element={
        isAuthenticated
          ? <LayoutWrapper currentPageName="ProfilSekolah"><ProfilSekolah /></LayoutWrapper>
          : <Navigate to="/Masuk" replace />
      } />
      <Route path="/BukuTamu" element={
        isAuthenticated
          ? <LayoutWrapper currentPageName="BukuTamu"><BukuTamu /></LayoutWrapper>
          : <Navigate to="/Masuk" replace />
      } />

      {Object.entries(Pages).map(([path, Page]) => (
        <Route
          key={path}
          path={`/${path}`}
          element={
            isAuthenticated
              ? <LayoutWrapper currentPageName={path}><Page /></LayoutWrapper>
              : <Navigate to="/Masuk" replace />
          }
        />
      ))}

      <Route path="*" element={<PageNotFound />} />
    </Routes>
  );
};

function App() {
  return (
    <AuthProvider>
      <QueryClientProvider client={queryClientInstance}>
        <ActiveAcademicYearProvider>
          <RealtimeSyncProvider>
            <Router>
              <NavigationTracker />
              <AuthenticatedApp />
            </Router>
          </RealtimeSyncProvider>
          <Toaster />
          <VisualEditAgent />
        </ActiveAcademicYearProvider>
      </QueryClientProvider>
    </AuthProvider>
  )
}

export default App