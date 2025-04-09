import { NextResponse, NextRequest } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import { SpotifyWebApi } from "@/lib/spotify";

export async function PUT(request: NextRequest) {
  const session = await getServerSession(authOptions);

  if (!session || !session.user?.accessToken) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  }

  const { contextUri, uris, offset, deviceId } = await request.json();
  // Determine active device ID - ideally passed from client, or fetch here
  // For now, let's assume playback on the currently active device (if any)
  // let deviceId = undefined; // Or fetch active device

  // Validation: Need either contextUri or uris
  if (!contextUri && (!uris || !Array.isArray(uris) || uris.length === 0)) {
    return NextResponse.json(
      { error: "Requires contextUri or uris" },
      { status: 400 }
    );
  }
  if (contextUri && uris) {
    return NextResponse.json(
      { error: "Cannot provide both contextUri and uris" },
      { status: 400 }
    );
  }

  const userSpotifyApi = new SpotifyWebApi({
    accessToken: session.user.accessToken,
  });

  // Construct payload based on input
  const payload: any = {};
  if (contextUri) {
    payload.context_uri = contextUri;
    if (offset !== undefined) {
      payload.offset = offset; // e.g., { position: 5 } or { uri: "spotify:track:..." }
    }
  } else if (uris) {
    payload.uris = uris;
    // Offset can also be used with URIs, but typically it's simpler to just order the URIs array
  }

  // Add device_id if it was provided in the request body
  if (deviceId) {
    payload.device_id = deviceId;
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
