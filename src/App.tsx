import { Routes, Route, useLocation } from 'react-router-dom';
import { AnimatePresence, LayoutGroup } from 'motion/react';
import { Home as HomeIcon, Search as SearchIcon, Phone, User } from 'lucide-react';
import { BottomNav, BottomNavItem } from './components/ui/bottom-nav';
import { PageWrapper } from './components/ui/page-wrapper';
import { ProtectedRoute } from './components/ui/protected-route';
import { FilterProvider } from './contexts/filter-context';
import { SplashScreen } from './components/ui/splash-screen';
import { useShowBottomNav } from './config/navigation';

import { Home } from './pages/home';
import { Search } from './pages/search';
import { Contact } from './pages/favorites';
import { Profile } from './pages/profile';
import { Filters } from './pages/filters';
import { PropertyDetails } from './pages/property-details';
import { Login } from './pages/login';
import { Dashboard } from './pages/dashboard';
import { PropertyForm } from './pages/property-form';
import { GalleryManagement } from './pages/gallery-management';

function AppRoutes() {
  const location = useLocation();
  const showBottomNav = useShowBottomNav();

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
              <PageWrapper>
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
              <PageWrapper>
                <PropertyDetails />
              </PageWrapper>
            }
          />
          <Route
            path="/login"
            element={
              <PageWrapper>
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

      {showBottomNav && (
        <BottomNav>
          <BottomNavItem icon={<HomeIcon size={24} />} label="Início" to="/" />
          <BottomNavItem icon={<SearchIcon size={24} />} label="Buscar" to="/search" />
          <BottomNavItem icon={<Phone size={24} />} label="Contato" to="/contact" />
          <BottomNavItem icon={<User size={24} />} label="Perfil" to="/profile" />
        </BottomNav>
      )}
    </LayoutGroup>
  );
}

function App() {
  return (
    <SplashScreen>
      <FilterProvider>
        <AppRoutes />
      </FilterProvider>
    </SplashScreen>
  );
}

export default App;
