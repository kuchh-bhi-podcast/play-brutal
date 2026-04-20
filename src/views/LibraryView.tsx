import { useState, useRef, useEffect, memo, ChangeEvent } from "react";
import { usePlayerStore, Track } from "../store/playerStore";
import { FolderSearch, Play, Plus, RefreshCcw } from "lucide-react";
import { formatTime } from "../lib/utils";
import { get, set as setIdb } from 'idb-keyval';
import { extractMetadata } from "../lib/metadataParser";

async function getAudioFilesFromDir(dirHandle: any): Promise<{ audioFiles: File[], lrcFiles: File[] }> {
  const audioFiles: File[] = [];
  const lrcFiles: File[] = [];
  try {
    for await (const entry of dirHandle.values()) {
      if (entry.kind === 'file') {
        if (entry.name.match(/\.(mp3|flac|wav|m4a|aac|ogg|alac)$/i)) {
          audioFiles.push(await entry.getFile());
        } else if (entry.name.match(/\.(lrc|txt)$/i)) {
          lrcFiles.push(await entry.getFile());
        }
      } else if (entry.kind === 'directory') {
        const sub = await getAudioFilesFromDir(entry);
        audioFiles.push(...sub.audioFiles);
        lrcFiles.push(...sub.lrcFiles);
      }
    }
  } catch (e) {
    console.warn("Directory iteration error", e);
  }
  return { audioFiles, lrcFiles };
}

const TrackListItem = memo(({ track, index, onPlay }: { track: Track, index: number, onPlay: (t: Track) => void }) => {
  const { currentTrack, isPlaying, updateTrack } = usePlayerStore();
  const [imageError, setImageError] = useState(false);
  const isActive = currentTrack?.id === track.id;

  useEffect(() => {
    let mounted = true;
    
    // Lazily extract metadata strictly for track listing presentation.
    // It skips extraction if it already has one.
    if (track.file && !track.coverUrl && !imageError) {
      extractMetadata(track.file).then(meta => {
        if (!mounted) return;
        if (meta.coverUrl || meta.title !== track.title) {
          updateTrack(track.id, {
            coverUrl: meta.coverUrl || track.coverUrl,
            title: meta.title || track.title,
            artist: meta.artist || track.artist,
            album: meta.album || track.album
          });
        }
      }).catch(err => {
         if (mounted) setImageError(true);
      });
    }

    return () => { mounted = false; };
  }, [track.file, track.coverUrl, track.id, imageError]);

  return (
    <tr 
      onClick={() => onPlay(track)}
      className={`border-b-2 border-black/20 dark:border-white/20 group hover:bg-neo-yellow dark:hover:bg-neo-pink/20 transition-colors cursor-pointer ${isActive ? 'bg-neo-cyan font-bold dark:bg-neo-cyan/20' : ''}`}
    >
      <td className="p-4 font-mono font-bold w-16 dark:text-white">
        {isActive && isPlaying ? (
            <span className="text-neo-pink text-xl">▶</span>
        ) : (
            <>
              <span className="group-hover:hidden">{index + 1}</span>
              {!isActive && (
                  <span className="hidden group-hover:block text-black dark:text-white animate-pulse"><Play className="w-5 h-5 fill-current"/></span>
              )}
            </>
        )}
      </td>
      <td className="p-4 font-bold text-lg dark:text-white flex items-center gap-3">
        <div className="w-10 h-10 bg-black dark:bg-white text-white dark:text-black flex items-center justify-center font-bold overflow-hidden shrink-0">
            {track.coverUrl && !imageError ? (
               <img 
                 src={track.coverUrl} 
                 alt="Cover" 
                 className="w-full h-full object-cover" 
                 onError={() => setImageError(true)}
               />
            ) : (
                <span>♪</span>
            )}
        </div>
        <span className="truncate">{track.title}</span>
      </td>
      <td className="p-4 font-bold text-zinc-700 dark:text-zinc-300 max-w-[200px] truncate">{track.artist}</td>
      <td className="p-4 font-bold text-zinc-700 dark:text-zinc-300 max-w-[200px] truncate">{track.album}</td>
      <td className="p-4 font-bold text-xs uppercase">
        <span className="bg-black text-white px-2 py-1">{track.fileType.split('/').pop() || 'AUDIO'}</span>
      </td>
    </tr>
  );
});

