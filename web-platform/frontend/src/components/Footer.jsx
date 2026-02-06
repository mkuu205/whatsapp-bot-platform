// web-platform/frontend/src/components/Footer.jsx
import React from 'react';
import { Link } from 'react-router-dom';

function Footer() {
  return (
    <footer style={styles.footer}>
      <div style={styles.container}>
        <div style={styles.grid}>
          <div style={styles.column}>
            <div style={styles.logo}>
              <span style={styles.logoIcon}>🤖</span>
              <span style={styles.logoText}>WhatsAppBot</span>
            </div>
            <p style={styles.description}>
              Automate your WhatsApp communication with our powerful bot platform.
            </p>
          </div>
          
          <div style={styles.column}>
            <h4 style={styles.columnTitle}>Platform</h4>
            <Link to="/" style={styles.link}>Home</Link>
            <Link to="/features" style={styles.link}>Features</Link>
            <Link to="/pricing" style={styles.link}>Pricing</Link>
            <Link to="/dashboard" style={styles.link}>Dashboard</Link>
          </div>
          
          <div style={styles.column}>
            <h4 style={styles.columnTitle}>Support</h4>
            <Link to="/help" style={styles.link}>Help Center</Link>
            <Link to="/docs" style={styles.link}>Documentation</Link>
            <Link to="/contact" style={styles.link}>Contact Us</Link>
            <Link to="/status" style={styles.link}>System Status</Link>
          </div>
          
          <div style={styles.column}>
            <h4 style={styles.columnTitle}>Legal</h4>
            <Link to="/terms" style={styles.link}>Terms of Service</Link>
            <Link to="/privacy" style={styles.link}>Privacy Policy</Link>
            <Link to="/cookies" style={styles.link}>Cookie Policy</Link>
            <Link to="/gdpr" style={styles.link}>GDPR</Link>
          </div>
        </div>
        
        <div style={styles.bottom}>
          <div style={styles.copyright}>
            © {new Date().getFullYear()} WhatsApp Bot Platform. All rights reserved.
          </div>
          <div style={styles.social}>
            <a href="https://twitter.com" style={styles.socialLink}>Twitter</a>
            <a href="https://github.com" style={styles.socialLink}>GitHub</a>
            <a href="https://discord.com" style={styles.socialLink}>Discord</a>
          </div>
        </div>
      </div>
    </footer>
  );
}

const styles = {
  footer: {
    background: '#f8fafc',
    borderTop: '1px solid #e5e7eb',
    padding: '40px 0 20px',
    marginTop: 'auto',
  },
  container: {
    maxWidth: '1400px',
    margin: '0 auto',
    padding: '0 20px',
  },
  grid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
    gap: '40px',
    marginBottom: '40px',
  },
  column: {
    display: 'flex',
    flexDirection: 'column',
    gap: '15px',
  },
  logo: {
    display: 'flex',
    alignItems: 'center',
    gap: '10px',
    fontSize: '20px',
    fontWeight: '700',
  },
  logoIcon: {
    fontSize: '24px',
  },
  logoText: {
    background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
    WebkitBackgroundClip: 'text',
    WebkitTextFillColor: 'transparent',
  },
  description: {
    color: '#6b7280',
    fontSize: '14px',
    lineHeight: '1.6',
  },
  columnTitle: {
    fontSize: '16px',
    fontWeight: '600',
    marginBottom: '10px',
  },
  link: {
    color: '#6b7280',
    textDecoration: 'none',
    fontSize: '14px',
    transition: 'color 0.3s ease',
  },
  linkHover: {
    color: '#6366f1',
  },
  bottom: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingTop: '20px',
    borderTop: '1px solid #e5e7eb',
    flexWrap: 'wrap',
    gap: '20px',
  },
  copyright: {
    color: '#6b7280',
    fontSize: '14px',
  },
  social: {
    display: 'flex',
    gap: '20px',
  },
  socialLink: {
    color: '#6b7280',
    textDecoration: 'none',
    fontSize: '14px',
  },
};

export default Footer;
