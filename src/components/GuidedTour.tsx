import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Sparkles, HelpCircle, ArrowRight, ArrowLeft, X, CheckSquare } from 'lucide-react';

export interface TourStep {
  targetId: string;
  title: string;
  description: string;
  placement: 'bottom' | 'top' | 'left' | 'right';
}

interface GuidedTourProps {
  onTourClose: () => void;
  isActive: boolean;
}

const TOUR_STEPS: TourStep[] = [
  {
    targetId: 'student-streak-badge',
    title: 'Streak & Gamification Stats',
    description: 'Track your daily streaks and XP index points continuously. Synchronize your scores onto the live active Leaderboard to rank up!',
    placement: 'bottom'
  },
  {
    targetId: 'course-deck-selector',
    title: 'Subject Hub Deck Selector',
    description: 'Switch between loaded academic courses or type a custom lecture series name to scaffold a brand-new syllabus workspace.',
    placement: 'bottom'
  },
  {
    targetId: 'summarizer-intake-upload',
    title: 'AI Lecture Ingestion Portal',
    description: 'Upload audio transcripts, textbook content, web references, or syllabus outlines. Gemini reasoning transforms raw assets into structured study cards.',
    placement: 'top'
  },
  {
    targetId: 'assignments-solver-panel',
    title: 'Mathematical & Abstract Homework Solver',
    description: 'Insert algebraic systems, theoretical exercises, or quiz questions to instantly generate thorough step-by-step verified solve guides.',
    placement: 'top'
  },
  {
    targetId: 'flashcard-swipe-glossary',
    title: 'Active Recall Glossary',
    description: 'Interact with the Swipe Glossary! Swipe left or right on mobile viewports, or click navigation keys to test your memory limits.',
    placement: 'top'
  }
];

