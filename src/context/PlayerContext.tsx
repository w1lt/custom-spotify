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
  localProgress: number | null;
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
    contextUri?: string,
    offset?: { position?: number; uri?: string }
  ) => Promise<void>;
  setVolume: (volumePercent: number) => Promise<void>;
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
  const [localProgress, setLocalProgress] = useState<number | null>(null);
  const progressTimerRef = useRef<NodeJS.Timeout | null>(null);
  const lastUpdateTimeRef = useRef<number>(0);

  // --- SWR Hooks ---
  const {
    data: globalPlaybackState,
    error: playbackError,
    mutate: mutatePlayback,
  } = useSWR<CurrentlyPlayingContext | null>(
    session ? "/api/spotify/playback-state" : null,
    fetcher,
    {
      // Dynamically set refresh interval based on playback state and active device
      refreshInterval: () => {
        // Access state from the current closure. This might be slightly stale for the interval decision,
        // but the fetch itself will get fresh data.
        const isActive = globalPlaybackState?.device?.id === sdkDeviceId;
        const isPlaying = globalPlaybackState?.is_playing;

        // console.log(`Context SWR Interval: isActive=${isActive}, isPlaying=${isPlaying}, sdkDeviceId=${sdkDeviceId}, globalDeviceId=${globalPlaybackState?.device?.id}`);

        if (isPlaying && isActive) {
          return 1000; // Fast refresh when playing on SDK
        }
        return 5000; // Slower refresh otherwise (or if initial state is null)
      },
      // revalidateOnFocus: false, // Optional: Keep other SWR config
    }
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

  // Progress tracking effect - maintains local progress between API updates
  useEffect(() => {
    // Clear any existing timer
    if (progressTimerRef.current) {
      clearInterval(progressTimerRef.current);
      progressTimerRef.current = null;
    }

    // Initialize local progress from API data when it changes
    if (globalPlaybackState?.progress_ms !== undefined) {
      setLocalProgress(globalPlaybackState.progress_ms);
      lastUpdateTimeRef.current = Date.now();
    }

    // If playing, start local progress timer
    if (globalPlaybackState?.is_playing && localProgress !== null) {
      progressTimerRef.current = setInterval(() => {
        const now = Date.now();
        const elapsed = now - lastUpdateTimeRef.current;
        lastUpdateTimeRef.current = now;

        setLocalProgress((prev) => {
          if (prev === null) return prev;
          return prev + elapsed;
        });
      }, 100); // Update every 100ms for smooth progress
    }

    return () => {
      if (progressTimerRef.current) {
        clearInterval(progressTimerRef.current);
        progressTimerRef.current = null;
      }
    };
  }, [globalPlaybackState, localProgress]);

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
  // Define sdkIsActive here, AFTER globalPlaybackState is defined by useSWR
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
      contextUri?: string,
      offset?: { position?: number; uri?: string }
    ) => {
      const requestId = Math.random().toString(36).substring(2, 9);
      console.log(
        `[${requestId}] Context: playContext called. contextUri=${contextUri}, offset=`,
        offset
      );

      // Determine target device ID (prefer SDK if ready, else use global state)
      let targetDeviceId =
        isSdkReady && sdkDeviceId
          ? sdkDeviceId
          : globalPlaybackState?.device?.id ?? undefined;

      console.log(
        `[${requestId}] Context: Determined targetDeviceId: ${targetDeviceId}`
      );

      // --- If no active device found, alert user and exit ---
      if (!targetDeviceId) {
        console.warn(
          `[${requestId}] Context: No active device found (SDK ready: ${isSdkReady}, SDK ID: ${sdkDeviceId}, Global ID: ${globalPlaybackState?.device?.id}).`
        );
        alert(
          "No active Spotify device found. Please start playback on a device (like the Spotify app or web player) and try again."
        );
        mutateDevices(); // Refresh device list in case it's stale
        return; // Stop execution
      }

      // --- Prepare Play Payload ---
      const payload: {
        context_uri?: string;
        uris?: string[];
        offset?: { position?: number; uri?: string };
        device_id?: string; // Keep device_id optional here, add it below
      } = {};

      if (contextUri) {
        payload.context_uri = contextUri;
        // Offset is only valid with context_uri according to Spotify API
        if (offset?.position !== undefined) {
          payload.offset = { position: offset.position };
        } else if (offset?.uri !== undefined) {
          // Play a specific track within the given context
          payload.offset = { uri: offset.uri };
          console.log(
            `[${requestId}] Context: Setting offset URI within context.`
          );
        }
      } else if (offset?.uri) {
        // Play specific track(s) (no context provided)
        payload.uris = [offset.uri];
        // Offset (position or uri) is NOT valid when using 'uris'
        if (offset.position !== undefined) {
          console.warn(
            `[${requestId}] Context: Offset position provided with URI, which is invalid. Ignoring position.`
          );
        }
      } else {
        console.error(
          `[${requestId}] Context: Invalid play request - missing contextUri or offset.uri`
        );
        alert("Cannot start playback: Invalid track or context specified.");
        return;
      }

      // Add the determined device ID to the payload
      payload.device_id = targetDeviceId;

      console.log(
        `[${requestId}] Context: Sending play request to API:`,
        JSON.stringify(payload)
      );

      // --- Send Play Command ---
      try {
        const res = await fetch("/api/spotify/play", {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        });

        if (!res.ok) {
          const errData = await res
            .json()
            .catch(() => ({ error: "Failed to parse error response" }));
          console.error(
            `[${requestId}] Context: API Play Error (${res.status}):`,
            errData
          );
          // Handle specific errors like NO_ACTIVE_DEVICE if they still occur
          if (errData.reason === "NO_ACTIVE_DEVICE" || res.status === 404) {
            alert(
              "Spotify reported no active device. Please ensure Spotify is running and active."
            );
            mutateDevices(); // Refresh device list
          } else {
            alert(`Playback failed: ${errData.error || "Unknown API error"}`);
          }
        } else {
          console.log(
            `[${requestId}] Context: API Play request successful (204)`
          );
          setTimeout(() => {
            console.log(
              `[${requestId}] Context: Mutating playback state after API success.`
            );
            mutatePlayback();
          }, 750); // Keep delay
        }
      } catch (error) {
        console.error(
          `[${requestId}] Context: Network error during play request:`,
          error
        );
        alert("Network error starting playback. Please check your connection.");
      }
    },
    [
      isSdkReady,
      sdkDeviceId,
      globalPlaybackState,
      mutatePlayback,
      mutateDevices, // Add mutateDevices dependency
      // transferPlayback removed from dependencies
    ]
  );

  // --- Set Volume Control ---
  const setVolume = useCallback(
    async (volumePercent: number) => {
      // Validate percentage
      const clampedPercent = Math.max(
        0,
        Math.min(100, Math.round(volumePercent))
      );
      console.log(`Context: Setting volume to ${clampedPercent}%`);

      // Optimistically update local state if needed (or rely on SWR refresh)
      // mutatePlayback((currentData) => {
      //   if (!currentData?.device) return currentData;
      //   return { ...currentData, device: { ...currentData.device, volume_percent: clampedPercent } };
      // }, false); // false = don't revalidate yet

      try {
        const res = await fetch("/api/spotify/volume", {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ volume_percent: clampedPercent }),
        });

        if (!res.ok) {
          const errData = await res
            .json()
            .catch(() => ({ error: "Failed to parse error" }));
          console.error(
            `Context: API Set Volume Error (${res.status}):`,
            errData
          );
          // Revert optimistic update on failure if implemented
          // mutatePlayback(); // Trigger revalidation to get actual state
          alert(
            `Failed to set volume: ${errData.error || "Unknown API error"}`
          );
        } else {
          console.log("Context: Set volume API call successful");
          // Trigger SWR revalidation after a short delay to get updated state
          setTimeout(() => {
            console.log("Context: Mutating playback state after volume change");
            mutatePlayback();
          }, 500);
        }
      } catch (error) {
        console.error("Context: Network error setting volume:", error);
        // Revert optimistic update on failure if implemented
        // mutatePlayback(); // Trigger revalidation to get actual state
        alert("Network error setting volume.");
      }
    },
    [mutatePlayback] // Add dependencies as needed
  );

  // --- Context Value ---
  const value: PlayerContextValue = {
    playerState: {
      player: playerRef.current,
      isSdkReady,
      sdkDeviceId,
      sdkPlayerState,
      globalPlaybackState,
      localProgress,
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
      setVolume,
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
