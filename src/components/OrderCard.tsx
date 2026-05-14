import { MapPin, Clock, ChevronRight, Package, CreditCard } from 'lucide-react';
import { Order } from '../types';
import { cn, formatCurrency, formatDate } from '../lib/utils';
import { motion } from 'motion/react';

interface OrderCardProps {
  order: Order;
  onClick: (order: Order) => void;
  key?: string | number;
}

const statusConfig = {
  pending:   { color: "text-amber-400",   bg: "bg-amber-400/10 border-amber-400/20",   label: "🔔 Nuevo",        dot: "bg-amber-400" },
  accepted:  { color: "text-emerald-400", bg: "bg-emerald-400/10 border-emerald-400/20",label: "✓ Aceptado",      dot: "bg-emerald-400" },
  preparing: { color: "text-orange-400", bg: "bg-orange-400/10 border-orange-400/20", label: "👨‍🍳 Preparando",  dot: "bg-orange-400" },
  ready:     { color: "text-cyan-400",   bg: "bg-cyan-400/10 border-cyan-400/20",     label: "📦 Listo",        dot: "bg-cyan-400" },
  on_route:  { color: "text-purple-400",  bg: "bg-purple-400/10 border-purple-400/20", label: "🛵 En camino",    dot: "bg-purple-400" },
  delivered: { color: "text-emerald-400", bg: "bg-emerald-400/10 border-emerald-400/20",label: "✅ Entregado",   dot: "bg-emerald-400" },
  cancelled: { color: "text-red-400",     bg: "bg-red-400/10 border-red-400/20",       label: "✕ Cancelado",    dot: "bg-red-400" },
  completed: { color: "text-zinc-400",    bg: "bg-zinc-400/10 border-zinc-400/20",     label: "🏁 Finalizado",   dot: "bg-zinc-400" },
};

export default function OrderCard({ order, onClick }: OrderCardProps) {
  const cfg = statusConfig[order.status as keyof typeof statusConfig] || statusConfig.pending;
  const isAvailable = order.status === 'pending' || order.status === 'confirmed';

  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      whileTap={{ scale: 0.98 }}
      onClick={() => onClick(order)}
      className={cn(
        "relative rounded-3xl p-5 flex flex-col gap-4 cursor-pointer overflow-hidden transition-all",
        isAvailable
          ? "bg-gradient-to-br from-slate-800/80 to-slate-700/60 border border-cyan-500/30 shadow-lg shadow-cyan-500/5"
          : "border border-white/10"
      )}
      style={!isAvailable ? { background: 'rgba(30,41,59,0.7)' } : undefined}
    >
      {isAvailable && (
        <div className="absolute top-0 right-0 w-24 h-24 bg-emerald-500/5 rounded-full blur-2xl" />
      )}
      
      {/* Top row */}
      <div className="flex justify-between items-start gap-2">
        <div className="flex flex-col gap-1">
          <span className="text-[9px] font-black uppercase tracking-[0.2em] text-emerald-500">
            #ORD-{order.id.slice(0, 6).toUpperCase()}
          </span>
          <h3 className="text-white font-bold text-base leading-tight">
            {(order as any).storeName || order.storeId || 'Tienda'}
          </h3>
          <p className="text-zinc-500 text-xs">{order.clientId}</p>
        </div>
        <div className={cn("px-2.5 py-1 rounded-full text-[9px] font-bold uppercase tracking-wider border whitespace-nowrap", cfg.bg, cfg.color)}>
          {cfg.label}
        </div>
      </div>

      {/* Address */}
      <div className="flex items-start gap-2 text-zinc-400">
        <MapPin size={14} className="shrink-0 mt-0.5 text-zinc-600" />
        <span className="text-xs line-clamp-2 leading-relaxed">{order.deliveryLocation?.address || 'Sin dirección'}</span>
      </div>

      {/* Bottom row */}
      <div className="flex justify-between items-center pt-3 border-t border-white/5">
        <div className="flex items-center gap-3">
          <span className="text-emerald-400 font-black text-lg">{formatCurrency(order.total)}</span>
          {(order as any).paymentMethod && (
            <div className="flex items-center gap-1 text-zinc-600">
              <CreditCard size={12} />
              <span className="text-[10px] font-bold uppercase">
                {(order as any).paymentMethod === 'card' ? 'Tarjeta' : 'Efectivo'}
              </span>
            </div>
          )}
        </div>
        <div className="flex items-center gap-1 text-zinc-600">
          <Clock size={12} />
          <span className="text-[10px]">{order.createdAt ? formatDate(order.createdAt) : '---'}</span>
        </div>
      </div>
    </motion.div>
  );
}
