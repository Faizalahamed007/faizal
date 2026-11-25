import {
  LayoutDashboard,
  Users,
  Radio,
  Layers,
  Repeat,
  Receipt,
  Headphones,
  BarChart3,
  LogOut,
  X,
} from 'lucide-react';
import { NavSection } from '../types';

interface SidebarProps {
  activeSection: NavSection;
  onSelect: (section: NavSection) => void;
  onLogout: () => void;
  mobileOpen: boolean;
  onCloseMobile: () => void;
}

const NAV_ITEMS: { id: NavSection; label: string; icon: typeof LayoutDashboard }[] = [
  { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { id: 'customers', label: 'Customers', icon: Users },
  { id: 'services', label: 'Services', icon: Radio },
  { id: 'plans', label: 'Plans', icon: Layers },
  { id: 'subscriptions', label: 'Subscriptions', icon: Repeat },
  { id: 'billing', label: 'Billing', icon: Receipt },
  { id: 'support', label: 'Support', icon: Headphones },
  { id: 'reports', label: 'Reports', icon: BarChart3 },
];

export function Sidebar({ activeSection, onSelect, onLogout, mobileOpen, onCloseMobile }: SidebarProps) {
  return (
    <>
      {mobileOpen && (
        <div
          className="fixed inset-0 z-30 bg-slate-900/50 lg:hidden"
          onClick={onCloseMobile}
          aria-hidden="true"
        />
      )}

      <aside
        className={`fixed top-0 left-0 z-40 h-screen w-64 bg-[#0B192C] text-slate-100 flex flex-col border-r border-[#163258] transition-transform duration-200 lg:translate-x-0 ${
          mobileOpen ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        <div className="px-5 py-5 border-b border-[#163258] flex items-center justify-between gap-2">
          <div className="flex items-center gap-3 min-w-0">
            <div className="w-9 h-9 rounded-lg bg-[#122642] border border-[#EAB308]/40 flex items-center justify-center shrink-0">
              <Radio className="w-5 h-5 text-[#EAB308]" />
            </div>
            <div className="min-w-0">
              <div className="font-display font-bold text-sm tracking-wide text-white leading-tight">
                CONNECT
              </div>
              <div className="text-[11px] font-medium text-[#EAB308] tracking-wider leading-tight">
                TELECOM PORTAL
              </div>
            </div>
          </div>
          <button
            type="button"
            onClick={onCloseMobile}
            className="lg:hidden p-1.5 text-slate-300 hover:text-white rounded-md"
            aria-label="Close navigation menu"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <nav className="flex-1 overflow-y-auto px-3 py-4 space-y-1" aria-label="Primary Navigation">
          {NAV_ITEMS.map((item) => {
            const Icon = item.icon;
            const isActive = activeSection === item.id;
            return (
              <button
                key={item.id}
                type="button"
                onClick={() => {
                  onSelect(item.id);
                  onCloseMobile();
                }}
                className={`w-full flex items-center gap-3 px-3.5 py-2.5 rounded-lg text-sm font-medium transition-colors cursor-pointer whitespace-nowrap ${
                  isActive
                    ? 'bg-[#163258] text-white'
                    : 'text-slate-300 hover:bg-[#122642] hover:text-white'
                }`}
              >
                <Icon className={`w-4 h-4 shrink-0 ${isActive ? 'text-[#EAB308]' : 'text-slate-400'}`} />
                <span className="truncate">{item.label}</span>
                {isActive && <span className="ml-auto w-1.5 h-4 rounded-sm bg-[#EAB308]" />}
              </button>
            );
          })}
        </nav>

        <div className="p-3 border-t border-[#163258]">
          <button
            type="button"
            onClick={onLogout}
            className="w-full flex items-center gap-3 px-3.5 py-2.5 rounded-lg text-sm font-medium text-slate-300 hover:bg-[#122642] hover:text-[#EAB308] transition-colors cursor-pointer"
          >
            <LogOut className="w-4 h-4 shrink-0" />
            <span>Logout</span>
          </button>
        </div>
      </aside>
    </>
  );
}
