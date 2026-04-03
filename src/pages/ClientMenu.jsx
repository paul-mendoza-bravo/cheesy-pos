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

      {/* Category Tabs - Sticky Bar */}
      <div style={{ 
        padding: '12px 20px', 
        display: 'flex', 
        gap: '8px', 
        overflowX: 'auto', 
        position: 'sticky', 
        top: '64px', 
        zIndex: 90, 
        background: 'var(--bg-color)',
        borderBottom: '1px solid var(--border-color)'
      }}>
        {menu.categories.map(cat => (
          <button key={cat.id} onClick={() => setActiveCategory(cat.id)}
            style={{
              padding: '8px 18px', borderRadius: 'radius-full', border: 'none', cursor: 'pointer', whiteSpace: 'nowrap', fontSize: '14px', fontWeight: '700',
              background: activeCategory === cat.id ? 'var(--text-main)' : 'var(--bg-container)',
              color: activeCategory === cat.id ? 'var(--bg-color)' : 'var(--text-main)', 
              transition: 'all 0.2s cubic-bezier(0.4, 0, 0.2, 1)',
              borderRadius: '24px'
            }}>
            {cat.label}
          </button>
        ))}
      </div>

      {/* Products Grid */}
      <div style={{ padding: '24px 20px', display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(160px, 1fr))', gap: '16px' }}>
        {filteredProducts.map(product => {
          const inCart = cart.find(i => i.id === product.id);
          return (
            <div key={product.id} id={`prod-${product.id}`} onClick={() => addToCart(product)} 
              className="card"
              style={{
                border: inCart ? '2px solid var(--primary-color)' : '1px solid var(--border-color)',
                padding: '24px 16px', 
                position: 'relative'
              }}>
              <div style={{ fontSize: '42px', textAlign: 'center', marginBottom: '16px' }}>🍔</div>
              <div style={{ fontWeight: '800', fontSize: '14px', marginBottom: '6px', color: 'var(--text-main)' }}>{product.name}</div>
              <div style={{ fontSize: '12px', color: 'var(--text-muted)', marginBottom: '16px', lineHeight: '1.4' }}>{product.description}</div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div style={{ fontWeight: '800', color: 'var(--primary-color)', fontSize: '16px' }}>${product.price.toFixed(2)}</div>
                <div style={{ background: inCart ? 'var(--primary-color)' : 'var(--bg-container)', borderRadius: '50%', width: '32px', height: '32px', display: 'flex', alignItems: 'center', justifyContent: 'center', color: inCart ? 'white' : 'var(--text-main)', transition: 'all 0.2s' }}>
                  <Plus size={18} />
                </div>
              </div>
              {inCart && <div style={{ position: 'absolute', top: '10px', right: '10px', background: 'var(--primary-color)', color: 'white', fontSize: '10px', fontWeight: '800', padding: '2px 8px', borderRadius: '10px' }}>×{inCart.quantity}</div>}
            </div>
          );
        })}
      </div>

      {/* Floating Cart Button */}
      {cartCount > 0 && !cartOpen && (
        <button onClick={() => setCartOpen(true)} className="btn btn-primary" style={{
          position: 'fixed', bottom: '24px', left: '20px', right: '20px',
          borderRadius: 'var(--radius-xl)', padding: '16px 28px', fontSize: '16px',
          justifyContent: 'space-between', boxShadow: 'var(--shadow-premium)', zIndex: 200, width: 'calc(100% - 40px)'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <ShoppingCart size={20} />
            <span>Ver carrito ({cartCount})</span>
          </div>
          <span style={{ fontWeight: '800' }}>${cartTotal.toFixed(2)}</span>
        </button>
      )}

      {/* Cart Drawer */}
      {cartOpen && (
        <div style={{ position: 'fixed', inset: 0, zIndex: 300 }}>
          <div style={{ position: 'absolute', inset: 0, background: 'rgba(0,0,0,0.5)', backdropFilter: 'blur(4px)' }} onClick={() => setCartOpen(false)} />
          <div style={{ 
            position: 'absolute', bottom: 0, left: 0, right: 0, 
            background: 'var(--bg-surface)', borderRadius: '24px 24px 0 0', 
            padding: '24px', maxHeight: '85vh', overflowY: 'auto',
            borderTop: '1px solid var(--border-color)',
            boxShadow: '0 -10px 40px rgba(0,0,0,0.2)'
          }}>
            <div style={{ width: '40px', height: '4px', background: 'var(--border-color)', borderRadius: '2px', margin: '-12px auto 20px' }} />
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
              <h2 style={{ margin: 0, fontSize: '20px', fontWeight: '800', fontFamily: "'Outfit', sans-serif" }}>Tu Pedido</h2>
              <button onClick={() => setCartOpen(false)} style={{ background: 'var(--bg-container)', border: 'none', borderRadius: '50%', width: '32px', height: '32px', color: 'var(--text-muted)', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}><X size={20} /></button>
            </div>

            {cart.map(item => (
              <div key={item.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '16px 0', borderBottom: '1px solid var(--border-color)' }}>
                <div style={{ flex: 1 }}>
                  <div style={{ fontWeight: '700', fontSize: '14px', color: 'var(--text-main)' }}>{item.name}</div>
                  <div style={{ color: 'var(--primary-color)', fontSize: '15px', fontWeight: '800' }}>${(item.price * item.quantity).toFixed(2)}</div>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', background: 'var(--bg-container)', borderRadius: 'radius-full', padding: '4px', borderRadius: '20px' }}>
                    <button onClick={() => updateQty(item.id, -1)} style={{ background: 'none', border: 'none', color: 'var(--text-main)', cursor: 'pointer', padding: '4px' }}><Minus size={16} /></button>
                    <span style={{ fontWeight: '800', minWidth: '24px', textAlign: 'center', fontSize: '14px' }}>{item.quantity}</span>
                    <button onClick={() => updateQty(item.id, 1)} style={{ background: 'none', border: 'none', color: 'var(--text-main)', cursor: 'pointer', padding: '4px' }}><Plus size={16} /></button>
                  </div>
                  <button onClick={() => removeFromCart(item.id)} style={{ color: 'var(--error-color)', cursor: 'pointer', background: 'none', border: 'none' }}><Trash2 size={18} /></button>
                </div>
              </div>
            ))}

            <textarea
              placeholder="¿Alguna instrucción especial?"
              value={notes}
              onChange={e => setNotes(e.target.value)}
              style={{ width: '100%', background: 'var(--bg-container)', border: '1px solid var(--border-color)', borderRadius: '12px', padding: '16px', color: 'var(--text-main)', fontSize: '14px', marginTop: '20px', resize: 'none', height: '80px', boxSizing: 'border-box', outline: 'none' }}
            />

            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', margin: '24px 0' }}>
              <span style={{ fontSize: '16px', fontWeight: '600', color: 'var(--text-muted)' }}>Total a pagar</span>
              <span style={{ fontSize: '26px', fontWeight: '800', color: 'var(--text-main)' }}>${cartTotal.toFixed(2)}</span>
            </div>

            <button onClick={handleOrder} disabled={submitting} className="btn btn-primary" style={{
              width: '100%', padding: '18px', fontSize: '16px', boxShadow: 'var(--shadow-lg)'
            }}>
              {submitting ? 'Confirmando...' : '🚀 Enviar pedido'}
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default ClientMenu;
