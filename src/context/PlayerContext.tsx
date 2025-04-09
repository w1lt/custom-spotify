"use client";

import React, {
  createContext,
  useContext,
  useState,
  useEffect,
  useRef,
  useCallback,
  ReactNode,
} from "react";
import { useSession } from "next-auth/react";
import useSWR from "swr";
import type { Spotify } from "@/types/spotify-sdk";

// --- Types ---
type SpotifyDevice = SpotifyApi.UserDevice;
type CurrentlyPlayingContext = SpotifyApi.CurrentlyPlayingResponse;
type SdkPlaybackState = Spotify.PlaybackState | null;

interface PlayerState {
  player: Spotify.Player | null;
  isSdkReady: boolean;
  sdkDeviceId: string | null;
  sdkPlayerState: SdkPlaybackState;
  globalPlaybackState: CurrentlyPlayingContext | null | undefined;
  devices: SpotifyDevice[] | undefined;
  isTransferring: boolean;
  playbackError: any;
  devicesError: any;
}
interface PlayerControls {
  togglePlay: () => Promise<void>;
  nextTrack: () => Promise<void>;
  previousTrack: () => Promise<void>;
  seek: (positionMs: number) => Promise<void>;
  transferPlayback: (deviceId: string) => Promise<void>;
  playContext: (
    contextUri: string,
    offset?: { position?: number; uri?: string }
  ) => Promise<void>;
}
interface PlayerContextValue {
  playerState: PlayerState;
  controls: PlayerControls;
  mutatePlayback: () => void;
  mutateDevices: () => void;
}

const PlayerContext = createContext<PlayerContextValue | undefined>(undefined);

const fetcher = (url: string) =>
  fetch(url).then((res) => {
    if (!res.ok) {
      if (res.status === 401) {
        console.error("Token expired (fetcher).");
        return null;
      }
      throw new Error(`Failed to fetch ${url}`);
    }
    return res.status === 204 ? null : res.json();
  });

interface PlayerProviderProps {
  children: ReactNode;
}

