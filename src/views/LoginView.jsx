import React, { useState } from 'react';
import { loginWithGoogle } from '@/services/authService';

const LoginView = () => {
  const [authError, setAuthError] = useState('');

  const handleLogin = async () => {
    setAuthError('');
    const { error } = await loginWithGoogle();
    if (error) setAuthError(error);
  };

  return (
    <div className="min-h-screen bg-black flex flex-col items-center justify-center text-white relative overflow-hidden">
      <div className="absolute inset-0 bg-gradient-to-br from-pink-900/40 via-black to-purple-900/40 opacity-50 z-0"></div>
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-96 h-96 bg-pink-600/20 rounded-full blur-[100px] z-0"></div>

      <div className="relative z-10 flex flex-col items-center p-8 bg-black/60 border border-pink-500/30 rounded-2xl shadow-[0_0_50px_rgba(236,72,153,0.15)] backdrop-blur-xl">
        <h1 className="text-4xl md:text-5xl font-serif italic mb-2 text-transparent bg-clip-text bg-gradient-to-r from-pink-300 to-purple-300">Acceso Privado</h1>
        <p className="text-gray-400 mb-8 font-sans tracking-widest text-sm uppercase">Solo personas autorizadas</p>
        
        <button 
          onClick={handleLogin}
          className="group relative px-8 py-4 bg-white/10 hover:bg-white/20 border border-white/20 rounded-full transition-all duration-300 overflow-hidden flex items-center gap-3"
        >
          <div className="absolute inset-0 bg-gradient-to-r from-pink-500/20 to-purple-500/20 opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
          <svg className="w-5 h-5 text-white z-10" viewBox="0 0 24 24" fill="currentColor">
            <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/>
            <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
            <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"/>
            <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
          </svg>
          <span className="relative z-10 text-white font-medium tracking-wide">Iniciar sesión con Google</span>
        </button>
        
        {authError && <p className="mt-4 text-red-400 text-sm">{authError}</p>}
      </div>
    </div>
  );
};

export default LoginView;
