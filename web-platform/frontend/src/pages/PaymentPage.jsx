// web-platform/frontend/src/pages/PaymentPage.jsx - COMPLETE VERSION
import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { useAuth } from '../contexts/AuthContext';
import { useLocation, useNavigate } from 'react-router-dom';

function PaymentPage() {
  const [selectedPlan, setSelectedPlan] = useState('pro');
  const [phoneNumber, setPhoneNumber] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [paymentHistory, setPaymentHistory] = useState([]);
  const [showHistory, setShowHistory] = useState(false);
  
  const { user } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();
  const botId = location.state?.botId;

  const plans = [
    { 
      id: 'basic', 
      name: 'Basic Plan', 
      price: 9.99, 
      period: 'month',
      features: ['1 WhatsApp Bot', 'Basic Commands', '30 Days Access', 'Email Support']
    },
    { 
      id: 'pro', 
      name: 'Professional', 
      price: 24.99, 
      period: 'month',
      popular: true,
      features: ['3 WhatsApp Bots', 'Priority Support', 'Advanced Features', '90 Days Access', 'Auto-reply']
    },
    { 
      id: 'business', 
      name: 'Business', 
      price: 49.99, 
      period: 'month',
      features: ['10 WhatsApp Bots', '24/7 Support', 'Custom Features', '1 Year Access', 'White Label', 'API Access']
    }
  ];

  useEffect(() => {
    if (user) {
      fetchPaymentHistory();
    }
  }, [user]);

  const fetchPaymentHistory = async () => {
    try {
      const response = await axios.get('/payments/history');
      setPaymentHistory(response.data);
    } catch (error) {
      console.error('Failed to fetch payment history:', error);
    }
  };

  const validatePhoneNumber = (phone) => {
    // International phone validation
    const phoneRegex = /^\+[1-9]\d{1,14}$/;
    return phoneRegex.test(phone);
  };

  const handlePayment = async () => {
    if (!user) {
      navigate('/login');
      return;
    }

    if (!phoneNumber.trim()) {
      setError('Please enter your phone number');
      return;
    }

    if (!validatePhoneNumber(phoneNumber)) {
      setError('Please enter a valid phone number with country code (e.g., +254712345678)');
      return;
    }

    setLoading(true);
    setError('');
    setSuccess('');

    try {
      const plan = plans.find(p => p.id === selectedPlan);
      
      // Update user's phone number if not set
      if (!user.phone) {
        await axios.put('/user/update-phone', { phone: phoneNumber });
      }
      
      const response = await axios.post('/payments/initiate', {
        plan: plan.id,
        planName: plan.name,
        amount: plan.price,
        currency: 'USD',
        phoneNumber: phoneNumber
      });

      if (response.data.success) {
        setSuccess('Redirecting to PayHero payment gateway...');
        
        // Store payment info for receipt generation
        localStorage.setItem('pending_payment', JSON.stringify({
          id: response.data.payment_id,
          reference: response.data.reference,
          amount: plan.price,
          plan: plan.name
        }));
        
        // Redirect to PayHero checkout
        setTimeout(() => {
          window.location.href = response.data.checkout_url;
        }, 1500);
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

  const downloadReceipt = async (paymentId) => {
    try {
      const response = await axios.get(`/payments/${paymentId}/receipt`, {
        responseType: 'blob'
      });
      
      // Create download link
      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `receipt_${paymentId}.pdf`);
      document.body.appendChild(link);
      link.click();
      link.remove();
      
    } catch (error) {
      alert('Failed to download receipt');
    }
  };

  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const getStatusBadge = (status) => {
    switch (status) {
      case 'completed': return { color: '#10b981', text: 'Completed' };
      case 'pending': return { color: '#f59e0b', text: 'Pending' };
      case 'failed': return { color: '#ef4444', text: 'Failed' };
      default: return { color: '#6b7280', text: status };
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

      {success && (
        <div style={styles.success}>
          ✅ {success}
        </div>
      )}

      <div style={styles.content}>
        {/* Left Column - Plans */}
        <div style={styles.leftColumn}>
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
                      <span style={styles.checkIcon}>✓</span> {feature}
                    </li>
                  ))}
                </ul>

                <div style={styles.selectIndicator}>
                  {selectedPlan === plan.id ? '✓ Selected' : 'Select'}
                </div>
              </div>
            ))}
          </div>

          {/* Phone Number Input */}
          <div style={styles.phoneSection}>
            <h3>Billing Information</h3>
            <div style={styles.formGroup}>
              <label style={styles.label}>
                WhatsApp Phone Number *
                <span style={styles.helpText}>This number will be linked to your bot</span>
              </label>
              <input
                type="tel"
                value={phoneNumber}
                onChange={(e) => setPhoneNumber(e.target.value)}
                placeholder="+254712345678"
                style={styles.phoneInput}
                required
              />
              <small style={styles.inputHelp}>
                Include country code (e.g., +254 for Kenya, +1 for US)
              </small>
            </div>
          </div>
        </div>

        {/* Right Column - Order Summary */}
        <div style={styles.rightColumn}>
          <div style={styles.summaryCard}>
            <h3>Order Summary</h3>
            <div style={styles.summaryDetails}>
              <div style={styles.summaryRow}>
                <span>Plan:</span>
                <span>{plans.find(p => p.id === selectedPlan)?.name}</span>
              </div>
              <div style={styles.summaryRow}>
                <span>Billing Cycle:</span>
                <span>Monthly</span>
              </div>
              <div style={styles.summaryRow}>
                <span>WhatsApp Number:</span>
                <span>{phoneNumber || 'Not entered'}</span>
              </div>
              <div style={{...styles.summaryRow, ...styles.total}}>
                <span>Total Amount:</span>
                <span style={styles.totalAmount}>
                  ${plans.find(p => p.id === selectedPlan)?.price} USD
                </span>
              </div>
            </div>

            <button
              onClick={handlePayment}
              disabled={loading || !phoneNumber}
              style={styles.payButton}
            >
              {loading ? (
                <>
                  <div style={styles.spinner}></div>
                  Processing...
                </>
              ) : (
                'Proceed to Payment'
              )}
            </button>

            <div style={styles.paymentInfo}>
              <p><strong>Payment Method:</strong> PayHero</p>
              <p><strong>Security:</strong> 256-bit SSL encryption</p>
              <p><strong>Guarantee:</strong> 30-day money-back</p>
              <p><strong>Support:</strong> 24/7 email & chat</p>
            </div>
          </div>

          {/* Payment History */}
          <div style={styles.historySection}>
            <div style={styles.historyHeader}>
              <h3>Payment History</h3>
              <button 
                onClick={() => setShowHistory(!showHistory)}
                style={styles.toggleHistory}
              >
                {showHistory ? 'Hide' : 'Show'} History
              </button>
            </div>
            
            {showHistory && (
              <div style={styles.historyList}>
                {paymentHistory.length === 0 ? (
                  <div style={styles.emptyHistory}>
                    No payment history found
                  </div>
                ) : (
                  paymentHistory.map((payment) => {
                    const status = getStatusBadge(payment.status);
                    return (
                      <div key={payment.id} style={styles.historyItem}>
                        <div style={styles.historyLeft}>
                          <div style={styles.historyPlan}>{payment.plan}</div>
                          <div style={styles.historyDate}>
                            {formatDate(payment.created_at)}
                          </div>
                          <div style={styles.historyRef}>
                            Ref: {payment.reference}
                          </div>
                        </div>
                        <div style={styles.historyRight}>
                          <div style={styles.historyAmount}>
                            ${payment.amount} {payment.currency}
                          </div>
                          <div style={{
                            ...styles.historyStatus,
                            background: `${status.color}20`,
                            color: status.color,
                            border: `1px solid ${status.color}40`
                          }}>
                            {status.text}
                          </div>
                          {payment.status === 'completed' && (
                            <button
                              onClick={() => downloadReceipt(payment.id)}
                              style={styles.downloadButton}
                            >
                              📄 Receipt
                            </button>
                          )}
                        </div>
                      </div>
                    );
                  })
                )}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Payment Features */}
      <div style={styles.features}>
        <h3>What's Included in Your Subscription</h3>
        <div style={styles.featuresGrid}>
          <div style={styles.featureItem}>
            <div style={styles.featureIcon}>🔒</div>
            <h4>Secure & Encrypted</h4>
            <p>End-to-end encryption for all messages</p>
          </div>
          <div style={styles.featureItem}>
            <div style={styles.featureIcon}>⚡</div>
            <h4>Instant Deployment</h4>
            <p>Bot goes live immediately after payment</p>
          </div>
          <div style={styles.featureItem}>
            <div style={styles.featureIcon}>🔄</div>
            <h4>Auto-renewal</h4>
            <p>Seamless subscription renewal</p>
          </div>
          <div style={styles.featureItem}>
            <div style={styles.featureIcon}>📞</div>
            <h4>Priority Support</h4>
            <p>24/7 customer support</p>
          </div>
        </div>
      </div>
    </div>
  );
}

