import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useCustomerAuth } from '../context/CustomerAuthContext';
import { ChefHat, User, Mail, Lock, Phone, ArrowRight, AlertCircle } from 'lucide-react';

const ClientLogin = () => {
  const { login, register } = useCustomerAuth();
  const navigate = useNavigate();
  const [mode, setMode] = useState('login'); // 'login' | 'register'
  const [form, setForm] = useState({ name: '', email: '', phone: '', password: '' });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleChange = (e) => {
    setForm(prev => ({ ...prev, [e.target.name]: e.target.value }));
    setError('');
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    try {
      if (mode === 'login') {
        if (!form.phone.trim()) { setError('El teléfono es requerido.'); setLoading(false); return; }
        await login(form.phone, form.password);
      } else {
        if (!form.name.trim()) { setError('El nombre es requerido.'); setLoading(false); return; }
        if (!form.phone.trim() || form.phone.trim().length < 10) { setError('Por motivos de seguridad, requerimos un teléfono válido (al menos 10 dígitos).'); setLoading(false); return; }
        await register(form.name, form.email, form.phone, form.password);
      }
      navigate('/client/menu');
    } catch (err) {
      setError(err.message || 'Error al iniciar sesión.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="theme-switch" style={{
      minHeight: '100vh',
      background: 'var(--bg-color)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      padding: '24px 20px',
      fontFamily: "'Inter', sans-serif"
    }}>
      <div className="card" style={{
        background: 'var(--bg-surface)',
        border: '1px solid var(--border-color)',
        borderRadius: 'var(--radius-xl)',
        padding: '48px 32px',
        width: '100%',
        maxWidth: '400px',
        boxShadow: 'var(--shadow-premium)'
      }}>
        {/* Header */}
        {/* Header - McStyle Branding */}
        <div style={{ textAlign: 'center', marginBottom: '32px' }}>
          <div style={{
            background: 'var(--primary-color)',
            borderRadius: '50%',
            width: '90px',
            height: '90px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            margin: '0 auto 24px',
            boxShadow: '0 8px 24px rgba(218, 41, 28, 0.3)'
          }}>
            <ChefHat size={48} color="#FFC72C" />
          </div>
          <h1 style={{ color: 'var(--text-main)', fontSize: '36px', fontWeight: '900', margin: 0, fontFamily: "'Outfit', sans-serif" }}>Cheesy</h1>
          <p style={{ color: 'var(--text-muted)', fontSize: '15px', marginTop: '10px', fontWeight: '600' }}>
            {mode === 'login' ? '¡Es hora de una hamburguesa!' : 'Crea tu cuenta y empieza a pedir'}
          </p>
        </div>

        {/* Tab switcher */}
        <div style={{ display: 'flex', background: '#f5f5f5', borderRadius: '18px', padding: '6px', marginBottom: '32px', border: '1px solid var(--border-color)' }}>
          {['login', 'register'].map(tab => (
            <button key={tab} onClick={() => { setMode(tab); setError(''); }}
              style={{
                flex: 1, padding: '14px', border: 'none', borderRadius: '14px',
                background: mode === tab ? 'var(--primary-color)' : 'transparent',
                color: mode === tab ? 'white' : 'var(--text-muted)',
                fontWeight: '800', fontSize: '14px', cursor: 'pointer',
                boxShadow: mode === tab ? '0 4px 12px rgba(218, 41, 28, 0.2)' : 'none',
                transition: 'all var(--transition-fast)'
              }}>
              {tab === 'login' ? 'Entrar' : 'Registrar'}
            </button>
          ))}
        </div>

        {/* Error */}
        {error && (
          <div style={{
            background: 'rgba(239, 68, 68, 0.08)', border: '1px solid rgba(239, 68, 68, 0.2)',
            borderRadius: '12px', padding: '14px 16px', marginBottom: '24px',
            display: 'flex', alignItems: 'center', gap: '10px', color: 'var(--error-color)', fontSize: '14px', fontWeight: '500'
          }}>
            <AlertCircle size={18} /> {error}
          </div>
        )}

        {/* Form */}
        <form onSubmit={handleSubmit}>
          {mode === 'register' && (
            <>
              <InputField icon={<User size={20} />} name="name" placeholder="Tu nombre" value={form.name} onChange={handleChange} autoComplete="name" />
              <InputField icon={<Mail size={20} />} name="email" placeholder="Email (opcional)" value={form.email} onChange={handleChange} type="email" autoComplete="email" />
            </>
          )}
          <InputField icon={<Phone size={20} />} name="phone" placeholder="Número celular" value={form.phone} onChange={handleChange} type="tel" required inputMode="tel" autoComplete="tel" />
          <InputField icon={<Lock size={20} />} name="password" placeholder="Contraseña" value={form.password} onChange={handleChange} type="password" required autoComplete="current-password" />

          <button type="submit" disabled={loading} className="btn btn-primary" style={{
            width: '100%', padding: '18px', fontSize: '18px', marginTop: '16px', textTransform: 'uppercase', letterSpacing: '0.5px'
          }}>
            {loading ? 'Preparando...' : (mode === 'login' ? 'Pedir ahora' : 'Crear mi cuenta')}
            {!loading && <ArrowRight size={22} />}
          </button>
        </form>
      </div>
    </div>
  );
};

const InputField = ({ icon, name, placeholder, value, onChange, type = 'text', required, inputMode, autoComplete }) => (
  <div style={{ position: 'relative', marginBottom: '20px' }}>
    <div style={{
      position: 'absolute', left: '18px', top: '50%', transform: 'translateY(-50%)',
      color: 'var(--text-muted)', pointerEvents: 'none'
    }}>{icon}</div>
    <input
      name={name}
      type={type}
      placeholder={placeholder}
      value={value}
      onChange={onChange}
      required={required}
      inputMode={inputMode}
      autoComplete={autoComplete}
      style={{
        width: '100%',
        padding: '18px 18px 18px 54px',
        background: '#f9f9f9',
        border: '2px solid #eeeeee',
        borderRadius: '16px',
        color: 'var(--text-main)',
        fontSize: '16px',
        fontWeight: '700',
        outline: 'none',
        boxSizing: 'border-box',
        transition: 'all var(--transition-fast)',
        WebkitAppearance: 'none'
      }}
      onFocus={(e) => e.target.style.borderColor = 'var(--accent-color)'}
      onBlur={(e) => e.target.style.borderColor = '#eeeeee'}
    />
  </div>
);

export default ClientLogin;
