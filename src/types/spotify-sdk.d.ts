// spotify-last-played/src/types/spotify-sdk.d.ts

// Basic types - add more as needed from Spotify SDK documentation
// https://developer.spotify.com/documentation/web-playback-sdk/reference/

// Revert to using export declare global
export declare global {
  interface Window {
    onSpotifyWebPlaybackSDKReady?: () => void;
    Spotify?: typeof Spotify;
  }
}

declare namespace Spotify {
  interface Entity {
    name: string;
    uri: string;
    url: string;
  }

  interface Image {
    height?: number | null | undefined;
    url: string;
    width?: number | null | undefined;
  }

  interface Album {
    name: string;
    uri: string;
    images: Image[];
  }

  interface Artist {
    name: string;
    uri: string;
  }

  interface Track {
    album: Album;
    artists: Artist[];
    duration_ms: number;
    id?: string | null | undefined;
    is_playable: boolean;
    name: string;
    uri: string;
    media_type: "audio" | "video";
    type: "track" | "episode" | "ad";
    track_type: "audio" | "video";
    linked_from: {
      uri: string | null;
      id: string | null;
    };
  }

  interface PlaybackContextTrack extends Track {
    uid: string;
    media_type: "track";
  }

  interface PlaybackContextMetadata {
    context_description: string;
    context_uri: string;
    [key: string]: any; // For other potential metadata fields
  }

  interface PlaybackDisallows {
    pausing?: boolean;
    peeking_next?: boolean;
    peeking_prev?: boolean;
    resuming?: boolean;
    seeking?: boolean;
    skipping_next?: boolean;
    skipping_prev?: boolean;
    toggling_repeat_context?: boolean;
    toggling_repeat_track?: boolean;
    toggling_shuffle?: boolean;
    transferring_playback?: boolean;
  }

  interface PlaybackRestrictions {
    disallow_pausing_reasons?: string[];
    disallow_peeking_next_reasons?: string[];
    disallow_peeking_prev_reasons?: string[];
    disallow_resuming_reasons?: string[];
    disallow_seeking_reasons?: string[];
    disallow_skipping_next_reasons?: string[];
    disallow_skipping_prev_reasons?: string[];
    disallow_toggling_repeat_context_reasons?: string[];
    disallow_toggling_repeat_track_reasons?: string[];
    disallow_toggling_shuffle_reasons?: string[];
    disallow_transferring_playback_reasons?: string[];
  }

  interface PlaybackState {
    context: PlaybackContextMetadata | null; // Context can be null
    disallows: PlaybackDisallows;
    duration: number;
    paused: boolean;
    position: number;
    /**
     * 0: NO_REPEAT
     * 1: ONCE_REPEAT
     * 2: FULL_REPEAT
     */
    repeat_mode: 0 | 1 | 2;
    restrictions: PlaybackRestrictions;
    shuffle: boolean;
    timestamp: number;
    track_window: {
      current_track: PlaybackContextTrack;
      next_tracks: PlaybackContextTrack[];
      previous_tracks: PlaybackContextTrack[];
    };
  }

  interface WebPlaybackInstance {
    device_id: string;
  }

  interface Error {
    message: string;
    // Add specific error types if needed, e.g., AuthenticationError, AccountError
  }

  type ErrorTypes =
    | "account_error"
    | "authentication_error"
    | "initialization_error"
    | "playback_error";

  interface PlayerInit {
    name: string;
    getOAuthToken(cb: (token: string) => void): void;
    volume?: number | undefined;
    enableMediaSession?: boolean | undefined; // Optional: Media Session API integration
  }

  class Player {
    constructor(options: PlayerInit);

    connect(): Promise<boolean>;
    disconnect(): void;
    getCurrentState(): Promise<PlaybackState | null>;
    getVolume(): Promise<number>;
    nextTrack(): Promise<void>;
    previousTrack(): Promise<void>;
    pause(): Promise<void>;
    resume(): Promise<void>;
    seek(position_ms: number): Promise<void>;
    setVolume(volume: number): Promise<void>;
    setName(name: string): Promise<void>;
    togglePlay(): Promise<void>;

    addListener(
      event: "ready",
      cb: (instance: WebPlaybackInstance) => void
    ): boolean;
    addListener(
      event: "not_ready",
      cb: (instance: WebPlaybackInstance) => void
    ): boolean;
    addListener(
      event: "player_state_changed",
      cb: (state: PlaybackState | null) => void
    ): boolean; // State can be null
    addListener(
      event: "initialization_error",
      cb: (error: Error) => void
    ): boolean;
    addListener(
      event: "authentication_error",
      cb: (error: Error) => void
    ): boolean;
    addListener(event: "account_error", cb: (error: Error) => void): boolean;
    addListener(event: "playback_error", cb: (error: Error) => void): boolean;
    addListener(event: string, cb: (...args: any[]) => void): boolean; // Generic listener

    removeListener(
      event: "ready",
      cb?: (instance: WebPlaybackInstance) => void
    ): boolean;
    removeListener(
      event: "not_ready",
      cb?: (instance: WebPlaybackInstance) => void
    ): boolean;
    removeListener(
      event: "player_state_changed",
      cb?: (state: PlaybackState | null) => void
    ): boolean; // State can be null
    // Add other removeListener overloads as needed
    removeListener(event: string, cb?: (...args: any[]) => void): boolean; // Generic listener
  }
}
