import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactElement,
  type ReactNode,
} from 'react';

import { supabase } from '../../lib/supabaseclient';
import {
  deleteUser as deleteUserRecord,
  fetchAppUsers,
  getCurrentAuthenticatedUser,
  getPendingLandlordCount,
  loginUser,
  logoutUser,
  onAuthStateChange,
  persistCurrentUser,
  signupUser,
  updateUser as updateUserRecord,
  verifyLandlord as verifyLandlordRecord,
  type AuthCredentials,
  type CreateUserInput,
  type UpdateUserInput,
  type User,
  type UserRole
} from '../services/authService';

export type { UserRole };

export interface AuthActionResult {
  success: boolean;
  error?: string;
  user?: User;
}

export interface AuthContextType {
  currentUser: User | null;
  user: User | null;
  users: User[];
  pendingLandlordCount: number;
  isLoading: boolean;
  isAuthenticated: boolean;
  refreshUsers: () => Promise<void>;
  login: (credentials: AuthCredentials) => Promise<AuthActionResult>;
  signup: (input: CreateUserInput) => Promise<AuthActionResult>;
  updateUser: (userId: string, updates: UpdateUserInput) => Promise<User>;
  deleteUser: (userId: string) => Promise<void>;
  verifyLandlord: (userId: string, verified?: boolean) => Promise<User>;
  canEditApartment: (apartmentId: string, landlordId?: string) => boolean;
  logout: () => void;
}

function getErrorMessage(error: unknown, fallback: string): string {
  if (error instanceof Error && error.message.trim().length > 0) {
    return error.message;
  }

  return fallback;
}

export const AuthContext = createContext<AuthContextType | undefined>(undefined);

interface AuthProviderProps {
  children: ReactNode;
}

