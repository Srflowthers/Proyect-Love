import { fetchWithAuthRetry } from './userService';

const API_URL = (import.meta.env.VITE_API_URL || 'http://localhost:8787').replace(/\/+$/, '');

/**
 * Consulta el estado de vínculo de pareja del usuario actual (E15, E16).
 */
export const getCoupleMe = async () => {
  try {
    const res = await fetchWithAuthRetry(`${API_URL}/api/couples/me`);
    if (!res.ok) return { hasCouple: false };
    return await res.json();
  } catch (err) {
    console.error('Error al consultar estado de pareja:', err);
    return { hasCouple: false };
  }
};

/**
 * Desvincula la pareja actual (E14). Requiere confirmación y reautenticación si el token es antiguo.
 */
export const unlinkCouple = async () => {
  const res = await fetchWithAuthRetry(`${API_URL}/api/couples/unlink`, {
    method: 'POST',
    body: JSON.stringify({ confirm: true }),
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    throw new Error(data.message || 'Error al desvincular pareja');
  }
  return data;
};

/**
 * Crea una nueva invitación para la pareja (D17, E43).
 * Soporta dos opciones: deliveryMethod 'link' (enlace directo) o 'email' (correo).
 */
export const inviteCouple = async ({ partnerName, partnerEmail, turnstileToken, deliveryMethod = 'link' }) => {
  const res = await fetchWithAuthRetry(`${API_URL}/api/invitations/couple`, {
    method: 'POST',
    body: JSON.stringify({
      partnerName,
      partnerEmail,
      deliveryMethod,
      turnstileToken: turnstileToken || 'dev_token',
    }),
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    const error = new Error(data.message || 'Error al procesar la invitación');
    error.code = data.code;
    throw error;
  }
  return data;
};

/**
 * Consulta la invitación pendiente de pareja enviada por el titular.
 */
export const getPendingInvitation = async () => {
  try {
    const res = await fetchWithAuthRetry(`${API_URL}/api/invitations/pending`);
    if (!res.ok) return null;
    const data = await res.json();
    return data.pendingInvitation || null;
  } catch (err) {
    console.error('Error al consultar invitación pendiente:', err);
    return null;
  }
};

/**
 * Revoca una invitación pendiente (E28).
 */
export const revokeInvitation = async (invitationId) => {
  const res = await fetchWithAuthRetry(`${API_URL}/api/invitations/revoke`, {
    method: 'POST',
    body: JSON.stringify({ invitationId }),
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    throw new Error(data.message || 'Error al revocar invitación');
  }
  return data;
};

/**
 * Inspecciona una invitación por su token sin consumirla (P4, E09).
 */
export const inspectInvitation = async (token) => {
  try {
    const res = await fetch(`${API_URL}/api/invitations/inspect?token=${encodeURIComponent(token)}`);
    return await res.json();
  } catch (err) {
    console.error('Error inspeccionando invitación:', err);
    return { status: 'invalid', message: 'Error al contactar el servidor.' };
  }
};

/**
 * Acepta una invitación de forma atómica y autenticada (P6, E04, E05, E11, E12, E13, E24).
 */
export const acceptInvitation = async (token) => {
  const res = await fetchWithAuthRetry(`${API_URL}/api/invitations/accept`, {
    method: 'POST',
    body: JSON.stringify({ token }),
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    const error = new Error(data.message || 'Error al aceptar invitación');
    error.code = data.code;
    throw error;
  }
  return data;
};

/**
 * Rechaza una invitación (E30).
 */
export const declineInvitation = async (token) => {
  const res = await fetch(`${API_URL}/api/invitations/decline`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ token }),
  });
  return await res.json().catch(() => ({}));
};

/**
 * Bloquea al remitente de una invitación (E29).
 */
export const blockInvitationSender = async (token) => {
  const res = await fetch(`${API_URL}/api/invitations/block`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ token }),
  });
  return await res.json().catch(() => ({}));
};
