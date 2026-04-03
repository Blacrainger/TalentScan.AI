import React, { useState, useRef, useEffect } from 'react';
import { Upload, FileText, Search, CheckCircle, AlertCircle, Loader2, ChevronDown, ChevronUp, Sparkles, History, LogIn, LogOut, Trash2, Clock, X } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { auth, loginWithGoogle, logout, db, handleFirestoreError, OperationType } from './firebase';
import { onAuthStateChanged, User } from 'firebase/auth';
import { collection, query, where, orderBy, onSnapshot, addDoc, Timestamp, deleteDoc, doc } from 'firebase/firestore';

interface ScreeningResult {
  fileName: string;
  score: number;
  aiData?: {
    summary: string;
    explanation: string;
    skills: string[];
  };
}

interface ScreeningSession {
  id: string;
  jdText: string;
  timestamp: any;
  results: ScreeningResult[];
  uid: string;
}

export default function App() {
  const [jdText, setJdText] = useState('');
  const [files, setFiles] = useState<File[]>([]);
  const [isScreening, setIsScreening] = useState(false);
  const [results, setResults] = useState<ScreeningResult[]>([]);
  const [useAi, setUseAi] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [expandedResult, setExpandedResult] = useState<string | null>(null);

  // Navigation State
  const [showSplash, setShowSplash] = useState(true);

  // Firebase State
  const [user, setUser] = useState<User | null>(null);
  const [isAuthReady, setIsAuthReady] = useState(false);
  const [sessions, setSessions] = useState<ScreeningSession[]>([]);
  const [isHistoryOpen, setIsHistoryOpen] = useState(false);

  const fileInputRef = useRef<HTMLInputElement>(null);

  // Splash Screen Timer
  useEffect(() => {
    const timer = setTimeout(() => {
      setShowSplash(false);
    }, 5000);
    return () => clearTimeout(timer);
  }, []);

  // Auth Listener
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
      setUser(currentUser);
      setIsAuthReady(true);
    });
    return () => unsubscribe();
  }, []);

  // Sessions Listener
  useEffect(() => {
    if (!user) {
      setSessions([]);
      return;
    }

    const q = query(
      collection(db, 'sessions'),
      where('uid', '==', user.uid),
      orderBy('timestamp', 'desc')
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const sessionData = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      })) as ScreeningSession[];
      setSessions(sessionData);
    }, (err) => {
      handleFirestoreError(err, OperationType.LIST, 'sessions');
    });

    return () => unsubscribe();
  }, [user]);

  const handleLogin = async () => {
    try {
      await loginWithGoogle();
    } catch (err: any) {
      setError('Login failed: ' + err.message);
    }
  };

  const handleLogout = async () => {
    try {
      await logout();
      setResults([]);
      setJdText('');
      setFiles([]);
    } catch (err: any) {
      setError('Logout failed: ' + err.message);
    }
  };

  const saveSession = async (currentResults: ScreeningResult[], currentJd: string) => {
    if (!user) return;

    try {
      await addDoc(collection(db, 'sessions'), {
        uid: user.uid,
        jdText: currentJd,
        results: currentResults,
        timestamp: Timestamp.now()
      });
    } catch (err: any) {
      handleFirestoreError(err, OperationType.CREATE, 'sessions');
    }
  };

  const deleteSession = async (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    try {
      await deleteDoc(doc(db, 'sessions', id));
    } catch (err: any) {
      handleFirestoreError(err, OperationType.DELETE, 'sessions');
    }
  };

  const loadSession = (session: ScreeningSession) => {
    setJdText(session.jdText);
    setResults(session.results);
    setFiles([]); // Clear current files as we are viewing history
    setIsHistoryOpen(false);
    setError(null);
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      setFiles(Array.from(e.target.files));
    }
  };

  const handleScreen = async () => {
    if (!jdText.trim()) {
      setError('Please provide a job description.');
      return;
    }
    if (files.length === 0) {
      setError('Please upload at least one CV.');
      return;
    }

    setIsScreening(true);
    setError(null);
    setResults([]);

    const formData = new FormData();
    formData.append('jdText', jdText);
    formData.append('useAi', String(useAi));
    files.forEach(file => formData.append('cvs', file));

    try {
      const response = await fetch('/api/screen', {
        method: 'POST',
        body: formData,
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || 'Screening failed');
      }

      const data = await response.json();
      setResults(data.results);
      
      // Save to history if logged in
      if (user) {
        saveSession(data.results, jdText);
      }
    } catch (err: any) {
      setError(err.message || 'An error occurred during screening.');
    } finally {
      setIsScreening(false);
    }
  };

  if (showSplash) {
    return (
      <div className="fixed inset-0 bg-[#020617] flex flex-col items-center justify-center z-[100]">
        <motion.div 
          initial={{ scale: 0.9, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ duration: 0.8, ease: "easeOut" }}
          className="flex flex-col items-center gap-8"
        >
          <div className="relative">
            <motion.div 
              animate={{ rotate: 360 }}
              transition={{ duration: 20, repeat: Infinity, ease: "linear" }}
              className="absolute -inset-4 bg-gradient-to-tr from-blue-600/20 to-purple-600/20 rounded-full blur-2xl"
            />
            <div className="bg-slate-900 p-6 rounded-[2.5rem] shadow-2xl shadow-blue-500/10 border border-slate-800 relative z-10 w-32 h-32 flex items-center justify-center">
              <Search className="w-16 h-16 text-blue-400" />
            </div>
          </div>
          <div className="text-center space-y-2">
            <h1 className="text-5xl font-black text-white tracking-tighter">
              Talent<span className="text-blue-500">Scan</span>
            </h1>
            <p className="text-slate-400 font-semibold uppercase tracking-[0.3em] text-[10px]">Academic HR Intelligence</p>
          </div>
          <div className="flex items-center gap-3 bg-slate-900/50 px-4 py-2 rounded-full border border-slate-800/50">
            <Loader2 className="w-4 h-4 text-blue-500 animate-spin" />
            <span className="text-xs font-medium text-slate-500">Initializing System...</span>
          </div>
        </motion.div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#020617] text-slate-200 font-sans selection:bg-blue-500/30">
      {/* Header */}
      <header className="bg-[#020617]/80 backdrop-blur-xl border-b border-slate-800/50 py-4 px-8 flex justify-between items-center sticky top-0 z-40">
        <div className="flex items-center gap-4">
          <div className="bg-blue-600/10 p-2 rounded-xl border border-blue-500/20">
            <Search className="w-6 h-6 text-blue-500" />
          </div>
          <div>
            <h1 className="text-xl font-black tracking-tighter text-white leading-none">Talent<span className="text-blue-500">Scan</span></h1>
            <span className="text-[9px] font-bold text-slate-500 uppercase tracking-widest">HR Intelligence</span>
          </div>
        </div>
        <div className="flex items-center gap-4">
          {user ? (
            <div className="flex items-center gap-4">
              <button 
                onClick={() => setIsHistoryOpen(true)}
                className="flex items-center gap-2 text-sm font-semibold text-slate-400 hover:text-blue-400 transition-colors"
              >
                <History className="w-4 h-4" />
                History
              </button>
              <div className="h-6 w-px bg-slate-800" />
              <div className="flex items-center gap-3">
                <img src={user.photoURL || ''} alt={user.displayName || ''} className="w-8 h-8 rounded-full border border-slate-700" referrerPolicy="no-referrer" />
                <button 
                  onClick={handleLogout}
                  className="text-xs font-bold text-slate-500 hover:text-red-400 uppercase tracking-widest transition-colors"
                >
                  Sign Out
                </button>
              </div>
            </div>
          ) : (
            <button 
              onClick={handleLogin}
              className="flex items-center gap-2 bg-blue-600 text-white px-4 py-2 rounded-lg text-sm font-bold hover:bg-blue-500 transition-all shadow-lg shadow-blue-900/20"
            >
              <LogIn className="w-4 h-4" />
              Sign In
            </button>
          )}

          <div className="h-6 w-px bg-slate-800" />

          <label className="flex items-center gap-2 cursor-pointer select-none">
            <div className={`relative w-12 h-6 rounded-full transition-colors duration-200 ${useAi ? 'bg-blue-600' : 'bg-slate-700'}`}>
              <input 
                type="checkbox" 
                className="sr-only" 
                checked={useAi} 
                onChange={() => setUseAi(!useAi)} 
              />
              <motion.div 
                animate={{ x: useAi ? 24 : 2 }}
                className="absolute top-1 left-0 w-4 h-4 bg-white rounded-full shadow-sm"
              />
            </div>
            <span className="text-sm font-medium flex items-center gap-1 text-slate-300">
              <Sparkles className={`w-4 h-4 ${useAi ? 'text-blue-400' : 'text-slate-500'}`} />
              AI Enhancements
            </span>
          </label>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-8 py-12 grid grid-cols-1 lg:grid-cols-12 gap-12">
        {/* Left Column: Input */}
        <div className="lg:col-span-5 space-y-10">
          <section className="bg-slate-900/50 p-8 rounded-[2rem] shadow-2xl border border-slate-800/50 backdrop-blur-sm">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-lg font-bold flex items-center gap-3 text-white">
                <div className="p-2 bg-blue-500/10 rounded-lg">
                  <Search className="w-5 h-5 text-blue-500" />
                </div>
                Job Description
              </h2>
              <span className="text-[10px] font-bold text-slate-600 uppercase tracking-widest">Required</span>
            </div>
            <textarea
              className="w-full h-64 p-5 bg-slate-950/50 border border-slate-800 rounded-2xl focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500/50 transition-all resize-none text-sm leading-relaxed text-slate-300 placeholder:text-slate-700 custom-scrollbar"
              placeholder="Paste the job description here to begin the semantic matching process..."
              value={jdText}
              onChange={(e) => setJdText(e.target.value)}
            />
          </section>

          <section className="bg-slate-900/50 p-8 rounded-[2rem] shadow-2xl border border-slate-800/50 backdrop-blur-sm">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-lg font-bold flex items-center gap-3 text-white">
                <div className="p-2 bg-blue-500/10 rounded-lg">
                  <Upload className="w-5 h-5 text-blue-500" />
                </div>
                Candidate CVs
              </h2>
              <span className="text-[10px] font-bold text-slate-600 uppercase tracking-widest">{files.length} Files</span>
            </div>
            
            <div 
              onClick={() => fileInputRef.current?.click()}
              className="relative group cursor-pointer"
            >
              <div className="absolute -inset-1 bg-gradient-to-r from-blue-600/20 to-purple-600/20 rounded-2xl blur opacity-25 group-hover:opacity-50 transition duration-1000 group-hover:duration-200"></div>
              <div className="relative border-2 border-dashed border-slate-800 rounded-2xl p-10 text-center bg-slate-950/30 hover:bg-slate-950/50 hover:border-blue-500/30 transition-all">
                <input 
                  type="file" 
                  multiple 
                  accept=".pdf,.docx,.zip" 
                  className="hidden" 
                  ref={fileInputRef}
                  onChange={handleFileChange}
                />
                <div className="w-16 h-16 bg-slate-900 rounded-2xl flex items-center justify-center mx-auto mb-4 border border-slate-800 group-hover:scale-110 transition-transform">
                  <Upload className="w-8 h-8 text-slate-500 group-hover:text-blue-500 transition-colors" />
                </div>
                <p className="text-sm font-bold text-slate-300">Drop CVs here or click to browse</p>
                <p className="text-[10px] text-slate-600 mt-2 font-bold uppercase tracking-widest">Supports PDF, DOCX, ZIP</p>
              </div>
            </div>

            {files.length > 0 && (
              <div className="mt-8 space-y-3">
                <div className="flex items-center justify-between px-1">
                  <p className="text-[10px] font-black text-slate-600 uppercase tracking-[0.2em]">Queue</p>
                  <button onClick={() => setFiles([])} className="text-[10px] font-bold text-red-500/50 hover:text-red-500 transition-colors uppercase tracking-widest">Clear All</button>
                </div>
                <div className="max-h-52 overflow-y-auto space-y-2 pr-2 custom-scrollbar">
                  {files.map((file, idx) => (
                    <motion.div 
                      initial={{ opacity: 0, x: -10 }}
                      animate={{ opacity: 1, x: 0 }}
                      key={idx} 
                      className="flex items-center justify-between bg-slate-950/50 p-3 rounded-xl border border-slate-800/50 group"
                    >
                      <div className="flex items-center gap-3">
                        <div className="p-1.5 bg-slate-900 rounded-lg border border-slate-800">
                          <FileText className="w-3.5 h-3.5 text-slate-500" />
                        </div>
                        <span className="text-xs font-bold truncate max-w-[180px] text-slate-400 group-hover:text-slate-200 transition-colors">{file.name}</span>
                      </div>
                      <CheckCircle className="w-4 h-4 text-emerald-500/50" />
                    </motion.div>
                  ))}
                </div>
              </div>
            )}
          </section>

          <button
            onClick={handleScreen}
            disabled={isScreening}
            className={`w-full py-5 rounded-2xl font-black text-sm uppercase tracking-[0.2em] shadow-2xl transition-all flex items-center justify-center gap-3 relative overflow-hidden group ${
              isScreening 
                ? 'bg-slate-800 cursor-not-allowed text-slate-500' 
                : 'bg-blue-600 text-white hover:bg-blue-500 active:scale-[0.98] hover:shadow-blue-500/20'
            }`}
          >
            {!isScreening && (
              <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/10 to-transparent -translate-x-full group-hover:animate-shimmer" />
            )}
            {isScreening ? (
              <>
                <Loader2 className="w-5 h-5 animate-spin" />
                Processing...
              </>
            ) : (
              <>
                <Sparkles className="w-5 h-5" />
                Analyze Candidates
              </>
            )}
          </button>

          {error && (
            <motion.div 
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              className="bg-red-500/5 border border-red-500/20 text-red-400 p-5 rounded-2xl flex items-start gap-4"
            >
              <div className="p-2 bg-red-500/10 rounded-lg">
                <AlertCircle className="w-5 h-5 shrink-0" />
              </div>
              <div>
                <p className="text-[10px] font-black uppercase tracking-widest mb-1">System Error</p>
                <p className="text-sm font-medium leading-relaxed">{error}</p>
              </div>
            </motion.div>
          )}
        </div>

        {/* Right Column: Results */}
        <div className="lg:col-span-7">
          <div className="bg-slate-900/50 rounded-[2.5rem] shadow-2xl border border-slate-800/50 min-h-[700px] flex flex-col backdrop-blur-sm overflow-hidden">
            <div className="p-8 border-b border-slate-800/50 flex justify-between items-center bg-slate-900/30">
              <div>
                <h2 className="text-2xl font-black text-white tracking-tighter">Ranking Results</h2>
                <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mt-1">Semantic Match Analysis</p>
              </div>
              {results.length > 0 && (
                <div className="flex flex-col items-end">
                  <span className="bg-blue-500/10 text-blue-500 text-[10px] font-black px-4 py-1.5 rounded-full uppercase border border-blue-500/20 tracking-widest">
                    {results.length} Candidates
                  </span>
                </div>
              )}
            </div>

            <div className="flex-1 p-8 overflow-y-auto custom-scrollbar">
              {results.length === 0 && !isScreening && (
                <div className="h-full flex flex-col items-center justify-center text-center">
                  <div className="w-24 h-24 bg-slate-950/50 rounded-[2rem] flex items-center justify-center mb-6 border border-slate-800/50">
                    <FileText className="w-10 h-10 text-slate-700" />
                  </div>
                  <p className="text-xl font-bold text-slate-400">Awaiting Input</p>
                  <p className="text-sm text-slate-600 mt-2 max-w-xs mx-auto">Upload CVs and provide a job description to generate rankings</p>
                </div>
              )}

              {isScreening && (
                <div className="h-full flex flex-col items-center justify-center text-center">
                  <div className="relative mb-8">
                    <motion.div 
                      animate={{ rotate: 360 }}
                      transition={{ duration: 3, repeat: Infinity, ease: "linear" }}
                      className="w-20 h-20 border-4 border-blue-500/20 border-t-blue-500 rounded-full"
                    />
                    <Search className="w-8 h-8 text-blue-500 absolute inset-0 m-auto animate-pulse" />
                  </div>
                  <p className="text-xl font-bold text-white">Analyzing Talent Pool</p>
                  <p className="text-sm text-slate-500 mt-2">Extracting features and computing similarity scores...</p>
                </div>
              )}

              <div className="space-y-6">
                <AnimatePresence mode="popLayout">
                  {results.map((result, idx) => (
                    <motion.div
                      key={result.fileName}
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, scale: 0.95 }}
                      transition={{ delay: idx * 0.05 }}
                      className={`group border rounded-3xl overflow-hidden transition-all duration-300 ${
                        expandedResult === result.fileName 
                          ? 'border-blue-500/50 bg-blue-500/5 shadow-2xl shadow-blue-500/10' 
                          : 'border-slate-800 bg-slate-950/30 hover:border-slate-700 hover:bg-slate-950/50'
                      }`}
                    >
                      <div 
                        className="p-6 flex items-center justify-between cursor-pointer"
                        onClick={() => setExpandedResult(expandedResult === result.fileName ? null : result.fileName)}
                      >
                        <div className="flex items-center gap-6">
                          <div className={`w-14 h-14 rounded-2xl flex items-center justify-center font-black text-xl border transition-all ${
                            idx === 0 
                              ? 'bg-blue-600 text-white border-blue-500 shadow-lg shadow-blue-500/20' 
                              : 'bg-slate-900 text-slate-500 border-slate-800 group-hover:border-slate-700'
                          }`}>
                            {idx + 1}
                          </div>
                          <div>
                            <p className="text-lg font-bold text-white truncate max-w-[300px] group-hover:text-blue-400 transition-colors">{result.fileName}</p>
                            <div className="flex items-center gap-2 mt-1">
                              <span className="text-[10px] font-black text-slate-600 uppercase tracking-widest">Candidate</span>
                              {idx === 0 && <span className="bg-emerald-500/10 text-emerald-500 text-[8px] font-black px-2 py-0.5 rounded uppercase tracking-widest border border-emerald-500/20">Top Match</span>}
                            </div>
                          </div>
                        </div>
                        <div className="flex items-center gap-8">
                          <div className="text-right">
                            <p className={`text-3xl font-black tracking-tighter ${idx === 0 ? 'text-blue-400' : 'text-slate-300'}`}>
                              {(result.score * 100).toFixed(1)}<span className="text-sm ml-0.5 opacity-50">%</span>
                            </p>
                            <p className="text-[9px] text-slate-600 uppercase font-black tracking-[0.2em]">Match Score</p>
                          </div>
                          <div className={`p-2 rounded-full transition-colors ${expandedResult === result.fileName ? 'bg-blue-500/20 text-blue-400' : 'bg-slate-900 text-slate-600 group-hover:text-slate-400'}`}>
                            {expandedResult === result.fileName ? <ChevronUp className="w-5 h-5" /> : <ChevronDown className="w-5 h-5" />}
                          </div>
                        </div>
                      </div>

                      <AnimatePresence>
                        {expandedResult === result.fileName && (
                          <motion.div
                            initial={{ height: 0, opacity: 0 }}
                            animate={{ height: 'auto', opacity: 1 }}
                            exit={{ height: 0, opacity: 0 }}
                            className="bg-slate-950/50 border-t border-slate-800/50"
                          >
                            <div className="p-8 space-y-8">
                              {result.aiData ? (
                                <>
                                  <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                                    <div className="space-y-3">
                                      <h4 className="text-[10px] font-black text-blue-500 uppercase tracking-[0.2em] flex items-center gap-2">
                                        <Sparkles className="w-3 h-3" />
                                        Executive Summary
                                      </h4>
                                      <p className="text-sm text-slate-300 leading-relaxed font-medium">
                                        {result.aiData.summary}
                                      </p>
                                    </div>

                                    <div className="space-y-3">
                                      <h4 className="text-[10px] font-black text-blue-500 uppercase tracking-[0.2em]">Core Competencies</h4>
                                      <div className="flex flex-wrap gap-2">
                                        {result.aiData.skills.map((skill, sIdx) => (
                                          <span key={sIdx} className="bg-slate-900 text-slate-300 text-[10px] font-bold px-3 py-1.5 rounded-lg border border-slate-800 hover:border-blue-500/30 transition-colors">
                                            {skill}
                                          </span>
                                        ))}
                                      </div>
                                    </div>
                                  </div>

                                  <div className="space-y-3 pt-4 border-t border-slate-800/50">
                                    <h4 className="text-[10px] font-black text-blue-500 uppercase tracking-[0.2em]">Detailed Rationale</h4>
                                    <p className="text-sm text-slate-400 leading-relaxed">
                                      {result.aiData.explanation}
                                    </p>
                                  </div>
                                </>
                              ) : (
                                <div className="text-center py-10 bg-slate-900/30 rounded-2xl border border-dashed border-slate-800">
                                  <Sparkles className="w-8 h-8 text-slate-700 mx-auto mb-3" />
                                  <p className="text-sm font-bold text-slate-500">AI Analysis Unavailable</p>
                                  <p className="text-xs text-slate-600 mt-1">Enable AI Enhancements and re-run screening for deep insights</p>
                                </div>
                              )}
                            </div>
                          </motion.div>
                        )}
                      </AnimatePresence>
                    </motion.div>
                  ))}
                </AnimatePresence>
              </div>
            </div>
          </div>
        </div>
      </main>

      {/* History Sidebar/Modal */}
      <AnimatePresence>
        {isHistoryOpen && (
          <>
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsHistoryOpen(false)}
              className="fixed inset-0 bg-black/60 backdrop-blur-sm z-40"
            />
            <motion.div 
              initial={{ x: '100%' }}
              animate={{ x: 0 }}
              exit={{ x: '100%' }}
              transition={{ type: 'spring', damping: 25, stiffness: 200 }}
              className="fixed right-0 top-0 bottom-0 w-full max-w-md bg-[#1E293B] shadow-2xl z-50 flex flex-col border-l border-slate-800"
            >
              <div className="p-6 border-b border-slate-800 flex justify-between items-center">
                <div className="flex items-center gap-2">
                  <History className="w-5 h-5 text-blue-400" />
                  <h2 className="text-xl font-bold text-white">Screening History</h2>
                </div>
                <button onClick={() => setIsHistoryOpen(false)} className="p-2 hover:bg-slate-800 rounded-full transition-colors">
                  <X className="w-5 h-5 text-slate-500" />
                </button>
              </div>

              <div className="flex-1 overflow-y-auto p-8 space-y-6 custom-scrollbar">
                {sessions.length === 0 ? (
                   <div className="h-full flex flex-col items-center justify-center text-center">
                    <div className="w-20 h-20 bg-slate-950/50 rounded-[1.5rem] flex items-center justify-center mb-6 border border-slate-800/50">
                      <Clock className="w-8 h-8 text-slate-700" />
                    </div>
                    <p className="font-bold text-slate-400">No history found</p>
                    <p className="text-sm text-slate-600 mt-2 max-w-[200px] mx-auto">Your screening sessions will appear here once you start analyzing CVs</p>
                  </div>
                ) : (
                  sessions.map((session) => (
                    <motion.div 
                      key={session.id}
                      initial={{ opacity: 0, x: 20 }}
                      animate={{ opacity: 1, x: 0 }}
                      onClick={() => loadSession(session)}
                      className="group p-5 border border-slate-800 rounded-2xl hover:border-blue-500/30 hover:bg-blue-500/5 transition-all cursor-pointer relative bg-slate-950/20"
                    >
                      <div className="flex justify-between items-start mb-3">
                        <div className="flex items-center gap-2">
                          <div className="w-2 h-2 bg-blue-500 rounded-full animate-pulse" />
                          <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest">
                            {session.timestamp?.toDate().toLocaleDateString() || 'Unknown Date'}
                          </p>
                        </div>
                        <button 
                          onClick={(e) => deleteSession(session.id, e)}
                          className="p-2 text-slate-600 hover:text-red-400 hover:bg-red-400/10 rounded-xl transition-all opacity-0 group-hover:opacity-100"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                      <p className="text-sm font-bold text-slate-300 line-clamp-2 mb-4 leading-relaxed group-hover:text-white transition-colors">
                        {session.jdText}
                      </p>
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <span className="bg-blue-500/10 text-blue-500 text-[9px] font-black px-2.5 py-1 rounded-lg uppercase border border-blue-500/20 tracking-widest">
                            {session.results.length} Candidates
                          </span>
                        </div>
                        <span className="text-[10px] text-slate-600 font-bold uppercase tracking-widest">
                          Top: {(Math.max(...session.results.map(r => r.score)) * 100).toFixed(0)}%
                        </span>
                      </div>
                    </motion.div>
                  ))
                )}
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </div>
  );
}
