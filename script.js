const clientId = "d69264f6364a472fa139415e9f7593e1"; 
const redirectUri = "http://localhost:5500"; 
const scopes = ["user-top-read"];
let accessToken = null;

// Helper for Spotify login
document.getElementById("login-button").addEventListener("click", () => {
  const authUrl = `https://accounts.spotify.com/authorize?response_type=token&client_id=${clientId}&redirect_uri=${encodeURIComponent(
    redirectUri
  )}&scope=${encodeURIComponent(scopes)}`;

  window.location.href = authUrl;
});

// Get access token from the URL hash
window.onload = () => {
  const hash = window.location.hash.substring(1);
  const params = new URLSearchParams(hash);
  
  if (params.has("access_token")) {
    accessToken = params.get("access_token");
    document.getElementById("get-tracks").classList.remove("hidden");
    document.getElementById("login-button").classList.add("hidden");
};
}

// Get user's top tracks
document.getElementById("get-tracks").addEventListener("click", async () => {
  if (!accessToken) {
    alert("You need to log in first.");
    return;
  }

  document.getElementById("recommend-button").classList.remove("hidden");

  try {
    
    const response = await fetch("https://api.spotify.com/v1/me/top/tracks?limit=50", {
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
    });

    if (!response.ok) {
      throw new Error("Failed to fetch top tracks");
    }

    const data = await response.json();
    displayTracks(data.items);
    
  } catch (error) {
    console.error(error);
    alert("Error fetching top tracks");
  }
});

// Function to display the user's top tracks
async function displayTracks(tracks) {
  const tracksContainer = document.getElementById("tracks-container");
  const tracksList = document.getElementById("tracks-list");
  const logo = document.getElementById("logo");
  const footer = document.querySelector("footer");

  logo.classList.add("hidden");
  logo.style.display = "none";
  footer.classList.add("hidden");

  tracksList.innerHTML = "";

  for (const track of tracks) {
    const listItem = document.createElement("li");

    const artistResponse = await fetch(`https://api.spotify.com/v1/artists/${track.artists[0].id}`, {
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
    });

    let genres = [];
    if (artistResponse.ok) {
      const artistData = await artistResponse.json();
      genres = artistData.genres;
    }

    listItem.innerHTML = `
      ${track.name} by 
      ${track.artists.map((artist) => `<strong>${artist.name}</strong>`).join(", ")}
      <br><em>Genres: ${genres.join(", ")}</em>`;
    tracksList.appendChild(listItem);
  }

  tracksContainer.classList.remove("hidden");

  const notesLeft = document.getElementById("notes-left");
  const notesRight = document.getElementById("notes-right");
  notesLeft.style.display = "block";
  notesRight.style.display = "block";
}


async function getTopTracks(accessToken) {
  const response = await fetch('https://api.spotify.com/v1/me/top/tracks', {
    headers: {
      Authorization: `Bearer ${accessToken}`,
    },
  });
  const data = await response.json();
  return data.items;
}

// Function to get the 5 most common genres
function getTopGenres(tracks) {
  const genreCounts = {};
  tracks.forEach((track) => {
    if (track.album.artists[0].genres) {
      track.album.artists[0].genres.forEach((genre) => {
        genreCounts[genre] = (genreCounts[genre] || 0) + 1;
      });
    }
  });

  const sortedGenres = Object.entries(genreCounts)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5);

  return sortedGenres.map((genre) => genre[0]);
}

// Get popular tracks in given genres
async function getPopularTracks(genres, accessToken) {
  const popularTracks = [];
  for (const genre of genres) {
    const response = await fetch(
      `https://api.spotify.com/v1/search?q=genre:"${genre}"&type=track&limit=5`,
      {
        headers: {
          Authorization: `Bearer ${accessToken}`,
        },
      }
    );
    const data = await response.json();
    popularTracks.push(...data.tracks.items);
  }
  return popularTracks;
}

// Max Heap for sorting by popularity
class MaxHeap {
  constructor() {
    this.heap = [];
  }

  insert(track) {
    this.heap.push(track);
    this.bubbleUp();
  }

  bubbleUp() {
    let index = this.heap.length - 1;
    while (index > 0) {
      const parentIndex = Math.floor((index - 1) / 2);
      if (this.heap[index].popularity <= this.heap[parentIndex].popularity) break;
      [this.heap[index], this.heap[parentIndex]] = [this.heap[parentIndex], this.heap[index]];
      index = parentIndex;
    }
  }

  extractMax() {
    const max = this.heap[0];
    const end = this.heap.pop();
    if (this.heap.length > 0) {
      this.heap[0] = end;
      this.sinkDown();
    }
    return max;
  }

  sinkDown() {
    let index = 0;
    const length = this.heap.length;
    while (true) {
      let leftChildIndex = 2 * index + 1;
      let rightChildIndex = 2 * index + 2;
      let swap = null;

      if (leftChildIndex < length && this.heap[leftChildIndex].popularity > this.heap[index].popularity) {
        swap = leftChildIndex;
      }

      if (
        rightChildIndex < length &&
        this.heap[rightChildIndex].popularity > (swap === null ? this.heap[index].popularity : this.heap[leftChildIndex].popularity)
      ) {
        swap = rightChildIndex;
      }

      if (!swap) break;
      [this.heap[index], this.heap[swap]] = [this.heap[swap], this.heap[index]];
      index = swap;
    }
  }
}

// Display Recommendations
function displayRecommendations(tracks) {
  const recommendationsContainer = document.createElement('div');
  recommendationsContainer.id = 'recommendations-container';
  recommendationsContainer.innerHTML = '<h2>Recommended Tracks</h2><ul id="recommendations-list"></ul>';
  document.body.appendChild(recommendationsContainer);

  const list = document.getElementById('recommendations-list');
  tracks.forEach((track) => {
    const listItem = document.createElement('li');
    listItem.textContent = `${track.name} by ${track.artists.map((artist) => artist.name).join(', ')}`;
    list.appendChild(listItem);
  });
}

// Event Listener
document.getElementById('get-tracks').addEventListener('click', async () => {
  const tracks = await getTopTracks(accessToken);

  const topGenres = getTopGenres(tracks);
  const popularTracks = await getPopularTracks(topGenres, accessToken);

  const maxHeap = new MaxHeap();
  popularTracks.forEach((track) => maxHeap.insert(track));

  const recommendations = [];
  while (maxHeap.heap.length > 0) {
    recommendations.push(maxHeap.extractMax());
  }

  displayRecommendations(recommendations);
});

