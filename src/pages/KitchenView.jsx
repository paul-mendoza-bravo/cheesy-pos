import React, { useEffect } from 'react';
import { useOrders } from '../context/OrdersContext';
import { useAuth } from '../context/AuthContext';
import OrderTicketItem from '../components/OrderTicketItem';
import { ChefHat } from 'lucide-react';

const KitchenView = () => {
  const { orders, updateOrderStatus } = useOrders();
  const { currentUser } = useAuth();
  
  const pendingOrders = orders.filter(o => o.status === 'PENDING');

  // Forzar Dark Mode estricto en el body mientras se esté en esta vista
  useEffect(() => {
    document.documentElement.style.setProperty('--bg-color', '#000000');
    document.documentElement.style.setProperty('--bg-container', '#111111');
    document.documentElement.style.setProperty('--text-main', '#ffffff');
    document.documentElement.style.setProperty('--text-muted', '#888888');
    document.documentElement.style.setProperty('--border-color', '#333333');
    
    return () => {
      // Restaurar estilos (esto asume light mode por defecto si no hay prefer-color-scheme dark)
      document.documentElement.style.removeProperty('--bg-color');
      document.documentElement.style.removeProperty('--bg-container');
      document.documentElement.style.removeProperty('--text-main');
      document.documentElement.style.removeProperty('--text-muted');
      document.documentElement.style.removeProperty('--border-color');
    };
  }, []);

  return (
    <div style={{ paddingBottom: '40px' }}>
      <div style={{ marginBottom: '24px', display: 'flex', alignItems: 'center', gap: '8px' }}>
        <ChefHat size={28} color="var(--primary-color)" />
        <h1 style={{ fontSize: '24px', fontWeight: 'bold' }}>LÍNEA DE COCINA</h1>
      </div>

      {pendingOrders.length === 0 ? (
        <div style={{ textAlign: 'center', padding: '40px 20px', color: 'var(--text-muted)' }}>
          <p>LÍNEA LIMPIA. NO HAY ÓRDENES PENDIENTES.</p>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          {pendingOrders.map(order => (
            <OrderTicketItem 
              key={order.id} 
              order={order} 
              actionButton={(id) => updateOrderStatus(id, 'READY', currentUser?.id)}
              actionLabel="MARCAR LISTO"
              actionColor="var(--success-color)"
            />
          ))}
        </div>
      )}
    </div>
  );
};

export default KitchenView;
