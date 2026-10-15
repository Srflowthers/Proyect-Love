import React, { useState, useEffect } from 'react';
import { loginWithGoogle, logout } from '@/services/authService';
import {
  inspectInvitation,
  acceptInvitation,
  declineInvitation,
  blockInvitationSender,
} from '@/services/coupleService';

export default function InvitationModal({ currentUser, onInvitationAccepted }) {
  const [token, setToken] = useState(null);
  const [inspectData, setInspectData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [processing, setProcessing] = useState(false);
  const [errorMsg, setErrorMsg] = useState(null);
  const [successMsg, setSuccessMsg] = useState(null);
  const [closed, setClosed] = useState(false);

  // 1. Extraer token de fragmento (#token=...) al montar y persistir en sessionStorage
  useEffect(() => {
    try {
      const hash = window.location.hash;
      let activeToken = sessionStorage.getItem('pending_invite_token');

      if (hash && hash.includes('token=')) {
        const match = hash.match(/token=([^&]+)/);
        if (match && match[1]) {
          activeToken = match[1];
          sessionStorage.setItem('pending_invite_token', activeToken);
          // Limpiar la barra de direcciones inmediatamente sin recargar la página (E44)
          window.history.replaceState(null, '', window.location.pathname + window.location.search);
        }
      }

      if (activeToken) {
        setToken(activeToken);
      }
    } catch (e) {
      console.warn('Error reading invite token from hash:', e);
    }
  }, []);

  // 2. Inspeccionar la invitación cuando el token esté disponible (P4, E09)
  useEffect(() => {
    if (!token || closed) return;

    let isMounted = true;
    setLoading(true);
    setErrorMsg(null);

    inspectInvitation(token).then((data) => {
      if (!isMounted) return;
      setLoading(false);
      setInspectData(data);

      if (data.status === 'expired' || data.isExpired) {
        setErrorMsg('Esta invitación caducó. Pide que te envíen una nueva.');
      } else if (data.status === 'invalid' || data.status === 'superseded' || data.status === 'revoked') {
        setErrorMsg('Esta invitación ya no es válida o fue revocada por quien la envió.');
      }
    }).catch(() => {
      if (!isMounted) return;
      setLoading(false);
      setErrorMsg('Error al verificar la invitación.');
    });

    return () => {
      isMounted = false;
    };
  }, [token, closed]);

  if (!token || closed) return null;

  const handleClose = () => {
    sessionStorage.removeItem('pending_invite_token');
    setClosed(true);
  };

  const handleLogin = async () => {
    setProcessing(true);
    setErrorMsg(null);
    try {
      const { user: loggedInUser, error } = await loginWithGoogle('invite_flow', true);
      if (error) {
        setErrorMsg(error);
      }
    } catch (err) {
      console.error('Error logging in:', err);
      setErrorMsg('Error al conectar con Google.');
    } finally {
      setProcessing(false);
    }
  };

  const handleAccept = async () => {
    setProcessing(true);
    setErrorMsg(null);

    try {
      const res = await acceptInvitation(token);
      setSuccessMsg(res.message || '¡Vinculación completada con éxito!');
      sessionStorage.removeItem('pending_invite_token');
      if (onInvitationAccepted) {
        onInvitationAccepted();
      }
      setTimeout(() => {
        handleClose();
        window.location.reload();
      }, 1800);
    } catch (err) {
      if (err.code === 'ACCOUNT_MISMATCH' || err.code === 'EMAIL_MISMATCH') {
        setErrorMsg(`Esta invitación no fue enviada a tu cuenta actual (${currentUser?.email || ''}). Debes iniciar sesión con la cuenta de Google exacta que fue invitada.`);
      } else if (err.code === 'ALREADY_HAVE_PARTNER') {
        setErrorMsg('Ya tienes una vinculación activa. Para aceptar esta invitación primero debes desvincularte de forma explícita.');
      } else if (err.code === 'EMAIL_NOT_VERIFIED') {
        setErrorMsg('Tu cuenta de Google debe tener el correo verificado para aceptar la invitación.');
      } else {
        setErrorMsg(err.message || 'No se pudo aceptar la invitación.');
      }
    } finally {
      setProcessing(false);
    }
  };

  const handleDecline = async () => {
    setProcessing(true);
    try {
      await declineInvitation(token);
      handleClose();
    } catch (e) {
      handleClose();
    }
  };

  const handleBlock = async () => {
    if (!confirm('¿Bloquear al remitente? No recibirás más invitaciones de este usuario.')) return;
    setProcessing(true);
    try {
      await blockInvitationSender(token);
      alert('Remitente bloqueado.');
      handleClose();
    } catch (e) {
      handleClose();
    }
  };

  return (
    <div className="fixed inset-0 z-[10000] bg-black/85 backdrop-blur-md flex items-center justify-center p-4">
      <div className="bg-gray-900 border border-pink-500/30 rounded-2xl max-w-md w-full p-6 shadow-[0_0_35px_rgba(236,72,153,0.2)] space-y-6">
        <div className="flex items-center justify-between border-b border-gray-800 pb-3">
          <h3 className="text-sm font-bold text-white flex items-center gap-2">
            <svg className="w-5 h-5 text-pink-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
            </svg>
            <span>Invitación Personal</span>
          </h3>
          <button
            type="button"
            onClick={handleClose}
            className="text-gray-400 hover:text-white text-sm p-1 transition-colors"
          >
            ✕
          </button>
        </div>

        {loading ? (
          <div className="text-center py-8 text-gray-400">
            <div className="animate-spin w-8 h-8 border-2 border-pink-500 border-t-transparent rounded-full mx-auto mb-3"></div>
            Verificando enlace seguro...
          </div>
        ) : !currentUser ? (
          /* CASO 1: SIN SESIÓN -> PANTALLA AUTH 2.0 DIRECTA */
          <div className="space-y-4 py-1">
            <div className="text-center space-y-2">
              <div className="w-12 h-12 mx-auto rounded-full bg-pink-500/10 border border-pink-500/30 flex items-center justify-center">
                <svg className="w-6 h-6 text-pink-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" />
                </svg>
              </div>
              <h4 className="text-lg font-bold text-white">
                {inspectData?.displayName ? `Invitación de ${inspectData.displayName}` : 'Invitación de Pareja'}
              </h4>
              <p className="text-xs text-gray-300 leading-relaxed">
                Has recibido una invitación para vincular tu historia de amor y galería compartida en <strong className="text-pink-400">Proyect Love</strong>.
              </p>
            </div>

            <div className="p-3 bg-pink-950/40 border border-pink-500/30 rounded-xl text-xs space-y-1">
              <p className="font-semibold text-pink-300 flex items-center gap-1.5">
                <svg className="w-4 h-4 text-pink-400 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                </svg>
                <span>Inicio de sesión requerido</span>
              </p>
              <p className="text-gray-300">
                Inicia sesión con la <strong>cuenta de Google</strong> a la que te enviaron la invitación para que el sistema complete el vínculo.
              </p>
            </div>

            <button
              type="button"
              onClick={handleLogin}
              disabled={processing}
              className="w-full py-3.5 bg-white hover:bg-gray-100 text-gray-900 font-bold rounded-xl text-sm flex items-center justify-center gap-3 transition-colors shadow-lg disabled:opacity-50"
            >
              <svg className="w-5 h-5" viewBox="0 0 24 24">
                <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
                <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"/>
                <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"/>
              </svg>
              {processing ? 'Conectando con Google...' : 'Continuar con Google'}
            </button>
          </div>
        ) : errorMsg ? (
          /* CASO 2: ERROR O DESAJUSTE DE CORREO */
          <div className="space-y-4">
            <div className="p-4 bg-red-950/40 border border-red-500/40 rounded-xl text-red-300 text-xs leading-relaxed">
              <div className="flex items-center gap-1.5 font-bold text-sm text-red-200 mb-1">
                <svg className="w-4 h-4 text-red-400 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                </svg>
                <span>Aviso de seguridad</span>
              </div>
              {errorMsg}
            </div>

            {errorMsg.includes('no fue enviada a tu cuenta') && (
              <div className="pt-1">
                <button
                  type="button"
                  onClick={async () => {
                    await logout();
                    window.location.reload();
                  }}
                  className="w-full py-2.5 bg-gray-800 hover:bg-gray-700 text-gray-200 text-xs font-semibold rounded-xl transition-colors"
                >
                  Cerrar sesión e iniciar con la cuenta correcta
                </button>
              </div>
            )}

            <div className="flex justify-end pt-2">
              <button
                type="button"
                onClick={handleClose}
                className="px-4 py-2 bg-gray-800 hover:bg-gray-700 text-gray-300 text-xs font-semibold rounded-xl"
              >
                Cerrar
              </button>
            </div>
          </div>
        ) : successMsg ? (
          /* CASO 3: ÉXITO */
          <div className="p-6 bg-emerald-950/40 border border-emerald-500/40 rounded-xl text-emerald-300 text-center space-y-2">
            <div className="w-10 h-10 mx-auto rounded-full bg-emerald-500/20 border border-emerald-500/40 flex items-center justify-center">
              <svg className="w-5 h-5 text-emerald-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7" />
              </svg>
            </div>
            <p className="font-bold text-sm">{successMsg}</p>
            <p className="text-xs text-emerald-400">Actualizando tu universo...</p>
          </div>
        ) : (
          /* CASO 4: SESIÓN INICIADA Y LISTO PARA ACEPTAR */
          <div className="space-y-4">
            <div className="text-center space-y-1">
              <div className="w-12 h-12 mx-auto rounded-full bg-pink-500/10 border border-pink-500/30 flex items-center justify-center">
                {inspectData?.type === 'collaborator' ? (
                  <svg className="w-6 h-6 text-purple-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                  </svg>
                ) : (
                  <svg className="w-6 h-6 text-pink-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" />
                  </svg>
                )}
              </div>
              <h4 className="text-base font-bold text-white">
                {inspectData?.type === 'collaborator'
                  ? `Unirte al Círculo de ${inspectData?.displayName || 'Seres Cercanos'}`
                  : `Vincularte con ${inspectData?.displayName || 'tu pareja'}`}
              </h4>
              {inspectData?.relationType && (
                <span className="inline-block px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-purple-950/80 text-purple-300 border border-purple-500/30">
                  Rol: {inspectData.relationType === 'hijo' ? 'Hijo / Hija' : inspectData.relationType === 'amigo' ? 'Amigo / Amiga' : inspectData.relationType === 'familiar' ? 'Familiar' : 'Ser Querido'}
                </span>
              )}
              <p className="text-xs text-emerald-400 font-medium flex items-center justify-center gap-1">
                <svg className="w-3.5 h-3.5 text-emerald-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7" />
                </svg>
                <span>Conectado como: {currentUser.email}</span>
              </p>
            </div>

            {inspectData?.type === 'collaborator' ? (
              <div className="p-3 bg-gray-950 rounded-xl border border-gray-800 text-xs text-gray-300 space-y-2">
                <p className="font-semibold text-gray-200">Privilegios asignados para tu cuenta:</p>
                <div className="grid grid-cols-2 gap-2 text-[11px]">
                  <div className="flex items-center gap-1.5 text-emerald-300">
                    <svg className="w-3.5 h-3.5 text-emerald-400 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" /></svg>
                    <span>Ver galería</span>
                  </div>
                  <div className={`flex items-center gap-1.5 ${inspectData.permissions?.download ? 'text-emerald-300' : 'text-gray-400'}`}>
                    <svg className="w-3.5 h-3.5 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" /></svg>
                    <span>{inspectData.permissions?.download ? 'Descargar fotos' : 'Sin descarga'}</span>
                  </div>
                  <div className={`flex items-center gap-1.5 ${inspectData.permissions?.upload ? 'text-emerald-300' : 'text-gray-400'}`}>
                    <svg className="w-3.5 h-3.5 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" /></svg>
                    <span>{inspectData.permissions?.upload ? 'Agregar fotos' : 'Sin agregar fotos'}</span>
                  </div>
                  <div className={`flex items-center gap-1.5 ${inspectData.permissions?.viewMusic !== false ? 'text-emerald-300' : 'text-gray-400'}`}>
                    <svg className="w-3.5 h-3.5 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 19V6l12-3v13M9 19c0 1.105-1.343 2-3 2s-3-.895-3-2 1.343-2 3-2 3 .895 3 2zm12-3c0 1.105-1.343 2-3 2s-3-.895-3-2 1.343-2 3-2 3 .895 3 2zM9 10l12-3" /></svg>
                    <span>{inspectData.permissions?.viewMusic !== false ? 'Escuchar música' : 'Sin música'}</span>
                  </div>
                </div>
                <p className="text-[10px] text-gray-400 border-t border-gray-800 pt-1.5">
                  • Podrás visualizar este universo hasta que decidas desvincularte desde tus ajustes.
                </p>
              </div>
            ) : (
              <div className="p-3 bg-gray-950 rounded-xl border border-gray-800 text-xs text-gray-300 space-y-1.5">
                <p className="text-gray-200">
                  Al aceptar esta invitación, quedarán vinculados como pareja y compartirán la galería y fechas especiales.
                </p>
                <p className="text-[11px] text-gray-400">
                  • Ambos conservan sus cuentas independientes.
                  <br />• Puedes desvincularte en cualquier momento desde Ajustes.
                </p>
              </div>
            )}

            <div className="flex flex-col gap-2 pt-2">
              <button
                type="button"
                onClick={handleAccept}
                disabled={processing}
                className="w-full py-3 bg-gradient-to-r from-pink-600 to-rose-600 hover:from-pink-500 hover:to-rose-500 text-white font-bold text-sm rounded-xl transition-all shadow-md disabled:opacity-50 flex items-center justify-center gap-2"
              >
                <svg className="w-4 h-4 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7" />
                </svg>
                <span>
                  {processing
                    ? 'Completando vinculación...'
                    : inspectData?.type === 'collaborator'
                    ? 'Unirme al Círculo'
                    : 'Aceptar y Vincularnos'}
                </span>
              </button>

              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={handleDecline}
                  disabled={processing}
                  className="flex-1 py-2 bg-gray-800 hover:bg-gray-700 text-gray-400 hover:text-gray-200 text-xs font-semibold rounded-xl transition-colors"
                >
                  Rechazar
                </button>
                <button
                  type="button"
                  onClick={handleBlock}
                  disabled={processing}
                  className="flex-1 py-2 bg-gray-800 hover:bg-red-950/40 text-red-400 text-xs font-semibold rounded-xl transition-colors"
                >
                  Bloquear
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
