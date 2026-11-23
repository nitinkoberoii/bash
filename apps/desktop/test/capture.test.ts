import test from 'node:test';
import assert from 'node:assert/strict';
import {
  acquireSystemAudioStream,
  acquireMicrophoneStream,
  acquireDualAudioStreams,
  getTrackDiagnostics,
  getAvailableAudioInputDevices,
} from '../src/audio/capture';

// Mock MediaStreamTrack implementation
class MockMediaStreamTrack {
  id: string;
  kind: 'audio' | 'video';
  label: string;
  readyState: 'live' | 'ended' = 'live';
  enabled = true;
  muted = false;
  stopped = false;

  constructor(kind: 'audio' | 'video', label: string) {
    this.id = `mock-track-${Math.random().toString(36).substring(7)}`;
    this.kind = kind;
    this.label = label;
  }

  stop(): void {
    this.stopped = true;
    this.readyState = 'ended';
  }

  getSettings(): MediaTrackSettings {
    return {
      sampleRate: 48000,
      channelCount: 2,
    };
  }
}

// Mock MediaStream implementation
class MockMediaStream {
  id: string;
  tracks: MockMediaStreamTrack[] = [];

  constructor(tracks: MockMediaStreamTrack[] = []) {
    this.id = `mock-stream-${Math.random().toString(36).substring(7)}`;
    this.tracks = [...tracks];
  }

  getTracks(): MockMediaStreamTrack[] {
    return [...this.tracks];
  }

  getAudioTracks(): MockMediaStreamTrack[] {
    return this.tracks.filter((t) => t.kind === 'audio');
  }

  getVideoTracks(): MockMediaStreamTrack[] {
    return this.tracks.filter((t) => t.kind === 'video');
  }

  removeTrack(track: MockMediaStreamTrack): void {
    this.tracks = this.tracks.filter((t) => t.id !== track.id);
  }

  get active(): boolean {
    return this.tracks.some((t) => t.readyState === 'live');
  }
}

// Attach polyfills to global scope for testing
// @ts-expect-error Mocking global for unit tests
globalThis.MediaStream = MockMediaStream;

function setMockNavigator(mediaDevices: Record<string, unknown>): void {
  Object.defineProperty(globalThis, 'navigator', {
    value: {
      mediaDevices,
    },
    configurable: true,
    writable: true,
  });
}

test('acquireSystemAudioStream acquires audio and immediately stops dummy video track', async () => {
  const dummyVideo = new MockMediaStreamTrack('video', 'Screen Display');
  const systemAudio = new MockMediaStreamTrack('audio', 'System Audio Loopback');

  setMockNavigator({
    getDisplayMedia: async (constraints: DisplayMediaStreamOptions) => {
      assert.equal(constraints.video, true, 'Must request video for loopback');
      assert.equal(constraints.audio, true, 'Must request audio for loopback');
      return new MockMediaStream([dummyVideo, systemAudio]);
    },
  });

  const stream = await acquireSystemAudioStream();
  assert.equal(stream.getAudioTracks().length, 1, 'Should have exactly 1 audio track');
  assert.equal(stream.getVideoTracks().length, 0, 'Should have 0 video tracks');
  assert.equal(dummyVideo.stopped, true, 'Dummy video track must be stopped immediately');
  assert.equal(dummyVideo.readyState, 'ended');
  assert.equal(stream.getAudioTracks()[0].readyState, 'live');
  assert.equal(stream.getAudioTracks()[0].label, 'System Audio Loopback');
});

test('acquireSystemAudioStream cleans up and throws if no audio track is captured', async () => {
  const dummyVideo = new MockMediaStreamTrack('video', 'Screen Display Only');

  setMockNavigator({
    getDisplayMedia: async () => new MockMediaStream([dummyVideo]),
  });

  await assert.rejects(async () => {
    await acquireSystemAudioStream();
  }, /System loopback audio track could not be acquired/);

  assert.equal(dummyVideo.stopped, true, 'Video track must be stopped when audio is missing');
});

