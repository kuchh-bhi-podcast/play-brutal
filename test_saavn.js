async function testSaavn() {
  const url = 'https://jiosaavn-api-privatecvc2.vercel.app/search/songs?query=believer';
  const res = await fetch(url);
  const data = await res.json();
  const first = data.data.results[0];
  console.log(JSON.stringify(first, null, 2));
}

testSaavn();
