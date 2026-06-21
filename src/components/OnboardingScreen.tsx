import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Sparkles, 
  ChevronRight, 
  BookOpen, 
  Layers, 
  Trophy, 
  HelpCircle, 
  ShieldCheck, 
  CloudLightning, 
  ArrowRight,
  LogIn,
  Check
} from 'lucide-react';
import { auth } from '../firebase';
import { GoogleAuthProvider, signInWithPopup } from 'firebase/auth';

interface OnboardingScreenProps {
  onComplete: () => void;
}

export function OnboardingScreen({ onComplete }: OnboardingScreenProps) {
  const [showSplash, setShowSplash] = useState(true);
  const [currentSlide, setCurrentSlide] = useState(0);
  const [showSecurityDocs, setShowSecurityDocs] = useState(false);
  const [oauthLoading, setOauthLoading] = useState(false);
  const [oauthError, setOauthError] = useState('');

  // 1. Splash Screen Timeout
  useEffect(() => {
    const timer = setTimeout(() => {
      setShowSplash(false);
    }, 2500); // 2.5s for deep, premium immersion
    return () => clearTimeout(timer);
  }, []);

  const handleGoogleSignInOnboarding = async () => {
    setOauthError('');
    setOauthLoading(true);
    try {
      const provider = new GoogleAuthProvider();
      await signInWithPopup(auth, provider);
      // Once signed in, trigger onboarding completion!
      localStorage.setItem('sg_onboarded', 'true');
      onComplete();
    } catch (err: any) {
      console.error(err);
      let errMsg = err.message || 'Google Sign-In failed during onboarding.';
      if (err.code === 'auth/popup-closed-by-user') {
        errMsg = 'Authorization popup was closed before completion.';
      } else if (err.code === 'auth/popup-blocked') {
        errMsg = 'The popup window was blocked by your browser settings.';
      }
      setOauthError(errMsg);
    } finally {
      setOauthLoading(false);
    }
  };

  const handleSkip = () => {
    localStorage.setItem('sg_onboarded', 'true');
    onComplete();
  };

  // Render Splash Loading
  if (showSplash) {
    return (
      <div 
        id="onboarding-splash-screen"
        className="fixed inset-0 z-50 bg-[#070913] flex flex-col items-center justify-center p-6 overflow-hidden select-none"
      >
        {/* Soft background glow orbits */}
        <div className="absolute w-[500px] h-[500px] rounded-full bg-indigo-600/10 blur-[120px] top-1/4 left-1/4 animate-pulse duration-4000" />
        <div className="absolute w-[400px] h-[400px] rounded-full bg-emerald-600/5 blur-[100px] bottom-1/4 right-1/4 animate-pulse duration-3000" />

        <div className="relative text-center max-w-md w-full space-y-8 flex flex-col items-center">
          {/* Neural Synapse Vector Loop (Lottie Aesthetic) */}
          <div className="relative w-32 h-32 flex items-center justify-center">
            {/* Spinning glowing outer nodes */}
            <motion.div 
              animate={{ rotate: 360 }}
              transition={{ repeat: Infinity, duration: 12, ease: "linear" }}
              className="absolute inset-0"
            >
              <svg className="w-full h-full" viewBox="0 0 100 100">
                {/* Orbital path */}
                <circle cx="50" cy="50" r="40" fill="none" stroke="rgba(99, 102, 241, 0.15)" strokeWidth="1" strokeDasharray="4 4" />
                {/* Orbiting particle nodes */}
                <circle cx="50" cy="10" r="4" fill="#6366f1" className="shadow-[0_0_12px_#6366f1]" />
                <circle cx="90" cy="50" r="3" fill="#10b981" />
                <circle cx="50" cy="90" r="4" fill="#6366f1" />
                <circle cx="10" cy="50" r="3.5" fill="#a78bfa" />
              </svg>
            </motion.div>

            <motion.div 
              animate={{ rotate: -360 }}
              transition={{ repeat: Infinity, duration: 8, ease: "linear" }}
              className="absolute w-24 h-24"
            >
              <svg className="w-full h-full" viewBox="0 0 100 100">
                <circle cx="50" cy="50" r="30" fill="none" stroke="rgba(16, 185, 129, 0.15)" strokeWidth="1" />
                <circle cx="50" cy="20" r="3" fill="#10b981" />
                <circle cx="20" cy="50" r="3" fill="#6366f1" />
              </svg>
            </motion.div>

            {/* Glowing inner core logo */}
            <motion.div 
              animate={{ scale: [0.95, 1.08, 0.95] }}
              transition={{ repeat: Infinity, duration: 2.2, ease: "easeInOut" }}
              className="w-16 h-16 rounded-2xl bg-gradient-to-tr from-indigo-600 to-indigo-500 border border-indigo-400/30 flex items-center justify-center shadow-[0_0_35px_rgba(99,102,241,0.4)]"
            >
              <Sparkles className="w-8 h-8 text-white" />
            </motion.div>
          </div>

          <div className="space-y-3">
            <motion.h1 
              initial={{ opacity: 0, y: 15 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.3, duration: 0.8 }}
              className="text-3xl font-extrabold text-white tracking-tight"
            >
              Study Genius
            </motion.h1>
            <motion.p 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.7, duration: 0.8 }}
              className="text-xs font-mono text-slate-400 tracking-wider uppercase"
            >
              Resolving Synapses • Initializing Core
            </motion.p>
          </div>

          {/* Micro loading bar */}
          <div className="w-48 h-1 bg-slate-950 rounded-full overflow-hidden border border-slate-900/40">
            <motion.div 
              initial={{ width: 0 }}
              animate={{ width: "100%" }}
              transition={{ duration: 2.3, ease: "easeInOut" }}
              className="h-full bg-gradient-to-r from-indigo-505 via-indigo-500 to-emerald-400"
            />
          </div>
        </div>
      </div>
    );
  }

  // slides configuration
  const slides = [
    {
      title: "Automated Ingestion & Synthesis",
      description: "Upload academic materials through multiple ingestion channels coupled directly to Gemini reasoning. Standardize lecture notes, transcribe audio, or structure concepts instantly.",
      icon: <BookOpen className="w-8 h-8 text-indigo-400" />,
      color: "from-indigo-500/10 to-transparent",
      visual: (
        <div className="relative w-full h-44 bg-slate-950/60 border border-slate-900 rounded-3xl overflow-hidden flex items-center justify-center">
          {/* File input and network graph */}
          <div className="absolute inset-x-4 top-4 flex items-center justify-between">
            <span className="text-[10px] font-mono text-slate-500 uppercase">Input Node: Transcript.txt</span>
            <span className="bg-indigo-500/10 text-indigo-400 border border-indigo-500/20 px-2 py-0.5 rounded text-[8px] font-bold">GEMINI PROCESSING</span>
          </div>

          {/* Connecting Synapse Vector */}
          <svg className="w-4/5 h-20" viewBox="0 0 300 100">
            {/* Connection lines */}
            <path d="M 30,50 Q 85,15 140,50" fill="none" stroke="rgba(163, 191, 250, 0.15)" strokeWidth="1.5" strokeDasharray="4 4" />
            <path d="M 30,50 Q 85,85 140,50" fill="none" stroke="rgba(163, 191, 250, 0.15)" strokeWidth="1.5" strokeDasharray="4 4" />
            <path d="M 140,50 H 260" fill="none" stroke="rgba(16, 185, 129, 0.2)" strokeWidth="2" />

            {/* Ingestion particles flowing */}
            <motion.circle 
              r="4" 
              fill="#6366f1" 
              animate={{ cx: [30, 140], cy: [50, 50] }}
              transition={{ repeat: Infinity, duration: 1.8, ease: "easeInOut" }}
            />
            <motion.circle 
              r="3" 
              fill="#10b981" 
              animate={{ cx: [140, 260] }}
              transition={{ repeat: Infinity, duration: 1.4, ease: "linear" }}
            />

            {/* Key Nodes */}
            <circle cx="30" cy="50" r="12" fill="#0b0f19" stroke="#312e81" strokeWidth="2" />
            <circle cx="140" cy="50" r="16" fill="#1e1b4b" stroke="#6366f1" strokeWidth="2" />
            <circle cx="260" cy="50" r="12" fill="#061f14" stroke="#10b981" strokeWidth="2" />

            {/* Node Logos */}
            <path d="M 27,47 H 33 M 28,50 H 32 M 27,53 H 31" stroke="#4f46e5" strokeWidth="1.5" />
            <circle cx="140" cy="50" r="4" fill="#ffffff" />
            <path d="M 257,47 L 263,53 M 263,47 L 257,53" stroke="#10b981" strokeWidth="1.5" />
          </svg>

          <div className="absolute bottom-4 text-center">
            <span className="text-[10.5px] font-bold text-slate-300">Extract chapter guides & glossary decks automatically</span>
          </div>
        </div>
      )
    },
    {
      title: "Active Recall Glossary Carousel",
      description: "Master vocabulary using intuitive flashcard mechanics. Flip cards to reveal detailed definitions, and use swipe-friendly gestures optimized for mobile screen testing.",
      icon: <Layers className="w-8 h-8 text-emerald-400" />,
      color: "from-emerald-500/10 to-transparent",
      visual: (
        <div className="relative w-full h-44 bg-slate-950/60 border border-slate-900 rounded-3xl overflow-hidden flex items-center justify-center">
          <div className="absolute inset-x-4 top-4 flex items-center justify-between">
            <span className="text-[10px] font-mono text-slate-500 uppercase">Flashcard Module</span>
            <span className="text-[9px] text-emerald-400 font-bold bg-emerald-500/10 border border-emerald-500/20 px-2 py-0.5 rounded">SWIPE READY</span>
          </div>

          {/* Mock Flashcard animation */}
          <motion.div 
            animate={{ 
              x: [-40, 40, -40],
              rotate: [-5, 5, -5]
            }}
            transition={{ repeat: Infinity, duration: 4, ease: "easeInOut" }}
            className="w-36 h-24 rounded-2xl bg-[#0e1222] border-2 border-indigo-900/40 p-4 flex flex-col items-center justify-center shadow-2xl relative select-none"
          >
            <div className="absolute top-2 left-2 text-[8px] font-mono text-indigo-400">TERM INDEX 04</div>
            <span className="text-xs font-extrabold text-white text-center">Superposition</span>
            <span className="text-[9px] text-slate-400 mt-2 border border-slate-800 rounded px-1.5 py-0.5 uppercase bg-slate-950 font-bold">Click to Flip</span>
          </motion.div>

          <div className="absolute inset-y-0 w-full flex items-center justify-between px-6 pointer-events-none">
            <span className="text-slate-600 font-bold text-base">← SWIPE</span>
            <span className="text-slate-600 font-bold text-base">SWIPE →</span>
          </div>
        </div>
      )
    },
    {
      title: "Diagnostic Quizzes & Leaderboards",
      description: "Test yourself with dynamic multi-choice diagnostic quizzes generated straight from your syllabus. Collect XP points, protect your daily streaks, and sync to Firestore.",
      icon: <Trophy className="w-8 h-8 text-violet-400" />,
      color: "from-violet-500/10 to-transparent",
      visual: (
        <div className="relative w-full h-44 bg-slate-950/60 border border-slate-900 rounded-3xl overflow-hidden flex items-center justify-center">
          {/* Diagnostic Quiz Mock */}
          <div className="scale-90 font-sans space-y-2.5 w-4/5 text-left">
            <div className="text-[10px] font-extrabold text-indigo-400 tracking-wide uppercase">CONCEPT DIAGNOSTIC</div>
            <div className="text-xs font-extrabold text-white leading-tight">What collapses the superposition state vector?</div>
            <div className="grid grid-cols-2 gap-2">
              <div className="bg-emerald-500/10 border border-emerald-500/35 px-2 py-1.5 rounded-lg text-[10px] text-emerald-400 font-semibold flex items-center justify-between">
                <span>Active Measurement</span>
                <Check className="w-3 h-3 text-emerald-400" />
              </div>
              <div className="bg-slate-900/40 border border-slate-800 px-2 py-1.5 rounded-lg text-[10px] text-slate-500 font-medium">
                Thermal leak
              </div>
            </div>
          </div>
        </div>
      )
    }
  ];

  return (
    <div 
      id="onboarding-carousel-view"
      className="fixed inset-0 z-50 bg-[#070913] flex items-center justify-center p-4 md:p-6 overflow-y-auto select-none"
    >
      {/* Background decorations */}
      <div className="absolute top-0 inset-x-0 h-96 bg-gradient-to-b from-indigo-950/15 to-transparent pointer-events-none" />
      
      <div className="bg-[#0b0e1b] border border-slate-850/65 w-full max-w-2xl rounded-3xl shadow-[0_20px_60px_rgba(0,0,0,0.8)] p-6 md:p-8 relative space-y-6 flex flex-col justify-between my-auto">
        
        {/* Top bar */}
        <div className="flex items-center justify-between border-b border-indigo-950/45 pb-3">
          <div className="flex items-center gap-1.5">
            <div className="w-5 h-5 rounded bg-indigo-500/10 flex items-center justify-center border border-indigo-500/25">
              <Sparkles className="w-3 h-3 text-indigo-400 animate-pulse" />
            </div>
            <span className="text-xs font-mono font-extrabold text-slate-400 uppercase tracking-widest">Study Genius Co-Pilot</span>
          </div>

          <button 
            onClick={handleSkip}
            className="text-xs font-semibold text-slate-500 hover:text-white cursor-pointer transition-colors"
          >
            Skip Intro
          </button>
        </div>

        {/* Dynamic slide carousel content with Motion */}
        <AnimatePresence mode="wait">
          <motion.div
            key={currentSlide}
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
            transition={{ duration: 0.3 }}
            className="space-y-6"
          >
            {/* Slide Visual Mock */}
            {slides[currentSlide].visual}

            <div className="space-y-3">
              <div className="flex items-center gap-2.5">
                <div className="p-2 rounded-xl bg-slate-900 border border-slate-800 flex items-center justify-center">
                  {slides[currentSlide].icon}
                </div>
                <h3 className="text-lg md:text-xl font-extrabold text-white tracking-tight">
                  {slides[currentSlide].title}
                </h3>
              </div>

              <p className="text-slate-400 text-xs md:text-sm leading-relaxed">
                {slides[currentSlide].description}
              </p>
            </div>
          </motion.div>
        </AnimatePresence>

        {/* Indicators & Navigation */}
        <div className="flex flex-col sm:flex-row items-center justify-between pt-4 gap-4 border-t border-slate-900">
          {/* Index Dots */}
          <div className="flex items-center gap-1.5">
            {slides.map((_, idx) => (
              <button
                key={idx}
                onClick={() => setCurrentSlide(idx)}
                className={`h-1.5 rounded-full transition-all duration-300 ${currentSlide === idx ? 'w-6 bg-indigo-500' : 'w-1.5 bg-slate-800'}`}
              />
            ))}
          </div>

          {/* Action buttons */}
          <div className="flex items-center gap-2.5 w-full sm:w-auto justify-end">
            {currentSlide < slides.length - 1 ? (
              <button
                onClick={() => setCurrentSlide(prev => prev + 1)}
                className="w-full sm:w-auto bg-slate-900 hover:bg-slate-850 text-white font-extrabold text-xs px-4 py-2.5 rounded-xl border border-slate-800 hover:border-slate-700 flex items-center justify-center gap-1.5 cursor-pointer transition-all shadow-md"
              >
                <span>Continue</span>
                <ChevronRight className="w-4 h-4 text-slate-400" />
              </button>
            ) : (
              <div className="flex flex-col gap-3 w-full sm:w-80">
                {/* One-click Secure Google OAuth Auth */}
                <button
                  onClick={handleGoogleSignInOnboarding}
                  disabled={oauthLoading}
                  className="w-full bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-xs px-4 py-3 rounded-xl flex items-center justify-center gap-2 cursor-pointer transition-all shadow-lg active:scale-98"
                >
                  <svg className="w-4 h-4" viewBox="0 0 24 24" fill="currentColor">
                    <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#ffffff" />
                    <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#ffffff" />
                    <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z" fill="#ffffff" />
                    <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z" fill="#ffffff" />
                  </svg>
                  <span>{oauthLoading ? 'Authorizing Secure Auth...' : 'Sign in with Google OAuth'}</span>
                </button>

                {oauthError && (
                  <p className="text-[10px] text-red-400 font-semibold text-center leading-normal">
                    {oauthError}
                  </p>
                )}

                <button
                  onClick={handleSkip}
                  className="w-full bg-slate-950 hover:bg-slate-900 border border-slate-850 hover:border-slate-800 text-slate-350 hover:text-white font-extrabold text-xs py-2 rounded-xl cursor-pointer transition-all"
                >
                  Enter as Guest (Skip Auth)
                </button>
              </div>
            )}
          </div>
        </div>

        {/* Interactive Secure System & Firestore documentation toggle */}
        <div className="bg-slate-950/80 border border-slate-900 rounded-2xl p-4 space-y-2">
          <button 
            type="button"
            onClick={() => setShowSecurityDocs(!showSecurityDocs)}
            className="flex items-center justify-between w-full text-slate-400 hover:text-white text-xs font-semibold cursor-pointer"
          >
            <span className="flex items-center gap-1.5 text-[10.5px]">
              <HelpCircle className="w-3.5 h-3.5 text-indigo-400" />
              Security Specifications & Course Sync Architecture
            </span>
            <span className="text-[10px] text-indigo-500 font-bold underline">
              {showSecurityDocs ? 'Hide info' : 'View specifications'}
            </span>
          </button>

          {showSecurityDocs && (
            <div className="text-[10px] text-slate-400 leading-relaxed font-medium pt-2 max-h-40 overflow-y-auto space-y-2 border-t border-slate-900 select-text">
              <p>
                <strong>1. Encrypted Storage Instances:</strong> All course summary guides, chapters, flashcards, and leaderboard achievements are securely compartmentalized using Firestore Enterprise databases. Documents are uniquely indexed by cryptographically signed Authentication IDs.
              </p>
              <div className="flex items-start gap-1.5 p-1.5 bg-[#0a101f] border border-indigo-950/40 rounded-lg">
                <ShieldCheck className="w-4 h-4 text-emerald-400 flex-shrink-0" />
                <p>
                  <strong>Zero-Trust Access (ABAC):</strong> Access is locked via <code className="bg-slate-950 text-indigo-300 px-1 rounded">firestore.rules</code> schemas. No user can access or write to summaries belonging to another student ID under any circumstances.
                </p>
              </div>
              <p>
                <strong>2. Google OAuth Integration:</strong> Google OAuth popup connects your official student profile to our secure servers. No client secrets are stored on-browser.
              </p>
              <p>
                <strong>3. Automatic Sync Fallback:</strong> If you proceed without Google/Email auth (Guest Sandbox), all data falls back to standard client-side secure index pools in your browser. Restricting cache flushes preserves your streak.
              </p>
            </div>
          )}
        </div>

      </div>
    </div>
  );
}
