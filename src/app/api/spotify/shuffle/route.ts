import { NextResponse } from "next/server";
import { getToken } from "next-auth/jwt";

/**
 * API route to toggle shuffle state
 * PUT /api/spotify/shuffle
 */
export async function PUT(request: Request) {
  const token = await getToken({ req: request as any });
  if (!token || !token.accessToken) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const body = await request.json();
    const shuffleState = body.state;

    const response = await fetch(
      `https://api.spotify.com/v1/me/player/shuffle?state=${shuffleState}`,
      {
        method: "PUT",
        headers: {
          Authorization: `Bearer ${token.accessToken}`,
          "Content-Type": "application/json",
        },
      }
    );

    if (!response.ok) {
      const error = await response.json().catch(() => ({}));
      console.error("Spotify API Error:", response.status, error);
      return NextResponse.json(
        { error: "Failed to toggle shuffle state", details: error },
        { status: response.status }
      );
    }

    // Shuffle endpoint returns 204 No Content on success
    return new NextResponse(null, { status: 204 });
  } catch (error) {
    console.error("Shuffle API error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
