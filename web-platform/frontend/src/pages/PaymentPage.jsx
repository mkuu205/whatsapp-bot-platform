// web-platform/frontend/src/pages/PaymentPage.jsx
import React, { useState } from 'react';
import axios from 'axios';
import { useAuth } from '../contexts/AuthContext';
import { useLocation, useNavigate } from 'react-router-dom';

function PaymentPage() {
  const [selectedPlan, setSelectedPlan] = useState('monthly');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const { user } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();
  const botId = location.state?.botId;

  const plans = [
    { 
      id: 'basic', 
      name: 'Basic', 
      price: 9.99, 
      period: 'month',
      features: ['1 Bot', 'Basic Support', '30 Days Access']
    },
    { 
      id: 'pro', 
      name: 'Professional', 
      price: 24.99, 
      period: 'month',
      popular: true,
      features: ['3 Bots', 'Priority Support', 'Advanced Features', '90 Days']
    },
    { 
      id: 'business', 
      name: 'Business', 
      price: 49.99, 
      period: 'month',
      features: ['10 Bots', '24/7 Support', 'Custom Features', 'White Label']
    }
  ];

  const handlePayment = async () => {
    if (!user) {
      navigate('/login');
      return;
    }

    setLoading(true);
    setError('');

    try {
      const plan = plans.find(p => p.id === selectedPlan);
      
      const response = await axios.post('/payments/initiate', {
        plan: plan.id,
        amount: plan.price,
        currency: 'USD'
      });

      if (response.data.success) {
        // Redirect to PayHero checkout
        window.location.href = response.data.checkout_url;
      } else {
        setError('Payment initialization failed');
      }
    } catch (error) {
      console.error('Payment error:', error);
      setError(error.response?.data?.error || 'Payment failed. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  if (!user) {
    return (
      <div style={styles.container}>
        <div style={styles.card}>
          <h2>Please Login</h2>
          <p>You need to login to make a payment.</p>
        </div>
      </div>
    );
  }

  return (
    <div style={styles.container}>
      <div style={styles.header}>
        <h1>Subscribe to WhatsApp Bot Platform</h1>
        <p>Choose the perfect plan for your automation needs</p>
        
        {botId && (
          <div style={styles.note}>
            ⚡ After payment, you'll continue setting up your bot.
          </div>
        )}
      </div>

      {error && (
        <div style={styles.error}>
          ⚠️ {error}
        </div>
      )}

      <div style={styles.plans}>
        {plans.map((plan) => (
          <div
            key={plan.id}
            style={{
              ...styles.planCard,
              ...(plan.popular ? styles.popularCard : {}),
              ...(selectedPlan === plan.id ? styles.selectedCard : {})
            }}
            onClick={() => setSelectedPlan(plan.id)}
          >
            {plan.popular && (
              <div style={styles.popularBadge}>Most Popular</div>
            )}

            <div style={styles.planHeader}>
              <h3 style={styles.planName}>{plan.name}</h3>
              <div style={styles.price}>
                <span style={styles.priceAmount}>${plan.price}</span>
                <span style={styles.pricePeriod}>/{plan.period}</span>
              </div>
            </div>

            <ul style={styles.features}>
              {plan.features.map((feature, index) => (
                <li key={index} style={styles.feature}>
                  ✓ {feature}
                </li>
              ))}
            </ul>

            <button
              style={{
                ...styles.selectButton,
                ...(selectedPlan === plan.id ? styles.selectedButton : {})
              }}
              onClick={() => setSelectedPlan(plan.id)}
            >
              {selectedPlan === plan.id ? 'Selected' : 'Select'}
            </button>
          </div>
        ))}
      </div>

      <div style={styles.summary}>
        <h3>Order Summary</h3>
        <div style={styles.summaryDetails}>
          <div style={styles.summaryRow}>
            <span>Plan:</span>
            <span>{plans.find(p => p.id === selectedPlan)?.name}</span>
          </div>
          <div style={styles.summaryRow}>
            <span>Price:</span>
            <span>${plans.find(p => p.id === selectedPlan)?.price}/{plans.find(p => p.id === selectedPlan)?.period}</span>
          </div>
          <div style={{...styles.summaryRow, ...styles.total}}>
            <span>Total:</span>
            <span>${plans.find(p => p.id === selectedPlan)?.price}</span>
          </div>
        </div>

        <button
          onClick={handlePayment}
          disabled={loading}
          style={styles.payButton}
        >
          {loading ? 'Processing...' : 'Proceed to Payment'}
        </button>

        <div style={styles.paymentInfo}>
          <p>💳 Secure payment powered by <strong>PayHero</strong></p>
          <p>🔄 30-day money-back guarantee</p>
          <p>🔒 Your payment is secure and encrypted</p>
        </div>
      </div>
    </div>
  );
}

const styles = {
  container: {
    maxWidth: '1200px',
    margin: '0 auto',
    padding: '20px',
  },
  header: {
    textAlign: 'center',
    marginBottom: '40px',
  },
  note: {
    background: '#fef3c7',
    color: '#92400e',
    padding: '15px',
    borderRadius: '10px',
    marginTop: '20px',
    display: 'inline-block',
  },
  error: {
    background: '#fee2e2',
    color: '#dc2626',
    padding: '15px',
    borderRadius: '10px',
    marginBottom: '20px',
    textAlign: 'center',
  },
  plans: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))',
    gap: '30px',
    marginBottom: '40px',
  },
  planCard: {
    background: 'white',
    borderRadius: '15px',
    padding: '30px',
    boxShadow: '0 4px 6px rgba(0,0,0,0.1)',
    position: 'relative',
    cursor: 'pointer',
    transition: 'all 0.3s ease',
    border: '2px solid transparent',
  },
  planCardHover: {
    transform: 'translateY(-5px)',
    boxShadow: '0 20px 40px rgba(0,0,0,0.1)',
  },
  popularCard: {
    borderColor: '#6366f1',
  },
  selectedCard: {
    borderColor: '#10b981',
    background: 'rgba(16, 185, 129, 0.05)',
  },
  popularBadge: {
    position: 'absolute',
    top: '-12px',
    left: '50%',
    transform: 'translateX(-50%)',
    background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
    color: 'white',
    padding: '5px 20px',
    borderRadius: '20px',
    fontSize: '14px',
    fontWeight: '600',
  },
  planHeader: {
    textAlign: 'center',
    marginBottom: '25px',
  },
  planName: {
    fontSize: '24px',
    marginBottom: '10px',
  },
  price: {
    display: 'flex',
    alignItems: 'baseline',
    justifyContent: 'center',
    gap: '5px',
  },
  priceAmount: {
    fontSize: '48px',
    fontWeight: '700',
    background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
    WebkitBackgroundClip: 'text',
    WebkitTextFillColor: 'transparent',
  },
  pricePeriod: {
    color: '#6b7280',
    fontSize: '16px',
  },
  features: {
    listStyle: 'none',
    marginBottom: '30px',
  },
  feature: {
    padding: '10px 0',
    color: '#6b7280',
    borderBottom: '1px solid #e5e7eb',
  },
  selectButton: {
    width: '100%',
    padding: '12px',
    background: '#f3f4f6',
    color: '#374151',
    border: 'none',
    borderRadius: '8px',
    fontWeight: '600',
    cursor: 'pointer',
  },
  selectedButton: {
    background: '#10b981',
    color: 'white',
  },
  summary: {
    background: 'white',
    borderRadius: '15px',
    padding: '30px',
    boxShadow: '0 4px 6px rgba(0,0,0,0.1)',
    maxWidth: '500px',
    margin: '0 auto',
  },
  summaryDetails: {
    margin: '25px 0',
  },
  summaryRow: {
    display: 'flex',
    justifyContent: 'space-between',
    padding: '15px 0',
    borderBottom: '1px solid #e5e7eb',
  },
  total: {
    fontWeight: '700',
    fontSize: '18px',
    borderBottom: 'none',
  },
  payButton: {
    width: '100%',
    padding: '16px',
    background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
    color: 'white',
    border: 'none',
    borderRadius: '10px',
    fontSize: '16px',
    fontWeight: '600',
    cursor: 'pointer',
    marginTop: '20px',
  },
  paymentInfo: {
    textAlign: 'center',
    color: '#6b7280',
    fontSize: '14px',
    marginTop: '20px',
    lineHeight: '1.8',
  },
};

export default PaymentPage;
