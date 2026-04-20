import { usePlayerStore } from "../store/playerStore";
import { Mic2, Download } from "lucide-react";
import { useRef, useEffect, ChangeEvent } from "react";
import { motion, AnimatePresence } from "motion/react";

export function LyricsView() {
  const { currentTrack, currentLyrics, progress, setLyrics, detailedLyricsEnabled } = usePlayerStore();
  const scrollRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

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

  const handleLrcUpload = (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (e) => {
      const text = e.target?.result as string;
      if (text) setLyrics(text);
    };
    reader.readAsText(file);
  };

  return (
    <div className="flex-1 flex flex-col p-8 relative overflow-hidden bg-neo-yellow/20 dark:bg-neo-pink/10 transition-colors">
      <div className="flex justify-between items-center mb-8 z-10 shrink-0">
        <h2 className="text-5xl font-black uppercase tracking-tight dark:text-white" style={{ textShadow: "4px 4px 0px var(--color-neo-lime)" }}>
          Lyrics
        </h2>
        
        <div className="flex gap-4">
          <input 
            type="file" 
            accept=".lrc,.txt" 
            ref={fileInputRef} 
            className="hidden" 
            onChange={handleLrcUpload} 
          />
          <button 
            onClick={() => fileInputRef.current?.click()}
            className="brutal-btn bg-white text-black gap-2 cursor-pointer group"
          >
            <Download className="w-5 h-5 group-hover:bounce" strokeWidth={3}/> Load .LRC
          </button>
        </div>
      </div>

      {!currentTrack ? (
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 0.5, y: 0 }}
          className="flex-1 flex flex-col items-center justify-center text-center z-10"
        >
          <Mic2 className="w-24 h-24 mb-4 dark:text-white text-black" strokeWidth={2}/>
          <h3 className="text-3xl font-black mb-2 dark:text-white">NO TRACK PLAYING</h3>
        </motion.div>
      ) : !currentLyrics || currentLyrics.lines.length === 0 ? (
        <motion.div 
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="flex-1 flex flex-col items-center justify-center text-center z-10 space-y-4"
        >
          <Mic2 className="w-16 h-16 dark:text-white text-black opacity-30" strokeWidth={2}/>
          <h3 className="text-2xl font-black dark:text-white">NO LYRICS FOUND</h3>
          <p className="font-bold dark:text-zinc-400 max-w-sm">This file doesn't contain embedded sync lyrics. You can upload an .LRC file manually.</p>
        </motion.div>
      ) : (
        <div className="flex-1 overflow-y-auto z-10 py-12 hide-scrollbar" ref={scrollRef}>
          <div className="max-w-4xl mx-auto space-y-12 text-center pb-[60vh] px-4">
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
                  initial={false}
                  animate={{
                    scale: isActive ? 1.05 : 1,
                    opacity: isActive ? 1 : (isPast ? 0.5 : 0.2),
                    filter: detailedLyricsEnabled ? (isActive ? 'blur(0px)' : (isPast ? 'blur(0px)' : 'blur(2px)')) : 'none',
                    y: 0
                  }}
                  transition={{ type: "spring", stiffness: 300, damping: 30 }}
                  className={`font-black text-4xl md:text-5xl lg:text-6xl leading-normal flex flex-wrap justify-center gap-x-3 gap-y-4 ${
                    isActive ? 'active-lyric text-black dark:text-white z-10 relative' : ''
                  }`}
                >
                  {!currentLyrics.isSynced || !line.words || !detailedLyricsEnabled ? (
                      <span style={{ 
                        color: isActive ? "var(--color-neo-pink)" : "inherit", 
                        textShadow: isActive ? "0px 2px 10px rgba(255,105,180,0.5)" : "none",
                        transition: "color 0.3s, text-shadow 0.3s"
                      }}>{line.text || "♪"}</span>
                    ) : (
                    line.words.map((w, wIdx) => {
                      const isWordPast = progress >= w.time;
                      const isCurrentlyPlayingWord = progress >= w.time && progress <= w.time + w.duration;
                      
                      return (
                        <motion.span 
                          key={wIdx}
                          animate={{
                            color: isCurrentlyPlayingWord ? "var(--color-neo-pink)" : "inherit",
                            opacity: isCurrentlyPlayingWord ? 1 : (isWordPast ? 1 : 0.4),
                            scale: isCurrentlyPlayingWord ? 1.05 : 1,
                            y: isCurrentlyPlayingWord ? -2 : 0,
                            textShadow: isCurrentlyPlayingWord
                              ? "0px 2px 10px rgba(255,105,180,0.6)" 
                              : "none"
                          }}
                          className="inline-block transition-all duration-150"
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

      {/* Dynamic Background */}
      {detailedLyricsEnabled && (
        <motion.div 
          animate={{
            scale: [1, 1.2, 1],
            rotate: [0, 90, 180, 270, 360],
          }}
          transition={{ duration: 20, repeat: Infinity, ease: "linear" }}
          className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[800px] bg-neo-lime/5 dark:bg-neo-pink/5 blur-[120px] rounded-full pointer-events-none -z-10" 
        />
      )}
    </div>
  );
}
