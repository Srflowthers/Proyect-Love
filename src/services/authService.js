import { signInWithPopup, signOut, getAdditionalUserInfo, deleteUser } from 'firebase/auth';
import { auth, googleProvider } from '@/config/firebase';

import { saveUserToDatabase } from './userService';

export const loginWithGoogle = async (turnstileToken, acceptedTerms) => {
  try {
    const result = await signInWithPopup(auth, googleProvider);
    const details = getAdditionalUserInfo(result);
    
    // Si es un usuario nuevo, DEBE haber aceptado los términos
    if (details?.isNewUser && !acceptedTerms) {
      await deleteUser(result.user);
      return { user: null, error: 'Para registrar una cuenta nueva, debes aceptar los Términos y Condiciones.' };
    }

    const saveResult = await saveUserToDatabase(result.user, turnstileToken);
    if (saveResult && !saveResult.success) {
      console.warn("Aviso al sincronizar perfil en backend:", saveResult.error);
      // Solo forzar cierre de sesión si es un usuario totalmente nuevo que falló al registrarse
      if (details?.isNewUser) {
        await signOut(auth);
        return { user: null, error: saveResult.error || 'Error al crear tu perfil en la base de datos.' };
      }
      // Si el usuario ya existe, permitimos continuar para que no sea expulsado por errores temporales de sincronización
    }

    return { user: result.user, error: null };
  } catch (error) {
    console.warn("Estado en login:", error?.code || error);
    if (error.code === 'auth/cancelled-popup-request' || error.code === 'auth/popup-closed-by-user') {
      return { user: null, error: null }; // Simplemente se cerró o se hizo doble clic, no mostrar error al usuario
    }
    const msg = error.message || 'Error al iniciar sesión con Google.';
    return { user: null, error: msg };
  }
};

export const logout = async () => {
  try {
    sessionStorage.removeItem('arcade_session_auth');
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
