import React, { createContext, useState, useContext } from 'react';

const CartContext = createContext();

export const useCart = () => useContext(CartContext);

export const CartProvider = ({ children }) => {
  const [cart, setCart] = useState([]);

  // Generate a unique identifier for items that might have the same ID but different modifiers
  const generateCartItemId = (product, modifiers = []) => {
    if (modifiers.length === 0) return product.id;
    const modIds = modifiers.map(m => m.id).sort().join('-');
    return `${product.id}-${modIds}`;
  };

  const addToCart = (product, modifiers = []) => {
    setCart((prevCart) => {
      const cartItemId = generateCartItemId(product, modifiers);
      const existing = prevCart.find(item => item.cartItemId === cartItemId);
      
      if (existing) {
        return prevCart.map(item =>
          item.cartItemId === cartItemId ? { ...item, quantity: item.quantity + 1 } : item
        );
      }

      // Calculate base price + modifiers
      const modifiersTotal = modifiers.reduce((sum, mod) => sum + mod.price, 0);
      const unitPrice = product.price + modifiersTotal;

      return [...prevCart, { 
        ...product, 
        cartItemId,
        modifiers,
        unitPrice, // The price of this specific configuration
        quantity: 1 
      }];
    });
  };

  const decreaseQuantity = (cartItemId) => {
    setCart((prevCart) => {
      return prevCart.map(item => {
        if (item.cartItemId === cartItemId) {
          return { ...item, quantity: Math.max(0, item.quantity - 1) };
        }
        return item;
      }).filter(item => item.quantity > 0);
    });
  };

  const clearCart = () => setCart([]);

  const cartTotal = cart.reduce((total, item) => total + (item.unitPrice * item.quantity), 0);
  const cartCount = cart.reduce((count, item) => count + item.quantity, 0);

  return (
    <CartContext.Provider value={{ cart, addToCart, decreaseQuantity, clearCart, cartTotal, cartCount }}>
      {children}
    </CartContext.Provider>
  );
};
