import { usePlayerStore } from "../store/playerStore";
import { Mic2, Minimize2 } from "lucide-react";
import { useRef, useEffect, useState } from "react";
import { motion, AnimatePresence } from "motion/react";

export function FullScreenView() {
  const { currentTrack, currentLyrics, progress, setFullScreenMode, detailedLyricsEnabled } = usePlayerStore();
  const scrollRef = useRef<HTMLDivElement>(null);
  const [imageError, setImageError] = useState(false);

  useEffect(() => {
    setImageError(false);
  }, [currentTrack?.id]);

  // Scroll to active line (sync mode)
  useEffect(() => {
    if (currentLyrics?.isSynced && scrollRef.current) {
      const activeLines = scrollRef.current.querySelectorAll('.active-lyric');
      if (activeLines.length > 0) {
        activeLines[activeLines.length - 1].scrollIntoView({
          behavior: "smooth",
          block: "center",
        });
      }
    }
  }, [progress, currentLyrics]);

  return (
    <div className="fixed inset-0 z-[100] bg-black flex flex-row overflow-hidden font-sans">
      
      {/* Cinematic Background Decor */}
      <div className="absolute inset-0 z-0 pointer-events-none overflow-hidden flex items-center justify-center">
        <AnimatePresence mode="wait">
          <motion.div
            key={currentTrack?.id || 'empty'}
            initial={{ opacity: 0 }}
            animate={{ opacity: 0.4 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 1.5 }}
            className="absolute inset-0"
          >
            {currentTrack?.coverUrl && !imageError ? (
              <img 
                src={currentTrack.coverUrl} 
                alt="Blur Background" 
                className="w-full h-full object-cover blur-[100px] scale-125 select-none transition-transform duration-[10000ms] ease-out"
                style={{ transform: 'scale(1.3) rotate(5deg)' }}
              />
            ) : (
              <div className="w-full h-full bg-zinc-900" />
            )}
          </motion.div>
        </AnimatePresence>
        <div className="absolute inset-0 bg-gradient-to-r from-black/90 via-black/40 to-black/90" />
      </div>

      <button 
        onClick={() => setFullScreenMode(null)}
        className="absolute top-10 right-10 z-[110] p-4 rounded-full bg-white/5 hover:bg-white/20 hover:scale-105 transition-all duration-300 text-white backdrop-blur-md border border-white/10 flex items-center justify-center group"
      >
        <Minimize2 className="w-6 h-6 group-hover:rotate-12 transition-transform" strokeWidth={1.5} />
      </button>

      {/* Left side: Clean Album Art & Track details */}
      <div className="w-1/2 h-full flex flex-col items-center justify-center p-16 z-10 relative">
        <motion.div 
          key={currentTrack?.id}
          initial={{ scale: 0.9, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ type: "spring", stiffness: 200, damping: 25 }}
          className="w-full max-w-md xl:max-w-xl aspect-square shadow-[0_0_50px_rgba(0,0,0,0.8)] mb-12 flex items-center justify-center overflow-hidden rounded-2xl bg-white/5 border border-white/10"
        >
          {currentTrack?.coverUrl && !imageError ? (
            <img 
              src={currentTrack.coverUrl} 
              alt="Album Art" 
              className="w-full h-full object-cover" 
              onError={() => setImageError(true)}
            />
          ) : (
            <div className="w-full h-full flex items-center justify-center font-light text-9xl text-white/10">
              ♪
            </div> 
          )}
        </motion.div>
        
        <div className="text-center w-full max-w-md xl:max-w-xl">
          <motion.h2 
            key={currentTrack?.title}
            initial={{ y: 20, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            className="text-4xl lg:text-5xl font-extrabold tracking-tight text-white mb-3 line-clamp-2 leading-tight drop-shadow-2xl"
          >
            {currentTrack?.title || "No track playing"}
          </motion.h2>
          <motion.p 
            key={currentTrack?.artist}
            initial={{ y: 10, opacity: 0 }}
            animate={{ y: 0, opacity: 0.6 }}
            className="text-xl font-medium text-white drop-shadow-md"
          >
            {currentTrack?.artist || "Unknown Artist"}
          </motion.p>
        </div>
      </div>

      {/* Right side: Minimal Scrolling Lyrics */}
      <div className="w-1/2 h-full flex flex-col relative z-10">
        {!currentTrack ? (
          <div className="flex-1 flex flex-col items-center justify-center text-center opacity-30">
            <Mic2 className="w-24 h-24 mb-6 text-white" strokeWidth={1}/>
            <h3 className="text-3xl font-light text-white tracking-widest">WAITING...</h3>
          </div>
        ) : (!currentLyrics || currentLyrics.lines.length === 0) ? (
          <div className="flex-1 flex flex-col items-center justify-center text-center opacity-30 px-12">
            <Mic2 className="w-16 h-16 mb-4 text-white" strokeWidth={1}/>
            <h3 className="text-2xl font-medium text-white mb-2 tracking-widest uppercase">Instrumental</h3>
            <p className="text-lg font-light text-white/50">No lyrics available for this track</p>
          </div>
        ) : (
          <div 
            className="flex-1 overflow-y-auto w-full py-40 px-12 lg:px-24 scroll-smooth hide-scrollbar" 
            ref={scrollRef}
            style={{ 
              maskImage: 'linear-gradient(to bottom, transparent, black 15%, black 85%, transparent)',
              WebkitMaskImage: 'linear-gradient(to bottom, transparent, black 15%, black 85%, transparent)'
            }}
          >
            <div className="space-y-12 pb-[60vh]">
              {currentLyrics.lines.map((line, i) => {
                let isActive = false;
                let isPast = false;

                if (currentLyrics.isSynced) {
                  isActive = progress >= line.time && (i === currentLyrics.lines.length - 1 || progress < currentLyrics.lines[i + 1].time);
                  isPast = progress >= line.time;
                }

                return (
                  <motion.p 
                    key={i} 
                    animate={{
                      opacity: isActive ? 1 : (isPast ? 0.3 : 0.1),
                      scale: isActive ? 1.02 : 1,
                      filter: detailedLyricsEnabled ? (isActive ? 'blur(0px)' : (isPast ? 'blur(0px)' : 'blur(3px)')) : 'none',
                    }}
                    className={`font-bold text-3xl lg:text-4xl xl:text-5xl leading-relaxed origin-left flex flex-wrap gap-x-2 gap-y-3 ${
                      isActive ? 'active-lyric text-white' : 'text-white'
                    }`}
                  >
                    {!currentLyrics.isSynced || !line.words || !detailedLyricsEnabled ? (
                      <span style={{
                        color: isActive ? "#35F2FF" : "inherit",
                        textShadow: isActive ? "0 2px 15px rgba(53,242,255,0.4)" : "none",
                        transition: "all 0.3s"
                      }}>{line.text || "♪"}</span>
                    ) : (
                      line.words.map((w, wIdx) => {
                        const isWordPast = progress >= w.time;
                        const isCurrentlyPlayingWord = progress >= w.time && progress <= w.time + w.duration;
                        
                        return (
                          <motion.span 
                            key={wIdx}
                            animate={{
                              color: isCurrentlyPlayingWord ? "#35F2FF" : "inherit",
                              opacity: isCurrentlyPlayingWord ? 1 : (isWordPast ? 1 : 0.4),
                              textShadow: isCurrentlyPlayingWord ? "0 2px 12px rgba(53,242,255,0.5)" : "none",
                              scale: isCurrentlyPlayingWord ? 1.02 : 1,
                              y: isCurrentlyPlayingWord ? -2 : 0
                            }}
                            className="inline-block transition-all duration-150"
                          >
                            {w.text}
                          </motion.span>
                        );
                      })
                    )}
                  </motion.p>
                )
              })}
            </div>
          </div>
        )}
      </div>

    </div>
  );
}
