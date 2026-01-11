import React, { useState, useEffect, createContext, useContext, useRef } from 'react';
import { HashRouter, Routes, Route, Navigate, useLocation, useNavigate } from 'react-router-dom';
import { videosData, assignments } from './data';
import { AuthState, User, VideoData, Theme } from './types';
import { api } from './api';
import { 
  PlayCircle, 
  CheckCircle, 
  Lock, 
  Search, 
  Menu, 
  X, 
  LogOut, 
  User as UserIcon, 
  Trash2, 
  Plus, 
  Edit2,
  FileText,
  Star,
  Sun,
  Moon,
  Calendar,
  Save,
  Clock,
  ShieldCheck,
  ChevronRight,
  Eye,
  EyeOff
} from 'lucide-react';

// --- SKELETON COMPONENTS ---
const SkeletonPulse = ({ className = '' }: { className?: string }) => (
  <div 
    className={`relative overflow-hidden bg-gray-200 dark:bg-gray-700 rounded skeleton-shimmer ${className}`}
    style={{
      background: 'linear-gradient(90deg, #e5e7eb 0%, #f3f4f6 50%, #e5e7eb 100%)',
      backgroundSize: '200% 100%',
      animation: 'shimmer 2s infinite'
    }}
  ></div>
);

const VideoListSkeleton = () => (
  <div className="space-y-2 p-3">
    {[1, 2, 3, 4, 5, 6, 7, 8].map(i => (
      <div key={i} className="flex items-center gap-3 p-3 rounded-lg bg-gray-50 dark:bg-brand-surface/30">
        <SkeletonPulse className="w-8 h-8 rounded-full" />
        <div className="flex-1 space-y-2">
          <SkeletonPulse className="h-4 w-3/4" />
          <SkeletonPulse className="h-3 w-1/2" />
        </div>
      </div>
    ))}
  </div>
);

const VideoPlayerSkeleton = () => (
  <div className="space-y-4">
    <SkeletonPulse className="w-full aspect-video rounded-xl" />
    <SkeletonPulse className="h-8 w-2/3" />
    <SkeletonPulse className="h-4 w-full" />
    <SkeletonPulse className="h-4 w-5/6" />
  </div>
);

const TableRowSkeleton = () => (
  <tr className="border-b border-gray-100 dark:border-brand-border">
    <td className="p-5">
      <div className="flex items-center gap-4">
        <SkeletonPulse className="w-12 h-12 rounded-full" />
        <div className="space-y-2 flex-1">
          <SkeletonPulse className="h-4 w-32" />
          <SkeletonPulse className="h-3 w-20" />
        </div>
      </div>
    </td>
    <td className="p-5">
      <SkeletonPulse className="h-6 w-24" />
    </td>
    <td className="p-5">
      <div className="space-y-2">
        <SkeletonPulse className="h-3 w-full max-w-xs" />
        <SkeletonPulse className="h-4 w-16" />
      </div>
    </td>
    <td className="p-5">
      <div className="flex gap-2 justify-end">
        <SkeletonPulse className="h-8 w-8 rounded-lg" />
        <SkeletonPulse className="h-8 w-8 rounded-lg" />
      </div>
    </td>
  </tr>
);

const DashboardStatsSkeleton = () => (
  <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
    {[1, 2, 3].map(i => (
      <div key={i} className="bg-white dark:bg-brand-card p-4 rounded-xl border border-gray-200 dark:border-brand-border">
        <div className="flex items-center gap-3">
          <SkeletonPulse className="w-10 h-10 rounded-lg" />
          <div className="flex-1 space-y-2">
            <SkeletonPulse className="h-3 w-20" />
            <SkeletonPulse className="h-6 w-16" />
          </div>
        </div>
      </div>
    ))}
  </div>
);

// --- THEME CONTEXT ---
const ThemeContext = createContext<{
  theme: Theme;
  toggleTheme: () => void;
} | null>(null);

const ThemeProvider = ({ children }: { children: React.ReactNode }) => {
  const [theme, setTheme] = useState<Theme>(() => {
    return (localStorage.getItem('app_theme') as Theme) || 'dark';
  });

  useEffect(() => {
    const root = window.document.documentElement;
    root.classList.remove('dark', 'light');
    root.classList.add(theme);
    localStorage.setItem('app_theme', theme);
  }, [theme]);

  const toggleTheme = () => {
    setTheme(prev => prev === 'dark' ? 'light' : 'dark');
  };

  return (
    <ThemeContext.Provider value={{ theme, toggleTheme }}>
      {children}
    </ThemeContext.Provider>
  );
};

const useTheme = () => {
  const context = useContext(ThemeContext);
  if (!context) throw new Error("useTheme must be used within ThemeProvider");
  return context;
};

// --- AUTH CONTEXT ---
const AuthContext = createContext<{
  authState: AuthState;
  login: (u: string, p: string) => Promise<boolean>;
  logout: () => void;
  updateProgress: (vidId: number) => Promise<void>;
  toggleStar: (vidId: number) => Promise<void>;
  saveNote: (vidId: number, content: string) => Promise<void>;
} | null>(null);

const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [authState, setAuthState] = useState<AuthState>(() => {
    const stored = localStorage.getItem('auth_session');
    return stored ? JSON.parse(stored) : { isAuthenticated: false, user: null };
  });

  useEffect(() => {
    localStorage.setItem('auth_session', JSON.stringify(authState));
  }, [authState]);

  const login = async (u: string, p: string) => {
    try {
      const response = await api.login(u, p);
      if (response.success && response.user) {
        setAuthState({ isAuthenticated: true, user: response.user });
        return true;
      }
      return false;
    } catch (error) {
      console.error('Login error:', error);
      return false;
    }
  };

  const logout = () => {
    setAuthState({ isAuthenticated: false, user: null });
    localStorage.removeItem('auth_session');
  };

  const updateProgress = async (vidId: number) => {
    if (authState.user && authState.user.role === 'student') {
        const currentProgress = authState.user.progress || [];
        if (!currentProgress.includes(vidId)) {
            try {
              const response = await api.updateProgress(authState.user._id, vidId);
              if (response.success && response.user) {
                setAuthState(prev => ({ ...prev, user: response.user }));
              }
            } catch (error) {
              console.error('Error updating progress:', error);
            }
        }
    }
  };

  const toggleStar = async (vidId: number) => {
    if (authState.user && authState.user.role === 'student') {
      try {
        const response = await api.toggleStarred(authState.user._id, vidId);
        if (response.success && response.user) {
          setAuthState(prev => ({ ...prev, user: response.user }));
        }
      } catch (error) {
        console.error('Error toggling star:', error);
      }
    }
  };

  const saveNote = async (vidId: number, content: string) => {
    if (authState.user && authState.user.role === 'student') {
      try {
        const response = await api.saveNote(authState.user._id, vidId, content);
        if (response.success && response.user) {
          setAuthState(prev => ({ ...prev, user: response.user }));
        }
      } catch (error) {
        console.error('Error saving note:', error);
      }
    }
  };

  return (
    <AuthContext.Provider value={{ authState, login, logout, updateProgress, toggleStar, saveNote }}>
      {children}
    </AuthContext.Provider>
  );
};

