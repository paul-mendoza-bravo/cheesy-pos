import React from 'react';
import { BrowserRouter, Routes, Route, Navigate, Outlet } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';
import { CartProvider } from './context/CartContext';
import { OrdersProvider } from './context/OrdersContext';
import { InventoryProvider } from './context/InventoryContext';
import { CustomerAuthProvider, useCustomerAuth } from './context/CustomerAuthContext';

import RoleSwitcher from './components/RoleSwitcher';
import PosMenu from './pages/PosMenu';
import KitchenView from './pages/KitchenView';
import DeliveryView from './pages/DeliveryView';
import AdminDashboard from './pages/AdminDashboard';
import UserManagement from './pages/UserManagement';
import Login from './pages/Login';
import ClientLogin from './pages/ClientLogin';
import ClientMenu from './pages/ClientMenu';
import ClientOrderStatus from './pages/ClientOrderStatus';

// ============================================================
// B2B — Shell del Panel Interno
// Monta OrdersProvider (y su socket) SOLO cuando un miembro
// del staff está autenticado y navega a una ruta interna.
// ============================================================
const StaffShell = () => {
  const { currentUser } = useAuth();
  if (!currentUser) return <Navigate to="/login" replace />;

  return (
    <OrdersProvider>
      <InventoryProvider>
        <CartProvider>
          <div className="app-layout">
            <RoleSwitcher />
            <div className="app-content">
              <Outlet />
            </div>
          </div>
        </CartProvider>
      </InventoryProvider>
    </OrdersProvider>
  );
};

// Guard de rol dentro del shell — redirige si el rol no aplica.
// Admin tiene acceso implícito a cualquier ruta del shell.
const StaffRoleGuard = ({ allowedRoles }) => {
  const { currentUser } = useAuth();
  const userRoles = currentUser?.role ? currentUser.role.split(',') : [];
  const hasAccess =
    !allowedRoles ||
    userRoles.includes('admin') ||
    userRoles.some((r) => allowedRoles.includes(r));

  return hasAccess ? <Outlet /> : <Navigate to="/pos" replace />;
};

// ============================================================
// B2C — Guard de autenticación del portal cliente
// No necesita providers propios: CustomerAuthProvider
// ya está en el nivel raíz (es solo una lectura de localStorage).
// ============================================================
const ClientAuthGuard = () => {
  const { customer, loading } = useCustomerAuth();
  if (loading) return null;
  return customer ? <Outlet /> : <Navigate to="/client/login" replace />;
};

// ============================================================
// App — BrowserRouter al tope del árbol para que todos
// los providers descendientes puedan usar hooks del router.
// ============================================================
function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <CustomerAuthProvider>
          <Routes>
            {/* ===== Rutas completamente públicas ===== */}
            <Route path="/login" element={<Login />} />
            <Route path="/client/login" element={<ClientLogin />} />
            <Route path="/" element={<Navigate to="/login" replace />} />
            <Route path="/client" element={<Navigate to="/client/login" replace />} />

            {/* ===== Zona B2B: Panel Interno del Staff ===== */}
            {/* StaffShell verifica auth y monta el socket de órdenes */}
            <Route element={<StaffShell />}>
              <Route element={<StaffRoleGuard allowedRoles={['ayudante']} />}>
                <Route path="/pos" element={<PosMenu />} />
              </Route>

              <Route element={<StaffRoleGuard allowedRoles={['parillero']} />}>
                <Route path="/kitchen" element={<KitchenView />} />
              </Route>

              <Route element={<StaffRoleGuard allowedRoles={['repartidor']} />}>
                <Route path="/delivery" element={<DeliveryView />} />
              </Route>

              <Route element={<StaffRoleGuard allowedRoles={['marketer', 'admin']} />}>
                <Route path="/admin" element={<AdminDashboard />} />
              </Route>

              <Route element={<StaffRoleGuard allowedRoles={['admin']} />}>
                <Route path="/admin/users" element={<UserManagement />} />
              </Route>
            </Route>

            {/* ===== Zona B2C: Portal del Cliente Directo ===== */}
            {/* ClientAuthGuard verifica el JWT del cliente */}
            <Route element={<ClientAuthGuard />}>
              <Route path="/client/menu" element={<ClientMenu />} />
              <Route path="/client/order-status/:orderId" element={<ClientOrderStatus />} />
            </Route>
          </Routes>
        </CustomerAuthProvider>
      </AuthProvider>
    </BrowserRouter>
  );
}

export default App;
