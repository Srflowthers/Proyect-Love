import React, { useState, useEffect } from 'react';
import {
  getCollaboratorsList,
  inviteCollaborator,
  updateCollaboratorPermissions,
  removeCollaborator,
  unlinkSelfCollaborator,
  revokeCollaboratorInvitation,
} from '@/services/collaboratorService';

export default function CircleSection({ currentUser, globalUserData, setGlobalUserData, userPlan, onOpenPricing }) {
  const [collaborators, setCollaborators] = useState([]);
  const [pendingInvitations, setPendingInvitations] = useState([]);
  const [loading, setLoading] = useState(true);
  const [isExpanded, setIsExpanded] = useState(false);

  // Presets recomendados según el rol
  const getRolePresets = (role) => {
    switch (role) {
      case 'hijo':
        return {
          view: true,
          upload: true, // Recomendado: puede subir fotos/videos en alta calidad sin perder calidad de WhatsApp
          delete: false, // Recomendado: desmarcado para proteger recuerdos y evitar borrados accidentales
          download: false,
          viewLetters: false,
          viewMusic: true,
          editSettings: false,
        };
      case 'familiar':
        return {
          view: true,
          upload: false,
          delete: false,
          download: false,
          viewLetters: false,
          viewMusic: true,
          editSettings: false,
        };
      case 'amigo':
        return {
          view: true,
          upload: false,
          delete: false,
          download: false,
          viewLetters: false,
          viewMusic: true,
          editSettings: false,
        };
      default:
        return {
          view: true,
          upload: false,
          delete: false,
          download: false,
          viewLetters: false,
          viewMusic: true,
          editSettings: false,
        };
    }
  };

  // Formulario de invitación
  const [inviteName, setInviteName] = useState('');
  const [inviteEmail, setInviteEmail] = useState('');
  const [relationType, setRelationType] = useState('hijo');
  const [permissions, setPermissions] = useState(getRolePresets('hijo'));
  const [deliveryMethod, setDeliveryMethod] = useState('link'); // 'link' | 'email'
  const [submitting, setSubmitting] = useState(false);
  const [feedback, setFeedback] = useState(null);
  const [copiedLink, setCopiedLink] = useState(false);

  // Modal de edición de permisos
  const [editingCollab, setEditingCollab] = useState(null);
  const [editingPermissions, setEditingPermissions] = useState(null);
  const [savingPermissions, setSavingPermissions] = useState(false);

  // Estado de desvinculación
  const [actionLoading, setActionLoading] = useState(false);

  const isCollaborator = !!globalUserData?.isCollaborator;
  const isFreePlan = !userPlan || userPlan === 'gratis' || userPlan === 'free';

  const loadData = async () => {
    if (isCollaborator) {
      setLoading(false);
      return;
    }
    setLoading(true);
    try {
      const res = await getCollaboratorsList();
      setCollaborators(res.collaborators || []);
      setPendingInvitations(res.pendingInvitations || []);
    } catch (err) {
      console.error('Error cargando círculo cercano:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [isCollaborator]);

  const handleCopyLink = async (url) => {
    if (!url) return;
    try {
      await navigator.clipboard.writeText(url);
      setCopiedLink(true);
      setTimeout(() => setCopiedLink(false), 2500);
    } catch (e) {
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

  const handleCreateInvite = async (e) => {
    if (e) e.preventDefault();
    if (!inviteEmail.trim()) {
      setFeedback({ type: 'error', message: 'Ingresa el correo electrónico de la persona.' });
      return;
    }

    setSubmitting(true);
    setFeedback(null);
    setCopiedLink(false);

    try {
      const res = await inviteCollaborator({
        name: inviteName.trim(),
        email: inviteEmail.trim(),
        relationType,
        permissions,
        deliveryMethod,
      });

      let inviteUrl = res.inviteUrl || res.devInviteUrl;
      if (inviteUrl && window.location.origin.includes('localhost')) {
        inviteUrl = inviteUrl.replace(/^http:\/\/localhost:\d+/, window.location.origin);
      }

      setFeedback({
        type: 'success',
        message: res.message,
        inviteUrl,
        invitedEmail: res.invitedEmail || inviteEmail.trim(),
      });

      // Limpiar formulario
      setInviteName('');
      setInviteEmail('');
      await loadData();
    } catch (err) {
      setFeedback({
        type: 'error',
        message: err.message || 'No se pudo generar la invitación.',
      });
    } finally {
      setSubmitting(false);
    }
  };

  const handleOpenEdit = (collab) => {
    setEditingCollab(collab);
    setEditingPermissions({
      view: collab.permissions?.view !== false,
      download: !!collab.permissions?.download,
      upload: !!collab.permissions?.upload,
      delete: !!collab.permissions?.delete,
      viewLetters: !!collab.permissions?.viewLetters,
      viewMusic: collab.permissions?.viewMusic !== false,
      editSettings: !!collab.permissions?.editSettings,
    });
  };

  const handleSavePermissions = async () => {
    if (!editingCollab || !editingPermissions) return;
    setSavingPermissions(true);
    try {
      await updateCollaboratorPermissions(editingCollab.id, editingPermissions);
      setEditingCollab(null);
      await loadData();
    } catch (err) {
      alert(err.message || 'Error al actualizar permisos');
    } finally {
      setSavingPermissions(false);
    }
  };

  const handleRemove = async (collabId, name) => {
    if (!confirm(`¿Seguro que deseas desvincular a ${name || 'este ser cercano'} de tu universo?`)) return;
    setActionLoading(true);
    try {
      await removeCollaborator(collabId);
      await loadData();
    } catch (err) {
      alert(err.message || 'Error al desvincular');
    } finally {
      setActionLoading(false);
    }
  };

  const handleRevokeInvite = async (invId) => {
    if (!confirm('¿Seguro que deseas revocar esta invitación?')) return;
    try {
      await revokeCollaboratorInvitation(invId);
      await loadData();
    } catch (err) {
      alert(err.message || 'Error al revocar invitación');
    }
  };

  const handleUnlinkSelf = async () => {
    if (!confirm('¿Confirmas que deseas desvincularte de este universo? Volverás a tu propio espacio personal.')) return;
    setActionLoading(true);
    try {
      await unlinkSelfCollaborator();
      alert('Te has desvinculado con éxito.');
      window.location.reload();
    } catch (err) {
      alert(err.message || 'Error al desvincularte');
    } finally {
      setActionLoading(false);
    }
  };

  const getRelationBadge = (rel) => {
    switch (rel) {
      case 'hijo':
        return { label: 'Hijo / Hija', color: 'bg-blue-500/10 text-blue-300 border-blue-500/30' };
      case 'amigo':
        return { label: 'Amigo / Amiga', color: 'bg-emerald-500/10 text-emerald-300 border-emerald-500/30' };
      case 'familiar':
        return { label: 'Familiar', color: 'bg-purple-500/10 text-purple-300 border-purple-500/30' };
      default:
        return { label: 'Ser Cercano', color: 'bg-pink-500/10 text-pink-300 border-pink-500/30' };
    }
  };

  // ─────────────────────────────────────────────────────────────────────────────
  // VISTA PARA EL COLABORADOR / INVITADO (Hijo, familiar, amigo)
  // ─────────────────────────────────────────────────────────────────────────────
  if (isCollaborator) {
    const roleInfo = getRelationBadge(globalUserData?.collaboratorRole);
    const collabPerms = globalUserData?.collaboratorPermissions || {};

    return (
      <div className="mb-6 p-5 md:p-6 bg-gradient-to-br from-purple-950/40 via-gray-900 to-black rounded-2xl border border-purple-500/30 shadow-lg transition-all">
        <div 
          onClick={() => setIsExpanded(!isExpanded)}
          className="flex items-center justify-between cursor-pointer select-none group"
        >
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-purple-500/15 border border-purple-500/30 flex items-center justify-center text-purple-400 group-hover:scale-105 transition-transform">
              <svg className="w-5 h-5 text-purple-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
              </svg>
            </div>
            <div>
              <h3 className="text-base font-bold text-white group-hover:text-purple-300 transition-colors flex items-center gap-2">
                <span>Círculo Cercano Activo</span>
                <span className={`text-[11px] px-2 py-0.5 rounded-full border ${roleInfo.color}`}>
                  {roleInfo.label}
                </span>
              </h3>
              <p className="text-xs text-gray-400">
                Visualizando el universo de{' '}
                <strong className="text-purple-300">{globalUserData?.ownerName || 'tu ser querido'}</strong>
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <span className="text-xs px-2.5 py-1 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/30 flex items-center gap-1.5">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse"></span>
              Vinculado
            </span>
            <div className={`p-1 text-gray-400 group-hover:text-white transition-transform duration-200 ${isExpanded ? 'rotate-180' : ''}`}>
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7" />
              </svg>
            </div>
          </div>
        </div>

        {isExpanded && (
          <div className="mt-5 pt-5 border-t border-gray-800 animate-fadeIn space-y-4">
            {/* Resumen de permisos asignados */}
            <div className="p-4 bg-gray-950/60 rounded-xl border border-gray-800 space-y-2">
              <h4 className="text-xs font-semibold text-gray-300">Tus privilegios en este universo:</h4>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 text-xs">
                <div className="flex items-center gap-2 text-emerald-300">
                  <svg className="w-4 h-4 text-emerald-400 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" /></svg>
                  <span>Ver galería</span>
                </div>
                <div className={`flex items-center gap-2 ${collabPerms.download ? 'text-emerald-300' : 'text-gray-400'}`}>
                  <svg className="w-4 h-4 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" /></svg>
                  <span>{collabPerms.download ? 'Descargar fotos' : 'Solo lectura (sin descarga)'}</span>
                </div>
                <div className={`flex items-center gap-2 ${collabPerms.upload ? 'text-emerald-300' : 'text-gray-400'}`}>
                  <svg className="w-4 h-4 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" /></svg>
                  <span>{collabPerms.upload ? 'Subir fotos' : 'Sin agregar fotos'}</span>
                </div>
                <div className={`flex items-center gap-2 ${collabPerms.viewMusic !== false ? 'text-emerald-300' : 'text-gray-400'}`}>
                  <svg className="w-4 h-4 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 19V6l12-3v13M9 19c0 1.105-1.343 2-3 2s-3-.895-3-2 1.343-2 3-2 3 .895 3 2zm12-3c0 1.105-1.343 2-3 2s-3-.895-3-2 1.343-2 3-2 3 .895 3 2zM9 10l12-3" /></svg>
                  <span>{collabPerms.viewMusic !== false ? 'Escuchar música' : 'Sin música'}</span>
                </div>
                <div className={`flex items-center gap-2 ${collabPerms.viewLetters ? 'text-emerald-300' : 'text-gray-400'}`}>
                  <svg className="w-4 h-4 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M3 19v-8.93a2 2 0 01.89-1.664l7-4.666a2 2 0 012.22 0l7 4.666A2 2 0 0121 10.07V19M3 19a2 2 0 002 2h14a2 2 0 002-2M3 19l6.75-4.5M21 19l-6.75-4.5M3 10l6.75 4.5M21 10l-6.75 4.5m0 0l-1.14.76a2 2 0 01-2.22 0l-1.14-.76" /></svg>
                  <span>{collabPerms.viewLetters ? 'Ver cartas' : 'Cartas privadas'}</span>
                </div>
              </div>
            </div>

            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 pt-2">
              <p className="text-[11px] text-gray-400">
                Puedes desvincularte en cualquier momento para regresar a tu espacio personal independiente.
              </p>
              <button
                type="button"
                onClick={handleUnlinkSelf}
                disabled={actionLoading}
                className="px-4 py-2 bg-red-950/40 hover:bg-red-900/60 border border-red-500/40 text-red-300 text-xs font-bold rounded-xl transition-colors whitespace-nowrap disabled:opacity-50"
              >
                {actionLoading ? 'Desvinculando...' : 'Desvincularme de este Universo'}
              </button>
            </div>
          </div>
        )}
      </div>
    );
  }

  // ─────────────────────────────────────────────────────────────────────────────
  // VISTA PARA EL TITULAR / ADMIN DEL UNIVERSO
  // ─────────────────────────────────────────────────────────────────────────────
  return (
    <div className="mb-8 p-5 md:p-6 bg-gradient-to-br from-purple-950/20 via-[#13111c] to-black rounded-2xl border border-purple-500/20 shadow-lg transition-all">
      {/* Encabezado colapsable */}
      <div 
        onClick={() => setIsExpanded(!isExpanded)}
        className="flex items-center justify-between cursor-pointer select-none group"
      >
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-purple-500/10 border border-purple-500/30 flex items-center justify-center text-purple-400 group-hover:scale-105 transition-transform">
            <svg className="w-5 h-5 text-purple-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
            </svg>
          </div>
          <div>
            <h3 className="text-base font-bold text-white group-hover:text-purple-300 transition-colors flex items-center gap-2">
              <span>Seres Cercanos (Hijos, Familia y Amigos)</span>
              {collaborators.length > 0 && (
                <span className="hidden sm:inline-block text-[11px] font-medium text-purple-300 bg-purple-500/10 px-2 py-0.5 rounded-full border border-purple-500/30">
                  {collaborators.length} {collaborators.length === 1 ? 'vinculado' : 'vinculados'}
                </span>
              )}
            </h3>
            <p className="text-xs text-gray-400">
              Vincula a tus seres queridos y configura sus privilegios de visualización
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {collaborators.length > 0 ? (
            <span className="px-2.5 py-1 bg-purple-500/20 text-purple-300 text-xs font-semibold rounded-full border border-purple-500/30">
              {collaborators.length} {collaborators.length === 1 ? 'Activo' : 'Activos'}
            </span>
          ) : pendingInvitations.length > 0 ? (
            <span className="px-2.5 py-1 bg-amber-500/20 text-amber-300 text-xs font-semibold rounded-full border border-amber-500/30">
              {pendingInvitations.length} Pendiente{pendingInvitations.length > 1 ? 's' : ''}
            </span>
          ) : (
            <span className="text-xs text-gray-400 hover:text-white transition-colors hidden sm:inline">
              {isExpanded ? 'Ocultar' : 'Administrar'}
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
        <div className="mt-5 pt-5 border-t border-gray-800 animate-fadeIn space-y-5">
          {/* LISTA DE MIEMBROS ACTIVOS */}
          {loading ? (
            <div className="py-6 text-center text-gray-400 text-xs">
              <div className="animate-spin w-5 h-5 border-2 border-purple-500 border-t-transparent rounded-full mx-auto mb-2"></div>
              Cargando seres cercanos...
            </div>
          ) : collaborators.length > 0 ? (
            <div className="space-y-3">
              <h4 className="text-xs font-bold text-gray-300 uppercase tracking-wider">Miembros en tu Círculo</h4>
              <div className="grid grid-cols-1 gap-3">
                {collaborators.map((col) => {
                  const roleInfo = getRelationBadge(col.relationType);
                  const perms = col.permissions || {};
                  return (
                    <div
                      key={col.id}
                      className="p-4 bg-gray-900/60 border border-gray-800 rounded-xl flex flex-col md:flex-row md:items-center justify-between gap-3 hover:border-purple-500/30 transition-all"
                    >
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-full bg-gradient-to-br from-purple-600/30 to-pink-600/30 border border-purple-500/30 flex items-center justify-center text-purple-300 font-bold text-sm">
                          {(col.displayName || 'S').charAt(0).toUpperCase()}
                        </div>
                        <div>
                          <div className="flex items-center gap-2">
                            <span className="text-sm font-bold text-white">{col.displayName || 'Ser Cercano'}</span>
                            <span className={`text-[10px] px-2 py-0.5 rounded-full border ${roleInfo.color}`}>
                              {roleInfo.label}
                            </span>
                          </div>
                          <p className="text-xs text-gray-400">{col.email || 'Cuenta vinculada'}</p>
                        </div>
                      </div>

                      {/* Badges de permisos */}
                      <div className="flex flex-wrap items-center gap-1.5 text-[11px]">
                        <span className="px-2 py-0.5 rounded bg-gray-800 text-gray-300 border border-gray-700 flex items-center gap-1">
                          <svg className="w-3.5 h-3.5 text-purple-400" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" /></svg>
                          <span>Lectura</span>
                        </span>
                        <span
                          className={`px-2 py-0.5 rounded border flex items-center gap-1 ${
                            perms.download
                              ? 'bg-emerald-950/40 text-emerald-300 border-emerald-500/30'
                              : 'bg-gray-800/40 text-gray-500 border-gray-700/40'
                          }`}
                        >
                          <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" /></svg>
                          <span>{perms.download ? 'Descarga' : 'Sin descarga'}</span>
                        </span>
                        <span
                          className={`px-2 py-0.5 rounded border flex items-center gap-1 ${
                            perms.upload
                              ? 'bg-emerald-950/40 text-emerald-300 border-emerald-500/30'
                              : 'bg-gray-800/40 text-gray-500 border-gray-700/40'
                          }`}
                        >
                          <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" /></svg>
                          <span>{perms.upload ? 'Subir fotos' : 'Sin agregar'}</span>
                        </span>
                        <span
                          className={`px-2 py-0.5 rounded border flex items-center gap-1 ${
                            perms.viewMusic !== false
                              ? 'bg-emerald-950/40 text-emerald-300 border-emerald-500/30'
                              : 'bg-gray-800/40 text-gray-500 border-gray-700/40'
                          }`}
                        >
                          <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 19V6l12-3v13M9 19c0 1.105-1.343 2-3 2s-3-.895-3-2 1.343-2 3-2 3 .895 3 2zm12-3c0 1.105-1.343 2-3 2s-3-.895-3-2 1.343-2 3-2 3 .895 3 2zM9 10l12-3" /></svg>
                          <span>{perms.viewMusic !== false ? 'Música' : 'Sin música'}</span>
                        </span>
                      </div>

                      {/* Acciones */}
                      <div className="flex items-center gap-2 self-end md:self-auto pt-2 md:pt-0">
                        <button
                          type="button"
                          onClick={() => handleOpenEdit(col)}
                          className="px-3 py-1.5 bg-gray-800 hover:bg-gray-700 text-gray-200 text-xs font-semibold rounded-lg transition-colors border border-gray-700 flex items-center gap-1.5"
                        >
                          <svg className="w-3.5 h-3.5 text-gray-300" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" /></svg>
                          <span>Privilegios</span>
                        </button>
                        <button
                          type="button"
                          onClick={() => handleRemove(col.id, col.displayName)}
                          className="px-3 py-1.5 bg-red-950/30 hover:bg-red-900/50 text-red-400 text-xs font-semibold rounded-lg transition-colors border border-red-500/30"
                        >
                          Desvincular
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          ) : null}

          {/* INVITACIONES PENDIENTES */}
          {pendingInvitations.length > 0 && (
            <div className="space-y-3">
              <h4 className="text-xs font-bold text-amber-400 uppercase tracking-wider flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-amber-400 animate-pulse"></span>
                Invitaciones Pendientes ({pendingInvitations.length})
              </h4>
              <div className="space-y-2">
                {pendingInvitations.map((inv) => {
                  const roleInfo = getRelationBadge(inv.relationType);
                  return (
                    <div
                      key={inv.id}
                      className="p-3 bg-amber-950/15 border border-amber-500/30 rounded-xl flex flex-col sm:flex-row sm:items-center justify-between gap-2"
                    >
                      <div className="space-y-0.5">
                        <div className="flex items-center gap-2">
                          <span className="text-xs font-bold text-white">{inv.displayName || 'Invitado'}</span>
                          <span className={`text-[10px] px-1.5 py-0.5 rounded border ${roleInfo.color}`}>
                            {roleInfo.label}
                          </span>
                        </div>
                        <p className="text-xs text-amber-300 font-mono">{inv.invitedEmail}</p>
                      </div>
                      <div className="flex items-center gap-2">
                        <button
                          type="button"
                          onClick={() => handleRevokeInvite(inv.id)}
                          className="px-2.5 py-1 text-red-400 hover:text-red-300 text-xs transition-colors"
                        >
                          Revocar
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* FORMULARIO PARA INVITAR (REQUIERE CUALQUIER PLAN DE PAGO) */}
          {isFreePlan ? (
            <div className="p-5 bg-purple-950/20 border border-purple-500/30 rounded-xl flex flex-col md:flex-row items-center justify-between gap-4">
              <div>
                <p className="text-sm font-semibold text-purple-300">Vincula a tus Seres Cercanos con un Plan</p>
                <p className="text-xs text-gray-400 mt-1">
                  Invita a tus hijos, familiares o amigos para que disfruten tu universo con permisos y privilegios 100% personalizados.
                </p>
              </div>
              <button
                type="button"
                onClick={onOpenPricing}
                className="px-4 py-2 bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-500 hover:to-pink-500 text-white text-xs font-semibold rounded-xl whitespace-nowrap transition-all shadow-md"
              >
                Ver Planes
              </button>
            </div>
          ) : (
            <div className="p-5 bg-black/50 border border-gray-800 rounded-xl space-y-4">
              <h4 className="text-xs font-bold text-purple-300 uppercase tracking-wider flex items-center gap-2">
                <svg className="w-4 h-4 text-purple-400" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 6v6m0 0v6m0-6h6m-6 0H6" /></svg>
                <span>Invitar a un Ser Cercano</span>
              </h4>

            <form onSubmit={handleCreateInvite} className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div>
                  <label className="block text-[11px] text-gray-400 mb-1 font-semibold uppercase">
                    Nombre o Apodo
                  </label>
                  <input
                    type="text"
                    value={inviteName}
                    onChange={(e) => setInviteName(e.target.value)}
                    placeholder="Ej: Mateo, Mamá, Carlos"
                    className="w-full bg-gray-900 border border-gray-700 rounded-xl p-3 text-white text-xs focus:border-purple-500 outline-none transition-colors"
                  />
                </div>
                <div>
                  <label className="block text-[11px] text-gray-400 mb-1 font-semibold uppercase">
                    Correo de Google <span className="text-purple-400">*</span>
                  </label>
                  <input
                    type="email"
                    value={inviteEmail}
                    onChange={(e) => setInviteEmail(e.target.value)}
                    placeholder="correo@gmail.com"
                    required
                    className="w-full bg-gray-900 border border-gray-700 rounded-xl p-3 text-white text-xs focus:border-purple-500 outline-none transition-colors"
                  />
                </div>
                <div>
                  <label className="block text-[11px] text-gray-400 mb-1 font-semibold uppercase">
                    Parentesco / Rol
                  </label>
                  <select
                    value={relationType}
                    onChange={(e) => {
                      const newRole = e.target.value;
                      setRelationType(newRole);
                      setPermissions(getRolePresets(newRole));
                    }}
                    className="w-full bg-gray-900 border border-gray-700 rounded-xl p-3 text-white text-xs focus:border-purple-500 outline-none transition-colors"
                  >
                    <option value="hijo">Hijo / Hija (Recomendado: subir sin WhatsApp y sin borrar)</option>
                    <option value="familiar">Familiar (Hermano, Mamá, etc.)</option>
                    <option value="amigo">Amigo / Amiga</option>
                    <option value="otro">Otro Ser Querido</option>
                  </select>
                </div>
              </div>

              {/* CONFIGURACIÓN DE PRIVILEGIOS */}
              <div className="p-4 bg-gray-900/60 rounded-xl border border-gray-800 space-y-3">
                <div className="flex items-center justify-between border-b border-gray-800 pb-2">
                  <span className="text-xs font-bold text-gray-200">Configurar Privilegios para esta persona</span>
                  <span className="text-[11px] text-purple-400">100% Personalizable</span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                  {/* Visualizar Galería */}
                  <label className="flex items-start gap-3 p-2.5 rounded-lg bg-gray-950/40 border border-gray-800/80 cursor-pointer hover:border-gray-700 transition-colors">
                    <input
                      type="checkbox"
                      checked={permissions.view !== false}
                      onChange={(e) => {
                        const checked = e.target.checked;
                        setPermissions((p) => ({
                          ...p,
                          view: checked,
                          // Si no puede ver la galería, tampoco puede descargar ni borrar recuerdos
                          download: checked ? p.download : false,
                          delete: checked ? p.delete : false,
                        }));
                      }}
                      className="mt-0.5 rounded text-purple-600 focus:ring-0 bg-gray-800"
                    />
                    <div>
                      <span className="font-semibold text-white">Visualizar Galería de Recuerdos</span>
                      <p className="text-[11px] text-gray-400">
                        {permissions.view !== false
                          ? 'Podrá explorar las fotos y momentos del universo.'
                          : 'Galería oculta (desactiva también descarga y eliminación).'}
                      </p>
                    </div>
                  </label>

                  {/* Subir Fotos y Videos */}
                  <label className="flex items-start gap-3 p-2.5 rounded-lg bg-gray-950/40 border border-gray-800/80 cursor-pointer hover:border-gray-700 transition-colors">
                    <input
                      type="checkbox"
                      checked={permissions.upload}
                      onChange={(e) => setPermissions((p) => ({ ...p, upload: e.target.checked }))}
                      className="mt-0.5 rounded text-purple-600 focus:ring-0 bg-gray-800"
                    />
                    <div>
                      <div className="flex items-center gap-1.5">
                        <span className="font-semibold text-white">Subir fotos y videos</span>
                        {relationType === 'hijo' && (
                          <span className="text-[10px] bg-purple-500/20 text-purple-300 px-1.5 py-0.2 rounded border border-purple-500/30">
                            Recomendado
                          </span>
                        )}
                      </div>
                      <p className="text-[11px] text-gray-400">
                        {permissions.upload
                          ? 'Sube fotos y videos en calidad original (sin la compresión de WhatsApp).'
                          : 'No puede subir contenido a la galería.'}
                      </p>
                    </div>
                  </label>

                  {/* Eliminar Fotos */}
                  <label className="flex items-start gap-3 p-2.5 rounded-lg bg-gray-950/40 border border-gray-800/80 cursor-pointer hover:border-gray-700 transition-colors">
                    <input
                      type="checkbox"
                      checked={permissions.delete}
                      onChange={(e) => {
                        const checked = e.target.checked;
                        setPermissions((p) => ({
                          ...p,
                          delete: checked,
                          // Si puede borrar fotos, forzosamente necesita verlas
                          view: checked ? true : p.view,
                        }));
                      }}
                      className="mt-0.5 rounded text-purple-600 focus:ring-0 bg-gray-800"
                    />
                    <div>
                      <div className="flex items-center gap-1.5">
                        <span className="font-semibold text-white">Eliminar fotos de la galería</span>
                        <span className="text-[10px] bg-red-500/20 text-red-300 px-1.5 py-0.2 rounded border border-red-500/30">
                          Desmarcado por seguridad
                        </span>
                      </div>
                      <p className="text-[11px] text-gray-400">
                        {permissions.delete
                          ? 'Cuidado: podrá borrar fotos de la galería compartida.'
                          : 'Recomendado desmarcado para proteger los recuerdos de borrados accidentales.'}
                      </p>
                    </div>
                  </label>

                  {/* Descargar fotos y videos */}
                  <label className={`flex items-start gap-3 p-2.5 rounded-lg bg-gray-950/40 border transition-colors ${
                    permissions.view === false ? 'opacity-60 border-gray-900 cursor-not-allowed' : 'border-gray-800/80 cursor-pointer hover:border-gray-700'
                  }`}>
                    <input
                      type="checkbox"
                      checked={permissions.download}
                      onChange={(e) => {
                        const checked = e.target.checked;
                        setPermissions((p) => ({
                          ...p,
                          download: checked,
                          // Si activa descargar, obligatoriamente debe poder ver las fotos
                          view: checked ? true : p.view,
                        }));
                      }}
                      className="mt-0.5 rounded text-purple-600 focus:ring-0 bg-gray-800"
                    />
                    <div>
                      <div className="flex items-center gap-1.5">
                        <span className="font-semibold text-white">Descargar fotos y videos originales</span>
                        {permissions.download && permissions.view === false && (
                          <span className="text-[10px] bg-amber-500/20 text-amber-300 px-1.5 py-0.2 rounded border border-amber-500/30">
                            Requiere Ver Galería
                          </span>
                        )}
                      </div>
                      <p className="text-[11px] text-gray-400">
                        {permissions.download
                          ? 'Puede guardar las fotos en su dispositivo (activa automáticamente Ver Galería).'
                          : 'Solo visualización en pantalla (sin descarga).'}
                      </p>
                    </div>
                  </label>

                  {/* Cartas */}
                  <label className="flex items-start gap-3 p-2.5 rounded-lg bg-gray-950/40 border border-gray-800/80 cursor-pointer hover:border-gray-700 transition-colors">
                    <input
                      type="checkbox"
                      checked={permissions.viewLetters}
                      onChange={(e) => setPermissions((p) => ({ ...p, viewLetters: e.target.checked }))}
                      className="mt-0.5 rounded text-purple-600 focus:ring-0 bg-gray-800"
                    />
                    <div>
                      <span className="font-semibold text-white">Permitir leer cartas de amor</span>
                      <p className="text-[11px] text-gray-400">
                        {permissions.viewLetters
                          ? 'Podrá leer cartas y dedicatorias.'
                          : 'Cartas privadas solo para ti y tu pareja.'}
                      </p>
                    </div>
                  </label>

                  {/* Música */}
                  <label className="flex items-start gap-3 p-2.5 rounded-lg bg-gray-950/40 border border-gray-800/80 cursor-pointer hover:border-gray-700 transition-colors">
                    <input
                      type="checkbox"
                      checked={permissions.viewMusic}
                      onChange={(e) => setPermissions((p) => ({ ...p, viewMusic: e.target.checked }))}
                      className="mt-0.5 rounded text-purple-600 focus:ring-0 bg-gray-800"
                    />
                    <div>
                      <span className="font-semibold text-white">Permitir escuchar música</span>
                      <p className="text-[11px] text-gray-400">Podrá reproducir las canciones del universo.</p>
                    </div>
                  </label>
                </div>
              </div>

              {/* Opciones de entrega */}
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pt-2">
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => setDeliveryMethod('link')}
                    className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all flex items-center gap-1.5 ${
                      deliveryMethod === 'link'
                        ? 'bg-purple-600 text-white shadow-md'
                        : 'bg-gray-800 text-gray-400 hover:text-white'
                    }`}
                  >
                    <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1" /></svg>
                    <span>Generar Enlace Directo</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setDeliveryMethod('email')}
                    className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all flex items-center gap-1.5 ${
                      deliveryMethod === 'email'
                        ? 'bg-purple-600 text-white shadow-md'
                        : 'bg-gray-800 text-gray-400 hover:text-white'
                    }`}
                  >
                    <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" /></svg>
                    <span>Enviar por Correo</span>
                  </button>
                </div>

                <button
                  type="submit"
                  disabled={submitting}
                  className="px-6 py-2.5 bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 text-white font-bold text-xs rounded-xl shadow-lg transition-all disabled:opacity-50 flex items-center justify-center gap-2"
                >
                  <svg className="w-4 h-4 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 4v16m8-8H4" /></svg>
                  <span>{submitting ? 'Generando...' : 'Generar Invitación'}</span>
                </button>
              </div>
            </form>

            {/* FEEDBACK DEL FORMULARIO */}
            {feedback && (
              <div
                className={`p-4 rounded-xl text-xs space-y-2 border ${
                  feedback.type === 'success'
                    ? 'bg-purple-950/40 border-purple-500/40 text-purple-200'
                    : 'bg-red-950/40 border-red-500/40 text-red-200'
                }`}
              >
                <p className="font-bold flex items-center gap-1.5">
                  <svg className="w-4 h-4 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    {feedback.type === 'success' ? (
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7" />
                    ) : (
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                    )}
                  </svg>
                  <span>{feedback.message}</span>
                </p>

                {feedback.inviteUrl && (
                  <div className="flex items-center gap-2 pt-1">
                    <input
                      type="text"
                      readOnly
                      value={feedback.inviteUrl}
                      className="flex-1 bg-black/60 border border-purple-500/30 rounded-lg p-2 text-[11px] font-mono text-purple-300 select-all"
                    />
                    <button
                      type="button"
                      onClick={() => handleCopyLink(feedback.inviteUrl)}
                      className={`px-3 py-2 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 ${
                        copiedLink
                          ? 'bg-emerald-600 text-white'
                          : 'bg-purple-600 hover:bg-purple-500 text-white shadow-md'
                      }`}
                    >
                      <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        {copiedLink ? (
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7" />
                        ) : (
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8 5H6a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2v-1M8 5a2 2 0 002 2h2a2 2 0 002-2M8 5a2 2 0 012-2h2a2 2 0 012 2m0 0h2a2 2 0 012 2v3m2 4H10m0 0l3-3m-3 3l3 3" />
                        )}
                      </svg>
                      <span>{copiedLink ? 'Copiado' : 'Copiar'}</span>
                    </button>
                  </div>
                )}
              </div>
            )}
          </div>
          )}
        </div>
      )}

      {/* MODAL PARA EDITAR PRIVILEGIOS */}
      {editingCollab && editingPermissions && (
        <div className="fixed inset-0 z-[10000] bg-black/80 backdrop-blur-sm flex items-center justify-center p-3 sm:p-4">
          <div className="bg-gray-900 border border-purple-500/30 rounded-2xl max-w-md w-full shadow-2xl flex flex-col max-h-[90vh]">
            {/* Header Fijo */}
            <div className="flex items-center justify-between border-b border-gray-800 p-4 sm:p-5 shrink-0">
              <div>
                <h3 className="text-sm font-bold text-white flex items-center gap-2">
                  <svg className="w-4 h-4 text-purple-400" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" /></svg>
                  <span>Modificar Privilegios</span>
                </h3>
                <p className="text-xs text-gray-400">
                  Para {editingCollab.displayName || editingCollab.email}
                </p>
              </div>
              <button
                type="button"
                onClick={() => setEditingCollab(null)}
                className="text-gray-400 hover:text-white text-sm p-1.5 rounded-lg hover:bg-gray-800 transition-colors"
              >
                ✕
              </button>
            </div>

            {/* Lista con Scroll Inteligente */}
            <div className="p-4 sm:p-5 overflow-y-auto space-y-2.5 text-xs flex-1 overscroll-contain">
              <label className="flex items-center justify-between p-3 rounded-xl bg-gray-950 border border-gray-800 hover:border-gray-700 transition-colors cursor-pointer">
                <div className="pr-3">
                  <span className="font-semibold text-white block">Visualizar galería de recuerdos</span>
                  <span className="text-[11px] text-gray-400">Permite ver y recorrer las fotos del universo</span>
                </div>
                <input
                  type="checkbox"
                  checked={editingPermissions.view !== false}
                  onChange={(e) => {
                    const checked = e.target.checked;
                    setEditingPermissions((p) => ({
                      ...p,
                      view: checked,
                      // Si apaga ver la galería, se apagan automáticamente descarga y borrado
                      download: checked ? p.download : false,
                      delete: checked ? p.delete : false,
                    }));
                  }}
                  className="rounded text-purple-600 focus:ring-0 bg-gray-800 w-4 h-4 cursor-pointer shrink-0"
                />
              </label>

              <label className="flex items-center justify-between p-3 rounded-xl bg-gray-950 border border-gray-800 hover:border-gray-700 transition-colors cursor-pointer">
                <div className="pr-3">
                  <span className="font-semibold text-white block">Subir fotos y videos (calidad original)</span>
                  <span className="text-[11px] text-gray-400">Aporta contenido sin la pérdida de calidad de WhatsApp</span>
                </div>
                <input
                  type="checkbox"
                  checked={editingPermissions.upload}
                  onChange={(e) => setEditingPermissions((p) => ({ ...p, upload: e.target.checked }))}
                  className="rounded text-purple-600 focus:ring-0 bg-gray-800 w-4 h-4 cursor-pointer shrink-0"
                />
              </label>

              <label className="flex items-center justify-between p-3 rounded-xl bg-gray-950 border border-gray-800 hover:border-gray-700 transition-colors cursor-pointer">
                <div className="pr-3">
                  <span className="font-semibold text-white block">Eliminar fotos de la galería</span>
                  <span className="text-[11px] text-red-400">Recomendado desmarcado por seguridad</span>
                </div>
                <input
                  type="checkbox"
                  checked={editingPermissions.delete}
                  onChange={(e) => {
                    const checked = e.target.checked;
                    setEditingPermissions((p) => ({
                      ...p,
                      delete: checked,
                      // Si puede borrar fotos, forzosamente debe poder verlas
                      view: checked ? true : p.view,
                    }));
                  }}
                  className="rounded text-purple-600 focus:ring-0 bg-gray-800 w-4 h-4 cursor-pointer shrink-0"
                />
              </label>

              <label className="flex items-center justify-between p-3 rounded-xl bg-gray-950 border border-gray-800 hover:border-gray-700 transition-colors cursor-pointer">
                <div className="pr-3">
                  <span className="font-semibold text-white block">Descargar fotos y videos</span>
                  <span className="text-[11px] text-gray-400">Permite guardar recuerdos en el equipo (activa automáticamente Ver Galería)</span>
                </div>
                <input
                  type="checkbox"
                  checked={editingPermissions.download}
                  onChange={(e) => {
                    const checked = e.target.checked;
                    setEditingPermissions((p) => ({
                      ...p,
                      download: checked,
                      // Si activa descargar, forzosamente debe poder verlas
                      view: checked ? true : p.view,
                    }));
                  }}
                  className="rounded text-purple-600 focus:ring-0 bg-gray-800 w-4 h-4 cursor-pointer shrink-0"
                />
              </label>

              <label className="flex items-center justify-between p-3 rounded-xl bg-gray-950 border border-gray-800 hover:border-gray-700 transition-colors cursor-pointer">
                <div className="pr-3">
                  <span className="font-semibold text-white block">Ver cartas de amor</span>
                  <span className="text-[11px] text-gray-400">Permite leer las cartas íntimas</span>
                </div>
                <input
                  type="checkbox"
                  checked={editingPermissions.viewLetters}
                  onChange={(e) => setEditingPermissions((p) => ({ ...p, viewLetters: e.target.checked }))}
                  className="rounded text-purple-600 focus:ring-0 bg-gray-800 w-4 h-4 cursor-pointer shrink-0"
                />
              </label>

              <label className="flex items-center justify-between p-3 rounded-xl bg-gray-950 border border-gray-800 hover:border-gray-700 transition-colors cursor-pointer">
                <div className="pr-3">
                  <span className="font-semibold text-white block">Escuchar música</span>
                  <span className="text-[11px] text-gray-400">Permite reproducir la playlist</span>
                </div>
                <input
                  type="checkbox"
                  checked={editingPermissions.viewMusic}
                  onChange={(e) => setEditingPermissions((p) => ({ ...p, viewMusic: e.target.checked }))}
                  className="rounded text-purple-600 focus:ring-0 bg-gray-800 w-4 h-4 cursor-pointer shrink-0"
                />
              </label>
            </div>

            {/* Footer Fijo con Botones Siempre Visibles */}
            <div className="flex justify-end gap-2 p-4 sm:p-5 border-t border-gray-800 bg-gray-900/90 backdrop-blur-xs rounded-b-2xl shrink-0">
              <button
                type="button"
                onClick={() => setEditingCollab(null)}
                className="px-4 py-2 bg-gray-800 hover:bg-gray-700 text-gray-300 text-xs font-semibold rounded-xl transition-colors"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={handleSavePermissions}
                disabled={savingPermissions}
                className="px-5 py-2 bg-purple-600 hover:bg-purple-500 text-white text-xs font-bold rounded-xl shadow-md disabled:opacity-50 transition-colors"
              >
                {savingPermissions ? 'Guardando...' : 'Guardar Cambios'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
