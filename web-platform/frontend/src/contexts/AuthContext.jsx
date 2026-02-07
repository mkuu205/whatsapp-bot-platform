// web-platform/frontend/src/contexts/AuthContext.jsx - UPDATED
import React, { createContext, useState, useContext, useEffect } from 'react';
import axios from '../api/axios'; // Import configured axios

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
      
      // Fetch user from backend - FIXED PATH
      const response = await axios.get('/api/auth/me');
      
      if (response.data) {
        setUser(response.data);
        // Also store user in localStorage for quick access
        localStorage.setItem('user', JSON.stringify(response.data));
      } else {
        localStorage.removeItem('access_token');
        localStorage.removeItem('user');
      }
    } catch (error) {
      console.error('Auth check failed:', error);
      localStorage.removeItem('access_token');
      localStorage.removeItem('user');
    } finally {
      setLoading(false);
    }
  };

  const login = async (email, password) => {
    try {
      console.log('Login attempt for:', email);
      
      // FIXED PATH: /api/auth/login instead of /auth/login
      const response = await axios.post('/api/auth/login', {
        email,
        password
      });
      
      console.log('Login response:', response.data);
      
      const { token, user: userData } = response.data;
      
      if (!token) {
        throw new Error('No token received from server');
      }
      
      // Store token and user
      localStorage.setItem('access_token', token);
      localStorage.setItem('user', JSON.stringify(userData));
      
      // Set user in state
      setUser(userData);
      
      return { success: true, user: userData };
    } catch (error) {
      console.error('Login error:', error.response?.data || error.message);
      
      return { 
        success: false, 
        error: error.response?.data?.error || 'Login failed. Please try again.' 
      };
    }
  };

  const register = async (userData) => {
    try {
      // FIXED PATH: /api/auth/register
      const response = await axios.post('/api/auth/register', userData);
      
      const { token, user: newUser } = response.data;
      
      if (!token) {
        throw new Error('No token received from server');
      }
      
      // Store token and user
      localStorage.setItem('access_token', token);
      localStorage.setItem('user', JSON.stringify(newUser));
      
      // Set user in state
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
    localStorage.removeItem('user');
    setUser(null);
    // Redirect to home page
    window.location.href = '/';
  };

  const updateUser = (updates) => {
    const updatedUser = { ...user, ...updates };
    setUser(updatedUser);
    localStorage.setItem('user', JSON.stringify(updatedUser));
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
