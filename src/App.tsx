import { useState, useEffect } from 'react';
import Header from './components/Header';
import BottomNav from './components/BottomNav';
import OrderCard from './components/OrderCard';
import OrderMap from './components/OrderMap';
import AuthFlow from './components/AuthFlow';
import { WelcomeScreen } from './components/WelcomeScreen';
import { Order } from './types';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Package, Truck, CheckCircle2, ChevronLeft, MapPin,
  CreditCard, Info, Power, Zap, TrendingUp, Clock, Phone 
} from 'lucide-react';
import { cn, formatCurrency } from './lib/utils';
import { useGeolocation } from './hooks/useGeolocation';
import { auth, messaging, db } from './lib/firebase';
import { onAuthStateChanged, User } from 'firebase/auth';
import { getToken, onMessage } from 'firebase/messaging';
import { doc, updateDoc, getDoc, onSnapshot } from 'firebase/firestore';
import { orderService } from './services/orderService';

export default function App() {
  const [user, setUser] = useState<User | null>(null);
  const [showWelcome, setShowWelcome] = useState(true);
  const [authLoading, setAuthLoading] = useState(true);
  const [isApproved, setIsApproved] = useState<boolean | null>(null);
  const [activeTab, setActiveTab] = useState<'home' | 'history' | 'profile'>('home');
  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null);
  const [orders, setOrders] = useState<Order[]>([]);
  const [isOnline, setIsOnline] = useState(true);
  const [earnings, setEarnings] = useState(0);
  
  const { location } = useGeolocation();
  const [error, setError] = useState<string | null>(null);

  const playAlert = () => {
    try {
      const audio = new Audio('https://assets.mixkit.co/active_storage/sfx/2869/2869-preview.mp3');
      audio.volume = 0.5;
      audio.play().catch(e => console.log("Audio playback failed (interaction needed):", e));
    } catch (e) {
      console.error("Error playing audio:", e);
    }
  };

  useEffect(() => {
    // Safety timeout to prevent white screen if Firebase is slow
    const timer = setTimeout(() => {
      setAuthLoading(false);
    }, 5000);

    let unsubscribeDriver: (() => void) | null = null;

    const unsubscribeAuth = onAuthStateChanged(auth, async (u) => {
      setUser(u);
      
      if (unsubscribeDriver) {
        unsubscribeDriver();
        unsubscribeDriver = null;
      }

      if (u && u.emailVerified) {
        unsubscribeDriver = onSnapshot(doc(db, 'drivers', u.uid), (docSnap) => {
          if (docSnap.exists()) {
            setIsApproved(docSnap.data().approved === true);
          } else {
            setIsApproved(false);
          }
          setAuthLoading(false);
        }, (err) => {
          console.error("Error driver status:", err);
          setIsApproved(false);
          setAuthLoading(false);
        });

        requestNotificationPermission(u.uid).catch(() => {});
      } else {
        setIsApproved(u ? false : null);
        setAuthLoading(false);
      }
    });

    return () => {
      clearTimeout(timer);
      unsubscribeAuth();
      if (unsubscribeDriver) unsubscribeDriver();
    };
  }, []);

  const requestNotificationPermission = async (userId: string) => {
    try {
      if (typeof window === 'undefined' || !('Notification' in window)) return;
      if (Notification.permission === 'granted') {
        const token = await getToken(messaging, {
          vapidKey: 'BMzHkZzqn7VB9-9FtK816FGZGT_xOTVXy-dhlFpfevVcm-ddkoqq5WLp2WTBkjRkYm7avn4P1NRJM9UhPlu37eU'
        });
        if (token) {
          await updateDoc(doc(db, 'drivers', userId), { fcmToken: token });
        }
        return;
      }

      const permission = await Notification.requestPermission();
      if (permission === 'granted' && messaging) {
        const token = await getToken(messaging, {
          vapidKey: 'BMzHkZzqn7VB9-9FtK816FGZGT_xOTVXy-dhlFpfevVcm-ddkoqq5WLp2WTBkjRkYm7avn4P1NRJM9UhPlu37eU'
        });
        if (token) {
          await updateDoc(doc(db, 'drivers', userId), { fcmToken: token });
        }
      }
    } catch (error) {
      console.error("Error al configurar notificaciones:", error);
    }
  };

  useEffect(() => {
    if (!messaging) return;
    const unsubscribe = onMessage(messaging, (payload) => {
      console.log('Foreground message received:', payload);
      playAlert();
      // Optional: Show a toast/alert here if desired
    });
    return () => unsubscribe();
  }, []);

  useEffect(() => {
    if (user && isOnline) {
      setTimeout(() => {
        orderService.ensureDriverProfile(user).catch(err => {
          console.error("Online-triggered profile check failed:", err);
        });
      }, 1000);
    }
  }, [user, isOnline]);

  useEffect(() => {
    if (!user || !isOnline) {
      setOrders([]);
      return;
    }
    const unsubscribe = orderService.getActiveOrders((updatedOrders) => {
      // Use functional update to avoid dependency on 'orders' state
      setOrders(prevOrders => {
        const shouldAlert = updatedOrders.some(o => {
          const isNewConfirmed = o.status === 'confirmed' && !prevOrders.find(prev => prev.id === o.id);
          const justBecameReady = o.status === 'ready' && o.driverId === user?.uid && prevOrders.find(prev => prev.id === o.id && prev.status !== 'ready');
          return isNewConfirmed || justBecameReady;
        });

        if (shouldAlert) {
          playAlert();
          // Show a visual browser notification if possible
          if (Notification.permission === 'granted') {
             const o = updatedOrders.find(order => 
               (order.status === 'confirmed' && !prevOrders.find(p => p.id === order.id)) ||
               (order.status === 'ready' && order.driverId === user?.uid && prevOrders.find(p => p.id === order.id && p.status !== 'ready'))
             );
             if (o) {
               const title = o.status === 'ready' ? "🥡 ¡ORDEN LISTA PARA RECOGER!" : "🔔 NUEVA ORDEN DISPONIBLE";
               const body = o.status === 'ready' 
                 ? `La orden de ${o.storeName || 'el comercio'} ya está lista. ¡Pasa por ella ahora!` 
                 : "Hay un nuevo pedido esperando ser aceptado en tu zona.";
               new Notification(title, { 
                 body, 
                 icon: '/logo.png',
                 badge: '/logo.png',
                 silent: false
               });
             }
          }
        }
        return updatedOrders;
      });
      
      // Update earnings
      const total = updatedOrders
        .filter(o => o.status === 'delivered' && o.driverId === user?.uid)
        .reduce((acc, curr) => acc + (curr.total || 0), 0);
      setEarnings(total);
    });
    return () => unsubscribe();
  }, [user, isOnline]); // Removed orders.length to prevent infinite loop

  useEffect(() => {
    if (isOnline && location && user) {
      orderService.updateDriverLocation(location.lat, location.lng);
    }
  }, [location, isOnline, user]);

  const handleUpdateStatus = async (orderId: string, nextStatus: Order['status'], assignDriver: boolean = false) => {
    if (nextStatus === 'delivered') {
      const confirm = window.confirm("¿Confirmas que el pedido ha sido entregado?");
      if (!confirm) return;
    }
    try {
      await orderService.updateOrderStatus(orderId, nextStatus, assignDriver);
      if (selectedOrder?.id === orderId) {
        setSelectedOrder(prev => prev ? { ...prev, status: nextStatus, driverId: assignDriver ? user?.uid : prev.driverId } : null);
      }
    } catch (error) {
      alert("Error al actualizar el pedido. Verifica los permisos.");
    }
  };

  const handleRejectOrder = async (orderId: string) => {
    try {
      await orderService.updateOrderStatus(orderId, 'cancelled');
      setSelectedOrder(null);
    } catch (error) {
      alert("Error al rechazar el pedido.");
    }
  };

  const handleLogout = () => { auth.signOut(); };

  if (showWelcome) {
    return <WelcomeScreen onComplete={() => setShowWelcome(false)} />;
  }

  if (authLoading || (user && isApproved === null)) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ background: 'linear-gradient(160deg, #0f172a 0%, #0c4a6e 60%, #134e4a 100%)' }}>
        <div className="flex flex-col items-center gap-4">
          <img src="/logo repartidor.png" alt="Repartidor PRO" className="w-16 h-16 object-contain animate-pulse" />
          <div className="w-6 h-6 border-2 border-cyan-500 border-t-transparent rounded-full animate-spin" />
        </div>
      </div>
    );
  }

  if (!user) {
    return <AuthFlow onAuthenticated={setUser} />;
  }

  if (isApproved === false) {
    return <AuthFlow onAuthenticated={(u) => setUser(u)} />;
  }

  // Email not verified
  if (!user.emailVerified) {
    return <AuthFlow onAuthenticated={(u) => setUser(u)} />;
  }

  // Not approved by admin yet
  if (!isApproved) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center p-6 text-white" style={{ background: 'linear-gradient(160deg, #0f172a 0%, #0c4a6e 60%, #134e4a 100%)' }}>
        <div className="w-20 h-20 rounded-3xl flex items-center justify-center mb-6" style={{ background: 'rgba(251,191,36,0.12)' }}>
          <Clock size={40} className="text-amber-400" />
        </div>
        <h2 className="text-2xl font-black text-white tracking-tight text-center">Esperando aprobación</h2>
        <p className="text-white/50 text-sm mt-3 text-center max-w-xs leading-relaxed">
          Tu cuenta está pendiente de revisión. Un administrador te autorizará pronto.
        </p>
        <button 
          onClick={() => {
            if (user) {
              setAuthLoading(true);
              getDoc(doc(db, 'drivers', user.uid)).then(docSnap => {
                if (docSnap.exists()) setIsApproved(docSnap.data().approved === true);
                setAuthLoading(false);
              });
            }
          }}
          className="w-full py-4 bg-cyan-500 text-black font-black uppercase tracking-widest rounded-2xl text-xs active:scale-95 transition-all"
        >
          Verificar Aprobación
        </button>
        <button onClick={() => auth.signOut()} className="mt-4 text-white/30 text-xs font-bold hover:text-white/60 transition-colors">
          Cerrar Sesión
        </button>
      </div>
    );
  }

  const activeOrders = orders.filter(o => 
    (o.status === 'confirmed' || o.status === 'accepted' || o.status === 'preparing' || o.status === 'ready' || o.status === 'on_route') && 
    (!o.driverId || o.driverId === user?.uid)
  );
  const historyOrders = orders.filter(o => 
    o.driverId === user?.uid && 
    ['delivered', 'cancelled', 'completed'].includes(o.status)
  );
  const pendingOrders = orders.filter(o => o.status === 'confirmed' && !o.driverId);
  const todayDelivered = historyOrders.filter(o => o.status === 'delivered').length;

  return (
    <div className="min-h-screen text-white font-sans selection:bg-cyan-500/30"
      style={{ background: 'linear-gradient(160deg, #0f172a 0%, #0c4a6e 60%, #134e4a 100%)' }}
    >
      <Header 
        title={selectedOrder ? "Detalle del Pedido" : activeTab === 'home' ? "RepartidorPRO" : activeTab === 'history' ? "Historial" : "Mi Perfil"} 
        isOnline={isOnline}
        pendingCount={pendingOrders.length}
        onBellClick={() => user && requestNotificationPermission(user.uid)}
      />
      
      <main className="pt-20 pb-28 px-4 max-w-lg mx-auto">
        <AnimatePresence mode="wait">
          {!selectedOrder ? (
            <motion.div
              key={activeTab}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              transition={{ duration: 0.2 }}
              className="flex flex-col gap-4"
            >
              {/* HOME TAB */}
              {activeTab === 'home' && (
                <>
                  {/* Online toggle banner */}
                  <div className={cn(
                    "rounded-3xl p-5 flex items-center justify-between border transition-all",
                    isOnline 
                      ? "bg-gradient-to-r from-emerald-950/80 to-teal-950/80 border-emerald-500/20" 
                      : "bg-zinc-900 border-zinc-800"
                  )}>
                    <div className="flex flex-col gap-1">
                      <p className="text-xs font-black uppercase tracking-widest text-zinc-400">Estado</p>
                      <p className={cn("text-xl font-black", isOnline ? "text-emerald-400" : "text-zinc-500")}>
                        {isOnline ? "Disponible 🟢" : "Desconectado ⚫"}
                      </p>
                    </div>
                    <button
                      onClick={() => {
                        setIsOnline(!isOnline);
                        if (!isOnline && user) requestNotificationPermission(user.uid);
                      }}
                      className={cn(
                        "flex items-center gap-2 px-5 py-3 rounded-2xl font-black uppercase text-xs tracking-widest transition-all active:scale-95",
                        isOnline 
                          ? "bg-red-500/10 text-red-400 border border-red-500/20 hover:bg-red-500/20" 
                          : "bg-emerald-500 text-black shadow-lg shadow-emerald-500/20"
                      )}
                    >
                      <Power size={16} />
                      {isOnline ? "Salir" : "Conectar"}
                    </button>
                  </div>

                  {/* Stats row */}
                  <div className="grid grid-cols-3 gap-3">
                    <div className="bg-slate-800/60 border border-white/10 rounded-2xl p-4 flex flex-col gap-1">
                      <span className="text-zinc-600 text-[9px] font-bold uppercase tracking-widest">Activos</span>
                      <span className="text-2xl font-black text-white">{activeOrders.length}</span>
                    </div>
                    <div className="bg-slate-800/60 border border-white/10 rounded-2xl p-4 flex flex-col gap-1">
                      <span className="text-zinc-600 text-[9px] font-bold uppercase tracking-widest">Hoy</span>
                      <span className="text-2xl font-black text-emerald-400">{todayDelivered}</span>
                    </div>
                    <div className="bg-slate-800/60 border border-white/10 rounded-2xl p-4 flex flex-col gap-1">
                      <span className="text-zinc-600 text-[9px] font-bold uppercase tracking-widest">Pendientes</span>
                      <span className="text-2xl font-black text-amber-400">{pendingOrders.length}</span>
                    </div>
                  </div>

                  {/* Orders */}
                  {!isOnline ? (
                    <div className="py-16 flex flex-col items-center gap-4 text-zinc-600 text-center">
                      <Power size={48} strokeWidth={1} />
                      <p className="font-bold text-sm">Conéctate para ver los pedidos disponibles</p>
                    </div>
                  ) : activeOrders.length > 0 ? (
                    <>
                      <p className="text-[10px] font-black uppercase tracking-widest text-zinc-600 px-1">
                        {activeOrders.length} pedido{activeOrders.length !== 1 ? 's' : ''} activo{activeOrders.length !== 1 ? 's' : ''}
                      </p>
                      {activeOrders.map(order => (
                        <OrderCard key={order.id} order={order} onClick={setSelectedOrder} />
                      ))}
                    </>
                  ) : (
                    <div className="py-20 flex flex-col items-center gap-5 text-zinc-600">
                      <div className="relative w-20 h-20 bg-zinc-900 rounded-3xl flex items-center justify-center border border-white/5">
                        <Package size={36} strokeWidth={1} />
                        <span className="absolute -top-1.5 -right-1.5 flex h-5 w-5">
                          <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-40" />
                          <span className="relative inline-flex rounded-full h-5 w-5 bg-emerald-500 items-center justify-center">
                            <span className="w-2 h-2 bg-black rounded-full" />
                          </span>
                        </span>
                      </div>
                      <div className="text-center">
                        <p className="font-black text-sm text-zinc-400 mb-1">Buscando pedidos...</p>
                        <p className="text-xs text-zinc-700">Los nuevos pedidos aparecerán aquí</p>
                      </div>
                    </div>
                  )}
                </>
              )}

              {/* HISTORY TAB */}
              {activeTab === 'history' && (
                <>
                  {historyOrders.length > 0 ? (
                    <>
                      <p className="text-[10px] font-black uppercase tracking-widest text-zinc-600 px-1">
                        {historyOrders.length} pedido{historyOrders.length !== 1 ? 's' : ''} completado{historyOrders.length !== 1 ? 's' : ''}
                      </p>
                      {historyOrders.map(order => (
                        <OrderCard key={order.id} order={order} onClick={setSelectedOrder} />
                      ))}
                    </>
                  ) : (
                    <div className="py-20 flex flex-col items-center gap-5 text-zinc-600 text-center">
                      <div className="w-20 h-20 bg-zinc-900 rounded-3xl flex items-center justify-center border border-white/5">
                        <CheckCircle2 size={36} strokeWidth={1} />
                      </div>
                      <div>
                        <p className="font-black text-sm text-zinc-400 mb-1">Sin historial aún</p>
                        <p className="text-xs text-zinc-700">Tus entregas completadas aparecerán aquí</p>
                      </div>
                    </div>
                  )}
                </>
              )}

              {/* PROFILE TAB */}
              {activeTab === 'profile' && (
                <div className="flex flex-col gap-4">
                  {/* Profile card */}
                  <div className="bg-gradient-to-br from-zinc-900 to-zinc-800 border border-white/5 rounded-3xl p-6 flex items-center gap-4">
                    <div className="relative shrink-0">
                      {user.photoURL ? (
                        <img src={user.photoURL} alt={user.displayName || 'User'} className="w-16 h-16 rounded-2xl border-2 border-white/10" />
                      ) : (
                        <div className="w-16 h-16 bg-gradient-to-br from-emerald-500 to-teal-600 rounded-2xl flex items-center justify-center text-2xl font-black text-black border-2 border-white/10">
                          {user.displayName?.charAt(0) || user.email?.charAt(0) || 'R'}
                        </div>
                      )}
                      <div className={cn(
                        "absolute -bottom-1 -right-1 w-5 h-5 rounded-full border-2 border-zinc-900",
                        isOnline ? "bg-emerald-500" : "bg-zinc-600"
                      )} />
                    </div>
                    <div>
                      <h2 className="text-lg font-black text-white">{user.displayName || 'Repartidor'}</h2>
                      <p className="text-zinc-500 text-xs">{user.email}</p>
                      <span className="text-[9px] font-black uppercase tracking-widest text-emerald-400 mt-1 block">
                        {isOnline ? '● Disponible' : '○ Fuera de servicio'}
                      </span>
                    </div>
                  </div>

                  {/* Real stats */}
                  <div className="grid grid-cols-2 gap-3">
                    <div className="bg-slate-800/60 border border-white/10 rounded-2xl p-4 flex flex-col gap-2">
                      <div className="flex items-center gap-2 text-zinc-600">
                        <TrendingUp size={14} />
                        <span className="text-[9px] font-bold uppercase tracking-widest">Ganancias Hoy</span>
                      </div>
                      <span className="text-3xl font-black text-emerald-400">{formatCurrency(earnings)}</span>
                    </div>
                    <div className="bg-slate-800/60 border border-white/10 rounded-2xl p-4 flex flex-col gap-2">
                      <div className="flex items-center gap-2 text-zinc-600">
                        <Clock size={14} />
                        <span className="text-[9px] font-bold uppercase tracking-widest">Activos</span>
                      </div>
                      <span className="text-3xl font-black text-white">{activeOrders.length}</span>
                    </div>
                  </div>

                  {/* Online toggle */}
                  <div className="bg-slate-800/60 border border-white/10 rounded-2xl p-4 flex justify-between items-center">
                    <div>
                      <p className="text-xs font-bold uppercase tracking-widest text-zinc-500 mb-0.5">Estado de Servicio</p>
                      <p className={cn("text-sm font-black", isOnline ? "text-emerald-400" : "text-zinc-500")}>
                        {isOnline ? "Disponible" : "Fuera de Servicio"}
                      </p>
                    </div>
                    <button
                      onClick={() => {
                        setIsOnline(!isOnline);
                        if (!isOnline && user) requestNotificationPermission(user.uid);
                      }}
                      className={cn(
                        "px-5 py-2 rounded-xl font-bold uppercase text-xs tracking-widest transition-all active:scale-95",
                        isOnline 
                          ? "bg-red-500/10 text-red-400 border border-red-500/20" 
                          : "bg-emerald-500/10 text-emerald-400 border border-emerald-500/20"
                      )}
                    >
                      {isOnline ? "Desconectar" : "Conectar"}
                    </button>
                  </div>

                  <button
                    onClick={handleLogout}
                    className="w-full py-4 bg-zinc-900 border border-red-500/10 text-red-400 font-black uppercase tracking-widest flex items-center justify-center rounded-2xl hover:bg-red-500/5 active:scale-95 transition-all text-xs"
                  >
                    Cerrar Sesión
                  </button>
                </div>
              )}
            </motion.div>
          ) : (
            /* ORDER DETAIL VIEW */
            <motion.div
              key="detail"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              className="flex flex-col gap-5"
            >
              <button
                onClick={() => setSelectedOrder(null)}
                className="flex items-center gap-2 text-zinc-500 hover:text-white transition-colors self-start"
              >
                <ChevronLeft size={18} />
                <span className="text-sm font-bold">Volver</span>
              </button>

              {/* Order header */}
              <div className="bg-gradient-to-br from-zinc-900 to-zinc-800 border border-white/5 rounded-3xl p-5">
                <div className="flex justify-between items-start mb-4">
                  <div>
                    <span className="text-[9px] font-black uppercase tracking-widest text-emerald-500">
                      #ORD-{selectedOrder.id.slice(0, 6).toUpperCase()}
                    </span>
                    <h2 className="text-xl font-black text-white mt-0.5">
                      {(selectedOrder as any).storeName || selectedOrder.storeId || 'Tienda'}
                    </h2>
                    <p className="text-zinc-500 text-sm">{selectedOrder.clientId}</p>
                  </div>
                  <div className="text-right">
                    <p className="text-emerald-400 text-2xl font-black">{formatCurrency(selectedOrder.total)}</p>
                    {(selectedOrder as any).paymentMethod && (
                      <div className="flex items-center gap-1 justify-end text-zinc-500 mt-1">
                        <CreditCard size={12} />
                        <span className="text-[10px] font-bold uppercase">
                          {(selectedOrder as any).paymentMethod === 'card' ? 'Tarjeta' : 'Efectivo'}
                        </span>
                      </div>
                    )}
                  </div>
                </div>

                {/* Addresses */}
                <div className="flex flex-col gap-3">
                  <div className="flex gap-3 items-start">
                    <div className="w-7 h-7 rounded-xl bg-orange-500/10 flex items-center justify-center shrink-0">
                      <Package size={14} className="text-orange-400" />
                    </div>
                    <div>
                      <p className="text-[9px] font-bold uppercase tracking-widest text-zinc-600 mb-0.5">Recolección</p>
                      <p className="text-xs text-zinc-300">{selectedOrder.pickupLocation?.address || 'Sin dirección'}</p>
                      {selectedOrder.storePhone && (
                        <a href={`tel:${selectedOrder.storePhone}`} className="mt-1 flex items-center gap-1 text-emerald-500 text-[10px] font-bold hover:underline">
                          <Phone size={10} /> Llamar Negocio: {selectedOrder.storePhone}
                        </a>
                      )}
                    </div>
                  </div>
                  <div className="w-px h-3 bg-zinc-800 ml-3.5" />
                  <div className="flex gap-3 items-start">
                    <div className="w-7 h-7 rounded-xl bg-emerald-500/10 flex items-center justify-center shrink-0">
                      <MapPin size={14} className="text-emerald-400" />
                    </div>
                    <div>
                      <p className="text-[9px] font-bold uppercase tracking-widest text-zinc-600 mb-0.5">Entrega</p>
                      <p className="text-xs text-zinc-300">{selectedOrder.deliveryLocation?.address || 'Sin dirección'}</p>
                      {selectedOrder.clientPhone && (
                        <a href={`tel:${selectedOrder.clientPhone}`} className="mt-1 flex items-center gap-1 text-emerald-500 text-[10px] font-bold hover:underline">
                          <Phone size={10} /> Llamar Cliente: {selectedOrder.clientPhone}
                        </a>
                      )}
                    </div>
                  </div>
                </div>

                {/* Notes */}
                {(selectedOrder as any).notes && (
                  <div className="mt-4 bg-amber-500/5 border border-amber-500/10 rounded-2xl p-3 flex gap-2">
                    <Info size={14} className="text-amber-400 shrink-0 mt-0.5" />
                    <p className="text-xs text-amber-200/80 italic">"{(selectedOrder as any).notes}"</p>
                  </div>
                )}
              </div>

              {/* Map */}
              <OrderMap order={selectedOrder} driverLocation={location || undefined} />

              {/* Products */}
              {selectedOrder.items && selectedOrder.items.length > 0 && (
                <div className="bg-slate-800/60 border border-white/10 rounded-3xl p-5">
                  <p className="text-[9px] font-black uppercase tracking-widest text-zinc-600 mb-3">Productos</p>
                  <div className="flex flex-col gap-3">
                    {selectedOrder.items.map((item, idx) => (
                      <div key={idx} className="flex justify-between items-center">
                        <div className="flex items-center gap-3">
                          <span className="w-6 h-6 flex items-center justify-center bg-zinc-800 rounded-lg text-zinc-300 text-xs font-black">
                            {item.quantity || 1}
                          </span>
                          <span className="text-sm font-medium text-zinc-200">{item.name}</span>
                        </div>
                        <span className="text-zinc-500 font-mono text-sm">
                          {formatCurrency(item.price * (item.quantity || 1))}
                        </span>
                      </div>
                    ))}
                    <div className="pt-3 border-t border-white/5 flex justify-between items-center">
                      <span className="text-xs font-black uppercase tracking-widest text-zinc-500">Total</span>
                      <span className="text-lg font-black text-emerald-400">{formatCurrency(selectedOrder.total)}</span>
                    </div>
                  </div>
                </div>
              )}

              {/* Spacer for floating buttons */}
              <div className="h-28" />
            </motion.div>
          )}
        </AnimatePresence>
      </main>

      {/* Floating action buttons for order detail */}
      {selectedOrder && (
        <div className="fixed bottom-0 left-0 right-0 p-5 bg-gradient-to-t from-zinc-950 via-zinc-950/90 to-transparent pt-16 z-50">
          <div className="max-w-lg mx-auto w-full flex flex-col gap-3">
            {/* Aceptar: solo pedidos confirmados por el negocio sin repartidor */}
            {!selectedOrder.driverId && selectedOrder.status === 'confirmed' && (
              <div className="flex gap-3">
                <button
                  onClick={() => handleUpdateStatus(selectedOrder.id, 'accepted', true)}
                  className="flex-1 py-4 bg-gradient-to-r from-emerald-500 to-teal-500 text-black font-black uppercase tracking-widest rounded-2xl shadow-lg shadow-emerald-500/20 active:scale-95 transition-all text-sm"
                >
                  ✓ Aceptar Pedido
                </button>
              </div>
            )}
            
            {selectedOrder.driverId === user.uid && (
              <>
                {(selectedOrder.status === 'accepted' || selectedOrder.status === 'preparing') && (
                  <div className="w-full py-4 bg-zinc-900/50 border border-white/5 text-zinc-500 font-black uppercase tracking-widest rounded-2xl text-center text-xs">
                    ⏳ El comercio está preparando el pedido...
                  </div>
                )}

                {selectedOrder.status === 'ready' && (
                  <button
                    onClick={() => handleUpdateStatus(selectedOrder.id, 'on_route')}
                    className="w-full py-4 bg-gradient-to-r from-orange-500 to-red-500 text-white font-black uppercase tracking-widest rounded-2xl shadow-lg shadow-orange-500/20 flex items-center justify-center gap-2 active:scale-95 transition-all"
                  >
                    <Truck size={20} /> 📦 PEDIDO RECOGIDO - INICIAR RUTA
                  </button>
                )}
                
                {selectedOrder.status === 'on_route' && (
                  <button
                    onClick={() => handleUpdateStatus(selectedOrder.id, 'delivered')}
                    className="w-full py-4 bg-gradient-to-r from-emerald-500 to-teal-500 text-black font-black uppercase tracking-widest rounded-2xl shadow-lg shadow-emerald-500/20 flex items-center justify-center gap-2 active:scale-95 transition-all"
                  >
                    <CheckCircle2 size={18} /> Confirmar Entrega al Cliente ✓
                  </button>
                )}
              </>
            )}

            {(selectedOrder.status === 'delivered' || selectedOrder.status === 'cancelled' || selectedOrder.status === 'completed') && (
              <div className={cn(
                "w-full py-4 rounded-2xl text-center font-black uppercase tracking-widest text-sm",
                (selectedOrder.status === 'delivered' || selectedOrder.status === 'completed')
                  ? "bg-emerald-500/10 border border-emerald-500/20 text-emerald-400" 
                  : "bg-red-500/10 border border-red-500/20 text-red-400"
              )}>
                Pedido {selectedOrder.status === 'cancelled' ? '✕ Cancelado' : '✅ Completado'}
              </div>
            )}
          </div>
        </div>
      )}

      {!selectedOrder && (
        <BottomNav 
          activeTab={activeTab} 
          onTabChange={setActiveTab}
          pendingCount={pendingOrders.length}
        />
      )}
    </div>
  );
}
