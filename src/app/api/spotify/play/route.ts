import { NextResponse, NextRequest } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import { SpotifyWebApi } from "@/lib/spotify";

export async function PUT(request: NextRequest) {
  const session = await getServerSession(authOptions);

  if (!session || !session.user?.accessToken) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  }

  // Destructure using snake_case matching the frontend payload
  const { context_uri, uris, offset, device_id } = await request.json();

  // Validation: Need either context_uri or uris
  if (!context_uri && (!uris || !Array.isArray(uris) || uris.length === 0)) {
    return NextResponse.json(
      { error: "Requires context_uri or uris" }, // Error message reflects backend variable now
      { status: 400 }
    );
  }
  // Validation: Cannot provide both
  if (context_uri && uris) {
    return NextResponse.json(
      { error: "Cannot provide both context_uri and uris" }, // Error message reflects backend variable
      { status: 400 }
    );
  }

  const userSpotifyApi = new SpotifyWebApi({
    accessToken: session.user.accessToken,
  });

  // Construct payload for Spotify API using their expected keys (snake_case)
  const payload: any = {};
  if (context_uri) {
    payload.context_uri = context_uri;
    if (offset !== undefined) {
      // Ensure offset keys are also snake_case if needed by the library/API
      // Assuming the library handles offset structure correctly
      payload.offset = offset;
    }
  } else if (uris) {
    payload.uris = uris;
    // Offset is generally not used with uris array
  }

  // Add device_id if it was provided
  if (device_id) {
    payload.device_id = device_id;
  }

  try {
    await userSpotifyApi.play(payload);
    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error("Error starting playback:", error);
    if (error.statusCode === 401) {
      return NextResponse.json(
        { error: "Spotify token expired or invalid" },
        { status: 401 }
      );
    }
    if (error.statusCode === 403) {
      // Common if trying to play on inactive device or restricted content
      return NextResponse.json(
        { error: "Playback forbidden (check device/premium status)" },
        { status: 403 }
      );
    }
    if (error.statusCode === 404) {
      return NextResponse.json(
        { error: "Device not found or player command failed" },
        { status: 404 }
      );
    }
    return NextResponse.json(
      { error: "Failed to start playback" },
      { status: 500 }
    );
  }
}
