import { createContext, useContext, useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';
import { isCurrentUserAdmin } from '../services/adminService';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [session, setSession] = useState(null);
  const [loading, setLoading] = useState(true);
  const [isAdmin, setIsAdmin] = useState(false);
  const [adminLoading, setAdminLoading] = useState(true);

  const refreshAdminState = async (targetUser) => {
    if (!supabase || !targetUser) {
      setIsAdmin(false);
      return false;
    }

    try {
      const admin = await isCurrentUserAdmin();
      setIsAdmin(admin);
      return admin;
    } catch (error) {
      console.error('[admin check failed]', error);
      setIsAdmin(false);
      return false;
    }
  };

  useEffect(() => {
    if (!supabase) {
      setLoading(false);
      setAdminLoading(false);
      return;
    }

    // Get initial session
    supabase.auth.getSession().then(async ({ data: { session } }) => {
      const nextUser = session?.user ?? null;
      setSession(session);
      setUser(nextUser);
      setLoading(false);
      setAdminLoading(true);
      await refreshAdminState(nextUser);
      setAdminLoading(false);
    });

    // Listen for auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (_event, session) => {
      const nextUser = session?.user ?? null;
      setSession(session);
      setUser(nextUser);
      setAdminLoading(true);
      await refreshAdminState(nextUser);
      setAdminLoading(false);
    });

    return () => subscription.unsubscribe();
  }, []);

  const signIn = async (email, password) => {
    if (!supabase) throw new Error('Supabase not configured');
    const { data, error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) throw error;
    return data;
  };

  const signOut = async () => {
    if (!supabase) return;
    await supabase.auth.signOut();
    setIsAdmin(false);
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        session,
        loading,
        isAdmin,
        adminLoading,
        refreshAdminState,
        signIn,
        signOut,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used inside AuthProvider');
  return ctx;
}
