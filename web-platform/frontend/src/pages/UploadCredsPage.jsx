// web-platform/frontend/src/pages/UploadCredsPage.jsx
import React, { useState } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import axios from 'axios';

function UploadCredsPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [file, setFile] = useState(null);
  const [jsonContent, setJsonContent] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [uploadMethod, setUploadMethod] = useState('file'); // 'file' or 'paste'

  const handleFileUpload = (e) => {
    const selectedFile = e.target.files[0];
    if (!selectedFile) return;

    if (selectedFile.type !== 'application/json') {
      setError('Please select a JSON file');
      return;
    }

    setFile(selectedFile);
    
    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const content = JSON.parse(event.target.result);
        setJsonContent(JSON.stringify(content, null, 2));
        setError('');
      } catch (err) {
        setError('Invalid JSON file');
      }
    };
    reader.readAsText(selectedFile);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!jsonContent.trim()) {
      setError('Please provide credentials JSON');
      return;
    }

    setLoading(true);
    setError('');
    setSuccess('');

    try {
      // Validate JSON
      const parsedJson = JSON.parse(jsonContent);
      
      const response = await axios.post(`/api/bots/${id}/upload-creds`, {
        credentials: parsedJson
      });

      if (response.data.success) {
        setSuccess('Credentials uploaded successfully!');
        
        // Auto-deploy after 2 seconds
        setTimeout(async () => {
          try {
            const deployResponse = await axios.post(`/api/bots/${id}/deploy`);
            if (deployResponse.data.success) {
              alert('Bot deployment started! It will be ready in a few moments.');
              navigate(`/bots/${id}`);
            } else {
              alert('Credentials uploaded but deployment failed. Please try manual deployment.');
            }
          } catch (deployError) {
            alert('Credentials uploaded. You can now deploy manually from bot details.');
          }
        }, 2000);
      } else {
        setError(response.data.error || 'Upload failed');
      }
    } catch (error) {
      if (error.response?.data?.error) {
        setError(error.response.data.error);
      } else if (error.message.includes('JSON')) {
        setError('Invalid JSON format');
      } else {
        setError('Failed to upload credentials');
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={styles.container}>
      <div style={styles.header}>
        <h1>Upload WhatsApp Credentials</h1>
        <p>Upload credentials.json file from WhatsApp after pairing</p>
      </div>

      <div style={styles.card}>
        <div style={styles.steps}>
          <div style={styles.step}>
            <div style={styles.stepNumber}>1</div>
            <div style={styles.stepContent}>
              <h3>Pair Your Device</h3>
              <p>Link your WhatsApp using pairing code</p>
            </div>
          </div>
          <div style={styles.stepArrow}>→</div>
          <div style={{...styles.step, ...styles.activeStep}}>
            <div style={styles.stepNumber}>2</div>
            <div style={styles.stepContent}>
              <h3>Upload Credentials</h3>
              <p>Upload credentials.json file (current step)</p>
            </div>
          </div>
          <div style={styles.stepArrow}>→</div>
          <div style={styles.step}>
            <div style={styles.stepNumber}>3</div>
            <div style={styles.stepContent}>
              <h3>Deploy Bot</h3>
              <p>Bot will be automatically deployed</p>
            </div>
          </div>
        </div>

        {error && (
          <div style={styles.error}>
            ⚠️ {error}
          </div>
        )}

        {success && (
          <div style={styles.success}>
            ✅ {success}
            <p>Auto-deploying your bot...</p>
          </div>
        )}

        <div style={styles.methodTabs}>
          <button
            onClick={() => setUploadMethod('file')}
            style={{
              ...styles.tabButton,
              ...(uploadMethod === 'file' ? styles.activeTab : {})
            }}
          >
            📁 Upload File
          </button>
          <button
            onClick={() => setUploadMethod('paste')}
            style={{
              ...styles.tabButton,
              ...(uploadMethod === 'paste' ? styles.activeTab : {})
            }}
          >
            📋 Paste JSON
          </button>
        </div>

        <form onSubmit={handleSubmit} style={styles.form}>
          {uploadMethod === 'file' ? (
            <div style={styles.fileUpload}>
              <label style={styles.fileLabel}>
                <input
                  type="file"
                  accept=".json"
                  onChange={handleFileUpload}
                  style={styles.fileInput}
                />
                <div style={styles.fileBox}>
                  <div style={styles.fileIcon}>📁</div>
                  <div>
                    <div style={styles.fileTitle}>Click to select credentials.json</div>
                    <div style={styles.fileDesc}>Select the credentials.json file from WhatsApp Web</div>
                  </div>
                </div>
              </label>
              {file && (
                <div style={styles.fileInfo}>
                  Selected: <strong>{file.name}</strong> ({Math.round(file.size / 1024)} KB)
                </div>
              )}
            </div>
          ) : (
            <div style={styles.jsonInput}>
              <label style={styles.label}>Paste credentials.json content:</label>
              <textarea
                value={jsonContent}
                onChange={(e) => setJsonContent(e.target.value)}
                placeholder={`{
  "clientId": "your-client-id",
  "serverToken": "your-server-token",
  "clientToken": "your-client-token"
}`}
                style={styles.textarea}
                rows={12}
                spellCheck="false"
              />
            </div>
          )}

          <button type="submit" style={styles.button} disabled={loading || !jsonContent}>
            {loading ? 'Uploading & Deploying...' : 'Upload & Deploy Bot'}
          </button>
        </form>

        <div style={styles.help}>
          <h4>How to get credentials.json:</h4>
          <ol style={styles.helpSteps}>
            <li>After pairing WhatsApp, go to WhatsApp Web</li>
            <li>Open Developer Tools (F12)</li>
            <li>Go to Application → Local Storage</li>
            <li>Find and copy the credentials object</li>
            <li>Save as credentials.json file</li>
          </ol>
          <p style={styles.note}>
            <strong>Note:</strong> The credentials file contains sensitive information.
            It will be encrypted and stored securely.
          </p>
        </div>

        <div style={styles.actions}>
          <Link to={`/pairing?botId=${id}`} style={styles.secondaryButton}>
            ← Back to Pairing
          </Link>
          <Link to={`/bots/${id}`} style={styles.secondaryButton}>
            Skip for Now
          </Link>
        </div>
      </div>
    </div>
  );
}

