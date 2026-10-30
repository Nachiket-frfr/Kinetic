import { useRef, useState, useEffect, useCallback } from 'react';
import { PoseLandmarker, FilesetResolver } from '@mediapipe/tasks-vision';
import { createLandmarkFilter, filterLandmarks } from './oneEuroFilter';
import { drawPose, clearCanvas } from './poseUtils';

const WASM_CDN  = 'https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@0.10.22/wasm';
const WASM_ALT  = 'https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision/wasm';
const MODEL_URL = 'https://storage.googleapis.com/mediapipe-models/pose_landmarker/pose_landmarker_lite/float16/1/pose_landmarker_lite.task';

async function buildLandmarker(wasmUrl, delegate = 'GPU') {
  const vision = await FilesetResolver.forVisionTasks(wasmUrl);
  return PoseLandmarker.createFromOptions(vision, {
    baseOptions:                    { modelAssetPath: MODEL_URL, delegate },
    runningMode:                    'VIDEO',
    numPoses:                       1,
    minPoseDetectionConfidence:     0.5,
    minPosePresenceConfidence:      0.5,
    minTrackingConfidence:          0.5,
    outputSegmentationMasks:        false,
  });
}

/**
 * usePoseTracker — MediaPipe Pose Landmarker hook.
 *
 * @param {Object} [options]
 * @param {Function} [options.onFrame] Callback receiving (smoothLandmarks, nowTimestamp) -> returns analysis data
 */
export function usePoseTracker({ onFrame } = {}) {
  const videoRef      = useRef(null);
  const canvasRef     = useRef(null);
  const landmarkerRef = useRef(null);
  const filterRef     = useRef(null);
  const animRef       = useRef(null);
  const lastTsRef     = useRef(-1);
  const onFrameRef    = useRef(onFrame);

  useEffect(() => {
    onFrameRef.current = onFrame;
  }, [onFrame]);

  const [isLoading, setIsLoading] = useState(false);
  const [isReady,   setIsReady]   = useState(false);
  const [isActive,  setIsActive]  = useState(false);
  const [error,     setError]     = useState(null);
  const [landmarks, setLandmarks] = useState(null);

  // ── Load MediaPipe model on mount ─────────────────────────────
  useEffect(() => {
    let cancelled = false;

    async function load() {
      setIsLoading(true);
      setError(null);
      try {
        // Try GPU first, fall back to CPU, then try alternate CDN
        let landmarker;
        try {
          landmarker = await buildLandmarker(WASM_CDN, 'GPU');
        } catch {
          try {
            landmarker = await buildLandmarker(WASM_CDN, 'CPU');
          } catch {
            landmarker = await buildLandmarker(WASM_ALT, 'CPU');
          }
        }

        if (!cancelled) {
          landmarkerRef.current = landmarker;
          filterRef.current     = createLandmarkFilter(33);
          setIsLoading(false);
          setIsReady(true);
        }
      } catch (err) {
        if (!cancelled) {
          console.error('[PoseTracker] Model load error:', err);
          setError('Failed to load pose model. Check your internet connection.');
          setIsLoading(false);
        }
      }
    }

    load();
    return () => { cancelled = true; };
  }, []);

  // ── Detection loop ────────────────────────────────────────────
  useEffect(() => {
    if (!isActive || !isReady) return;

    const video  = videoRef.current;
    const canvas = canvasRef.current;
    if (!video || !canvas) return;

    function detect() {
      // Wait until video has actual dimensions
      if (!video.videoWidth) {
        animRef.current = requestAnimationFrame(detect);
        return;
      }

      const now = performance.now();
      if (now === lastTsRef.current) {
        animRef.current = requestAnimationFrame(detect);
        return;
      }
      lastTsRef.current = now;

      try {
        const result = landmarkerRef.current.detectForVideo(video, now);
        if (result.landmarks?.[0]) {
          const smooth = filterLandmarks(filterRef.current, result.landmarks[0], now);
          setLandmarks(smooth);

          let analysis = null;
          if (onFrameRef.current) {
            analysis = onFrameRef.current(smooth, now);
          }

          drawPose(canvas, video, smooth, analysis);
        } else {
          setLandmarks(null);
          clearCanvas(canvas);
        }
      } catch {
        // Skip bad frames silently
      }

      animRef.current = requestAnimationFrame(detect);
    }

    animRef.current = requestAnimationFrame(detect);
    return () => {
      if (animRef.current) cancelAnimationFrame(animRef.current);
    };
  }, [isActive, isReady]);

  // ── Cleanup on unmount ────────────────────────────────────────
  useEffect(() => {
    return () => {
      if (animRef.current) cancelAnimationFrame(animRef.current);
      const video = videoRef.current;
      if (video?.srcObject) {
        video.srcObject.getTracks().forEach(t => t.stop());
      }
    };
  }, []);

  // ── Public actions ────────────────────────────────────────────
  const startCamera = useCallback(async () => {
    if (!isReady) return;
    setError(null);
    try {
      const isPortrait = typeof window !== 'undefined' && window.innerHeight > window.innerWidth;
      const stream = await navigator.mediaDevices.getUserMedia({
        video: {
          width:      { ideal: isPortrait ? 720 : 1280 },
          height:     { ideal: isPortrait ? 1280 : 720 },
          aspectRatio: isPortrait ? { ideal: 9 / 16 } : { ideal: 16 / 9 },
          facingMode: 'user',
        },
        audio: false,
      });
      const video = videoRef.current;
      if (!video) return;
      video.srcObject = stream;
      await video.play();
      setIsActive(true);
    } catch (err) {
      const msg = err.name === 'NotAllowedError'
        ? 'Camera permission denied — please allow camera access and try again.'
        : err.name === 'NotFoundError'
        ? 'No camera found on this device.'
        : `Camera error: ${err.message}`;
      setError(msg);
    }
  }, [isReady]);

  const stopCamera = useCallback(() => {
    const video = videoRef.current;
    if (video?.srcObject) {
      video.srcObject.getTracks().forEach(t => t.stop());
      video.srcObject = null;
    }
    if (animRef.current) cancelAnimationFrame(animRef.current);
    clearCanvas(canvasRef.current);
    setIsActive(false);
    setLandmarks(null);
  }, []);

  return {
    videoRef, canvasRef,
    landmarks, isLoading, isReady, isActive, error,
    startCamera, stopCamera,
  };
}
