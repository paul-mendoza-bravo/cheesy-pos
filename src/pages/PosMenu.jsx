import React, { useState, useEffect, useRef } from 'react';
import { products, CATEGORIES } from '../data/products';
import { useCart } from '../context/CartContext';
import { useOrders } from '../context/OrdersContext';
import { useAuth } from '../context/AuthContext';
import CustomOrderModal from '../components/CustomOrderModal';
import { ShoppingBag, PenLine, Search, Minus, Plus, Trash2, Send, X, Zap } from 'lucide-react';

const PosMenu = () => {
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [isCustomOrderOpen, setIsCustomOrderOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [customerName, setCustomerName] = useState('');
  const [customerPhone, setCustomerPhone] = useState('');
  const [deliveryLink, setDeliveryLink] = useState('');
  const [toast, setToast] = useState(null);
  const searchRef = useRef(null);

  const { cart, cartCount, cartTotal, addToCart, decreaseQuantity, clearCart } = useCart();
  const { addOrder } = useOrders();
  const { currentUser } = useAuth();

  useEffect(() => {
    const handler = (e) => {
      if (e.key === '/' && document.activeElement.tagName !== 'INPUT') {
        e.preventDefault();
        searchRef.current?.focus();
      }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, []);

  const showToast = (msg) => { setToast(msg); setTimeout(() => setToast(null), 1600); };

  const filteredProducts = products.filter(p => {
    const matchCat = selectedCategory === 'all' || p.category === selectedCategory;
    const matchSearch = !searchQuery || p.name.toLowerCase().includes(searchQuery.toLowerCase());
    return matchCat && matchSearch;
  });

  const handleSelectProduct = (product) => {
    if (product.comboIds) {
      product.comboIds.forEach(id => {
        const p = products.find(pr => pr.id === id);
        if (p) addToCart(p, []);
      });
      showToast(`${product.name} agregado`);
    } else {
      addToCart(product, []);
      showToast(`${product.name} agregado`);
    }
  };

  const handleCheckout = () => {
    if (cart.length === 0) return;
    addOrder({
      customerName: customerName || 'Cliente en mostrador',
      customerPhone: customerPhone.trim() || null,
      deliveryLink: deliveryLink.trim() || null,
      items: cart, total: cartTotal
    }, currentUser?.id || null);
    clearCart(); setCustomerName(''); setCustomerPhone(''); setDeliveryLink('');
    showToast('Pedido enviado a cocina');
  };

  const quickCombos = [
    { label: 'Combo Mexa', ids: ['h2', 's2'] },
    { label: 'Clásica + Papas', ids: ['h1', 's1'] },
    { label: 'Hawaiana + Papas', ids: ['h4', 's2'] },
    { label: 'Mexa Doble + Papas', ids: ['h2d', 's2'] },
  ];

  const handleQuickCombo = (combo) => {
    combo.ids.forEach(id => { const p = products.find(pr => pr.id === id); if (p) addToCart(p, []); });
    showToast(`${combo.label} agregado`);
  };

  return (
    <>
      <div className="pos-layout">
        {/* LEFT: Products */}
        <div className="pos-products">
          <div className="pos-header">
            <div>
              <h1 style={{ fontFamily: 'var(--font-display)', fontSize: '22px', marginBottom: '2px' }}>Caja</h1>
              <p style={{ color: 'var(--ink-faint)', fontSize: '12px', fontFamily: 'var(--font-display)', fontStyle: 'italic' }}>Toca para agregar al pedido</p>
            </div>
            <button onClick={() => setIsCustomOrderOpen(true)} className="btn" style={{ padding: '8px 14px', fontSize: '12px', minHeight: 'auto' }}>
              <PenLine size={14} /> Especial
            </button>
          </div>

          {/* Quick Combos */}
          <div className="pos-quick-bar">
            <span style={{ fontSize: '11px', fontWeight: 600, color: 'var(--ink-faint)', letterSpacing: '0.06em', whiteSpace: 'nowrap' }}>
              <Zap size={11} style={{ display: 'inline', verticalAlign: '-2px' }} /> RAPIDO:
            </span>
            {quickCombos.map((c, i) => (
              <button key={i} className="pos-quick-btn" onClick={() => handleQuickCombo(c)}>{c.label}</button>
            ))}
          </div>

          {/* Search */}
          <div className="pos-search-wrapper">
            <Search size={15} className="pos-search-icon" />
            <input ref={searchRef} type="text" placeholder='Buscar producto... ( / )' value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)} className="pos-search-input" />
            {searchQuery && <button className="pos-search-clear" onClick={() => setSearchQuery('')}><X size={12} /></button>}
          </div>

          {/* Categories */}
          <div className="pos-categories">
            {CATEGORIES.map(cat => (
              <button key={cat.id} className={`pos-cat-btn ${selectedCategory === cat.id ? 'active' : ''}`}
                onClick={() => setSelectedCategory(cat.id)}>{cat.label}</button>
            ))}
          </div>

          {/* Product Grid */}
          <div className="pos-grid">
            {filteredProducts.map(product => (
              <button key={product.id} className={`pos-product-card ${product.isDouble ? 'is-double' : ''}`}
                onClick={() => handleSelectProduct(product)}>
                <span className="pos-product-initial" style={{ color: product.isDouble ? 'var(--tomato)' : product.category === 'combos' ? 'var(--mustard)' : 'var(--ink)' }}>
                  {product.initial}
                </span>
                {product.isDouble && <span className="pos-double-tag">2x</span>}
                <span className="pos-product-name">{product.name}</span>
                <span className="pos-product-price"><small>$</small>{product.price.toFixed(0)}</span>
              </button>
            ))}
            {filteredProducts.length === 0 && (
              <div style={{ gridColumn: '1 / -1', textAlign: 'center', padding: '40px 20px' }}>
                <p className="empty-state">No se encontraron productos</p>
              </div>
            )}
          </div>
        </div>

        {/* RIGHT: Cart */}
        <div className="pos-cart-panel">
          <div className="pos-cart-header">
            <h2 style={{ fontFamily: 'var(--font-display)', fontSize: '16px', display: 'flex', alignItems: 'center', gap: '8px', margin: 0 }}>
              <ShoppingBag size={18} /> Orden Actual
              {cartCount > 0 && <span className="pos-cart-badge">{cartCount}</span>}
            </h2>
            {cart.length > 0 && <button className="pos-cart-clear" onClick={clearCart}><Trash2 size={13} /> Vaciar</button>}
          </div>

          <div className="pos-cart-items">
            {cart.length === 0 ? (
              <div className="pos-cart-empty">
                <ShoppingBag size={36} strokeWidth={1} color="var(--ink-faint)" />
                <p className="empty-state" style={{ marginTop: '8px' }}>Toca un producto para empezar</p>
              </div>
            ) : (
              cart.map(item => (
                <div key={item.cartItemId} className="pos-cart-item">
                  <div className="pos-cart-item-info">
                    <span className="pos-cart-item-name">{item.name}</span>
                    <span className="pos-cart-item-price">${item.unitPrice.toFixed(0)} c/u</span>
                  </div>
                  <div className="pos-cart-item-controls">
                    <button className="pos-qty-btn" onClick={() => decreaseQuantity(item.cartItemId)}>
                      {item.quantity === 1 ? <Trash2 size={11} /> : <Minus size={11} />}
                    </button>
                    <span className="pos-qty-value">{item.quantity}</span>
                    <button className="pos-qty-btn" onClick={() => addToCart(item, item.modifiers)}>
                      <Plus size={11} />
                    </button>
                  </div>
                  <span className="pos-cart-item-subtotal">${(item.unitPrice * item.quantity).toFixed(0)}</span>
                </div>
              ))
            )}
          </div>

          <div className="pos-cart-footer">
            <div className="pos-cart-total">
              <span style={{ fontFamily: 'var(--font-display)' }}>Total</span>
              <span style={{ fontFamily: 'var(--font-mono)' }}>${cartTotal.toFixed(2)}</span>
            </div>
            <input type="text" placeholder="Nombre del cliente" value={customerName}
              onChange={(e) => setCustomerName(e.target.value)} className="pos-input" />
            <div className="pos-input-row">
              <input type="tel" placeholder="Teléfono" value={customerPhone}
                onChange={(e) => setCustomerPhone(e.target.value)} className="pos-input" style={{ flex: 1 }} />
              <input type="url" placeholder="Maps" value={deliveryLink}
                onChange={(e) => setDeliveryLink(e.target.value)} className="pos-input" style={{ flex: 1 }} />
            </div>
            <button className="pos-checkout-btn" onClick={handleCheckout} disabled={cart.length === 0}>
              <Send size={16} /> Confirmar y enviar a cocina
            </button>
          </div>
        </div>
      </div>

      {cartCount > 0 && (
        <div className="pos-mobile-fab" onClick={() => document.querySelector('.pos-cart-panel')?.scrollIntoView({ behavior: 'smooth' })}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <span className="pos-cart-badge">{cartCount}</span><span>Ver Orden</span>
          </div>
          <span style={{ fontWeight: 700, fontFamily: 'var(--font-mono)' }}>${cartTotal.toFixed(2)}</span>
        </div>
      )}

      {toast && <div className="pos-toast">{toast}</div>}

      <CustomOrderModal isOpen={isCustomOrderOpen} onClose={() => setIsCustomOrderOpen(false)} />

      <style>{`
        .pos-layout { display: flex; gap: 0; height: calc(100vh - 58px); overflow: hidden; }
        .pos-products { flex: 1; display: flex; flex-direction: column; overflow: hidden; padding: 20px 24px; gap: 14px; }
        .pos-cart-panel { width: 360px; flex-shrink: 0; display: flex; flex-direction: column; background: var(--ticket); border-left: 1px solid var(--rule); overflow: hidden; }
        .pos-header { display: flex; justify-content: space-between; align-items: flex-start; gap: 12px; }

        .pos-quick-bar { display: flex; align-items: center; gap: 6px; overflow-x: auto; scrollbar-width: none; }
        .pos-quick-bar::-webkit-scrollbar { display: none; }
        .pos-quick-btn { padding: 6px 14px; background: rgba(200,148,31,0.1); color: var(--mustard-deep) !important; border: 1px solid rgba(200,148,31,0.25); border-radius: 999px; font-family: var(--font-body); font-size: 12px; font-weight: 600; cursor: pointer; white-space: nowrap; transition: all var(--transition-fast); }
        .pos-quick-btn:hover { background: var(--mustard); color: var(--ticket) !important; }

        .pos-search-wrapper { position: relative; }
        .pos-search-icon { position: absolute; left: 12px; top: 50%; transform: translateY(-50%); color: var(--ink-faint); pointer-events: none; }
        .pos-search-input { width: 100%; padding: 10px 36px !important; font-size: 14px !important; box-sizing: border-box; background: var(--ticket) !important; border: 1px solid var(--rule) !important; border-radius: var(--radius-md) !important; }
        .pos-search-clear { position: absolute; right: 10px; top: 50%; transform: translateY(-50%); background: var(--ink-faint); color: var(--ticket); border: none; border-radius: 50%; width: 20px; height: 20px; display: flex; align-items: center; justify-content: center; cursor: pointer; }

        .pos-categories { display: flex; gap: 6px; overflow-x: auto; scrollbar-width: none; }
        .pos-categories::-webkit-scrollbar { display: none; }
        .pos-cat-btn { padding: 6px 16px; border: 1px solid var(--rule); border-radius: 999px; background: var(--ticket); color: var(--ink-soft); font-family: var(--font-body); font-size: 13px; font-weight: 600; cursor: pointer; white-space: nowrap; transition: all var(--transition-fast); }
        .pos-cat-btn:hover { border-color: var(--ink-faint); }
        .pos-cat-btn.active { background: var(--mustard); color: var(--ticket); border-color: var(--mustard-deep); box-shadow: var(--shadow-glow); }

        .pos-grid { flex: 1; display: grid; grid-template-columns: repeat(auto-fill, minmax(130px, 1fr)); gap: 10px; overflow-y: auto; padding: 2px 2px 80px; align-content: start; }
        .pos-product-card { display: flex; flex-direction: column; align-items: center; gap: 4px; padding: 14px 8px 10px; background: var(--ticket); border: 1px solid var(--rule); border-radius: var(--radius-lg); cursor: pointer; font-family: var(--font-body); transition: all var(--transition-fast); position: relative; text-align: center; box-shadow: var(--shadow-sm); }
        .pos-product-card:hover { border-color: var(--mustard); box-shadow: var(--shadow-md); transform: translateY(-2px); }
        .pos-product-card.is-double { border-left: 3px solid var(--tomato); }

        .pos-product-initial { font-family: var(--font-display); font-size: 26px; font-weight: 700; line-height: 1; }
        .pos-double-tag { position: absolute; top: 6px; right: 6px; background: var(--tomato-soft); color: var(--tomato); font-size: 10px; font-weight: 700; padding: 1px 5px; border-radius: 4px; font-family: var(--font-mono); }
        .pos-product-name { font-size: 12px; font-weight: 600; line-height: 1.2; color: var(--ink); }
        .pos-product-price { font-size: 16px; font-weight: 700; color: var(--ink); font-family: var(--font-mono); font-variant-numeric: tabular-nums; }
        .pos-product-price small { font-size: 11px; color: var(--ink-faint); }

        .pos-cart-header { padding: 16px 20px; display: flex; justify-content: space-between; align-items: center; border-bottom: 1px solid var(--rule); }
        .pos-cart-badge { background: var(--mustard); color: var(--ticket); font-size: 11px; font-weight: 700; padding: 1px 7px; border-radius: 999px; min-width: 18px; text-align: center; font-family: var(--font-mono); }
        .pos-cart-clear { display: flex; align-items: center; gap: 4px; padding: 4px 10px; background: transparent; border: 1px solid var(--rule); font-family: var(--font-body); font-size: 11px; font-weight: 600; cursor: pointer; border-radius: var(--radius-md); color: var(--ink-faint); }
        .pos-cart-clear:hover { background: var(--tomato-soft); color: var(--tomato); border-color: var(--tomato); }

        .pos-cart-items { flex: 1; overflow-y: auto; padding: 8px 12px; }
        .pos-cart-empty { display: flex; flex-direction: column; align-items: center; gap: 4px; margin-top: 60px; text-align: center; }

        .pos-cart-item { display: flex; align-items: center; gap: 8px; padding: 10px 12px; margin-bottom: 6px; background: var(--paper); border: 1px solid var(--rule); border-radius: var(--radius-md); }
        .pos-cart-item-info { flex: 1; min-width: 0; display: flex; flex-direction: column; }
        .pos-cart-item-name { font-size: 13px; font-weight: 600; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; color: var(--ink); }
        .pos-cart-item-price { font-size: 11px; color: var(--ink-faint); font-family: var(--font-mono); }
        .pos-cart-item-controls { display: flex; align-items: center; gap: 4px; }
        .pos-qty-btn { width: 26px; height: 26px; display: flex; align-items: center; justify-content: center; border: 1px solid var(--rule); background: var(--ticket); border-radius: var(--radius-sm); cursor: pointer; padding: 0; color: var(--ink); transition: all var(--transition-fast); }
        .pos-qty-btn:hover { background: var(--mustard); color: var(--ticket); border-color: var(--mustard); }
        .pos-qty-value { width: 22px; text-align: center; font-weight: 700; font-size: 14px; font-family: var(--font-mono); }
        .pos-cart-item-subtotal { font-size: 14px; font-weight: 700; font-family: var(--font-mono); font-variant-numeric: tabular-nums; min-width: 40px; text-align: right; color: var(--ink); }

        .pos-cart-footer { padding: 14px 16px 16px; border-top: 1px solid var(--rule); display: flex; flex-direction: column; gap: 8px; background: var(--ticket); }
        .pos-cart-total { display: flex; justify-content: space-between; font-size: 22px; font-weight: 700; padding-bottom: 8px; border-bottom: 1px dashed var(--rule); margin-bottom: 4px; color: var(--ink); }
        .pos-input { width: 100%; padding: 8px 12px !important; font-size: 13px !important; box-sizing: border-box; background: var(--paper) !important; border: 1px solid var(--rule) !important; border-radius: var(--radius-md) !important; }
        .pos-input-row { display: flex; gap: 6px; }
        .pos-checkout-btn { width: 100%; padding: 14px; font-size: 14px; font-weight: 700; font-family: var(--font-body); border: none; border-radius: var(--radius-md); background: var(--lettuce); color: var(--ticket) !important; box-shadow: var(--shadow-md); cursor: pointer; display: flex; align-items: center; justify-content: center; gap: 8px; transition: all var(--transition-fast); }
        .pos-checkout-btn:hover { background: #4d6b31; box-shadow: var(--shadow-lg); }
        .pos-checkout-btn:disabled { opacity: 0.4; cursor: not-allowed; }

        .pos-toast { position: fixed; bottom: 80px; left: 50%; transform: translateX(-50%); background: var(--walnut); color: var(--ticket); padding: 10px 24px; border-radius: var(--radius-md); font-size: 14px; font-weight: 600; box-shadow: var(--shadow-lg); z-index: 999; animation: toastIn 0.25s var(--spring); white-space: nowrap; }
        @keyframes toastIn { from { opacity: 0; transform: translateX(-50%) translateY(20px); } to { opacity: 1; transform: translateX(-50%) translateY(0); } }

        .pos-mobile-fab { display: none; position: fixed; bottom: 20px; left: 16px; right: 16px; padding: 14px 20px; background: var(--walnut); color: var(--ticket); border-radius: var(--radius-md); box-shadow: var(--shadow-xl); justify-content: space-between; align-items: center; cursor: pointer; z-index: 30; font-weight: 600; font-size: 14px; }

        @media (max-width: 768px) {
          .pos-layout { flex-direction: column; height: auto; overflow: visible; }
          .pos-products { overflow: visible; padding: 12px; }
          .pos-cart-panel { width: 100%; border-left: none; border-top: 1px solid var(--rule); }
          .pos-grid { grid-template-columns: repeat(auto-fill, minmax(110px, 1fr)); overflow-y: visible; padding-bottom: 100px; }
          .pos-mobile-fab { display: flex; }
        }
      `}</style>
    </>
  );
};

export default PosMenu;