export function GuidedTour({ onTourClose, isActive }: GuidedTourProps) {
  const [currentStepIdx, setCurrentStepIdx] = useState(0);
  const [highlightCoords, setHighlightCoords] = useState<{ top: number; left: number; width: number; height: number } | null>(null);
  const resizeTimeoutRef = useRef<number | null>(null);

  const activeStep = TOUR_STEPS[currentStepIdx];

  // Recalculate target position
  const updateHighlightCoords = () => {
    if (!isActive || !activeStep) return;
    const targetElement = document.getElementById(activeStep.targetId);
    if (targetElement) {
      // Auto scroll target into view safely
      targetElement.scrollIntoView({ behavior: 'smooth', block: 'center' });
      
      // Calculate coordinates with 8px buffer spacing
      const rect = targetElement.getBoundingClientRect();
      setHighlightCoords({
        top: rect.top + window.scrollY - 8,
        left: rect.left + window.scrollX - 8,
        width: rect.width + 16,
        height: rect.height + 16
      });
    } else {
      setHighlightCoords(null);
    }
  };

  useEffect(() => {
    if (isActive) {
      // Slight delay to ensure layout has shifted/settled
      const timer = setTimeout(updateHighlightCoords, 200);
      return () => clearTimeout(timer);
    }
  }, [currentStepIdx, isActive]);

  // Handle Resize and Scroll events to keep spotlight aligned
  useEffect(() => {
    if (!isActive) return;

    const handleUpdate = () => {
      if (resizeTimeoutRef.current) {
        window.cancelAnimationFrame(resizeTimeoutRef.current);
      }
      resizeTimeoutRef.current = window.requestAnimationFrame(() => {
        updateHighlightCoords();
      });
    };

    window.addEventListener('resize', handleUpdate);
    window.addEventListener('scroll', handleUpdate, true);

    return () => {
      window.removeEventListener('resize', handleUpdate);
      window.removeEventListener('scroll', handleUpdate, true);
      if (resizeTimeoutRef.current) {
        window.cancelAnimationFrame(resizeTimeoutRef.current);
      }
    };
  }, [currentStepIdx, isActive]);

  if (!isActive || !highlightCoords) return null;

  const handleNext = () => {
    if (currentStepIdx < TOUR_STEPS.length - 1) {
      setCurrentStepIdx(prev => prev + 1);
    } else {
      localStorage.setItem('sg_tour_completed', 'true');
      onTourClose();
    }
  };

  const handleBack = () => {
    if (currentStepIdx > 0) {
      setCurrentStepIdx(prev => prev - 1);
    }
  };

  const handleSkip = () => {
    localStorage.setItem('sg_tour_completed', 'true');
    onTourClose();
  };

  return (
    <div 
      id="guided-tour-overlay"
      className="fixed inset-0 z-40 pointer-events-none select-none font-sans"
    >
      {/* Semi-transparent custom spotlight mask */}
      <div 
        className="absolute inset-0 bg-black/75 pointer-events-auto transition-opacity duration-300"
        style={{
          clipPath: `polygon(
            0% 0%, 
            0% 100%, 
            ${highlightCoords.left}px 100%, 
            ${highlightCoords.left}px ${highlightCoords.top}px, 
            ${highlightCoords.left + highlightCoords.width}px ${highlightCoords.top}px, 
            ${highlightCoords.left + highlightCoords.width}px ${highlightCoords.top + highlightCoords.height}px, 
            ${highlightCoords.left}px ${highlightCoords.top + highlightCoords.height}px, 
            ${highlightCoords.left}px 100%, 
            100% 100%, 
            100% 0%
          )`
        }}
        onClick={handleSkip} // Clicking backdrop skips safely
      />

      {/* Floating Spotlight Border Accent */}
      <div 
        className="absolute border border-indigo-400/80 rounded-2xl shadow-[0_0_20px_rgba(99,102,241,0.5)] transition-all duration-300"
        style={{
          top: highlightCoords.top,
          left: highlightCoords.left,
          width: highlightCoords.width,
          height: highlightCoords.height
        }}
      />

      {/* Interactive Tooltip Card */}
      <div 
        className="absolute pointer-events-auto w-80 max-w-sm transition-all duration-300 z-50"
        style={{
          top: activeStep.placement === 'bottom' 
            ? highlightCoords.top + highlightCoords.height + 16 
            : activeStep.placement === 'top' 
              ? highlightCoords.top - 200 - 16
              : highlightCoords.top,
          left: Math.max(16, Math.min(window.innerWidth - 336, highlightCoords.left + (highlightCoords.width / 2) - 160))
        }}
      >
        <motion.div 
          initial={{ opacity: 0, y: 12, scale: 0.95 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          transition={{ duration: 0.25 }}
          className="bg-[#0e1224] border-2 border-indigo-505/50 border-indigo-500 rounded-2xl p-5 shadow-[0_15px_40px_rgba(0,0,0,0.9)] space-y-4"
        >
          {/* Header */}
          <div className="flex items-center justify-between pb-1.5 border-b border-indigo-950/40">
            <div className="flex items-center gap-1.5 text-indigo-400">
              <Sparkles className="w-3.5 h-3.5 text-indigo-400 animate-pulse" />
              <span className="text-[10px] font-mono font-extrabold uppercase tracking-widest">Co-Pilot Guide</span>
            </div>
            <button 
              onClick={handleSkip}
              className="text-slate-500 hover:text-white transition-colors cursor-pointer"
              title="Close Tour"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </div>

          {/* Content */}
          <div className="space-y-2.5">
            <h4 className="text-sm font-extrabold text-white leading-snug">
              {activeStep.title}
            </h4>
            <p className="text-xs text-slate-350 leading-relaxed font-medium select-text">
              {activeStep.description}
            </p>
          </div>

          {/* Controls */}
          <div className="flex items-center justify-between pt-1 flex-row">
            <span className="text-[9.5px] text-slate-550 font-mono text-slate-400">
              Step {currentStepIdx + 1} of {TOUR_STEPS.length}
            </span>

            <div className="flex items-center gap-2">
              {currentStepIdx > 0 && (
                <button
                  type="button"
                  onClick={handleBack}
                  className="bg-slate-950 hover:bg-slate-900 text-slate-300 px-2.5 py-1.5 rounded-lg text-[10.5px] font-bold border border-slate-850 flex items-center gap-1 cursor-pointer transition-all"
                >
                  <ArrowLeft className="w-3 h-3" />
                  <span>Back</span>
                </button>
              )}

              <button
                type="button"
                onClick={handleNext}
                className="bg-indigo-600 hover:bg-indigo-500 text-white px-3 py-1.5 rounded-lg text-[10.5px] font-bold flex items-center gap-1 cursor-pointer transition-all shadow-md"
              >
                <span>{currentStepIdx === TOUR_STEPS.length - 1 ? 'Finish' : 'Next'}</span>
                {currentStepIdx === TOUR_STEPS.length - 1 ? (
                  <CheckSquare className="w-3 H-3 text-indigo-200" />
                ) : (
                  <ArrowRight className="w-3 h-3" />
                )}
              </button>
            </div>
          </div>
        </motion.div>
      </div>

    </div>
  );
}
