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
        await login(form.email, form.password);
      } else {
        if (!form.name.trim()) { setError('El nombre es requerido.'); setLoading(false); return; }
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
    <div style={{
      minHeight: '100vh',
      background: 'linear-gradient(135deg, #1a1a2e 0%, #16213e 50%, #0f3460 100%)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      padding: '20px',
      fontFamily: "'Inter', sans-serif"
    }}>
      <div style={{
        background: 'rgba(255,255,255,0.05)',
        backdropFilter: 'blur(20px)',
        border: '1px solid rgba(255,255,255,0.1)',
        borderRadius: '24px',
        padding: '48px 40px',
        width: '100%',
        maxWidth: '420px',
        boxShadow: '0 25px 50px rgba(0,0,0,0.5)'
      }}>
        {/* Header */}
        <div style={{ textAlign: 'center', marginBottom: '36px' }}>
          <div style={{
            background: 'linear-gradient(135deg, #f97316, #ef4444)',
            borderRadius: '50%',
            width: '72px',
            height: '72px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            margin: '0 auto 16px',
            boxShadow: '0 8px 24px rgba(249,115,22,0.4)'
          }}>
            <ChefHat size={36} color="white" />
          </div>
          <h1 style={{ color: 'white', fontSize: '28px', fontWeight: '800', margin: 0 }}>🧀 Cheesy</h1>
          <p style={{ color: 'rgba(255,255,255,0.5)', fontSize: '14px', marginTop: '6px' }}>
            {mode === 'login' ? 'Bienvenido de vuelta' : 'Crea tu cuenta'}
          </p>
        </div>

        {/* Tab switcher */}
        <div style={{ display: 'flex', background: 'rgba(255,255,255,0.07)', borderRadius: '12px', padding: '4px', marginBottom: '28px' }}>
          {['login', 'register'].map(tab => (
            <button key={tab} onClick={() => { setMode(tab); setError(''); }}
              style={{
                flex: 1, padding: '10px', border: 'none', borderRadius: '10px',
                background: mode === tab ? 'rgba(249,115,22,0.9)' : 'transparent',
                color: mode === tab ? 'white' : 'rgba(255,255,255,0.5)',
                fontWeight: '600', fontSize: '14px', cursor: 'pointer',
                transition: 'all 0.2s ease'
              }}>
              {tab === 'login' ? 'Iniciar Sesión' : 'Registrarse'}
            </button>
          ))}
        </div>

        {/* Error */}
        {error && (
          <div style={{
            background: 'rgba(239,68,68,0.15)', border: '1px solid rgba(239,68,68,0.3)',
            borderRadius: '10px', padding: '12px 16px', marginBottom: '20px',
            display: 'flex', alignItems: 'center', gap: '8px', color: '#fca5a5', fontSize: '14px'
          }}>
            <AlertCircle size={16} /> {error}
          </div>
        )}

        {/* Form */}
        <form onSubmit={handleSubmit}>
          {mode === 'register' && (
            <>
              <InputField icon={<User size={16} />} name="name" placeholder="Tu nombre completo" value={form.name} onChange={handleChange} />
              <InputField icon={<Phone size={16} />} name="phone" placeholder="Teléfono (opcional)" value={form.phone} onChange={handleChange} type="tel" />
            </>
          )}
          <InputField icon={<Mail size={16} />} name="email" placeholder="Correo electrónico" value={form.email} onChange={handleChange} type="email" required />
          <InputField icon={<Lock size={16} />} name="password" placeholder="Contraseña" value={form.password} onChange={handleChange} type="password" required />

          <button type="submit" disabled={loading} style={{
            width: '100%', padding: '14px', border: 'none', borderRadius: '12px',
            background: loading ? 'rgba(249,115,22,0.5)' : 'linear-gradient(135deg, #f97316, #ef4444)',
            color: 'white', fontSize: '16px', fontWeight: '700', cursor: loading ? 'not-allowed' : 'pointer',
            display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px',
            boxShadow: '0 4px 16px rgba(249,115,22,0.35)', marginTop: '8px',
            transition: 'all 0.2s ease'
          }}>
            {loading ? 'Procesando...' : (mode === 'login' ? 'Entrar' : 'Crear cuenta')}
            {!loading && <ArrowRight size={18} />}
          </button>
        </form>
      </div>
    </div>
  );
};

const InputField = ({ icon, name, placeholder, value, onChange, type = 'text', required }) => (
  <div style={{ position: 'relative', marginBottom: '14px' }}>
    <div style={{
      position: 'absolute', left: '14px', top: '50%', transform: 'translateY(-50%)',
      color: 'rgba(255,255,255,0.4)'
    }}>{icon}</div>
    <input
      name={name}
      type={type}
      placeholder={placeholder}
      value={value}
      onChange={onChange}
      required={required}
      style={{
        width: '100%',
        padding: '13px 14px 13px 40px',
        background: 'rgba(255,255,255,0.07)',
        border: '1px solid rgba(255,255,255,0.12)',
        borderRadius: '12px',
        color: 'white',
        fontSize: '14px',
        outline: 'none',
        boxSizing: 'border-box',
        transition: 'border-color 0.2s'
      }}
    />
  </div>
);

export default ClientLogin;
