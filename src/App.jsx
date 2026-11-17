import React, { useState, useEffect, useMemo, useRef, useCallback } from 'react';
import { initializeApp } from 'firebase/app';
import { getAuth, signInAnonymously, onAuthStateChanged } from 'firebase/auth';
import { getFirestore, collection, doc, setDoc, getDocs, onSnapshot, updateDoc, deleteDoc } from 'firebase/firestore';
import {
  BookOpen, CheckCircle2, Clock, Award, Shield, User, Lock, KeyRound,
  LogOut, Plus, Trash2, Edit3, ChevronLeft, AlertCircle, Search, Eye, EyeOff,
  GraduationCap, ArrowRight, RotateCcw, RotateCcw, BarChart3, Users, Printer,
  TrendingUp, TrendingDown, Timer, Folder, FolderOpen
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
// EXAM FOLDER HIERARCHY & SEED DATA
// ============================================================================
const EXAM_FOLDERS = {
  SSC: ['MTS', 'CHSL', 'CGL'],
  Railway: ['NTPC (UG)', 'NTPC (G)'],
  WBPSC: ['Clerkship', 'Stenographer', 'Miscellaneous']
};

function getMockSubCategory(mock) {
  if (mock.subCategory) return mock.subCategory;
  if (mock.category === 'SSC') return 'CGL';
  if (mock.category === 'Railway') return 'NTPC (G)';
  if (mock.category === 'WBPSC') return 'Clerkship';
  return 'General';
}

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
    content: `1. FUNDAMENTAL RIGHTS (PART III: ARTICLES 12–35)\n- Right to Equality (Articles 14–18):\n  - Art 14: Equality before law & equal protection of laws.\n  - Art 17: Abolition of Untouchability (Absolute right).\n- Right to Constitutional Remedies (Article 32):\n  - 5 Writs: Habeas Corpus, Mandamus, Prohibition, Certiorari, Quo-Warranto.`
  }
];

