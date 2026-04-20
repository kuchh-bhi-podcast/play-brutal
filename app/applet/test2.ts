const urls = [
  'https://pipedapi.kavin.rocks/search?q=test',
  'https://api.piped.privacydev.net/search?q=test',
  'https://pipedapi.lunar.icu/search?q=test',
  'https://pipedapi.smnz.de/search?q=test',
  'https://pipedapi.adminforge.de/search?q=test',
  'https://pipedapi.ngn.tf/search?q=test',
  'https://api.piped.projectsegfau.lt/search?q=test',
  'https://pipedapi.tokhmi.xyz/search?q=test',
  'https://piped-api.garudalinux.org/search?q=test',
  'https://pipedapi.ytm.sh/search?q=test'
];
async function check() {
  for (const url of urls) {
    try {
      const res = await fetch(url, { signal: AbortSignal.timeout(5000), headers: { "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) Chrome/100.0.0.0 Safari/537.36" } });
      console.log(url, res.status);
    } catch(e: any) {
      console.log(url, 'Error:', e.message);
    }
  }
}
check();
