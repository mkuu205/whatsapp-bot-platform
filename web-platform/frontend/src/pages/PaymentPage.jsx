// web-platform/frontend/src/pages/PaymentPage.jsx
import React from 'react';
import { Link } from 'react-router-dom';

function PaymentPage({ user }) {
  const plans = [
    { name: 'Basic', price: 9.99, features: ['1 Bot', 'Basic Support', '30 Days'] },
    { name: 'Pro', price: 24.99, popular: true, features: ['3 Bots', 'Priority Support', 'Advanced Features'] },
    { name: 'Business', price: 49.99, features: ['10 Bots', '24/7 Support', 'Custom Features'] }
  ];

  return (
    <div style={styles.container}>
      <div style={styles.header}>
        <h1>Choose Your Plan</h1>
        <p>Select the perfect plan for your WhatsApp automation needs</p>
      </div>

      {!user && (
        <div style={styles.alert}>
          ⚠️ Please <Link to="/login" style={styles.link}>login</Link> or <Link to="/register" style={styles.link}>register</Link> to continue
        </div>
      )}

      <div style={styles.plans}>
        {plans.map((plan, index) => (
          <div key={index} style={{
            ...styles.planCard,
            ...(plan.popular ? styles.popularCard : {})
          }}>
            {plan.popular && <div style={styles.popularBadge}>Most Popular</div>}
            
            <div style={styles.planHeader}>
              <h3 style={styles.planName}>{plan.name}</h3>
              <div style={styles.planPrice}>
                <span style={styles.price}>${plan.price}</span>
                <span style={styles.period}>/month</span>
              </div>
            </div>

            <ul style={styles.features}>
              {plan.features.map((feature, i) => (
                <li key={i} style={styles.feature}>
                  ✓ {feature}
                </li>
              ))}
            </ul>

            <button style={styles.selectButton}>
              {plan.popular ? 'Get Started' : 'Select Plan'}
            </button>
          </div>
        ))}
      </div>

      <div style={styles.info}>
        <p>💳 All plans include 30-day money-back guarantee</p>
        <p>🔒 Secure payment powered by PayHero</p>
        <p>🔄 Cancel anytime, no questions asked</p>
      </div>
    </div>
  );
}

const styles = {
  container: {
    padding: '40px',
    maxWidth: '1200px',
    margin: '0 auto',
  },
  header: {
    textAlign: 'center',
    marginBottom: '40px',
  },
  alert: {
    background: '#fffbeb',
    border: '1px solid #f59e0b',
    color: '#92400e',
    padding: '15px',
    borderRadius: '10px',
    marginBottom: '30px',
    textAlign: 'center',
  },
  link: {
    color: '#6366f1',
    fontWeight: '600',
    textDecoration: 'none',
  },
  plans: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))',
    gap: '30px',
    marginBottom: '40px',
  },
  planCard: {
    background: 'white',
    padding: '30px',
    borderRadius: '15px',
    boxShadow: '0 4px 6px rgba(0,0,0,0.1)',
    position: 'relative',
    transition: 'transform 0.3s ease',
  },
  planCardHover: {
    transform: 'translateY(-5px)',
  },
  popularCard: {
    border: '2px solid #6366f1',
    transform: 'scale(1.05)',
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
    marginBottom: '30px',
  },
  planName: {
    fontSize: '24px',
    marginBottom: '10px',
  },
  planPrice: {
    display: 'flex',
    alignItems: 'baseline',
    justifyContent: 'center',
    gap: '5px',
  },
  price: {
    fontSize: '48px',
    fontWeight: '700',
    background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
    WebkitBackgroundClip: 'text',
    WebkitTextFillColor: 'transparent',
  },
  period: {
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
    padding: '15px',
    background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
    color: 'white',
    border: 'none',
    borderRadius: '10px',
    fontSize: '16px',
    fontWeight: '600',
    cursor: 'pointer',
    transition: 'all 0.3s ease',
  },
  selectButtonHover: {
    transform: 'translateY(-2px)',
    boxShadow: '0 10px 20px rgba(102, 126, 234, 0.3)',
  },
  info: {
    textAlign: 'center',
    color: '#6b7280',
    fontSize: '14px',
    lineHeight: '2',
  },
};

export default PaymentPage;
