// src/features/auth/LoginView.tsx
// Production Login Screen supporting 1-Click Role Login, Email/Password, and Google OAuth

import React, { useState } from 'react';
import { useAuth, DEFAULT_CREDENTIALS } from './AuthContext';
import { useTheme } from '../theme/ThemeContext';
import { Sun, Moon } from '../../components/ThemeIcons';
import { 
  ShieldCheck, 
  UserCheck, 
  Lock, 
  Mail, 
  ArrowRight, 
  HelpCircle, 
  Info, 
  ExternalLink,
  CheckCircle2,
  AlertCircle
} from 'lucide-react';
import { UserRole } from '../../types';

export const LoginView: React.FC = () => {
  const { loginWithCredentials, loginAsRole, loginWithGoogle } = useAuth();
  const { toggleTheme, isDark } = useTheme();

  const [email, setEmail] = useState('superadmin@accelvia.internal');
  const [password, setPassword] = useState('Password123!');
  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [showGoogleHelpModal, setShowGoogleHelpModal] = useState(false);

  const handleCredentialsSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setErrorMessage(null);

    const result = await loginWithCredentials(email, password);
    setIsLoading(false);

    if (!result.success) {
      setErrorMessage(result.error || 'Invalid credentials');
    }
  };

  const handleRoleQuickLogin = (role: UserRole) => {
    const cred = DEFAULT_CREDENTIALS[role];
    setEmail(cred.email);
    setPassword(cred.password);
    loginAsRole(role);
  };

  const handleGoogleClick = async () => {
    setIsLoading(true);
    setErrorMessage(null);
    const result = await loginWithGoogle();
    setIsLoading(false);

    if (!result.success) {
      setShowGoogleHelpModal(true);
    }
  };

  return (
    <div className="min-h-screen w-screen flex flex-col bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-100 transition-colors">
      {/* Top Bar with Brand & Theme Toggle */}
      <header className="h-14 border-b border-slate-200 dark:border-slate-800 px-4 sm:px-8 flex items-center justify-between bg-white/80 dark:bg-slate-950/80 backdrop-blur-md">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-lg bg-emerald-600 dark:bg-teal-500 flex items-center justify-center font-bold text-white dark:text-slate-950 shadow-md shadow-emerald-600/20 text-sm">
            A
          </div>
          <span className="font-bold tracking-tight text-sm text-slate-900 dark:text-slate-100">
            ACCELVIA <span className="text-emerald-600 dark:text-teal-400 font-mono text-xs">WMS</span>
          </span>
        </div>

        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={toggleTheme}
            className="p-1.5 rounded-lg border border-slate-200 dark:border-slate-800 bg-slate-100 dark:bg-slate-900 text-slate-700 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-800 transition"
            title={isDark ? "Switch to Light Theme" : "Switch to Dark Theme"}
          >
            {isDark ? <Sun className="w-4 h-4 text-amber-400" /> : <Moon className="w-4 h-4 text-emerald-600" />}
          </button>
        </div>
      </header>

      {/* Main Login Container */}
      <main className="flex-1 flex items-center justify-center p-4 sm:p-6 overflow-y-auto">
        <div className="w-full max-w-4xl grid grid-cols-1 lg:grid-cols-12 gap-6 my-auto">
          {/* Left Column: Email/Password Form & Google OAuth */}
          <div className="lg:col-span-7 bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-6 sm:p-8 shadow-xl">
            <div className="mb-6">
              <h2 className="text-xl sm:text-2xl font-bold tracking-tight text-slate-900 dark:text-slate-100">
                Sign in to your account
              </h2>
              <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 mt-1">
                Enter your credentials or choose a role persona below to test.
              </p>
            </div>

            {errorMessage && (
              <div className="mb-4 p-3 rounded-lg bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-800 text-rose-700 dark:text-rose-300 text-xs flex items-start gap-2">
                <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
                <span>{errorMessage}</span>
              </div>
            )}

            {/* Google OAuth Button */}
            <button
              type="button"
              onClick={handleGoogleClick}
              disabled={isLoading}
              className="w-full py-2.5 px-4 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 hover:bg-slate-50 dark:hover:bg-slate-700/60 font-semibold text-xs sm:text-sm flex items-center justify-center gap-3 transition shadow-xs text-slate-700 dark:text-slate-200"
            >
              {/* Official Google G Logo */}
              <svg className="w-4 h-4" viewBox="0 0 24 24">
                <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
                <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"/>
                <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"/>
              </svg>
              <span>Sign in with Google (Gmail)</span>
            </button>

            <div className="relative my-5">
              <div className="absolute inset-0 flex items-center">
                <div className="w-full border-t border-slate-200 dark:border-slate-800" />
              </div>
              <div className="relative flex justify-center text-[11px] uppercase font-mono">
                <span className="bg-white dark:bg-slate-900 px-3 text-slate-400">or sign in with password</span>
              </div>
            </div>

            {/* Email & Password Form */}
            <form onSubmit={handleCredentialsSubmit} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Email Address
                </label>
                <div className="relative">
                  <Mail className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                  <input
                    type="email"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="name@accelvia.internal"
                    className="w-full pl-9 pr-3 py-2 bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-700 rounded-xl text-xs sm:text-sm text-slate-900 dark:text-slate-100 focus:outline-none focus:border-emerald-500 dark:focus:border-teal-500 font-mono"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Password
                </label>
                <div className="relative">
                  <Lock className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                  <input
                    type="password"
                    required
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="••••••••••••"
                    className="w-full pl-9 pr-3 py-2 bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-700 rounded-xl text-xs sm:text-sm text-slate-900 dark:text-slate-100 focus:outline-none focus:border-emerald-500 dark:focus:border-teal-500 font-mono"
                  />
                </div>
              </div>

              <button
                type="submit"
                disabled={isLoading}
                className="w-full py-2.5 px-4 rounded-xl bg-emerald-600 hover:bg-emerald-500 dark:bg-teal-500 dark:hover:bg-teal-400 text-white dark:text-slate-950 font-bold text-xs sm:text-sm transition shadow-md shadow-emerald-950/20 flex items-center justify-center gap-2 mt-2"
              >
                <span>{isLoading ? 'Signing In...' : 'Sign In with Email'}</span>
                <ArrowRight className="w-4 h-4" />
              </button>
            </form>
          </div>

          {/* Right Column: 1-Click Role Login Presets & Credential Cards */}
          <div className="lg:col-span-5 flex flex-col justify-between space-y-3">
            <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-5 shadow-xl space-y-3">
              <div className="flex items-center justify-between border-b border-slate-200 dark:border-slate-800 pb-2">
                <span className="font-bold text-xs uppercase tracking-wider text-slate-700 dark:text-slate-300 flex items-center gap-1.5">
                  <ShieldCheck className="w-4 h-4 text-emerald-600 dark:text-teal-400" />
                  Quick Role Login
                </span>
                <span className="text-[10px] text-slate-400 font-mono">1-Click Access</span>
              </div>

              {/* 1. Super Admin Preset */}
              <div
                onClick={() => handleRoleQuickLogin('super_admin')}
                className="p-3 rounded-xl border border-amber-300/80 dark:border-amber-500/40 bg-amber-50/60 dark:bg-amber-950/30 hover:bg-amber-100/60 dark:hover:bg-amber-950/50 cursor-pointer transition space-y-1"
              >
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-amber-900 dark:text-amber-300">
                    👑 Super Admin (Management)
                  </span>
                  <span className="text-[10px] bg-amber-200/80 dark:bg-amber-900/60 text-amber-900 dark:text-amber-200 px-1.5 py-0.5 rounded font-mono font-bold">
                    FULL ACCESS
                  </span>
                </div>
                <div className="text-[11px] font-mono text-slate-600 dark:text-slate-300">
                  {DEFAULT_CREDENTIALS.super_admin.email}
                </div>
                <div className="text-[10px] text-slate-500 dark:text-slate-400">
                  Password: <span className="font-mono">{DEFAULT_CREDENTIALS.super_admin.password}</span>
                </div>
                <div className="text-[10px] text-amber-800/80 dark:text-amber-300/80 font-medium pt-0.5">
                  Audit log diffs, time correction, invite admins & members.
                </div>
              </div>

              {/* 2. Admin Preset */}
              <div
                onClick={() => handleRoleQuickLogin('admin')}
                className="p-3 rounded-xl border border-emerald-300/80 dark:border-teal-500/40 bg-emerald-50/60 dark:bg-teal-950/30 hover:bg-emerald-100/60 dark:hover:bg-teal-950/50 cursor-pointer transition space-y-1"
              >
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-emerald-900 dark:text-teal-300">
                    🛡️ Admin (Project Lead)
                  </span>
                  <span className="text-[10px] bg-emerald-200/80 dark:bg-teal-900/60 text-emerald-900 dark:text-teal-200 px-1.5 py-0.5 rounded font-mono font-bold">
                    COMMERCIALS
                  </span>
                </div>
                <div className="text-[11px] font-mono text-slate-600 dark:text-slate-300">
                  {DEFAULT_CREDENTIALS.admin.email}
                </div>
                <div className="text-[10px] text-slate-500 dark:text-slate-400">
                  Password: <span className="font-mono">{DEFAULT_CREDENTIALS.admin.password}</span>
                </div>
                <div className="text-[10px] text-emerald-800/80 dark:text-teal-300/80 font-medium pt-0.5">
                  Rates, estimates, work order generation & approvals.
                </div>
              </div>

              {/* 3. Member Preset */}
              <div
                onClick={() => handleRoleQuickLogin('member')}
                className="p-3 rounded-xl border border-blue-300/80 dark:border-blue-500/40 bg-blue-50/60 dark:bg-blue-950/30 hover:bg-blue-100/60 dark:hover:bg-blue-950/50 cursor-pointer transition space-y-1"
              >
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-blue-900 dark:text-blue-300">
                    💻 Member (Team Engineer)
                  </span>
                  <span className="text-[10px] bg-blue-200/80 dark:bg-blue-900/60 text-blue-900 dark:text-blue-200 px-1.5 py-0.5 rounded font-mono font-bold">
                    CONFIDENTIAL
                  </span>
                </div>
                <div className="text-[11px] font-mono text-slate-600 dark:text-slate-300">
                  {DEFAULT_CREDENTIALS.member.email}
                </div>
                <div className="text-[10px] text-slate-500 dark:text-slate-400">
                  Password: <span className="font-mono">{DEFAULT_CREDENTIALS.member.password}</span>
                </div>
                <div className="text-[10px] text-blue-800/80 dark:text-blue-300/80 font-medium pt-0.5">
                  Technical chat, hours estimation. Commercial rates masked.
                </div>
              </div>
            </div>

            {/* Architecture Tip */}
            <div className="bg-emerald-50/80 dark:bg-slate-900/60 rounded-xl border border-emerald-200 dark:border-slate-800 p-3 text-[11px] text-slate-600 dark:text-slate-400 flex items-start gap-2">
              <Info className="w-4 h-4 text-emerald-600 dark:text-teal-400 shrink-0 mt-0.5" />
              <span>
                <strong>Super Admin Bootstrap:</strong> The initial Super Admin acts as the master authority and can invite or create new Admins and Members from the Team Management console.
              </span>
            </div>
          </div>
        </div>
      </main>

      {/* Google OAuth Setup Helper Modal */}
      {showGoogleHelpModal && (
        <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="w-full max-w-md bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-6 shadow-2xl space-y-4 text-xs text-slate-800 dark:text-slate-200">
            <div className="flex items-center justify-between border-b border-slate-200 dark:border-slate-800 pb-3">
              <div className="font-bold text-sm text-slate-900 dark:text-slate-100 flex items-center gap-2">
                <Info className="w-4 h-4 text-emerald-600 dark:text-teal-400" />
                Google (Gmail) Sign-In Setup
              </div>
              <button
                onClick={() => setShowGoogleHelpModal(false)}
                className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 font-bold"
              >
                ✕
              </button>
            </div>

            <p className="text-slate-600 dark:text-slate-300">
              To enable live Google login with your Gmail, connect your Google Cloud Console OAuth Client to your Supabase project:
            </p>

            <ol className="list-decimal pl-4 space-y-2 text-[11px] text-slate-600 dark:text-slate-300 font-medium">
              <li>
                In <strong>Google Cloud Console</strong> &gt; APIs &amp; Services &gt; Credentials, create an <strong>OAuth 2.0 Client ID</strong> (Web Application).
              </li>
              <li>
                Add the Authorized redirect URI:
                <code className="block mt-1 p-2 bg-slate-100 dark:bg-slate-950 rounded font-mono text-emerald-700 dark:text-teal-300 select-all break-all">
                  https://vldeebwyoezoluptmnoh.supabase.co/auth/v1/callback
                </code>
              </li>
              <li>
                In your <strong>Supabase Dashboard</strong> &gt; Authentication &gt; Providers &gt; Google, toggle Enabled and paste your Google Client ID and Secret.
              </li>
            </ol>

            <div className="pt-2 flex justify-end">
              <button
                type="button"
                onClick={() => setShowGoogleHelpModal(false)}
                className="px-4 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs"
              >
                Got It
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
