// web-platform/frontend/src/pages/PairingPage.jsx
import React, { useState } from 'react';

function PairingPage({ user }) {
  const [phone, setPhone] = useState('');
  const [loading, setLoading] = useState(false);
  const [pairingCode, setPairingCode] = useState('');
  const [step, setStep] = useState(1);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    
    // Mock pairing code
    setTimeout(() => {
      const code = Math.random().toString().substr(2, 8).match(/.{1,4}/g).join('-');
      setPairingCode(code);
      setStep(2);
      setLoading(false);
    }, 2000);
  };

  const copyToClipboard = () => {
    navigator.clipboard.writeText(pairingCode.replace('-', ''));
    alert('Pairing code copied!');
  };

  if (!user) {
    return (
      <div style={styles.container}>
        <div style={styles.card}>
          <h2>Please Login</h2>
          <p>You need to login to pair WhatsApp devices.</p>
        </div>
      </div>
    );
  }

  return (
    <div style={styles.container}>
      <div style={styles.card}>
        {step === 1 ? (
          <>
            <h2 style={styles.title}>Link Your WhatsApp</h2>
            <p style={styles.subtitle}>Enter your WhatsApp number to get pairing code</p>
            
            <form onSubmit={handleSubmit} style={styles.form}>
              <div style={styles.inputGroup}>
                <label style={styles.label}>WhatsApp Number</label>
                <input
                  type="tel"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  placeholder="+254712345678"
                  style={styles.input}
                  required
                />
                <small style={styles.help}>Include country code (e.g., +254 for Kenya)</small>
              </div>
              
              <button type="submit" style={styles.button} disabled={loading}>
                {loading ? 'Generating Code...' : 'Get Pairing Code'}
              </button>
            </form>
          </>
        ) : (
          <>
            <h2 style={styles.title}>Your Pairing Code</h2>
            <p style={styles.subtitle}>Use this code to link your WhatsApp</p>
            
            <div style={styles.codeDisplay}>
              <div style={styles.code}>{pairingCode}</div>
              <button onClick={copyToClipboard} style={styles.copyButton}>
                Copy Code
              </button>
            </div>
            
            <div style={styles.instructions}>
              <h3>How to pair:</h3>
              <ol style={styles.steps}>
                <li>Open WhatsApp on your phone</li>
                <li>Tap Menu → Linked Devices → Link a Device</li>
                <li>Enter the code: <strong>{pairingCode}</strong></li>
                <li>Wait for confirmation (about 30 seconds)</li>
              </ol>
            </div>
            
            <button onClick={() => setStep(1)} style={styles.backButton}>
              Use Different Number
            </button>
          </>
        )}
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
    borderRadius: '15px',
    padding: '40px',
    width: '100%',
    maxWidth: '500px',
    boxShadow: '0 20px 60px rgba(0, 0, 0, 0.1)',
  },
  title: {
    fontSize: '32px',
    fontWeight: '700',
    marginBottom: '10px',
    textAlign: 'center',
  },
  subtitle: {
    color: '#6b7280',
    textAlign: 'center',
    marginBottom: '30px',
  },
  form: {
    display: 'flex',
    flexDirection: 'column',
    gap: '20px',
  },
  inputGroup: {
    display: 'flex',
    flexDirection: 'column',
    gap: '8px',
  },
  label: {
    fontWeight: '600',
    color: '#374151',
  },
  input: {
    padding: '15px',
    border: '1px solid #d1d5db',
    borderRadius: '10px',
    fontSize: '16px',
  },
  help: {
    color: '#9ca3af',
    fontSize: '14px',
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
  },
  codeDisplay: {
    textAlign: 'center',
    margin: '30px 0',
  },
  code: {
    fontSize: '48px',
    fontWeight: '700',
    letterSpacing: '5px',
    background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
    WebkitBackgroundClip: 'text',
    WebkitTextFillColor: 'transparent',
    marginBottom: '20px',
  },
  copyButton: {
    padding: '12px 30px',
    background: '#10b981',
    color: 'white',
    border: 'none',
    borderRadius: '50px',
    fontWeight: '600',
    cursor: 'pointer',
  },
  instructions: {
    background: '#f8fafc',
    padding: '20px',
    borderRadius: '10px',
    margin: '30px 0',
  },
  steps: {
    margin: '15px 0 0 20px',
    lineHeight: '2',
  },
  backButton: {
    width: '100%',
    padding: '12px',
    background: 'none',
    border: '2px solid #6366f1',
    color: '#6366f1',
    borderRadius: '10px',
    fontWeight: '600',
    cursor: 'pointer',
  },
};

export default PairingPage;
