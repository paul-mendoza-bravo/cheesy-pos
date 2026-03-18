import React, { createContext, useState, useContext, useEffect, useRef } from 'react';
import { io } from 'socket.io-client';

const OrdersContext = createContext();

export const useOrders = () => useContext(OrdersContext);

const API_URL = 'http://localhost:3001/api';
const SOCKET_URL = 'http://localhost:3001';

export const OrdersProvider = ({ children }) => {
  const [orders, setOrders] = useState([]);
  const socketRef = useRef(null);

  useEffect(() => {
    // 1. Load initial orders from REST API
    const fetchOrders = async () => {
      try {
        const res = await fetch(`${API_URL}/orders`);
        if (res.ok) {
          const data = await res.json();
          setOrders(data);
        }
      } catch (error) {
        console.error('Error fetching orders:', error);
      }
    };
    fetchOrders();

    // 2. Connect to Socket.io for real-time updates
    const socket = io(SOCKET_URL, { transports: ['websocket'] });
    socketRef.current = socket;

    socket.on('connect', () => {
      console.log('[Socket] Conectado al servidor en tiempo real ✅');
    });

    socket.on('disconnect', () => {
      console.log('[Socket] Desconectado del servidor');
    });

    // 🔴 New order from Caja → show immediately in Cocina and Repartidor
    socket.on('nuevo_pedido', (newOrder) => {
      console.log('[Socket] Nuevo pedido recibido:', newOrder.id);
      setOrders(prev => {
        // Avoid duplicates if the same client created it
        const exists = prev.some(o => o.id === newOrder.id);
        if (exists) return prev;
        return [newOrder, ...prev];
      });
    });

    // 🔴 Status change (PENDING→READY→DELIVERED→TRASHED) → all screens update
    socket.on('pedido_actualizado', (updatedOrder) => {
      console.log('[Socket] Pedido actualizado:', updatedOrder.id, '→', updatedOrder.status);
      setOrders(prev =>
        prev.map(order =>
          order.id === updatedOrder.id
            ? { ...order, status: updatedOrder.status }
            : order
        )
      );
    });

    // 🔴 Order permanently deleted → remove from list
    socket.on('pedido_eliminado', ({ id }) => {
      console.log('[Socket] Pedido eliminado permanentemente:', id);
      setOrders(prev => prev.filter(order => order.id !== id));
    });

    // Cleanup on unmount
    return () => {
      socket.disconnect();
    };
  }, []);

  const addOrder = async (orderData, cajeroId = null) => {
    const newOrder = {
      ...orderData,
      id: `ord-${Date.now().toString().slice(-4)}`,
      status: 'PENDING',
      timestamp: new Date().toISOString(),
      cajeroId
    };

    try {
      const res = await fetch(`${API_URL}/orders`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newOrder)
      });
      if (!res.ok) {
        console.error('Error al crear pedido en servidor');
        setOrders(prev => [newOrder, ...prev]);
      }
    } catch (error) {
      console.error('Error creating order:', error);
      setOrders(prev => [newOrder, ...prev]);
    }
  };

  const updateOrderStatus = async (orderId, newStatus, userId = null) => {
    try {
      const res = await fetch(`${API_URL}/orders/${orderId}/status`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: newStatus, userId })
      });
      if (!res.ok) {
        console.error('Error al actualizar estado del pedido');
      }
    } catch (error) {
      console.error('Error updating status:', error);
    }
  };

  const deleteOrder = (orderId) => {
    updateOrderStatus(orderId, 'TRASHED');
  };

  const restoreOrder = (orderId) => {
    updateOrderStatus(orderId, 'PENDING');
  };

  const permanentlyDeleteOrder = async (orderId) => {
    try {
      const res = await fetch(`${API_URL}/orders/${orderId}`, {
        method: 'DELETE'
      });
      // Server emits 'pedido_eliminado' via Socket.io
      if (!res.ok) {
        console.error('Error al eliminar permanentemente');
      }
    } catch (error) {
      console.error('Error permanently deleting order:', error);
    }
  };

  return (
    <OrdersContext.Provider value={{ orders, addOrder, updateOrderStatus, deleteOrder, restoreOrder, permanentlyDeleteOrder }}>
      {children}
    </OrdersContext.Provider>
  );
};
