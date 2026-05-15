import React, { useState, useEffect } from 'react';
import { 
  createUserWithEmailAndPassword, 
  sendEmailVerification,
  signInWithEmailAndPassword,
  onAuthStateChanged,
  updateProfile,
  User
} from 'firebase/auth';
import { doc, setDoc, getDoc, serverTimestamp } from 'firebase/firestore';
import { auth, db } from '../lib/firebase';
import { motion, AnimatePresence } from 'motion/react';
import { Eye, EyeOff, ArrowLeft, Mail, RefreshCw, Clock } from 'lucide-react';

interface AuthFlowProps {
  onAuthenticated: (user: User) => void;
}

type Screen = 'home' | 'login' | 'register' | 'verify-email' | 'pending-approval';

const inputClass = "w-full px-4 py-3.5 rounded-2xl border border-white/10 bg-white/5 text-white placeholder:text-white/30 text-sm font-medium outline-none focus:ring-2 focus:ring-cyan-500/50 transition-all";
const labelClass = "text-[10px] font-black uppercase tracking-widest text-white/50 ml-1 mb-1.5 block";

export default function AuthFlow({ onAuthenticated }: AuthFlowProps) {
  const [screen, setScreen] = useState<Screen>('home');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showPassword, setShowPassword] = useState(false);
  const [resending, setResending] = useState(false);

  // Login form state
  const [loginEmail, setLoginEmail] = useState('');
  const [loginPassword, setLoginPassword] = useState('');

  // Register form state
  const [form, setForm] = useState({
    name: '', age: '', address: '', phone: '', email: '', password: '', confirm: ''
  });

  const [pendingUser, setPendingUser] = useState<User | null>(null);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    try {
      const cred = await signInWithEmailAndPassword(auth, loginEmail, loginPassword);
      if (!cred.user.emailVerified) {
        setPendingUser(cred.user);
        setScreen('verify-email');
        return;
      }
      // Check approval
      const driverDoc = await getDoc(doc(db, 'drivers', cred.user.uid));
      if (!driverDoc.exists() || driverDoc.data()?.approved !== true) {
        setPendingUser(cred.user);
        setScreen('pending-approval');
        return;
      }
      onAuthenticated(cred.user);
    } catch (err: any) {
      const msgs: Record<string, string> = {
        'auth/user-not-found': 'No existe una cuenta con este correo.',
        'auth/wrong-password': 'Contraseña incorrecta.',
        'auth/invalid-credential': 'Correo o contraseña incorrectos.',
        'auth/too-many-requests': 'Demasiados intentos. Intenta más tarde.',
      };
      setError(msgs[err.code] || err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    if (form.password !== form.confirm) { setError('Las contraseñas no coinciden.'); return; }
    if (form.password.length < 6) { setError('La contraseña debe tener al menos 6 caracteres.'); return; }
    if (!form.name || !form.age || !form.address || !form.phone) { setError('Completa todos los campos.'); return; }
    setLoading(true);
    try {
      const cred = await createUserWithEmailAndPassword(auth, form.email, form.password);
      await updateProfile(cred.user, { displayName: form.name });
      await sendEmailVerification(cred.user);
      await setDoc(doc(db, 'drivers', cred.user.uid), {
        name: form.name,
        age: Number(form.age),
        address: form.address,
        phone: form.phone,
        email: form.email,
        approved: false,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      });
      setPendingUser(cred.user);
      setScreen('verify-email');
    } catch (err: any) {
      const msgs: Record<string, string> = {
        'auth/email-already-in-use': 'Este correo ya está registrado. Intenta iniciar sesión.',
        'auth/invalid-email': 'El correo no es válido.',
        'auth/weak-password': 'Contraseña muy débil. Usa al menos 6 caracteres.',
      };
      setError(msgs[err.code] || err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleResendEmail = async () => {
    if (!pendingUser) return;
    setResending(true);
    try {
      await sendEmailVerification(pendingUser);
      alert('Correo de verificación reenviado. Revisa tu bandeja.');
    } catch {
      alert('Error al reenviar. Intenta más tarde.');
    } finally {
      setResending(false);
    }
  };

  const handleCheckVerification = async () => {
    if (!pendingUser) return;
    setLoading(true);
    try {
      await pendingUser.reload();
      if (pendingUser.emailVerified) {
        const driverDoc = await getDoc(doc(db, 'drivers', pendingUser.uid));
        if (!driverDoc.exists() || driverDoc.data()?.approved !== true) {
          setScreen('pending-approval');
        } else {
          onAuthenticated(pendingUser);
        }
      } else {
        alert('Tu correo aún no está verificado. Revisa tu bandeja de entrada.');
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div 
      className="min-h-screen flex flex-col font-sans relative overflow-hidden"
      style={{ background: 'linear-gradient(160deg, #0f172a 0%, #0c4a6e 55%, #134e4a 100%)' }}
    >
      {/* Glows */}
      <div className="absolute top-0 right-0 w-80 h-80 bg-cyan-500/8 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute bottom-24 left-0 w-64 h-64 bg-teal-500/8 rounded-full blur-3xl pointer-events-none" />

      <div className="flex-1 flex flex-col items-center justify-center p-6">
        <AnimatePresence mode="wait">

          {/* HOME SCREEN */}
          {screen === 'home' && (
            <motion.div
              key="home"
              initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -20 }}
              className="w-full max-w-sm flex flex-col items-center gap-10"
            >
              <div className="flex flex-col items-center gap-5">
                <motion.img
                  initial={{ scale: 0.7, rotate: -8 }}
                  animate={{ scale: 1, rotate: 0 }}
                  transition={{ type: 'spring', stiffness: 200, delay: 0.1 }}
                  src="/logo repartidor.png"
                  alt="Repartidor PRO"
                  className="w-28 h-28 object-contain drop-shadow-2xl"
                />
                <div className="text-center">
                  <h1 className="text-4xl font-black tracking-tighter text-white">
                    Repartidor<span className="text-cyan-400">PRO</span>
                  </h1>
                  <p className="text-sky-300/50 text-sm mt-1.5 font-medium">Plataforma de reparto inteligente</p>
                </div>
              </div>

              <div className="flex gap-2 flex-wrap justify-center">
                {['🗺 Mapa en vivo', '📦 Pedidos reales', '⚡ Tiempo real'].map(f => (
                  <span key={f} className="px-3 py-1.5 rounded-full text-[10px] font-bold text-cyan-200/60 uppercase tracking-widest border border-cyan-500/15"
                    style={{ background: 'rgba(6,182,212,0.06)' }}>
                    {f}
                  </span>
                ))}
              </div>

              <div className="w-full flex flex-col gap-3">
                <button
                  onClick={() => setScreen('login')}
                  className="w-full py-4 font-black rounded-2xl text-sm tracking-wide shadow-2xl active:scale-95 transition-transform text-white"
                  style={{ background: 'linear-gradient(135deg, #06b6d4, #14b8a6)' }}
                >
                  Ingresar a mi cuenta
                </button>
                <button
                  onClick={() => setScreen('register')}
                  className="w-full py-4 bg-white/8 border border-white/10 text-white font-black rounded-2xl text-sm tracking-wide active:scale-95 transition-transform"
                >
                  Crear nueva cuenta
                </button>
              </div>
            </motion.div>
          )}

          {/* LOGIN SCREEN */}
          {screen === 'login' && (
            <motion.div
              key="login"
              initial={{ opacity: 0, x: 30 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -30 }}
              className="w-full max-w-sm flex flex-col gap-6"
            >
              <button onClick={() => { setScreen('home'); setError(null); }} className="flex items-center gap-2 text-white/50 hover:text-white transition-colors self-start text-sm">
                <ArrowLeft size={16} /> Volver
              </button>
              <div>
                <h2 className="text-3xl font-black text-white tracking-tight">Ingresar</h2>
                <p className="text-white/40 text-sm mt-1">Accede con tu correo y contraseña</p>
              </div>
              <form onSubmit={handleLogin} className="flex flex-col gap-4">
                <div>
                  <label className={labelClass}>Correo electrónico</label>
                  <input type="email" value={loginEmail} onChange={e => setLoginEmail(e.target.value)} placeholder="tu@correo.com" className={inputClass} required />
                </div>
                <div>
                  <label className={labelClass}>Contraseña</label>
                  <div className="relative">
                    <input type={showPassword ? 'text' : 'password'} value={loginPassword} onChange={e => setLoginPassword(e.target.value)} placeholder="••••••••" className={inputClass + ' pr-12'} required />
                    <button type="button" onClick={() => setShowPassword(!showPassword)} className="absolute right-4 top-1/2 -translate-y-1/2 text-white/30 hover:text-white/70">
                      {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                    </button>
                  </div>
                </div>
                {error && <p className="text-red-300 text-xs font-medium bg-red-500/10 border border-red-500/20 rounded-xl p-3">{error}</p>}
                <button type="submit" disabled={loading}
                  className="w-full py-4 font-black rounded-2xl text-sm text-white active:scale-95 transition-transform disabled:opacity-50 mt-2"
                  style={{ background: 'linear-gradient(135deg, #06b6d4, #14b8a6)' }}>
                  {loading ? <span className="flex items-center justify-center gap-2"><span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" /> Ingresando...</span> : 'Ingresar'}
                </button>
              </form>
              <p className="text-center text-white/30 text-xs">¿No tienes cuenta? <button onClick={() => { setScreen('register'); setError(null); }} className="text-cyan-400 font-bold hover:underline">Regístrate</button></p>
            </motion.div>
          )}

          {/* REGISTER SCREEN */}
          {screen === 'register' && (
            <motion.div
              key="register"
              initial={{ opacity: 0, x: 30 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -30 }}
              className="w-full max-w-sm flex flex-col gap-5"
            >
              <button onClick={() => { setScreen('home'); setError(null); }} className="flex items-center gap-2 text-white/50 hover:text-white transition-colors self-start text-sm">
                <ArrowLeft size={16} /> Volver
              </button>
              <div>
                <h2 className="text-3xl font-black text-white tracking-tight">Crear Cuenta</h2>
                <p className="text-white/40 text-sm mt-1">Regístrate como repartidor</p>
              </div>
              <form onSubmit={handleRegister} className="flex flex-col gap-3">
                <div>
                  <label className={labelClass}>Nombre completo</label>
                  <input type="text" value={form.name} onChange={e => setForm(f=>({...f, name: e.target.value}))} placeholder="Juan García López" className={inputClass} required />
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className={labelClass}>Edad</label>
                    <input type="number" min="18" max="70" value={form.age} onChange={e => setForm(f=>({...f, age: e.target.value}))} placeholder="25" className={inputClass} required />
                  </div>
                  <div>
                    <label className={labelClass}>Teléfono</label>
                    <input type="tel" value={form.phone} onChange={e => setForm(f=>({...f, phone: e.target.value}))} placeholder="555-123-4567" className={inputClass} required />
                  </div>
                </div>
                <div>
                  <label className={labelClass}>Dirección</label>
                  <input type="text" value={form.address} onChange={e => setForm(f=>({...f, address: e.target.value}))} placeholder="Calle, Colonia, Ciudad" className={inputClass} required />
                </div>
                <div>
                  <label className={labelClass}>Correo electrónico</label>
                  <input type="email" value={form.email} onChange={e => setForm(f=>({...f, email: e.target.value}))} placeholder="tu@correo.com" className={inputClass} required />
                </div>
                <div>
                  <label className={labelClass}>Contraseña</label>
                  <div className="relative">
                    <input type={showPassword ? 'text' : 'password'} value={form.password} onChange={e => setForm(f=>({...f, password: e.target.value}))} placeholder="Mín. 6 caracteres" className={inputClass + ' pr-12'} required />
                    <button type="button" onClick={() => setShowPassword(!showPassword)} className="absolute right-4 top-1/2 -translate-y-1/2 text-white/30 hover:text-white/70">
                      {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                    </button>
                  </div>
                </div>
                <div>
                  <label className={labelClass}>Confirmar contraseña</label>
                  <input type="password" value={form.confirm} onChange={e => setForm(f=>({...f, confirm: e.target.value}))} placeholder="Repite tu contraseña" className={inputClass} required />
                </div>
                {error && <p className="text-red-300 text-xs font-medium bg-red-500/10 border border-red-500/20 rounded-xl p-3">{error}</p>}
                <button type="submit" disabled={loading}
                  className="w-full py-4 font-black rounded-2xl text-sm text-white active:scale-95 transition-transform disabled:opacity-50 mt-1"
                  style={{ background: 'linear-gradient(135deg, #06b6d4, #14b8a6)' }}>
                  {loading ? <span className="flex items-center justify-center gap-2"><span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />Registrando...</span> : 'Crear Cuenta'}
                </button>
              </form>
              <p className="text-center text-white/30 text-xs">¿Ya tienes cuenta? <button onClick={() => { setScreen('login'); setError(null); }} className="text-cyan-400 font-bold hover:underline">Inicia sesión</button></p>
            </motion.div>
          )}

          {/* VERIFY EMAIL SCREEN */}
          {screen === 'verify-email' && (
            <motion.div
              key="verify"
              initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.95 }}
              className="w-full max-w-sm flex flex-col items-center gap-6 text-center"
            >
              <div className="w-20 h-20 rounded-3xl flex items-center justify-center" style={{ background: 'rgba(6,182,212,0.15)' }}>
                <Mail size={40} className="text-cyan-400" />
              </div>
              <div>
                <h2 className="text-2xl font-black text-white tracking-tight">Verifica tu correo</h2>
                <p className="text-white/50 text-sm mt-2 leading-relaxed">
                  Te enviamos un enlace de confirmación a<br />
                  <span className="text-cyan-400 font-bold">{pendingUser?.email}</span>
                </p>
              </div>
              <div className="bg-white/5 border border-white/10 rounded-2xl p-4 text-xs text-white/50 text-left leading-relaxed">
                📬 Revisa tu bandeja de entrada y haz clic en el enlace. Si no lo ves, revisa la carpeta de spam.
              </div>
              <div className="w-full flex flex-col gap-3">
                <button onClick={handleCheckVerification} disabled={loading}
                  className="w-full py-4 font-black rounded-2xl text-sm text-white active:scale-95 transition-transform disabled:opacity-50"
                  style={{ background: 'linear-gradient(135deg, #06b6d4, #14b8a6)' }}>
                  {loading ? 'Verificando...' : '✓ Ya lo verifiqué, Continuar'}
                </button>
                <button onClick={handleResendEmail} disabled={resending}
                  className="w-full py-3 bg-white/5 border border-white/10 text-white/60 font-bold rounded-2xl text-xs flex items-center justify-center gap-2 active:scale-95 transition-transform">
                  {resending ? <><RefreshCw size={14} className="animate-spin" /> Enviando...</> : <><RefreshCw size={14} /> Reenviar correo</>}
                </button>
              </div>
            </motion.div>
          )}

          {/* PENDING APPROVAL SCREEN */}
          {screen === 'pending-approval' && (
            <motion.div
              key="pending"
              initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.95 }}
              className="w-full max-w-sm flex flex-col items-center gap-6 text-center"
            >
              <div className="w-20 h-20 rounded-3xl flex items-center justify-center" style={{ background: 'rgba(251,191,36,0.12)' }}>
                <Clock size={40} className="text-amber-400" />
              </div>
              <div>
                <h2 className="text-2xl font-black text-white tracking-tight">Solicitud Enviada</h2>
                <p className="text-white/50 text-sm mt-2 leading-relaxed">
                  Tu registro fue recibido. Un administrador revisará tu solicitud y te autorizará pronto.
                </p>
              </div>
              <div className="bg-amber-500/8 border border-amber-500/20 rounded-2xl p-5 text-sm text-amber-200/70 leading-relaxed">
                ⏳ Recibirás acceso una vez que el admin apruebe tu cuenta. Puedes cerrar la app y volver más tarde.
              </div>
              <button onClick={() => auth.signOut()}
                className="text-white/30 text-xs font-bold hover:text-white/60 transition-colors">
                Cerrar Sesión
              </button>
            </motion.div>
          )}

        </AnimatePresence>
      </div>

      {/* Searmo footer */}
      <div className="flex flex-col items-center gap-1.5 pb-6 opacity-30 hover:opacity-80 transition-all duration-700">
        <img src="/Logo SEARMO estilo t.png" alt="Searmo" className="h-5 w-auto object-contain" />
        <p className="text-[7px] font-black uppercase tracking-[0.5em] text-sky-300/60">Powered by Searmo</p>
      </div>
    </div>
  );
}
