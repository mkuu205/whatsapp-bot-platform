// web-platform/frontend/src/pages/HomePage.jsx
import React from 'react';
import { Link } from 'react-router-dom';
import './HomePage.css';

function HomePage() {
  return (
    <div className="home-container">
      {/* Hero Section */}
      <section className="hero-section">
        <div className="hero-content">
          <div className="hero-badge">
            <span className="badge-icon">🚀</span>
            <span className="badge-text">AI-Powered WhatsApp Automation</span>
          </div>
          
          <h1 className="hero-title">
            Deploy Smart WhatsApp Bots
            <span className="gradient-text"> in Minutes</span>
          </h1>
          
          <p className="hero-subtitle">
            Automate customer support, marketing, and engagement with our powerful 
            WhatsApp bot platform. No coding required.
          </p>
          
          <div className="hero-buttons">
            <Link to="/register" className="btn-primary">
              Start Free Trial
              <span className="btn-icon">→</span>
            </Link>
            <Link to="/login" className="btn-secondary">
              Sign In
            </Link>
          </div>
          
          <div className="hero-stats">
            <div className="stat-item">
              <div className="stat-number">24/7</div>
              <div className="stat-label">Uptime</div>
            </div>
            <div className="stat-item">
              <div className="stat-number">99%</div>
              <div className="stat-label">Reliability</div>
            </div>
            <div className="stat-item">
              <div className="stat-number">5min</div>
              <div className="stat-label">Setup Time</div>
            </div>
          </div>
        </div>
        
        <div className="hero-visual">
          <div className="floating-card card-1">
            <div className="card-header">
              <div className="card-icon">🤖</div>
              <div className="card-title">Auto Reply</div>
            </div>
            <div className="card-content">
              Intelligent responses 24/7
            </div>
          </div>
          
          <div className="floating-card card-2">
            <div className="card-header">
              <div className="card-icon">📊</div>
              <div className="card-title">Analytics</div>
            </div>
            <div className="card-content">
              Real-time performance tracking
            </div>
          </div>
          
          <div className="floating-card card-3">
            <div className="card-header">
              <div className="card-icon">⚡</div>
              <div className="card-title">Fast</div>
            </div>
            <div className="card-content">
              Instant message delivery
            </div>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section className="features-section">
        <div className="section-header">
          <h2 className="section-title">Powerful Features</h2>
          <p className="section-subtitle">Everything you need to automate WhatsApp communication</p>
        </div>
        
        <div className="features-grid">
          {features.map((feature, index) => (
            <div key={index} className="feature-card" style={{ animationDelay: `${index * 0.1}s` }}>
              <div className="feature-icon">{feature.icon}</div>
              <h3 className="feature-title">{feature.title}</h3>
              <p className="feature-description">{feature.description}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Pricing Section */}
      <section className="pricing-section">
        <div className="section-header">
          <h2 className="section-title">Simple Pricing</h2>
          <p className="section-subtitle">Start free, upgrade as you grow</p>
        </div>
        
        <div className="pricing-cards">
          {pricingPlans.map((plan, index) => (
            <div key={index} className={`pricing-card ${plan.highlight ? 'highlighted' : ''}`}>
              {plan.highlight && <div className="popular-badge">Most Popular</div>}
              <div className="plan-header">
                <h3 className="plan-name">{plan.name}</h3>
                <div className="plan-price">
                  <span className="price-amount">${plan.price}</span>
                  <span className="price-period">/month</span>
                </div>
              </div>
              
              <ul className="plan-features">
                {plan.features.map((feature, i) => (
                  <li key={i} className="feature-item">
                    <span className="check-icon">✓</span>
                    {feature}
                  </li>
                ))}
              </ul>
              
              <Link to="/payment" className="plan-button">
                Get Started
              </Link>
            </div>
          ))}
        </div>
      </section>

      {/* CTA Section */}
      <section className="cta-section">
        <div className="cta-content">
          <h2 className="cta-title">Ready to Automate Your WhatsApp?</h2>
          <p className="cta-text">
            Join thousands of businesses automating their WhatsApp communication. 
            No credit card required for trial.
          </p>
          <Link to="/register" className="cta-button">
            Start Your Free Trial
            <span className="button-icon">🚀</span>
          </Link>
        </div>
      </section>
    </div>
  );
}

const features = [
  {
    icon: '🔗',
    title: 'Easy Pairing',
    description: 'Link WhatsApp with pairing codes, no QR scanning needed'
  },
  {
    icon: '💬',
    title: 'Smart Replies',
    description: 'AI-powered responses that understand context'
  },
  {
    icon: '📈',
    title: 'Real-time Analytics',
    description: 'Monitor bot performance with detailed insights'
  },
  {
    icon: '⚙️',
    title: 'Custom Commands',
    description: 'Configure !commands for complete control'
  },
  {
    icon: '🔒',
    title: 'Secure & Private',
    description: 'End-to-end encryption for all messages'
  },
  {
    icon: '🌐',
    title: '24/7 Online',
    description: 'Your bot stays online always, no downtime'
  }
];

const pricingPlans = [
  {
    name: 'Starter',
    price: '9.99',
    features: [
      '1 WhatsApp Bot',
      'Basic Commands',
      '30 Days History',
      'Email Support',
      '99.5% Uptime'
    ]
  },
  {
    name: 'Professional',
    price: '24.99',
    highlight: true,
    features: [
      '3 WhatsApp Bots',
      'Advanced Commands',
      '90 Days History',
      'Priority Support',
      '99.9% Uptime',
      'Custom Status'
    ]
  },
  {
    name: 'Enterprise',
    price: '49.99',
    features: [
      '10 WhatsApp Bots',
      'Unlimited Commands',
      '1 Year History',
      '24/7 Phone Support',
      '99.99% Uptime',
      'White Label',
      'API Access'
    ]
  }
];

export default HomePage;
