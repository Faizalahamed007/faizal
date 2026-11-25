import { useState } from 'react';
import { Menu } from 'lucide-react';
import { AdminUser, NavSection } from './types';
import { apiRequest, setAuthToken } from './lib/api';
import { LoginView } from './components/LoginView';
import { Sidebar } from './components/Sidebar';
import { DashboardView } from './components/DashboardView';
import { CustomersView } from './components/CustomersView';
import { ServicesView } from './components/ServicesView';
import { PlansView } from './components/PlansView';
import { SubscriptionsView } from './components/SubscriptionsView';
import { BillingView } from './components/BillingView';
import { SupportView } from './components/SupportView';
import { ReportsView } from './components/ReportsView';

const SECTION_META: Record<NavSection, { title: string; subtitle: string }> = {
  dashboard: { title: 'Dashboard', subtitle: 'Operational overview across subscribers, plans, billing & support' },
  customers: { title: 'Customer Management', subtitle: 'Manage subscriber profiles, contact details & account states' },
  services: { title: 'Service Management', subtitle: 'Provision Mobile, Broadband & Landline connections' },
  plans: { title: 'Plan Management', subtitle: 'Configure tariff plans, data quotas, validity & pricing' },
  subscriptions: { title: 'Subscription Management', subtitle: 'Assign customer plans and process renewals' },
  billing: { title: 'Billing & Payments', subtitle: 'Generate customer invoices and record UPI, Card & Cash payments' },
  support: { title: 'Customer Support', subtitle: 'Register subscriber complaints and track resolution status' },
  reports: { title: 'Reports & Analytics', subtitle: 'Revenue trends, subscriber growth, usage & DBMS SQL insights' },
};

export default function App() {
  const [admin, setAdmin] = useState<AdminUser | null>(null);
  const [section, setSection] = useState<NavSection>('dashboard');
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  async function handleLogout() {
    try {
      await apiRequest('/api/auth/logout', { method: 'POST' });
    } catch {
      // Clear local session regardless of network state
    }
    setAuthToken(null);
    setAdmin(null);
    setSection('dashboard');
  }

  if (!admin) {
    return <LoginView onAuthenticated={(u) => setAdmin(u)} />;
  }

  const meta = SECTION_META[section];

  return (
    <div className="min-h-screen bg-[#EEF2F6] text-[#0F213A] flex">
      <Sidebar
        activeSection={section}
        onSelect={setSection}
        onLogout={handleLogout}
        mobileOpen={mobileMenuOpen}
        onCloseMobile={() => setMobileMenuOpen(false)}
      />

      <div className="flex-1 lg:pl-64 flex flex-col min-w-0">
        <header className="sticky top-0 z-20 bg-white border-b border-[#DCE3EC] px-4 sm:px-6 lg:px-8 py-3.5 flex items-center justify-between gap-4">
          <div className="flex items-center gap-3 min-w-0">
            <button
              type="button"
              onClick={() => setMobileMenuOpen(true)}
              className="lg:hidden p-2 -ml-2 text-[#0F213A] hover:bg-slate-100 rounded-lg cursor-pointer"
              aria-label="Open navigation menu"
            >
              <Menu className="w-5 h-5" />
            </button>
            <div className="min-w-0">
              <h1 className="text-lg font-bold text-[#0F213A] truncate">{meta.title}</h1>
              <p className="text-xs text-slate-500 truncate hidden sm:block">{meta.subtitle}</p>
            </div>
          </div>

          <div className="flex items-center gap-3 shrink-0">
            <div className="text-right hidden sm:block">
              <div className="text-xs font-semibold text-[#0F213A]">{admin.fullName}</div>
              <div className="text-[11px] text-slate-500">{admin.role}</div>
            </div>
            <div className="w-9 h-9 rounded-lg bg-[#0B192C] text-[#EAB308] font-display font-bold text-xs flex items-center justify-center shrink-0">
              {admin.fullName
                .split(' ')
                .map((n) => n[0])
                .join('')
                .slice(0, 2)
                .toUpperCase()}
            </div>
          </div>
        </header>

        <main className="flex-1 p-4 sm:p-6 lg:p-8 max-w-[1400px] w-full mx-auto">
          {section === 'dashboard' && <DashboardView onNavigate={setSection} />}
          {section === 'customers' && <CustomersView />}
          {section === 'services' && <ServicesView />}
          {section === 'plans' && <PlansView />}
          {section === 'subscriptions' && <SubscriptionsView />}
          {section === 'billing' && <BillingView />}
          {section === 'support' && <SupportView />}
          {section === 'reports' && <ReportsView />}
        </main>
      </div>
    </div>
  );
}
