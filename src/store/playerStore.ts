import { create } from 'zustand';
import { extractMetadata, ParsedLyrics, parseLrc } from '../lib/metadataParser';
import { get, set as setIdb } from 'idb-keyval';

export type Track = {
  id: string;
  queueId?: string; // unique string for queue layout tracking
  title: string;
  artist: string;
  album: string;
  duration: number;
  url: string;
  file?: File; // To keep reference to the local file
  fileType: string;
  coverUrl?: string; // New field for cover
  lrcFile?: File; // For sidecar lyric file
};

export type PlayerState = {
  // Library
  library: Track[];
  addTracks: (tracks: Track[]) => void;
  clearLibrary: () => void;
  updateTrack: (id: string, updates: Partial<Track>) => void;

  // Playback State
  currentTrack: Track | null;
  currentLyrics: ParsedLyrics | null;
  isPlaying: boolean;
  volume: number;
  progress: number;
  duration: number;
  queue: Track[];
  queueIndex: number;
  reorderQueue: (newQueue: Track[]) => void;
  
  // Controls
  playTrack: (track: Track, queue?: Track[], preLoadOnly?: boolean) => void;
  togglePlayPause: () => void;
  nextTrack: () => void;
  prevTrack: () => void;
  setVolume: (v: number) => void;
  setProgress: (p: number) => void;
  setDuration: (d: number) => void;
  setLyrics: (lrc: string) => void;
  
  // Firebase Auth / Google Google Drive
  googleDriveToken: string | null;
  setGoogleDriveToken: (token: string | null) => void;
  // UI State
  activeView: 'library' | 'playlists' | 'queue' | 'lyrics' | 'equalizer' | 'settings' | 'yt' | 'saavn' | 'drive';
  setActiveView: (view: 'library' | 'playlists' | 'queue' | 'lyrics' | 'equalizer' | 'settings' | 'yt' | 'saavn' | 'drive') => void;
  isMiniPlayer: boolean;
  toggleMiniPlayer: () => void;
  fullScreenMode: 'cinematic' | 'classic' | null;
  setFullScreenMode: (mode: 'cinematic' | 'classic' | null) => void;
  detailedLyricsEnabled: boolean;
  setDetailedLyricsEnabled: (enabled: boolean) => void;

  // Playlists
  playlists: any[];
  setPlaylists: (p: any[]) => void;

  // Search
  searchQuery: string;
  setSearchQuery: (q: string) => void;
  searchTrigger: number;
  triggerSearch: () => void;
};

// Singleton Audio Element
export const audioInstance = new Audio();

const sanitizeForCache = (library: Track[]) => {
  return library.map(t => ({ ...t, file: undefined, url: '' }));
};

let saveTimeout: any = null;
const debouncedSaveToIdb = (library: Track[]) => {
  if (saveTimeout) clearTimeout(saveTimeout);
  saveTimeout = setTimeout(() => {
    setIdb('cached-music-library', sanitizeForCache(library)).catch(console.warn);
  }, 1500);
};