function generateStudentId() {
  return `PS-2026-${Math.floor(1000 + Math.random() * 9000)}`;
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
  return mins === 0 ? `${secs}s` : `${mins}m ${secs}s`;
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
    signInAnonymously(auth).catch((err) => console.error('Auth error:', err));
    return onAuthStateChanged(auth, (user) => setFbUser(user));
  }, []);

  useEffect(() => {
    if (!fbUser) return;
    const usersCol = collection(db, 'artifacts', appId, 'public', 'data', 'users');
    const mocksCol = collection(db, 'artifacts', appId, 'public', 'data', 'mocks');
    const notesCol = collection(db, 'artifacts', appId, 'public', 'data', 'notes');
    const attemptsCol = collection(db, 'artifacts', appId, 'public', 'data', 'attempts');

    const seedIfEmpty = async () => {
      try {
        const uSnap = await getDocs(usersCol);
        if (uSnap.empty) for (const u of DEFAULT_USERS) await setDoc(doc(usersCol, u.id), u);
        const mSnap = await getDocs(mocksCol);
        if (mSnap.empty) for (const m of DEFAULT_MOCKS) await setDoc(doc(mocksCol, m.id), m);
        const nSnap = await getDocs(notesCol);
        if (nSnap.empty) for (const n of DEFAULT_NOTES) await setDoc(doc(notesCol, n.id), n);
      } catch (err) {
        console.error('Firestore seed error:', err);
      }
    };
    seedIfEmpty();

    const u1 = onSnapshot(usersCol, (s) => { if (!s.empty) setUsers(s.docs.map(d => d.data())); });
    const u2 = onSnapshot(mocksCol, (s) => { if (!s.empty) setMocks(s.docs.map(d => d.data())); });
    const u3 = onSnapshot(notesCol, (s) => { if (!s.empty) setNotes(s.docs.map(d => d.data())); });
    const u4 = onSnapshot(attemptsCol, (s) => setAttempts(s.docs.map(d => d.data())));
    return () => { u1(); u2(); u3(); u4(); };
  }, [fbUser]);

  useEffect(() => {
    if (currentUser) {
      const updated = users.find(u => u.id === currentUser.id);
      if (updated) setCurrentUser(updated);
    }
  }, [users, currentUser]);

  const handleLogin = (loginId, password, role) => {
    const cleanId = loginId.trim().toUpperCase();
    const found = users.find(u => u.id.toUpperCase() === cleanId && u.password === password && u.role === role);
    if (!found) return { success: false, message: `Invalid ${role === 'admin' ? 'Admin' : 'Candidate'} ID or Password.` };
    setCurrentUser(found);
    showToast(`Welcome back, ${found.name}!`);
    return { success: true };
  };

  const handleRegisterStudent = async ({ name, email, phone, targetExam, customPassword }) => {
    const trimmedEmail = email.trim().toLowerCase();
    if (users.some(u => u.email.toLowerCase() === trimmedEmail)) {
      return { success: false, message: 'An account with this email already exists.' };
    }
    let uniqueId = generateStudentId();
    while (users.some(u => u.id === uniqueId)) uniqueId = generateStudentId();

    const newStudent = {
      id: uniqueId,
      password: customPassword?.trim() || `PS@${Math.floor(1000 + Math.random() * 9000)}`,
      role: 'student',
      name: name.trim(),
      email: trimmedEmail,
      phone: phone.trim(),
      targetExam: targetExam || 'SSC',
      createdAt: new Date().toISOString()
    };

    try {
      if (fbUser) await setDoc(doc(db, 'artifacts', appId, 'public', 'data', 'users', uniqueId), newStudent);
      else setUsers(prev => [...prev, newStudent]);
      setNewlyCreatedAccount(newStudent);
      setAuthView('registered_success');
      showToast('Registration successful!');
      return { success: true };
    } catch {
      return { success: false, message: 'Could not save registration.' };
    }
  };

  const handleForgotPassword = async ({ role, loginId, email, newPassword }) => {
    const matchedUser = users.find(
      u => u.role === role && u.id.toUpperCase() === loginId.trim().toUpperCase() && u.email.toLowerCase() === email.trim().toLowerCase()
    );
    if (!matchedUser) return { success: false, message: 'No matching account found for that ID and Email.' };
    try {
      if (fbUser) await updateDoc(doc(db, 'artifacts', appId, 'public', 'data', 'users', matchedUser.id), { password: newPassword });
      else setUsers(prev => prev.map(u => u.id === matchedUser.id ? { ...u, password: newPassword } : u));
      showToast('Password reset successfully!');
      setAuthView('login');
      return { success: true };
    } catch {
      return { success: false, message: 'Failed to reset password.' };
    }
  };

  const handleChangePassword = async (oldPassword, newPassword) => {
    if (!currentUser || currentUser.password !== oldPassword) return { success: false, message: 'Current password is incorrect.' };
    if (newPassword.length < 6) return { success: false, message: 'New password must be at least 6 characters.' };
    try {
      if (fbUser) await updateDoc(doc(db, 'artifacts', appId, 'public', 'data', 'users', currentUser.id), { password: newPassword });
      else setUsers(prev => prev.map(u => u.id === currentUser.id ? { ...u, password: newPassword } : u));
      setCurrentUser(prev => ({ ...prev, password: newPassword }));
      showToast('Password updated!');
      return { success: true };
    } catch {
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
      if (fbUser) await setDoc(doc(db, 'artifacts', appId, 'public', 'data', 'mocks', mockObj.id), mockObj);
      else setMocks(prev => prev.some(m => m.id === mockObj.id) ? prev.map(m => m.id === mockObj.id ? mockObj : m) : [...prev, mockObj]);
      showToast('Mock Test saved and published!');
    } catch {
      showToast('Error saving mock test.', 'error');
    }
  };

  const deleteMockFromDb = async (mockId) => {
    try {
      if (fbUser) await deleteDoc(doc(db, 'artifacts', appId, 'public', 'data', 'mocks', mockId));
      else setMocks(prev => prev.filter(m => m.id !== mockId));
      showToast('Mock Test deleted.');
    } catch {
      showToast('Failed to delete mock.', 'error');
    }
  };

  const saveNoteToDb = async (noteObj) => {
    try {
      if (fbUser) await setDoc(doc(db, 'artifacts', appId, 'public', 'data', 'notes', noteObj.id), noteObj);
      else setNotes(prev => prev.some(n => n.id === noteObj.id) ? prev.map(n => n.id === noteObj.id ? noteObj : n) : [...prev, noteObj]);
      showToast('Study Note published!');
    } catch {
      showToast('Error saving study note.', 'error');
    }
  };

  const deleteNoteFromDb = async (noteId) => {
    try {
      if (fbUser) await deleteDoc(doc(db, 'artifacts', appId, 'public', 'data', 'notes', noteId));
      else setNotes(prev => prev.filter(n => n.id !== noteId));
      showToast('Study Note deleted.');
    } catch {
      showToast('Failed to delete note.', 'error');
    }
  };

  const submitExamAttempt = async (attemptRecord) => {
    try {
      if (fbUser) await setDoc(doc(db, 'artifacts', appId, 'public', 'data', 'attempts', attemptRecord.id), attemptRecord);
      else setAttempts(prev => [attemptRecord, ...prev]);
    } catch (err) {
      console.error(err);
    }
    setLastAttemptResult(attemptRecord);
    setExamPhase('result');
    if (attemptRecord.autoSubmitted) showToast('Time expired! Exam auto-submitted & evaluated.');
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
        <div className={`fixed bottom-5 right-5 z-50 flex items-center gap-2.5 px-4 py-3 rounded-xl shadow-xl text-white text-sm font-medium ${
          toast.type === 'error' ? 'bg-rose-600' : 'bg-slate-900 border border-slate-700'
        }`}>
          {toast.type === 'error' ? <AlertCircle className="w-4 h-4 text-rose-200" /> : <CheckCircle2 className="w-4 h-4 text-emerald-400" />}
          <span>{toast.message}</span>
        </div>
      )}

      {!currentUser && (
        <AuthPortal
          authView={authView} setAuthView={setAuthView}
          selectedRoleTab={selectedRoleTab} setSelectedRoleTab={setSelectedRoleTab}
          onLogin={handleLogin} onRegister={handleRegisterStudent} onForgot={handleForgotPassword}
          newlyCreatedAccount={newlyCreatedAccount} mocksCount={mocks.length} notesCount={notes.length}
        />
      )}

      {currentUser && currentUser.role === 'student' && activeMock && (
        <>
          {examPhase === 'instructions' && (
            <ExamInstructionsScreen mock={activeMock} student={currentUser} onStart={() => setExamPhase('live')} onCancel={() => setActiveMock(null)} />
          )}
          {examPhase === 'live' && (
            <TcsIonExamInterface mock={activeMock} student={currentUser} onSubmitExam={submitExamAttempt} onExit={() => setActiveMock(null)} />
          )}
          {examPhase === 'result' && lastAttemptResult && (
            <ExamScorecardScreen
              mock={activeMock} attempt={lastAttemptResult}
              allMockAttempts={attempts.filter(a => a.mockId === activeMock.id)}
              onBackToDashboard={() => { setActiveMock(null); setLastAttemptResult(null); }}
            />
          )}
        </>
      )}

      {currentUser && readingNote && <StudyNoteReader note={readingNote} onClose={() => setReadingNote(null)} />}

      {currentUser && currentUser.role === 'student' && !activeMock && !readingNote && (
        <StudentDashboard
          student={currentUser} mocks={mocks} notes={notes}
          attempts={attempts.filter(a => a.studentId === currentUser.id)} allAttempts={attempts}
          onStartMock={(mock) => { setActiveMock(mock); setExamPhase('instructions'); }}
          onViewAttemptReport={handleOpenSavedScorecard} onOpenNote={(note) => setReadingNote(note)}
          onChangePassword={handleChangePassword} onLogout={handleLogout}
        />
      )}

      {currentUser && currentUser.role === 'admin' && !readingNote && (
        <AdminDashboard
          admin={currentUser} users={users} mocks={mocks} notes={notes} attempts={attempts}
          onSaveMock={saveMockToDb} onDeleteMock={deleteMockFromDb}
          onSaveNote={saveNoteToDb} onDeleteNote={deleteNoteFromDb}
          onPreviewNote={(note) => setReadingNote(note)}
          onChangePassword={handleChangePassword} onLogout={handleLogout}
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
      setErrorMsg('Please fill in Full Name, Email, and Mobile Number.');
      return;
    }
    const res = await onRegister({ name: regName, email: regEmail, phone: regPhone, targetExam: regExam, customPassword: regCustomPass });
    if (!res.success) setErrorMsg(res.message);
  };

  const submitForgot = async (e) => {
    e.preventDefault();
    setErrorMsg('');
    if (!fpId.trim() || !fpEmail.trim() || fpNewPass.length < 6) {
      setErrorMsg('Enter valid Unique ID, Registered Email, and new password (min 6 chars).');
      return;
    }
    const res = await onForgot({ role: fpRole, loginId: fpId, email: fpEmail, newPassword: fpNewPass });
    if (!res.success) setErrorMsg(res.message);
  };

  const fillDemo = (role) => {
    setErrorMsg('');
    setSelectedRoleTab(role);
    setLoginId(role === 'student' ? 'PS-2026-1001' : 'ADMIN-PS-01');
    setPassword(role === 'student' ? 'student123' : 'admin123');
  };

  return (
    <div className="min-h-screen flex flex-col lg:flex-row bg-slate-950">
      <div className="lg:w-5/12 bg-gradient-to-br from-indigo-950 via-slate-900 to-blue-950 text-white p-8 lg:p-12 flex flex-col justify-between border-b lg:border-b-0 lg:border-r border-slate-800">
        <div>
          <div className="flex items-center gap-3 mb-8">
            <div className="w-11 h-11 rounded-xl bg-amber-500 text-slate-950 flex items-center justify-center font-black text-xl">P</div>
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
            <button type="button" onClick={() => fillDemo('student')} className="text-xs px-3 py-1.5 rounded-lg bg-indigo-600/30 hover:bg-indigo-600/50 text-indigo-200 border border-indigo-500/30">
              Fill Student Demo (PS-2026-1001)
            </button>
            <button type="button" onClick={() => fillDemo('admin')} className="text-xs px-3 py-1.5 rounded-lg bg-amber-500/20 hover:bg-amber-500/30 text-amber-200 border border-amber-500/30">
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
                <button type="button" onClick={() => { setSelectedRoleTab('student'); setErrorMsg(''); }}
                  className={`flex items-center justify-center gap-2 py-2.5 text-sm font-semibold rounded-lg transition ${selectedRoleTab === 'student' ? 'bg-white text-indigo-700 shadow-sm' : 'text-slate-600'}`}>
                  <GraduationCap className="w-4 h-4" /> Student Login
                </button>
                <button type="button" onClick={() => { setSelectedRoleTab('admin'); setErrorMsg(''); }}
                  className={`flex items-center justify-center gap-2 py-2.5 text-sm font-semibold rounded-lg transition ${selectedRoleTab === 'admin' ? 'bg-white text-amber-700 shadow-sm' : 'text-slate-600'}`}>
                  <Shield className="w-4 h-4" /> Admin Login
                </button>
              </div>
              {errorMsg && (
                <div className="mb-4 p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-xs flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 shrink-0" /><span>{errorMsg}</span>
                </div>
              )}
              <form onSubmit={submitLogin} className="space-y-4">
                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-slate-600 mb-1.5">
                    {selectedRoleTab === 'admin' ? 'Admin Login ID' : 'Candidate Unique ID'}
                  </label>
                  <div className="relative">
                    <User className="w-4 h-4 text-slate-400 absolute left-3.5 top-3" />
                    <input type="text" required value={loginId} onChange={(e) => setLoginId(e.target.value)}
                      placeholder={selectedRoleTab === 'admin' ? 'ADMIN-PS-01' : 'PS-2026-1001'}
                      className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-slate-300 text-sm outline-none uppercase focus:ring-2 focus:ring-indigo-500" />
                  </div>
                </div>
                <div>
                  <div className="flex items-center justify-between mb-1.5">
                    <label className="block text-xs font-bold uppercase tracking-wider text-slate-600">Password</label>
                    <button type="button" onClick={() => { setErrorMsg(''); setFpRole(selectedRoleTab); setAuthView('forgot'); }} className="text-xs font-semibold text-indigo-600">
                      Forgot Password?
                    </button>
                  </div>
                  <div className="relative">
                    <Lock className="w-4 h-4 text-slate-400 absolute left-3.5 top-3" />
                    <input type={showPass ? 'text' : 'password'} required value={password} onChange={(e) => setPassword(e.target.value)}
                      placeholder="Enter password" className="w-full pl-10 pr-10 py-2.5 rounded-xl border border-slate-300 text-sm outline-none focus:ring-2 focus:ring-indigo-500" />
                    <button type="button" onClick={() => setShowPass(!showPass)} className="absolute right-3 top-2.5 text-slate-400">
                      {showPass ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                </div>
                <button type="submit" className={`w-full py-3 rounded-xl font-bold text-sm text-white shadow-lg flex items-center justify-center gap-2 ${
                  selectedRoleTab === 'admin' ? 'bg-amber-600 hover:bg-amber-700' : 'bg-indigo-600 hover:bg-indigo-700'
                }`}>
                  <span>Sign In as {selectedRoleTab === 'admin' ? 'Admin' : 'Candidate'}</span><ArrowRight className="w-4 h-4" />
                </button>
              </form>
              {selectedRoleTab === 'student' && (
                <div className="mt-6 pt-5 border-t border-slate-100 text-center">
                  <p className="text-sm text-slate-600">New candidate?{' '}
                    <button type="button" onClick={() => { setErrorMsg(''); setAuthView('register'); }} className="font-bold text-indigo-600">
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
                <button type="button" onClick={() => { setErrorMsg(''); setAuthView('login'); }} className="text-xs font-semibold text-slate-500 flex items-center gap-1 mb-2">
                  <ChevronLeft className="w-3.5 h-3.5" /> Back to Login
                </button>
                <h3 className="text-2xl font-bold text-slate-900">Student Registration</h3>
              </div>
              {errorMsg && <div className="mb-4 p-3 rounded-xl bg-rose-50 text-rose-700 text-xs">{errorMsg}</div>}
              <form onSubmit={submitRegister} className="space-y-3.5">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Full Name *</label>
                  <input type="text" required value={regName} onChange={(e) => setRegName(e.target.value)} className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 text-sm" />
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">Email *</label>
                    <input type="email" required value={regEmail} onChange={(e) => setRegEmail(e.target.value)} className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 text-sm" />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">Mobile *</label>
                    <input type="tel" required value={regPhone} onChange={(e) => setRegPhone(e.target.value)} className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 text-sm" />
                  </div>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">Exam Stream</label>
                    <select value={regExam} onChange={(e) => setRegExam(e.target.value)} className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 text-sm bg-white">
                      <option value="SSC">SSC (MTS / CHSL / CGL)</option>
                      <option value="Railway">Railway (NTPC UG / G)</option>
                      <option value="WBPSC">WBPSC (Clerkship / Steno / Misc)</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">Password (Optional)</label>
                    <input type="text" value={regCustomPass} onChange={(e) => setRegCustomPass(e.target.value)} placeholder="Auto if blank" className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 text-sm" />
                  </div>
                </div>
                <button type="submit" className="w-full py-3 mt-2 rounded-xl font-bold text-sm text-white bg-indigo-600 hover:bg-indigo-700">
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
              <div className="bg-slate-900 text-white rounded-2xl p-5 text-left space-y-3 my-5">
                <div><div className="text-[11px] uppercase text-slate-400">Name</div><div className="font-semibold text-sm">{newlyCreatedAccount.name}</div></div>
                <div className="pt-2 border-t border-slate-800"><div className="text-[11px] uppercase text-amber-400">Unique Login ID</div><div className="font-mono text-lg font-bold">{newlyCreatedAccount.id}</div></div>
                <div className="pt-2 border-t border-slate-800"><div className="text-[11px] uppercase text-emerald-400">Password</div><div className="font-mono text-lg font-bold">{newlyCreatedAccount.password}</div></div>
              </div>
              <button type="button" onClick={() => { setLoginId(newlyCreatedAccount.id); setPassword(newlyCreatedAccount.password); setSelectedRoleTab('student'); setAuthView('login'); }}
                className="w-full py-3 rounded-xl font-bold text-sm text-white bg-indigo-600">
                Proceed to Login Now
              </button>
            </div>
          )}

          {authView === 'forgot' && (
            <>
              <div className="mb-5">
                <button type="button" onClick={() => { setErrorMsg(''); setAuthView('login'); }} className="text-xs font-semibold text-slate-500 flex items-center gap-1 mb-2">
                  <ChevronLeft className="w-3.5 h-3.5" /> Back to Login
                </button>
                <h3 className="text-2xl font-bold text-slate-900">Reset Password</h3>
              </div>
              {errorMsg && <div className="mb-4 p-3 rounded-xl bg-rose-50 text-rose-700 text-xs">{errorMsg}</div>}
              <form onSubmit={submitForgot} className="space-y-3.5">
                <select value={fpRole} onChange={(e) => setFpRole(e.target.value)} className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 text-sm bg-white">
                  <option value="student">Student / Candidate</option>
                  <option value="admin">Administrator</option>
                </select>
                <input type="text" required value={fpId} onChange={(e) => setFpId(e.target.value)} placeholder="Unique Login ID" className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 text-sm uppercase" />
                <input type="email" required value={fpEmail} onChange={(e) => setFpEmail(e.target.value)} placeholder="Registered Email" className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 text-sm" />
                <input type="password" required minLength={6} value={fpNewPass} onChange={(e) => setFpNewPass(e.target.value)} placeholder="New Password (min 6 chars)" className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 text-sm" />
                <button type="submit" className="w-full py-3 rounded-xl font-bold text-sm text-white bg-indigo-600">Reset Password</button>
              </form>
            </>
          )}
        </div>
      </div>
    </div>
  );
}

