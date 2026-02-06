// web-platform/frontend/src/pages/RegisterPage.jsx
import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';

function RegisterPage() {
  const [formData, setFormData] = useState({
    email: '',
    password: '',
    phone: '',
    agreeTerms: false
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const { register } = useAuth();
  const navigate = useNavigate();

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    
    if (!formData.agreeTerms) {
      setError('You must agree to the terms and conditions');
      return;
    }

    setLoading(true);

    try {
      const result = await register(formData);
      
      if (result.success) {
        navigate('/payment');
      } else {
        setError(result.error);
      }
    } catch (err) {
      setError('Registration failed. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={styles.container}>
      <div style={styles.card}>
        <div style={styles.header}>
          <h2>Create Account</h2>
          <p>Start your WhatsApp automation journey</p>
        </div>

        {error && (
          <div style={styles.error}>
            ⚠️ {error}
          </div>
        )}

        <form onSubmit={handleSubmit} style={styles.form}>
          <div style={styles.formGroup}>
            <label style={styles.label}>Email Address</label>
            <input
              type="email"
              name="email"
              value={formData.email}
              onChange={handleChange}
              placeholder="you@example.com"
              style={styles.input}
              required
              disabled={loading}
            />
          </div>

          <div style={styles.formGroup}>
            <label style={styles.label}>WhatsApp Number</label>
            <input
              type="tel"
              name="phone"
              value={formData.phone}
              onChange={handleChange}
              placeholder="+254712345678"
              style={styles.input}
              required
              disabled={loading}
            />
            <small style={styles.help}>Include country code for WhatsApp linking</small>
          </div>

          <div style={styles.formGroup}>
            <label style={styles.label}>Password</label>
            <input
              type="password"
              name="password"
              value={formData.password}
              onChange={handleChange}
              placeholder="••••••••"
              style={styles.input}
              required
              disabled={loading}
              minLength="6"
            />
          </div>

          <div style={styles.checkboxGroup}>
            <input
              type="checkbox"
              name="agreeTerms"
              checked={formData.agreeTerms}
              onChange={handleChange}
              id="terms"
              style={styles.checkbox}
            />
            <label htmlFor="terms" style={styles.checkboxLabel}>
              I agree to the <Link to="/terms" style={styles.link}>Terms of Service</Link> and <Link to="/privacy" style={styles.link}>Privacy Policy</Link>
            </label>
          </div>

          <button 
            type="submit" 
            style={styles.button} 
            disabled={loading || !formData.agreeTerms}
          >
            {loading ? 'Creating Account...' : 'Create Account'}
          </button>

          <p style={styles.loginText}>
            Already have an account? <Link to="/login" style={styles.loginLink}>Sign in</Link>
          </p>
        </form>
      </div>
    </div>
  );
}

const styles = {
  container: {
    display: 'flex',
    justifyContent: 'center',
    alignItems: 'center',
    minHeight: '80vh',
    padding: '20px',
  },
  card: {
    background: 'white',
    borderRadius: '20px',
    padding: '40px',
    width: '100%',
    maxWidth: '500px',
    boxShadow: '0 20px 60px rgba(0,0,0,0.1)',
  },
  header: {
    textAlign: 'center',
    marginBottom: '30px',
  },
  error: {
    background: '#fee2e2',
    color: '#dc2626',
    padding: '15px',
    borderRadius: '10px',
    marginBottom: '20px',
  },
  form: {
    display: 'flex',
    flexDirection: 'column',
    gap: '20px',
  },
  formGroup: {
    display: 'flex',
    flexDirection: 'column',
    gap: '8px',
  },
  label: {
    fontSize: '14px',
    fontWeight: '600',
    color: '#374151',
  },
  input: {
    padding: '14px',
    border: '1px solid #d1d5db',
    borderRadius: '10px',
    fontSize: '16px',
  },
  help: {
    color: '#6b7280',
    fontSize: '12px',
  },
  checkboxGroup: {
    display: 'flex',
    alignItems: 'flex-start',
    gap: '10px',
    margin: '10px 0',
  },
  checkbox: {
    marginTop: '3px',
  },
  checkboxLabel: {
    fontSize: '14px',
    color: '#6b7280',
    lineHeight: '1.4',
  },
  link: {
    color: '#6366f1',
    textDecoration: 'none',
  },
  button: {
    padding: '16px',
    background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
    color: 'white',
    border: 'none',
    borderRadius: '10px',
    fontSize: '16px',
    fontWeight: '600',
    cursor: 'pointer',
    marginTop: '10px',
  },
  loginText: {
    textAlign: 'center',
    color: '#6b7280',
    marginTop: '20px',
  },
  loginLink: {
    color: '#6366f1',
    textDecoration: 'none',
    fontWeight: '600',
  },
};

export default RegisterPage;
