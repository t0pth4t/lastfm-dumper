const fs = require("fs");
const fetch = require("node-fetch");
const config = require("./config.json");
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
// getAllTracks();

async function getTrackId(artistName, trackName) {
  const searchString = `q=track:${encodeURIComponent(
    trackName
  )} artist:${encodeURIComponent(artistName)}&type=track&market=US&limit=1`;
  const response = await fetch(
    `https://api.spotify.com/v1/search?${searchString}`,
    {
      headers: {
        Authorization: `Bearer ${config.toke}`,
      },
    }
  );
  if (!response.ok) {
    throw new Error(`${response.status} ${await response.text()}`);
  }
  return await response.json();
}

async function createPlaylist(user_id) {
  const response = await fetch(
    `https://api.spotify.com/v1/users/${user_id}/playlists`,
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${config.toke}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        name: "Last.fm",
        description: "Top Tracks from last.fm",
        public: false,
      }),
    }
  );
  if (!response.ok) {
    throw new Error(`Status:${response.status} Text:${await response.text()}`);
  }
  console.log(await response.text());
}

async function addTracksToPlaylist(trackIds) {
  const response = await fetch(
    `https://api.spotify.com/v1/playlists/${config.playlist}/tracks`,
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${config.toke}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ uris: trackIds.map((t) => `spotify:track:${t}`) }),
    }
  );
  if (!response.ok) {
    throw new Error(`Status:${response.status} Text:${await response.text()}`);
  }
  console.log(await response.text());
}

function shuffleArray(array) {
  for (let i = array.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [array[i], array[j]] = [array[j], array[i]];
  }
}

async function spotify() {
  const tracks = fs
    .readFileSync("tracks.ndjson")
    .toString()
    .split("\n")
    .slice(0, 50);
  const tracksToAdd = [];
  for (const track of tracks) {
    await delay(1000);
    const { artistName, name } = JSON.parse(track);
    // console.info(JSON.stringify(track));
    const {
      tracks: { items },
    } = await getTrackId(artistName, name);
    if (!items) {
      console.error(`No track found ${artistName} track ${name}`);
      continue;
    }
    const [spotifyTrack] = items;
    if (!spotifyTrack) {
      console.error(`No track found ${artistName} track ${name}`);
      continue;
    }
    const { id, name: spotifyTrackName } = spotifyTrack;
    if (name.toUpperCase() !== spotifyTrackName.toUpperCase()) {
      console.error(
        `Wrong track found. Search artist ${artistName} track ${name} result ${spotifyTrackName}`
      );
      continue;
    }
    console.info(`Adding track ${spotifyTrackName}`);
    tracksToAdd.push(id);
  }
  console.log(tracksToAdd);
  shuffleArray(tracksToAdd);
  while (tracksToAdd.length) {
    await addTracksToPlaylist(tracksToAdd.splice(0, 100));
  }
}

spotify();
