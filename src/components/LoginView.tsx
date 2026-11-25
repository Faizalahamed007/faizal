import { useState, useEffect, FormEvent } from 'react';
import { Radio, Lock, User, Mail, ShieldCheck } from 'lucide-react';
import { apiRequest, setAuthToken } from '../lib/api';
import { AdminUser } from '../types';

interface LoginViewProps {
  onAuthenticated: (admin: AdminUser) => void;
}

export function LoginView({ onAuthenticated }: LoginViewProps) {
  const [initialized, setInitialized] = useState<boolean | null>(null);
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    apiRequest<{ initialized: boolean }>('/api/auth/status')
      .then((res) => setInitialized(res.initialized))
      .catch(() => setInitialized(true));
  }, []);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      if (initialized === false) {
        const res = await apiRequest<{ token: string; admin: AdminUser }>('/api/auth/setup', {
          method: 'POST',
          body: JSON.stringify({
            username: username.trim(),
            password,
            full_name: fullName.trim() || 'Portal Administrator',
            email: email.trim(),
          }),
        });
        setAuthToken(res.token);
        onAuthenticated(res.admin);
      } else {
        const res = await apiRequest<{ token: string; admin: AdminUser }>('/api/auth/login', {
          method: 'POST',
          body: JSON.stringify({ username: username.trim(), password }),
        });
        setAuthToken(res.token);
        onAuthenticated(res.admin);
      }
    } catch (err) {
      setError((err as Error).message || 'Authentication failed.');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen bg-[#EEF2F6] flex flex-col justify-center items-center p-4">
      <div className="w-full max-w-md bg-white border border-[#DCE3EC] rounded-xl shadow-sm overflow-hidden">
        <div className="bg-[#0B192C] px-7 py-6 border-b-2 border-[#EAB308]">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-[#163258] border border-[#EAB308]/40 flex items-center justify-center shrink-0">
              <Radio className="w-5 h-5 text-[#EAB308]" />
            </div>
            <div>
              <h1 className="text-lg font-bold tracking-tight text-white">CONNECT TELECOM PORTAL</h1>
              <p className="text-xs text-slate-300 mt-0.5">Telecommunications Management System</p>
            </div>
          </div>
        </div>

        <div className="p-7">
          {initialized === null ? (
            <div className="py-8 text-center text-sm text-slate-500">Checking authentication status...</div>
          ) : (
            <>
              <div className="mb-6">
                <h2 className="text-xl font-bold text-[#0F213A]">
                  {initialized ? 'Administrator Sign In' : 'Initial Administrator Setup'}
                </h2>
                <p className="text-sm text-slate-500 mt-1">
                  {initialized
                    ? 'Enter your credentials to access subscriber, billing, and network operations.'
                    : 'No administrator account exists yet. Create the primary administrator account to begin.'}
                </p>
              </div>

              {error && (
                <div className="mb-4 px-3.5 py-2.5 rounded-lg bg-rose-50 border border-rose-200 text-xs font-medium text-rose-700">
                  {error}
                </div>
              )}

              <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                  <label className="block text-xs font-semibold text-[#0F213A] mb-1.5" htmlFor="login-username">
                    Username
                  </label>
                  <div className="relative">
                    <User className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                    <input
                      id="login-username"
                      type="text"
                      required
                      autoComplete="username"
                      value={username}
                      onChange={(e) => setUsername(e.target.value)}
                      placeholder={initialized ? 'Enter admin username' : 'e.g. admin'}
                      className="w-full pl-9 pr-3 py-2.5 text-sm border border-[#DCE3EC] rounded-lg focus:outline-none focus:border-[#0F213A] focus:ring-1 focus:ring-[#0F213A]"
                    />
                  </div>
                </div>

                {initialized === false && (
                  <>
                    <div>
                      <label className="block text-xs font-semibold text-[#0F213A] mb-1.5" htmlFor="setup-fullname">
                        Full Name
                      </label>
                      <div className="relative">
                        <ShieldCheck className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                        <input
                          id="setup-fullname"
                          type="text"
                          required
                          value={fullName}
                          onChange={(e) => setFullName(e.target.value)}
                          placeholder="e.g. Rajesh Kumar"
                          className="w-full pl-9 pr-3 py-2.5 text-sm border border-[#DCE3EC] rounded-lg focus:outline-none focus:border-[#0F213A] focus:ring-1 focus:ring-[#0F213A]"
                        />
                      </div>
                    </div>

                    <div>
                      <label className="block text-xs font-semibold text-[#0F213A] mb-1.5" htmlFor="setup-email">
                        Administrator Email
                      </label>
                      <div className="relative">
                        <Mail className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                        <input
                          id="setup-email"
                          type="email"
                          required
                          value={email}
                          onChange={(e) => setEmail(e.target.value)}
                          placeholder="admin@connecttelecom.in"
                          className="w-full pl-9 pr-3 py-2.5 text-sm border border-[#DCE3EC] rounded-lg focus:outline-none focus:border-[#0F213A] focus:ring-1 focus:ring-[#0F213A]"
                        />
                      </div>
                    </div>
                  </>
                )}

                <div>
                  <label className="block text-xs font-semibold text-[#0F213A] mb-1.5" htmlFor="login-password">
                    Password
                  </label>
                  <div className="relative">
                    <Lock className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                    <input
                      id="login-password"
                      type="password"
                      required
                      minLength={initialized ? 1 : 6}
                      autoComplete={initialized ? 'current-password' : 'new-password'}
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      placeholder={initialized ? 'Enter password' : 'Minimum 6 characters'}
                      className="w-full pl-9 pr-3 py-2.5 text-sm border border-[#DCE3EC] rounded-lg focus:outline-none focus:border-[#0F213A] focus:ring-1 focus:ring-[#0F213A]"
                    />
                  </div>
                </div>

                <button
                  type="submit"
                  disabled={loading}
                  className="w-full py-2.5 px-4 bg-[#0B192C] hover:bg-[#122642] text-white text-sm font-semibold rounded-lg transition-colors flex items-center justify-center gap-2 cursor-pointer disabled:opacity-60"
                >
                  {loading
                    ? 'Verifying...'
                    : initialized
                    ? 'Sign In to Portal'
                    : 'Create Administrator & Enter'}
                </button>
              </form>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
