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
        <div style={{ textAlign: 'center', marginBottom: '32px' }}>
          <div style={{
            background: 'linear-gradient(135deg, var(--primary-color), var(--secondary-color))',
            borderRadius: '50%',
            width: '80px',
            height: '80px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            margin: '0 auto 20px',
            boxShadow: '0 10px 20px rgba(249, 115, 22, 0.25)'
          }}>
            <ChefHat size={40} color="white" />
          </div>
          <h1 style={{ color: 'var(--text-main)', fontSize: '32px', fontWeight: '800', margin: 0, fontFamily: "'Outfit', sans-serif" }}>Cheesy</h1>
          <p style={{ color: 'var(--text-muted)', fontSize: '14px', marginTop: '8px', fontWeight: '500' }}>
            {mode === 'login' ? '¡Qué bueno verte de nuevo!' : 'Únete a la familia Cheesy'}
          </p>
        </div>

        {/* Tab switcher */}
        <div style={{ display: 'flex', background: 'var(--bg-container)', borderRadius: '14px', padding: '5px', marginBottom: '32px' }}>
          {['login', 'register'].map(tab => (
            <button key={tab} onClick={() => { setMode(tab); setError(''); }}
              style={{
                flex: 1, padding: '12px', border: 'none', borderRadius: '10px',
                background: mode === tab ? 'var(--bg-surface)' : 'transparent',
                color: mode === tab ? 'var(--text-main)' : 'var(--text-muted)',
                fontWeight: '700', fontSize: '14px', cursor: 'pointer',
                boxShadow: mode === tab ? 'var(--shadow-sm)' : 'none',
                transition: 'all 0.2s ease'
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
              <InputField icon={<User size={18} />} name="name" placeholder="Tu nombre" value={form.name} onChange={handleChange} autoComplete="name" />
              <InputField icon={<Mail size={18} />} name="email" placeholder="Email (opcional)" value={form.email} onChange={handleChange} type="email" autoComplete="email" />
            </>
          )}
          <InputField icon={<Phone size={18} />} name="phone" placeholder="Número celular" value={form.phone} onChange={handleChange} type="tel" required inputMode="tel" autoComplete="tel" />
          <InputField icon={<Lock size={18} />} name="password" placeholder="Contraseña" value={form.password} onChange={handleChange} type="password" required autoComplete="current-password" />

          <button type="submit" disabled={loading} className="btn btn-primary" style={{
            width: '100%', padding: '16px', fontSize: '16px', marginTop: '12px'
          }}>
            {loading ? 'Cocinando acceso...' : (mode === 'login' ? 'Entrar ahora' : 'Crear mi cuenta')}
            {!loading && <ArrowRight size={20} />}
          </button>
        </form>
      </div>
    </div>
  );
};

const InputField = ({ icon, name, placeholder, value, onChange, type = 'text', required, inputMode, autoComplete }) => (
  <div style={{ position: 'relative', marginBottom: '16px' }}>
    <div style={{
      position: 'absolute', left: '16px', top: '50%', transform: 'translateY(-50%)',
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
        padding: '16px 16px 16px 48px',
        background: 'var(--bg-container)',
        border: '1px solid var(--border-color)',
        borderRadius: '14px',
        color: 'var(--text-main)',
        fontSize: '15px',
        fontWeight: '500',
        outline: 'none',
        boxSizing: 'border-box',
        transition: 'all 0.2s',
        WebkitAppearance: 'none'
      }}
      onFocus={(e) => e.target.style.borderColor = 'var(--primary-color)'}
      onBlur={(e) => e.target.style.borderColor = 'var(--border-color)'}
    />
  </div>
);

export default ClientLogin;
