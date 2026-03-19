import React, { createContext, useState, useContext, useEffect, useRef } from 'react';
import { io } from 'socket.io-client';
import { playNotificationSound } from '../utils/sound';

const InventoryContext = createContext();

export const useInventory = () => useContext(InventoryContext);

const HOST_URL = import.meta.env.VITE_API_URL || `http://${window.location.hostname}:3001`;
const API_URL = `${HOST_URL}/api`;
const SOCKET_URL = HOST_URL;

export const InventoryProvider = ({ children }) => {
  const [reports, setReports] = useState([]);
  const socketRef = useRef(null);

  useEffect(() => {
    const fetchReports = async () => {
      try {
        const res = await fetch(`${API_URL}/inventory`);
        if (res.ok) {
          const data = await res.json();
          setReports(data);
        }
      } catch (error) {
        console.error('Error fetching inventory reports:', error);
      }
    };
    fetchReports();

    const socket = io(SOCKET_URL, { 
      transports: ['websocket'],
      reconnection: true,
    });
    socketRef.current = socket;

    socket.on('nuevo_inventario', (newReport) => {
      console.log('[Socket] Nuevo reporte de inventario:', newReport.id);
      
      if (window.location.pathname === '/admin') {
        playNotificationSound();
      }

      setReports(prev => {
        const exists = prev.some(r => r.id === newReport.id);
        if (exists) return prev;
        return [newReport, ...prev];
      });
    });

    return () => socket.disconnect();
  }, []);

  const addReport = async (missingItems, cookId) => {
    try {
      const res = await fetch(`${API_URL}/inventory`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ missingItems, cookId })
      });
      if (!res.ok) {
        console.error('Error enviando reporte');
        return false;
      }
      return true;
    } catch (error) {
      console.error('Error submitting report:', error);
      return false;
    }
  };

  return (
    <InventoryContext.Provider value={{ reports, addReport }}>
      {children}
    </InventoryContext.Provider>
  );
};