export function LibraryView() {
  const { library, addTracks, clearLibrary, playTrack, searchQuery } = usePlayerStore();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isScanning, setIsScanning] = useState(false);
  const [savedHandle, setSavedHandle] = useState<any>(null);

  // Cross-origin iframes strict-block showDirectoryPicker. 
  // We check window !== window.top defensively so the fallback triggers safely in AI Studio previews.
  const isIframe = window !== window.top;
  const hasDirPicker = !isIframe && ('showDirectoryPicker' in window);

  useEffect(() => {
    if (hasDirPicker) {
      get('music-dir-handle').then(async handle => {
        if (handle) {
          setSavedHandle(handle);
          // Try to map cached library to real files invisibly in background if permission already granted
          try {
            const perm = await handle.queryPermission({ mode: 'read' });
            if (perm === 'granted') {
              const { audioFiles, lrcFiles } = await getAudioFilesFromDir(handle);
              const fileMap = new Map();
              audioFiles.forEach(f => fileMap.set(`${f.name}-${f.size}-${f.lastModified}`, f));

              const lrcMap = new Map();
              lrcFiles.forEach(f => {
                const baseName = f.name.replace(/\.[^/.]+$/, "");
                lrcMap.set(baseName, f);
              });

              usePlayerStore.setState(state => ({
                library: state.library.map(t => {
                  const parts = t.id.split('-');
                  parts.pop(); // remove idx
                  const uid = parts.join('-');
                  const matchedFile = fileMap.get(uid);
                  const baseName = matchedFile ? matchedFile.name.replace(/\.[^/.]+$/, "") : t.title;
                  const matchedLrc = lrcMap.get(baseName);
                  return matchedFile ? { ...t, file: matchedFile, lrcFile: matchedLrc } : t;
                })
              }));
            }
          } catch (e) {
            console.warn("Auto-permission background check failed", e);
          }
        }
      });
    }
  }, [hasDirPicker]);

  const processFiles = (audioFiles: File[], lrcFiles: File[]) => {
    const lrcMap = new Map();
    lrcFiles.forEach(f => {
       const baseName = f.name.replace(/\.[^/.]+$/, "");
       lrcMap.set(baseName, f);
    });

    const newTracks: Track[] = audioFiles.map((file, idx) => {
      let title = file.name.replace(/\.[^/.]+$/, "");
      let artist = "Unknown Artist";
      let album = "Unknown Album";
      
      const parts = title.split(" - ");
      if (parts.length >= 2) {
        artist = parts[0].trim();
        title = parts.slice(1).join(" - ").trim();
      }

      const lrcFile = lrcMap.get(file.name.replace(/\.[^/.]+$/, ""));

      return {
        id: `${file.name}-${file.size}-${file.lastModified}-${idx}`,
        title,
        artist,
        album,
        duration: 0,
        url: '', 
        file,
        fileType: file.type || file.name.split('.').pop() || 'unknown',
        lrcFile
      };
    });

    clearLibrary();
    addTracks(newTracks);
    if (newTracks.length > 0 && !usePlayerStore.getState().currentTrack) {
        usePlayerStore.getState().playTrack(newTracks[0], newTracks, true);
    }
  };

  const handleFolderSelectFallback = async (e: ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files) return;
    
    setIsScanning(true);
    // @ts-ignore
    const arr = Array.from(files) as File[];
    const audioFiles = arr.filter(file => 
      file.type.startsWith('audio/') || 
      /\.(mp3|flac|wav|m4a|aac|ogg|alac)$/i.test(file.name)
    );
    const lrcFiles = arr.filter(file => 
      /\.(lrc|txt)$/i.test(file.name)
    );
    processFiles(audioFiles, lrcFiles);
    setIsScanning(false);
  };

  const scanNewFolder = async () => {
    if (!hasDirPicker) {
      fileInputRef.current?.click();
      return;
    }

    try {
      // @ts-ignore
      const handle = await window.showDirectoryPicker();
      await setIdb('music-dir-handle', handle);
      setSavedHandle(handle);
      
      setIsScanning(true);
      const { audioFiles, lrcFiles } = await getAudioFilesFromDir(handle);
      processFiles(audioFiles, lrcFiles);
      setIsScanning(false);
    } catch (e) {
      console.warn("User aborted or error", e);
      setIsScanning(false);
    }
  };

  const restoreLibrary = async () => {
    if (!savedHandle) return;
    setIsScanning(true);
    try {
      const permission = await savedHandle.requestPermission({ mode: 'read' });
      if (permission === 'granted') {
        const { audioFiles, lrcFiles } = await getAudioFilesFromDir(savedHandle);
        
        if (library.length > 0) {
           // Re-link existing cache to preserve metadata visually
           const fileMap = new Map();
           audioFiles.forEach(f => fileMap.set(`${f.name}-${f.size}-${f.lastModified}`, f));

           const lrcMap = new Map();
           lrcFiles.forEach(f => {
             const baseName = f.name.replace(/\.[^/.]+$/, "");
             lrcMap.set(baseName, f);
           });

           usePlayerStore.setState(state => ({
             library: state.library.map(t => {
               const parts = t.id.split('-');
               parts.pop();
               const uid = parts.join('-');
               const matchedFile = fileMap.get(uid);
               const baseName = matchedFile ? matchedFile.name.replace(/\.[^/.]+$/, "") : t.title;
               const matchedLrc = lrcMap.get(baseName);
               return matchedFile ? { ...t, file: matchedFile, lrcFile: matchedLrc } : t;
             })
           }));
        } else {
           processFiles(audioFiles, lrcFiles);
        }
      }
    } catch (e) {
      console.error("Failed to restore library", e);
    }
    setIsScanning(false);
  };

  const handlePlayClick = async (track: Track) => {
    // If the file is physically disconnected after a refresh...
    if (!track.file && savedHandle) {
       try {
          setIsScanning(true);
          const perm = await savedHandle.requestPermission({ mode: 'read' });
          if (perm === 'granted') {
             // The user allowed it! Fetch the files
             const { audioFiles, lrcFiles } = await getAudioFilesFromDir(savedHandle);
             const fileMap = new Map();
             audioFiles.forEach(f => fileMap.set(`${f.name}-${f.size}-${f.lastModified}`, f));

             const lrcMap = new Map();
             lrcFiles.forEach(f => {
               const baseName = f.name.replace(/\.[^/.]+$/, "");
               lrcMap.set(baseName, f);
             });

             // Hydrate all library files back onto the objects globally
             usePlayerStore.setState(state => ({
               library: state.library.map(t => {
                 const parts = t.id.split('-');
                 parts.pop();
                 const uid = parts.join('-');
                 const matchedFile = fileMap.get(uid);
                 const baseName = matchedFile ? matchedFile.name.replace(/\.[^/.]+$/, "") : t.title;
                 const matchedLrc = lrcMap.get(baseName);
                 return matchedFile ? { ...t, file: matchedFile, lrcFile: matchedLrc } : t;
               })
             }));

             // Fetch the newly hydrated track object
             const updatedTrack = usePlayerStore.getState().library.find(t => t.id === track.id);
             if (updatedTrack && updatedTrack.file) {
               playTrack(updatedTrack);
             } else {
               console.warn("Track file not found after re-scanning folder.");
             }
          }
       } catch(e) {
          console.warn("Blocked re-scan", e);
       } finally {
          setIsScanning(false);
       }
    } else if (!track.file) {
       alert("Files are unlinked! Please re-scan your folder manually.");
    } else {
       playTrack(track); // Perfectly normal playback
    }
  };

  const filteredLibrary = library.filter(t => 
    t.title.toLowerCase().includes(searchQuery.toLowerCase()) || 
    t.artist.toLowerCase().includes(searchQuery.toLowerCase()) ||
    t.album.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const isUnlinked = library.length > 0 && !library[0].file;

  return (
    <div className="flex-1 overflow-y-auto p-8 relative">
      <div className="flex items-end justify-between mb-8">
        <div>
          <h2 className="text-5xl font-black uppercase tracking-tight dark:text-white" style={{ textShadow: "4px 4px 0px var(--color-neo-lime)" }}>
            Local Library
          </h2>
          <p className="text-xl font-bold mt-2 dark:text-zinc-400">
            {library.length} tracks indexed
          </p>
        </div>
        
        <div className="flex gap-4">
          {!hasDirPicker && (
            <input 
              type="file" 
              // @ts-ignore - webkitdirectory is a non-standard attribute but widely supported
              webkitdirectory="true" 
              directory="true"
              multiple 
              ref={fileInputRef} 
              className="hidden" 
              onChange={handleFolderSelectFallback} 
            />
          )}

          {isUnlinked && savedHandle && (
            <button 
              onClick={restoreLibrary}
              disabled={isScanning}
              className="brutal-btn bg-neo-cyan text-black text-lg gap-2"
            >
              <RefreshCcw className={`w-5 h-5 ${isScanning ? 'animate-spin' : ''}`} strokeWidth={3} />
              {isScanning ? 'Relinking...' : 'Relink Access'}
            </button>
          )}
          
          {savedHandle && library.length === 0 && !isUnlinked && (
            <button 
              onClick={restoreLibrary}
              disabled={isScanning}
              className="brutal-btn bg-neo-cyan text-black text-lg gap-2"
            >
              <RefreshCcw className={`w-5 h-5 ${isScanning ? 'animate-spin' : ''}`} strokeWidth={3} />
              Restore
            </button>
          )}

          <button 
            onClick={scanNewFolder}
            disabled={isScanning}
            className="brutal-btn bg-neo-yellow text-black text-lg gap-2"
          >
            <FolderSearch className="w-6 h-6" strokeWidth={3} />
            {isScanning ? 'Scanning...' : 'Scan Folder'}
          </button>
        </div>
      </div>

      {library.length === 0 ? (
        <div className="h-64 border-4 border-dashed border-black dark:border-white flex flex-col items-center justify-center p-8 text-center mt-12 bg-white/5 dark:bg-black/20">
          <FolderSearch className="w-16 h-16 mb-4 dark:text-white" strokeWidth={2} />
          <h3 className="text-3xl font-black mb-2 dark:text-white">NO MUSIC FOUND</h3>
          <p className="text-lg font-bold dark:text-zinc-400 mb-8">Scan a local directory to add tracks to your library.</p>
          
          {savedHandle && (
            <button 
              onClick={restoreLibrary}
              disabled={isScanning}
              className="brutal-btn bg-neo-cyan text-black px-8 py-3 text-xl gap-2 scale-110 shadow-[4px_4px_0_0_#000]"
            >
              <RefreshCcw className={`w-6 h-6 ${isScanning ? 'animate-spin' : ''}`} strokeWidth={3} />
              Restore Previous Folder
            </button>
          )}
        </div>
      ) : (
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="border-b-4 border-black dark:border-white">
              <th className="pb-4 pt-2 px-4 text-left font-black uppercase text-xl dark:text-white">#</th>
              <th className="pb-4 pt-2 px-4 text-left font-black uppercase text-xl dark:text-white">Title</th>
              <th className="pb-4 pt-2 px-4 text-left font-black uppercase text-xl dark:text-white">Artist</th>
              <th className="pb-4 pt-2 px-4 text-left font-black uppercase text-xl dark:text-white">Album</th>
              <th className="pb-4 pt-2 px-4 text-left font-black uppercase text-xl dark:text-white">Format</th>
            </tr>
          </thead>
          <tbody>
            {filteredLibrary.map((track, i) => (
              <TrackListItem key={track.id} track={track} index={i} onPlay={handlePlayClick} />
            ))}
          </tbody>
        </table>
      )}
    </div>
  );
}
