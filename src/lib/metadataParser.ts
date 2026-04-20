import * as mm from 'music-metadata-browser';
import { Buffer } from 'buffer';

// Polyfill Buffer for music-metadata-browser in Vite
if (typeof window !== 'undefined') {
  window.Buffer = window.Buffer || Buffer;
}

export interface ParsedLyrics {
  isSynced: boolean;
  lines: { 
    time: number; 
    text: string;
    words: { text: string; time: number; duration: number }[];
  }[];
  raw?: string;
}

export interface ParsedTrackMetadata {
  coverUrl: string | null;
  lyrics: ParsedLyrics | null;
  title?: string;
  artist?: string;
  album?: string;
}

export async function extractMetadata(file: File | string): Promise<ParsedTrackMetadata> {
  const result: ParsedTrackMetadata = {
    coverUrl: null,
    lyrics: null
  };

  try {
    let metadata;
    if (typeof file === 'string') {
      metadata = await mm.fetchFromUrl(file);
    } else {
      metadata = await mm.parseBlob(file);
    }
    
    // Extract Picture
    if (metadata.common.picture && metadata.common.picture.length > 0) {
      const pic = metadata.common.picture[0];
      // Convert buffer data strictly to Uint8Array so browser Blob parses native bytes successfully instead of serializing a JS object
      const bufferData = new Uint8Array(pic.data);
      const blob = new Blob([bufferData], { type: pic.format });
      result.coverUrl = URL.createObjectURL(blob);
    }

    // Extract Text tags
    result.title = metadata.common.title;
    result.artist = metadata.common.artist;
    result.album = metadata.common.album;

    // Lyrics
    let rawLyrics = '';
    
    // First try standard common lyrics
    if (metadata.common.lyrics && metadata.common.lyrics.length > 0) {
      rawLyrics = metadata.common.lyrics.join('\n');
    }

    // Fallback carefully to native tags if common is empty
    if (!rawLyrics && metadata.native) {
      // 1. Check Vorbis Comments (FLAC/OGG)
      const vorbis = metadata.native['vorbis'];
      if (vorbis) {
        const lyricTag = vorbis.find((t: any) => 
           ['LYRICS', 'UNSYNCEDLYRICS', 'SYNCEDLYRICS', 'SYNCED LYRICS', 'UNSYNCED LYRICS'].includes(t.id?.toUpperCase())
        );
        if (lyricTag && lyricTag.value) {
           rawLyrics = Array.isArray(lyricTag.value) ? lyricTag.value.join('\n') : lyricTag.value;
        }
      }

      // 2. Check ID3v2 (MP3) SYLT/USLT if still nothing
      if (!rawLyrics) {
        const id3v23 = metadata.native['ID3v2.3'] || metadata.native['ID3v2.4'];
        if (id3v23) {
          const sylt = id3v23.find((t: any) => t.id === 'SYLT' || t.id === 'USLT');
          if (sylt && sylt.value) {
            // USLT values often contain { text: string } or raw strings
            if (typeof sylt.value === 'string') {
              rawLyrics = sylt.value;
            } else if (sylt.value.text) {
              rawLyrics = sylt.value.text;
            } else if (Array.isArray(sylt.value)) {
              rawLyrics = sylt.value.map((v: any) => typeof v === 'string' ? v : v.text || '').join('\n');
            }
          }
        }
      }
    }

    if (rawLyrics) {
      result.lyrics = parseLrc(rawLyrics);
    }

    return result;
  } catch (error) {
    console.warn("Failed to parse metadata", error);
    return result;
  }
}