export function PlayerProvider({ children }: PlayerProviderProps) {
  const { data: session } = useSession();
  const playerRef = useRef<Spotify.Player | null>(null);
  const [isSdkReady, setIsSdkReady] = useState(false);
  const [sdkDeviceId, setSdkDeviceId] = useState<string | null>(null);
  const [sdkPlayerState, setSdkPlayerState] = useState<SdkPlaybackState>(null);
  const [isTransferring, setIsTransferring] = useState(false);
  const [autoTransferAttempted, setAutoTransferAttempted] = useState(false);

  // --- SWR Hooks ---
  const {
    data: globalPlaybackState,
    error: playbackError,
    mutate: mutatePlayback,
  } = useSWR<CurrentlyPlayingContext | null>(
    session ? "/api/spotify/playback-state" : null,
    fetcher,
    { refreshInterval: sdkPlayerState ? 10000 : 5000 }
  );
  const {
    data: devices,
    error: devicesError,
    mutate: mutateDevices,
  } = useSWR<SpotifyDevice[]>(
    session ? "/api/spotify/devices" : null,
    fetcher,
    { revalidateOnFocus: false, revalidateIfStale: false }
  );

  // --- SDK Token Fetcher ---
  const getOAuthToken = useCallback(
    async (callback: (token: string) => void) => {
      if (!session) return;
      try {
        const response = await fetch("/api/spotify/token");
        if (!response.ok)
          throw new Error(`Token fetch failed: ${response.statusText}`);
        const data = await response.json();
        callback(data.accessToken);
      } catch (error) {
        console.error("Error fetching SDK token:", error);
      }
    },
    [session]
  );

  // --- SDK Initialization ---
  useEffect(() => {
    if (!session || playerRef.current) return;
    const script = document.querySelector(
      'script[src="https://sdk.scdn.co/spotify-player.js"]'
    );

    const initializePlayer = () => {
      if (playerRef.current || !window.Spotify) return;
      console.log("Context: Initializing Player");
      const player = new window.Spotify.Player({
        name: "w1lt's Web Player",
        getOAuthToken,
        volume: 0.5,
      });
      playerRef.current = player;

      player.addListener("initialization_error", ({ message }) => {
        console.error("SDK Init Error:", message);
      });
      player.addListener("authentication_error", ({ message }) => {
        console.error("SDK Auth Error:", message); /* signOut? */
      });
      player.addListener("account_error", ({ message }) => {
        console.error("SDK Account Error:", message);
      });
      player.addListener("playback_error", ({ message }) => {
        console.error("SDK Playback Error:", message);
      });
      player.addListener("player_state_changed", (state) => {
        console.log("Context: State Change:", state);
        setSdkPlayerState(state);
        if (!state) mutatePlayback();
      });
      player.addListener("ready", ({ device_id }) => {
        console.log("Context: SDK Ready", device_id);
        setIsSdkReady(true);
        setSdkDeviceId(device_id);
        mutateDevices();
      });
      player.addListener("not_ready", ({ device_id }) => {
        console.log("Context: SDK Offline", device_id);
        setIsSdkReady(false);
        setSdkDeviceId(null);
        mutateDevices();
        mutatePlayback();
      });
      player
        .connect()
        .then((s) =>
          console.log(s ? "Context: Connected!" : "Context: Connect failed!")
        );
    };

    if (!window.Spotify) {
      window.onSpotifyWebPlaybackSDKReady = initializePlayer;
    } else {
      initializePlayer();
    }

    return () => {
      if (playerRef.current) {
        console.log("Context: Disconnecting");
        playerRef.current.disconnect();
        playerRef.current = null;
      }
      if (window.onSpotifyWebPlaybackSDKReady === initializePlayer) {
        window.onSpotifyWebPlaybackSDKReady = undefined;
      }
    };
  }, [session, getOAuthToken, mutatePlayback, mutateDevices]);

  // --- Playback Controls ---
  const transferPlayback = useCallback(
    async (deviceId: string) => {
      if (!deviceId || isTransferring) return;
      setIsTransferring(true);
      console.log(`Context: Transferring to ${deviceId}`);
      if (sdkDeviceId && deviceId !== sdkDeviceId) {
        setAutoTransferAttempted(false);
      }
      try {
        const res = await fetch("/api/spotify/devices", {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ deviceId }),
        });
        if (res.ok) {
          await new Promise<void>((r) => setTimeout(r, 500));
          await mutatePlayback();
          console.log(`Context: Transfer OK to ${deviceId}`);
        } else {
          console.error(
            `Context: Transfer failed (${res.status}):`,
            await res.json()
          );
          setAutoTransferAttempted(false);
        }
      } catch (err) {
        console.error("Context: Transfer error:", err);
        setAutoTransferAttempted(false);
      } finally {
        setIsTransferring(false);
      }
    },
    [isTransferring, sdkDeviceId, mutatePlayback]
  );

  // --- Auto-Transfer ---
  useEffect(() => {
    if (
      isSdkReady &&
      sdkDeviceId &&
      globalPlaybackState?.is_playing &&
      globalPlaybackState?.device?.id !== sdkDeviceId &&
      !autoTransferAttempted &&
      !isTransferring
    ) {
      console.log("Context: Auto-transferring to SDK");
      setAutoTransferAttempted(true);
      transferPlayback(sdkDeviceId);
    }
  }, [
    globalPlaybackState,
    isSdkReady,
    sdkDeviceId,
    autoTransferAttempted,
    isTransferring,
    transferPlayback,
  ]);

  // --- Memoized Controls ---
  const sdkIsActive = useCallback(
    () => globalPlaybackState?.device?.id === sdkDeviceId,
    [globalPlaybackState, sdkDeviceId]
  );
  const togglePlay = useCallback(async () => {
    if (!playerRef.current || !sdkIsActive()) return;
    try {
      await playerRef.current.togglePlay();
    } catch (e) {
      console.error("Toggle Err:", e);
      mutatePlayback();
    }
  }, [sdkIsActive, mutatePlayback]);
  const nextTrack = useCallback(async () => {
    if (!playerRef.current || !sdkIsActive()) return;
    try {
      await playerRef.current.nextTrack();
    } catch (e) {
      console.error("Next Err:", e);
      mutatePlayback();
    }
  }, [sdkIsActive, mutatePlayback]);
  const previousTrack = useCallback(async () => {
    if (!playerRef.current || !sdkIsActive()) return;
    try {
      await playerRef.current.previousTrack();
    } catch (e) {
      console.error("Prev Err:", e);
      mutatePlayback();
    }
  }, [sdkIsActive, mutatePlayback]);
  const seek = useCallback(
    async (ms: number) => {
      if (!playerRef.current || !sdkIsActive()) return;
      try {
        await playerRef.current.seek(ms);
      } catch (e) {
        console.error("Seek Err:", e);
        mutatePlayback();
      }
    },
    [sdkIsActive, mutatePlayback]
  );
  const playContext = useCallback(
    async (
      contextUri: string,
      offset?: { position?: number; uri?: string }
    ) => {
      console.log(`Context: Play context req: ${contextUri}`, offset);
      let targetDeviceId =
        isSdkReady && sdkDeviceId
          ? sdkDeviceId // Prefer SDK if ready
          : globalPlaybackState?.device?.id ?? undefined; // Fallback to global state device

      const payload: any = { contextUri, offset };

      // If no target device is found, but the SDK is ready, try activating it first
      if (!targetDeviceId && isSdkReady && sdkDeviceId) {
        console.warn("No active device, attempting to activate SDK player...");
        try {
          await transferPlayback(sdkDeviceId); // Attempt transfer
          await new Promise((resolve) => setTimeout(resolve, 750)); // Wait for transfer to potentially complete
          targetDeviceId = sdkDeviceId; // Assume transfer succeeded for the play request
          console.log("SDK player activated, proceeding with play.");
        } catch (error) {
          console.error(
            "Failed to auto-transfer to SDK before playing:",
            error
          );
          // Optionally alert the user or handle the error differently
          alert(
            "Could not activate the web player. Please select a device manually."
          );
          return; // Stop if transfer fails
        }
      }

      if (targetDeviceId) {
        payload.deviceId = targetDeviceId;
      } else {
        console.warn("No active device found for playContext after check.");
        // Alert the user or handle the lack of device
        alert(
          "No active Spotify device found. Please start playback on a device first."
        );
        return; // Don't attempt to play if no device ID could be determined
      }

      try {
        const res = await fetch("/api/spotify/play", {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        });
        if (!res.ok) {
          const err = await res.json();
          console.error("Play Context Err:", err);
          alert(`Play failed: ${err.error}`);
        } else {
          console.log("Play context OK");
          setTimeout(() => {
            mutatePlayback();
          }, 750);
        }
      } catch (error) {
        console.error("Play Context Network Err:", error);
        alert("Network error playing context.");
      }
    },
    [
      isSdkReady,
      sdkDeviceId,
      globalPlaybackState,
      mutatePlayback,
      transferPlayback,
    ]
  );

  // --- Context Value ---
  const value: PlayerContextValue = {
    playerState: {
      player: playerRef.current,
      isSdkReady,
      sdkDeviceId,
      sdkPlayerState,
      globalPlaybackState,
      devices,
      isTransferring,
      playbackError,
      devicesError,
    },
    controls: {
      togglePlay,
      nextTrack,
      previousTrack,
      seek,
      transferPlayback,
      playContext,
    },
    mutatePlayback,
    mutateDevices,
  };

  return (
    <PlayerContext.Provider value={value}>{children}</PlayerContext.Provider>
  );
}

// --- Custom Hook ---
export function usePlayer(): PlayerContextValue {
  const context = useContext(PlayerContext);
  if (context === undefined) {
    throw new Error("usePlayer must be used within PlayerProvider");
  }
  return context;
}
