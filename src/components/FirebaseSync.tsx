import { useEffect } from 'react';
import { useAuth } from './FirebaseAuthProvider';
import { usePlayerStore } from '../store/playerStore';
import { subscribeToUserTracks, subscribeToUserPlaylists, syncTrackToFirestore } from '../services/firestoreService';

export const FirebaseSync = () => {
  const { user } = useAuth();
  const { library, setPlaylists, addTracks } = usePlayerStore();

  // Sync playlists and cloud tracks when logged in
  useEffect(() => {
    if (!user) {
      setPlaylists([]);
      return;
    }

    const unsubTracks = subscribeToUserTracks(user.uid, (cloudTracks) => {
      // Merge cloud tracks into local library if not already present
      // For now we just append new ones. 
      // In a real app we'd need better reconciliation.
      const localIds = new Set(library.map(t => t.id));
      const newTracks = cloudTracks.filter(t => !localIds.has(t.id));
      if (newTracks.length > 0) {
        addTracks(newTracks);
      }
    });

    const unsubPlaylists = subscribeToUserPlaylists(user.uid, (playlists) => {
      setPlaylists(playlists);
    });

    return () => {
      unsubTracks();
      unsubPlaylists();
    };
  }, [user]);

  // Optionally: Auto-sync any NEW local tracks to cloud if user is logged in
  useEffect(() => {
    if (user && library.length > 0) {
      // Syncing all tracks might be expensive, so we just sync the last added one or similar
      // Or we can just have a button "Backup to Cloud"
    }
  }, [library, user]);

  return null;
};
