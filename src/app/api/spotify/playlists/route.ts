import { NextResponse, NextRequest } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import { SpotifyWebApi } from "@/lib/spotify";

export async function GET(request: NextRequest) {
  const session = await getServerSession(authOptions);

  if (!session || !session.user?.accessToken) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  }

  // Optional: Get query params for pagination/limit if needed later
  // const { searchParams } = new URL(request.url);
  // const limit = searchParams.get('limit') || '50';
  // const offset = searchParams.get('offset') || '0';

  const userSpotifyApi = new SpotifyWebApi({
    accessToken: session.user.accessToken,
  });

  try {
    const playlistsData = await userSpotifyApi.getUserPlaylists({
      limit: 50, // Default to 50, could use query param
      // offset: parseInt(offset), // Could use query param
    });
    // Return the structure expected by the client { items: Playlist[] }
    return NextResponse.json(playlistsData.body);
  } catch (error: any) {
    console.error("Error fetching /api/spotify/playlists:", error);
    const status = error.statusCode || 500;
    return NextResponse.json(
      {
        error:
          error.body?.error?.message ||
          error.message ||
          "Failed to fetch playlists",
      },
      { status }
    );
  }
}
