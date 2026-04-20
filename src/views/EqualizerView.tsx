import { useState } from "react";
import { Sliders } from "lucide-react";

export function EqualizerView() {
  const bands = ["32", "64", "125", "250", "500", "1k", "2k", "4k", "8k", "16k"];
  const [values, setValues] = useState<number[]>(new Array(10).fill(0));
  const presets = ["Flat", "Bass Boost", "Vocal", "Rock", "Jazz", "Electronic"];
  const [activePreset, setActivePreset] = useState("Flat");

  const handleSlider = (index: number, val: number) => {
    const newVals = [...values];
    newVals[index] = val;
    setValues(newVals);
    setActivePreset("Custom");
  };

  const applyPreset = (preset: string) => {
    setActivePreset(preset);
    if (preset === "Flat") setValues(new Array(10).fill(0));
    if (preset === "Bass Boost") setValues([6, 5, 4, 1, 0, 0, 0, 0, 0, 0]);
    if (preset === "Vocal") setValues([-2, -1, 0, 2, 4, 4, 2, 0, -1, -2]);
    if (preset === "Rock") setValues([4, 3, 0, -1, -2, -1, 0, 2, 3, 4]);
    if (preset === "Jazz") setValues([3, 2, 1, 2, -1, -1, 0, 1, 2, 3]);
    if (preset === "Electronic") setValues([5, 4, 1, 0, -2, 0, 1, 3, 5, 4]);
  };

  return (
    <div className="flex-1 overflow-y-auto p-8 relative flex flex-col">
      <div className="mb-8 flex items-end justify-between">
        <div>
          <h2 className="text-5xl font-black uppercase tracking-tight dark:text-white" style={{ textShadow: "4px 4px 0px var(--color-neo-cyan)" }}>
            Equalizer
          </h2>
          <p className="text-xl font-bold mt-2 dark:text-zinc-400">10-Band DSP Setup</p>
        </div>
      </div>

      <div className="flex gap-4 mb-12 flex-wrap">
        {presets.map(p => (
          <button 
            key={p} 
            onClick={() => applyPreset(p)}
            className={`brutal-btn text-black ${activePreset === p ? 'bg-neo-pink' : 'bg-white'}`}
          >
            {p}
          </button>
        ))}
      </div>

      <div className="flex-1 flex items-end justify-between gap-2 max-w-5xl bg-neo-bg dark:bg-zinc-800 p-8 brutal-border shadow-[8px_8px_0_0_#000] dark:shadow-[8px_8px_0_0_#fff]">
        {bands.map((freq, i) => (
          <div key={freq} className="flex flex-col items-center gap-4 flex-1">
            <span className="font-mono font-bold dark:text-white">{values[i] > 0 ? `+${values[i]}` : values[i]} dB</span>
            <div className="relative h-64 w-8 flex justify-center bg-black/10 dark:bg-white/10 brutal-border border-2">
              <input
                type="range"
                min="-12"
                max="12"
                step="0.5"
                value={values[i]}
                onChange={(e) => handleSlider(i, parseFloat(e.target.value))}
                className="absolute w-64 h-8 appearance-none bg-transparent cursor-pointer"
                style={{
                  transform: "rotate(270deg)",
                  transformOrigin: "center center",
                  top: "112px",
                }}
              />
              <div 
                className="absolute w-12 h-6 bg-neo-cyan brutal-border border-2 pointer-events-none"
                style={{ bottom: `${((values[i] + 12) / 24) * 100}%`, transform: 'translateY(50%)' }}
              />
            </div>
            <span className="font-mono font-bold text-sm dark:text-zinc-400">{freq}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
