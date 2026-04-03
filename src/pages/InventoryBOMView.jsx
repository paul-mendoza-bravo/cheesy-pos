import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { mockProducts, MODIFIERS, CATEGORIES } from '../data/mockProducts';
import { ArrowLeft, Save, Plus, Beef, Check, Package, RefreshCw, AlertCircle, Trash2 } from 'lucide-react';

const HOST_URL = import.meta.env.VITE_API_URL || `http://${window.location.hostname}:3001`;
const API_URL = `${HOST_URL}/api`;

const allProducts = [
  ...mockProducts,
  ...Object.values(MODIFIERS)
];

const InventoryBOMView = () => {
  const navigate = useNavigate();
  const { currentUser } = useAuth();
  const [activeTab, setActiveTab] = useState('insumos'); // insumos | recipes | audit

  const [insumos, setInsumos] = useState([]);
  const [recipes, setRecipes] = useState([]);
  
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);

  // States for 'Insumos' Tab
  const [newInsumo, setNewInsumo] = useState({ name: '', unit: '', currentStock: 0 });

  // States for 'Recetas' Tab
  const [selectedProduct, setSelectedProduct] = useState(allProducts[0]?.id || '');
  const [currentRecipe, setCurrentRecipe] = useState([]);

  // States for 'Auditoría' Tab
  const [auditCounts, setAuditCounts] = useState({});

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    setLoading(true);
    try {
      const insRes = await fetch(`${API_URL}/insumos`);
      const recRes = await fetch(`${API_URL}/recipes`);
      const insData = await insRes.json();
      const recData = await recRes.json();
      setInsumos(insData);
      setRecipes(recData);
      
      // Initialize audit counts
      const counts = {};
      insData.forEach(ins => {
        counts[ins.id] = ins.currentStock;
      });
      setAuditCounts(counts);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  // ── INSUMOS ACTIONS ──
  const handleAddInsumo = async (e) => {
    e.preventDefault();
    if (!newInsumo.name || !newInsumo.unit) return;
    setSaving(true);
    try {
      const res = await fetch(`${API_URL}/insumos`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newInsumo)
      });
      if (res.ok) {
        setNewInsumo({ name: '', unit: '', currentStock: 0 });
        await fetchData();
      }
    } catch (err) {
      console.error(err);
    } finally {
      setSaving(false);
    }
  };

  const handleUpdateInsumoStock = async (id, currentStock) => {
    const target = insumos.find(i => i.id === id);
    if (!target) return;
    try {
      await fetch(`${API_URL}/insumos/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...target, currentStock: parseFloat(currentStock) || 0 })
      });
      fetchData();
    } catch (err) {
      console.error(err);
    }
  };

  // ── RECIPES ACTIONS ──
  useEffect(() => {
    if (selectedProduct) {
      const prodRecipes = recipes.filter(r => r.productId === selectedProduct);
      setCurrentRecipe(prodRecipes.map(r => ({ insumoId: r.insumoId, quantity: r.quantity })));
    }
  }, [selectedProduct, recipes]);

  const handleRecipeChange = (insumoId, quantity) => {
    setCurrentRecipe(prev => {
      const existing = prev.find(p => p.insumoId === insumoId);
      if (existing) {
        if (parseFloat(quantity) <= 0 || isNaN(quantity)) return prev.filter(p => p.insumoId !== insumoId);
        return prev.map(p => p.insumoId === insumoId ? { ...p, quantity: parseFloat(quantity) } : p);
      } else {
        if (parseFloat(quantity) > 0) return [...prev, { insumoId, quantity: parseFloat(quantity) }];
        return prev;
      }
    });
  };

  const handleSaveRecipe = async () => {
    if (!selectedProduct) return;
    setSaving(true);
    try {
      const res = await fetch(`${API_URL}/recipes/${selectedProduct}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ingredients: currentRecipe })
      });
      if (res.ok) {
        alert('Receta guardada exitosamente');
        await fetchData();
      }
    } catch (err) {
      console.error(err);
    } finally {
      setSaving(false);
    }
  };

  // ── AUDITORÍA ACTIONS ──
  const handleReconcile = async () => {
    if (!window.confirm('¿Seguro que deseas cerrar la auditoría de inventario? Esto actualizará las existencias en el sistema.')) return;
    setSaving(true);
    try {
      const payload = Object.keys(auditCounts).map(id => ({
        insumoId: parseInt(id),
        predictedStock: insumos.find(i => i.id === parseInt(id))?.currentStock || 0,
        actualStock: parseFloat(auditCounts[id]) || 0
      }));

      const res = await fetch(`${API_URL}/inventory/bom-reconcile`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ inventoryCounts: payload, userId: currentUser?.id })
      });
      if (res.ok) {
        alert('Auditoría completada exitosamente.');
        await fetchData();
        setActiveTab('insumos');
      }
    } catch (err) {
      console.error(err);
    } finally {
      setSaving(false);
    }
  };

  // ── KEYBOARD NAVIGATION ──
  const handleKeyDown = (e, index, prefix) => {
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      const nextInput = document.querySelector(`input[data-nav="${prefix}-${index + 1}"]`);
      if (nextInput) {
        nextInput.focus();
        setTimeout(() => nextInput.select(), 0);
      }
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      const prevInput = document.querySelector(`input[data-nav="${prefix}-${index - 1}"]`);
      if (prevInput) {
        prevInput.focus();
        setTimeout(() => prevInput.select(), 0);
      }
    }
  };

  // ── HELPERS ──
  const getProductIcon = (name = '') => {
    const n = name.toLowerCase();
    if (n.includes('pan')) return '🍔';
    if (n.includes('carne') || n.includes('beef')) return '🥩';
    if (n.includes('queso') || n.includes('cheese')) return '🧀';
    if (n.includes('papa') || n.includes('fries')) return '🍟';
    if (n.includes('tocino') || n.includes('bacon')) return '🥓';
    if (n.includes('salsa') || n.includes('bbq')) return '🥫';
    return '📦';
  };

  const CircularGauge = ({ value, label, color }) => {
    const strokeWidth = 8;
    const radius = 36;
    const circ = 2 * Math.PI * radius;
    const offset = circ - (value / 100) * circ;
    
    return (
      <div className="flex flex-col items-center gap-2">
        <div className="relative w-24 h-24">
          <svg className="w-full h-full transform -rotate-90">
            <circle stroke="rgba(255,255,255,0.05)" strokeWidth={strokeWidth} fill="transparent" r={radius} cx="48" cy="48" />
            <circle 
              stroke={color} 
              strokeWidth={strokeWidth} 
              strokeDasharray={circ} 
              strokeDashoffset={offset} 
              strokeLinecap="round" 
              fill="transparent" 
              r={radius} cx="48" cy="48" 
              style={{ transition: 'stroke-dashoffset 0.5s ease' }}
            />
          </svg>
          <div className="absolute inset-0 flex flex-col items-center justify-center">
            <span className="text-xl font-black text-white">{value}%</span>
          </div>
        </div>
        <span className="text-[10px] font-black text-[var(--text-muted)] uppercase tracking-widest">{label}</span>
      </div>
    );
  };


  // ── RENDER ──
  if (!currentUser?.role?.includes('admin')) {
    return (
      <div className="flex flex-col items-center justify-center p-10 h-full">
        <AlertCircle size={48} className="text-rose-500 mb-4" />
        <h2 className="text-xl font-bold">Acceso Denegado</h2>
        <p className="text-zinc-400 mt-2">Solo el administrador puede acceder a esta área.</p>
        <button onClick={() => navigate(-1)} className="btn mt-6">Volver</button>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#0E1116] text-white p-4 sm:p-8 font-sans" style={{ backgroundImage: 'radial-gradient(circle at top right, rgba(218,41,28,0.05), transparent), radial-gradient(circle at bottom left, rgba(255,199,44,0.05), transparent)' }}>
      
      {/* ── HEADER & NAVIGATION ── */}
      <div className="max-w-7xl mx-auto flex flex-col sm:flex-row justify-between items-start sm:items-center mb-10 gap-6">
        <div>
          <div className="flex items-center gap-3 mb-1">
            <Beef size={32} className="text-[var(--primary-color)]" />
            <h1 className="text-4xl font-black uppercase tracking-tighter">BOM Dashboard</h1>
          </div>
          <p className="text-[var(--primary-color)] text-xs font-black tracking-[0.2em] uppercase">fernando es putito</p>
        </div>
        <div className="bg-[#1A1F26] p-1.5 rounded-2xl flex gap-1 border border-white/5">
           {['insumos', 'recipes', 'audit'].map(tab => (
             <button 
               key={tab}
               onClick={() => setActiveTab(tab)}
               className={`px-6 py-2.5 rounded-xl text-xs font-black uppercase tracking-widest transition-all ${activeTab === tab ? 'bg-white text-black shadow-lg scale-105' : 'text-zinc-500 hover:text-white'}`}
             >
               {tab}
             </button>
           ))}
        </div>
      </div>

      {loading ? (
        <div className="flex flex-col items-center justify-center py-40 gap-4">
           <RefreshCw className="animate-spin text-[var(--primary-color)]" size={48} />
           <span className="font-black text-xs uppercase tracking-widest opacity-50">Sincronizando Inventario...</span>
        </div>
      ) : (
        <div className="max-w-7xl mx-auto grid grid-cols-1 lg:grid-cols-12 gap-8">
          
          {/* ────── LEFT COLUMN: GAUGES & INVENTORY LEVELS ────── */}
          <div className="lg:col-span-8 space-y-8">
            
            {/* 1. STOCK OVERVIEW (GAUGES) */}
            <div className="glass-card p-8 bg-gradient-to-br from-white/[0.05] to-transparent">
              <div className="flex justify-between items-center mb-10">
                <h2 className="text-sm font-black uppercase tracking-[0.2em] text-white/50">1. Stock Overview</h2>
                <span className="bg-rose-500/20 text-rose-500 text-[10px] font-black px-3 py-1 rounded-full uppercase">Running Low: Buns</span>
              </div>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-8">
                 <CircularGauge value={74} label="Big Mac Buns" color="#EB5757" />
                 <CircularGauge value={89} label="Cheese" color="#F2994A" />
                 <CircularGauge value={61} label="Beef Meat" color="#27AE60" />
                 <CircularGauge value={55} label="Fries" color="#FFC72C" />
              </div>
              <div className="flex justify-center gap-1.5 mt-8">
                <div className="w-1.5 h-1.5 rounded-full bg-white opacity-100"></div>
                <div className="w-1.5 h-1.5 rounded-full bg-white opacity-20"></div>
                <div className="w-1.5 h-1.5 rounded-full bg-white opacity-20"></div>
              </div>
            </div>

            {/* 2. INVENTORY LEVELS (THE LIST) */}
            <div className="glass-card p-4 sm:p-8">
              <div className="flex justify-between items-center mb-8">
                <h2 className="text-sm font-black uppercase tracking-[0.2em] text-white/50">Inventory Levels</h2>
                <button className="text-[10px] font-black uppercase tracking-widest flex items-center gap-2 opacity-50">Detailed List <Plus size={12} /></button>
              </div>

              {activeTab === 'insumos' && (
                <div className="space-y-4">
                  {insumos.map((ins, index) => {
                    const status = ins.currentStock < 5 ? 'Low' : (ins.currentStock < 15 ? 'Check' : 'Good');
                    const statusColor = status === 'Low' ? '#EB5757' : (status === 'Check' ? '#F2994A' : '#27AE60');
                    
                    return (
                      <div key={ins.id} className="bg-white/[0.03] border border-white/5 rounded-[22px] p-4 flex flex-col sm:flex-row items-center gap-6 group hover:bg-white/[0.05] transition-all">
                        <div className="w-16 h-16 bg-[#1A1F26] rounded-2xl flex items-center justify-center text-3xl shadow-inner">
                          {getProductIcon(ins.name)}
                        </div>
                        <div className="flex-1 text-center sm:text-left">
                          <h4 className="font-black text-lg leading-tight uppercase tracking-tight">{ins.name}</h4>
                          <span className="text-[var(--text-muted)] text-[10px] font-black uppercase tracking-widest">{ins.currentStock} {ins.unit}</span>
                        </div>
                        <div className="flex items-center gap-3">
                          <div className="flex items-center bg-white/5 rounded-full p-1 h-12 border border-white/5">
                            <button onClick={() => handleUpdateInsumoStock(ins.id, ins.currentStock - 1)} className="w-10 h-10 rounded-full hover:bg-white/10 flex items-center justify-center font-black">-</button>
                            <input 
                              type="number"
                              data-nav={`ins-v-${index}`}
                              defaultValue={ins.currentStock}
                              onBlur={(e) => handleUpdateInsumoStock(ins.id, e.target.value)}
                              className="w-12 bg-transparent text-center font-black text-lg focus:outline-none [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                            />
                            <button onClick={() => handleUpdateInsumoStock(ins.id, ins.currentStock + 1)} className="w-10 h-10 rounded-full hover:bg-white/10 flex items-center justify-center font-black">+</button>
                          </div>
                          <button onClick={() => handleUpdateInsumoStock(ins.id, document.querySelector(`input[data-nav="ins-v-${index}"]`).value)} className="bg-rose-600 hover:bg-rose-500 text-white h-12 px-6 rounded-full font-black text-xs uppercase tracking-widest shadow-lg shadow-rose-900/20">Save</button>
                          <div className="w-20 px-4 py-2 rounded-full text-center text-[10px] font-black uppercase tracking-widest" style={{ background: `${statusColor}20`, color: statusColor, border: `1px solid ${statusColor}40` }}>{status}</div>
                        </div>
                      </div>
                    );
                  })}
                  
                  {/* ADD NEW INSUMO INLINE GLASS STYLE */}
                  <form onSubmit={handleAddInsumo} className="bg-rose-600/10 border-2 border-dashed border-rose-600/30 rounded-[22px] p-8 flex flex-col sm:flex-row gap-4 items-center justify-center">
                    <input type="text" placeholder="New Item Name" value={newInsumo.name} onChange={e => setNewInsumo({...newInsumo, name: e.target.value})} className="bg-transparent border-b-2 border-white/10 p-2 font-black uppercase tracking-widest focus:border-rose-500 focus:outline-none w-full sm:w-64" />
                    <input type="text" placeholder="Unit" value={newInsumo.unit} onChange={e => setNewInsumo({...newInsumo, unit: e.target.value})} className="bg-transparent border-b-2 border-white/10 p-2 font-black uppercase tracking-widest focus:border-rose-500 focus:outline-none w-24" />
                    <button type="submit" className="bg-white text-black h-12 px-10 rounded-full font-black text-xs uppercase tracking-widest hover:scale-105 transition-transform">Add Insumo</button>
                  </form>
                </div>
              )}

              {activeTab === 'recipes' && (
                <div className="space-y-6">
                   <div className="flex gap-3 overflow-x-auto pb-4">
                     {allProducts.map(prod => (
                        <button 
                          key={prod.id} 
                          onClick={() => setSelectedProduct(prod.id)}
                          className={`px-6 py-3 rounded-2xl whitespace-nowrap font-black text-xs uppercase tracking-widest border transition-all ${selectedProduct === prod.id ? 'bg-[#FFC72C] text-black border-transparent scale-105' : 'bg-white/5 border-white/10 text-white/50'}`}
                        >
                          {prod.name}
                        </button>
                     ))}
                   </div>
                   <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      {insumos.map(ins => {
                        const currentVal = currentRecipe.find(r => r.insumoId === ins.id)?.quantity || '';
                        return (
                          <div key={ins.id} className="bg-white/[0.03] p-6 rounded-[22px] border border-white/5 flex items-center justify-between">
                            <div>
                               <h5 className="font-black uppercase tracking-wide text-white/80">{ins.name}</h5>
                               <span className="text-[10px] font-black text-zinc-500 uppercase">{ins.unit}</span>
                            </div>
                            <input 
                              type="number"
                              step="0.001"
                              value={currentVal}
                              placeholder="0"
                              onChange={e => handleRecipeChange(ins.id, e.target.value)}
                              className="w-20 bg-[#1A1F26] px-3 py-3 rounded-xl text-center font-black text-rose-500 focus:outline-none border border-white/5"
                            />
                          </div>
                        );
                      })}
                   </div>
                   <button onClick={handleSaveRecipe} className="w-full bg-[#27AE60] hover:bg-[#2ecc71] text-white py-5 rounded-[22px] font-black uppercase tracking-widest shadow-xl shadow-emerald-900/20 flex items-center justify-center gap-3">
                     <Save size={20} /> Guardar Receta Maestro
                   </button>
                </div>
              )}
              {activeTab === 'audit' && (
                <div className="space-y-6">
                  <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-4">
                    <div>
                      <h3 className="text-xl font-black uppercase tracking-tight">Audit Physical Stock</h3>
                      <p className="text-[var(--text-muted)] text-[10px] font-black uppercase tracking-widest">Enter the actual count to reconcile inventory</p>
                    </div>
                    <button onClick={handleReconcile} className="bg-[#FFC72C] text-black px-8 py-4 rounded-2xl font-black text-xs uppercase tracking-widest hover:scale-105 transition-transform shadow-lg shadow-amber-900/20 flex items-center gap-2">
                       <Check size={18} /> Finalizar Auditoría
                    </button>
                  </div>

                  <div className="grid grid-cols-1 gap-3">
                    {insumos.map((ins, index) => {
                      const fisico = parseFloat(auditCounts[ins.id] ?? ins.currentStock) || 0;
                      const diff = fisico - parseFloat(ins.currentStock);
                      const isMerma = diff < 0;
                      const statusColor = isMerma ? '#EB5757' : (diff > 0 ? '#27AE60' : 'rgba(255,255,255,0.2)');

                      return (
                        <div key={ins.id} className="bg-white/[0.03] p-5 rounded-[22px] border border-white/5 flex flex-col sm:flex-row items-center gap-6">
                          <div className="flex-1">
                             <h4 className="font-black uppercase tracking-tighter text-lg">{ins.name}</h4>
                             <span className="text-[10px] font-black text-zinc-500 uppercase tracking-widest">System: {ins.currentStock} {ins.unit}</span>
                          </div>
                          
                          <div className="flex items-center gap-6">
                            <div className="flex flex-col items-center">
                              <span className="text-[9px] font-black uppercase text-zinc-600 mb-1">Physical Count</span>
                              <input 
                                type="number" 
                                step="0.01"
                                data-nav={`audit-${index}`}
                                onKeyDown={(e) => handleKeyDown(e, index, 'audit')}
                                value={auditCounts[ins.id] ?? ins.currentStock}
                                onChange={e => setAuditCounts({...auditCounts, [ins.id]: e.target.value})}
                                className="w-24 bg-white/5 border border-white/10 rounded-xl p-3 text-center font-black text-lg focus:border-[#FFC72C] focus:outline-none"
                               />
                            </div>

                            <div className="w-32 text-right">
                               <span className="text-[9px] font-black uppercase text-zinc-600 mb-1 block">Difference</span>
                               <span className="font-black text-lg" style={{ color: statusColor }}>
                                 {diff > 0 ? '+' : ''}{diff.toFixed(2)} {ins.unit}
                               </span>
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* ────── RIGHT COLUMN: QUICK ACTIONS & SHIPMENTS ────── */}
          <div className="lg:col-span-4 space-y-8">
            
            {/* QUICK ACTIONS */}
            <div className="glass-card p-8 space-y-4">
              <h2 className="text-sm font-black uppercase tracking-[0.2em] text-white/50 mb-4">Quick Actions</h2>
              <button className="w-full bg-[#DA291C] h-16 rounded-2xl font-black uppercase tracking-[0.15em] text-sm hover:brightness-110 active:scale-95 transition-all shadow-lg shadow-rose-900/30">Receive Shipment</button>
              <button className="w-full bg-[#FFC72C] h-16 rounded-2xl font-black uppercase tracking-[0.15em] text-sm text-black hover:brightness-110 active:scale-95 transition-all shadow-lg shadow-amber-900/20" onClick={() => setActiveTab('audit')}>Restock Items</button>
              <button className="w-full bg-white h-16 rounded-2xl font-black uppercase tracking-[0.15em] text-sm text-black hover:brightness-90 active:scale-95 transition-all">Update Count</button>
              <button className="w-full bg-[#DA291C]/20 border border-rose-500/30 h-16 rounded-2xl font-black uppercase tracking-[0.15em] text-sm text-rose-500 hover:bg-rose-500/10 active:scale-95 transition-all">Track Waste</button>
            </div>

            {/* INCOMING SHIPMENTS */}
            <div className="glass-card p-8">
              <h2 className="text-sm font-black uppercase tracking-[0.2em] text-white/50 mb-8">Incoming Shipments</h2>
              <div className="space-y-4">
                {[
                  { id: '0201', supplier: 'DA291C', date: 'Tomorrow, 9 AM' },
                  { id: '0202', supplier: 'Supplier', date: 'Tomorrow, 9 AM' },
                  { id: '0203', supplier: 'DA291C', date: 'Tomorrow, 9 AM' }
                ].map((ship, i) => (
                  <div key={i} className="bg-white/5 rounded-[22px] p-5 border border-white/5">
                    <div className="flex justify-between items-start mb-2">
                       <span className="text-[10px] font-black text-white/20 tracking-widest">{ship.id}</span>
                       <button className="text-[9px] font-black uppercase bg-white/10 px-2 py-1 rounded-md tracking-widest">View Detail</button>
                    </div>
                    <h4 className="font-black text-sm uppercase mb-1">{ship.supplier}</h4>
                    <span className="text-[10px] font-black text-zinc-500 uppercase tracking-widest">{ship.date}</span>
                  </div>
                ))}
              </div>
            </div>

          </div>

        </div>
      )}

      {/* FOOTER LEGEND */}
      <div className="max-w-7xl mx-auto mt-20 text-center border-t border-white/5 pt-10">
        <span className="text-[10px] font-black text-zinc-600 uppercase tracking-[0.5em] hover:text-[var(--primary-color)] transition-colors cursor-default">
          fernando es putito
        </span>
      </div>

    </div>
  );
};

export default InventoryBOMView;
