import { createContext, useContext, useState, useEffect, type ReactNode } from 'react';
import type { User } from '../types/auth';
import { getCanonicalEmail, runAllUserMigrations } from '../utils/userMapping';

interface AuthContextType {
  user: User | null;
  isAuthenticated: boolean;
  isAuthModalOpen: boolean;
  googleClientId: string;
  openAuthModal: () => void;
  closeAuthModal: () => void;
  setUserProfile: (user: User) => void;
  loginWithGoogle: (customEmail?: string, customName?: string, customAvatar?: string, googleSubId?: string) => Promise<User>;
  loginWithFacebook: (customEmail?: string, customName?: string) => Promise<User>;
  loginWithEmail: (email: string, name: string) => Promise<User>;
  logout: () => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

const USER_STORAGE_KEY = 'watchflix_user_session';

export function AuthProvider({ children }: { children: ReactNode }) {
  const googleClientId =
    import.meta.env.VITE_GOOGLE_CLIENT_ID ||
    '1036162123114-b5ujr9g79e4qat72dusn37qr3t7037aj.apps.googleusercontent.com';

  const [user, setUser] = useState<User | null>(() => {
    try {
      runAllUserMigrations();
      const stored = localStorage.getItem(USER_STORAGE_KEY);
      if (stored) {
        const parsed: User = JSON.parse(stored);
        const canonical = getCanonicalEmail(parsed.email || parsed.id);
        if (canonical && canonical !== parsed.email) {
          parsed.id = canonical;
          parsed.email = canonical;
        }
        return parsed;
      }
      return null;
    } catch {
      return null;
    }
  });

  const [isAuthModalOpen, setIsAuthModalOpen] = useState(false);

  useEffect(() => {
    if (user) {
      localStorage.setItem(USER_STORAGE_KEY, JSON.stringify(user));
    } else {
      localStorage.removeItem(USER_STORAGE_KEY);
    }
  }, [user]);

  const openAuthModal = () => setIsAuthModalOpen(true);
  const closeAuthModal = () => setIsAuthModalOpen(false);

  const setUserProfile = (newUser: User) => {
    setUser(newUser);
    closeAuthModal();
  };

  const loginWithGoogle = async (
    customEmail?: string,
    customName?: string,
    customAvatar?: string,
    _googleSubId?: string
  ): Promise<User> => {
    const rawEmail = (customEmail || 'alex.streamer@gmail.com').toLowerCase().trim();
    const canonicalEmail = getCanonicalEmail(rawEmail);
    if (rawEmail !== canonicalEmail) {
      runAllUserMigrations();
    }
    const name = customName || canonicalEmail.split('@')[0];
    const avatar =
      customAvatar ||
      `https://api.dicebear.com/7.x/avataaars/svg?seed=${encodeURIComponent(name)}&backgroundColor=b6e3f4,c0aede,d1d4f9`;

    const newUser: User = {
      id: canonicalEmail,
      name,
      email: canonicalEmail,
      avatar,
      provider: 'google',
      joinedAt: Date.now(),
    };

    setUser(newUser);
    closeAuthModal();
    return newUser;
  };

  const loginWithFacebook = async (customEmail?: string, customName?: string): Promise<User> => {
    const rawEmail = (customEmail || 'jordan.moviebuff@facebook.com').toLowerCase().trim();
    const canonicalEmail = getCanonicalEmail(rawEmail);
    if (rawEmail !== canonicalEmail) {
      runAllUserMigrations();
    }
    const name = customName || 'Jordan Smith';
    const newUser: User = {
      id: canonicalEmail,
      name,
      email: canonicalEmail,
      avatar: `https://api.dicebear.com/7.x/avataaars/svg?seed=${encodeURIComponent(name)}&backgroundColor=ffd5dc,ffdfbf`,
      provider: 'facebook',
      joinedAt: Date.now(),
    };

    setUser(newUser);
    closeAuthModal();
    return newUser;
  };

  const loginWithEmail = async (email: string, name: string): Promise<User> => {
    const rawEmail = email.toLowerCase().trim();
    const canonicalEmail = getCanonicalEmail(rawEmail);
    if (rawEmail !== canonicalEmail) {
      runAllUserMigrations();
    }
    const formattedName = name.trim() || canonicalEmail.split('@')[0];
    const newUser: User = {
      id: canonicalEmail,
      name: formattedName,
      email: canonicalEmail,
      avatar: `https://api.dicebear.com/7.x/avataaars/svg?seed=${encodeURIComponent(formattedName)}&backgroundColor=d1d4f9`,
      provider: 'email',
      joinedAt: Date.now(),
    };

    setUser(newUser);
    closeAuthModal();
    return newUser;
  };

  const logout = () => {
    setUser(null);
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        isAuthenticated: !!user,
        isAuthModalOpen,
        googleClientId,
        openAuthModal,
        closeAuthModal,
        setUserProfile,
        loginWithGoogle,
        loginWithFacebook,
        loginWithEmail,
        logout,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
