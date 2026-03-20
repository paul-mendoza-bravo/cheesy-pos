import React, { createContext, useState, useContext, useEffect, useRef } from 'react';
import { useLocation } from 'react-router-dom';
import { io } from 'socket.io-client';
import { playNotificationSound } from '../utils/sound';

const OrdersContext = createContext();

export const useOrders = () => useContext(OrdersContext);

const HOST_URL = import.meta.env.VITE_API_URL || `http://${window.location.hostname}:3001`;
const API_URL = `${HOST_URL}/api`;
const SOCKET_URL = HOST_URL;

export const OrdersProvider = ({ children }) => {
  const [orders, setOrders] = useState([]);
  const socketRef = useRef(null);

  // useLocation funciona porque OrdersProvider ahora vive dentro de BrowserRouter
  // (montado dentro de StaffShell, que es un layout route).
  // pathnameRef permite que los event handlers del socket lean la ruta actual
  // sin necesidad de recrear la conexión cuando el usuario navega.
  const { pathname } = useLocation();
  const pathnameRef = useRef(pathname);
  useEffect(() => {
    pathnameRef.current = pathname;
  }, [pathname]);

  useEffect(() => {
    // 1. Cargar órdenes iniciales desde la REST API
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

    // 2. Conectar a Socket.io para actualizaciones en tiempo real
    const socket = io(SOCKET_URL, {
      transports: ['websocket'],
      reconnection: true,
      reconnectionAttempts: Infinity,
      reconnectionDelay: 1000,
      reconnectionDelayMax: 5000,
      timeout: 20000,
    });
    socketRef.current = socket;

    socket.on('connect', () => {
      console.log('[Socket] Conectado al servidor en tiempo real ✅');
      socket.emit('join_staff_room');
    });

    socket.on('disconnect', () => {
      console.log('[Socket] Desconectado del servidor');
    });

    socket.on('nuevo_pedido', (newOrder) => {
      console.log('[Socket] Nuevo pedido POS recibido:', newOrder.id);

      const path = pathnameRef.current;
      if (path === '/kitchen' || path === '/admin') {
        playNotificationSound();
      }

      setOrders((prev) => {
        const exists = prev.some((o) => o.id === newOrder.id);
        return exists ? prev : [newOrder, ...prev];
      });
    });

    socket.on('nuevo_pedido_cliente', (newOrder) => {
      console.log('[Socket] Nuevo pedido B2C recibido:', newOrder.id);

      if (pathnameRef.current === '/admin') {
        playNotificationSound();
      }

      setOrders((prev) => {
        const exists = prev.some((o) => o.id === newOrder.id);
        return exists ? prev : [newOrder, ...prev];
      });
    });

    socket.on('pedido_actualizado', (updatedOrder) => {
      console.log('[Socket] Pedido actualizado:', updatedOrder.id, '→', updatedOrder.status);

      const path = pathnameRef.current;
      if (updatedOrder.status === 'READY' && (path === '/delivery' || path === '/admin')) {
        playNotificationSound();
      }
      if (updatedOrder.status === 'DELIVERED' && path === '/admin') {
        playNotificationSound();
      }

      setOrders((prev) =>
        prev.map((order) =>
          order.id === updatedOrder.id ? { ...order, status: updatedOrder.status } : order
        )
      );
    });

    socket.on('pedido_eliminado', ({ id }) => {
      console.log('[Socket] Pedido eliminado permanentemente:', id);
      setOrders((prev) => prev.filter((order) => order.id !== id));
    });

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
      cajeroId,
    };

    try {
      const res = await fetch(`${API_URL}/orders`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newOrder),
      });
      if (!res.ok) {
        console.error('Error al crear pedido en servidor');
        setOrders((prev) => [newOrder, ...prev]);
      }
    } catch (error) {
      console.error('Error creating order:', error);
      setOrders((prev) => [newOrder, ...prev]);
    }
  };

  const updateOrderStatus = async (orderId, newStatus, userId = null) => {
    try {
      const res = await fetch(`${API_URL}/orders/${orderId}/status`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: newStatus, userId }),
      });
      if (!res.ok) {
        console.error('Error al actualizar estado del pedido');
      }
    } catch (error) {
      console.error('Error updating status:', error);
    }
  };

  const deleteOrder = (orderId) => updateOrderStatus(orderId, 'TRASHED');
  const restoreOrder = (orderId) => updateOrderStatus(orderId, 'PENDING');

  const permanentlyDeleteOrder = async (orderId) => {
    try {
      const res = await fetch(`${API_URL}/orders/${orderId}`, { method: 'DELETE' });
      if (!res.ok) {
        console.error('Error al eliminar permanentemente');
      }
    } catch (error) {
      console.error('Error permanently deleting order:', error);
    }
  };

  return (
    <OrdersContext.Provider
      value={{ orders, addOrder, updateOrderStatus, deleteOrder, restoreOrder, permanentlyDeleteOrder }}
    >
      {children}
    </OrdersContext.Provider>
  );
};
