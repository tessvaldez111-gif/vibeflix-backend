// ===== VideoPlayManager — Global Singleton =====
// Equivalent to Android's VideoPlayManager object.
// Manages exactly ONE active ExoPlayer at a time.
// Any call to bind/release/pause goes through here to prevent
// audio leaking, surface conflicts, and background playback.
//
// Usage:
//   import VideoPlayManager from '../../services/VideoPlayManager';
//   VideoPlayManager.bindPlayer(videoRef.current);
//   VideoPlayManager.pauseAll();
//   VideoPlayManager.releaseCurrent();

import type { VideoRef } from 'react-native-video';

export interface IVideoPlayer {
  pause(): void;
  seek(seconds: number | number): void;
}

class VideoPlayManager {
  private currentPlayer: (IVideoPlayer & VideoRef) | null = null;

  /** Stop + release the old player, then bind the new one */
  bindPlayer(player: (IVideoPlayer & VideoRef) | null) {
    this.releaseCurrent();
    this.currentPlayer = player;
  }

  /** Pause the currently active player (does NOT unbind) */
  pauseAll() {
    if (this.currentPlayer) {
      this.currentPlayer.pause();
    }
  }

  /** Stop + release + unbind the current player completely */
  releaseCurrent() {
    if (this.currentPlayer) {
      try {
        // Seek to beginning to reset ExoPlayer internal state
        this.currentPlayer.seek(0);
      } catch (_) {}
      this.currentPlayer = null;
    }
  }

  /** Check if there is an active player */
  hasPlayer(): boolean {
    return this.currentPlayer !== null;
  }
}

// Singleton — shared across all components
const videoPlayManager = new VideoPlayManager();
export default videoPlayManager;
