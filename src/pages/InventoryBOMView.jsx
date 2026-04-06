import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { mockProducts, MODIFIERS } from '../data/mockProducts';
import { ArrowLeft, Save, Plus, Check, Package, Search, Activity, Box, Database, FileText, ChevronRight, AlertCircle } from 'lucide-react';

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
    if (!window.confirm('¿Confirmar conciliación física? Los datos centrales se sobrescribirán con tus entradas actuales.')) return;
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
        alert('Conciliación aplicada con éxito.');
        await fetchData();
        setActiveTab('insumos');
      }
    } catch (err) {
      console.error(err);
    } finally {
      setSaving(false);
    }
  };

  // Modern Minimal gauge implementation without SVG complexity just a clean line indicator
  const LineGauge = ({ value, label, total = 100 }) => {
    const percentage = Math.min((value / total) * 100, 100);
    const colorClass = percentage < 25 ? 'bg-red-500' : percentage < 50 ? 'bg-yellow-500' : 'bg-emerald-500';
    
    return (
      <div className="flex flex-col gap-2 p-5 bg-white border border-zinc-100 rounded-2xl shadow-sm hover:shadow-md transition-shadow">
        <div className="flex justify-between items-baseline mb-1">
          <span className="text-sm font-medium text-zinc-600">{label}</span>
          <span className="text-xl font-bold text-zinc-900">{value}%</span>
        </div>
        <div className="w-full h-1.5 bg-zinc-100 rounded-full overflow-hidden">
          <div className={`h-full rounded-full transition-all duration-700 ${colorClass}`} style={{ width: `${percentage}%` }}></div>
        </div>
      </div>
    );
  };

  if (!currentUser?.role?.includes('admin')) {
    return (
      <div className="flex items-center justify-center h-screen bg-zinc-50">
        <div className="text-center">
           <AlertCircle className="mx-auto text-red-500 mb-4" size={40} />
           <h2 className="text-xl font-semibold text-zinc-800">Acceso Restringido</h2>
           <p className="text-sm text-zinc-500 mt-2">Permisos insuficientes para ver este módulo.</p>
        </div>
      </div>
    );
  }

  const filteredInsumos = insumos.filter(ins => ins.name.toLowerCase().includes(searchQuery.toLowerCase()));

  return (
    <div className="min-h-screen bg-zinc-50/50 text-zinc-900 font-sans selection:bg-zinc-200 pb-24">
      
      {/* ── MINIMAL TOP NAVBAR ── */}
      <header className="sticky top-0 z-40 bg-white/80 backdrop-blur-md border-b border-zinc-200/80">
        <div className="max-w-6xl mx-auto px-6 h-20 flex items-center justify-between">
          <div className="flex items-center gap-4">
             <button 
               onClick={() => navigate('/admin')} 
               className="p-2.5 text-zinc-400 hover:text-zinc-900 hover:bg-zinc-100 rounded-xl transition-colors"
             >
               <ArrowLeft size={20} />
             </button>
             <div>
               <h1 className="text-xl font-semibold tracking-tight text-zinc-900 hidden sm:block">Control de Inventario</h1>
               <h1 className="text-xl font-semibold tracking-tight text-zinc-900 sm:hidden">Inventario</h1>
             </div>
          </div>

          <div className="flex items-center gap-1 bg-zinc-100/80 p-1.5 rounded-xl border border-zinc-200/50">
             {[
               { id: 'insumos', label: 'Stock', icon: <Box size={15}/> },
               { id: 'recipes', label: 'Recetas', icon: <Database size={15}/> },
               { id: 'audit', label: 'Auditoría', icon: <FileText size={15}/> }
             ].map(tab => (
               <button 
                 key={tab.id}
                 onClick={() => setActiveTab(tab.id)}
                 className={`flex items-center gap-2 px-5 py-2 rounded-lg text-sm font-medium transition-all ${
                    activeTab === tab.id 
                    ? 'bg-white text-zinc-900 shadow-sm border border-zinc-200' 
                    : 'text-zinc-500 hover:text-zinc-900 hover:bg-zinc-200/50 border border-transparent'
                 }`}
               >
                 {tab.icon}
                 <span className="hidden md:inline">{tab.label}</span>
               </button>
             ))}
          </div>
        </div>
      </header>

      {/* ── MAIN CONTENT ── */}
      <main className="max-w-6xl mx-auto px-6 pt-10">
        
        {loading ? (
          <div className="flex flex-col items-center justify-center py-40 gap-4">
             <Activity className="animate-spin text-zinc-400" size={32} />
             <span className="text-sm font-medium text-zinc-500 tracking-wide">Cargando datos...</span>
          </div>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
            
            {/* ────── CENTER AREA (SPAN 8) ────── */}
            <div className="lg:col-span-8 flex flex-col gap-8">
              
              {/* TOP KPIS (Only on INSUMOS) */}
              {activeTab === 'insumos' && (
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                  <LineGauge value={74} label="Panes" />
                  <LineGauge value={89} label="Quesos" />
                  <LineGauge value={12} label="Carne" />
                  <LineGauge value={55} label="Papas" />
                </div>
              )}

              {/* LIST / WORKSPACE CONTAINER */}
              <div className="bg-white border border-zinc-200/80 rounded-2xl shadow-sm">
                
                {/* Header of Workspace */}
                <div className="p-6 md:p-8 border-b border-zinc-100 flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                  <div>
                    <h2 className="text-lg font-semibold text-zinc-900 tracking-tight">
                       {activeTab === 'insumos' ? 'Gestión de Almacén' : activeTab === 'recipes' ? 'Estructura de Costos y Recetas' : 'Revisión Física'}
                    </h2>
                    <p className="text-sm text-zinc-500 mt-1">
                       {activeTab === 'insumos' ? 'Actualiza inventarios en tiempo real.' : activeTab === 'recipes' ? 'Modifica BOM (Bill of Materials).' : 'Registra diferencias para cuadrar el sistema.'}
                    </p>
                  </div>

                  {activeTab === 'insumos' && (
                    <div className="relative w-full md:w-64">
                      <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 text-zinc-400" size={16} />
                      <input 
                        type="text" 
                        placeholder="Buscar artículo..." 
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        className="w-full bg-zinc-50 border border-zinc-200 rounded-xl h-11 pl-10 pr-4 text-sm focus:bg-white focus:outline-none focus:ring-2 focus:ring-black/5 transition-all text-zinc-800" 
                      />
                    </div>
                  )}
                </div>

                {/* Body of Workspace */}
                <div className="p-6 md:p-8">

                  {/* ── INSUMOS TAB ── */}
                  {activeTab === 'insumos' && (
                    <div className="grid grid-cols-1 gap-3">
                      {filteredInsumos.map((ins) => {
                        const isLow = ins.currentStock < 10;
                        return (
                          <div key={ins.id} className={`group bg-white border ${isLow ? 'border-red-200 bg-red-50/30' : 'border-zinc-200/60'} rounded-xl p-4 flex items-center justify-between hover:border-zinc-300 transition-colors`}>
                            <div className="flex items-center gap-4">
                              <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${isLow ? 'bg-red-100 text-red-600' : 'bg-zinc-100 text-zinc-600'}`}>
                                <Package size={18} />
                              </div>
                              <div>
                                <h4 className="font-medium text-zinc-900 text-base">{ins.name}</h4>
                                <span className="text-xs text-zinc-500">{ins.unit}</span>
                              </div>
                            </div>
                            
                            <div className="flex items-center gap-1 bg-zinc-50 rounded-lg p-1 border border-zinc-200/60">
                              <button onClick={() => handleUpdateInsumoStock(ins.id, ins.currentStock - 1)} className="w-8 h-8 rounded-md hover:bg-white hover:shadow-sm flex items-center justify-center text-zinc-600 transition-all">-</button>
                              <input 
                                type="number"
                                value={ins.currentStock}
                                onChange={(e) => handleUpdateInsumoStock(ins.id, e.target.value)}
                                className="w-16 bg-transparent text-center font-medium text-base focus:outline-none [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none text-zinc-900"
                              />
                              <button onClick={() => handleUpdateInsumoStock(ins.id, ins.currentStock + 1)} className="w-8 h-8 rounded-md hover:bg-white hover:shadow-sm flex items-center justify-center text-zinc-600 transition-all">+</button>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}

                  {/* ── RECIPES TAB ── */}
                  {activeTab === 'recipes' && (
                    <div className="space-y-8">
                       <div className="flex flex-wrap gap-2">
                         {allProducts.map(prod => (
                            <button 
                              key={prod.id} 
                              onClick={() => setSelectedProduct(prod.id)}
                              className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${
                                selectedProduct === prod.id 
                                ? 'bg-zinc-900 text-white' 
                                : 'bg-white border border-zinc-200 text-zinc-600 hover:bg-zinc-50'
                              }`}
                            >
                              {prod.name}
                            </button>
                         ))}
                       </div>

                       <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                          {insumos.map(ins => {
                            const currentVal = currentRecipe.find(r => r.insumoId === ins.id)?.quantity || '';
                            const isActive = currentVal !== '' && currentVal > 0;
                            
                            return (
                              <div key={ins.id} className={`p-4 rounded-xl border transition-colors flex justify-between items-center ${isActive ? 'border-zinc-300 bg-zinc-50' : 'border-zinc-100 bg-white'}`}>
                                <div>
                                   <h5 className="font-medium text-sm text-zinc-900">{ins.name}</h5>
                                   <span className="text-xs text-zinc-500">{ins.unit} requeridos</span>
                                </div>
                                <input 
                                  type="number"
                                  step="0.01"
                                  value={currentVal}
                                  placeholder="0"
                                  onChange={e => handleRecipeChange(ins.id, e.target.value)}
                                  className="w-20 px-3 py-2 bg-white border border-zinc-200 rounded-lg text-center text-sm font-medium focus:ring-2 focus:ring-zinc-900 focus:outline-none transition-shadow text-zinc-900"
                                />
                              </div>
                            );
                          })}
                       </div>

                       <div className="pt-4 flex justify-end">
                         <button onClick={handleSaveRecipe} className="bg-zinc-900 hover:bg-zinc-800 text-white px-6 py-3 rounded-xl text-sm font-medium transition-colors flex items-center gap-2">
                           <Save size={16} /> Guardar Receta
                         </button>
                       </div>
                    </div>
                  )}

                  {/* ── AUDITORIA TAB ── */}
                  {activeTab === 'audit' && (
                    <div className="space-y-6">
                       <div className="bg-yellow-50 border border-yellow-200 rounded-xl p-5 flex flex-col sm:flex-row items-center justify-between gap-4">
                          <div className="flex gap-4 items-start">
                            <AlertCircle className="text-yellow-600 shrink-0 mt-0.5" size={20} />
                            <div>
                              <h4 className="text-sm font-semibold text-yellow-800 mb-1">Advertencia de Modificación</h4>
                              <p className="text-sm text-yellow-700/80">Esta acción sobrescribirá las existencias actuales de forma permanente.</p>
                            </div>
                          </div>
                          <button onClick={handleReconcile} className="w-full sm:w-auto bg-yellow-400 hover:bg-yellow-500 text-yellow-900 px-6 py-2.5 rounded-lg text-sm font-medium transition-colors whitespace-nowrap">
                             Aplicar Conciliación
                          </button>
                       </div>

                       <div className="grid grid-cols-1 gap-3">
                          {insumos.map((ins) => {
                            const fisico = parseFloat(auditCounts[ins.id] ?? ins.currentStock) || 0;
                            const diff = fisico - parseFloat(ins.currentStock);
                            const isMerma = diff < 0;
                            
                            return (
                              <div key={ins.id} className="bg-white p-4 rounded-xl border border-zinc-200 flex flex-wrap gap-4 items-center justify-between hover:border-zinc-300 transition-colors">
                                <div className="flex-1 min-w-[120px]">
                                   <h4 className="font-medium text-zinc-900 text-sm">{ins.name}</h4>
                                   <span className="text-xs text-zinc-500">Sistema: {ins.currentStock} {ins.unit}</span>
                                </div>
                                
                                <div className="flex items-center gap-6">
                                  <div className="text-right flex flex-col">
                                     <span className="text-[10px] uppercase font-semibold tracking-wider text-zinc-400 mb-0.5">Dif.</span>
                                     <span className={`font-semibold text-sm ${isMerma ? 'text-red-500' : (diff > 0 ? 'text-emerald-500' : 'text-zinc-400')}`}>
                                       {diff > 0 ? '+' : ''}{diff.toFixed(1)}
                                     </span>
                                  </div>
                                  <div className="flex items-center gap-2">
                                     <span className="text-[10px] uppercase font-semibold tracking-wider text-zinc-400">Real ({ins.unit})</span>
                                     <input 
                                       type="number" 
                                       step="0.1"
                                       value={auditCounts[ins.id] ?? ins.currentStock}
                                       onChange={e => setAuditCounts({...auditCounts, [ins.id]: e.target.value})}
                                       className="w-20 bg-zinc-50 border border-zinc-200 focus:bg-white rounded-lg p-2 text-center text-sm font-semibold text-zinc-900 focus:ring-2 focus:ring-zinc-900 focus:outline-none transition-all"
                                      />
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
            </div>

            {/* ────── RIGHT SIDEBAR (SPAN 4) ────── */}
            <div className="lg:col-span-4 flex flex-col gap-6">
              
              {/* QUICK ADD WIDGET */}
              <div className="bg-white border border-zinc-200/80 rounded-2xl p-6 shadow-sm">
                <h3 className="text-sm font-semibold text-zinc-900 mb-5 flex items-center gap-2">
                  <Box size={16} className="text-zinc-400" />
                  Nuevo Artículo
                </h3>
                
                <form onSubmit={handleAddInsumo} className="space-y-4">
                   <div>
                     <label className="text-xs font-semibold text-zinc-500 mb-1.5 block">Nombre</label>
                     <input 
                       type="text" 
                       placeholder="Salsa BBQ" 
                       value={newInsumo.name} 
                       onChange={e => setNewInsumo({...newInsumo, name: e.target.value})} 
                       className="w-full bg-zinc-50 border border-zinc-200 rounded-xl p-3 text-sm text-zinc-900 focus:bg-white focus:outline-none focus:ring-2 focus:ring-zinc-900 transition-all" 
                       required 
                     />
                   </div>
                   <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className="text-xs font-semibold text-zinc-500 mb-1.5 block">Unidad</label>
                        <input 
                          type="text" 
                          placeholder="Kg, Pza" 
                          value={newInsumo.unit} 
                          onChange={e => setNewInsumo({...newInsumo, unit: e.target.value})} 
                          className="w-full bg-zinc-50 border border-zinc-200 rounded-xl p-3 text-sm text-zinc-900 focus:bg-white focus:outline-none focus:ring-2 focus:ring-zinc-900 transition-all" 
                          required 
                        />
                      </div>
                      <div>
                        <label className="text-xs font-semibold text-zinc-500 mb-1.5 block">Stock Incial</label>
                        <input 
                          type="number" 
                          step="0.1" 
                          value={newInsumo.currentStock} 
                          onChange={e => setNewInsumo({...newInsumo, currentStock: e.target.value})} 
                          className="w-full bg-zinc-50 border border-zinc-200 rounded-xl p-3 text-sm text-zinc-900 focus:bg-white focus:outline-none focus:ring-2 focus:ring-zinc-900 transition-all" 
                        />
                      </div>
                   </div>
                   <button 
                     type="submit" 
                     disabled={saving} 
                     className="w-full mt-2 bg-zinc-900 text-white py-3 rounded-xl text-sm font-medium hover:bg-zinc-800 transition-colors flex items-center justify-center gap-2"
                   >
                     <Plus size={16} />
                     {saving ? 'Guardando...' : 'Crear Artículo'}
                   </button>
                </form>
              </div>

              {/* QUICK STATS WIDGET */}
              <div className="bg-zinc-900 rounded-2xl p-6 text-white shadow-md">
                 <h3 className="text-sm font-medium text-zinc-400 mb-4 flex items-center gap-2">
                    Estatus del Sistema
                 </h3>
                 <div className="space-y-4">
                    <div className="flex justify-between items-center border-b border-zinc-800 pb-3">
                       <span className="text-sm">Total de Componentes</span>
                       <span className="font-semibold">{insumos.length}</span>
                    </div>
                    <div className="flex justify-between items-center border-b border-zinc-800 pb-3">
                       <span className="text-sm">Recetas Configuradas</span>
                       <span className="font-semibold">{recipes.length}</span>
                    </div>
                    <div className="flex justify-between items-center">
                       <span className="text-sm">Sincronización</span>
                       <div className="flex items-center gap-2">
                          <span className="relative flex h-2 w-2">
                            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                            <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
                          </span>
                          <span className="text-emerald-400 text-sm font-medium">Activa</span>
                       </div>
                    </div>
                 </div>
              </div>

            </div>
          </div>
        )}
      </main>
    </div>
  );
};

export default InventoryBOMView;
