import React, { useState, useEffect, useMemo, useRef, useCallback } from 'react';
import { initializeApp } from 'firebase/app';
import { 
  getAuth, 
  signInAnonymously, 
  onAuthStateChanged 
} from 'firebase/auth';
import { 
  getFirestore, 
  collection, 
  doc, 
  setDoc, 
  getDocs, 
  onSnapshot, 
  updateDoc, 
  deleteDoc 
} from 'firebase/firestore';
import {
  BookOpen, CheckCircle2, Clock, Award, Shield, User, Lock, KeyRound,
  LogOut, Plus, Trash2, Edit3, ChevronLeft,
  AlertCircle, Search, Eye, EyeOff,
  GraduationCap, ArrowRight, RotateCcw,
  BarChart3, Users, Printer, TrendingUp, TrendingDown, Timer, Folder, FolderOpen
} from 'lucide-react';

// ============================================================================
// FIREBASE CONFIGURATION
// ============================================================================
const firebaseConfig = {
  apiKey: "AIzaSyDf2OFI0ki9r9vSVxdgfps1Fuxm85vjp2g",
  authDomain: "pathshala-portal-2000.firebaseapp.com",
  projectId: "pathshala-portal-2000",
  storageBucket: "pathshala-portal-2000.firebasestorage.app",
  messagingSenderId: "42246222677",
  appId: "1:42246222677:web:71e12251953034fb9735dc",
};

const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);
const appId = 'pathshala-prod-v1';

// ============================================================================
// EXAM FOLDER HIERARCHY
// ============================================================================
const EXAM_FOLDERS = {
  SSC: ['MTS', 'CHSL', 'CGL'],
  Railway: ['NTPC (UG)', 'NTPC (G)'],
  WBPSC: ['Clerkship', 'Stenographer', 'Miscellaneous']
};

const SUBJECT_FOLDERS = [
  'Full Mock',
  'Quantitative Aptitude',
  'English Comprehension',
  'General Intelligence & Reasoning',
  'General Awareness'
];

function getMockSubCategory(mock) {
  if (mock.subCategory) return mock.subCategory;
  if (mock.category === 'SSC') return 'CGL';
  if (mock.category === 'Railway') return 'NTPC (G)';
  if (mock.category === 'WBPSC') return 'Clerkship';
  return 'General';
}

function getMockSubjectFolder(mock) {
  return mock.subjectFolder || 'Full Mock';
}

function getDefaultMarking(category, subCategory) {
  if (category === 'WBPSC' && (subCategory === 'Clerkship' || subCategory === 'Stenographer')) {
    return { positiveMark: 1.0, negativeMark: 0.25 };
  }
  return { positiveMark: 2.0, negativeMark: 0.5 };
}
// ============================================================================
// DEFAULT SEED DATA (PRE-POPULATED FOR INSTANT DEMO & TESTING)
// ============================================================================
const DEFAULT_USERS = [
  {
    id: 'ADMIN-PS-01',
    password: 'admin123',
    role: 'admin',
    name: 'Chief Academic Admin',
    email: 'admin@pathshala.edu.in',
    phone: '9830012345',
    targetExam: 'ALL',
    createdAt: new Date().toISOString()
  },
  {
    id: 'PS-2026-1001',
    password: 'student123',
    role: 'student',
    name: 'Anirban Chatterjee',
    email: 'anirban.c@example.com',
    phone: '9874563210',
    targetExam: 'SSC',
    createdAt: new Date().toISOString()
  }
];

const DEFAULT_MOCKS = [
  {
    id: 'mock-ssc-cgl-01',
    title: 'SSC CGL Tier-I Full Mock Test #01 (TCS Pattern)',
    category: 'SSC',
    subCategory: 'CGL',
    durationMinutes: 60,
    positiveMark: 2.0,
    negativeMark: 0.5,
    instructions: 'Each question carries 2.0 marks. There is a negative marking of 0.50 marks for each wrong answer. Use the Question Palette on the right to navigate between sections.',
    questions: [
      {
        id: 'q1',
        section: 'General Intelligence & Reasoning',
        text: 'Select the option that is related to the third term in the same way as the second term is related to the first term.\n\nAmmeter : Electric Current :: Anemometer : ?',
        options: ['Atmospheric Pressure', 'Wind Speed', 'Humidity', 'Earthquake Intensity'],
        correctIndex: 1,
        explanation: 'An Ammeter measures electric current; similarly, an Anemometer measures wind speed.'
      },
      {
        id: 'q2',
        section: 'General Awareness',
        text: 'Which Article of the Constitution of India deals with the Right to Constitutional Remedies, termed by Dr. B.R. Ambedkar as the "Heart and Soul" of the Constitution?',
        options: ['Article 14', 'Article 19', 'Article 21A', 'Article 32'],
        correctIndex: 3,
        explanation: 'Article 32 empowers citizens to move the Supreme Court directly for the enforcement of Fundamental Rights.'
      }
    ]
  }
];

const DEFAULT_NOTES = [
  {
    id: 'note-polity-01',
    title: 'Indian Polity: Important Articles, Amendments & Schedules Capsule',
    category: 'SSC',
    subject: 'Indian Constitution',
    readTime: '8 min read',
    updatedAt: '2026-11-10',
    summary: 'High-yield static GK revision sheet covering Fundamental Rights (Art 12–35), DPSP, 42nd & 44th Amendments, and all 12 Schedules.',
    content: `1. FUNDAMENTAL RIGHTS (PART III: ARTICLES 12–35)
- Right to Equality (Articles 14–18):
  - Art 14: Equality before law & equal protection of laws.
  - Art 17: Abolition of Untouchability (Absolute right).
- Right to Constitutional Remedies (Article 32):
  - 5 Writs: Habeas Corpus, Mandamus, Prohibition, Certiorari, Quo-Warranto.`
  }
];

// ============================================================================
// UTILITY HELPERS
// ============================================================================
function generateStudentId() {
  const randomDigits = Math.floor(1000 + Math.random() * 9000);
  return `PS-2026-${randomDigits}`;
}

function formatTime(totalSeconds) {
  const hrs = Math.floor(totalSeconds / 3600);
  const mins = Math.floor((totalSeconds % 3600) / 60);
  const secs = totalSeconds % 60;
  if (hrs > 0) {
    return `${String(hrs).padStart(2, '0')}:${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;
  }
  return `${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;
}

function formatDurationHuman(seconds) {
  if (!seconds || seconds <= 0) return '0s';
  const mins = Math.floor(seconds / 60);
  const secs = seconds % 60;
  if (mins === 0) return `${secs}s`;
  return `${mins}m ${secs}s`;
}

const ONE_DAY_MS = 24 * 60 * 60 * 1000;
const TRIAL_DAYS = 7;
const ONE_YEAR_DAYS = 365;
const ADMIN_WHATSAPP_NUMBER = '6290671995';

function getWhatsAppPaymentUrl(candidate) {
  const name = candidate?.name || 'Candidate';
  const id = candidate?.id || candidate?.studentId || 'N/A';
  const text = encodeURIComponent(
    `Hello Admin, I am ${name} (ID: ${id}) on PATHSHALA. I would like to complete payment for 1-Year Membership.`
  );
  return `https://wa.me/91${ADMIN_WHATSAPP_NUMBER}?text=${text}`;
}

function getCandidateMembership(user) {
  const now = Date.now();
  const createdMs = user?.createdAt ? new Date(user.createdAt).getTime() : now;

  const has1YrGrant =
    user?.membershipStatus === 'active_1yr' || Boolean(user?.membershipExpiresAt);

  if (has1YrGrant && user?.membershipExpiresAt) {
    const expiresMs = new Date(user.membershipExpiresAt).getTime();
    const daysRemaining = Math.max(0, Math.ceil((expiresMs - now) / ONE_DAY_MS));
    const isActive = daysRemaining > 0;

    return {
      planType: '1_year',
      hasAccess: isActive,
      isExpired: !isActive,
      daysRemaining,
      statusBadge: isActive ? '1-Year Membership' : 'Membership Expired',
      paymentBadge: isActive ? 'Paid (1 Year)' : 'Payment Pending',
      showTrialPendingNotice: !isActive,
      remainingText: isActive
        ? `${daysRemaining} ${daysRemaining === 1 ? 'day' : 'days'} remaining`
        : '0 days remaining',
    };
  }

  const trialExpiresMs = user?.trialExpiresAt
    ? new Date(user.trialExpiresAt).getTime()
    : createdMs + TRIAL_DAYS * ONE_DAY_MS;

  const daysRemaining = Math.max(0, Math.ceil((trialExpiresMs - now) / ONE_DAY_MS));
  const isTrialActive = daysRemaining > 0;

  return {
    planType: 'trial',
    hasAccess: isTrialActive,
    isExpired: !isTrialActive,
    daysRemaining,
    statusBadge: isTrialActive ? '7-Day Trial Active' : 'Trial Ended',
    paymentBadge: 'Payment Pending',
    showTrialPendingNotice: true,
    remainingText: isTrialActive
      ? `${daysRemaining} ${daysRemaining === 1 ? 'day' : 'days'} left in trial`
      : '0 days remaining',
  };
}

function createNewCandidateRecord(baseStudent) {
  const now = Date.now();
  return {
    ...baseStudent,
    createdAt: new Date(now).toISOString(),
    trialExpiresAt: new Date(now + TRIAL_DAYS * ONE_DAY_MS).toISOString(),
    membershipStatus: 'trial',
    paymentStatus: 'pending',
    membershipApprovedAt: null,
    membershipExpiresAt: null,
  };
}
function renderMathTokens(str, keyPrefix) {
  const tokens = String(str).split(/(<sup>.*?<\/sup>|<sub>.*?<\/sub>|\[\[[^|\]]+\|[^\]]+\]\]|\(\d+\/\d+\)|\^\([^)]+\)|\^[a-zA-Z0-9+-]+)/gi);
  return tokens.map((tok, i) => {
    const k = `${keyPrefix}-${i}`;
    if (/^<sup>.*<\/sup>$/i.test(tok)) {
      return <sup key={k}>{tok.replace(/<\/?sup>/gi, '')}</sup>;
    }
    if (/^<sub>.*<\/sub>$/i.test(tok)) {
      return <sub key={k}>{tok.replace(/<\/?sub>/gi, '')}</sub>;
    }
    const bracketFrac = tok.match(/^\[\[([^|\]]+)\|([^\]]+)\]\]$/);
    if (bracketFrac) {
      return (
        <span key={k} className="inline-flex flex-col items-center align-middle mx-0.5 leading-none text-[0.85em]">
          <span className="border-b border-current px-1 pb-0.5">{bracketFrac[1]}</span>
          <span className="pt-0.5">{bracketFrac[2]}</span>
        </span>
      );
    }
    const parenFrac = tok.match(/^\((\d+)\/(\d+)\)$/);
    if (parenFrac) {
      return (
        <span key={k} className="inline-flex flex-col items-center align-middle mx-0.5 leading-none text-[0.85em]">
          <span className="border-b border-current px-1 pb-0.5">{parenFrac[1]}</span>
          <span className="pt-0.5">{parenFrac[2]}</span>
        </span>
      );
    }
    if (/^\^\([^)]+\)$/.test(tok)) {
      return <sup key={k}>{tok.slice(2, -1)}</sup>;
    }
    if (/^\^[a-zA-Z0-9+-]+$/.test(tok)) {
      return <sup key={k}>{tok.slice(1)}</sup>;
    }
    return <React.Fragment key={k}>{tok}</React.Fragment>;
  });
}

