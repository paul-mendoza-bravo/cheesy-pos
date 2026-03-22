import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useCustomerAuth } from '../context/CustomerAuthContext';
import { ShoppingCart, Plus, Minus, Trash2, LogOut, ChefHat, X, CheckCircle } from 'lucide-react';

const BACKEND_URL = import.meta.env.VITE_BACKEND_URL || `http://${window.location.hostname}:3001`;

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
    <div style={{ minHeight: '100vh', background: '#0f172a', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'white', fontSize: '18px' }}>
      Cargando menú... 🍔
    </div>
  );

  return (
    <div style={{ minHeight: '100vh', background: '#0f172a', fontFamily: "'Inter', sans-serif", color: 'white', paddingBottom: '80px' }}>
      {/* Navbar */}
      <div style={{ background: 'rgba(15,23,42,0.95)', backdropFilter: 'blur(12px)', borderBottom: '1px solid rgba(255,255,255,0.08)', padding: '16px 20px', position: 'sticky', top: 0, zIndex: 100, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <span style={{ fontSize: '24px' }}>🧀</span>
          <span style={{ fontWeight: '800', fontSize: '20px' }}>Cheesy</span>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <span style={{ fontSize: '13px', color: 'rgba(255,255,255,0.5)' }}>Hola, <b style={{ color: 'white' }}>{customer?.name?.split(' ')[0]}</b></span>
          <button onClick={() => { logout(); navigate('/client/login'); }} style={{ background: 'none', border: '1px solid rgba(255,255,255,0.15)', borderRadius: '8px', padding: '6px 10px', color: 'rgba(255,255,255,0.5)', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '4px' }}>
            <LogOut size={14} />
          </button>
        </div>
      </div>

      {/* Category Tabs */}
      <div style={{ padding: '20px 20px 0', display: 'flex', gap: '8px', overflowX: 'auto' }}>
        {menu.categories.map(cat => (
          <button key={cat.id} onClick={() => setActiveCategory(cat.id)}
            style={{
              padding: '8px 18px', borderRadius: '20px', border: 'none', cursor: 'pointer', whiteSpace: 'nowrap', fontSize: '14px', fontWeight: '600',
              background: activeCategory === cat.id ? 'linear-gradient(135deg, #f97316, #ef4444)' : 'rgba(255,255,255,0.08)',
              color: 'white', transition: 'all 0.2s ease'
            }}>
            {cat.label}
          </button>
        ))}
      </div>

      {/* Products Grid */}
      <div style={{ padding: '20px', display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(160px, 1fr))', gap: '16px' }}>
        {filteredProducts.map(product => {
          const inCart = cart.find(i => i.id === product.id);
          return (
            <div key={product.id} onClick={() => addToCart(product)} style={{
              background: 'rgba(255,255,255,0.05)', border: inCart ? '1px solid rgba(249,115,22,0.5)' : '1px solid rgba(255,255,255,0.08)',
              borderRadius: '16px', padding: '20px 16px', cursor: 'pointer', transition: 'all 0.2s ease',
              boxShadow: inCart ? '0 0 16px rgba(249,115,22,0.2)' : 'none'
            }}>
              <div style={{ fontSize: '36px', textAlign: 'center', marginBottom: '10px' }}>🍔</div>
              <div style={{ fontWeight: '700', fontSize: '13px', marginBottom: '4px' }}>{product.name}</div>
              <div style={{ fontSize: '11px', color: 'rgba(255,255,255,0.4)', marginBottom: '10px', lineHeight: '1.4' }}>{product.description}</div>
              <div style={{ fontWeight: '800', color: '#f97316', fontSize: '15px' }}>${product.price.toFixed(2)}</div>
              {inCart && <div style={{ marginTop: '8px', fontSize: '11px', color: '#86efac', fontWeight: '600' }}>✓ ×{inCart.quantity} en carrito</div>}
            </div>
          );
        })}
      </div>

      {/* Floating Cart Button */}
      {cartCount > 0 && !cartOpen && (
        <button onClick={() => setCartOpen(true)} style={{
          position: 'fixed', bottom: '24px', left: '50%', transform: 'translateX(-50%)',
          background: 'linear-gradient(135deg, #f97316, #ef4444)', border: 'none', borderRadius: '50px',
          padding: '14px 28px', color: 'white', fontWeight: '700', fontSize: '15px',
          display: 'flex', alignItems: 'center', gap: '10px', cursor: 'pointer',
          boxShadow: '0 8px 24px rgba(249,115,22,0.5)', zIndex: 200
        }}>
          <ShoppingCart size={20} />
          Ver carrito ({cartCount}) • ${cartTotal.toFixed(2)}
        </button>
      )}

      {/* Cart Drawer */}
      {cartOpen && (
        <div style={{ position: 'fixed', inset: 0, zIndex: 300 }}>
          <div style={{ position: 'absolute', inset: 0, background: 'rgba(0,0,0,0.6)' }} onClick={() => setCartOpen(false)} />
          <div style={{ position: 'absolute', bottom: 0, left: 0, right: 0, background: '#1e293b', borderRadius: '24px 24px 0 0', padding: '24px', maxHeight: '85vh', overflowY: 'auto' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
              <h2 style={{ margin: 0, fontSize: '20px', fontWeight: '800' }}>Tu Pedido</h2>
              <button onClick={() => setCartOpen(false)} style={{ background: 'none', border: 'none', color: 'rgba(255,255,255,0.5)', cursor: 'pointer' }}><X size={24} /></button>
            </div>

            {cart.map(item => (
              <div key={item.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '12px 0', borderBottom: '1px solid rgba(255,255,255,0.07)' }}>
                <div style={{ flex: 1 }}>
                  <div style={{ fontWeight: '600', fontSize: '14px' }}>{item.name}</div>
                  <div style={{ color: '#f97316', fontSize: '14px', fontWeight: '700' }}>${(item.price * item.quantity).toFixed(2)}</div>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <button onClick={() => updateQty(item.id, -1)} style={{ background: 'rgba(255,255,255,0.1)', border: 'none', borderRadius: '50%', width: '28px', height: '28px', color: 'white', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}><Minus size={14} /></button>
                  <span style={{ fontWeight: '700', minWidth: '20px', textAlign: 'center' }}>{item.quantity}</span>
                  <button onClick={() => updateQty(item.id, 1)} style={{ background: 'rgba(255,255,255,0.1)', border: 'none', borderRadius: '50%', width: '28px', height: '28px', color: 'white', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}><Plus size={14} /></button>
                  <button onClick={() => removeFromCart(item.id)} style={{ background: 'rgba(239,68,68,0.15)', border: 'none', borderRadius: '50%', width: '28px', height: '28px', color: '#f87171', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', marginLeft: '4px' }}><Trash2 size={14} /></button>
                </div>
              </div>
            ))}

            <textarea
              placeholder="Notas especiales (sin cebolla, extra salsa...)"
              value={notes}
              onChange={e => setNotes(e.target.value)}
              style={{ width: '100%', background: 'rgba(255,255,255,0.07)', border: '1px solid rgba(255,255,255,0.12)', borderRadius: '12px', padding: '12px', color: 'white', fontSize: '13px', marginTop: '16px', resize: 'none', height: '70px', boxSizing: 'border-box', outline: 'none' }}
            />

            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', margin: '16px 0' }}>
              <span style={{ fontSize: '16px', fontWeight: '600' }}>Total</span>
              <span style={{ fontSize: '22px', fontWeight: '800', color: '#f97316' }}>${cartTotal.toFixed(2)}</span>
            </div>

            <button onClick={handleOrder} disabled={submitting} style={{
              width: '100%', padding: '16px', border: 'none', borderRadius: '14px',
              background: submitting ? 'rgba(249,115,22,0.4)' : 'linear-gradient(135deg, #f97316, #ef4444)',
              color: 'white', fontWeight: '700', fontSize: '16px', cursor: submitting ? 'not-allowed' : 'pointer',
              boxShadow: '0 4px 16px rgba(249,115,22,0.35)', transition: 'all 0.2s'
            }}>
              {submitting ? 'Enviando pedido...' : '🚀 Confirmar Pedido'}
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default ClientMenu;
