const fs = require("fs");
const fetch = require("node-fetch");
const [apiKey] = process.argv.slice(2);
async function getTracks(page) {
  const response = await fetch(
    `https://ws.audioscrobbler.com/2.0/?method=user.gettoptracks&user=t0pth4t&limit=1000&api_key=${apiKey}&format=json&page=${page}`
  );
  if (!response.ok) {
    console.error(
      `Error getting top tracks. Status: ${
        response.status
      } Text: ${await response.text()}`
    );
  }

  return await response.json();
}

function processResults(tracks) {
  const {
    toptracks: { track },
  } = tracks;

  return track.map((t) => {
    const {
      "@attr": { rank },
      artist: { name: artistName },
      name,
    } = t;
    return JSON.stringify({ rank, artistName, name });
  });
}
const delay = (ms) => new Promise((resolve) => setTimeout(resolve, ms));
async function getAllTracks() {
  const pageCount = 34;
  let page = 1;
  while (page <= pageCount) {
    const jason = await getTracks(page);
    const lines = processResults(jason).join("\n");
    fs.appendFileSync("tracks.ndjson", lines);
    page++;
    console.log("success. sleeping...😪 ");
    await delay(1000);
  }
}
getAllTracks();
