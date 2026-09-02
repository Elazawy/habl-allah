import { createContext, useContext, useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';
import { isCurrentUserAdmin } from '../services/adminService';
import { fetchMyStudentProfile, signInStudent } from '../services/studentsService';

const AuthContext = createContext(null);

/**
 * Last-resort ceiling for the initial auth handshake.
 *
 * Every path below clears the loading flags in a `finally`/`allSettled`, so
 * this timer should never fire. It exists because a handful of Supabase calls
 * await the client's internal `initializePromise` *before* issuing any HTTP
 * request, which means the per-request timeout in `lib/supabase.js` cannot
 * rescue them. Without this net, such a stall would leave the visitor staring
 * at a spinner until they reloaded the page.
 */
const AUTH_BOOTSTRAP_TIMEOUT_MS = 20_000;

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
      const admin = await isCurrentUserAdmin(targetUser.id);
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
      const profile = await fetchMyStudentProfile(targetUser.id);
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

    let disposed = false;

    // The identity whose roles we have resolved (or are resolving). Lets us
    // ignore the token refreshes Supabase emits on tab focus, which must NOT
    // flip adminLoading back to true — RequireAuth swaps its children for a
    // spinner while adminLoading is true, which would unmount the admin page
    // and wipe unsaved form state (e.g. open modals).
    let resolvedUserId = null;
    let identityClaimed = false;

    // Monotonic ticket so a slow role lookup can never overwrite the result of
    // a newer one (e.g. a sign-out landing while the previous check is still
    // in flight).
    let generation = 0;

    const bootstrapTimer = setTimeout(() => {
      if (disposed) return;
      console.warn('[auth] initial session timed out; continuing as signed out');
      setLoading(false);
      setAdminLoading(false);
    }, AUTH_BOOTSTRAP_TIMEOUT_MS);

    /**
     * Records `nextUser` as the identity we're resolving.
     * Returns false when it's the same identity we already handled, so both
     * callers below can skip redundant lookups.
     */
    const claimIdentity = (nextUser) => {
      const nextId = nextUser?.id ?? null;
      if (identityClaimed && nextId === resolvedUserId) return false;
      identityClaimed = true;
      resolvedUserId = nextId;
      return true;
    };

    /**
     * Look up the admin flag and student profile for `nextUser`.
     *
     * Never call this synchronously from inside an `onAuthStateChange`
     * callback — see the note on the subscription below.
     */
    const resolveRoles = async (nextUser) => {
      const ticket = ++generation;

      if (!nextUser) {
        setIsAdmin(false);
        setStudentProfile(null);
        setIsStudent(false);
        setAdminLoading(false);
        return;
      }

      setAdminLoading(true);

      // Both lookups are independent, so run them together — serialising them
      // doubles the time to first paint on a slow connection.
      const [adminResult, profileResult] = await Promise.allSettled([
        isCurrentUserAdmin(nextUser.id),
        fetchMyStudentProfile(nextUser.id),
      ]);

      // A newer identity arrived while we were waiting; its result wins.
      if (disposed || ticket !== generation) return;

      if (adminResult.status === 'fulfilled') {
        setIsAdmin(adminResult.value);
      } else {
        console.error('[admin check failed]', adminResult.reason);
        setIsAdmin(false);
      }

      if (profileResult.status === 'fulfilled') {
        setStudentProfile(profileResult.value);
        setIsStudent(!!profileResult.value);
      } else {
        console.error('[student check failed]', profileResult.reason);
        setStudentProfile(null);
        setIsStudent(false);
      }

      setAdminLoading(false);
    };

    // Initial session — resolved from local storage, refreshing the token first
    // if it is close to expiry. This is what decides the very first render.
    supabase.auth
      .getSession()
      .then(async ({ data, error }) => {
        if (error) console.error('[initial session failed]', error);
        if (disposed) return;

        const nextSession = data?.session ?? null;
        const nextUser = nextSession?.user ?? null;

        setSession(nextSession);
        setUser(nextUser);
        setLoading(false);

        // The subscription below fires an INITIAL_SESSION event that can beat
        // this promise; if it already claimed this identity, it owns the lookup.
        if (claimIdentity(nextUser)) await resolveRoles(nextUser);
      })
      .catch((error) => {
        // Never strand the app on a spinner because the handshake threw.
        console.error('[initial session failed]', error);
        if (disposed) return;
        setSession(null);
        setUser(null);
        setLoading(false);
        setAdminLoading(false);
      })
      .finally(() => clearTimeout(bootstrapTimer));

    // IMPORTANT — this callback MUST stay synchronous.
    //
    // auth-js awaits every subscriber from *inside* its own `initialize()`
    // (`_recoverAndRefresh` → `_notifyAllSubscribers`), while every Supabase
    // call first awaits that same `initializePromise` — `auth.getUser()`
    // directly, and any `.from()` query indirectly, since PostgREST fetches its
    // access token through `auth.getSession()`. Awaiting Supabase here
    // therefore deadlocks the client: initialize() waits on us, we wait on
    // initialize(). Nothing resolves, `loading`/`adminLoading` stay true, and
    // the visitor sits on an endless spinner until they reload the page.
    //
    // So: apply synchronous state here, and hand any Supabase work to a
    // separate task that runs after this callback — and therefore after
    // initialize() — has returned.
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, nextSession) => {
      if (disposed) return;

      const nextUser = nextSession?.user ?? null;
      setSession(nextSession);

      // Same user: a token refresh or a focus-triggered recovery. Leave the
      // role state (and adminLoading) exactly as it is.
      if (!claimIdentity(nextUser)) return;

      // The user actually changed (sign-in, sign-out, account switch).
      setUser(nextUser);
      setLoading(false);

      // Deferred — see the note above.
      setTimeout(() => {
        if (disposed) return;
        resolveRoles(nextUser);
      }, 0);
    });

    return () => {
      disposed = true;
      clearTimeout(bootstrapTimer);
      subscription.unsubscribe();
    };
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
