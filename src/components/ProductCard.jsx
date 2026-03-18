import React from 'react';
import { Plus } from 'lucide-react';

const ProductCard = ({ product, onSelectProduct }) => {
  return (
    <div className="card" style={{
      display: 'flex',
      flexDirection: 'column',
      justifyContent: 'space-between',
      gap: '8px',
      height: '100%',
      cursor: 'pointer'
    }} onClick={() => onSelectProduct(product)}>
      
      <div>
        <div style={{ fontSize: '32px', marginBottom: '8px' }}>{product.image}</div>
        <h3 style={{ fontSize: '16px', marginBottom: '4px' }}>{product.name}</h3>
        <p style={{ fontSize: '12px', color: 'var(--text-muted)', display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>
          {product.description}
        </p>
      </div>
      
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '12px' }}>
        <span style={{ fontWeight: '600', fontSize: '16px' }}>${product.price.toFixed(2)}</span>
        <button 
          className="btn btn-primary" 
          style={{ padding: '6px', borderRadius: '50%', background: 'var(--bg-container)', color: 'var(--text-main)', border: '1px solid var(--border-color)' }}
          onClick={(e) => {
            e.stopPropagation();
            onSelectProduct(product);
          }}
        >
          <Plus size={16} />
        </button>
      </div>

    </div>
  );
};

export default ProductCard;
