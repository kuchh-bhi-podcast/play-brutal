import { Music, Plus, Lock } from "lucide-react";
import { usePlayerStore } from "../store/playerStore";
import { useAuth } from "../components/FirebaseAuthProvider";
import { createPlaylist } from "../services/firestoreService";
import { useState, FormEvent } from "react";

export function PlaylistsView() {
  const { searchQuery, playlists } = usePlayerStore();
  const { user } = useAuth();
  const [isCreating, setIsCreating] = useState(false);
  const [newPlaylistName, setNewPlaylistName] = useState("");
  
  const filteredPlaylists = playlists.filter(pl => 
    pl.name.toLowerCase().includes((searchQuery || '').toLowerCase())
  );

  const handleCreatePlaylist = async (e: FormEvent) => {
    e.preventDefault();
    if (!user || !newPlaylistName.trim()) return;
    
    try {
      await createPlaylist(user.uid, newPlaylistName);
      setNewPlaylistName("");
      setIsCreating(false);
    } catch (err) {
      console.error("Failed to create playlist:", err);
    }
  };

  if (!user) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center p-8 text-center">
        <Lock className="w-24 h-24 mb-6 text-neo-pink" strokeWidth={3} />
        <h2 className="text-4xl font-black uppercase mb-4 dark:text-white">Login Required</h2>
        <p className="text-xl font-bold max-w-md dark:text-zinc-400">
          Sync your playlists across all your devices by logging in with your Google account.
        </p>
      </div>
    );
  }

  return (
    <div className="flex-1 overflow-y-auto p-8 relative">
      <div className="mb-8 flex justify-between items-end">
        <h2 className="text-5xl font-black uppercase tracking-tight dark:text-white" style={{ textShadow: "4px 4px 0px var(--color-neo-pink)" }}>
          Playlists
        </h2>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
        {filteredPlaylists.map((pl) => (
          <div key={pl.id} className="aspect-square brutal-card flex flex-col p-6 cursor-pointer group hover:bg-neo-lime transition-colors">
            <div className="flex-1 flex items-center justify-center border-4 border-black bg-white mb-4 group-hover:scale-105 transition-transform shadow-[4px_4px_0_0_#000]">
              <Music className="w-16 h-16 text-neo-pink" strokeWidth={3} />
            </div>
            <div>
              <h3 className="font-black text-2xl uppercase truncate">{pl.name}</h3>
              <p className="font-bold text-sm">{(pl.trackIds?.length || 0)} Tracks</p>
            </div>
          </div>
        ))}

        {!isCreating ? (
          <button 
            onClick={() => setIsCreating(true)}
            className="aspect-square border-4 border-dashed border-black dark:border-white flex flex-col items-center justify-center cursor-pointer hover:bg-neo-yellow dark:hover:bg-zinc-800 transition-colors group"
          >
            <Plus className="w-20 h-20 mb-2 group-hover:rotate-90 transition-transform" strokeWidth={3} />
            <span className="font-bold text-xl uppercase">New Playlist</span>
          </button>
        ) : (
          <form onSubmit={handleCreatePlaylist} className="aspect-square brutal-card p-6 flex flex-col">
            <h3 className="font-black text-xl mb-4 uppercase">New Playlist</h3>
            <input
              autoFocus
              type="text"
              placeholder="Playlist name..."
              className="w-full brutal-border p-2 font-bold mb-4 focus:bg-white"
              value={newPlaylistName}
              onChange={(e) => setNewPlaylistName(e.target.value)}
            />
            <div className="flex gap-2 mt-auto">
              <button type="submit" className="flex-1 brutal-btn bg-neo-lime py-2">Create</button>
              <button type="button" onClick={() => setIsCreating(false)} className="brutal-btn bg-white py-2">×</button>
            </div>
          </form>
        )}
      </div>

      {filteredPlaylists.length === 0 && !isCreating && (
        <div className="mt-12 text-center p-12 brutal-border border-4 border-dashed border-black dark:border-white">
          <p className="text-2xl font-black uppercase dark:text-white">No playlists found</p>
          <p className="font-bold text-zinc-500 mt-2">Start by creating your first vibe.</p>
        </div>
      )}
    </div>
  );
}
