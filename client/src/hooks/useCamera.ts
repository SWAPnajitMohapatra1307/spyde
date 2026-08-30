import { useCallback, useEffect, useRef } from 'react';
import { useCVStore } from '@/stores/cvStore';
import type { CVErrorCode } from '@/types/cv';

export interface UseCameraOptions {
  facingMode?: 'user' | 'environment';
  width?: number;
  height?: number;
  frameRate?: number;
  autoStart?: boolean;
}

export interface UseCameraReturn {
  videoRef: React.RefObject<HTMLVideoElement>;
  canvasRef: React.RefObject<HTMLCanvasElement>;
  start: () => Promise<void>;
  stop: () => void;
  switchCamera: () => Promise<void>;
  captureFrame: () => Blob | null;
  captureFrameBase64: () => string | null;
  isActive: boolean;
}

const mapCameraError = (error: unknown): CVErrorCode => {
  if (error instanceof DOMException) {
    switch (error.name) {
      case 'NotAllowedError':
        return 'CAMERA_DENIED';
      case 'NotFoundError':
        return 'CAMERA_NOT_FOUND';
      case 'NotReadableError':
        return 'CAMERA_IN_USE';
      default:
        return 'PROCESSING_ERROR';
    }
  }
  return 'PROCESSING_ERROR';
};

const getCameraErrorMessage = (code: CVErrorCode): string => {
  switch (code) {
    case 'CAMERA_DENIED':
      return 'Camera permission was denied. Please allow camera access in your browser settings.';
    case 'CAMERA_NOT_FOUND':
      return 'No camera found on this device.';
    case 'CAMERA_IN_USE':
      return 'Camera is being used by another application.';
    default:
      return 'An unexpected camera error occurred.';
  }
};

export const useCamera = (options: UseCameraOptions = {}): UseCameraReturn => {
  const {
    facingMode = 'user',
    width = 640,
    height = 480,
    frameRate = 30,
    autoStart = false,
  } = options;

  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const currentFacing = useRef(facingMode);
  const streamRef = useRef<MediaStream | null>(null);
  const isMountedRef = useRef<boolean>(true);

  const {
    setCameraStream,
    setAvailableDevices,
    selectedDeviceId,
    setError,
  } = useCVStore();

  const stop = useCallback(() => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((t) => t.stop());
      streamRef.current = null;
      setCameraStream(null);
    }
    if (videoRef.current) {
      try {
        videoRef.current.pause();
      } catch {
        // Ignore pause errors
      }
      videoRef.current.srcObject = null;
    }
  }, [setCameraStream]);

  const enumerateDevices = useCallback(async () => {
    try {
      const devices = await navigator.mediaDevices.enumerateDevices();
      const videoDevices = devices.filter((d) => d.kind === 'videoinput');
      if (isMountedRef.current) {
        setAvailableDevices(videoDevices);
      }
    } catch {
      // Device enumeration is optional
    }
  }, [setAvailableDevices]);

  const start = useCallback(async () => {
    isMountedRef.current = true;

    try {
      // Stop existing stream if running
      if (streamRef.current) {
        streamRef.current.getTracks().forEach((t) => t.stop());
        streamRef.current = null;
      }

      const constraints: MediaStreamConstraints = {
        video: {
          ...(selectedDeviceId
            ? { deviceId: { exact: selectedDeviceId } }
            : { facingMode: currentFacing.current }),
          width: { ideal: width },
          height: { ideal: height },
          frameRate: { ideal: frameRate },
        },
        audio: false,
      };

      const stream = await navigator.mediaDevices.getUserMedia(constraints);

      // If unmounted or stopped while waiting for user permission, cleanup immediately
      if (!isMountedRef.current) {
        stream.getTracks().forEach((t) => t.stop());
        return;
      }

      streamRef.current = stream;
      setCameraStream(stream);

      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        try {
          await videoRef.current.play();
        } catch (playError: any) {
          // Ignore harmless AbortError caused by React StrictMode rapid re-mounts
          if (playError?.name !== 'AbortError') {
            console.warn('[useCamera] Video play warning:', playError);
          }
        }
      }

      await enumerateDevices();
      setError(null);
    } catch (err) {
      if (!isMountedRef.current) return;
      const code = mapCameraError(err);
      setError({
        code,
        message: getCameraErrorMessage(code),
        recoverable: code !== 'CAMERA_NOT_FOUND',
      });
    }
  }, [selectedDeviceId, width, height, frameRate, setCameraStream, enumerateDevices, setError]);

  const switchCamera = useCallback(async () => {
    currentFacing.current =
      currentFacing.current === 'user' ? 'environment' : 'user';
    await start();
  }, [start]);

  const captureFrame = useCallback((): Blob | null => {
    const video = videoRef.current;
    const canvas = canvasRef.current;
    if (!video || !canvas) return null;

    canvas.width = video.videoWidth || width;
    canvas.height = video.videoHeight || height;
    const ctx = canvas.getContext('2d');
    if (!ctx) return null;

    if (currentFacing.current === 'user') {
      ctx.translate(canvas.width, 0);
      ctx.scale(-1, 1);
    }

    ctx.drawImage(video, 0, 0);
    ctx.setTransform(1, 0, 0, 1, 0, 0);

    let blob: Blob | null = null;
    canvas.toBlob((b) => {
      blob = b;
    }, 'image/jpeg', 0.85);

    return blob;
  }, [width, height]);

  const captureFrameBase64 = useCallback((): string | null => {
    const video = videoRef.current;
    const canvas = canvasRef.current;
    if (!video || !canvas) return null;

    canvas.width = video.videoWidth || width;
    canvas.height = video.videoHeight || height;
    const ctx = canvas.getContext('2d');
    if (!ctx) return null;

    if (currentFacing.current === 'user') {
      ctx.translate(canvas.width, 0);
      ctx.scale(-1, 1);
    }

    ctx.drawImage(video, 0, 0);
    ctx.setTransform(1, 0, 0, 1, 0, 0);

    return canvas.toDataURL('image/jpeg', 0.85);
  }, [width, height]);

  useEffect(() => {
    isMountedRef.current = true;
    if (autoStart) {
      void start();
    }
    return () => {
      isMountedRef.current = false;
      stop();
    };
  }, [autoStart]);

  return {
    videoRef,
    canvasRef,
    start,
    stop,
    switchCamera,
    captureFrame,
    captureFrameBase64,
    isActive: !!streamRef.current,
  };
};