import { 
  collection, 
  doc, 
  setDoc, 
  deleteDoc, 
  query, 
  where, 
  onSnapshot, 
  serverTimestamp,
  updateDoc,
  getDocs
} from 'firebase/firestore';
import { db } from '../lib/firebase';
import { Track } from '../store/playerStore';

export const syncTrackToFirestore = async (userId: string, track: Track) => {
  try {
    const trackRef = doc(db, 'tracks', track.id);
    await setDoc(trackRef, {
      id: track.id,
      title: track.title,
      artist: track.artist || 'Unknown Artist',
      album: track.album || 'Unknown Album',
      duration: track.duration,
      url: track.url,
      fileType: track.fileType,
      coverUrl: track.coverUrl || '',
      ownerId: userId,
      createdAt: serverTimestamp(),
    }, { merge: true });
  } catch (err) {
    console.error("Failed to sync track:", err);
  }
};

export const deleteTrackFromFirestore = async (trackId: string) => {
  try {
    await deleteDoc(doc(db, 'tracks', trackId));
  } catch (err) {
    console.error("Failed to delete track:", err);
  }
};

export const subscribeToUserTracks = (userId: string, callback: (tracks: Track[]) => void) => {
  const q = query(collection(db, 'tracks'), where('ownerId', '==', userId));
  return onSnapshot(q, (snapshot) => {
    const tracks = snapshot.docs.map(doc => doc.data() as Track);
    callback(tracks);
  });
};

export type Playlist = {
  id: string;
  name: string;
  trackIds: string[];
  ownerId: string;
  createdAt: any;
  updatedAt: any;
};

export const createPlaylist = async (userId: string, name: string) => {
  const playlistRef = doc(collection(db, 'playlists'));
  await setDoc(playlistRef, {
    name,
    ownerId: userId,
    trackIds: [],
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  });
  return playlistRef.id;
};

export const updatePlaylistTracks = async (playlistId: string, trackIds: string[]) => {
  const playlistRef = doc(db, 'playlists', playlistId);
  await updateDoc(playlistRef, {
    trackIds,
    updatedAt: serverTimestamp(),
  });
};

export const subscribeToUserPlaylists = (userId: string, callback: (playlists: Playlist[]) => void) => {
  const q = query(collection(db, 'playlists'), where('ownerId', '==', userId));
  return onSnapshot(q, (snapshot) => {
    const playlists = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Playlist));
    callback(playlists);
  });
};
