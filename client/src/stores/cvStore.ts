// client/src/stores/cvStore.ts

import { create } from 'zustand';
import type {
  CVPipelineStatus,
  CVSessionConfig,
  CVSessionResult,
  CVError,
  FaceDetectionBox,
  FaceQualityMetrics,
  LivenessChallengeResult,
  FrameCapture,
} from '@/types/cv';

interface CVState {
  status: CVPipelineStatus;
  sessionConfig: CVSessionConfig | null;
  sessionResult: CVSessionResult | null;
  error: CVError | null;

  // Real-time detection state
  faceDetected: boolean;
  boundingBox: FaceDetectionBox | null;
  qualityMetrics: FaceQualityMetrics | null;

  // Challenge tracking
  currentChallengeIndex: number;
  challengeResults: LivenessChallengeResult[];
  challengeStartTime: number | null;

  // Frame buffer
  capturedFrames: FrameCapture[];
  frameCount: number;

  // Camera
  cameraStream: MediaStream | null;
  selectedDeviceId: string | null;
  availableDevices: MediaDeviceInfo[];

  // Actions
  setStatus: (status: CVPipelineStatus) => void;
  setSessionConfig: (config: CVSessionConfig) => void;
  setSessionResult: (result: CVSessionResult) => void;
  setError: (error: CVError | null) => void;
  setFaceDetection: (
    detected: boolean,
    box: FaceDetectionBox | null,
    quality: FaceQualityMetrics | null
  ) => void;
  advanceChallenge: (result: LivenessChallengeResult) => void;
  startChallenge: () => void;
  addFrame: (frame: FrameCapture) => void;
  setCameraStream: (stream: MediaStream | null) => void;
  setAvailableDevices: (devices: MediaDeviceInfo[]) => void;
  selectDevice: (deviceId: string) => void;
  reset: () => void;
}

const initialState = {
  status: 'idle' as CVPipelineStatus,
  sessionConfig: null,
  sessionResult: null,
  error: null,
  faceDetected: false,
  boundingBox: null,
  qualityMetrics: null,
  currentChallengeIndex: 0,
  challengeResults: [],
  challengeStartTime: null,
  capturedFrames: [],
  frameCount: 0,
  cameraStream: null,
  selectedDeviceId: null,
  availableDevices: [],
};

export const useCVStore = create<CVState>((set, get) => ({
  ...initialState,

  setStatus: (status) => set({ status }),

  setSessionConfig: (config) =>
    set({
      sessionConfig: config,
      currentChallengeIndex: 0,
      challengeResults: [],
      status: 'initializing',
    }),

  setSessionResult: (result) =>
    set({
      sessionResult: result,
      status: 'complete',
    }),

  setError: (error) =>
    set({
      error,
      status: error ? 'error' : get().status,
    }),

  setFaceDetection: (detected, box, quality) =>
    set({
      faceDetected: detected,
      boundingBox: box,
      qualityMetrics: quality,
      status: detected && quality && quality.quality !== 'poor'
        ? get().status === 'detecting_face'
          ? 'face_aligned'
          : get().status
        : get().status === 'face_aligned'
          ? 'detecting_face'
          : get().status,
    }),

  advanceChallenge: (result) => {
    const state = get();
    const newResults = [...state.challengeResults, result];
    const totalChallenges = state.sessionConfig?.challenges.length ?? 0;
    const nextIndex = state.currentChallengeIndex + 1;

    set({
      challengeResults: newResults,
      currentChallengeIndex: nextIndex,
      challengeStartTime: null,
      status: nextIndex >= totalChallenges ? 'processing' : 'challenge_active',
    });
  },

  startChallenge: () =>
    set({
      challengeStartTime: Date.now(),
      status: 'challenge_active',
    }),

  addFrame: (frame) => {
    const state = get();
    const maxFrames = 30;
    const frames =
      state.capturedFrames.length >= maxFrames
        ? [...state.capturedFrames.slice(1), frame]
        : [...state.capturedFrames, frame];

    set({
      capturedFrames: frames,
      frameCount: state.frameCount + 1,
    });
  },

  setCameraStream: (stream) =>
    set({
      cameraStream: stream,
      status: stream ? 'camera_ready' : 'idle',
    }),

  setAvailableDevices: (devices) => set({ availableDevices: devices }),

  selectDevice: (deviceId) => set({ selectedDeviceId: deviceId }),

  reset: () => {
    const state = get();
    if (state.cameraStream) {
      state.cameraStream.getTracks().forEach((t) => t.stop());
    }
    set({ ...initialState });
  },
}));