export const usePlayerStore = create<PlayerState>((set, get) => ({
  library: [],
  addTracks: (tracks) => set((state) => {
    const nextLib = [...state.library, ...tracks];
    debouncedSaveToIdb(nextLib);
    return { library: nextLib };
  }),
  clearLibrary: () => {
    debouncedSaveToIdb([]);
    set({ library: [] });
  },
  updateTrack: (id, updates) => set((state) => {
    const nextLib = state.library.map(t => t.id === id ? { ...t, ...updates } : t);
    debouncedSaveToIdb(nextLib);
    return {
      library: nextLib,
      queue: state.queue.map(t => t.id === id ? { ...t, ...updates } : t),
      currentTrack: state.currentTrack?.id === id ? { ...state.currentTrack, ...updates } : state.currentTrack
    };
  }),

  currentTrack: null,
  currentLyrics: null,
  isPlaying: false,
  volume: 1,
  progress: 0,
  duration: 0,
  queue: [],
  queueIndex: -1,
  reorderQueue: (newQueue) => set((state) => {
    let nextIndex = state.queueIndex;
    if (state.currentTrack) {
      if (state.currentTrack.queueId) {
         nextIndex = newQueue.findIndex(t => t.queueId === state.currentTrack!.queueId);
      } else {
         nextIndex = newQueue.findIndex(t => t.id === state.currentTrack!.id);
      }
    }
    return { queue: newQueue, queueIndex: nextIndex };
  }),
  googleDriveToken: (() => {
    try {
      const stored = localStorage.getItem('drive_token');
      const time = localStorage.getItem('drive_token_time');
      if (stored && time) {
        // Expiration after 55 minutes to be safe (token expires in 60m)
        if (Date.now() - parseInt(time, 10) < 55 * 60 * 1000) {
          return stored;
        } else {
          localStorage.removeItem('drive_token');
          localStorage.removeItem('drive_token_time');
        }
      }
    } catch(e) {}
    return null;
  })(),
  setGoogleDriveToken: (t) => {
    try {
      if (t) {
        localStorage.setItem('drive_token', t);
        localStorage.setItem('drive_token_time', Date.now().toString());
      } else {
        localStorage.removeItem('drive_token');
        localStorage.removeItem('drive_token_time');
      }
    } catch(e) {}
    set({ googleDriveToken: t });
  },

  playTrack: async (track, newQueue, preLoadOnly = false) => {
    const state = get();
    let queue = newQueue || state.library;
    
    // Assign unique queueId to prevent React key collision on duplicate tracks
    queue = queue.map((t, i) => t.queueId ? t : { ...t, queueId: `${t.id}-${Date.now()}-${i}` });
    
    const matchedTrackInQueue = queue.find(t => t.id === track.id);
    const queueIndex = matchedTrackInQueue ? queue.findIndex(t => t.queueId === matchedTrackInQueue.queueId) : -1;
    const finalTrack = matchedTrackInQueue || track; // inherit queueId if in queue
    
    // Revoke old URL to avoid memory leaks if we created one
    if (state.currentTrack && state.currentTrack.url.startsWith('blob:')) {
      URL.revokeObjectURL(state.currentTrack.url);
    }
    
    // Use the native File object directly to create optimal playback URLs
    let audioUrl = finalTrack.url;
    if (finalTrack.file) {
      try {
        audioUrl = URL.createObjectURL(finalTrack.file);
      } catch (e) {
        console.error("Failed to create object URL for track", e);
      }
    }

    const updatedTrack = { ...finalTrack, url: audioUrl };

    audioInstance.src = audioUrl;
    audioInstance.load();
    
    if (!preLoadOnly) {
      const playPromise = audioInstance.play();
      if (playPromise !== undefined) {
        playPromise.catch(e => {
          if (e.name !== 'AbortError' && e.name !== 'NotSupportedError') {
             console.error("Playback error:", e);
          }
          usePlayerStore.setState({ isPlaying: false });
        });
      }
    }
    
    set({
      currentTrack: updatedTrack,
      queue,
      queueIndex,
      isPlaying: !preLoadOnly,
      progress: 0,
      currentLyrics: track.id !== state.currentTrack?.id ? null : state.currentLyrics
    });

    // Load Sidecar LRC explicitly if matched
    if (track.lrcFile) {
       track.lrcFile.text().then(text => {
          if (get().currentTrack?.id === track.id) {
              set({ currentLyrics: parseLrc(text) });
          }
       }).catch(console.warn);
    }

    // Try extracting metadata asynchronously
    if (track.file || track.url) {
      // Avoid extracting from external streaming providers unless it's drive where we need it
      // Standard HTTP URLs or API endpoints that return standard streams like drive proxy
      const isExternalStream = track.fileType === 'youtube' || track.fileType === 'saavn' || track.url.includes('piped');
      
      if (!isExternalStream) {
        try {
          const metaSource = track.file || track.url;
          const meta = await extractMetadata(metaSource);
          
          const finalUpdates = {
            coverUrl: meta.coverUrl || track.coverUrl,
            title: meta.title || track.title,
            artist: meta.artist || track.artist,
            album: meta.album || track.album
          };

          // Only update if there are changes to save idb thrashing
          if (finalUpdates.coverUrl !== track.coverUrl || finalUpdates.title !== track.title) {
              get().updateTrack(track.id, finalUpdates);
              
              // Also update the current track right away
              if (get().currentTrack?.id === track.id) {
                  set((s) => ({
                      currentTrack: { ...s.currentTrack!, ...finalUpdates }
                  }));
              }
          }

          if (!track.lrcFile && get().currentTrack?.id === track.id) {
            set({ currentLyrics: meta.lyrics });
          }
        } catch (err) {
          console.warn("Failed to load metadata asynchronously:", err);
        }
      }
    }
  },

  togglePlayPause: () => {
    const { isPlaying, currentTrack, queue } = get();
    
    if (!currentTrack) {
      if (queue.length > 0) {
        get().playTrack(queue[0]);
      }
      return;
    }
    
    if (isPlaying) {
      audioInstance.pause();
      set({ isPlaying: false });
    } else {
      const playPromise = audioInstance.play();
      if (playPromise !== undefined) {
        playPromise.catch(e => {
          if (e.name !== 'AbortError' && e.name !== 'NotSupportedError') {
             console.error("Playback error:", e);
          }
          set({ isPlaying: false });
        });
      }
      set({ isPlaying: true });
    }
  },

  nextTrack: () => {
    const { queue, queueIndex } = get();
    if (queue.length === 0) return;
    const nextIdx = (queueIndex + 1) % queue.length;
    get().playTrack(queue[nextIdx], queue);
  },

  prevTrack: () => {
    const { queue, queueIndex, progress } = get();
    if (queue.length === 0) return;
    
    // If more than 3 seconds in, restart track
    if (progress > 3) {
      audioInstance.currentTime = 0;
      set({ progress: 0 });
      return;
    }
    
    const prevIdx = (queueIndex - 1 + queue.length) % queue.length;
    get().playTrack(queue[prevIdx], queue);
  },

  setVolume: (v) => {
    audioInstance.volume = v;
    set({ volume: v });
  },

  setProgress: (p) => {
    set({ progress: p });
  },

  setDuration: (d) => {
    set({ duration: d });
  },

  setLyrics: (lrc) => {
    set({ currentLyrics: parseLrc(lrc) });
  },

  activeView: 'library',
  setActiveView: (view) => set({ activeView: view }),
  
  isMiniPlayer: false,
  toggleMiniPlayer: () => set(s => ({ isMiniPlayer: !s.isMiniPlayer })),

  fullScreenMode: null,
  setFullScreenMode: (mode) => set({ fullScreenMode: mode }),

  detailedLyricsEnabled: true,
  setDetailedLyricsEnabled: (enabled) => set({ detailedLyricsEnabled: enabled }),

  playlists: [],
  setPlaylists: (p) => set({ playlists: p }),

  searchQuery: '',
  setSearchQuery: (q) => set({ searchQuery: q }),
  searchTrigger: 0,
  triggerSearch: () => set(s => ({ searchTrigger: s.searchTrigger + 1 })),
}));

