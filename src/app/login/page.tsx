"use client";

import { signIn, useSession } from "next-auth/react";
import { useEffect } from "react";
import { useRouter } from "next/navigation";

export default function LoginPage() {
  const { data: session, status } = useSession();
  const router = useRouter();

  useEffect(() => {
    // Redirect if already logged in
    if (status === "authenticated") {
      router.push("/"); // Redirect to home page after login
    }
  }, [status, router]);

  if (status === "loading") {
    return <div>Loading...</div>; // Or a loading spinner
  }

  // Don't render login button if already authenticated (or during redirect)
  if (status === "authenticated") {
    return null;
  }

  return (
    <div className="flex flex-col items-center justify-center min-h-screen py-2">
      <h1 className="text-3xl font-bold mb-6">Login with Spotify</h1>
      <button
        onClick={() => signIn("spotify", { callbackUrl: "/" })}
        className="bg-green-500 hover:bg-green-700 text-white font-bold py-2 px-4 rounded"
      >
        Login with Spotify
      </button>
    </div>
  );
}