const styles = {
  container: {
    maxWidth: '1400px',
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
    padding: '12px 20px',
    borderRadius: '8px',
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
  success: {
    background: '#dcfce7',
    color: '#166534',
    padding: '15px',
    borderRadius: '10px',
    marginBottom: '20px',
    textAlign: 'center',
  },
  content: {
    display: 'grid',
    gridTemplateColumns: '2fr 1fr',
    gap: '40px',
    marginBottom: '60px',
  },
  leftColumn: {},
  rightColumn: {
    position: 'sticky',
    top: '20px',
    alignSelf: 'start',
  },
  plans: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))',
    gap: '20px',
    marginBottom: '40px',
  },
  planCard: {
    background: 'white',
    borderRadius: '15px',
    padding: '25px',
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
    fontSize: '20px',
    marginBottom: '10px',
  },
  price: {
    display: 'flex',
    alignItems: 'baseline',
    justifyContent: 'center',
    gap: '5px',
  },
  priceAmount: {
    fontSize: '36px',
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
    marginBottom: '20px',
    minHeight: '180px',
  },
  feature: {
    padding: '8px 0',
    color: '#6b7280',
    fontSize: '14px',
    display: 'flex',
    alignItems: 'center',
    gap: '10px',
  },
  checkIcon: {
    color: '#10b981',
    fontWeight: 'bold',
  },
  selectIndicator: {
    textAlign: 'center',
    padding: '10px',
    background: '#f3f4f6',
    borderRadius: '8px',
    fontWeight: '600',
    color: '#374151',
  },
  phoneSection: {
    background: 'white',
    borderRadius: '15px',
    padding: '25px',
    boxShadow: '0 4px 6px rgba(0,0,0,0.1)',
    marginBottom: '30px',
  },
  formGroup: {
    marginTop: '20px',
  },
  label: {
    display: 'block',
    marginBottom: '10px',
    fontWeight: '600',
  },
  helpText: {
    display: 'block',
    fontSize: '12px',
    color: '#6b7280',
    fontWeight: 'normal',
    marginTop: '5px',
  },
  phoneInput: {
    width: '100%',
    padding: '15px',
    border: '1px solid #d1d5db',
    borderRadius: '10px',
    fontSize: '16px',
  },
  inputHelp: {
    display: 'block',
    marginTop: '8px',
    color: '#6b7280',
    fontSize: '12px',
  },
  summaryCard: {
    background: 'white',
    borderRadius: '15px',
    padding: '25px',
    boxShadow: '0 4px 6px rgba(0,0,0,0.1)',
    marginBottom: '30px',
  },
  summaryDetails: {
    margin: '25px 0',
  },
  summaryRow: {
    display: 'flex',
    justifyContent: 'space-between',
    padding: '12px 0',
    borderBottom: '1px solid #e5e7eb',
  },
  total: {
    fontWeight: '700',
    fontSize: '18px',
    borderBottom: 'none',
    paddingTop: '20px',
  },
  totalAmount: {
    color: '#6366f1',
    fontSize: '20px',
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
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    gap: '10px',
  },
  payButtonDisabled: {
    opacity: 0.6,
    cursor: 'not-allowed',
  },
  spinner: {
    width: '20px',
    height: '20px',
    border: '3px solid rgba(255,255,255,0.3)',
    borderTop: '3px solid white',
    borderRadius: '50%',
    animation: 'spin 1s linear infinite',
  },
  paymentInfo: {
    marginTop: '25px',
    paddingTop: '25px',
    borderTop: '1px solid #e5e7eb',
    fontSize: '14px',
    color: '#6b7280',
  },
  historySection: {
    background: 'white',
    borderRadius: '15px',
    padding: '25px',
    boxShadow: '0 4px 6px rgba(0,0,0,0.1)',
  },
  historyHeader: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: '20px',
  },
  toggleHistory: {
    background: 'none',
    border: '1px solid #6366f1',
    color: '#6366f1',
    padding: '8px 16px',
    borderRadius: '6px',
    cursor: 'pointer',
    fontSize: '14px',
  },
  historyList: {
    maxHeight: '400px',
    overflowY: 'auto',
  },
  emptyHistory: {
    textAlign: 'center',
    padding: '20px',
    color: '#6b7280',
    fontSize: '14px',
  },
  historyItem: {
    display: 'flex',
    justifyContent: 'space-between',
    padding: '15px 0',
    borderBottom: '1px solid #e5e7eb',
  },
  historyLeft: {
    flex: 1,
  },
  historyRight: {
    textAlign: 'right',
  },
  historyPlan: {
    fontWeight: '600',
    marginBottom: '5px',
  },
  historyDate: {
    fontSize: '12px',
    color: '#6b7280',
    marginBottom: '5px',
  },
  historyRef: {
    fontSize: '11px',
    color: '#9ca3af',
  },
  historyAmount: {
    fontWeight: '600',
    marginBottom: '8px',
  },
  historyStatus: {
    display: 'inline-block',
    padding: '4px 12px',
    borderRadius: '20px',
    fontSize: '12px',
    fontWeight: '600',
    marginBottom: '8px',
  },
  downloadButton: {
    background: 'none',
    border: '1px solid #10b981',
    color: '#10b981',
    padding: '6px 12px',
    borderRadius: '6px',
    fontSize: '12px',
    cursor: 'pointer',
  },
  features: {
    background: 'white',
    borderRadius: '15px',
    padding: '40px',
    boxShadow: '0 4px 6px rgba(0,0,0,0.1)',
    marginTop: '40px',
  },
  featuresGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))',
    gap: '30px',
    marginTop: '30px',
  },
  featureItem: {
    textAlign: 'center',
  },
  featureIcon: {
    fontSize: '40px',
    marginBottom: '15px',
  },
};

export default PaymentPage;
