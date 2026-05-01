import React, { useState, useEffect } from 'react';
import { AuthProvider, useAuth } from './components/AuthProvider';
import { Login } from './components/Login';
import { Feed } from './components/Feed';
import { Chat } from './components/Chat';
import { Home, MessageSquare, User, LogOut, Edit2, Check, X, Moon, Sun } from 'lucide-react';
import { auth, db, handleFirestoreError, OperationType } from './lib/firebase';
import { doc, updateDoc } from 'firebase/firestore';
import { motion, AnimatePresence } from 'motion/react';
import { seedRandomData } from './services/seedData';

const AppContent: React.FC = () => {
  const { user, loading } = useAuth();
  const [activeTab, setActiveTab] = useState<'feed' | 'chat' | 'profile'>('feed');
  const [isDarkMode, setIsDarkMode] = useState(() => {
    return localStorage.getItem('theme') === 'dark' || 
      (!('theme' in localStorage) && window.matchMedia('(prefers-color-scheme: dark)').matches);
  });

  useEffect(() => {
    if (isDarkMode) {
      document.documentElement.classList.add('dark');
      localStorage.setItem('theme', 'dark');
    } else {
      document.documentElement.classList.remove('dark');
      localStorage.setItem('theme', 'light');
    }
  }, [isDarkMode]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#F5F5F5] dark:bg-gray-950">
        <div className="w-12 h-12 border-4 border-gray-200 border-t-black dark:border-gray-700 dark:border-t-white rounded-full animate-spin" />
      </div>
    );
  }

  if (!user) {
    return <Login />;
  }

  return (
    <div className="min-h-screen bg-[#F8F9FA] dark:bg-gray-950 font-sans text-gray-900 dark:text-gray-100 transition-colors duration-200">
      {/* Navigation */}
      <nav className="fixed bottom-0 left-0 right-0 md:top-0 md:bottom-auto bg-white dark:bg-gray-900 border-t md:border-t-0 md:border-b border-gray-100 dark:border-gray-800 z-50 shadow-sm md:shadow-none transition-colors duration-200">
        <div className="max-w-7xl mx-auto px-4 h-20 flex items-center justify-between">
          <div className="hidden md:flex items-center gap-2">
            <div className="w-10 h-10 bg-black dark:bg-white rounded-xl flex items-center justify-center text-white dark:text-black font-bold text-xl">SV</div>
            <span className="font-bold text-xl tracking-tight">SocialVibe</span>
          </div>

          <div className="flex flex-1 md:flex-none justify-evenly md:justify-start md:gap-8 gap-4">
            <NavBtn 
              active={activeTab === 'feed'} 
              onClick={() => setActiveTab('feed')} 
              icon={<Home size={24} />} 
              label="Feed" 
            />
            <NavBtn 
              active={activeTab === 'chat'} 
              onClick={() => setActiveTab('chat')} 
              icon={<MessageSquare size={24} />} 
              label="Chat" 
            />
            <NavBtn 
              active={activeTab === 'profile'} 
              onClick={() => setActiveTab('profile')} 
              icon={<User size={24} />} 
              label="Profile" 
            />
          </div>

          <div className="hidden md:flex items-center gap-4">
            <button 
              onClick={() => setIsDarkMode(!isDarkMode)}
              className="p-3 text-gray-400 hover:text-black dark:hover:text-white hover:bg-gray-100 dark:hover:bg-gray-800 rounded-2xl transition-all"
            >
              {isDarkMode ? <Sun size={20} /> : <Moon size={20} />}
            </button>
            <button 
              onClick={() => auth.signOut()}
              className="p-3 text-gray-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/30 rounded-2xl transition-all"
            >
              <LogOut size={20} />
            </button>
            <div className="w-10 h-10 rounded-full bg-gray-200 dark:bg-gray-700 overflow-hidden ring-2 ring-white dark:ring-gray-800 transition-colors">
              <img src={user.photoURL || `https://api.dicebear.com/7.x/avataaars/svg?seed=${user.uid}`} alt="Profile" className="w-full h-full object-cover" />
            </div>
          </div>
        </div>
      </nav>

      {/* Main Content */}
      <main className="md:pt-24 pb-24 md:pb-0">
        <AnimatePresence mode="wait">
          <motion.div
            key={activeTab}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            transition={{ duration: 0.2 }}
          >
            {activeTab === 'feed' && <Feed />}
            {activeTab === 'chat' && <div className="max-w-5xl mx-auto"><Chat /></div>}
            {activeTab === 'profile' && <ProfileView />}
          </motion.div>
        </AnimatePresence>
      </main>
    </div>
  );
};

