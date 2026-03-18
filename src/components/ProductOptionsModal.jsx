import React, { useState, useEffect } from 'react';
import { MODIFIERS } from '../data/mockProducts';
import { X } from 'lucide-react';

const ProductOptionsModal = ({ isOpen, onClose, product, onAddToCart }) => {
  const [selectedModifiers, setSelectedModifiers] = useState({});

  // Reset state when a new product is opened
  useEffect(() => {
    setSelectedModifiers({});
  }, [product]);

  if (!isOpen || !product) return null;

  const handleToggleModifier = (modKey) => {
    setSelectedModifiers(prev => ({
      ...prev,
      [modKey]: !prev[modKey]
    }));
  };

  const handleConfirm = () => {
    // Convert the boolean state map to an array of modifier objects
    const modsArray = Object.keys(selectedModifiers)
      .filter(key => selectedModifiers[key])
      .map(key => MODIFIERS[key]);
      
    onAddToCart(product, modsArray);
    onClose();
  };

  // Calculate dynamic total for the button preview
  const modsTotal = Object.keys(selectedModifiers)
      .filter(key => selectedModifiers[key])
      .reduce((sum, key) => sum + MODIFIERS[key].price, 0);
  const currentTotal = product.price + modsTotal;

  return (
    <>
      {/* Backdrop */}
      <div 
        style={{
          position: 'fixed',
          top: 0, left: 0, right: 0, bottom: 0,
          backgroundColor: 'rgba(0,0,0,0.5)',
          zIndex: 100,
          backdropFilter: 'blur(3px)'
        }}
        onClick={onClose}
      />
      
      {/* Modal Dialog */}
      <div style={{
        position: 'fixed',
        top: '50%',
        left: '50%',
        transform: 'translate(-50%, -50%)',
        backgroundColor: 'var(--bg-color)',
        borderRadius: 'var(--border-radius-lg)',
        width: '90%',
        maxWidth: '400px',
        zIndex: 101,
        boxShadow: 'var(--shadow-md)',
        overflow: 'hidden',
        animation: 'popIn 0.2s cubic-bezier(0.16, 1, 0.3, 1)'
      }}>
        
        {/* Header */}
        <div style={{ padding: '20px', borderBottom: '1px solid var(--border-color)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div>
            <h2 style={{ fontSize: '20px', margin: 0 }}>{product.image} {product.name}</h2>
            <p style={{ color: 'var(--text-muted)', fontSize: '14px', margin: 0 }}>Opciones del producto</p>
          </div>
          <button className="btn" onClick={onClose} style={{ padding: '8px', border: 'none', background: 'var(--bg-container)' }}>
            <X size={20} />
          </button>
        </div>

        {/* Form Body */}
        <div style={{ padding: '20px', maxHeight: '60vh', overflowY: 'auto' }}>
          <h3 style={{ fontSize: '14px', textTransform: 'uppercase', color: 'var(--text-muted)', marginBottom: '12px', letterSpacing: '0.05em' }}>
            Extras Sugeridos (Upsell)
          </h3>
          
          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            {Object.entries(MODIFIERS).map(([key, mod]) => (
              <label 
                key={key} 
                className="card"
                style={{ 
                  display: 'flex', 
                  alignItems: 'center', 
                  justifyContent: 'space-between', 
                  cursor: 'pointer',
                  padding: '16px',
                  border: selectedModifiers[key] ? '2px solid var(--primary-color)' : '1px solid var(--border-color)',
                  background: selectedModifiers[key] ? 'var(--focus-ring)' : 'var(--bg-color)'
                }}
              >
                <div>
                  <span style={{ fontWeight: '500', display: 'block' }}>{mod.name}</span>
                  <span style={{ color: 'var(--text-muted)', fontSize: '14px' }}>+${mod.price.toFixed(2)}</span>
                </div>
                <input 
                  type="checkbox" 
                  checked={selectedModifiers[key] || false}
                  onChange={() => handleToggleModifier(key)}
                  style={{
                    width: '20px',
                    height: '20px',
                    accentColor: 'var(--primary-color)'
                  }}
                />
              </label>
            ))}
          </div>
        </div>

        {/* Footer actions */}
        <div style={{ padding: '20px', borderTop: '1px solid var(--border-color)', background: 'var(--bg-container)' }}>
          <button 
            className="btn btn-primary" 
            style={{ width: '100%', padding: '16px', fontSize: '16px', borderRadius: 'var(--border-radius-md)' }}
            onClick={handleConfirm}
          >
            Agregar al carrito • ${currentTotal.toFixed(2)}
          </button>
        </div>
        
      </div>

      <style>{`
        @keyframes popIn {
          from { opacity: 0; transform: translate(-50%, -45%) scale(0.95); }
          to { opacity: 1; transform: translate(-50%, -50%) scale(1); }
        }
      `}</style>
    </>
  );
};

export default ProductOptionsModal;
