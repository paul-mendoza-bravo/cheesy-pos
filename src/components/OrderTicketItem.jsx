import React from 'react';
import { Clock, Check, MapPin } from 'lucide-react';

const OrderTicketItem = ({ order, actionButton, actionLabel, actionColor = 'var(--success-color)' }) => {
  const timeElapsed = Math.floor((new Date() - new Date(order.timestamp)) / 60000); // in minutes

  return (
    <div className="card" style={{ marginBottom: '16px' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '12px', borderBottom: '1px solid var(--border-color)', paddingBottom: '12px' }}>
        <div>
          <h3 style={{ fontSize: '18px', fontWeight: '600' }}>#{order.id}</h3>
          <p style={{ fontSize: '14px', color: 'var(--text-muted)', display: 'flex', alignItems: 'center', gap: '4px', marginTop: '4px' }}>
             {order.customerName}
          </p>
          {order.deliveryLink && (
            <a 
              href={order.deliveryLink} 
              target="_blank" 
              rel="noopener noreferrer"
              style={{ display: 'inline-flex', alignItems: 'center', gap: '4px', marginTop: '6px', color: 'var(--primary-color)', fontSize: '13px', fontWeight: '600', textDecoration: 'none', background: 'var(--focus-ring)', padding: '4px 10px', borderRadius: '20px' }}
            >
              <MapPin size={13} /> Ver Ubicación en Maps
            </a>
          )}
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '4px', fontSize: '12px', color: timeElapsed > 15 ? 'var(--primary-color)' : 'var(--text-muted)', background: 'var(--bg-container)', padding: '4px 8px', borderRadius: '20px' }}>
          <Clock size={12} />
          {timeElapsed} min
        </div>
      </div>

      <ul style={{ listStyle: 'none', padding: 0, margin: '0 0 16px 0' }}>
        {order.items.map((item, idx) => (
          <li key={idx} style={{ marginBottom: '12px', fontSize: '18px' /* Texto más grande para cocina */ }}>
            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
              <span><span style={{ fontWeight: '700', marginRight: '8px' }}>{item.quantity}x</span> {item.name}</span>
            </div>
            {item.modifiers && item.modifiers.length > 0 && (
              <div style={{ 
                marginTop: '4px', 
                color: '#ff3b3b', // Rojo brillante para alto contraste
                fontWeight: '800', 
                letterSpacing: '0.05em',
                fontSize: '16px',
                paddingLeft: '28px'
              }}>
                {item.modifiers.map(m => `[${m.name.toUpperCase()}]`).join(' ')}
              </div>
            )}
          </li>
        ))}
      </ul>

      <button 
        className="btn" 
        style={{ 
          width: '100%', 
          padding: '16px', 
          fontSize: '16px', 
          fontWeight: '600', 
          borderRadius: 'var(--border-radius-md)', 
          background: actionColor,
          color: 'white',
          border: 'none',
          boxShadow: 'var(--shadow-sm)'
        }}
        onClick={() => actionButton(order.id)}
      >
        <Check size={20} />
        {actionLabel}
      </button>
    </div>
  );
};

export default OrderTicketItem;
