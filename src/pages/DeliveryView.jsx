import React from 'react';
import { useOrders } from '../context/OrdersContext';
import { useAuth } from '../context/AuthContext';
import OrderTicketItem from '../components/OrderTicketItem';
import { Bike } from 'lucide-react'; 

const DeliveryView = () => {
  const { orders, updateOrderStatus } = useOrders();
  const { currentUser } = useAuth();
  
  const readyOrders = orders.filter(o => o.status === 'READY');
  const pendingOrders = orders.filter(o => o.status === 'PENDING');

  return (
    <div style={{ paddingBottom: '40px' }}>
      <div style={{ marginBottom: '24px', display: 'flex', alignItems: 'center', gap: '8px' }}>
        <Bike size={28} color="var(--primary-color)" />
        <h1 style={{ fontSize: '24px' }}>Dashboard del Repartidor</h1>
      </div>

      {readyOrders.length === 0 && pendingOrders.length === 0 && (
        <div style={{ textAlign: 'center', padding: '40px 20px', color: 'var(--text-muted)' }}>
          <p>No hay órdenes en curso. Tómate un descanso.</p>
        </div>
      )}

      {readyOrders.length > 0 && (
        <div style={{ marginBottom: '32px' }}>
          <h2 style={{ fontSize: '18px', marginBottom: '16px', color: 'var(--success-color)' }}>Listas para Entregar ({readyOrders.length})</h2>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            {readyOrders.map(order => (
              <OrderTicketItem 
                key={order.id} 
                order={order} 
                actionButton={(id) => updateOrderStatus(id, 'DELIVERED', currentUser?.id)}
                actionLabel="Marcar como Entregado"
                actionColor="var(--success-color)" 
              />
            ))}
          </div>
        </div>
      )}

      {pendingOrders.length > 0 && (
        <div>
          <h2 style={{ fontSize: '18px', marginBottom: '16px', color: 'var(--primary-color)' }}>Cocinando... ({pendingOrders.length})</h2>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '16px', opacity: 0.7 }}>
            {pendingOrders.map(order => (
              <OrderTicketItem 
                key={order.id} 
                order={order} 
                actionButton={() => {}} // Disabled action
                actionLabel="Esperando a Cocina"
                actionColor="var(--text-muted)" 
              />
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

export default DeliveryView;
