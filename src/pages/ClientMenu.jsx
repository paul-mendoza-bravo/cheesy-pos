import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useCustomerAuth } from '../context/CustomerAuthContext';
import { ShoppingCart, Plus, Minus, Trash2, LogOut, ChefHat, X, CheckCircle } from 'lucide-react';

const BACKEND_URL = import.meta.env.VITE_API_URL || `http://${window.location.hostname}:3001`;

const ClientMenu = () => {
  const { customer, token, logout } = useCustomerAuth();
  const navigate = useNavigate();
  const [menu, setMenu] = useState({ categories: [], products: [], modifiers: [] });
  const [activeCategory, setActiveCategory] = useState('all');
  const [cart, setCart] = useState([]);
  const [cartOpen, setCartOpen] = useState(false);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [success, setSuccess] = useState(null);
  const [notes, setNotes] = useState('');

  useEffect(() => {
    if (!customer) { navigate('/client/login'); return; }
    // Simulate slight delay for skeleton demo if needed, otherwise just fetch
    fetch(`${BACKEND_URL}/api/client/menu`)
      .then(r => r.json())
      .then(data => { setMenu(data); setLoading(false); });
  }, [customer]);

  const filteredProducts = activeCategory === 'all'
    ? menu.products
    : menu.products.filter(p => p.category === activeCategory);

  const addToCart = (product) => {
    setCart(prev => {
      const existing = prev.find(i => i.id === product.id);
      if (existing) return prev.map(i => i.id === product.id ? { ...i, quantity: i.quantity + 1 } : i);
      return [...prev, { ...product, quantity: 1, modifiers: [] }];
    });
    // Visual feedback
    const el = document.getElementById(`prod-${product.id}`);
    if (el) {
      el.classList.add('pulse');
      setTimeout(() => el.classList.remove('pulse'), 300);
    }
  };

  const removeFromCart = (productId) => setCart(prev => prev.filter(i => i.id !== productId));

  const updateQty = (productId, delta) => {
    setCart(prev => prev
      .map(i => i.id === productId ? { ...i, quantity: i.quantity + delta } : i)
      .filter(i => i.quantity > 0)
    );
  };

  const cartTotal = cart.reduce((sum, i) => sum + i.price * i.quantity, 0);
  const cartCount = cart.reduce((sum, i) => sum + i.quantity, 0);

  const handleOrder = async () => {
    if (cart.length === 0) return;
    setSubmitting(true);
    try {
      const res = await fetch(`${BACKEND_URL}/api/client/orders`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
        body: JSON.stringify({ items: cart, notes }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      setSuccess(data.orderId);
      setCart([]);
      setCartOpen(false);
      setNotes('');
      navigate(`/client/order-status/${data.orderId}`);
    } catch (err) {
      alert('Error al enviar el pedido: ' + err.message);
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) return (
    <div style={{ minHeight: '100vh', background: 'var(--bg-color)', padding: '20px' }}>
      <div className="skeleton" style={{ height: '40px', width: '120px', marginBottom: '24px' }} />
      <div style={{ display: 'flex', gap: '10px', marginBottom: '32px', overflow: 'hidden' }}>
        {[1,2,3].map(i => <div key={i} className="skeleton" style={{ height: '36px', width: '80px', borderRadius: '18px', flexShrink: 0 }} />)}
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(160px, 1fr))', gap: '16px' }}>
        {[1,2,3,4,5,6].map(i => (
          <div key={i} className="skeleton" style={{ height: '180px', borderRadius: '16px' }} />
        ))}
      </div>
    </div>
  );

  return (
    <div style={{ minHeight: '100vh', background: 'var(--bg-color)', fontFamily: "'Inter', sans-serif", color: 'var(--text-main)', paddingBottom: '80px' }}>
      {/* Navbar - Glass Effect */}
      <div className="glass" style={{ padding: '16px 20px', position: 'sticky', top: 0, zIndex: 100, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <span style={{ fontSize: '24px' }}>🧀</span>
          <span style={{ fontWeight: '800', fontSize: '20px', fontFamily: "'Outfit', sans-serif" }}>Cheesy</span>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <span style={{ fontSize: '13px', color: 'var(--text-muted)' }}>Hola, <b style={{ color: 'var(--text-main)' }}>{customer?.name?.split(' ')[0]}</b></span>
          <button onClick={() => { logout(); navigate('/client/login'); }} style={{ background: 'none', border: '1px solid var(--border-color)', borderRadius: '8px', padding: '6px 10px', color: 'var(--text-muted)', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '4px' }}>
            <LogOut size={14} />
          </button>
        </div>
      </div>

      {/* Category Tabs - McStyle Pill Bar */}
      <div style={{ 
        padding: '16px 20px', 
        display: 'flex', 
        gap: '12px', 
        overflowX: 'auto', 
        position: 'sticky', 
        top: '64px', 
        zIndex: 90, 
        background: 'var(--bg-container)',
        borderBottom: '1px solid var(--border-color)',
        boxShadow: 'var(--shadow-sm)'
      }}>
        {menu.categories.map(cat => (
          <button key={cat.id} onClick={() => setActiveCategory(cat.id)}
            className="theme-switch"
            style={{
              padding: '10px 22px', borderRadius: 'var(--radius-full)', border: activeCategory === cat.id ? '2px solid var(--primary-color)' : '1px solid var(--border-color)', cursor: 'pointer', whiteSpace: 'nowrap', fontSize: '14px', fontWeight: '800',
              background: activeCategory === cat.id ? 'var(--primary-color)' : 'var(--bg-container)',
              color: activeCategory === cat.id ? 'white' : 'var(--text-main)', 
              transition: 'all var(--transition-fast)'
            }}>
            {cat.label}
          </button>
        ))}
      </div>

      {/* Products Grid */}
      <div style={{ padding: '24px 20px', display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(160px, 1fr))', gap: '20px' }}>
        {filteredProducts.map(product => {
          const inCart = cart.find(i => i.id === product.id);
          return (
            <div key={product.id} id={`prod-${product.id}`} onClick={() => addToCart(product)} 
              className="card"
              style={{
                border: inCart ? '3px solid var(--accent-color)' : '1px solid var(--border-color)',
                padding: '24px 16px', 
                position: 'relative',
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                textAlign: 'center'
              }}>
              <div style={{ fontSize: '56px', marginBottom: '16px', filter: 'drop-shadow(0 4px 8px rgba(0,0,0,0.1))' }}>🍔</div>
              <div style={{ fontWeight: '800', fontSize: '15px', marginBottom: '8px', color: 'var(--text-main)', minHeight: '36px' }}>{product.name}</div>
              <div style={{ fontSize: '12px', color: 'var(--text-muted)', marginBottom: '20px', lineHeight: '1.4', flexGrow: 1 }}>{product.description}</div>
              <div style={{ width: '100%', display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '10px' }}>
                <div style={{ fontWeight: '900', color: 'var(--primary-color)', fontSize: '18px' }}>${product.price.toFixed(2)}</div>
                <div className="theme-switch" style={{ background: inCart ? 'var(--accent-color)' : 'var(--bg-color)', borderRadius: '50%', width: '36px', height: '36px', display: 'flex', alignItems: 'center', justifyContent: 'center', color: inCart ? '#292929' : 'var(--text-muted)', transition: 'all 0.2s', border: '1px solid var(--border-color)' }}>
                  <Plus size={20} />
                </div>
              </div>
              {inCart && <div style={{ position: 'absolute', top: '-10px', right: '-5px', background: 'var(--accent-color)', color: '#292929', fontSize: '12px', fontWeight: '900', padding: '4px 12px', borderRadius: 'var(--radius-full)', boxShadow: 'var(--shadow-sm)', border: '2px solid white' }}>{inCart.quantity}</div>}
            </div>
          );
        })}
      </div>

      {/* Floating Cart Button */}
      {cartCount > 0 && !cartOpen && (
        <button onClick={() => setCartOpen(true)} className="btn btn-primary" style={{
          position: 'fixed', bottom: '24px', left: '20px', right: '20px',
          padding: '18px 28px', fontSize: '16px',
          justifyContent: 'space-between', boxShadow: '0 12px 32px rgba(255, 199, 44, 0.4)', zIndex: 200, width: 'calc(100% - 40px)'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <ShoppingCart size={22} />
            <span>Ver mi Orden ({cartCount})</span>
          </div>
          <span style={{ fontSize: '18px', fontWeight: '900' }}>${cartTotal.toFixed(2)}</span>
        </button>
      )}

      {/* Cart Drawer */}
      {cartOpen && (
        <div style={{ position: 'fixed', inset: 0, zIndex: 300 }}>
          <div style={{ position: 'absolute', inset: 0, background: 'rgba(0,0,0,0.4)', backdropFilter: 'blur(2px)' }} onClick={() => setCartOpen(false)} />
          <div style={{ 
            position: 'absolute', bottom: 0, left: 0, right: 0, 
            background: 'var(--bg-surface)', borderRadius: 'var(--radius-xl) var(--radius-xl) 0 0', 
            padding: '24px', maxHeight: '85vh', overflowY: 'auto',
            borderTop: '2px solid var(--border-color)',
            boxShadow: '0 -10px 40px rgba(0,0,0,0.1)'
          }}>
            <div style={{ width: '50px', height: '5px', background: 'var(--border-color)', borderRadius: '10px', margin: '-10px auto 24px' }} />
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '28px' }}>
              <h2 style={{ margin: 0, fontSize: '24px', fontWeight: '800', fontFamily: "'Outfit', sans-serif" }}>Mi Orden</h2>
              <button onClick={() => setCartOpen(false)} style={{ background: '#f0f0f0', border: 'none', borderRadius: '50%', width: '36px', height: '36px', color: '#666', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}><X size={20} /></button>
            </div>

            {cart.map(item => (
              <div key={item.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '18px 0', borderBottom: '1px solid var(--border-color)' }}>
                <div style={{ flex: 1 }}>
                  <div style={{ fontWeight: '800', fontSize: '15px', color: 'var(--text-main)' }}>{item.name}</div>
                  <div style={{ color: 'var(--primary-color)', fontSize: '16px', fontWeight: '900', marginTop: '4px' }}>${(item.price * item.quantity).toFixed(2)}</div>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', background: '#f5f5f5', borderRadius: 'var(--radius-full)', padding: '6px' }}>
                    <button onClick={() => updateQty(item.id, -1)} style={{ background: 'none', border: 'none', color: '#333', cursor: 'pointer', padding: '4px' }}><Minus size={18} /></button>
                    <span style={{ fontWeight: '900', minWidth: '32px', textAlign: 'center', fontSize: '16px' }}>{item.quantity}</span>
                    <button onClick={() => updateQty(item.id, 1)} style={{ background: 'none', border: 'none', color: '#333', cursor: 'pointer', padding: '4px' }}><Plus size={18} /></button>
                  </div>
                  <button onClick={() => removeFromCart(item.id)} style={{ color: '#999', cursor: 'pointer', background: 'none', border: 'none' }}><Trash2 size={20} /></button>
                </div>
              </div>
            ))}

            <textarea
              placeholder="¿Alguna petición especial? (ej. Extra pepinillos)"
              value={notes}
              onChange={e => setNotes(e.target.value)}
              style={{ width: '100%', background: '#f9f9f9', border: '2px solid #eeeeee', borderRadius: '16px', padding: '18px', color: 'var(--text-main)', fontSize: '15px', marginTop: '24px', resize: 'none', height: '100px', boxSizing: 'border-box', outline: 'none' }}
            />

            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', margin: '32px 0' }}>
              <span style={{ fontSize: '18px', fontWeight: '700', color: 'var(--text-muted)' }}>Total Final</span>
              <span style={{ fontSize: '30px', fontWeight: '900', color: 'var(--text-main)' }}>${cartTotal.toFixed(2)}</span>
            </div>

            <button onClick={handleOrder} disabled={submitting} className="btn btn-primary" style={{
              width: '100%', padding: '20px', fontSize: '18px', boxShadow: '0 8px 24px rgba(255, 199, 44, 0.4)'
            }}>
              {submitting ? 'Confirmando...' : '🔥 Realizar Pedido Ahora'}
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default ClientMenu;
