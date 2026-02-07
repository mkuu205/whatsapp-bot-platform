// web-platform/frontend/src/contexts/AuthContext.jsx
import React, { createContext, useState, useContext, useEffect } from 'react';
import api from '../api/axios'; // Import our custom axios instance

const AuthContext = createContext();

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within AuthProvider');
  }
  return context;
};

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    checkAuth();
  }, []);

  const checkAuth = async () => {
    try {
      const token = localStorage.getItem('access_token');
      
      if (!token) {
        setLoading(false);
        return;
      }
      
      // Fetch REAL user from backend
      const response = await api.get('/api/auth/me');
      
      if (response.data) {
        setUser(response.data);
      } else {
        // Clear invalid token
        localStorage.removeItem('access_token');
      }
    } catch (error) {
      console.error('Auth check failed:', error);
      
      // If it's a 401 error, clear the token
      if (error.response?.status === 401) {
        localStorage.removeItem('access_token');
      }
    } finally {
      setLoading(false);
    }
  };

  const login = async (email, password) => {
    try {
      console.log('Login attempt for:', email);
      
      const response = await api.post('/api/auth/login', {
        email,
        password
      });
      
      console.log('Login response:', response.data);
      
      const { token, user: userData } = response.data;
      
      if (!token) {
        throw new Error('No token received from server');
      }
      
      // Store token
      localStorage.setItem('access_token', token);
      
      // Set user
      setUser(userData);
      
      return { success: true, user: userData };
    } catch (error) {
      console.error('Login error details:', error.response?.data || error.message);
      
      return { 
        success: false, 
        error: error.response?.data?.error || 'Login failed. Please try again.' 
      };
    }
  };

  const register = async (userData) => {
    try {
      const response = await api.post('/api/auth/register', userData);
      
      const { token, user: newUser } = response.data;
      
      if (!token) {
        throw new Error('No token received from server');
      }
      
      // Store token
      localStorage.setItem('access_token', token);
      
      // Set user
      setUser(newUser);
      
      return { success: true, user: newUser };
    } catch (error) {
      console.error('Registration error:', error.response?.data || error.message);
      
      return { 
        success: false, 
        error: error.response?.data?.error || 'Registration failed' 
      };
    }
  };

  const logout = () => {
    localStorage.removeItem('access_token');
    setUser(null);
    // Redirect to login page
    window.location.href = '/login';
  };

  const updateUser = (updates) => {
    setUser(prev => ({ ...prev, ...updates }));
  };

  const value = {
    user,
    loading,
    login,
    register,
    logout,
    updateUser,
    checkAuth
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
};
