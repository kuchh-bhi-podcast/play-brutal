async function getInvidious() {
  try {
    const r = await fetch('https://api.invidious.io/instances.json');
    const json = await r.json();
    const instances = json.map(x => x[0]).filter(Boolean);
    console.log(`Found ${instances.length} instances.`);
    
    let working = [];
    for (const u of instances) {
       console.log(`Testing ${u}...`);
       try {
         const sr = await fetch(`https://${u}/api/v1/search?q=test`);
         if(sr.status === 200) {
            console.log(`  -> SUCCESS!`);
            
            // test stream
            const data = await sr.json();
            const video = data.find(i => i.type === 'video');
            if(video) {
              const sr2 = await fetch(`https://${u}/api/v1/videos/${video.videoId}`);
              if(sr2.status === 200) {
                   console.log(`  -> Stream API OK!`);
                   working.push(`https://${u}`);
                   if(working.length >= 2) break;
              }
            }
         }
       } catch(e) {}
    }
    console.log("Working Instances:", working);
  } catch(e) {
    console.error(e);
  }
}

getInvidious();
