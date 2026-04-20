import { useState, useEffect } from 'react';
import { usePlayerStore, Track } from '../store/playerStore';
import { Play, Loader2, HardDrive, LogIn, Music, RefreshCw } from 'lucide-react';
import { auth } from '../lib/firebase';
import { GoogleAuthProvider, signInWithPopup } from 'firebase/auth';

type DriveFile = {
  id: string;
  title: string;
  album: string;
  artist: string;
  duration: number;
  thumbnail: string;
  fileType: string;
  url: string;
};

export function DriveView() {
  const { playTrack, queue, googleDriveToken, setGoogleDriveToken, searchQuery } = usePlayerStore();
  const [files, setFiles] = useState<DriveFile[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<{ message: string; link?: string } | null>(null);

  useEffect(() => {
    if (googleDriveToken) {
      fetchFiles();
    }
  }, [googleDriveToken]);

  const handleConnect = async () => {
    try {
      const provider = new GoogleAuthProvider();
      provider.addScope('https://www.googleapis.com/auth/drive.readonly');
      
      const result = await signInWithPopup(auth, provider);
      const credential = GoogleAuthProvider.credentialFromResult(result);
      if (credential && credential.accessToken) {
         setGoogleDriveToken(credential.accessToken);
      }
    } catch (error) {
      console.error('OAuth error:', error);
      setError('Could not initiate Google Auth');
    }
  };

  const fetchFiles = async () => {
    if (!googleDriveToken) return;
    setLoading(true);
    setError(null);
    try {
      const res = await fetch('/api/drive/files', {
        headers: {
          'Authorization': `Bearer ${googleDriveToken}`
        }
      });
      const data = await res.json();
      if (!res.ok) {
        if (data.enableLink) {
          setError({ message: data.message, link: data.enableLink });
        } else {
          throw new Error(data.error || data.message || 'Failed to fetch files');
        }
        return;
      }
      
      if (data.message) {
         setError({ message: data.message });
      } else {
         // Append token to stream urls
         const newFiles = (data.files || []).map((f: DriveFile) => ({
             ...f, 
             url: `${f.url}&token=${encodeURIComponent(googleDriveToken)}`
         }));
         setFiles(newFiles);
         
         // Pre-load the first track if the player is empty
         if (newFiles.length > 0 && !usePlayerStore.getState().currentTrack) {
             const item = newFiles[0];
             const track: Track = {
               id: `drive-${item.id}`,
               title: item.title,
               artist: item.artist,
               album: item.album,
               duration: item.duration,
               url: item.url, 
               fileType: item.fileType,
               coverUrl: item.thumbnail || undefined,
             };
             usePlayerStore.getState().playTrack(track, [track], true);
         }
      }
    } catch (err: any) {
      setError({ message: err.message });
      if (err.message.toLowerCase().includes('token')) {
         setGoogleDriveToken(null);
      }
    } finally {
      setLoading(false);
    }
  };

  const playDriveTrack = (item: any) => {
    const track: Track = {
      id: `drive-${item.id}`,
      title: item.title,
      artist: item.artist,
      album: item.album,
      duration: item.duration,
      url: item.url, 
      fileType: item.fileType,
      coverUrl: item.thumbnail || undefined,
      lrcUrl: item.lrcUrl ? `${item.lrcUrl}&token=${encodeURIComponent(googleDriveToken || '')}` : undefined
    };

    playTrack(track, queue.length > 0 ? [...queue, track] : [track]);
  };

  const filteredFiles = files.filter(f => 
    f.title.toLowerCase().includes((searchQuery || '').toLowerCase()) ||
    f.album.toLowerCase().includes((searchQuery || '').toLowerCase()) ||
    f.artist.toLowerCase().includes((searchQuery || '').toLowerCase())
  );

  return (
    <div className="flex-1 flex flex-col p-6 overflow-hidden max-w-7xl mx-auto w-full">
      <div className="flex items-center gap-4 mb-8">
        <HardDrive className="w-8 h-8 text-neo-yellow" />
        <h2 className="text-4xl font-black uppercase tracking-tighter" style={{ textShadow: "2px 2px 0px var(--color-neo-yellow)" }}>
          Google Drive
        </h2>
      </div>

      {!googleDriveToken ? (
        <div className="flex-1 flex flex-col items-center justify-center gap-6">
          <div className="brutal-card bg-white dark:bg-zinc-800 p-8 flex flex-col items-center justify-center text-center max-w-lg">
            <HardDrive className="w-24 h-24 text-gray-400 mb-6" strokeWidth={1} />
            <h3 className="text-2xl font-black mb-4 dark:text-white uppercase tracking-tighter">Connect your cloud</h3>
            <p className="text-gray-600 dark:text-gray-400 font-medium mb-8">
              Sync music directly from a folder named <span className="text-neo-pink font-bold">echomusic</span> inside your Google Drive. 
              Organize into playlist subfolders, and they'll show up automatically right here.
            </p>
            <button
              onClick={handleConnect}
              className="brutal-btn bg-[#4285F4] text-white w-full text-xl py-4 flex items-center justify-center gap-3"
            >
              <img src="https://upload.wikimedia.org/wikipedia/commons/5/53/Google_%22G%22_Logo.svg" alt="Google" className="w-6 h-6 border-none bg-white p-0.5 rounded-full" />
              <span>Grant Drive Access</span>
            </button>
            <div className="text-xs text-gray-500 font-mono text-left mt-6 bg-gray-100 p-3 brutal-border-sm w-full dark:bg-black dark:text-gray-400">
              Note: Requires re-authorization for Drive access per session.
            </div>
          </div>
        </div>
      ) : (
        <div className="flex flex-col flex-1 overflow-hidden">
          {error ? (
            <div className="bg-red-100 border-4 border-red-500 text-red-700 p-4 font-bold brutal-shadow mb-8 flex flex-col gap-4">
              <div className="flex justify-between items-center">
                <span>{error.message}</span>
                <button onClick={fetchFiles} className="text-red-900 underline font-bold flex items-center gap-1"><RefreshCw size={16}/> Retry</button>
              </div>
              {error.link && (
                <a 
                  href={error.link} 
                  target="_blank" 
                  rel="noopener noreferrer" 
                  className="brutal-btn bg-black text-white text-center text-sm py-2 hover:bg-neo-pink transition-colors"
                >
                  Click Here to Enable Drive API
                </a>
              )}
            </div>
          ) : (
            <div className="flex justify-between items-center mb-6">
              <div className="text-sm font-mono font-bold dark:text-gray-300">
                Reading from <span className="bg-neo-yellow text-black px-1.5 py-0.5">/echomusic</span> in Google Drive
              </div>
              <button 
                onClick={fetchFiles} 
                disabled={loading}
                className="brutal-btn py-1.5 px-4 bg-white dark:bg-black"
              >
                {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : 'Refresh'}
              </button>
            </div>
          )}

          <div className="flex-1 overflow-y-auto hide-scrollbar pb-24">
            {loading && files.length === 0 ? (
               <div className="flex items-center justify-center h-full">
                  <Loader2 className="w-10 h-10 animate-spin text-neo-yellow" />
               </div>
            ) : filteredFiles.length > 0 ? (
              <div className="flex flex-col gap-3">
                {filteredFiles.map((item, i) => (
                  <button 
                    key={item.id}
                    onClick={() => playDriveTrack(item)}
                    className="flex items-center gap-4 p-3 brutal-border bg-white dark:bg-zinc-800 brutal-hover text-left shadow-[2px_2px_0_0_#000] dark:shadow-[2px_2px_0_0_#fff]"
                  >
                    <div className="w-12 h-12 bg-neo-yellow border-2 border-black dark:border-white shadow-[2px_2px_0_0_#000] flex items-center justify-center shrink-0 overflow-hidden">
                      {item.thumbnail ? (
                        <img src={item.thumbnail} className="w-full h-full object-cover" alt="" referrerPolicy="no-referrer" />
                      ) : (
                        <Music className="w-6 h-6 text-black" strokeWidth={2.5} />
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="font-bold truncate text-lg leading-tight dark:text-white">
                        {item.title}
                      </div>
                      <div className="text-sm font-medium text-gray-500 dark:text-gray-400 truncate mt-0.5">
                        {item.album !== 'echomusic' ? item.album : 'Root Directory'}
                      </div>
                    </div>
                  </button>
                ))}
              </div>
            ) : (
              !loading && !error && (
                <div className="text-center py-12">
                  <p className="text-gray-500 font-bold mb-4 text-xl">No audio files found.</p>
                  <p className="text-gray-400 font-medium">Add files to the 'echomusic' folder in Google Drive to see them here.</p>
                </div>
              )
            )}
          </div>
        </div>
      )}
    </div>
  );
}
