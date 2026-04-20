async function test() {
  try {
    const r = await fetch('http://localhost:3000/api/yt/search?q=test');
    if (!r.ok) {
       console.log('HTTP ' + r.status + ' - ' + await r.text());
       return;
    }
    const data = await r.json();
    console.log(`Working: ${data.instance}`);
    console.log(`Found ${data.items.length} items`);
    if(data.items.length > 0) {
      console.log('first title:', data.items[0].title);
      const urlId = data.items[0].url.replace('/watch?v=', '');
      
      const r2 = await fetch(`http://localhost:3000/api/yt/streams?videoId=${urlId}`);
      if(!r2.ok) {
         console.log('Stream HTTP ' + r2.status);
         return;
      }
      const streamData = await r2.json();
      console.log(`Found ${streamData.audioStreams.length} audio streams!`);
    }

  } catch(e) {
    console.log('Error', e);
  }
}
test();
