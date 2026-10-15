import { fetchWithAuthRetry } from './userService';

const API_URL = (import.meta.env.VITE_API_URL || 'http://localhost:8787').replace(/\/+$/, '');

/**
 * Consulta la lista de colaboradores activos e invitaciones pendientes del titular.
 */
export const getCollaboratorsList = async () => {
  try {
    const res = await fetchWithAuthRetry(`${API_URL}/api/collaborators/list`);
    if (!res.ok) return { collaborators: [], pendingInvitations: [] };
    return await res.json();
  } catch (err) {
    console.error('Error al consultar colaboradores:', err);
    return { collaborators: [], pendingInvitations: [] };
  }
};

/**
 * Crea una nueva invitación para un ser cercano (hijo, familiar, amigo) con privilegios granulares.
 */
export const inviteCollaborator = async ({
  name,
  email,
  relationType = 'familiar',
  permissions = {},
  deliveryMethod = 'link',
  turnstileToken,
}) => {
  const res = await fetchWithAuthRetry(`${API_URL}/api/collaborators/invite`, {
    method: 'POST',
    body: JSON.stringify({
      name,
      email,
      relationType,
      permissions,
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
 * Actualiza los privilegios/permisos de un ser cercano existente.
 */
export const updateCollaboratorPermissions = async (collaboratorId, permissions) => {
  const res = await fetchWithAuthRetry(`${API_URL}/api/collaborators/${collaboratorId}/permissions`, {
    method: 'PATCH',
    body: JSON.stringify({ permissions }),
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    throw new Error(data.message || 'Error al actualizar permisos');
  }
  return data;
};

/**
 * Desvincula a un ser cercano (acción del titular).
 */
export const removeCollaborator = async (collaboratorId) => {
  const res = await fetchWithAuthRetry(`${API_URL}/api/collaborators/${collaboratorId}`, {
    method: 'DELETE',
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    throw new Error(data.message || 'Error al desvincular ser cercano');
  }
  return data;
};

/**
 * Desvinculación manual por parte del propio ser cercano / colaborador.
 */
export const unlinkSelfCollaborator = async () => {
  const res = await fetchWithAuthRetry(`${API_URL}/api/collaborators/unlink`, {
    method: 'POST',
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    throw new Error(data.message || 'Error al desvincularte del universo');
  }
  return data;
};

/**
 * Revoca una invitación pendiente de ser cercano.
 */
export const revokeCollaboratorInvitation = async (invitationId) => {
  const res = await fetchWithAuthRetry(`${API_URL}/api/collaborators/invitations/${invitationId}/revoke`, {
    method: 'POST',
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    throw new Error(data.message || 'Error al revocar la invitación');
  }
  return data;
};
