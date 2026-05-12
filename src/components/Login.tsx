import { useState } from 'react';
import { auth } from '../lib/firebase';
import { signInWithPopup, GoogleAuthProvider } from 'firebase/auth';
import { motion } from 'motion/react';
import { Truck } from 'lucide-react';

interface LoginProps {
  onLogin: () => void;
}

export default function Login({ onLogin }: LoginProps) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleGoogleLogin = async () => {
    setLoading(true);
    setError(null);
    try {
      const provider = new GoogleAuthProvider();
      await signInWithPopup(auth, provider);
      onLogin();
    } catch (err: any) {
      setError(err.message || 'Error al iniciar sesión');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex flex-col items-center justify-between p-6 font-sans relative overflow-hidden"
      style={{ background: 'linear-gradient(135deg, #0f172a 0%, #0c4a6e 50%, #134e4a 100%)' }}
    >
      {/* Background glows */}
      <div className="absolute top-0 right-0 w-80 h-80 bg-cyan-500/10 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute bottom-20 left-0 w-64 h-64 bg-teal-500/10 rounded-full blur-3xl pointer-events-none" />

      {/* Spacer */}
      <div />

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4 }}
        className="w-full max-w-sm flex flex-col items-center gap-9 relative z-10"
      >
        {/* Logo icon */}
        <div className="flex flex-col items-center gap-5">
          <motion.div
            initial={{ scale: 0.7, rotate: -10 }}
            animate={{ scale: 1, rotate: 0 }}
            transition={{ type: 'spring', stiffness: 180, delay: 0.15 }}
            className="w-24 h-24 rounded-3xl flex items-center justify-center shadow-2xl shadow-cyan-500/20"
            style={{ background: 'linear-gradient(135deg, #06b6d4, #14b8a6)' }}
          >
            <Truck size={46} className="text-white" strokeWidth={2} />
          </motion.div>
          <div className="text-center">
            <h1 className="text-5xl font-black tracking-tighter text-white">
              Repartidor<span className="text-cyan-400">PRO</span>
            </h1>
            <p className="text-sky-300/60 text-sm mt-2 font-medium">Plataforma de reparto inteligente</p>
          </div>
        </div>

        {/* Feature pills */}
        <div className="flex gap-2 flex-wrap justify-center">
          {['🗺 Mapa en vivo', '📦 Pedidos reales', '⚡ Tiempo real'].map(f => (
            <span key={f}
              className="px-3 py-1.5 rounded-full text-[10px] font-bold text-cyan-200/70 uppercase tracking-widest border border-cyan-500/20"
              style={{ background: 'rgba(6,182,212,0.08)' }}
            >
              {f}
            </span>
          ))}
        </div>

        {/* Login button */}
        <div className="w-full flex flex-col gap-3">
          <button
            onClick={handleGoogleLogin}
            disabled={loading}
            className="w-full py-5 bg-white text-slate-900 font-black rounded-2xl flex items-center justify-center gap-3 active:scale-95 transition-transform disabled:opacity-50 text-sm tracking-wide shadow-2xl shadow-black/30"
          >
            {loading ? (
              <div className="w-5 h-5 border-2 border-slate-900 border-t-transparent rounded-full animate-spin" />
            ) : (
              <>
                <img src="https://www.google.com/favicon.ico" alt="Google" className="w-5 h-5" />
                Continuar con Google
              </>
            )}
          </button>

          {error && (
            <motion.p
              initial={{ opacity: 0, y: -4 }}
              animate={{ opacity: 1, y: 0 }}
              className="text-red-300 text-xs text-center font-medium bg-red-500/10 border border-red-500/20 rounded-xl p-3"
            >
              {error}
            </motion.p>
          )}
        </div>

        <p className="text-[10px] text-sky-400/30 text-center uppercase tracking-widest font-bold">
          Al continuar aceptas los términos de servicio
        </p>
      </motion.div>

      {/* Searmo footer */}
      <div className="flex flex-col items-center gap-2 opacity-50 hover:opacity-100 transition-all duration-700 pb-4 relative z-10">
        <img
          src="/Logo SEARMO estilo t.png"
          alt="Searmo"
          className="h-6 w-auto object-contain"
        />
        <p className="text-[7px] font-black uppercase tracking-[0.5em] text-sky-300/60">Powered by Searmo</p>
      </div>
    </div>
  );
}
