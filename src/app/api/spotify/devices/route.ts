import { NextResponse, NextRequest } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import { SpotifyWebApi } from "@/lib/spotify";

// GET request to list available devices
export async function GET() {
  const session = await getServerSession(authOptions);

  if (!session || !session.user?.accessToken) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  }

  const userSpotifyApi = new SpotifyWebApi({
    accessToken: session.user.accessToken,
  });

  try {
    const data = await userSpotifyApi.getMyDevices();
    return NextResponse.json(data.body.devices || []);
  } catch (error: any) {
    console.error("Error fetching devices:", error);
    if (error.statusCode === 401) {
      return NextResponse.json(
        { error: "Spotify token expired or invalid" },
        { status: 401 }
      );
    }
    return NextResponse.json(
      { error: "Failed to fetch devices" },
      { status: 500 }
    );
  }
}

// PUT request to transfer playback
export async function PUT(request: NextRequest) {
  const session = await getServerSession(authOptions);

  if (!session || !session.user?.accessToken) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  }

  const { deviceId } = await request.json(); // Get target device ID from request body

  if (!deviceId) {
    return NextResponse.json(
      { error: "Device ID is required" },
      { status: 400 }
    );
  }

  const userSpotifyApi = new SpotifyWebApi({
    accessToken: session.user.accessToken,
  });

  try {
    // The API expects an array of device IDs, even if just one
    // The 'play' parameter can be set to true to start playback immediately,
    // or false to just transfer without changing play state. Let's set to true.
    await userSpotifyApi.transferMyPlayback([deviceId], { play: true });
    return NextResponse.json({
      success: true,
      message: `Playback transferred to ${deviceId}`,
    });
  } catch (error: any) {
    console.error("Error transferring playback:", error);
    if (error.statusCode === 401) {
      return NextResponse.json(
        { error: "Spotify token expired or invalid" },
        { status: 401 }
      );
    }
    if (error.statusCode === 404) {
      return NextResponse.json(
        { error: "Device not found or inactive" },
        { status: 404 }
      );
    }
    return NextResponse.json(
      { error: "Failed to transfer playback" },
      { status: 500 }
    );
  }
}
