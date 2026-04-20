import Innertube from 'youtubei.js';

async function test() {
  const yt = await Innertube.create();
  const search = await yt.music.search('Rick Astley Never Gonna Give You Up');
  
  if (search.songs?.contents) {
    const videoId = search.songs.contents[0].id;
    console.log("Found song ID:", videoId);
    
    // Get Streaming Info
    const info = await yt.getBasicInfo(videoId);
    const format = info.chooseFormat({ type: 'audio', quality: 'best' });
    console.log("Stream URL:", format?.decipher(yt.session.player));
  }
}
test().catch(console.error);
