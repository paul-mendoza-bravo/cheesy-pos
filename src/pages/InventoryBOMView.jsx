import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { mockProducts, MODIFIERS } from '../data/mockProducts';
import { Save, Beef, Check, Package, RefreshCw, AlertCircle, Search, Activity, Box, Database, Zap } from 'lucide-react';

const HOST_URL = import.meta.env.VITE_API_URL || `http://${window.location.hostname}:3001`;
const API_URL = `${HOST_URL}/api`;

const allProducts = [
  ...mockProducts,
  ...Object.values(MODIFIERS)
];

const InventoryBOMView = () => {
  const navigate = useNavigate();
  const { currentUser } = useAuth();
  const [activeTab, setActiveTab] = useState('insumos');

  const [insumos, setInsumos] = useState([]);
  const [recipes, setRecipes] = useState([]);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);

  // States
  const [newInsumo, setNewInsumo] = useState({ name: '', unit: '', currentStock: 0 });
  const [selectedProduct, setSelectedProduct] = useState(allProducts[0]?.id || '');
  const [currentRecipe, setCurrentRecipe] = useState([]);
  const [auditCounts, setAuditCounts] = useState({});
  const [searchQuery, setSearchQuery] = useState('');
  const [modifiedStock, setModifiedStock] = useState({});

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

  const handleUpdateInsumoStock = (id, currentStock) => {
    let val = currentStock === '' ? '' : parseFloat(currentStock);
    if (val !== '' && val < 0) val = 0;
    setInsumos(prev => prev.map(ins => ins.id === id ? { ...ins, currentStock: val } : ins));
    if (val !== '') {
       setModifiedStock(prev => ({ ...prev, [id]: val }));
    }
  };

  const handleSaveAllStock = async () => {
    const idsToUpdate = Object.keys(modifiedStock);
    if (idsToUpdate.length === 0) return;
    setSaving(true);
    try {
      const promises = idsToUpdate.map(async (id) => {
        const target = insumos.find(i => i.id === parseInt(id));
        if (!target) return;
        return fetch(`${API_URL}/insumos/${id}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ ...target, currentStock: modifiedStock[id] })
        });
      });
      await Promise.all(promises);
      setModifiedStock({});
      await fetchData();
    } catch (err) {
      console.error(err);
    } finally {
      setSaving(false);
    }
  };

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

  const handleReconcile = async () => {
    if (!window.confirm('¿Seguro que deseas procesar la auditoría? Esto actualizará las existencias en el sistema.')) return;
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


  if (!currentUser?.role?.includes('admin')) {
    return (
      <div className="flex flex-col items-center justify-center h-screen bg-zinc-900 text-white">
        <AlertCircle size={48} className="text-rose-500 mb-4" />
        <h2 className="text-2xl font-bold">Acceso Denegado</h2>
      </div>
    );
  }

  const filteredInsumos = insumos.filter(ins => ins.name.toLowerCase().includes(searchQuery.toLowerCase()));

  return (
    <div className="min-h-screen bg-[#0E1218] text-zinc-100 font-sans tracking-tight pb-20 selection:bg-rose-500/30 overflow-x-hidden">
      
      {/* ── BACKGROUND GLOWS ── */}
      <div className="fixed top-0 left-1/4 w-96 h-96 bg-rose-600/10 rounded-full blur-[120px] pointer-events-none"></div>
      <div className="fixed bottom-0 right-1/4 w-[500px] h-[500px] bg-amber-500/10 rounded-full blur-[150px] pointer-events-none"></div>

      {/* ── TOP NAVIGATION ── */}
      <nav className="sticky top-0 z-50 bg-[#0E1218]/80 backdrop-blur-3xl border-b border-white/5 pt-safe mb-8 supports-[backdrop-filter]:bg-[#0E1218]/60">
        <div className="max-w-7xl mx-auto px-6 py-4 flex flex-col md:flex-row justify-between items-center gap-6">
          <div className="flex items-center gap-4">
             <button 
               onClick={() => navigate('/admin')} 
               className="w-14 h-14 bg-gradient-to-tr from-rose-600 to-rose-500 rounded-2xl flex items-center justify-center shadow-lg shadow-rose-900/40 hover:scale-105 active:scale-95 transition-all group shrink-0"
             >
               <Beef size={28} className="text-white group-hover:-rotate-12 transition-transform" />
             </button>
             <div>
               <h1 className="text-xl md:text-3xl font-black text-white uppercase tracking-tighter loading-none">
                 Intelligence V2
               </h1>
               <div className="flex items-center gap-2 mt-1">
                 <div className="w-2 h-2 rounded-full bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.8)] animate-pulse"></div>
                 <span className="text-[10px] sm:text-[11px] font-black text-zinc-400 uppercase tracking-[0.2em] whitespace-nowrap">CORE Sincronizado</span>
               </div>
             </div>
          </div>

          <div className="bg-black/40 p-1.5 rounded-full flex gap-0 sm:gap-1 border border-white/5 backdrop-blur-xl shrink-0">
             {[
               { id: 'insumos', label: 'Cámaras', icon: <Box size={16}/> },
               { id: 'recipes', label: 'BOM', icon: <Database size={16}/> },
               { id: 'audit', label: 'Auditoría', icon: <Check size={16}/> }
             ].map(tab => (
               <button 
                 key={tab.id}
                 onClick={() => setActiveTab(tab.id)}
                 className={`flex items-center gap-2 px-4 sm:px-6 py-3 rounded-full text-[10px] sm:text-xs font-black uppercase tracking-wider transition-all duration-300 ${
                    activeTab === tab.id 
                    ? 'bg-white text-black shadow-lg scale-100' 
                    : 'text-zinc-400 hover:bg-white/10 hover:text-white'
                 }`}
               >
                 {tab.icon}
                 <span className="hidden sm:inline">{tab.label}</span>
               </button>
             ))}
          </div>
        </div>
      </nav>

      {/* ── MAIN LAYOUT ── */}
      <main className="max-w-7xl mx-auto px-6 relative z-10">
        
        {loading ? (
          <div className="flex flex-col items-center justify-center py-32 gap-6">
             <Activity className="animate-pulse text-amber-500" size={64} />
             <span className="font-black text-xs uppercase tracking-[0.4em] text-zinc-500">Calculando Existencias...</span>
          </div>
        ) : (
          <div className="grid grid-cols-1 xl:grid-cols-12 gap-8">
            
            {/* ────── CENTER CANVAS (FULL WIDTH) ────── */}
            <div className="xl:col-span-12 flex flex-col gap-8">

              {/* MAIN CONTENT AREA */}
              <div className="bg-white/[0.02] border border-white/5 rounded-[32px] p-6 lg:p-10 backdrop-blur-3xl shadow-2xl relative overflow-hidden">
                <div className="absolute top-0 right-0 p-10 opacity-[0.02] pointer-events-none">
                   <Database size={200} />
                </div>

                <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-10 gap-6 relative z-10">
                  <div>
                    <h2 className="text-2xl md:text-3xl font-black uppercase tracking-tight text-white mb-2">
                       {activeTab === 'insumos' ? 'Gestión de Stock' : activeTab === 'recipes' ? 'Arquitectura BOM' : 'Arqueo Físico'}
                    </h2>
                    <p className="text-zinc-400 text-xs font-bold uppercase tracking-widest">
                       {activeTab === 'insumos' ? 'Control de cajas y mililitros' : activeTab === 'recipes' ? 'Costo y Gramaje por platillo' : 'Conciliación de inventario'}
                    </p>
                  </div>

                  {activeTab === 'insumos' && (
                    <div className="flex flex-col md:flex-row items-center gap-4 w-full md:w-auto">
                      {Object.keys(modifiedStock).length > 0 && (
                        <button onClick={handleSaveAllStock} disabled={saving} className="w-full md:w-auto bg-emerald-500 hover:bg-emerald-400 text-black px-6 py-3 rounded-full font-black text-[10px] sm:text-xs uppercase tracking-widest transition-transform active:scale-95 shadow-lg shadow-emerald-900/40 flex items-center justify-center gap-2 animate-bounce">
                          <Save size={16} /> {saving ? 'Guardando...' : 'Aplicar Cambios'}
                        </button>
                      )}
                      <div className="relative w-full md:w-64 shrink-0">
                        <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-zinc-500" size={18} />
                        <input 
                          type="text" 
                          placeholder="Buscar..." 
                          value={searchQuery}
                          onChange={(e) => setSearchQuery(e.target.value)}
                          className="w-full bg-black/40 border border-white/10 rounded-full h-12 pl-12 pr-6 text-sm font-bold text-white placeholder-zinc-600 focus:outline-none focus:border-rose-500 focus:ring-1 focus:ring-rose-500 transition-all" 
                        />
                      </div>
                    </div>
                  )}
                </div>

                {/* ── INSUMOS TAB ── */}
                {activeTab === 'insumos' && (
                  <div className="grid grid-cols-1 gap-4">
                    {filteredInsumos.map((ins, idx) => {
                      const isLow = ins.currentStock < 10;
                      return (
                        <div key={ins.id} className={`group bg-white/[0.03] border ${isLow ? 'border-rose-500/30 bg-rose-500/5' : 'border-white/5'} rounded-3xl p-5 flex flex-col sm:flex-row items-start sm:items-center justify-between hover:bg-white/[0.06] transition-all gap-4`}>
                          <div className="flex items-center gap-4">
                            <div className={`w-14 h-14 rounded-2xl flex items-center justify-center text-2xl shadow-inner shrink-0 ${isLow ? 'bg-rose-500/20 text-rose-500' : 'bg-black/30'}`}>
                              {getProductIcon(ins.name)}
                            </div>
                            <div>
                              <h4 className="font-black text-lg uppercase tracking-tight leading-none mb-1 text-white">{ins.name}</h4>
                              <div className="flex items-center gap-2">
                                <span className={`w-2 h-2 rounded-full ${isLow ? 'bg-rose-500 animate-pulse' : 'bg-emerald-500'}`}></span>
                                <span className="text-zinc-500 text-[10px] font-black uppercase tracking-[0.15em]">{isLow ? 'Crítico' : 'Suficiente'}</span>
                                <span className="text-zinc-600 text-[10px] uppercase font-bold">•</span>
                                <span className="text-zinc-400 text-[10px] font-bold uppercase tracking-[0.1em]">{ins.unit}</span>
                              </div>
                            </div>
                          </div>
                          
                          <div className="flex items-center bg-black/50 rounded-full p-1 border border-white/10 self-start sm:self-auto w-full sm:w-auto">
                            <button onClick={() => handleUpdateInsumoStock(ins.id, ins.currentStock - 1)} className="w-12 h-10 sm:w-10 rounded-full hover:bg-white/10 flex items-center justify-center font-black text-rose-400 transition-colors">-</button>
                            <input 
                              type="number"
                              value={ins.currentStock}
                              onChange={(e) => handleUpdateInsumoStock(ins.id, e.target.value)}
                              className="w-full sm:w-16 bg-transparent text-center font-black text-xl focus:outline-none [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none text-white"
                            />
                            <button onClick={() => handleUpdateInsumoStock(ins.id, ins.currentStock + 1)} className="w-12 h-10 sm:w-10 rounded-full hover:bg-white/10 flex items-center justify-center font-black text-emerald-400 transition-colors">+</button>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}

                {/* ── RECIPES TAB ── */}
                {activeTab === 'recipes' && (
                   <div className="space-y-8">
                     <div className="flex gap-3 overflow-x-auto pb-4 scrollbar-hide snap-x">
                       {allProducts.map(prod => (
                          <button 
                            key={prod.id} 
                            onClick={() => setSelectedProduct(prod.id)}
                            className={`snap-start px-8 py-4 rounded-full whitespace-nowrap font-black text-xs uppercase tracking-widest transition-all duration-300 ${
                              selectedProduct === prod.id 
                              ? 'bg-amber-400 text-black shadow-lg shadow-amber-500/20 scale-105' 
                              : 'bg-white/5 border border-white/10 text-zinc-400 hover:text-white'
                            }`}
                          >
                            {prod.name}
                          </button>
                       ))}
                     </div>

                     <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        {insumos.map(ins => {
                          const currentVal = currentRecipe.find(r => r.insumoId === ins.id)?.quantity || '';
                          const isActive = currentVal !== '' && currentVal > 0;
                          
                          return (
                            <div key={ins.id} className={`p-5 rounded-3xl border transition-colors flex justify-between items-center ${isActive ? 'bg-amber-400/10 border-amber-400/30' : 'bg-black/20 border-white/5'}`}>
                              <div>
                                 <h5 className={`font-black uppercase tracking-tight text-sm mb-1 ${isActive ? 'text-amber-400' : 'text-zinc-300'}`}>{ins.name}</h5>
                                 <span className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest">{ins.unit} requeridos</span>
                              </div>
                              <input 
                                type="number"
                                step="0.01"
                                value={currentVal}
                                placeholder="0.0"
                                onChange={e => handleRecipeChange(ins.id, e.target.value)}
                                className={`w-20 sm:w-24 px-3 py-3 rounded-xl text-center font-black focus:outline-none text-base transition-colors ${
                                  isActive ? 'bg-amber-400 text-black' : 'bg-black/50 text-white border border-white/10 focus:border-amber-400'
                                }`}
                              />
                            </div>
                          );
                        })}
                     </div>

                     <button onClick={handleSaveRecipe} className="w-full mt-6 bg-amber-400 hover:bg-amber-300 text-black py-5 rounded-full font-black uppercase tracking-[0.2em] shadow-xl shadow-amber-500/20 flex items-center justify-center gap-3 transition-transform active:scale-95 text-xs sm:text-sm">
                       <Database size={20} /> Actualizar Matriz
                     </button>
                  </div>
                )}

                {/* ── AUDITORIA TAB ── */}
                {activeTab === 'audit' && (
                  <div className="space-y-6">
                     <div className="bg-rose-500/10 border border-rose-500/20 rounded-3xl p-6 flex flex-col md:flex-row items-center justify-between gap-6">
                        <div>
                          <h4 className="text-xl font-black text-rose-500 uppercase tracking-tight mb-2">Zona de Riesgo</h4>
                          <p className="text-rose-400/80 text-xs font-bold leading-relaxed max-w-md">
                            La conciliación actualizará de forma destructiva las cantidades en la base de datos central.
                          </p>
                        </div>
                        <button onClick={handleReconcile} className="w-full md:w-auto bg-rose-600 hover:bg-rose-500 text-white px-10 py-4 rounded-full font-black text-xs uppercase tracking-widest transition-transform active:scale-95 shadow-lg shadow-rose-900/50 flex items-center justify-center gap-3 shrink-0">
                           <Zap size={18} /> Conciliación
                        </button>
                     </div>

                     <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-8">
                        {insumos.map((ins) => {
                          const fisico = parseFloat(auditCounts[ins.id] ?? ins.currentStock) || 0;
                          const diff = fisico - parseFloat(ins.currentStock);
                          const isMerma = diff < 0;
                          
                          return (
                            <div key={ins.id} className="bg-black/30 p-5 rounded-3xl border border-white/5 flex gap-4 items-center justify-between flex-wrap">
                              <div className="flex-1 w-full sm:w-auto">
                                 <h4 className="font-black uppercase tracking-tight text-white mb-1 text-sm">{ins.name}</h4>
                                 <span className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest">Sistema: {ins.currentStock} {ins.unit}</span>
                              </div>
                              <div className="flex items-center gap-4 w-full sm:w-auto justify-between">
                                <div className="text-right">
                                   <span className="text-[9px] font-black text-zinc-600 uppercase tracking-widest block mb-1">Varianza</span>
                                   <span className={`font-black text-lg tabular-nums ${isMerma ? 'text-rose-500' : (diff > 0 ? 'text-emerald-500' : 'text-zinc-600')}`}>
                                     {diff > 0 ? '+' : ''}{diff.toFixed(1)}
                                   </span>
                                </div>
                                <input 
                                  type="number" 
                                  step="0.1"
                                  value={auditCounts[ins.id] ?? ins.currentStock}
                                  onChange={e => setAuditCounts({...auditCounts, [ins.id]: e.target.value})}
                                  className="w-24 bg-white/5 border border-white/10 rounded-xl p-3 text-center font-black text-lg text-white focus:border-rose-500 focus:outline-none transition-colors"
                                 />
                              </div>
                            </div>
                          );
                        })}
                     </div>
                  </div>
                )}
              </div>
            </div>


          </div>
        )}
      </main>

      <footer className="max-w-7xl mx-auto px-6 mt-20 pt-10 border-t border-white/5 text-center">
        <p className="text-[10px] font-black uppercase tracking-[0.5em] text-zinc-600">
          Cheeseburgers OS • Advanced Logistics
        </p>
      </footer>

    </div>
  );
};

export default InventoryBOMView;
