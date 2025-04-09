import { NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import { SpotifyWebApi } from "@/lib/spotify";

export async function GET() {
  const session = await getServerSession(authOptions);

  if (!session || !session.user?.accessToken) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  }

  const userSpotifyApi = new SpotifyWebApi({
    accessToken: session.user.accessToken,
  });

  try {
    const meData = await userSpotifyApi.getMe();
    return NextResponse.json(meData.body);
  } catch (error: any) {
    console.error("Error fetching /api/spotify/me:", error);
    // Forward Spotify's error status code if available
    const status = error.statusCode || 500;
    return NextResponse.json(
      {
        error:
          error.body?.error?.message ||
          error.message ||
          "Failed to fetch user profile",
      },
      { status }
    );
  }
}
