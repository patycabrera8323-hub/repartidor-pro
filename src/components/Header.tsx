import { Bell, Zap } from 'lucide-react';

interface HeaderProps {
  title: string;
  isOnline: boolean;
  pendingCount?: number;
  onBellClick?: () => void;
}

export default function Header({ title, isOnline, pendingCount = 0, onBellClick }: HeaderProps) {
  return (
    <header className="fixed top-0 left-0 right-0 z-50">
      <div className="border-b border-white/5 px-5 py-4 flex justify-between items-center backdrop-blur-xl"
        style={{ background: 'rgba(15,23,42,0.85)' }}
      >
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 bg-gradient-to-br from-emerald-400 to-teal-500 rounded-xl flex items-center justify-center shadow-lg shadow-emerald-500/20">
            <Zap size={16} className="text-black fill-black" />
          </div>
          <div>
            <h1 className="text-[15px] font-black text-white tracking-tight leading-none">{title}</h1>
            <div className="flex items-center gap-1.5 mt-0.5">
              <span className={`w-1.5 h-1.5 rounded-full ${isOnline ? 'bg-emerald-400 animate-pulse' : 'bg-zinc-600'}`} />
              <span className={`text-[9px] font-bold uppercase tracking-widest ${isOnline ? 'text-emerald-400' : 'text-zinc-600'}`}>
                {isOnline ? 'En línea' : 'Desconectado'}
              </span>
            </div>
          </div>
        </div>
        <button 
          onClick={onBellClick}
          className="relative p-2 text-zinc-500 hover:text-white transition-colors rounded-xl hover:bg-white/5"
        >
          <Bell size={20} />
          {pendingCount > 0 && (
            <span className="absolute top-1.5 right-1.5 w-4 h-4 bg-emerald-500 rounded-full border-2 border-zinc-950 flex items-center justify-center text-[8px] font-black text-black">
              {pendingCount}
            </span>
          )}
        </button>
      </div>
    </header>
  );
}
