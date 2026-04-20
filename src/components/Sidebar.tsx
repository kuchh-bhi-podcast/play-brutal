import { usePlayerStore } from "../store/playerStore";
import { cn } from "../lib/utils";
import { Library, ListMusic, ListVideo, Mic2, Settings, Sliders, Youtube, Music, HardDrive, LogIn, LogOut, User } from "lucide-react";
import { useAuth } from "./FirebaseAuthProvider";

export function Sidebar() {
  const { activeView, setActiveView } = usePlayerStore();
  const { user, signIn, logout } = useAuth();

  const navItems = [
    { id: 'library', label: 'Library', icon: Library, color: 'bg-neo-cyan' },
    { id: 'playlists', label: 'Playlists', icon: ListMusic, color: 'bg-neo-pink' },
    { id: 'queue', label: 'Queue', icon: ListVideo, color: 'bg-neo-yellow' },
    { id: 'drive', label: 'G-Drive', icon: HardDrive, color: 'bg-blue-400 text-white' },
    { id: 'yt', label: 'YT Music', icon: Youtube, color: 'bg-red-500 text-white' },
    { id: 'saavn', label: 'JioSaavn', icon: Music, color: 'bg-[#2bc5b4] text-white' },
    { id: 'lyrics', label: 'Lyrics', icon: Mic2, color: 'bg-neo-lime' },
    { id: 'equalizer', label: 'Equalizer', icon: Sliders, color: 'bg-neo-cyan' },
    { id: 'settings', label: 'Settings', icon: Settings, color: 'bg-white text-black' },
  ] as const;

  return (
    <div className="w-64 border-r-4 border-black dark:border-white bg-white dark:bg-black flex flex-col pt-4 shrink-0 transition-colors duration-300">
      <div className="px-6 mb-8">
        <h1 className="text-3xl font-black uppercase tracking-tighter" style={{ textShadow: "2px 2px 0px var(--color-neo-pink)"}}>
          Brutal<br/>Audio
        </h1>
      </div>
      
      <nav className="flex-1 px-4 space-y-4">
        {navItems.map((item) => {
          const isActive = activeView === item.id;
          const Icon = item.icon;
          return (
            <button
              key={item.id}
              onClick={() => setActiveView(item.id)}
              className={cn(
                "w-full brutal-btn justify-start text-lg gap-3",
                isActive ? item.color : "bg-neo-bg dark:bg-zinc-800 text-black dark:text-white shadow-[2px_2px_0_0_#000] dark:shadow-[2px_2px_0_0_#fff]"
              )}
            >
              <Icon className="w-6 h-6" strokeWidth={3} />
              <span className="font-bold">{item.label}</span>
            </button>
          )
        })}
      </nav>

      <div className="p-4 border-t-4 border-black dark:border-white">
        {user ? (
          <div className="flex flex-col gap-2">
            <div className="flex items-center gap-2 p-2 bg-neo-lime brutal-border brutal-shadow-sm">
              {user.photoURL ? (
                <img src={user.photoURL} alt="Profile" className="w-8 h-8 rounded-full brutal-border border-2" referrerPolicy="no-referrer" />
              ) : (
                <User className="w-8 h-8 p-1 bg-white brutal-border border-2" />
              )}
              <span className="font-bold truncate text-sm">{user.displayName}</span>
            </div>
            <button
              onClick={logout}
              className="w-full brutal-btn bg-white dark:bg-zinc-800 text-black dark:text-white justify-start gap-3"
            >
              <LogOut className="w-5 h-5" strokeWidth={3} />
              <span className="font-bold">Logout</span>
            </button>
          </div>
        ) : (
          <button
            onClick={signIn}
            className="w-full brutal-btn bg-neo-yellow text-black justify-start gap-3"
          >
            <LogIn className="w-5 h-5" strokeWidth={3} />
            <span className="font-bold">Login with Google</span>
          </button>
        )}
      </div>
    </div>
  );
}
