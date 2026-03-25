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
    <div className="pb-10">
      {/* ── Header ── */}
      <div className="flex items-center gap-4 mb-8">
        <button
          onClick={() => navigate('/admin')}
          className="p-2 rounded-xl bg-[var(--bg-container)] hover:opacity-80 text-[var(--text-muted)] transition-colors border border-[var(--border-color)]"
        >
          <ArrowLeft size={20} />
        </button>
        <div>
          <div className="flex items-center gap-2 text-violet-500 mb-1">
            <Beef size={24} />
            <h1 className="text-2xl font-bold text-[var(--text-main)] mb-0">Inventario Inteligente</h1>
          </div>
          <p className="text-[var(--text-muted)] text-sm m-0">Control de insumos, recetas y auditoría (BOM)</p>
        </div>
      </div>

      {/* ── Tabs ── */}
      <div className="flex gap-2 mb-6 border-b border-[var(--border-color)] pb-2">
        <button 
          className={`px-4 py-2 font-semibold text-sm rounded-t-lg transition-colors ${activeTab === 'insumos' ? 'text-violet-500 border-b-2 border-violet-500' : 'text-[var(--text-muted)] hover:text-[var(--text-main)]'}`}
          onClick={() => setActiveTab('insumos')}
        >
          Insumos (Materia Prima)
        </button>
        <button 
          className={`px-4 py-2 font-semibold text-sm rounded-t-lg transition-colors ${activeTab === 'recipes' ? 'text-emerald-500 border-b-2 border-emerald-500' : 'text-[var(--text-muted)] hover:text-[var(--text-main)]'}`}
          onClick={() => setActiveTab('recipes')}
        >
          Recetas de Productos
        </button>
        <button 
          className={`px-4 py-2 font-semibold text-sm rounded-t-lg transition-colors ${activeTab === 'audit' ? 'text-amber-500 border-b-2 border-amber-500' : 'text-[var(--text-muted)] hover:text-[var(--text-main)]'}`}
          onClick={() => setActiveTab('audit')}
        >
          Auditoría de Turno
        </button>
      </div>

      {loading ? (
        <div className="text-center py-20 text-[var(--text-muted)]">
          <RefreshCw className="animate-spin inline-block mr-2" /> Cargando datos...
        </div>
      ) : (
        <>
          {/* TAB: INSUMOS */}
          {activeTab === 'insumos' && (
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div className="md:col-span-1 flex flex-col gap-6">
                <div className="card h-fit">
                  <h3 className="font-bold text-[var(--text-main)] mb-4">Agregar Insumo</h3>
                  <form onSubmit={handleAddInsumo} className="flex flex-col gap-4">
                    <div>
                      <label className="block text-xs text-[var(--text-muted)] uppercase tracking-wider mb-1">Nombre</label>
                      <input type="text" value={newInsumo.name} onChange={e => setNewInsumo({...newInsumo, name: e.target.value})} placeholder="Ej. Carne Res, Pan Hamb." className="w-full bg-[var(--bg-container)] border border-[var(--border-color)] rounded-lg p-2 text-sm text-[var(--text-main)]" required />
                    </div>
                    <div>
                      <label className="block text-xs text-[var(--text-muted)] uppercase tracking-wider mb-1">Unidad de Medida</label>
                      <input type="text" value={newInsumo.unit} onChange={e => setNewInsumo({...newInsumo, unit: e.target.value})} placeholder="Ej. kg, g, piezas" className="w-full bg-[var(--bg-container)] border border-[var(--border-color)] rounded-lg p-2 text-sm text-[var(--text-main)]" required />
                    </div>
                    <div>
                      <label className="block text-xs text-[var(--text-muted)] uppercase tracking-wider mb-1">Stock Inicial (Opcional)</label>
                      <input type="number" step="0.01" value={newInsumo.currentStock} onChange={e => setNewInsumo({...newInsumo, currentStock: e.target.value})} className="w-full bg-[var(--bg-container)] border border-[var(--border-color)] rounded-lg p-2 text-sm text-[var(--text-main)]" />
                    </div>
                    <button type="submit" disabled={saving} className="bg-violet-600 hover:bg-violet-500 text-white font-bold py-2 rounded-lg flex items-center justify-center gap-2 disabled:opacity-50">
                      <Plus size={16} /> Crear Insumo
                    </button>
                  </form>
                </div>

                {/* Panel de Guía de Compras y Rendimiento */}
                <div className="card h-fit border border-[var(--border-color)]">
                  <h3 className="font-bold text-[var(--text-main)] mb-3 text-sm flex items-center gap-2">
                    <Package size={16} className="text-violet-500"/>
                    Guía y Rendimiento
                  </h3>
                  <div className="text-xs text-[var(--text-muted)] space-y-3">
                    <div>
                      <strong className="text-[var(--text-main)] block mb-1 border-b border-[var(--border-color)] pb-1">📍 Puntos de Compra</strong>
                      <p className="mb-1"><span className="text-emerald-500 font-semibold">Bodega Aurrera:</span> Aceite, Queso, Rajas, BBQ, Tocino, Aderezos.</p>
                      <p className="mb-1"><span className="text-amber-500 font-semibold">La Central:</span> Pan, Cajas Térmicas, Empaques.</p>
                      <p><span className="text-rose-500 font-semibold">Verdulería:</span> Aguacate, Lechuga, Piña, Cebolla.</p>
                    </div>
                    <div>
                      <strong className="text-[var(--text-main)] block mb-1 border-b border-[var(--border-color)] pb-1">📊 Rendimiento Esperado</strong>
                      <ul className="list-disc pl-4 space-y-1 mt-1 text-zinc-400">
                        <li><strong>Salsa BBQ:</strong> 1 bote = 15 - 20 BBQs</li>
                        <li><strong>Sal:</strong> $30 pesos = 1 Mes aprox.</li>
                        <li><strong>Rajas:</strong> $25 pesos = 8 - 10 hamburguesas</li>
                        <li><strong>Piña:</strong> 1 piña entera = 10 Hawaianas</li>
                        <li><strong>Lechuga:</strong> 1 pza entera = 30 hamburguesas</li>
                      </ul>
                    </div>
                  </div>
                </div>
              </div>

              <div className="md:col-span-2 card">
                <h3 className="font-bold text-[var(--text-main)] mb-4">Insumos Registrados</h3>
                {insumos.length === 0 ? (
                  <p className="text-[var(--text-muted)] text-sm">No hay insumos registrados.</p>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="w-full text-left text-sm border-collapse">
                      <thead>
                        <tr className="border-b border-[var(--border-color)] text-[var(--text-muted)]">
                          <th className="pb-2 font-semibold uppercase text-xs">Nombre</th>
                          <th className="pb-2 font-semibold uppercase text-xs">Unidad</th>
                          <th className="pb-2 font-semibold uppercase text-xs text-right">Rendimiento 🍔</th>
                          <th className="pb-2 font-semibold uppercase text-xs text-right">Stock Teórico</th>
                        </tr>
                      </thead>
                      <tbody>
                         {insumos.map((ins, index) => {
                           const relRecipes = recipes.filter(r => r.insumoId === ins.id);
                           const maxUse = relRecipes.length > 0 ? Math.max(...relRecipes.map(r => r.quantity)) : 0;
                           const yieldBurgers = maxUse > 0 ? Math.floor(ins.currentStock / maxUse) : '-';
                           const yieldDisplay = yieldBurgers !== '-' ? (yieldBurgers > 0 ? `${yieldBurgers}🍔` : 'Se acabó') : '-';

                           return (
                             <tr key={ins.id} className="border-b border-[var(--border-color)] hover:bg-[var(--bg-container)]">
                               <td className="py-3 font-medium text-[var(--text-main)]">{index + 1}. {ins.name}</td>
                               <td className="py-3 text-[var(--text-muted)]">{ins.unit}</td>
                               <td className={`py-3 text-right font-medium ${yieldBurgers === '-' ? 'text-zinc-500' : (yieldBurgers > 5 ? 'text-amber-500' : 'text-rose-500')}`}>
                                 {yieldDisplay}
                               </td>
                               <td className="py-3 text-right">
                                 <input 
                                   type="number" 
                                   step="0.01"
                                   data-nav={`insumo-${index}`}
                                   onKeyDown={(e) => handleKeyDown(e, index, 'insumo')}
                                   defaultValue={ins.currentStock}
                                   onBlur={(e) => {
                                     if (parseFloat(e.target.value) !== ins.currentStock) {
                                        handleUpdateInsumoStock(ins.id, e.target.value);
                                     }
                                   }}
                                   className="w-24 bg-[var(--bg-container)] border border-[var(--border-color)] rounded p-1 text-right text-emerald-500 font-bold" 
                                  />
                               </td>
                             </tr>
                           );
                         })}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* TAB: RECIPES */}
          {activeTab === 'recipes' && (
            <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
              <div className="md:col-span-1 border-r border-[var(--border-color)] pr-4">
                <h3 className="font-bold mb-4 text-sm uppercase tracking-wider text-[var(--text-muted)]">Seleccionar Producto</h3>
                <div className="flex flex-col gap-2">
                  {allProducts.map(prod => (
                    <button 
                      key={prod.id} 
                      onClick={() => setSelectedProduct(prod.id)}
                      className={`text-left text-sm p-3 rounded-lg border transition-colors ${selectedProduct === prod.id ? 'bg-emerald-500/10 border-emerald-500/50 text-emerald-600 dark:text-emerald-300' : 'bg-[var(--bg-container)] border-[var(--border-color)] text-[var(--text-muted)] hover:border-[var(--primary-color)]'}`}
                    >
                      {prod.name}
                    </button>
                  ))}
                </div>
              </div>
              <div className="md:col-span-3">
                <div className="card">
                  <div className="flex justify-between items-center mb-6">
                    <div>
                      <h3 className="text-xl font-bold text-[var(--text-main)]">Receta: {allProducts.find(p => p.id === selectedProduct)?.name}</h3>
                      <p className="text-[var(--text-muted)] text-sm">Define la cantidad de cada insumo que se consume al vender esto.</p>
                    </div>
                    <button onClick={handleSaveRecipe} disabled={saving} className="bg-emerald-600 hover:bg-emerald-500 text-white font-bold py-2 px-4 rounded-lg flex items-center gap-2">
                      <Save size={16} /> Guardar Receta
                    </button>
                  </div>

                  {insumos.length === 0 ? (
                    <p className="text-amber-500 text-sm">Primero debes registrar Insumos en la pestaña anterior.</p>
                  ) : (
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                      {insumos.map(ins => {
                         const currentVal = currentRecipe.find(p => p.insumoId === ins.id)?.quantity || '';
                         return (
                           <div key={ins.id} className="bg-[var(--bg-container)] border border-[var(--border-color)] rounded-lg p-4 flex flex-col justify-between">
                             <span className="font-semibold text-[var(--text-main)] mb-2">{ins.name}</span>
                             <div className="flex items-center gap-2">
                               <input 
                                 type="number"
                                 step="0.001"
                                 min="0"
                                 value={currentVal}
                                 onChange={e => handleRecipeChange(ins.id, e.target.value)}
                                 placeholder="0"
                                 className="w-full bg-[var(--bg-color)] border border-[var(--border-color)] rounded p-2 text-right text-emerald-500 font-bold focus:border-emerald-500 focus:outline-none"
                               />
                               <span className="text-[var(--text-muted)] text-sm shrink-0 w-8">{ins.unit}</span>
                             </div>
                           </div>
                         );
                      })}
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* TAB: AUDIT */}
          {activeTab === 'audit' && (
            <div className="card">
               <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-6 gap-4">
                  <div>
                    <h3 className="text-xl font-bold text-[var(--text-main)] flex items-center gap-2">
                      <Package className="text-amber-500" />
                      Corte Físico de Inventario
                    </h3>
                    <p className="text-[var(--text-muted)] text-sm mt-1">Ingresa el conteo físico real. El sistema calculará la diferencia (merma).</p>
                  </div>
                  <button onClick={handleReconcile} disabled={saving} className="bg-amber-600 hover:bg-amber-500 text-white font-bold py-2 px-4 rounded-lg flex items-center gap-2 w-full md:w-auto justify-center">
                    <Check size={16} /> Finalizar Auditoría
                  </button>
               </div>

               <div className="overflow-x-auto">
                 <table className="w-full text-left text-sm border-collapse">
                   <thead>
                     <tr className="bg-[var(--bg-container)] border-b border-[var(--border-color)] text-[var(--text-muted)]">
                       <th className="p-3 font-semibold uppercase text-xs">Insumo</th>
                       <th className="p-3 font-semibold uppercase text-xs text-center w-32">Teórico (Sistema)</th>
                       <th className="p-3 font-semibold uppercase text-xs text-center w-32">Conteo Físico</th>
                       <th className="p-3 font-semibold uppercase text-xs text-right w-32">Diferencia</th>
                     </tr>
                   </thead>
                   <tbody>
                      {insumos.map((ins, index) => {
                        const fisico = parseFloat(auditCounts[ins.id] ?? ins.currentStock) || 0;
                        const diff = fisico - parseFloat(ins.currentStock);
                        const isMerma = diff < 0;
                        
                        return (
                          <tr key={ins.id} className="border-b border-[var(--border-color)] hover:bg-[var(--bg-container)]">
                            <td className="p-3 font-medium text-[var(--text-main)]">{index + 1}. {ins.name}</td>
                            <td className="p-3 text-center text-[var(--text-muted)] font-mono bg-[var(--bg-container)]">
                               {ins.currentStock} {ins.unit}
                            </td>
                            <td className="p-3 text-center">
                              <input 
                                type="number" 
                                step="0.01"
                                data-nav={`audit-${index}`}
                                onKeyDown={(e) => handleKeyDown(e, index, 'audit')}
                                value={auditCounts[ins.id] ?? ins.currentStock}
                                onChange={e => setAuditCounts({...auditCounts, [ins.id]: e.target.value})}
                                className="w-24 bg-[var(--bg-container)] border border-amber-500/50 focus:border-amber-500 rounded p-2 text-center text-[var(--text-main)] font-bold" 
                               />
                            </td>
                            <td className={`p-3 text-right font-bold ${isMerma ? 'text-rose-500' : (diff > 0 ? 'text-emerald-500' : 'text-[var(--text-muted)]')}`}>
                               {diff > 0 ? '+' : ''}{diff.toFixed(2)} {ins.unit}
                            </td>
                          </tr>
                        );
                      })}
                   </tbody>
                 </table>
                 {insumos.length === 0 && (
                   <p className="p-6 text-center text-[var(--text-muted)] bg-[var(--bg-container)]">No hay insumos para auditar.</p>
                 )}
               </div>
            </div>
          )}
        </>
      )}

    </div>
  );
};

export default InventoryBOMView;
