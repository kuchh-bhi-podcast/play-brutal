import { useState, useEffect, FormEvent } from 'react';
import { usePlayerStore, Track } from '../store/playerStore';
import { Search, Play, Loader2, Youtube } from 'lucide-react';

type SearchResult = {
  url: string;
  type: string;
  title: string;
  thumbnail: string;
  uploaderName: string;
  uploaderUrl: string;
  uploaderAvatar: string;
  uploadedDate: string;
  shortDescription: string;
  duration: number;
  views: number;
  uploaded: number;
  uploaderVerified: boolean;
  isShort: boolean;
};

export function YtView() {
  const { playTrack, queue, searchQuery, searchTrigger } = usePlayerStore();
  const [results, setResults] = useState<SearchResult[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [workingInstance, setWorkingInstance] = useState<string>('');

  useEffect(() => {
    if (searchTrigger > 0) {
      searchYt();
    }
  }, [searchTrigger]);

  const searchYt = async (e?: FormEvent) => {
    if (e) e.preventDefault();
    if (!searchQuery.trim()) return;
    
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`/api/yt/search?q=${encodeURIComponent(searchQuery)}`);
      if (!res.ok) throw new Error('Search failed');
      const ObjectData = await res.json();
      
      // The backend returns an array already mapped correctly to type and keys needed
      setResults(ObjectData.items);
      setWorkingInstance(ObjectData.instance || '');
    } catch (err: any) {
      setError('Search failed to load. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const playYtTrack = async (item: SearchResult) => {
    try {
      const videoId = item.url.replace('/watch?v=', '');
      
      const track: Track = {
        id: `yt-${videoId}`,
        title: item.title,
        artist: item.uploaderName,
        album: 'YouTube Music',
        duration: item.duration,
        url: '', // Will fetch stream URL before playing
        fileType: 'audio/mp3',
        coverUrl: item.thumbnail,
      };

      // Fetch stream URL
      const streamRes = await fetch(`/api/yt/streams?videoId=${videoId}`);
      if (!streamRes.ok) throw new Error('Failed to get streams');
      const streamData = await streamRes.json();
      
      const audioStreams = streamData.audioStreams;
      if (!audioStreams || audioStreams.length === 0) {
        throw new Error('No audio streams found');
      }
      
      // Best quality audio
      const bestAudio = audioStreams.reduce((prev: any, current: any) => 
        (prev.bitrate > current.bitrate) ? prev : current
      );

      track.url = bestAudio.url;
      
      // We don't want to save YouTube URLs to the library as they expire rapidly (they are restricted by IP/signature)
      // They belong to the session queue only. But playerStore expects all tracks in queue, let's just push it to current playback queue 
      playTrack(track, queue.length > 0 ? [...queue, track] : [track]);
    } catch (err) {
      alert("Could not load track streams.");
      console.error(err);
    }
  };

  return (
    <div className="flex-1 flex flex-col p-6 overflow-hidden max-w-7xl mx-auto w-full">
      <div className="flex items-center gap-4 mb-6">
        <Youtube className="w-8 h-8 text-neo-pink" />
        <h2 className="text-4xl font-black uppercase tracking-tighter" style={{ textShadow: "2px 2px 0px var(--color-neo-pink)" }}>
          YT Music Explore
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
              <div className="relative group w-full aspect-video border-2 border-black dark:border-white overflow-hidden bg-black">
                <img 
                  src={item.thumbnail} 
                  alt={item.title}
                  className="w-full h-full object-cover opacity-80 group-hover:opacity-100 transition-opacity"
                  referrerPolicy="no-referrer"
                />
                <button
                  onClick={() => playYtTrack(item)}
                  className="absolute inset-0 flex items-center justify-center bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity"
                >
                  <div className="w-16 h-16 bg-neo-yellow brutal-border rounded-full flex items-center justify-center pl-1 brutal-hover shadow-[4px_4px_0_0_#FF4FA3]">
                    <Play fill="black" strokeWidth={0} className="w-8 h-8" />
                  </div>
                </button>
              </div>
              <div className="flex flex-col gap-1">
                <h3 className="font-bold text-lg line-clamp-2 leading-tight dark:text-white" title={item.title}>
                  {item.title}
                </h3>
                <p className="text-gray-600 dark:text-gray-400 font-medium">
                  {item.uploaderName}
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
