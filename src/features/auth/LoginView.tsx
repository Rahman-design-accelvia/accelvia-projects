// src/features/auth/LoginView.tsx
// Production Authentication Screen:
// 1. Sign In (Google/Gmail or Password)
// 2. First Registration (Founding Super Admin) & Subsequent Registration (Member/Admin Pending Approval)
// 3. Native Google Sign-In Dialog for seamless Gmail authentication

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
  Clock,
  Check,
  X,
  FileText
} from 'lucide-react';
import { UserRole } from '../../types';

export const LoginView: React.FC = () => {
  const { 
    isSuperAdminRegistered, 
    superAdminProfile, 
    registerUser, 
    loginWithCredentials, 
    loginAsRole, 
    loginWithGoogleGmail 
  } = useAuth();
  const { toggleTheme, isDark } = useTheme();

  // Mode: if no Super Admin, default to register; else signin
  const [activeTab, setActiveTab] = useState<'signin' | 'register'>(
    isSuperAdminRegistered ? 'signin' : 'register'
  );

  // Form states
  const [displayName, setDisplayName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [requestedRole, setRequestedRole] = useState<UserRole>('member');
  const [notes, setNotes] = useState('');

  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successStatus, setSuccessStatus] = useState<{
    status: 'active' | 'pending_approval';
    message: string;
    email: string;
  } | null>(null);

  // Native Google/Gmail Sign In Modal State
  const [showGoogleModal, setShowGoogleModal] = useState(false);
  const [googleGmailInput, setGoogleGmailInput] = useState('');
  const [googleModalMode, setGoogleModalMode] = useState<'signin' | 'register'>('signin');
  const [showDemoLogins, setShowDemoLogins] = useState(false);

  // Handle User Registration
  const handleRegisterSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim()) {
      setErrorMessage('Please enter a valid email or Gmail address.');
      return;
    }

    setIsLoading(true);
    setErrorMessage(null);
    setSuccessStatus(null);

    const result = await registerUser({
      displayName: displayName.trim(),
      email: email.trim(),
      password,
      requestedRole,
      notes: notes.trim(),
    });

    setIsLoading(false);

    if (!result.success) {
      setErrorMessage(result.error || 'Failed to submit registration.');
    } else {
      if (result.status === 'active') {
        // Super Admin registered and logged in
        setSuccessStatus({
          status: 'active',
          message: 'Founding Super Admin registered successfully! Entering workspace...',
          email: email.trim(),
        });
      } else {
        // Member/Admin pending approval
        setSuccessStatus({
          status: 'pending_approval',
          message: `Your registration has been submitted! It is now pending approval by the Super Admin (${superAdminProfile?.email || 'Executive'}). Once approved, you can log in.`,
          email: email.trim(),
        });
        setDisplayName('');
        setEmail('');
        setPassword('');
        setNotes('');
      }
    }
  };

  // Handle Standard Sign In
  const handleSignIn = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim()) {
      setErrorMessage('Please enter your email or Gmail address.');
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

  // Google / Gmail Flow Handler
  const handleGoogleModalSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const gmail = googleGmailInput.trim();
    if (!gmail) return;

    setIsLoading(true);
    setErrorMessage(null);

    if (googleModalMode === 'signin') {
      const result = await loginWithGoogleGmail(gmail);
      setIsLoading(false);

      if (!result.success) {
        setErrorMessage(result.error || 'Unable to sign in with this Gmail.');
        setShowGoogleModal(false);
      } else {
        setShowGoogleModal(false);
      }
    } else {
      // Register with Google
      const result = await registerUser({
        displayName: gmail.split('@')[0],
        email: gmail,
        requestedRole,
      });
      setIsLoading(false);
      setShowGoogleModal(false);

      if (!result.success) {
        setErrorMessage(result.error || 'Registration failed.');
      } else {
        setSuccessStatus({
          status: result.status,
          message: result.status === 'active'
            ? 'Super Admin created with Gmail! Logging into workspace...'
            : `Registration submitted with ${gmail}! It is now pending Super Admin approval.`,
          email: gmail,
        });
      }
    }
  };

  // 1-Click Role Login for Quick Testing
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
                  setSuccessStatus(null);
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
                  setActiveTab('register');
                  setErrorMessage(null);
                  setSuccessStatus(null);
                }}
                className={`flex-1 py-1.5 text-xs font-semibold rounded-lg transition flex items-center justify-center gap-1.5 ${
                  activeTab === 'register'
                    ? 'bg-emerald-600 text-white shadow-xs'
                    : 'text-slate-500 hover:text-slate-800 dark:hover:text-slate-200'
                }`}
              >
                {!isSuperAdminRegistered && <Crown className="w-3.5 h-3.5" />}
                <span>{!isSuperAdminRegistered ? 'Setup Super Admin' : 'Register Account'}</span>
              </button>
            </div>

            {/* Error Message */}
            {errorMessage && (
              <div className="mb-4 p-3 rounded-xl bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-800 text-rose-700 dark:text-rose-300 text-xs flex items-start gap-2">
                <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
                <span className="leading-relaxed">{errorMessage}</span>
              </div>
            )}

            {/* Success Status Banner */}
            {successStatus && (
              <div className="mb-4 p-4 rounded-xl bg-emerald-50 dark:bg-emerald-950/50 border border-emerald-300 dark:border-emerald-800 text-emerald-900 dark:text-emerald-100 text-xs space-y-2">
                <div className="flex items-center gap-2 font-bold uppercase tracking-wider text-emerald-700 dark:text-emerald-400">
                  {successStatus.status === 'active' ? (
                    <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                  ) : (
                    <Clock className="w-4 h-4 text-amber-500" />
                  )}
                  <span>{successStatus.status === 'active' ? 'Account Active' : 'Pending Approval'}</span>
                </div>
                <p className="leading-relaxed">{successStatus.message}</p>
                {successStatus.status === 'pending_approval' && (
                  <div className="pt-2">
                    <button
                      type="button"
                      onClick={() => setActiveTab('signin')}
                      className="text-xs font-bold text-emerald-700 dark:text-teal-400 hover:underline flex items-center gap-1"
                    >
                      <span>Return to Sign In</span>
                      <ArrowRight className="w-3 h-3" />
                    </button>
                  </div>
                )}
              </div>
            )}

            {/* ============================================================= */}
            {/* TAB 1: SIGN IN (For Everyone)                                */}
            {/* ============================================================= */}
            {activeTab === 'signin' && (
              <div className="space-y-4">
                <div className="mb-4">
                  <h2 className="text-xl font-bold tracking-tight text-slate-900 dark:text-slate-100">
                    Sign in to your account
                  </h2>
                  <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                    Sign in using your Gmail or email and password.
                  </p>
                </div>

                {/* Google Sign In Button */}
                <button
                  type="button"
                  onClick={() => {
                    const targetEmail = email.trim();
                    if (targetEmail && targetEmail.includes('@')) {
                      setIsLoading(true);
                      setErrorMessage(null);
                      loginWithGoogleGmail(targetEmail).then((res) => {
                        setIsLoading(false);
                        if (!res.success) {
                          setGoogleGmailInput(targetEmail);
                          setGoogleModalMode('signin');
                          setShowGoogleModal(true);
                          setErrorMessage(res.error || null);
                        }
                      });
                    } else {
                      setGoogleGmailInput('');
                      setGoogleModalMode('signin');
                      setShowGoogleModal(true);
                    }
                  }}
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
                        placeholder="you@gmail.com"
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

                <div className="text-center pt-2 text-xs text-slate-500 dark:text-slate-400">
                  <span>Don't have an account yet? </span>
                  <button
                    type="button"
                    onClick={() => {
                      setActiveTab('register');
                      setErrorMessage(null);
                    }}
                    className="font-bold text-emerald-600 dark:text-teal-400 hover:underline"
                  >
                    Register here
                  </button>
                </div>
              </div>
            )}

            {/* ============================================================= */}
            {/* TAB 2: REGISTER (Super Admin or Member/Admin Pending)        */}
            {/* ============================================================= */}
            {activeTab === 'register' && (
              <div className="space-y-4">
                <div className="mb-4">
                  {!isSuperAdminRegistered ? (
                    <div>
                      <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-emerald-100 dark:bg-emerald-950/70 border border-emerald-200 dark:border-emerald-800 text-[11px] font-semibold text-emerald-800 dark:text-emerald-300 mb-2">
                        <Crown className="w-3.5 h-3.5 text-emerald-600 dark:text-teal-400" />
                        First-Time Workspace Setup
                      </div>
                      <h2 className="text-xl font-bold tracking-tight text-slate-900 dark:text-slate-100">
                        Register Founding Super Admin
                      </h2>
                      <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                        The first registration claims master Super Admin ownership with the Gmail.
                      </p>
                    </div>
                  ) : (
                    <div>
                      <h2 className="text-xl font-bold tracking-tight text-slate-900 dark:text-slate-100">
                        Register Team Account
                      </h2>
                      <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 leading-relaxed">
                        Register with your Gmail or email. New registrations require approval by the Super Admin before activation.
                      </p>
                    </div>
                  )}
                </div>

                {/* Google Register Button */}
                <button
                  type="button"
                  onClick={() => {
                    setGoogleModalMode('register');
                    setShowGoogleModal(true);
                  }}
                  disabled={isLoading}
                  className="w-full py-2.5 px-4 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 hover:bg-slate-50 dark:hover:bg-slate-700/60 font-semibold text-xs sm:text-sm flex items-center justify-center gap-3 transition shadow-xs text-slate-700 dark:text-slate-200"
                >
                  <svg className="w-4 h-4" viewBox="0 0 24 24">
                    <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
                    <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                    <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"/>
                    <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"/>
                  </svg>
                  <span>
                    {!isSuperAdminRegistered
                      ? 'Register as Super Admin with Google'
                      : 'Register with Google (Gmail)'}
                  </span>
                </button>

                <div className="relative my-4">
                  <div className="absolute inset-0 flex items-center">
                    <div className="w-full border-t border-slate-200 dark:border-slate-800" />
                  </div>
                  <div className="relative flex justify-center text-[11px] uppercase font-mono">
                    <span className="bg-white dark:bg-slate-900 px-3 text-slate-400">or fill details</span>
                  </div>
                </div>

                {/* Form */}
                <form onSubmit={handleRegisterSubmit} className="space-y-3">
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
                        placeholder="e.g. Alex Morgan"
                        className="w-full pl-9 pr-3 py-2 bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-700 rounded-xl text-xs sm:text-sm text-slate-900 dark:text-slate-100 focus:outline-none focus:border-emerald-500"
                      />
                    </div>
                  </div>

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
                        placeholder="you@gmail.com"
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

                  {isSuperAdminRegistered && (
                    <>
                      <div>
                        <label className="block text-[11px] font-semibold text-slate-700 dark:text-slate-300 mb-1">
                          Requested Role
                        </label>
                        <select
                          value={requestedRole}
                          onChange={(e) => setRequestedRole(e.target.value as UserRole)}
                          className="w-full py-2 px-3 bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-700 rounded-xl text-xs sm:text-sm text-slate-900 dark:text-slate-100 focus:outline-none focus:border-emerald-500 font-medium"
                        >
                          <option value="member">Member (Specialist / Developer / Designer)</option>
                          <option value="admin">Admin (Project Manager / Account Lead)</option>
                        </select>
                      </div>

                      <div>
                        <label className="block text-[11px] font-semibold text-slate-700 dark:text-slate-300 mb-1">
                          Note for Super Admin (Optional)
                        </label>
                        <input
                          type="text"
                          value={notes}
                          onChange={(e) => setNotes(e.target.value)}
                          placeholder="e.g. Joining engineering team for client sprint"
                          className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-700 rounded-xl text-xs text-slate-900 dark:text-slate-100 focus:outline-none focus:border-emerald-500"
                        />
                      </div>
                    </>
                  )}

                  <button
                    type="submit"
                    disabled={isLoading}
                    className="w-full mt-2 py-2.5 px-4 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-semibold text-xs sm:text-sm flex items-center justify-center gap-2 transition shadow-md shadow-emerald-600/20"
                  >
                    {!isSuperAdminRegistered ? (
                      <>
                        <Crown className="w-4 h-4" />
                        <span>Complete Super Admin Registration</span>
                      </>
                    ) : (
                      <>
                        <Clock className="w-4 h-4" />
                        <span>Submit Registration for Approval</span>
                      </>
                    )}
                  </button>
                </form>

                <div className="text-center pt-2 text-xs text-slate-500 dark:text-slate-400">
                  <span>Already have an account? </span>
                  <button
                    type="button"
                    onClick={() => {
                      setActiveTab('signin');
                      setErrorMessage(null);
                    }}
                    className="font-bold text-emerald-600 dark:text-teal-400 hover:underline"
                  >
                    Sign in here
                  </button>
                </div>
              </div>
            )}

          </div>

          {/* Collapsible Demo Quick-Logins (Development Mode) */}
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
                  <div className="text-[9px] opacity-75">Specialist</div>
                </button>
              </div>
            )}
          </div>

        </div>
      </main>

      {/* =================================================================== */}
      {/* NATIVE GOOGLE / GMAIL SIGN IN DIALOG                                */}
      {/* =================================================================== */}
      {showGoogleModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in">
          <div className="w-full max-w-sm bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-6 shadow-2xl space-y-4">
            
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <svg className="w-5 h-5" viewBox="0 0 24 24">
                  <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
                  <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                  <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"/>
                  <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"/>
                </svg>
                <span className="font-bold text-sm text-slate-900 dark:text-slate-100">
                  {googleModalMode === 'signin' ? 'Sign in with Google' : 'Register with Google'}
                </span>
              </div>

              <button
                type="button"
                onClick={() => setShowGoogleModal(false)}
                className="p-1 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <p className="text-xs text-slate-500 dark:text-slate-400">
              {googleModalMode === 'signin'
                ? 'Enter your Gmail address to sign into your approved account.'
                : 'Enter your Gmail address to register for workspace access.'}
            </p>

            <form onSubmit={handleGoogleModalSubmit} className="space-y-3">
              <div>
                <label className="block text-[11px] font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Gmail Address
                </label>
                <input
                  type="email"
                  required
                  autoFocus
                  value={googleGmailInput}
                  onChange={(e) => setGoogleGmailInput(e.target.value)}
                  placeholder="yourname@gmail.com"
                  className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-700 rounded-xl text-xs sm:text-sm text-slate-900 dark:text-slate-100 focus:outline-none focus:border-emerald-500 font-mono"
                />
              </div>

              <div className="flex gap-2 pt-1">
                <button
                  type="button"
                  onClick={() => setShowGoogleModal(false)}
                  className="flex-1 py-2 rounded-xl border border-slate-300 dark:border-slate-700 text-xs font-semibold text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isLoading}
                  className="flex-1 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold transition shadow-xs flex items-center justify-center gap-1.5"
                >
                  <span>Continue</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Footer */}
      <footer className="py-3 px-4 text-center text-[11px] text-slate-400 dark:text-slate-500 border-t border-slate-200 dark:border-slate-900">
        Accelvia Work Management System &bull; Enterprise Client Delivery Platform
      </footer>
    </div>
  );
};
