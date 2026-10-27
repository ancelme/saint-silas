import React, { createContext, useContext, useState, useEffect } from 'react';
import { User } from '../types';
import {
  loginUser,
  completeFirstLogin,
  getCurrentUser,
  updateProfile,
  changePassword,
  logoutUser,
  getSetupStatus,
  setupInitialOwner,
  clearAuthToken
} from '../services/api';
import { connectChatSocket, disconnectChatSocket } from '../services/chatSocket';

interface AuthContextType {
  user: User | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  isOwnerConfigured: boolean;
  defaultOwnerUsername: string;
  mustChangePassword: boolean;
  dbEngine: string;
  checkSystemStatus: () => Promise<void>;
  login: (identifier: string, password: string) => Promise<{ success: boolean; mustChangePassword?: boolean; error?: string }>;
  completeFirstTimePasswordSetup: (payload: {
    currentPassword: string;
    newPassword: string;
    recoveryEmail: string;
    recoveryPhone: string;
  }) => Promise<{ success: boolean; error?: string }>;
  setupOwner: (payload: { fullName: string; email: string; username: string; password: string; phone?: string; avatar: string }) => Promise<{ success: boolean; error?: string }>;
  updateUserAvatar: (avatarUrl: string) => Promise<void>;
  updateUser: (updates: Partial<User>) => Promise<void>;
  changeAccountPassword: (currentPassword: string, newPassword: string) => Promise<{ success: boolean; error?: string }>;
  logout: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [isOwnerConfigured, setIsOwnerConfigured] = useState<boolean>(true);
  const [defaultOwnerUsername, setDefaultOwnerUsername] = useState<string>('innocent');
  const [mustChangePassword, setMustChangePassword] = useState<boolean>(false);
  const [dbEngine, setDbEngine] = useState<string>('sqlite');

  useEffect(() => {
    if (user) {
      connectChatSocket();
      return;
    }
    disconnectChatSocket();
  }, [user?.id]);

  const checkSystemStatus = async () => {
    try {
      const status = await getSetupStatus();
      setIsOwnerConfigured(status.isOwnerConfigured);
      setDefaultOwnerUsername(status.defaultOwnerUsername || 'innocent');
      setDbEngine(status.dbEngine);
    } catch (e) {
      console.warn('Could not check setup status:', e);
    }
  };

  useEffect(() => {
    const initializeAuth = async () => {
      setIsLoading(true);
      await checkSystemStatus();

      try {
        const profile = await getCurrentUser();
        setUser({
          ...profile,
          name: profile.fullName || profile.username,
        });
        if (profile.mustChangePassword) {
          setMustChangePassword(true);
        }
      } catch (err) {
        console.warn('Auth session expired or invalid:', err);
        clearAuthToken();
        setUser(null);
        setMustChangePassword(false);
      }
      setIsLoading(false);
    };

    initializeAuth();
  }, []);

  const login = async (identifier: string, password: string): Promise<{ success: boolean; mustChangePassword?: boolean; error?: string }> => {
    try {
      const res = await loginUser({ identifier, password });
      if (res && res.user) {
        setUser({
          ...res.user,
          name: res.user.fullName || res.user.username,
        });
        const needsChange = !!res.mustChangePassword || res.user.mustChangePassword === true || res.user.status === 'PENDING_FIRST_LOGIN';
        setMustChangePassword(needsChange);
        return { success: true, mustChangePassword: needsChange };
      }
      return { success: false, error: 'Login failed' };
    } catch (err: any) {
      return { success: false, error: err.message || 'Authentication error' };
    }
  };

  const completeFirstTimePasswordSetup = async (payload: {
    currentPassword: string;
    newPassword: string;
    recoveryEmail: string;
    recoveryPhone: string;
  }): Promise<{ success: boolean; error?: string }> => {
    try {
      const res = await completeFirstLogin(payload);
      if (res && res.user) {
        setUser({
          ...res.user,
          name: res.user.fullName || res.user.username,
        });
        setMustChangePassword(false);
        return { success: true };
      }
      return { success: false, error: 'Failed to update credentials' };
    } catch (err: any) {
      return { success: false, error: err.message || 'Password update error' };
    }
  };

  const setupOwner = async (payload: {
    fullName: string;
    email: string;
    username: string;
    password: string;
    phone?: string;
    avatar: string;
  }): Promise<{ success: boolean; error?: string }> => {
    try {
      const res = await setupInitialOwner(payload);
      if (res && res.user) {
        setUser({
          ...res.user,
          name: res.user.fullName || res.user.username,
        });
        setIsOwnerConfigured(true);
        setMustChangePassword(true);
        return { success: true };
      }
      return { success: false, error: 'Failed to initialize owner account' };
    } catch (err: any) {
      return { success: false, error: err.message || 'Setup error' };
    }
  };

  const updateUserAvatar = async (avatarUrl: string) => {
    try {
      await updateProfile({ avatarUrl });
      setUser(prev => (prev ? { ...prev, avatar: avatarUrl } : null));
    } catch (err) {
      console.error('Failed to update avatar:', err);
    }
  };

  const updateUser = async (updates: Partial<User>) => {
    try {
      await updateProfile(updates);
      setUser(prev => (prev ? { ...prev, ...updates } : null));
    } catch (err) {
      console.error('Failed to update user:', err);
    }
  };

  const changeAccountPassword = async (currentPassword: string, newPassword: string) => {
    try {
      const res = await changePassword({ currentPassword, newPassword });
      return { success: true, message: res.message };
    } catch (err: any) {
      return { success: false, error: err.message || 'Failed to change password' };
    }
  };

  const logout = async () => {
    try {
      await logoutUser();
    } catch (err) {
      console.warn('Logout error:', err);
    } finally {
      setUser(null);
      setMustChangePassword(false);
      clearAuthToken();
    }
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        isAuthenticated: !!user,
        isLoading,
        isOwnerConfigured,
        defaultOwnerUsername,
        mustChangePassword,
        dbEngine,
        checkSystemStatus,
        login,
        completeFirstTimePasswordSetup,
        setupOwner,
        updateUserAvatar,
        updateUser,
        changeAccountPassword,
        logout,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = (): AuthContextType => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
