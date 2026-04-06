import { createContext, useContext, useState, useEffect } from 'react';
import { generateCitiesForCountry, SUPPORTED_COUNTRIES, COUNTRY_CITY_FALLBACKS } from '../services/gemini.js';

const GlobalCtx = createContext(null);

export function GlobalProvider({ children }) {
  const [country, setCountry] = useState('United Kingdom');
  const [city, setCity]       = useState('London');
  const [cities, setCities]   = useState(COUNTRY_CITY_FALLBACKS['United Kingdom']);
  const [citiesLoading, setCitiesLoading] = useState(false);

  async function changeCountry(newCountry) {
    setCountry(newCountry);
    setCitiesLoading(true);
    try {
      const list = await generateCitiesForCountry(newCountry);
      setCities(list);
      setCity(list[0] || '');
    } finally {
      setCitiesLoading(false);
    }
  }

  return (
    <GlobalCtx.Provider value={{
      country, city, setCity,
      cities, citiesLoading,
      changeCountry,
      supportedCountries: SUPPORTED_COUNTRIES,
    }}>
      {children}
    </GlobalCtx.Provider>
  );
}

export function useGlobal() { return useContext(GlobalCtx); }
