import React, { useState } from 'react';
import { useCart } from '../context/CartContext';
import { useOrders } from '../context/OrdersContext';
import { useAuth } from '../context/AuthContext';
import { X, Minus, Plus, ShoppingBag, MapPin, Trash2, Send } from 'lucide-react';

const CartDrawer = ({ isOpen, onClose }) => {
  const { cart, removeFromCart, addToCart, decreaseQuantity, clearCart, cartTotal, cartCount } = useCart();
  const { addOrder } = useOrders();
  const { currentUser } = useAuth();
  const [customerName, setCustomerName] = useState('');
  const [deliveryLink, setDeliveryLink] = useState('');

  if (!isOpen) return null;

  const handleCheckout = () => {
    if (cart.length === 0) return;
    addOrder({
      customerName: customerName || 'Cliente en mostrador',
      deliveryLink: deliveryLink.trim() || null,
      items: cart,
      total: cartTotal
    }, currentUser?.id || null);
    clearCart();
    setCustomerName('');
    setDeliveryLink('');
    onClose();
  };

  return (
    <>
      {/* Overlay Background */}
      <div 
        style={{
          position: 'fixed',
          top: 0, left: 0, right: 0, bottom: 0,
          backgroundColor: 'rgba(0,0,0,0.5)',
          zIndex: 40,
          backdropFilter: 'blur(4px)'
        }}
        onClick={onClose}
      />
      
      {/* Sidebar Drawer (right side) */}
      <div style={{
        position: 'fixed',
        top: 0,
        right: 0,
        bottom: 0,
        width: '420px',
        maxWidth: '90vw',
        backgroundColor: 'var(--bg-color)',
        zIndex: 50,
        display: 'flex',
        flexDirection: 'column',
        boxShadow: '-8px 0 32px rgba(0,0,0,0.3)',
        animation: 'slideIn 0.3s cubic-bezier(0.16, 1, 0.3, 1)',
      }}>
        
        {/* Header */}
        <div style={{ 
          padding: '20px 24px', 
          display: 'flex', 
          justifyContent: 'space-between', 
          alignItems: 'center', 
          borderBottom: '1px solid var(--border-color)',
          background: 'var(--bg-container)',
        }}>
          <h2 style={{ display: 'flex', alignItems: 'center', gap: '10px', fontSize: '18px', margin: 0 }}>
            <ShoppingBag size={20} />
            Orden
            <span style={{
              background: 'var(--primary-color)',
              color: 'white',
              fontSize: '12px',
              fontWeight: '700',
              padding: '2px 8px',
              borderRadius: '12px',
              minWidth: '20px',
              textAlign: 'center'
            }}>{cartCount}</span>
          </h2>
          <button 
            onClick={onClose} 
            style={{ 
              padding: '8px', 
              border: 'none', 
              background: 'transparent', 
              cursor: 'pointer',
              color: 'var(--text-muted)',
              borderRadius: '8px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              transition: 'background 0.2s'
            }}
            onMouseEnter={e => e.target.style.background = 'var(--border-color)'}
            onMouseLeave={e => e.target.style.background = 'transparent'}
          >
            <X size={20} />
          </button>
        </div>

        {/* Cart Items */}
        <div style={{ flex: 1, overflowY: 'auto', padding: '16px 24px' }}>
          {cart.length === 0 ? (
            <div style={{ 
              textAlign: 'center', 
              color: 'var(--text-muted)', 
              marginTop: '60px',
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              gap: '12px'
            }}>
              <ShoppingBag size={48} strokeWidth={1} />
              <p style={{ fontSize: '16px' }}>El carrito está vacío</p>
              <p style={{ fontSize: '13px' }}>Agrega productos desde el menú</p>
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              {cart.map(item => (
                <div 
                  key={item.cartItemId} 
                  style={{ 
                    display: 'flex', 
                    justifyContent: 'space-between', 
                    alignItems: 'center',
                    padding: '12px 16px',
                    background: 'var(--bg-container)',
                    borderRadius: 'var(--border-radius-md)',
                    border: '1px solid var(--border-color)',
                    transition: 'border-color 0.2s'
                  }}
                >
                  {/* Item info */}
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <h4 style={{ fontSize: '14px', fontWeight: '600', margin: '0 0 2px 0' }}>{item.name}</h4>
                    {item.modifiers && item.modifiers.length > 0 && (
                      <p style={{ fontSize: '11px', color: 'var(--primary-color)', margin: '2px 0', fontWeight: '500' }}>
                        + {item.modifiers.map(m => m.name).join(', ')}
                      </p>
                    )}
                    <p style={{ fontSize: '13px', color: 'var(--text-muted)', margin: 0 }}>
                      ${item.unitPrice.toFixed(2)} c/u
                    </p>
                  </div>

                  {/* Quantity controls */}
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <button 
                      style={{ 
                        padding: '6px', 
                        border: '1px solid var(--border-color)', 
                        background: 'var(--bg-color)', 
                        borderRadius: '8px',
                        cursor: 'pointer',
                        color: 'var(--text-main)',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center'
                      }} 
                      onClick={() => decreaseQuantity(item.cartItemId)}
                    >
                      {item.quantity === 1 ? <Trash2 size={14} color="var(--primary-color)" /> : <Minus size={14} />}
                    </button>
                    <span style={{ 
                      fontSize: '14px', 
                      width: '24px', 
                      textAlign: 'center', 
                      fontWeight: '600' 
                    }}>
                      {item.quantity}
                    </span>
                    <button 
                      style={{ 
                        padding: '6px', 
                        border: '1px solid var(--border-color)', 
                        background: 'var(--bg-color)', 
                        borderRadius: '8px',
                        cursor: 'pointer',
                        color: 'var(--text-main)',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center'
                      }} 
                      onClick={() => addToCart(item, item.modifiers)}
                    >
                      <Plus size={14} />
                    </button>
                  </div>

                  {/* Subtotal de item */}
                  <span style={{ 
                    fontSize: '14px', 
                    fontWeight: '600', 
                    marginLeft: '16px', 
                    minWidth: '60px', 
                    textAlign: 'right' 
                  }}>
                    ${(item.unitPrice * item.quantity).toFixed(2)}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Footer: customer info + checkout */}
        <div style={{ 
          padding: '20px 24px', 
          borderTop: '1px solid var(--border-color)', 
          background: 'var(--bg-container)',
        }}>
          {/* Total */}
          <div style={{ 
            display: 'flex', 
            justifyContent: 'space-between', 
            marginBottom: '16px', 
            fontSize: '20px', 
            fontWeight: '700' 
          }}>
            <span>Total:</span>
            <span>${cartTotal.toFixed(2)}</span>
          </div>

          {/* Customer name */}
          <input 
            type="text" 
            placeholder="📍 Nombre del cliente"
            value={customerName}
            onChange={(e) => setCustomerName(e.target.value)}
            style={{
              width: '100%',
              padding: '10px 14px',
              borderRadius: 'var(--border-radius-md)',
              border: '1px solid var(--border-color)',
              marginBottom: '8px',
              fontFamily: 'inherit',
              fontSize: '14px',
              backgroundColor: 'var(--bg-color)',
              color: 'var(--text-main)',
              outline: 'none',
              boxSizing: 'border-box',
              transition: 'border-color 0.2s'
            }}
            onFocus={e => e.target.style.borderColor = 'var(--primary-color)'}
            onBlur={e => e.target.style.borderColor = 'var(--border-color)'}
          />

          {/* Google Maps link */}
          <div style={{ position: 'relative', marginBottom: '16px' }}>
            <MapPin size={16} style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: 'var(--primary-color)' }} />
            <input 
              type="url" 
              placeholder="Link de Google Maps (opcional)"
              value={deliveryLink}
              onChange={(e) => setDeliveryLink(e.target.value)}
              style={{
                width: '100%',
                padding: '10px 14px 10px 36px',
                borderRadius: 'var(--border-radius-md)',
                border: '1px solid var(--border-color)',
                fontFamily: 'inherit',
                fontSize: '14px',
                backgroundColor: 'var(--bg-color)',
                color: 'var(--text-main)',
                outline: 'none',
                boxSizing: 'border-box',
                transition: 'border-color 0.2s'
              }}
              onFocus={e => e.target.style.borderColor = 'var(--primary-color)'}
              onBlur={e => e.target.style.borderColor = 'var(--border-color)'}
            />
          </div>

          {/* Checkout button */}
          <button 
            style={{ 
              width: '100%', 
              padding: '14px', 
              fontSize: '15px', 
              fontWeight: '600',
              fontFamily: 'inherit',
              borderRadius: 'var(--border-radius-md)', 
              background: cart.length > 0 ? 'var(--primary-color)' : 'var(--border-color)', 
              color: 'white', 
              border: 'none',
              cursor: cart.length > 0 ? 'pointer' : 'not-allowed',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '8px',
              transition: 'opacity 0.2s, transform 0.1s',
              opacity: cart.length > 0 ? 1 : 0.5
            }}
            onClick={handleCheckout}
            disabled={cart.length === 0}
            onMouseDown={e => { if (cart.length > 0) e.target.style.transform = 'scale(0.98)'; }}
            onMouseUp={e => e.target.style.transform = 'scale(1)'}
          >
            <Send size={18} />
            Confirmar y Enviar a Cocina
          </button>
        </div>
      </div>
      
      <style>{`
        @keyframes slideIn {
          from { transform: translateX(100%); }
          to { transform: translateX(0); }
        }
      `}</style>
    </>
  );
};

export default CartDrawer;
