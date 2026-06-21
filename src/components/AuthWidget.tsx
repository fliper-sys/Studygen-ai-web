import React, { useState } from 'react';
import { auth } from '../firebase';
import { 
  signInWithEmailAndPassword, 
  createUserWithEmailAndPassword, 
  signOut,
  User as FirebaseUser
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
            Your notes & workspaces are saved in your browser cache. Setup a real account to sync guides permanently.
          </p>

          <button
            onClick={() => {
              setIsFormOpen(true);
              setIsRegister(false);
              setError('');
            }}
            className="w-full flex items-center justify-center gap-1.5 bg-indigo-600/10 hover:bg-indigo-600 border border-indigo-500/20 hover:border-indigo-500 text-indigo-300 hover:text-white py-2 rounded-xl text-xs font-bold cursor-pointer transition-all shadow-md"
          >
            <LogIn className="w-3.5 h-3.5" />
            <span>Setup Cloud Sync</span>
          </button>
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
              className="text-[10px] text-slate-500 hover:text-white cursor-pointer"
            >
              Cancel
            </button>
          </div>

          {error && (
            <div className="bg-red-500/10 border border-red-500/30 text-red-400 text-[10px] p-2 rounded-lg font-semibold leading-relaxed">
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
        </form>
      )}
    </div>
  );
}
