import { Search, Moon, Sun, MonitorSpeaker, Monitor, LogOut, LogIn } from "lucide-react";
import { usePlayerStore } from "../store/playerStore";
import React, { useEffect, useState, useRef } from "react";
import { auth } from "../lib/firebase";
import { GoogleAuthProvider, signInWithPopup, signOut, onAuthStateChanged } from "firebase/auth";

export function TopBar() {
  const { searchQuery, setSearchQuery, setFullScreenMode, setGoogleDriveToken, triggerSearch, activeView } = usePlayerStore();
  const [theme, setTheme] = useState<'light'|'dark'>('light');
  const [user, setUser] = useState<any>(null);
  const searchInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
      setUser(currentUser);
    });
    return () => unsubscribe();
  }, []);

  useEffect(() => {
    if (theme === 'dark') {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
  }, [theme]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.ctrlKey && e.code === "KeyF") {
        e.preventDefault();
        searchInputRef.current?.focus();
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, []);

  const toggleTheme = () => setTheme(t => t === 'light' ? 'dark' : 'light');

  const handleLogin = async () => {
    try {
      const provider = new GoogleAuthProvider();
      provider.addScope('https://www.googleapis.com/auth/drive.readonly');
      
      const result = await signInWithPopup(auth, provider);
      const credential = GoogleAuthProvider.credentialFromResult(result);
      if (credential && credential.accessToken) {
         setGoogleDriveToken(credential.accessToken);
      }
    } catch (error) {
      console.error('Firebase OAuth error:', error);
    }
  };

  const handleLogout = async () => {
    try {
      await signOut(auth);
      setGoogleDriveToken(null);
    } catch (error) {
      console.error('Logout error:', error);
    }
  };

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    triggerSearch();
  };

  const getSearchPlaceholder = () => {
    switch (activeView) {
      case 'yt': return "Search YT Music (Enter to search)...";
      case 'saavn': return "Search JioSaavn (Enter to search)...";
      case 'drive': return "Filter Drive files...";
      case 'playlists': return "Filter playlists...";
      case 'library':
      default: return "Search library... (Ctrl+F)";
    }
  };

  return (
    <div className="h-20 border-b-4 border-black dark:border-white bg-neo-yellow dark:bg-zinc-900 flex items-center px-6 justify-between shrink-0 transition-colors duration-300">
      
      {/* Search */}
      <div className="flex-1 max-w-xl">
        <form onSubmit={handleSearchSubmit} className="relative">
          <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
            <Search className="h-6 w-6 text-black dark:text-white" strokeWidth={3} />
          </div>
          <input
            ref={searchInputRef}
            type="text"
            className="w-full bg-white dark:bg-black brutal-border brutal-shadow-sm py-2 pl-12 pr-4 font-bold text-lg focus:outline-none focus:ring-0 dark:text-white dark:placeholder-zinc-500 placeholder-zinc-400"
            placeholder={getSearchPlaceholder()}
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </form>
      </div>

      <div className="flex items-center gap-4 ml-6">
        <div className="hidden md:flex items-center gap-2 brutal-border bg-white dark:bg-black px-3 py-1 font-bold shadow-[2px_2px_0_0_#000] dark:shadow-[2px_2px_0_0_#fff]">
          <MonitorSpeaker className="w-5 h-5" strokeWidth={2.5} />
          <select className="bg-transparent focus:outline-none dark:text-white cursor-pointer font-bold">
            <option>System Default</option>
            <option>External DAC (Simulated)</option>
            <option>Bluetooth Headphones</option>
          </select>
        </div>

        <button 
          onClick={() => setFullScreenMode('cinematic')}
          className="brutal-btn bg-white dark:bg-zinc-800 text-black dark:text-white px-3 py-2"
          title="Immersive Fullscreen"
        >
          <Monitor className="w-6 h-6" strokeWidth={3}/>
        </button>

        <button 
          onClick={toggleTheme}
          className="brutal-btn bg-neo-cyan dark:bg-neo-pink text-black px-3 py-2"
          title="Toggle Theme"
        >
          {theme === 'light' ? <Moon className="w-6 h-6" strokeWidth={3}/> : <Sun className="w-6 h-6" strokeWidth={3}/>}
        </button>

        {user ? (
          <div className="relative group/user brutal-border bg-white dark:bg-zinc-800 p-1 flex items-center gap-2 shadow-[2px_2px_0_0_#000] dark:shadow-[2px_2px_0_0_#fff]">
            {user.photoURL && <img src={user.photoURL} alt={user.displayName || "User"} className="w-8 h-8 brutal-border-sm" referrerPolicy="no-referrer" />}
            <span className="font-bold hidden lg:inline-block px-1 dark:text-white truncate max-w-[150px]">{user.displayName || user.email}</span>
            <button 
              onClick={handleLogout}
              className="p-1.5 hover:bg-red-500 hover:text-white text-black dark:text-white transition-colors"
              title="Logout"
            >
              <LogOut className="w-5 h-5" strokeWidth={3} />
            </button>
          </div>
        ) : (
          <button 
            onClick={handleLogin}
            className="brutal-btn bg-[#4285F4] text-white px-4 py-2 flex items-center justify-center gap-2 border-black dark:border-white shadow-[2px_2px_0_0_#000] dark:shadow-[2px_2px_0_0_#fff]"
          >
            <LogIn className="w-5 h-5" strokeWidth={3} />
            <span className="font-bold">Log In</span>
          </button>
        )}
      </div>
    </div>
  );
}
