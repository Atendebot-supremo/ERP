import React, { createContext, useContext, useState, useEffect } from 'react';

interface AuthContextType {
  isAuthenticated: boolean;
  email: string | null;
  login: (email: string, password: string) => Promise<boolean>;
  logout: () => void;
  isLoading: boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

const VALID_EMAIL = 'noralabsco@gmail.com';
const VALID_PASSWORD = 'lVUr120@5nj';

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [email, setEmail] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  // Check if user is already logged in (from localStorage)
  useEffect(() => {
    const savedEmail = localStorage.getItem('auth_email');
    if (savedEmail) {
      setEmail(savedEmail);
      setIsAuthenticated(true);
    }
    setIsLoading(false);
  }, []);

  const login = async (inputEmail: string, inputPassword: string): Promise<boolean> => {
    setIsLoading(true);
    try {
      // Simulate async login
      await new Promise(resolve => setTimeout(resolve, 500));

      if (inputEmail === VALID_EMAIL && inputPassword === VALID_PASSWORD) {
        setEmail(inputEmail);
        setIsAuthenticated(true);
        localStorage.setItem('auth_email', inputEmail);
        return true;
      }
      return false;
    } finally {
      setIsLoading(false);
    }
  };

  const logout = () => {
    setEmail(null);
    setIsAuthenticated(false);
    localStorage.removeItem('auth_email');
  };

  return (
    <AuthContext.Provider value={{ isAuthenticated, email, login, logout, isLoading }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useSimpleAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useSimpleAuth must be used within AuthProvider');
  }
  return context;
}