export function AuthProvider({ children }: AuthProviderProps): ReactElement {
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [users, setUsers] = useState<User[]>([]);
  const [pendingLandlordCount, setPendingLandlordCount] = useState(0);
  const [isLoading, setIsLoading] = useState(true);

  const refreshUsers = useCallback(async () => {
    const [allUsers, pendingCount] = await Promise.all([fetchAppUsers(), getPendingLandlordCount()]);
    setUsers(allUsers);
    setPendingLandlordCount(pendingCount);

    if (currentUser !== null) {
      const refreshedCurrentUser = allUsers.find((user) => user.id === currentUser.id);
      if (refreshedCurrentUser) {
        setCurrentUser(refreshedCurrentUser);
        persistCurrentUser(refreshedCurrentUser);
      } else {
        setCurrentUser(null);
        persistCurrentUser(null);
      }
    }
  }, [currentUser]);

  useEffect(() => {
    let isActive = true;

    const initializeAuth = async (): Promise<void> => {
      try {
        const [allUsers, pendingCount] = await Promise.all([fetchAppUsers(), getPendingLandlordCount()]);

        if (!isActive) {
          return;
        }

        setUsers(allUsers);
        setPendingLandlordCount(pendingCount);

        const authenticatedUser = await getCurrentAuthenticatedUser();
        if (!isActive) return;

        setCurrentUser(authenticatedUser);
      } catch (error) {
        if (!isActive) {
          return;
        }

        console.error('Failed to initialize auth state:', error);
        setUsers([]);
        setPendingLandlordCount(0);
        setCurrentUser(null);
        persistCurrentUser(null);
      } finally {
        if (isActive) {
          setIsLoading(false);
        }
      }
    };

    void initializeAuth();

    return () => {
      isActive = false;
    };
  }, []);

  useEffect(() => {
    return onAuthStateChange((authUser) => {
      setCurrentUser(authUser);
    });
  }, []);

  useEffect(() => {
    const refreshOnFocus = () => void refreshUsers().catch(() => undefined);
    const refreshWhenVisible = () => {
      if (document.visibilityState === 'visible') refreshOnFocus();
    };
    window.addEventListener('focus', refreshOnFocus);
    document.addEventListener('visibilitychange', refreshWhenVisible);
    return () => {
      window.removeEventListener('focus', refreshOnFocus);
      document.removeEventListener('visibilitychange', refreshWhenVisible);
    };
  }, [refreshUsers]);

  useEffect(() => {
    let refreshTimer: ReturnType<typeof setTimeout> | null = null;
    const scheduleRefresh = () => {
      if (refreshTimer) clearTimeout(refreshTimer);
      refreshTimer = setTimeout(() => void refreshUsers().catch(() => undefined), 100);
    };
    const channel = supabase
      .channel('auth-verification-sync')
      .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'app_users' }, scheduleRefresh)
      .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'apartments' }, scheduleRefresh)
      .subscribe();

    return () => {
      if (refreshTimer) clearTimeout(refreshTimer);
      void supabase.removeChannel(channel);
    };
  }, [refreshUsers]);

  const login = useCallback(async (credentials: AuthCredentials): Promise<AuthActionResult> => {
    try {
      const user = await loginUser(credentials);
      setCurrentUser(user);
      persistCurrentUser(user);
      void refreshUsers().catch((refreshError) => {
        console.warn('Failed to refresh users after login:', refreshError);
      });
      return { success: true, user };
    } catch (error) {
      return { success: false, error: getErrorMessage(error, 'Invalid email or password.') };
    }
  }, [refreshUsers]);

  const signup = useCallback(async (input: CreateUserInput): Promise<AuthActionResult> => {
    try {
      const user = await signupUser(input);
      void refreshUsers().catch((refreshError) => {
        console.warn('Failed to refresh users after signup:', refreshError);
      });
      return { success: true, user };
    } catch (error) {
      return { success: false, error: getErrorMessage(error, 'Unable to create account.') };
    }
  }, [refreshUsers]);

  const updateUser = useCallback(async (userId: string, updates: UpdateUserInput): Promise<User> => {
    const updatedUser = await updateUserRecord(userId, updates);
    setUsers((previousUsers) => previousUsers.map((user) => (user.id === userId ? updatedUser : user)));

    if (currentUser?.id === userId) {
      setCurrentUser(updatedUser);
      persistCurrentUser(updatedUser);
    }

    const pendingCount = await getPendingLandlordCount();
    setPendingLandlordCount(pendingCount);

    return updatedUser;
  }, [currentUser?.id]);

  const deleteUser = useCallback(async (userId: string): Promise<void> => {
    await deleteUserRecord(userId);
    setUsers((previousUsers) => previousUsers.filter((user) => user.id !== userId));

    if (currentUser?.id === userId) {
      setCurrentUser(null);
      persistCurrentUser(null);
    }

    const pendingCount = await getPendingLandlordCount();
    setPendingLandlordCount(pendingCount);
  }, [currentUser?.id]);

  const verifyLandlord = useCallback(async (userId: string, verified = true): Promise<User> => {
    const updatedUser = await verifyLandlordRecord(userId, verified);
    setUsers((previousUsers) => previousUsers.map((user) => (user.id === userId ? updatedUser : user)));

    if (currentUser?.id === userId) {
      setCurrentUser(updatedUser);
      persistCurrentUser(updatedUser);
    }

    const pendingCount = await getPendingLandlordCount();
    setPendingLandlordCount(pendingCount);

    return updatedUser;
  }, [currentUser?.id]);

  const logout = useCallback(() => {
    setCurrentUser(null);
    persistCurrentUser(null);
    void logoutUser().catch((logoutError) => {
      console.warn('Failed to sign out from Supabase Auth:', logoutError);
    });
  }, []);

  const canEditApartment = useCallback(
    (apartmentId: string, landlordId?: string) => {
      if (!currentUser || currentUser.role !== 'landlord' || !currentUser.isVerified) {
        return false;
      }

      if (landlordId) {
        return landlordId === currentUser.id;
      }

      return Boolean(apartmentId);
    },
    [currentUser],
  );

  const contextValue = useMemo<AuthContextType>(
    () => ({
      currentUser,
      user: currentUser,
      users,
      pendingLandlordCount,
      isLoading,
      isAuthenticated: currentUser !== null,
      refreshUsers,
      login,
      signup,
      updateUser,
      deleteUser,
      verifyLandlord,
      canEditApartment,
      logout,
    }),
    [
      currentUser,
      users,
      pendingLandlordCount,
      isLoading,
      refreshUsers,
      login,
      signup,
      updateUser,
      deleteUser,
      verifyLandlord,
      canEditApartment,
      logout,
    ],
  );

  return <AuthContext.Provider value={contextValue}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthContextType {
  const context = useContext(AuthContext);

  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }

  return context;
}

export type { User };
