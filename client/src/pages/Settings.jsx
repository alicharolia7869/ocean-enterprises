import React, { useState, useEffect } from 'react';
import { 
  Settings as SettingsIcon, 
  Building2, 
  Phone, 
  MessageSquare, 
  MapPin, 
  CreditCard, 
  Lock, 
  CheckCircle2, 
  Database,
  ShieldCheck,
  Save
} from 'lucide-react';
import { api } from '../services/api';

export default function Settings() {
  const [settings, setSettings] = useState({
    business_name: 'Ocean Enterprises',
    phone: '+91 98765 43210',
    whatsapp: '919876543210',
    email: 'orders@oceanenterprises.com',
    address: 'Muntaha Building, JVLR Road, Jogeshwari (West), Mumbai - 400102',
    upi_id: 'oceanenterprises@okhdfcbank',
    currency: '₹'
  });
  const [loading, setLoading] = useState(true);
  const [savingSettings, setSavingSettings] = useState(false);

  // Password state
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [passwordMsg, setPasswordMsg] = useState(null);

  useEffect(() => {
    loadSettings();
  }, []);

  const loadSettings = async () => {
    try {
      setLoading(true);
      const res = await api.getSettings();
      if (res.settings) {
        setSettings(prev => ({ ...prev, ...res.settings }));
      }
    } catch (err) {
      console.error('Error fetching settings:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleSaveSettings = async (e) => {
    e.preventDefault();
    try {
      setSavingSettings(true);
      await api.updateSettings(settings);
      alert('Business details updated successfully!');
    } catch (err) {
      alert('Error updating settings: ' + err.message);
    } finally {
      setSavingSettings(false);
    }
  };

  const handleChangePassword = async (e) => {
    e.preventDefault();
    if (newPassword !== confirmPassword) {
      setPasswordMsg({ error: true, text: 'New passwords do not match' });
      return;
    }
    try {
      await api.changePassword(currentPassword, newPassword);
      setPasswordMsg({ error: false, text: 'Password changed successfully!' });
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
    } catch (err) {
      setPasswordMsg({ error: true, text: err.message || 'Failed to change password' });
    }
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '24px', maxWidth: '900px' }}>
      {/* Header */}
      <div>
        <h2 style={{ fontSize: '24px', fontWeight: '800', color: '#0f172a' }}>
          Business Configuration & Settings
        </h2>
        <p style={{ fontSize: '13px', color: '#64748b' }}>
          Configure Ocean Enterprises identity, contact details, payment handles, and security
        </p>
      </div>

      {/* Business Details Form */}
      <div className="ocean-card">
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '16px', borderBottom: '1px solid #e2e8f0', paddingBottom: '12px' }}>
          <Building2 size={20} color="#0284c7" />
          <h3 style={{ fontSize: '16px', fontWeight: '800', color: '#0f172a' }}>
            Company Profile & Contact Information
          </h3>
        </div>

        <form onSubmit={handleSaveSettings} style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
            <div>
              <label style={{ fontSize: '12px', fontWeight: '700', color: '#475569', display: 'block', marginBottom: '4px' }}>
                Business Name:
              </label>
              <input
                type="text"
                required
                className="form-input"
                value={settings.business_name}
                onChange={e => setSettings({ ...settings, business_name: e.target.value })}
              />
            </div>

            <div>
              <label style={{ fontSize: '12px', fontWeight: '700', color: '#475569', display: 'block', marginBottom: '4px' }}>
                UPI ID (for WhatsApp Payment Reminders):
              </label>
              <input
                type="text"
                required
                className="form-input"
                value={settings.upi_id}
                onChange={e => setSettings({ ...settings, upi_id: e.target.value })}
                placeholder="e.g. oceanenterprises@okhdfcbank"
              />
            </div>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
            <div>
              <label style={{ fontSize: '12px', fontWeight: '700', color: '#475569', display: 'block', marginBottom: '4px' }}>
                Phone Number (Calls):
              </label>
              <input
                type="text"
                required
                className="form-input"
                value={settings.phone}
                onChange={e => setSettings({ ...settings, phone: e.target.value })}
              />
            </div>

            <div>
              <label style={{ fontSize: '12px', fontWeight: '700', color: '#475569', display: 'block', marginBottom: '4px' }}>
                WhatsApp Number (for Deep Links):
              </label>
              <input
                type="text"
                required
                className="form-input"
                value={settings.whatsapp}
                onChange={e => setSettings({ ...settings, whatsapp: e.target.value })}
                placeholder="Country code + 10 digits e.g. 919876543210"
              />
            </div>
          </div>

          <div>
            <label style={{ fontSize: '12px', fontWeight: '700', color: '#475569', display: 'block', marginBottom: '4px' }}>
              Depot / Warehouse Address:
            </label>
            <textarea
              rows={2}
              className="form-textarea"
              value={settings.address}
              onChange={e => setSettings({ ...settings, address: e.target.value })}
            />
          </div>

          <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '6px' }}>
            <button type="submit" disabled={savingSettings} className="btn btn-primary" style={{ padding: '10px 24px' }}>
              <Save size={16} />
              <span>{savingSettings ? 'Saving...' : 'Save Business Settings'}</span>
            </button>
          </div>
        </form>
      </div>

      {/* Security & Password Form */}
      <div className="ocean-card">
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '16px', borderBottom: '1px solid #e2e8f0', paddingBottom: '12px' }}>
          <Lock size={20} color="#0284c7" />
          <h3 style={{ fontSize: '16px', fontWeight: '800', color: '#0f172a' }}>
            Change Admin Password
          </h3>
        </div>

        {passwordMsg && (
          <div style={{
            padding: '10px 14px',
            borderRadius: '10px',
            marginBottom: '14px',
            fontSize: '13px',
            fontWeight: '600',
            background: passwordMsg.error ? '#ffe4e6' : '#dcfce7',
            color: passwordMsg.error ? '#be123c' : '#15803d',
            border: `1px solid ${passwordMsg.error ? '#fecdd3' : '#a7f3d0'}`
          }}>
            {passwordMsg.text}
          </div>
        )}

        <form onSubmit={handleChangePassword} style={{ display: 'flex', flexDirection: 'column', gap: '12px', maxWidth: '480px' }}>
          <div>
            <label style={{ fontSize: '12px', fontWeight: '700', color: '#475569', display: 'block', marginBottom: '4px' }}>
              Current Password:
            </label>
            <input
              type="password"
              required
              className="form-input"
              value={currentPassword}
              onChange={e => setCurrentPassword(e.target.value)}
            />
          </div>

          <div>
            <label style={{ fontSize: '12px', fontWeight: '700', color: '#475569', display: 'block', marginBottom: '4px' }}>
              New Password (min 6 characters):
            </label>
            <input
              type="password"
              required
              minLength={6}
              className="form-input"
              value={newPassword}
              onChange={e => setNewPassword(e.target.value)}
            />
          </div>

          <div>
            <label style={{ fontSize: '12px', fontWeight: '700', color: '#475569', display: 'block', marginBottom: '4px' }}>
              Confirm New Password:
            </label>
            <input
              type="password"
              required
              minLength={6}
              className="form-input"
              value={confirmPassword}
              onChange={e => setConfirmPassword(e.target.value)}
            />
          </div>

          <button type="submit" className="btn btn-secondary" style={{ alignSelf: 'flex-start', marginTop: '6px' }}>
            <ShieldCheck size={16} />
            <span>Update Password</span>
          </button>
        </form>
      </div>
    </div>
  );
}
