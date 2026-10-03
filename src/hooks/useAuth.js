import { useState, useEffect } from 'react';
import { auth } from '@/config/firebase';
import { saveUserToDatabase } from '@/services/userService';

export const useAuth = () => {
  const [user, setUser] = useState(null);
  const [userRole, setUserRole] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const unsubscribe = auth.onAuthStateChanged(async (currentUser) => {
      setUser(currentUser);
      
      if (currentUser) {
        // Obtenemos el rol seguro del Backend (Custom Claims)
        const tokenResult = await currentUser.getIdTokenResult(true);
        setUserRole(tokenResult.claims.role || 'client');
      } else {
        setUserRole(null);
      }
      
      setLoading(false);
    });
    
    return () => unsubscribe();
  }, []);

  return { user, userRole, loading };
};
