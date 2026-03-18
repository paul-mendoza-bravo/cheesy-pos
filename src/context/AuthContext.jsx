import React, { createContext, useState, useContext, useEffect } from 'react';

const AuthContext = createContext();
export const useAuth = () => useContext(AuthContext);

const API_URL = 'http://localhost:3001/api';

const MASTER_PASSWORD = 'Cheesy12345';

export const AuthProvider = ({ children }) => {
  const [currentUser, setCurrentUser] = useState(null);
  
  const [usersDB, setUsersDB] = useState({});
  const [loading, setLoading] = useState(true);

  // Fetch all users on mount (Admin only usually, but for context we fetch)
  const fetchUsers = async () => {
    try {
      const res = await fetch(`${API_URL}/users`);
      if (res.ok) {
        const usersArray = await res.json();
        const usersMap = {};
        usersArray.forEach(u => usersMap[u.id] = u);
        setUsersDB(usersMap);
      }
    } catch (error) {
      console.error("Failed to fetch users", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchUsers();
  }, []);

  useEffect(() => {
    const session = localStorage.getItem('cheesy_session');
    if (session) {
      const user = JSON.parse(session);
      // Re-verify if it's still active in DB
      if (usersDB[user.id] && usersDB[user.id].status === 'ACTIVE') {
         setCurrentUser(usersDB[user.id]);
      } else {
         logout();
      }
    }
  }, [usersDB]);

  const login = async (rawUserId, password) => {
    const uppercaseId = rawUserId.trim().toUpperCase();

    try {
      const res = await fetch(`${API_URL}/users/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId: uppercaseId, password })
      });
      
      const data = await res.json();
      
      if (!data.success) {
        // Maneja el caso de registro automático (PENDING) si el API devuelve el user creado
        if (data.user) {
           setUsersDB(prev => ({ ...prev, [data.user.id]: data.user }));
        }
        return { success: false, message: data.message };
      }

      // Login exitoso
      const user = data.user;
      setCurrentUser(user);
      localStorage.setItem('cheesy_session', JSON.stringify(user));
      
      // Refrescar lista de usuarios local
      if (usersDB[user.id]) {
         setUsersDB(prev => ({ ...prev, [user.id]: user }));
      }
      
      return { success: true, user };

    } catch (error) {
      console.error('Login request failed', error);
      return { success: false, message: 'Fallo al conectar con el servidor.' };
    }
  };

  const logout = () => {
    setCurrentUser(null);
    localStorage.removeItem('cheesy_session');
  };

  // Funciones para el SuperAdmin
  const pendingUsers = Object.values(usersDB).filter(u => u.status === 'PENDING_APPROVAL');
  const activeUsers = Object.values(usersDB).filter(u => u.status === 'ACTIVE' && u.id.trim() !== 'SUPERADMIN'); // Ocultar superadmin de la lista editable
  
  const approveUser = async (userId) => {
    try {
      const res = await fetch(`${API_URL}/users/${userId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: 'ACTIVE' }) // el backend ya lo tiene por defecto en 'ayudante' si era nuevo, o el update respeta el actual
      });
      if (res.ok) {
        const updatedUser = await res.json();
        setUsersDB(prev => ({ ...prev, [userId]: updatedUser }));
      }
    } catch(err) { console.error(err); }
  };

  const rejectUser = async (userId) => {
    try {
      const res = await fetch(`${API_URL}/users/${userId}`, { method: 'DELETE' });
      if (res.ok) {
        const newDB = { ...usersDB };
        delete newDB[userId];
        setUsersDB(newDB);
      }
    } catch(err) { console.error(err); }
  };

  const updateUserRole = async (userId, newRole) => {
    try {
      const res = await fetch(`${API_URL}/users/${userId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ role: newRole })
      });
      if (res.ok) {
        const updatedUser = await res.json();
        setUsersDB(prev => ({ ...prev, [userId]: updatedUser }));
        
        // Update current session if it's the logged-in user
        if (currentUser?.id === userId) {
           setCurrentUser(updatedUser);
           localStorage.setItem('cheesy_session', JSON.stringify(updatedUser));
        }
      }
    } catch(err) { console.error(err); }
  };

  return (
    <AuthContext.Provider value={{ 
      currentUser, 
      login, 
      logout,
      pendingUsers,
      activeUsers,
      approveUser,
      rejectUser,
      updateUserRole,
      usersDB
    }}>
      {children}
    </AuthContext.Provider>
  );
};
