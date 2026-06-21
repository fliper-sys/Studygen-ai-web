import React, { useState, useEffect, useRef } from 'react';
import { auth, db } from './firebase';
import { onAuthStateChanged, User as FBUser } from 'firebase/auth';
import { doc, getDoc, setDoc, deleteDoc, updateDoc, collection, onSnapshot, collectionGroup } from 'firebase/firestore';
import { AuthWidget } from './components/AuthWidget';
import {
  BookOpen,
  GraduationCap,
  Sparkles,
  Brain,
  LayoutDashboard,
  FileText,
  Send,
  Trash2,
  Plus,
  Award,
  Zap,
  RotateCw,
  Clock,
  ChevronRight,
  ChevronLeft,
  User,
  Bot,
  CheckCircle2,
  XCircle,
  X,
  Target,
  FileUp,
  Link2,
  HelpCircle,
  Lightbulb,
  Check,
  ListTodo,
  Menu,
  Trophy,
  Medal,
  Bell,
  Grid,
  Layers,
  MessageSquare,
  Users
} from 'lucide-react';

// Type Declarations
interface Chapter {
  title: string;
  outline: string[];
  takeaways: string;
}

interface Flashcard {
  term: string;
  definition: string;
  example: string;
}

interface QuizQuestion {
  question: string;
  options: string[];
  correctIndex: number;
  explanation: string;
}

interface Summary {
  title: string;
  summaryText: string;
  chapters: Chapter[];
  flashcards: Flashcard[];
  quiz: QuizQuestion[];
}

interface Assignment {
  id: string;
  courseName: string;
  title: string;
  questions: string;
  solution: string;
  style: string;
  createdAt: string;
}

interface QuizHistoryRecord {
  id: string;
  courseName: string;
  quizTitle: string;
  score: number;
  total: number;
  date: string;
}

interface Goal {
  id: string;
  text: string;
  completed: boolean;
}

interface LeaderboardEntry {
  email: string;
  totalScore: number;
  totalQuizQuestions: number;
  quizzesPlayed: number;
  streak: number;
}

// Inline formatting custom parser for simple markdown formulas
function parseInlineFormatting(text: string) {
  if (!text) return '';
  const cleanHtml = text
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/\*\*([^*]+)\*\*/g, '<strong class="text-white font-semibold">$1</strong>')
    .replace(/\*([^*]+)\*/g, '<em class="text-indigo-200">$1</em>')
    .replace(/`([^`]+)`/g, '<code class="bg-[#1A2333]/90 px-1.5 py-0.5 rounded text-indigo-300 font-mono text-sm border border-slate-800">$1</code>')
    .replace(/\$\$([^$]+)\$\$/g, '<div class="my-2 p-2.5 bg-slate-950 border border-indigo-950/30 rounded-lg text-emerald-400 font-mono text-center overflow-x-auto text-sm">$1</div>')
    .replace(/\$([^$]+)\$/g, '<code class="bg-emerald-950/40 text-emerald-400 px-1.5 py-0.5 rounded font-mono text-xs">$1</code>');

  return <span dangerouslySetInnerHTML={{ __html: cleanHtml }} />;
}

// Lightweight, custom Markdown renderer for Homework Solution Guides
function renderMarkdown(md: string) {
  if (!md) return null;
  const sections = md.split('```');
  return (
    <div className="space-y-3">
      {sections.map((section, idx) => {
        if (idx % 2 === 1) {
          const lines = section.split('\n');
          const language = lines[0]?.trim() || 'code';
          const codeContent = lines.slice(1).join('\n').trim();
          return (
            <div key={idx} className="rounded-lg overflow-hidden border border-slate-800 bg-slate-950 my-3 font-mono">
              <div className="bg-slate-900 px-3 py-1.5 text-[11px] text-slate-400 flex justify-between items-center border-b border-slate-800">
                <span>{language.toUpperCase()} DOCUMENT</span>
                <span className="text-[9px] bg-slate-800 text-indigo-400 px-1.5 py-0.5 rounded">ACTIVE SYNTAX</span>
              </div>
              <pre className="p-3 text-xs text-slate-300 overflow-x-auto leading-relaxed">
                <code>{codeContent}</code>
              </pre>
            </div>
          );
        }

        const lines = section.split('\n');
        const renderedLines: React.ReactNode[] = [];
        let listItems: string[] = [];

        const flushList = (key: number) => {
          if (listItems.length > 0) {
            renderedLines.push(
              <ul key={`list-${key}`} className="list-disc pl-5 space-y-1 my-2 text-slate-350">
                {listItems.map((item, lIdx) => (
                  <li key={lIdx} className="leading-relaxed text-sm">{parseInlineFormatting(item)}</li>
                ))}
              </ul>
            );
            listItems = [];
          }
        };

        for (let i = 0; i < lines.length; i++) {
          const line = lines[i];
          if (line.startsWith('- ') || line.startsWith('* ')) {
            listItems.push(line.substring(2));
          } else {
            flushList(i);
            if (line.startsWith('# ')) {
              renderedLines.push(<h1 key={i} className="text-xl font-extrabold text-white mt-5 mb-3 border-b border-slate-800 pb-1.5 flex items-center gap-2"><Sparkles className="w-4 h-4 text-violet-400 inline"/> {line.substring(2)}</h1>);
            } else if (line.startsWith('## ')) {
              renderedLines.push(<h2 key={i} className="text-lg font-bold text-white mt-4 mb-2 border-l-4 border-violet-500 pl-2.5">{line.substring(3)}</h2>);
            } else if (line.startsWith('### ')) {
              renderedLines.push(<h3 key={i} className="text-md font-semibold text-indigo-400 mt-3 mb-1.5">{line.substring(4)}</h3>);
            } else if (line.trim()) {
              renderedLines.push(<p key={i} className="text-slate-300 leading-relaxed text-sm my-2">{parseInlineFormatting(line)}</p>);
            } else {
              renderedLines.push(<div key={i} className="h-1" />);
            }
          }
        }
        flushList(999);
        return <div key={idx}>{renderedLines}</div>;
      })}
    </div>
  );
}

// -------------------------------------------------------------
// DEFAULT PRELOADED ACADEMIC DATASETS (For seamless initial load)
// -------------------------------------------------------------
const DEFAULT_COURSES = ['Computer Science', 'Biochemistry', 'Calculus'];

const DEFAULT_SUMMARIES: Record<string, Summary> = {
  'Computer Science': {
    title: 'Study Guide: Introduction to Algorithmic Complexity',
    summaryText: 'This study summary breaks down time and space complexity paradigms using asymptotic bounds. Standard notation models are described alongside divide-and-conquer recurrences to enable robust logic design.',
    chapters: [
      {
        title: 'Chapter 1: Asymptotic Complexity & Big O',
        outline: [
          'Measures relative execution growth rates in contrast to actual hardware running time bounds.',
          'Considers the absolute input growth size limit $N$ approaching infinity.',
          'Focuses primarily on average-case and worst-case performance limits.'
        ],
        takeaways: 'Always prioritize reducing complexity bounds from quadratic $O(N^2)$ to logarithmic $O(N \\log N)$ limits for scalable architecture.'
      },
      {
        title: 'Chapter 2: Divide and Conquer Bounds',
        outline: [
          'Divides complex goals into similar, decoupled sub-problems to resolve recursively.',
          'Recursive combiners are formulated using structural Recurrence Relations: $T(n) = 2T(n/2) + O(n)$.',
          'Standard paradigms include Merge Sort, Binary Searches, and Quick Sort.'
        ],
        takeaways: 'Logarithmic growth factors are created directly through iterative state-space partitioning.'
      }
    ],
    flashcards: [
      {
        term: 'Asymptotic Growth Rate',
        definition: 'The mathematical rendering of performance metrics as input size parameter lengths grow towards infinity.',
        example: 'Merge Sort scales with O(N log N) which represents its asymptotic threshold.'
      },
      {
        term: 'Recurrence Relation',
        definition: 'An analytical equation expressing recursive running time delays in algorithms.',
        example: 'Binary search features T(N) = T(N/2) + O(1), leading to logarithm bounds.'
      },
      {
        term: 'Big O Bounds',
        definition: 'Characterizes an absolute upper bound on mathematical execution metrics.',
        example: 'Searching a randomized linked list has a worst-case bound of O(N).'
      }
    ],
    quiz: [
      {
        question: 'Which algorithmic paradigm scales with T(N) = 2T(N/2) + O(N)?',
        options: ['Binary Search', 'Universal Dynamic Programming', 'Standard Merge Sort', 'Iterative Bubble Sort'],
        correctIndex: 2,
        explanation: 'Merge Sort splits inputs into halves (2T(N/2)) and recombines the blocks linearly (O(N)).'
      },
      {
        question: 'What is the worst-case complexity space bounds associated with Merge Sort?',
        options: ['O(1)', 'O(log N)', 'O(N)', 'O(N^2)'],
        correctIndex: 2,
        explanation: 'Merge sort requires a copy of the input arrays at runtime, making space requirements scale linearly as O(N).'
      }
    ]
  },
  'Biochemistry': {
    title: 'Study Guide: Adenosine Triphosphate Synthesis',
    summaryText: 'An introductory lecture summary regarding metabolic respiration loops, electron carriers, and chemiosmosis pathways across complex cellular boundaries.',
    chapters: [
      {
        title: 'Chapter 1: Electron Transport Chain Complexes',
        outline: [
          'Active electron transfer cascades trigger vital proton gradients across lipid layers.',
          'Key donor species NADH and FADH2 fuel redox-coupled enzyme complexes directly.',
          'Terminal acceptors involve elemental Oxygen, which recombines to generate H2O.'
        ],
        takeaways: 'Electron flux gradients are directly coupled to structural thermodynamic proton-motive pumps.'
      }
    ],
    flashcards: [
      {
        term: 'Proton-Motive Force',
        definition: 'The spatial electrochemical potential gradient established by standard hydrogen proton distributions across membranes.',
        example: 'Matrix potentials drive kinetic ATP turbine loops.'
      }
    ],
    quiz: [
      {
        question: 'Which component functions as the primary kinetic turbine generator for ATP cellular synthesis?',
        options: ['NADH Redox Dehydrogenase', 'Mitochondrial ATP Synthase', 'Coenzyme Q Cytochrome Carrier', 'Citric Acid Synthesizer'],
        correctIndex: 1,
        explanation: 'ATP Synthase operates as a kinetic turbine driven by gradient potential differentials.'
      }
    ]
  }
};

const DEMO_TRANSCRIPT = `LECTURE NOTES: INTRODUCTION TO QUANTUM PHYSICS
Professor Evans: Let's discuss basic quantum mechanics. Standard classical physics breaks down when handling microscopic states.
Instead, physical entities demonstrate Wave-Particle Duality. A photon acts as both a distinct wave and a discrete particle packet (quanta).
Key conceptual pillars:
1. Heisenberg Uncertainty Principle: The position and momentum of subatomic particles cannot be simultaneously determined with precise threshold boundaries.
Equation: $\\Delta x \\cdot \\Delta p \\ge \\frac{\\hbar}{2}$.
2. Superposition Principle: Wave functions exist in multiple potential outcome states at once. Only active observational measurements collapse the state space.
3. Quantum Tunneling: Particles breach structural energy barriers they classically would not possess the thermal energy to overcome, thanks to statistical wave distribution leaks.`;

