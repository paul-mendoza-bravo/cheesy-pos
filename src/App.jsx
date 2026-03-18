import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';
import { CartProvider } from './context/CartContext';
import { OrdersProvider } from './context/OrdersContext';

import RoleSwitcher from './components/RoleSwitcher';
import PosMenu from './pages/PosMenu';
import KitchenView from './pages/KitchenView';
import DeliveryView from './pages/DeliveryView';
import AdminDashboard from './pages/AdminDashboard';
import UserManagement from './pages/UserManagement';
import Login from './pages/Login';

const PrivateRoute = ({ children, allowedRoles }) => {
  const { currentUser } = useAuth();
  
  if (!currentUser) {
    return <Navigate to="/login" replace />;
  }

  // Verificación de Roles (Role-Based Access Control)
  if (allowedRoles && !allowedRoles.includes(currentUser.role) && currentUser.role !== 'admin') {
    // Si no tiene el rol y no es admin supremo, lo mandamos a la caja (o ruta por defecto)
    return <Navigate to="/pos" replace />;
  }
  
  return (
    <div className="app-layout">
      {/* RoleSwitcher Solo visible si se está autenticado */}
      <RoleSwitcher />
      <div className="app-content">
        {children}
      </div>
    </div>
  );
};

function App() {
  return (
    <AuthProvider>
      <OrdersProvider>
        <CartProvider>
          <BrowserRouter>
            <Routes>
              <Route path="/login" element={<Login />} />
              <Route path="/" element={<Navigate to="/pos" replace />} />
              
              {/* Rutas Protegidas por Rol */}
              <Route path="/pos" element={
                <PrivateRoute allowedRoles={['ayudante']}>
                  <PosMenu />
                </PrivateRoute>
              } />
              
              <Route path="/kitchen" element={
                <PrivateRoute allowedRoles={['parillero']}>
                  <KitchenView />
                </PrivateRoute>
              } />

              <Route path="/delivery" element={
                <PrivateRoute allowedRoles={['repartidor']}>
                  <DeliveryView />
                </PrivateRoute>
              } />

              {/* Rutas exclusivas para Admin o Marketer */}
              <Route path="/admin" element={
                <PrivateRoute allowedRoles={['marketer', 'admin']}>
                  <AdminDashboard />
                </PrivateRoute>
              } />

              {/* User Management estrictamente para Admin (manejado internamente también) */}
              <Route path="/admin/users" element={
                <PrivateRoute allowedRoles={['admin']}>
                  <UserManagement />
                </PrivateRoute>
              } />

            </Routes>
          </BrowserRouter>
        </CartProvider>
      </OrdersProvider>
    </AuthProvider>
  );
}

export default App;