const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) throw new Error("useAuth must be used within AuthProvider");
  return context;
};

// --- COMPONENTS ---

// Global Wrapper for Security (Disables Right Click & Selection)
const SecurityWrapper = ({ children }: { children: React.ReactNode }) => {
  return (
    <div 
      className="select-none h-full"
      onContextMenu={(e) => e.preventDefault()}
      onDragStart={(e) => e.preventDefault()}
    >
      {children}
    </div>
  );
};

const ProtectedRoute = ({ children, role }: { children: React.ReactNode, role?: 'admin' | 'student' }) => {
  const { authState } = useAuth();
  const location = useLocation();

  if (!authState.isAuthenticated) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  if (role && authState.user?.role !== role) {
    return <Navigate to="/" replace />; // Redirect unauthorized role access
  }

  return <>{children}</>;
};

// Secure Video Player with Auto-Complete at 80% Progress
const SecureVideoPlayer = ({ url, title, videoId, onComplete }: { url: string, title: string, videoId: number, onComplete: () => void }) => {
  const [hasCompleted, setHasCompleted] = useState(false);
  const iframeRef = useRef<HTMLIFrameElement>(null);
  const watchTimeRef = useRef(0); // Track cumulative watch time in seconds
  const lastUpdateRef = useRef(Date.now());
  const isPlayingRef = useRef(false);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const { authState } = useAuth();

  useEffect(() => {
    // Check if already completed
    if (authState.user?.progress?.includes(videoId)) {
      setHasCompleted(true);
      return;
    }

    // Reset state on video change
    setHasCompleted(false);
    watchTimeRef.current = 0;
    lastUpdateRef.current = Date.now();
    isPlayingRef.current = false;

    // Estimated video duration (in seconds) - default 30 minutes
    // Most lectures are 30-60 minutes, so we use 30 min * 60 = 1800 seconds
    const estimatedDuration = 1800; // 30 minutes in seconds
    const completionThreshold = estimatedDuration * 0.80; // 80% = 1440 seconds (24 minutes)

    // Track active watching time
    const updateWatchTime = () => {
      if (isPlayingRef.current) {
        const now = Date.now();
        const elapsed = (now - lastUpdateRef.current) / 1000; // Convert to seconds
        watchTimeRef.current += elapsed;
        lastUpdateRef.current = now;

        // Check if we've reached 80% completion threshold
        if (watchTimeRef.current >= completionThreshold && !hasCompleted) {
          setHasCompleted(true);
          onComplete(); // Mark as complete
          console.log(`Video ${videoId} completed at 80% (${Math.round(watchTimeRef.current)}s of ${estimatedDuration}s)`);
          if (intervalRef.current) {
            clearInterval(intervalRef.current);
          }
        }
      } else {
        lastUpdateRef.current = Date.now(); // Reset timestamp when not playing
      }
    };

    // User interaction handlers - assume video is playing when user interacts
    const handleUserInteraction = () => {
      if (!isPlayingRef.current) {
        isPlayingRef.current = true;
        lastUpdateRef.current = Date.now();
      }
    };

    const handlePause = () => {
      if (isPlayingRef.current) {
        // Update one final time before pausing
        const now = Date.now();
        const elapsed = (now - lastUpdateRef.current) / 1000;
        watchTimeRef.current += elapsed;
        isPlayingRef.current = false;
      }
    };

    // Start tracking interval - update every 3 seconds
    intervalRef.current = setInterval(updateWatchTime, 3000);

    // Listen for user interactions that indicate video is playing
    const iframeElement = iframeRef.current;
    if (iframeElement) {
      iframeElement.addEventListener('mouseenter', handleUserInteraction);
      iframeElement.addEventListener('click', handleUserInteraction);
      iframeElement.addEventListener('touchstart', handleUserInteraction);
    }

    // Handle tab visibility changes
    const handleVisibilityChange = () => {
      if (document.hidden) {
        handlePause();
      } else {
        handleUserInteraction();
      }
    };
    document.addEventListener('visibilitychange', handleVisibilityChange);

    // Assume video starts playing on mount (user clicked to watch)
    handleUserInteraction();

    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
      if (iframeElement) {
        iframeElement.removeEventListener('mouseenter', handleUserInteraction);
        iframeElement.removeEventListener('click', handleUserInteraction);
        iframeElement.removeEventListener('touchstart', handleUserInteraction);
      }
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, [videoId, onComplete, hasCompleted, authState.user]);

  const getEmbedUrl = (driveUrl: string) => {
    const match = driveUrl.match(/\/d\/(.+?)\//);
    if (match && match[1]) {
      return `https://drive.google.com/file/d/${match[1]}/preview`;
    }
    return driveUrl; 
  };

  const embedUrl = getEmbedUrl(url);

  return (
    <div className="relative w-full aspect-video bg-black rounded-xl overflow-hidden shadow-2xl border border-gray-700 dark:border-brand-border ring-1 ring-white/5">
      {/* High Security Overlay */}
      <div 
        className="absolute inset-0 z-10 w-full h-full"
        style={{ pointerEvents: 'none' }} 
        onContextMenu={(e) => e.preventDefault()}
      />
      
      <iframe 
        ref={iframeRef}
        src={embedUrl}
        className="w-full h-full"
        allow="autoplay; encrypted-media"
        title={title}
        sandbox="allow-scripts allow-same-origin allow-presentation"
      ></iframe>
      
      {/* Silent progress tracking in background - 80% = auto-complete */}
    </div>
  );
};

const Login = () => {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const { login } = useAuth();
  const navigate = useNavigate();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const success = await login(username, password);
    if (success) {
      // Check role from localStorage auth_session after login
      const stored = localStorage.getItem('auth_session');
      if (stored) {
        const authData = JSON.parse(stored);
        if (authData.user?.role === 'admin') {
          navigate('/admin');
        } else {
          navigate('/dashboard');
        }
      }
    } else {
      setError('Invalid credentials');
    }
  };

  return (
    <div 
      className="min-h-screen flex items-center justify-center bg-cover bg-center bg-no-repeat relative"
      style={{ 
        backgroundImage: `url('https://c8.alamy.com/comp/2FNMWRT/online-learning-design-concept-top-view-of-student-table-with-computer-headphone-and-stationeries-on-blue-table-background-2FNMWRT.jpg')`,
      }}
    >
      {/* Dark Overlay for better contrast */}
      <div className="absolute inset-0 bg-black/50 backdrop-blur-[3px]"></div>

      {/* Glass Card */}
      <div className="w-full max-w-md p-8 relative z-10 mx-4 glass rounded-2xl shadow-2xl border-t border-l border-white/20 animate-fade-in-up">
        
        <div className="flex justify-between items-start mb-10">
           <div>
              <h2 className="text-4xl font-bold text-white tracking-tight drop-shadow-md">Login</h2>
              <p className="text-gray-200 text-sm mt-1 opacity-90">Welcome back to CB+ DSA</p>
           </div>
           <div className="bg-white/20 p-2 rounded-full backdrop-blur-sm shadow-inner">
               <Lock className="text-white w-6 h-6" />
           </div>
        </div>
        
        {error && (
          <div className="bg-red-500/80 backdrop-blur-md text-white px-4 py-3 rounded-lg mb-6 text-sm font-medium shadow-lg border border-red-400/50 flex items-center gap-2">
            <ShieldCheck size={16} />
            {error}
          </div>
        )}
        
        <form onSubmit={handleSubmit} className="space-y-8">
          <div className="relative group">
            <input
              type="text"
              className="peer w-full bg-transparent border-b-2 border-gray-300 text-white py-2 focus:outline-none focus:border-brand transition-all placeholder-transparent"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              placeholder="Username"
              id="username"
            />
            <label 
              htmlFor="username"
              className="absolute left-0 -top-3.5 text-gray-300 text-sm transition-all peer-placeholder-shown:text-base peer-placeholder-shown:text-gray-300 peer-placeholder-shown:top-2 peer-focus:-top-3.5 peer-focus:text-brand peer-focus:text-sm font-medium"
            >
              Username
            </label>
            <UserIcon className="absolute right-0 top-2 text-gray-300 w-5 h-5 opacity-50 group-hover:opacity-100 transition-opacity" />
          </div>

          <div className="relative group">
            <input
              type={showPassword ? "text" : "password"}
              className="peer w-full bg-transparent border-b-2 border-gray-300 text-white py-2 focus:outline-none focus:border-brand transition-all placeholder-transparent pr-8"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Password"
              id="password"
            />
            <label 
              htmlFor="password"
              className="absolute left-0 -top-3.5 text-gray-300 text-sm transition-all peer-placeholder-shown:text-base peer-placeholder-shown:text-gray-300 peer-placeholder-shown:top-2 peer-focus:-top-3.5 peer-focus:text-brand peer-focus:text-sm font-medium"
            >
              Password
            </label>
            <button
              type="button"
              onClick={() => setShowPassword(!showPassword)}
              className="absolute right-0 top-2 text-gray-300 hover:text-white transition-colors focus:outline-none"
            >
               {showPassword ? <EyeOff size={20} /> : <Eye size={20} />}
            </button>
          </div>

          <div className="flex justify-between items-center text-sm">
             <label className="flex items-center text-gray-200 gap-2 cursor-pointer hover:text-white transition-colors">
                 <input type="checkbox" className="rounded bg-white/20 border-gray-400 text-brand focus:ring-brand" />
                 Remember me
             </label>
          </div>

          <button
            type="submit"
            className="w-full bg-gradient-to-r from-orange-500 to-red-500 hover:from-orange-600 hover:to-red-600 text-white font-bold py-3.5 rounded-full shadow-lg transform transition-all hover:scale-[1.02] active:scale-95 flex justify-center items-center gap-2 group"
          >
            LOGIN
            <ChevronRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
          </button>
        </form>
      </div>
    </div>
  );
};

const Dashboard = () => {
  const { authState, logout, updateProgress, toggleStar, saveNote } = useAuth();
  const { theme, toggleTheme } = useTheme();
  const [selectedVideo, setSelectedVideo] = useState<VideoData>(videosData[0]);
  const [sidebarOpen, setSidebarOpen] = useState(window.innerWidth >= 768); // Start closed on mobile
  const [searchQuery, setSearchQuery] = useState('');
  const [activeTab, setActiveTab] = useState<'videos' | 'assignments' | 'starred'>('videos');
  const [noteContent, setNoteContent] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [isSavingNote, setIsSavingNote] = useState(false);

  // Simulate initial data load
  useEffect(() => {
    const timer = setTimeout(() => setIsLoading(false), 800);
    return () => clearTimeout(timer);
  }, []);

  // Load note when video changes
  useEffect(() => {
    if (authState.user?.notes) {
      setNoteContent(authState.user.notes[selectedVideo.id] || '');
    }
  }, [selectedVideo.id, authState.user]);

  const filteredVideos = videosData.filter(v => 
    v.title.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const starredVideos = videosData.filter(v => 
    authState.user?.starred?.includes(v.id)
  );

  const completionPercentage = Math.round(
      ((authState.user?.progress?.length || 0) / videosData.length) * 100
  );

  const checkInStreak = authState.user?.checkIns?.length || 0;

  const handleVideoComplete = () => {
      updateProgress(selectedVideo.id);
  };

  const handleSaveNote = async () => {
      setIsSavingNote(true);
      await saveNote(selectedVideo.id, noteContent);
      setTimeout(() => setIsSavingNote(false), 500);
  };

  return (
    <div className="flex h-screen bg-gray-50 dark:bg-brand-bg overflow-hidden transition-colors font-sans">
      {/* Mobile Backdrop Overlay */}
      {sidebarOpen && (
        <div 
          className="fixed inset-0 bg-black/50 z-10 md:hidden backdrop-blur-sm"
          onClick={() => setSidebarOpen(false)}
        />
      )}
      
      {/* Sidebar */}
      <div className={`${sidebarOpen ? 'translate-x-0' : '-translate-x-full'} fixed md:relative md:translate-x-0 w-80 max-w-[85vw] bg-white/90 dark:bg-brand-card/95 backdrop-blur-md border-r border-gray-200 dark:border-brand-border transition-transform duration-300 flex flex-col z-20 h-full shadow-2xl overflow-hidden`}>
        <div className="p-5 border-b border-gray-100 dark:border-brand-border flex justify-between items-center bg-gradient-to-r from-transparent to-gray-50/50 dark:to-white/5">
            <h1 className="text-xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-brand to-red-500">Course Content</h1>
            <button onClick={() => setSidebarOpen(false)} className="md:hidden text-gray-500 dark:text-gray-400 hover:text-red-500 transition-colors"><X /></button>
        </div>
        
        <div className="p-5 space-y-6">
             {/* Progress Bar */}
             <div className="bg-gray-50 dark:bg-brand-surface p-4 rounded-xl border border-gray-200 dark:border-brand-border shadow-sm">
                <div className="flex justify-between text-xs font-semibold text-gray-500 dark:text-gray-400 mb-2 uppercase tracking-wider">
                    <span>Course Progress</span>
                    <span className="text-brand">{completionPercentage}%</span>
                </div>
                <div className="w-full bg-gray-200 dark:bg-black rounded-full h-2.5 overflow-hidden">
                    <div 
                        className="bg-gradient-to-r from-brand to-red-500 h-2.5 rounded-full transition-all duration-700 ease-out shadow-[0_0_10px_rgba(249,115,22,0.5)]" 
                        style={{ width: `${completionPercentage}%`}}
                    ></div>
                </div>
             </div>

             {/* Tab Switcher */}
             <div className="flex bg-gray-100 dark:bg-brand-surface p-1.5 rounded-xl shadow-inner">
                 {['videos', 'starred', 'assignments'].map((tab) => (
                    <button 
                        key={tab}
                        onClick={() => setActiveTab(tab as any)}
                        className={`flex-1 py-2 text-xs font-bold rounded-lg transition-all capitalize ${activeTab === tab ? 'bg-white dark:bg-brand-border/60 text-brand shadow-sm' : 'text-gray-500 dark:text-gray-400 hover:text-gray-800 dark:hover:text-gray-200'}`}
                    >
                        {tab}
                    </button>
                 ))}
             </div>

             {(activeTab === 'videos' || activeTab === 'starred') && (
                 <div className="relative group">
                    <Search className="absolute left-3 top-2.5 text-gray-400 w-4 h-4 group-focus-within:text-brand transition-colors" />
                    <input 
                        type="text" 
                        placeholder="Search lectures..." 
                        className="w-full bg-gray-50 dark:bg-brand-surface border border-gray-200 dark:border-brand-border rounded-xl pl-10 pr-4 py-2.5 text-sm text-gray-700 dark:text-gray-300 focus:outline-none focus:border-brand/50 focus:ring-2 focus:ring-brand/20 transition-all placeholder-gray-400 dark:placeholder-gray-600"
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                    />
                 </div>
             )}
        </div>

        <div className="flex-1 overflow-y-auto px-3 pb-4 space-y-1">
            {isLoading ? (
                <VideoListSkeleton />
            ) : activeTab === 'assignments' ? (
                assignments.map((assignment) => (
                    <a 
                        key={assignment.id}
                        href={assignment.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="block p-3.5 rounded-xl hover:bg-blue-50 dark:hover:bg-brand-surface border border-transparent hover:border-blue-100 dark:hover:border-brand-border transition-all group"
                    >
                        <div className="flex items-center gap-3.5">
                            <div className="bg-blue-100 dark:bg-blue-900/20 p-2 rounded-lg text-blue-500 dark:text-blue-400 group-hover:scale-110 transition-transform">
                                <FileText size={18} />
                            </div>
                            <div className="flex-1">
                                <h4 className="text-xs font-semibold text-gray-700 dark:text-gray-200 group-hover:text-blue-600 dark:group-hover:text-blue-300 transition-colors">{assignment.title}</h4>
                                <span className="text-[10px] text-blue-500 font-medium mt-0.5 block uppercase tracking-wide">Open Contest &rarr;</span>
                            </div>
                        </div>
                    </a>
                ))
            ) : (
                (activeTab === 'starred' ? starredVideos : filteredVideos).map((video) => {
                    const isCompleted = authState.user?.progress?.includes(video.id);
                    const isActive = selectedVideo.id === video.id;
                    const isStarred = authState.user?.starred?.includes(video.id);

                    return (
                        <div 
                            key={video.id}
                            onClick={() => {
                                setSelectedVideo(video);
                                if(window.innerWidth < 768) setSidebarOpen(false);
                            }}
                            className={`p-3 rounded-xl cursor-pointer flex items-center gap-3 transition-all relative overflow-hidden group ${isActive ? 'bg-orange-50 dark:bg-gradient-to-r dark:from-brand/10 dark:to-transparent border border-orange-200 dark:border-brand/20 shadow-md' : 'hover:bg-gray-50 dark:hover:bg-brand-surface border border-transparent hover:border-gray-100 dark:hover:border-brand-border'}`}
                        >
                            {isActive && <div className="absolute left-0 top-0 bottom-0 w-1 bg-brand rounded-r"></div>}
                            
                            <div className={`${isCompleted ? 'text-green-500' : isActive ? 'text-brand' : 'text-gray-400 dark:text-gray-500'} transition-colors`}>
                                {isCompleted ? <CheckCircle size={18} className="fill-green-100 dark:fill-green-900/30" /> : <PlayCircle size={18} />}
                            </div>
                            <div className="flex-1 min-w-0 z-10">
                                <h4 className={`text-xs font-semibold truncate leading-tight ${isActive ? 'text-brand' : 'text-gray-700 dark:text-gray-300 group-hover:text-gray-900 dark:group-hover:text-white'}`}>{video.title}</h4>
                                <p className="text-[10px] text-gray-400 mt-0.5">{video.duration}</p>
                            </div>
                            {isStarred && <Star size={14} className="text-yellow-400 fill-yellow-400 z-10 animate-in zoom-in duration-300" />}
                        </div>
                    );
                })
            )}
            
            {activeTab === 'starred' && starredVideos.length === 0 && (
              <div className="flex flex-col items-center justify-center h-40 text-gray-400 text-xs text-center p-6">
                <Star className="w-8 h-8 mb-2 opacity-20" />
                <p>No starred videos yet.</p>
                <p className="opacity-60 mt-1">Click the star icon on any video to add it here.</p>
              </div>
            )}
        </div>
      </div>

      {/* Main Content */}
      <div className="flex-1 flex flex-col h-full overflow-hidden relative bg-gray-50 dark:bg-brand-bg transition-colors">
        {/* Header */}
        <header className="h-18 bg-white/80 dark:bg-brand-card/80 backdrop-blur-md border-b border-gray-200 dark:border-brand-border flex items-center justify-between px-6 py-3 transition-colors shadow-sm z-10 sticky top-0">
            <div className="flex items-center gap-4">
                {!sidebarOpen && (
                    <button onClick={() => setSidebarOpen(true)} className="text-gray-500 dark:text-gray-400 hover:text-brand bg-gray-100 dark:bg-brand-surface p-2 rounded-lg transition-all">
                        <Menu size={20} />
                    </button>
                )}
                <h2 className="text-lg font-bold text-gray-800 dark:text-white hidden sm:block tracking-tight">CB+ DSA <span className="text-brand">Mastery</span></h2>
            </div>
            <div className="flex items-center gap-3">
                <div className="flex items-center gap-2 bg-gradient-to-r from-orange-100 to-amber-100 dark:from-brand-surface dark:to-brand-surface px-3 py-1.5 rounded-full text-xs font-bold text-orange-800 dark:text-orange-200 shadow-sm border border-orange-200 dark:border-brand-border" title="Daily Login Streak">
                   <Calendar size={14} className="text-orange-600 dark:text-orange-400" />
                   <span>{checkInStreak} Day Streak</span>
                </div>

                <div className="h-6 w-px bg-gray-200 dark:bg-brand-border mx-1"></div>

                <button 
                  onClick={toggleTheme} 
                  className="p-2 rounded-full text-gray-500 hover:bg-gray-100 dark:text-gray-400 dark:hover:bg-brand-surface transition-all hover:rotate-12"
                  title="Toggle Theme"
                >
                  {theme === 'dark' ? <Sun size={20} /> : <Moon size={20} />}
                </button>

                <div className="flex items-center gap-3 ml-2 pl-2 border-l border-gray-200 dark:border-brand-border">
                    <div className="text-right hidden sm:block leading-tight">
                        <p className="text-xs font-bold text-gray-900 dark:text-white">{authState.user?.username}</p>
                        <p className="text-[10px] text-gray-500 uppercase tracking-wider">{authState.user?.role}</p>
                    </div>
                    <button 
                        onClick={logout}
                        className="bg-red-50 hover:bg-red-100 dark:bg-red-500/10 dark:hover:bg-red-500/20 text-red-600 dark:text-red-400 p-2 rounded-lg transition-colors"
                        title="Logout"
                    >
                        <LogOut size={18} />
                    </button>
                </div>
            </div>
        </header>

        {/* Video Area */}
        <main className="flex-1 overflow-y-auto p-4 md:p-8 scroll-smooth">
            <div className="max-w-6xl mx-auto space-y-8">
                
                {isLoading ? (
                    <>
                        <VideoPlayerSkeleton />
                        <DashboardStatsSkeleton />
                        <div className="space-y-4">
                            <SkeletonPulse className="h-32 w-full rounded-2xl" />
                            <SkeletonPulse className="h-48 w-full rounded-2xl" />
                        </div>
                    </>
                ) : (
                    <>
                {/* 1. Large Video Player (Full Width) */}
                <div className="w-full">
                    <SecureVideoPlayer 
                        videoId={selectedVideo.id}
                        url={selectedVideo.url} 
                        title={selectedVideo.title} 
                        onComplete={handleVideoComplete}
                    />
                </div>

                {/* 2. Video Info & Description */}
                <div className="bg-white dark:bg-brand-card rounded-2xl p-6 md:p-8 border border-gray-200 dark:border-brand-border shadow-xl shadow-gray-200/50 dark:shadow-none transition-colors">
                    <div className="flex items-start justify-between mb-6">
                        <div>
                            <span className="bg-brand/10 text-brand text-[10px] font-bold px-2 py-1 rounded-md uppercase tracking-widest mb-3 inline-block border border-brand/20">
                                {selectedVideo.category}
                            </span>
                            <h1 className="text-2xl md:text-3xl font-bold text-gray-900 dark:text-white leading-tight">{selectedVideo.title}</h1>
                        </div>
                        <div className="flex gap-3">
                            <button 
                            onClick={() => toggleStar(selectedVideo.id)}
                            className={`p-2.5 rounded-full transition-all hover:scale-110 active:scale-95 shadow-sm ${authState.user?.starred?.includes(selectedVideo.id) ? 'bg-yellow-400/20 text-yellow-500 ring-2 ring-yellow-400/50' : 'bg-gray-100 dark:bg-brand-surface text-gray-400 hover:text-yellow-500'}`}
                            title={authState.user?.starred?.includes(selectedVideo.id) ? "Unstar video" : "Star video"}
                            >
                            <Star size={20} className={authState.user?.starred?.includes(selectedVideo.id) ? 'fill-yellow-500' : ''} />
                            </button>
                        </div>
                    </div>
                    
                    <div className="flex items-center gap-4 mb-6 pb-6 border-b border-gray-100 dark:border-brand-border">
                        {authState.user?.progress?.includes(selectedVideo.id) ? (
                            <span className="flex items-center gap-2 text-green-600 dark:text-green-400 bg-green-50 dark:bg-green-500/10 px-4 py-1.5 rounded-full text-xs font-bold uppercase tracking-wide border border-green-200 dark:border-green-500/20">
                                <CheckCircle size={16} /> Completed
                            </span>
                        ) : (
                            <span className="text-xs font-medium text-gray-500 dark:text-gray-400 flex items-center gap-2 bg-gray-100 dark:bg-brand-surface px-3 py-1.5 rounded-full">
                                <Clock size={14} /> Auto-complete enabled
                            </span>
                        )}
                    </div>

                    <div className="prose dark:prose-invert max-w-none">
                        <h3 className="text-sm font-bold uppercase text-gray-400 mb-2">Description</h3>
                        <p className="text-gray-600 dark:text-gray-300 leading-relaxed">{selectedVideo.description}</p>
                    </div>
                </div>

                {/* 3. My Lecture Notes (Below Description) - Separate for each video */}
                <div className="bg-white dark:bg-brand-card rounded-2xl border border-gray-200 dark:border-brand-border shadow-xl flex flex-col min-h-[400px] transition-colors overflow-hidden">
                    <div className="p-4 border-b border-gray-100 dark:border-brand-border flex justify-between items-center bg-gray-50/50 dark:bg-brand-surface/30">
                        <h3 className="font-bold text-gray-800 dark:text-white flex items-center gap-2 text-sm">
                        <div className="bg-brand/10 p-1.5 rounded text-brand"><Edit2 size={16} /></div> 
                        My Notes - {selectedVideo.title}
                        </h3>
                        <button 
                        onClick={handleSaveNote}
                        disabled={isSavingNote}
                        className="text-xs bg-brand hover:bg-brand-dark text-white px-4 py-2 rounded-lg flex items-center gap-1.5 font-semibold transition-all shadow-lg shadow-brand/20 active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                        {isSavingNote ? (
                            <>
                                <div className="animate-spin rounded-full h-3 w-3 border-b-2 border-white"></div>
                                Saving...
                            </>
                        ) : (
                            <>
                                <Save size={14} /> Save Note
                            </>
                        )}
                        </button>
                    </div>
                    
                    <div className="flex-1 p-0 bg-[#fefce8] dark:bg-[#0c0c0c] relative">
                        {/* Notebook lines effect */}
                        <div className="absolute inset-0 pointer-events-none opacity-10" 
                            style={{ backgroundImage: 'linear-gradient(#9ca3af 1px, transparent 1px)', backgroundSize: '100% 2rem', marginTop: '2rem' }}>
                        </div>
                        
                        <textarea 
                        className="w-full h-full bg-transparent border-none resize-none focus:ring-0 text-gray-800 dark:text-gray-200 placeholder-gray-400/70 dark:placeholder-gray-700 leading-[2rem] font-medium text-sm p-6 pt-2"
                        placeholder={`Write your notes for "${selectedVideo.title}" here...`}
                        value={noteContent}
                        onChange={(e) => setNoteContent(e.target.value)}
                        spellCheck={false}
                        ></textarea>
                    </div>
                </div>
                        >
                        {isSavingNote ? (
                            <>
                                <div className="animate-spin rounded-full h-3 w-3 border-b-2 border-white"></div>
                                Saving...
                            </>
                        ) : (
                            <>
                                <Save size={14} /> Save Note
                            </>
                        )}
                        </button>
                    </div>
                    
                    <div className="flex-1 p-0 bg-[#fefce8] dark:bg-[#0c0c0c] relative">
                        {/* Notebook lines effect */}
                        <div className="absolute inset-0 pointer-events-none opacity-10" 
                            style={{ backgroundImage: 'linear-gradient(#9ca3af 1px, transparent 1px)', backgroundSize: '100% 2rem', marginTop: '2rem' }}>
                        </div>
                        
                        <textarea 
                        className="w-full h-full bg-transparent border-none resize-none focus:ring-0 text-gray-800 dark:text-gray-200 placeholder-gray-400/70 dark:placeholder-gray-700 leading-[2rem] font-medium text-sm p-6 pt-2"
                        placeholder="Start typing your notes here..."
                        value={noteContent}
                        onChange={(e) => setNoteContent(e.target.value)}
                        spellCheck={false}
                        ></textarea>
                    </div>
                </div>
                    </>
                )}
            </div>
        </main>
      </div>
    </div>
  );
};

const AdminPanel = () => {
    const { logout } = useAuth();
    const [users, setUsers] = useState<User[]>([]);
    const [isAddModalOpen, setIsAddModalOpen] = useState(false);
    const [isEditModalOpen, setIsEditModalOpen] = useState(false);
    const [currentUser, setCurrentUser] = useState<Partial<User>>({});
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [showPassword, setShowPassword] = useState<Record<string, boolean>>({});
    
    // Fetch users from API
    const refreshUsers = async () => {
        try {
            setLoading(true);
            setError(null);
            const response = await api.getUsers();
            if (response.success && response.users) {
                setUsers(response.users);
            } else {
                setError('Failed to fetch users');
            }
        } catch (error) {
            console.error('Error fetching users:', error);
            setError(`Connection error: ${error instanceof Error ? error.message : 'Unknown error'}`);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        refreshUsers();
    }, []);

    const handleAddUser = async (e: React.FormEvent) => {
        e.preventDefault();
        if (currentUser.username && currentUser.password) {
            try {
                const response = await api.createUser(
                    currentUser.username,
                    currentUser.password,
                    'student'
                );
                if (response.success) {
                    setIsAddModalOpen(false);
                    setCurrentUser({});
                    await refreshUsers();
                }
            } catch (error) {
                console.error('Error adding user:', error);
            }
        }
    };

    const handleEditUser = async (e: React.FormEvent) => {
        e.preventDefault();
        if (currentUser._id && currentUser.password) {
            try {
                const response = await api.updateUserPassword(
                    currentUser._id,
                    currentUser.password
                );
                if (response.success) {
                    setIsEditModalOpen(false);
                    setCurrentUser({});
                    await refreshUsers();
                }
            } catch (error) {
                console.error('Error updating password:', error);
            }
        }
    };

    const handleDelete = async (id: string) => {
        if(window.confirm('Are you sure you want to remove this student?')) {
            try {
                const response = await api.deleteUser(id);
                if (response.success) {
                    await refreshUsers();
                }
            } catch (error) {
                console.error('Error deleting user:', error);
            }
        }
    };

    return (
        <div className="min-h-screen bg-gray-50 dark:bg-brand-bg text-gray-900 dark:text-gray-100 transition-colors font-sans">
            <header className="bg-white dark:bg-brand-card border-b border-gray-200 dark:border-brand-border p-4 px-8 flex justify-between items-center shadow-sm sticky top-0 z-10">
                <div className="flex items-center gap-3">
                    <div className="bg-gradient-to-br from-brand to-red-600 p-2.5 rounded-xl shadow-lg shadow-brand/20">
                        <Lock className="text-white w-5 h-5" />
                    </div>
                    <div>
                      <h1 className="text-xl font-bold tracking-tight">Admin Dashboard</h1>
                      <p className="text-xs text-gray-500 dark:text-gray-400">Manage Platform Access</p>
                    </div>
                </div>
                <div className="flex items-center gap-4">
                    <div className="text-right hidden sm:block">
                        <p className="text-sm font-bold">abhayverma5545</p>
                        <p className="text-[10px] text-green-500 uppercase font-bold tracking-wider">Super Admin</p>
                    </div>
                    <button onClick={logout} className="bg-red-50 hover:bg-red-100 dark:bg-red-500/10 dark:hover:bg-red-500/20 text-red-600 dark:text-red-400 px-4 py-2 rounded-lg text-sm font-bold transition-all border border-red-200 dark:border-red-900/30">
                        Logout
                    </button>
                </div>
            </header>

            <main className="p-8 max-w-7xl mx-auto">
                {loading ? (
                    <div>
                        <div className="flex justify-between items-end mb-8">
                            <div className="space-y-3">
                                <SkeletonPulse className="h-8 w-64" />
                                <SkeletonPulse className="h-4 w-40" />
                            </div>
                            <SkeletonPulse className="h-12 w-48 rounded-xl" />
                        </div>
                        <div className="bg-white dark:bg-brand-card rounded-2xl border border-gray-200 dark:border-brand-border overflow-hidden shadow-xl">
                            <table className="w-full">
                                <thead className="bg-gray-50/50 dark:bg-brand-surface/50">
                                    <tr>
                                        <th className="p-5 text-left">
                                            <SkeletonPulse className="h-4 w-32" />
                                        </th>
                                        <th className="p-5 text-left">
                                            <SkeletonPulse className="h-4 w-24" />
                                        </th>
                                        <th className="p-5 text-left">
                                            <SkeletonPulse className="h-4 w-28" />
                                        </th>
                                        <th className="p-5 text-right">
                                            <SkeletonPulse className="h-4 w-20 ml-auto" />
                                        </th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {[1, 2, 3, 4, 5].map(i => <TableRowSkeleton key={i} />)}
                                </tbody>
                            </table>
                        </div>
                    </div>
                ) : error ? (
                    <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-xl p-6 text-center">
                        <p className="text-red-600 dark:text-red-400 font-bold mb-2">Error Loading Data</p>
                        <p className="text-red-500 dark:text-red-300 text-sm mb-4">{error}</p>
                        <button 
                            onClick={refreshUsers}
                            className="bg-red-600 hover:bg-red-700 text-white px-4 py-2 rounded-lg text-sm font-bold"
                        >
                            Retry
                        </button>
                    </div>
                ) : (
                    <>
                <div className="flex justify-between items-end mb-8">
                    <div>
                        <h2 className="text-3xl font-bold text-gray-900 dark:text-white mb-2">Student Management</h2>
                        <p className="text-gray-500 dark:text-gray-400">Total Students: <span className="font-bold text-brand">{users.filter(u => u.role !== 'admin').length}</span></p>
                    </div>
                    <button 
                        onClick={() => setIsAddModalOpen(true)}
                        className="bg-brand hover:bg-brand-dark text-white px-6 py-3 rounded-xl flex items-center gap-2.5 font-bold shadow-xl shadow-brand/20 transition-all hover:-translate-y-1 active:scale-95"
                    >
                        <Plus size={20} strokeWidth={3} /> Add New Student
                    </button>
                </div>

                <div className="bg-white dark:bg-brand-card rounded-2xl border border-gray-200 dark:border-brand-border overflow-hidden shadow-xl">
                    <table className="w-full text-left">
                        <thead className="bg-gray-50/50 dark:bg-brand-surface/50 text-gray-500 dark:text-gray-400 text-xs uppercase tracking-wider">
                            <tr>
                                <th className="p-5 font-bold">Student Profile</th>
                                <th className="p-5 font-bold">Credentials</th>
                                <th className="p-5 font-bold">Course Progress</th>
                                <th className="p-5 font-bold text-right">Actions</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-100 dark:divide-brand-border">
                            {users.filter(u => u.role !== 'admin').map(user => (
                                <tr key={user._id} className="hover:bg-gray-50/80 dark:hover:bg-brand-surface/30 transition-colors group">
                                    <td className="p-5">
                                        <div className="flex items-center gap-4">
                                            <div className="bg-gray-100 dark:bg-brand-surface p-3 rounded-full text-gray-500 dark:text-gray-400 group-hover:bg-brand group-hover:text-white transition-colors">
                                                <UserIcon size={20} />
                                            </div>
                                            <div>
                                              <span className="font-bold text-gray-900 dark:text-gray-100 block text-base">{user.username}</span>
                                              <span className="text-xs text-gray-400">ID: {user._id.slice(-6)}</span>
                                            </div>
                                        </div>
                                    </td>
                                    <td className="p-5">
                                      <div className="flex items-center gap-2">
                                        <div className="font-mono text-sm bg-gray-100 dark:bg-brand-surface px-3 py-1 rounded inline-flex items-center gap-2 text-gray-600 dark:text-gray-300 border border-gray-200 dark:border-brand-border">
                                          {showPassword[user._id] ? (user.plainPassword || '••••••••') : '••••••••'}
                                          <button
                                            onClick={() => setShowPassword(prev => ({ ...prev, [user._id]: !prev[user._id] }))}
                                            className="text-gray-400 hover:text-brand transition-colors"
                                            title={showPassword[user._id] ? "Hide password" : "Show password"}
                                          >
                                            {showPassword[user._id] ? <EyeOff size={14} /> : <Eye size={14} />}
                                          </button>
                                        </div>
                                      </div>
                                    </td>
                                    <td className="p-5">
                                        <div className="flex items-center gap-3">
                                            <div className="w-32 bg-gray-200 dark:bg-black rounded-full h-2">
                                                <div 
                                                    className="bg-brand h-2 rounded-full"
                                                    style={{ width: `${Math.round(((user.progress?.length || 0) / videosData.length) * 100)}%` }}
                                                ></div>
                                            </div>
                                            <span className="text-sm font-bold text-brand">
                                                {Math.round(((user.progress?.length || 0) / videosData.length) * 100)}%
                                            </span>
                                        </div>
                                    </td>
                                    <td className="p-5 text-right space-x-2">
                                        <button 
                                            onClick={() => {
                                                setCurrentUser(user);
                                                setIsEditModalOpen(true);
                                            }}
                                            className="text-gray-400 hover:text-blue-500 dark:hover:text-blue-400 p-2 rounded-lg hover:bg-blue-50 dark:hover:bg-blue-900/20 transition-all"
                                            title="Edit"
                                        >
                                            <Edit2 size={18} />
                                        </button>
                                        <button 
                                            onClick={() => handleDelete(user._id)}
                                            className="text-gray-400 hover:text-red-500 dark:hover:text-red-400 p-2 rounded-lg hover:bg-red-50 dark:hover:bg-red-900/20 transition-all"
                                            title="Remove"
                                        >
                                            <Trash2 size={18} />
                                        </button>
                                    </td>
                                </tr>
                            ))}
                            {users.filter(u => u.role !== 'admin').length === 0 && (
                                <tr>
                                    <td colSpan={4} className="p-12 text-center text-gray-500">
                                        <div className="flex flex-col items-center">
                                          <UserIcon size={48} className="opacity-20 mb-4" />
                                          <p>No students enrolled yet.</p>
                                          <button onClick={() => setIsAddModalOpen(true)} className="text-brand font-bold mt-2 hover:underline">Add your first student</button>
                                        </div>
                                    </td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                </div>
                </>
                )}
            </main>

            {/* Modal for Add/Edit */}
            {(isAddModalOpen || isEditModalOpen) && (
                <div className="fixed inset-0 bg-black/60 dark:bg-black/90 flex items-center justify-center z-50 backdrop-blur-sm animate-in fade-in duration-200">
                    <div className="bg-white dark:bg-brand-card p-8 rounded-2xl w-full max-w-md border border-gray-200 dark:border-brand-border shadow-2xl transform transition-all scale-100">
                        <h3 className="text-2xl font-bold text-gray-800 dark:text-white mb-6 border-b border-gray-100 dark:border-brand-border pb-4">
                            {isAddModalOpen ? 'Enroll New Student' : 'Change Student Password'}
                        </h3>
                        <form onSubmit={isAddModalOpen ? handleAddUser : handleEditUser} className="space-y-5">
                            <div>
                                <label className="block text-gray-500 dark:text-gray-400 text-xs font-bold uppercase tracking-wider mb-2">Username</label>
                                <input 
                                    type="text" 
                                    required
                                    disabled={isEditModalOpen}
                                    className="w-full bg-gray-50 dark:bg-brand-surface border border-gray-200 dark:border-brand-border rounded-xl p-3 text-gray-900 dark:text-white focus:border-brand focus:ring-2 focus:ring-brand/20 outline-none transition-all disabled:opacity-60 disabled:cursor-not-allowed"
                                    value={currentUser.username || ''}
                                    onChange={e => setCurrentUser({...currentUser, username: e.target.value})}
                                    placeholder="Enter username"
                                />
                            </div>
                            <div>
                                <label className="block text-gray-500 dark:text-gray-400 text-xs font-bold uppercase tracking-wider mb-2">
                                  {isAddModalOpen ? 'Password' : 'New Password'}
                                </label>
                                <input 
                                    type="text" 
                                    required
                                    className="w-full bg-gray-50 dark:bg-brand-surface border border-gray-200 dark:border-brand-border rounded-xl p-3 text-gray-900 dark:text-white focus:border-brand focus:ring-2 focus:ring-brand/20 outline-none transition-all"
                                    value={currentUser.password || ''}
                                    onChange={e => setCurrentUser({...currentUser, password: e.target.value})}
                                    placeholder={isAddModalOpen ? "Set password" : "Enter new password"}
                                />
                            </div>
                            <div className="flex gap-4 pt-4">
                                <button 
                                    type="button" 
                                    onClick={() => {
                                        setIsAddModalOpen(false);
                                        setIsEditModalOpen(false);
                                        setCurrentUser({});
                                    }}
                                    className="flex-1 bg-gray-100 hover:bg-gray-200 dark:bg-brand-surface dark:hover:bg-brand-border text-gray-700 dark:text-gray-300 py-3 rounded-xl transition-colors font-semibold"
                                >
                                    Cancel
                                </button>
                                <button 
                                    type="submit" 
                                    className="flex-1 bg-brand hover:bg-brand-dark text-white py-3 rounded-xl transition-all font-bold shadow-lg shadow-brand/20"
                                >
                                    {isAddModalOpen ? 'Create Account' : 'Update Password'}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
};

const App = () => {
  return (
    <HashRouter>
      <ThemeProvider>
        <AuthProvider>
          <SecurityWrapper>
            <Routes>
              <Route path="/login" element={<Login />} />
              <Route 
                path="/dashboard" 
                element={
                  <ProtectedRoute role="student">
                    <Dashboard />
                  </ProtectedRoute>
                } 
              />
              <Route 
                path="/admin" 
                element={
                  <ProtectedRoute role="admin">
                    <AdminPanel />
                  </ProtectedRoute>
                } 
              />
              <Route path="/" element={<Navigate to="/login" replace />} />
            </Routes>
          </SecurityWrapper>
        </AuthProvider>
      </ThemeProvider>
    </HashRouter>
  );
};

export default App;
