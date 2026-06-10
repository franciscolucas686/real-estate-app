import { useEffect, useRef, useState } from 'react';
import { Routes, Route, useLocation } from 'react-router-dom';
import { AnimatePresence, LayoutGroup, motion } from 'motion/react';
import { Search as SearchIcon, Phone, User, LayoutDashboard } from 'lucide-react';
import { BottomNav, BottomNavItem } from './components/ui/bottom-nav';
import { PageWrapper } from './components/ui/page-wrapper';
import { ProtectedRoute } from './components/ui/protected-route';
import { FilterProvider } from './contexts/filter-context';
import { SplashScreen } from './components/ui/splash-screen';
import { useShowBottomNav } from './config/navigation';
import { useMe } from './hooks/use-auth';

import { Home } from './pages/home';
import { Search } from './pages/search';
import { Contact } from './pages/contact';
import { Profile } from './pages/profile';
import { Filters } from './pages/filters';
import { PropertyDetails } from './pages/property-details';
import { Login } from './pages/login';
import { Dashboard } from './pages/dashboard';
import { Settings } from './pages/settings';
import { PropertyForm } from './pages/property-form';
import { GalleryManagement } from './pages/gallery-management';

function AppBottomNav() {
  const { data: user } = useMe();
  const isAuth = Boolean(user);

  return (
    <BottomNav>
      <BottomNavItem icon={<SearchIcon size={24} />} label="Explorar" to="/search" />
      <BottomNavItem icon={<Phone size={24} />} label="Contato" to="/contact" />
      {isAuth ? (
        <BottomNavItem icon={<LayoutDashboard size={24} />} label="Dashboard" to="/dashboard" />
      ) : (
        <BottomNavItem icon={<User size={24} />} label="Entrar" to="/login" />
      )}
    </BottomNav>
  );
}

function AppRoutes() {
  const location = useLocation();
  const showBottomNav = useShowBottomNav();
  const scrollPositions = useRef<Record<string, number>>({});

  useEffect(() => {
    const path = location.pathname;
    const savedPositions = scrollPositions.current;
    window.scrollTo(0, savedPositions[path] ?? 0);
    return () => {
      savedPositions[path] = window.scrollY;
    };
  }, [location.pathname]);

  return (
    <LayoutGroup>
      <AnimatePresence mode="popLayout">
        <Routes location={location} key={location.pathname}>
          {/* Public */}
          <Route
            path="/"
            element={
              <PageWrapper>
                <Home />
              </PageWrapper>
            }
          />
          <Route
            path="/search"
            element={
              <PageWrapper>
                <Search />
              </PageWrapper>
            }
          />
          <Route
            path="/search/filters"
            element={
              <PageWrapper>
                <Filters />
              </PageWrapper>
            }
          />
          <Route
            path="/contact"
            element={
              <PageWrapper noScroll>
                <Contact />
              </PageWrapper>
            }
          />
          <Route
            path="/profile"
            element={
              <PageWrapper>
                <Profile />
              </PageWrapper>
            }
          />
          <Route
            path="/properties/:id"
            element={
              <PageWrapper
                initial={{ x: '100%' }}
                animate={{ x: 0 }}
                exit={{ x: '100%' }}
                transition={{ type: 'spring', damping: 30, stiffness: 300 }}
              >
                <PropertyDetails />
              </PageWrapper>
            }
          />
          <Route
            path="/login"
            element={
              <PageWrapper noScroll>
                <Login />
              </PageWrapper>
            }
          />

          {/* Private */}
          <Route
            path="/dashboard"
            element={
              <ProtectedRoute>
                <PageWrapper>
                  <Dashboard />
                </PageWrapper>
              </ProtectedRoute>
            }
          />
          <Route
            path="/settings"
            element={
              <ProtectedRoute>
                <PageWrapper>
                  <Settings />
                </PageWrapper>
              </ProtectedRoute>
            }
          />
          <Route
            path="/properties/new"
            element={
              <ProtectedRoute>
                <PageWrapper>
                  <PropertyForm />
                </PageWrapper>
              </ProtectedRoute>
            }
          />
          <Route
            path="/properties/:id/edit"
            element={
              <ProtectedRoute>
                <PageWrapper>
                  <PropertyForm />
                </PageWrapper>
              </ProtectedRoute>
            }
          />
          <Route
            path="/properties/:id/gallery"
            element={
              <ProtectedRoute>
                <PageWrapper>
                  <GalleryManagement />
                </PageWrapper>
              </ProtectedRoute>
            }
          />
        </Routes>
      </AnimatePresence>

      {showBottomNav && <AppBottomNav />}
    </LayoutGroup>
  );
}

const SESSION_KEY = '__splash_shown__';

function App() {
  const [splashVisible, setSplashVisible] = useState(() => {
    if (sessionStorage.getItem(SESSION_KEY)) return false;
    sessionStorage.setItem(SESSION_KEY, '1');
    return true;
  });

  useEffect(() => {
    if (!splashVisible) return;
    const timer = setTimeout(() => setSplashVisible(false), 2000);
    return () => clearTimeout(timer);
  }, [splashVisible]);

  return (
    <AnimatePresence mode="wait">
      {splashVisible ? (
        <motion.div
          key="splash-container"
          initial={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.4, ease: 'easeOut' }}
          className="fixed inset-0 z-9999 flex items-center justify-center bg-background"
        >
          <SplashScreen />
        </motion.div>
      ) : (
        <motion.div
          key="app-content"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.2 }}
        >
          <FilterProvider>
            <AppRoutes />
          </FilterProvider>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

export default App;
