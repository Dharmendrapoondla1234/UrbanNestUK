/**
 * UrbanNest AI — Global App State
 * Country, city, and user preferences shared across all pages.
 */
import { createContext, useContext, useState, useEffect } from 'react';
import { getCountries } from '../services/api.js';

const GlobalCtx = createContext(null);

export function GlobalProvider({ children }) {
  const [country, setCountry]   = useState('uk');
  const [city, setCity]         = useState('London');
  const [countries, setCountries] = useState({});
  const [loading, setLoading]   = useState(true);

  useEffect(() => {
    getCountries()
      .then(data => {
        setCountries(data);
        // Restore from localStorage
        const savedCountry = localStorage.getItem('un_country');
        const savedCity    = localStorage.getItem('un_city');
        if (savedCountry && data[savedCountry]) setCountry(savedCountry);
        if (savedCity) setCity(savedCity);
      })
      .catch(() => {
        // Fallback config if backend unavailable
        setCountries({
          uk:    { cities: ['London','Manchester','Birmingham','Edinburgh','Bristol'], symbol: '£', property_types: ['Flat','Terraced House','Semi-Detached','Detached House'] },
          india: { cities: ['Mumbai','Delhi','Bangalore','Hyderabad','Chennai','Pune'], symbol: '₹', property_types: ['1BHK','2BHK','3BHK','Villa','Plot'] },
        });
      })
      .finally(() => setLoading(false));
  }, []);

  function changeCountry(c) {
    setCountry(c);
    const cfg = countries[c];
    const defaultCity = cfg?.default_city || (cfg?.cities || [])[0] || '';
    setCity(defaultCity);
    localStorage.setItem('un_country', c);
    localStorage.setItem('un_city', defaultCity);
  }

  function changeCity(c) {
    setCity(c);
    localStorage.setItem('un_city', c);
  }

  const cfg      = countries[country] || {};
  const cities   = cfg.cities || [];
  const symbol   = cfg.symbol || '£';
  const propTypes = cfg.property_types || [];

  return (
    <GlobalCtx.Provider value={{
      country, city, countries, cities, symbol, propTypes,
      loading, changeCountry, changeCity,
    }}>
      {children}
    </GlobalCtx.Provider>
  );
}

export function useGlobal() {
  const ctx = useContext(GlobalCtx);
  if (!ctx) throw new Error('useGlobal must be used within GlobalProvider');
  return ctx;
}
