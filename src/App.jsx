import React from 'react';
import { useAuth } from '@/hooks/useAuth';
import { loginWithGoogle } from '@/services/authService';
import AdminView from '@/views/AdminView';
import GalleryView from '@/views/GalleryView';
import SettingsView from '@/views/SettingsView';
import Dock from '@/components/ui/Dock';
import PricingModal from '@/components/ui/PricingModal';
import { logout } from '@/services/authService'; 

function App() {
  const { user, userRole, loading } = useAuth();
  // Los clientes ven la galería por defecto. El admin ve el panel.
  const [view, setView] = React.useState(null); 
  const [showPricing, setShowPricing] = React.useState(false);

  React.useEffect(() => {
    if (userRole === 'admin' && !view) setView('admin');
    if (userRole === 'client' && !view) setView('gallery');
  }, [userRole, view]);

  if (loading) {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center text-white font-serif italic text-2xl">
        Cargando Universo...
      </div>
    );
  }

  // 1. Si no hay usuario logueado -> Mostrar Galería Mágica de "Landing Page"
  if (!user) {
    return (
      <div className="relative">
        <GalleryView user={null} />
        
        {/* Botón flotante para Iniciar Sesión / Crear Universo */}
        <button 
          onClick={() => setShowPricing(true)}
          className="fixed top-8 right-8 z-[9999] px-6 py-3 bg-gradient-to-r from-pink-600 to-purple-600 hover:from-pink-500 hover:to-purple-500 text-white rounded-full font-bold shadow-xl transition-all border border-pink-400 flex items-center gap-2"
        >
          <svg className="w-5 h-5 text-white" viewBox="0 0 24 24" fill="currentColor">
            <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#fff"/>
            <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#fff"/>
            <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#fff"/>
            <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#fff"/>
          </svg>
          Crea tu Collage
        </button>

        {showPricing && (
          <PricingModal 
            onClose={() => setShowPricing(false)} 
            onLogin={() => {
              setShowPricing(false);
              loginWithGoogle();
            }} 
          />
        )}
      </div>
    );
  }

  // Si ya cargó el usuario pero aún no se define la vista por el rol
  if (!view) {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center text-white font-serif italic text-2xl">
        Preparando tu espacio...
      </div>
    );
  }

  if (view === 'settings') {
    return <SettingsView user={user} onSaveComplete={() => setView('gallery')} />;
  }

  if (userRole === 'admin' && view === 'admin') {
    return (
      <div className="relative">
        <AdminView user={user} />
        <button 
          onClick={() => setView('settings')}
          className="fixed bottom-8 left-8 z-50 px-6 py-3 bg-pink-600 hover:bg-pink-500 text-white rounded-full font-bold shadow-[0_0_20px_rgba(236,72,153,0.5)] transition-all"
        >
          Configurar y Ver Galería ✨
        </button>
      </div>
    );
  }

  // Si están viendo la galería (ya sean admins o clientes)
  return (
    <div className="relative">
      <GalleryView user={user} onOpenSettings={() => setView('settings')} />
      
      {/* Botón extra para el admin para volver a su panel */}
      {userRole === 'admin' && (
        <button 
          onClick={() => setView('admin')}
          className="fixed top-24 right-8 z-[9999] px-6 py-3 bg-gray-900 border border-gray-700 hover:bg-gray-800 text-white rounded-full font-bold shadow-xl transition-all"
        >
          ← Volver al Panel Admin
        </button>
      )}

      {/* Dock Navigation - Oculto en la Galería para no molestar */}
      {view !== 'gallery' && (
        <Dock 
          items={[
            {
              icon: (
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="m3 9 9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/><polyline points="9 22 9 12 15 12 15 22"/></svg>
              ),
              label: 'Galería',
              onClick: () => setView('gallery')
            },
            ...(userRole === 'admin' ? [{
              icon: (
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect width="18" height="18" x="3" y="3" rx="2"/><path d="M3 9h18"/><path d="M9 21V9"/></svg>
              ),
              label: 'Panel Admin',
              onClick: () => setView('admin')
            }] : []),
            {
              icon: (
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12.22 2h-.44a2 2 0 0 0-2 2v.18a2 2 0 0 1-1 1.73l-.43.25a2 2 0 0 1-2 0l-.15-.08a2 2 0 0 0-2.73.73l-.22.38a2 2 0 0 0 .73 2.73l.15.1a2 2 0 0 1 1 1.72v.51a2 2 0 0 1-1 1.74l-.15.09a2 2 0 0 0-.73 2.73l.22.38a2 2 0 0 0 2.73.73l.15-.08a2 2 0 0 1 2 0l.43.25a2 2 0 0 1 1 1.73V20a2 2 0 0 0 2 2h.44a2 2 0 0 0 2-2v-.18a2 2 0 0 1 1-1.73l.43-.25a2 2 0 0 1 2 0l.15.08a2 2 0 0 0 2.73-.73l.22-.39a2 2 0 0 0-.73-2.73l-.15-.08a2 2 0 0 1-1-1.74v-.5a2 2 0 0 1 1-1.74l.15-.09a2 2 0 0 0 .73-2.73l-.22-.38a2 2 0 0 0-2.73-.73l-.15.08a2 2 0 0 1-2 0l-.43-.25a2 2 0 0 1-1-1.73V4a2 2 0 0 0-2-2z"/><circle cx="12" cy="12" r="3"/></svg>
              ),
              label: 'Configuración',
              onClick: () => setView('settings')
            },
            {
              icon: (
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/><polyline points="16 17 21 12 16 7"/><line x1="21" x2="9" y1="12" y2="12"/></svg>
              ),
              label: 'Cerrar Sesión',
              onClick: async () => {
                await logout();
                window.location.reload();
              }
            }
          ]}
          panelHeight={68}
          baseItemSize={50}
          magnification={70}
        />
      )}
    </div>
  );
}

export default App;
