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
      <div className="flex items-center gap-6 mb-10">
        <button
          onClick={() => navigate('/admin')}
          className="btn"
          style={{ width: '48px', height: '48px', padding: 0, background: 'var(--bg-container)', color: 'var(--text-main)', border: '1px solid var(--border-color)' }}
        >
          <ArrowLeft size={24} />
        </button>
        <div>
          <div className="flex items-center gap-3">
            <Beef size={32} color="var(--primary-color)" />
            <h1 className="text-3xl font-black text-[var(--text-main)] mb-0 uppercase tracking-tighter">Inventario Pro</h1>
          </div>
          <p style={{ color: 'var(--primary-color)', fontSize: '11px', fontWeight: '900', textTransform: 'uppercase', letterSpacing: '1px', marginTop: '2px' }}>
            fernando es putito
          </p>
        </div>
      </div>

      {/* ── Tabs - McStyle ── */}
      <div style={{ display: 'flex', gap: '12px', marginBottom: '32px', overflowX: 'auto', paddingBottom: '8px' }}>
        {[
          { id: 'insumos', label: 'MATERIA PRIMA', color: 'var(--primary-color)' },
          { id: 'recipes', label: 'RECETAS', color: 'var(--success-color)' },
          { id: 'audit', label: 'AUDITORÍA', color: 'var(--accent-color)' }
        ].map(tab => (
          <button 
            key={tab.id}
            className="theme-switch"
            style={{
              padding: '12px 24px', borderRadius: 'var(--radius-full)', border: activeTab === tab.id ? `3px solid ${tab.color}` : '1px solid var(--border-color)',
              background: activeTab === tab.id ? (tab.id === 'audit' ? 'var(--accent-color)' : 'var(--primary-color)') : 'var(--bg-container)',
              color: activeTab === tab.id ? (tab.id === 'audit' ? '#292929' : 'white') : 'var(--text-muted)',
              fontWeight: '900', fontSize: '13px', cursor: 'pointer', whiteSpace: 'nowrap',
              boxShadow: activeTab === tab.id ? 'var(--shadow-md)' : 'none'
            }}
            onClick={() => setActiveTab(tab.id)}
          >
            {tab.label}
          </button>
        ))}
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
                <div className="card h-fit" style={{ borderTop: '6px solid var(--primary-color)' }}>
                  <h3 className="font-extrabold text-[var(--text-main)] mb-6 uppercase tracking-tight">Agregar Insumo</h3>
                  <form onSubmit={handleAddInsumo} className="flex flex-col gap-5">
                    <div>
                      <label className="block text-[10px] text-[var(--text-muted)] font-black uppercase tracking-widest mb-2">Nombre del ingrediente</label>
                      <input type="text" value={newInsumo.name} onChange={e => setNewInsumo({...newInsumo, name: e.target.value})} placeholder="Ej. Carne Res" style={{ width: '100%', background: '#F9F9F9', border: '2px solid #EEE', borderRadius: '12px', padding: '12px', fontSize: '14px', fontWeight: '700' }} required />
                    </div>
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                      <div>
                        <label className="block text-[10px] text-[var(--text-muted)] font-black uppercase tracking-widest mb-2">Unidad</label>
                        <input type="text" value={newInsumo.unit} onChange={e => setNewInsumo({...newInsumo, unit: e.target.value})} placeholder="kg, piezas" style={{ width: '100%', background: '#F9F9F9', border: '2px solid #EEE', borderRadius: '12px', padding: '12px', fontSize: '14px', fontWeight: '700' }} required />
                      </div>
                      <div>
                        <label className="block text-[10px] text-[var(--text-muted)] font-black uppercase tracking-widest mb-2">Stock Ini.</label>
                        <input type="number" step="0.01" value={newInsumo.currentStock} onChange={e => setNewInsumo({...newInsumo, currentStock: e.target.value})} style={{ width: '100%', background: '#F9F9F9', border: '2px solid #EEE', borderRadius: '12px', padding: '12px', fontSize: '14px', fontWeight: '700' }} />
                      </div>
                    </div>
                    <button type="submit" disabled={saving} className="btn btn-secondary" style={{ width: '100%', textTransform: 'uppercase' }}>
                      <Plus size={20} /> Crear ahora
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
                        <tr className="border-b-2 border-[#EEE] text-[var(--text-muted)]">
                          <th className="pb-4 font-black uppercase text-[10px] tracking-widest">Ingrediente</th>
                          <th className="pb-4 font-black uppercase text-[10px] tracking-widest">Unidad</th>
                          <th className="pb-4 font-black uppercase text-[10px] tracking-widest text-right">Rendimiento Estimado</th>
                          <th className="pb-4 font-black uppercase text-[10px] tracking-widest text-right">Existencia Actual</th>
                        </tr>
                      </thead>
                      <tbody>
                        {insumos.map((ins, index) => {
                          const relRecipes = recipes.filter(r => r.insumoId === ins.id);
                          const maxUse = relRecipes.length > 0 ? Math.max(...relRecipes.map(r => r.quantity)) : 0;
                          const yieldBurgers = maxUse > 0 ? Math.floor(ins.currentStock / maxUse) : '-';
                          const yieldDisplay = yieldBurgers !== '-' ? (yieldBurgers > 0 ? `${yieldBurgers}🍔` : 'Se acabó') : '-';

                          return (
                            <tr key={ins.id} className="border-b border-[#F0F0F0] hover:bg-[#FAFAFA] transition-colors">
                              <td className="py-4 font-extrabold text-[var(--text-main)]">{index + 1}. {ins.name}</td>
                              <td className="py-4 text-[var(--text-muted)] font-bold">{ins.unit}</td>
                              <td className={`py-4 text-right font-black ${yieldBurgers === '-' ? 'text-zinc-500' : (yieldBurgers > 5 ? 'text-blue-500' : 'text-rose-600')}`}>
                                <span style={{ background: yieldBurgers > 5 ? '#EBF8FF' : '#FFF5F5', padding: '4px 10px', borderRadius: '20px' }}>
                                  {yieldDisplay}
                                </span>
                              </td>
                              <td className="py-4 text-right">
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
                                  style={{ width: '90px', background: '#F5F5F5', border: '1px solid #DDD', borderRadius: '8px', padding: '8px', textAlign: 'right', fontWeight: '900', color: 'var(--text-main)' }}
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
              <div className="md:col-span-1 border-r-2 border-[#EEE] pr-4">
                <h3 className="font-black mb-6 text-[10px] uppercase tracking-widest text-[var(--text-muted)]">Elige el Producto</h3>
                <div className="flex flex-col gap-3">
                  {allProducts.map(prod => (
                    <button 
                      key={prod.id} 
                      onClick={() => setSelectedProduct(prod.id)}
                      className="theme-switch"
                      style={{
                        textAlign: 'left', fontSize: '13px', padding: '14px 16px', borderRadius: '16px', border: selectedProduct === prod.id ? '2px solid var(--primary-color)' : '1px solid #EEE',
                        background: selectedProduct === prod.id ? '#FFF5F5' : 'white',
                        color: selectedProduct === prod.id ? 'var(--primary-color)' : 'var(--text-main)',
                        fontWeight: '800', cursor: 'pointer', boxShadow: selectedProduct === prod.id ? 'var(--shadow-sm)' : 'none'
                      }}
                    >
                      {prod.name}
                    </button>
                  ))}
                </div>
              </div>
              <div className="md:col-span-3">
                <div className="card" style={{ borderTop: '6px solid var(--success-color)' }}>
                  <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-8 gap-4">
                    <div>
                      <h3 className="text-2xl font-black text-[var(--text-main)] uppercase tracking-tight">{allProducts.find(p => p.id === selectedProduct)?.name}</h3>
                      <p className="text-[var(--text-muted)] text-xs font-bold uppercase tracking-widest mt-1">Configuración de materia prima</p>
                    </div>
                    <button onClick={handleSaveRecipe} disabled={saving} className="btn-secondary" style={{ background: 'var(--success-color)', textTransform: 'uppercase' }}>
                      <Save size={20} /> Guardar Cambios
                    </button>
                  </div>

                  {insumos.length === 0 ? (
                    <p className="text-amber-500 text-sm">Primero debes registrar Insumos en la pestaña anterior.</p>
                  ) : (
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
                      {insumos.map(ins => {
                         const currentVal = currentRecipe.find(p => p.insumoId === ins.id)?.quantity || '';
                         return (
                           <div key={ins.id} style={{ background: '#FBFBFB', border: '1px solid #EEE', borderRadius: '16px', padding: '16px', display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
                             <span className="font-black text-[11px] text-[var(--text-muted)] uppercase tracking-widest mb-3">{ins.name}</span>
                             <div className="flex items-center gap-3">
                               <input 
                                 type="number"
                                 step="0.001"
                                 min="0"
                                 value={currentVal}
                                 onChange={e => handleRecipeChange(ins.id, e.target.value)}
                                 placeholder="0"
                                 style={{ width: '100%', background: 'white', border: '2px solid #EEE', borderRadius: '10px', padding: '10px', textAlign: 'right', fontWeight: '900', color: 'var(--primary-color)', fontSize: '16px' }}
                               />
                               <span className="text-[var(--text-muted)] text-xs font-black uppercase w-8">{ins.unit}</span>
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
            <div className="card" style={{ borderTop: '8px solid var(--accent-color)' }}>
               <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-10 gap-6">
                  <div>
                    <h3 className="text-2xl font-black text-[var(--text-main)] uppercase tracking-tight flex items-center gap-3">
                      <Package className="text-amber-500" size={32} />
                      AUDITORÍA DE INVENTARIO
                    </h3>
                    <p className="text-[var(--text-muted)] text-xs font-bold uppercase tracking-widest mt-2">Introduce el conteo físico real para cerrar turno</p>
                  </div>
                  <button onClick={handleReconcile} disabled={saving} className="btn-primary" style={{ padding: '20px 40px', fontSize: '16px', letterSpacing: '1px' }}>
                    <Check size={24} /> FINALIZAR CORTE
                  </button>
               </div>

               <div className="overflow-x-auto">
                 <table className="w-full text-left text-sm border-collapse">
                   <thead>
                     <tr className="border-b-2 border-[#EEE] text-[var(--text-muted)]">
                       <th className="p-4 font-black uppercase text-[10px] tracking-widest">Ingrediente</th>
                       <th className="p-4 font-black uppercase text-[10px] tracking-widest text-center">Stock Teórico</th>
                       <th className="p-4 font-black uppercase text-[10px] tracking-widest text-center">Conteo Físico</th>
                       <th className="p-4 font-black uppercase text-[10px] tracking-widest text-right">Diferencia / Merma</th>
                     </tr>
                   </thead>
                   <tbody>
                      {insumos.map((ins, index) => {
                        const fisico = parseFloat(auditCounts[ins.id] ?? ins.currentStock) || 0;
                        const diff = fisico - parseFloat(ins.currentStock);
                        const isMerma = diff < 0;
                        
                        return (
                          <tr key={ins.id} className="border-b border-[#F0F0F0] hover:bg-[#FAFAFA] transition-colors">
                            <td className="p-4 font-extrabold text-[var(--text-main)]">{index + 1}. {ins.name}</td>
                            <td className="p-4 text-center text-[var(--text-muted)] font-black uppercase bg-[#F9F9F9] rounded-lg">
                               {ins.currentStock} {ins.unit}
                            </td>
                            <td className="p-4 text-center">
                              <input 
                                type="number" 
                                step="0.01"
                                data-nav={`audit-${index}`}
                                onKeyDown={(e) => handleKeyDown(e, index, 'audit')}
                                value={auditCounts[ins.id] ?? ins.currentStock}
                                onChange={e => setAuditCounts({...auditCounts, [ins.id]: e.target.value})}
                                style={{ width: '100px', background: 'white', border: '3px solid var(--accent-color)', borderRadius: '12px', padding: '12px', textAlign: 'center', color: '#292929', fontWeight: '900', fontSize: '18px' }}
                               />
                            </td>
                            <td className={`p-4 text-right font-black ${isMerma ? 'text-rose-600' : (diff > 0 ? 'text-blue-600' : 'text-[var(--text-muted)]')}`}>
                               <span style={{ background: isMerma ? '#FFF5F5' : (diff > 0 ? '#EBF8FF' : '#F5F5F5'), padding: '6px 14px', borderRadius: '20px' }}>
                                 {diff > 0 ? '+' : ''}{diff.toFixed(2)} {ins.unit}
                               </span>
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
