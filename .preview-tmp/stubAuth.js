// Dev-only stub of AuthContext: pretends a student is signed in.
export function useAuth() {
  return {
    user: { id: 's2', email: 'student@example.com' },
    session: { user: { id: 's2' } },
    loading: false,
    isAdmin: false,
    adminLoading: false,
    studentProfile: { id: 's2', full_name: 'محمود المشارك' },
    isStudent: true,
    signIn: async () => {},
    signOut: async () => {},
    refreshStudentProfile: async () => {},
  };
}

export function AuthProvider({ children }) {
  return children;
}
