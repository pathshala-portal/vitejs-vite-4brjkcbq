import React, { useState, useEffect, useMemo, useRef } from 'react';
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
  getDoc, 
  getDocs, 
  onSnapshot, 
  updateDoc, 
  deleteDoc 
} from 'firebase/firestore';
import {
  BookOpen, CheckCircle2, Clock, Award, Shield, User, Lock, KeyRound,
  LogOut, Plus, Trash2, Edit3, FileText, ChevronRight, ChevronLeft,
  AlertCircle, Check, X, Search, Filter, Eye, EyeOff, LayoutDashboard,
  GraduationCap, Sparkles, RefreshCw, Copy, ArrowRight, Bookmark,
  BarChart3, Users, HelpCircle, Save, RotateCcw, Flag, Printer
} from 'lucide-react';

// ============================================================================
// FIREBASE CONFIGURATION (REPLACE THESE VALUES WITH YOUR OWN FIREBASE KEYS)
// ============================================================================
const firebaseConfig = {
  apiKey: "AIzaSyDf2OFI0ki9r9vSVxdgfps1Fuxm85vjp2g",
  authDomain: "pathshala-portal-2000.firebaseapp.com",
  projectId: "pathshala-portal-2000",
  storageBucket: "pathshala-portal-2000.firebasestorage.app",
  messagingSenderId: "42246222677",
  appId: "1:42246222677:web:71e12251953034fb9735dc"
};
const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);
const appId = 'pathshala-prod-v1';

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
        section: 'General Intelligence & Reasoning',
        text: 'In a certain code language, "MADRAS" is written as "NBESBT". How is "BOMBAY" written in that code?',
        options: ['CPNCBX', 'CPNCBZ', 'CPOCBZ', 'CQOCBZ'],
        correctIndex: 1,
        explanation: 'Each letter is shifted +1 forward in the English alphabet: B+1=C, O+1=P, M+1=N, B+1=C, A+1=B, Y+1=Z.'
      },
      {
        id: 'q3',
        section: 'General Awareness',
        text: 'Which Article of the Constitution of India deals with the Right to Constitutional Remedies, termed by Dr. B.R. Ambedkar as the "Heart and Soul" of the Constitution?',
        options: ['Article 14', 'Article 19', 'Article 21A', 'Article 32'],
        correctIndex: 3,
        explanation: 'Article 32 empowers citizens to move the Supreme Court directly for the enforcement of Fundamental Rights.'
      },
      {
        id: 'q4',
        section: 'General Awareness',
        text: 'The Battle of Plassey was fought in 1757 on the banks of which river?',
        options: ['Damodar', 'Bhagirathi (Hooghly)', 'Subarnarekha', 'Teesta'],
        correctIndex: 1,
        explanation: 'The Battle of Plassey (23 June 1757) took place on the banks of the Bhagirathi-Hooghly river near Palashi.'
      },
      {
        id: 'q5',
        section: 'Quantitative Aptitude',
        text: 'If x + (1/x) = 5, find the value of x² + (1/x²).',
        options: ['25', '23', '27', '21'],
        correctIndex: 1,
        explanation: 'Squaring both sides: (x + 1/x)² = 25 => x² + 1/x² + 2 = 25 => x² + 1/x² = 23.'
      },
      {
        id: 'q6',
        section: 'English Comprehension',
        text: 'Select the most appropriate synonym of the given word: EPHEMERAL',
        options: ['Perpetual', 'Transitory', 'Enduring', 'Abundant'],
        correctIndex: 1,
        explanation: 'Ephemeral means lasting for a very short time; transitory is its closest synonym.'
      }
    ]
  },
  {
    id: 'mock-rrb-ntpc-01',
    title: 'Railway RRB NTPC CBT-1 Mega Mock #01',
    category: 'Railway',
    durationMinutes: 90,
    positiveMark: 1.0,
    negativeMark: 0.33,
    instructions: '1 mark will be awarded for every correct answer and 1/3rd mark will be deducted for every incorrect answer.',
    questions: [
      {
        id: 'rq1',
        section: 'General Science',
        text: 'What is the SI unit of electrical resistivity?',
        options: ['Ohm', 'Ohm-metre (Ω·m)', 'Siemens', 'Ampere-metre'],
        correctIndex: 1,
        explanation: 'Resistivity ρ = R·A/L, which has the SI unit Ohm-metre (Ω·m).'
      },
      {
        id: 'rq2',
        section: 'General Science',
        text: 'Which gas is primarily responsible for the sharp pungent smell near public urinals due to bacterial decomposition of urea?',
        options: ['Sulphur Dioxide', 'Ammonia', 'Methane', 'Hydrogen Sulphide'],
        correctIndex: 1,
        explanation: 'Urea decomposes in the presence of bacteria to release Ammonia (NH₃).'
      },
      {
        id: 'rq3',
        section: 'Mathematics',
        text: 'A train 240 m long passes a pole in 24 seconds. How long will it take to pass a platform 650 m long?',
        options: ['65 sec', '89 sec', '100 sec', '150 sec'],
        correctIndex: 1,
        explanation: 'Speed = 240/24 = 10 m/s. Total distance = 240 + 650 = 890 m. Time = 890/10 = 89 seconds.'
      },
      {
        id: 'rq4',
        section: 'General Awareness',
        text: 'Where is the headquarters of Eastern Railway Zone located?',
        options: ['Hajipur', 'Kolkata', 'Bhubaneswar', 'Maligaon'],
        correctIndex: 1,
        explanation: 'Eastern Railway (ER) is headquartered at Fairlie Place, Kolkata.'
      }
    ]
  },
  {
    id: 'mock-wbpsc-clerk-01',
    title: 'WBPSC Clerkship & Miscellaneous Prelims Mock #01',
    category: 'WBPSC',
    durationMinutes: 90,
    positiveMark: 1.0,
    negativeMark: 0.25,
    instructions: 'Total 100 Marks pattern. 1 mark for correct answer, 0.25 negative marking for each wrong response.',
    questions: [
      {
        id: 'wq1',
        section: 'General Studies',
        text: 'Who founded the "Atmiya Sabha" in Calcutta in 1815 to propagate monotheistic ideals of Vedanta?',
        options: ['Ishwar Chandra Vidyasagar', 'Raja Ram Mohan Roy', 'Debendranath Tagore', 'Keshab Chandra Sen'],
        correctIndex: 1,
        explanation: 'Raja Ram Mohan Roy established Atmiya Sabha in Kolkata in 1815.'
      },
      {
        id: 'wq2',
        section: 'General Studies',
        text: 'Which district of West Bengal shares international borders with three countries (Nepal, Bhutan, and Bangladesh)?',
        options: ['Jalpaiguri', 'Darjeeling', 'Kalimpong', 'Alipurduar'],
        correctIndex: 1,
        explanation: 'Darjeeling district borders Nepal to the west, Bhutan/Sikkim to the north-east, and Bangladesh to the south.'
      },
      {
        id: 'wq3',
        section: 'Arithmetic',
        text: 'If the ratio of cost price to selling price of an article is 5 : 6, what is the profit percentage?',
        options: ['15%', '20%', '25%', '16.67%'],
        correctIndex: 1,
        explanation: 'Profit = 6 - 5 = 1. Profit % = (1/5) × 100 = 20%.'
      },
      {
        id: 'wq4',
        section: 'English',
        text: 'Fill in the blank with the appropriate preposition: "He was acquitted ______ all the charges levelled against him."',
        options: ['from', 'of', 'with', 'for'],
        correctIndex: 1,
        explanation: 'The verb "acquit" is followed by the preposition "of" (acquitted of charges).'
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
• Right to Equality (Articles 14–18):
  - Art 14: Equality before law & equal protection of laws.
  - Art 17: Abolition of Untouchability (Absolute right).
  - Art 18: Abolition of Titles (except military & academic).
• Right to Freedom (Articles 19–22):
  - Art 19(1)(a): Freedom of speech and expression.
  - Art 21: Protection of life and personal liberty.
  - Art 21A: Free and compulsory education (6–14 years) — added by 86th Amendment Act, 2002.
• Right to Constitutional Remedies (Article 32):
  - 5 Writs: Habeas Corpus, Mandamus, Prohibition, Certiorari, Quo-Warranto.

2. LANDMARK CONSTITUTIONAL AMENDMENTS
• 42nd Amendment (1976) — "Mini Constitution": Added Socialist, Secular, Integrity to Preamble; added Fundamental Duties (Part IVA, Art 51A).
• 44th Amendment (1978): Removed Right to Property from Fundamental Rights (moved to Art 300A as a legal right).
• 61st Amendment (1989): Reduced voting age from 21 years to 18 years.
• 101st Amendment (2016): Goods and Services Tax (GST).

3. QUICK TRICK FOR 12 SCHEDULES ("TEARS OF OLD PM")
T - Territories | E - Emoluments | A - Affirmations | R - Rajya Sabha | S - Scheduled Areas | O - Other Tribal Areas | F - Federal List | O - Official Languages | L - Land Reforms | D - Defection (52nd Amend) | P - Panchayats (73rd Amend) | M - Municipalities (74th Amend).`
  },
  {
    id: 'note-science-02',
    title: 'Railway Special: Physics Formulas, SI Units & Chemical Compounds',
    category: 'Railway',
    subject: 'General Science',
    readTime: '6 min read',
    updatedAt: '2026-11-12',
    summary: 'Frequently repeated RRB NTPC & Group-D science facts: common names of chemicals, mirror/lens rules, and SI units.',
    content: `1. IMPORTANT CHEMICAL COMPOUNDS & COMMON NAMES
• Baking Soda: Sodium Bicarbonate (NaHCO₃)
• Washing Soda: Sodium Carbonate Decahydrate (Na₂CO₃·10H₂O)
• Bleaching Powder: Calcium Oxychloride (CaOCl₂)
• Plaster of Paris (POP): Calcium Sulphate Hemihydrate (CaSO₄·½H₂O)
• Blue Vitriol: Copper Sulphate (CuSO₄·5H₂O)
• Laughing Gas: Nitrous Oxide (N₂O)

2. MIRROR & LENS QUICK REVISION
• Concave Mirror: Used in headlights, shaving mirrors, solar furnaces, and by dentists (forms enlarged virtual image when object is between P and F).
• Convex Mirror: Used as rear-view mirrors in vehicles (always forms virtual, erect, and diminished image with wide field of view).
• Power of Lens (P) = 1 / f (in metres). Unit: Dioptre (D). Convex lens has +ve power; Concave lens has -ve power.

3. ESSENTIAL SI UNITS
• Luminous Intensity: Candela (cd)
• Magnetic Flux: Weber (Wb)
• Magnetic Flux Density: Tesla (T)
• Frequency: Hertz (Hz)
• Electric Charge: Coulomb (C)`
  },
  {
    id: 'note-wb-03',
    title: 'West Bengal Geography & Bengal Renaissance Master Notes',
    category: 'WBPSC',
    subject: 'WB Static GK & History',
    readTime: '10 min read',
    updatedAt: '2026-11-14',
    summary: 'Complete revision notes on West Bengal physiography, rivers, national parks, and 19th-century socio-religious reform movements.',
    content: `1. WEST BENGAL GEOGRAPHY HIGHLIGHTS
• Latitudinal Extent: 21°25'N to 27°13'N | Longitudinal Extent: 85°50'E to 89°50'E.
• Highest Peak: Sandakphu (3,636 m) on the Singalila Ridge in Darjeeling.
• International Boundaries: Bangladesh (2,217 km — longest), Nepal, and Bhutan.
• State Symbols: Animal — Fishing Cat; Bird — White-throated Kingfisher; Tree — Chatim; Flower — Night-flowering Jasmine (Shiuli).
• Major National Parks: Sundarbans (South 24 Parganas), Jaldapara (Alipurduar), Gorumara (Jalpaiguri), Buxa Tiger Reserve (Alipurduar), Singalila & Neora Valley (Darjeeling/Kalimpong).

2. BENGAL RENAISSANCE & REFORM MOVEMENTS
• Brahmo Samaj (1828): Founded by Raja Ram Mohan Roy (published Sambad Kaumudi & Mirat-ul-Akhbar).
• Tattwabodhini Sabha (1839): Founded by Debendranath Tagore.
• Widow Remarriage Act (1856): Passed due to the tireless efforts of Ishwar Chandra Vidyasagar.
• Young Bengal Movement: Led by Henry Louis Vivian Derozio at Hindu College.`
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

// ============================================================================
// MAIN APPLICATION COMPONENT
// ============================================================================
export default function App() {
  // Firebase Auth & Sync State
  const [fbUser, setFbUser] = useState(null);
  const [dbReady, setDbReady] = useState(false);

  // Portal Collections State
  const [users, setUsers] = useState(DEFAULT_USERS);
  const [mocks, setMocks] = useState(DEFAULT_MOCKS);
  const [notes, setNotes] = useState(DEFAULT_NOTES);
  const [attempts, setAttempts] = useState([]);

  // Session & View Routing State
  const [currentUser, setCurrentUser] = useState(null);
  const [authView, setAuthView] = useState('login'); // 'login' | 'register' | 'forgot' | 'registered_success'
  const [selectedRoleTab, setSelectedRoleTab] = useState('student'); // 'student' | 'admin'
  const [newlyCreatedAccount, setNewlyCreatedAccount] = useState(null);

  // Active Exam / Study State
  const [activeMock, setActiveMock] = useState(null);
  const [examPhase, setExamPhase] = useState('instructions'); // 'instructions' | 'live' | 'result'
  const [lastAttemptResult, setLastAttemptResult] = useState(null);
  const [readingNote, setReadingNote] = useState(null);

  // Toast Notification
  const [toast, setToast] = useState(null);
  const showToast = (message, type = 'success') => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 3500);
  };

  // --------------------------------------------------------------------------
  // 1. INITIALIZE FIREBASE AUTH & SEED INITIAL DATA
  // --------------------------------------------------------------------------
  useEffect(() => {
    const initAuth = async () => {
      try {
        await signInAnonymously(auth);
      } catch (err) {
        console.error('Auth error:', err);
      }
    };
    initAuth();
    const unsub = onAuthStateChanged(auth, (user) => {
      setFbUser(user);
    });
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
          for (const u of DEFAULT_USERS) {
            await setDoc(doc(usersCol, u.id), u);
          }
        }
        const mockSnap = await getDocs(mocksCol);
        if (mockSnap.empty) {
          for (const m of DEFAULT_MOCKS) {
            await setDoc(doc(mocksCol, m.id), m);
          }
        }
        const noteSnap = await getDocs(notesCol);
        if (noteSnap.empty) {
          for (const n of DEFAULT_NOTES) {
            await setDoc(doc(notesCol, n.id), n);
          }
        }
        setDbReady(true);
      } catch (err) {
        console.error('Firestore seed error:', err);
        setDbReady(true);
      }
    };

    seedIfEmpty();

    const unsubUsers = onSnapshot(usersCol, (snap) => {
      if (!snap.empty) {
        setUsers(snap.docs.map(d => d.data()));
      }
    }, (err) => console.error(err));

    const unsubMocks = onSnapshot(mocksCol, (snap) => {
      if (!snap.empty) {
        setMocks(snap.docs.map(d => d.data()));
      }
    }, (err) => console.error(err));

    const unsubNotes = onSnapshot(notesCol, (snap) => {
      if (!snap.empty) {
        setNotes(snap.docs.map(d => d.data()));
      }
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

  // Keep currentUser synced if password/profile changes
  useEffect(() => {
    if (currentUser) {
      const updated = users.find(u => u.id === currentUser.id);
      if (updated) setCurrentUser(updated);
    }
  }, [users]);

  // --------------------------------------------------------------------------
  // 2. AUTHENTICATION HANDLERS
  // --------------------------------------------------------------------------
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
    const newStudent = {
      id: uniqueId,
      password: generatedPassword,
      role: 'student',
      name: name.trim(),
      email: trimmedEmail,
      phone: phone.trim(),
      targetExam: targetExam || 'SSC',
      createdAt: new Date().toISOString()
    };

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

  // --------------------------------------------------------------------------
  // 3. ADMIN CRUD HANDLERS
  // --------------------------------------------------------------------------
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

  const submitExamAttempt = async (attemptRecord) => {
    try {
      if (fbUser) {
        await setDoc(doc(db, 'artifacts', appId, 'public', 'data', 'attempts', attemptRecord.id), attemptRecord);
      } else {
        setAttempts(prev => [attemptRecord, ...prev]);
      }
      setLastAttemptResult(attemptRecord);
      setExamPhase('result');
    } catch (err) {
      setLastAttemptResult(attemptRecord);
      setExamPhase('result');
    }
  };

  // --------------------------------------------------------------------------
  // 4. VIEW ROUTING
  // --------------------------------------------------------------------------
  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 font-sans">
      {/* Global Toast Notification */}
      {toast && (
        <div className={`fixed bottom-5 right-5 z-50 flex items-center gap-2.5 px-4 py-3 rounded-xl shadow-xl text-white text-sm font-medium transition-all ${
          toast.type === 'error' ? 'bg-rose-600' : 'bg-slate-900 border border-slate-700'
        }`}>
          {toast.type === 'error' ? <AlertCircle className="w-4 h-4 text-rose-200" /> : <CheckCircle2 className="w-4 h-4 text-emerald-400" />}
          <span>{toast.message}</span>
        </div>
      )}

      {/* UNAUTHENTICATED PORTAL: LOGIN / REGISTER / FORGOT PASSWORD */}
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

      {/* AUTHENTICATED: TCS iON CBT EXAM ENGINE */}
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
              onBackToDashboard={() => {
                setActiveMock(null);
                setLastAttemptResult(null);
              }}
            />
          )}
        </>
      )}

      {/* AUTHENTICATED: STUDY NOTE READER MODAL/SCREEN */}
      {currentUser && readingNote && (
        <StudyNoteReader
          note={readingNote}
          onClose={() => setReadingNote(null)}
        />
      )}

      {/* AUTHENTICATED: STUDENT DASHBOARD */}
      {currentUser && currentUser.role === 'student' && !activeMock && !readingNote && (
        <StudentDashboard
          student={currentUser}
          mocks={mocks}
          notes={notes}
          attempts={attempts.filter(a => a.studentId === currentUser.id)}
          onStartMock={(mock) => {
            setActiveMock(mock);
            setExamPhase('instructions');
          }}
          onOpenNote={(note) => setReadingNote(note)}
          onChangePassword={handleChangePassword}
          onLogout={handleLogout}
        />
      )}

      {/* AUTHENTICATED: ADMIN CONTROL PANEL */}
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
        />
      )}
    </div>
  );
}

// ============================================================================
// COMPONENT 1: DUAL-ROLE AUTHENTICATION PORTAL (LOGIN, REGISTER, FORGOT)
// ============================================================================
function AuthPortal({
  authView, setAuthView, selectedRoleTab, setSelectedRoleTab,
  onLogin, onRegister, onForgot, newlyCreatedAccount, mocksCount, notesCount
}) {
  const [loginId, setLoginId] = useState('');
  const [password, setPassword] = useState('');
  const [showPass, setShowPass] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  // Registration form state
  const [regName, setRegName] = useState('');
  const [regEmail, setRegEmail] = useState('');
  const [regPhone, setRegPhone] = useState('');
  const [regExam, setRegExam] = useState('SSC');
  const [regCustomPass, setRegCustomPass] = useState('');

  // Forgot password state
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
      {/* Left Hero Branding Panel */}
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
            Practice in an authentic Computer-Based Test interface with live section switching, question status palettes, negative marking analytics, and curated notes for SSC, Railway, and WBPSC aspirants.
          </p>

          <div className="grid grid-cols-3 gap-3 mb-8">
            <div className="bg-white/5 border border-white/10 rounded-xl p-3.5">
              <div className="text-amber-400 font-bold text-lg">SSC</div>
              <div className="text-xs text-slate-400">CGL, CHSL, MTS</div>
            </div>
            <div className="bg-white/5 border border-white/10 rounded-xl p-3.5">
              <div className="text-sky-400 font-bold text-lg">Railway</div>
              <div className="text-xs text-slate-400">NTPC, ALP, Group-D</div>
            </div>
            <div className="bg-white/5 border border-white/10 rounded-xl p-3.5">
              <div className="text-emerald-400 font-bold text-lg">WBPSC</div>
              <div className="text-xs text-slate-400">Clerkship, Misc, WBCS</div>
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

      {/* Right Authentication Form Panel */}
      <div className="lg:w-7/12 bg-slate-50 flex items-center justify-center p-6 lg:p-12">
        <div className="w-full max-w-md bg-white rounded-2xl shadow-xl border border-slate-200/80 p-7 sm:p-8">
          
          {/* VIEW A: LOGIN */}
          {authView === 'login' && (
            <>
              <div className="mb-6">
                <h3 className="text-2xl font-bold text-slate-900">Sign In to PATHSHALA</h3>
                <p className="text-sm text-slate-500 mt-1">Select your role and enter your Unique Login ID.</p>
              </div>

              {/* Dual Role Switcher */}
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

          {/* VIEW B: STUDENT REGISTRATION */}
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
                      <option value="SSC">SSC (CGL / CHSL / MTS)</option>
                      <option value="Railway">Railway (NTPC / Group-D)</option>
                      <option value="WBPSC">WBPSC (Clerkship / WBCS)</option>
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

          {/* VIEW C: REGISTRATION SUCCESS CREDENTIALS CARD */}
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

          {/* VIEW D: FORGOT PASSWORD */}
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
// COMPONENT 2: STUDENT DASHBOARD (MOCKS BY STREAM, NOTES, HISTORY, PASSWORD)
// ============================================================================
function StudentDashboard({
  student, mocks, notes, attempts, onStartMock, onOpenNote, onChangePassword, onLogout
}) {
  const [activeTab, setActiveTab] = useState('mocks'); // 'mocks' | 'notes' | 'history' | 'profile'
  const [streamFilter, setStreamFilter] = useState('ALL'); // 'ALL' | 'SSC' | 'Railway' | 'WBPSC'
  const [searchQuery, setSearchQuery] = useState('');

  const filteredMocks = mocks.filter(m => {
    const matchesStream = streamFilter === 'ALL' || m.category === streamFilter;
    const matchesSearch = m.title.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesStream && matchesSearch;
  });

  const filteredNotes = notes.filter(n => {
    const matchesStream = streamFilter === 'ALL' || n.category === streamFilter;
    const matchesSearch =
      n.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      n.subject.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesStream && matchesSearch;
  });

  return (
    <div className="min-h-screen flex flex-col bg-slate-50">
      {/* Top Navbar */}
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

      {/* Main Container */}
      <main className="max-w-7xl w-full mx-auto px-4 sm:px-6 py-6 flex-1">
        {/* Navigation Tabs */}
        <div className="flex flex-wrap items-center justify-between gap-4 mb-6">
          <div className="flex flex-wrap gap-2 bg-white p-1.5 rounded-xl border border-slate-200 shadow-sm">
            {[
              { id: 'mocks', label: 'CBT Mock Tests', icon: Clock },
              { id: 'notes', label: 'Study Notes', icon: BookOpen },
              { id: 'history', label: `My Results (${attempts.length})`, icon: BarChart3 },
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

          {/* 3-Stream Filter (SSC, Railway, WBPSC) */}
          {(activeTab === 'mocks' || activeTab === 'notes') && (
            <div className="flex flex-wrap items-center gap-2">
              {['ALL', 'SSC', 'Railway', 'WBPSC'].map(stream => (
                <button
                  key={stream}
                  onClick={() => setStreamFilter(stream)}
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

        {/* Search Bar for Mocks & Notes */}
        {(activeTab === 'mocks' || activeTab === 'notes') && (
          <div className="relative max-w-md mb-6">
            <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-3" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder={`Search ${activeTab === 'mocks' ? 'mock tests' : 'study notes'}...`}
              className="w-full pl-10 pr-4 py-2.5 rounded-xl bg-white border border-slate-200 text-sm focus:ring-2 focus:ring-indigo-500 outline-none"
            />
          </div>
        )}

        {/* TAB 1: CBT MOCK TESTS */}
        {activeTab === 'mocks' && (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
            {filteredMocks.map(mock => (
              <div key={mock.id} className="bg-white rounded-2xl border border-slate-200 p-5 shadow-sm hover:shadow-md transition flex flex-col justify-between">
                <div>
                  <div className="flex items-center justify-between gap-2 mb-3">
                    <span className={`text-xs font-extrabold px-2.5 py-1 rounded-md ${
                      mock.category === 'SSC' ? 'bg-indigo-50 text-indigo-700 border border-indigo-200' :
                      mock.category === 'Railway' ? 'bg-sky-50 text-sky-700 border border-sky-200' :
                      'bg-emerald-50 text-emerald-700 border border-emerald-200'
                    }`}>
                      {mock.category}
                    </span>
                    <span className="text-xs font-semibold text-slate-500 flex items-center gap-1">
                      <Clock className="w-3.5 h-3.5" /> {mock.durationMinutes} Mins
                    </span>
                  </div>

                  <h3 className="font-bold text-slate-900 text-base leading-snug mb-3">{mock.title}</h3>

                  <div className="grid grid-cols-3 gap-2 bg-slate-50 rounded-xl p-2.5 text-center border border-slate-100 mb-4">
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
                </div>

                <button
                  onClick={() => onStartMock(mock)}
                  className="w-full py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-sm transition flex items-center justify-center gap-2"
                >
                  <span>Attempt TCS iON Mock</span>
                  <ArrowRight className="w-4 h-4" />
                </button>
              </div>
            ))}
            {filteredMocks.length === 0 && (
              <div className="col-span-full text-center py-12 bg-white rounded-2xl border border-slate-200 text-slate-500 text-sm">
                No mock tests found for this filter.
              </div>
            )}
          </div>
        )}

        {/* TAB 2: STUDY NOTES */}
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

        {/* TAB 3: ATTEMPT HISTORY */}
        {activeTab === 'history' && (
          <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-sm">
            <div className="p-5 border-b border-slate-100">
              <h3 className="font-bold text-slate-900">Your Past Mock Attempts</h3>
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
                      <th className="px-5 py-3">Stream</th>
                      <th className="px-5 py-3">Score</th>
                      <th className="px-5 py-3">Accuracy</th>
                      <th className="px-5 py-3">Date</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {attempts.map(att => (
                      <tr key={att.id} className="hover:bg-slate-50">
                        <td className="px-5 py-3.5 font-semibold text-slate-900">{att.mockTitle}</td>
                        <td className="px-5 py-3.5">{att.category}</td>
                        <td className="px-5 py-3.5 font-bold text-indigo-600">{att.score} / {att.maxScore}</td>
                        <td className="px-5 py-3.5">{att.accuracy}%</td>
                        <td className="px-5 py-3.5 text-slate-500 text-xs">{new Date(att.submittedAt).toLocaleDateString()}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}

        {/* TAB 4: PROFILE & CHANGE PASSWORD */}
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
// COMPONENT 3: CHANGE PASSWORD WIDGET (SHARED BY STUDENT & ADMIN)
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
// COMPONENT 4: TCS iON CBT EXAM INSTRUCTIONS & LIVE ENGINE
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
          <p><strong>1. Duration & Marking:</strong> Total duration is <strong>{mock.durationMinutes} minutes</strong>. Each correct answer awards <strong>+{mock.positiveMark}</strong> marks, and each wrong answer deducts <strong>-{mock.negativeMark}</strong> marks.</p>
          <p><strong>2. Question Palette Legend:</strong></p>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 bg-slate-50 p-4 rounded-lg border border-slate-200 text-xs">
            <div className="flex items-center gap-3">
              <span className="w-7 h-7 rounded bg-slate-200 border border-slate-400 flex items-center justify-center font-bold">1</span>
              <span>You have NOT visited the question yet.</span>
            </div>
            <div className="flex items-center gap-3">
              <span className="w-7 h-7 rounded-t-xl bg-rose-600 text-white flex items-center justify-center font-bold">2</span>
              <span>You have NOT answered the question.</span>
            </div>
            <div className="flex items-center gap-3">
              <span className="w-7 h-7 rounded-b-xl bg-emerald-600 text-white flex items-center justify-center font-bold">3</span>
              <span>You have answered the question.</span>
            </div>
            <div className="flex items-center gap-3">
              <span className="w-7 h-7 rounded-full bg-purple-700 text-white flex items-center justify-center font-bold">4</span>
              <span>You have NOT answered, but marked for review.</span>
            </div>
            <div className="flex items-center gap-3 sm:col-span-2">
              <span className="w-7 h-7 rounded-full bg-purple-700 text-white flex items-center justify-center font-bold relative">
                5
                <span className="w-2.5 h-2.5 rounded-full bg-emerald-400 absolute -bottom-0.5 -right-0.5 border border-white"></span>
              </span>
              <span>Answered AND Marked for Review (will be considered for evaluation).</span>
            </div>
          </div>
          <p><strong>3. Specific Exam Note:</strong> {mock.instructions}</p>
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

  const [currentIdx, setCurrentIdx] = useState(0);
  const [answers, setAnswers] = useState({}); // { [qIndex]: optionIndex }
  const [statuses, setStatuses] = useState(() => {
    const init = {};
    questions.forEach((_, idx) => { init[idx] = idx === 0 ? 'not_answered' : 'not_visited'; });
    return init;
  });
  const [secondsLeft, setSecondsLeft] = useState(mock.durationMinutes * 60);
  const [showSubmitModal, setShowSubmitModal] = useState(false);

  const currentQ = questions[currentIdx];

  // Countdown Timer
  useEffect(() => {
    const timer = setInterval(() => {
      setSecondsLeft(prev => {
        if (prev <= 1) {
          clearInterval(timer);
          finalizeSubmission();
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
    return () => clearInterval(timer);
  }, []);

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
    setAnswers(prev => ({ ...prev, [currentIdx]: optIdx }));
  };

  const handleClearResponse = () => {
    setAnswers(prev => {
      const next = { ...prev };
      delete next[currentIdx];
      return next;
    });
    setStatuses(prev => ({ ...prev, [currentIdx]: 'not_answered' }));
  };

  const handleSaveAndNext = () => {
    const hasAns = answers[currentIdx] !== undefined;
    setStatuses(prev => ({
      ...prev,
      [currentIdx]: hasAns ? 'answered' : 'not_answered'
    }));
    if (currentIdx + 1 < questions.length) {
      navigateToQuestion(currentIdx + 1);
    }
  };

  const handleMarkForReviewAndNext = () => {
    const hasAns = answers[currentIdx] !== undefined;
    setStatuses(prev => ({
      ...prev,
      [currentIdx]: hasAns ? 'answered_marked' : 'marked'
    }));
    if (currentIdx + 1 < questions.length) {
      navigateToQuestion(currentIdx + 1);
    }
  };

  // Palette Counters
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

  const finalizeSubmission = () => {
    let correct = 0, wrong = 0, unattempted = 0;
    questions.forEach((q, idx) => {
      const chosen = answers[idx];
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

    onSubmitExam({
      id: `att-${Date.now()}`,
      studentId: student.id,
      studentName: student.name,
      mockId: mock.id,
      mockTitle: mock.title,
      category: mock.category,
      score,
      maxScore,
      correct,
      wrong,
      unattempted,
      accuracy,
      userAnswers: answers,
      submittedAt: new Date().toISOString()
    });
  };

  if (!currentQ) return null;

  return (
    <div className="h-screen flex flex-col bg-white select-none overflow-hidden">
      {/* Top Blue TCS iON Bar */}
      <div className="bg-[#2c5aa0] text-white px-4 py-2 flex items-center justify-between text-xs sm:text-sm shrink-0">
        <div className="font-bold truncate">{mock.title}</div>
        <div className="flex items-center gap-4">
          <span className="hidden md:inline text-blue-100">PATHSHALA CBT Engine</span>
          <button onClick={onExit} className="bg-blue-900/70 hover:bg-rose-600 px-2.5 py-1 rounded text-xs font-semibold">
            Exit Test
          </button>
        </div>
      </div>

      {/* Sub-header: Sections & Live Countdown Timer */}
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

        <div className="flex items-center gap-2 bg-white px-3 py-1 rounded border border-slate-300">
          <span className="text-xs font-bold text-slate-600">Time Left:</span>
          <span className={`font-mono font-extrabold text-sm ${secondsLeft < 300 ? 'text-rose-600 animate-pulse' : 'text-slate-900'}`}>
            {formatTime(secondsLeft)}
          </span>
        </div>
      </div>

      {/* Main Split Workspace */}
      <div className="flex-1 flex flex-col lg:flex-row overflow-hidden">
        {/* Left 75%: Question Display & Options */}
        <div className="lg:w-9/12 flex flex-col border-r border-slate-300 overflow-hidden">
          {/* Question Header */}
          <div className="px-5 py-2.5 bg-slate-50 border-b border-slate-200 flex items-center justify-between text-xs shrink-0">
            <span className="font-bold text-slate-800 text-sm">Question No. {currentIdx + 1}</span>
            <div className="flex items-center gap-3">
              <span className="text-emerald-700 font-bold">Marks: +{mock.positiveMark}</span>
              <span className="text-rose-600 font-bold">Negative: -{mock.negativeMark}</span>
            </div>
          </div>

          {/* Question Body */}
          <div className="flex-1 overflow-y-auto p-6 space-y-5">
            <div className="text-base text-slate-900 font-medium whitespace-pre-line leading-relaxed">
              {currentQ.text}
            </div>

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

          {/* Bottom TCS iON Action Bar */}
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

        {/* Right 25%: Candidate Profile, Status Legend & Question Palette */}
        <div className="lg:w-3/12 bg-[#e8f1f8] flex flex-col justify-between overflow-y-auto">
          <div>
            {/* Candidate Badge */}
            <div className="p-3 bg-white border-b border-slate-300 flex items-center gap-3">
              <div className="w-10 h-10 rounded bg-slate-200 border border-slate-300 flex items-center justify-center font-bold text-slate-700">
                {student.name.charAt(0)}
              </div>
              <div className="overflow-hidden">
                <div className="text-xs font-bold text-slate-900 truncate">{student.name}</div>
                <div className="text-[11px] font-mono text-slate-500">{student.id}</div>
              </div>
            </div>

            {/* 5-State TCS iON Counters */}
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
              <div className="flex items-center gap-2 col-span-2">
                <span className="w-6 h-6 rounded-full bg-purple-700 text-white font-bold flex items-center justify-center shrink-0 relative">
                  {counts.answeredMarked}
                  <span className="w-2 h-2 rounded-full bg-emerald-400 absolute -bottom-0.5 -right-0.5"></span>
                </span>
                <span>Answered & Marked for Review</span>
              </div>
            </div>

            {/* Section Palette Header */}
            <div className="bg-[#2c5aa0] text-white px-3 py-1.5 text-xs font-bold">
              Choose a Question
            </div>

            {/* Question Palette Grid */}
            <div className="p-3 grid grid-cols-5 gap-2">
              {questions.map((_, idx) => {
                const st = statuses[idx];
                const isCurrent = idx === currentIdx;
                let badgeStyle = 'bg-slate-200 border border-slate-400 text-slate-800 rounded';
                if (st === 'answered') badgeStyle = 'bg-emerald-600 text-white rounded-b-xl';
                if (st === 'not_answered') badgeStyle = 'bg-rose-600 text-white rounded-t-xl';
                if (st === 'marked') badgeStyle = 'bg-purple-700 text-white rounded-full';
                if (st === 'answered_marked') badgeStyle = 'bg-purple-700 text-white rounded-full';

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
                      <span className="w-2.5 h-2.5 rounded-full bg-emerald-400 absolute -bottom-0.5 -right-0.5 border border-white"></span>
                    )}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Submit Exam Button */}
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

      {/* Submission Confirmation Modal */}
      {showSubmitModal && (
        <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl">
            <h3 className="text-lg font-bold text-slate-900 mb-2">Exam Summary & Final Submission</h3>
            <p className="text-xs text-slate-500 mb-4">Are you sure you want to submit your test?</p>
            <div className="grid grid-cols-2 gap-2.5 bg-slate-50 p-4 rounded-xl border border-slate-200 text-xs mb-5">
              <div>Total Questions: <strong>{questions.length}</strong></div>
              <div>Answered: <strong className="text-emerald-600">{counts.answered + counts.answeredMarked}</strong></div>
              <div>Not Answered: <strong className="text-rose-600">{counts.notAnswered}</strong></div>
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
                onClick={finalizeSubmission}
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
// COMPONENT 5: SCORECARD & SOLUTION REVIEW SCREEN
// ============================================================================
function ExamScorecardScreen({ mock, attempt, onBackToDashboard }) {
  return (
    <div className="min-h-screen bg-slate-50 py-8 px-4">
      <div className="max-w-4xl mx-auto space-y-6">
        <div className="bg-white rounded-2xl border border-slate-200 p-6 sm:p-8 shadow-sm">
          <div className="flex flex-wrap items-center justify-between gap-4 border-b border-slate-100 pb-5 mb-6">
            <div>
              <span className="text-xs font-bold uppercase tracking-wider text-indigo-600">PATHSHALA Official Scorecard</span>
              <h2 className="text-2xl font-extrabold text-slate-900 mt-1">{mock.title}</h2>
            </div>
            <button
              onClick={onBackToDashboard}
              className="px-4 py-2 rounded-xl bg-slate-900 hover:bg-slate-800 text-white text-xs font-bold"
            >
              Back to Dashboard
            </button>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            <div className="bg-indigo-50 border border-indigo-100 rounded-xl p-4 text-center">
              <div className="text-xs text-indigo-600 font-semibold">Total Score</div>
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
            <div className="bg-amber-50 border border-amber-100 rounded-xl p-4 text-center">
              <div className="text-xs text-amber-700 font-semibold">Accuracy</div>
              <div className="text-2xl font-black text-amber-950 mt-1">{attempt.accuracy}%</div>
            </div>
          </div>
        </div>

        {/* Answer Key & Explanations */}
        <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-sm space-y-5">
          <h3 className="font-bold text-lg text-slate-900">Detailed Solutions & Answer Key</h3>
          {mock.questions.map((q, idx) => {
            const userChoice = attempt.userAnswers?.[idx];
            const isCorrect = userChoice === q.correctIndex;
            const isSkipped = userChoice === undefined;

            return (
              <div key={q.id} className="p-4 rounded-xl border border-slate-200 bg-slate-50/50 space-y-2.5">
                <div className="flex items-center justify-between text-xs">
                  <span className="font-bold text-slate-700">Q{idx + 1} • {q.section}</span>
                  <span className={`px-2.5 py-0.5 rounded-full font-bold ${
                    isSkipped ? 'bg-slate-200 text-slate-700' :
                    isCorrect ? 'bg-emerald-100 text-emerald-800' : 'bg-rose-100 text-rose-800'
                  }`}>
                    {isSkipped ? 'Unattempted' : isCorrect ? `Correct (+${mock.positiveMark})` : `Wrong (-${mock.negativeMark})`}
                  </span>
                </div>
                <p className="text-sm font-semibold text-slate-900 whitespace-pre-line">{q.text}</p>
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
// COMPONENT 6: STUDY NOTE READER & PRINTABLE CAPSULE
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
// COMPONENT 7: ADMIN CONTROL PANEL (MANAGE MOCKS, NOTES, STUDENTS, PASSWORD)
// ============================================================================
function AdminDashboard({
  admin, users, mocks, notes, attempts,
  onSaveMock, onDeleteMock, onSaveNote, onDeleteNote, onPreviewNote, onChangePassword, onLogout
}) {
  const [tab, setTab] = useState('mocks'); // 'mocks' | 'notes' | 'students' | 'password'
  const [editingMock, setEditingMock] = useState(null);
  const [editingNote, setEditingNote] = useState(null);

  const students = users.filter(u => u.role === 'student');

  const createNewMockTemplate = () => {
    setEditingMock({
      id: `mock-${Date.now()}`,
      title: '',
      category: 'SSC',
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
        {/* KPI Summary Cards */}
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
            <div className="text-xs text-slate-500 font-semibold">Mocks Attempted</div>
            <div className="text-2xl font-black text-emerald-600 mt-1">{attempts.length}</div>
          </div>
        </div>

        {/* Admin Tabs */}
        <div className="flex flex-wrap gap-2 bg-white p-1.5 rounded-xl border border-slate-200 shadow-sm w-fit mb-6">
          {[
            { id: 'mocks', label: 'Manage Mock Tests', icon: Clock },
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

        {/* ADMIN TAB 1: MOCK TESTS */}
        {tab === 'mocks' && !editingMock && (
          <div className="space-y-4">
            <div className="flex justify-between items-center">
              <h3 className="font-bold text-lg text-slate-900">Published Mock Tests</h3>
              <button
                onClick={createNewMockTemplate}
                className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold"
              >
                <Plus className="w-4 h-4" /> Create New Mock
              </button>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {mocks.map(m => (
                <div key={m.id} className="bg-white p-5 rounded-2xl border border-slate-200 flex items-center justify-between gap-4">
                  <div>
                    <span className="text-xs font-bold px-2 py-0.5 rounded bg-slate-100 text-slate-700">{m.category}</span>
                    <h4 className="font-bold text-slate-900 mt-1.5">{m.title}</h4>
                    <p className="text-xs text-slate-500 mt-1">{m.questions?.length || 0} Questions • {m.durationMinutes} mins</p>
                  </div>
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => setEditingMock(m)}
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

        {/* MOCK BUILDER EDITOR */}
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

        {/* ADMIN TAB 2: STUDY NOTES */}
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

        {/* STUDY NOTE EDITOR */}
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

        {/* ADMIN TAB 3: REGISTERED CANDIDATES */}
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
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {students.map(s => (
                    <tr key={s.id} className="hover:bg-slate-50">
                      <td className="px-5 py-3.5 font-mono font-bold text-indigo-600">{s.id}</td>
                      <td className="px-5 py-3.5 font-semibold text-slate-900">{s.name}</td>
                      <td className="px-5 py-3.5 text-slate-600">{s.email}</td>
                      <td className="px-5 py-3.5 text-slate-600">{s.phone}</td>
                      <td className="px-5 py-3.5 font-bold">{s.targetExam}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* ADMIN TAB 4: CHANGE ADMIN PASSWORD */}
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
  const [form, setForm] = useState(mock);

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
          section: 'General Awareness',
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

  return (
    <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-sm space-y-6">
      <div className="flex items-center justify-between border-b border-slate-100 pb-4">
        <h3 className="font-bold text-lg text-slate-900">Configure Mock Test</h3>
        <button onClick={onCancel} className="text-xs font-bold text-slate-500 hover:text-slate-800">Cancel</button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="md:col-span-2">
          <label className="block text-xs font-bold text-slate-700 mb-1">Mock Title *</label>
          <input
            type="text"
            value={form.title}
            onChange={(e) => setForm({ ...form, title: e.target.value })}
            placeholder="e.g. SSC CHSL Tier-I Mock #02"
            className="w-full px-3.5 py-2 rounded-xl border border-slate-300 text-sm"
          />
        </div>
        <div>
          <label className="block text-xs font-bold text-slate-700 mb-1">Stream</label>
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
        <div>
          <label className="block text-xs font-bold text-slate-700 mb-1">Duration (Mins)</label>
          <input
            type="number"
            value={form.durationMinutes}
            onChange={(e) => setForm({ ...form, durationMinutes: Number(e.target.value) })}
            className="w-full px-3.5 py-2 rounded-xl border border-slate-300 text-sm"
          />
        </div>
      </div>

      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h4 className="font-bold text-sm text-slate-800">Questions ({form.questions.length})</h4>
          <button
            type="button"
            onClick={addQuestion}
            className="px-3 py-1.5 rounded-lg bg-slate-900 text-white text-xs font-bold flex items-center gap-1"
          >
            <Plus className="w-3.5 h-3.5" /> Add Question
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