import React, { useState, useEffect, useRef } from 'react';
import { mockProducts, CATEGORIES, MODIFIERS } from '../data/mockProducts';
import { useCart } from '../context/CartContext';
import { useOrders } from '../context/OrdersContext';
import { useAuth } from '../context/AuthContext';
import ProductOptionsModal from '../components/ProductOptionsModal';
import CustomOrderModal from '../components/CustomOrderModal';
import { 
  ShoppingBag, PenLine, Search, Minus, Plus, Trash2, 
  Send, Phone, MapPin, X, Zap, CheckCircle 
} from 'lucide-react';

const PosMenu = () => {
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [selectedProduct, setSelectedProduct] = useState(null);
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

  // Keyboard shortcut: focus search with /
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

  const showToast = (msg) => {
    setToast(msg);
    setTimeout(() => setToast(null), 1600);
  };

  const filteredProducts = mockProducts.filter(p => {
    const matchesCategory = selectedCategory === 'all' || p.category === selectedCategory;
    const matchesSearch = !searchQuery || p.name.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesCategory && matchesSearch;
  });

  const handleSelectProduct = (product) => {
    if (product.category === 'combos') {
      const mexa = mockProducts.find(p => p.id === 'h2');
      const papas = mockProducts.find(p => p.id === 's2');
      if (mexa) addToCart(mexa, []);
      if (papas) addToCart(papas, []);
      showToast('⚡ Combo Mexa agregado');
    } else if (product.hasModifiers) {
      setSelectedProduct(product);
    } else {
      addToCart(product, []);
      showToast(`✓ ${product.name} agregado`);
    }
  };

  const handleCheckout = () => {
    if (cart.length === 0) return;
    addOrder({
      customerName: customerName || 'Cliente en mostrador',
      customerPhone: customerPhone.trim() || null,
      deliveryLink: deliveryLink.trim() || null,
      items: cart,
      total: cartTotal
    }, currentUser?.id || null);
    clearCart();
    setCustomerName('');
    setCustomerPhone('');
    setDeliveryLink('');
    showToast('🔥 ¡Pedido enviado a cocina!');
  };

  // Quick combos for the speed bar
  const quickCombos = [
    { label: '⚡ Combo Mexa', ids: ['h2', 's2'] },
    { label: '🍔 Clásica + Papas', ids: ['h1', 's1'] },
    { label: '🍍 Hawaiana + Papas Esp.', ids: ['h4', 's2'] },
  ];

  const handleQuickCombo = (combo) => {
    combo.ids.forEach(id => {
      const p = mockProducts.find(pr => pr.id === id);
      if (p) addToCart(p, []);
    });
    showToast(`✓ ${combo.label} agregado`);
  };

  return (
    <>
      <div className="pos-layout">
        {/* ===== LEFT: Product Selection ===== */}
        <div className="pos-products">
          {/* Header */}
          <div className="pos-header">
            <div>
              <h1 style={{ fontSize: '22px', marginBottom: '2px' }}>Caja / O2O</h1>
              <p style={{ color: 'var(--text-muted)', fontSize: '13px' }}>Prioridad: Throughput y Precisión.</p>
            </div>
            <button 
              onClick={() => setIsCustomOrderOpen(true)} 
              className="btn" 
              style={{ padding: '8px 14px', fontSize: '12px', minHeight: 'auto', background: 'var(--bg-container)', color: 'var(--text-main)' }}
            >
              <PenLine size={14} /> Especial
            </button>
          </div>

          {/* Quick Combos Bar */}
          <div className="pos-quick-bar">
            <span style={{ fontSize: '11px', fontWeight: '800', textTransform: 'uppercase', color: 'var(--text-muted)', letterSpacing: '0.06em', whiteSpace: 'nowrap' }}>
              <Zap size={12} style={{ display: 'inline', verticalAlign: '-2px' }} /> Rápido:
            </span>
            {quickCombos.map((combo, i) => (
              <button 
                key={i} 
                className="pos-quick-btn"
                onClick={() => handleQuickCombo(combo)}
              >
                {combo.label}
              </button>
            ))}
          </div>

          {/* Search */}
          <div className="pos-search-wrapper">
            <Search size={16} className="pos-search-icon" />
            <input 
              ref={searchRef}
              type="text" 
              placeholder='Buscar producto... ( / )'
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pos-search-input"
            />
            {searchQuery && (
              <button className="pos-search-clear" onClick={() => setSearchQuery('')}>
                <X size={14} />
              </button>
            )}
          </div>

          {/* Category Tabs */}
          <div className="pos-categories">
            {CATEGORIES.map(cat => (
              <button
                key={cat.id}
                className={`pos-cat-btn ${selectedCategory === cat.id ? 'active' : ''}`}
                onClick={() => setSelectedCategory(cat.id)}
              >
                {cat.label}
              </button>
            ))}
          </div>

          {/* Product Grid */}
          <div className="pos-grid">
            {filteredProducts.map(product => (
              <button
                key={product.id}
                className="pos-product-card"
                onClick={() => handleSelectProduct(product)}
              >
                <span className="pos-product-emoji">{product.image}</span>
                <span className="pos-product-name">{product.name}</span>
                <span className="pos-product-price">${product.price.toFixed(0)}</span>
                <span className="pos-product-add">
                  <Plus size={16} strokeWidth={3} />
                </span>
              </button>
            ))}
            {filteredProducts.length === 0 && (
              <div style={{ gridColumn: '1 / -1', textAlign: 'center', padding: '40px 20px', color: 'var(--text-muted)' }}>
                <Search size={32} strokeWidth={1.5} style={{ marginBottom: '8px' }} />
                <p>No se encontraron productos</p>
              </div>
            )}
          </div>

          <img src="/burger_mascot.png" alt="Cheesy Burger Mascot" className="pos-mascot" />
        </div>

        {/* ===== RIGHT: Cart Panel (Always visible) ===== */}
        <div className="pos-cart-panel">
          <div className="pos-cart-header">
            <h2 style={{ fontSize: '16px', display: 'flex', alignItems: 'center', gap: '8px', margin: 0 }}>
              <ShoppingBag size={18} />
              Orden Actual
              {cartCount > 0 && (
                <span className="pos-cart-badge">{cartCount}</span>
              )}
            </h2>
            {cart.length > 0 && (
              <button className="pos-cart-clear" onClick={clearCart}>
                <Trash2 size={14} /> Vaciar
              </button>
            )}
          </div>

          {/* Cart Items */}
          <div className="pos-cart-items">
            {cart.length === 0 ? (
              <div className="pos-cart-empty">
                <ShoppingBag size={40} strokeWidth={1} />
                <p>Carrito vacío</p>
                <p style={{ fontSize: '12px' }}>Toca un producto para agregarlo</p>
              </div>
            ) : (
              cart.map(item => (
                <div key={item.cartItemId} className="pos-cart-item">
                  <div className="pos-cart-item-info">
                    <span className="pos-cart-item-name">{item.name}</span>
                    {item.modifiers?.length > 0 && (
                      <span className="pos-cart-item-mods">
                        + {item.modifiers.map(m => m.name).join(', ')}
                      </span>
                    )}
                    <span className="pos-cart-item-price">${item.unitPrice.toFixed(0)} c/u</span>
                  </div>
                  <div className="pos-cart-item-controls">
                    <button className="pos-qty-btn" onClick={() => decreaseQuantity(item.cartItemId)}>
                      {item.quantity === 1 ? <Trash2 size={12} /> : <Minus size={12} />}
                    </button>
                    <span className="pos-qty-value">{item.quantity}</span>
                    <button className="pos-qty-btn" onClick={() => addToCart(item, item.modifiers)}>
                      <Plus size={12} />
                    </button>
                  </div>
                  <span className="pos-cart-item-subtotal">
                    ${(item.unitPrice * item.quantity).toFixed(0)}
                  </span>
                </div>
              ))
            )}
          </div>

          {/* Footer: Customer Info + Checkout */}
          <div className="pos-cart-footer">
            {/* Total */}
            <div className="pos-cart-total">
              <span>Total</span>
              <span>${cartTotal.toFixed(2)}</span>
            </div>

            {/* Customer Fields */}
            <input 
              type="text" 
              placeholder="📍 Nombre del cliente"
              value={customerName}
              onChange={(e) => setCustomerName(e.target.value)}
              className="pos-input"
            />
            <div className="pos-input-row">
              <input 
                type="tel" 
                placeholder="☎️ Teléfono"
                value={customerPhone}
                onChange={(e) => setCustomerPhone(e.target.value)}
                className="pos-input"
                style={{ flex: 1 }}
              />
              <input 
                type="url" 
                placeholder="📍 Maps"
                value={deliveryLink}
                onChange={(e) => setDeliveryLink(e.target.value)}
                className="pos-input"
                style={{ flex: 1 }}
              />
            </div>

            {/* Checkout Button */}
            <button 
              className="pos-checkout-btn"
              onClick={handleCheckout}
              disabled={cart.length === 0}
            >
              <Send size={18} />
              Confirmar y Enviar a Cocina
            </button>
          </div>
        </div>
      </div>

      {/* Mobile: Floating cart button */}
      {cartCount > 0 && (
        <div className="pos-mobile-fab" onClick={() => {
          document.querySelector('.pos-cart-panel')?.scrollIntoView({ behavior: 'smooth' });
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <span className="pos-cart-badge">{cartCount}</span>
            <span>Ver Orden</span>
          </div>
          <span style={{ fontWeight: '800' }}>${cartTotal.toFixed(2)}</span>
        </div>
      )}

      {/* Toast */}
      {toast && (
        <div className="pos-toast">
          {toast}
        </div>
      )}

      {/* Modals */}
      <ProductOptionsModal 
        isOpen={!!selectedProduct} 
        product={selectedProduct} 
        onClose={() => setSelectedProduct(null)} 
        onAddToCart={(product, mods) => {
          addToCart(product, mods);
          showToast(`✓ ${product.name} agregado`);
        }} 
      />
      <CustomOrderModal
        isOpen={isCustomOrderOpen}
        onClose={() => setIsCustomOrderOpen(false)}
      />

      <style>{`
        /* ============ POS SPLIT LAYOUT ============ */
        .pos-layout {
          display: flex;
          gap: 0;
          height: calc(100vh - 60px);
          overflow: hidden;
        }

        .pos-products {
          flex: 1;
          display: flex;
          flex-direction: column;
          overflow: hidden;
          padding: 16px 20px;
          gap: 12px;
          position: relative;
        }

        .pos-mascot {
          position: absolute;
          bottom: 20px;
          left: 20px;
          width: 250px;
          height: auto;
          opacity: 0.9;
          pointer-events: none;
          z-index: 0;
          animation: float 6s ease-in-out infinite;
          mix-blend-mode: screen;
        }

        @keyframes float {
          0% { transform: translateY(0px) rotate(0deg); }
          50% { transform: translateY(-10px) rotate(2deg); }
          100% { transform: translateY(0px) rotate(0deg); }
        }

        .pos-cart-panel {
          width: 360px;
          flex-shrink: 0;
          display: flex;
          flex-direction: column;
          background: var(--bg-container);
          border-left: var(--border-2) solid var(--ink);
          overflow: hidden;
        }

        /* ============ HEADER ============ */
        .pos-header {
          display: flex;
          justify-content: space-between;
          align-items: flex-start;
          gap: 12px;
        }

        /* ============ QUICK COMBOS ============ */
        .pos-quick-bar {
          display: flex;
          align-items: center;
          gap: 8px;
          overflow-x: auto;
          padding: 8px 0;
          scrollbar-width: none;
        }
        .pos-quick-bar::-webkit-scrollbar { display: none; }

        .pos-quick-btn {
          padding: 6px 14px;
          background: var(--yellow);
          color: #0A0A0A !important;
          border: var(--border-2) solid var(--ink);
          border-radius: var(--radius-sm);
          font-family: 'Inter', sans-serif;
          font-size: 12px;
          font-weight: 800;
          cursor: pointer;
          white-space: nowrap;
          box-shadow: var(--shadow-sm);
          transition: transform var(--transition-fast), box-shadow var(--transition-fast);
          text-transform: uppercase;
        }
        .pos-quick-btn:hover {
          transform: translate(-2px, -2px);
          box-shadow: var(--shadow-md);
        }
        .pos-quick-btn:active {
          transform: translate(2px, 2px);
          box-shadow: none;
        }

        /* ============ SEARCH ============ */
        .pos-search-wrapper {
          position: relative;
        }
        .pos-search-icon {
          position: absolute;
          left: 12px;
          top: 50%;
          transform: translateY(-50%);
          color: var(--text-muted);
          pointer-events: none;
        }
        .pos-search-input {
          width: 100%;
          padding: 10px 36px 10px 36px !important;
          font-size: 14px !important;
          box-sizing: border-box;
        }
        .pos-search-clear {
          position: absolute;
          right: 10px;
          top: 50%;
          transform: translateY(-50%);
          background: var(--ink);
          color: var(--paper);
          border: none;
          border-radius: 50%;
          width: 22px;
          height: 22px;
          display: flex;
          align-items: center;
          justify-content: center;
          cursor: pointer;
        }

        /* ============ CATEGORY TABS ============ */
        .pos-categories {
          display: flex;
          gap: 6px;
          overflow-x: auto;
          scrollbar-width: none;
        }
        .pos-categories::-webkit-scrollbar { display: none; }

        .pos-cat-btn {
          padding: 6px 16px;
          border: var(--border-2) solid var(--ink);
          border-radius: var(--radius-sm);
          background: var(--bg-surface);
          color: var(--text-main);
          font-family: 'Inter', sans-serif;
          font-size: 13px;
          font-weight: 700;
          cursor: pointer;
          white-space: nowrap;
          text-transform: uppercase;
          transition: all var(--transition-fast);
          box-shadow: var(--shadow-sm);
        }
        .pos-cat-btn:hover {
          transform: translate(-1px, -1px);
          box-shadow: var(--shadow-md);
        }
        .pos-cat-btn.active {
          background: var(--ink);
          color: var(--bg-surface);
          box-shadow: none;
          transform: translate(2px, 2px);
        }

        /* ============ PRODUCT GRID ============ */
        .pos-grid {
          flex: 1;
          display: grid;
          grid-template-columns: repeat(auto-fill, minmax(140px, 1fr));
          gap: 10px;
          overflow-y: auto;
          padding: 4px 2px 80px 2px;
          align-content: start;
          position: relative;
          z-index: 1;
        }

        .pos-product-card {
          display: flex;
          flex-direction: column;
          align-items: center;
          gap: 4px;
          padding: 14px 8px 10px;
          background: var(--bg-surface);
          border: var(--border-2) solid var(--ink);
          border-radius: var(--radius-md);
          box-shadow: var(--shadow-sm);
          cursor: pointer;
          font-family: 'Inter', sans-serif;
          transition: transform var(--transition-fast), box-shadow var(--transition-fast);
          position: relative;
          text-align: center;
        }
        .pos-product-card:hover {
          transform: translate(-2px, -2px);
          box-shadow: var(--shadow-md);
          background: var(--yellow);
        }
        .pos-product-card:active {
          transform: translate(2px, 2px);
          box-shadow: none;
        }

        .pos-product-emoji { font-size: 28px; }
        .pos-product-name {
          font-size: 13px;
          font-weight: 700;
          line-height: 1.2;
          color: var(--text-main);
        }
        .pos-product-price {
          font-size: 15px;
          font-weight: 900;
          color: var(--text-main);
          font-family: 'Space Grotesk', sans-serif;
        }
        .pos-product-add {
          position: absolute;
          top: 6px;
          right: 6px;
          width: 24px;
          height: 24px;
          background: var(--ink);
          color: var(--paper);
          border-radius: 50%;
          display: flex;
          align-items: center;
          justify-content: center;
          opacity: 0;
          transition: opacity var(--transition-fast);
        }
        .pos-product-card:hover .pos-product-add {
          opacity: 1;
        }

        /* ============ CART PANEL ============ */
        .pos-cart-header {
          padding: 14px 16px;
          display: flex;
          justify-content: space-between;
          align-items: center;
          border-bottom: var(--border-2) solid var(--ink);
          background: var(--yellow);
          color: #0A0A0A;
        }

        .pos-cart-badge {
          background: var(--ink);
          color: var(--bg-surface);
          font-size: 11px;
          font-weight: 800;
          padding: 1px 7px;
          border-radius: var(--radius-full);
          min-width: 18px;
          text-align: center;
        }

        .pos-cart-clear {
          display: flex;
          align-items: center;
          gap: 4px;
          padding: 4px 10px;
          background: transparent;
          border: 2px solid var(--ink);
          font-family: 'Inter', sans-serif;
          font-size: 11px;
          font-weight: 700;
          cursor: pointer;
          text-transform: uppercase;
          border-radius: var(--radius-sm);
        }
        .pos-cart-clear:hover {
          background: var(--red);
          color: var(--white);
        }

        .pos-cart-items {
          flex: 1;
          overflow-y: auto;
          padding: 8px;
        }

        .pos-cart-empty {
          display: flex;
          flex-direction: column;
          align-items: center;
          gap: 6px;
          color: var(--text-muted);
          margin-top: 60px;
          text-align: center;
        }

        .pos-cart-item {
          display: flex;
          align-items: center;
          gap: 8px;
          padding: 10px 12px;
          margin-bottom: 6px;
          background: var(--bg-color);
          border: 2px solid var(--ink);
          border-radius: var(--radius-sm);
          box-shadow: 2px 2px 0 var(--ink);
        }

        .pos-cart-item-info {
          flex: 1;
          min-width: 0;
          display: flex;
          flex-direction: column;
        }
        .pos-cart-item-name {
          font-size: 13px;
          font-weight: 700;
          white-space: nowrap;
          overflow: hidden;
          text-overflow: ellipsis;
        }
        .pos-cart-item-mods {
          font-size: 11px;
          color: var(--yellow-deep);
          font-weight: 600;
        }
        .pos-cart-item-price {
          font-size: 11px;
          color: var(--text-muted);
        }

        .pos-cart-item-controls {
          display: flex;
          align-items: center;
          gap: 4px;
        }

        .pos-qty-btn {
          width: 26px;
          height: 26px;
          display: flex;
          align-items: center;
          justify-content: center;
          border: 2px solid var(--ink);
          background: var(--bg-surface);
          border-radius: var(--radius-sm);
          cursor: pointer;
          padding: 0;
          transition: background var(--transition-fast);
        }
        .pos-qty-btn:hover { background: var(--yellow); }

        .pos-qty-value {
          width: 22px;
          text-align: center;
          font-weight: 800;
          font-size: 14px;
        }

        .pos-cart-item-subtotal {
          font-size: 14px;
          font-weight: 900;
          font-family: 'Space Grotesk', sans-serif;
          min-width: 40px;
          text-align: right;
        }

        /* ============ CART FOOTER ============ */
        .pos-cart-footer {
          padding: 12px 16px 16px;
          border-top: var(--border-2) solid var(--ink);
          display: flex;
          flex-direction: column;
          gap: 8px;
          background: var(--bg-container);
        }

        .pos-cart-total {
          display: flex;
          justify-content: space-between;
          font-size: 22px;
          font-weight: 900;
          font-family: 'Archivo Black', sans-serif;
          padding-bottom: 8px;
          border-bottom: 2px dashed var(--ink);
          margin-bottom: 4px;
        }

        .pos-input {
          width: 100%;
          padding: 8px 12px !important;
          font-size: 13px !important;
          box-sizing: border-box;
        }

        .pos-input-row {
          display: flex;
          gap: 6px;
        }

        .pos-checkout-btn {
          width: 100%;
          padding: 14px;
          font-size: 14px;
          font-weight: 800;
          font-family: 'Inter', sans-serif;
          text-transform: uppercase;
          letter-spacing: 0.03em;
          border: var(--border-2) solid var(--ink);
          border-radius: var(--radius-md);
          background: var(--green);
          color: #0A0A0A !important;
          box-shadow: var(--shadow-md);
          cursor: pointer;
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 8px;
          transition: transform var(--transition-fast), box-shadow var(--transition-fast);
        }
        .pos-checkout-btn:hover {
          transform: translate(-2px, -2px);
          box-shadow: var(--shadow-lg);
        }
        .pos-checkout-btn:active {
          transform: translate(2px, 2px);
          box-shadow: none;
        }
        .pos-checkout-btn:disabled {
          opacity: 0.4;
          cursor: not-allowed;
          transform: none !important;
          box-shadow: var(--shadow-sm) !important;
        }

        /* ============ TOAST ============ */
        .pos-toast {
          position: fixed;
          bottom: 80px;
          left: 50%;
          transform: translateX(-50%);
          background: var(--ink);
          color: var(--paper);
          padding: 10px 24px;
          border: var(--border-2) solid var(--yellow);
          border-radius: var(--radius-sm);
          font-size: 14px;
          font-weight: 700;
          box-shadow: var(--shadow-md);
          z-index: 999;
          animation: toastIn 0.25s var(--spring);
          white-space: nowrap;
        }

        @keyframes toastIn {
          from { opacity: 0; transform: translateX(-50%) translateY(20px) scale(0.9); }
          to   { opacity: 1; transform: translateX(-50%) translateY(0) scale(1); }
        }

        /* ============ MOBILE FAB ============ */
        .pos-mobile-fab {
          display: none;
          position: fixed;
          bottom: 20px;
          left: 16px;
          right: 16px;
          padding: 14px 20px;
          background: var(--ink);
          color: var(--paper);
          border: var(--border-2) solid var(--yellow);
          border-radius: var(--radius-md);
          box-shadow: var(--shadow-lg);
          justify-content: space-between;
          align-items: center;
          cursor: pointer;
          z-index: 30;
          font-weight: 700;
          font-size: 14px;
        }

        /* ============ RESPONSIVE ============ */
        @media (max-width: 768px) {
          .pos-layout {
            flex-direction: column;
            height: auto;
            overflow: visible;
          }
          .pos-products {
            overflow: visible;
            padding: 12px 12px;
          }
          .pos-cart-panel {
            width: 100%;
            border-left: none;
            border-top: var(--border-3) solid var(--ink);
          }
          .pos-grid {
            grid-template-columns: repeat(auto-fill, minmax(110px, 1fr));
            overflow-y: visible;
            padding-bottom: 100px;
          }
          .pos-mobile-fab {
            display: flex;
          }
        }
      `}</style>
    </>
  );
};

export default PosMenu;
