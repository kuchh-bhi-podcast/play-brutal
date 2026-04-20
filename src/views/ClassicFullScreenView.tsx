import { usePlayerStore } from "../store/playerStore";
import { Minimize2, Mic2 } from "lucide-react";
import { useRef, useEffect, useState } from "react";
import { motion } from "motion/react";

export function ClassicFullScreenView() {
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
    <div className="fixed inset-0 z-[100] bg-neo-bg dark:bg-neo-dark flex flex-row overflow-hidden font-sans">
      
      <button 
        onClick={() => setFullScreenMode(null)}
        className="absolute top-8 right-8 z-[110] p-4 brutal-btn bg-white dark:bg-black text-black dark:text-white flex items-center justify-center scale-110 group"
      >
        <Minimize2 className="w-6 h-6 group-hover:scale-125 transition-transform" strokeWidth={3} />
      </button>

      {/* Left side: Brutalist Album Art & Track details */}
      <div className="w-1/2 h-full flex flex-col items-center justify-center p-16 z-10 border-r-8 border-black dark:border-white bg-neo-yellow dark:bg-neo-pink/20">
        <motion.div 
          key={currentTrack?.id}
          initial={{ x: -100, opacity: 0 }}
          animate={{ x: 0, opacity: 1 }}
          className="w-full max-w-md xl:max-w-xl aspect-square brutal-border bg-white dark:bg-black shadow-[16px_16px_0_0_#000] dark:shadow-[16px_16px_0_0_#fff] mb-12 flex items-center justify-center overflow-hidden"
        >
          {currentTrack?.coverUrl && !imageError ? (
            <img 
              src={currentTrack.coverUrl} 
              alt="Album Art" 
              className="w-full h-full object-cover" 
              onError={() => setImageError(true)}
            />
          ) : (
            <div className="w-full h-full flex items-center justify-center font-black text-9xl text-black dark:text-white bg-neo-cyan">
              ♪
            </div> 
          )}
        </motion.div>
        
        <motion.div 
          key={currentTrack?.title}
          initial={{ y: 50, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ delay: 0.2 }}
          className="text-center w-full max-w-md xl:max-w-xl brutal-border bg-white dark:bg-black p-6 shadow-[8px_8px_0_0_#000] dark:shadow-[8px_8px_0_0_#fff]"
        >
          <h2 className="text-4xl lg:text-5xl font-black tracking-tight text-black dark:text-white mb-2 truncate uppercase">
            {currentTrack?.title || "No track playing"}
          </h2>
          <p className="text-2xl font-bold text-zinc-600 dark:text-zinc-400 truncate uppercase">
            {currentTrack?.artist || "Unknown Artist"}
          </p>
        </motion.div>
      </div>

      {/* Right side: Brutalist Scrolling Lyrics */}
      <div className="w-1/2 h-full flex flex-col relative z-10 bg-neo-lime dark:bg-neo-cyan/20">
        {!currentTrack ? (
          <div className="flex-1 flex flex-col items-center justify-center text-center opacity-30">
            <Mic2 className="w-32 h-32 mb-6 text-black dark:text-white" strokeWidth={2}/>
            <h3 className="text-5xl font-black text-black dark:text-white uppercase tracking-tighter">Waiting...</h3>
          </div>
        ) : (!currentLyrics || currentLyrics.lines.length === 0) ? (
          <div className="flex-1 flex flex-col items-center justify-center text-center px-12">
            <motion.div 
              initial={{ scale: 0.8, rotate: -5 }}
              animate={{ scale: 1, rotate: 0 }}
              className="brutal-border bg-white dark:bg-black p-12 shadow-[12px_12px_0_0_#000] dark:shadow-[12px_12px_0_0_#fff] text-center"
            >
               <Mic2 className="w-24 h-24 mb-6 text-black dark:text-white mx-auto" strokeWidth={2}/>
               <h3 className="text-4xl font-black text-black dark:text-white mb-4 uppercase">Instrumental</h3>
               <p className="text-2xl font-bold text-zinc-600 dark:text-zinc-400 uppercase">No lyrics available</p>
            </motion.div>
          </div>
        ) : (
          <div 
            className="flex-1 overflow-y-auto w-full py-40 px-12 lg:px-24 scroll-smooth hide-scrollbar" 
            ref={scrollRef}
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
                  <motion.div 
                    key={i} 
                    animate={{
                      scale: isActive ? 1.02 : 1,
                      x: isActive ? 6 : 0,
                      rotate: 0,
                    }}
                    className={`font-black text-4xl lg:text-5xl xl:text-6xl leading-relaxed uppercase flex flex-wrap gap-x-3 gap-y-3 p-4 transition-colors duration-300 ${
                      isActive 
                        ? 'active-lyric text-black dark:text-white bg-white dark:bg-black brutal-border shadow-[4px_4px_0_0_var(--color-neo-pink)]'
                        : isPast 
                          ? 'text-black/40 dark:text-white/40'
                          : 'text-black/20 dark:text-white/20'
                    }`}
                  >
                    {!currentLyrics.isSynced || !line.words || !detailedLyricsEnabled ? (line.text || "♪") : (
                      line.words.map((w, wIdx) => {
                        const isWordPast = progress >= w.time;
                        const isCurrentlyPlayingWord = progress >= w.time && progress <= w.time + w.duration;
                        
                        return (
                          <motion.span 
                            key={wIdx}
                            animate={{
                              backgroundColor: isCurrentlyPlayingWord ? "#FFD600" : "transparent",
                              color: isCurrentlyPlayingWord ? "#000" : "inherit",
                              translateY: isCurrentlyPlayingWord ? -2 : 0,
                              rotate: isCurrentlyPlayingWord ? -1 : 0,
                              boxShadow: isCurrentlyPlayingWord ? "2px 2px 0 0 #000" : "none",
                              paddingLeft: isCurrentlyPlayingWord ? "4px" : "0px",
                              paddingRight: isCurrentlyPlayingWord ? "4px" : "0px",
                            }}
                            className="inline-block transition-all duration-150 border-black dark:border-white"
                          >
                            {w.text}
                          </motion.span>
                        );
                      })
                    )}
                  </motion.div>
                )
              })}
            </div>
          </div>
        )}
      </div>

    </div>
  );
}