test('acquireMicrophoneStream passes WebRTC DSP constraints and returns live mic stream', async () => {
  const micAudio = new MockMediaStreamTrack('audio', 'Default Microphone');
  let receivedConstraints: MediaStreamConstraints | undefined;

  setMockNavigator({
    getUserMedia: async (constraints: MediaStreamConstraints) => {
      receivedConstraints = constraints;
      return new MockMediaStream([micAudio]);
    },
  });

  const stream = await acquireMicrophoneStream({
    echoCancellation: true,
    noiseSuppression: true,
    autoGainControl: true,
  });

  assert.equal(stream.getAudioTracks().length, 1);
  assert.equal(stream.getAudioTracks()[0].readyState, 'live');
  assert.deepEqual(receivedConstraints?.audio, {
    deviceId: undefined,
    echoCancellation: true,
    noiseSuppression: true,
    autoGainControl: true,
  });
});

test('acquireDualAudioStreams returns both streams and cleanly stops all tracks on stopAll()', async () => {
  const dummyVideo = new MockMediaStreamTrack('video', 'Screen');
  const systemAudio = new MockMediaStreamTrack('audio', 'System Loopback');
  const micAudio = new MockMediaStreamTrack('audio', 'Microphone');

  setMockNavigator({
    getDisplayMedia: async () => new MockMediaStream([dummyVideo, systemAudio]),
    getUserMedia: async () => new MockMediaStream([micAudio]),
  });

  const dual = await acquireDualAudioStreams();
  assert.ok(dual.systemStream);
  assert.ok(dual.micStream);
  assert.equal(dual.systemStream.getAudioTracks()[0].readyState, 'live');
  assert.equal(dual.micStream.getAudioTracks()[0].readyState, 'live');

  // Execute stopAll() teardown
  dual.stopAll();

  assert.equal(
    dual.systemStream.getAudioTracks()[0].readyState,
    'ended',
    'System audio track must be ended'
  );
  assert.equal(
    dual.micStream.getAudioTracks()[0].readyState,
    'ended',
    'Mic audio track must be ended'
  );
});

test('acquireDualAudioStreams tears down acquired stream if the other fails', async () => {
  const dummyVideo = new MockMediaStreamTrack('video', 'Screen');
  const systemAudio = new MockMediaStreamTrack('audio', 'System Loopback');

  setMockNavigator({
    getDisplayMedia: async () => new MockMediaStream([dummyVideo, systemAudio]),
    getUserMedia: async () => {
      throw new Error('Permission denied by user');
    },
  });

  await assert.rejects(async () => {
    await acquireDualAudioStreams();
  }, /Permission denied by user/);

  assert.equal(
    systemAudio.readyState,
    'ended',
    'System audio track must be stopped if mic acquisition fails'
  );
});

test('getTrackDiagnostics extracts structured metadata', () => {
  const track = new MockMediaStreamTrack('audio', 'USB Condenser Mic');
  // @ts-expect-error Mocking track
  const diagnostics = getTrackDiagnostics(track);

  assert.equal(diagnostics.label, 'USB Condenser Mic');
  assert.equal(diagnostics.kind, 'audio');
  assert.equal(diagnostics.readyState, 'live');
  assert.equal(diagnostics.enabled, true);
  assert.equal(diagnostics.sampleRate, 48000);
  assert.equal(diagnostics.channelCount, 2);
});

test('getAvailableAudioInputDevices filters for audioinput devices', async () => {
  setMockNavigator({
    enumerateDevices: async () => [
      { deviceId: '1', kind: 'audioinput', label: 'Internal Mic', groupId: 'g1' },
      { deviceId: '2', kind: 'audiooutput', label: 'Speakers', groupId: 'g1' },
      { deviceId: '3', kind: 'videoinput', label: 'Webcam', groupId: 'g2' },
      { deviceId: '4', kind: 'audioinput', label: 'USB Headset', groupId: 'g3' },
    ],
  });

  const audioInputs = await getAvailableAudioInputDevices();
  assert.equal(audioInputs.length, 2);
  assert.equal(audioInputs[0].label, 'Internal Mic');
  assert.equal(audioInputs[1].label, 'USB Headset');
});
