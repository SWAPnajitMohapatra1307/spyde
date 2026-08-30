// client/src/types/cv.ts

export interface FaceDetectionBox {
  x: number;
  y: number;
  width: number;
  height: number;
  confidence: number;
}

export interface FaceLandmarks {
  leftEye: [number, number];
  rightEye: [number, number];
  noseTip: [number, number];
  mouthLeft: [number, number];
  mouthRight: [number, number];
  chinCenter: [number, number];
}

export interface AntiSpoofResult {
  isReal: boolean;
  score: number;
  method: 'texture' | 'depth' | 'motion' | 'infrared';
  details: string;
}

export interface FaceEmbedding {
  vector: number[];
  dimensions: 128 | 256 | 512;
  model: string;
  timestamp: number;
}

export interface FrameCapture {
  id: string;
  blob: Blob;
  timestamp: number;
  resolution: { width: number; height: number };
  faceDetected: boolean;
  boundingBox: FaceDetectionBox | null;
}

export interface LivenessChallenge {
  id: string;
  type: LivenessChallengeType;
  instruction: string;
  duration: number;
  requiredConfidence: number;
}

export type LivenessChallengeType =
  | 'turn_left'
  | 'turn_right'
  | 'blink'
  | 'smile'
  | 'nod_up'
  | 'nod_down'
  | 'open_mouth';

export interface LivenessChallengeResult {
  challengeId: string;
  type: LivenessChallengeType;
  passed: boolean;
  confidence: number;
  frames: string[];
  duration: number;
}

export interface CVSessionConfig {
  sessionId: string;
  challenges: LivenessChallenge[];
  maxAttempts: number;
  timeoutSeconds: number;
  antiSpoofEnabled: boolean;
  minFaceSize: number;
  maxFaceAngle: number;
}

export interface CVSessionResult {
  sessionId: string;
  status: 'passed' | 'failed' | 'expired' | 'error';
  challengeResults: LivenessChallengeResult[];
  antiSpoofResult: AntiSpoofResult | null;
  embedding: FaceEmbedding | null;
  overallConfidence: number;
  processingTimeMs: number;
}

export interface FaceQualityMetrics {
  brightness: number;
  sharpness: number;
  faceSize: number;
  faceAngle: { yaw: number; pitch: number; roll: number };
  occluded: boolean;
  quality: 'poor' | 'fair' | 'good' | 'excellent';
}

export type CVPipelineStatus =
  | 'idle'
  | 'initializing'
  | 'camera_ready'
  | 'detecting_face'
  | 'face_aligned'
  | 'challenge_active'
  | 'processing'
  | 'complete'
  | 'error';

export interface CVError {
  code: CVErrorCode;
  message: string;
  recoverable: boolean;
}

export type CVErrorCode =
  | 'CAMERA_DENIED'
  | 'CAMERA_NOT_FOUND'
  | 'CAMERA_IN_USE'
  | 'NO_FACE_DETECTED'
  | 'MULTIPLE_FACES'
  | 'FACE_TOO_SMALL'
  | 'FACE_TOO_ANGLED'
  | 'POOR_LIGHTING'
  | 'SPOOF_DETECTED'
  | 'CHALLENGE_TIMEOUT'
  | 'SESSION_EXPIRED'
  | 'NETWORK_ERROR'
  | 'PROCESSING_ERROR';