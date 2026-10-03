import React, { useState, useEffect } from 'react';
import { logout } from '@/services/authService';
import { fetchAllClients, toggleClientFlightMode, PLANS, updateClientPlan } from '@/services/userService';

const formatBytes = (bytes) => {
  if (bytes === 0) return '0 Bytes';
  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
};

const AdminView = ({ user }) => {
  const [clients, setClients] = useState([]);

  const loadClients = async () => {
    const data = await fetchAllClients();
    setClients(data);
  };

  useEffect(() => {
    loadClients();
  }, []);

  const handleToggleFlightMode = async (clientId, currentStatus) => {
    const success = await toggleClientFlightMode(clientId, !currentStatus);
    if (success) {
      loadClients(); // Refrescar lista para ver los cambios
    }
  };

  const handlePlanChange = async (clientId, newPlanId) => {
    const success = await updateClientPlan(clientId, newPlanId);
    if (success) {
      loadClients();
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
        
        <div className="bg-[#111] border border-gray-800 rounded-xl overflow-hidden shadow-2xl">
          <div className="p-6 border-b border-gray-800 bg-[#1a1a1a]">
            <h2 className="text-xl font-semibold flex items-center gap-2">
              <svg className="w-5 h-5 text-pink-500" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" /></svg>
              Clientes Registrados ({clients.length})
            </h2>
          </div>
          <div className="divide-y divide-gray-800">
            {clients.length === 0 ? (
              <div className="p-8 text-center text-gray-500">No hay clientes registrados aún.</div>
            ) : (
              clients.map((client) => {
                const totalImages = client.galleryImages ? client.galleryImages.length : 0;
                const totalBytes = client.galleryImages ? client.galleryImages.reduce((sum, img) => sum + (img.bytes || 0), 0) : 0;
                const hasFlight = !!client.hasFlightMode;
                const currentPlan = PLANS[client.plan] || PLANS.pololos;
                const usagePercent = Math.min(100, (totalBytes / currentPlan.maxBytes) * 100);

                return (
                  <div key={client.id} className="p-6 flex flex-col sm:flex-row sm:items-center justify-between gap-4 hover:bg-[#151515] transition-colors">
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
                      
                      {/* Select de Planes */}
                      <div className="flex flex-col">
                        <label className="text-xs text-gray-500 mb-1">Plan Actual</label>
                        <select 
                          value={client.plan || 'pololos'} 
                          onChange={(e) => handlePlanChange(client.id, e.target.value)}
                          className="bg-gray-900 border border-gray-700 text-sm rounded-lg px-2 py-1 text-gray-300 focus:outline-none focus:border-pink-500"
                        >
                          {Object.values(PLANS).map(p => (
                            <option key={p.id} value={p.id}>{p.icon} {p.name}</option>
                          ))}
                        </select>
                      </div>

                      {/* Progreso de Almacenamiento */}
                      <div className="flex flex-col text-right w-32">
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
                        <span className="text-sm text-gray-400">Vuelo</span>
                        <button 
                          onClick={() => handleToggleFlightMode(client.id, hasFlight)}
                          className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${hasFlight ? 'bg-pink-600' : 'bg-gray-700'}`}
                        >
                          <span className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${hasFlight ? 'translate-x-6' : 'translate-x-1'}`} />
                        </button>
                      </div>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default AdminView;
