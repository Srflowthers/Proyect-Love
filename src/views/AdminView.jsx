import React, { useState, useEffect } from 'react';
import { logout } from '@/services/authService';
import { fetchAllClients, toggleClientFlightMode, updateClientPlan, renewClientPlan, fetchPlans, createPlan, updatePlanConfig, PLANS as DEFAULT_PLANS } from '@/services/userService';

const formatBytes = (bytes) => {
  if (bytes === 0) return '0 Bytes';
  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
};

const AdminView = ({ user }) => {
  const [activeTab, setActiveTab] = useState('clients'); // 'clients' or 'plans'
  const [clients, setClients] = useState([]);
  const [plans, setPlans] = useState({});
  const [loading, setLoading] = useState(true);

  // Modal para planes
  const [showPlanModal, setShowPlanModal] = useState(false);
  const [editingPlan, setEditingPlan] = useState(null);
  const [planForm, setPlanForm] = useState({ id: '', name: '', maxBytes: '', maxImages: '', icon: '', priceMonthly: '', priceAnnual: '' });

  const loadData = async () => {
    setLoading(true);
    const [clientsData, plansData] = await Promise.all([
      fetchAllClients(),
      fetchPlans()
    ]);
    setClients(clientsData);

    const plansObj = {};
    if (plansData && plansData.length > 0) {
      plansData.forEach(p => { plansObj[p.id] = p; });
    } else {
      Object.assign(plansObj, DEFAULT_PLANS); // Fallback a los planes hardcodeados si Firebase está vacío
    }
    setPlans(plansObj);
    setLoading(false);
  };

  useEffect(() => {
    loadData();
  }, []);

  const handleToggleFlightMode = async (clientId, currentStatus) => {
    const success = await toggleClientFlightMode(clientId, !currentStatus);
    if (success) loadData();
  };

  const handlePlanChange = async (clientId, newPlanId) => {
    const success = await updateClientPlan(clientId, newPlanId);
    if (success) loadData();
  };

  const handleRenew = async (clientId) => {
    if (window.confirm('¿Seguro que deseas renovar el mes a este usuario? Se sumarán 30 días a partir de hoy.')) {
      const success = await renewClientPlan(clientId);
      if (success) {
        alert("Mes renovado exitosamente.");
        loadData();
      } else {
        alert("Error al renovar.");
      }
    }
  };

  const openPlanModal = (plan = null) => {
    if (plan) {
      setEditingPlan(plan);
      setPlanForm({
        id: plan.id || '',
        name: plan.name || '',
        maxBytes: plan.maxBytes || '',
        maxImages: plan.maxImages || '',
        icon: plan.icon || '',
        priceMonthly: plan.priceMonthly || '',
        priceAnnual: plan.priceAnnual || ''
      });
    } else {
      setEditingPlan(null);
      setPlanForm({ id: '', name: '', maxBytes: '', maxImages: '', icon: '', priceMonthly: '', priceAnnual: '' });
    }
    setShowPlanModal(true);
  };

  const handleSavePlan = async (e) => {
    e.preventDefault();
    const dataToSave = {
      ...planForm,
      maxBytes: parseInt(planForm.maxBytes, 10),
      maxImages: parseInt(planForm.maxImages, 10)
    };

    let success = false;
    if (editingPlan && editingPlan.id) {
      success = await updatePlanConfig(editingPlan.id, dataToSave);
    } else {
      success = await createPlan(dataToSave);
    }

    if (success) {
      setShowPlanModal(false);
      loadData();
    } else {
      alert("Error al guardar el plan. Revisa tu conexión o permisos.");
    }
  };

  return (
    <div className="min-h-screen bg-black text-white p-8">
      <div className="max-w-6xl mx-auto">
        <div className="flex justify-between items-center mb-10 border-b border-pink-500/30 pb-6">
          <div>
            <h1 className="text-4xl font-serif italic text-transparent bg-clip-text bg-gradient-to-r from-pink-400 to-purple-400">Panel de Administrador</h1>
            <span className="text-pink-500 text-sm tracking-widest uppercase">Protegido por Custom Claims</span>
          </div>
          <div className="flex items-center gap-4">
            <span className="text-gray-400 text-sm">{user.email}</span>
            <button 
              onClick={logout}
              className="px-4 py-2 bg-red-900/50 hover:bg-red-900/80 border border-red-500/50 rounded-lg transition-all"
            >
              Cerrar sesión
            </button>
          </div>
        </div>

        {/* Tabs */}
        <div className="flex gap-4 mb-6">
          <button 
            onClick={() => setActiveTab('clients')}
            className={`px-6 py-2 rounded-lg font-semibold transition-all ${activeTab === 'clients' ? 'bg-pink-600 text-white' : 'bg-gray-800 text-gray-400 hover:bg-gray-700'}`}
          >
            Clientes y Membresías
          </button>
          <button 
            onClick={() => setActiveTab('plans')}
            className={`px-6 py-2 rounded-lg font-semibold transition-all ${activeTab === 'plans' ? 'bg-pink-600 text-white' : 'bg-gray-800 text-gray-400 hover:bg-gray-700'}`}
          >
            Configurar Planes
          </button>
        </div>
        
        {/* CLIENTS TAB */}
        {activeTab === 'clients' && (
        <div className="bg-[#111] border border-gray-800 rounded-xl overflow-hidden shadow-2xl">
          <div className="p-6 border-b border-gray-800 bg-[#1a1a1a]">
            <h2 className="text-xl font-semibold flex items-center gap-2">
              <svg className="w-5 h-5 text-pink-500" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" /></svg>
              Clientes Registrados ({clients.length})
            </h2>
          </div>
          <div className="divide-y divide-gray-800">
            {loading ? <div className="p-8 text-center text-gray-500">Cargando datos desde la nube...</div> : clients.length === 0 ? (
              <div className="p-8 text-center text-gray-500">No hay clientes registrados aún.</div>
            ) : (
              clients.map((client) => {
                const totalImages = client.galleryImages ? client.galleryImages.length : 0;
                const totalBytes = client.galleryImages ? client.galleryImages.reduce((sum, img) => sum + (img.bytes || 0), 0) : 0;
                const hasFlight = !!client.hasFlightMode;
                const currentPlan = plans[client.plan] || plans.pololos || DEFAULT_PLANS.pololos;
                const usagePercent = Math.min(100, (totalBytes / currentPlan.maxBytes) * 100);

                // Calcular vencimiento
                let expiresText = 'No definido';
                let isExpired = false;
                if (client.planExpiresAt) {
                  const d = new Date(client.planExpiresAt);
                  expiresText = d.toLocaleDateString();
                  isExpired = d.getTime() < Date.now();
                }

                return (
                  <div key={client.id} className="p-6 flex flex-col xl:flex-row xl:items-center justify-between gap-4 hover:bg-[#151515] transition-colors">
                    <div className="flex items-center gap-4">
                      <div className="w-10 h-10 rounded-full bg-pink-900/40 border border-pink-500/20 flex items-center justify-center text-pink-400 font-bold uppercase shrink-0">
                        {client.name ? client.name.charAt(0) : client.email.charAt(0)}
                      </div>
                      <div>
                        <p className="font-medium text-gray-200">{client.name || 'Sin nombre'} <span className="text-xs text-gray-500 ml-2">ID: {client.id.substring(0, 6)}</span></p>
                        <p className="text-sm text-gray-500">{client.email}</p>
                      </div>
                    </div>
                    
                    <div className="flex flex-wrap items-center gap-6">
                      
                      {/* Vencimiento y Renovación */}
                      <div className="flex flex-col text-sm border-r border-gray-800 pr-6">
                        <span className="text-gray-500 text-xs uppercase tracking-wider mb-1">Vencimiento</span>
                        <span className={`${isExpired ? 'text-red-500 font-bold' : 'text-green-400'}`}>
                          {isExpired ? 'Expirado' : 'Activo'}: {expiresText}
                        </span>
                        <button 
                          onClick={() => handleRenew(client.id)} 
                          className="text-xs text-pink-400 hover:text-pink-300 underline mt-1 text-left"
                        >
                          + Renovar 30 días
                        </button>
                      </div>

                      {/* Select de Planes */}
                      <div className="flex flex-col">
                        <label className="text-xs text-gray-500 uppercase tracking-wider mb-1">Plan Actual</label>
                        <select 
                          value={client.plan || 'pololos'} 
                          onChange={(e) => handlePlanChange(client.id, e.target.value)}
                          className="bg-gray-900 border border-gray-700 text-sm rounded-lg px-2 py-1 text-gray-300 focus:outline-none focus:border-pink-500"
                        >
                          {Object.values(plans).map(p => (
                            <option key={p.id} value={p.id}>{p.icon} {p.name}</option>
                          ))}
                        </select>
                      </div>

                      {/* Progreso de Almacenamiento */}
                      <div className="flex flex-col text-right w-40">
                        <span className="text-sm font-semibold text-gray-300">{totalImages} <span className="text-gray-500 font-normal">/ {currentPlan.maxImages} Fotos</span></span>
                        <div className="flex items-center justify-between mt-1">
                          <span className="text-xs text-pink-400">{formatBytes(totalBytes)}</span>
                          <span className="text-xs text-gray-500">{formatBytes(currentPlan.maxBytes)}</span>
                        </div>
                        <div className="w-full bg-gray-800 rounded-full h-1.5 mt-1">
                          <div className={`h-1.5 rounded-full ${usagePercent > 90 ? 'bg-red-500' : 'bg-pink-500'}`} style={{ width: `${usagePercent}%` }}></div>
                        </div>
                      </div>

                      {/* Modo Vuelo */}
                      <div className="flex items-center gap-2 border-l border-gray-800 pl-6">
                        <div className="flex flex-col">
                          <span className="text-xs text-gray-400 uppercase tracking-wider mb-1">Bloquear</span>
                          <button 
                            onClick={() => handleToggleFlightMode(client.id, hasFlight)}
                            className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${hasFlight ? 'bg-red-600' : 'bg-gray-700'}`}
                          >
                            <span className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${hasFlight ? 'translate-x-6' : 'translate-x-1'}`} />
                          </button>
                        </div>
                      </div>

                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>
        )}

        {/* PLANS TAB */}
        {activeTab === 'plans' && (
        <div className="bg-[#111] border border-gray-800 rounded-xl overflow-hidden shadow-2xl">
          <div className="p-6 border-b border-gray-800 bg-[#1a1a1a] flex justify-between items-center">
            <h2 className="text-xl font-semibold flex items-center gap-2">
              <svg className="w-5 h-5 text-purple-500" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 10V3L4 14h7v7l9-11h-7z" /></svg>
              Planes Dinámicos ({Object.keys(plans).length})
            </h2>
            <button onClick={() => openPlanModal()} className="px-4 py-2 bg-purple-600 hover:bg-purple-700 text-white rounded-lg text-sm font-semibold transition-all">
              + Crear Plan Nuevo
            </button>
          </div>
          <div className="divide-y divide-gray-800">
            {loading ? <div className="p-8 text-center text-gray-500">Cargando planes...</div> : (
              Object.values(plans).map((plan) => (
                <div key={plan.id} className="p-6 flex flex-col sm:flex-row sm:items-center justify-between gap-4 hover:bg-[#151515] transition-colors">
                  <div className="flex items-center gap-4">
                    <div className="text-4xl">{plan.icon}</div>
                    <div>
                      <p className="font-bold text-gray-200 text-lg">{plan.name} <span className="text-xs font-normal text-gray-500 ml-2">ID: {plan.id}</span></p>
                      <p className="text-sm text-gray-400">Mensual: ${plan.priceMonthly} | Anual: ${plan.priceAnnual}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-8">
                    <div className="text-sm text-right">
                      <p className="text-gray-400">Límites configurados</p>
                      <p className="font-semibold text-pink-400">{plan.maxImages} Fotos / {formatBytes(plan.maxBytes)}</p>
                    </div>
                    <button onClick={() => openPlanModal(plan)} className="px-4 py-2 bg-gray-800 hover:bg-gray-700 border border-gray-600 rounded-lg text-sm transition-all">
                      Editar Detalles
                    </button>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
        )}

      </div>

      {/* PLAN MODAL */}
      {showPlanModal && (
        <div className="fixed inset-0 bg-black/80 flex items-center justify-center p-4 z-50">
          <div className="bg-[#111] border border-gray-700 rounded-xl max-w-md w-full shadow-2xl p-6">
            <h3 className="text-xl font-bold text-white mb-4">{editingPlan ? 'Editar Plan' : 'Crear Nuevo Plan'}</h3>
            <form onSubmit={handleSavePlan} className="space-y-4">
              {!editingPlan && (
                <div>
                  <label className="block text-xs text-gray-400 mb-1">ID del Plan (ej: "basico", "premium")</label>
                  <input required value={planForm.id} onChange={e => setPlanForm({...planForm, id: e.target.value.toLowerCase().replace(/\s+/g, '-')})} className="w-full bg-gray-900 border border-gray-700 rounded-lg px-3 py-2 text-white" />
                </div>
              )}
              <div>
                <label className="block text-xs text-gray-400 mb-1">Nombre Público (ej: "Pololos (Básico)")</label>
                <input required value={planForm.name} onChange={e => setPlanForm({...planForm, name: e.target.value})} className="w-full bg-gray-900 border border-gray-700 rounded-lg px-3 py-2 text-white" />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs text-gray-400 mb-1">Máximo de Fotos</label>
                  <input required type="number" min="1" value={planForm.maxImages} onChange={e => setPlanForm({...planForm, maxImages: e.target.value})} className="w-full bg-gray-900 border border-gray-700 rounded-lg px-3 py-2 text-white" />
                </div>
                <div>
                  <label className="block text-xs text-gray-400 mb-1">Máximo de Bytes (ej: 200MB = 209715200)</label>
                  <input required type="number" min="1" value={planForm.maxBytes} onChange={e => setPlanForm({...planForm, maxBytes: e.target.value})} className="w-full bg-gray-900 border border-gray-700 rounded-lg px-3 py-2 text-white" />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs text-gray-400 mb-1">Precio Mensual ($)</label>
                  <input required value={planForm.priceMonthly} onChange={e => setPlanForm({...planForm, priceMonthly: e.target.value})} className="w-full bg-gray-900 border border-gray-700 rounded-lg px-3 py-2 text-white" />
                </div>
                <div>
                  <label className="block text-xs text-gray-400 mb-1">Precio Anual ($)</label>
                  <input required value={planForm.priceAnnual} onChange={e => setPlanForm({...planForm, priceAnnual: e.target.value})} className="w-full bg-gray-900 border border-gray-700 rounded-lg px-3 py-2 text-white" />
                </div>
              </div>
              <div>
                <label className="block text-xs text-gray-400 mb-1">Icono (Emoji)</label>
                <input required value={planForm.icon} onChange={e => setPlanForm({...planForm, icon: e.target.value})} className="w-full bg-gray-900 border border-gray-700 rounded-lg px-3 py-2 text-white text-xl" />
              </div>
              <div className="flex justify-end gap-3 mt-6 pt-4 border-t border-gray-800">
                <button type="button" onClick={() => setShowPlanModal(false)} className="px-4 py-2 text-gray-400 hover:text-white">Cancelar</button>
                <button type="submit" className="px-4 py-2 bg-pink-600 hover:bg-pink-700 text-white font-bold rounded-lg">Guardar Plan</button>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  );
};

export default AdminView;
