import { Routes, Route, useLocation } from 'react-router-dom';
import { AnimatePresence } from 'motion/react';
import { BottomNav, BottomNavItem } from './components/ui/bottom-nav';
import { PageWrapper } from './components/ui/page-wrapper';
import { Home as HomeIcon, Search as SearchIcon, Heart, User } from 'lucide-react';
import { Home } from './pages/home';
import { Search } from './pages/search';
import { Favorites } from './pages/favorites';
import { Profile } from './pages/profile';

function App() {
  const location = useLocation();

  return (
    <>
      <AnimatePresence mode="wait">
        <Routes location={location} key={location.pathname}>
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
            path="/favorites"
            element={
              <PageWrapper>
                <Favorites />
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
        </Routes>
      </AnimatePresence>

      <BottomNav>
        <BottomNavItem icon={<HomeIcon size={24} />} to="/" aria-label="Início" />
        <BottomNavItem icon={<SearchIcon size={24} />} to="/search" aria-label="Buscar" />
        <BottomNavItem icon={<Heart size={24} />} to="/favorites" aria-label="Favoritos" />
        <BottomNavItem icon={<User size={24} />} to="/profile" aria-label="Perfil" />
      </BottomNav>
    </>
  );
}

export default App;
