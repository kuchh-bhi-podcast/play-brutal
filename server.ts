import express from "express";
import { createServer as createViteServer } from "vite";
import path from "path";
import { google } from "googleapis";
import Innertube from 'youtubei.js';

async function startServer() {
  const app = express();
  const PORT = Number(process.env.PORT) || 3000;

  const appUrl = (process.env.APP_URL || '').replace(/\/$/, '');
  
  // --- Drive API Routes Using Client Tokens ---
  const getDriveClient = (req: any) => {
    let token = null;
    if (req.headers.authorization && req.headers.authorization.startsWith("Bearer ")) {
      token = req.headers.authorization.substring(7);
    } else if (req.query.token) {
      token = req.query.token as string;
    }
    
    if (!token) return null;
    
    const oauth2Client = new google.auth.OAuth2();
    oauth2Client.setCredentials({ access_token: token });
    return google.drive({ version: 'v3', auth: oauth2Client });
  };

  app.get('/api/drive/files', async (req: any, res: any) => {
    try {
      const drive = getDriveClient(req);
      if (!drive) return res.status(401).json({ error: "Missing Bearer token" });

      const folderRes = await drive.files.list({
        q: "mimeType='application/vnd.google-apps.folder' and name='echomusic' and trashed=false",
        fields: 'files(id, name)',
        spaces: 'drive'
      });
      
      if (!folderRes.data.files || folderRes.data.files.length === 0) {
        return res.json({ files: [], message: "No 'echomusic' folder found in your Google Drive." });
      }
      
      const folderId = folderRes.data.files[0].id;
      
      const subFolderRes = await drive.files.list({
        q: `'${folderId}' in parents and mimeType='application/vnd.google-apps.folder' and trashed=false`,
        fields: 'files(id, name)'
      });
      
      const parentIds = [folderId];
      if (subFolderRes.data.files) {
        parentIds.push(...subFolderRes.data.files.map((f: any) => f.id));
      }
      
      const parentQueries = parentIds.map(id => `'${id}' in parents`).join(' or ');
      // Search for audio AND text files (for lyrics)
      const query = `(${parentQueries}) and (mimeType contains 'audio/' or mimeType contains 'text/' or fileExtension = 'lrc') and trashed=false`;
      
      const fileRes = await drive.files.list({
        q: query,
        fields: 'files(id, name, mimeType, parents, size, thumbnailLink)',
        pageSize: 1000
      });
      
      const subfoldersMap = new Map();
      if(subFolderRes.data.files) {
         subFolderRes.data.files.forEach((f: any) => subfoldersMap.set(f.id, f.name));
      }

      // Separate audio files and lrc files
      const audioFiles = fileRes.data.files?.filter((f: any) => f.mimeType.includes('audio/')) || [];
      const lrcFiles = fileRes.data.files?.filter((f: any) => f.mimeType.includes('text/') || f.name.endsWith('.lrc') || f.name.endsWith('.txt')) || [];

      // Link lrc files by name without extension
      const lrcMap = new Map();
      lrcFiles.forEach((f: any) => {
        const baseName = f.name.replace(/\.[^/.]+$/, "");
        lrcMap.set(baseName, `/api/drive/stream?id=${f.id}`);
      });
      
      const results = audioFiles.map((f: any) => {
         const parentId = f.parents ? f.parents[0] : null;
         const playlistName = subfoldersMap.has(parentId) ? subfoldersMap.get(parentId) : 'echomusic';
         const baseName = f.name.replace(/\.[^/.]+$/, "");
         return {
           id: f.id,
           title: baseName,
           album: playlistName,
           artist: 'Google Drive',
           duration: 0,
           thumbnail: f.thumbnailLink || '',
           fileType: f.mimeType,
           url: `/api/drive/stream?id=${f.id}`, // Frontend maps its own token onto this later
           lrcUrl: lrcMap.has(baseName) ? lrcMap.get(baseName) : undefined
         };
      });
      
      res.json({ files: results });
      
    } catch(e: any) {
      console.error("Drive Error Details:", JSON.stringify(e, null, 2));
      const message = e.message || "Unknown Drive Error";
      
      // Check for specific "API not enabled" error
      if (message.includes("Drive API") && message.includes("not been used")) {
        const projectIdMatch = message.match(/project (\d+)/);
        const projectId = projectIdMatch ? projectIdMatch[1] : "";
        const enableLink = `https://console.developers.google.com/apis/api/drive.googleapis.com/overview?project=${projectId}`;
        
        return res.status(403).json({ 
          error: "Drive API not enabled", 
          message: "The Google Drive API is not enabled for your project. Please click the link below to enable it.",
          details: message,
          enableLink 
        });
      }

      if (e.status === 401 || message.toLowerCase().includes("credential") || message.toLowerCase().includes("token") || message.toLowerCase().includes("unauthorized")) {
        return res.status(401).json({ error: "invalid_token", message: "Token has expired or is invalid. Please reconnect." });
      }
      
      res.status(500).json({ error: message });
    }
  });

  app.get('/api/drive/stream', async (req: any, res: any) => {
    try {
      const fileId = req.query.id as string;
      if(!fileId) return res.status(400).send("No file ID");

      const drive = getDriveClient(req);
      if (!drive) return res.status(401).send("No drive token provided");
      
      const fileMeta = await drive.files.get({ fileId, fields: 'size, mimeType' });
      const fileSize = parseInt(fileMeta.data.size, 10);
      const mimeType = fileMeta.data.mimeType;

      const range = req.headers.range;
      
      const axiosConfig: any = { responseType: 'stream' };
      if (range) {
        axiosConfig.headers = { Range: range };
      }

      const streamReq = await drive.files.get(
        { fileId, alt: 'media' }, 
        axiosConfig
      );

      if (range) {
        const parts = range.replace(/bytes=/, "").split("-")
        let start = parseInt(parts[0], 10)
        let end = parts[1] && parts[1].trim() !== "" ? parseInt(parts[1], 10) : fileSize - 1
        
        if (start >= fileSize) {
          res.status(416).send("Requested range not satisfiable");
          return;
        }
        if (end >= fileSize) end = fileSize - 1;

        const chunksize = (end - start) + 1

        res.writeHead(206, {
          'Content-Range': `bytes ${start}-${end}/${fileSize}`,
          'Accept-Ranges': 'bytes',
          'Content-Length': chunksize,
          'Content-Type': mimeType,
        });
      } else {
        res.writeHead(200, {
          'Content-Length': fileSize,
          'Content-Type': mimeType,
        });
      }

      streamReq.data.on('end', () => res.end()).pipe(res);
    } catch(e) {
      if(!res.headersSent) res.status(500).send("Error streaming from Drive");
    }
  });

// Innertube implementation for YouTube Music
let yt: any = null;

app.get("/api/yt/search", async (req, res) => {
  try {
    const q = req.query.q as string;
    if (!q) return res.status(400).json({ error: "No query" });

    if (!yt) yt = await Innertube.create();
    
    // Search YouTube Music directly
    const search = await yt.music.search(q, { type: 'song' });
    
    if (search.songs?.contents) {
      const results = search.songs.contents.map((s: any) => ({
        url: `/watch?v=${s.id}`,
        type: 'stream',
        title: s.title,
        thumbnail: s.thumbnails?.[0]?.url || '',
        uploaderName: s.artists?.[0]?.name || 'Unknown Artist',
        duration: s.duration?.seconds || 0,
        videoId: s.id
      }));
      return res.json({ items: results, instance: 'youtubei' });
    }

    res.json({ items: [], instance: 'youtubei' });
  } catch (e: any) {
    res.status(500).json({ error: e.message });
  }
});

  // API Route for YouTube Music Streams
  app.get("/api/yt/streams", async (req, res) => {
    try {
      const videoId = req.query.videoId as string;
      if (!videoId) return res.status(400).json({ error: "No videoId" });

      if (!yt) yt = await Innertube.create();

      const info = await yt.getBasicInfo(videoId);
      
      // Attempt to decipher best audio format
      const format = info.chooseFormat({ type: 'audio', quality: 'best' });
      
      if (!format) {
         return res.status(404).json({ error: "No audio streams found" });
      }

      const streamUrl = format.decipher(yt.session.player);

      return res.json({ 
        audioStreams: [{ url: streamUrl, bitrate: format.bitrate || 0 }] 
      });

    } catch (e: any) {
      res.status(500).json({ error: e.message });
    }
  });

  // API Route for JioSaavn Search
  app.get("/api/saavn/search", async (req, res) => {
    try {
      const q = req.query.q as string;
      if (!q) return res.status(400).json({ error: "No query" });

      const url = `https://jiosaavn-api-privatecvc2.vercel.app/search/songs?query=${encodeURIComponent(q)}`;
      const response = await fetch(url);
      if (!response.ok) {
        return res.status(response.status).json({ error: "JioSaavn API failed" });
      }

      const data = await response.json();
      
      if (!data.data || !data.data.results) {
         return res.json({ items: [] });
      }

      // Map to consistent format
      const results = data.data.results.map((item: any) => {
         // Get the highest quality image
         const image = item.image && item.image.length > 0 ? item.image[item.image.length - 1].link : '';
         // Get absolute highest quality download URL (usually 320kbps is last or can be found)
         const bestAudio = item.downloadUrl && item.downloadUrl.length > 0 
           ? item.downloadUrl.reduce((prev: any, curr: any) => {
               const pQ = parseInt(prev.quality) || 0;
               const cQ = parseInt(curr.quality) || 0;
               return (pQ > cQ) ? prev : curr;
             }).link 
           : '';

         return {
            id: item.id,
            title: item.name,
            artist: item.primaryArtists || item.singers || '',
            album: item.album ? item.album.name : '',
            duration: parseInt(item.duration) || 0,
            thumbnail: image,
            url: bestAudio
         };
      });

      res.json({ items: results });
    } catch (e: any) {
      res.status(500).json({ error: e.message });
    }
  });

  // Vite middleware for development
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    // Note: the build structure typically places dist next to the built server.js
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    // @ts-ignore
    app.get("*all", (req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer();
