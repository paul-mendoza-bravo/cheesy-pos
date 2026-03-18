import React, { useState } from 'react';
import { useCart } from '../context/CartContext';
import { X, Plus, Trash2, PenLine, ShoppingCart } from 'lucide-react';

const CustomOrderModal = ({ isOpen, onClose }) => {
  const { addToCart } = useCart();
  const [items, setItems] = useState([{ name: '', price: '', quantity: 1, note: '' }]);

  if (!isOpen) return null;

  const handleItemChange = (index, field, value) => {
    setItems(prev => {
      const updated = [...prev];
      updated[index] = { ...updated[index], [field]: value };
      return updated;
    });
  };

  const handleAddRow = () => {
    setItems(prev => [...prev, { name: '', price: '', quantity: 1, note: '' }]);
  };

  const handleRemoveRow = (index) => {
    setItems(prev => prev.filter((_, i) => i !== index));
  };

  const total = items.reduce((sum, item) => sum + (parseFloat(item.price) || 0) * (item.quantity || 1), 0);

  const handleAddToCart = () => {
    const validItems = items.filter(item => item.name.trim() && parseFloat(item.price) > 0);
    if (validItems.length === 0) return;

    validItems.forEach(item => {
      const product = {
        id: `custom-${Date.now()}-${Math.random()}`,
        name: item.name.trim(),
        price: parseFloat(item.price),
        category: 'Personalizado',
        note: item.note
      };
      // Add the item n times based on quantity
      for (let i = 0; i < (item.quantity || 1); i++) {
        addToCart(product, item.note ? [{ id: 'note', name: `Nota: ${item.note}`, price: 0 }] : []);
      }
    });

    // Reset and close
    setItems([{ name: '', price: '', quantity: 1, note: '' }]);
    onClose();
  };

  return (
    <>
      {/* Backdrop */}
      <div 
        onClick={onClose}
        style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', zIndex: 100 }} 
      />
      
      {/* Modal */}
      <div style={{
        position: 'fixed',
        inset: '0',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 101,
        padding: '16px'
      }}>
        <div className="card" style={{ width: '100%', maxWidth: '520px', maxHeight: '80vh', display: 'flex', flexDirection: 'column', padding: 0, overflow: 'hidden' }}>
          
          {/* Header */}
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '20px 24px', borderBottom: '1px solid var(--border-color)' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <PenLine size={20} color="var(--primary-color)" />
              <h2 style={{ fontSize: '18px', margin: 0 }}>Pedido Personalizado</h2>
            </div>
            <button onClick={onClose} className="btn" style={{ padding: '6px', background: 'transparent', border: 'none' }}>
              <X size={20} />
            </button>
          </div>

          {/* Items List */}
          <div style={{ overflowY: 'auto', flex: 1, padding: '20px 24px' }}>
            <p style={{ fontSize: '13px', color: 'var(--text-muted)', marginBottom: '16px' }}>
              Agrega ítems con nombre y precio libre para pedidos especiales.
            </p>
            
            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              {items.map((item, idx) => (
                <div key={idx} style={{ background: 'var(--bg-container)', borderRadius: 'var(--border-radius-md)', padding: '12px' }}>
                  <div style={{ display: 'flex', gap: '8px', marginBottom: '8px' }}>
                    <input 
                      type="text"
                      placeholder="Nombre del ítem (ej. Extra Aguacate)"
                      value={item.name}
                      onChange={e => handleItemChange(idx, 'name', e.target.value)}
                      className="input-field"
                      style={{ flex: 2, padding: '8px 12px', fontSize: '14px' }}
                    />
                    <input 
                      type="number"
                      placeholder="$"
                      min="0"
                      step="0.50"
                      value={item.price}
                      onChange={e => handleItemChange(idx, 'price', e.target.value)}
                      className="input-field"
                      style={{ flex: 1, padding: '8px 12px', fontSize: '14px', minWidth: '60px' }}
                    />
                    <input 
                      type="number"
                      placeholder="x"
                      min="1"
                      value={item.quantity}
                      onChange={e => handleItemChange(idx, 'quantity', parseInt(e.target.value) || 1)}
                      className="input-field"
                      style={{ width: '48px', padding: '8px', fontSize: '14px', textAlign: 'center' }}
                    />
                    {items.length > 1 && (
                      <button onClick={() => handleRemoveRow(idx)} className="btn" style={{ padding: '8px', background: 'var(--focus-ring)', border: 'none', color: 'var(--primary-color)', borderRadius: '8px' }}>
                        <Trash2 size={16} />
                      </button>
                    )}
                  </div>
                  <input 
                    type="text"
                    placeholder="Nota especial (opcional)"
                    value={item.note}
                    onChange={e => handleItemChange(idx, 'note', e.target.value)}
                    className="input-field"
                    style={{ width: '100%', padding: '6px 12px', fontSize: '13px', color: 'var(--text-muted)', boxSizing: 'border-box' }}
                  />
                </div>
              ))}
            </div>

            <button onClick={handleAddRow} className="btn" style={{ marginTop: '12px', padding: '8px 16px', fontSize: '13px', border: '1px dashed var(--border-color)', background: 'transparent', display: 'flex', alignItems: 'center', gap: '6px', width: '100%', justifyContent: 'center', color: 'var(--text-muted)' }}>
              <Plus size={16} /> Agregar otro ítem
            </button>
          </div>

          {/* Footer */}
          <div style={{ padding: '16px 24px', borderTop: '1px solid var(--border-color)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div>
              <span style={{ fontSize: '13px', color: 'var(--text-muted)' }}>Total estimado</span>
              <p style={{ fontSize: '22px', fontWeight: '700', margin: 0 }}>${total.toFixed(2)}</p>
            </div>
            <button 
              onClick={handleAddToCart} 
              className="btn btn-primary" 
              disabled={!items.some(i => i.name.trim() && parseFloat(i.price) > 0)}
              style={{ padding: '12px 24px', display: 'flex', alignItems: 'center', gap: '8px', fontSize: '15px' }}
            >
              <ShoppingCart size={18} /> Agregar al Carrito
            </button>
          </div>

        </div>
      </div>
    </>
  );
};

export default CustomOrderModal;
