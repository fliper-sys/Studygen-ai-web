import React, { useState } from 'react';
import { auth } from '../firebase';
import { 
  signInWithEmailAndPassword, 
  createUserWithEmailAndPassword, 
  signOut,
  User as FirebaseUser,
  GoogleAuthProvider,
  signInWithPopup
} from 'firebase/auth';
import { 
  User, 
  Lock, 
  Mail, 
  LogOut, 
  LogIn, 
  UserPlus, 
  Loader2, 
  Shield, 
  CloudLightning,
  Sparkles,
  HelpCircle
} from 'lucide-react';

interface AuthWidgetProps {
  currentUser: FirebaseUser | null;
  onAuthSuccess?: () => void;
}

export function AuthWidget({ currentUser, onAuthSuccess }: AuthWidgetProps) {
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [isRegister, setIsRegister] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleGoogleSignIn = async () => {
    setError('');
    setLoading(true);
    try {
      const provider = new GoogleAuthProvider();
      await signInWithPopup(auth, provider);
      setIsFormOpen(false);
      if (onAuthSuccess) onAuthSuccess();
    } catch (err: any) {
      console.error(err);
      let errMsg = err.message || 'Google authentication sequence failed.';
      if (err.code === 'auth/popup-closed-by-user') {
        errMsg = 'Authorization popup was closed before completion.';
      } else if (err.code === 'auth/popup-blocked') {
        errMsg = 'The popup window was blocked by your browser settings.';
      }
      setError(errMsg);
    } finally {
      setLoading(false);
    }
  };

  const handleAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    if (!email || !password) {
      setError('Please fill in all authorization keys.');
      setLoading(false);
      return;
    }

    try {
      if (isRegister) {
        await createUserWithEmailAndPassword(auth, email, password);
      } else {
        await signInWithEmailAndPassword(auth, email, password);
      }
      setIsFormOpen(false);
      setEmail('');
      setPassword('');
      if (onAuthSuccess) onAuthSuccess();
    } catch (err: any) {
      console.error(err);
      let errMsg = err.message || 'Authentication sequence failed.';
      if (err.code === 'auth/weak-password') {
        errMsg = 'The secret password must be at least 6 characters.';
      } else if (err.code === 'auth/invalid-email') {
        errMsg = 'Invalid email syntax.';
      } else if (err.code === 'auth/invalid-credential') {
        errMsg = 'Incorrect authentication credentials.';
      } else if (err.code === 'auth/email-already-in-use') {
        errMsg = 'This email account is already registered.';
      }
      setError(errMsg);
    } finally {
      setLoading(false);
    }
  };

  const handleLogout = async () => {
    try {
      await signOut(auth);
    } catch (err) {
      console.error("Logout sequence failed: ", err);
    }
  };

  // Logged-In State
  if (currentUser) {
    return (
      <div id="auth-widget-logged-in" className="bg-[#101424]/90 border border-indigo-900/40 rounded-2xl p-4 shadow-xl space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-indigo-500/15 border border-indigo-500/30 flex items-center justify-center">
              <Shield className="w-4 h-4 text-indigo-400" />
            </div>
            <div className="truncate max-w-[130px]">
              <span className="text-[10px] text-slate-400 block font-bold uppercase tracking-wider">Cloud Co-Pilot</span>
              <span className="text-xs font-bold text-slate-200 truncate block" title={currentUser.email || ''}>
                {currentUser.email?.split('@')[0]}
              </span>
            </div>
          </div>
          <div className="flex items-center gap-1 bg-emerald-500/10 border border-emerald-500/25 px-2 py-0.5 rounded-full text-[9px] font-bold text-emerald-400 animate-pulse">
            <CloudLightning className="w-2.5 h-2.5" />
            <span>SYNCED</span>
          </div>
        </div>

        <button
          onClick={handleLogout}
          className="w-full flex items-center justify-center gap-2 bg-slate-950 hover:bg-red-950/20 hover:text-red-400 text-slate-400 border border-slate-800 hover:border-red-900/30 py-2 rounded-xl text-xs font-bold cursor-pointer transition-all"
        >
          <LogOut className="w-3.5 h-3.5" />
          <span>Disconnect Session</span>
        </button>
      </div>
    );
  }

  // Logged-Out / Guest State (Expandable Auth Form)
  return (
    <div id="auth-widget-guest" className="bg-[#101424]/60 border border-slate-850/60 rounded-2xl p-3.5 shadow-lg space-y-3">
      {!isFormOpen ? (
        <div className="space-y-3.5">
          <div className="flex items-start justify-between gap-1">
            <div className="flex items-center gap-2">
              <div className="w-7 h-7 rounded-lg bg-slate-900 border border-slate-800 flex items-center justify-center">
                <CloudLightning className="w-3.5 h-3.5 text-slate-400" />
              </div>
              <div>
                <span className="text-[10px] text-slate-500 block font-bold uppercase tracking-wider">Storage Core</span>
                <span className="text-xs font-extrabold text-slate-350">Guest Sandbox</span>
              </div>
            </div>
            <span className="text-[8px] border border-slate-800 text-slate-500 px-1.5 py-0.5 rounded-full uppercase font-mono tracking-wider font-bold">Local</span>
          </div>

          <p className="text-[10.5px] text-slate-400 leading-relaxed font-medium">
            Your notes & workspaces are saved in your browser cache. Setup an email account to sync guides permanently.
          </p>

          <div className="flex flex-col gap-2">
            <button
              onClick={() => {
                setIsFormOpen(true);
                setIsRegister(false);
                setError('');
              }}
              className="w-full flex items-center justify-center gap-1.5 bg-indigo-600 hover:bg-indigo-500 text-white hover:text-white py-2 rounded-xl text-xs font-bold cursor-pointer transition-all shadow-md"
            >
              <LogIn className="w-3.5 h-3.5" />
              <span>Login / Register with Email</span>
            </button>

            <div className="relative pt-1">
              <button
                type="button"
                onClick={handleGoogleSignIn}
                disabled={loading}
                className="w-full flex items-center justify-center gap-2 bg-slate-900/50 hover:bg-slate-850/60 border border-slate-850/40 hover:border-slate-750/50 text-slate-400 py-2 rounded-xl text-xs font-semibold cursor-pointer transition-all"
              >
                <svg className="w-3.5 h-3.5 opacity-50" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4" />
                  <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853" />
                  <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z" fill="#FBBC05" />
                  <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z" fill="#EA4335" />
                </svg>
                <span>Google Account Auth</span>
              </button>
              <div className="text-[8.5px] text-amber-500/70 font-sans text-center mt-1 leading-normal">
                ⚠️ Connection Refused: Requires activating Google Auth & Firebase Hosting domains on your GCP Project console. We highly recommend using the email route above instead.
              </div>
            </div>
          </div>
        </div>
      ) : (
        <form onSubmit={handleAuth} className="space-y-3">
          <div className="flex items-center justify-between pb-1 border-b border-slate-800">
            <span className="text-[10px] uppercase font-bold tracking-widest text-slate-400 flex items-center gap-1">
              <Sparkles className="w-3 h-3 text-indigo-400" />
              {isRegister ? 'Register Account' : 'Secure Authorization'}
            </span>
            <button
              type="button"
              onClick={() => setIsFormOpen(false)}
              className="text-[10px] text-slate-500 hover:text-white cursor-pointer hover:underline"
            >
              Cancel
            </button>
          </div>

          {error && (
            <div className="bg-red-500/10 border border-red-500/30 text-red-400 text-[10px] p-2 rounded-lg font-semibold leading-relaxed animate-pulse">
              {error}
            </div>
          )}

          <div className="space-y-2">
            {/* Email field */}
            <div className="relative">
              <Mail className="absolute left-2.5 top-2.5 w-3.5 h-3.5 text-slate-500" />
              <input
                type="email"
                placeholder="Student Email Address"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full bg-slate-950 text-xs border border-slate-800 focus:border-indigo-500 rounded-lg pl-8 pr-3 py-2 outline-none text-slate-200"
                required
              />
            </div>

            {/* Password field */}
            <div className="relative">
              <Lock className="absolute left-2.5 top-2.5 w-3.5 h-3.5 text-slate-500" />
              <input
                type="password"
                placeholder="Access Password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full bg-slate-950 text-xs border border-slate-800 focus:border-indigo-500 rounded-lg pl-8 pr-3 py-2 outline-none text-slate-200"
                required
              />
            </div>
          </div>

          <div className="flex items-center justify-between pt-1">
            <button
              type="button"
              onClick={() => {
                setIsRegister(!isRegister);
                setError('');
              }}
              className="text-[10px] text-indigo-400 hover:text-white underline cursor-pointer font-medium"
            >
              {isRegister ? 'Have an account? Sign In' : 'Create new account'}
            </button>
            
            <button
              type="submit"
              disabled={loading}
              className="bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-xs px-3.5 py-1.5 rounded-lg cursor-pointer flex items-center gap-1.5 transition-all shadow-md"
            >
              {loading ? (
                <Loader2 className="w-3 h-3 animate-spin" />
              ) : isRegister ? (
                <UserPlus className="w-3 h-3" />
              ) : (
                <LogIn className="w-3 h-3" />
              )}
              <span>{isRegister ? 'Register' : 'Access'}</span>
            </button>
          </div>

          <div className="relative flex items-center justify-center py-1">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t border-slate-800/80"></div>
            </div>
            <span className="relative bg-[#101424] px-2 text-[8px] font-mono tracking-widest text-slate-500 uppercase">OR</span>
          </div>

          <button
            type="button"
            onClick={handleGoogleSignIn}
            disabled={loading}
            className="w-full flex items-center justify-center gap-2 bg-slate-950 hover:bg-slate-900 border border-slate-850 hover:border-slate-800 text-slate-400 py-2 rounded-xl text-xs font-normal cursor-pointer transition-all opacity-60"
          >
            <svg className="w-3.5 h-3.5 opacity-40" viewBox="0 0 24 24" fill="currentColor">
              <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4" />
              <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853" />
              <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z" fill="#FBBC05" />
              <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z" fill="#EA4335" />
            </svg>
            <span>Google Login (Hosting Required)</span>
          </button>

          <div className="mt-3.5 pt-2 border-t border-slate-900 flex items-start gap-1.5 opacity-80">
            <HelpCircle className="w-3.5 h-3.5 text-indigo-400 shrink-0 mt-0.5" />
            <div className="text-[9.5px]/relaxed text-slate-400 font-sans">
              <strong>Firebase Config Note:</strong> To register or login with email, make sure 
              <span className="text-indigo-300 font-semibold"> Email/Password sign-in provider</span> is enabled in your Firebase Console under Auth &gt; Sign-in method.
            </div>
          </div>
        </form>
      )}
    </div>
  );
}
