import React, { useState, useEffect, useRef } from 'react';
import { auth, db } from './lib/firebase';
import { 
  onSnapshot, 
  collection, 
  query, 
  where, 
  orderBy, 
  doc, 
  getDoc,
  serverTimestamp 
} from 'firebase/firestore';
import { 
  LogOut, 
  Bell, 
  MapPin, 
  Navigation, 
  History, 
  Wallet, 
  User as UserIcon, 
  Menu as MenuIcon, 
  X, 
  ChevronRight, 
  Clock, 
  CheckCircle2, 
  Zap,
  Power,
  Box,
  Truck
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { cn } from './lib/utils';
import { WelcomeScreen } from './components/WelcomeScreen';
import AuthFlow from './components/AuthFlow';
import { orderService } from './services/orderService';
import { Order } from './types';

export default function App() {
  const [showWelcome, setShowWelcome] = useState(true);
  const [user, setUser] = useState<any>(null);
  const [authLoading, setAuthLoading] = useState(true);
  const [userData, setUserData] = useState<any>(null);
  const [isApproved, setIsApproved] = useState<boolean | null>(null);
  
  // Dashboard State
  const [orders, setOrders] = useState<Order[]>([]);
  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null);
  const [view, setView] = useState<'dashboard' | 'history' | 'profile'>('dashboard');
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [isOnline, setIsOnline] = useState(false);
  const [earnings, setEarnings] = useState(0);
  const [location, setLocation] = useState<{lat: number, lng: number} | null>(null);

  // Auth Listener
  useEffect(() => {
    return auth.onAuthStateChanged(async (u) => {
      setUser(u);
      if (u) {
        const dDoc = await getDoc(doc(db, 'drivers', u.uid));
        if (dDoc.exists()) {
          const data = dDoc.data();
          setUserData(data);
          setIsApproved(data.approved === true);
        } else {
          setIsApproved(false);
        }
      }
      setAuthLoading(false);
    });
  }, []);

  // Location Listener
  useEffect(() => {
    if (!isOnline) return;
    const watchId = navigator.geolocation.watchPosition(
      (pos) => setLocation({ lat: pos.coords.latitude, lng: pos.coords.longitude }),
      (err) => console.error("Geo Error:", err),
      { enableHighAccuracy: true }
    );
    return () => navigator.geolocation.clearWatch(watchId);
  }, [isOnline]);

  // Orders Listener
  useEffect(() => {
    if (!user || !isOnline) {
      setOrders([]);
      return;
    }

    // Listener para pedidos disponibles y pedidos propios
    const q = query(
      collection(db, 'orders'),
      where('status', 'in', ['pending', 'accepted', 'preparing', 'ready', 'on_route']),
      orderBy('createdAt', 'desc')
    );

    const unsubscribe = onSnapshot(q, (snap) => {
      const data: Order[] = [];
      snap.forEach(d => {
        const order = { id: d.id, ...d.data() } as Order;
        // Mostrar si está disponible (pending) o si es del repartidor actual
        if (order.status === 'pending' || order.driverId === user.uid) {
          data.push(order);
        }
      });
      setOrders(data);
      
      // Calcular ganancias (pedidos entregados hoy)
      const today = new Date();
      today.setHours(0,0,0,0);
      const deliveredToday = data.filter(o => o.status === 'delivered' && o.driverId === user.uid);
      // Esto es solo una demo del cálculo, lo ideal es una query específica
    });

    return () => unsubscribe();
  }, [user, isOnline]);

  const handleUpdateStatus = async (orderId: string, nextStatus: Order['status'], assign: boolean = false) => {
    try {
      await orderService.updateOrderStatus(orderId, nextStatus, assign);
      if (nextStatus === 'accepted') setIsOnline(true);
    } catch (e) {
      alert("Error al actualizar pedido.");
    }
  };

  const handleLogout = () => { auth.signOut(); window.location.reload(); };

  if (showWelcome) {
    return <WelcomeScreen onComplete={() => setShowWelcome(false)} />;
  }

  if (authLoading) {
    return (
      <div className="min-h-screen bg-[#020617] flex items-center justify-center">
        <div className="w-10 h-10 border-4 border-cyan-500/20 border-t-cyan-500 rounded-full animate-spin" />
      </div>
    );
  }

  if (!user || isApproved === false) {
    return <AuthFlow onAuthenticated={setUser} />;
  }

  return (
    <div className="min-h-screen bg-[#020617] text-white font-sans flex flex-col overflow-hidden">
      
      {/* 📱 TOP BAR */}
      <header className="bg-[#020617]/80 backdrop-blur-xl border-b border-white/5 sticky top-0 z-40 px-6 py-5 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <button 
            onClick={() => setSidebarOpen(true)}
            className="w-10 h-10 bg-white/5 rounded-xl flex items-center justify-center border border-white/10 active:scale-90 transition-all"
          >
            <MenuIcon size={20} className="text-cyan-400" />
          </button>
          <div className="flex flex-col">
            <span className="text-[10px] font-black text-white/30 uppercase tracking-[0.2em] leading-none mb-1">Elite Driver</span>
            <h1 className="text-sm font-black tracking-tight text-white uppercase">{userData?.name || user.displayName || 'Repartidor'}</h1>
          </div>
        </div>

        <div className="flex items-center gap-4">
          <div className="flex flex-col items-end">
            <span className="text-[9px] font-black text-cyan-400 uppercase tracking-widest leading-none mb-1">Hoy</span>
            <span className="text-sm font-black text-white">${earnings.toFixed(2)}</span>
          </div>
          <button className="relative w-10 h-10 bg-white/5 rounded-xl flex items-center justify-center border border-white/10">
            <Bell size={20} className="text-white/40" />
            <div className="absolute top-2.5 right-2.5 w-2 h-2 bg-cyan-500 rounded-full border-2 border-[#020617]" />
          </button>
        </div>
      </header>

      {/* 🗺 MAIN CONTENT */}
      <main className="flex-1 overflow-y-auto p-6 space-y-8 pb-32">
        
        {/* Status Card */}
        <section className="relative">
          <div className={cn(
            "p-6 rounded-[2.5rem] border transition-all duration-500 relative overflow-hidden group",
            isOnline 
              ? "bg-cyan-500/10 border-cyan-500/20 shadow-2xl shadow-cyan-900/20" 
              : "bg-white/[0.03] border-white/5"
          )}>
            <div className="relative z-10 flex items-center justify-between">
              <div>
                <h2 className="text-2xl font-black tracking-tight mb-1">
                  {isOnline ? 'En Línea' : 'Desconectado'}
                </h2>
                <p className="text-[10px] font-bold text-white/40 uppercase tracking-widest leading-relaxed">
                  {isOnline ? 'Buscando pedidos cerca...' : 'Actívate para recibir entregas'}
                </p>
              </div>
              <button 
                onClick={() => setIsOnline(!isOnline)}
                className={cn(
                  "w-16 h-16 rounded-3xl flex items-center justify-center transition-all active:scale-90 shadow-xl border-2",
                  isOnline 
                    ? "bg-cyan-500 text-white border-white/20 shadow-cyan-500/40" 
                    : "bg-white/10 text-white/40 border-white/5"
                )}
              >
                <Power size={28} />
              </button>
            </div>
            {/* Background Glow */}
            {isOnline && <div className="absolute -right-20 -top-20 w-48 h-48 bg-cyan-500/20 blur-[80px] rounded-full animate-pulse" />}
          </div>
        </section>

        {/* Orders Section */}
        <section className="space-y-6">
          <div className="flex items-center justify-between">
             <h3 className="text-xs font-black uppercase tracking-[0.3em] text-white/30 flex items-center gap-2">
               <Box size={14} className="text-cyan-400" /> Pedidos Disponibles ({orders.length})
             </h3>
          </div>

          <div className="space-y-4">
            <AnimatePresence mode="popLayout">
              {orders.length === 0 ? (
                <motion.div 
                  initial={{ opacity: 0 }} animate={{ opacity: 1 }}
                  className="py-20 flex flex-col items-center justify-center text-center space-y-4"
                >
                  <div className="w-16 h-16 rounded-full bg-white/[0.02] border border-white/5 flex items-center justify-center">
                    <Navigation size={32} className="text-white/10" />
                  </div>
                  <p className="text-[10px] font-black uppercase tracking-widest text-white/20">Sin pedidos activos en tu zona</p>
                </motion.div>
              ) : (
                orders.map((order) => (
                  <motion.div
                    key={order.id}
                    layout
                    initial={{ opacity: 0, scale: 0.9 }}
                    animate={{ opacity: 1, scale: 1 }}
                    exit={{ opacity: 0, scale: 0.9 }}
                    className={cn(
                      "p-6 rounded-[2.5rem] border backdrop-blur-md transition-all",
                      order.driverId === user.uid 
                        ? "bg-gradient-to-br from-cyan-600/20 to-blue-600/20 border-cyan-500/30" 
                        : "bg-white/[0.03] border-white/10"
                    )}
                  >
                    <div className="flex items-start justify-between mb-6">
                       <div className="space-y-1">
                         <div className="flex items-center gap-2">
                           <span className="text-[10px] font-black text-cyan-400 bg-cyan-500/10 px-3 py-1 rounded-full uppercase tracking-widest">#{order.id.slice(-4)}</span>
                           <span className="text-[10px] font-black text-amber-400 bg-amber-500/10 px-3 py-1 rounded-full uppercase tracking-widest">{order.status}</span>
                         </div>
                         <h4 className="text-lg font-black tracking-tight">{order.storeName}</h4>
                       </div>
                       <div className="text-right">
                         <p className="text-[9px] font-black text-white/30 uppercase tracking-widest mb-1">Ganancia</p>
                         <p className="text-xl font-black text-white">${order.total}</p>
                       </div>
                    </div>

                    <div className="space-y-4 mb-6">
                      <div className="flex items-start gap-4">
                        <div className="w-2 h-2 rounded-full bg-cyan-500 mt-2 shadow-[0_0_10px_rgba(6,182,212,0.5)]" />
                        <div>
                          <p className="text-[8px] font-black text-white/30 uppercase tracking-widest leading-none mb-1">Recolección</p>
                          <p className="text-[11px] font-bold text-white/80">{order.pickupLocation.address}</p>
                        </div>
                      </div>
                      <div className="flex items-start gap-4">
                        <div className="w-2 h-2 rounded-full bg-amber-500 mt-2 shadow-[0_0_10px_rgba(245,158,11,0.5)]" />
                        <div>
                          <p className="text-[8px] font-black text-white/30 uppercase tracking-widest leading-none mb-1">Entrega</p>
                          <p className="text-[11px] font-bold text-white/80">{order.deliveryLocation.address}</p>
                        </div>
                      </div>
                    </div>

                    {order.driverId === user.uid ? (
                      <div className="flex gap-2">
                         <button 
                           onClick={() => {
                             const flow = ['accepted', 'preparing', 'ready', 'on_route', 'delivered'];
                             const currentIdx = flow.indexOf(order.status);
                             if (currentIdx < flow.length - 1) {
                               handleUpdateStatus(order.id, flow[currentIdx + 1] as any);
                             }
                           }}
                           className="flex-1 py-4 bg-cyan-600 hover:bg-cyan-500 text-white font-black rounded-2xl text-[10px] uppercase tracking-[0.2em] transition-all shadow-lg active:scale-95"
                         >
                           Siguiente Estado
                         </button>
                      </div>
                    ) : (
                      <button 
                        onClick={() => handleUpdateStatus(order.id, 'accepted', true)}
                        className="w-full py-4 bg-white text-[#020617] font-black rounded-2xl text-[10px] uppercase tracking-[0.2em] hover:bg-cyan-400 transition-all shadow-xl active:scale-95"
                      >
                        Aceptar Pedido
                      </button>
                    )}
                  </motion.div>
                ))
              )}
            </AnimatePresence>
          </div>
        </section>
      </main>

      {/* 🧭 NAVIGATION DOCK */}
      <nav className="fixed bottom-0 left-0 right-0 p-6 z-50">
        <div className="max-w-xs mx-auto bg-[#0f172a]/80 backdrop-blur-2xl border border-white/5 rounded-3xl p-2 flex items-center justify-around shadow-2xl">
           <NavBtn icon={<Zap />} active={view === 'dashboard'} onClick={() => setView('dashboard')} />
           <NavBtn icon={<History />} active={view === 'history'} onClick={() => setView('history')} />
           <NavBtn icon={<Wallet />} active={view === 'profile'} onClick={() => setView('profile')} />
           <NavBtn icon={<UserIcon />} active={view === 'profile'} onClick={() => setView('profile')} />
        </div>
      </nav>

      {/* 🌑 SIDEBAR OVERLAY */}
      <AnimatePresence>
        {sidebarOpen && (
          <>
            <motion.div 
              initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              onClick={() => setSidebarOpen(false)}
              className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[100]"
            />
            <motion.aside 
              initial={{ x: '-100%' }} animate={{ x: 0 }} exit={{ x: '-100%' }}
              transition={{ type: 'spring', damping: 25, stiffness: 200 }}
              className="fixed top-0 left-0 bottom-0 w-80 bg-[#020617] z-[101] border-r border-white/5 p-8 flex flex-col"
            >
              <div className="flex items-center justify-between mb-12">
                <div className="w-12 h-12 bg-gradient-to-br from-cyan-500 to-blue-700 rounded-2xl flex items-center justify-center p-2">
                   <img src="/logo.png" alt="Logo" className="w-full h-full object-contain brightness-0 invert" />
                </div>
                <button onClick={() => setSidebarOpen(false)} className="w-10 h-10 bg-white/5 rounded-xl flex items-center justify-center">
                  <X size={20} />
                </button>
              </div>

              <div className="flex-1 space-y-2">
                 <SideBtn icon={<Truck />} label="Panel Principal" active={view === 'dashboard'} onClick={() => { setView('dashboard'); setSidebarOpen(false); }} />
                 <SideBtn icon={<History />} label="Historial" active={view === 'history'} onClick={() => { setView('history'); setSidebarOpen(false); }} />
                 <SideBtn icon={<Wallet />} label="Mis Ganancias" active={view === 'profile'} onClick={() => { setView('profile'); setSidebarOpen(false); }} />
                 <SideBtn icon={<Settings />} label="Configuración" active={false} />
              </div>

              <div className="pt-8 border-t border-white/5">
                <button 
                  onClick={handleLogout}
                  className="w-full flex items-center gap-4 p-4 rounded-2xl bg-red-500/10 text-red-400 font-black uppercase tracking-widest text-[10px] transition-all hover:bg-red-500 hover:text-white"
                >
                  <LogOut size={18} />
                  Cerrar Sesión
                </button>
              </div>
            </motion.aside>
          </>
        )}
      </AnimatePresence>
    </div>
  );
}

function NavBtn({ icon, active, onClick }: { icon: React.ReactNode, active: boolean, onClick: () => void }) {
  return (
    <button 
      onClick={onClick}
      className={cn(
        "w-12 h-12 rounded-2xl flex items-center justify-center transition-all active:scale-90",
        active ? "bg-cyan-500 text-white shadow-lg shadow-cyan-900/40" : "text-white/20 hover:text-white/40"
      )}
    >
      {React.cloneElement(icon as React.ReactElement, { size: 20 })}
    </button>
  );
}

function SideBtn({ icon, label, active, onClick }: { icon: React.ReactNode, label: string, active: boolean, onClick?: () => void }) {
  return (
    <button 
      onClick={onClick}
      className={cn(
        "w-full flex items-center gap-4 p-4 rounded-2xl transition-all font-black uppercase tracking-widest text-[10px]",
        active ? "bg-cyan-500 text-white shadow-xl shadow-cyan-900/20" : "text-white/40 hover:bg-white/5 hover:text-white"
      )}
    >
      {React.cloneElement(icon as React.ReactElement, { size: 18 })}
      {label}
    </button>
  );
}

function Settings({ size }: { size: number }) {
  return <UserIcon size={size} />; // Placeholder
}
