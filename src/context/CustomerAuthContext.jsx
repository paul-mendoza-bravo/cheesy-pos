import React, { createContext, useContext, useState, useEffect } from 'react';

const BACKEND_URL = import.meta.env.VITE_API_URL || `http://${window.location.hostname}:3001`;
const STORAGE_KEY = 'cheesy_customer_token';

const CustomerAuthContext = createContext(null);

export const CustomerAuthProvider = ({ children }) => {
  const [customer, setCustomer] = useState(null);
  const [token, setToken] = useState(() => localStorage.getItem(STORAGE_KEY));
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Al montar, si hay token guardado, parsear el payload
  useEffect(() => {
    if (token) {
      try {
        const payload = JSON.parse(atob(token.split('.')[1]));
        // Verificar expiración
        if (payload.exp * 1000 < Date.now()) {
          logout();
        } else {
          setCustomer({ id: payload.id, name: payload.name, email: payload.email });
        }
      } catch {
        logout();
      }
    }
    setLoading(false);
  }, []);

  const saveSession = (customerData, jwt) => {
    localStorage.setItem(STORAGE_KEY, jwt);
    setToken(jwt);
    setCustomer(customerData);
    setError(null);
  };

  const register = async (name, email, phone, password) => {
    setError(null);
    const res = await fetch(`${BACKEND_URL}/api/client/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name, email, phone, password }),
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || 'Error al registrarse.');
    saveSession(data.customer, data.token);
    return data;
  };

  const login = async (phone, password) => {
    setError(null);
    const res = await fetch(`${BACKEND_URL}/api/client/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ phone, password }),
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || 'Credenciales incorrectas.');
    saveSession(data.customer, data.token);
    return data;
  };

  const logout = () => {
    localStorage.removeItem(STORAGE_KEY);
    setToken(null);
    setCustomer(null);
  };

  return (
    <CustomerAuthContext.Provider value={{ customer, token, loading, error, register, login, logout }}>
      {children}
    </CustomerAuthContext.Provider>
  );
};

export const useCustomerAuth = () => {
  const ctx = useContext(CustomerAuthContext);
  if (!ctx) throw new Error('useCustomerAuth debe usarse dentro de CustomerAuthProvider');
  return ctx;
};