const ProfileView: React.FC = () => {
  const { user, profile } = useAuth();
  const [seeding, setSeeding] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [bioText, setBioText] = useState('');
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    if (profile?.bio) {
      setBioText(profile.bio);
    }
  }, [profile]);

  const handleSeed = async () => {
    setSeeding(true);
    await seedRandomData();
    setSeeding(false);
    alert('Random people and posts created!');
  };

  const saveBio = async () => {
    if (!user) return;
    setIsSaving(true);
    try {
      await updateDoc(doc(db, 'users', user.uid), {
        bio: bioText
      });
      setIsEditing(false);
    } catch (e) {
      handleFirestoreError(e, OperationType.UPDATE, `users/${user.uid}`);
      alert('Failed to save bio');
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="max-w-xl mx-auto py-12 px-4">
      <div className="bg-white dark:bg-gray-900 rounded-[32px] p-8 border border-gray-100 dark:border-gray-800 shadow-sm text-center transition-colors">
        <div className="w-24 h-24 rounded-full bg-gray-100 dark:bg-gray-800 mx-auto mb-6 overflow-hidden border-4 border-white dark:border-gray-900 shadow-md">
          <img src={user?.photoURL || `https://api.dicebear.com/7.x/avataaars/svg?seed=${user?.uid}`} className="w-full h-full object-cover" />
        </div>
        <h2 className="text-2xl font-bold text-gray-900 dark:text-gray-100">{profile?.displayName || user?.displayName}</h2>
        <p className="text-gray-500 dark:text-gray-400 mb-8">@{profile?.username}</p>
        
        {/* Bio Section */}
        <div className="mb-8 text-left bg-gray-50/50 dark:bg-gray-800/50 p-6 rounded-2xl border border-gray-100 dark:border-gray-800">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-xs font-bold text-gray-400 dark:text-gray-500 uppercase tracking-widest">About Me</h3>
            {!isEditing ? (
              <button 
                onClick={() => setIsEditing(true)}
                className="p-1.5 text-gray-400 hover:text-black dark:hover:text-white hover:bg-white dark:hover:bg-gray-700 rounded-lg transition-all shadow-sm"
              >
                <Edit2 size={14} />
              </button>
            ) : (
              <div className="flex gap-2">
                <button 
                  onClick={() => { setIsEditing(false); setBioText(profile?.bio || ''); }}
                  className="p-1.5 text-gray-400 hover:text-red-500 hover:bg-white dark:hover:bg-gray-700 rounded-lg transition-all shadow-sm"
                >
                  <X size={16} />
                </button>
                <button 
                  onClick={saveBio}
                  disabled={isSaving}
                  className="p-1.5 text-green-500 hover:text-green-600 hover:bg-white dark:hover:bg-gray-700 rounded-lg transition-all shadow-sm disabled:opacity-50"
                >
                  <Check size={16} />
                </button>
              </div>
            )}
          </div>
          
          {isEditing ? (
            <textarea
              value={bioText}
              onChange={(e) => setBioText(e.target.value)}
              placeholder="Write something about yourself..."
              className="w-full bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl px-4 py-3 text-sm text-gray-800 dark:text-gray-200 focus:outline-none focus:ring-2 focus:ring-black/5 dark:focus:ring-white/10 min-h-[120px] resize-none"
              autoFocus
            />
          ) : (
            <p className="text-gray-700 dark:text-gray-300 text-sm leading-relaxed whitespace-pre-wrap italic opacity-80">
              {profile?.bio || "No bio yet. Tap the edit icon to add one!"}
            </p>
          )}
        </div>

        {user?.email === 'radioamunategui@gmail.com' && (
          <button 
            onClick={handleSeed}
            disabled={seeding}
            className="mb-8 w-full py-3 bg-blue-50 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 rounded-2xl font-semibold hover:bg-blue-100 dark:hover:bg-blue-900/50 transition-all flex items-center justify-center gap-2 border border-blue-100 dark:border-blue-800/50"
          >
            {seeding ? 'Generating...' : 'Seed Social Data'}
          </button>
        )}

        <div className="flex justify-center gap-10 border-t border-b border-gray-50 dark:border-gray-800 py-8 mb-8">
          <div className="text-center">
            <p className="font-black text-2xl text-gray-900 dark:text-gray-100">0</p>
            <p className="text-[10px] text-gray-400 dark:text-gray-500 uppercase font-bold tracking-wider">Posts</p>
          </div>
          <div className="text-center">
            <p className="font-black text-2xl text-gray-900 dark:text-gray-100">0</p>
            <p className="text-[10px] text-gray-400 dark:text-gray-500 uppercase font-bold tracking-wider">Followers</p>
          </div>
          <div className="text-center">
            <p className="font-black text-2xl text-gray-900 dark:text-gray-100">0</p>
            <p className="text-[10px] text-gray-400 dark:text-gray-500 uppercase font-bold tracking-wider">Following</p>
          </div>
        </div>
        
        <button 
          onClick={() => auth.signOut()}
          className="w-full py-4 bg-gray-50 dark:bg-gray-800/50 text-gray-500 dark:text-gray-400 rounded-2xl font-bold uppercase text-xs tracking-widest hover:bg-red-50 dark:hover:bg-red-900/30 hover:text-red-600 dark:hover:text-red-400 transition-all flex items-center justify-center gap-2"
        >
          <LogOut size={16} />
          Sign Out
        </button>
      </div>
    </div>
  );
};

const NavBtn: React.FC<{ active: boolean; onClick: () => void; icon: React.ReactNode; label: string }> = ({ active, onClick, icon, label }) => (
  <button 
    onClick={onClick}
    className={`flex flex-col md:flex-row items-center gap-2.5 p-3 rounded-2xl transition-all ${active ? 'text-black md:bg-black/5' : 'text-gray-400 hover:text-gray-600'}`}
  >
    {icon}
    <span className="text-[10px] md:text-sm font-bold md:font-semibold uppercase md:capitalize tracking-[0.1em] md:tracking-normal">{label}</span>
  </button>
);

export default function App() {
  return (
    <AuthProvider>
      <AppContent />
    </AuthProvider>
  );
}
