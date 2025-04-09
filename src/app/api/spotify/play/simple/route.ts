import { NextResponse, NextRequest } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import spotifyApi from "@/lib/spotify";

export async function PUT(request: NextRequest) {
  const requestId = Math.random().toString(36).substring(2, 9);
  console.log(
    `[${requestId}] SIMPLE PLAY REQUEST START ${new Date().toISOString()}`
  );

  const session = await getServerSession(authOptions);

  if (!session?.user?.accessToken) {
    console.log(`[${requestId}] Authentication failed`);
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  }

  let body;
  try {
    body = await request.json();
  } catch (e) {
    // Empty body is acceptable
    body = {};
  }

  const { device_id } = body;

  console.log(
    `[${requestId}] Simple play request params:`,
    JSON.stringify({ device_id }, null, 2)
  );

  try {
    spotifyApi.setAccessToken(session.user.accessToken);

    const options: { device_id?: string } = {};
    if (device_id) {
      options.device_id = device_id;
    }

    console.log(
      `[${requestId}] Calling spotifyApi.play with options:`,
      JSON.stringify(options, null, 2)
    );

    const startTime = Date.now();
    await spotifyApi.play(options);
    const responseTime = Date.now() - startTime;

    console.log(`[${requestId}] Simple play successful (${responseTime}ms)`);
    return new NextResponse(null, { status: 204 });
  } catch (error: any) {
    console.error(
      `[${requestId}] Error calling Spotify simple play API:`,
      error
    );

    const status = error.statusCode || 500;
    const message = error.body?.error?.message || "Failed to start playback";
    const reason = error.body?.error?.reason;

    // Enhanced error logging
    if (error.body?.error) {
      console.log(
        `[${requestId}] Detailed error:`,
        JSON.stringify(error.body.error, null, 2)
      );
    }

    console.log(
      `[${requestId}] SIMPLE PLAY REQUEST END (FAILED) ${new Date().toISOString()}`
    );
    return NextResponse.json({ error: message, reason: reason }, { status });
  }
}
