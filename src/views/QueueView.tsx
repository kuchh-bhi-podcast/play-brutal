import { usePlayerStore } from "../store/playerStore";
import { ListVideo, GripVertical } from "lucide-react";
import { Reorder } from "motion/react";

export function QueueView() {
  const { queue, queueIndex, playTrack, currentTrack, isPlaying, reorderQueue } = usePlayerStore();

  return (
    <div className="flex-1 overflow-y-auto p-8 relative">
      <div className="mb-8">
        <h2 className="text-5xl font-black uppercase tracking-tight dark:text-white" style={{ textShadow: "4px 4px 0px var(--color-neo-yellow)" }}>
          Queue
        </h2>
        <p className="text-xl font-bold mt-2 dark:text-zinc-400">
          Now playing & upcoming tracks
        </p>
      </div>

      {queue.length === 0 ? (
        <div className="h-64 border-4 border-dashed border-black dark:border-white flex flex-col items-center justify-center p-8 text-center mt-12 bg-white/50 dark:bg-black/50">
          <ListVideo className="w-16 h-16 mb-4 dark:text-white" strokeWidth={2} />
          <h3 className="text-3xl font-black mb-2 dark:text-white">QUEUE IS EMPTY</h3>
        </div>
      ) : (
        <div className="w-full text-left">
          <div className="flex border-b-4 border-black dark:border-white w-full">
            <div className="pb-4 pt-2 px-4 text-left font-black uppercase text-xl dark:text-white w-12"></div>
            <div className="pb-4 pt-2 px-4 text-left font-black uppercase text-xl dark:text-white w-16">#</div>
            <div className="pb-4 pt-2 px-4 text-left font-black uppercase text-xl dark:text-white flex-1">Title</div>
            <div className="pb-4 pt-2 px-4 text-left font-black uppercase text-xl dark:text-white flex-1">Artist</div>
          </div>
          <Reorder.Group axis="y" values={queue} onReorder={reorderQueue} className="w-full">
            {queue.map((track, i) => {
              const isActive = currentTrack?.queueId ? currentTrack.queueId === track.queueId : currentTrack?.id === track.id;
              const isPast = i < queueIndex;
              return (
                <Reorder.Item 
                  key={track.queueId || `${track.id}-${i}`} 
                  value={track}
                  className={`flex items-center w-full border-b-2 border-black/20 dark:border-white/20 group transition-colors select-none ${
                    isActive ? 'bg-neo-cyan font-bold dark:bg-neo-cyan/20' : 
                    isPast ? 'opacity-50 hover:opacity-100 hover:bg-zinc-100 dark:hover:bg-zinc-800' :
                    'hover:bg-neo-yellow dark:hover:bg-neo-pink/20 bg-white dark:bg-[#121212]'
                  }`}
                >
                  <div className="p-4 w-12 flex items-center justify-center cursor-grab active:cursor-grabbing text-gray-400 hover:text-black dark:hover:text-white">
                     <GripVertical size={20} />
                  </div>
                  <div 
                    className="flex-1 flex w-full cursor-pointer"
                    onDoubleClick={() => playTrack(track, queue)}
                  >
                    <div className="p-4 font-mono font-bold w-16 dark:text-white flex items-center">
                      {isActive && isPlaying ? (
                         <span className="text-neo-pink text-xl">▶</span>
                      ) : (i + 1)}
                    </div>
                    <div className="p-4 font-bold text-lg dark:text-white flex-1 items-center flex gap-3">
                      <span className="truncate">{track.title}</span>
                    </div>
                    <div className="p-4 font-bold text-zinc-700 dark:text-zinc-300 flex-1 flex items-center">{track.artist}</div>
                  </div>
                </Reorder.Item>
              )
            })}
          </Reorder.Group>
        </div>
      )}
    </div>
  );
}
