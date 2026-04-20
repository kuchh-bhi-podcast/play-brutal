import { Play, Pause, SkipBack, SkipForward, Shuffle, Repeat, Volume2, Mic2, Maximize2, Heart, Monitor } from "lucide-react";
import { usePlayerStore, audioInstance } from "../store/playerStore";
import { formatTime } from "../lib/utils";
import { useState, useEffect, ChangeEvent } from "react";

export function BottomPlayer() {
  const { currentTrack, isPlaying, volume, progress, duration, togglePlayPause, nextTrack, prevTrack, setVolume, setActiveView, isMiniPlayer, toggleMiniPlayer, fullScreenMode, setFullScreenMode } = usePlayerStore();
  const [imageError, setImageError] = useState(false);

  // Reset image error state when tracking changes
  useEffect(() => {
    setImageError(false);
  }, [currentTrack?.id]);

  const handleSeek = (e: ChangeEvent<HTMLInputElement>) => {
    const val = parseFloat(e.target.value);
    audioInstance.currentTime = val;
    usePlayerStore.getState().setProgress(val);
  };

  const handleVolume = (e: ChangeEvent<HTMLInputElement>) => {
    const val = parseFloat(e.target.value);
    setVolume(val);
  };

  const isHiRes = currentTrack ? (currentTrack.fileType.includes('flac') || currentTrack.fileType.includes('wav')) : false;

  return (
    <div className="h-32 border-t-4 border-black dark:border-white bg-white dark:bg-black shrink-0 flex flex-col justify-between px-6 py-2 transition-colors duration-300 relative z-50">
      
      {/* Progress Bar */}
      <div className="flex items-center gap-4 w-full mb-1">
        <span className="font-mono font-bold text-sm dark:text-white w-12 text-right">{formatTime(progress)}</span>
        <input
          type="range"
          min="0"
          max={duration || 100}
          value={progress || 0}
          onChange={handleSeek}
          className="flex-1 h-3 appearance-none brutal-border cursor-pointer"
          style={{ background: `linear-gradient(to right, var(--color-neo-pink) ${(progress/(duration||1))*100}%, #EAEAEA ${(progress/(duration||1))*100}%)` }}
        />
        <span className="font-mono font-bold text-sm dark:text-white w-12">{formatTime(duration)}</span>
      </div>

      <div className="flex items-center justify-between flex-1">
        
        {/* Track Info */}
        <div className="flex items-center gap-4 w-1/3 min-w-0">
          <div className="w-16 h-16 brutal-border bg-neo-yellow shadow-[2px_2px_0_0_#000] dark:shadow-[2px_2px_0_0_#fff] shrink-0 flex items-center justify-center overflow-hidden">
            {currentTrack?.coverUrl && !imageError ? (
               <img 
                 src={currentTrack.coverUrl} 
                 alt="Album Art" 
                 className="w-full h-full object-cover" 
                 onError={() => setImageError(true)}
               />
            ) : currentTrack ? (
               <div className="w-full h-full bg-neo-pink/20 animate-pulse flex items-center justify-center font-bold text-3xl text-black">♪</div> 
            ) : (
               <div className="w-full h-full bg-zinc-200 dark:bg-zinc-800" />
            )}
          </div>
          <div className="min-w-0 flex-1 truncate">
            <h3 className="font-bold text-lg truncate dark:text-white leading-none mb-1">
              {currentTrack?.title || "No track playing"}
            </h3>
            <p className="text-zinc-600 dark:text-zinc-400 font-bold text-sm truncate">
              {currentTrack?.artist || "Unknown Artist"}
            </p>
            {isHiRes && (
              <span className="inline-block mt-1 bg-neo-cyan text-black text-[10px] font-black px-1.5 py-0.5 border-2 border-black">
                HI-RES LOSSLESS
              </span>
            )}
          </div>
          {currentTrack && (
            <button className="brutal-btn bg-white dark:bg-zinc-800 text-black dark:text-white p-2">
              <Heart className="w-5 h-5" />
            </button>
          )}
        </div>

        {/* Controls */}
        <div className="flex items-center gap-4 justify-center w-1/3">
          <button className="p-2 hover:bg-neo-bg dark:hover:bg-zinc-800 rounded-none border-2 border-transparent hover:border-black dark:hover:border-white transition-colors dark:text-white">
            <Shuffle className="w-6 h-6" strokeWidth={2.5}/>
          </button>
          <button onClick={prevTrack} className="brutal-btn bg-white dark:bg-zinc-800 text-black dark:text-white px-3 py-2">
            <SkipBack className="w-6 h-6" strokeWidth={3} />
          </button>
          
          <button 
            onClick={togglePlayPause} 
            className="brutal-btn bg-neo-lime text-black px-6 py-3 scale-110"
            style={{ boxShadow: "4px 4px 0px 0px #000" }}
          >
            {isPlaying ? <Pause className="w-8 h-8" strokeWidth={3}/> : <Play className="w-8 h-8" strokeWidth={3}/>}
          </button>
          
          <button onClick={nextTrack} className="brutal-btn bg-white dark:bg-zinc-800 text-black dark:text-white px-3 py-2">
            <SkipForward className="w-6 h-6" strokeWidth={3} />
          </button>
          <button className="p-2 hover:bg-neo-bg dark:hover:bg-zinc-800 rounded-none border-2 border-transparent hover:border-black dark:hover:border-white transition-colors dark:text-white">
            <Repeat className="w-6 h-6" strokeWidth={2.5}/>
          </button>
        </div>

        {/* Right Tools */}
        <div className="flex items-center gap-4 justify-end w-1/3">
          <button 
            onClick={() => setActiveView('lyrics')} 
            className="p-2 hover:bg-neo-yellow rounded-none border-2 border-transparent hover:border-black transition-colors dark:text-white dark:hover:text-black"
          >
            <Mic2 className="w-6 h-6" strokeWidth={2.5}/>
          </button>
          
          <div className="flex items-center gap-2">
            <Volume2 className="w-6 h-6 dark:text-white" strokeWidth={2.5}/>
            <input
              type="range"
              min="0"
              max="1"
              step="0.01"
              value={volume}
              onChange={handleVolume}
              className="w-24 h-3 appearance-none brutal-border cursor-pointer bg-white"
              style={{ background: `linear-gradient(to right, var(--color-neo-green, #000) ${volume*100}%, #EAEAEA ${volume*100}%)` }}
            />
          </div>

          <button 
            onClick={toggleMiniPlayer}
            className="p-2 bg-neo-cyan brutal-border hover:scale-105 transition-transform text-black shadow-[2px_2px_0_0_#000] ml-2"
            title="Mini Player"
          >
            <Maximize2 className="w-5 h-5" strokeWidth={3}/>
          </button>

          <button 
            onClick={() => setFullScreenMode(fullScreenMode === 'classic' ? null : 'classic')}
            className="p-2 bg-neo-lime brutal-border hover:scale-105 transition-transform text-black shadow-[2px_2px_0_0_#000]"
            title="Classic Lyrics Mode"
          >
            <Monitor className="w-5 h-5" strokeWidth={3}/>
          </button>

          <button 
            onClick={() => setFullScreenMode(fullScreenMode === 'cinematic' ? null : 'cinematic')}
            className="p-2 bg-neo-yellow brutal-border hover:scale-105 transition-transform text-black shadow-[2px_2px_0_0_#000]"
            title="Cinematic Lyrics Mode"
          >
            <Monitor className="w-5 h-5" strokeWidth={3}/>
          </button>
        </div>

      </div>
    </div>
  );
}
