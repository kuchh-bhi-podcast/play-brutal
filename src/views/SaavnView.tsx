import { useState, useEffect, FormEvent } from 'react';
import { usePlayerStore, Track } from '../store/playerStore';
import { Search, Play, Loader2, Music } from 'lucide-react';

type SearchResult = {
  id: string;
  title: string;
  artist: string;
  album: string;
  duration: number;
  thumbnail: string;
  url: string;
};

export function SaavnView() {
  const { playTrack, queue, searchQuery, searchTrigger } = usePlayerStore();
  const [results, setResults] = useState<SearchResult[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (searchTrigger > 0) {
      searchSaavn();
    }
  }, [searchTrigger]);

  const searchSaavn = async (e?: FormEvent) => {
    if (e) e.preventDefault();
    if (!searchQuery.trim()) return;
    
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`/api/saavn/search?q=${encodeURIComponent(searchQuery)}`);
      if (!res.ok) throw new Error('Search failed');
      const data = await res.json();
      
      setResults(data.items || []);
    } catch (err: any) {
      setError('Search failed to load. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const playSaavnTrack = async (item: SearchResult) => {
    try {
      if (!item.url) throw new Error('Stream URL not found');

      const track: Track = {
        id: `saavn-${item.id}`,
        title: item.title,
        artist: item.artist,
        album: item.album || 'JioSaavn',
        duration: item.duration,
        url: item.url, 
        fileType: 'audio/mp4',
        coverUrl: item.thumbnail,
      };

      // Add track to session queue and play
      playTrack(track, queue.length > 0 ? [...queue, track] : [track]);
    } catch (err) {
      alert("Could not load track streams.");
      console.error(err);
    }
  };

  return (
    <div className="flex-1 flex flex-col p-6 overflow-hidden max-w-7xl mx-auto w-full">
      <div className="flex items-center gap-4 mb-6">
        <Music className="w-8 h-8 text-[#2bc5b4]" />
        <h2 className="text-4xl font-black uppercase tracking-tighter" style={{ textShadow: "2px 2px 0px #2bc5b4" }}>
          JioSaavn Explore
        </h2>
      </div>

      {error && (
        <div className="bg-red-100 border-4 border-red-500 text-red-700 p-4 font-bold brutal-shadow mb-8">
          {error}
        </div>
      )}

      <div className="flex-1 overflow-y-auto hide-scrollbar">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 pb-24">
          {results.map((item, i) => (
            <div key={i} className="brutal-card bg-white dark:bg-zinc-800 p-4 flex flex-col gap-4 border-black dark:border-white shadow-[4px_4px_0_0_#000] dark:shadow-[4px_4px_0_0_#fff]">
              <div className="relative group w-full aspect-square border-2 border-black dark:border-white overflow-hidden bg-black max-h-64">
                <img 
                  src={item.thumbnail} 
                  alt={item.title}
                  className="w-full h-full object-cover opacity-80 group-hover:opacity-100 transition-opacity"
                  referrerPolicy="no-referrer"
                />
                <button
                  onClick={() => playSaavnTrack(item)}
                  className="absolute inset-0 flex items-center justify-center bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity"
                >
                  <div className="w-16 h-16 bg-[#2bc5b4] brutal-border rounded-full flex items-center justify-center pl-1 brutal-hover shadow-[4px_4px_0_0_#fff]">
                    <Play fill="white" strokeWidth={0} className="w-8 h-8" />
                  </div>
                </button>
              </div>
              <div className="flex flex-col gap-1">
                <h3 className="font-bold text-lg line-clamp-2 leading-tight dark:text-white" title={item.title}>
                  {item.title}
                </h3>
                <p className="text-gray-600 dark:text-gray-400 font-medium line-clamp-1">
                  {item.artist} • {item.album}
                </p>
              </div>
            </div>
          ))}
        </div>
        
        {!loading && results.length === 0 && !error && searchQuery && (
          <div className="text-center py-12 text-gray-500 font-bold text-xl uppercase">
            No results found
          </div>
        )}
      </div>
    </div>
  );
}
