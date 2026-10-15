import { auth } from '@/config/firebase';

const API_URL = (import.meta.env.VITE_API_URL || 'http://localhost:8787').replace(/\/+$/, '');

export const getAuthHeaders = async (forceRefresh = false) => {
  if (!auth.currentUser) throw new Error('No hay sesión de usuario activa');
  const token = await auth.currentUser.getIdToken(forceRefresh);
  return { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' };
};

// Reintento automático ante expiración de sesión (E50)
export const fetchWithAuthRetry = async (url, options = {}) => {
  const headers = await getAuthHeaders(false);
  let res = await fetch(url, { ...options, headers: { ...headers, ...options.headers } });
  if (res.status === 401) {
    // Si el token expiró, forzar refresco y reintentar una vez
    const refreshedHeaders = await getAuthHeaders(true);
    res = await fetch(url, { ...options, headers: { ...refreshedHeaders, ...options.headers } });
  }
  return res;
};

export const saveUserToDatabase = async (user, turnstileToken) => {
  try {
    const token = await user.getIdToken(true);
    const tokenToSend = turnstileToken || (import.meta.env.DEV ? 'dev_token' : undefined);
    const res = await fetch(`${API_URL}/api/users/me`, {
      method: 'POST',
      headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ 
        name: user.displayName || 'Sin nombre', 
        email: user.email, 
        turnstileToken: tokenToSend 
      })
    });
    // Si retorna 409 o 200, la creación o existencia fue exitosa
    if (!res.ok && res.status !== 409) {
      let errorMsg = 'Error al registrar usuario';
      try {
        const text = await res.text();
        try {
          const errJson = JSON.parse(text);
          errorMsg = errJson.message || errJson.error || errorMsg;
        } catch {
          if (text && !text.includes('<!DOCTYPE') && !text.includes('<html')) {
            errorMsg = text;
          }
        }
      } catch (readErr) {
        console.error("Error leyendo respuesta de error:", readErr);
      }
      console.error("Error al crear usuario en backend:", errorMsg);
      return { success: false, error: errorMsg };
    }
    const data = await res.json().catch(() => null);
    return { success: true, data };
  } catch (error) {
    console.error("Error guardando usuario:", error);
    return { success: false, error: error.message || 'Error de conexión con el servidor.' };
  }
};

export const fetchAllClients = async () => {
  try {
    const res = await fetchWithAuthRetry(`${API_URL}/api/users`);
    if (!res.ok) {
      const errText = await res.text();
      console.error("Backend error:", res.status, errText);
      throw new Error("Error obteniendo clientes");
    }
    return await res.json();
  } catch (error) {
    console.error("Error obteniendo clientes:", error);
    return [];
  }
};

export const PLANS = {
  gratis: { id: 'gratis', name: 'Gratis', maxBytes: 100 * 1024 * 1024, icon: '🆓', priceMonthly: '0', priceAnnual: '0' },
  pololos: { id: 'pololos', name: 'Pololos', maxBytes: 15 * 1024 * 1024 * 1024, icon: '💕', priceMonthly: '990', priceAnnual: '5.990' },
  novios: { id: 'novios', name: 'Novios', maxBytes: 50 * 1024 * 1024 * 1024, icon: '💍', priceMonthly: '1.990', priceAnnual: '14.990' },
  matrimonio: { id: 'matrimonio', name: 'Matrimonio', maxBytes: 100 * 1024 * 1024 * 1024, icon: '⛪', priceMonthly: '3.290', priceAnnual: '24.990' }
};

export const updateClientPlan = async (userId, planId) => {
  try {
    const res = await fetchWithAuthRetry(`${API_URL}/api/users/${userId}`, {
      method: 'PATCH',
      body: JSON.stringify({ plan: planId })
    });
    return res.ok;
  } catch (error) {
    console.error("Error actualizando plan:", error);
    return false;
  }
};

export const fetchPlans = async () => {
  try {
    const res = await fetchWithAuthRetry(`${API_URL}/api/plans`);
    if (!res.ok) return [];
    return await res.json();
  } catch (error) {
    console.error("Error fetching plans:", error);
    return [];
  }
};

export const createPlan = async (planData) => {
  try {
    const res = await fetchWithAuthRetry(`${API_URL}/api/plans`, {
      method: 'POST',
      body: JSON.stringify(planData)
    });
    return res.ok;
  } catch (error) {
    return false;
  }
};

export const updatePlanConfig = async (planId, planData) => {
  try {
    const res = await fetchWithAuthRetry(`${API_URL}/api/plans/${planId}`, {
      method: 'PATCH',
      body: JSON.stringify(planData)
    });
    return res.ok;
  } catch (error) {
    return false;
  }
};

export const renewClientPlan = async (userId) => {
  try {
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + 30);
    const res = await fetchWithAuthRetry(`${API_URL}/api/users/${userId}`, {
      method: 'PATCH',
      body: JSON.stringify({ planExpiresAt: expiresAt.toISOString() })
    });
    return res.ok;
  } catch (error) {
    console.error("Error renewing plan:", error);
    return false;
  }
};

export const toggleClientFlightMode = async (userId, enable) => {
  try {
    const res = await fetchWithAuthRetry(`${API_URL}/api/users/${userId}`, {
      method: 'PATCH',
      body: JSON.stringify({ hasFlightMode: enable })
    });
    return res.ok;
  } catch (error) {
    console.error("Error toggling flight mode:", error);
    return false;
  }
};

export const deleteClient = async (userId) => {
  try {
    const res = await fetchWithAuthRetry(`${API_URL}/api/users/${userId}`, {
      method: 'DELETE'
    });
    return res.ok;
  } catch (error) {
    console.error("Error deleting client:", error);
    return false;
  }
};
