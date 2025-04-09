import { NextResponse, NextRequest } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import { SpotifyWebApi } from "@/lib/spotify";

// Define context type including params
interface Context {
  params: {
    playlistId: string;
  };
}

export async function GET(request: NextRequest, context: Context) {
  const session = await getServerSession(authOptions);
  const { playlistId } = context.params;

  if (!session || !session.user?.accessToken) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  }

  if (!playlistId) {
    return NextResponse.json(
      { error: "Playlist ID is required" },
      { status: 400 }
    );
  }

  const userSpotifyApi = new SpotifyWebApi({
    accessToken: session.user.accessToken,
  });

  try {
    // Fetch specific playlist details
    // Customize fields as needed by the PlaylistPage component
    const playlistData = await userSpotifyApi.getPlaylist(playlistId, {
      fields:
        "id,name,description,images,owner.display_name,uri,tracks.items(track(id,name,uri,artists(name),album(id,name,images),duration_ms))",
    });

    return NextResponse.json(playlistData.body);
  } catch (error: any) {
    console.error(
      `Error fetching /api/spotify/playlists/${playlistId}:`,
      error
    );
    const status = error.statusCode || 500;
    const message =
      error.body?.error?.message ||
      error.message ||
      `Failed to fetch playlist ${playlistId}`;

    // Specific handling for 404 (Not Found)
    if (status === 404) {
      return NextResponse.json(
        { error: `Playlist with ID ${playlistId} not found.` },
        { status: 404 }
      );
    }

    return NextResponse.json({ error: message }, { status });
  }
}
