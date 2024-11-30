const clientId = "70e55b3d35cf454f9fce7c88ee08a170"; 
const redirectUri = "http://localhost:5500"; 
const scopes = ["user-top-read"];
let accessToken = null;
let cachedTopTracks = null;
let cachedRecommendations = null;


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

// Event listener for top tracks button
document.getElementById("get-tracks").addEventListener("click", async () => {
  if (!accessToken) {
    alert("You need to log in first.");
    return;
  }

  const recommendationsContainer = document.getElementById('recommendations-container');

  if (recommendationsContainer) {
    recommendationsContainer.classList.add('hidden');
  }

  const topTracksContainer = document.getElementById('tracks-container');
  topTracksContainer.classList.remove('hidden');

  document.getElementById("max-heap-recommend-button").classList.remove("hidden");
  document.getElementById("map-recommend-button").classList.remove("hidden");
  document.getElementById("get-tracks").classList.add("hidden");

  if (cachedTopTracks) {
    displayTracks(cachedTopTracks);
    return;
  }

  showSpinner();

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

    cachedTopTracks = data.items;
    
  } catch (error) {
    console.error(error);
    alert("Error fetching top tracks");
  }
  hideSpinner();

  //change back button back 
  const buttonName1 = document.getElementById('get-tracks');
  buttonName1.textContent = 'Show Recommendations With Max Heap';
});

// Event Listener for recommendations
document.getElementById('max-heap-recommend-button').addEventListener('click', async () => {
  document.getElementById("map-recommend-button").classList.add("hidden");

  const token = accessToken;
  const tracks = await getTopTracks(token);

  if (cachedRecommendations) {
    displayRecommendations(cachedRecommendations);
    return;
  }

  showSpinner();

  if (!tracks || tracks.length === 0) {
    alert("No top tracks available.");
    return;
  }

  const topGenres = await getTopGenres(tracks, token);

  if (topGenres.length === 0) {
    alert("No genres found for your top tracks.");
    hideSpinner();
    return;
  }

  const topTracksContainer = document.getElementById('tracks-container');
  if (topTracksContainer) {
    topTracksContainer.classList.add('hidden');
  }

  const recommendationsContainer = document.getElementById('recommendations-container');
  if (recommendationsContainer) {
    recommendationsContainer.classList.remove('hidden');
  }

  document.getElementById("max-heap-recommend-button").classList.add("hidden");
  document.getElementById("get-tracks").classList.remove("hidden");


  const popularTracks = await getPopularTracks(topGenres, token);

  const maxHeap = new MaxHeap();
  popularTracks.forEach((track) => maxHeap.insert(track));

  const recommendations = [];
  while (maxHeap.heap.length > 0) {
    recommendations.push(maxHeap.extractMax());
  }

  cachedRecommendations = recommendations;
  displayRecommendations(recommendations);
  
  hideSpinner();
  // BACK BUTTON
  const buttonName2 = document.getElementById('get-tracks');
  buttonName2.textContent = 'Back';
});


// Function to display the user's top tracks
async function displayTracks(tracks) {
  showSpinner();
  const tracksContainer = document.getElementById("tracks-container");
  const tracksList = document.getElementById("tracks-list");
  const logo = document.getElementById("logo");
  const footer = document.querySelector("footer");

  logo.classList.add("hidden");
  logo.style.display = "none";
  footer.classList.add("hidden");

  tracksList.innerHTML = "";

  for (const [index, track] of tracks.entries()) {
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

    // Apply color based on rank
    if(index === 0){
      listItem.style.color = "gold";
    }
    else if(index === 1){
      listItem.style.color = "silver";
    }
    else if(index === 2){
      listItem.style.color = "#cd7f32";
    }
    else{
      listItem.style.color = "white";
    }

    tracksList.appendChild(listItem);
  }

  tracksContainer.classList.remove("hidden");

  // Show the music notes
  const notesLeft = document.getElementById("notes-left");
  const notesRight = document.getElementById("notes-right");
  notesLeft.style.display = "block";
  notesRight.style.display = "block";
  hideSpinner();
}


async function getTopTracks(accessToken) {
  try {
    const response = await fetch('https://api.spotify.com/v1/me/top/tracks', {
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
    });

    if (!response.ok) {
      throw new Error(`Error fetching top tracks: ${response.statusText}`);
    }

    const data = await response.json();
    return data.items;
  } catch (error) {
    console.error(error);
    return [];
  }
}

// Function to fetch genres for a list of artist IDs
async function fetchGenres(artistIds, accessToken) {
  const genres = [];
  try {
    for (const artistId of artistIds) {
      const response = await fetch(`https://api.spotify.com/v1/artists/${artistId}`, {
        headers: {
          Authorization: `Bearer ${accessToken}`,
        },
      });

      if (response.ok) {
        const artist = await response.json();
        if (artist.genres && artist.genres.length > 0) {
          genres.push(...artist.genres);
        }
      } else {
        console.error(`Error fetching genres for artist ${artistId}: ${response.statusText}`);
        console.log();
      }
    }
  } catch (error) {
    console.error(error);
  }
  return genres;
}

// Function to get the 5 most common genres
async function getTopGenres(tracks, accessToken) {
  const artistIds = tracks.map((track) => track.artists[0].id);
  const genres = await fetchGenres(artistIds, accessToken);

  const genreCounts = {};
  genres.forEach((genre) => {
    genreCounts[genre] = (genreCounts[genre] || 0) + 1;
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
  let recommendationsContainer = document.getElementById('recommendations-container');

  if (!recommendationsContainer) {
    recommendationsContainer = document.createElement('div');
    recommendationsContainer.id = 'recommendations-container';
    recommendationsContainer.innerHTML = '<h2>Recommended Tracks (Max Heap)</h2><ul id="recommendations-list"></ul>';
    
    
    recommendationsContainer.style.borderRadius = "8px";
    recommendationsContainer.style.padding = "0px";
    recommendationsContainer.style.backgroundColor = "#282828";
    recommendationsContainer.style.color = "#fff";
    recommendationsContainer.style.maxWidth = "600px";
    recommendationsContainer.style.margin = "10px auto";
    recommendationsContainer.style.outline = "none";

    document.body.appendChild(recommendationsContainer);
    const mainContainer = document.querySelector('.container'); 
        mainContainer.appendChild(recommendationsContainer);
  }

  const list = document.getElementById('recommendations-list');
  list.innerHTML = "";

  if (tracks.length === 0) {
    const listItem = document.createElement('li');
    listItem.textContent = "No recommendations available.";
    listItem.style.color = "#333";
    listItem.style.textAlign = "center";
    list.appendChild(listItem);
    return;
  }

  const uniqueTracks = new Set();
    tracks.forEach((track, index) => {
        if (!uniqueTracks.has(track.id)) {
            const listItem = document.createElement('li');
            uniqueTracks.add(track.id);
            listItem.innerHTML = `
                ${track.name} by 
                ${track.artists.map((artist) => `<strong>${artist.name}</strong>`).join(", ")}
            `; 

            listItem.style.backgroundColor = "#333";

            if (index >= 0) {
                listItem.style.color = "white";
            }
            

            list.appendChild(listItem);
        }
    });

  list.style.listStyle = "none";
  list.style.padding = "0";
  list.style.margin = "0";
}

function showSpinner() {
  const spinner = document.getElementById('loading-spinner');
  if (spinner) {
    spinner.classList.remove('hidden');
  }
}

function hideSpinner() {
  const spinner = document.getElementById('loading-spinner');
  if (spinner) {
    spinner.classList.add('hidden');
  }
}