// Hydrate library from IDB
get('cached-music-library').then((cached) => {
  if (cached && cached.length > 0) {
    if (usePlayerStore.getState().library.length === 0) {
      usePlayerStore.setState({ library: cached });
      // Pre-load the first track from the cache if there isn't one already playing
      if (!usePlayerStore.getState().currentTrack) {
        usePlayerStore.getState().playTrack(cached[0], cached, true);
      }
    }
  }
});

get('detailed-lyrics-preference').then((pref) => {
  if (pref !== undefined) {
    usePlayerStore.setState({ detailedLyricsEnabled: pref });
  }
});

// Bind audio element events with high precision ticker
let rafId: number | null = null;
const tick = () => {
  if (!audioInstance.paused) {
    usePlayerStore.getState().setProgress(audioInstance.currentTime);
    rafId = requestAnimationFrame(tick);
  } else {
    rafId = null;
  }
};

audioInstance.addEventListener('play', () => {
  if (!rafId) rafId = requestAnimationFrame(tick);
});

audioInstance.addEventListener('pause', () => {
  if (rafId) {
    cancelAnimationFrame(rafId);
    rafId = null;
  }
});

audioInstance.addEventListener('timeupdate', () => {
  // Fallback and sync check
  const storeProgress = usePlayerStore.getState().progress;
  if (Math.abs(storeProgress - audioInstance.currentTime) > 0.2) {
    usePlayerStore.getState().setProgress(audioInstance.currentTime);
  }
});

audioInstance.addEventListener('loadedmetadata', () => {
  usePlayerStore.getState().setDuration(audioInstance.duration);
});

audioInstance.addEventListener('ended', () => {
  if (rafId) {
    cancelAnimationFrame(rafId);
    rafId = null;
  }
  usePlayerStore.getState().nextTrack();
});
