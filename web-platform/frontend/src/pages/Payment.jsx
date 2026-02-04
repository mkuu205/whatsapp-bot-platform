// web-platform/frontend/src/pages/Payment.jsx
import React, { useState } from 'react';
import axios from 'axios';

const API_URL = process.env.REACT_APP_API_URL || 'http://localhost:3001/api';

function PaymentPage({ user }) {
    const [loading, setLoading] = useState(false);
    const [selectedPlan, setSelectedPlan] = useState('monthly');
    const [paymentResult, setPaymentResult] = useState(null);

    const plans = [
        { id: 'monthly', name: 'Monthly Plan', price: 9.99, features: ['1 WhatsApp Bot', '30 Days Access', '24/7 Online'] },
        { id: 'quarterly', name: 'Quarterly Plan', price: 24.99, features: ['1 WhatsApp Bot', '90 Days Access', '24/7 Online', 'Priority Support'] },
        { id: 'yearly', name: 'Yearly Plan', price: 89.99, features: ['1 WhatsApp Bot', '365 Days Access', '24/7 Online', 'Priority Support', 'Unlimited Commands'] }
    ];

    const handlePayment = async () => {
        if (!user) {
            alert('Please login first');
            return;
        }

        setLoading(true);
        try {
            const plan = plans.find(p => p.id === selectedPlan);
            const response = await axios.post(`${API_URL}/payments/create`, {
                amount: plan.price,
                plan: selectedPlan
            });

            if (response.data.success) {
                // Redirect to PayHero checkout
                window.location.href = response.data.checkoutUrl;
            } else {
                alert('Payment initialization failed');
            }
        } catch (error) {
            console.error('Payment error:', error);
            alert('Payment failed. Please try again.');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="payment-page">
            <div className="container">
                <h1>🤖 WhatsApp Bot Platform</h1>
                <p className="subtitle">Get your own WhatsApp bot with status simulation</p>
                
                {!user && (
                    <div className="alert">
                        Please <a href="/login">login</a> or <a href="/register">register</a> to continue
                    </div>
                )}

                <div className="plans-container">
                    {plans.map(plan => (
                        <div 
                            key={plan.id} 
                            className={`plan-card ${selectedPlan === plan.id ? 'selected' : ''}`}
                            onClick={() => setSelectedPlan(plan.id)}
                        >
                            <h3>{plan.name}</h3>
                            <div className="price">${plan.price}</div>
                            <ul className="features">
                                {plan.features.map((feature, index) => (
                                    <li key={index}>✓ {feature}</li>
                                ))}
                            </ul>
                            <button 
                                className={`select-btn ${selectedPlan === plan.id ? 'active' : ''}`}
                                onClick={() => setSelectedPlan(plan.id)}
                            >
                                {selectedPlan === plan.id ? 'Selected' : 'Select'}
                            </button>
                        </div>
                    ))}
                </div>

                <div className="payment-summary">
                    <h3>Order Summary</h3>
                    <div className="summary-details">
                        <div className="summary-row">
                            <span>Plan:</span>
                            <span>{plans.find(p => p.id === selectedPlan)?.name}</span>
                        </div>
                        <div className="summary-row">
                            <span>Price:</span>
                            <span>${plans.find(p => p.id === selectedPlan)?.price}</span>
                        </div>
                        <div className="summary-row total">
                            <span>Total:</span>
                            <span>${plans.find(p => p.id === selectedPlan)?.price}</span>
                        </div>
                    </div>
                    
                    <button 
                        className="pay-btn" 
                        onClick={handlePayment}
                        disabled={!user || loading}
                    >
                        {loading ? 'Processing...' : 'Proceed to Payment'}
                    </button>
                    
                    <p className="note">
                        After payment, you'll be able to deploy your WhatsApp bot instantly.
                        30-day money-back guarantee.
                    </p>
                </div>

                {paymentResult && (
                    <div className="payment-result">
                        {paymentResult.success ? (
                            <>
                                <h3>✅ Payment Successful!</h3>
                                <p>Redirecting to bot deployment...</p>
                            </>
                        ) : (
                            <>
                                <h3>❌ Payment Failed</h3>
                                <p>{paymentResult.error}</p>
                            </>
                        )}
                    </div>
                )}
            </div>
        </div>
    );
}

export default PaymentPage;
