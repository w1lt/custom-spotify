import { NextResponse } from "next/server";
// import { getSpotifyApi } from "@/lib/spotify"; // Incorrect import
import spotifyApi from "@/lib/spotify"; // Correct: Import the default instance
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";

export async function GET() {
  const session = await getServerSession(authOptions);

  if (!session?.user?.accessToken) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  }

  try {
    // const spotifyApi = getSpotifyApi(session.user.accessToken); // Incorrect usage
    spotifyApi.setAccessToken(session.user.accessToken); // Correct: Set token on the imported instance

    // Get the last played track (limit=1)
    const response = await spotifyApi.getMyRecentlyPlayedTracks({ limit: 1 });

    if (response.body && response.body.items.length > 0) {
      // Return the first PlayHistoryObject (which contains the track)
      return NextResponse.json(response.body.items[0]);
    } else {
      // No recently played tracks found
      return NextResponse.json(null, { status: 200 }); // Return null if empty
    }
  } catch (error: any) {
    console.error("Error fetching recently played:", error);
    const status = error.statusCode || 500;
    const message =
      error.body?.error?.message || "Failed to fetch recently played";
    return NextResponse.json({ error: message }, { status });
  }
}
