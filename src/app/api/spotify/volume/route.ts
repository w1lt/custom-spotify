import { NextResponse, NextRequest } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import { SpotifyWebApi } from "@/lib/spotify";

// PUT request to set volume
export async function PUT(request: NextRequest) {
  const session = await getServerSession(authOptions);

  if (!session || !session.user?.accessToken) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  }

  let body;
  try {
    body = await request.json();
  } catch (e) {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const { volume_percent } = body;

  if (
    typeof volume_percent !== "number" ||
    volume_percent < 0 ||
    volume_percent > 100
  ) {
    return NextResponse.json(
      { error: "Invalid volume_percent (must be 0-100)" },
      { status: 400 }
    );
  }

  const userSpotifyApi = new SpotifyWebApi({
    accessToken: session.user.accessToken,
  });

  try {
    // Call Spotify API to set volume
    await userSpotifyApi.setVolume(volume_percent);
    // Return success with no content
    return new NextResponse(null, { status: 204 });
  } catch (error: any) {
    console.error("Error setting volume:", error);
    const status = error.statusCode || 500;
    const message = error.body?.error?.message || "Failed to set volume";
    const reason = error.body?.error?.reason;

    // Handle specific errors (e.g., no active device, token issues)
    if (error.statusCode === 401) {
      return NextResponse.json(
        { error: "Spotify token expired or invalid" },
        { status: 401 }
      );
    }
    if (error.statusCode === 404 && reason === "NO_ACTIVE_DEVICE") {
      return NextResponse.json(
        { error: "No active device found to set volume for" },
        { status: 404 }
      );
    }
    if (error.statusCode === 403) {
      return NextResponse.json(
        { error: "Setting volume forbidden (check premium status?)" },
        { status: 403 }
      );
    }

    // Generic error
    return NextResponse.json({ error: message, reason: reason }, { status });
  }
}
