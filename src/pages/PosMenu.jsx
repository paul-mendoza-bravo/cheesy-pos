import React, { useState } from 'react';
import { mockProducts } from '../data/mockProducts';
import { useCart } from '../context/CartContext';
import CategoryTabs from '../components/CategoryTabs';
import ProductCard from '../components/ProductCard';
import ProductOptionsModal from '../components/ProductOptionsModal';
import CustomOrderModal from '../components/CustomOrderModal';
import CartDrawer from '../components/CartDrawer';
import { ShoppingBag, PenLine } from 'lucide-react';

const PosMenu = () => {
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [isCartOpen, setIsCartOpen] = useState(false);
  const [selectedProduct, setSelectedProduct] = useState(null);
  const [isCustomOrderOpen, setIsCustomOrderOpen] = useState(false);
  const { cartCount, cartTotal, addToCart } = useCart();

  const filteredProducts = selectedCategory === 'all' 
    ? mockProducts 
    : mockProducts.filter(p => p.category === selectedCategory);

  const handleSelectProduct = (product) => {
    if (product.category === 'combos') {
      // Logic for hardcoded "Mexa + Papas Especiales" combo injection for speed
      const mexa = mockProducts.find(p => p.id === 'h2');
      const papas = mockProducts.find(p => p.id === 's2');
      if(mexa) addToCart(mexa, []);
      if(papas) addToCart(papas, []);
      // Optional: Add visual feedback here (toast)
    } else if (product.hasModifiers) {
      setSelectedProduct(product);
    } else {
      addToCart(product, []);
    }
  };

  return (
    <div style={{ paddingBottom: '80px' }}>
      <div style={{ marginBottom: '16px', display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '12px' }}>
        <div>
          <h1 style={{ fontSize: '24px', marginBottom: '4px' }}>Caja / O2O</h1>
          <p style={{ color: 'var(--text-muted)', fontSize: '14px' }}>Prioridad: Throughput y Presición.</p>
        </div>
        <button 
          onClick={() => setIsCustomOrderOpen(true)} 
          className="btn" 
          style={{ padding: '10px 14px', background: 'var(--bg-container)', border: '1px solid var(--border-color)', display: 'flex', alignItems: 'center', gap: '6px', fontSize: '13px', whiteSpace: 'nowrap', flexShrink: 0 }}
        >
          <PenLine size={16} color="var(--primary-color)" /> Pedido Especial
        </button>
      </div>

      <CategoryTabs 
        selectedCategory={selectedCategory} 
        onSelectCategory={setSelectedCategory} 
      />

      <div style={{ 
        display: 'grid', 
        gridTemplateColumns: 'repeat(auto-fill, minmax(160px, 1fr))', 
        gap: '16px',
        marginTop: '16px'
      }}>
        {filteredProducts.map(product => (
          <ProductCard 
            key={product.id} 
            product={product} 
            onSelectProduct={handleSelectProduct}
          />
        ))}
      </div>

      {/* Floating Checkout Button for Mobile */}
      {cartCount > 0 && (
        <div style={{
          position: 'fixed',
          bottom: '24px',
          left: '16px',
          right: '16px',
          zIndex: 30
        }}>
          <button 
            className="btn btn-primary"
            style={{ 
              width: '100%', 
              padding: '16px', 
              borderRadius: 'var(--border-radius-lg)', 
              display: 'flex', 
              justifyContent: 'space-between',
              alignItems: 'center',
              boxShadow: 'var(--shadow-md)',
              background: 'var(--text-main)',
              color: 'var(--bg-color)',
              border: `1px solid var(--border-color)`
            }}
            onClick={() => setIsCartOpen(true)}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <div style={{ background: 'var(--bg-color)', color: 'var(--text-main)', borderRadius: '50%', width: '24px', height: '24px', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '12px', fontWeight: 'bold' }}>
                {cartCount}
              </div>
              <span>Ver Orden</span>
            </div>
            <span style={{ fontWeight: '600' }}>${cartTotal.toFixed(2)}</span>
          </button>
        </div>
      )}

      <CartDrawer isOpen={isCartOpen} onClose={() => setIsCartOpen(false)} />
      
      <ProductOptionsModal 
        isOpen={!!selectedProduct} 
        product={selectedProduct} 
        onClose={() => setSelectedProduct(null)} 
        onAddToCart={addToCart} 
      />

      <CustomOrderModal
        isOpen={isCustomOrderOpen}
        onClose={() => setIsCustomOrderOpen(false)}
      />
    </div>
  );
};

export default PosMenu;
