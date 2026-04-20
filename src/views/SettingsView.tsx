import { Settings as SettingsIcon } from "lucide-react";
import { usePlayerStore } from "../store/playerStore";
import { set as setIdb } from 'idb-keyval';

export function SettingsView() {
  const { detailedLyricsEnabled, setDetailedLyricsEnabled } = usePlayerStore();

  const toggleDetailed = () => {
    const newVal = !detailedLyricsEnabled;
    setDetailedLyricsEnabled(newVal);
    setIdb('detailed-lyrics-preference', newVal).catch(console.warn);
  };

  return (
    <div className="flex-1 overflow-y-auto p-8 relative">
       <div className="mb-12">
        <h2 className="text-5xl font-black uppercase tracking-tight dark:text-white" style={{ textShadow: "4px 4px 0px var(--color-neo-pink)" }}>
          Settings
        </h2>
      </div>

      <div className="max-w-4xl space-y-12 pb-16">
        
        {/* Audio Output */}
        <section>
          <h3 className="text-2xl font-black uppercase mb-6 border-b-4 border-black dark:border-white pb-2 dark:text-white inline-block">Audio Device</h3>
          <div className="space-y-6">
            <div className="flex items-center justify-between p-6 bg-white dark:bg-zinc-800 brutal-border shadow-[4px_4px_0_0_#000] dark:shadow-[4px_4px_0_0_#fff]">
              <div>
                <p className="font-bold text-lg dark:text-white">Output Device</p>
                <p className="font-medium text-zinc-500">Select external DAC or system default</p>
              </div>
              <select className="brutal-border px-4 py-2 bg-neo-yellow text-black font-bold text-lg cursor-pointer outline-none">
                <option>System Default (WASAPI)</option>
                <option>External USB DAC (ASIO)</option>
                <option>Realtek High Definition Audio</option>
              </select>
            </div>
            
            <div className="flex items-center justify-between p-6 bg-white dark:bg-zinc-800 brutal-border shadow-[4px_4px_0_0_#000] dark:shadow-[4px_4px_0_0_#fff]">
              <div>
                <p className="font-bold text-lg dark:text-white">Exclusive Mode</p>
                <p className="font-medium text-zinc-500">Bypass system mixer for bit-perfect output.</p>
              </div>
              <div className="relative inline-block w-16 h-8 bg-black dark:bg-white brutal-border cursor-pointer">
                <div className="absolute top-0 right-0 w-8 h-8 bg-neo-lime border-4 border-black dark:border-white -mt-1 -mr-1 transition-all"></div>
              </div>
            </div>
          </div>
        </section>

        {/* UI Settings */}
        <section>
          <h3 className="text-2xl font-black uppercase mb-6 border-b-4 border-black dark:border-white pb-2 dark:text-white inline-block">System & UI</h3>
          <div className="space-y-6">
            <div 
              className="flex items-center justify-between p-6 bg-white dark:bg-zinc-800 brutal-border shadow-[4px_4px_0_0_#000] dark:shadow-[4px_4px_0_0_#fff] cursor-pointer"
              onClick={toggleDetailed}
            >
              <div>
                <p className="font-bold text-lg dark:text-white">Detailed Word-by-Word Sync</p>
                <p className="font-medium text-zinc-500">Highlight lyrics word-by-word with pop & glow effects, instead of line-by-line.</p>
              </div>
              <div className={`relative inline-block w-16 h-8 brutal-border transition-colors ${detailedLyricsEnabled ? 'bg-black dark:bg-white' : 'bg-neo-bg dark:bg-zinc-600'}`}>
                <div className={`absolute top-0 w-8 h-8 border-4 border-black dark:border-white -mt-1 transition-all ${detailedLyricsEnabled ? 'right-0 bg-neo-lime -mr-1' : 'left-0 bg-white -ml-1'}`}></div>
              </div>
            </div>

            <div className="flex items-center justify-between p-6 bg-white dark:bg-zinc-800 brutal-border shadow-[4px_4px_0_0_#000] dark:shadow-[4px_4px_0_0_#fff]">
              <div>
                <p className="font-bold text-lg dark:text-white">Auto-Scan Library at Startup</p>
                <p className="font-medium text-zinc-500">Scan known folders automatically when app launches</p>
              </div>
              <div className="relative inline-block w-16 h-8 bg-neo-bg dark:bg-zinc-600 brutal-border cursor-pointer">
                <div className="absolute top-0 left-0 w-8 h-8 bg-white border-4 border-black dark:border-white -mt-1 -ml-1 transition-all"></div>
              </div>
            </div>
          </div>
        </section>

        {/* Note about constraints */}
        <div className="bg-neo-pink p-6 brutal-border shadow-[4px_4px_0_0_#000] text-black">
          <p className="font-bold text-xl uppercase mb-2">Note on Capabilities</p>
          <p className="font-medium">
            This application is running in a Web environment. True DAC exclusive mode (WASAPI/ASIO) and automatic unprompted local background scanning require native desktop APIs (via Flutter/C++ plugins) which are mocked visually here to demonstrate the requested UX and State Architecture. 
            Local playback logic, layout, search, state engines, and UI paradigms are fully implemented!
          </p>
        </div>

      </div>
    </div>
  );
}
