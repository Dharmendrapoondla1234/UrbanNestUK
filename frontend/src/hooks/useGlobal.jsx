import { createContext, useContext, useState } from 'react';
// FIX: removed unused `useEffect` import
import { generateCitiesForCountry, SUPPORTED_COUNTRIES, COUNTRY_CITY_FALLBACKS } from '../services/gemini.js';

const GlobalCtx = createContext(null);

export function GlobalProvider({ children }) {
  const [country, setCountry] = useState('United Kingdom');
  const [city, setCity]       = useState('London');
  const [cities, setCities]   = useState(COUNTRY_CITY_FALLBACKS['United Kingdom']);
  const [citiesLoading, setCitiesLoading] = useState(false);

  async function changeCountry(newCountry) {
    setCountry(newCountry);
    setCity('');
    setCities([]);
    setCitiesLoading(true);
    try {
      const list = await generateCitiesForCountry(newCountry);
      const safeList = Array.isArray(list) && list.length > 0 ? list : (COUNTRY_CITY_FALLBACKS[newCountry] || COUNTRY_CITY_FALLBACKS['United Kingdom']);
      setCities(safeList);
      setCity(safeList[0] || '');
    } catch {
      const fallback = COUNTRY_CITY_FALLBACKS[newCountry] || COUNTRY_CITY_FALLBACKS['United Kingdom'];
      setCities(fallback);
      setCity(fallback[0] || '');
    } finally {
      setCitiesLoading(false);
    }
  }

  return (
    <GlobalCtx.Provider value={{ country, city, setCity, cities, citiesLoading, changeCountry, supportedCountries: SUPPORTED_COUNTRIES }}>
      {children}
    </GlobalCtx.Provider>
  );
}

export function useGlobal() {
  const ctx = useContext(GlobalCtx);
  if (!ctx) throw new Error('useGlobal must be used within GlobalProvider');
  return ctx;
}
