import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Zap, ShieldCheck, Truck, ArrowRight, Star, Smartphone, Box } from 'lucide-react';

export function WelcomeScreen({ onComplete }: { onComplete: () => void }) {
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    // Usamos una llave única para esta versión Elite para que se vea sí o sí
    const hasSeenWelcome = localStorage.getItem('hasSeenWelcome_Repartidor_Elite_v1');
    if (!hasSeenWelcome) {
      setTimeout(() => setIsVisible(true), 100);
    } else {
      onComplete();
    }
  }, [onComplete]);

  const handleStart = () => {
    localStorage.setItem('hasSeenWelcome_Repartidor_Elite_v1', 'true');
    setIsVisible(false);
    setTimeout(onComplete, 400);
  };

  if (!isVisible) return null;

  const features = [
    {
      icon: <Box className="text-cyan-400" />,
      title: "Control de Pedidos",
      desc: "Gestión avanzada desde la palma de tu mano."
    },
    {
      icon: <Zap className="text-amber-400" />,
      title: "Respuesta Rápida",
      desc: "Alertas sonoras y visuales en tiempo real."
    },
    {
      icon: <Smartphone className="text-cyan-400" />,
      title: "Ahorro de Memoria",
      desc: "Usa la tecnología PWA para evitar descargas pesadas."
    }
  ];

  return (
    <AnimatePresence>
      {isVisible && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-[10000] bg-[#020617] flex flex-col items-center justify-between p-8 overflow-hidden font-sans"
        >
          {/* Animated Background Gradients */}
          <div className="absolute inset-0 overflow-hidden pointer-events-none">
            <motion.div 
              animate={{ 
                scale: [1, 1.2, 1],
                opacity: [0.3, 0.5, 0.3],
                x: [0, 50, 0],
                y: [0, -30, 0]
              }}
              transition={{ duration: 10, repeat: Infinity, ease: "easeInOut" }}
              className="absolute top-[-20%] right-[-10%] w-[120%] h-[60%] bg-cyan-600/20 rounded-full blur-[140px]" 
            />
            <motion.div 
              animate={{ 
                scale: [1, 1.1, 1],
                opacity: [0.2, 0.4, 0.2],
                x: [0, -40, 0],
                y: [0, 40, 0]
              }}
              transition={{ duration: 12, repeat: Infinity, ease: "easeInOut" }}
              className="absolute bottom-[-10%] left-[-20%] w-[100%] h-[50%] bg-blue-900/30 rounded-full blur-[140px]" 
            />
          </div>

          {/* Content Container */}
          <div className="w-full max-w-sm flex flex-col items-center mt-12 relative z-10">
            {/* Logo Hexagon Style */}
            <motion.div
              initial={{ scale: 0.5, opacity: 0, rotate: -20 }}
              animate={{ scale: 1, opacity: 1, rotate: 0 }}
              transition={{ delay: 0.2, type: 'spring', damping: 15 }}
              className="relative mb-8"
            >
              <div className="w-24 h-24 bg-gradient-to-br from-cyan-500 to-blue-700 rounded-[2.5rem] flex items-center justify-center shadow-2xl shadow-cyan-500/20 p-4 border border-white/20">
                <img src="/logo.png" alt="Logo" className="w-full h-full object-contain brightness-0 invert" />
              </div>
              <motion.div
                animate={{ scale: [1, 1.2, 1] }}
                transition={{ duration: 2, repeat: Infinity }}
                className="absolute -bottom-1 -right-1 w-8 h-8 bg-amber-500 rounded-2xl shadow-lg flex items-center justify-center border-2 border-[#020617]"
              >
                <Zap className="w-4 h-4 text-white fill-white" />
              </motion.div>
            </motion.div>

            <motion.div
              initial={{ y: 20, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              transition={{ delay: 0.4 }}
              className="text-center"
            >
              <h1 className="text-3xl md:text-4xl font-black text-white tracking-tighter leading-tight mb-4">
                REPARTIDOR<br/>
                <span className="bg-gradient-to-r from-cyan-400 to-blue-500 bg-clip-text text-transparent">ELITE PRO</span>
              </h1>
              <div className="inline-block px-4 py-1.5 bg-white/5 border border-white/10 rounded-full mb-4">
                 <p className="text-[10px] text-cyan-400 font-black uppercase tracking-[0.3em]">Nueva Versión 2.0</p>
              </div>
              <p className="text-white/50 text-[10px] font-bold px-6 leading-relaxed uppercase tracking-widest">
                Si gustas puedes usarla <span className="text-cyan-400">instalándola</span> o directamente en la <span className="text-cyan-400">web</span> ahorrando memoria.
              </p>
            </motion.div>

            {/* Features Glass List */}
            <div className="w-full space-y-4 mt-10 px-2">
              {features.map((f, i) => (
                <motion.div
                  key={i}
                  initial={{ x: -20, opacity: 0 }}
                  animate={{ x: 0, opacity: 1 }}
                  transition={{ delay: 0.6 + (i * 0.1) }}
                  className="flex items-center gap-4 p-4 rounded-2xl bg-white/[0.03] border border-white/[0.05] backdrop-blur-md group hover:bg-white/[0.06] transition-all"
                >
                  <div className="flex-shrink-0 w-12 h-12 bg-white/[0.05] border border-white/10 rounded-xl flex items-center justify-center shadow-inner group-hover:scale-105 transition-transform">
                    {f.icon}
                  </div>
                  <div>
                    <h3 className="text-[11px] font-black text-white uppercase tracking-tight">{f.title}</h3>
                    <p className="text-[9px] text-white/40 font-medium leading-tight mt-0.5">{f.desc}</p>
                  </div>
                </motion.div>
              ))}
            </div>
          </div>

          {/* Footer Action */}
          <motion.div
            initial={{ y: 20, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            transition={{ delay: 1 }}
            className="w-full max-w-sm pb-10 flex flex-col items-center relative z-10"
          >
            <button
              onClick={handleStart}
              className="w-full py-5 bg-gradient-to-r from-cyan-600 to-blue-600 text-white rounded-2xl font-black uppercase tracking-[0.3em] text-[11px] flex items-center justify-center gap-4 hover:brightness-110 active:scale-95 transition-all shadow-2xl shadow-cyan-900/40 mb-8 border border-white/10"
            >
              Comenzar Ahora
              <ArrowRight size={16} />
            </button>
            <div className="flex flex-col items-center gap-2 opacity-40">
              <img src="/searmo-logo.png" alt="Searmo" className="h-4 w-auto object-contain brightness-0 invert" />
              <p className="text-[7px] font-black uppercase tracking-[0.4em] text-white">Powered by Searmo</p>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
