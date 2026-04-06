import { useState } from 'react';
import { AuthProvider } from './hooks/useAuth.jsx';
import { GlobalProvider } from './hooks/useGlobal.jsx';
import Navbar from './components/layout/Navbar.jsx';
import Home from './pages/Home.jsx';
import Search from './pages/Search.jsx';
import MapPage from './pages/Map.jsx';
import Advisor from './pages/Advisor.jsx';
import Predict from './pages/Predict.jsx';
import Market from './pages/Market.jsx';

export default function App() {
  const [page, setPage]             = useState('home');
  const [searchParams, setSearchParams] = useState({});

  function navigateTo(p) { setPage(p); window.scrollTo(0, 0); }

  function handleSearch(params) {
    setSearchParams(params);
    setPage('search');
    window.scrollTo(0, 0);
  }

  function renderPage() {
    switch (page) {
      case 'home':    return <Home setPage={navigateTo} setSearchParams={handleSearch} />;
      case 'search':  return <Search initialParams={searchParams} />;
      case 'map':     return <MapPage />;
      case 'advisor': return <Advisor />;
      case 'predict': return <Predict />;
      case 'market':  return <Market />;
      default:        return <Home setPage={navigateTo} setSearchParams={handleSearch} />;
    }
  }

  return (
    <AuthProvider>
      <GlobalProvider>
        <div style={{ minHeight: '100vh', background: '#070910', color: '#eef2ff' }}>
          <Navbar page={page} setPage={navigateTo} />
          {renderPage()}
        </div>
      </GlobalProvider>
    </AuthProvider>
  );
}