export default function App() {
  // Authentication State
  const [currentUser, setCurrentUser] = useState<FBUser | null>(null);

  // Navigation State
  const [activeTab, setActiveTab] = useState<'dashboard' | 'summarizer' | 'homework' | 'quiz' | 'flashcards'>('dashboard');
  const [activeNavTab, setActiveNavTab] = useState<'explore' | 'chat' | 'workspace' | 'profile'>('explore');
  
  // Persisted Database States
  const [courses, setCourses] = useState<string[]>([]);
  const [activeCourse, setActiveCourse] = useState<string>('');
  const [summaries, setSummaries] = useState<Record<string, Summary>>({});
  const [assignments, setAssignments] = useState<Assignment[]>([]);
  const [quizHistory, setQuizHistory] = useState<QuizHistoryRecord[]>([]);
  const [studentStreak, setStudentStreak] = useState<number>(3);
  const [goals, setGoals] = useState<Goal[]>([]);

  // Global Quiz Leaderboard State
  const [leaderboard, setLeaderboard] = useState<LeaderboardEntry[]>([]);
  const [isLeaderboardLoading, setIsLeaderboardLoading] = useState(false);

  // UI Interactive States
  const [newCourseName, setNewCourseName] = useState('');
  const [newGoalText, setNewGoalText] = useState('');
  const [isApiKeyWarningOpen, setIsApiKeyWarningOpen] = useState(false);

  // 1. Summarizer Intake State
  const [summaryInputType, setSummaryInputType] = useState<'paste' | 'file' | 'url'>('paste');
  const [pastedText, setPastedText] = useState('');
  const [lectureUrl, setLectureUrl] = useState('');
  const [uploadedFileName, setUploadedFileName] = useState('');
  const [uploadedFileContent, setUploadedFileContent] = useState('');
  const [isSummarizing, setIsSummarizing] = useState(false);
  const [summarizerError, setSummarizerError] = useState('');

  // 2. Homework Solver State
  const [assignmentTitle, setAssignmentTitle] = useState('');
  const [assignmentQuestions, setAssignmentQuestions] = useState('');
  const [assignmentStyle, setAssignmentStyle] = useState<'reasoner' | 'math' | 'code' | 'outline'>('reasoner');
  const [isSolving, setIsSolving] = useState(false);
  const [solvingStage, setSolvingStage] = useState('');
  const [currentSolution, setCurrentSolution] = useState('');
  const [solverError, setSolverError] = useState('');

  // 3. Quiz State
  const [activeQuizQuestions, setActiveQuizQuestions] = useState<QuizQuestion[]>([]);
  const [currentQuizIndex, setCurrentQuizIndex] = useState(0);
  const [selectedQuizOption, setSelectedQuizOption] = useState<number | null>(null);
  const [quizScore, setQuizScore] = useState(0);
  const [quizSubmitted, setQuizSubmitted] = useState(false);
  const [quizCompleted, setQuizCompleted] = useState(false);

  // 4. Flashcard Carousel State
  const [currentFlashcardIndex, setCurrentFlashcardIndex] = useState(0);
  const [isFlashcardFlipped, setIsFlashcardFlipped] = useState(false);
  const [swipeOffset, setSwipeOffset] = useState(0);
  const touchStartX = useRef<number | null>(null);
  const touchStartY = useRef<number | null>(null);
  const hasSwiped = useRef(false);

  // 5. Always-Available Study Companion Chat State
  const [isChatOpen, setIsChatOpen] = useState(false);
  const [chatMessage, setChatMessage] = useState('');
  const [chatHistory, setChatHistory] = useState<Array<{ role: 'user' | 'assistant', parts: Array<{ text: string }> }>>([
    {
      role: 'assistant',
      parts: [{ text: "Hello! I am your **Study Genius Companion**. I am ready to guide you through your courses, analyze summaries, or review assignment logic with you! Go ahead and ask me a question." }]
    }
  ]);
  const [isGeneratingChat, setIsGeneratingChat] = useState(false);
  const chatBottomRef = useRef<HTMLDivElement>(null);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  // -------------------------------------------------------------
  // PERSISTENCE ENGINE (Firebase Auth State changed & Firestore Sync with LocalStorage Fallback)
  // -------------------------------------------------------------
  useEffect(() => {
    let unsubscribeUser: (() => void) | null = null;
    let unsubscribeGoals: (() => void) | null = null;
    let unsubscribeAssignments: (() => void) | null = null;
    let unsubscribeSummaries: (() => void) | null = null;
    let unsubscribeQuizHistory: (() => void) | null = null;

    const authUnsubscribe = onAuthStateChanged(auth, async (user) => {
      // Clean up previous listeners if any
      if (unsubscribeUser) unsubscribeUser();
      if (unsubscribeGoals) unsubscribeGoals();
      if (unsubscribeAssignments) unsubscribeAssignments();
      if (unsubscribeSummaries) unsubscribeSummaries();
      if (unsubscribeQuizHistory) unsubscribeQuizHistory();

      setCurrentUser(user);

      if (user) {
        console.log("Authenticated User detected: ", user.email);
        try {
          // Check if document exists, if not seed it
          const userRef = doc(db, 'users', user.uid);
          const userSnap = await getDoc(userRef);

          if (!userSnap.exists()) {
            console.log("Seeding fresh account with local/saved sandbox data...");
            
            // Re-fetch current state to seed
            const storedCoursesStr = localStorage.getItem('sg_courses');
            const currentCourses = storedCoursesStr ? JSON.parse(storedCoursesStr) : DEFAULT_COURSES;
            const storedStreak = localStorage.getItem('sg_streak');
            const currentStreak = storedStreak ? parseInt(storedStreak, 10) : 5;
            const storedGoalsStr = localStorage.getItem('sg_goals');
            const currentGoals = storedGoalsStr ? JSON.parse(storedGoalsStr) : [
              { id: 'g1', text: 'Revise Computer Science Big O notation', completed: false },
              { id: 'g2', text: 'Review Biochemistry Synthase gradient complex', completed: true },
              { id: 'g3', text: 'Upload quantum lecture transcript', completed: false }
            ];
            const storedSummariesStr = localStorage.getItem('sg_summaries');
            const currentSummaries = storedSummariesStr ? JSON.parse(storedSummariesStr) : DEFAULT_SUMMARIES;
            const storedAssignmentsStr = localStorage.getItem('sg_assignments');
            const currentAssignments = storedAssignmentsStr ? JSON.parse(storedAssignmentsStr) : [];
            const storedHistoryStr = localStorage.getItem('sg_history');
            const currentHistory = storedHistoryStr ? JSON.parse(storedHistoryStr) : [];

            // Seed user document
            await setDoc(userRef, {
              uid: user.uid,
              email: user.email || '',
              courses: currentCourses,
              studentStreak: currentStreak,
              createdAt: new Date().toISOString()
            });

            // Seed goals
            for (const goal of currentGoals) {
              await setDoc(doc(db, `users/${user.uid}/goals`, goal.id), {
                id: goal.id,
                text: goal.text,
                completed: goal.completed,
                userId: user.uid,
                createdAt: new Date().toISOString()
              });
            }

            // Seed assignments
            for (const asg of currentAssignments) {
              await setDoc(doc(db, `users/${user.uid}/assignments`, asg.id), {
                ...asg,
                userId: user.uid
              });
            }

            // Seed summaries
            for (const courseName of Object.keys(currentSummaries)) {
              const summary = currentSummaries[courseName];
              await setDoc(doc(db, `users/${user.uid}/summaries`, courseName), {
                id: courseName,
                courseName: courseName,
                title: summary.title,
                summaryText: summary.summaryText,
                chapters: summary.chapters,
                flashcards: summary.flashcards,
                quiz: summary.quiz,
                userId: user.uid,
                createdAt: new Date().toISOString()
              });
            }

            // Seed history
            for (const qh of currentHistory) {
              await setDoc(doc(db, `users/${user.uid}/quizHistory`, qh.id), {
                ...qh,
                userId: user.uid
              });
            }
          }

          // -----------------------------------------------------------
          // Set up real-time active Firestore collection listeners
          // -----------------------------------------------------------
          unsubscribeUser = onSnapshot(userRef, (snapshot) => {
            if (snapshot.exists()) {
              const data = snapshot.data();
              if (data.courses) {
                setCourses(data.courses);
                if (data.courses.length > 0 && (!activeCourse || !data.courses.includes(activeCourse))) {
                  setActiveCourse(data.courses[0]);
                }
              }
              if (data.studentStreak !== undefined) {
                setStudentStreak(data.studentStreak);
              }
            }
          });

          unsubscribeGoals = onSnapshot(collection(db, `users/${user.uid}/goals`), (snapshot) => {
            const list: Goal[] = [];
            snapshot.forEach(doc => {
              const d = doc.data();
              list.push({
                id: d.id,
                text: d.text,
                completed: d.completed
              });
            });
            setGoals(list);
          });

          unsubscribeAssignments = onSnapshot(collection(db, `users/${user.uid}/assignments`), (snapshot) => {
            const list: Assignment[] = [];
            snapshot.forEach(doc => {
              list.push(doc.data() as Assignment);
            });
            setAssignments(list);
          });

          unsubscribeSummaries = onSnapshot(collection(db, `users/${user.uid}/summaries`), (snapshot) => {
            const map: Record<string, Summary> = {};
            snapshot.forEach(doc => {
              const data = doc.data() as Summary;
              map[doc.id] = data;
            });
            setSummaries(map);
          });

          unsubscribeQuizHistory = onSnapshot(collection(db, `users/${user.uid}/quizHistory`), (snapshot) => {
            const list: QuizHistoryRecord[] = [];
            snapshot.forEach(doc => {
              list.push(doc.data() as QuizHistoryRecord);
            });
            setQuizHistory(list);
          });

        } catch (err) {
          console.error("Firestore user hydration sequence failed: ", err);
        }
      } else {
        // Logged out / Guest session - Load from local storage
        console.log("No authorization session detected. Initializing guest profile...");
        try {
          const storedCoursesStr = localStorage.getItem('sg_courses');
          const storedSummariesStr = localStorage.getItem('sg_summaries');
          const storedAssignmentsStr = localStorage.getItem('sg_assignments');
          const storedHistoryStr = localStorage.getItem('sg_history');
          const storedStreak = localStorage.getItem('sg_streak');
          const storedGoalsStr = localStorage.getItem('sg_goals');

          if (!storedCoursesStr) {
            setCourses(DEFAULT_COURSES);
            setActiveCourse(DEFAULT_COURSES[0]);
            setSummaries(DEFAULT_SUMMARIES);
            setStudentStreak(5);
            setGoals([
              { id: 'g1', text: 'Revise Computer Science Big O notation', completed: false },
              { id: 'g2', text: 'Review Biochemistry Synthase gradient complex', completed: true },
              { id: 'g3', text: 'Upload quantum lecture transcript', completed: false }
            ]);

            localStorage.setItem('sg_courses', JSON.stringify(DEFAULT_COURSES));
            localStorage.setItem('sg_summaries', JSON.stringify(DEFAULT_SUMMARIES));
            localStorage.setItem('sg_streak', '5');
            localStorage.setItem('sg_goals', JSON.stringify([
              { id: 'g1', text: 'Revise Computer Science Big O notation', completed: false },
              { id: 'g2', text: 'Review Biochemistry Synthase gradient complex', completed: true },
              { id: 'g3', text: 'Upload quantum lecture transcript', completed: false }
            ]));
          } else {
            const parsedCourses = JSON.parse(storedCoursesStr);
            setCourses(parsedCourses);
            if (parsedCourses.length > 0) setActiveCourse(parsedCourses[0]);
            if (storedSummariesStr) setSummaries(JSON.parse(storedSummariesStr));
            if (storedAssignmentsStr) setAssignments(JSON.parse(storedAssignmentsStr));
            if (storedHistoryStr) setQuizHistory(JSON.parse(storedHistoryStr));
            if (storedStreak) setStudentStreak(parseInt(storedStreak, 10));
            if (storedGoalsStr) setGoals(JSON.parse(storedGoalsStr));
          }
        } catch (e) {
          console.error("Guest profile load error: ", e);
        }
      }
    });

    return () => {
      authUnsubscribe();
      if (unsubscribeUser) unsubscribeUser();
      if (unsubscribeGoals) unsubscribeGoals();
      if (unsubscribeAssignments) unsubscribeAssignments();
      if (unsubscribeSummaries) unsubscribeSummaries();
      if (unsubscribeQuizHistory) unsubscribeQuizHistory();
    };
  }, []);

  // -------------------------------------------------------------
  // DYNAMIC GLOBAL QUIZ LEADERBOARD LISTENER
  // -------------------------------------------------------------
  useEffect(() => {
    let unsubUsers: (() => void) | null = null;
    let unsubQuizGroup: (() => void) | null = null;

    if (currentUser) {
      setIsLeaderboardLoading(true);
      console.log("Setting up global quiz leaderboard snapshots...");

      const usersRef = collection(db, 'users');
      const quizHistoryGroupRef = collectionGroup(db, 'quizHistory');

      let allUsersMap: Record<string, any> = {};
      let allQuizDocs: any[] = [];

      const combineAndSet = () => {
        const aggregated: Record<string, LeaderboardEntry> = {};

        // 1. Initialize with users
        Object.values(allUsersMap).forEach(u => {
          aggregated[u.uid] = {
            email: u.email || 'Anonymous Student',
            totalScore: 0,
            totalQuizQuestions: 0,
            quizzesPlayed: 0,
            streak: u.studentStreak || 0
          };
        });

        // 2. Aggregate quiz history
        allQuizDocs.forEach(item => {
          const q = item.data();
          const userId = q.userId;
          if (!userId) return;

          if (!aggregated[userId]) {
            aggregated[userId] = {
              email: q.email || 'Student ' + userId.substring(0, 5),
              totalScore: 0,
              totalQuizQuestions: 0,
              quizzesPlayed: 0,
              streak: 0
            };
          }

          aggregated[userId].totalScore += (q.score || 0);
          aggregated[userId].totalQuizQuestions += (q.total || 0);
          aggregated[userId].quizzesPlayed += 1;
        });

        // 3. Convert to array and sort by totalScore descending
        const sortedList = Object.values(aggregated).sort((a, b) => b.totalScore - a.totalScore);
        setLeaderboard(sortedList);
        setIsLeaderboardLoading(false);
      };

      unsubUsers = onSnapshot(usersRef, (snapshot) => {
        allUsersMap = {};
        snapshot.forEach(doc => {
          allUsersMap[doc.id] = doc.data();
        });
        combineAndSet();
      }, (err) => {
        console.error("Leaderboard users list snapshot failed: ", err);
      });

      unsubQuizGroup = onSnapshot(quizHistoryGroupRef, (snapshot) => {
        allQuizDocs = [];
        snapshot.forEach(doc => {
          allQuizDocs.push(doc);
        });
        combineAndSet();
      }, (err) => {
        console.error("Leaderboard quizGroup list snapshot failed: ", err);
      });

    } else {
      // Offline/Local Guest Mode - Aggregate local quizHistory and merge with mock study buddies
      const localTotalScore = quizHistory.reduce((sum, item) => sum + item.score, 0);
      const localTotalQuestions = quizHistory.reduce((sum, item) => sum + item.total, 0);
      const localQuizzesPlayed = quizHistory.length;

      const guestEmail = 'guest_student@sandbox.edu (You)';
      const mockList: LeaderboardEntry[] = [
        { email: 'quantum_scholar@stanford.edu', totalScore: 48, totalQuizQuestions: 50, quizzesPlayed: 5, streak: 12 },
        { email: 'feynman_disciple@mit.edu', totalScore: 36, totalQuizQuestions: 40, quizzesPlayed: 4, streak: 8 },
        { email: 'bio_genius_pro@harvard.edu', totalScore: 24, totalQuizQuestions: 30, quizzesPlayed: 3, streak: 6 },
        { email: guestEmail, totalScore: localTotalScore, totalQuizQuestions: localTotalQuestions, quizzesPlayed: localQuizzesPlayed, streak: studentStreak }
      ];

      // Sort by totalScore descending
      const sortedMock = mockList.sort((a, b) => b.totalScore - a.totalScore);
      setLeaderboard(sortedMock);
      setIsLeaderboardLoading(false);
    }

    return () => {
      if (unsubUsers) unsubUsers();
      if (unsubQuizGroup) unsubQuizGroup();
    };
  }, [currentUser, quizHistory, studentStreak]);

  // Sync state helpers
  const saveCoursesToStorage = (updatedCourses: string[]) => {
    localStorage.setItem('sg_courses', JSON.stringify(updatedCourses));
  };
  const saveSummariesToStorage = (updatedSummaries: Record<string, Summary>) => {
    localStorage.setItem('sg_summaries', JSON.stringify(updatedSummaries));
  };
  const saveAssignmentsToStorage = (updatedAssignments: Assignment[]) => {
    localStorage.setItem('sg_assignments', JSON.stringify(updatedAssignments));
  };
  const saveStreakToStorage = (val: number) => {
    localStorage.setItem('sg_streak', String(val));
  };
  const saveGoalsToStorage = (updatedGoals: Goal[]) => {
    localStorage.setItem('sg_goals', JSON.stringify(updatedGoals));
  };
  const saveHistoryToStorage = (updatedHistory: QuizHistoryRecord[]) => {
    localStorage.setItem('sg_history', JSON.stringify(updatedHistory));
  };

  // Scroll Chat to bottom
  useEffect(() => {
    if (chatBottomRef.current) {
      chatBottomRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [chatHistory, isGeneratingChat, isChatOpen]);

  // Handle active summary quiz population
  const activeSummary = summaries[activeCourse];

  // -------------------------------------------------------------
  // DYNAMIC OPERATIONS
  // -------------------------------------------------------------
  const handleAddCourse = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newCourseName.trim()) return;
    const cleanName = newCourseName.trim();
    if (courses.includes(cleanName)) {
      return;
    }
    const updated = [...courses, cleanName];
    
    if (currentUser) {
      try {
        await updateDoc(doc(db, 'users', currentUser.uid), {
          courses: updated
        });
        setActiveCourse(cleanName);
      } catch (err) {
        console.error("Cloud action handleAddCourse failed: ", err);
      }
    } else {
      setCourses(updated);
      setActiveCourse(cleanName);
      saveCoursesToStorage(updated);
    }
    setNewCourseName('');
  };

  const handleDeleteCourse = async (courseToDelete: string) => {
    if (courses.length <= 1) {
      return;
    }
    const updated = courses.filter(c => c !== courseToDelete);
    
    if (currentUser) {
      try {
        await updateDoc(doc(db, 'users', currentUser.uid), {
          courses: updated
        });
        
        // Also remove matching summary
        await deleteDoc(doc(db, `users/${currentUser.uid}/summaries`, courseToDelete));
        
        if (activeCourse === courseToDelete) {
          setActiveCourse(updated[0]);
        }
      } catch (err) {
        console.error("Cloud action handleDeleteCourse failed: ", err);
      }
    } else {
      setCourses(updated);
      if (activeCourse === courseToDelete) {
        setActiveCourse(updated[0]);
      }
      const updatedSummaries = { ...summaries };
      delete updatedSummaries[courseToDelete];
      setSummaries(updatedSummaries);
      
      saveCoursesToStorage(updated);
      saveSummariesToStorage(updatedSummaries);
    }
  };

  const handleFlashcardTouchStart = (e: React.TouchEvent) => {
    const touch = e.touches[0];
    touchStartX.current = touch.clientX;
    touchStartY.current = touch.clientY;
    hasSwiped.current = false;
    setSwipeOffset(0);
  };

  const handleFlashcardTouchMove = (e: React.TouchEvent) => {
    if (touchStartX.current === null || touchStartY.current === null) return;
    const touch = e.touches[0];
    const diffX = touch.clientX - touchStartX.current;
    const diffY = touch.clientY - touchStartY.current;

    // Detect if movement is primarily horizontal
    if (Math.abs(diffX) > Math.abs(diffY)) {
      if (Math.abs(diffX) > 10) {
        hasSwiped.current = true;
        setSwipeOffset(diffX);
      }
    }
  };

  const handleFlashcardTouchEnd = (flashcardsLength: number) => {
    if (touchStartX.current === null) return;
    
    const threshold = 70; // 70px is standard and highly intuitive
    if (swipeOffset < -threshold) {
      // Swipe Left -> Next
      setIsFlashcardFlipped(false);
      setCurrentFlashcardIndex(prev => (prev + 1 === flashcardsLength ? 0 : prev + 1));
    } else if (swipeOffset > threshold) {
      // Swipe Right -> Prev
      setIsFlashcardFlipped(false);
      setCurrentFlashcardIndex(prev => (prev === 0 ? flashcardsLength - 1 : prev - 1));
    }

    touchStartX.current = null;
    touchStartY.current = null;
    setSwipeOffset(0);
    
    // Auto reset hasSwiped after a delay if click doesn't trigger
    setTimeout(() => {
      hasSwiped.current = false;
    }, 100);
  };

  const handleFlashcardClick = () => {
    if (hasSwiped.current) {
      hasSwiped.current = false;
      return;
    }
    setIsFlashcardFlipped(!isFlashcardFlipped);
  };

  const handleCreateGoal = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newGoalText.trim()) return;
    const newGoal: Goal = {
      id: 'g_' + Date.now(),
      text: newGoalText.trim(),
      completed: false
    };

    if (currentUser) {
      try {
        await setDoc(doc(db, `users/${currentUser.uid}/goals`, newGoal.id), {
          id: newGoal.id,
          text: newGoal.text,
          completed: newGoal.completed,
          userId: currentUser.uid,
          createdAt: new Date().toISOString()
        });
      } catch (err) {
        console.error("Cloud action handleCreateGoal failed: ", err);
      }
    } else {
      const updated = [...goals, newGoal];
      setGoals(updated);
      saveGoalsToStorage(updated);
    }
    setNewGoalText('');
  };

  const toggleGoal = async (id: string) => {
    const origGoal = goals.find(g => g.id === id);
    if (!origGoal) return;

    if (currentUser) {
      try {
        await updateDoc(doc(db, `users/${currentUser.uid}/goals`, id), {
          completed: !origGoal.completed
        });
      } catch (err) {
        console.error("Cloud action toggleGoal failed: ", err);
      }
    } else {
      const updated = goals.map(g => g.id === id ? { ...g, completed: !g.completed } : g);
      setGoals(updated);
      saveGoalsToStorage(updated);
    }
  };

  const deleteGoal = async (id: string) => {
    if (currentUser) {
      try {
        await deleteDoc(doc(db, `users/${currentUser.uid}/goals`, id));
      } catch (err) {
        console.error("Cloud action deleteGoal failed: ", err);
      }
    } else {
      const updated = goals.filter(g => g.id !== id);
      setGoals(updated);
      saveGoalsToStorage(updated);
    }
  };

  // Drag and drop / local file handling
  const handleFileDrop = (e: React.DragEvent) => {
    e.preventDefault();
    const file = e.dataTransfer.files[0];
    if (file) processLocalFile(file);
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) processLocalFile(file);
  };

  const processLocalFile = (file: File) => {
    if (file.size > 2 * 1024 * 1024) {
      alert("Please upload standard document files under 2MB size limit.");
      return;
    }
    setUploadedFileName(file.name);
    const reader = new FileReader();
    reader.onload = (event) => {
      const content = event.target?.result as string;
      setUploadedFileContent(content);
    };
    reader.readAsText(file);
  };

  // Summarize Transcript Controller
  const executeSummarize = async () => {
    setSummarizerError('');
    let contentToSummarize = '';

    if (summaryInputType === 'paste') {
      contentToSummarize = pastedText;
    } else if (summaryInputType === 'file') {
      contentToSummarize = uploadedFileContent;
    } else if (summaryInputType === 'url') {
      if (!lectureUrl.trim()) {
        setSummarizerError("Please enter a valid lecture notes URL.");
        return;
      }
      setIsSummarizing(true);
      try {
        const fetchRes = await fetch('/api/fetch-url', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ url: lectureUrl.trim() })
        });
        const data = await fetchRes.json();
        if (!fetchRes.ok) throw new Error(data.error || 'Failed to fetch the URL content.');
        contentToSummarize = data.text;
      } catch (err: any) {
        setSummarizerError(err.message || 'Network error extracting URL content.');
        setIsSummarizing(false);
        return;
      }
    }

    if (!contentToSummarize || contentToSummarize.trim().length < 50) {
      setSummarizerError("Please provide substantial study transcript contents (minimum 50 characters).");
      setIsSummarizing(false);
      return;
    }

    setIsSummarizing(true);
    try {
      const resp = await fetch('/api/summarize', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          text: contentToSummarize,
          type: summaryInputType,
          url: summaryInputType === 'url' ? lectureUrl : undefined
        })
      });
      const data = await resp.json();
      if (!resp.ok) {
        if (data.noApiKey) setIsApiKeyWarningOpen(true);
        throw new Error(data.error || 'Failed generating response.');
      }

      if (currentUser) {
        try {
          await setDoc(doc(db, `users/${currentUser.uid}/summaries`, activeCourse), {
            id: activeCourse,
            courseName: activeCourse,
            title: data.title,
            summaryText: data.summaryText,
            chapters: data.chapters,
            flashcards: data.flashcards,
            quiz: data.quiz,
            userId: currentUser.uid,
            createdAt: new Date().toISOString()
          });

          await updateDoc(doc(db, 'users', currentUser.uid), {
            studentStreak: studentStreak + 1
          });
        } catch (err) {
          console.error("Cloud actions within executeSummarize failed: ", err);
        }
      } else {
        // Merge and save parsed study guide
        const updatedSummaries = {
          ...summaries,
          [activeCourse]: data
        };
        setSummaries(updatedSummaries);
        saveSummariesToStorage(updatedSummaries);

        // Increment parsed material metrics in goals or stats
        setStudentStreak(prev => prev + 1);
        saveStreakToStorage(studentStreak + 1);
      }

      // Reset input values
      setPastedText('');
      setUploadedFileContent('');
      setUploadedFileName('');
      setLectureUrl('');
    } catch (err: any) {
      setSummarizerError(err.message || "An exception occurred requesting Gemini analysis.");
    } finally {
      setIsSummarizing(false);
    }
  };

  // Solutions Generator Controller
  const executeSolve = async () => {
    if (!assignmentQuestions.trim()) {
      setSolverError("Please insert the questions you want solved.");
      return;
    }
    setSolverError('');
    setIsSolving(true);
    setCurrentSolution('');

    const stages = [
      'Deconstructing problem context...',
      'Mapping core concepts...',
      'Drafting step-by-step logic derivations...',
      'Formulating explanation guide...'
    ];

    let stageIdx = 0;
    setSolvingStage(stages[0]);
    const stageTimer = setInterval(() => {
      stageIdx++;
      if (stageIdx < stages.length) {
        setSolvingStage(stages[stageIdx]);
      }
    }, 1500);

    try {
      const resp = await fetch('/api/solve', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: assignmentTitle.trim() || 'Custom Solutions Set',
          questions: assignmentQuestions,
          style: assignmentStyle
        })
      });
      const data = await resp.json();
      if (!resp.ok) {
        if (data.noApiKey) setIsApiKeyWarningOpen(true);
        throw new Error(data.error || 'Solver request error.');
      }

      const newAssignment: Assignment = {
        id: 'assign_' + Date.now(),
        courseName: activeCourse,
        title: assignmentTitle.trim() || 'Solutions Sheet: ' + styleLabel(assignmentStyle),
        questions: assignmentQuestions,
        solution: data.solution,
        style: assignmentStyle,
        createdAt: new Date().toLocaleDateString()
      };

      if (currentUser) {
        try {
          await setDoc(doc(db, `users/${currentUser.uid}/assignments`, newAssignment.id), {
            ...newAssignment,
            userId: currentUser.uid
          });
        } catch (err) {
          console.error("Cloud action assignments failed: ", err);
        }
      } else {
        const updated = [newAssignment, ...assignments];
        setAssignments(updated);
        saveAssignmentsToStorage(updated);
      }
      setCurrentSolution(data.solution);

      // Clear layout
      setAssignmentTitle('');
      setAssignmentQuestions('');
    } catch (error: any) {
      setSolverError(error.message || 'Error occurred during pedagogical solving.');
    } finally {
      clearInterval(stageTimer);
      setIsSolving(false);
    }
  };

  const styleLabel = (style: string) => {
    switch (style) {
      case 'reasoner': return 'Advanced Reasoner';
      case 'math': return 'Math & LaTeX';
      case 'code': return 'Code & Logic';
      case 'outline': return 'Concise Outline';
      default: return 'Reasoner';
    }
  };

  // Assistant Chatbot Controller
  const executeChat = async (directPrompt?: string) => {
    const messageToSend = directPrompt || chatMessage;
    if (!messageToSend.trim()) return;

    const userMessage = {
      role: 'user' as const,
      parts: [{ text: messageToSend.trim() }]
    };

    setChatHistory(prev => [...prev, userMessage]);
    if (!directPrompt) setChatMessage('');
    setIsGeneratingChat(true);

    try {
      const resp = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message: messageToSend.trim(),
          history: chatHistory,
          context: {
            activeCourse,
            activeSummary: activeSummary || null,
            activeAssignment: assignments.find(a => a.courseName === activeCourse) || null
          }
        })
      });

      const data = await resp.json();
      if (!resp.ok) {
        if (data.noApiKey) setIsApiKeyWarningOpen(true);
        throw new Error(data.error || 'Companion failed to process chat.');
      }

      setChatHistory(prev => [
        ...prev,
        {
          role: 'assistant' as const,
          parts: [{ text: data.text }]
        }
      ]);
    } catch (err: any) {
      setChatHistory(prev => [
        ...prev,
        {
          role: 'assistant' as const,
          parts: [{ text: `🚨 **System Alert**: ${err.message || 'Failed connecting to study companion.'}` }]
        }
      ]);
    } finally {
      setIsGeneratingChat(false);
    }
  };

  // Interactive Quiz Engine Controllers
  const triggerQuizStart = () => {
    if (!activeSummary || !activeSummary.quiz || activeSummary.quiz.length === 0) return;
    setActiveQuizQuestions(activeSummary.quiz);
    setCurrentQuizIndex(0);
    setSelectedQuizOption(null);
    setQuizScore(0);
    setQuizSubmitted(false);
    setQuizCompleted(false);
    setActiveTab('quiz');
  };

  const submitQuizAnswer = () => {
    if (selectedQuizOption === null) return;
    setQuizSubmitted(true);
    const activeQ = activeQuizQuestions[currentQuizIndex];
    if (selectedQuizOption === activeQ.correctIndex) {
      setQuizScore(prev => prev + 1);
    }
  };

  const advanceQuiz = async () => {
    if (currentQuizIndex + 1 < activeQuizQuestions.length) {
      setCurrentQuizIndex(prev => prev + 1);
      setSelectedQuizOption(null);
      setQuizSubmitted(false);
    } else {
      setQuizCompleted(true);
      // Save quiz score to history
      const newRecord: QuizHistoryRecord = {
        id: 'qhist_' + Date.now(),
        courseName: activeCourse,
        quizTitle: activeSummary?.title || 'Course Concept Diagnostic',
        score: quizScore + (selectedQuizOption === activeQuizQuestions[currentQuizIndex].correctIndex && !quizSubmitted ? 1 : 0),
        total: activeQuizQuestions.length,
        date: new Date().toLocaleDateString()
      };

      if (currentUser) {
        try {
          await setDoc(doc(db, `users/${currentUser.uid}/quizHistory`, newRecord.id), {
            ...newRecord,
            userId: currentUser.uid
          });

          await updateDoc(doc(db, 'users', currentUser.uid), {
            studentStreak: studentStreak + 1
          });
        } catch (err) {
          console.error("Cloud action quiz saving failed: ", err);
        }
      } else {
        const updated = [newRecord, ...quizHistory];
        setQuizHistory(updated);
        saveHistoryToStorage(updated);

        // Increment streak metric
        setStudentStreak(prev => prev + 1);
        saveStreakToStorage(studentStreak + 1);
      }
    }
  };

  return (
    <div className="min-h-screen bg-[#0A0B0D] text-slate-100 flex flex-col font-sans select-none antialiased relative pb-28">
      
      {/* GLOWING AMBIENT BACKGROUNDS AND SHADOW FLARES MIMICKING ORIGINAL SCREEN LENS */}
      <div className="absolute top-[-100px] left-[50%] -translate-x-1/2 w-[600px] h-[600px] bg-indigo-500/[0.04] blur-[150px] rounded-full pointer-events-none z-0" />
      <div className="absolute top-[20%] left-[-100px] w-[400px] h-[400px] bg-violet-500/[0.03] blur-[130px] rounded-full pointer-events-none z-0" />
      <div className="absolute bottom-[10%] right-[-100px] w-[500px] h-[500px] bg-indigo-500/[0.03] blur-[150px] rounded-full pointer-events-none z-0" />

      {/* HEADER COCKPIT (Sleek Phone Style Inspired by the Left Screen) */}
      <header className="sticky top-0 z-35 bg-[#0B0C0F]/85 backdrop-blur-xl border-b border-white/[0.03] px-5 py-4 flex justify-between items-center shadow-lg transition-all">
        <div className="flex items-center gap-3">
          {/* User Profile Avatar with custom initials or dynamic status */}
          <div className="relative group cursor-pointer">
            <div className="w-10 h-10 rounded-full bg-gradient-to-tr from-indigo-600 via-violet-500 to-amber-400 p-[1.5px] shadow-lg shadow-indigo-500/10 active:scale-95 transition-all">
              <div className="w-full h-full rounded-full bg-slate-950 flex items-center justify-center">
                <span className="font-display text-sm font-extrabold text-white tracking-tight">
                  {currentUser ? currentUser.email[0].toUpperCase() : 'T'}
                </span>
              </div>
            </div>
            <div className="absolute -bottom-0.5 -right-0.5 w-3 h-3 rounded-full bg-emerald-500 border-2 border-[#0A0B0D] shadow-sm animate-pulse" />
          </div>

          {/* Capsule "+ Invite" button from the image */}
          <button 
            onClick={() => {
              navigator.clipboard.writeText(`Hey! Join my Study Genius workspace deck "${activeCourse}" and let's back up notes on the cloud together: ${window.location.origin}`);
              alert("🚀 Workspace invite link copied to clipboard! Share it with your peers to collaborate.");
            }}
            className="cursor-pointer bg-white/[0.04] hover:bg-white/[0.08] active:bg-white/[0.1] border border-white/[0.06] text-[11px] font-bold text-slate-300 font-display px-3 py-1.5 rounded-full transition-all flex items-center gap-1 hover:translate-y-[-0.5px]"
          >
            <span>+ Invite</span>
          </button>
        </div>

        {/* ACTIVE DECK SELECTOR (High Fidelity Pill Capsule) */}
        <div className="flex items-center">
          <div className="bg-[#13151A] hover:bg-[#1A1D24] border border-white/[0.05] shadow-inner px-3.5 py-1.5 rounded-full text-xs font-bold font-display text-indigo-400 cursor-pointer flex items-center gap-1.5 transition-all">
            <BookOpen className="w-3.5 h-3.5 shrink-0" />
            <select
              value={activeCourse}
              onChange={(e) => {
                setActiveCourse(e.target.value);
                setCurrentFlashcardIndex(0);
                setIsFlashcardFlipped(false);
              }}
              className="bg-transparent text-indigo-300 outline-none font-extrabold pr-1 cursor-pointer text-xs"
            >
              {courses.map((c) => (
                <option key={c} value={c} className="bg-[#0B0C0F] text-slate-350 font-semibold">{c}</option>
              ))}
            </select>
          </div>
        </div>

        {/* NOTIFICATION HUB (Inspired by the mock status item) */}
        <div className="flex items-center gap-2">
          <button 
            onClick={() => {
              alert(`🔔 Learning Notification Center:\n\nActive course: ${activeCourse}\nDaily streak: ${studentStreak} days active\nCloud Backup: ${currentUser ? "Initialized & active" : "Guest Mode offline"}`);
            }}
            className="cursor-pointer w-9 h-9 rounded-full bg-white/[0.03] hover:bg-white/[0.07] border border-white/[0.04] flex items-center justify-center text-slate-400 hover:text-white transition-all relative"
          >
            <Bell className="w-4 h-4" />
            <span className="absolute top-2.5 right-2.5 w-2 h-2 rounded-full bg-orange-500 ring-2 ring-[#0A0B0D]" />
          </button>
        </div>
      </header>

      {/* MAIN CONTAINER ELEMENT */}
      <div className="flex-1 flex overflow-hidden z-10">
        
        {/* COMPACT VIEW STAGE FOR STUDY CONTENT */}
        <main className="flex-1 overflow-y-auto p-4 sm:p-6 md:p-8 space-y-6">
            {/* ============================================================== */}
          {/* NAV TAB 1: EXPLORE HOME DESIGN (STYLISH PHONE MOCKUP SCHEME) */}
          {/* ============================================================== */}
          {activeNavTab === 'explore' && (
            <div className="space-y-6 animate-fade-in font-display">
              
              {/* LARGE GORGEOUS GLASSMAPPING TAP-TO-CHAT CIRCULAR SPHERE */}
              <div className="flex flex-col items-center justify-center my-6 relative">
                {/* Glowing light blurs behind sphere */}
                <div className="absolute w-80 h-80 bg-indigo-500/[0.04] blur-3xl rounded-full scale-110 pointer-events-none" />
                <div className="absolute w-60 h-60 bg-violet-500/[0.03] blur-3xl rounded-full translate-x-12 translate-y-6 pointer-events-none" />

                <button
                  onClick={() => setActiveNavTab('chat')}
                  className="group relative w-72 h-72 rounded-full border border-white/[0.06] bg-[#13151A]/90 hover:border-indigo-500/30 transition-all duration-300 shadow-[0_20px_50px_rgba(0,0,0,0.85)] flex flex-col items-center justify-center cursor-pointer overflow-hidden transform hover:scale-[1.02] active:scale-[0.98]"
                >
                  {/* Glass lens glare overlays inside the sphere */}
                  <div className="absolute top-[10%] right-[15%] w-24 h-24 rounded-full border border-white/[0.02] bg-white/[0.01] pointer-events-none" />
                  <div className="absolute bottom-[8%] left-[10%] w-16 h-16 rounded-full border border-white/[0.01] bg-white/[0.01] pointer-events-none" />
                  
                  {/* Subtle decorative radial rings */}
                  <div className="absolute inset-4 rounded-full border border-white/[0.01] pointer-events-none" />
                  <div className="absolute inset-10 rounded-full border border-white/[0.005] pointer-events-none" />

                  <span className="text-[10px] text-indigo-400 font-extrabold pb-2 tracking-widest uppercase font-mono">Cognitive Hub Active</span>
                  
                  {/* Greeting & Interactive Trigger */}
                  <div className="text-center space-y-1 z-10 px-4">
                    <h2 className="text-xs text-slate-400 font-medium tracking-wide transition-all group-hover:text-white">
                      Hi, {currentUser ? currentUser.email.split('@')[0] : 'Todd'} 👋
                    </h2>
                    <p className="text-2xl font-black text-white tracking-tight leading-none font-display">
                      Tap to chat
                    </p>
                  </div>

                  {/* Bouncing speaker waves centered inside */}
                  <div className="flex items-center gap-1.5 mt-8 h-8 select-none z-10 px-4">
                    <span className="w-1 bg-indigo-400 rounded-full animate-[pulse_1s_infinite] h-4" />
                    <span className="w-1.5 bg-violet-400 rounded-full animate-[pulse_0.8s_infinite] h-6" />
                    <span className="w-1 bg-indigo-500 rounded-full animate-[pulse_1.2s_infinite] h-3" />
                    <span className="w-1.5 bg-fuchsia-400 rounded-full animate-[pulse_0.7s_infinite] h-7" />
                    <span className="w-1 bg-indigo-300 rounded-full animate-[pulse_1.1s_infinite] h-4" />
                  </div>
                </button>
              </div>

              {/* SECTION HEADER */}
              <div className="flex items-center justify-between px-1.5">
                <h3 className="font-bold text-xl text-white tracking-tight">Explore</h3>
                <span className="text-[9px] bg-indigo-500/10 text-indigo-400 border border-indigo-500/20 px-2 py-0.5 rounded-full font-black uppercase tracking-wider font-mono">
                  8 Modules Active
                </span>
              </div>

              {/* EXPLORE GRID OF 8 CARDS (Exactly maps Mockup visuals) */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                
                {/* Card 1: Art -> Materials Summarizer */}
                <button
                  onClick={() => {
                    setActiveTab('summarizer');
                    setActiveNavTab('workspace');
                  }}
                  className="text-left w-full cursor-pointer bg-[#14161D]/80 hover:bg-[#1E212B] border border-white/[0.04] hover:border-white/[0.09] p-5 rounded-2xl flex flex-col gap-3 transition-all duration-200 hover:-translate-y-0.5 group shadow-lg"
                >
                  <div className="w-10 h-10 rounded-xl bg-violet-500/10 border border-violet-500/20 flex items-center justify-center text-violet-400 shadow-inner group-hover:scale-105 transition-transform shrink-0">
                    <FileText className="w-5 h-5" />
                  </div>
                  <div>
                    <h4 className="text-sm font-bold text-white tracking-tight">Materials Summarizer</h4>
                    <p className="text-[11px] text-slate-400 mt-1 font-sans leading-relaxed font-semibold">
                      Summarize documents, PDF files, or web pages into compact lecture briefs.
                    </p>
                  </div>
                </button>

                {/* Card 2: Booking -> Test Prep Diagnostic */}
                <button
                  onClick={() => {
                    if (activeSummary && activeSummary.quiz) {
                      triggerQuizStart();
                    } else {
                      setActiveTab('quiz');
                    }
                    setActiveNavTab('workspace');
                  }}
                  className="text-left w-full cursor-pointer bg-[#14161D]/80 hover:bg-[#1E212B] border border-white/[0.04] hover:border-white/[0.09] p-5 rounded-2xl flex flex-col gap-3 transition-all duration-200 hover:-translate-y-0.5 group shadow-lg"
                >
                  <div className="w-10 h-10 rounded-xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-center text-amber-400 shadow-inner group-hover:scale-105 transition-transform shrink-0">
                    <Award className="w-5 h-5" />
                  </div>
                  <div>
                    <h4 className="text-sm font-bold text-white tracking-tight">Test Prep Diagnostic</h4>
                    <p className="text-[11px] text-slate-400 mt-1 font-sans leading-relaxed font-semibold">
                      Simulate real examinations, take automatic quizzes, and log point metrics.
                    </p>
                  </div>
                </button>

                {/* Card 3: Code -> Assignment Solver */}
                <button
                  onClick={() => {
                    setActiveTab('homework');
                    setActiveNavTab('workspace');
                  }}
                  className="text-left w-full cursor-pointer bg-[#14161D]/80 hover:bg-[#1E212B] border border-white/[0.04] hover:border-white/[0.09] p-5 rounded-2xl flex flex-col gap-3 transition-all duration-200 hover:-translate-y-0.5 group shadow-lg"
                >
                  <div className="w-10 h-10 rounded-xl bg-[#22c55e]/10 border border-[#22c55e]/25 flex items-center justify-center text-emerald-400 shadow-inner group-hover:scale-105 transition-transform shrink-0">
                    <GraduationCap className="w-5 h-5 animate-pulse" />
                  </div>
                  <div>
                    <h4 className="text-sm font-bold text-white tracking-tight">Assignment Guide</h4>
                    <p className="text-[11px] text-slate-400 mt-1 font-sans leading-relaxed font-semibold">
                      Resolve algebraic equations, input questions blocks, and view solutions.
                    </p>
                  </div>
                </button>

                {/* Card 4: Content -> Flashcard Glossary */}
                <button
                  onClick={() => {
                    setActiveTab('flashcards');
                    setActiveNavTab('workspace');
                  }}
                  className="text-left w-full cursor-pointer bg-[#14161D]/80 hover:bg-[#1E212B] border border-white/[0.04] hover:border-white/[0.09] p-5 rounded-2xl flex flex-col gap-3 transition-all duration-200 hover:-translate-y-0.5 group shadow-lg"
                >
                  <div className="w-10 h-10 rounded-xl bg-indigo-500/10 border border-indigo-500/20 flex items-center justify-center text-indigo-400 shadow-inner group-hover:scale-105 transition-transform shrink-0">
                    <Layers className="w-5 h-5" />
                  </div>
                  <div>
                    <h4 className="text-sm font-bold text-white tracking-tight">Flashcard Glossary</h4>
                    <p className="text-[11px] text-slate-400 mt-1 font-sans leading-relaxed font-semibold">
                      Flip terminology glossary cards extracted dynamically from processed notes.
                    </p>
                  </div>
                </button>

                {/* Card 5: Entertainment -> AI Companion Chat */}
                <button
                  onClick={() => setActiveNavTab('chat')}
                  className="text-left w-full cursor-pointer bg-[#14161D]/80 hover:bg-[#1E212B] border border-white/[0.04] hover:border-white/[0.09] p-5 rounded-2xl flex flex-col gap-3 transition-all duration-200 hover:-translate-y-0.5 group shadow-lg"
                >
                  <div className="w-10 h-10 rounded-xl bg-pink-500/10 border border-pink-500/20 flex items-center justify-center text-pink-400 shadow-inner group-hover:scale-105 transition-transform shrink-0">
                    <Sparkles className="w-5 h-5" />
                  </div>
                  <div>
                    <h4 className="text-sm font-bold text-white tracking-tight">AI Companion Agent</h4>
                    <p className="text-[11px] text-slate-400 mt-1 font-sans leading-relaxed font-semibold">
                      Chat directly with Gemini-powered study coaches for interactive learning.
                    </p>
                  </div>
                </button>

                {/* Card 6: Translator -> Subjects Organizer */}
                <button
                  onClick={() => setActiveNavTab('profile')}
                  className="text-left w-full cursor-pointer bg-[#14161D]/80 hover:bg-[#1E212B] border border-white/[0.04] hover:border-white/[0.09] p-5 rounded-2xl flex flex-col gap-3 transition-all duration-200 hover:-translate-y-0.5 group shadow-lg"
                >
                  <div className="w-10 h-10 rounded-xl bg-cyan-500/10 border border-cyan-500/20 flex items-center justify-center text-cyan-400 shadow-inner group-hover:scale-105 transition-transform shrink-0">
                    <BookOpen className="w-5 h-5" />
                  </div>
                  <div>
                    <h4 className="text-sm font-bold text-white tracking-tight">Subjects Organizer</h4>
                    <p className="text-[11px] text-slate-400 mt-1 font-sans leading-relaxed font-semibold">
                      Add, delete, or switch academic fields profile decks in guest/cloud modes.
                    </p>
                  </div>
                </button>

                {/* Card 7: Health -> Learning Goals checklist */}
                <button
                  onClick={() => setActiveNavTab('profile')}
                  className="text-left w-full cursor-pointer bg-[#14161D]/80 hover:bg-[#1E212B] border border-white/[0.04] hover:border-white/[0.09] p-5 rounded-2xl flex flex-col gap-3 transition-all duration-200 hover:-translate-y-0.5 group shadow-lg"
                >
                  <div className="w-10 h-10 rounded-xl bg-orange-500/10 border border-orange-500/20 flex items-center justify-center text-orange-400 shadow-inner group-hover:scale-105 transition-transform shrink-0">
                    <ListTodo className="w-5 h-5" />
                  </div>
                  <div>
                    <h4 className="text-sm font-bold text-white tracking-tight">Goals & Streaks</h4>
                    <p className="text-[11px] text-slate-400 mt-1 font-sans leading-relaxed font-semibold">
                      Add study checklist goals and track daily consistency active multipliers.
                    </p>
                  </div>
                </button>

                {/* Card 8: Music -> Global Scoreboard standing */}
                <button
                  onClick={() => setActiveNavTab('profile')}
                  className="text-left w-full cursor-pointer bg-[#14161D]/80 hover:bg-[#1E212B] border border-white/[0.04] hover:border-white/[0.09] p-5 rounded-2xl flex flex-col gap-3 transition-all duration-200 hover:-translate-y-0.5 group shadow-lg"
                >
                  <div className="w-10 h-10 rounded-xl bg-blue-500/10 border border-blue-500/20 flex items-center justify-center text-blue-400 shadow-inner group-hover:scale-105 transition-transform shrink-0">
                    <Trophy className="w-5 h-5" />
                  </div>
                  <div>
                    <h4 className="text-sm font-bold text-white tracking-tight">Global Scoreboards</h4>
                    <p className="text-[11px] text-slate-400 mt-1 font-sans leading-relaxed font-semibold">
                      Sync scoreboard results with Stanford, Harvard, and MIT study group peers.
                    </p>
                  </div>
                </button>

              </div>
              
            </div>
          )}

          {/* ============================================================== */}
          {/* NAV TAB 4: PROFILE STATUS, DECKS & GLOBAL FIREBASE LEADERBOARD */}
          {/* ============================================================== */}
          {activeNavTab === 'profile' && (
            <div className="space-y-6 animate-fade-in">
              <div className="border-b border-white/[0.03] pb-4">
                <h2 className="font-display text-2xl font-extrabold text-white tracking-tight">Identity & Achievements Cockpit</h2>
                <p className="text-slate-400 text-xs font-semibold font-sans mt-1">Manage subjects, checklist goals, your learning streak and live network ranking scoreboards.</p>
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                
                {/* Left side: Subjects Organizer & Streak metrics */}
                <div className="lg:col-span-1 space-y-6">
                  
                  {/* Subject deck manager card */}
                  <div className="bg-[#13151A]/90 border border-white/[0.04] rounded-2xl p-5 shadow-xl space-y-4 font-display">
                    <h3 className="text-sm font-bold text-white flex items-center gap-2">
                      <BookOpen className="w-4 h-4 text-indigo-400 shrink-0" />
                      Subjects Organizer Deck
                    </h3>
                    
                    <form onSubmit={handleAddCourse} className="flex gap-1.5 font-sans">
                      <input
                        type="text"
                        placeholder="E.g., Calc II, Bio..."
                        value={newCourseName}
                        onChange={(e) => setNewCourseName(e.target.value)}
                        className="bg-slate-950 text-xs text-slate-200 border border-white/[0.05] focus:border-indigo-500 rounded-xl px-3 py-2.5 w-full outline-none font-semibold font-sans"
                      />
                      <button
                        type="submit"
                        className="bg-indigo-600 hover:bg-indigo-500 p-2 rounded-xl text-white cursor-pointer hover:scale-105 transition-all text-xs font-bold shrink-0"
                        title="Add subject deck"
                      >
                        <Plus className="w-4 h-4" />
                      </button>
                    </form>

                    <div className="space-y-1.5 max-h-48 overflow-y-auto pr-1">
                      {courses.map(course => (
                        <div
                          key={course}
                          className={`group flex justify-between items-center px-3 py-2 rounded-xl text-xs font-semibold cursor-pointer transition-all ${
                            activeCourse === course
                              ? 'bg-indigo-950/40 border border-indigo-500/30 text-indigo-300'
                              : 'text-slate-400 hover:text-white bg-[#1a1c24]/50 border border-transparent'
                          }`}
                          onClick={() => setActiveCourse(course)}
                        >
                          <span className="truncate flex items-center gap-2">
                            <BookOpen className="w-3.5 h-3.5 text-indigo-400 shrink-0" />
                            {course}
                          </span>
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              handleDeleteCourse(course);
                            }}
                            className="p-1 rounded text-slate-500 hover:text-red-400 transition-colors cursor-pointer"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Consistency streak card */}
                  <div className="bg-[#13151A]/90 border border-white/[0.04] rounded-2xl p-5 shadow-xl space-y-4 font-display">
                    <div className="flex items-center gap-2">
                      <div className="w-9 h-9 rounded-xl bg-orange-500/10 flex items-center justify-center border border-orange-500/20">
                        <Zap className="w-4.5 h-4.5 text-orange-400 shrink-0" />
                      </div>
                      <div>
                        <span className="text-[10px] text-slate-400 font-extrabold block uppercase tracking-wider font-mono">Learning Streak Index</span>
                        <span className="text-md font-black text-white">{studentStreak} Days Active</span>
                      </div>
                    </div>
                    <div className="w-full bg-slate-950 h-2 rounded-full overflow-hidden">
                      <div className="bg-gradient-to-r from-orange-400 to-amber-400 h-full transition-all duration-500" style={{ width: `${Math.min(100, studentStreak * 10)}%` }} />
                    </div>
                    <p className="text-[10.5px] text-slate-400 font-sans leading-relaxed font-semibold">
                      Complete diagnostic quizzes each day to add to your streak and score rank multiplier bonuses!
                    </p>
                  </div>

                </div>

                {/* Right side: Learning Checklist & Scoreboards */}
                <div className="lg:col-span-2 space-y-6">
                  
                  {/* Interactive study checkpoint checklist manager */}
                  <div className="bg-[#13151A]/90 border border-white/[0.04] rounded-2xl p-5 shadow-xl space-y-4 font-display">
                    <h3 className="text-sm font-bold text-white flex items-center gap-2">
                      <ListTodo className="w-4 h-4 text-emerald-400 shrink-0" />
                      Active Study Checkpoints
                    </h3>
                    
                    <form onSubmit={handleCreateGoal} className="flex gap-2">
                      <input
                        type="text"
                        placeholder="E.g., Complete Calc derivatives derivation quiz..."
                        value={newGoalText}
                        onChange={(e) => setNewGoalText(e.target.value)}
                        className="bg-slate-950 text-xs text-slate-200 border border-white/[0.05] focus:border-indigo-500 rounded-xl px-3.5 py-2.5 w-full outline-none font-semibold font-sans animate-fade-in"
                      />
                      <button
                        type="submit"
                        className="bg-indigo-600 hover:bg-indigo-500 px-5 rounded-xl text-white cursor-pointer hover:scale-105 transition-all text-xs font-bold shrink-0"
                      >
                        Enlist Checkpoint
                      </button>
                    </form>

                    <div className="space-y-2 max-h-56 overflow-y-auto pr-1">
                      {goals.map(goal => (
                        <div
                          key={goal.id}
                          className="flex items-center justify-between p-3 bg-slate-950/40 border border-white/[0.02] rounded-xl text-xs gap-3 transition-colors hover:bg-slate-950/70"
                        >
                          <div 
                            className="flex items-center gap-2.5 min-w-0 flex-1 cursor-pointer"
                            onClick={() => toggleGoal(goal.id)}
                          >
                            <div className={`w-4.5 h-4.5 rounded-md border flex items-center justify-center transition-all shrink-0 ${
                              goal.completed 
                                ? 'bg-indigo-600 border-indigo-500 text-white' 
                                : 'border-slate-750 hover:border-indigo-400'
                            }`}>
                              {goal.completed && <Check className="w-3 h-3 text-white font-black" />}
                            </div>
                            <span className={`truncate leading-snug font-semibold font-sans text-slate-250 ${goal.completed ? 'line-through text-slate-550' : ''}`}>
                              {goal.text}
                            </span>
                          </div>
                          <button
                            onClick={() => deleteGoal(goal.id)}
                            className="text-slate-400 hover:text-red-400 p-0.5 cursor-pointer shrink-0"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      ))}

                      {goals.length === 0 && (
                        <p className="text-[11px] text-slate-400 italic py-4 text-center">No active checkpoints listed yet. Construct a goal payload above!</p>
                      )}
                    </div>
                  </div>

                  {/* Leaderboards */}
                  <div className="bg-[#13151A]/90 border border-white/[0.04] rounded-2xl p-5 shadow-xl space-y-4 font-display">
                    <div className="flex items-center justify-between">
                      <h3 className="text-sm font-bold text-white flex items-center gap-2">
                        <Trophy className="w-4 h-4 text-amber-400 shrink-0" />
                        Global Quiz Leaderboard Standing
                      </h3>
                      {currentUser ? (
                        <span className="text-[9px] bg-indigo-500/15 text-indigo-400 border border-indigo-500/20 px-2 py-0.5 rounded-full font-extrabold flex items-center gap-1 font-mono">
                          <span className="w-1.5 h-1.5 rounded-full bg-indigo-400 animate-pulse" />
                          CLOUD LIVE
                        </span>
                      ) : (
                        <span className="text-[9px] bg-slate-950/80 text-slate-400 border border-white/[0.03] px-2 py-0.5 rounded-full font-mono font-bold">
                          SANDBOX GUEST
                        </span>
                      )}
                    </div>

                    <p className="text-[11.5px] text-slate-400 leading-relaxed font-semibold font-sans">
                      Cumulative score standing ranks across all online peers synced with Firebase. Perform micro quiz diagnostics to stack up points!
                    </p>

                    {isLeaderboardLoading ? (
                      <div className="flex items-center justify-center py-6 gap-2 text-xs text-slate-400">
                        <span className="w-4 h-4 border-2 border-indigo-500 border-t-transparent rounded-full animate-spin" />
                        <span>Querying global score stats...</span>
                      </div>
                    ) : (
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-2.5 max-h-[380px] overflow-y-auto pr-1">
                        {leaderboard.map((entry, index) => {
                          const isSelf = currentUser && entry.email === currentUser.email;
                          const isGuestSelf = !currentUser && entry.email.includes('(You)');
                          
                          let rankBadge = null;
                          if (index === 0) {
                            rankBadge = <Trophy className="w-3.5 h-3.5 text-amber-400 shrink-0" />;
                          } else if (index === 1) {
                            rankBadge = <Medal className="w-3.5 h-3.5 text-slate-300 shrink-0" />;
                          } else if (index === 2) {
                            rankBadge = <Medal className="w-3.5 h-3.5 text-orange-500 shrink-0" />;
                          } else {
                            rankBadge = <span className="text-[10px] font-bold text-slate-500 font-mono w-4 text-center">#{index + 1}</span>;
                          }

                          return (
                            <div 
                              key={entry.email + index} 
                              className={`flex items-center justify-between p-3 rounded-2xl text-xs gap-3 transition-colors ${
                                isSelf || isGuestSelf
                                  ? 'bg-indigo-950/20 border border-indigo-500/25 shadow-sm' 
                                  : 'bg-slate-950/50 border border-white/[0.02]'
                              }`}
                            >
                              <div className="flex items-center gap-2.5 min-w-0 flex-1">
                                <div className="w-7 h-7 rounded-xl bg-slate-900 border border-white/[0.04] flex items-center justify-center shrink-0">
                                  {rankBadge}
                                </div>
                                <div className="min-w-0 flex-1">
                                  <h4 className={`text-xs font-bold truncate ${isSelf || isGuestSelf ? 'text-indigo-400' : 'text-slate-200'}`} title={entry.email}>
                                    {entry.email.split('@')[0]}
                                  </h4>
                                  <span className="text-[9.5px] text-slate-500 font-medium block font-sans">
                                    {entry.quizzesPlayed} {entry.quizzesPlayed === 1 ? 'quiz' : 'quizzes'} • {entry.streak}d streak
                                  </span>
                                </div>
                              </div>

                              <div className="text-right shrink-0">
                                <span className={`text-xs font-black block ${isSelf || isGuestSelf ? 'text-indigo-400' : 'text-slate-300'}`}>
                                  {entry.totalScore} pts
                                </span>
                                <span className="text-[9px] text-slate-450 block font-sans font-semibold">
                                  {entry.totalQuizQuestions > 0 ? Math.round((entry.totalScore / entry.totalQuizQuestions) * 100) : 0}% acc
                                </span>
                              </div>
                            </div>
                          );
                        })}

                        {leaderboard.length === 0 && (
                          <p className="text-[11px] text-slate-500 italic text-center py-4 col-span-2">No score stats loaded.</p>
                        )}
                      </div>
                    )}
                  </div>

                </div>

              </div>
            </div>
          )}

          {/* ============================================================== */}
          {/* NAV TAB 3: WORKSPACE COMPARTMENTS WITH COMPACT TOP TAB SWAPPER */}
          {/* ============================================================== */}
          {activeNavTab === 'workspace' && (
            <div className="space-y-6 font-display">
              
              {/* COMPACT WORKSPACE MODULE BAR (High Fidelity Swapper inspired by design cards layout) */}
              <div className="flex flex-col sm:flex-row items-stretch sm:items-center bg-[#13151A]/95 p-1 rounded-2xl border border-white/[0.04] shadow-md gap-1">
                <button
                  onClick={() => setActiveTab('summarizer')}
                  className={`flex-1 flex items-center justify-center gap-2 py-3 px-3 rounded-xl text-xs font-bold font-display transition-all cursor-pointer ${
                    activeTab === 'summarizer'
                      ? 'bg-white text-black shadow-lg font-black'
                      : 'text-slate-405 hover:text-white hover:bg-white/[0.02]'
                  }`}
                >
                  <FileText className="w-4 h-4 shrink-0" />
                  <span>Materials Summarizer</span>
                </button>

                <button
                  onClick={() => setActiveTab('homework')}
                  className={`flex-1 flex items-center justify-center gap-2 py-3 px-3 rounded-xl text-xs font-bold font-display transition-all cursor-pointer ${
                    activeTab === 'homework'
                      ? 'bg-white text-black shadow-lg font-black'
                      : 'text-slate-405 hover:text-white hover:bg-white/[0.02]'
                  }`}
                >
                  <GraduationCap className="w-4 h-4 shrink-0" />
                  <span>Assignment Guide</span>
                </button>

                <button
                  onClick={() => {
                    if (activeSummary && activeSummary.quiz) {
                      triggerQuizStart();
                    } else {
                      setActiveTab('quiz');
                    }
                  }}
                  className={`flex-1 flex items-center justify-center gap-2 py-3 px-3 rounded-xl text-xs font-bold font-display transition-all cursor-pointer ${
                    activeTab === 'quiz'
                      ? 'bg-white text-black shadow-lg font-black'
                      : 'text-slate-405 hover:text-white hover:bg-white/[0.02]'
                  }`}
                >
                  <Award className="w-4 h-4 shrink-0" />
                  <span>Practice Tests</span>
                </button>

                <button
                  onClick={() => setActiveTab('flashcards')}
                  className={`flex-1 flex items-center justify-center gap-2 py-3 px-3 rounded-xl text-xs font-bold font-display transition-all cursor-pointer ${
                    activeTab === 'flashcards'
                      ? 'bg-white text-black shadow-lg font-black'
                      : 'text-slate-405 hover:text-white hover:bg-white/[0.02]'
                  }`}
                >
                  <Layers className="w-4 h-4 shrink-0" />
                  <span>Flashcard Glossary</span>
                </button>
              </div>

              {/* QUICK BACK BUTTON TO EXPLORE */}
              <button 
                onClick={() => setActiveNavTab('explore')}
                className="cursor-pointer inline-flex items-center gap-1 text-[11px] font-bold text-slate-400 hover:text-white bg-white/[0.02] border border-white/[0.03] hover:border-white/[0.07] px-3.5 py-1.5 rounded-full transition-all font-sans"
              >
                <ChevronLeft className="w-3.5 h-3.5" />
                <span>Return to Explore Hub</span>
              </button>

            </div>
          )}

          {/* TAB 2: COURSE MATERIALS SUMMARIZER */}
          {activeNavTab === 'workspace' && activeTab === 'summarizer' && (
            <div className="space-y-6">
              
              <div className="border-b border-slate-800 pb-4 space-y-1">
                <h2 className="text-2xl font-extrabold text-white tracking-tight">Three-Way Course Materials Summarizer</h2>
                <p className="text-xs text-slate-400">
                  Compile lecture guides utilizing multiple ingestion channels coupled directly to Gemini reasoning.
                </p>
              </div>

              {/* THREE TAB CHANNEL INGEST BOX */}
              <div className="bg-[#0B0F19]/40 backdrop-blur-md border border-slate-800 rounded-2xl p-5 shadow-2xl space-y-4">
                
                {/* Visual tabs select */}
                <div className="flex border-b border-slate-800 pb-2">
                  <div className="flex gap-2">
                    <button
                      onClick={() => { setSummaryInputType('paste'); setSummarizerError(''); }}
                      className={`cursor-pointer px-4 py-2 rounded-xl text-xs font-bold transition-all ${
                        summaryInputType === 'paste'
                          ? 'bg-slate-900 text-white border border-slate-800'
                          : 'text-slate-400 hover:text-white'
                      }`}
                    >
                      Paste Raw Transcript
                    </button>
                    
                    <button
                      onClick={() => { setSummaryInputType('file'); setSummarizerError(''); }}
                      className={`cursor-pointer px-4 py-2 rounded-xl text-xs font-bold transition-all ${
                        summaryInputType === 'file'
                          ? 'bg-slate-900 text-white border border-slate-800'
                          : 'text-slate-400 hover:text-white'
                      }`}
                    >
                      Upload text file
                    </button>

                    <button
                      onClick={() => { setSummaryInputType('url'); setSummarizerError(''); }}
                      className={`cursor-pointer px-4 py-2 rounded-xl text-xs font-bold transition-all ${
                        summaryInputType === 'url'
                          ? 'bg-slate-900 text-white border border-slate-800'
                          : 'text-slate-400 hover:text-white'
                      }`}
                    >
                      Lecture Notes Link
                    </button>
                  </div>
                </div>

                {/* Sub panels */}
                <div>
                  
                  {/* Sub Panel 1: Paste Text */}
                  {summaryInputType === 'paste' && (
                    <div className="space-y-4">
                      <div className="flex justify-between items-center">
                        <span className="text-xs text-slate-400">Paste your raw lecture transcript file or session notes:</span>
                        <button
                          onClick={() => {
                            setPastedText(DEMO_TRANSCRIPT);
                            setSummarizerError('');
                          }}
                          className="text-xs text-indigo-400 hover:text-indigo-300 font-bold flex items-center gap-1 cursor-pointer bg-slate-900/50 hover:bg-slate-900 px-3 py-1 rounded shadow"
                        >
                          <Sparkles className="w-3.5 h-3.5 animate-bounce" />
                          <span>Load Quantum Lectures Transcript Demo</span>
                        </button>
                      </div>
                      <textarea
                        rows={10}
                        placeholder="Paste lecture transcript points, discussion matrices, or professor outline text here..."
                        value={pastedText}
                        onChange={(e) => setPastedText(e.target.value)}
                        className="bg-slate-950 text-xs text-slate-300 border border-slate-800/80 rounded-xl leading-relaxed p-4 w-full outline-none focus:border-indigo-500 mt-1 font-mono autoflow-scroll"
                      />
                    </div>
                  )}

                  {/* Sub Panel 2: File upload */}
                  {summaryInputType === 'file' && (
                    <div className="space-y-4">
                      <div
                        onDragOver={(e) => e.preventDefault()}
                        onDrop={handleFileDrop}
                        className="border-2 border-dashed border-slate-850 hover:border-indigo-500/80 rounded-2xl p-8 text-center space-y-3 bg-slate-950/20 transition-all cursor-pointer relative"
                      >
                        <input
                          type="file"
                          accept=".txt,.csv"
                          onChange={handleFileChange}
                          className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                        />
                        <FileUp className="w-10 h-10 text-indigo-400 mx-auto" />
                        <div>
                          <p className="text-xs font-extrabold text-white">Drag or Click to Choose lecture file from system</p>
                          <p className="text-[10px] text-slate-450 mt-1">Accepts raw standard text formats (.txt, .csv) under 2MB length bounds</p>
                        </div>
                      </div>

                      {uploadedFileName && (
                        <div className="bg-slate-950 border border-slate-800/85 px-4 py-2.5 rounded-xl flex items-center justify-between text-xs">
                          <span className="grow truncate text-slate-300">{uploadedFileName}</span>
                          <span className="text-[10px] text-[#22c55e] ml-2 font-bold uppercase shrink-0">Ready ({uploadedFileContent.length} chars)</span>
                        </div>
                      )}
                    </div>
                  )}

                  {/* Sub Panel 3: URL notes link */}
                  {summaryInputType === 'url' && (
                    <div className="space-y-4">
                      <span className="text-xs text-slate-400 block">Link to lecture notes or transcript notes webpage:</span>
                      <div className="flex gap-2">
                        <div className="relative w-full">
                          <Link2 className="w-4 h-4 text-indigo-400 absolute left-3 top-3.5" />
                          <input
                            type="url"
                            placeholder="https://example-university.edu/lectures/quantum-mechanics-basics.html"
                            value={lectureUrl}
                            onChange={(e) => setLectureUrl(e.target.value)}
                            className="bg-slate-950 text-xs border border-slate-850 rounded-xl pl-9 pr-4 py-3 outline-none focus:border-indigo-500 w-full leading-snug"
                          />
                        </div>
                        <button
                          onClick={() => setLectureUrl('https://mit-physics.edu/notes/electromagnetism-intro.html')}
                          className="bg-slate-900 border border-slate-800 text-slate-300 text-xs px-3.5 rounded-xl cursor-pointer hover:bg-slate-800/50"
                        >
                          Fill Demo
                        </button>
                      </div>
                      <p className="text-[10px] text-slate-450">Note: The system will securely download the web document. If blocked by secure restrictions, Study Genius automatically generates highly customized academic lecture guides based on the URL topic segments!</p>
                    </div>
                  )}

                </div>

                {summarizerError && (
                  <div className="bg-red-950/20 border border-red-900/40 p-3.5 rounded-xl text-xs text-red-400 font-semibold">
                    {summarizerError}
                  </div>
                )}

                {/* Submitting blocks */}
                <div className="flex justify-end pt-2">
                  <button
                    onClick={executeSummarize}
                    disabled={isSummarizing}
                    className="cursor-pointer bg-indigo-600 hover:bg-indigo-500 disabled:bg-slate-700 disabled:cursor-not-allowed scale-hover text-white text-xs font-bold px-6 py-2.5 rounded-xl transition-all shadow-md shadow-indigo-600/10 flex items-center gap-2"
                  >
                    {isSummarizing ? (
                      <>
                        <RotateCw className="w-3.5 h-3.5 animate-spin" />
                        <span>Analyzing with Gemini AI models...</span>
                      </>
                    ) : (
                      <>
                        <Sparkles className="w-3.5 h-3.5" />
                        <span>Synthesize Study Bundle</span>
                      </>
                    )}
                  </button>
                </div>

              </div>

              {/* SKELETON LOADER SCREEN DURING PROCESS */}
              {isSummarizing && (
                <div className="bg-[#0B0F19]/40 border border-slate-800 rounded-2xl p-6.5 space-y-4 shadow-xl animate-pulse">
                  <div className="h-6 bg-slate-800 rounded w-1/3" />
                  <div className="h-4 bg-slate-800 rounded w-2/3" />
                  <div className="space-y-3 pt-4">
                    <div className="h-4 bg-slate-850 rounded" />
                    <div className="h-4 bg-slate-850 rounded w-5/6" />
                    <div className="h-4 bg-slate-850 rounded w-4/5" />
                  </div>
                  <div className="h-5 bg-indigo-900/10 rounded w-1/2 pt-5" />
                </div>
              )}

              {/* COMPLETED PARSED SUMMARY PREVIEW */}
              {activeSummary && !isSummarizing && (
                <div className="space-y-6">
                  
                  {/* Summary Core information Card */}
                  <div className="bg-[#0b0f19]/60 backdrop-blur-md border border-slate-800 rounded-3xl p-6.5 shadow-2xl space-y-3">
                    <div className="flex justify-between items-start gap-3 flex-wrap">
                      <h3 className="text-xl font-extrabold text-white">{activeSummary.title}</h3>
                      <button
                        onClick={triggerQuizStart}
                        className="bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold px-4 py-2 rounded-xl transition-all scale-hover cursor-pointer flex items-center gap-1.5"
                      >
                        <Zap className="w-3.5 h-3.5" />
                        Take Practice Diagnostic Test
                      </button>
                    </div>
                    <p className="text-slate-300 text-xs md:text-sm leading-relaxed max-w-4xl bg-slate-950/40 p-4 border border-slate-850 rounded-2xl">{activeSummary.summaryText}</p>
                  </div>

                  {/* Chapters details list directory */}
                  <div className="space-y-4">
                    <h3 className="text-sm font-bold uppercase tracking-widest text-slate-500">Structured Lesson Chapters</h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      {activeSummary.chapters.map((chap, cIdx) => (
                        <div key={cIdx} className="bg-slate-900/40 border border-slate-800/80 rounded-2xl p-5 shadow-lg space-y-3">
                          <h4 className="text-sm font-bold text-indigo-300 flex items-center gap-2">
                            <span className="text-[10px] bg-indigo-500/10 text-indigo-400 border border-indigo-500/25 px-1.5 py-0.5 rounded font-mono">
                              0{cIdx + 1}
                            </span>
                            {chap.title}
                          </h4>
                          
                          <ul className="space-y-1.5 text-xs text-slate-350 list-disc pl-4 leading-normal">
                            {chap.outline.map((out, oIdx) => (
                              <li key={oIdx}>{parseInlineFormatting(out)}</li>
                            ))}
                          </ul>

                          {chap.takeaways && (
                            <div className="bg-slate-950/70 p-3 rounded-xl border border-slate-850 space-y-1 mt-2">
                              <span className="text-[9px] font-bold uppercase tracking-wider text-indigo-400 flex items-center gap-1">
                                <Lightbulb className="w-3 h-3" />
                                Chapter Takeaway
                              </span>
                              <p className="text-[11px] text-slate-300 leading-normal">{parseInlineFormatting(chap.takeaways)}</p>
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>

                </div>
              )}

            </div>
          )}

          {/* TAB 3: COGNITIVE ASSIGNMENT SOLUTIONS SOLVER */}
          {activeTab === 'homework' && (
            <div className="space-y-6">
              
              <div className="border-b border-slate-800 pb-4 space-y-1">
                <h2 className="text-2xl font-extrabold text-white tracking-tight">Cognitive Assignment Guide & Solutions</h2>
                <p className="text-xs text-slate-400">
                  Compile step-by-step step-derivations or conceptual outline insights for complex problem homework sets.
                </p>
              </div>

              {/* INPUT FORM BLOCK */}
              <div className="bg-[#0B0F19]/40 backdrop-blur-md border border-slate-800 rounded-2xl p-5 shadow-2xl space-y-4">
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <label className="text-xs font-extrabold text-white">Problem Sheet Name / Title:</label>
                    <input
                      type="text"
                      placeholder="E.g., Problem Set 4: Electromagnetism Integration Bounds"
                      value={assignmentTitle}
                      onChange={(e) => setAssignmentTitle(e.target.value)}
                      className="bg-slate-950 text-xs border border-slate-800 rounded-xl px-3.5 py-3 outline-none focus:border-indigo-500 text-slate-300 w-full"
                    />
                  </div>

                  {/* Preset stylistic chips */}
                  <div className="space-y-1.5">
                    <label className="text-xs font-extrabold text-white block">Instructions Model Config Tuning:</label>
                    <div className="flex flex-wrap gap-2 text-[11px] mt-1">
                      
                      <button
                        onClick={() => setAssignmentStyle('reasoner')}
                        className={`cursor-pointer px-3.5 py-2.5 rounded-xl font-bold flex items-center gap-1.5 border transition-all ${
                          assignmentStyle === 'reasoner'
                            ? 'bg-indigo-500/10 border-indigo-500 text-indigo-300'
                            : 'bg-slate-950/80 border-slate-850 text-slate-400'
                        }`}
                      >
                        <Sparkles className="w-3.5 h-3.5" />
                        <span>Reasoner Deconstruction</span>
                      </button>

                      <button
                        onClick={() => setAssignmentStyle('math')}
                        className={`cursor-pointer px-3.5 py-2.5 rounded-xl font-bold flex items-center gap-1.5 border transition-all ${
                          assignmentStyle === 'math'
                            ? 'bg-[#10191F] border-emerald-500/70 text-emerald-400'
                            : 'bg-slate-950/80 border-slate-850 text-slate-400'
                        }`}
                      >
                        <span className="font-mono text-xs">$</span>
                        <span>Structured LaTeX Mathematics</span>
                      </button>

                      <button
                        onClick={() => setAssignmentStyle('code')}
                        className={`cursor-pointer px-3.5 py-2.5 rounded-xl font-bold flex items-center gap-1.5 border transition-all ${
                          assignmentStyle === 'code'
                            ? 'bg-[#101726]/80 border-indigo-400/80 text-indigo-300'
                            : 'bg-slate-950/80 border-slate-850 text-slate-400'
                        }`}
                      >
                        <span className="font-mono">&lt;/&gt;</span>
                        <span>Logic Algorithm Code</span>
                      </button>

                      <button
                        onClick={() => setAssignmentStyle('outline')}
                        className={`cursor-pointer px-3.5 py-2.5 rounded-xl font-bold flex items-center gap-1.5 border transition-all ${
                          assignmentStyle === 'outline'
                            ? 'bg-slate-900 border-slate-800 text-slate-300'
                            : 'bg-slate-950/80 border-slate-850 text-slate-400'
                        }`}
                      >
                        <span className="font-serif italic font-bold">O</span>
                        <span>Scannable Fast Outline</span>
                      </button>

                    </div>
                  </div>
                </div>

                <div className="space-y-1.5">
                  <div className="flex justify-between items-center text-xs">
                    <label className="font-extrabold text-white">Questions & Specifications Block:</label>
                    <button
                      onClick={() => {
                        setAssignmentTitle("Assignment 2: Recursive Complexities");
                        setAssignmentQuestions("Question 1: Given recurrence relation T(N) = T(N-1) + T(N/2), trace the execution flow and calculate upper bounds using asymptotic notations.\nQuestion 2: Draw an algorithmic matrix flowchart mapping optimal binary partitions.");
                        setSolverError('');
                      }}
                      className="text-xs text-indigo-400 hover:text-indigo-300 font-bold cursor-pointer"
                    >
                      Fill Demo Algorithm Homework Set
                    </button>
                  </div>
                  <textarea
                    rows={8}
                    placeholder="E.g., Trace binary merge partitions. Show that worst-case comparisons evaluate strictly to O(N log N) bounds..."
                    value={assignmentQuestions}
                    onChange={(e) => setAssignmentQuestions(e.target.value)}
                    className="bg-slate-950 text-xs text-slate-350 border border-slate-800 rounded-xl leading-relaxed p-4 w-full outline-none focus:border-indigo-500 font-mono autoflow-scroll"
                  />
                </div>

                {solverError && (
                  <div className="bg-red-950/20 border border-red-900/40 p-3.5 rounded-xl text-xs text-red-400 font-semibold">
                    {solverError}
                  </div>
                )}

                {/* Submit button */}
                <div className="flex justify-end">
                  <button
                    onClick={executeSolve}
                    disabled={isSolving}
                    className="cursor-pointer bg-indigo-600 hover:bg-indigo-500 disabled:bg-slate-700 disabled:cursor-not-allowed text-white text-xs font-bold px-6 py-2.5 rounded-xl scale-hover flex items-center gap-2 transition-all shadow-md"
                  >
                    {isSolving ? (
                      <>
                        <RotateCw className="w-3.5 h-3.5 animate-spin" />
                        <span>Computing solutions payload...</span>
                      </>
                    ) : (
                      <>
                        <Sparkles className="w-3.5 h-3.5" />
                        <span>Synthesize Pedagogical Solution Guide</span>
                      </>
                    )}
                  </button>
                </div>

              </div>

              {/* DETAILED PEDAGOGICAL DYNAMIC PROGRESS PANEL */}
              {isSolving && (
                <div className="bg-indigo-950/10 border border-indigo-900/30 rounded-2xl p-5 shadow-lg flex items-center gap-4 animate-pulse">
                  <RotateCw className="w-5 h-5 text-indigo-400 animate-spin shrink-0" />
                  <div>
                    <span className="text-xs font-bold uppercase tracking-wider text-slate-400 block">Workspace Analysis Status</span>
                    <span className="text-[13px] font-extrabold text-white">{solvingStage}</span>
                  </div>
                </div>
              )}

              {/* RENDER CURRENT RE-SOLVED OUTPUT */}
              {currentSolution && !isSolving && (
                <div className="bg-[#0b0f19]/60 border border-slate-800 rounded-2xl p-6.5 shadow-2xl">
                  <div className="flex justify-between items-center pb-3 border-b border-indigo-950 mb-4 flex-wrap gap-2">
                    <div>
                      <span className="text-[10px] bg-indigo-500/10 text-indigo-400 border border-indigo-500/25 px-2 py-0.5 rounded font-bold uppercase tracking-wider">Solutions Complete</span>
                      <h3 className="text-md font-extrabold text-white mt-1">Compiled Guide Details</h3>
                    </div>
                    <span className="text-xs text-slate-450">Tuned Style: {styleLabel(assignmentStyle)}</span>
                  </div>
                  
                  {/* Markdown reader */}
                  <div className="max-w-none prose prose-invert prose-sm">
                    {renderMarkdown(currentSolution)}
                  </div>
                </div>
              )}

              {/* HISTORIC SAVED LIST SOLUTIONS GUIDE */}
              {assignments.filter(a => a.courseName === activeCourse).length > 0 && (
                <div className="space-y-4">
                  <h3 className="text-sm font-bold uppercase tracking-widest text-slate-500">Workspace Solutions Guides Directory</h3>
                  
                  <div className="space-y-4">
                    {assignments
                      .filter(a => a.courseName === activeCourse)
                      .map((asg) => (
                        <div key={asg.id} className="bg-[#0b0f19]/40 border border-slate-800 rounded-2xl p-5 shadow-lg space-y-3">
                          <div className="flex justify-between items-start gap-4 flex-wrap border-b border-slate-950 pb-2">
                            <div>
                              <h4 className="text-sm font-bold text-white">{asg.title}</h4>
                              <p className="text-[9px] text-slate-500 mt-0.5">Created on {asg.createdAt} • Tuning Mode: {styleLabel(asg.style)}</p>
                            </div>
                            <button
                              onClick={() => {
                                if (confirm("Remove solutions guide from index directory?")) {
                                  const filtered = assignments.filter(a => a.id !== asg.id);
                                  setAssignments(filtered);
                                  saveAssignmentsToStorage(filtered);
                                }
                              }}
                              className="text-slate-500 hover:text-red-400 hover:bg-slate-850 p-1 rounded transition-colors cursor-pointer"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>

                          <div className="bg-[#070A13] border border-slate-850 px-3.5 py-2 rounded-xl text-xs space-y-1">
                            <span className="text-[10px] uppercase font-bold text-slate-500 tracking-wider">Original Homework Question Details</span>
                            <p className="text-slate-350 italic truncate">{asg.questions}</p>
                          </div>

                          <div className="bg-[#090E1A] p-4 rounded-xl border border-slate-850 prose prose-invert prose-xs max-h-96 overflow-y-auto">
                            {renderMarkdown(asg.solution)}
                          </div>
                        </div>
                      ))}
                  </div>
                </div>
              )}

            </div>
          )}

          {/* TAB 4: ACTIVE TEST PREP COMPLY QUIZ ENGINE */}
          {activeTab === 'quiz' && (
            <div className="space-y-6">
              
              <div className="border-b border-slate-800 pb-4 space-y-1">
                <h2 className="text-2xl font-extrabold text-white tracking-tight">Active Test Prep & Quiz Engine</h2>
                <p className="text-xs text-slate-400">
                  Assess conceptual depth with multiple choice questions parsed natively from your summaries.
                </p>
              </div>

              {activeQuizQuestions.length > 0 ? (
                <div className="max-w-2xl mx-auto space-y-4">
                  
                  {/* Progress Indicator */}
                  <div className="flex justify-between items-center text-xs text-slate-400 px-1">
                    <span>Question {currentQuizIndex + 1} of {activeQuizQuestions.length}</span>
                    <span>Correct Score Metrics: {quizScore} Completed</span>
                  </div>

                  {/* Progress scale */}
                  <div className="w-full bg-slate-900 h-2 rounded-full overflow-hidden">
                    <div
                      className="bg-indigo-500 h-full transition-all duration-300"
                      style={{ width: `${((currentQuizIndex + (quizCompleted ? 1 : 0)) / activeQuizQuestions.length) * 100}%` }}
                    />
                  </div>

                  {/* QUIZ COMPLETED FINAL SCREEN */}
                  {quizCompleted ? (
                    <div className="bg-[#0b0f19]/60 border border-slate-850 rounded-3xl p-8 shadow-2xl text-center space-y-6">
                      <div className="w-16 h-16 rounded-full bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center mx-auto text-emerald-400 shadow-lg shadow-emerald-500/5">
                        <Award className="w-8 h-8" />
                      </div>
                      
                      <div className="space-y-2">
                        <h3 className="text-2xl font-extrabold text-white">Assessment Evaluated Complete!</h3>
                        <p className="text-slate-400 text-sm max-w-sm mx-auto">Excellent revision metrics. Correct answering counts logged securely inside diagnostic history.</p>
                      </div>

                      <div className="bg-[#070A13] border border-slate-800 p-4 rounded-2xl max-w-xs mx-auto">
                        <span className="text-[10px] text-slate-500 font-bold uppercase block">Revision Index Score</span>
                        <span className="text-3xl font-extrabold text-emerald-400 block">{quizScore} / {activeQuizQuestions.length}</span>
                        <span className="text-[10px] text-emerald-500/80 bg-emerald-500/10 border border-emerald-500/25 px-2 py-0.5 rounded-full inline-block mt-2">
                          +{quizScore * 10} XP Streak Multiplier
                        </span>
                      </div>

                      <div className="flex justify-center gap-3 pt-2">
                        <button
                          onClick={() => {
                            setQuizCompleted(false);
                            setCurrentQuizIndex(0);
                            setSelectedQuizOption(null);
                            setQuizSubmitted(false);
                            setQuizScore(0);
                          }}
                          className="bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold px-5 py-2 rounded-xl transition-all scale-hover cursor-pointer"
                        >
                          Retry Practice Exam
                        </button>
                        <button
                          onClick={() => setActiveTab('dashboard')}
                          className="bg-slate-900 hover:bg-slate-800 text-slate-300 text-xs font-bold px-5 py-2 border border-slate-800 rounded-xl transition-all cursor-pointer"
                        >
                          Return to Hub
                        </button>
                      </div>
                    </div>
                  ) : (
                    
                    /* ACTIVE QUESTION CARD LAYOUT */
                    <div className="bg-[#0b0f19]/60 border border-slate-800 rounded-3xl p-6.5 shadow-2xl space-y-5">
                      
                      <h3 className="text-md md:text-lg font-bold text-white leading-relaxed">
                        {activeQuizQuestions[currentQuizIndex].question}
                      </h3>

                      {/* Options listing */}
                      <div className="space-y-3">
                        {activeQuizQuestions[currentQuizIndex].options.map((opt, oIdx) => {
                          const isSelected = selectedQuizOption === oIdx;
                          const isCorrect = oIdx === activeQuizQuestions[currentQuizIndex].correctIndex;
                          
                          let optionStyle = "border-slate-850 hover:bg-slate-900/30 text-slate-300 bg-slate-950/40";
                          if (isSelected && !quizSubmitted) {
                            optionStyle = "border-indigo-500 bg-indigo-950/20 text-indigo-300 ring-2 ring-indigo-500/25";
                          } else if (quizSubmitted) {
                            if (isCorrect) {
                              optionStyle = "border-[#22c55e] bg-emerald-950/20 text-[#22c55e] ring-2 ring-[#22c55e]/30 shadow-emerald-500/10 shadow-lg";
                            } else if (isSelected) {
                              optionStyle = "border-[#ef4444] bg-red-950/20 text-[#ef4444] ring-2 ring-[#ef4444]/30";
                            } else {
                              optionStyle = "border-slate-850 text-slate-500 bg-slate-950/10 opacity-60";
                            }
                          }

                          return (
                            <button
                              key={oIdx}
                              disabled={quizSubmitted}
                              onClick={() => setSelectedQuizOption(oIdx)}
                              className={`w-full text-left p-4 rounded-xl text-xs sm:text-sm font-semibold border leading-snug cursor-pointer transition-all ${optionStyle}`}
                            >
                              <div className="flex items-start gap-3">
                                <span className="bg-slate-900 text-slate-400 text-[10px] px-1.5 py-0.5 rounded font-mono mt-0.5 shadow">
                                  {String.fromCharCode(65 + oIdx)}
                                </span>
                                <span>{opt}</span>
                              </div>
                            </button>
                          );
                        })}
                      </div>

                      {/* FEEDBACK EXPLANATION PANEL */}
                      {quizSubmitted && (
                        <div className="bg-[#0B0F19] border border-indigo-950/30 p-4.5 rounded-2xl space-y-2 animate-fade-in">
                          <span className="text-[10px] font-bold text-indigo-400 uppercase tracking-widest block">Pedagogical Verification Explanation</span>
                          <p className="text-xs text-slate-300 leading-normal">{activeQuizQuestions[currentQuizIndex].explanation}</p>
                        </div>
                      )}

                      {/* Controls submission */}
                      <div className="flex justify-end pt-2 border-t border-slate-900/60">
                        {!quizSubmitted ? (
                          <button
                            onClick={submitQuizAnswer}
                            disabled={selectedQuizOption === null}
                            className="bg-indigo-600 hover:bg-indigo-500 disabled:bg-slate-700 disabled:cursor-not-allowed text-white text-xs font-bold px-6 py-2.5 rounded-xl scale-hover cursor-pointer"
                          >
                            Verify Answer
                          </button>
                        ) : (
                          <button
                            onClick={advanceQuiz}
                            className="bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold px-6 py-2.5 rounded-xl scale-hover flex items-center gap-1.5 cursor-pointer"
                          >
                            <span>
                              {currentQuizIndex + 1 === activeQuizQuestions.length ? 'Evaluate Results' : 'Next Diagnostic Point'}
                            </span>
                            <ChevronRight className="w-4 h-4" />
                          </button>
                        )}
                      </div>

                    </div>
                  )}

                </div>
              ) : (
                
                /* EMPTY STATE QUIZ ENGINE */
                <div className="max-w-md mx-auto text-center py-10 border border-dashed border-slate-800 rounded-2xl bg-slate-950/10 space-y-4">
                  <HelpCircle className="w-12 h-12 text-slate-600 mx-auto" />
                  <div className="space-y-1">
                    <h3 className="text-md font-bold text-white">No Practice Materials Ready</h3>
                    <p className="text-xs text-slate-405 leading-relaxed max-w-xs mx-auto">Go to the Course Materials module and generate a summary first. Multiple-choice test assessments are constructed programmatically from the summaries compile.</p>
                  </div>
                  <button
                    onClick={() => setActiveTab('summarizer')}
                    className="bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold px-5 py-2 rounded-xl transition-all cursor-pointer"
                  >
                    Synthesize Lecture Summary
                  </button>
                </div>
              )}

            </div>
          )}

          {/* TAB 5: FLASHCARD TERMINOLOGY CAROUSEL */}
          {activeTab === 'flashcards' && (
            <div className="space-y-6">
              
              <div className="border-b border-slate-800 pb-4 space-y-1">
                <h2 className="text-2xl font-extrabold text-white tracking-tight">Interactive Terminology Flashcards Carousel</h2>
                <p className="text-xs text-slate-405">
                  Review lesson key terms utilizing dual-sided 3D flipping animation blocks.
                </p>
              </div>

              {activeSummary && activeSummary.flashcards && activeSummary.flashcards.length > 0 ? (
                <div className="max-w-lg mx-auto space-y-6 select-none">
                  
                  {/* Position track */}
                  <div className="flex justify-between items-center text-xs text-slate-400 font-semibold px-2">
                    <span>Active Deck: {activeCourse}</span>
                    <span className="text-[10px] text-indigo-400/80 font-medium select-none animate-pulse">
                      ← Swipe left/right to browse →
                    </span>
                    <span>Term {currentFlashcardIndex + 1} of {activeSummary.flashcards.length}</span>
                  </div>

                  {/* ROTATING 3D COMPONENT WITH PERSPECTIVE */}
                  <div
                    onTouchStart={handleFlashcardTouchStart}
                    onTouchMove={handleFlashcardTouchMove}
                    onTouchEnd={() => handleFlashcardTouchEnd(activeSummary.flashcards.length)}
                    onClick={handleFlashcardClick}
                    className="w-full h-80 perspective-1000 cursor-pointer relative touch-pan-y"
                    style={{
                      transform: `translateX(${swipeOffset}px) rotate(${swipeOffset * 0.04}deg)`,
                      transition: touchStartX.current === null ? 'transform 0.3s cubic-bezier(0.175, 0.885, 0.32, 1.275)' : 'none'
                    }}
                  >
                    <div
                      className={`w-full h-full relative duration-500 transform-style-3d transition-transform ${
                        isFlashcardFlipped ? 'rotate-y-180' : ''
                      }`}
                    >
                      {/* CARD FRONT SIDE */}
                      <div className="absolute inset-0 bg-gradient-to-br from-slate-900 to-[#0F1527] border-2 border-slate-800/80 rounded-3xl p-6.5 flex flex-col justify-between shadow-2xl backface-hidden">
                        <div className="flex justify-between items-center">
                          <span className="text-[10px] font-bold uppercase tracking-widest text-[#6366f1] bg-[#6366f1]/10 px-2.5 py-1 rounded">Glossary Card</span>
                          <span className="text-[10px] font-mono text-slate-500">ID: SG_TERM_{currentFlashcardIndex + 1}</span>
                        </div>
                        
                        <div className="text-center space-y-3">
                          <h3 className="text-xl md:text-2xl font-black text-white tracking-tight leading-snug px-4">
                            {activeSummary.flashcards[currentFlashcardIndex].term}
                          </h3>
                          <span className="text-[10px] text-slate-400 uppercase tracking-widest bg-slate-950 px-2 py-0.5 rounded-full inline-block">Click to Reveal Definition</span>
                        </div>

                        <div className="flex justify-between items-center text-[10px] text-slate-500">
                          <span>Study Genius Cockpit</span>
                          <span>Double-Sided 3D Flip Active</span>
                        </div>
                      </div>

                      {/* CARD BACK SIDE */}
                      <div className="absolute inset-0 bg-gradient-to-br from-slate-900 via-[#10192D] to-slate-900 border-2 border-[#6366f1]/40 rounded-3xl p-6 flex flex-col justify-between shadow-2xl rotate-y-180 backface-hidden overflow-y-auto">
                        <div className="flex justify-between items-center border-b border-indigo-950 pb-2 shrink-0">
                          <span className="text-[10px] font-bold uppercase tracking-widest text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded">Decoded Definition</span>
                          <span className="text-[10px] font-semibold text-slate-450">Vocabulary System</span>
                        </div>

                        <div className="my-auto py-3 space-y-3.5 leading-relaxed">
                          <p className="text-xs md:text-sm text-slate-100 font-medium">
                            {parseInlineFormatting(activeSummary.flashcards[currentFlashcardIndex].definition)}
                          </p>

                          {activeSummary.flashcards[currentFlashcardIndex].example && (
                            <div className="bg-[#070A13] p-3 rounded-xl border border-slate-850 space-y-1">
                              <span className="text-[9px] uppercase tracking-wider text-[#6366f1] font-bold block">Illustrative Example</span>
                              <p className="text-[11px] text-slate-350 italic">{parseInlineFormatting(activeSummary.flashcards[currentFlashcardIndex].example)}</p>
                            </div>
                          )}
                        </div>

                        <div className="flex justify-between items-center text-[10px] text-slate-450 border-t border-indigo-950 pt-2 shrink-0">
                          <span>Click to Flip Card Back</span>
                          <span className="text-emerald-400 font-bold uppercase text-[9px]">Verified Correct</span>
                        </div>
                      </div>

                    </div>
                  </div>

                  {/* CONTROLS BAR */}
                  <div className="flex justify-between items-center gap-4 bg-[#0B0F19]/60 border border-slate-800 p-3 rounded-2xl shadow-xl">
                    <button
                      onClick={() => {
                        setIsFlashcardFlipped(false);
                        setCurrentFlashcardIndex(prev => (prev === 0 ? activeSummary.flashcards.length - 1 : prev - 1));
                      }}
                      className="cursor-pointer bg-slate-900 border border-slate-800 hover:bg-slate-800 p-2.5 rounded-xl text-slate-300 transition-all flex items-center justify-center grow"
                    >
                      <ChevronLeft className="w-4.5 h-4.5" />
                    </button>
                    
                    <button
                      onClick={() => setIsFlashcardFlipped(!isFlashcardFlipped)}
                      className="cursor-pointer bg-[#12182F] hover:bg-indigo-950/40 border border-indigo-900/40 text-indigo-300 text-xs font-bold px-6 py-2.5 rounded-xl transition-all grow text-center"
                    >
                      Flip Card
                    </button>

                    <button
                      onClick={() => {
                        setIsFlashcardFlipped(false);
                        setCurrentFlashcardIndex(prev => (pIdx => (pIdx + 1 === activeSummary.flashcards.length ? 0 : pIdx + 1))(prev));
                      }}
                      className="cursor-pointer bg-slate-900 border border-slate-800 hover:bg-slate-800 p-2.5 rounded-xl text-slate-300 transition-all flex items-center justify-center grow"
                    >
                      <ChevronRight className="w-4.5 h-4.5" />
                    </button>
                  </div>

                </div>
              ) : (
                
                /* EMPTY STATE CARD CAROUSEL */
                <div className="max-w-md mx-auto text-center py-10 border border-dashed border-slate-800 rounded-2xl bg-slate-950/10 space-y-4">
                  <HelpCircle className="w-12 h-12 text-slate-600 mx-auto" />
                  <div className="space-y-1">
                    <h3 className="text-md font-bold text-white">No Vocabulary Glossary Cards</h3>
                    <p className="text-xs text-slate-405 leading-relaxed max-w-xs mx-auto">Go to the Course Materials module and compile summaries. Terminology flashcard decks are extracted from those summaries automatically!</p>
                  </div>
                  <button
                    onClick={() => setActiveTab('summarizer')}
                    className="bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold px-5 py-2 rounded-xl transition-all cursor-pointer"
                  >
                    Compile Lecture Notes
                  </button>
                </div>
              )}

            </div>
          )}

        </main>

        {/* PERSISTENT ACCESSIBLE SIDE CHAT COMPANION GLASS DRAWER */}
        <aside
          className={`shrink-0 border-l border-slate-850/60 bg-[#080D1A]/95 backdrop-blur-md shadow-2xl transition-all duration-300 flex flex-col z-35 fixed md:static right-0 top-0 h-full md:h-auto ${
            isChatOpen ? 'w-full xs:w-85 md:w-96' : 'w-0 pointer-events-none opacity-0 border-l-0'
          }`}
        >
          {/* Drawer Header */}
          <div className="p-4 border-b border-slate-800/80 flex justify-between items-center bg-[#0B0F19]">
            <div className="flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-indigo-400 animate-spin" />
              <div>
                <h3 className="text-xs font-bold text-white uppercase tracking-wider">AI Study Companion</h3>
                <span className="text-[10px] text-slate-400 mt-0.5 block">Context: {activeCourse} Cockpit</span>
              </div>
            </div>
            <button
              onClick={() => setIsChatOpen(false)}
              className="p-1 rounded text-slate-400 hover:text-white hover:bg-slate-850 cursor-pointer"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          {/* Quick recommendations panel */}
          <div className="p-3 bg-slate-950/40 border-b border-slate-900 shrink-0 space-y-2 select-none">
            <span className="text-[10px] font-bold text-indigo-400 tracking-wider uppercase block">Contextual Quick Prompts</span>
            <div className="flex flex-wrap gap-1.5">
              <button
                onClick={() => executeChat(`Explain the core terms of the ${activeCourse} chapter in three simple sentences.`)}
                className="text-[10px] bg-slate-900 border border-slate-800/70 hover:bg-indigo-950/40 text-indigo-300 font-semibold px-2 py-1 rounded cursor-pointer leading-tight text-left"
              >
                "Simplify chapter"
              </button>
              
              <button
                onClick={() => executeChat(`Give me an analogies guide detailing the primary biochemistry concepts in ${activeCourse}.`)}
                className="text-[10px] bg-slate-900 border border-slate-800/70 hover:bg-indigo-950/40 text-indigo-300 font-semibold px-2 py-1 rounded cursor-pointer leading-tight text-left"
              >
                "Give me analogy"
              </button>

              <button
                onClick={() => executeChat(`Construct a robust 5-day study timeline cycle organized specifically for active topics in ${activeCourse}.`)}
                className="text-[10px] bg-slate-900 border border-slate-800/70 hover:bg-indigo-950/40 text-indigo-300 font-semibold px-2 py-1 rounded cursor-pointer leading-tight text-left"
              >
                "Create 5-day cycle calendar"
              </button>
            </div>
          </div>

          {/* Chat feed list */}
          <div className="flex-1 overflow-y-auto p-4 space-y-4">
            {chatHistory.map((item, index) => (
              <div
                key={index}
                className={`flex gap-3 text-xs leading-relaxed ${
                  item.role === 'user' ? 'justify-end' : 'justify-start'
                }`}
              >
                {item.role !== 'user' && (
                  <div className="w-7 h-7 rounded bg-indigo-500/10 border border-indigo-500/20 text-indigo-400 flex items-center justify-center shrink-0">
                    <Bot className="w-4 h-4" />
                  </div>
                )}
                <div
                  className={`p-3 max-w-[80%] rounded-2xl ${
                    item.role === 'user'
                      ? 'bg-indigo-600 text-white rounded-tr-none'
                      : 'bg-slate-900/80 border border-slate-800 text-slate-200 rounded-tl-none prose prose-xs prose-invert leading-normal font-medium'
                  }`}
                >
                  {item.role === 'user' ? (
                    item.parts[0].text
                  ) : (
                    <span>{parseInlineFormatting(item.parts[0].text)}</span>
                  )}
                </div>
                {item.role === 'user' && (
                  <div className="w-7 h-7 rounded bg-slate-800/85 text-slate-300 flex items-center justify-center shrink-0">
                    <User className="w-4 h-4" />
                  </div>
                )}
              </div>
            ))}

            {isGeneratingChat && (
              <div className="flex gap-3 text-xs justify-start items-center">
                <div className="w-7 h-7 rounded bg-indigo-500/10 text-indigo-400 flex items-center justify-center shrink-0 animate-spin">
                  <RotateCw className="w-4 h-4" />
                </div>
                <div className="px-3.5 py-2.5 bg-slate-900 border border-slate-800 text-slate-400 rounded-xl rounded-tl-none animate-pulse">
                  Genius AI is drafting solution...
                </div>
              </div>
            )}
            <div ref={chatBottomRef} />
          </div>

          {/* Chat bottom Form */}
          <div className="p-4 border-t border-slate-800/80 bg-[#0B0F19] shrink-0">
            <div className="flex gap-2">
              <input
                type="text"
                placeholder="Ask your tutor anything..."
                value={chatMessage}
                onChange={(e) => setChatMessage(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') executeChat();
                }}
                className="bg-slate-950 text-xs text-slate-300 border border-slate-850 focus:border-indigo-500 rounded-xl px-3.5 py-2.5 outline-none w-full"
              />
              <button
                onClick={() => executeChat()}
                className="bg-indigo-600 hover:bg-indigo-500 p-2.5 rounded-xl text-white cursor-pointer transition-colors shrink-0"
              >
                <Send className="w-4 h-4" />
              </button>
            </div>
          </div>

        </aside>

      </div>

      {/* MISSING API KEY FLOATING WARNING MODAL */}
      {isApiKeyWarningOpen && (
        <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-[#0b0f19] border border-red-900/60 rounded-3xl p-6 max-w-md w-full shadow-2xl space-y-4">
            <div className="w-12 h-12 rounded-full bg-red-500/10 border border-red-500/20 flex items-center justify-center mx-auto text-red-400 animate-bounce">
              <XCircle className="w-6 h-6" />
            </div>
            
            <div className="text-center space-y-2">
              <h3 className="text-lg font-extrabold text-white">Missing Gemini API Key Profile Configuration</h3>
              <p className="text-xs text-slate-400 leading-relaxed">
                Study Genius requests secure academic summaries and solve guides from Google's models on the server. Please attach your <strong className="text-white">GEMINI_API_KEY</strong> environment secret using the <strong className="text-white">Settings &gt; Secrets</strong> sidebar panel to run all cognitive functions live!
              </p>
            </div>

            <div className="flex justify-center pt-2">
              <button
                onClick={() => setIsApiKeyWarningOpen(false)}
                className="bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold px-6 py-2.5 rounded-xl transition-all cursor-pointer"
              >
                Acknowledge & Close
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}

// Separate spinning flashcard rotatable support icon so state change is perfectly responsive
function RotatableIcon() {
  return <Brain className="w-4.5 h-4.5 text-indigo-400 shrink-0" />;
}
