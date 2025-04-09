import SpotifyWebApi from "spotify-web-api-node";

const scopes = [
  "user-read-email",
  "playlist-read-private",
  "playlist-read-collaborative",
  "streaming",
  "user-read-private",
  "user-library-read",
  // "user-library-modify", // If you need to modify library
  "user-top-read",
  "user-read-playback-state",
  "user-modify-playback-state",
  "user-read-currently-playing",
  "user-read-recently-played",
  "user-follow-read",
].join(",");

const params = {
  scope: scopes,
};

const queryParamString = new URLSearchParams(params).toString();

export const LOGIN_URL = `https://accounts.spotify.com/authorize?${queryParamString}`;

const spotifyApi = new SpotifyWebApi({
  clientId: process.env.SPOTIFY_CLIENT_ID,
  clientSecret: process.env.SPOTIFY_CLIENT_SECRET,
  // redirectUri: process.env.SPOTIFY_REDIRECT_URI // Not needed for client credentials flow or token refresh
});

export default spotifyApi;
export { SpotifyWebApi };