const styles = {
  container: {
    maxWidth: '800px',
    margin: '0 auto',
    padding: '20px',
  },
  header: {
    textAlign: 'center',
    marginBottom: '40px',
  },
  card: {
    background: 'white',
    borderRadius: '15px',
    padding: '30px',
    boxShadow: '0 4px 6px rgba(0,0,0,0.1)',
  },
  steps: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: '40px',
    flexWrap: 'wrap',
    gap: '10px',
  },
  step: {
    display: 'flex',
    alignItems: 'center',
    gap: '15px',
    flex: 1,
    opacity: 0.6,
  },
  activeStep: {
    opacity: 1,
  },
  stepNumber: {
    width: '40px',
    height: '40px',
    background: '#e5e7eb',
    borderRadius: '50%',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    fontWeight: '600',
    fontSize: '18px',
  },
  activeStep: {
    opacity: 1,
    '& $stepNumber': {
      background: '#6366f1',
      color: 'white',
    },
  },
  stepContent: {
    flex: 1,
  },
  stepArrow: {
    color: '#9ca3af',
    fontSize: '20px',
  },
  error: {
    background: '#fee2e2',
    color: '#dc2626',
    padding: '15px',
    borderRadius: '10px',
    marginBottom: '20px',
  },
  success: {
    background: '#dcfce7',
    color: '#166534',
    padding: '15px',
    borderRadius: '10px',
    marginBottom: '20px',
  },
  methodTabs: {
    display: 'flex',
    gap: '10px',
    marginBottom: '30px',
    borderBottom: '1px solid #e5e7eb',
    paddingBottom: '10px',
  },
  tabButton: {
    padding: '12px 24px',
    background: 'none',
    border: 'none',
    borderRadius: '8px',
    cursor: 'pointer',
    fontWeight: '600',
    fontSize: '16px',
  },
  activeTab: {
    background: '#f3f4f6',
    color: '#6366f1',
  },
  form: {
    marginBottom: '30px',
  },
  fileUpload: {
    marginBottom: '20px',
  },
  fileLabel: {
    cursor: 'pointer',
    display: 'block',
  },
  fileInput: {
    display: 'none',
  },
  fileBox: {
    border: '2px dashed #d1d5db',
    borderRadius: '10px',
    padding: '40px',
    textAlign: 'center',
    transition: 'all 0.3s ease',
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    gap: '20px',
  },
  fileBoxHover: {
    borderColor: '#6366f1',
    background: 'rgba(99, 102, 241, 0.05)',
  },
  fileIcon: {
    fontSize: '48px',
  },
  fileTitle: {
    fontWeight: '600',
    fontSize: '18px',
    marginBottom: '5px',
  },
  fileDesc: {
    color: '#6b7280',
    fontSize: '14px',
  },
  fileInfo: {
    marginTop: '15px',
    padding: '10px',
    background: '#f8fafc',
    borderRadius: '8px',
    fontSize: '14px',
  },
  jsonInput: {
    marginBottom: '20px',
  },
  label: {
    display: 'block',
    marginBottom: '10px',
    fontWeight: '600',
  },
  textarea: {
    width: '100%',
    padding: '15px',
    border: '1px solid #d1d5db',
    borderRadius: '10px',
    fontFamily: 'monospace',
    fontSize: '14px',
    resize: 'vertical',
  },
  button: {
    width: '100%',
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
  buttonDisabled: {
    opacity: 0.6,
    cursor: 'not-allowed',
  },
  help: {
    background: '#f8fafc',
    padding: '20px',
    borderRadius: '10px',
    marginBottom: '30px',
  },
  helpSteps: {
    marginLeft: '20px',
    lineHeight: '2',
  },
  note: {
    marginTop: '15px',
    paddingTop: '15px',
    borderTop: '1px solid #e5e7eb',
    fontSize: '14px',
    color: '#6b7280',
  },
  actions: {
    display: 'flex',
    gap: '15px',
    justifyContent: 'center',
  },
  secondaryButton: {
    padding: '12px 24px',
    background: 'none',
    color: '#6366f1',
    border: '2px solid #6366f1',
    borderRadius: '8px',
    textDecoration: 'none',
    fontWeight: '600',
    fontSize: '14px',
  },
};

export default UploadCredsPage;

