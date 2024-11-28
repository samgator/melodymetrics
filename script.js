const clientId = "d69264f6364a472fa139415e9f7593e1"; 
const redirectUri = "http://localhost:5500"; 
const scopes = ["user-top-read"];
let accessToken = "debe5816694843779b9be70e98fc9c81";

// Helper for Spotify login
document.getElementById("login-button").addEventListener("click", () => {
  const authUrl = `https://accounts.spotify.com/authorize?client_id=${clientId}&response_type=token&redirect_uri=${encodeURIComponent(
    redirectUri
  )}&scope=${encodeURIComponent(scopes.join(" "))}`;
  window.location.href = authUrl;
});

// Get access token from the URL hash
window.onload = () => {
  const hash = window.location.hash;
  if (hash) {
    const params = new URLSearchParams(hash.substring(1));
    accessToken = params.get("access_token");

    if (accessToken) {
      document.getElementById("login-button").classList.add("hidden");
      document.getElementById("get-tracks").classList.remove("hidden");
    }
  }
};

// Get user's top tracks
document.getElementById("get-tracks").addEventListener("click", async () => {
  if (!accessToken) {
    alert("You need to log in first.");
    return;
  }

  try {
    const response = await fetch("https://api.spotify.com/v1/me/top/tracks", {
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

// Display tracks
function displayTracks(tracks) {
  const tracksContainer = document.getElementById("tracks-container");
  const tracksList = document.getElementById("tracks-list");
  const logo = document.getElementById("logo");

  tracksList.innerHTML = "";

  tracks.forEach((track) => {
    const listItem = document.createElement("li");
    listItem.innerHTML = `
      <strong>${track.name}</strong> by ${track.artists.map((a) => a.name).join(", ")}
    `;
    tracksList.appendChild(listItem);
  });

  tracksContainer.classList.remove("hidden");
  logo.classList.add("hidden");
}
