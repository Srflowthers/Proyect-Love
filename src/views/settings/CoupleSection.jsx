import React, { useState, useEffect } from 'react';
import {
  getCoupleMe,
  unlinkCouple,
  inviteCouple,
  getPendingInvitation,
  revokeInvitation,
} from '@/services/coupleService';

// Sección de Vinculación de Pareja (Colapsable y estilizada con iconos profesionales)
export default function CoupleSection({ currentUser, userPlan, onOpenPricing, partnerName }) {
  const [coupleData, setCoupleData] = useState(null);
  const [pendingInvite, setPendingInvite] = useState(null);
  const [loading, setLoading] = useState(true);
  const [isExpanded, setIsExpanded] = useState(false);

  // Formulario de invitación (solo pide correo, el nombre viene de formData.user2Name)
  const [partnerEmail, setPartnerEmail] = useState('');
  const [deliveryMethod, setDeliveryMethod] = useState('link'); // 'link' | 'email'
  const [submitting, setSubmitting] = useState(false);
  const [formFeedback, setFormFeedback] = useState(null);
  const [copiedLink, setCopiedLink] = useState(false);

  // Modal de confirmación de desvinculación
  const [showUnlinkModal, setShowUnlinkModal] = useState(false);
  const [unlinking, setUnlinking] = useState(false);

  const isFreePlan = !userPlan || userPlan === 'gratis' || userPlan === 'free';

  const loadCoupleState = async () => {
    setLoading(true);
    try {
      const coupleRes = await getCoupleMe();
      if (coupleRes.hasCouple) {
        setCoupleData(coupleRes.couple);
      } else {
        setCoupleData(null);
      }

      const pending = await getPendingInvitation();
      setPendingInvite(pending);
    } catch (err) {
      console.error('Error cargando estado de pareja:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadCoupleState();
  }, []);

  const handleCreateInvite = async (methodToUse = deliveryMethod) => {
    if (!partnerEmail.trim()) {
      setFormFeedback({
        type: 'error',
        message: 'Por favor ingresa el correo electrónico de tu pareja.',
      });
      return;
    }

    const resolvedName = (partnerName && partnerName.trim()) || 'Mi Pareja';

    setSubmitting(true);
    setFormFeedback(null);
    setCopiedLink(false);

    try {
      const res = await inviteCouple({
        partnerName: resolvedName,
        partnerEmail: partnerEmail.trim(),
        deliveryMethod: methodToUse,
      });

      let inviteUrl = res.inviteUrl || res.devInviteUrl;
      if (inviteUrl && window.location.origin.includes('localhost')) {
        inviteUrl = inviteUrl.replace(/^http:\/\/localhost:\d+/, window.location.origin);
      }

      setFormFeedback({
        type: 'success',
        message: res.message,
        warning: res.warning,
        inviteUrl,
        invitedEmail: res.invitedEmail || partnerEmail.trim(),
        deliveryMethod: res.deliveryMethod || methodToUse,
        expiresAt: res.expiresAt,
      });

      await loadCoupleState();
    } catch (err) {
      setFormFeedback({
        type: 'error',
        message: err.message || 'No se pudo generar la invitación.',
      });
    } finally {
      setSubmitting(false);
    }
  };

  const handleCopyLink = async (url) => {
    if (!url) return;
    try {
      await navigator.clipboard.writeText(url);
      setCopiedLink(true);
      setTimeout(() => setCopiedLink(false), 2500);
    } catch (err) {
      const textarea = document.createElement('textarea');
      textarea.value = url;
      document.body.appendChild(textarea);
      textarea.select();
      document.execCommand('copy');
      document.body.removeChild(textarea);
      setCopiedLink(true);
      setTimeout(() => setCopiedLink(false), 2500);
    }
  };

  const handleRevoke = async (id) => {
    if (!confirm('¿Seguro que deseas revocar esta invitación?')) return;
    try {
      await revokeInvitation(id);
      setFormFeedback(null);
      await loadCoupleState();
    } catch (err) {
      alert(err.message || 'Error al revocar');
    }
  };

  const handleUnlink = async () => {
    setUnlinking(true);
    try {
      await unlinkCouple();
      setShowUnlinkModal(false);
      alert('Vínculo finalizado con éxito. Recargando tu espacio personal...');
      window.location.reload();
    } catch (err) {
      alert(err.message || 'Error al desvincular.');
      setUnlinking(false);
    }
  };

  if (loading) {
    return (
      <div className="p-6 bg-gray-900/40 rounded-2xl border border-gray-800 text-center text-gray-400">
        <div className="animate-spin w-6 h-6 border-2 border-pink-500 border-t-transparent rounded-full mx-auto mb-2"></div>
        Cargando estado de pareja...
      </div>
    );
  }

  return (
    <div className="p-5 md:p-6 bg-gray-900/60 rounded-2xl border border-pink-500/20 shadow-lg mb-6 transition-all">
      <div 
        onClick={() => setIsExpanded(!isExpanded)}
        className="flex items-center justify-between cursor-pointer select-none group"
      >
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-pink-500/10 border border-pink-500/30 flex items-center justify-center text-pink-400 group-hover:scale-105 transition-transform">
            <svg className="w-5 h-5 text-pink-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" />
            </svg>
          </div>
          <div>
            <h3 className="text-base font-bold text-white group-hover:text-pink-300 transition-colors flex items-center gap-2">
              <span>Vinculación de Pareja</span>
              {coupleData && (
                <span className="hidden sm:inline-block text-[11px] font-medium text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded-full border border-emerald-500/30">
                  {coupleData.partnerDisplayName || 'Conectado'}
                </span>
              )}
            </h3>
            <p className="text-xs text-gray-400">
              {coupleData
                ? `Vínculo activo con ${coupleData.partnerDisplayName || 'tu pareja'}`
                : 'Comparte tu universo y recuerdos exclusivos con tu pareja'}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {coupleData ? (
            <span className="px-2.5 py-1 bg-emerald-500/20 text-emerald-300 text-xs font-semibold rounded-full border border-emerald-500/30">
              Vínculo Activo
            </span>
          ) : pendingInvite ? (
            <span className="px-2.5 py-1 bg-amber-500/20 text-amber-300 text-xs font-semibold rounded-full border border-amber-500/30">
              Invitación Pendiente
            </span>
          ) : (
            <span className="text-xs text-gray-400 hover:text-white transition-colors hidden sm:inline">
              {isExpanded ? 'Ocultar' : 'Configurar'}
            </span>
          )}
          <div className={`p-1 text-gray-400 group-hover:text-white transition-transform duration-200 ${isExpanded ? 'rotate-180' : ''}`}>
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7" />
            </svg>
          </div>
        </div>
      </div>

      {isExpanded && (
        <div className="mt-5 pt-5 border-t border-gray-800 animate-fadeIn space-y-4">
          {/* CASO 1: YA TIENE PAREJA VINCULADA */}
          {coupleData ? (
            <div className="space-y-4">
          <div className="p-4 bg-gray-950 rounded-xl border border-gray-800 flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div>
              <p className="text-sm font-semibold text-white">
                {coupleData.isOwner
                  ? `Pareja vinculada: ${coupleData.partnerDisplayName || 'Tu Pareja'}`
                  : `Vinculado/a al universo de: ${coupleData.partnerDisplayName || 'Tu Pareja'}`}
              </p>
              <p className="text-xs text-gray-400 mt-1">
                {coupleData.partnerEmail ? `${coupleData.partnerEmail} • ` : ''}
                {coupleData.isOwner ? 'Titular del universo' : 'Compartiendo fotos, cartas y recuerdos'} • Conectados desde{' '}
                {new Date(coupleData.createdAt).toLocaleDateString()}
              </p>
            </div>
            <button
              type="button"
              onClick={() => setShowUnlinkModal(true)}
              className="px-4 py-2 bg-red-500/10 hover:bg-red-500/20 text-red-400 border border-red-500/30 rounded-xl text-xs font-semibold transition-colors"
            >
              Desvincularme
            </button>
          </div>

          {/* Modal de confirmación explícita (E14) */}
          {showUnlinkModal && (
            <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
              <div className="bg-gray-900 border border-gray-700 rounded-2xl max-w-md w-full p-6 space-y-4">
                <h4 className="text-lg font-bold text-white">¿Desvincular pareja?</h4>
                <p className="text-sm text-gray-300">
                  Esta acción finalizará el vínculo compartido. <strong>Ninguna foto ni dato será borrado</strong> (P8). Ambas partes conservan sus cuentas.
                </p>
                <div className="flex justify-end gap-3 pt-4">
                  <button
                    type="button"
                    onClick={() => setShowUnlinkModal(false)}
                    className="px-4 py-2 bg-gray-800 hover:bg-gray-700 text-gray-300 rounded-xl text-xs font-semibold transition-colors"
                  >
                    Cancelar
                  </button>
                  <button
                    type="button"
                    onClick={handleUnlink}
                    disabled={unlinking}
                    className="px-4 py-2 bg-red-600 hover:bg-red-500 text-white rounded-xl text-xs font-semibold transition-colors disabled:opacity-50"
                  >
                    {unlinking ? 'Desvinculando...' : 'Confirmar Desvinculación'}
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      ) : (
        /* CASO 2: NO TIENE PAREJA */
        <div className="space-y-6">
          {/* Alerta si es plan gratuito (E17) */}
          {isFreePlan ? (
            <div className="p-4 bg-pink-950/30 border border-pink-500/30 rounded-xl flex flex-col md:flex-row items-center justify-between gap-4">
              <div>
                <p className="text-sm font-semibold text-pink-300">Vincula a tu pareja con un plan Pro</p>
                <p className="text-xs text-gray-400 mt-1">
                  Invita a tu pareja para compartir recuerdos, fechas y galería con acceso seguro y exclusivo.
                </p>
              </div>
              <button
                type="button"
                onClick={onOpenPricing}
                className="px-4 py-2 bg-pink-600 hover:bg-pink-500 text-white text-xs font-semibold rounded-xl whitespace-nowrap transition-colors shadow-md"
              >
                Ver Planes
              </button>
            </div>
          ) : (
            <>
              {/* Invitación pendiente existente */}
              {pendingInvite && (
                <div className="p-4 bg-gray-950 rounded-xl border border-amber-500/30 flex flex-col md:flex-row items-center justify-between gap-4">
                  <div>
                    <span className="text-xs font-semibold text-amber-400 uppercase tracking-wider">
                      Invitación Pendiente ({pendingInvite.deliveryMethod === 'link' ? 'Enlace Directo' : 'Correo'})
                    </span>
                    <p className="text-sm font-semibold text-white mt-1">
                      Para: {pendingInvite.displayName} ({pendingInvite.invitedEmailNormalized})
                    </p>
                    <p className="text-xs text-gray-400">
                      Válida hasta: {new Date(pendingInvite.expiresAt).toLocaleString()}
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => handleRevoke(pendingInvite.id)}
                    className="px-3 py-1.5 bg-gray-800 hover:bg-red-950/40 text-red-400 border border-red-500/30 text-xs font-semibold rounded-lg transition-colors"
                  >
                    Revocar
                  </button>
                </div>
              )}

              {/* Selector de Opciones (2 opciones profesionales con SVG) */}
              <div className="space-y-4">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <button
                    type="button"
                    onClick={() => setDeliveryMethod('link')}
                    className={`p-3.5 rounded-xl border text-left transition-all ${
                      deliveryMethod === 'link'
                        ? 'bg-pink-950/40 border-pink-500 text-white shadow-md shadow-pink-500/10'
                        : 'bg-gray-950/60 border-gray-800 text-gray-400 hover:border-gray-700 hover:text-gray-200'
                    }`}
                  >
                    <div className="flex items-center gap-2 mb-1">
                      <svg className="w-4 h-4 text-pink-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1" />
                      </svg>
                      <span className="text-xs font-bold uppercase tracking-wider">Opción 1: Generar Enlace</span>
                    </div>
                    <p className="text-[11px] text-gray-400 leading-snug">
                      Genera una URL para copiar y enviar a tu pareja por WhatsApp, Telegram o chat privado.
                    </p>
                  </button>

                  <button
                    type="button"
                    onClick={() => setDeliveryMethod('email')}
                    className={`p-3.5 rounded-xl border text-left transition-all ${
                      deliveryMethod === 'email'
                        ? 'bg-pink-950/40 border-pink-500 text-white shadow-md shadow-pink-500/10'
                        : 'bg-gray-950/60 border-gray-800 text-gray-400 hover:border-gray-700 hover:text-gray-200'
                    }`}
                  >
                    <div className="flex items-center gap-2 mb-1">
                      <svg className="w-4 h-4 text-pink-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                      </svg>
                      <span className="text-xs font-bold uppercase tracking-wider">Opción 2: Enviar por Correo</span>
                    </div>
                    <p className="text-[11px] text-gray-400 leading-snug">
                      Envía un correo electrónico automático con el botón para aceptar la invitación.
                    </p>
                  </button>
                </div>

                {/* Formulario Agregar Pareja */}
                <form
                  onSubmit={(e) => {
                    e.preventDefault();
                    handleCreateInvite(deliveryMethod);
                  }}
                  className="space-y-4 pt-2"
                >
                  <p className="text-xs text-gray-400 leading-relaxed">
                    {deliveryMethod === 'link' ? (
                      <>
                        Al ingresar el correo, se generará una <strong>URL de invitación única</strong>. Tu pareja debe abrir ese enlace e <strong>iniciar sesión con este correo exacto</strong> para quedar vinculados.
                      </>
                    ) : (
                      <>
                        Ingresa el correo electrónico de tu pareja para enviarle un correo automático de invitación.
                      </>
                    )}
                  </p>

                  <div>
                    <label className="block text-xs text-gray-400 mb-1 font-semibold uppercase tracking-wider">
                      Correo electrónico de tu Pareja {partnerName ? `(${partnerName})` : ''}
                    </label>
                    <input
                      type="email"
                      value={partnerEmail}
                      onChange={(e) => setPartnerEmail(e.target.value)}
                      placeholder="pareja@gmail.com"
                      className="w-full bg-black border border-gray-700 rounded-xl p-3 text-white text-sm focus:border-pink-500 outline-none transition-colors"
                      required
                    />
                  </div>

                  {/* Acciones de envío */}
                  <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-end gap-3 pt-2">
                    {deliveryMethod === 'link' ? (
                      <button
                        type="submit"
                        disabled={submitting}
                        className="px-6 py-2.5 bg-gradient-to-r from-pink-600 to-rose-600 hover:from-pink-500 hover:to-rose-500 text-white font-semibold text-xs rounded-xl shadow-md transition-all disabled:opacity-50 flex items-center justify-center gap-2"
                      >
                        <svg className="w-4 h-4 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1" />
                        </svg>
                        <span>{submitting ? 'Generando enlace...' : 'Generar Enlace de Invitación'}</span>
                      </button>
                    ) : (
                      <button
                        type="submit"
                        disabled={submitting}
                        className="px-6 py-2.5 bg-gradient-to-r from-pink-600 to-rose-600 hover:from-pink-500 hover:to-rose-500 text-white font-semibold text-xs rounded-xl shadow-md transition-all disabled:opacity-50 flex items-center justify-center gap-2"
                      >
                        <svg className="w-4 h-4 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                        </svg>
                        <span>{submitting ? 'Enviando correo...' : 'Enviar Invitación por Correo'}</span>
                      </button>
                    )}
                  </div>
                </form>

                {/* Tarjeta de resultado cuando se genera el enlace o feedback */}
                {formFeedback && (
                  <div
                    className={`p-4 rounded-xl text-xs ${
                      formFeedback.type === 'success'
                        ? 'bg-emerald-950/40 border border-emerald-500/40 text-emerald-200'
                        : 'bg-red-950/40 border border-red-500/40 text-red-300'
                    }`}
                  >
                    <div className="flex items-center gap-2 font-semibold">
                      {formFeedback.type === 'success' ? (
                        <svg className="w-4 h-4 text-emerald-400 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7" />
                        </svg>
                      ) : (
                        <svg className="w-4 h-4 text-red-400 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                        </svg>
                      )}
                      <p>{formFeedback.message}</p>
                    </div>

                    {formFeedback.warning && (
                      <p className="mt-2 text-amber-300 font-normal">{formFeedback.warning}</p>
                    )}

                    {/* Caja de Enlace Generado para Copiar y Compartir */}
                    {formFeedback.inviteUrl && (
                      <div className="mt-3 pt-3 border-t border-emerald-500/30 space-y-3">
                        <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-2">
                          <span className="text-xs font-bold text-white uppercase tracking-wider">
                            Enlace de Invitación para tu Pareja:
                          </span>
                          {formFeedback.expiresAt && (
                            <span className="text-[11px] text-gray-400">
                              Expira: {new Date(formFeedback.expiresAt).toLocaleTimeString()}
                            </span>
                          )}
                        </div>

                        {/* Input con el enlace listo para copiar */}
                        <div className="flex items-center gap-2">
                          <input
                            type="text"
                            readOnly
                            value={formFeedback.inviteUrl}
                            className="w-full bg-black/80 border border-gray-700 rounded-lg px-3 py-2 text-[11px] text-gray-200 font-mono outline-none select-all"
                            onClick={(e) => e.target.select()}
                          />
                          <button
                            type="button"
                            onClick={() => handleCopyLink(formFeedback.inviteUrl)}
                            className={`px-3 py-2 rounded-lg font-bold text-xs whitespace-nowrap transition-colors flex items-center gap-1 ${
                              copiedLink
                                ? 'bg-emerald-500 text-black'
                                : 'bg-gray-800 hover:bg-gray-700 text-white border border-gray-700'
                            }`}
                          >
                            {copiedLink ? (
                              <span className="flex items-center gap-1">
                                <svg className="w-3.5 h-3.5 text-black" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7" />
                                </svg>
                                ¡Copiado!
                              </span>
                            ) : (
                              <span className="flex items-center gap-1">
                                <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
                                </svg>
                                Copiar
                              </span>
                            )}
                          </button>
                        </div>

                        {/* Botones de acción directa: WhatsApp y Abrir Invitación */}
                        <div className="flex flex-wrap items-center gap-2 pt-1">
                          <a
                            href={`https://api.whatsapp.com/send?text=${encodeURIComponent(
                              `¡Hola mi amor! Te invito a vincularte conmigo en Proyect Love para compartir nuestra historia: ${formFeedback.inviteUrl}`
                            )}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white font-semibold rounded-lg text-xs flex items-center gap-1.5 transition-colors shadow"
                          >
                            <svg className="w-4 h-4 fill-current shrink-0" viewBox="0 0 24 24">
                              <path d="M.057 24l1.687-6.163c-1.041-1.804-1.588-3.849-1.587-5.946.003-6.556 5.338-11.891 11.893-11.891 3.181.001 6.167 1.24 8.413 3.488 2.245 2.248 3.481 5.236 3.48 8.414-.003 6.557-5.338 11.892-11.893 11.892-1.99-.001-3.951-.5-5.688-1.448l-6.305 1.654zm6.597-3.807c1.676.995 3.276 1.591 5.392 1.592 5.448 0 9.886-4.434 9.889-9.885.002-5.462-4.415-9.89-9.881-9.892-5.452 0-9.887 4.434-9.889 9.884-.001 2.225.651 3.891 1.746 5.634l-.999 3.648 3.742-.981zm11.387-5.464c-.074-.124-.272-.198-.57-.347-.297-.149-1.758-.868-2.031-.967-.272-.099-.47-.149-.669.149-.198.297-.768.967-.941 1.165-.173.198-.347.223-.644.074-.297-.149-1.255-.462-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.297-.347.446-.521.151-.172.2-.296.3-.495.099-.198.05-.372-.025-.521-.075-.148-.669-1.611-.916-2.206-.242-.579-.487-.501-.669-.51l-.57-.01c-.198 0-.52.074-.792.372s-1.04 1.016-1.04 2.479 1.065 2.876 1.213 3.074c.149.198 2.095 3.2 5.076 4.487.709.306 1.263.489 1.694.626.712.226 1.36.194 1.872.118.571-.085 1.758-.719 2.006-1.413.248-.695.248-1.29.173-1.414z"/>
                            </svg>
                            <span>Enviar por WhatsApp</span>
                          </a>

                          <a
                            href={formFeedback.inviteUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="px-3 py-1.5 bg-pink-600 hover:bg-pink-500 text-white font-semibold rounded-lg text-xs flex items-center gap-1.5 transition-colors shadow"
                          >
                            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                            </svg>
                            <span>Probar Enlace Directo</span>
                          </a>
                        </div>

                        <div className="p-2.5 bg-gray-950/80 rounded-lg border border-gray-800 text-[11px] text-gray-300 space-y-1">
                          <div className="flex items-center gap-1.5 font-semibold text-gray-200">
                            <svg className="w-4 h-4 text-pink-400 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
                            </svg>
                            <span>Condición de seguridad</span>
                          </div>
                          <p className="text-gray-400">
                            Al abrir el enlace, tu pareja debe iniciar sesión con <strong>{formFeedback.invitedEmail}</strong>. Si inicia sesión con otra cuenta de Google distinta, el sistema no le permitirá vincularse.
                          </p>
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </div>
            </>
          )}
        </div>
      )}
        </div>
      )}
    </div>
  );
}
