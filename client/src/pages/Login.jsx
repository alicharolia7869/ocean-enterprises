import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { Lock, Mail, ArrowRight } from 'lucide-react';

export default function Login() {
  const { login } = useAuth();
  const [emailOrPhone, setEmailOrPhone] = useState('admin@ocean.com');
  const [password, setPassword] = useState('admin123');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      setLoading(true);
      setError(null);
      await login(emailOrPhone, password);
    } catch (err) {
      setError(err.message || 'Login failed. Please check your credentials.');
    } finally {
      setLoading(false);
    }
  };

  const fillDemo = () => {
    setEmailOrPhone('admin@ocean.com');
    setPassword('admin123');
  };

  return (
    <div style={{
      minHeight: '100vh',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      padding: '20px',
      backgroundColor: '#f8fafc',
      backgroundImage: 'radial-gradient(at 50% 0%, rgba(2, 132, 199, 0.05) 0px, transparent 60%)'
    }}>
      <div style={{
        maxWidth: '400px',
        width: '100%',
        background: '#ffffff',
        borderRadius: '16px',
        border: '1px solid #e2e8f0',
        boxShadow: '0 4px 6px -1px rgba(15, 23, 42, 0.05), 0 2px 4px -2px rgba(15, 23, 42, 0.03)',
        padding: '32px 28px',
        display: 'flex',
        flexDirection: 'column',
        gap: '20px'
      }}>
        {/* Header */}
        <div style={{ textAlign: 'center' }}>
          <div style={{
            width: '48px',
            height: '48px',
            borderRadius: '12px',
            background: '#eff6ff',
            color: '#0284c7',
            display: 'inline-flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontSize: '24px',
            marginBottom: '12px',
            border: '1px solid #bfdbfe'
          }}>
            🌊
          </div>
          <h1 style={{ fontSize: '20px', fontWeight: '700', color: '#0f172a', letterSpacing: '-0.02em' }}>
            Ocean Enterprises
          </h1>
          <p style={{ fontSize: '13px', color: '#64748b', marginTop: '3px' }}>
            Sign in to your distribution ERP workspace
          </p>
        </div>

        {error && (
          <div style={{
            background: '#fff1f2',
            border: '1px solid #fecdd3',
            color: '#9f1239',
            padding: '10px 12px',
            borderRadius: '8px',
            fontSize: '12.5px',
            fontWeight: '500'
          }}>
            {error}
          </div>
        )}

        {/* Login Form */}
        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
          <div>
            <label style={{ fontSize: '12px', fontWeight: '600', color: '#334155', display: 'block', marginBottom: '5px' }}>
              Email or Phone Number
            </label>
            <div style={{ position: 'relative' }}>
              <Mail size={16} color="#94a3b8" style={{ position: 'absolute', left: '11px', top: '11px' }} />
              <input
                type="text"
                required
                className="form-input"
                style={{ paddingLeft: '34px', height: '38px' }}
                value={emailOrPhone}
                onChange={e => setEmailOrPhone(e.target.value)}
                placeholder="admin@ocean.com"
              />
            </div>
          </div>

          <div>
            <label style={{ fontSize: '12px', fontWeight: '600', color: '#334155', display: 'block', marginBottom: '5px' }}>
              Password
            </label>
            <div style={{ position: 'relative' }}>
              <Lock size={16} color="#94a3b8" style={{ position: 'absolute', left: '11px', top: '11px' }} />
              <input
                type="password"
                required
                className="form-input"
                style={{ paddingLeft: '34px', height: '38px' }}
                value={password}
                onChange={e => setPassword(e.target.value)}
                placeholder="••••••••"
              />
            </div>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="btn btn-primary"
            style={{ width: '100%', padding: '10px', fontSize: '14px', borderRadius: '8px', marginTop: '4px' }}
          >
            <span>{loading ? 'Authenticating...' : 'Sign In to Workspace'}</span>
            <ArrowRight size={16} />
          </button>
        </form>

        {/* Preset quick test button */}
        <div style={{
          borderTop: '1px solid #f1f5f9',
          paddingTop: '14px',
          textAlign: 'center'
        }}>
          <button
            type="button"
            onClick={fillDemo}
            style={{
              background: 'transparent',
              border: 'none',
              color: '#0284c7',
              fontSize: '12px',
              fontWeight: '600',
              cursor: 'pointer'
            }}
          >
            ⚡ Auto-fill Default Admin (admin@ocean.com)
          </button>
        </div>
      </div>
    </div>
  );
}
