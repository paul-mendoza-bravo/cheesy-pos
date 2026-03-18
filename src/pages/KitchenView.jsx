import React, { useEffect, useState } from 'react';
import { useOrders } from '../context/OrdersContext';
import { useAuth } from '../context/AuthContext';
import { useInventory } from '../context/InventoryContext';
import OrderTicketItem from '../components/OrderTicketItem';
import { ChefHat, ClipboardCheck, X } from 'lucide-react';

const INGREDIENTS_LIST = [
  'Carne Hamburguesa', 'Queso Cheddar', 'Tocino', 'Pan', 
  'Papas Francesas', 'Cebolla', 'Tomate', 'Lechuga', 
  'Aderezo Clásico', 'Aderezo BBQ', 'Cajas Hamburguesa', 
  'Bolsas Delivery', 'Papel Encerado', 'Servilletas', 'Refrescos'
];

const KitchenView = () => {
  const { orders, updateOrderStatus } = useOrders();
  const { addReport } = useInventory();
  const { currentUser } = useAuth();
  
  const pendingOrders = orders.filter(o => o.status === 'PENDING');

  const [showModal, setShowModal] = useState(false);
  const [missingItems, setMissingItems] = useState([]);

  const toggleItem = (item) => {
    setMissingItems(prev => prev.includes(item) ? prev.filter(i => i !== item) : [...prev, item]);
  };

  const handleSubmitInventory = async () => {
    await addReport(missingItems, currentUser?.id);
    setMissingItems([]);
    setShowModal(false);
    alert('¡Reporte de inventario enviado al Administrador exitosamente!');
  };

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
      <div style={{ marginBottom: '24px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '8px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <ChefHat size={28} color="var(--primary-color)" />
          <h1 style={{ fontSize: '24px', fontWeight: 'bold', margin: 0 }}>LÍNEA DE COCINA</h1>
        </div>
        <button 
          className="btn" 
          onClick={() => setShowModal(true)}
          style={{ background: 'var(--bg-container)', padding: '10px 16px', display: 'flex', alignItems: 'center', gap: '8px', color: 'var(--text-main)', border: '1px solid var(--border-color)', borderRadius: 'var(--border-radius-md)' }}
        >
          <ClipboardCheck size={20} /> Reportar Faltantes
        </button>
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

      {showModal && (
        <div style={{
          position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
          backgroundColor: 'rgba(0,0,0,0.8)', zIndex: 50,
          display: 'flex', justifyContent: 'center', alignItems: 'center', padding: '20px'
        }}>
          <div style={{
            background: 'var(--bg-container)', padding: '24px', borderRadius: '16px', width: '100%', maxWidth: '600px',
            maxHeight: '90vh', display: 'flex', flexDirection: 'column'
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
              <h2 style={{ margin: 0, color: 'var(--text-main)' }}>Checklist de Faltantes</h2>
              <button onClick={() => setShowModal(false)} style={{ background: 'transparent', border: 'none', color: 'var(--text-muted)', cursor: 'pointer' }}><X /></button>
            </div>
            <p style={{ color: 'var(--text-muted)', marginBottom: '16px' }}>Selecciona los insumos que **ya se agotaron o están a punto de acabarse**.</p>
            
            <div style={{ flex: 1, overflowY: 'auto', display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))', gap: '12px', paddingBottom: '16px' }}>
              {INGREDIENTS_LIST.map(item => (
                <label key={item} style={{
                  display: 'flex', alignItems: 'center', gap: '8px', padding: '12px',
                  background: 'var(--bg-color)', border: `1px solid ${missingItems.includes(item) ? 'var(--primary-color)' : 'var(--border-color)'}`,
                  borderRadius: '8px', cursor: 'pointer', transition: 'all 0.2s'
                }}>
                  <input type="checkbox" checked={missingItems.includes(item)} onChange={() => toggleItem(item)} style={{ accentColor: 'var(--primary-color)', width: '18px', height: '18px' }} />
                  <span style={{ fontSize: '14px', color: missingItems.includes(item) ? 'var(--text-main)' : 'var(--text-muted)', fontWeight: missingItems.includes(item) ? 'bold' : 'normal' }}>{item}</span>
                </label>
              ))}
            </div>

            <button 
              className="btn" 
              onClick={handleSubmitInventory}
              style={{ width: '100%', padding: '16px', fontSize: '16px', fontWeight: 'bold', background: 'var(--primary-color)', color: '#fff', border: 'none', borderRadius: '8px', marginTop: '16px' }}
            >
              Enviar Reporte ({missingItems.length} faltantes)
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default KitchenView;
