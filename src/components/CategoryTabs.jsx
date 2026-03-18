import React from 'react';
import { CATEGORIES } from '../data/mockProducts';

const CategoryTabs = ({ selectedCategory, onSelectCategory }) => {
  return (
    <div style={{
      display: 'flex',
      gap: '8px',
      paddingBottom: '12px',
      overflowX: 'auto',
      WebkitOverflowScrolling: 'touch',
      msOverflowStyle: 'none',
      scrollbarWidth: 'none',
    }}>
      {CATEGORIES.map(category => (
        <button
          key={category.id}
          className={`btn ${selectedCategory === category.id ? 'btn-primary' : ''}`}
          onClick={() => onSelectCategory(category.id)}
          style={{
            whiteSpace: 'nowrap',
            flexShrink: 0,
            borderRadius: '20px',
            fontSize: '14px',
            padding: '8px 16px',
            border: selectedCategory === category.id ? 'none' : '1px solid var(--border-color)',
            background: selectedCategory === category.id ? 'var(--text-main)' : 'var(--bg-color)',
            color: selectedCategory === category.id ? 'var(--bg-color)' : 'var(--text-main)'
          }}
        >
          {category.label}
        </button>
      ))}
    </div>
  );
};

export default CategoryTabs;
