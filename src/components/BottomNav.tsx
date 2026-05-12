import { Home, ClipboardList, User } from 'lucide-react';
import { cn } from '@/src/lib/utils';

interface BottomNavProps {
  activeTab: 'home' | 'history' | 'profile';
  onTabChange: (tab: 'home' | 'history' | 'profile') => void;
  pendingCount?: number;
}

export default function BottomNav({ activeTab, onTabChange, pendingCount = 0 }: BottomNavProps) {
  const tabs = [
    { id: 'home', label: 'Pedidos', icon: Home },
    { id: 'history', label: 'Historial', icon: ClipboardList },
    { id: 'profile', label: 'Perfil', icon: User },
  ] as const;

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-50">
      <div className="border-t border-white/5 px-8 pt-3 pb-5 flex justify-around items-center backdrop-blur-xl"
        style={{ background: 'rgba(15,23,42,0.92)' }}
      >
        {tabs.map((tab) => {
          const Icon = tab.icon;
          const isActive = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => onTabChange(tab.id)}
              className={cn(
                "relative flex flex-col items-center gap-1.5 transition-all duration-200 py-1 px-4 rounded-2xl",
                isActive ? "text-emerald-400" : "text-zinc-600 hover:text-zinc-400"
              )}
            >
              {isActive && (
                <span className="absolute -top-1 left-1/2 -translate-x-1/2 w-8 h-0.5 bg-emerald-400 rounded-full" />
              )}
              <div className="relative">
                <Icon size={22} strokeWidth={isActive ? 2.5 : 1.5} />
                {tab.id === 'home' && pendingCount > 0 && (
                  <span className="absolute -top-1.5 -right-1.5 w-4 h-4 bg-emerald-500 rounded-full flex items-center justify-center text-[8px] font-black text-black">
                    {pendingCount}
                  </span>
                )}
              </div>
              <span className={cn(
                "text-[9px] font-bold uppercase tracking-widest",
                isActive ? "text-emerald-400" : "text-zinc-600"
              )}>{tab.label}</span>
            </button>
          );
        })}
      </div>
    </nav>
  );
}