// ============================================================================
// COMPONENT 2: STUDENT DASHBOARD (FOLDERS + REATTEMPT STATUS)
// ============================================================================
function StudentDashboard({
  student, mocks, notes, attempts, allAttempts, onStartMock, onViewAttemptReport, onOpenNote, onChangePassword, onLogout
}) {
  const [activeTab, setActiveTab] = useState('mocks');
  const [streamFilter, setStreamFilter] = useState('ALL');
  const [subFolderFilter, setSubFolderFilter] = useState('ALL');
  const [searchQuery, setSearchQuery] = useState('');

  const handleSelectStream = (stream) => { setStreamFilter(stream); setSubFolderFilter('ALL'); };
  const handleSelectFolderShortcut = (stream, sub) => { setStreamFilter(stream); setSubFolderFilter(sub); };

  const filteredMocks = mocks.filter(m => {
    const matchesStream = streamFilter === 'ALL' || m.category === streamFilter;
    const sub = getMockSubCategory(m);
    const matchesSub = subFolderFilter === 'ALL' || sub === subFolderFilter;
    const matchesSearch = m.title.toLowerCase().includes(searchQuery.toLowerCase()) || sub.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesStream && matchesSub && matchesSearch;
  });

  const filteredNotes = notes.filter(n =>
    (streamFilter === 'ALL' || n.category === streamFilter) &&
    (n.title.toLowerCase().includes(searchQuery.toLowerCase()) || n.subject.toLowerCase().includes(searchQuery.toLowerCase()))
  );

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
            <div className="w-9 h-9 rounded-lg bg-amber-500 text-slate-950 font-black flex items-center justify-center text-lg">P</div>
            <div>
              <span className="font-extrabold tracking-tight text-lg">PATHSHALA</span>
              <span className="hidden sm:inline-block ml-2 text-xs px-2 py-0.5 rounded bg-indigo-600/40 text-indigo-200 border border-indigo-500/30">Candidate Portal</span>
            </div>
          </div>
          <div className="flex items-center gap-4">
            <div className="text-right hidden sm:block">
              <div className="text-sm font-semibold text-white">{student.name}</div>
              <div className="text-xs font-mono text-amber-400">{student.id}</div>
            </div>
            <button onClick={onLogout} className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-rose-600 text-xs font-semibold text-slate-200 hover:text-white transition">
              <LogOut className="w-3.5 h-3.5" /><span>Logout</span>
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
                <button key={tab.id} onClick={() => setActiveTab(tab.id)}
                  className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-semibold transition ${activeTab === tab.id ? 'bg-indigo-600 text-white shadow-sm' : 'text-slate-600 hover:bg-slate-100'}`}>
                  <Icon className="w-4 h-4" /><span>{tab.label}</span>
                </button>
              );
            })}
          </div>
          {(activeTab === 'mocks' || activeTab === 'notes') && (
            <div className="flex flex-wrap items-center gap-2">
              {['ALL', 'SSC', 'Railway', 'WBPSC'].map(stream => (
                <button key={stream} onClick={() => handleSelectStream(stream)}
                  className={`px-3.5 py-1.5 rounded-full text-xs font-bold border transition ${streamFilter === stream ? 'bg-slate-900 text-white border-slate-900' : 'bg-white text-slate-600 border-slate-200 hover:border-slate-400'}`}>
                  {stream === 'ALL' ? 'All Streams' : stream}
                </button>
              ))}
            </div>
          )}
        </div>

        {activeTab === 'mocks' && (
          <div className="mb-6 space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {Object.entries(EXAM_FOLDERS).map(([category, subList]) => {
                const isSelectedStream = streamFilter === category;
                const categoryTotal = mocks.filter(m => m.category === category).length;
                return (
                  <div key={category} className={`rounded-2xl border p-4 bg-white transition ${isSelectedStream ? 'ring-2 ring-indigo-600 border-indigo-300 shadow-sm' : 'border-slate-200'}`}>
                    <div className="flex items-center justify-between mb-3">
                      <button type="button" onClick={() => handleSelectStream(isSelectedStream && subFolderFilter === 'ALL' ? 'ALL' : category)}
                        className="flex items-center gap-2 font-extrabold text-sm text-slate-900 hover:text-indigo-700">
                        {isSelectedStream ? <FolderOpen className="w-4 h-4 text-indigo-600" /> : <Folder className="w-4 h-4 text-amber-500" />}
                        <span>{category} Section</span>
                      </button>
                      <span className="text-[11px] font-bold px-2 py-0.5 rounded-full bg-slate-100 text-slate-600">{categoryTotal} Mocks</span>
                    </div>
                    <div className="flex flex-wrap gap-1.5">
                      {subList.map(sub => {
                        const count = mocks.filter(m => m.category === category && getMockSubCategory(m) === sub).length;
                        const activeSub = streamFilter === category && subFolderFilter === sub;
                        return (
                          <button key={sub} type="button"
                            onClick={() => activeSub ? handleSelectStream('ALL') : handleSelectFolderShortcut(category, sub)}
                            className={`px-2.5 py-1 rounded-lg text-xs font-bold border transition flex items-center gap-1.5 ${
                              activeSub ? 'bg-indigo-600 text-white border-indigo-600' : 'bg-white text-slate-700 border-slate-200 hover:border-indigo-400'
                            }`}>
                            <span>{sub}</span>
                            <span className={`text-[10px] px-1.5 rounded-full ${activeSub ? 'bg-indigo-500 text-white' : 'bg-slate-100 text-slate-500'}`}>{count}</span>
                          </button>
                        );
                      })}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {(activeTab === 'mocks' || activeTab === 'notes') && (
          <div className="relative max-w-md mb-6">
            <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-3" />
            <input type="text" value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)}
              placeholder={`Search ${activeTab === 'mocks' ? 'mock tests or exam folder' : 'study notes'}...`}
              className="w-full pl-10 pr-4 py-2.5 rounded-xl bg-white border border-slate-200 text-sm outline-none focus:ring-2 focus:ring-indigo-500" />
          </div>
        )}

        {activeTab === 'mocks' && (
          filteredMocks.length === 0 ? (
            <div className="bg-white rounded-2xl border border-slate-200 p-10 text-center text-sm text-slate-500">
              No mock tests published inside this folder yet.
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
        {activeTab === 'notes' && (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
            {filteredNotes.map(note => (
              <div key={note.id} className="bg-white rounded-2xl border border-slate-200 p-5 shadow-sm flex flex-col justify-between">
                <div>
                  <div className="flex items-center justify-between gap-2 mb-3">
                    <span className="text-xs font-extrabold px-2.5 py-1 rounded-md bg-indigo-50 text-indigo-700 border border-indigo-200">{note.category} • {note.subject}</span>
                    <span className="text-xs text-slate-400">{note.readTime}</span>
                  </div>
                  <h3 className="font-bold text-slate-900 text-base mb-2">{note.title}</h3>
                  <p className="text-xs text-slate-600 leading-relaxed mb-4">{note.summary}</p>
                </div>
                <button onClick={() => onOpenNote(note)} className="w-full py-2.5 rounded-xl bg-slate-900 hover:bg-slate-800 text-white font-bold text-sm flex items-center justify-center gap-2">
                  <BookOpen className="w-4 h-4" /><span>Read & Print Capsule</span>
                </button>
              </div>
            ))}
          </div>
        )}

        {activeTab === 'history' && (
          <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-sm">
            <div className="p-5 border-b border-slate-100"><h3 className="font-bold text-slate-900">Your Past Mock Attempts & Live Rankings</h3></div>
            {attempts.length === 0 ? (
              <div className="p-10 text-center text-sm text-slate-500">No mock tests submitted yet.</div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-sm">
                  <thead className="bg-slate-50 text-slate-600 text-xs uppercase">
                    <tr>
                      <th className="px-5 py-3">Mock Test</th><th className="px-5 py-3">Live Rank</th><th className="px-5 py-3">Score</th>
                      <th className="px-5 py-3">Accuracy</th><th className="px-5 py-3">Time Taken</th><th className="px-5 py-3">Analysis</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {attempts.map(att => (
                      <tr key={att.id} className="hover:bg-slate-50">
                        <td className="px-5 py-3.5 font-semibold text-slate-900">{att.mockTitle}</td>
                        <td className="px-5 py-3.5 font-bold text-amber-600">{getRankForAttempt(att)}</td>
                        <td className="px-5 py-3.5 font-bold text-indigo-600">{att.score} / {att.maxScore}</td>
                        <td className="px-5 py-3.5">{att.accuracy}%</td>
                        <td className="px-5 py-3.5 text-slate-600 text-xs">{formatDurationHuman(att.totalTimeSeconds)}</td>
                        <td className="px-5 py-3.5">
                          <button onClick={() => onViewAttemptReport(att)} className="px-3 py-1 rounded-lg bg-indigo-50 text-indigo-700 text-xs font-bold">View Report</button>
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
                <div className="flex justify-between py-2 border-b border-slate-100"><span className="text-slate-500">Unique Login ID</span><span className="font-mono font-bold text-indigo-600">{student.id}</span></div>
                <div className="flex justify-between py-2 border-b border-slate-100"><span className="text-slate-500">Full Name</span><span className="font-semibold">{student.name}</span></div>
                <div className="flex justify-between py-2 border-b border-slate-100"><span className="text-slate-500">Email</span><span>{student.email}</span></div>
                <div className="flex justify-between py-2 border-b border-slate-100"><span className="text-slate-500">Mobile</span><span>{student.phone}</span></div>
                <div className="flex justify-between py-2"><span className="text-slate-500">Target Stream</span><span className="font-bold">{student.targetExam}</span></div>
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
    if (newPass !== confirmPass) { setStatus({ type: 'error', text: 'New passwords do not match.' }); return; }
    const res = await onChangePassword(oldPass, newPass);
    if (res.success) { setStatus({ type: 'success', text: 'Password changed!' }); setOldPass(''); setNewPass(''); setConfirmPass(''); }
    else setStatus({ type: 'error', text: res.message });
  };

  return (
    <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-sm">
      <h3 className="font-bold text-lg text-slate-900 mb-4">Change Account Password</h3>
      {status && <div className={`mb-4 p-3 rounded-xl text-xs ${status.type === 'error' ? 'bg-rose-50 text-rose-700' : 'bg-emerald-50 text-emerald-700'}`}>{status.text}</div>}
      <form onSubmit={handleSubmit} className="space-y-3.5">
        <input type="password" required value={oldPass} onChange={(e) => setOldPass(e.target.value)} placeholder="Current Password" className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 text-sm" />
        <input type="password" required minLength={6} value={newPass} onChange={(e) => setNewPass(e.target.value)} placeholder="New Password (min 6 chars)" className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 text-sm" />
        <input type="password" required minLength={6} value={confirmPass} onChange={(e) => setConfirmPass(e.target.value)} placeholder="Confirm New Password" className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 text-sm" />
        <button type="submit" className="w-full py-2.5 rounded-xl bg-slate-900 text-white font-bold text-sm">Update Password</button>
      </form>
    </div>
  );
}

// ============================================================================
// COMPONENT 4: TCS iON CBT EXAM ENGINE (GREEN TICK ON ANSWERED & MARKED)
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
        <h2 className="text-xl font-bold text-slate-900 border-b border-slate-200 pb-3 mb-4">General Instructions — {mock.title}</h2>
        <div className="space-y-3 text-sm text-slate-700 leading-relaxed mb-6">
          <p><strong>1. Exam Folder:</strong> {mock.category} → <strong>{getMockSubCategory(mock)}</strong></p>
          <p><strong>2. Duration & Marking:</strong> Total duration is <strong>{mock.durationMinutes} minutes</strong> (+{mock.positiveMark} / -{mock.negativeMark}). Auto-submits when timer reaches 00:00.</p>
          <p><strong>3. Question Palette Legend:</strong> Questions marked as <strong>Answered &amp; Marked for Review</strong> (purple circle with green <strong>✓</strong> tick) are evaluated in your final score.</p>
          <p><strong>4. Specific Exam Note:</strong> {mock.instructions}</p>
        </div>
        <label className="flex items-start gap-3 p-3.5 rounded-lg bg-amber-50 border border-amber-200 text-xs text-slate-800 cursor-pointer mb-6">
          <input type="checkbox" checked={agreed} onChange={(e) => setAgreed(e.target.checked)} className="mt-0.5 w-4 h-4 accent-indigo-600" />
          <span>I have read and understood all the instructions and agree to abide by the exam rules.</span>
        </label>
        <div className="flex items-center justify-between">
          <button onClick={onCancel} className="px-5 py-2.5 rounded-lg border border-slate-300 text-sm font-semibold text-slate-700">Back to Dashboard</button>
          <button disabled={!agreed} onClick={onStart} className={`px-6 py-2.5 rounded-lg text-sm font-bold text-white ${agreed ? 'bg-[#2c5aa0] hover:bg-blue-800' : 'bg-slate-400 cursor-not-allowed'}`}>
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
      if (chosen === undefined) unattempted++;
      else if (chosen === q.correctIndex) correct++;
      else wrong++;
    });

    const score = Number(((correct * mock.positiveMark) - (wrong * mock.negativeMark)).toFixed(2));
    const maxScore = Number((questions.length * mock.positiveMark).toFixed(2));
    const attemptedTotal = correct + wrong;
    const accuracy = attemptedTotal > 0 ? Math.round((correct / attemptedTotal) * 100) : 0;

    const elapsedByClock = totalExamSeconds - remainingSec;
    const sumQuestionSeconds = Object.values(latestQuestionTimes).reduce((acc, v) => acc + v, 0);
    const totalTimeSeconds = isAutoSubmit ? totalExamSeconds : Math.max(1, elapsedByClock > 0 ? elapsedByClock : sumQuestionSeconds);

    onSubmitExam({
      id: `att-${Date.now()}`,
      studentId: student.id,
      studentName: student.name,
      mockId: mock.id,
      mockTitle: mock.title,
      category: mock.category,
      subCategory: getMockSubCategory(mock),
      score, maxScore, correct, wrong, unattempted, accuracy,
      totalTimeSeconds, questionTimes: latestQuestionTimes, userAnswers: latestAnswers,
      autoSubmitted: isAutoSubmit,
      submittedAt: new Date().toISOString()
    });
  }, [mock, questions, student, totalExamSeconds, onSubmitExam]);

  useEffect(() => {
    const timer = setInterval(() => {
      if (hasSubmittedRef.current) { clearInterval(timer); return; }
      const activeQ = currentIdxRef.current;
      const updatedTimes = { ...questionTimesRef.current, [activeQ]: (questionTimesRef.current[activeQ] || 0) + 1 };
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
      if (next[targetIdx] === 'not_visited') next[targetIdx] = 'not_answered';
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
    setStatuses(prev => (prev[currentIdx] === 'marked' ? { ...prev, [currentIdx]: 'answered_marked' } : prev));
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
    setStatuses(prev => ({ ...prev, [currentIdx]: hasAns ? 'answered' : 'not_answered' }));
    if (currentIdx + 1 < questions.length) navigateToQuestion(currentIdx + 1);
  };

  const handleMarkForReviewAndNext = () => {
    const hasAns = answersRef.current[currentIdx] !== undefined;
    setStatuses(prev => ({ ...prev, [currentIdx]: hasAns ? 'answered_marked' : 'marked' }));
    if (currentIdx + 1 < questions.length) navigateToQuestion(currentIdx + 1);
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
          <button onClick={onExit} className="bg-blue-900/70 hover:bg-rose-600 px-2.5 py-1 rounded text-xs font-semibold">Exit Test</button>
        </div>
      </div>

      <div className="bg-slate-100 border-b border-slate-300 px-4 py-2 flex flex-wrap items-center justify-between gap-2 shrink-0">
        <div className="flex items-center gap-1.5 overflow-x-auto">
          <span className="text-xs font-bold text-slate-500 mr-1">Sections:</span>
          {sections.map(sec => {
            const firstIdxInSec = questions.findIndex(q => q.section === sec);
            const isActive = currentQ.section === sec;
            return (
              <button key={sec} onClick={() => navigateToQuestion(firstIdxInSec)}
                className={`px-3 py-1 rounded text-xs font-bold border whitespace-nowrap ${
                  isActive ? 'bg-[#2c5aa0] text-white border-[#2c5aa0]' : 'bg-white text-slate-700 border-slate-300 hover:bg-slate-200'
                }`}>
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

          <div className="flex-1 overflow-y-auto p-6 space-y-5">
            <div className="text-base text-slate-900 font-medium whitespace-pre-line leading-relaxed">{currentQ.text}</div>
            <div className="space-y-3 max-w-2xl">
              {currentQ.options.map((opt, idx) => {
                const isSelected = answers[currentIdx] === idx;
                return (
                  <label key={idx} onClick={() => handleSelectOption(idx)}
                    className={`flex items-center gap-3.5 p-3.5 rounded-lg border cursor-pointer transition ${
                      isSelected ? 'bg-blue-50 border-[#2c5aa0] ring-1 ring-[#2c5aa0]' : 'bg-white border-slate-300 hover:bg-slate-50'
                    }`}>
                    <input type="radio" name={`q-${currentIdx}`} checked={isSelected} onChange={() => {}} className="w-4 h-4 accent-[#2c5aa0]" />
                    <span className="text-sm text-slate-800 font-medium">
                      <strong className="mr-2 text-slate-500">({String.fromCharCode(65 + idx)})</strong>{opt}
                    </span>
                  </label>
                );
              })}
            </div>
          </div>

          <div className="px-4 py-3 bg-slate-100 border-t border-slate-300 flex flex-wrap items-center justify-between gap-2 shrink-0">
            <div className="flex flex-wrap gap-2">
              <button type="button" onClick={handleMarkForReviewAndNext} className="px-4 py-2 rounded bg-white hover:bg-slate-200 border border-slate-400 text-xs font-bold text-slate-800">
                Mark for Review & Next
              </button>
              <button type="button" onClick={handleClearResponse} className="px-4 py-2 rounded bg-white hover:bg-slate-200 border border-slate-400 text-xs font-bold text-slate-800">
                Clear Response
              </button>
            </div>
            <button type="button" onClick={handleSaveAndNext} className="px-6 py-2 rounded bg-[#2c5aa0] hover:bg-blue-800 text-white text-xs font-bold shadow">
              Save & Next
            </button>
          </div>
        </div>

        <div className="lg:w-3/12 bg-[#e8f1f8] flex flex-col justify-between overflow-y-auto">
          <div>
            <div className="p-3 bg-white border-b border-slate-300 flex items-center gap-3">
              <div className="w-10 h-10 rounded bg-slate-200 border border-slate-300 flex items-center justify-center font-bold text-slate-700">{student.name.charAt(0)}</div>
              <div className="overflow-hidden">
                <div className="text-xs font-bold text-slate-900 truncate">{student.name}</div>
                <div className="text-[11px] font-mono text-slate-500">{student.id}</div>
              </div>
            </div>

            <div className="p-3 bg-white border-b border-slate-300 grid grid-cols-2 gap-2 text-[11px]">
              <div className="flex items-center gap-2">
                <span className="w-6 h-6 rounded-b-lg bg-emerald-600 text-white font-bold flex items-center justify-center shrink-0">{counts.answered}</span>
                <span>Answered</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="w-6 h-6 rounded-t-lg bg-rose-600 text-white font-bold flex items-center justify-center shrink-0">{counts.notAnswered}</span>
                <span>Not Answered</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="w-6 h-6 rounded bg-slate-200 border border-slate-400 text-slate-800 font-bold flex items-center justify-center shrink-0">{counts.notVisited}</span>
                <span>Not Visited</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="w-6 h-6 rounded-full bg-purple-700 text-white font-bold flex items-center justify-center shrink-0">{counts.marked}</span>
                <span>Marked for Review</span>
              </div>
              <div className="col-span-2 flex items-center gap-2 pt-1 border-t border-slate-100">
                <span className="w-6 h-6 rounded-full bg-purple-700 text-white font-bold flex items-center justify-center relative shrink-0">
                  {counts.answeredMarked}
                  <span className="w-3.5 h-3.5 rounded-full bg-emerald-500 text-white text-[9px] font-black flex items-center justify-center absolute -bottom-0.5 -right-0.5 border border-white">✓</span>
                </span>
                <span>Answered &amp; Marked for Review (Evaluated)</span>
              </div>
            </div>

            <div className="bg-[#2c5aa0] text-white px-3 py-1.5 text-xs font-bold">Choose a Question</div>
            <div className="p-3 grid grid-cols-5 gap-2">
              {questions.map((_, idx) => {
                const st = statuses[idx];
                const isCurrent = idx === currentIdx;
                let badgeStyle = 'bg-slate-200 border border-slate-400 text-slate-800 rounded';
                if (st === 'answered') badgeStyle = 'bg-emerald-600 text-white rounded-b-xl';
                if (st === 'not_answered') badgeStyle = 'bg-rose-600 text-white rounded-t-xl';
                if (st === 'marked' || st === 'answered_marked') badgeStyle = 'bg-purple-700 text-white rounded-full';

                return (
                  <button key={idx} onClick={() => navigateToQuestion(idx)}
                    className={`h-9 font-bold text-xs flex items-center justify-center relative transition ${badgeStyle} ${isCurrent ? 'ring-2 ring-offset-1 ring-amber-500' : ''}`}>
                    {idx + 1}
                    {st === 'answered_marked' && (
                      <span title="Answered & Marked for Review"
                        className="w-4 h-4 rounded-full bg-emerald-500 text-white text-[10px] font-black flex items-center justify-center absolute -bottom-1 -right-1 border border-white shadow">
                        ✓
                      </span>
                    )}
                  </button>
                );
              })}
            </div>
          </div>

          <div className="p-3 bg-white border-t border-slate-300">
            <button type="button" onClick={() => setShowSubmitModal(true)} className="w-full py-2.5 rounded bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-sm shadow">
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
              <div>Not Answered: <strong className="text-rose-600">{counts.notAnswered}</strong></div>
              <div>Not Visited: <strong>{counts.notVisited}</strong></div>
            </div>
            <div className="flex justify-end gap-2">
              <button onClick={() => setShowSubmitModal(false)} className="px-4 py-2 rounded-lg border border-slate-300 text-xs font-bold text-slate-700">Resume Test</button>
              <button onClick={() => finalizeSubmission(false)} className="px-5 py-2 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold">Yes, Submit Final Test</button>
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
    const list = allMockAttempts.some(a => a.id === attempt.id) ? [...allMockAttempts] : [attempt, ...allMockAttempts];
    return list.sort((a, b) => (b.score - a.score) || (b.accuracy - a.accuracy) || ((a.totalTimeSeconds || 99999) - (b.totalTimeSeconds || 99999)));
  }, [allMockAttempts, attempt]);

  const candidateRank = rankedAttempts.findIndex(a => a.id === attempt.id) + 1;
  const totalCandidates = rankedAttempts.length;
  const percentile = totalCandidates > 1 ? Math.round(((totalCandidates - candidateRank) / (totalCandidates - 1)) * 100) : 100;

  const sectionAnalysis = useMemo(() => {
