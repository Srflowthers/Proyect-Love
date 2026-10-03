import { doc, setDoc, getDoc, collection, getDocs } from 'firebase/firestore';
import { db } from '@/config/firebase';

export const saveUserToDatabase = async (user) => {
  try {
    const userRef = doc(db, 'users', user.uid);
    const userSnap = await getDoc(userRef);
    
    if (!userSnap.exists()) {
      await setDoc(userRef, {
        email: user.email,
        name: user.displayName || 'Sin nombre',
        role: 'client',
        createdAt: new Date()
      });
    }
  } catch (error) {
    console.error("Error guardando usuario en Firestore:", error);
  }
};

export const fetchAllClients = async () => {
  try {
    const querySnapshot = await getDocs(collection(db, 'users'));
    const usersList = querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
    return usersList.filter(u => u.role === 'client');
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
    const userRef = doc(db, 'users', userId);
    await setDoc(userRef, { plan: planId }, { merge: true });
    return true;
  } catch (error) {
    console.error("Error actualizando plan:", error);
    return false;
  }
};

export const toggleClientFlightMode = async (userId, enable) => {
  try {
    const userRef = doc(db, 'users', userId);
    await setDoc(userRef, { hasFlightMode: enable }, { merge: true });
    return true;
  } catch (error) {
    console.error("Error toggling flight mode:", error);
    return false;
  }
};
