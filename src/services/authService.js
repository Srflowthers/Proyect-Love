import { signInWithPopup, signOut } from 'firebase/auth';
import { auth, googleProvider } from '@/config/firebase';

import { saveUserToDatabase } from './userService';

export const loginWithGoogle = async (turnstileToken) => {
  try {
    const result = await signInWithPopup(auth, googleProvider);
    if (turnstileToken) {
      await saveUserToDatabase(result.user, turnstileToken);
    }
    return { user: result.user, error: null };
  } catch (error) {
    console.error("Error en login:", error);
    return { user: null, error: 'Error al iniciar sesión con Google.' };
  }
};

export const logout = async () => {
  try {
    await signOut(auth);
  } catch (error) {
    console.error("Error cerrando sesión:", error);
  }
};

export const makeUserAdminDevMode = async (user) => {
  try {
    const token = await user.getIdToken();
    const apiUrl = import.meta.env.VITE_API_URL || 'http://localhost:8787';
    await fetch(`${apiUrl}/api/make-me-admin`, {
      method: 'POST',
      headers: { 'Authorization': `Bearer ${token}` }
    });
    return true;
  } catch (error) {
    console.error("Error al hacerte admin:", error);
    return false;
  }
};
