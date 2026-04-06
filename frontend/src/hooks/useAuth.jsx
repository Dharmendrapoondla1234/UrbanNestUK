import { createContext, useContext, useState } from 'react';
const AuthCtx = createContext(null);
export function AuthProvider({ children }) {
  const [user, setUser] = useState(() => {
    try { return JSON.parse(localStorage.getItem('un_user')) || null; } catch { return null; }
  });
  function signIn(name, email) {
    const u = { name, email, id: Date.now().toString() };
    setUser(u); localStorage.setItem('un_user', JSON.stringify(u));
  }
  function signOut() { setUser(null); localStorage.removeItem('un_user'); }
  return <AuthCtx.Provider value={{ user, signIn, signOut }}>{children}</AuthCtx.Provider>;
}
export function useAuth() { return useContext(AuthCtx); }