export function parseLrc(lrcText: string): ParsedLyrics {
  const lines = lrcText.split('\n');
  const parsedLines: { time: number; text: string; words: { text: string; time: number; duration: number }[] }[] = [];
  
  // High precision time regex for standard LRC [mm:ss.xx]
  const timeRegex = /\[(\d{2}):(\d{2}(?:\.\d{1,3})?)\]/g;
  // Enhanced word time regex <mm:ss.xx> or <mm:ss:xx>
  const wordTimeRegex = /<(\d{2}):(\d{2}(\.\d{1,3})?)>/g;
  
  let isSynced = false;

  for (const line of lines) {
    if (!line.trim()) continue;
    
    timeRegex.lastIndex = 0;
    const matches = [...line.matchAll(timeRegex)];
    
    // Extract base text by removing all [time] tags
    let textWithWordTags = line.replace(timeRegex, '').trim();
    
    if (matches.length > 0) {
      isSynced = true;
      for (const match of matches) {
        const minutes = parseInt(match[1], 10);
        const seconds = parseFloat(match[2]);
        const timeInSeconds = minutes * 60 + seconds;
        // We temporarily store the text with word tags to parse them later for each instance of this line
        parsedLines.push({ time: timeInSeconds, text: textWithWordTags, words: [] });
      }
    } else if (textWithWordTags && !textWithWordTags.startsWith('[')) {
      // Unsynced lines (fallback)
      parsedLines.push({ time: 0, text: textWithWordTags, words: [] });
    }
  }

  // Sort by time
  parsedLines.sort((a, b) => a.time - b.time);

  // Parse word-level information
  for (let i = 0; i < parsedLines.length; i++) {
    const current = parsedLines[i];
    const textWithTags = current.text;
    
    // Determine the end time for this line for interpolation
    const nextTime = i < parsedLines.length - 1 ? parsedLines[i + 1].time : current.time + 10;
    const lineDuration = Math.max(0.2, nextTime - current.time);

    wordTimeRegex.lastIndex = 0;
    const hasWordTags = wordTimeRegex.test(textWithTags);

    if (hasWordTags) {
      // Enhanced LRC parsing: Word timings are explicitly provided via <mm:ss.xx>
      wordTimeRegex.lastIndex = 0;
      const wordMatches = [...textWithTags.matchAll(wordTimeRegex)];
      
      // The text is actually between the tags. Example: <00:10.00>Hello <00:10.50>World
      // A more robust way to extract words and their times:
      const words: { text: string; time: number; duration: number }[] = [];
      
      for (let j = 0; j < wordMatches.length; j++) {
        const m = wordMatches[j];
        const min = parseInt(m[1], 10);
        const sec = parseFloat(m[2]);
        const time = min * 60 + sec;
        
        // The text for this timestamp is what follows it until the next timestamp or end of string
        const startIdx = m.index! + m[0].length;
        const endIdx = j < wordMatches.length - 1 ? wordMatches[j + 1].index : textWithTags.length;
        const wordText = textWithTags.slice(startIdx, endIdx).trim();
        
        if (wordText) {
          // Approximate duration as the gap to next word or half a second
          const nextWordTime = j < wordMatches.length - 1 
            ? (parseInt(wordMatches[j+1][1]) * 60 + parseFloat(wordMatches[j+1][2])) 
            : nextTime;
          
          words.push({ 
            text: wordText, 
            time, 
            duration: Math.max(0.1, nextWordTime - time) 
          });
        }
      }
      
      current.words = words;
      current.text = words.map(w => w.text).join(' ');
    } else {
      // Standard LRC: Perform smart interpolation
      const wordsArr = textWithTags.replace(/\s+/g, ' ').trim().split(' ').filter(w => w.length > 0);
      
      if (wordsArr.length === 0) {
        current.words = [{ text: "♪", time: current.time, duration: lineDuration }];
        current.text = "♪";
        continue;
      }

      // We distribute the line duration across words based on character count (human reading speed heuristic)
      // plus some "dead time" at the end of the line if it's long.
      const activeDuration = wordsArr.length > 1 ? lineDuration * 0.85 : lineDuration * 0.5;
      
      let runningTime = current.time;
      const totalChars = wordsArr.reduce((acc, w) => acc + w.length + 1, 0);
      
      current.words = wordsArr.map((w, idx) => {
        const wordWeight = (w.length + 1) / totalChars;
        const wordDuration = wordWeight * activeDuration;
        const startTime = runningTime;
        runningTime += wordDuration;
        
        return { 
          text: w, 
          time: startTime, 
          duration: wordDuration 
        };
      });
      current.text = wordsArr.join(' ');
    }
  }

  return {
    isSynced,
    lines: parsedLines,
    raw: lrcText
  };
}
