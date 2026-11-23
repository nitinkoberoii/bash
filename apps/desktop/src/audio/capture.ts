/**
 * Dual-Channel Audio Capture Module for Project Bash.
 *
 * Responsibilities:
 * 1. Acquire Windows System Audio Loopback (Interviewer / Channel 0) via getDisplayMedia
 *    (stripping and stopping dummy video track immediately).
 * 2. Acquire Candidate Microphone (Channel 1) via getUserMedia with WebRTC DSP constraints.
 * 3. Provide clean lifecycle teardown (stopAll) to prevent audio hardware locks.
 */

export interface MicrophoneCaptureOptions {
  deviceId?: string;
  echoCancellation?: boolean;
  noiseSuppression?: boolean;
  autoGainControl?: boolean;
}

export interface AudioCaptureStreams {
  /** Channel 0 source: System loopback audio (Interviewer) */
  systemStream: MediaStream;
  /** Channel 1 source: Physical microphone input (Candidate) */
  micStream: MediaStream;
  /** Teardown function stopping all tracks on both streams */
  stopAll: () => void;
}

export interface AudioTrackInfo {
  id: string;
  label: string;
  kind: string;
  readyState: MediaStreamTrackState;
  enabled: boolean;
  muted: boolean;
  sampleRate?: number;
  channelCount?: number;
}

/**
 * Enumerates available physical audio input devices (microphones).
 */
export async function getAvailableAudioInputDevices(): Promise<MediaDeviceInfo[]> {
  if (!navigator.mediaDevices?.enumerateDevices) {
    throw new Error(
      'navigator.mediaDevices.enumerateDevices is not supported in this environment.'
    );
  }
  const devices = await navigator.mediaDevices.enumerateDevices();
  return devices.filter((device) => device.kind === 'audioinput');
}

/**
 * Acquires Windows System Audio Loopback via getDisplayMedia.
 *
 * Behind the scenes:
 * In Electron, getDisplayMedia is intercepted by session.setDisplayMediaRequestHandler
 * which attaches the primary screen and assigns audio: 'loopback'.
 * Chromium mandates video: true, so we immediately stop and detach the video track
 * to avoid any GPU/rendering overhead, returning a pure audio-only MediaStream.
 */
export async function acquireSystemAudioStream(): Promise<MediaStream> {
  if (!navigator.mediaDevices?.getDisplayMedia) {
    throw new Error('navigator.mediaDevices.getDisplayMedia is not available in this environment.');
  }

  // Chromium mandates video: true even when capturing loopback audio
  const rawStream = await navigator.mediaDevices.getDisplayMedia({
    video: true,
    audio: true,
  });

  const audioTracks = rawStream.getAudioTracks();
  if (audioTracks.length === 0) {
    // Cleanup any video tracks before failing
    for (const track of rawStream.getTracks()) {
      track.stop();
    }
    throw new Error(
      'System loopback audio track could not be acquired. Ensure audio loopback is supported and permitted.'
    );
  }

  // Immediately stop and detach all dummy video tracks
  for (const videoTrack of rawStream.getVideoTracks()) {
    videoTrack.stop();
    rawStream.removeTrack(videoTrack);
  }

  // Return clean audio stream containing only the loopback audio track
  const systemAudioTrack = audioTracks[0];
  return new MediaStream([systemAudioTrack]);
}

/**
 * Acquires Candidate Microphone input via getUserMedia with WebRTC DSP constraints.
 */
export async function acquireMicrophoneStream(
  options: MicrophoneCaptureOptions = {}
): Promise<MediaStream> {
  if (!navigator.mediaDevices?.getUserMedia) {
    throw new Error('navigator.mediaDevices.getUserMedia is not available in this environment.');
  }

  const {
    deviceId,
    echoCancellation = true,
    noiseSuppression = true,
    autoGainControl = true,
  } = options;

  const audioConstraints: MediaTrackConstraints = {
    deviceId: deviceId ? { exact: deviceId } : undefined,
    echoCancellation,
    noiseSuppression,
    autoGainControl,
  };

  const micStream = await navigator.mediaDevices.getUserMedia({
    audio: audioConstraints,
    video: false,
  });

  const audioTracks = micStream.getAudioTracks();
  if (audioTracks.length === 0) {
    for (const track of micStream.getTracks()) {
      track.stop();
    }
    throw new Error('Microphone audio track could not be acquired.');
  }

  return micStream;
}

/**
 * Acquires both System Loopback (Interviewer) and Microphone (Candidate) streams in parallel.
 * Returns both active streams and a unified stopAll() cleanup handler.
 * If either stream fails, any already acquired tracks are cleanly stopped before rejecting.
 */
export async function acquireDualAudioStreams(
  micOptions: MicrophoneCaptureOptions = {}
): Promise<AudioCaptureStreams> {
  let isAborted = false;
  let systemStream: MediaStream | null = null;
  let micStream: MediaStream | null = null;

  try {
    const systemPromise = acquireSystemAudioStream().then((stream) => {
      if (isAborted) {
        for (const track of stream.getTracks()) {
          track.stop();
        }
      } else {
        systemStream = stream;
      }
      return stream;
    });

    const micPromise = acquireMicrophoneStream(micOptions).then((stream) => {
      if (isAborted) {
        for (const track of stream.getTracks()) {
          track.stop();
        }
      } else {
        micStream = stream;
      }
      return stream;
    });

    await Promise.all([systemPromise, micPromise]);

    const stopAll = (): void => {
      if (systemStream) {
        for (const track of systemStream.getTracks()) {
          track.stop();
        }
      }
      if (micStream) {
        for (const track of micStream.getTracks()) {
          track.stop();
        }
      }
    };

    return {
      systemStream: systemStream!,
      micStream: micStream!,
      stopAll,
    };
  } catch (error) {
    // Flag as aborted so any pending resolution cleans up immediately
    isAborted = true;
    if (systemStream) {
      for (const track of (systemStream as MediaStream).getTracks()) {
        track.stop();
      }
    }
    if (micStream) {
      for (const track of (micStream as MediaStream).getTracks()) {
        track.stop();
      }
    }
    throw error;
  }
}

/**
 * Inspects a MediaStreamTrack and returns structured diagnostic information.
 */
export function getTrackDiagnostics(track: MediaStreamTrack): AudioTrackInfo {
  const settings = track.getSettings();
  return {
    id: track.id,
    label: track.label || '(unlabeled)',
    kind: track.kind,
    readyState: track.readyState,
    enabled: track.enabled,
    muted: track.muted,
    sampleRate: settings.sampleRate,
    channelCount: settings.channelCount,
  };
}
