import React, { useState } from 'react';
import { 
  createUserWithEmailAndPassword, 
  sendEmailVerification,
  signInWithEmailAndPassword,
  updateProfile,
  User
} from 'firebase/auth';
import { doc, setDoc, getDoc, serverTimestamp } from 'firebase/firestore';
import { auth, db } from '../lib/firebase';
import { motion, AnimatePresence } from 'motion/react';
import { Eye, EyeOff, ArrowLeft, Mail, RefreshCw, Clock, User as UserIcon, Phone, MapPin, Lock, ChevronRight } from 'lucide-react';

interface AuthFlowProps {
  onAuthenticated: (user: User) => void;
}

type Screen = 'home' | 'login' | 'register' | 'verify-email' | 'pending-approval';

const inputClass = "w-full px-5 py-4 rounded-2xl border border-white/10 bg-white/[0.03] text-white placeholder:text-white/20 text-sm font-medium outline-none focus:ring-2 focus:ring-cyan-500/40 focus:bg-white/[0.05] transition-all";
const labelClass = "text-[10px] font-black uppercase tracking-[0.2em] text-white/40 ml-2 mb-2 block";

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
      setError(msgs[err.code] || 'Error al ingresar. Revisa tus datos.');
    } finally {
      setLoading(false);
    }
  };

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    if (form.password !== form.confirm) { setError('Las contraseñas no coinciden.'); return; }
    if (form.password.length < 6) { setError('Usa al menos 6 caracteres.'); return; }
    if (!form.name || !form.phone) { setError('Completa los campos obligatorios.'); return; }
    setLoading(true);
    try {
      const cred = await createUserWithEmailAndPassword(auth, form.email, form.password);
      await updateProfile(cred.user, { displayName: form.name });
      await sendEmailVerification(cred.user);
      await setDoc(doc(db, 'drivers', cred.user.uid), {
        name: form.name,
        age: Number(form.age) || 0,
        address: form.address,
        phone: form.phone,
        email: form.email,
        approved: false,
        createdAt: serverTimestamp(),
      });
      setPendingUser(cred.user);
      setScreen('verify-email');
    } catch (err: any) {
      const msgs: Record<string, string> = {
        'auth/email-already-in-use': 'Este correo ya está registrado.',
        'auth/invalid-email': 'El correo no es válido.',
      };
      setError(msgs[err.code] || 'Error en el registro.');
    } finally {
      setLoading(false);
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
        alert('Correo no verificado todavía.');
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#020617] text-white font-sans flex flex-col relative overflow-hidden">
      {/* Decorative Blur */}
      <div className="absolute top-0 right-0 w-96 h-96 bg-cyan-600/10 rounded-full blur-[100px] pointer-events-none" />
      <div className="absolute bottom-0 left-0 w-80 h-80 bg-blue-900/10 rounded-full blur-[100px] pointer-events-none" />

      <div className="flex-1 flex flex-col items-center justify-center p-6 relative z-10">
        <AnimatePresence mode="wait">

          {/* HOME SCREEN */}
          {screen === 'home' && (
            <motion.div
              key="home"
              initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 1.05 }}
              className="w-full max-w-sm flex flex-col items-center gap-12"
            >
              <div className="flex flex-col items-center gap-6">
                <div className="w-24 h-24 bg-gradient-to-br from-cyan-500 to-blue-700 rounded-[2.5rem] p-4 shadow-2xl shadow-cyan-900/40 border border-white/20">
                   <img src="/logo.png" alt="Logo" className="w-full h-full object-contain brightness-0 invert" />
                </div>
                <div className="text-center">
                  <h1 className="text-4xl font-black tracking-tighter leading-tight">
                    REPARTIDOR<br/><span className="text-cyan-400">ELITE PRO</span>
                  </h1>
                  <p className="text-white/40 text-xs mt-3 font-bold uppercase tracking-[0.2em]">Únete a la nueva era del reparto</p>
                </div>
              </div>

              <div className="w-full flex flex-col gap-4">
                <button
                  onClick={() => setScreen('login')}
                  className="w-full py-5 bg-gradient-to-r from-cyan-600 to-blue-600 font-black rounded-2xl text-[11px] tracking-[0.3em] uppercase shadow-2xl shadow-cyan-900/20 active:scale-95 transition-all flex items-center justify-center gap-3"
                >
                  Iniciar Sesión <ChevronRight size={14} />
                </button>
                <button
                  onClick={() => setScreen('register')}
                  className="w-full py-5 bg-white/[0.03] border border-white/10 text-white font-black rounded-2xl text-[11px] tracking-[0.3em] uppercase active:scale-95 transition-all hover:bg-white/[0.05]"
                >
                  Registrarme Ahora
                </button>
              </div>
            </motion.div>
          )}

          {/* LOGIN SCREEN */}
          {screen === 'login' && (
            <motion.div
              key="login"
              initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }}
              className="w-full max-w-sm flex flex-col gap-8"
            >
              <button onClick={() => setScreen('home')} className="flex items-center gap-2 text-white/40 hover:text-white transition-all text-[10px] font-black uppercase tracking-widest">
                <ArrowLeft size={14} /> Volver al Inicio
              </button>
              <div>
                <h2 className="text-3xl font-black tracking-tight">Bienvenido de <span className="text-cyan-400">Vuelta</span></h2>
                <p className="text-white/40 text-xs mt-2 uppercase tracking-widest font-bold">Ingresa a tu cuenta de socio</p>
              </div>
              <form onSubmit={handleLogin} className="space-y-5">
                <div className="space-y-1">
                  <label className={labelClass}><Mail size={10} className="inline mr-1" /> Correo Electrónico</label>
                  <input type="email" value={loginEmail} onChange={e => setLoginEmail(e.target.value)} placeholder="ejemplo@correo.com" className={inputClass} required />
                </div>
                <div className="space-y-1">
                  <label className={labelClass}><Lock size={10} className="inline mr-1" /> Contraseña</label>
                  <div className="relative">
                    <input type={showPassword ? 'text' : 'password'} value={loginPassword} onChange={e => setLoginPassword(e.target.value)} placeholder="••••••••" className={inputClass} required />
                    <button type="button" onClick={() => setShowPassword(!showPassword)} className="absolute right-4 top-1/2 -translate-y-1/2 text-white/20 hover:text-white/60">
                      {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                    </button>
                  </div>
                </div>
                {error && <div className="bg-red-500/10 border border-red-500/20 text-red-400 text-[10px] font-black uppercase p-4 rounded-2xl tracking-widest leading-relaxed">{error}</div>}
                <button type="submit" disabled={loading}
                  className="w-full py-5 bg-cyan-600 hover:bg-cyan-500 text-white font-black rounded-2xl text-[11px] tracking-[0.3em] uppercase active:scale-95 transition-all disabled:opacity-50 mt-4 shadow-xl shadow-cyan-900/20 border border-white/10">
                  {loading ? 'Validando...' : 'Entrar al Panel'}
                </button>
              </form>
            </motion.div>
          )}

          {/* REGISTER SCREEN */}
          {screen === 'register' && (
            <motion.div
              key="register"
              initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -20 }}
              className="w-full max-w-sm flex flex-col gap-6"
            >
              <button onClick={() => setScreen('home')} className="flex items-center gap-2 text-white/40 hover:text-white transition-all text-[10px] font-black uppercase tracking-widest">
                <ArrowLeft size={14} /> Inicio
              </button>
              <div className="mb-2">
                <h2 className="text-3xl font-black tracking-tight text-cyan-400">Nuevo Socio</h2>
                <p className="text-white/40 text-[9px] mt-1 uppercase tracking-[0.2em] font-bold">Completa tu perfil de repartidor</p>
              </div>
              <form onSubmit={handleRegister} className="space-y-4">
                <div className="grid grid-cols-1 gap-4">
                  <div className="space-y-1">
                    <label className={labelClass}><UserIcon size={10} className="inline mr-1" /> Nombre Completo</label>
                    <input type="text" value={form.name} onChange={e => setForm(f=>({...f, name: e.target.value}))} placeholder="Tu Nombre Real" className={inputClass} required />
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div className="space-y-1">
                      <label className={labelClass}>Edad</label>
                      <input type="number" min="18" value={form.age} onChange={e => setForm(f=>({...f, age: e.target.value}))} placeholder="18+" className={inputClass} required />
                    </div>
                    <div className="space-y-1">
                      <label className={labelClass}><Phone size={10} className="inline mr-1" /> Teléfono</label>
                      <input type="tel" value={form.phone} onChange={e => setForm(f=>({...f, phone: e.target.value}))} placeholder="10 dígitos" className={inputClass} required />
                    </div>
                  </div>
                  <div className="space-y-1">
                    <label className={labelClass}><MapPin size={10} className="inline mr-1" /> Dirección de Trabajo</label>
                    <input type="text" value={form.address} onChange={e => setForm(f=>({...f, address: e.target.value}))} placeholder="Colonia o Zona" className={inputClass} required />
                  </div>
                  <div className="space-y-1">
                    <label className={labelClass}><Mail size={10} className="inline mr-1" /> Correo Electrónico</label>
                    <input type="email" value={form.email} onChange={e => setForm(f=>({...f, email: e.target.value}))} placeholder="socio@correo.com" className={inputClass} required />
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div className="space-y-1">
                      <label className={labelClass}>Contraseña</label>
                      <input type="password" value={form.password} onChange={e => setForm(f=>({...f, password: e.target.value}))} placeholder="••••••" className={inputClass} required />
                    </div>
                    <div className="space-y-1">
                      <label className={labelClass}>Repetir</label>
                      <input type="password" value={form.confirm} onChange={e => setForm(f=>({...f, confirm: e.target.value}))} placeholder="••••••" className={inputClass} required />
                    </div>
                  </div>
                </div>
                {error && <div className="bg-red-500/10 border border-red-500/20 text-red-400 text-[10px] font-black uppercase p-3 rounded-2xl text-center">{error}</div>}
                <button type="submit" disabled={loading}
                  className="w-full py-5 bg-gradient-to-r from-cyan-600 to-blue-600 text-white font-black rounded-2xl text-[11px] tracking-[0.3em] uppercase active:scale-95 transition-all disabled:opacity-50 mt-2 shadow-2xl shadow-cyan-900/20">
                  {loading ? 'Creando Socio...' : 'Finalizar Registro'}
                </button>
              </form>
            </motion.div>
          )}

          {/* VERIFY EMAIL SCREEN */}
          {screen === 'verify-email' && (
            <motion.div
              key="verify"
              initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 1.05 }}
              className="w-full max-w-sm flex flex-col items-center gap-8 text-center"
            >
              <div className="w-24 h-24 rounded-[2.5rem] bg-cyan-500/10 border border-cyan-500/20 flex items-center justify-center shadow-inner">
                <Mail size={44} className="text-cyan-400" />
              </div>
              <div>
                <h2 className="text-3xl font-black tracking-tight">Confirmar <span className="text-cyan-400">Email</span></h2>
                <p className="text-white/40 text-[10px] mt-4 leading-relaxed uppercase tracking-widest font-bold">
                  Enviamos un enlace a:<br />
                  <span className="text-white mt-1 block lowercase">{pendingUser?.email}</span>
                </p>
              </div>
              <div className="w-full space-y-4">
                <button onClick={handleCheckVerification} disabled={loading}
                  className="w-full py-5 bg-gradient-to-r from-cyan-600 to-blue-600 text-white font-black rounded-2xl text-[11px] tracking-[0.3em] uppercase active:scale-95 transition-all shadow-2xl shadow-cyan-900/20">
                  {loading ? 'Buscando...' : 'Ya lo verifiqué'}
                </button>
                <button onClick={() => { auth.signOut(); setScreen('home'); }} className="text-white/30 text-[10px] font-black uppercase tracking-widest hover:text-white transition-all">
                  Cancelar y Volver
                </button>
              </div>
            </motion.div>
          )}

          {/* PENDING APPROVAL SCREEN */}
          {screen === 'pending-approval' && (
            <motion.div
              key="pending"
              initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 1.05 }}
              className="w-full max-w-sm flex flex-col items-center gap-8 text-center"
            >
              <div className="w-24 h-24 rounded-[2.5rem] bg-amber-500/10 border border-amber-500/20 flex items-center justify-center shadow-inner">
                <Clock size={44} className="text-amber-400" />
              </div>
              <div>
                <h2 className="text-3xl font-black tracking-tight">Modo <span className="text-amber-400">Espera</span></h2>
                <p className="text-white/40 text-[10px] mt-4 leading-relaxed uppercase tracking-widest font-bold">
                  Tu solicitud está en revisión.<br />Un administrador te activará pronto.
                </p>
              </div>
              <div className="bg-white/[0.03] border border-white/5 p-6 rounded-[2rem] text-[10px] text-white/50 uppercase tracking-[0.2em] font-bold leading-loose">
                ⚡ Notificaremos a tu correo una vez que seas aprobado como Socio Elite.
              </div>
              <button onClick={() => { auth.signOut(); setScreen('home'); }}
                className="text-white/30 text-[10px] font-black uppercase tracking-[0.3em] hover:text-white transition-all">
                Cerrar Sesión
              </button>
            </motion.div>
          )}

        </AnimatePresence>
      </div>

      <div className="pb-10 flex flex-col items-center gap-2 opacity-20 hover:opacity-100 transition-all duration-700">
         <img src="/searmo-logo.png" alt="Searmo" className="h-4 w-auto brightness-0 invert" />
         <p className="text-[6px] font-black uppercase tracking-[0.4em] text-white/60">Powered by Searmo</p>
      </div>
    </div>
  );
}
