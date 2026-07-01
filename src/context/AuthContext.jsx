import { createContext, useContext, useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';
import { isCurrentUserAdmin } from '../services/adminService';
import { fetchMyStudentProfile, signInStudent } from '../services/studentsService';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [session, setSession] = useState(null);
  const [loading, setLoading] = useState(true);
  const [isAdmin, setIsAdmin] = useState(false);
  const [adminLoading, setAdminLoading] = useState(true);
  const [studentProfile, setStudentProfile] = useState(null);
  const [isStudent, setIsStudent] = useState(false);

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

  const refreshStudentProfile = async (targetUser) => {
    if (!supabase || !targetUser) {
      setStudentProfile(null);
      setIsStudent(false);
      return null;
    }

    try {
      const profile = await fetchMyStudentProfile();
      setStudentProfile(profile);
      setIsStudent(!!profile);
      return profile;
    } catch (error) {
      console.error('[student check failed]', error);
      setStudentProfile(null);
      setIsStudent(false);
      return null;
    }
  };

  useEffect(() => {
    if (!supabase) {
      setLoading(false);
      setAdminLoading(false);
      return;
    }

    // Tracks the signed-in user's ID so we can detect real identity changes
    // in onAuthStateChange (vs. harmless token refreshes on tab focus).
    let currentUserId = null;

    // Get initial session
    supabase.auth.getSession().then(async ({ data: { session } }) => {
      const nextUser = session?.user ?? null;
      currentUserId = nextUser?.id ?? null;
      setSession(session);
      setUser(nextUser);
      setLoading(false);
      setAdminLoading(true);
      await refreshAdminState(nextUser);
      await refreshStudentProfile(nextUser);
      setAdminLoading(false);
    });

    // Listen for auth changes.
    // IMPORTANT: We only re-verify admin status when the user identity actually
    // changes (different user id, or sign-out). Token refreshes (TOKEN_REFRESHED)
    // and other events that leave the same user logged in must NOT flip
    // adminLoading=true, because RequireAuth replaces its children with a spinner
    // while adminLoading is true — unmounting the admin page and wiping all
    // unsaved form state (e.g. open modals).
    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (_event, session) => {
      const nextUser = session?.user ?? null;
      const nextUserId = nextUser?.id ?? null;

      // Same user — only update session ref, do NOT re-check admin or touch adminLoading
      if (nextUserId === currentUserId) {
        setSession(session);
        return;
      }

      // User actually changed (sign-in, sign-out, account switch)
      currentUserId = nextUserId;
      setSession(session);
      setUser(nextUser);
      setAdminLoading(true);
      await refreshAdminState(nextUser);
      await refreshStudentProfile(nextUser);
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

  const signInAsStudent = async (phone, password) => {
    const data = await signInStudent({ phone, password });
    return data;
  };

  const signOut = async () => {
    if (!supabase) return;
    await supabase.auth.signOut();
    setIsAdmin(false);
    setStudentProfile(null);
    setIsStudent(false);
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        session,
        loading,
        isAdmin,
        adminLoading,
        studentProfile,
        isStudent,
        refreshAdminState,
        refreshStudentProfile,
        signIn,
        signInAsStudent,
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
