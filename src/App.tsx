import { useEffect } from "react";
import { Sidebar } from "./components/Sidebar";
import { TopBar } from "./components/TopBar";
import { BottomPlayer } from "./components/BottomPlayer";
import { LibraryView } from "./views/LibraryView";
import { PlaylistsView } from "./views/PlaylistsView";
import { LyricsView } from "./views/LyricsView";
import { EqualizerView } from "./views/EqualizerView";
import { SettingsView } from "./views/SettingsView";
import { QueueView } from "./views/QueueView";
import { FullScreenView } from "./views/FullScreenView";
import { ClassicFullScreenView } from "./views/ClassicFullScreenView";
import { YtView } from "./views/YtView";
import { SaavnView } from "./views/SaavnView";
import { DriveView } from "./views/DriveView";

import { usePlayerStore } from "./store/playerStore";
import { FirebaseSync } from "./components/FirebaseSync";

export default function App() {
  const { activeView, setActiveView, togglePlayPause, nextTrack, prevTrack, toggleMiniPlayer, isMiniPlayer, volume, setVolume, fullScreenMode, setFullScreenMode } = usePlayerStore();

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Don't trigger if user is typing in an input text element, except if it's hotkeys!
      // Here we don't return early just for inputs because we want Ctrl+Shift+F to work globally.
      if (document.activeElement instanceof HTMLInputElement && !e.ctrlKey) return;

      if (e.code === "Space" && !(document.activeElement instanceof HTMLInputElement)) {
        e.preventDefault();
        togglePlayPause();
      } else if (e.ctrlKey && e.code === "ArrowRight") {
        e.preventDefault();
        nextTrack();
      } else if (e.ctrlKey && e.code === "ArrowLeft") {
        e.preventDefault();
        prevTrack();
      } else if (e.ctrlKey && !e.shiftKey && e.code === "KeyL") {
        e.preventDefault();
        setActiveView('lyrics');
      } else if (e.ctrlKey && !e.shiftKey && e.code === "KeyM") {
        e.preventDefault();
        toggleMiniPlayer();
      } else if (e.ctrlKey && e.shiftKey && e.code === "KeyF") {
        e.preventDefault();
        setFullScreenMode(fullScreenMode ? null : 'cinematic');
      } else if (e.code === "ArrowUp") {
        e.preventDefault();
        setVolume(Math.min(1, volume + 0.05));
      } else if (e.code === "ArrowDown") {
        e.preventDefault();
        setVolume(Math.max(0, volume - 0.05));
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [togglePlayPause, nextTrack, prevTrack, setActiveView, toggleMiniPlayer, fullScreenMode, setFullScreenMode, volume, setVolume]);

  const renderView = () => {
    switch (activeView) {
      case 'library': return <LibraryView />;
      case 'playlists': return <PlaylistsView />;
      case 'queue': return <QueueView />;
      case 'lyrics': return <LyricsView />;
      case 'equalizer': return <EqualizerView />;
      case 'settings': return <SettingsView />;
      case 'yt': return <YtView />;
      case 'saavn': return <SaavnView />;
      case 'drive': return <DriveView />;
      default: return <LibraryView />;
    }
  };

  if (isMiniPlayer) {
    return (
      <div className="w-screen h-screen bg-black/80 flex items-center justify-center p-4">
        <div className="w-96 max-w-full bg-neo-yellow brutal-border p-4 shadow-[8px_8px_0_0_#FF4FA3]">
          <div className="flex justify-between items-center mb-4">
            <h3 className="font-black uppercase text-xl">Mini Player</h3>
            <button onClick={toggleMiniPlayer} className="brutal-btn bg-white w-8 h-8 p-0 text-xl leading-none">×</button>
          </div>
          <BottomPlayer />
        </div>
      </div>
    );
  }

  return (
    <div className="w-screen h-screen flex flex-col bg-neo-bg dark:bg-neo-dark overflow-hidden font-sans transition-colors duration-300 relative">
      <FirebaseSync />
      <div className="flex flex-1 overflow-hidden">
        <Sidebar />
        <div className="flex-1 flex flex-col bg-transparent">
          <TopBar />
          {/* Main Content Area */}
          {renderView()}
        </div>
      </div>
      <BottomPlayer />
      
      {/* Immersive Overlay */}
      {fullScreenMode === 'cinematic' && <FullScreenView />}
      {fullScreenMode === 'classic' && <ClassicFullScreenView />}
    </div>
  );
}
