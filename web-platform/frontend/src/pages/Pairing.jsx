// web-platform/frontend/src/pages/Pairing.jsx
import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { useLocation, useNavigate } from 'react-router-dom';

const API_URL = process.env.REACT_APP_API_URL || 'http://localhost:3001/api';

function PairingPage({ user }) {
    const location = useLocation();
    const navigate = useNavigate();
    const [step, setStep] = useState(1);
    const [phoneNumber, setPhoneNumber] = useState('');
    const [botId, setBotId] = useState('');
    const [pairingCode, setPairingCode] = useState('');
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');
    const [success, setSuccess] = useState('');

    useEffect(() => {
        // Get bot ID from URL or create new
        const params = new URLSearchParams(location.search);
        const id = params.get('botId');
        
        if (id) {
            setBotId(id);
            setStep(2); // Skip to phone number step
        } else if (user) {
            createNewBot();
        } else {
            navigate('/login');
        }
    }, [location, user, navigate]);

    const createNewBot = async () => {
        try {
            setLoading(true);
            const response = await axios.post(`${API_URL}/bots/create`, {
                name: 'My WhatsApp Bot'
            });
            
            if (response.data.success) {
                setBotId(response.data.bot.id);
                setStep(2);
            } else {
                setError('Failed to create bot. Please try again.');
            }
        } catch (err) {
            setError(err.response?.data?.error || 'Failed to create bot');
        } finally {
            setLoading(false);
        }
    };

    const validatePhoneNumber = (phone) => {
        // Simple validation - can be enhanced
        const phoneRegex = /^\+[1-9]\d{1,14}$/;
        return phoneRegex.test(phone);
    };

    const handlePhoneSubmit = async (e) => {
        e.preventDefault();
        
        if (!validatePhoneNumber(phoneNumber)) {
            setError('Please enter a valid phone number with country code (e.g., +254712345678)');
            return;
        }

        setLoading(true);
        setError('');
        
        try {
            const response = await axios.post(`${API_URL}/bots/${botId}/pair`, {
                phoneNumber: phoneNumber
            });
            
            if (response.data.success) {
                setPairingCode(response.data.pairingCode);
                setStep(3);
                setSuccess('Pairing code generated successfully!');
            } else {
                setError(response.data.error || 'Failed to generate pairing code');
            }
        } catch (err) {
            setError(err.response?.data?.error || 'Failed to generate pairing code');
        } finally {
            setLoading(false);
        }
    };

    const copyToClipboard = () => {
        navigator.clipboard.writeText(pairingCode);
        alert('Pairing code copied to clipboard!');
    };

    return (
        <div className="pairing-page">
            <div className="container">
                <h1>🔗 Link Your WhatsApp</h1>
                <p className="subtitle">Follow these steps to connect your WhatsApp account</p>

                {/* Step Indicators */}
                <div className="steps">
                    <div className={`step ${step >= 1 ? 'active' : ''}`}>
                        <div className="step-number">1</div>
                        <div className="step-label">Create Bot</div>
                    </div>
                    <div className={`step ${step >= 2 ? 'active' : ''}`}>
                        <div className="step-number">2</div>
                        <div className="step-label">Enter Phone</div>
                    </div>
                    <div className={`step ${step >= 3 ? 'active' : ''}`}>
                        <div className="step-number">3</div>
                        <div className="step-label">Pair Device</div>
                    </div>
                </div>

                {/* Step 1: Create Bot (if needed) */}
                {step === 1 && (
                    <div className="step-content">
                        <h2>Creating Your Bot...</h2>
                        {loading ? (
                            <div className="loading">Creating your WhatsApp bot...</div>
                        ) : error ? (
                            <div className="error">{error}</div>
                        ) : null}
                    </div>
                )}

                {/* Step 2: Enter Phone Number */}
                {step === 2 && (
                    <div className="step-content">
                        <h2>Enter Your WhatsApp Number</h2>
                        <p>Enter the phone number you want to link with your bot</p>
                        
                        <form onSubmit={handlePhoneSubmit} className="phone-form">
                            <div className="input-group">
                                <label htmlFor="phone">WhatsApp Number</label>
                                <input
                                    type="tel"
                                    id="phone"
                                    value={phoneNumber}
                                    onChange={(e) => setPhoneNumber(e.target.value)}
                                    placeholder="+254712345678"
                                    required
                                />
                                <small>Include country code (e.g., +254 for Kenya, +1 for US)</small>
                            </div>
                            
                            {error && <div className="error">{error}</div>}
                            
                            <button type="submit" disabled={loading}>
                                {loading ? 'Generating Code...' : 'Generate Pairing Code'}
                            </button>
                        </form>
                    </div>
                )}

                {/* Step 3: Show Pairing Code */}
                {step === 3 && pairingCode && (
                    <div className="step-content">
                        <h2>📱 Pair Your Device</h2>
                        
                        <div className="pairing-code-container">
                            <div className="code-display">
                                <span className="code-label">Your Pairing Code:</span>
                                <div className="code-value">{pairingCode}</div>
                                <button onClick={copyToClipboard} className="copy-btn">
                                    Copy Code
                                </button>
                            </div>
                            
                            <div className="instructions">
                                <h3>Follow these steps:</h3>
                                <ol>
                                    <li>Open <strong>WhatsApp</strong> on your phone</li>
                                    <li>Tap on <strong>Menu</strong> (three dots) → <strong>Linked Devices</strong></li>
                                    <li>Tap on <strong>Link a Device</strong></li>
                                    <li>Enter this code: <strong>{pairingCode}</strong></li>
                                    <li>Wait for confirmation (about 30 seconds)</li>
                                </ol>
                            </div>
                            
                            <div className="note">
                                <p><strong>Note:</strong></p>
                                <ul>
                                    <li>Keep this page open while pairing</li>
                                    <li>The code expires in 20 minutes</li>
                                    <li>Only the paired number can control the bot</li>
                                    <li>After pairing, you can send commands like <code>!autotyping on</code></li>
                                </ul>
                            </div>
                        </div>
                        
                        {success && <div className="success">{success}</div>}
                        
                        <div className="action-buttons">
                            <button onClick={() => navigate('/admin')} className="btn-secondary">
                                Go to Dashboard
                            </button>
                            <button onClick={() => setStep(2)} className="btn-secondary">
                                Use Different Number
                            </button>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
}

export default PairingPage;
