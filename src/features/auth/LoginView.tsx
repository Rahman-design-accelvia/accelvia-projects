// src/features/auth/LoginView.tsx
// Production Authentication Screen:
// 1. Initial Workspace Setup: First Registration claims Super Admin role with Gmail
// 2. Sign In for Everyone (Super Admin, Admins, Members) with Gmail / Google OAuth or Password
// 3. Quick Demo Logins for immediate testing

import React, { useState } from 'react';
import { useAuth, DEFAULT_CREDENTIALS } from './AuthContext';
import { useTheme } from '../theme/ThemeContext';
import { Sun, Moon } from '../../components/ThemeIcons';
import { 
  ShieldCheck, 
  Crown, 
  UserCheck, 
  Lock, 
  Mail, 
  User, 
  ArrowRight, 
  CheckCircle2, 
  AlertCircle,
  Sparkles,
  RotateCcw,
  Users
} from 'lucide-react';
import { UserRole } from '../../types';

export const LoginView: React.FC = () => {
  const { 
    isSuperAdminRegistered, 
    superAdminProfile, 
    registerSuperAdmin, 
    registerWithGoogleAsSuperAdmin,
    resetSuperAdminSetup,
    loginWithCredentials, 
    loginAsRole, 
    loginWithGoogle 
  } = useAuth();
  const { toggleTheme, isDark } = useTheme();

  // Mode: if Super Admin hasn't registered yet, default to 'register_super_admin'
  const [activeTab, setActiveTab] = useState<'signin' | 'register_super_admin'>(
    isSuperAdminRegistered ? 'signin' : 'register_super_admin'
  );

  // Form states
  const [displayName, setDisplayName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [showDemoLogins, setShowDemoLogins] = useState(false);

  // Handle First Super Admin Registration
  const handleRegisterSuperAdmin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim()) {
      setErrorMessage('Please enter your Gmail address.');
      return;
    }

    setIsLoading(true);
    setErrorMessage(null);

    const result = await registerSuperAdmin({
      displayName: displayName.trim(),
      email: email.trim(),
      password,
    });

    setIsLoading(false);

    if (!result.success) {
      setErrorMessage(result.error || 'Failed to complete registration.');
    } else {
      setSuccessMessage('Super Admin registration complete! Logging into workspace...');
    }
  };

  // Quick Gmail / Google Registration as Super Admin
  const handleGoogleSuperAdminRegister = async () => {
    const inputGmail = prompt('Enter your Gmail address to register as the founding Super Admin:');
    if (!inputGmail || !inputGmail.trim()) return;

    setIsLoading(true);
    setErrorMessage(null);

    const result = await registerWithGoogleAsSuperAdmin(inputGmail.trim());
    setIsLoading(false);

    if (!result.success) {
      setErrorMessage(result.error || 'Registration failed.');
    }
  };

  // Handle Standard Sign In (Everyone)
  const handleSignIn = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim()) {
      setErrorMessage('Please enter your email.');
      return;
    }

    setIsLoading(true);
    setErrorMessage(null);

    const result = await loginWithCredentials(email.trim(), password);
    setIsLoading(false);

    if (!result.success) {
      setErrorMessage(result.error || 'Invalid credentials.');
    }
  };

  // Google OAuth Sign In
  const handleGoogleSignIn = async () => {
    setIsLoading(true);
    setErrorMessage(null);
    const result = await loginWithGoogle();
    setIsLoading(false);

    if (!result.success) {
      // If prompt needed
      const inputGmail = prompt('Enter your Gmail address to sign in:');
      if (inputGmail && inputGmail.trim()) {
        const res = await loginWithCredentials(inputGmail.trim());
        if (!res.success) {
          setErrorMessage(res.error || 'No matching account found for this Gmail.');
        }
      } else {
        setErrorMessage(result.error || 'Google sign-in cancelled.');
      }
    }
  };

  // 1-Click Role Fill / Login for testers
  const handleQuickRole = (role: UserRole) => {
    const cred = DEFAULT_CREDENTIALS[role];
    setEmail(cred.email);
    setPassword(cred.password);
    loginAsRole(role);
  };

  return (
    <div className="min-h-screen w-screen flex flex-col bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-100 transition-colors">
      {/* Top Header */}
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

      {/* Main Authentication Container */}
      <main className="flex-1 flex items-center justify-center p-4 sm:p-6 overflow-y-auto">
        <div className="w-full max-w-md my-auto space-y-4">
          
          {/* Card Container */}
          <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-6 sm:p-8 shadow-xl">
            
            {/* Header Tabs */}
            <div className="flex rounded-xl p-1 bg-slate-100 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 mb-6">
              <button
                type="button"
                onClick={() => {
                  setActiveTab('signin');
                  setErrorMessage(null);
                }}
                className={`flex-1 py-1.5 text-xs font-semibold rounded-lg transition ${
                  activeTab === 'signin'
                    ? 'bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 shadow-xs'
                    : 'text-slate-500 hover:text-slate-800 dark:hover:text-slate-200'
                }`}
              >
                Sign In
              </button>

              <button
                type="button"
                onClick={() => {
                  setActiveTab('register_super_admin');
                  setErrorMessage(null);
                }}
                className={`flex-1 py-1.5 text-xs font-semibold rounded-lg transition flex items-center justify-center gap-1.5 ${
                  activeTab === 'register_super_admin'
                    ? 'bg-emerald-600 text-white shadow-xs'
                    : 'text-slate-500 hover:text-slate-800 dark:hover:text-slate-200'
                }`}
              >
                <Crown className="w-3.5 h-3.5" />
                <span>{isSuperAdminRegistered ? 'Super Admin Setup' : 'Register Super Admin'}</span>
              </button>
            </div>

            {/* Error & Success Messages */}
            {errorMessage && (
              <div className="mb-4 p-3 rounded-xl bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-800 text-rose-700 dark:text-rose-300 text-xs flex items-start gap-2">
                <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
                <span>{errorMessage}</span>
              </div>
            )}

            {successMessage && (
              <div className="mb-4 p-3 rounded-xl bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800 text-emerald-700 dark:text-emerald-300 text-xs flex items-start gap-2">
                <CheckCircle2 className="w-4 h-4 shrink-0 mt-0.5" />
                <span>{successMessage}</span>
              </div>
            )}

            {/* ============================================================= */}
            {/* TAB 1: FIRST REGISTRATION (Super Admin with Gmail)            */}
            {/* ============================================================= */}
            {activeTab === 'register_super_admin' && (
              <div className="space-y-4">
                {isSuperAdminRegistered ? (
                  // Super Admin is already established
                  <div className="space-y-4">
                    <div className="p-4 rounded-xl bg-emerald-50/80 dark:bg-emerald-950/30 border border-emerald-200 dark:border-emerald-800/80 text-emerald-900 dark:text-emerald-200">
                      <div className="flex items-center gap-2 font-bold text-xs uppercase tracking-wider text-emerald-700 dark:text-emerald-400 mb-1">
                        <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                        Super Admin Established
                      </div>
                      <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed">
                        The founding Super Admin is registered with:
                      </p>
                      <div className="mt-2 font-mono text-xs font-semibold px-2.5 py-1 bg-white dark:bg-slate-900 border border-emerald-200 dark:border-emerald-800 rounded-lg text-emerald-800 dark:text-teal-300 inline-block">
                        {superAdminProfile?.email}
                      </div>
                    </div>

                    <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 text-xs text-slate-600 dark:text-slate-400 space-y-2">
                      <div className="font-semibold text-slate-800 dark:text-slate-200 flex items-center gap-1.5">
                        <Users className="w-3.5 h-3.5 text-emerald-600" />
                        Team Accounts Are Invite-Only
                      </div>
                      <p className="text-[11px] leading-relaxed">
                        Admins and Members cannot publicly register. The Super Admin adds them securely from inside the application.
                      </p>
                    </div>

                    <div className="pt-2 flex flex-col gap-2">
                      <button
                        type="button"
                        onClick={() => {
                          setEmail(superAdminProfile?.email || '');
                          setActiveTab('signin');
                        }}
                        className="w-full py-2.5 px-4 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-semibold text-xs sm:text-sm flex items-center justify-center gap-2 transition shadow-md shadow-emerald-600/20"
                      >
                        <span>Sign In as Super Admin</span>
                        <ArrowRight className="w-4 h-4" />
                      </button>

                      <button
                        type="button"
                        onClick={() => {
                          if (confirm('Reset workspace Super Admin? This will allow registering a new Super Admin.')) {
                            resetSuperAdminSetup();
                          }
                        }}
                        className="w-full py-2 text-[11px] text-slate-400 hover:text-rose-500 dark:hover:text-rose-400 transition flex items-center justify-center gap-1"
                      >
                        <RotateCcw className="w-3 h-3" />
                        <span>Reset Super Admin Registration</span>
                      </button>
                    </div>
                  </div>
                ) : (
                  // Initial Registration Form for Super Admin
                  <div>
                    <div className="mb-4">
                      <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-emerald-100 dark:bg-emerald-950/70 border border-emerald-200 dark:border-emerald-800 text-[11px] font-semibold text-emerald-800 dark:text-emerald-300 mb-2">
                        <Sparkles className="w-3.5 h-3.5 text-emerald-600 dark:text-teal-400" />
                        Initial Workspace Setup
                      </div>
                      <h2 className="text-xl font-bold tracking-tight text-slate-900 dark:text-slate-100">
                        Register Founding Super Admin
                      </h2>
                      <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 leading-relaxed">
                        The first registration claims master authority with the Gmail. You can then invite your admins and team members.
                      </p>
                    </div>

                    {/* Google One-Click Setup */}
                    <button
                      type="button"
                      onClick={handleGoogleSuperAdminRegister}
                      disabled={isLoading}
                      className="w-full py-2.5 px-4 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 hover:bg-slate-50 dark:hover:bg-slate-700/60 font-semibold text-xs sm:text-sm flex items-center justify-center gap-3 transition shadow-xs text-slate-700 dark:text-slate-200 mb-4"
                    >
                      <svg className="w-4 h-4" viewBox="0 0 24 24">
                        <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
                        <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                        <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"/>
                        <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"/>
                      </svg>
                      <span>Register as Super Admin with Google (Gmail)</span>
                    </button>

                    <div className="relative my-4">
                      <div className="absolute inset-0 flex items-center">
                        <div className="w-full border-t border-slate-200 dark:border-slate-800" />
                      </div>
                      <div className="relative flex justify-center text-[11px] uppercase font-mono">
                        <span className="bg-white dark:bg-slate-900 px-3 text-slate-400">or enter details</span>
                      </div>
                    </div>

                    {/* Registration Form */}
                    <form onSubmit={handleRegisterSuperAdmin} className="space-y-3">
                      <div>
                        <label className="block text-[11px] font-semibold text-slate-700 dark:text-slate-300 mb-1">
                          Full Name
                        </label>
                        <div className="relative">
                          <User className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                          <input
                            type="text"
                            required
                            value={displayName}
                            onChange={(e) => setDisplayName(e.target.value)}
                            placeholder="e.g. Musfiqur Rahman"
                            className="w-full pl-9 pr-3 py-2 bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-700 rounded-xl text-xs sm:text-sm text-slate-900 dark:text-slate-100 focus:outline-none focus:border-emerald-500"
                          />
                        </div>
                      </div>

                      <div>
                        <label className="block text-[11px] font-semibold text-slate-700 dark:text-slate-300 mb-1">
                          Super Admin Gmail Address
                        </label>
                        <div className="relative">
                          <Mail className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                          <input
                            type="email"
                            required
                            value={email}
                            onChange={(e) => setEmail(e.target.value)}
                            placeholder="yourname@gmail.com"
                            className="w-full pl-9 pr-3 py-2 bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-700 rounded-xl text-xs sm:text-sm text-slate-900 dark:text-slate-100 focus:outline-none focus:border-emerald-500 font-mono"
                          />
                        </div>
                      </div>

                      <div>
                        <label className="block text-[11px] font-semibold text-slate-700 dark:text-slate-300 mb-1">
                          Password
                        </label>
                        <div className="relative">
                          <Lock className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                          <input
                            type="password"
                            required
                            value={password}
                            onChange={(e) => setPassword(e.target.value)}
                            placeholder="••••••••"
                            className="w-full pl-9 pr-3 py-2 bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-700 rounded-xl text-xs sm:text-sm text-slate-900 dark:text-slate-100 focus:outline-none focus:border-emerald-500 font-mono"
                          />
                        </div>
                      </div>

                      <button
                        type="submit"
                        disabled={isLoading}
                        className="w-full mt-2 py-2.5 px-4 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-semibold text-xs sm:text-sm flex items-center justify-center gap-2 transition shadow-md shadow-emerald-600/20"
                      >
                        <Crown className="w-4 h-4" />
                        <span>Complete Super Admin Registration</span>
                      </button>
                    </form>
                  </div>
                )}
              </div>
            )}

            {/* ============================================================= */}
            {/* TAB 2: SIGN IN (For Everyone)                                */}
            {/* ============================================================= */}
            {activeTab === 'signin' && (
              <div className="space-y-4">
                <div className="mb-4">
                  <h2 className="text-xl font-bold tracking-tight text-slate-900 dark:text-slate-100">
                    Sign in to your account
                  </h2>
                  <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                    Enter your credentials or use Google sign-in.
                  </p>
                </div>

                {/* Google Sign In */}
                <button
                  type="button"
                  onClick={handleGoogleSignIn}
                  disabled={isLoading}
                  className="w-full py-2.5 px-4 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 hover:bg-slate-50 dark:hover:bg-slate-700/60 font-semibold text-xs sm:text-sm flex items-center justify-center gap-3 transition shadow-xs text-slate-700 dark:text-slate-200"
                >
                  <svg className="w-4 h-4" viewBox="0 0 24 24">
                    <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
                    <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                    <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"/>
                    <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"/>
                  </svg>
                  <span>Sign in with Google (Gmail)</span>
                </button>

                <div className="relative my-4">
                  <div className="absolute inset-0 flex items-center">
                    <div className="w-full border-t border-slate-200 dark:border-slate-800" />
                  </div>
                  <div className="relative flex justify-center text-[11px] uppercase font-mono">
                    <span className="bg-white dark:bg-slate-900 px-3 text-slate-400">or sign in with password</span>
                  </div>
                </div>

                {/* Email / Password Form */}
                <form onSubmit={handleSignIn} className="space-y-3">
                  <div>
                    <label className="block text-[11px] font-semibold text-slate-700 dark:text-slate-300 mb-1">
                      Email Address / Gmail
                    </label>
                    <div className="relative">
                      <Mail className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                      <input
                        type="email"
                        required
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        placeholder="e.g. name@accelvia.internal or gmail"
                        className="w-full pl-9 pr-3 py-2 bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-700 rounded-xl text-xs sm:text-sm text-slate-900 dark:text-slate-100 focus:outline-none focus:border-emerald-500 font-mono"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-[11px] font-semibold text-slate-700 dark:text-slate-300 mb-1">
                      Password
                    </label>
                    <div className="relative">
                      <Lock className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                      <input
                        type="password"
                        required
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        placeholder="••••••••"
                        className="w-full pl-9 pr-3 py-2 bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-700 rounded-xl text-xs sm:text-sm text-slate-900 dark:text-slate-100 focus:outline-none focus:border-emerald-500 font-mono"
                      />
                    </div>
                  </div>

                  <button
                    type="submit"
                    disabled={isLoading}
                    className="w-full mt-2 py-2.5 px-4 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-semibold text-xs sm:text-sm flex items-center justify-center gap-2 transition shadow-md shadow-emerald-600/20"
                  >
                    <span>Sign In</span>
                    <ArrowRight className="w-4 h-4" />
                  </button>
                </form>
              </div>
            )}

          </div>

          {/* Collapsible Demo Quick-Logins (For Developers and QA Testing) */}
          <div className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white/70 dark:bg-slate-900/70 p-3 shadow-xs">
            <button
              type="button"
              onClick={() => setShowDemoLogins(!showDemoLogins)}
              className="w-full flex items-center justify-between text-xs font-semibold text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200"
            >
              <div className="flex items-center gap-1.5">
                <Sparkles className="w-3.5 h-3.5 text-emerald-600 dark:text-teal-400" />
                <span>1-Click Demo Personas (Development Mode)</span>
              </div>
              <span className="text-[10px] uppercase font-mono text-slate-400">
                {showDemoLogins ? 'Hide' : 'Show'}
              </span>
            </button>

            {showDemoLogins && (
              <div className="mt-3 pt-3 border-t border-slate-200 dark:border-slate-800 grid grid-cols-3 gap-2">
                <button
                  type="button"
                  onClick={() => handleQuickRole('super_admin')}
                  className="p-2 rounded-lg border border-emerald-300 dark:border-emerald-800/80 bg-emerald-50/50 dark:bg-emerald-950/30 text-emerald-800 dark:text-emerald-300 hover:bg-emerald-100 dark:hover:bg-emerald-900/50 transition text-center"
                >
                  <div className="font-bold text-[11px]">Super Admin</div>
                  <div className="text-[9px] opacity-75">Executive</div>
                </button>

                <button
                  type="button"
                  onClick={() => handleQuickRole('admin')}
                  className="p-2 rounded-lg border border-teal-300 dark:border-teal-800/80 bg-teal-50/50 dark:bg-teal-950/30 text-teal-800 dark:text-teal-300 hover:bg-teal-100 dark:hover:bg-teal-900/50 transition text-center"
                >
                  <div className="font-bold text-[11px]">Admin</div>
                  <div className="text-[9px] opacity-75">Manager</div>
                </button>

                <button
                  type="button"
                  onClick={() => handleQuickRole('member')}
                  className="p-2 rounded-lg border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700 transition text-center"
                >
                  <div className="font-bold text-[11px]">Member</div>
                  <div className="text-[9px] opacity-75">Dev/Specialist</div>
                </button>
              </div>
            )}
          </div>

        </div>
      </main>

      {/* Footer */}
      <footer className="py-3 px-4 text-center text-[11px] text-slate-400 dark:text-slate-500 border-t border-slate-200 dark:border-slate-900">
        Accelvia Work Management System &bull; Enterprise Client Delivery Platform
      </footer>
    </div>
  );
};
