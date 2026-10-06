import React, { Suspense, lazy } from 'react';
import { createPortal } from 'react-dom';
import { useAuth } from '@/hooks/useAuth';
import { loginWithGoogle } from '@/services/authService';
const AdminView = lazy(() => import('@/views/AdminView'));
import GalleryView from '@/views/GalleryView';
import SettingsView from '@/views/SettingsView';
import Dock from '@/components/Dock';
import PricingModal from '@/components/ui/PricingModal';
import { logout } from '@/services/authService'; 

function App() {
  const { user, userRole, loading } = useAuth();
  // Los clientes ven la galería por defecto. El admin ve el panel.
  const [view, setView] = React.useState(null); 
  const [showPricing, setShowPricing] = React.useState(false);
  const [settingsTab, setSettingsTab] = React.useState('profile');
  const [adminTab, setAdminTab] = React.useState('clients');
  const [isMobile, setIsMobile] = React.useState(typeof window !== 'undefined' ? window.innerWidth < 768 : false);
  const [hideDock, setHideDock] = React.useState(false);

  React.useEffect(() => {
    const handleResize = () => {
      setIsMobile(window.innerWidth < 768);
      console.log('Current window.innerWidth:', window.innerWidth, 'isMobile:', window.innerWidth < 768);
    };
    handleResize(); // Evalúa inmediatamente al montar por si el valor inicial difiere
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  React.useEffect(() => {
    if (userRole === 'admin' && !view) {
      setView('admin');
      window.history.replaceState({ view: 'admin' }, '');
    }
    if (userRole === 'client' && !view) {
      handleSetView('gallery');
      window.history.replaceState({ view: 'gallery' }, '');
    }
  }, [userRole, view]);

  // Manejar el botón de "Atrás" del navegador
  React.useEffect(() => {
    const handlePopState = (event) => {
      if (event.state && event.state.view) {
        setView(event.state.view);
      } else {
        // Fallback si no hay estado: volver a la galería o panel principal
        setView(userRole === 'admin' ? 'admin' : 'gallery');
      }
    };
    
    window.addEventListener('popstate', handlePopState);
    return () => window.removeEventListener('popstate', handlePopState);
  }, [userRole]);

  // Wrapper para cambiar la vista y añadir historial
  const handleSetView = (newView) => {
    setView(newView);
    window.history.pushState({ view: newView }, '');
  };

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
            onLogin={(turnstileToken) => {
              setShowPricing(false);
              loginWithGoogle(turnstileToken);
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

  // Items del Dock profesionales por rol
  const dockItems = userRole === 'admin' ? [
    {
      icon: <svg className="w-6 h-6 text-pink-400" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2V6zM14 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2V6zM4 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2v-2zM14 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2v-2z" /></svg>,
      label: 'Panel Principal',
      onClick: () => { setAdminTab('clients'); handleSetView('admin'); }
    },
    {
      icon: <svg className="w-6 h-6 text-blue-400" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" /></svg>,
      label: 'Usuarios',
      onClick: () => { setAdminTab('clients'); handleSetView('admin'); }
    },
    {
      icon: <svg className="w-6 h-6 text-emerald-400" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>,
      label: 'Planes',
      onClick: () => { setAdminTab('plans'); handleSetView('admin'); }
    },
    {
      icon: <svg className="w-6 h-6 text-purple-400" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" /></svg>,
      label: 'Configuración de Sistema',
      onClick: () => { setSettingsTab('profile'); handleSetView('settings'); }
    },
    {
      icon: <svg className="w-6 h-6 text-red-500" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" /></svg>,
      label: 'Cerrar Sesión',
      onClick: async () => { if (window.confirm("¿Estás seguro de que deseas cerrar sesión?")) { await logout(); window.location.reload(); } }
    }
  ] : [
    {
      icon: <svg className="w-6 h-6 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" /></svg>,
      label: 'Galería',
      onClick: () => { handleSetView('gallery'); }
    },
    {
      icon: <svg className="w-6 h-6 text-pink-400" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M3 19v-8.93a2 2 0 01.89-1.664l7-4.666a2 2 0 012.22 0l7 4.666A2 2 0 0121 10.07V19M3 19a2 2 0 002 2h14a2 2 0 002-2M3 19l6.75-4.5M21 19l-6.75-4.5M3 10l6.75 4.5M21 10l-6.75 4.5m0 0l-1.14.76a2 2 0 01-2.22 0l-1.14-.76" /></svg>,
      label: 'Cartas',
      onClick: () => { setSettingsTab('pages'); handleSetView('settings'); }
    },
    {
      icon: <svg className="w-6 h-6 text-purple-400" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" /></svg>,
      label: 'Mis Fotos',
      onClick: () => { setSettingsTab('images'); handleSetView('settings'); }
    },
    {
      icon: <svg className="w-6 h-6 text-blue-400" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" /></svg>,
      label: 'Mi Perfil',
      onClick: () => { setSettingsTab('profile'); handleSetView('settings'); }
    },
    {
      icon: <svg className="w-6 h-6 text-red-500" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" /></svg>,
      label: 'Salir',
      onClick: async () => { if (window.confirm("¿Estás seguro de que deseas salir de tu Universo?")) { await logout(); window.location.reload(); } }
    }
  ];

  let activeView = null;
  if (view === 'settings') {
    activeView = <SettingsView user={user} onSaveComplete={() => handleSetView('gallery')} initialTab={settingsTab} />;
  } else if (userRole === 'admin' && view === 'admin') {
    activeView = (
      <div className="relative">
        <Suspense fallback={<div className="min-h-screen bg-black flex items-center justify-center text-pink-400 font-serif italic text-2xl">Cargando Panel...</div>}>
          <AdminView user={user} initialTab={adminTab} />
        </Suspense>
        <button 
          onClick={() => handleSetView('settings')}
          className="fixed bottom-8 left-8 z-50 px-6 py-3 bg-pink-600 hover:bg-pink-500 text-white rounded-full font-bold shadow-[0_0_20px_rgba(236,72,153,0.5)] transition-all"
        >
          Configurar y Ver Galería ✨
        </button>
      </div>
    );
  } else {
    activeView = (
      <div className="relative">
        <GalleryView 
          user={user} 
          onOpenSettings={(tab = 'profile') => {
            setSettingsTab(tab);
            handleSetView('settings');
          }} 
          onOpenAdmin={userRole === 'admin' ? () => handleSetView('admin') : undefined}
          onDockVisibilityChange={setHideDock}
        />
        
        {userRole === 'admin' && (
          <button 
            onClick={() => handleSetView('admin')}
            className="fixed top-24 right-8 z-[9999] px-6 py-3 bg-gray-900 border border-gray-700 hover:bg-gray-800 text-white rounded-full font-bold shadow-xl transition-all"
          >
            ← Volver al Panel Admin
          </button>
        )}
      </div>
    );
  }

  return (
    <>
      {activeView}

      {/* GLOBAL DOCK - Oculto solo en inmersión */}
      {user && !hideDock && createPortal(
        <Dock 
          direction={isMobile ? "horizontal" : "vertical"}
          items={dockItems}
          panelHeight={60}
          baseItemSize={45}
          magnification={65}
          distance={150}
        />,
        document.body
      )}
    </>
  );
}

export default App;
