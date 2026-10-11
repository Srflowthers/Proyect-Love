import { signInWithPopup, signOut, getAdditionalUserInfo, deleteUser } from 'firebase/auth';
import { auth, googleProvider } from '@/config/firebase';

import { saveUserToDatabase } from './userService';

export const loginWithGoogle = async (turnstileToken, acceptedTerms) => {
  try {
    const result = await signInWithPopup(auth, googleProvider);
    const details = getAdditionalUserInfo(result);
    
    // Si es un usuario nuevo, DEBE haber aceptado los términos
    if (details.isNewUser && !acceptedTerms) {
      await deleteUser(result.user);
      return { user: null, error: 'Para registrar una cuenta nueva, debes aceptar los Términos y Condiciones.' };
    }

    await saveUserToDatabase(result.user, turnstileToken);
    return { user: result.user, error: null };
  } catch (error) {
    console.error("Error en login:", error);
    const msg = error.code === 'auth/popup-closed-by-user' 
      ? 'Inicio de sesión cancelado.' 
      : (error.message || 'Error al iniciar sesión con Google.');
    return { user: null, error: msg };
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
    const apiUrl = (import.meta.env.VITE_API_URL || 'http://localhost:8787').replace(/\/+$/, '');
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