function renderFormattedText(rawText) {
  if (!rawText) return null;
  const cleaned = String(rawText).replace(/<br\s*\/?>/gi, '\n');
  const parts = cleaned.split(/(<b>.*?<\/b>|\*\*.*?\*\*|<u>.*?<\/u>|<mark>.*?<\/mark>)/gi);
  return parts.map((part, idx) => {
    if (/^<b>.*<\/b>$/i.test(part)) {
      return <strong key={idx} className="font-extrabold text-slate-950">{renderMathTokens(part.replace(/<\/?b>/gi, ''), idx)}</strong>;
    }
    if (/^\*\*.*\*\*$/.test(part)) {
      return <strong key={idx} className="font-extrabold text-slate-950">{renderMathTokens(part.slice(2, -2), idx)}</strong>;
    }
    if (/^<u>.*<\/u>$/i.test(part)) {
      return <u key={idx} className="decoration-2 decoration-indigo-600 underline-offset-4 font-semibold">{renderMathTokens(part.replace(/<\/?u>/gi, ''), idx)}</u>;
    }
    if (/^<mark>.*<\/mark>$/i.test(part)) {
      return <mark key={idx} className="bg-amber-200/80 text-slate-900 px-1 rounded font-semibold">{renderMathTokens(part.replace(/<\/?mark>/gi, ''), idx)}</mark>;
    }
    return <React.Fragment key={idx}>{renderMathTokens(part, idx)}</React.Fragment>;
  });
}
// ============================================================================
// MAIN APPLICATION COMPONENT
// ============================================================================
export default function App() {
  const [fbUser, setFbUser] = useState(null);
  const [users, setUsers] = useState(DEFAULT_USERS);
  const [mocks, setMocks] = useState(DEFAULT_MOCKS);
  const [notes, setNotes] = useState(DEFAULT_NOTES);
  const [attempts, setAttempts] = useState([]);

  const [currentUser, setCurrentUser] = useState(null);
  const [authView, setAuthView] = useState('login');
  const [selectedRoleTab, setSelectedRoleTab] = useState('student');
  const [newlyCreatedAccount, setNewlyCreatedAccount] = useState(null);

  const [activeMock, setActiveMock] = useState(null);
  const [examPhase, setExamPhase] = useState('instructions');
  const [lastAttemptResult, setLastAttemptResult] = useState(null);
  const [readingNote, setReadingNote] = useState(null);

  const [toast, setToast] = useState(null);
  const showToast = (message, type = 'success') => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 3500);
  };

  useEffect(() => {
    const initAuth = async () => {
      try {
        await signInAnonymously(auth);
      } catch (err) {
        console.error('Auth error:', err);
      }
    };
    initAuth();
    const unsub = onAuthStateChanged(auth, (user) => setFbUser(user));
    return () => unsub();
  }, []);

  useEffect(() => {
    if (!fbUser) return;

    const usersCol = collection(db, 'artifacts', appId, 'public', 'data', 'users');
    const mocksCol = collection(db, 'artifacts', appId, 'public', 'data', 'mocks');
    const notesCol = collection(db, 'artifacts', appId, 'public', 'data', 'notes');
    const attemptsCol = collection(db, 'artifacts', appId, 'public', 'data', 'attempts');

    const seedIfEmpty = async () => {
      try {
        const userSnap = await getDocs(usersCol);
        if (userSnap.empty) {
          for (const u of DEFAULT_USERS) await setDoc(doc(usersCol, u.id), u);
        }
        const mockSnap = await getDocs(mocksCol);
        if (mockSnap.empty) {
          for (const m of DEFAULT_MOCKS) await setDoc(doc(mocksCol, m.id), m);
        }
        const noteSnap = await getDocs(notesCol);
        if (noteSnap.empty) {
          for (const n of DEFAULT_NOTES) await setDoc(doc(notesCol, n.id), n);
        }
      } catch (err) {
        console.error('Firestore seed error:', err);
      }
    };

    seedIfEmpty();

    const unsubUsers = onSnapshot(usersCol, (snap) => {
      if (!snap.empty) setUsers(snap.docs.map(d => d.data()));
    }, (err) => console.error(err));

    const unsubMocks = onSnapshot(mocksCol, (snap) => {
      if (!snap.empty) setMocks(snap.docs.map(d => d.data()));
    }, (err) => console.error(err));

    const unsubNotes = onSnapshot(notesCol, (snap) => {
      if (!snap.empty) setNotes(snap.docs.map(d => d.data()));
    }, (err) => console.error(err));

    const unsubAttempts = onSnapshot(attemptsCol, (snap) => {
      setAttempts(snap.docs.map(d => d.data()));
    }, (err) => console.error(err));

    return () => {
      unsubUsers();
      unsubMocks();
      unsubNotes();
      unsubAttempts();
    };
  }, [fbUser]);

  useEffect(() => {
    if (currentUser) {
      const updated = users.find(u => u.id === currentUser.id);
      if (updated) setCurrentUser(updated);
    }
  }, [users]);

  const handleLogin = (loginId, password, role) => {
    const cleanId = loginId.trim().toUpperCase();
    const found = users.find(
      u => u.id.toUpperCase() === cleanId && u.password === password && u.role === role
    );
    if (!found) {
      return { success: false, message: `Invalid ${role === 'admin' ? 'Admin' : 'Candidate'} ID or Password.` };
    }
    setCurrentUser(found);
    showToast(`Welcome back, ${found.name}!`);
    return { success: true };
  };

  const handleApproveOneYearMembership = async (student) => {
    if (!student?.id) return;
    const now = Date.now();
    const currentExpiryMs = student.membershipExpiresAt
      ? new Date(student.membershipExpiresAt).getTime()
      : 0;
    const baseStartMs = currentExpiryMs > now ? currentExpiryMs : now;

    const updatedStudent = {
      ...student,
      membershipStatus: 'active_1yr',
      paymentStatus: 'paid',
      membershipApprovedAt: new Date(now).toISOString(),
      membershipExpiresAt: new Date(
        baseStartMs + ONE_YEAR_DAYS * ONE_DAY_MS
      ).toISOString(),
    };

    setUsers((prev) =>
      prev.map((u) => (u.id === student.id ? updatedStudent : u))
    );

    try {
      if (fbUser) {
        await setDoc(
          doc(db, 'artifacts', appId, 'public', 'data', 'users', student.id),
          updatedStudent,
          { merge: true }
        );
      }
    } catch (err) {
      console.error('Error approving 1-year membership:', err);
    }
  };
  const handleRegisterStudent = async ({ name, email, phone, targetExam, customPassword }) => {
    const trimmedEmail = email.trim().toLowerCase();
    const existingEmail = users.find(u => u.email.toLowerCase() === trimmedEmail);
    if (existingEmail) {
      return { success: false, message: 'An account with this email already exists. Use Forgot Password if needed.' };
    }

    let uniqueId = generateStudentId();
    while (users.some(u => u.id === uniqueId)) {
      uniqueId = generateStudentId();
    }

    const generatedPassword = customPassword?.trim() || `PS@${Math.floor(1000 + Math.random() * 9000)}`;
    const newStudent = createNewCandidateRecord({
      id: uniqueId,
      password: generatedPassword,
      role: 'student',
      name: name.trim(),
      email: trimmedEmail,
      phone: phone.trim(),
      targetExam: targetExam || 'SSC',
    });

    try {
      if (fbUser) {
        await setDoc(doc(db, 'artifacts', appId, 'public', 'data', 'users', uniqueId), newStudent);
      } else {
        setUsers(prev => [...prev, newStudent]);
      }
      setNewlyCreatedAccount(newStudent);
      setAuthView('registered_success');
      showToast('Registration successful! Save your Unique Login ID & Password.');
      return { success: true };
    } catch (err) {
      return { success: false, message: 'Could not save registration. Check Firebase rules.' };
    }
  };

  const handleForgotPassword = async ({ role, loginId, email, newPassword }) => {
    const cleanId = loginId.trim().toUpperCase();
    const cleanEmail = email.trim().toLowerCase();
    const matchedUser = users.find(
      u => u.role === role && u.id.toUpperCase() === cleanId && u.email.toLowerCase() === cleanEmail
    );

    if (!matchedUser) {
      return {
        success: false,
        message: 'No matching account found for that Unique ID and Registered Email combination.'
      };
    }

    try {
      if (fbUser) {
        await updateDoc(doc(db, 'artifacts', appId, 'public', 'data', 'users', matchedUser.id), {
          password: newPassword
        });
      } else {
        setUsers(prev => prev.map(u => u.id === matchedUser.id ? { ...u, password: newPassword } : u));
      }
      showToast('Password reset successfully! You can now log in.');
      setAuthView('login');
      return { success: true };
    } catch (err) {
      return { success: false, message: 'Failed to reset password.' };
    }
  };

  const handleChangePassword = async (oldPassword, newPassword) => {
    if (!currentUser) return { success: false, message: 'Not logged in.' };
    if (currentUser.password !== oldPassword) {
      return { success: false, message: 'Current password is incorrect.' };
    }
    if (newPassword.length < 6) {
      return { success: false, message: 'New password must be at least 6 characters.' };
    }
    try {
      if (fbUser) {
        await updateDoc(doc(db, 'artifacts', appId, 'public', 'data', 'users', currentUser.id), {
          password: newPassword
        });
      } else {
        setUsers(prev => prev.map(u => u.id === currentUser.id ? { ...u, password: newPassword } : u));
      }
      setCurrentUser(prev => ({ ...prev, password: newPassword }));
      showToast('Password updated successfully!');
      return { success: true };
    } catch (err) {
      return { success: false, message: 'Error updating password.' };
    }
  };

  const handleLogout = () => {
    setCurrentUser(null);
    setActiveMock(null);
    setReadingNote(null);
    setAuthView('login');
    showToast('Logged out safely.');
  };

  const saveMockToDb = async (mockObj) => {
    try {
      if (fbUser) {
        await setDoc(doc(db, 'artifacts', appId, 'public', 'data', 'mocks', mockObj.id), mockObj);
      } else {
        setMocks(prev => {
          const exists = prev.some(m => m.id === mockObj.id);
          return exists ? prev.map(m => m.id === mockObj.id ? mockObj : m) : [...prev, mockObj];
        });
      }
      showToast('Mock Test saved and published!');
    } catch (err) {
      showToast('Error saving mock test.', 'error');
    }
  };

  const deleteMockFromDb = async (mockId) => {
    try {
      if (fbUser) {
        await deleteDoc(doc(db, 'artifacts', appId, 'public', 'data', 'mocks', mockId));
      } else {
        setMocks(prev => prev.filter(m => m.id !== mockId));
      }
      showToast('Mock Test deleted.');
    } catch (err) {
      showToast('Failed to delete mock.', 'error');
    }
  };

  const saveNoteToDb = async (noteObj) => {
    try {
      if (fbUser) {
        await setDoc(doc(db, 'artifacts', appId, 'public', 'data', 'notes', noteObj.id), noteObj);
      } else {
        setNotes(prev => {
          const exists = prev.some(n => n.id === noteObj.id);
          return exists ? prev.map(n => n.id === noteObj.id ? noteObj : n) : [...prev, noteObj];
        });
      }
      showToast('Study Note published!');
    } catch (err) {
      showToast('Error saving study note.', 'error');
    }
  };

  const deleteNoteFromDb = async (noteId) => {
    try {
      if (fbUser) {
        await deleteDoc(doc(db, 'artifacts', appId, 'public', 'data', 'notes', noteId));
      } else {
        setNotes(prev => prev.filter(n => n.id !== noteId));
      }
      showToast('Study Note deleted.');
    } catch (err) {
      showToast('Failed to delete note.', 'error');
    }
  };

  function formatAttemptDate(attempt) {
  const raw =
    attempt?.submittedAt ||
    attempt?.createdAt ||
    attempt?.date ||
    attempt?.timestamp;
  if (!raw) return 'Earlier Attempt';
  const d = new Date(raw);
  if (Number.isNaN(d.getTime())) return String(raw);
  return d.toLocaleDateString('en-IN', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  });
}
  const submitExamAttempt = async (attemptRecord) => {
    const enrichedAttempt = {
    ...attemptRecord,
    submittedAt: attemptRecord?.submittedAt || new Date().toISOString(),
  };
    try {
      if (fbUser) {
        await setDoc(doc(db, 'artifacts', appId, 'public', 'data', 'attempts', attemptRecord.id), enrichedAttempt);
      } else {
        setAttempts(prev => [enrichedAttempt, ...prev]);
      }
      setLastAttemptResult(enrichedAttempt);
      setExamPhase('result');
      if (attemptRecord.autoSubmitted) {
        showToast('Time expired! Exam auto-submitted & evaluated.');
      }
    } catch (err) {
      setLastAttemptResult(enrichedAttempt);
      setExamPhase('result');
    }
  };

  const handleOpenSavedScorecard = (attemptRecord) => {
    const matchedMock = mocks.find(m => m.id === attemptRecord.mockId);
    if (!matchedMock) {
      showToast('Original mock test was removed by admin.', 'error');
      return;
    }
    setActiveMock(matchedMock);
    setLastAttemptResult(attemptRecord);
    setExamPhase('result');
  };

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 font-sans">
      {toast && (
        <div className={`fixed bottom-5 right-5 z-50 flex items-center gap-2.5 px-4 py-3 rounded-xl shadow-xl text-white text-sm font-medium transition-all ${
          toast.type === 'error' ? 'bg-rose-600' : 'bg-slate-900 border border-slate-700'
        }`}>
          {toast.type === 'error' ? <AlertCircle className="w-4 h-4 text-rose-200" /> : <CheckCircle2 className="w-4 h-4 text-emerald-400" />}
          <span>{toast.message}</span>
        </div>
      )}

      {!currentUser && (
        <AuthPortal
          authView={authView}
          setAuthView={setAuthView}
          selectedRoleTab={selectedRoleTab}
          setSelectedRoleTab={setSelectedRoleTab}
          onLogin={handleLogin}
          onRegister={handleRegisterStudent}
          onForgot={handleForgotPassword}
          newlyCreatedAccount={newlyCreatedAccount}
          mocksCount={mocks.length}
          notesCount={notes.length}
        />
      )}

      {currentUser && currentUser.role === 'student' && activeMock && (
        <>
          {examPhase === 'instructions' && (
            <ExamInstructionsScreen
              mock={activeMock}
              student={currentUser}
              onStart={() => setExamPhase('live')}
              onCancel={() => setActiveMock(null)}
            />
          )}
          {examPhase === 'live' && (
            <TcsIonExamInterface
              mock={activeMock}
              student={currentUser}
              onSubmitExam={submitExamAttempt}
              onExit={() => setActiveMock(null)}
            />
          )}
          {examPhase === 'result' && lastAttemptResult && (
            <ExamScorecardScreen
              mock={activeMock}
              attempt={lastAttemptResult}
              allMockAttempts={attempts.filter(a => a.mockId === activeMock.id)}
              onBackToDashboard={() => {
                setActiveMock(null);
                setLastAttemptResult(null);
              }}
            />
          )}
        </>
      )}

      {currentUser && readingNote && (
        <StudyNoteReader
          note={readingNote}
          onClose={() => setReadingNote(null)}
        />
      )}

      {currentUser && currentUser.role === 'student' && !activeMock && !readingNote && (
        <StudentDashboard
          student={currentUser}
          mocks={mocks}
          notes={notes}
          attempts={attempts.filter(a => a.studentId === currentUser.id)}
          allAttempts={attempts}
          onStartMock={(mock) => {
            const mem = getCandidateMembership(currentUser);
            if (!mem.hasAccess) {
              showToast(
                `Trial ended. Contact admin on WhatsApp only at ${ADMIN_WHATSAPP_NUMBER} for 1-year membership.`
              );
              return;
            }
            setActiveMock(mock);
            setExamPhase('instructions');
          }}
          onViewAttemptReport={handleOpenSavedScorecard}
          onOpenNote={(note) => {
            const mem = getCandidateMembership(currentUser);
            if (!mem.hasAccess) {
              showToast(
                `Trial ended. Contact admin on WhatsApp only at ${ADMIN_WHATSAPP_NUMBER} for 1-year membership.`
              );
              return;
            }
            setReadingNote(note);
          }}
          onChangePassword={handleChangePassword}
          onLogout={handleLogout}
        />
      )}

      {currentUser && currentUser.role === 'admin' && !readingNote && (
        <AdminDashboard
          admin={currentUser}
          users={users}
          mocks={mocks}
          notes={notes}
          attempts={attempts}
          onSaveMock={saveMockToDb}
          onDeleteMock={deleteMockFromDb}
          onSaveNote={saveNoteToDb}
          onDeleteNote={deleteNoteFromDb}
          onPreviewNote={(note) => setReadingNote(note)}
          onChangePassword={handleChangePassword}
          onLogout={handleLogout}
          onApproveMembership={handleApproveOneYearMembership}
        />
      )}
    </div>
  );
}

