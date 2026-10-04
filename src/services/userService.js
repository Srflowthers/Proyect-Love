import { auth } from '@/config/firebase';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:8787';

const getAuthHeaders = async () => {
  const token = await auth.currentUser?.getIdToken();
  return { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' };
};

export const saveUserToDatabase = async (user, turnstileToken) => {
  try {
    const token = await user.getIdToken();
    const res = await fetch(`${API_URL}/api/users/me`, {
      method: 'POST',
      headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: user.displayName || 'Sin nombre', email: user.email, turnstileToken })
    });
    // Si retorna 409, significa que ya existía. Lo ignoramos.
    if (!res.ok && res.status !== 409) {
      console.error("Error al crear usuario", await res.text());
    }
  } catch (error) {
    console.error("Error guardando usuario:", error);
  }
};

export const fetchAllClients = async () => {
  try {
    const headers = await getAuthHeaders();
    const res = await fetch(`${API_URL}/api/users`, { headers });
    if (!res.ok) {
      const errText = await res.text();
      console.error("Backend error:", res.status, errText);
      throw new Error("Error obteniendo clientes");
    }
    return await res.json(); // Backend ya filtra role === 'client'
  } catch (error) {
    console.error("Error obteniendo clientes:", error);
    return [];
  }
};

export const PLANS = {
  pololos: { id: 'pololos', name: 'Pololos (Básico)', maxBytes: 200 * 1024 * 1024, maxImages: 60, icon: '💕', priceMonthly: '1.000', priceAnnual: '8.000' },
  novios: { id: 'novios', name: 'Novios (Plus)', maxBytes: 2 * 1024 * 1024 * 1024, maxImages: 500, icon: '💍', priceMonthly: '4.990', priceAnnual: '39.920' },
  matrimonio: { id: 'matrimonio', name: 'Matrimonio (Premium)', maxBytes: 5 * 1024 * 1024 * 1024, maxImages: 1500, icon: '⛪', priceMonthly: '14.990', priceAnnual: '119.920' },
  familia: { id: 'familia', name: 'Familia (Ultra)', maxBytes: 15 * 1024 * 1024 * 1024, maxImages: 4000, icon: '👨‍👩‍👧‍👦', priceMonthly: '29.990', priceAnnual: '239.920' }
};

export const updateClientPlan = async (userId, planId) => {
  try {
    const headers = await getAuthHeaders();
    const res = await fetch(`${API_URL}/api/users/${userId}`, {
      method: 'PATCH',
      headers,
      body: JSON.stringify({ plan: planId })
    });
    return res.ok;
  } catch (error) {
    console.error("Error actualizando plan:", error);
    return false;
  }
};

export const toggleClientFlightMode = async (userId, enable) => {
  try {
    const headers = await getAuthHeaders();
    const res = await fetch(`${API_URL}/api/users/${userId}`, {
      method: 'PATCH',
      headers,
      body: JSON.stringify({ hasFlightMode: enable })
    });
    return res.ok;
  } catch (error) {
    console.error("Error toggling flight mode:", error);
    return false;
  }
};
