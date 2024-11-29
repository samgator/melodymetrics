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
  }
};

// Get user's top tracks
document.getElementById("get-tracks").addEventListener("click", async () => {
  if (!accessToken) {
    alert("You need to log in first.");
    return;
  }

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
      listItem.style.color = "bronze";
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
}

// Function to process genres
function processGenres(tracks) {
  const genreMap = new Map();

  tracks.forEach((track) => {
    if (track.artists.length > 0) {
      track.artists.forEach(async (artist) => {
        const artistResponse = await fetch(`https://api.spotify.com/v1/artists/${artist.id}`, {
          headers: {
            Authorization: `Bearer ${accessToken}`,
          },
        });

        if (artistResponse.ok) {
          const artistData = await artistResponse.json();
          artistData.genres.forEach((genre) => {
            if (!genreMap.has(genre)) {
              genreMap.set(genre, []);
            }
            genreMap.get(genre).push({
              name: track.name,
              artists: track.artists.map((a) => a.name).join(", "),
              popularity: track.popularity,
            });
          });
        }
      });
    }
  });

}