// ============================================================================
// COMPONENT 1: DUAL-ROLE AUTHENTICATION PORTAL
// ============================================================================
function AuthPortal({
  authView, setAuthView, selectedRoleTab, setSelectedRoleTab,
  onLogin, onRegister, onForgot, newlyCreatedAccount, mocksCount, notesCount
}) {
  const [loginId, setLoginId] = useState('');
  const [password, setPassword] = useState('');
  const [showPass, setShowPass] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  const [regName, setRegName] = useState('');
  const [regEmail, setRegEmail] = useState('');
  const [regPhone, setRegPhone] = useState('');
  const [regExam, setRegExam] = useState('SSC');
  const [regCustomPass, setRegCustomPass] = useState('');

  const [fpRole, setFpRole] = useState('student');
  const [fpId, setFpId] = useState('');
  const [fpEmail, setFpEmail] = useState('');
  const [fpNewPass, setFpNewPass] = useState('');

  const submitLogin = (e) => {
    e.preventDefault();
    setErrorMsg('');
    const res = onLogin(loginId, password, selectedRoleTab);
    if (!res.success) setErrorMsg(res.message);
  };

  const submitRegister = async (e) => {
    e.preventDefault();
    setErrorMsg('');
    if (!regName.trim() || !regEmail.trim() || !regPhone.trim()) {
      setErrorMsg('Please fill in your Full Name, Email, and Mobile Number.');
      return;
    }
    const res = await onRegister({
      name: regName,
      email: regEmail,
      phone: regPhone,
      targetExam: regExam,
      customPassword: regCustomPass
    });
    if (!res.success) setErrorMsg(res.message);
  };

  const submitForgot = async (e) => {
    e.preventDefault();
    setErrorMsg('');
    if (!fpId.trim() || !fpEmail.trim() || fpNewPass.length < 6) {
      setErrorMsg('Enter valid Unique ID, Registered Email, and a new password (min 6 chars).');
      return;
    }
    const res = await onForgot({
      role: fpRole,
      loginId: fpId,
      email: fpEmail,
      newPassword: fpNewPass
    });
    if (!res.success) setErrorMsg(res.message);
  };

  const fillDemoCredentials = (role) => {
    setErrorMsg('');
    setSelectedRoleTab(role);
    if (role === 'student') {
      setLoginId('PS-2026-1001');
      setPassword('student123');
    } else {
      setLoginId('ADMIN-PS-01');
      setPassword('admin123');
    }
  };

  return (
    <div className="min-h-screen flex flex-col lg:flex-row bg-slate-950">
      <div className="lg:w-5/12 bg-gradient-to-br from-indigo-950 via-slate-900 to-blue-950 text-white p-8 lg:p-12 flex flex-col justify-between border-b lg:border-b-0 lg:border-r border-slate-800">
        <div>
          <div className="flex items-center gap-3 mb-8">
            <div className="w-11 h-11 rounded-xl bg-amber-500 text-slate-950 flex items-center justify-center font-black text-xl shadow-lg shadow-amber-500/20">
              P
            </div>
            <div>
              <h1 className="text-2xl font-extrabold tracking-tight text-white">PATHSHALA</h1>
              <p className="text-xs text-amber-400 font-semibold tracking-widest uppercase">CBT Mock & Study Portal</p>
            </div>
          </div>

          <h2 className="text-3xl lg:text-4xl font-bold leading-tight mb-4">
            Real <span className="text-amber-400">TCS iON Pattern</span> Mock Tests & Exam Capsules.
          </h2>
          <p className="text-slate-300 text-sm leading-relaxed mb-8">
            Practice in an authentic Computer-Based Test interface with dedicated exam folders, live section switching, negative marking analytics, All-India Rank, and per-question timing diagnostics.
          </p>

          <div className="grid grid-cols-3 gap-3 mb-8">
            <div className="bg-white/5 border border-white/10 rounded-xl p-3.5">
              <div className="text-amber-400 font-bold text-lg">SSC</div>
              <div className="text-xs text-slate-400">MTS, CHSL, CGL</div>
            </div>
            <div className="bg-white/5 border border-white/10 rounded-xl p-3.5">
              <div className="text-sky-400 font-bold text-lg">Railway</div>
              <div className="text-xs text-slate-400">NTPC (UG), NTPC (G)</div>
            </div>
            <div className="bg-white/5 border border-white/10 rounded-xl p-3.5">
              <div className="text-emerald-400 font-bold text-lg">WBPSC</div>
              <div className="text-xs text-slate-400">Clerkship, Steno, Misc</div>
            </div>
          </div>
        </div>

        <div className="bg-slate-900/80 border border-slate-800 rounded-xl p-4">
          <div className="flex items-center justify-between text-xs text-slate-400 mb-2">
            <span className="font-semibold text-slate-200">Quick Demo Access</span>
            <span>{mocksCount} Mocks • {notesCount} Notes Ready</span>
          </div>
          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              onClick={() => fillDemoCredentials('student')}
              className="text-xs px-3 py-1.5 rounded-lg bg-indigo-600/30 hover:bg-indigo-600/50 text-indigo-200 border border-indigo-500/30 transition"
            >
              Fill Student Demo (PS-2026-1001)
            </button>
            <button
              type="button"
              onClick={() => fillDemoCredentials('admin')}
              className="text-xs px-3 py-1.5 rounded-lg bg-amber-500/20 hover:bg-amber-500/30 text-amber-200 border border-amber-500/30 transition"
            >
              Fill Admin Demo (ADMIN-PS-01)
            </button>
          </div>
        </div>
      </div>

      <div className="lg:w-7/12 bg-slate-50 flex items-center justify-center p-6 lg:p-12">
        <div className="w-full max-w-md bg-white rounded-2xl shadow-xl border border-slate-200/80 p-7 sm:p-8">
          {authView === 'login' && (
            <>
              <div className="mb-6">
                <h3 className="text-2xl font-bold text-slate-900">Sign In to PATHSHALA</h3>
                <p className="text-sm text-slate-500 mt-1">Select your role and enter your Unique Login ID.</p>
              </div>

              <div className="grid grid-cols-2 gap-2 p-1 bg-slate-100 rounded-xl mb-6">
                <button
                  type="button"
                  onClick={() => { setSelectedRoleTab('student'); setErrorMsg(''); }}
                  className={`flex items-center justify-center gap-2 py-2.5 text-sm font-semibold rounded-lg transition ${
                    selectedRoleTab === 'student'
                      ? 'bg-white text-indigo-700 shadow-sm'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  <GraduationCap className="w-4 h-4" />
                  Student Login
                </button>
                <button
                  type="button"
                  onClick={() => { setSelectedRoleTab('admin'); setErrorMsg(''); }}
                  className={`flex items-center justify-center gap-2 py-2.5 text-sm font-semibold rounded-lg transition ${
                    selectedRoleTab === 'admin'
                      ? 'bg-white text-amber-700 shadow-sm'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  <Shield className="w-4 h-4" />
                  Admin Login
                </button>
              </div>

              {errorMsg && (
                <div className="mb-4 p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-xs flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 shrink-0" />
                  <span>{errorMsg}</span>
                </div>
              )}

              <form onSubmit={submitLogin} className="space-y-4">
                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-slate-600 mb-1.5">
                    {selectedRoleTab === 'admin' ? 'Admin Login ID' : 'Candidate Unique ID'}
                  </label>
                  <div className="relative">
                    <User className="w-4 h-4 text-slate-400 absolute left-3.5 top-3" />
                    <input
                      type="text"
                      required
                      value={loginId}
                      onChange={(e) => setLoginId(e.target.value)}
                      placeholder={selectedRoleTab === 'admin' ? 'e.g. ADMIN-PS-01' : 'e.g. PS-2026-1001'}
                      className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-slate-300 text-sm focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none uppercase"
                    />
                  </div>
                </div>

                <div>
                  <div className="flex items-center justify-between mb-1.5">
                    <label className="block text-xs font-bold uppercase tracking-wider text-slate-600">
                      Password
                    </label>
                    <button
                      type="button"
                      onClick={() => { setErrorMsg(''); setFpRole(selectedRoleTab); setAuthView('forgot'); }}
                      className="text-xs font-semibold text-indigo-600 hover:text-indigo-800"
                    >
                      Forgot Password?
                    </button>
                  </div>
                  <div className="relative">
                    <Lock className="w-4 h-4 text-slate-400 absolute left-3.5 top-3" />
                    <input
                      type={showPass ? 'text' : 'password'}
                      required
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      placeholder="Enter your password"
                      className="w-full pl-10 pr-10 py-2.5 rounded-xl border border-slate-300 text-sm focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPass(!showPass)}
                      className="absolute right-3 top-2.5 text-slate-400 hover:text-slate-600"
                    >
                      {showPass ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                </div>

                <button
                  type="submit"
                  className={`w-full py-3 rounded-xl font-bold text-sm text-white shadow-lg transition flex items-center justify-center gap-2 ${
                    selectedRoleTab === 'admin'
                      ? 'bg-amber-600 hover:bg-amber-700 shadow-amber-600/20'
                      : 'bg-indigo-600 hover:bg-indigo-700 shadow-indigo-600/20'
                  }`}
                >
                  <span>Sign In as {selectedRoleTab === 'admin' ? 'Admin' : 'Candidate'}</span>
                  <ArrowRight className="w-4 h-4" />
                </button>
              </form>

              {selectedRoleTab === 'student' && (
                <div className="mt-6 pt-5 border-t border-slate-100 text-center">
                  <p className="text-sm text-slate-600">
                    New candidate?{' '}
                    <button
                      type="button"
                      onClick={() => { setErrorMsg(''); setAuthView('register'); }}
                      className="font-bold text-indigo-600 hover:text-indigo-800"
                    >
                      Register & Get Unique ID
                    </button>
                  </p>
                </div>
              )}
            </>
          )}

          {authView === 'register' && (
            <>
              <div className="mb-5">
                <button
                  type="button"
                  onClick={() => { setErrorMsg(''); setAuthView('login'); }}
                  className="text-xs font-semibold text-slate-500 hover:text-slate-800 flex items-center gap-1 mb-2"
                >
                  <ChevronLeft className="w-3.5 h-3.5" /> Back to Login
                </button>
                <h3 className="text-2xl font-bold text-slate-900">Student Registration</h3>
                <p className="text-xs text-slate-500 mt-1">
                  Upon registration, you will instantly receive a Unique Candidate ID & Password.
                </p>
              </div>

              {errorMsg && (
                <div className="mb-4 p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-xs flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 shrink-0" />
                  <span>{errorMsg}</span>
                </div>
              )}

              <form onSubmit={submitRegister} className="space-y-3.5">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Full Name *</label>
                  <input
                    type="text"
                    required
                    value={regName}
                    onChange={(e) => setRegName(e.target.value)}
                    placeholder="Enter candidate full name"
                    className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 text-sm focus:ring-2 focus:ring-indigo-500 outline-none"
                  />
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">Email Address *</label>
                    <input
                      type="email"
                      required
                      value={regEmail}
                      onChange={(e) => setRegEmail(e.target.value)}
                      placeholder="name@email.com"
                      className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 text-sm focus:ring-2 focus:ring-indigo-500 outline-none"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">Mobile Number *</label>
                    <input
                      type="tel"
                      required
                      value={regPhone}
                      onChange={(e) => setRegPhone(e.target.value)}
                      placeholder="10-digit number"
                      className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 text-sm focus:ring-2 focus:ring-indigo-500 outline-none"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">Primary Exam Stream</label>
                    <select
                      value={regExam}
                      onChange={(e) => setRegExam(e.target.value)}
                      className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 text-sm bg-white focus:ring-2 focus:ring-indigo-500 outline-none"
                    >
                      <option value="SSC">SSC (MTS / CHSL / CGL)</option>
                      <option value="Railway">Railway (NTPC UG / G)</option>
                      <option value="WBPSC">WBPSC (Clerkship / Steno / Misc)</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">Password (Optional)</label>
                    <input
                      type="text"
                      value={regCustomPass}
                      onChange={(e) => setRegCustomPass(e.target.value)}
                      placeholder="Auto-generated if blank"
                      className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 text-sm focus:ring-2 focus:ring-indigo-500 outline-none"
                    />
                  </div>
                </div>

                <button
                  type="submit"
                  className="w-full py-3 mt-2 rounded-xl font-bold text-sm text-white bg-indigo-600 hover:bg-indigo-700 shadow-lg shadow-indigo-600/20 transition"
                >
                  Generate Unique ID & Register
                </button>
              </form>
            </>
          )}

          {authView === 'registered_success' && newlyCreatedAccount && (
            <div className="text-center">
              <div className="w-14 h-14 rounded-full bg-emerald-100 text-emerald-600 flex items-center justify-center mx-auto mb-4">
                <CheckCircle2 className="w-8 h-8" />
              </div>
              <h3 className="text-xl font-bold text-slate-900">Registration Complete!</h3>
              <p className="text-xs text-slate-500 mt-1 mb-5">
                Please save your generated Candidate Login ID and Password below.
              </p>

              <div className="bg-slate-900 text-white rounded-2xl p-5 text-left space-y-3 mb-5 border border-slate-800">
                <div>
                  <div className="text-[11px] uppercase tracking-wider text-slate-400">Candidate Name</div>
                  <div className="font-semibold text-sm">{newlyCreatedAccount.name}</div>
                </div>
                <div className="pt-2 border-t border-slate-800">
                  <div className="text-[11px] uppercase tracking-wider text-amber-400">Unique Login ID</div>
                  <div className="font-mono text-lg font-bold tracking-wide text-white">{newlyCreatedAccount.id}</div>
                </div>
                <div className="pt-2 border-t border-slate-800">
                  <div className="text-[11px] uppercase tracking-wider text-emerald-400">Password</div>
                  <div className="font-mono text-lg font-bold tracking-wide text-white">{newlyCreatedAccount.password}</div>
                </div>
              </div>

              <button
                type="button"
                onClick={() => {
                  setLoginId(newlyCreatedAccount.id);
                  setPassword(newlyCreatedAccount.password);
                  setSelectedRoleTab('student');
                  setAuthView('login');
                }}
                className="w-full py-3 rounded-xl font-bold text-sm text-white bg-indigo-600 hover:bg-indigo-700 transition"
              >
                Proceed to Login Now
              </button>
            </div>
          )}

          {authView === 'forgot' && (
            <>
              <div className="mb-5">
                <button
                  type="button"
                  onClick={() => { setErrorMsg(''); setAuthView('login'); }}
                  className="text-xs font-semibold text-slate-500 hover:text-slate-800 flex items-center gap-1 mb-2"
                >
                  <ChevronLeft className="w-3.5 h-3.5" /> Back to Login
                </button>
                <h3 className="text-2xl font-bold text-slate-900">Reset Password</h3>
                <p className="text-xs text-slate-500 mt-1">
                  Verify your Unique ID and Registered Email to set a new password.
                </p>
              </div>

              {errorMsg && (
                <div className="mb-4 p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-xs flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 shrink-0" />
                  <span>{errorMsg}</span>
                </div>
              )}

              <form onSubmit={submitForgot} className="space-y-3.5">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Account Role</label>
                  <select
                    value={fpRole}
                    onChange={(e) => setFpRole(e.target.value)}
                    className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 text-sm bg-white outline-none"
                  >
                    <option value="student">Student / Candidate</option>
                    <option value="admin">Administrator</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Unique Login ID *</label>
                  <input
                    type="text"
                    required
                    value={fpId}
                    onChange={(e) => setFpId(e.target.value)}
                    placeholder={fpRole === 'admin' ? 'ADMIN-PS-01' : 'PS-2026-XXXX'}
                    className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 text-sm uppercase outline-none"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Registered Email *</label>
                  <input
                    type="email"
                    required
                    value={fpEmail}
                    onChange={(e) => setFpEmail(e.target.value)}
                    placeholder="Enter email used during registration"
                    className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 text-sm outline-none"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">New Password (min 6 chars) *</label>
                  <input
                    type="password"
                    required
                    minLength={6}
                    value={fpNewPass}
                    onChange={(e) => setFpNewPass(e.target.value)}
                    placeholder="Enter new password"
                    className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 text-sm outline-none"
                  />
                </div>

                <button
                  type="submit"
                  className="w-full py-3 rounded-xl font-bold text-sm text-white bg-indigo-600 hover:bg-indigo-700 transition"
                >
                  Reset Password
                </button>
              </form>
            </>
          )}
        </div>
      </div>
    </div>
  );
}

// ============================================================================
// COMPONENT 2: STUDENT DASHBOARD (WITH EXAM FOLDERS & REATTEMPT STATUS)
// ============================================================================
function StudentDashboard({
  student, mocks, notes, attempts, allAttempts, onStartMock, onViewAttemptReport, onOpenNote, onChangePassword, onLogout
}) {
  const membership = getCandidateMembership(student);
  const [activeTab, setActiveTab] = useState('mocks');
  const [streamFilter, setStreamFilter] = useState('ALL');
  const [subFolderFilter, setSubFolderFilter] = useState('ALL');
  const [subjectFilter, setSubjectFilter] = useState('ALL');
  const [searchQuery, setSearchQuery] = useState('');

  const handleSelectStream = (stream) => {
    setStreamFilter(stream);
    setSubFolderFilter('ALL');
    setSubjectFilter('ALL');
  };

  const handleSelectFolderShortcut = (stream, subFolder) => {
    setStreamFilter(stream);
    setSubFolderFilter(subFolder);
    setSubjectFilter('ALL');
  };

  const filteredMocks = mocks.filter(m => {
    const matchesStream = streamFilter === 'ALL' || m.category === streamFilter;
    const sub = getMockSubCategory(m);
    const matchesSub = subFolderFilter === 'ALL' || sub === subFolderFilter;
    const subj = getMockSubjectFolder(m);
    const matchesSubject = subjectFilter === 'ALL' || subj === subjectFilter;
    const matchesSearch =
      m.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      sub.toLowerCase().includes(searchQuery.toLowerCase()) ||
      subj.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesStream && matchesSub && matchesSubject && matchesSearch;
  });
  const filteredNotes = notes.filter(n => {
    const matchesStream = streamFilter === 'ALL' || n.category === streamFilter;
    const matchesSearch =
      n.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      n.subject.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesStream && matchesSearch;
  });

  const getRankForAttempt = (att) => {
    const peers = allAttempts
      .filter(a => a.mockId === att.mockId)
      .sort((a, b) => (b.score - a.score) || (b.accuracy - a.accuracy) || ((a.totalTimeSeconds || 99999) - (b.totalTimeSeconds || 99999)));
    const idx = peers.findIndex(p => p.id === att.id);
    return idx >= 0 ? `#${idx + 1} / ${peers.length}` : '-';
  };

  return (
    <div className="min-h-screen flex flex-col bg-slate-50">
      <header className="bg-slate-900 text-white border-b border-slate-800 sticky top-0 z-30">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-lg bg-amber-500 text-slate-950 font-black flex items-center justify-center text-lg">
              P
            </div>
            <div>
              <span className="font-extrabold tracking-tight text-lg">PATHSHALA</span>
              <span className="hidden sm:inline-block ml-2 text-xs px-2 py-0.5 rounded bg-indigo-600/40 text-indigo-200 border border-indigo-500/30">
                Candidate Portal
              </span>
            </div>
          </div>

          <div className="flex items-center gap-4">
            <div className="text-right hidden sm:block">
              <div className="text-sm font-semibold text-white">{student.name}</div>
              <div className="text-xs font-mono text-amber-400">{student.id}</div>
            </div>
            <button
              onClick={onLogout}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-rose-600 text-xs font-semibold text-slate-200 hover:text-white transition"
            >
              <LogOut className="w-3.5 h-3.5" />
              <span>Logout</span>
            </button>
          </div>
        </div>
      </header>

      <main className="max-w-7xl w-full mx-auto px-4 sm:px-6 py-6 flex-1">
        <div className="flex flex-wrap items-center justify-between gap-4 mb-6">
          <div className="flex flex-wrap gap-2 bg-white p-1.5 rounded-xl border border-slate-200 shadow-sm">
            {[
              { id: 'mocks', label: 'CBT Mock Tests', icon: Clock },
              { id: 'notes', label: 'Study Notes', icon: BookOpen },
              { id: 'history', label: `My Results & Rank (${attempts.length})`, icon: BarChart3 },
              { id: 'profile', label: 'Profile & Password', icon: KeyRound }
            ].map(tab => {
              const Icon = tab.icon;
              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-semibold transition ${
                    activeTab === tab.id
                      ? 'bg-indigo-600 text-white shadow-sm'
                      : 'text-slate-600 hover:bg-slate-100'
                  }`}
                >
                  <Icon className="w-4 h-4" />
                  <span>{tab.label}</span>
                </button>
              );
            })}
          </div>

          <div className="mb-4 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm space-y-2.5">
        <div className="flex flex-wrap items-center justify-between gap-2 text-xs">
          <div className="flex flex-wrap items-center gap-2">
            <span className="rounded-full bg-indigo-100 px-2.5 py-1 font-bold text-indigo-800">
              {membership.statusBadge}
            </span>
            <span
              className={`rounded-full px-2.5 py-1 font-bold ${
                membership.paymentBadge.startsWith('Paid')
                  ? 'bg-emerald-100 text-emerald-800'
                  : 'bg-amber-100 text-amber-900'
              }`}
            >
              {membership.paymentBadge}
            </span>
          </div>

          <div className="font-bold text-slate-900">
            {membership.remainingText}
          </div>
        </div>

        {membership.showTrialPendingNotice && (
          <div className="flex flex-wrap items-center justify-between gap-2 rounded-xl border border-amber-300 bg-amber-50 px-3.5 py-2.5 text-xs text-amber-950">
            <span>
              <strong>Payment Pending:</strong> For payment and 1-year membership, contact admin on{' '}
              <strong>WhatsApp only</strong> at <strong>{ADMIN_WHATSAPP_NUMBER}</strong>.
            </span>
            <a
              href={getWhatsAppPaymentUrl(student)}
              target="_blank"
              rel="noopener noreferrer"
              className="rounded-lg bg-emerald-600 px-3 py-1.5 font-bold text-white hover:bg-emerald-700"
            >
              WhatsApp Admin
            </a>
          </div>
        )}
      </div>

      {!membership.hasAccess && (activeTab === 'mocks' || activeTab === 'notes') && (
        <div className="mb-6 rounded-2xl border border-rose-200 bg-rose-50 p-6 text-center space-y-3">
          <div className="inline-block rounded-full bg-rose-100 px-3 py-1 text-xs font-bold text-rose-800">
            Access Locked • {membership.paymentBadge}
          </div>
          <h3 className="text-lg font-bold text-slate-900">
            7-Day Trial Ended
          </h3>
          <p className="text-sm text-slate-700 max-w-md mx-auto">
            You cannot access mocks or study materials until the admin approves your 1-year
            membership. For payment, contact admin on <strong>WhatsApp only</strong> at{' '}
            <strong>{ADMIN_WHATSAPP_NUMBER}</strong>.
          </p>
          <a
            href={getWhatsAppPaymentUrl(student)}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-block rounded-xl bg-emerald-600 px-4 py-2 text-xs font-bold text-white hover:bg-emerald-700"
          >
            Message Admin on WhatsApp ({ADMIN_WHATSAPP_NUMBER})
          </a>
        </div>
      )}
         {membership.hasAccess && (activeTab === 'mocks' || activeTab === 'notes') && (
            <div className="flex flex-wrap items-center gap-2">
              {['ALL', 'SSC', 'Railway', 'WBPSC'].map(stream => (
                <button
                  key={stream}
                  onClick={() => handleSelectStream(stream)}
                  className={`px-3.5 py-1.5 rounded-full text-xs font-bold border transition ${
                    streamFilter === stream
                      ? 'bg-slate-900 text-white border-slate-900'
                      : 'bg-white text-slate-600 border-slate-200 hover:border-slate-400'
                  }`}
                >
                  {stream === 'ALL' ? 'All Streams' : stream}
                </button>
              ))}
            </div>
          )}
        </div>

        {/* EXAM FOLDER & SUB-FOLDER NAVIGATOR FOR MOCK TESTS */}
        {activeTab === 'mocks' && (
          <div className="mb-6 space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {Object.entries(EXAM_FOLDERS).map(([category, subList]) => {
                const isSelectedStream = streamFilter === category;
                const categoryTotal = mocks.filter(m => m.category === category).length;
                const accent =
                  category === 'SSC'
                    ? 'border-indigo-200 bg-indigo-50/40 text-indigo-900'
                    : category === 'Railway'
                    ? 'border-sky-200 bg-sky-50/40 text-sky-900'
                    : 'border-emerald-200 bg-emerald-50/40 text-emerald-900';

                return (
                  <div
                    key={category}
                    className={`rounded-2xl border p-4 transition ${
                      isSelectedStream ? 'ring-2 ring-indigo-600 bg-white border-indigo-300 shadow-sm' : `${accent} bg-white`
                    }`}
                  >
                    <div className="flex items-center justify-between mb-3">
                      <button
                        type="button"
                        onClick={() => handleSelectStream(isSelectedStream && subFolderFilter === 'ALL' ? 'ALL' : category)}
                        className="flex items-center gap-2 font-extrabold text-sm text-slate-900 hover:text-indigo-700"
                      >
                        {isSelectedStream ? (
                          <FolderOpen className="w-4 h-4 text-indigo-600" />
                        ) : (
                          <Folder className="w-4 h-4 text-amber-500" />
                        )}
                        <span>{category} Section</span>
                      </button>
                      <span className="text-[11px] font-bold px-2 py-0.5 rounded-full bg-slate-100 text-slate-600">
                        {categoryTotal} Mock{categoryTotal === 1 ? '' : 's'}
                      </span>
                    </div>

                    <div className="flex flex-wrap gap-1.5">
                      {subList.map(sub => {
                        const count = mocks.filter(
                          m => m.category === category && getMockSubCategory(m) === sub
                        ).length;
                        const activeSub = streamFilter === category && subFolderFilter === sub;

                        return (
                          <button
                            key={sub}
                            type="button"
                            onClick={() =>
                              activeSub
                                ? handleSelectStream('ALL')
                                : handleSelectFolderShortcut(category, sub)
                            }
                            className={`px-2.5 py-1 rounded-lg text-xs font-bold border transition flex items-center gap-1.5 ${
                              activeSub
                                ? 'bg-indigo-600 text-white border-indigo-600 shadow-sm'
                                : 'bg-white text-slate-700 border-slate-200 hover:border-indigo-400 hover:text-indigo-700'
                            }`}
                          >
                            <span>{sub}</span>
                            <span
                              className={`text-[10px] px-1.5 py-0.2 rounded-full ${
                                activeSub ? 'bg-indigo-500 text-white' : 'bg-slate-100 text-slate-500'
                              }`}
                            >
                              {count}
                            </span>
                          </button>
                        );
                      })}
                    </div>
                  </div>
                );
              })}
            </div>
            {subFolderFilter !== 'ALL' && (
        <div className="rounded-xl border border-indigo-200 bg-indigo-50/50 p-3 flex flex-wrap items-center gap-2">
          <span className="text-xs font-bold text-indigo-900 mr-1">
            {streamFilter} → {subFolderFilter} Subjects:
          </span>
          {['ALL', ...SUBJECT_FOLDERS].map((subj) => (
            <button
              key={subj}
              type="button"
              onClick={() => setSubjectFilter(subj)}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold border transition ${
                subjectFilter === subj
                  ? 'bg-indigo-600 text-white border-indigo-600 shadow-sm'
                  : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-50'
              }`}
            >
              {subj === 'ALL' ? 'All Subjects' : subj}
            </button>
          ))}
        </div>
      )}

            {streamFilter !== 'ALL' && (
              <div className="flex flex-wrap items-center gap-2 bg-white px-4 py-2.5 rounded-xl border border-slate-200 text-xs">
                <span className="font-bold text-slate-500">Folder Path:</span>
                <button
                  type="button"
                  onClick={() => handleSelectStream('ALL')}
                  className="text-indigo-600 font-bold hover:underline"
                >
                  All Exams
                </button>
                <span className="text-slate-400">/</span>
                <button
                  type="button"
                  onClick={() => setSubFolderFilter('ALL')}
                  className={`font-bold ${subFolderFilter === 'ALL' ? 'text-slate-900' : 'text-indigo-600 hover:underline'}`}
                >
                  {streamFilter}
                </button>
                {subFolderFilter !== 'ALL' && (
                  <>
                    <span className="text-slate-400">/</span>
                    <span className="font-extrabold text-slate-900">{subFolderFilter}</span>
                  </>
                )}
              </div>
            )}
          </div>
        )}

        {(activeTab === 'mocks' || activeTab === 'notes') && (
          <div className="relative max-w-md mb-6">
            <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-3" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder={`Search ${activeTab === 'mocks' ? 'mock tests or exam folder' : 'study notes'}...`}
              className="w-full pl-10 pr-4 py-2.5 rounded-xl bg-white border border-slate-200 text-sm focus:ring-2 focus:ring-indigo-500 outline-none"
            />
          </div>
        )}

        {activeTab === 'mocks' && (
          filteredMocks.length === 0 ? (
            <div className="bg-white rounded-2xl border border-slate-200 p-10 text-center text-sm text-slate-500">
              No mock tests published inside <strong>{streamFilter === 'ALL' ? 'this view' : `${streamFilter}${subFolderFilter !== 'ALL' ? ` → ${subFolderFilter}` : ''}`}</strong> yet.
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
              {filteredMocks.map(mock => {
                const totalCandidates = allAttempts.filter(a => a.mockId === mock.id).length;
                const subCat = getMockSubCategory(mock);

                const studentMockAttempts = attempts
                  .filter(a => a.mockId === mock.id)
                  .sort((a, b) => new Date(b.submittedAt || 0) - new Date(a.submittedAt || 0));
                const hasAttempted = studentMockAttempts.length > 0;
                const latestAttempt = studentMockAttempts[0];
                const bestScore = hasAttempted
                  ? Math.max(...studentMockAttempts.map(a => Number(a.score) || 0))
                  : null;

                return (
                  <div
                    key={mock.id}
                    className={`bg-white rounded-2xl border p-5 shadow-sm hover:shadow-md transition flex flex-col justify-between ${
                      hasAttempted ? 'border-emerald-200' : 'border-slate-200'
                    }`}
                  >
                    <div>
                      <div className="flex items-center justify-between gap-2 mb-3">
                        <div className="flex items-center gap-1.5 flex-wrap">
                          <span className={`text-xs font-extrabold px-2.5 py-1 rounded-md ${
                            mock.category === 'SSC' ? 'bg-indigo-50 text-indigo-700 border border-indigo-200' :
                            mock.category === 'Railway' ? 'bg-sky-50 text-sky-700 border border-sky-200' :
                            'bg-emerald-50 text-emerald-700 border border-emerald-200'
                          }`}>
                            {mock.category}
                          </span>
                          <span className="text-xs font-bold px-2.5 py-1 rounded-md bg-amber-50 text-amber-800 border border-amber-200">
                            {subCat}
                          </span>
                          {hasAttempted && (
                            <span className="text-[11px] font-extrabold px-2 py-1 rounded-md bg-emerald-50 text-emerald-700 border border-emerald-200 flex items-center gap-1">
                              <CheckCircle2 className="w-3 h-3" />
                              Attempted ({studentMockAttempts.length}×)
                            </span>
                          )}
                        </div>
                        <span className="text-xs font-semibold text-slate-500 flex items-center gap-1 shrink-0">
                          <Clock className="w-3.5 h-3.5" /> {mock.durationMinutes} Mins
                        </span>
                      </div>

                      <h3 className="font-bold text-slate-900 text-base leading-snug mb-3">{mock.title}</h3>

                      <div className="grid grid-cols-3 gap-2 bg-slate-50 rounded-xl p-2.5 text-center border border-slate-100 mb-3">
                        <div>
                          <div className="text-xs text-slate-400">Questions</div>
                          <div className="font-bold text-sm text-slate-800">{mock.questions?.length || 0}</div>
                        </div>
                        <div className="border-x border-slate-200">
                          <div className="text-xs text-slate-400">Correct</div>
                          <div className="font-bold text-sm text-emerald-600">+{mock.positiveMark}</div>
                        </div>
                        <div>
                          <div className="text-xs text-slate-400">Negative</div>
                          <div className="font-bold text-sm text-rose-600">-{mock.negativeMark}</div>
                        </div>
                      </div>

                      <div className="text-[11px] text-slate-500 mb-4 flex items-center justify-between">
                        {hasAttempted ? (
                          <span className="text-emerald-700 font-bold">
                            Best Score: {bestScore} / {latestAttempt.maxScore}
                          </span>
                        ) : (
                          <span>{totalCandidates} Attempt{totalCandidates === 1 ? '' : 's'} Recorded</span>
                        )}
                        <span className="text-indigo-600 font-semibold">Live Rank Enabled</span>
                      </div>
                    </div>

                    <div className="flex items-center gap-2">
                      {hasAttempted && (
                        <button
                          type="button"
                          onClick={() => onViewAttemptReport(latestAttempt)}
                          className="px-3.5 py-2.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-800 font-bold text-xs transition flex items-center justify-center gap-1.5 shrink-0"
                          title="View Last Evaluation Report"
                        >
                          <BarChart3 className="w-3.5 h-3.5 text-indigo-600" />
                          <span>Report</span>
                        </button>
                      )}
                      <button
                        type="button"
                        onClick={() => onStartMock(mock)}
                        className={`w-full py-2.5 rounded-xl text-white font-bold text-sm transition flex items-center justify-center gap-2 ${
                          hasAttempted
                            ? 'bg-amber-600 hover:bg-amber-700'
                            : 'bg-indigo-600 hover:bg-indigo-700'
                        }`}
                      >
                        {hasAttempted ? (
                          <>
                            <RotateCcw className="w-4 h-4" />
                            <span>Reattempt Mock</span>
                          </>
                        ) : (
                          <>
                            <span>Attempt TCS iON Mock</span>
                            <ArrowRight className="w-4 h-4" />
                          </>
                        )}
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )
        )}

        {activeTab === 'notes' && (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
            {filteredNotes.map(note => (
              <div key={note.id} className="bg-white rounded-2xl border border-slate-200 p-5 shadow-sm hover:shadow-md transition flex flex-col justify-between">
                <div>
                  <div className="flex items-center justify-between gap-2 mb-3">
                    <span className={`text-xs font-extrabold px-2.5 py-1 rounded-md ${
                      note.category === 'SSC' ? 'bg-indigo-50 text-indigo-700 border border-indigo-200' :
                      note.category === 'Railway' ? 'bg-sky-50 text-sky-700 border border-sky-200' :
                      'bg-emerald-50 text-emerald-700 border border-emerald-200'
                    }`}>
                      {note.category} • {note.subject}
                    </span>
                    <span className="text-xs text-slate-400">{note.readTime}</span>
                  </div>
                  <h3 className="font-bold text-slate-900 text-base mb-2">{note.title}</h3>
                  <p className="text-xs text-slate-600 leading-relaxed mb-4">{note.summary}</p>
                </div>
                <button
                  onClick={() => onOpenNote(note)}
                  className="w-full py-2.5 rounded-xl bg-slate-900 hover:bg-slate-800 text-white font-bold text-sm transition flex items-center justify-center gap-2"
                >
                  <BookOpen className="w-4 h-4" />
                  <span>Read & Print Capsule</span>
                </button>
              </div>
            ))}
          </div>
        )}

        {activeTab === 'history' && (
          <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-sm">
            <div className="p-5 border-b border-slate-100">
              <h3 className="font-bold text-slate-900">Your Past Mock Attempts & Live Rankings</h3>
            </div>
            {attempts.length === 0 ? (
              <div className="p-10 text-center text-sm text-slate-500">
                You haven't submitted any mock tests yet. Go to <strong>CBT Mock Tests</strong> to attempt your first test!
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-sm">
                  <thead className="bg-slate-50 text-slate-600 text-xs uppercase">
                    <tr>
                      <th className="px-5 py-3">Mock Test</th>
                      <th className="px-5 py-3">Date</th>
                      <th className="px-5 py-3">Live Rank</th>
                      <th className="px-5 py-3">Score</th>
                      <th className="px-5 py-3">Accuracy</th>
                      <th className="px-5 py-3">Time Taken</th>
                      <th className="px-5 py-3">Analysis</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {attempts.map(att => (
                      <tr key={att.id} className="hover:bg-slate-50">
                        <td className="px-5 py-3.5 font-semibold text-slate-900">{att.mockTitle}</td>
                        <td className="px-5 py-3.5 text-xs font-medium text-slate-600">{formatAttemptDate(att)}</td>
                        <td className="px-5 py-3.5 font-bold text-amber-600">{getRankForAttempt(att)}</td>
                        <td className="px-5 py-3.5 font-bold text-indigo-600">{att.score} / {att.maxScore}</td>
                        <td className="px-5 py-3.5">{att.accuracy}%</td>
                        <td className="px-5 py-3.5 text-slate-600 text-xs">{formatDurationHuman(att.totalTimeSeconds)}</td>
                        <td className="px-5 py-3.5">
                          <button
                            onClick={() => onViewAttemptReport(att)}
                            className="px-3 py-1 rounded-lg bg-indigo-50 hover:bg-indigo-100 text-indigo-700 text-xs font-bold"
                          >
                            View Report
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}

        {activeTab === 'profile' && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-sm">
              <h3 className="font-bold text-lg text-slate-900 mb-4">Candidate Identity Card</h3>
              <div className="space-y-3 text-sm">
                <div className="flex justify-between py-2 border-b border-slate-100">
                  <span className="text-slate-500">Unique Login ID</span>
                  <span className="font-mono font-bold text-indigo-600">{student.id}</span>
                </div>
                <div className="flex justify-between py-2 border-b border-slate-100">
                  <span className="text-slate-500">Full Name</span>
                  <span className="font-semibold">{student.name}</span>
                </div>
                <div className="flex justify-between py-2 border-b border-slate-100">
                  <span className="text-slate-500">Registered Email</span>
                  <span className="font-medium">{student.email}</span>
                </div>
                <div className="flex justify-between py-2 border-b border-slate-100">
                  <span className="text-slate-500">Mobile Number</span>
                  <span className="font-medium">{student.phone}</span>
                </div>
                <div className="flex justify-between py-2">
                  <span className="text-slate-500">Target Stream</span>
                  <span className="font-bold">{student.targetExam}</span>
                </div>
              </div>
            </div>

            <ChangePasswordCard onChangePassword={onChangePassword} />
          </div>
        )}
      </main>
    </div>
  );
}

// ============================================================================
// COMPONENT 3: CHANGE PASSWORD WIDGET
// ============================================================================
function ChangePasswordCard({ onChangePassword }) {
  const [oldPass, setOldPass] = useState('');
  const [newPass, setNewPass] = useState('');
  const [confirmPass, setConfirmPass] = useState('');
  const [status, setStatus] = useState(null);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setStatus(null);
    if (newPass !== confirmPass) {
      setStatus({ type: 'error', text: 'New password and confirm password do not match.' });
      return;
    }
    const res = await onChangePassword(oldPass, newPass);
    if (res.success) {
      setStatus({ type: 'success', text: 'Password changed successfully!' });
      setOldPass('');
      setNewPass('');
      setConfirmPass('');
    } else {
      setStatus({ type: 'error', text: res.message });
    }
  };

  return (
    <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-sm">
      <h3 className="font-bold text-lg text-slate-900 mb-1">Change Account Password</h3>
      <p className="text-xs text-slate-500 mb-4">Update your login password anytime.</p>

      {status && (
        <div className={`mb-4 p-3 rounded-xl text-xs font-medium ${
          status.type === 'error' ? 'bg-rose-50 text-rose-700 border border-rose-200' : 'bg-emerald-50 text-emerald-700 border border-emerald-200'
        }`}>
          {status.text}
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-3.5">
        <div>
          <label className="block text-xs font-bold text-slate-700 mb-1">Current Password</label>
          <input
            type="password"
            required
            value={oldPass}
            onChange={(e) => setOldPass(e.target.value)}
            className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 text-sm outline-none focus:ring-2 focus:ring-indigo-500"
          />
        </div>
        <div>
          <label className="block text-xs font-bold text-slate-700 mb-1">New Password (min 6 characters)</label>
          <input
            type="password"
            required
            minLength={6}
            value={newPass}
            onChange={(e) => setNewPass(e.target.value)}
            className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 text-sm outline-none focus:ring-2 focus:ring-indigo-500"
          />
        </div>
        <div>
          <label className="block text-xs font-bold text-slate-700 mb-1">Confirm New Password</label>
          <input
            type="password"
            required
            minLength={6}
            value={confirmPass}
            onChange={(e) => setConfirmPass(e.target.value)}
            className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 text-sm outline-none focus:ring-2 focus:ring-indigo-500"
          />
        </div>
        <button
          type="submit"
          className="w-full py-2.5 rounded-xl bg-slate-900 hover:bg-slate-800 text-white font-bold text-sm transition"
        >
          Update Password
        </button>
      </form>
    </div>
  );
}

// ============================================================================
// COMPONENT 4: TCS iON CBT EXAM ENGINE (GREEN TICK ON ANSWERED & MARKED + AUTO-SUBMIT)
// ============================================================================
function ExamInstructionsScreen({ mock, student, onStart, onCancel }) {
  const [agreed, setAgreed] = useState(false);

  return (
    <div className="min-h-screen bg-slate-100 flex flex-col">
      <div className="bg-[#2c5aa0] text-white px-6 py-3 flex items-center justify-between shadow">
        <div className="font-bold text-base">PATHSHALA — TCS iON CBT Examination System</div>
        <div className="text-xs font-mono">Candidate ID: {student.id}</div>
      </div>

      <div className="max-w-4xl w-full mx-auto my-8 bg-white rounded-xl shadow border border-slate-300 p-6 sm:p-8">
        <h2 className="text-xl font-bold text-slate-900 border-b border-slate-200 pb-3 mb-4">
          General Instructions — {mock.title}
        </h2>

        <div className="space-y-3 text-sm text-slate-700 leading-relaxed mb-6">
          <p><strong>1. Exam Folder:</strong> {mock.category} → <strong>{getMockSubCategory(mock)}</strong></p>
          <p><strong>2. Duration & Marking:</strong> Total duration is <strong>{mock.durationMinutes} minutes</strong>. Each correct answer awards <strong>+{mock.positiveMark}</strong> marks, and each wrong answer deducts <strong>-{mock.negativeMark}</strong> marks. If time expires, your exam will be auto-submitted and evaluated automatically.</p>
          <p><strong>3. Question Palette Legend:</strong> Questions marked as <strong>Answered &amp; Marked for Review</strong> (purple circle with green <strong>✓</strong> tick) are considered for evaluation.</p>
          <p><strong>4. Specific Exam Note:</strong> {mock.instructions}</p>
        </div>

        <label className="flex items-start gap-3 p-3.5 rounded-lg bg-amber-50 border border-amber-200 text-xs text-slate-800 cursor-pointer mb-6">
          <input
            type="checkbox"
            checked={agreed}
            onChange={(e) => setAgreed(e.target.checked)}
            className="mt-0.5 w-4 h-4 accent-indigo-600"
          />
          <span>
            I have read and understood all the instructions. I agree that in case of not adhering to the exam rules, my candidature may be cancelled.
          </span>
        </label>

        <div className="flex items-center justify-between">
          <button
            onClick={onCancel}
            className="px-5 py-2.5 rounded-lg border border-slate-300 text-sm font-semibold text-slate-700 hover:bg-slate-100"
          >
            Back to Dashboard
          </button>
          <button
            disabled={!agreed}
            onClick={onStart}
            className={`px-6 py-2.5 rounded-lg text-sm font-bold text-white transition ${
              agreed ? 'bg-[#2c5aa0] hover:bg-blue-800 shadow' : 'bg-slate-400 cursor-not-allowed'
            }`}
          >
            I am ready to begin
          </button>
        </div>
      </div>
    </div>
  );
}

function TcsIonExamInterface({ mock, student, onSubmitExam, onExit }) {
  const questions = mock.questions || [];
  const sections = useMemo(() => [...new Set(questions.map(q => q.section))], [questions]);
  const totalExamSeconds = (mock.durationMinutes || 60) * 60;

  const [currentIdx, setCurrentIdx] = useState(0);
  const [answers, setAnswers] = useState({});
  const [statuses, setStatuses] = useState(() => {
    const init = {};
    questions.forEach((_, idx) => { init[idx] = idx === 0 ? 'not_answered' : 'not_visited'; });
    return init;
  });
  const [secondsLeft, setSecondsLeft] = useState(totalExamSeconds);
  const [showSubmitModal, setShowSubmitModal] = useState(false);

  const [questionTimes, setQuestionTimes] = useState({});

  const currentIdxRef = useRef(currentIdx);
  const answersRef = useRef(answers);
  const questionTimesRef = useRef(questionTimes);
  const secondsLeftRef = useRef(secondsLeft);
  const hasSubmittedRef = useRef(false);

  useEffect(() => { currentIdxRef.current = currentIdx; }, [currentIdx]);
  useEffect(() => { answersRef.current = answers; }, [answers]);
  useEffect(() => { questionTimesRef.current = questionTimes; }, [questionTimes]);
  useEffect(() => { secondsLeftRef.current = secondsLeft; }, [secondsLeft]);

  const finalizeSubmission = useCallback((isAutoSubmit = false) => {
    if (hasSubmittedRef.current) return;
    hasSubmittedRef.current = true;

    const latestAnswers = answersRef.current || {};
    const latestQuestionTimes = questionTimesRef.current || {};
    const remainingSec = isAutoSubmit ? 0 : (secondsLeftRef.current ?? 0);

    let correct = 0, wrong = 0, unattempted = 0;
    questions.forEach((q, idx) => {
      const chosen = latestAnswers[idx];
      if (chosen === undefined) {
        unattempted++;
      } else if (chosen === q.correctIndex) {
        correct++;
      } else {
        wrong++;
      }
    });

    const rawScore = (correct * mock.positiveMark) - (wrong * mock.negativeMark);
    const score = Number(rawScore.toFixed(2));
    const maxScore = Number((questions.length * mock.positiveMark).toFixed(2));
    const attemptedTotal = correct + wrong;
    const accuracy = attemptedTotal > 0 ? Math.round((correct / attemptedTotal) * 100) : 0;

    const elapsedByClock = totalExamSeconds - remainingSec;
    const sumQuestionSeconds = Object.values(latestQuestionTimes).reduce((acc, v) => acc + v, 0);
    const totalTimeSeconds = isAutoSubmit
      ? totalExamSeconds
      : Math.max(1, elapsedByClock > 0 ? elapsedByClock : sumQuestionSeconds);

    onSubmitExam({
      id: `att-${Date.now()}`,
      studentId: student.id,
      studentName: student.name,
      mockId: mock.id,
      mockTitle: mock.title,
      category: mock.category,
      subCategory: getMockSubCategory(mock),
      score,
      maxScore,
      correct,
      wrong,
      unattempted,
      accuracy,
      totalTimeSeconds,
      questionTimes: latestQuestionTimes,
      userAnswers: latestAnswers,
      autoSubmitted: isAutoSubmit,
      submittedAt: new Date().toISOString()
    });
  }, [mock, questions, student, totalExamSeconds, onSubmitExam]);

  useEffect(() => {
    const timer = setInterval(() => {
      if (hasSubmittedRef.current) {
        clearInterval(timer);
        return;
      }

      const activeQ = currentIdxRef.current;
      const updatedTimes = {
        ...questionTimesRef.current,
        [activeQ]: (questionTimesRef.current[activeQ] || 0) + 1
      };
      questionTimesRef.current = updatedTimes;
      setQuestionTimes(updatedTimes);

      setSecondsLeft(prev => {
        if (prev <= 1) {
          clearInterval(timer);
          secondsLeftRef.current = 0;
          setTimeout(() => finalizeSubmission(true), 0);
          return 0;
        }
        secondsLeftRef.current = prev - 1;
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, [finalizeSubmission]);

  const currentQ = questions[currentIdx];

  const navigateToQuestion = (targetIdx) => {
    setStatuses(prev => {
      const next = { ...prev };
      if (next[targetIdx] === 'not_visited') {
        next[targetIdx] = 'not_answered';
      }
      return next;
    });
    setCurrentIdx(targetIdx);
  };

  const handleSelectOption = (optIdx) => {
    setAnswers(prev => {
      const next = { ...prev, [currentIdx]: optIdx };
      answersRef.current = next;
      return next;
    });
    setStatuses(prev => {
      if (prev[currentIdx] === 'marked') {
        return { ...prev, [currentIdx]: 'answered_marked' };
      }
      return prev;
    });
  };

  const handleClearResponse = () => {
    setAnswers(prev => {
      const next = { ...prev };
      delete next[currentIdx];
      answersRef.current = next;
      return next;
    });
    setStatuses(prev => ({
      ...prev,
      [currentIdx]: prev[currentIdx] === 'answered_marked' ? 'marked' : 'not_answered'
    }));
  };

  const handleSaveAndNext = () => {
    const hasAns = answersRef.current[currentIdx] !== undefined;
    setStatuses(prev => ({
      ...prev,
      [currentIdx]: hasAns ? 'answered' : 'not_answered'
    }));
    if (currentIdx + 1 < questions.length) {
      navigateToQuestion(currentIdx + 1);
    }
  };

  const handleMarkForReviewAndNext = () => {
    const hasAns = answersRef.current[currentIdx] !== undefined;
    setStatuses(prev => ({
      ...prev,
      [currentIdx]: hasAns ? 'answered_marked' : 'marked'
    }));
    if (currentIdx + 1 < questions.length) {
      navigateToQuestion(currentIdx + 1);
    }
  };

  const counts = useMemo(() => {
    let answered = 0, notAnswered = 0, notVisited = 0, marked = 0, answeredMarked = 0;
    Object.values(statuses).forEach(st => {
      if (st === 'answered') answered++;
      else if (st === 'not_answered') notAnswered++;
      else if (st === 'not_visited') notVisited++;
      else if (st === 'marked') marked++;
      else if (st === 'answered_marked') answeredMarked++;
    });
    return { answered, notAnswered, notVisited, marked, answeredMarked };
  }, [statuses]);

  if (!currentQ) return null;

  return (
    <div className="h-screen flex flex-col bg-white select-none overflow-hidden">
      <div className="bg-[#2c5aa0] text-white px-4 py-2 flex items-center justify-between text-xs sm:text-sm shrink-0">
        <div className="font-bold truncate">{mock.title}</div>
        <div className="flex items-center gap-4">
          <span className="hidden md:inline text-blue-100">{mock.category} • {getMockSubCategory(mock)}</span>
          <button onClick={onExit} className="bg-blue-900/70 hover:bg-rose-600 px-2.5 py-1 rounded text-xs font-semibold">
            Exit Test
          </button>
        </div>
      </div>

      <div className="bg-slate-100 border-b border-slate-300 px-4 py-2 flex flex-wrap items-center justify-between gap-2 shrink-0">
        <div className="flex items-center gap-1.5 overflow-x-auto">
          <span className="text-xs font-bold text-slate-500 mr-1">Sections:</span>
          {sections.map(sec => {
            const firstIdxInSec = questions.findIndex(q => q.section === sec);
            const isActive = currentQ.section === sec;
            return (
              <button
                key={sec}
                onClick={() => navigateToQuestion(firstIdxInSec)}
                className={`px-3 py-1 rounded text-xs font-bold border transition whitespace-nowrap ${
                  isActive
                    ? 'bg-[#2c5aa0] text-white border-[#2c5aa0]'
                    : 'bg-white text-slate-700 border-slate-300 hover:bg-slate-200'
                }`}
              >
                {sec}
              </button>
            );
          })}
        </div>

        <div className="flex items-center gap-3">
          <div className="hidden sm:flex items-center gap-1.5 bg-blue-50 px-2.5 py-1 rounded border border-blue-200 text-xs text-blue-900">
            <Timer className="w-3.5 h-3.5 text-[#2c5aa0]" />
            <span>Q{currentIdx + 1} Time: <strong>{questionTimes[currentIdx] || 0}s</strong></span>
          </div>
          <div className="flex items-center gap-2 bg-white px-3 py-1 rounded border border-slate-300">
            <span className="text-xs font-bold text-slate-600">Time Left:</span>
            <span className={`font-mono font-extrabold text-sm ${secondsLeft < 300 ? 'text-rose-600 animate-pulse' : 'text-slate-900'}`}>
              {formatTime(secondsLeft)}
            </span>
          </div>
        </div>
      </div>

      <div className="flex-1 flex flex-col lg:flex-row overflow-hidden">
        <div className="lg:w-9/12 flex flex-col border-r border-slate-300 overflow-hidden">
          <div className="px-5 py-2.5 bg-slate-50 border-b border-slate-200 flex items-center justify-between text-xs shrink-0">
            <span className="font-bold text-slate-800 text-sm">Question No. {currentIdx + 1}</span>
            <div className="flex items-center gap-3">
              <span className="text-emerald-700 font-bold">Marks: +{mock.positiveMark}</span>
              <span className="text-rose-600 font-bold">Negative: -{mock.negativeMark}</span>
            </div>
          </div>

          <div className="flex-1 overflow-y-auto p-6 space-y-5 text-left">
            <div className="text-base text-slate-900 font-medium whitespace-pre-line leading-relaxed text-left">
             {renderFormattedText(currentQ.text)}
            </div>
{currentQ.imageUrl && (
              <div className="my-3">
                <img
                  src={currentQ.imageUrl}
                  alt={`Question ${currentIdx + 1} Diagram`}
                  className="max-h-64 rounded-lg border border-slate-300 bg-white p-2 object-contain shadow-sm"
                />
              </div>
            )}
            <div className="space-y-3 max-w-2xl">
              {currentQ.options.map((opt, idx) => {
                const isSelected = answers[currentIdx] === idx;
                return (
                  <label
                    key={idx}
                    onClick={() => handleSelectOption(idx)}
                    className={`flex items-center gap-3.5 p-3.5 rounded-lg border cursor-pointer transition ${
                      isSelected
                        ? 'bg-blue-50 border-[#2c5aa0] ring-1 ring-[#2c5aa0]'
                        : 'bg-white border-slate-300 hover:bg-slate-50'
                    }`}
                  >
                    <input
                      type="radio"
                      name={`q-${currentIdx}`}
                      checked={isSelected}
                      onChange={() => {}}
                      className="w-4 h-4 accent-[#2c5aa0]"
                    />
                    <span className="text-sm text-slate-800 font-medium">
                      <strong className="mr-2 text-slate-500">({String.fromCharCode(65 + idx)})</strong>
                      {opt}
                    </span>
                  </label>
                );
              })}
            </div>
          </div>

          <div className="px-4 py-3 bg-slate-100 border-t border-slate-300 flex flex-wrap items-center justify-between gap-2 shrink-0">
            <div className="flex flex-wrap gap-2">
              <button
                type="button"
                onClick={handleMarkForReviewAndNext}
                className="px-4 py-2 rounded bg-white hover:bg-slate-200 border border-slate-400 text-xs font-bold text-slate-800"
              >
                Mark for Review & Next
              </button>
              <button
                type="button"
                onClick={handleClearResponse}
                className="px-4 py-2 rounded bg-white hover:bg-slate-200 border border-slate-400 text-xs font-bold text-slate-800"
              >
                Clear Response
              </button>
            </div>

            <button
              type="button"
              onClick={handleSaveAndNext}
              className="px-6 py-2 rounded bg-[#2c5aa0] hover:bg-blue-800 text-white text-xs font-bold shadow"
            >
              Save & Next
            </button>
          </div>
        </div>

        <div className="lg:w-3/12 bg-[#e8f1f8] flex flex-col justify-between overflow-y-auto">
          <div>
            <div className="p-3 bg-white border-b border-slate-300 flex items-center gap-3">
              <div className="w-10 h-10 rounded bg-slate-200 border border-slate-300 flex items-center justify-center font-bold text-slate-700">
                {student.name.charAt(0)}
              </div>
              <div className="overflow-hidden">
                <div className="text-xs font-bold text-slate-900 truncate">{student.name}</div>
                <div className="text-[11px] font-mono text-slate-500">{student.id}</div>
              </div>
            </div>

            <div className="p-3 bg-white border-b border-slate-300 grid grid-cols-2 gap-2 text-[11px]">
              <div className="flex items-center gap-2">
                <span className="w-6 h-6 rounded-b-lg bg-emerald-600 text-white font-bold flex items-center justify-center shrink-0">
                  {counts.answered}
                </span>
                <span>Answered</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="w-6 h-6 rounded-t-lg bg-rose-600 text-white font-bold flex items-center justify-center shrink-0">
                  {counts.notAnswered}
                </span>
                <span>Not Answered</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="w-6 h-6 rounded bg-slate-200 border border-slate-400 text-slate-800 font-bold flex items-center justify-center shrink-0">
                  {counts.notVisited}
                </span>
                <span>Not Visited</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="w-6 h-6 rounded-full bg-purple-700 text-white font-bold flex items-center justify-center shrink-0">
                  {counts.marked}
                </span>
                <span>Marked for Review</span>
              </div>
              <div className="col-span-2 flex items-center gap-2 pt-1 border-t border-slate-100">
                <span className="w-6 h-6 rounded-full bg-purple-700 text-white font-bold flex items-center justify-center relative shrink-0">
                  {counts.answeredMarked}
                  <span className="w-3 h-3 rounded-full bg-emerald-500 text-white text-[9px] font-black flex items-center justify-center absolute -bottom-0.5 -right-0.5 border border-white">
                    ✓
                  </span>
                </span>
                <span>Answered &amp; Marked for Review (Evaluated)</span>
              </div>
            </div>

            <div className="bg-[#2c5aa0] text-white px-3 py-1.5 text-xs font-bold">
              Choose a Question
            </div>

            <div className="p-3 grid grid-cols-5 gap-2">
              {questions.map((_, idx) => {
                const st = statuses[idx];
                const isCurrent = idx === currentIdx;
                let badgeStyle = 'bg-slate-200 border border-slate-400 text-slate-800 rounded';
                if (st === 'answered') badgeStyle = 'bg-emerald-600 text-white rounded-b-xl';
                if (st === 'not_answered') badgeStyle = 'bg-rose-600 text-white rounded-t-xl';
                if (st === 'marked' || st === 'answered_marked') badgeStyle = 'bg-purple-700 text-white rounded-full';

                return (
                  <button
                    key={idx}
                    onClick={() => navigateToQuestion(idx)}
                    className={`h-9 font-bold text-xs flex items-center justify-center relative transition ${badgeStyle} ${
                      isCurrent ? 'ring-2 ring-offset-1 ring-amber-500' : ''
                    }`}
                  >
                    {idx + 1}
                    {st === 'answered_marked' && (
                      <span
                        title="Answered & Marked for Review"
                        className="w-3.5 h-3.5 rounded-full bg-emerald-500 text-white text-[9px] font-black flex items-center justify-center absolute -bottom-0.5 -right-0.5 border border-white shadow-sm"
                      >
                        ✓
                      </span>
                    )}
                  </button>
                );
              })}
            </div>
          </div>

          <div className="p-3 bg-white border-t border-slate-300">
            <button
              type="button"
              onClick={() => setShowSubmitModal(true)}
              className="w-full py-2.5 rounded bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-sm shadow"
            >
              Submit Test
            </button>
          </div>
        </div>
      </div>

      {showSubmitModal && (
        <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl">
            <h3 className="text-lg font-bold text-slate-900 mb-2">Exam Summary & Final Submission</h3>
            <p className="text-xs text-slate-500 mb-4">Are you sure you want to submit your test?</p>
            <div className="grid grid-cols-2 gap-2.5 bg-slate-50 p-4 rounded-xl border border-slate-200 text-xs mb-5">
              <div>Total Questions: <strong>{questions.length}</strong></div>
              <div>Answered: <strong className="text-emerald-600">{Object.keys(answers).length}</strong></div>
              <div>Marked &amp; Answered: <strong className="text-purple-700">{counts.answeredMarked}</strong></div>
              <div>Not Answered: <strong className="text-rose-600">{counts.notAnswered}</strong></div>
              <div>Marked Only: <strong className="text-slate-700">{counts.marked}</strong></div>
              <div>Not Visited: <strong>{counts.notVisited}</strong></div>
            </div>
            <div className="flex justify-end gap-2">
              <button
                onClick={() => setShowSubmitModal(false)}
                className="px-4 py-2 rounded-lg border border-slate-300 text-xs font-bold text-slate-700"
              >
                Resume Test
              </button>
              <button
                onClick={() => finalizeSubmission(false)}
                className="px-5 py-2 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold"
              >
                Yes, Submit Final Test
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// ============================================================================
// COMPONENT 5: SCORECARD, RANK, STRENGTH/WEAKNESS & PER-QUESTION TIME REVIEW
// ============================================================================
function ExamScorecardScreen({ mock, attempt, allMockAttempts, onBackToDashboard }) {
  const rankedAttempts = useMemo(() => {
    const list = allMockAttempts.some(a => a.id === attempt.id)
      ? [...allMockAttempts]
      : [attempt, ...allMockAttempts];

    return list.sort((a, b) => {
      if (b.score !== a.score) return b.score - a.score;
      if (b.accuracy !== a.accuracy) return b.accuracy - a.accuracy;
      return (a.totalTimeSeconds || 99999) - (b.totalTimeSeconds || 99999);
    });
  }, [allMockAttempts, attempt]);

  const candidateRank = rankedAttempts.findIndex(a => a.id === attempt.id) + 1;
  const totalCandidates = rankedAttempts.length;
  const percentile = totalCandidates > 1
    ? Math.round(((totalCandidates - candidateRank) / (totalCandidates - 1)) * 100)
    : 100;

  const sectionAnalysis = useMemo(() => {
    const map = {};
    mock.questions.forEach((q, idx) => {
      const sec = q.section || 'General';
      if (!map[sec]) {
        map[sec] = { section: sec, total: 0, correct: 0, wrong: 0, unattempted: 0, timeSeconds: 0 };
      }
      map[sec].total += 1;
      map[sec].timeSeconds += (attempt.questionTimes?.[idx] || 0);
      const ans = attempt.userAnswers?.[idx];
      if (ans === undefined) map[sec].unattempted += 1;
      else if (ans === q.correctIndex) map[sec].correct += 1;
      else map[sec].wrong += 1;
    });

    return Object.values(map).map(s => {
      const attempted = s.correct + s.wrong;
      const accuracy = attempted > 0 ? Math.round((s.correct / attempted) * 100) : 0;
      const netScore = Number(((s.correct * mock.positiveMark) - (s.wrong * mock.negativeMark)).toFixed(2));
      let tag = 'Average';
      if (attempted > 0 && accuracy >= 70) tag = 'Strength';
      else if (attempted === 0 || accuracy < 50) tag = 'Weakness';
      return { ...s, attempted, accuracy, netScore, tag };
    });
  }, [mock, attempt]);

  const strengths = sectionAnalysis.filter(s => s.tag === 'Strength');
  const weaknesses = sectionAnalysis.filter(s => s.tag === 'Weakness');
  const avgTimePerQ = mock.questions.length > 0
    ? Math.round((attempt.totalTimeSeconds || 0) / mock.questions.length)
    : 0;

  return (
    <div className="min-h-screen bg-slate-50 py-8 px-4">
      <div className="max-w-5xl mx-auto space-y-6">
        <div className="bg-white rounded-2xl border border-slate-200 p-6 sm:p-8 shadow-sm">
          <div className="flex flex-wrap items-center justify-between gap-4 border-b border-slate-100 pb-5 mb-6">
            <div>
              <div className="flex items-center gap-2">
                <span className="text-xs font-bold uppercase tracking-wider text-indigo-600">PATHSHALA Official Evaluation Report</span>
                {attempt.autoSubmitted && (
                  <span className="text-[11px] font-bold px-2 py-0.5 rounded bg-amber-100 text-amber-800">
                    Auto-Submitted on Timeout
                  </span>
                )}
              </div>
              <h2 className="text-2xl font-extrabold text-slate-900 mt-1">{mock.title}</h2>
              <p className="text-xs text-slate-500 mt-1">
                Candidate: <strong>{attempt.studentName}</strong> ({attempt.studentId}) • Folder: <strong>{mock.category} → {getMockSubCategory(mock)}</strong> • Total Time: <strong>{formatDurationHuman(attempt.totalTimeSeconds)}</strong> (Avg {avgTimePerQ}s/Q)
              </p>
            </div>
            <button
              onClick={onBackToDashboard}
              className="px-4 py-2 rounded-xl bg-slate-900 hover:bg-slate-800 text-white text-xs font-bold"
            >
              Back to Dashboard
            </button>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-5 gap-3.5">
            <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 text-center">
              <div className="text-xs text-amber-800 font-bold flex items-center justify-center gap-1">
                <Award className="w-3.5 h-3.5" /> Portal Rank
              </div>
              <div className="text-2xl font-black text-amber-950 mt-1">#{candidateRank} <span className="text-xs font-semibold text-amber-700">/ {totalCandidates}</span></div>
              <div className="text-[11px] text-amber-700 font-semibold mt-0.5">{percentile}%ile</div>
            </div>
            <div className="bg-indigo-50 border border-indigo-100 rounded-xl p-4 text-center">
              <div className="text-xs text-indigo-600 font-semibold">Net Score</div>
              <div className="text-2xl font-black text-indigo-950 mt-1">{attempt.score} / {attempt.maxScore}</div>
            </div>
            <div className="bg-emerald-50 border border-emerald-100 rounded-xl p-4 text-center">
              <div className="text-xs text-emerald-600 font-semibold">Correct</div>
              <div className="text-2xl font-black text-emerald-900 mt-1">{attempt.correct}</div>
            </div>
            <div className="bg-rose-50 border border-rose-100 rounded-xl p-4 text-center">
              <div className="text-xs text-rose-600 font-semibold">Incorrect</div>
              <div className="text-2xl font-black text-rose-900 mt-1">{attempt.wrong}</div>
            </div>
            <div className="bg-slate-100 border border-slate-200 rounded-xl p-4 text-center">
              <div className="text-xs text-slate-600 font-semibold">Accuracy</div>
              <div className="text-2xl font-black text-slate-900 mt-1">{attempt.accuracy}%</div>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-sm space-y-5">
          <div>
            <h3 className="font-bold text-lg text-slate-900">Section-Wise Strengths & Weaknesses Analysis</h3>
            <p className="text-xs text-slate-500">Diagnostic evaluation based on your section accuracy and time management.</p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="p-4 rounded-xl bg-emerald-50/70 border border-emerald-200">
              <div className="flex items-center gap-2 text-emerald-800 font-bold text-sm mb-2">
                <TrendingUp className="w-4 h-4" /> Your Strong Areas (≥70% Accuracy)
              </div>
              {strengths.length === 0 ? (
                <p className="text-xs text-emerald-700">No section crossed 70% accuracy yet. Review explanations below to build mastery.</p>
              ) : (
                <ul className="space-y-1 text-xs text-emerald-900 font-medium">
                  {strengths.map(s => (
                    <li key={s.section}>• <strong>{s.section}</strong> — {s.accuracy}% accuracy ({s.correct}/{s.total} correct in {formatDurationHuman(s.timeSeconds)})</li>
                  ))}
                </ul>
              )}
            </div>

            <div className="p-4 rounded-xl bg-rose-50/70 border border-rose-200">
              <div className="flex items-center gap-2 text-rose-800 font-bold text-sm mb-2">
                <TrendingDown className="w-4 h-4" /> Focus / Weak Areas (&lt;50% Accuracy)
              </div>
              {weaknesses.length === 0 ? (
                <p className="text-xs text-rose-700">Great balance! None of your sections fell below 50% accuracy.</p>
              ) : (
                <ul className="space-y-1 text-xs text-rose-900 font-medium">
                  {weaknesses.map(s => (
                    <li key={s.section}>• <strong>{s.section}</strong> — {s.accuracy}% accuracy ({s.wrong} wrong, {s.unattempted} skipped • {formatDurationHuman(s.timeSeconds)})</li>
                  ))}
                </ul>
              )}
            </div>
          </div>

          <div className="overflow-x-auto border border-slate-200 rounded-xl">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 text-slate-600 uppercase">
                <tr>
                  <th className="px-4 py-3">Section</th>
                  <th className="px-4 py-3">Attempted</th>
                  <th className="px-4 py-3">Correct / Wrong</th>
                  <th className="px-4 py-3">Net Score</th>
                  <th className="px-4 py-3">Accuracy</th>
                  <th className="px-4 py-3">Time Spent</th>
                  <th className="px-4 py-3">Verdict</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {sectionAnalysis.map(s => (
                  <tr key={s.section}>
                    <td className="px-4 py-3 font-bold text-slate-900">{s.section}</td>
                    <td className="px-4 py-3">{s.attempted} / {s.total}</td>
                    <td className="px-4 py-3">
                      <span className="text-emerald-600 font-bold">{s.correct}C</span> / <span className="text-rose-600 font-bold">{s.wrong}W</span>
                    </td>
                    <td className="px-4 py-3 font-bold text-indigo-600">{s.netScore}</td>
                    <td className="px-4 py-3 font-semibold">{s.accuracy}%</td>
                    <td className="px-4 py-3 text-slate-600">{formatDurationHuman(s.timeSeconds)}</td>
                    <td className="px-4 py-3">
                      <span className={`px-2 py-0.5 rounded-full font-bold text-[11px] ${
                        s.tag === 'Strength' ? 'bg-emerald-100 text-emerald-800' :
                        s.tag === 'Weakness' ? 'bg-rose-100 text-rose-800' :
                        'bg-amber-100 text-amber-800'
                      }`}>
                        {s.tag}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-sm space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="font-bold text-lg text-slate-900">Mock Leaderboard (Top Candidates)</h3>
              <p className="text-xs text-slate-500">Ranked by Net Score, Accuracy, and Completion Time.</p>
            </div>
            <span className="text-xs font-bold px-3 py-1 rounded-full bg-indigo-50 text-indigo-700">
              Your Rank: #{candidateRank} of {totalCandidates}
            </span>
          </div>

          <div className="overflow-x-auto border border-slate-200 rounded-xl">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 text-slate-600 uppercase">
                <tr>
                  <th className="px-4 py-3">Rank</th>
                  <th className="px-4 py-3">Candidate</th>
                  <th className="px-4 py-3">Date</th>
                  <th className="px-4 py-3">Net Score</th>
                  <th className="px-4 py-3">Accuracy</th>
                  <th className="px-4 py-3">Time Taken</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {rankedAttempts.slice(0, 10).map((row, idx) => {
                  const isMe = row.id === attempt.id;
                  return (
                    <tr key={row.id} className={isMe ? 'bg-indigo-50/80 font-semibold' : ''}>
                      <td className="px-4 py-3 font-black text-slate-900">#{idx + 1}</td>
                      <td className="px-4 py-3">
                        {row.studentName} <span className="font-mono text-slate-400">({row.studentId})</span>
                        {isMe && <span className="ml-2 px-2 py-0.5 rounded bg-indigo-600 text-white text-[10px]">YOU</span>}
                      </td>
                      <td className="px-4 py-3 text-xs font-medium text-slate-600">{formatAttemptDate(row)}</td>
                      <td className="px-4 py-3 font-bold text-indigo-700">{row.score} / {row.maxScore}</td>
                      <td className="px-4 py-3">{row.accuracy}%</td>
                      <td className="px-4 py-3 text-slate-600">{formatDurationHuman(row.totalTimeSeconds)}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>

        <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-sm space-y-5">
          <h3 className="font-bold text-lg text-slate-900">Question-by-Question Time & Solution Review</h3>
          {mock.questions.map((q, idx) => {
            const userChoice = attempt.userAnswers?.[idx];
            const isCorrect = userChoice === q.correctIndex;
            const isSkipped = userChoice === undefined;
            const timeTaken = attempt.questionTimes?.[idx] || 0;

            return (
              <div key={q.id} className="p-4 rounded-xl border border-slate-200 bg-slate-50/50 space-y-2.5">
                <div className="flex flex-wrap items-center justify-between gap-2 text-xs">
                  <span className="font-bold text-slate-700">Q{idx + 1} • {q.section}</span>
                  <div className="flex items-center gap-2">
                    <span className="px-2.5 py-0.5 rounded-full bg-blue-50 border border-blue-200 text-blue-800 font-semibold flex items-center gap-1">
                      <Timer className="w-3 h-3" /> Time Taken: {timeTaken}s
                    </span>
                    <span className={`px-2.5 py-0.5 rounded-full font-bold ${
                      isSkipped ? 'bg-slate-200 text-slate-700' :
                      isCorrect ? 'bg-emerald-100 text-emerald-800' : 'bg-rose-100 text-rose-800'
                    }`}>
                      {isSkipped ? 'Unattempted' : isCorrect ? `Correct (+${mock.positiveMark})` : `Wrong (-${mock.negativeMark})`}
                    </span>
                  </div>
                </div>
                <p className="text-sm font-semibold text-slate-900 whitespace-pre-line">{renderFormattedText(q.text)}</p>
                {q.imageUrl && (
  <img
    src={q.imageUrl}
    alt={`Question ${idx + 1} Diagram`}
    className="max-h-52 rounded-lg border border-slate-200 bg-white p-1.5 object-contain"
  />
)}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs">
                  {q.options.map((opt, oIdx) => (
                    <div
                      key={oIdx}
                      className={`p-2.5 rounded-lg border ${
                        oIdx === q.correctIndex
                          ? 'bg-emerald-50 border-emerald-400 text-emerald-900 font-bold'
                          : oIdx === userChoice
                          ? 'bg-rose-50 border-rose-400 text-rose-900 font-semibold'
                          : 'bg-white border-slate-200 text-slate-600'
                      }`}
                    >
                      ({String.fromCharCode(65 + oIdx)}) {opt}
                    </div>
                  ))}
                </div>
                {q.explanation && (
                  <div className="text-xs bg-blue-50/70 border border-blue-100 text-slate-700 p-3 rounded-lg">
                    <strong>Explanation:</strong> {q.explanation}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

// ============================================================================
// COMPONENT 6: STUDY NOTE READER
// ============================================================================
function StudyNoteReader({ note, onClose }) {
  return (
    <div className="min-h-screen bg-slate-100 py-8 px-4">
      <div className="max-w-3xl mx-auto bg-white rounded-2xl border border-slate-200 shadow-lg overflow-hidden">
        <div className="bg-slate-900 text-white px-6 py-4 flex items-center justify-between">
          <div>
            <span className="text-xs font-bold uppercase tracking-wider text-amber-400">
              PATHSHALA Study Capsule • {note.category}
            </span>
            <h2 className="text-lg font-bold mt-0.5">{note.title}</h2>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => window.print()}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-xs font-semibold"
            >
              <Printer className="w-3.5 h-3.5" /> Print
            </button>
            <button
              onClick={onClose}
              className="px-3 py-1.5 rounded-lg bg-amber-500 text-slate-950 text-xs font-bold"
            >
              Close
            </button>
          </div>
        </div>
        <div className="p-6 sm:p-8">
          <div className="text-xs text-slate-500 mb-4 pb-3 border-b border-slate-100 flex justify-between">
            <span>Subject: <strong>{note.subject}</strong></span>
            <span>{note.readTime}</span>
          </div>
          <div className="text-sm text-slate-800 whitespace-pre-line leading-relaxed font-normal">
            {note.content}
          </div>
        </div>
      </div>
    </div>
  );
}

// ============================================================================
// COMPONENT 7: ADMIN CONTROL PANEL
// ============================================================================
function AdminDashboard({
  admin, users, mocks, notes, attempts,
 onSaveMock, onDeleteMock, onSaveNote, onDeleteNote, onPreviewNote, onChangePassword, onLogout, onApproveMembership
}) {
  const [tab, setTab] = useState('mocks');
  const [editingMock, setEditingMock] = useState(null);
  const [editingNote, setEditingNote] = useState(null);
  const [selectedMockFilter, setSelectedMockFilter] = useState('ALL');
  const [adminFolderFilter, setAdminFolderFilter] = useState('ALL');

  const students = users.filter(u => u.role === 'student');

  const filteredAttempts = useMemo(() => {
    const list = selectedMockFilter === 'ALL'
      ? [...attempts]
      : attempts.filter(a => a.mockId === selectedMockFilter);
    return list.sort((a, b) => (b.score - a.score) || (b.accuracy - a.accuracy) || ((a.totalTimeSeconds || 99999) - (b.totalTimeSeconds || 99999)));
  }, [attempts, selectedMockFilter]);

  const adminFilteredMocks = useMemo(() => {
    if (adminFolderFilter === 'ALL') return mocks;
    return mocks.filter(m => m.category === adminFolderFilter);
  }, [mocks, adminFolderFilter]);

  const createNewMockTemplate = () => {
    setEditingMock({
      id: `mock-${Date.now()}`,
      title: '',
      category: 'SSC',
      subCategory: 'CGL',
      durationMinutes: 60,
      positiveMark: 2.0,
      negativeMark: 0.5,
      instructions: 'Standard TCS iON CBT instructions apply.',
      questions: [
        {
          id: `q-${Date.now()}`,
          section: 'General Awareness',
          text: '',
          options: ['', '', '', ''],
          correctIndex: 0,
          explanation: ''
        }
      ]
    });
  };

  const createNewNoteTemplate = () => {
    setEditingNote({
      id: `note-${Date.now()}`,
      title: '',
      category: 'SSC',
      subject: 'General Studies',
      readTime: '5 min read',
      updatedAt: new Date().toISOString().split('T')[0],
      summary: '',
      content: ''
    });
  };

  return (
    <div className="min-h-screen flex flex-col bg-slate-50">
      <header className="bg-slate-950 text-white border-b border-slate-800 sticky top-0 z-30">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-lg bg-amber-500 text-slate-950 font-black flex items-center justify-center text-lg">
              P
            </div>
            <div>
              <span className="font-extrabold tracking-tight text-lg">PATHSHALA</span>
              <span className="ml-2 text-xs px-2 py-0.5 rounded bg-amber-500/20 text-amber-300 border border-amber-500/30">
                Admin Control Panel
              </span>
            </div>
          </div>

          <div className="flex items-center gap-4">
            <div className="text-right hidden sm:block">
              <div className="text-sm font-semibold">{admin.name}</div>
              <div className="text-xs font-mono text-amber-400">{admin.id}</div>
            </div>
            <button
              onClick={onLogout}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-rose-600 text-xs font-semibold transition"
            >
              <LogOut className="w-3.5 h-3.5" /> Logout
            </button>
          </div>
        </div>
      </header>

      <main className="max-w-7xl w-full mx-auto px-4 sm:px-6 py-6 flex-1">
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
          <div className="bg-white p-4 rounded-2xl border border-slate-200">
            <div className="text-xs text-slate-500 font-semibold">Total CBT Mocks</div>
            <div className="text-2xl font-black text-slate-900 mt-1">{mocks.length}</div>
          </div>
          <div className="bg-white p-4 rounded-2xl border border-slate-200">
            <div className="text-xs text-slate-500 font-semibold">Study Capsules</div>
            <div className="text-2xl font-black text-slate-900 mt-1">{notes.length}</div>
          </div>
          <div className="bg-white p-4 rounded-2xl border border-slate-200">
            <div className="text-xs text-slate-500 font-semibold">Registered Students</div>
            <div className="text-2xl font-black text-indigo-600 mt-1">{students.length}</div>
          </div>
          <div className="bg-white p-4 rounded-2xl border border-slate-200">
            <div className="text-xs text-slate-500 font-semibold">Total Exam Submissions</div>
            <div className="text-2xl font-black text-emerald-600 mt-1">{attempts.length}</div>
          </div>
        </div>

        <div className="flex flex-wrap gap-2 bg-white p-1.5 rounded-xl border border-slate-200 shadow-sm w-fit mb-6">
          {[
            { id: 'mocks', label: 'Manage Mock Tests', icon: Clock },
            { id: 'results', label: `Candidate Results (${attempts.length})`, icon: BarChart3 },
            { id: 'notes', label: 'Manage Study Notes', icon: BookOpen },
            { id: 'students', label: 'Registered Candidates', icon: Users },
            { id: 'password', label: 'Admin Password', icon: KeyRound }
          ].map(t => {
            const Icon = t.icon;
            return (
              <button
                key={t.id}
                onClick={() => { setTab(t.id); setEditingMock(null); setEditingNote(null); }}
                className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-semibold transition ${
                  tab === t.id ? 'bg-amber-600 text-white' : 'text-slate-600 hover:bg-slate-100'
                }`}
              >
                <Icon className="w-4 h-4" />
                <span>{t.label}</span>
              </button>
            );
          })}
        </div>

        {tab === 'mocks' && !editingMock && (
          <div className="space-y-4">
            <div className="flex flex-wrap justify-between items-center gap-3">
              <div className="flex flex-wrap items-center gap-2">
                <h3 className="font-bold text-lg text-slate-900 mr-2">Exam Folders</h3>
                {['ALL', 'SSC', 'Railway', 'WBPSC'].map(cat => (
                  <button
                    key={cat}
                    onClick={() => setAdminFolderFilter(cat)}
                    className={`px-3 py-1 rounded-full text-xs font-bold border ${
                      adminFolderFilter === cat
                        ? 'bg-slate-900 text-white border-slate-900'
                        : 'bg-white text-slate-600 border-slate-200 hover:border-slate-400'
                    }`}
                  >
                    {cat === 'ALL' ? `All (${mocks.length})` : `${cat} (${mocks.filter(m => m.category === cat).length})`}
                  </button>
                ))}
              </div>
              <button
                onClick={createNewMockTemplate}
                className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold"
              >
                <Plus className="w-4 h-4" /> Create New Mock
              </button>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {adminFilteredMocks.map(m => (
                <div key={m.id} className="bg-white p-5 rounded-2xl border border-slate-200 flex items-center justify-between gap-4">
                  <div>
                    <div className="flex items-center gap-1.5">
                      <span className="text-xs font-bold px-2 py-0.5 rounded bg-slate-100 text-slate-700">{m.category}</span>
                      <span className="text-xs font-bold px-2 py-0.5 rounded bg-amber-50 text-amber-800 border border-amber-200">
                        {getMockSubCategory(m)}
                      </span>
                    </div>
                    <h4 className="font-bold text-slate-900 mt-1.5">{m.title}</h4>
                    <p className="text-xs text-slate-500 mt-1">{m.questions?.length || 0} Questions • {m.durationMinutes} mins</p>
                    <div className="flex flex-wrap items-center gap-1.5 mt-2">
                        <span className="text-[11px] font-bold text-slate-500">Move to:</span>
                        <select
                          value={m.category}
                          onChange={(e) => {
                            const newCat = e.target.value;
                            const newSub = (EXAM_FOLDERS[newCat] || ['General'])[0];
                            const marks = getDefaultMarking(newCat, newSub);
                            onSaveMock({
                              ...m,
                              category: newCat,
                              subCategory: newSub,
                              positiveMark: marks.positiveMark,
                              negativeMark: marks.negativeMark
                            });
                          }}
                          className="px-2 py-1 rounded-lg border border-slate-300 text-xs bg-white font-semibold"
                        >
                          {Object.keys(EXAM_FOLDERS).map(cat => (
                            <option key={cat} value={cat}>{cat}</option>
                          ))}
                        </select>

                        <select
                          value={getMockSubCategory(m)}
                          onChange={(e) => {
                            const newSub = e.target.value;
                            const marks = getDefaultMarking(m.category, newSub);
                            onSaveMock({
                              ...m,
                              subCategory: newSub,
                              positiveMark: marks.positiveMark,
                              negativeMark: marks.negativeMark
                            });
                          }}
                          className="px-2 py-1 rounded-lg border border-slate-300 text-xs bg-white font-semibold"
                        >
                          {(EXAM_FOLDERS[m.category] || ['General']).map(sub => (
                            <option key={sub} value={sub}>{sub}</option>
                          ))}
                        </select>

                        <select
                          value={getMockSubjectFolder(m)}
                          onChange={(e) => onSaveMock({ ...m, subjectFolder: e.target.value })}
                          className="px-2 py-1 rounded-lg border border-slate-300 text-xs bg-white font-semibold"
                        >
                          {SUBJECT_FOLDERS.map(subj => (
                            <option key={subj} value={subj}>{subj}</option>
                          ))}
                        </select>
                      </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => setEditingMock({ ...m, subCategory: getMockSubCategory(m) })}
                      className="p-2 rounded-lg bg-slate-100 hover:bg-indigo-100 text-slate-700 hover:text-indigo-700"
                    >
                      <Edit3 className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => onDeleteMock(m.id)}
                      className="p-2 rounded-lg bg-slate-100 hover:bg-rose-100 text-slate-700 hover:text-rose-700"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {tab === 'mocks' && editingMock && (
          <MockEditorForm
            mock={editingMock}
            onSave={async (updated) => {
              await onSaveMock(updated);
              setEditingMock(null);
            }}
            onCancel={() => setEditingMock(null)}
          />
        )}

        {tab === 'results' && (
          <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-sm">
            <div className="p-5 border-b border-slate-100 flex flex-wrap items-center justify-between gap-3">
              <div>
                <h3 className="font-bold text-slate-900">Candidate Mock Performance & Leaderboard</h3>
                <p className="text-xs text-slate-500">View attempted count, correct/wrong answers, net score, accuracy, and time taken for every student.</p>
              </div>
              <select
                value={selectedMockFilter}
                onChange={(e) => setSelectedMockFilter(e.target.value)}
                className="px-3.5 py-2 rounded-xl border border-slate-300 text-xs font-bold bg-white outline-none"
              >
                <option value="ALL">All Mock Tests ({attempts.length})</option>
                {mocks.map(m => (
                  <option key={m.id} value={m.id}>{m.category} ({getMockSubCategory(m)}) — {m.title}</option>
                ))}
              </select>
            </div>

            {filteredAttempts.length === 0 ? (
              <div className="p-10 text-center text-sm text-slate-500">
                No candidate submissions recorded for this filter yet.
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead className="bg-slate-50 text-slate-600 uppercase">
                    <tr>
                      <th className="px-4 py-3">Rank</th>
                      <th className="px-4 py-3">Candidate</th>
                      <th className="px-4 py-3">Mock Test</th>
                      <th className="px-4 py-3">Date</th>
                      <th className="px-4 py-3">Attempted</th>
                      <th className="px-4 py-3">Correct</th>
                      <th className="px-4 py-3">Wrong</th>
                      <th className="px-4 py-3">Net Score</th>
                      <th className="px-4 py-3">Accuracy</th>
                      <th className="px-4 py-3">Time Taken</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {filteredAttempts.map((att, idx) => {
                      const attemptedCount = (att.correct || 0) + (att.wrong || 0);
                      const totalQs = attemptedCount + (att.unattempted || 0);
                      return (
                        <tr key={att.id} className="hover:bg-slate-50">
                          <td className="px-4 py-3.5 font-black text-amber-600">#{idx + 1}</td>
                          <td className="px-4 py-3.5">
                            <div className="font-bold text-slate-900">{att.studentName}</div>
                            <div className="font-mono text-[11px] text-slate-500">{att.studentId}</div>
                          </td>
                          <td className="px-4 py-3.5 font-medium text-slate-700">{att.mockTitle}</td>
                          <td className="px-4 py-3.5 text-xs font-medium text-slate-600">{formatAttemptDate(att)}</td>
                          <td className="px-4 py-3.5 font-semibold">{attemptedCount} / {totalQs}</td>
                          <td className="px-4 py-3.5 font-bold text-emerald-600">{att.correct}</td>
                          <td className="px-4 py-3.5 font-bold text-rose-600">{att.wrong}</td>
                          <td className="px-4 py-3.5 font-black text-indigo-600">{att.score} / {att.maxScore}</td>
                          <td className="px-4 py-3.5 font-semibold">{att.accuracy}%</td>
                          <td className="px-4 py-3.5 text-slate-600">{formatDurationHuman(att.totalTimeSeconds)}</td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}

        {tab === 'notes' && !editingNote && (
          <div className="space-y-4">
            <div className="flex justify-between items-center">
              <h3 className="font-bold text-lg text-slate-900">Published Study Notes</h3>
              <button
                onClick={createNewNoteTemplate}
                className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold"
              >
                <Plus className="w-4 h-4" /> Add Study Note
              </button>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {notes.map(n => (
                <div key={n.id} className="bg-white p-5 rounded-2xl border border-slate-200 flex items-center justify-between gap-4">
                  <div>
                    <span className="text-xs font-bold px-2 py-0.5 rounded bg-slate-100 text-slate-700">{n.category} • {n.subject}</span>
                    <h4 className="font-bold text-slate-900 mt-1.5">{n.title}</h4>
                    <p className="text-xs text-slate-500 mt-1 line-clamp-1">{n.summary}</p>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    <button
                      onClick={() => onPreviewNote(n)}
                      className="p-2 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700"
                    >
                      <Eye className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => setEditingNote(n)}
                      className="p-2 rounded-lg bg-slate-100 hover:bg-indigo-100 text-slate-700 hover:text-indigo-700"
                    >
                      <Edit3 className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => onDeleteNote(n.id)}
                      className="p-2 rounded-lg bg-slate-100 hover:bg-rose-100 text-slate-700 hover:text-rose-700"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {tab === 'notes' && editingNote && (
          <NoteEditorForm
            note={editingNote}
            onSave={async (updated) => {
              await onSaveNote(updated);
              setEditingNote(null);
            }}
            onCancel={() => setEditingNote(null)}
          />
        )}

        {tab === 'students' && (
          <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-sm">
            <div className="p-5 border-b border-slate-100">
              <h3 className="font-bold text-slate-900">Registered Candidates Directory</h3>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm">
                <thead className="bg-slate-50 text-slate-600 text-xs uppercase">
                  <tr>
                    <th className="px-5 py-3">Unique Login ID</th>
                    <th className="px-5 py-3">Candidate Name</th>
                    <th className="px-5 py-3">Email</th>
                    <th className="px-5 py-3">Mobile</th>
                    <th className="px-5 py-3">Stream</th>
                    <th className="px-5 py-3">Membership &amp; Payment</th>
                      <th className="px-5 py-3">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                 {students.map(s => {
                      const info = getCandidateMembership(s);
                      return (
                        <tr key={s.id} className="hover:bg-slate-50">
                          <td className="px-5 py-3.5 font-mono font-bold text-indigo-600">{s.id}</td>
                          <td className="px-5 py-3.5 font-semibold text-slate-900">{s.name}</td>
                          <td className="px-5 py-3.5 text-slate-600">{s.email}</td>
                          <td className="px-5 py-3.5 text-slate-600">{s.phone}</td>
                          <td className="px-5 py-3.5 font-bold">{s.targetExam}</td>
                          <td className="px-5 py-3.5">
                            <div className="flex flex-wrap items-center gap-1.5">
                              <span
                                className={`rounded-full px-2.5 py-0.5 text-xs font-bold ${
                                  info.hasAccess
                                    ? 'bg-emerald-100 text-emerald-800'
                                    : 'bg-rose-100 text-rose-800'
                                }`}
                              >
                                {info.statusBadge}
                              </span>
                              <span
                                className={`rounded-full px-2.5 py-0.5 text-xs font-bold ${
                                  info.paymentBadge.startsWith('Paid')
                                    ? 'bg-blue-100 text-blue-800'
                                    : 'bg-amber-100 text-amber-800'
                                }`}
                              >
                                {info.paymentBadge}
                              </span>
                            </div>
                            <div className="mt-1 text-xs font-medium text-slate-600">
                              {info.remainingText}
                            </div>
                          </td>
                          <td className="px-5 py-3.5">
                            <button
                              type="button"
                              onClick={() => onApproveMembership && onApproveMembership(s)}
                              className="rounded-lg bg-emerald-600 px-3 py-1.5 text-xs font-bold text-white hover:bg-emerald-700"
                            >
                              {info.planType === '1_year' && info.hasAccess
                                ? 'Extend +1 Year'
                                : 'Approve 1-Year Membership'}
                            </button>
                          </td>
                        </tr>
                      );
                    })}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {tab === 'password' && (
          <div className="max-w-md">
            <ChangePasswordCard onChangePassword={onChangePassword} />
          </div>
        )}
      </main>
    </div>
  );
}

// ============================================================================
// COMPONENT 8: ADMIN MOCK & NOTE EDITOR FORMS
// ============================================================================
function MockEditorForm({ mock, onSave, onCancel }) {
  const [form, setForm] = useState({
    ...mock,
    subCategory: getMockSubCategory(mock),
    subjectFolder: getMockSubjectFolder(mock)
  });
  const [showBulkBox, setShowBulkBox] = useState(false);
  const [bulkJsonText, setBulkJsonText] = useState('');
  const [bulkError, setBulkError] = useState('');

 const handleCategoryChange = (newCategory) => {
    const validSubs = EXAM_FOLDERS[newCategory] || ['General'];
    const defaultSub = validSubs[0];
    const marks = getDefaultMarking(newCategory, defaultSub);
    setForm({
      ...form,
      category: newCategory,
      subCategory: defaultSub,
      positiveMark: marks.positiveMark,
      negativeMark: marks.negativeMark
    });
  };

  const handleSubCategoryChange = (newSubCategory) => {
    const marks = getDefaultMarking(form.category, newSubCategory);
    setForm({
      ...form,
      subCategory: newSubCategory,
      positiveMark: marks.positiveMark,
      negativeMark: marks.negativeMark
    });
  };

  const updateQuestion = (idx, field, value) => {
    const updatedQs = [...form.questions];
    updatedQs[idx] = { ...updatedQs[idx], [field]: value };
    setForm({ ...form, questions: updatedQs });
  };

  const updateOption = (qIdx, optIdx, value) => {
    const updatedQs = [...form.questions];
    const opts = [...updatedQs[qIdx].options];
    opts[optIdx] = value;
    updatedQs[qIdx] = { ...updatedQs[qIdx], options: opts };
    setForm({ ...form, questions: updatedQs });
  };

  const addQuestion = () => {
    setForm({
      ...form,
      questions: [
        ...form.questions,
        {
          id: `q-${Date.now()}`,
       section: (form.title && form.title.trim()) || (form.subjectFolder && form.subjectFolder !== 'Full Mock' ? form.subjectFolder : 'General Awareness'),
          text: '',
          options: ['', '', '', ''],
          correctIndex: 0,
          explanation: ''
        }
      ]
    });
  };

  const removeQuestion = (idx) => {
    if (form.questions.length <= 1) return;
    setForm({
      ...form,
      questions: form.questions.filter((_, i) => i !== idx)
    });
  };

  const handleBulkImport = (replaceExisting = false) => {
    setBulkError('');
    try {
      const parsed = JSON.parse(bulkJsonText.trim());
      if (!Array.isArray(parsed) || parsed.length === 0) {
        setBulkError('Please paste a valid JSON array starting with [ and ending with ].');
        return;
      }
      const normalized = parsed.map((q, i) => ({
        id: q.id || `q-${Date.now()}-${i}`,
      section: (form.title && form.title.trim()) || q.section || (form.subjectFolder && form.subjectFolder !== 'Full Mock' ? form.subjectFolder : 'General Awareness'),
        text: q.text || '',
        options: Array.isArray(q.options) && q.options.length === 4 ? q.options : ['', '', '', ''],
        correctIndex: typeof q.correctIndex === 'number' ? q.correctIndex : 0,
       imageUrl: q.imageUrl || q.image || '',
        explanation: q.explanation || ''
      }));

      const hasOnlyBlankStarter =
        form.questions.length === 1 &&
        !form.questions[0].text.trim() &&
        form.questions[0].options.every(o => !o.trim());

      setForm({
        ...form,
        questions: (replaceExisting || hasOnlyBlankStarter)
          ? normalized
          : [...form.questions, ...normalized]
      });
      setBulkJsonText('');
      setShowBulkBox(false);
    } catch (err) {
      setBulkError('Invalid JSON format. Make sure you copied the full [ ... ] block.');
    }
  };

  const subFolderOptions = EXAM_FOLDERS[form.category] || ['General'];

  return (
    <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-sm space-y-6">
      <div className="flex items-center justify-between border-b border-slate-100 pb-4">
        <h3 className="font-bold text-lg text-slate-900">Configure Mock Test & Folder</h3>
        <button onClick={onCancel} className="text-xs font-bold text-slate-500 hover:text-slate-800">Cancel</button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
        <div className="md:col-span-2">
          <label className="block text-xs font-bold text-slate-700 mb-1">Mock Title *</label>
        <input
            type="text"
            value={form.title || ''}
            onChange={(e) => {
          const newTitle = e.target.value;
          setForm((prev) => ({
            ...prev,
            title: newTitle,
            questions: (prev.questions || []).map((q) => ({
              ...q,
              section: newTitle.trim() || q.section || 'General Awareness',
            })),
          }));
        }}
            placeholder="e.g. Reasoning Set 1 or English Mock"
            className="w-full px-3.5 py-2 rounded-xl border border-slate-300 text-sm"
          />
             </div>
        <div>
          <label className="block text-xs font-bold text-slate-700 mb-1">Exam Stream</label>
          <select
            value={form.category}
            onChange={(e) => handleCategoryChange(e.target.value)}
            className="w-full px-3.5 py-2 rounded-xl border border-slate-300 text-sm bg-white"
          >
            <option value="SSC">SSC</option>
            <option value="Railway">Railway</option>
            <option value="WBPSC">WBPSC</option>
          </select>
        </div>
        <div>
          <label className="block text-xs font-bold text-slate-700 mb-1">Exam Folder</label>
          <select
            value={form.subCategory}
          onChange={(e) => handleSubCategoryChange(e.target.value)}
            className="w-full px-3.5 py-2 rounded-xl border border-slate-300 text-sm bg-white"
          >
            {subFolderOptions.map(sub => (
              <option key={sub} value={sub}>{sub}</option>
            ))}
          </select>
        </div>
        <div>
          <label className="block text-xs font-bold text-slate-700 mb-1">Subject Folder</label>
          <select
            value={form.subjectFolder || 'Full Mock'}
            onChange={(e) => setForm({ ...form, subjectFolder: e.target.value })}
            className="w-full px-3.5 py-2 rounded-xl border border-slate-300 text-sm bg-white"
          >
            {SUBJECT_FOLDERS.map(subj => (
              <option key={subj} value={subj}>{subj}</option>
            ))}
          </select>
        </div>
        <div>
          <label className="block text-xs font-bold text-slate-700 mb-1">Duration (Mins)</label>
          <input
            type="number"
            value={form.durationMinutes}
            onChange={(e) => setForm({ ...form, durationMinutes: Number(e.target.value) })}
            className="w-full px-3.5 py-2 rounded-xl border border-slate-300 text-sm"
          />
        </div>
        <div>
          <label className="block text-xs font-bold text-slate-700 mb-1">Correct Mark (+)</label>
          <input
            type="number"
            step="0.25"
            value={form.positiveMark}
            onChange={(e) => setForm({ ...form, positiveMark: Number(e.target.value) })}
            className="w-full px-3.5 py-2 rounded-xl border border-slate-300 text-sm"
          />
        </div>
        <div>
          <label className="block text-xs font-bold text-slate-700 mb-1">Negative Mark (-)</label>
          <input
            type="number"
            step="0.25"
            value={form.negativeMark}
            onChange={(e) => setForm({ ...form, negativeMark: Number(e.target.value) })}
            className="w-full px-3.5 py-2 rounded-xl border border-slate-300 text-sm"
          />
        </div>
      </div>

      <div className="rounded-xl border border-indigo-200 bg-indigo-50/50 p-4 space-y-3">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div>
            <h4 className="font-bold text-sm text-indigo-950">Bulk Import Questions (JSON)</h4>
            <p className="text-xs text-indigo-700">Paste 25–100 questions in PATHSHALA JSON format to load them instantly.</p>
          </div>
          <button
            type="button"
            onClick={() => { setShowBulkBox(!showBulkBox); setBulkError(''); }}
            className="px-3.5 py-1.5 rounded-lg bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold"
          >
            {showBulkBox ? 'Hide JSON Box' : 'Paste JSON Questions'}
          </button>
        </div>

        {showBulkBox && (
          <div className="space-y-3 pt-2">
            {bulkError && (
              <div className="p-2.5 rounded-lg bg-rose-100 border border-rose-300 text-rose-800 text-xs font-medium">
                {bulkError}
              </div>
            )}
            <textarea
              rows={7}
              value={bulkJsonText}
              onChange={(e) => setBulkJsonText(e.target.value)}
              placeholder='Paste JSON array here: [ { "section": "...", "text": "...", "options": ["A","B","C","D"], "correctIndex": 0, "explanation": "..." } ]'
              className="w-full p-3 rounded-xl border border-indigo-300 text-xs font-mono bg-white outline-none focus:ring-2 focus:ring-indigo-500"
            />
            <div className="flex flex-wrap justify-end gap-2">
              <button
                type="button"
                onClick={() => handleBulkImport(false)}
                className="px-4 py-2 rounded-lg bg-slate-900 hover:bg-slate-800 text-white text-xs font-bold"
              >
                Append to Existing Questions
              </button>
              <button
                type="button"
                onClick={() => handleBulkImport(true)}
                className="px-4 py-2 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold"
              >
                Replace All & Load Questions
              </button>
            </div>
          </div>
        )}
      </div>

      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h4 className="font-bold text-sm text-slate-800">Questions ({form.questions.length})</h4>
          <button
            type="button"
            onClick={addQuestion}
            className="px-3 py-1.5 rounded-lg bg-slate-900 text-white text-xs font-bold flex items-center gap-1"
          >
            <Plus className="w-3.5 h-3.5" /> Add Single Question
          </button>
        </div>

        {form.questions.map((q, qIdx) => (
          <div key={q.id} className="p-4 rounded-xl bg-slate-50 border border-slate-200 space-y-3">
            <div className="flex justify-between items-center">
              <span className="text-xs font-bold text-indigo-600">Question #{qIdx + 1}</span>
              <button
                type="button"
                onClick={() => removeQuestion(qIdx)}
                className="text-xs text-rose-600 hover:underline"
              >
                Remove
              </button>
            </div>
            <input
              type="text"
              value={q.section}
              onChange={(e) => updateQuestion(qIdx, 'section', e.target.value)}
              placeholder="Section Name (e.g. Quantitative Aptitude)"
              className="w-full px-3 py-2 rounded-lg border border-slate-300 text-xs bg-white"
            />
            <textarea
              rows={2}
              value={q.text}
              onChange={(e) => updateQuestion(qIdx, 'text', e.target.value)}
              placeholder="Enter question text..."
              className="w-full px-3 py-2 rounded-lg border border-slate-300 text-sm bg-white"
            />
            <div className="space-y-2 bg-white p-3 rounded-lg border border-slate-200">
              <div className="flex flex-wrap items-center gap-2">
                <input
                  type="text"
                  value={q.imageUrl || ''}
                  onChange={(e) => updateQuestion(qIdx, 'imageUrl', e.target.value)}
                  placeholder="Optional Diagram Image URL (https://...) or upload below"
                  className="flex-1 min-w-[200px] px-3 py-1.5 rounded-lg border border-slate-300 text-xs"
                />
                <label className="px-3 py-1.5 rounded-lg bg-indigo-50 hover:bg-indigo-100 text-indigo-700 border border-indigo-200 text-xs font-bold cursor-pointer">
                  Upload Diagram
                  <input
                    type="file"
                    accept="image/*"
                    className="hidden"
                    onChange={(e) => {
                      const file = e.target.files?.[0];
                      if (!file) return;
                      const reader = new FileReader();
                      reader.onload = () => updateQuestion(qIdx, 'imageUrl', reader.result);
                      reader.readAsDataURL(file);
                    }}
                  />
                </label>
                {q.imageUrl && (
                  <button
                    type="button"
                    onClick={() => updateQuestion(qIdx, 'imageUrl', '')}
                    className="px-2.5 py-1.5 rounded-lg bg-rose-50 text-rose-600 text-xs font-bold"
                  >
                    Remove Image
                  </button>
                )}
              </div>
              {q.imageUrl && (
                <img
                  src={q.imageUrl}
                  alt="Diagram Preview"
                  className="max-h-44 rounded-lg border border-slate-200 object-contain bg-slate-50 p-1"
                />
              )}
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              {q.options.map((opt, oIdx) => (
                <div key={oIdx} className="flex items-center gap-2">
                  <input
                    type="radio"
                    name={`correct-${qIdx}`}
                    checked={q.correctIndex === oIdx}
                    onChange={() => updateQuestion(qIdx, 'correctIndex', oIdx)}
                  />
                  <input
                    type="text"
                    value={opt}
                    onChange={(e) => updateOption(qIdx, oIdx, e.target.value)}
                    placeholder={`Option ${String.fromCharCode(65 + oIdx)}`}
                    className="w-full px-3 py-1.5 rounded-lg border border-slate-300 text-xs bg-white"
                  />
                </div>
              ))}
            </div>
            <input
              type="text"
              value={q.explanation}
              onChange={(e) => updateQuestion(qIdx, 'explanation', e.target.value)}
              placeholder="Solution explanation (optional)"
              className="w-full px-3 py-1.5 rounded-lg border border-slate-300 text-xs bg-white"
            />
          </div>
        ))}
      </div>

      <div className="flex justify-end gap-3 pt-4 border-t border-slate-100">
        <button onClick={onCancel} className="px-4 py-2 rounded-xl border border-slate-300 text-xs font-bold">
          Cancel
        </button>
        <button
          onClick={() => form.title.trim() && onSave(form)}
          className="px-6 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold"
        >
          Save & Publish Mock
        </button>
      </div>
    </div>
  );
}

function NoteEditorForm({ note, onSave, onCancel }) {
  const [form, setForm] = useState(note);

  return (
    <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-sm space-y-4">
      <div className="flex items-center justify-between border-b border-slate-100 pb-4">
        <h3 className="font-bold text-lg text-slate-900">Study Note Editor</h3>
        <button onClick={onCancel} className="text-xs font-bold text-slate-500">Cancel</button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="md:col-span-2">
          <label className="block text-xs font-bold text-slate-700 mb-1">Note Title *</label>
          <input
            type="text"
            value={form.title}
            onChange={(e) => setForm({ ...form, title: e.target.value })}
            className="w-full px-3.5 py-2 rounded-xl border border-slate-300 text-sm"
          />
        </div>
        <div>
          <label className="block text-xs font-bold text-slate-700 mb-1">Exam Stream</label>
          <select
            value={form.category}
            onChange={(e) => setForm({ ...form, category: e.target.value })}
            className="w-full px-3.5 py-2 rounded-xl border border-slate-300 text-sm bg-white"
          >
            <option value="SSC">SSC</option>
            <option value="Railway">Railway</option>
            <option value="WBPSC">WBPSC</option>
          </select>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <label className="block text-xs font-bold text-slate-700 mb-1">Subject</label>
          <input
            type="text"
            value={form.subject}
            onChange={(e) => setForm({ ...form, subject: e.target.value })}
            className="w-full px-3.5 py-2 rounded-xl border border-slate-300 text-sm"
          />
        </div>
        <div>
          <label className="block text-xs font-bold text-slate-700 mb-1">Short Summary</label>
          <input
            type="text"
            value={form.summary}
            onChange={(e) => setForm({ ...form, summary: e.target.value })}
            className="w-full px-3.5 py-2 rounded-xl border border-slate-300 text-sm"
          />
        </div>
      </div>

      <div>
        <label className="block text-xs font-bold text-slate-700 mb-1">Full Study Content *</label>
        <textarea
          rows={10}
          value={form.content}
          onChange={(e) => setForm({ ...form, content: e.target.value })}
          className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 text-sm font-mono"
        />
      </div>

      <div className="flex justify-end gap-3">
        <button onClick={onCancel} className="px-4 py-2 rounded-xl border border-slate-300 text-xs font-bold">
          Cancel
        </button>
        <button
          onClick={() => form.title.trim() && form.content.trim() && onSave(form)}
          className="px-6 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold"
        >
          Save & Publish Note
        </button>
      </div>
    </div>
  );
}
