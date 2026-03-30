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
  const [showLanding, setShowLanding] = useState(true);

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
      setShowLanding(false); // Go to app after login
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
      setShowLanding(true); // Return to landing on logout
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
    setShowLanding(false); // Ensure we are in the app view
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
      <div className="fixed inset-0 bg-white flex flex-col items-center justify-center z-[100]">
        <motion.div 
          initial={{ scale: 0.8, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ duration: 0.5 }}
          className="flex flex-col items-center gap-6"
        >
          <div className="bg-blue-600 p-6 rounded-3xl shadow-2xl shadow-blue-200">
            <FileText className="text-white w-20 h-20" />
          </div>
          <div className="text-center">
            <h1 className="text-4xl font-black text-gray-900 tracking-tighter">
              Talent<span className="text-blue-600">Scan</span>
            </h1>
            <p className="text-gray-400 font-medium mt-2 uppercase tracking-widest text-xs">Academic HR Intelligence</p>
          </div>
          <div className="mt-8">
            <Loader2 className="w-8 h-8 text-blue-600 animate-spin" />
          </div>
        </motion.div>
      </div>
    );
  }

  if (showLanding && !user) {
    return (
      <div className="relative min-h-screen flex flex-col items-center justify-center overflow-hidden">
        {/* Background Image */}
        <div className="absolute inset-0 z-0">
          <img 
            src="https://picsum.photos/seed/recruitment/1920/1080" 
            alt="TalentScan Background" 
            className="w-full h-full object-cover"
            referrerPolicy="no-referrer"
          />
          <div className="absolute inset-0 bg-blue-900/80 backdrop-blur-[2px]" />
        </div>

        <motion.div 
          initial={{ y: 20, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          className="relative z-10 text-center px-6 max-w-4xl"
        >
          <div className="bg-white/10 backdrop-blur-md p-4 rounded-2xl inline-block mb-8 border border-white/20">
            <FileText className="text-white w-12 h-12" />
          </div>
          <h1 className="text-5xl md:text-8xl font-black text-white tracking-tighter mb-6">
            Talent<span className="text-blue-400">Scan</span>
          </h1>
          <p className="text-lg md:text-2xl text-blue-100 font-medium mb-12 leading-relaxed max-w-2xl mx-auto">
            The next generation of academic recruitment. Automated CV screening, semantic ranking, and AI-powered candidate analysis.
          </p>
          
          <div className="flex flex-col sm:flex-row items-center justify-center gap-4 w-full max-w-sm sm:max-w-none mx-auto">
            <button 
              onClick={handleLogin}
              className="w-full sm:w-auto px-6 py-4 sm:px-10 sm:py-5 bg-white text-blue-900 rounded-2xl font-black text-base sm:text-lg shadow-2xl hover:bg-blue-50 transition-all active:scale-95 flex items-center justify-center gap-3"
            >
              <LogIn className="w-5 h-5 sm:w-6 h-6" />
              Sign In with Google
            </button>
            <button 
              onClick={() => setShowLanding(false)}
              className="w-full sm:w-auto px-6 py-4 sm:px-10 sm:py-5 bg-blue-600/20 backdrop-blur-md text-white border-2 border-white/30 rounded-2xl font-black text-base sm:text-lg hover:bg-white/10 transition-all active:scale-95"
            >
              Get Started
            </button>
          </div>
          
          <p className="mt-8 text-blue-200/60 text-sm font-medium uppercase tracking-widest">
            Trusted by Academic Institutions Worldwide
          </p>
        </motion.div>

        {/* Decorative Elements */}
        <div className="absolute bottom-10 left-10 text-white/20 font-black text-9xl select-none pointer-events-none">HR</div>
        <div className="absolute top-10 right-10 text-white/20 font-black text-9xl select-none pointer-events-none">AI</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#F8F9FA] text-[#212529] font-sans">
      {/* Header */}
      <header className="bg-white border-b border-gray-200 py-6 px-8 flex justify-between items-center sticky top-0 z-10">
        <div className="flex items-center gap-3">
          <div className="bg-blue-600 p-2 rounded-lg">
            <FileText className="text-white w-6 h-6" />
          </div>
          <h1 className="text-2xl font-bold tracking-tight text-gray-900">Talent<span className="text-blue-600">Scan</span></h1>
        </div>
        <div className="flex items-center gap-4">
          {user ? (
            <div className="flex items-center gap-4">
              <button 
                onClick={() => setIsHistoryOpen(true)}
                className="flex items-center gap-2 text-sm font-semibold text-gray-600 hover:text-blue-600 transition-colors"
              >
                <History className="w-4 h-4" />
                History
              </button>
              <div className="h-6 w-px bg-gray-200" />
              <div className="flex items-center gap-3">
                <img src={user.photoURL || ''} alt={user.displayName || ''} className="w-8 h-8 rounded-full border border-gray-200" referrerPolicy="no-referrer" />
                <button 
                  onClick={handleLogout}
                  className="text-xs font-bold text-gray-400 hover:text-red-500 uppercase tracking-widest transition-colors"
                >
                  Sign Out
                </button>
              </div>
            </div>
          ) : (
            <button 
              onClick={handleLogin}
              className="flex items-center gap-2 bg-blue-600 text-white px-4 py-2 rounded-lg text-sm font-bold hover:bg-blue-700 transition-all shadow-sm"
            >
              <LogIn className="w-4 h-4" />
              Sign In
            </button>
          )}

          <div className="h-6 w-px bg-gray-200" />

          <label className="flex items-center gap-2 cursor-pointer select-none">
            <div className={`relative w-12 h-6 rounded-full transition-colors duration-200 ${useAi ? 'bg-blue-600' : 'bg-gray-300'}`}>
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
            <span className="text-sm font-medium flex items-center gap-1">
              <Sparkles className={`w-4 h-4 ${useAi ? 'text-blue-600' : 'text-gray-400'}`} />
              AI Enhancements
            </span>
          </label>
        </div>
      </header>

      <main className="max-w-6xl mx-auto px-8 py-10 grid grid-cols-1 lg:grid-cols-12 gap-10">
        {/* Left Column: Input */}
        <div className="lg:col-span-5 space-y-8">
          <section className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100">
            <h2 className="text-lg font-semibold mb-4 flex items-center gap-2">
              <Search className="w-5 h-5 text-blue-600" />
              Job Description
            </h2>
            <textarea
              className="w-full h-48 p-4 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all resize-none text-sm leading-relaxed"
              placeholder="Paste the job description here..."
              value={jdText}
              onChange={(e) => setJdText(e.target.value)}
            />
          </section>

          <section className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100">
            <h2 className="text-lg font-semibold mb-4 flex items-center gap-2">
              <Upload className="w-5 h-5 text-blue-600" />
              Upload CVs
            </h2>
            <div 
              onClick={() => fileInputRef.current?.click()}
              className="border-2 border-dashed border-gray-200 rounded-xl p-8 text-center cursor-pointer hover:border-blue-400 hover:bg-blue-50 transition-all group"
            >
              <input 
                type="file" 
                multiple 
                accept=".pdf,.docx,.zip" 
                className="hidden" 
                ref={fileInputRef}
                onChange={handleFileChange}
              />
              <Upload className="w-10 h-10 text-gray-400 mx-auto mb-3 group-hover:text-blue-500 transition-colors" />
              <p className="text-sm font-medium text-gray-600">Click to upload or drag and drop</p>
              <p className="text-xs text-gray-400 mt-1">PDF, DOCX, or ZIP files</p>
            </div>

            {files.length > 0 && (
              <div className="mt-4 space-y-2">
                <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Selected Files ({files.length})</p>
                <div className="max-h-40 overflow-y-auto space-y-2 pr-2">
                  {files.map((file, idx) => (
                    <div key={idx} className="flex items-center justify-between bg-gray-50 p-2 rounded-lg border border-gray-100">
                      <span className="text-xs font-medium truncate max-w-[200px]">{file.name}</span>
                      <CheckCircle className="w-4 h-4 text-green-500" />
                    </div>
                  ))}
                </div>
              </div>
            )}
          </section>

          <button
            onClick={handleScreen}
            disabled={isScreening}
            className={`w-full py-4 rounded-xl font-bold text-white shadow-lg transition-all flex items-center justify-center gap-2 ${
              isScreening ? 'bg-gray-400 cursor-not-allowed' : 'bg-blue-600 hover:bg-blue-700 active:scale-[0.98]'
            }`}
          >
            {isScreening ? (
              <>
                <Loader2 className="w-5 h-5 animate-spin" />
                Screening Candidates...
              </>
            ) : (
              <>
                <Search className="w-5 h-5" />
                Start Screening
              </>
            )}
          </button>

          {error && (
            <motion.div 
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              className="bg-red-50 border border-red-100 text-red-600 p-4 rounded-xl flex items-start gap-3"
            >
              <AlertCircle className="w-5 h-5 shrink-0 mt-0.5" />
              <p className="text-sm font-medium">{error}</p>
            </motion.div>
          )}
        </div>

        {/* Right Column: Results */}
        <div className="lg:col-span-7">
          <div className="bg-white rounded-2xl shadow-sm border border-gray-100 min-h-[600px] flex flex-col">
            <div className="p-6 border-b border-gray-100 flex justify-between items-center">
              <h2 className="text-xl font-bold text-gray-900">Ranking Results</h2>
              {results.length > 0 && (
                <span className="bg-blue-100 text-blue-700 text-xs font-bold px-3 py-1 rounded-full uppercase">
                  {results.length} Candidates
                </span>
              )}
            </div>

            <div className="flex-1 p-6">
              {results.length === 0 && !isScreening && (
                <div className="h-full flex flex-col items-center justify-center text-center opacity-40">
                  <FileText className="w-16 h-16 mb-4" />
                  <p className="text-lg font-medium">No results to display yet</p>
                  <p className="text-sm">Upload CVs and start screening to see rankings</p>
                </div>
              )}

              {isScreening && (
                <div className="h-full flex flex-col items-center justify-center text-center">
                  <Loader2 className="w-12 h-12 text-blue-600 animate-spin mb-4" />
                  <p className="text-lg font-medium animate-pulse">Analyzing CVs...</p>
                  <p className="text-sm text-gray-500 mt-2">Computing TF-IDF vectors and similarity scores</p>
                </div>
              )}

              <div className="space-y-4">
                <AnimatePresence>
                  {results.map((result, idx) => (
                    <motion.div
                      key={result.fileName}
                      initial={{ opacity: 0, x: 20 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: idx * 0.1 }}
                      className="border border-gray-100 rounded-xl overflow-hidden hover:border-blue-200 transition-all"
                    >
                      <div 
                        className={`p-4 flex items-center justify-between cursor-pointer ${expandedResult === result.fileName ? 'bg-blue-50' : 'bg-white'}`}
                        onClick={() => setExpandedResult(expandedResult === result.fileName ? null : result.fileName)}
                      >
                        <div className="flex items-center gap-4">
                          <div className="w-10 h-10 bg-gray-100 rounded-full flex items-center justify-center font-bold text-gray-500">
                            {idx + 1}
                          </div>
                          <div>
                            <p className="font-bold text-gray-900 truncate max-w-[250px]">{result.fileName}</p>
                            <p className="text-xs text-gray-500 uppercase font-semibold tracking-wider">Candidate Profile</p>
                          </div>
                        </div>
                        <div className="flex items-center gap-6">
                          <div className="text-right">
                            <p className="text-2xl font-black text-blue-600">{(result.score * 100).toFixed(1)}%</p>
                            <p className="text-[10px] text-gray-400 uppercase font-bold tracking-widest">Match Score</p>
                          </div>
                          {expandedResult === result.fileName ? <ChevronUp className="w-5 h-5 text-gray-400" /> : <ChevronDown className="w-5 h-5 text-gray-400" />}
                        </div>
                      </div>

                      <AnimatePresence>
                        {expandedResult === result.fileName && (
                          <motion.div
                            initial={{ height: 0, opacity: 0 }}
                            animate={{ height: 'auto', opacity: 1 }}
                            exit={{ height: 0, opacity: 0 }}
                            className="bg-white border-t border-gray-100"
                          >
                            <div className="p-6 space-y-6">
                              {result.aiData ? (
                                <>
                                  <div className="space-y-2">
                                    <h4 className="text-xs font-bold text-blue-600 uppercase tracking-widest flex items-center gap-2">
                                      <Sparkles className="w-3 h-3" />
                                      AI Summary
                                    </h4>
                                    <p className="text-sm text-gray-700 leading-relaxed italic">"{result.aiData.summary}"</p>
                                  </div>

                                  <div className="space-y-2">
                                    <h4 className="text-xs font-bold text-blue-600 uppercase tracking-widest">Matched Skills</h4>
                                    <div className="flex flex-wrap gap-2">
                                      {result.aiData.skills.map((skill, sIdx) => (
                                        <span key={sIdx} className="bg-blue-50 text-blue-700 text-[10px] font-bold px-2 py-1 rounded border border-blue-100">
                                          {skill}
                                        </span>
                                      ))}
                                    </div>
                                  </div>

                                  <div className="space-y-2">
                                    <h4 className="text-xs font-bold text-blue-600 uppercase tracking-widest">Match Explanation</h4>
                                    <p className="text-sm text-gray-600 leading-relaxed">{result.aiData.explanation}</p>
                                  </div>
                                </>
                              ) : (
                                <div className="text-center py-4 text-gray-400 text-sm">
                                  Enable AI Enhancements to see detailed analysis
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
              className="fixed inset-0 bg-black/20 backdrop-blur-sm z-40"
            />
            <motion.div 
              initial={{ x: '100%' }}
              animate={{ x: 0 }}
              exit={{ x: '100%' }}
              transition={{ type: 'spring', damping: 25, stiffness: 200 }}
              className="fixed right-0 top-0 bottom-0 w-full max-w-md bg-white shadow-2xl z-50 flex flex-col"
            >
              <div className="p-6 border-b border-gray-100 flex justify-between items-center">
                <div className="flex items-center gap-2">
                  <History className="w-5 h-5 text-blue-600" />
                  <h2 className="text-xl font-bold text-gray-900">Screening History</h2>
                </div>
                <button onClick={() => setIsHistoryOpen(false)} className="p-2 hover:bg-gray-100 rounded-full transition-colors">
                  <X className="w-5 h-5 text-gray-400" />
                </button>
              </div>

              <div className="flex-1 overflow-y-auto p-6 space-y-4">
                {sessions.length === 0 ? (
                  <div className="h-full flex flex-col items-center justify-center text-center opacity-40">
                    <Clock className="w-12 h-12 mb-4" />
                    <p className="font-medium">No history found</p>
                    <p className="text-sm">Your screening sessions will appear here</p>
                  </div>
                ) : (
                  sessions.map((session) => (
                    <div 
                      key={session.id}
                      onClick={() => loadSession(session)}
                      className="group p-4 border border-gray-100 rounded-xl hover:border-blue-200 hover:bg-blue-50/30 transition-all cursor-pointer relative"
                    >
                      <div className="flex justify-between items-start mb-2">
                        <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">
                          {session.timestamp?.toDate().toLocaleString() || 'Unknown Date'}
                        </p>
                        <button 
                          onClick={(e) => deleteSession(session.id, e)}
                          className="p-1.5 text-gray-300 hover:text-red-500 hover:bg-red-50 rounded-lg transition-all opacity-0 group-hover:opacity-100"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                      <p className="text-sm font-bold text-gray-800 line-clamp-2 mb-3 leading-relaxed">
                        {session.jdText}
                      </p>
                      <div className="flex items-center gap-2">
                        <span className="bg-blue-100 text-blue-700 text-[10px] font-bold px-2 py-0.5 rounded-full uppercase">
                          {session.results.length} Candidates
                        </span>
                        <span className="text-[10px] text-gray-400 font-medium italic">
                          Top Match: {(Math.max(...session.results.map(r => r.score)) * 100).toFixed(0)}%
                        </span>
                      </div>
                    </div>
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
