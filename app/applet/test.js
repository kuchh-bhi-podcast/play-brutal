const urls = [
  'https://pipedapi.kavin.rocks/search?q=test',
  'https://api.piped.privacydev.net/search?q=test',
  'https://pipedapi.lunar.icu/search?q=test',
  'https://invidious.jing.rocks/api/v1/search?q=test',
  'https://inv.tux.pizza/api/v1/search?q=test',
  'https://invidious.asir.dev/api/v1/search?q=test',
  'https://inv.thepixora.com/api/v1/search?q=test',
  'https://invidious.perennialte.ch/api/v1/search?q=test'
];
async function check() {
  for (const url of urls) {
    try {
      const res = await fetch(url, { signal: AbortSignal.timeout(5000) });
      console.log(url, res.status);
    } catch(e) {
      console.log(url, 'Error:', e.message);
    }
  }
}
check();
