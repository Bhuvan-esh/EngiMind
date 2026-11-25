import React, { useRef, useEffect, useState, useCallback } from 'react';
import { 
  Camera, CameraOff, Video, VideoOff, ZoomIn, ZoomOut, RotateCw, 
  Flame, Shield, Eye, RefreshCw, Maximize2, Zap, Thermometer, Layers, AlertTriangle,
  Settings, CheckCircle2, Sliders, Activity, Disc
} from 'lucide-react';

// Available 3D Digital Twin Component Models
const COMPONENT_DEFINITIONS = {
  impeller: {
    id: 'impeller',
    name: 'Centrifugal Pump Impeller',
    tag: 'Rotating Equipment',
    icon: '🌀',
    hotspot: { name: 'Cavitation Pitting (Leading Edge)', temp: '78.4°C', alert: false },
    telemetry: {
      primary: { label: 'Suction Head', value: '42.5 m', sub: 'Flow: 340 m³/h' },
      secondary: { label: 'Impeller Speed', value: '1,480 RPM', sub: 'Shaft Harmonics: 24.6 Hz' },
      status: { rating: 'ISO 10816 Zone B', desc: 'Acceptable for Long-term Op' }
    }
  },
  motor: {
    id: 'motor',
    name: 'Electric Induction Motor',
    tag: 'Electrical Drives',
    icon: '⚡',
    hotspot: { name: 'Stator Phase Winding Overheat', temp: '98.2°C', alert: true },
    telemetry: {
      primary: { label: 'Peak Hotspot Temp', value: '98.2°C', sub: 'Class F Limit: 105°C' },
      secondary: { label: 'Line Frequency', value: '50.0 Hz', sub: 'Draw: 64.2 A @ 400V' },
      status: { rating: 'Elevated Warning', desc: 'Winding Insulation Degradation' }
    }
  },
  bearing: {
    id: 'bearing',
    name: 'Spherical Roller Bearing',
    tag: 'Mechanical Powertrain',
    icon: '⚙️',
    hotspot: { name: 'Outer Race Spall Hotspot', temp: '86.7°C', alert: true },
    telemetry: {
      primary: { label: 'BPFO Frequency', value: '104.2 Hz', sub: 'Harmonic 2X: 208.4 Hz' },
      secondary: { label: 'Vibration RMS', value: '4.8 mm/s', sub: 'Radial Velocity Peak' },
      status: { rating: 'ISO 10816 Zone C', desc: 'Corrective Action Required' }
    }
  },
  valve: {
    id: 'valve',
    name: 'High-Pressure Control Valve',
    tag: 'Piping & Instrumentation',
    icon: '🚰',
    hotspot: { name: 'Seat Choked-Flow Cavitation', temp: '82.1°C', alert: false },
    telemetry: {
      primary: { label: 'Flow Coeff (Cv)', value: '58.2', sub: 'Position: 44% Open' },
      secondary: { label: 'Differential Press.', value: '12.4 bar', sub: 'Inlet: 38 bar' },
      status: { rating: 'ANSI Class IV', desc: 'Acceptable Seat Leakage Rate' }
    }
  },
  turbine: {
    id: 'turbine',
    name: 'High-Pressure Turbine Rotor',
    tag: 'Thermal Turbomachinery',
    icon: '🚀',
    hotspot: { name: 'Stage 1 Blade Root Hotspot', temp: '112.5°C', alert: true },
    telemetry: {
      primary: { label: 'Stage 1 Inlet Temp', value: '540°C', sub: 'Exhaust: 312°C' },
      secondary: { label: 'Rotor Speed', value: '3,000 RPM', sub: '1X Vibration: 1.2 mm/s' },
      status: { rating: 'Operational Class A', desc: 'Continuous Base-load Run' }
    }
  }
};

// Automatic Component Detector based on filename or text keywords
function detectComponentType(imageName = '') {
  if (!imageName) return 'impeller';
  const name = imageName.toLowerCase();
  if (name.includes('motor') || name.includes('stator') || name.includes('winding') || name.includes('electric')) return 'motor';
  if (name.includes('bearing') || name.includes('roller') || name.includes('ball') || name.includes('skf')) return 'bearing';
  if (name.includes('valve') || name.includes('pipe') || name.includes('flange') || name.includes('gate') || name.includes('globe')) return 'valve';
  if (name.includes('turbine') || name.includes('blade') || name.includes('steam') || name.includes('gas') || name.includes('rotor')) return 'turbine';
  if (name.includes('pump') || name.includes('impeller') || name.includes('suction') || name.includes('fluid')) return 'impeller';
  
  // Deterministic fallback based on char code sum
  const sum = name.split('').reduce((acc, c) => acc + c.charCodeAt(0), 0);
  const types = ['impeller', 'motor', 'bearing', 'valve', 'turbine'];
  return types[sum % types.length];
}

export default function CVModelInspector({ 
  problemImage = null,
  problemImageName = '',
  initialZoom = 1.0,
  onInspectPart = null
}) {
  const canvasRef = useRef(null);
  const videoRef = useRef(null);
  const cvCanvasRef = useRef(null);
  const overlayCanvasRef = useRef(null);
  const prevFrameRef = useRef(null);

  // Active 3D Component Model Selection (Varying for different images & user selectable)
  const [componentType, setComponentType] = useState(() => detectComponentType(problemImageName));

  // If problemImageName changes, automatically update the 3D component model
  useEffect(() => {
    if (problemImageName) {
      setComponentType(detectComponentType(problemImageName));
    }
  }, [problemImageName]);

  // 3D Model Transformation State
  const [rotationAngle, setRotationAngle] = useState({ x: 0.35, y: -0.6 });
  const [zoomLevel, setZoomLevel] = useState(initialZoom); // 0.5x to 3.0x
  const [viewMode, setViewMode] = useState('thermal'); // 'thermal' | 'wireframe' | 'solid'
  const [isAutoRotating, setIsAutoRotating] = useState(true);

  // Mouse drag control state
  const [isDragging, setIsDragging] = useState(false);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });

  // Camera & CV Hand Tracking State
  const [cameraActive, setCameraActive] = useState(false);
  const [cameraError, setCameraError] = useState(null);
  const [videoDevices, setVideoDevices] = useState([]);
  const [selectedDeviceId, setSelectedDeviceId] = useState('');
  const [cvSensitivity, setCvSensitivity] = useState('high'); // 'normal' | 'high'

  const [trackingInfo, setTrackingInfo] = useState({
    detected: false,
    handX: 0.5,
    handY: 0.5,
    handAreaRatio: 0.05,
    zoomDelta: 1.0,
    box: null, // [minX, minY, maxX, maxY]
    fps: 0
  });

  // Smoothing refs for buttery smooth motion & zoom
  const targetAngleRef = useRef({ x: 0.35, y: -0.6 });
  const targetZoomRef = useRef(initialZoom);
  const baseAreaRef = useRef(null);
  const detectionPersistenceRef = useRef(0); // frame counter to prevent sudden flickering dropouts

  // Enumerate video devices
  const updateDeviceList = useCallback(async () => {
    if (navigator.mediaDevices && navigator.mediaDevices.enumerateDevices) {
      try {
        const devices = await navigator.mediaDevices.enumerateDevices();
        const cams = devices.filter(d => d.kind === 'videoinput');
        setVideoDevices(cams);
        if (cams.length > 0 && !selectedDeviceId) {
          const frontCam = cams.find(c => 
            c.label.toLowerCase().includes('front') || 
            c.label.toLowerCase().includes('user') || 
            c.label.toLowerCase().includes('integrated') ||
            c.label.toLowerCase().includes('face')
          );
          setSelectedDeviceId(frontCam ? frontCam.deviceId : cams[0].deviceId);
        }
      } catch (err) {
        console.warn("Error enumerating cameras:", err);
      }
    }
  }, [selectedDeviceId]);

  useEffect(() => {
    updateDeviceList();
  }, [updateDeviceList]);

  // Request front camera stream
  const getFrontCameraStream = async (deviceId = null) => {
    if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
      throw new Error("Camera API not supported or browser blocked.");
    }

    const constraintsAttempts = [
      { 
        video: { 
          facingMode: { ideal: 'user' },
          width: { ideal: 640 }, 
          height: { ideal: 480 } 
        } 
      },
      deviceId ? { video: { deviceId: { ideal: deviceId } } } : null,
      { video: { facingMode: 'user' } },
      { video: { width: { ideal: 640 }, height: { ideal: 480 } } },
      { video: true }
    ].filter(Boolean);

    let lastError = null;
    for (const constraints of constraintsAttempts) {
      try {
        const stream = await navigator.mediaDevices.getUserMedia(constraints);
        if (stream && stream.getVideoTracks().length > 0) {
          return stream;
        }
      } catch (err) {
        lastError = err;
      }
    }

    throw lastError || new Error("Could not access front camera.");
  };

  // Toggle Camera
  const toggleCamera = async () => {
    if (cameraActive) {
      if (videoRef.current && videoRef.current.srcObject) {
        videoRef.current.srcObject.getTracks().forEach(track => track.stop());
        videoRef.current.srcObject = null;
      }
      setCameraActive(false);
      setTrackingInfo(prev => ({ ...prev, detected: false, box: null }));
      baseAreaRef.current = null;
      detectionPersistenceRef.current = 0;
      return;
    }

    try {
      setCameraError(null);
      const stream = await getFrontCameraStream(selectedDeviceId);
      
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        videoRef.current.muted = true;
        videoRef.current.setAttribute('playsinline', '');
        videoRef.current.setAttribute('muted', '');
        await videoRef.current.play().catch(console.warn);
      }

      setCameraActive(true);
      setIsAutoRotating(false);
      baseAreaRef.current = null;
      detectionPersistenceRef.current = 0;
      await updateDeviceList();
    } catch (err) {
      console.error("Camera access failed:", err);
      let msg = "Could not activate front camera. Manual mouse & zoom controls active!";
      if (err.name === 'NotAllowedError' || err.name === 'PermissionDeniedError') {
        msg = "Camera permission was denied. Please click the lock/camera icon in your browser address bar and set Camera to 'Allow'.";
      } else if (err.name === 'NotFoundError' || err.name === 'DevicesNotFoundError') {
        msg = "No front camera detected on your device. Please verify your webcam is connected.";
      } else if (err.name === 'NotReadableError' || err.name === 'TrackStartError') {
        msg = "Camera is currently being used by another application (Zoom, Teams, etc.). Please close other camera apps.";
      }
      setCameraError(msg);
      setCameraActive(false);
    }
  };

  // Computer Vision Processing Loop with Robust YCbCr Skin & Motion Tracking
  useEffect(() => {
    if (!cameraActive) return;

    let animId;
    let lastTime = performance.now();

    const processCVFrame = () => {
      const video = videoRef.current;
      const cvCanvas = cvCanvasRef.current;
      const overlayCanvas = overlayCanvasRef.current;

      if (video && video.readyState >= 2 && cvCanvas && overlayCanvas) {
        const ctx = cvCanvas.getContext('2d');
        const oCtx = overlayCanvas.getContext('2d');
        const w = cvCanvas.width;
        const h = cvCanvas.height;

        // Draw current video frame to processing canvas
        ctx.drawImage(video, 0, 0, w, h);
        const currentFrame = ctx.getImageData(0, 0, w, h);
        const curr = currentFrame.data;
        const prev = prevFrameRef.current ? prevFrameRef.current.data : null;

        // Clear visual overlay canvas (rendered directly on the video preview)
        oCtx.clearRect(0, 0, overlayCanvas.width, overlayCanvas.height);
        const ow = overlayCanvas.width;
        const oh = overlayCanvas.height;

        let minX = w, maxX = 0, minY = h, maxY = 0;
        let detectedPixels = 0;
        let sumX = 0, sumY = 0;

        // Step size for high performance (sample every 2 pixels)
        const step = 2;

        for (let y = 0; y < h; y += step) {
          for (let x = 0; x < w; x += step) {
            const idx = (y * w + x) * 4;
            const r = curr[idx];
            const g = curr[idx + 1];
            const b = curr[idx + 2];

            // 1. YCbCr Chrominance Skin Filtering (Lighting invariant)
            const Y = 0.299 * r + 0.587 * g + 0.114 * b;
            const Cb = -0.168736 * r - 0.331264 * g + 0.5 * b + 128;
            const Cr = 0.5 * r - 0.418688 * g - 0.081312 * b + 128;

            // Chrominance ranges for human skin
            const isSkinYCbCr = (Cb >= 75 && Cb <= 135 && Cr >= 130 && Cr <= 175 && Y >= 32);

            // 2. Normalized RGB heuristic fallback
            const isSkinRGB = (r > 60 && g > 35 && b > 20 && r > g && (r - g) > 10 && (r - b) > 10);

            // 3. Motion differential
            let hasMotion = false;
            if (prev) {
              const diff = Math.abs(r - prev[idx]) + Math.abs(g - prev[idx + 1]) + Math.abs(b - prev[idx + 2]);
              hasMotion = (diff > 22);
            }

            // Detection condition:
            // Stationary hand: Matches YCbCr or RGB skin color
            // Moving hand: Motion + Skin
            const isTargetPixel = (isSkinYCbCr || isSkinRGB) || (hasMotion && r > 40);

            if (isTargetPixel) {
              // Mirror X for natural webcam mirror interaction
              const mx = w - 1 - x;
              sumX += mx;
              sumY += y;
              detectedPixels++;

              if (mx < minX) minX = mx;
              if (mx > maxX) maxX = mx;
              if (y < minY) minY = y;
              if (y > maxY) maxY = y;
            }
          }
        }

        // Bounding box dimensions
        const boxWidth = maxX > minX ? (maxX - minX) : 0;
        const boxHeight = maxY > minY ? (maxY - minY) : 0;
        const areaRatio = (boxWidth * boxHeight) / (w * h);

        // Hand candidate criteria: sufficient pixel cluster with reasonable aspect ratio
        const minPixelThreshold = cvSensitivity === 'high' ? 25 : 50;
        const hasValidHand = detectedPixels >= minPixelThreshold && boxWidth > 12 && boxHeight > 12 && areaRatio > 0.012;

        if (hasValidHand) {
          detectionPersistenceRef.current = Math.min(15, detectionPersistenceRef.current + 3);
        } else {
          detectionPersistenceRef.current = Math.max(0, detectionPersistenceRef.current - 1);
        }

        const isCurrentlyTracked = detectionPersistenceRef.current > 0;

        if (isCurrentlyTracked && hasValidHand) {
          const centroidX = (sumX / detectedPixels) / w;
          const centroidY = (sumY / detectedPixels) / h;

          // Set baseline area for zoom calibration if not established
          if (!baseAreaRef.current) {
            baseAreaRef.current = Math.max(0.04, areaRatio);
          }

          // Dynamic Zoom Mapping based on Hand Distance / Bounding Area:
          // Hand closer to camera -> Area increases -> Zoom In (up to 2.8x)
          // Hand pulled back from camera -> Area decreases -> Zoom Out (down to 0.5x)
          const areaFactor = areaRatio / Math.max(0.02, baseAreaRef.current);
          const computedZoom = Math.max(0.5, Math.min(2.8, 1.0 * Math.sqrt(areaFactor * 1.35)));
          targetZoomRef.current = computedZoom;

          // Hand X / Y controls 3D rotation & tilt
          const rotDeltaX = (centroidX - 0.5) * 2.2;
          const rotDeltaY = (centroidY - 0.5) * 1.4;
          targetAngleRef.current = {
            x: Math.max(-1.15, Math.min(1.15, rotDeltaY)),
            y: rotDeltaX * Math.PI
          };

          // Render live green bounding box & crosshair on the overlay canvas!
          const scaleX = ow / w;
          const scaleY = oh / h;
          const obx = minX * scaleX;
          const oby = minY * scaleY;
          const obw = boxWidth * scaleX;
          const obh = boxHeight * scaleY;
          const ocx = centroidX * ow;
          const ocy = centroidY * oh;

          // Green Corner Brackets
          oCtx.strokeStyle = '#10B981';
          oCtx.lineWidth = 2.5;
          const cornerLen = Math.min(14, Math.min(obw, obh) / 3);

          // Top-Left
          oCtx.beginPath();
          oCtx.moveTo(obx, oby + cornerLen);
          oCtx.lineTo(obx, oby);
          oCtx.lineTo(obx + cornerLen, oby);
          oCtx.stroke();

          // Top-Right
          oCtx.beginPath();
          oCtx.moveTo(obx + obw - cornerLen, oby);
          oCtx.lineTo(obx + obw, oby);
          oCtx.lineTo(obx + obw, oby + cornerLen);
          oCtx.stroke();

          // Bottom-Left
          oCtx.beginPath();
          oCtx.moveTo(obx, oby + obh - cornerLen);
          oCtx.lineTo(obx, oby + obh);
          oCtx.lineTo(obx + cornerLen, oby + obh);
          oCtx.stroke();

          // Bottom-Right
          oCtx.beginPath();
          oCtx.moveTo(obx + obw - cornerLen, oby + obh);
          oCtx.lineTo(obx + obw, oby + obh);
          oCtx.lineTo(obx + obw, oby + obh - cornerLen);
          oCtx.stroke();

          // Centroid Target Reticle
          oCtx.beginPath();
          oCtx.arc(ocx, ocy, 7, 0, Math.PI * 2);
          oCtx.strokeStyle = '#34D399';
          oCtx.lineWidth = 2;
          oCtx.stroke();

          oCtx.beginPath();
          oCtx.arc(ocx, ocy, 2, 0, Math.PI * 2);
          oCtx.fillStyle = '#10B981';
          oCtx.fill();

          // Live Text Label
          oCtx.fillStyle = '#10B981';
          oCtx.font = 'bold 9px sans-serif';
          oCtx.fillText(`🖐️ ZOOM: ${computedZoom.toFixed(2)}x`, Math.max(4, obx), Math.max(12, oby - 4));

          setTrackingInfo({
            detected: true,
            handX: centroidX,
            handY: centroidY,
            handAreaRatio: areaRatio,
            zoomDelta: computedZoom,
            box: [minX, minY, maxX, maxY],
            fps: Math.round(1000 / Math.max(1, performance.now() - lastTime))
          });
        } else {
          setTrackingInfo(prev => ({ ...prev, detected: false, box: null }));
        }

        prevFrameRef.current = currentFrame;
        lastTime = performance.now();
      }

      animId = requestAnimationFrame(processCVFrame);
    };

    animId = requestAnimationFrame(processCVFrame);
    return () => cancelAnimationFrame(animId);
  }, [cameraActive, cvSensitivity]);

  // Smooth Interpolation (Lerp) for 3D model rotation and Zoom
  useEffect(() => {
    let animId;
    const smoothStep = () => {
      setZoomLevel(prevZoom => {
        const diff = targetZoomRef.current - prevZoom;
        if (Math.abs(diff) < 0.005) return targetZoomRef.current;
        return prevZoom + diff * 0.14;
      });

      setRotationAngle(prevAngle => {
        if (cameraActive && trackingInfo.detected) {
          const diffX = targetAngleRef.current.x - prevAngle.x;
          const diffY = targetAngleRef.current.y - prevAngle.y;
          return {
            x: prevAngle.x + diffX * 0.12,
            y: prevAngle.y + diffY * 0.12
          };
        } else if (isAutoRotating && !isDragging) {
          return {
            x: prevAngle.x,
            y: prevAngle.y + 0.008
          };
        }
        return prevAngle;
      });

      animId = requestAnimationFrame(smoothStep);
    };

    animId = requestAnimationFrame(smoothStep);
    return () => cancelAnimationFrame(animId);
  }, [cameraActive, trackingInfo.detected, isAutoRotating, isDragging]);

  // Dynamic Multi-Component 3D Canvas Rendering Engine
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    let animId;

    const render3D = () => {
      const width = canvas.width;
      const height = canvas.height;
      const cx = width / 2;
      const cy = height / 2;

      ctx.clearRect(0, 0, width, height);

      // Camera & Zoom parameters
      const baseFov = 380;
      const cameraZ = 320;
      const currentScaleFactor = zoomLevel;

      const project = (x, y, z) => {
        const cosX = Math.cos(rotationAngle.x);
        const sinX = Math.sin(rotationAngle.x);
        const y1 = y * cosX - z * sinX;
        const z1 = y * sinX + z * cosX;

        const cosY = Math.cos(rotationAngle.y);
        const sinY = Math.sin(rotationAngle.y);
        const x2 = x * cosY + z1 * sinY;
        const z2 = -x * sinY + z1 * cosY;

        const distance = cameraZ + z2;
        const scale = (baseFov / Math.max(10, distance)) * currentScaleFactor;
        return {
          px: cx + x2 * scale,
          py: cy + y1 * scale,
          scale,
          zDepth: z2
        };
      };

      // Background Cybernetic Grid Floor
      ctx.strokeStyle = 'rgba(55, 65, 81, 0.22)';
      ctx.lineWidth = 1;
      const gridSize = 140;
      for (let g = -gridSize; g <= gridSize; g += 35) {
        const p1 = project(g, 95, -gridSize);
        const p2 = project(g, 95, gridSize);
        ctx.beginPath();
        ctx.moveTo(p1.px, p1.py);
        ctx.lineTo(p2.px, p2.py);
        ctx.stroke();

        const p3 = project(-gridSize, 95, g);
        const p4 = project(gridSize, 95, g);
        ctx.beginPath();
        ctx.moveTo(p3.px, p3.py);
        ctx.lineTo(p4.px, p4.py);
        ctx.stroke();
      }

      const elements = [];

      // ==========================================
      // GEOMETRY GENERATOR PER COMPONENT TYPE
      // ==========================================

      if (componentType === 'impeller') {
        // --- 1. CENTRIFUGAL PUMP IMPELLER ---
        const hubR = 26;
        const shroudR = 76;
        const numVanes = 7;

        // Central Eye Hub
        [-25, -10, 0, 10, 25].forEach(sz => {
          const r = (sz === 0) ? hubR : 16;
          const pts = [];
          for (let a = 0; a < Math.PI * 2; a += Math.PI / 8) {
            pts.push(project(Math.cos(a) * r, Math.sin(a) * r, sz));
          }
          elements.push({ type: 'ring', points: pts, z: sz, color: '#8B5CF6' });
        });

        // Outer Shroud Disk Rings
        [-6, 6].forEach(sz => {
          const pts = [];
          for (let a = 0; a < Math.PI * 2; a += Math.PI / 12) {
            pts.push(project(Math.cos(a) * shroudR, Math.sin(a) * shroudR, sz));
          }
          elements.push({ type: 'ring', points: pts, z: sz, color: '#60A5FA' });
        });

        // Backward-Curved Logarithmic Vanes
        for (let i = 0; i < numVanes; i++) {
          const theta = (i * Math.PI * 2) / numVanes;
          // Inner hub attachment
          const r1x = Math.cos(theta) * hubR;
          const r1y = Math.sin(theta) * hubR;
          // Mid curve point
          const midTheta = theta + 0.35;
          const m1x = Math.cos(midTheta) * (hubR + shroudR) * 0.5;
          const m1y = Math.sin(midTheta) * (hubR + shroudR) * 0.5;
          // Outer tip
          const tipTheta = theta + 0.8;
          const t1x = Math.cos(tipTheta) * shroudR;
          const t1y = Math.sin(tipTheta) * shroudR;

          const pR1 = project(r1x, r1y, -8);
          const pM1 = project(m1x, m1y, -4);
          const pT1 = project(t1x, t1y, -2);
          const pT2 = project(t1x, t1y, 8);
          const pM2 = project(m1x, m1y, 6);
          const pR2 = project(r1x, r1y, 8);

          const avgZ = (pR1.zDepth + pT1.zDepth) / 2;
          elements.push({
            type: 'polygon',
            polygon: [pR1, pM1, pT1, pT2, pM2, pR2],
            z: avgZ,
            index: i,
            isHotspot: i === 0 // Leading edge cavitation
          });
        }

      } else if (componentType === 'motor') {
        // --- 2. ELECTRIC INDUCTION MOTOR ---
        const statorR = 60;
        const shaftR = 14;
        const motorLen = 130;
        const numFins = 12;

        // Finned Stator Chassis Rings
        for (let sz = -motorLen / 2; sz <= motorLen / 2; sz += 22) {
          const pts = [];
          for (let a = 0; a < Math.PI * 2; a += Math.PI / 10) {
            pts.push(project(Math.cos(a) * statorR, Math.sin(a) * statorR, sz));
          }
          elements.push({ type: 'ring', points: pts, z: sz, color: '#3B82F6' });
        }

        // Longitudinal Cooling Fins along motor casing
        for (let i = 0; i < numFins; i++) {
          const a = (i * Math.PI * 2) / numFins;
          const fx = Math.cos(a) * (statorR + 10);
          const fy = Math.sin(a) * (statorR + 10);
          const bx = Math.cos(a) * statorR;
          const by = Math.sin(a) * statorR;

          const p1 = project(bx, by, -motorLen / 2);
          const p2 = project(fx, fy, -motorLen / 2);
          const p3 = project(fx, fy, motorLen / 2);
          const p4 = project(bx, by, motorLen / 2);

          elements.push({
            type: 'polygon',
            polygon: [p1, p2, p3, p4],
            z: (p1.zDepth + p3.zDepth) / 2,
            index: i,
            isHotspot: i === 1 // Stator winding thermal hotspot
          });
        }

        // Protruding Output Drive Shaft
        [-motorLen / 2 - 35, motorLen / 2 + 35].forEach(sz => {
          const pts = [];
          for (let a = 0; a < Math.PI * 2; a += Math.PI / 6) {
            pts.push(project(Math.cos(a) * shaftR, Math.sin(a) * shaftR, sz));
          }
          elements.push({ type: 'ring', points: pts, z: sz, color: '#9CA3AF' });
        });

        // Terminal Junction Box on top
        const tbW = 28, tbH = 18, tbL = 36;
        const tbY = -statorR - tbH;
        const pTb1 = project(-tbW / 2, tbY, -tbL / 2);
        const pTb2 = project(tbW / 2, tbY, -tbL / 2);
        const pTb3 = project(tbW / 2, tbY, tbL / 2);
        const pTb4 = project(-tbW / 2, tbY, tbL / 2);
        elements.push({
          type: 'polygon',
          polygon: [pTb1, pTb2, pTb3, pTb4],
          z: pTb1.zDepth,
          index: 99,
          color: '#F59E0B'
        });

      } else if (componentType === 'bearing') {
        // --- 3. SPHERICAL ROLLER BEARING ---
        const innerR = 34;
        const outerR = 74;
        const rollerR = 12;
        const numRollers = 9;

        // Inner Race Rings
        [-18, 0, 18].forEach(sz => {
          const pts = [];
          for (let a = 0; a < Math.PI * 2; a += Math.PI / 10) {
            pts.push(project(Math.cos(a) * innerR, Math.sin(a) * innerR, sz));
          }
          elements.push({ type: 'ring', points: pts, z: sz, color: '#60A5FA' });
        });

        // Outer Race Rings
        [-22, 0, 22].forEach(sz => {
          const pts = [];
          for (let a = 0; a < Math.PI * 2; a += Math.PI / 12) {
            pts.push(project(Math.cos(a) * outerR, Math.sin(a) * outerR, sz));
          }
          elements.push({ type: 'ring', points: pts, z: sz, color: '#A78BFA' });
        });

        // 9 Rolling Elements (Cylinders / Spheres)
        const pitchR = (innerR + outerR) / 2;
        for (let i = 0; i < numRollers; i++) {
          const theta = (i * Math.PI * 2) / numRollers;
          const rcx = Math.cos(theta) * pitchR;
          const rcy = Math.sin(theta) * pitchR;

          // Front and Back circular faces of the roller
          const fPts = [];
          for (let a = 0; a < Math.PI * 2; a += Math.PI / 4) {
            const rx = rcx + Math.cos(a) * rollerR;
            const ry = rcy + Math.sin(a) * rollerR;
            fPts.push(project(rx, ry, 0));
          }

          const centerP = project(rcx, rcy, 0);
          elements.push({
            type: 'polygon',
            polygon: fPts,
            z: centerP.zDepth,
            index: i,
            isHotspot: i === 2 // Outer race spalling impact point
          });
        }

      } else if (componentType === 'valve') {
        // --- 4. HIGH-PRESSURE CONTROL VALVE ---
        const pipeR = 28;
        const flangeR = 52;
        const bodyLen = 120;
        const bonnetH = 80;
        const wheelR = 36;

        // Flanged Inlet and Outlet Rings
        [-bodyLen / 2, bodyLen / 2].forEach(sz => {
          const ptsFlange = [];
          for (let a = 0; a < Math.PI * 2; a += Math.PI / 8) {
            ptsFlange.push(project(Math.cos(a) * flangeR, Math.sin(a) * flangeR, sz));
          }
          elements.push({ type: 'ring', points: ptsFlange, z: sz, color: '#F59E0B' });
        });

        // Horizontal Pipe Neck Lines
        for (let a = 0; a < Math.PI * 2; a += Math.PI / 4) {
          const px = Math.cos(a) * pipeR;
          const py = Math.sin(a) * pipeR;
          elements.push({
            type: 'line',
            p1: project(px, py, -bodyLen / 2),
            p2: project(px, py, bodyLen / 2),
            z: 0,
            color: 'rgba(245, 158, 11, 0.4)'
          });
        }

        // Central Spherical Globe Body Rings
        [36, 44, 36].forEach((r, idx) => {
          const sz = (idx - 1) * 16;
          const pts = [];
          for (let a = 0; a < Math.PI * 2; a += Math.PI / 8) {
            pts.push(project(Math.cos(a) * r, Math.sin(a) * r, sz));
          }
          elements.push({ type: 'ring', points: pts, z: sz, color: '#EC4899' });
        });

        // Vertical Valve Bonnet & Stem
        for (let y = 0; y >= -bonnetH; y -= 16) {
          const r = y < -bonnetH + 12 ? 8 : 14;
          const pts = [];
          for (let a = 0; a < Math.PI * 2; a += Math.PI / 6) {
            pts.push(project(Math.cos(a) * r, y, Math.sin(a) * r));
          }
          elements.push({ type: 'ring', points: pts, z: 0, color: '#10B981' });
        }

        // Top Actuator Handwheel
        const wheelPts = [];
        for (let a = 0; a < Math.PI * 2; a += Math.PI / 8) {
          wheelPts.push(project(Math.cos(a) * wheelR, -bonnetH, Math.sin(a) * wheelR));
        }
        elements.push({
          type: 'ring',
          points: wheelPts,
          z: 0,
          color: '#34D399'
        });

        // Handwheel Spokes
        for (let a = 0; a < Math.PI; a += Math.PI / 2) {
          elements.push({
            type: 'line',
            p1: project(Math.cos(a) * wheelR, -bonnetH, Math.sin(a) * wheelR),
            p2: project(-Math.cos(a) * wheelR, -bonnetH, -Math.sin(a) * wheelR),
            z: 0,
            color: '#10B981'
          });
        }

      } else {
        // --- 5. HIGH-PRESSURE TURBINE ROTOR ---
        const numBlades = 12;
        const bladeR = 75;
        const hubR = 30;

        // Shaft Rings
        [-110, -70, -30, 0, 30, 70, 110].forEach(sz => {
          const r = (sz === 0) ? hubR : 16;
          const pts = [];
          for (let a = 0; a < Math.PI * 2; a += Math.PI / 8) {
            pts.push(project(Math.cos(a) * r, Math.sin(a) * r, sz));
          }
          elements.push({ type: 'ring', points: pts, z: sz, color: '#8B5CF6' });
        });

        // Longitudinal Shaft Lines
        for (let a = 0; a < Math.PI * 2; a += Math.PI / 4) {
          const rx = Math.cos(a) * 16;
          const ry = Math.sin(a) * 16;
          elements.push({
            type: 'line',
            p1: project(rx, ry, -110),
            p2: project(rx, ry, 110),
            z: 0,
            color: 'rgba(139, 92, 246, 0.4)'
          });
        }

        // 12 Blades
        for (let i = 0; i < numBlades; i++) {
          const theta = (i * Math.PI * 2) / numBlades;
          const rootX = Math.cos(theta) * hubR;
          const rootY = Math.sin(theta) * hubR;
          const tipX = Math.cos(theta + 0.35) * bladeR;
          const tipY = Math.sin(theta + 0.35) * bladeR;

          const pRootFront = project(rootX, rootY, -10);
          const pTipFront = project(tipX, tipY, -2);
          const pTipBack = project(tipX, tipY, 18);
          const pRootBack = project(rootX, rootY, 10);

          const avgZ = (pRootFront.zDepth + pTipFront.zDepth) / 2;
          elements.push({
            type: 'polygon',
            polygon: [pRootFront, pTipFront, pTipBack, pRootBack],
            z: avgZ,
            index: i,
            isHotspot: i % 4 === 0
          });
        }
      }

      // Sort elements back-to-front (Painter's Algorithm)
      elements.sort((a, b) => b.z - a.z);

      // Render 3D Elements
      elements.forEach(el => {
        if (el.type === 'ring') {
          ctx.beginPath();
          ctx.strokeStyle = el.color;
          ctx.lineWidth = 1.4;
          el.points.forEach((pt, idx) => {
            if (idx === 0) ctx.moveTo(pt.px, pt.py);
            else ctx.lineTo(pt.px, pt.py);
          });
          ctx.closePath();
          ctx.stroke();
        } else if (el.type === 'line') {
          ctx.beginPath();
          ctx.strokeStyle = el.color;
          ctx.lineWidth = 1.1;
          ctx.moveTo(el.p1.px, el.p1.py);
          ctx.lineTo(el.p2.px, el.p2.py);
          ctx.stroke();
        } else if (el.type === 'polygon') {
          ctx.beginPath();
          el.polygon.forEach((pt, idx) => {
            if (idx === 0) ctx.moveTo(pt.px, pt.py);
            else ctx.lineTo(pt.px, pt.py);
          });
          ctx.closePath();

          if (viewMode === 'thermal') {
            const isHighHeat = el.isHotspot;
            const alpha = 0.45 + 0.25 * Math.sin(el.index + rotationAngle.y * 2);
            ctx.fillStyle = isHighHeat ? `rgba(239, 68, 68, ${alpha})` : `rgba(245, 158, 11, ${alpha * 0.7})`;
            ctx.fill();
            ctx.strokeStyle = isHighHeat ? '#F87171' : '#FCD34D';
            ctx.lineWidth = 1.2;
            ctx.stroke();
          } else if (viewMode === 'solid') {
            ctx.fillStyle = 'rgba(75, 85, 99, 0.65)';
            ctx.fill();
            ctx.strokeStyle = '#9CA3AF';
            ctx.lineWidth = 1.2;
            ctx.stroke();
          } else {
            ctx.strokeStyle = '#A78BFA';
            ctx.lineWidth = 1;
            ctx.stroke();
          }
        }
      });

      // Hotspot Annotation Pin
      const def = COMPONENT_DEFINITIONS[componentType] || COMPONENT_DEFINITIONS.impeller;
      const hotPin = project(55, -25, 0);

      // Pulsing glow circle around hotspot
      const pulse = 1 + 0.25 * Math.sin(performance.now() * 0.006);
      ctx.beginPath();
      ctx.arc(hotPin.px, hotPin.py, 10 * currentScaleFactor * pulse, 0, Math.PI * 2);
      ctx.strokeStyle = 'rgba(239, 68, 68, 0.45)';
      ctx.lineWidth = 2;
      ctx.stroke();

      ctx.beginPath();
      ctx.arc(hotPin.px, hotPin.py, 6 * currentScaleFactor, 0, Math.PI * 2);
      ctx.fillStyle = def.hotspot.alert ? '#EF4444' : '#F59E0B';
      ctx.fill();

      // Tooltip Callout
      ctx.fillStyle = '#111827';
      ctx.fillRect(hotPin.px + 12, hotPin.py - 16, 170, 26);
      ctx.strokeStyle = def.hotspot.alert ? '#EF4444' : '#F59E0B';
      ctx.lineWidth = 1;
      ctx.strokeRect(hotPin.px + 12, hotPin.py - 16, 170, 26);

      ctx.fillStyle = '#F9FAFB';
      ctx.font = 'bold 10px sans-serif';
      ctx.fillText(`🔥 ${def.hotspot.name}`, hotPin.px + 18, hotPin.py - 3);
      ctx.fillStyle = def.hotspot.alert ? '#F87171' : '#FCD34D';
      ctx.font = 'bold 9px sans-serif';
      ctx.fillText(`${def.hotspot.temp} (Thermal Hotspot)`, hotPin.px + 18, hotPin.py + 7);

      animId = requestAnimationFrame(render3D);
    };

    animId = requestAnimationFrame(render3D);
    return () => cancelAnimationFrame(animId);
  }, [rotationAngle, zoomLevel, viewMode, componentType]);

  // Mouse Drag Fallback Handlers
  const handleMouseDown = (e) => {
    setIsDragging(true);
    setIsAutoRotating(false);
    setDragStart({ x: e.clientX, y: e.clientY });
  };

  const handleMouseMove = (e) => {
    if (!isDragging) return;
    const dx = e.clientX - dragStart.x;
    const dy = e.clientY - dragStart.y;
    targetAngleRef.current = {
      x: Math.max(-1.2, Math.min(1.2, targetAngleRef.current.x + dy * 0.008)),
      y: targetAngleRef.current.y + dx * 0.008
    };
    setDragStart({ x: e.clientX, y: e.clientY });
  };

  const handleMouseUp = () => setIsDragging(false);

  // Manual Zoom controls
  const handleZoomIn = () => {
    targetZoomRef.current = Math.min(2.8, targetZoomRef.current + 0.35);
  };

  const handleZoomOut = () => {
    targetZoomRef.current = Math.max(0.5, targetZoomRef.current - 0.35);
  };

  const handleResetZoom = () => {
    targetZoomRef.current = 1.0;
    targetAngleRef.current = { x: 0.35, y: -0.6 };
    baseAreaRef.current = null;
    detectionPersistenceRef.current = 0;
  };

  const activeDef = COMPONENT_DEFINITIONS[componentType] || COMPONENT_DEFINITIONS.impeller;

  return (
    <div style={{
      background: 'radial-gradient(circle at 50% 50%, rgba(31, 41, 55, 0.95) 0%, rgba(11, 15, 23, 0.98) 100%)',
      border: '2px solid rgba(139, 92, 246, 0.4)',
      borderRadius: '20px',
      padding: '20px',
      position: 'relative',
      overflow: 'hidden',
      boxShadow: '0 12px 48px rgba(0,0,0,0.6)',
      color: '#F9FAFB'
    }}>
      {/* Top Header Bar */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '14px', flexWrap: 'wrap', gap: '10px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <div style={{
            background: 'rgba(139, 92, 246, 0.2)',
            padding: '8px',
            borderRadius: '10px',
            color: '#A78BFA'
          }}>
            <Eye size={20} />
          </div>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <h3 style={{ fontSize: '17px', fontWeight: 800, color: '#F9FAFB', margin: 0 }}>
                3D Digital Twin • Computer Vision Gesture Inspector
              </h3>
              <span style={{
                background: 'rgba(16, 185, 129, 0.2)',
                color: '#6EE7B7',
                border: '1px solid rgba(16, 185, 129, 0.4)',
                padding: '2px 8px',
                borderRadius: '12px',
                fontSize: '11px',
                fontWeight: 700
              }}>
                {activeDef.icon} {activeDef.name}
              </span>
            </div>
            <span style={{ fontSize: '11px', color: '#9CA3AF' }}>
              Front-Camera Hand Tracking: Wave left/right to rotate • Move hand closer to <strong>ZOOM IN</strong>, pull back to <strong>ZOOM OUT</strong>
            </span>
          </div>
        </div>

        {/* Action Controls */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
          <button
            type="button"
            onClick={toggleCamera}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              background: cameraActive ? 'rgba(16, 185, 129, 0.2)' : 'rgba(139, 92, 246, 0.2)',
              border: `1.5px solid ${cameraActive ? '#10B981' : '#8B5CF6'}`,
              color: cameraActive ? '#6EE7B7' : '#C4B5FD',
              padding: '6px 14px',
              borderRadius: '8px',
              fontSize: '12px',
              fontWeight: 700,
              cursor: 'pointer',
              boxShadow: cameraActive ? '0 0 12px rgba(16, 185, 129, 0.4)' : 'none'
            }}
          >
            {cameraActive ? <Video size={15} /> : <VideoOff size={15} />}
            {cameraActive ? 'Front Camera: Active (CV Tracking)' : 'Start Front Camera (CV)'}
          </button>

          {videoDevices.length > 1 && (
            <select
              value={selectedDeviceId}
              onChange={async (e) => {
                const newId = e.target.value;
                setSelectedDeviceId(newId);
                if (cameraActive) {
                  if (videoRef.current && videoRef.current.srcObject) {
                    videoRef.current.srcObject.getTracks().forEach(t => t.stop());
                  }
                  try {
                    const s = await getFrontCameraStream(newId);
                    if (videoRef.current) {
                      videoRef.current.srcObject = s;
                      videoRef.current.play().catch(console.warn);
                    }
                  } catch (err) {
                    console.warn(err);
                  }
                }
              }}
              style={{
                background: '#1F2937',
                border: '1px solid #4B5563',
                color: '#D1D5DB',
                padding: '5px 8px',
                borderRadius: '6px',
                fontSize: '11px',
                cursor: 'pointer'
              }}
            >
              {videoDevices.map((d, i) => (
                <option key={d.deviceId || i} value={d.deviceId}>
                  📷 {d.label || `Camera ${i + 1}`}
                </option>
              ))}
            </select>
          )}

          {/* View Modes */}
          <div style={{ display: 'flex', gap: '3px', background: '#1F2937', padding: '3px', borderRadius: '8px', border: '1px solid #374151' }}>
            <button
              type="button"
              onClick={() => setViewMode('thermal')}
              style={{
                background: viewMode === 'thermal' ? 'rgba(239, 68, 68, 0.25)' : 'transparent',
                border: `1px solid ${viewMode === 'thermal' ? '#EF4444' : 'transparent'}`,
                color: viewMode === 'thermal' ? '#FCA5A5' : '#9CA3AF',
                padding: '3px 8px',
                borderRadius: '6px',
                fontSize: '11px',
                fontWeight: 600,
                cursor: 'pointer'
              }}
            >
              🔥 Thermal
            </button>
            <button
              type="button"
              onClick={() => setViewMode('wireframe')}
              style={{
                background: viewMode === 'wireframe' ? 'rgba(139, 92, 246, 0.25)' : 'transparent',
                border: `1px solid ${viewMode === 'wireframe' ? '#8B5CF6' : 'transparent'}`,
                color: viewMode === 'wireframe' ? '#C4B5FD' : '#9CA3AF',
                padding: '3px 8px',
                borderRadius: '6px',
                fontSize: '11px',
                fontWeight: 600,
                cursor: 'pointer'
              }}
            >
              🕸️ Wireframe
            </button>
            <button
              type="button"
              onClick={() => setViewMode('solid')}
              style={{
                background: viewMode === 'solid' ? 'rgba(75, 85, 99, 0.4)' : 'transparent',
                border: `1px solid ${viewMode === 'solid' ? '#9CA3AF' : 'transparent'}`,
                color: viewMode === 'solid' ? '#F3F4F6' : '#9CA3AF',
                padding: '3px 8px',
                borderRadius: '6px',
                fontSize: '11px',
                fontWeight: 600,
                cursor: 'pointer'
              }}
            >
              Solid CAD
            </button>
          </div>
        </div>
      </div>

      {/* Dynamic 3D Component Model Switcher Bar (Varying across different components & images) */}
      <div style={{
        display: 'flex',
        alignItems: 'center',
        gap: '6px',
        marginBottom: '14px',
        padding: '8px 12px',
        background: '#111827',
        borderRadius: '12px',
        border: '1px solid #374151',
        overflowX: 'auto'
      }}>
        <div style={{ fontSize: '11px', fontWeight: 700, color: '#9CA3AF', marginRight: '6px', whiteSpace: 'nowrap', display: 'flex', alignItems: 'center', gap: '4px' }}>
          <Layers size={13} color="#A78BFA" /> 3D Digital Twins:
        </div>
        {Object.values(COMPONENT_DEFINITIONS).map(def => {
          const isSelected = componentType === def.id;
          return (
            <button
              key={def.id}
              type="button"
              onClick={() => setComponentType(def.id)}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '6px',
                background: isSelected ? 'rgba(139, 92, 246, 0.3)' : 'rgba(31, 41, 55, 0.6)',
                border: `1px solid ${isSelected ? '#8B5CF6' : '#4B5563'}`,
                color: isSelected ? '#F3F4F6' : '#9CA3AF',
                padding: '5px 12px',
                borderRadius: '8px',
                fontSize: '11px',
                fontWeight: isSelected ? 700 : 500,
                cursor: 'pointer',
                whiteSpace: 'nowrap',
                transition: 'all 0.2s ease',
                boxShadow: isSelected ? '0 0 10px rgba(139, 92, 246, 0.3)' : 'none'
              }}
            >
              <span>{def.icon}</span>
              <span>{def.name}</span>
            </button>
          );
        })}
      </div>

      {cameraError && (
        <div style={{
          background: 'rgba(239, 68, 68, 0.15)',
          border: '1px solid rgba(239, 68, 68, 0.4)',
          color: '#FCA5A5',
          padding: '10px 14px',
          borderRadius: '10px',
          fontSize: '12px',
          marginBottom: '14px',
          display: 'flex',
          alignItems: 'center',
          gap: '8px'
        }}>
          <AlertTriangle size={16} color="#EF4444" />
          <span>{cameraError}</span>
        </div>
      )}

      {/* Main Viewport Grid: Problem Image (if uploaded) + 3D Canvas */}
      <div style={{
        display: problemImage ? 'grid' : 'block',
        gridTemplateColumns: problemImage ? '1fr 1.35fr' : '1fr',
        gap: '16px',
        marginBottom: '16px'
      }}>
        {problemImage && (
          <div style={{
            background: '#1F2937',
            border: '1px solid #374151',
            borderRadius: '14px',
            padding: '12px',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            maxHeight: '330px',
            overflow: 'hidden',
            position: 'relative'
          }}>
            <div style={{ fontSize: '11px', color: '#9CA3AF', marginBottom: '8px', alignSelf: 'flex-start', display: 'flex', justifyContent: 'space-between', width: '100%' }}>
              <span>📸 Source Problem Image: <strong>{problemImageName || 'Component'}</strong></span>
              <span style={{ color: '#A78BFA' }}>Mapped to: {activeDef.name}</span>
            </div>
            <img 
              src={problemImage} 
              alt="Problem component" 
              style={{
                maxWidth: '100%',
                maxHeight: '260px',
                objectFit: 'contain',
                borderRadius: '8px',
                border: '1px solid #4B5563'
              }} 
            />
          </div>
        )}

        {/* 3D Canvas Viewport */}
        <div 
          style={{
            position: 'relative',
            width: '100%',
            height: '330px',
            background: '#0B0F17',
            borderRadius: '14px',
            overflow: 'hidden',
            cursor: isDragging ? 'grabbing' : 'grab'
          }}
          onMouseDown={handleMouseDown}
          onMouseMove={handleMouseMove}
          onMouseUp={handleMouseUp}
          onMouseLeave={handleMouseUp}
        >
          <canvas
            ref={canvasRef}
            width={640}
            height={330}
            style={{ width: '100%', height: '100%', display: 'block' }}
          />

          {/* Active Model & Zoom Badge */}
          <div style={{
            position: 'absolute',
            top: '12px',
            left: '12px',
            background: 'rgba(17, 24, 39, 0.88)',
            border: '1px solid #374151',
            borderRadius: '8px',
            padding: '6px 12px',
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            fontSize: '12px',
            backdropFilter: 'blur(4px)'
          }}>
            <span style={{ color: '#9CA3AF' }}>Scale:</span>
            <strong style={{ color: '#10B981', fontSize: '14px' }}>
              {zoomLevel.toFixed(2)}x Zoom
            </strong>
            <span style={{ color: '#4B5563' }}>|</span>
            <span style={{ color: '#C4B5FD', fontSize: '11px' }}>
              {activeDef.name}
            </span>
          </div>

          {/* Quick Manual Zoom & Reset Controls */}
          <div style={{
            position: 'absolute',
            bottom: '12px',
            left: '12px',
            display: 'flex',
            gap: '6px',
            zIndex: 10
          }}>
            <button
              type="button"
              onClick={handleZoomIn}
              style={{
                background: 'rgba(31, 41, 55, 0.85)',
                border: '1px solid #4B5563',
                color: '#fff',
                padding: '6px 10px',
                borderRadius: '6px',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: '4px',
                fontSize: '11px',
                fontWeight: 600
              }}
              title="Zoom In"
            >
              <ZoomIn size={14} /> In
            </button>
            <button
              type="button"
              onClick={handleZoomOut}
              style={{
                background: 'rgba(31, 41, 55, 0.85)',
                border: '1px solid #4B5563',
                color: '#fff',
                padding: '6px 10px',
                borderRadius: '6px',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: '4px',
                fontSize: '11px',
                fontWeight: 600
              }}
              title="Zoom Out"
            >
              <ZoomOut size={14} /> Out
            </button>
            <button
              type="button"
              onClick={handleResetZoom}
              style={{
                background: 'rgba(31, 41, 55, 0.85)',
                border: '1px solid #4B5563',
                color: '#9CA3AF',
                padding: '6px 10px',
                borderRadius: '6px',
                cursor: 'pointer',
                fontSize: '11px'
              }}
              title="Reset View"
            >
              <RefreshCw size={13} />
            </button>
          </div>

          {/* Floating Front-Camera Feed with Live Computer Vision Tracking Overlay */}
          {cameraActive && (
            <div style={{
              position: 'absolute',
              top: '12px',
              right: '12px',
              width: '160px',
              height: '120px',
              borderRadius: '12px',
              border: `2px solid ${trackingInfo.detected ? '#10B981' : '#8B5CF6'}`,
              background: '#000',
              overflow: 'hidden',
              boxShadow: trackingInfo.detected ? '0 0 16px rgba(16, 185, 129, 0.5)' : '0 4px 20px rgba(0,0,0,0.7)',
              zIndex: 10
            }}>
              {/* Underlying Video */}
              <video
                ref={videoRef}
                autoPlay
                playsInline
                muted
                style={{ 
                  width: '100%', 
                  height: '100%', 
                  objectFit: 'cover', 
                  transform: 'scaleX(-1)' 
                }}
              />

              {/* Dynamic Canvas HUD Overlay: Draws green bounding box & crosshairs */}
              <canvas
                ref={overlayCanvasRef}
                width={160}
                height={120}
                style={{
                  position: 'absolute',
                  top: 0,
                  left: 0,
                  width: '100%',
                  height: '100%',
                  pointerEvents: 'none'
                }}
              />

              {/* Status Header Badge */}
              <div style={{
                position: 'absolute',
                top: '4px',
                left: '4px',
                right: '4px',
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                fontSize: '9px',
                fontWeight: 800,
                background: 'rgba(0,0,0,0.75)',
                padding: '2px 6px',
                borderRadius: '4px'
              }}>
                <span style={{ color: trackingInfo.detected ? '#10B981' : '#F59E0B' }}>
                  {trackingInfo.detected ? '● HAND DETECTED' : '○ HOLD HAND UP'}
                </span>
                <span style={{ color: '#9CA3AF' }}>{trackingInfo.fps || 30} FPS</span>
              </div>

              {/* Gesture Instructions Banner at bottom */}
              <div style={{
                position: 'absolute',
                bottom: '3px',
                left: '4px',
                right: '4px',
                fontSize: '8px',
                color: '#E5E7EB',
                fontWeight: 600,
                background: 'rgba(0,0,0,0.8)',
                padding: '2px 4px',
                borderRadius: '4px',
                textAlign: 'center'
              }}>
                {trackingInfo.detected 
                  ? 'Push closer to ZOOM IN' 
                  : 'Raise hand in front of camera'}
              </div>
            </div>
          )}

          {/* Hidden Canvas for High-Speed Skin & Motion CV Calculations */}
          <canvas ref={cvCanvasRef} width={160} height={120} style={{ display: 'none' }} />
        </div>
      </div>

      {/* Real-Time Engineering Telemetry tailored to the active 3D component */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(4, 1fr)',
        gap: '12px',
        background: '#1F2937',
        border: '1px solid #374151',
        borderRadius: '14px',
        padding: '14px 18px'
      }}>
        <div>
          <div style={{ fontSize: '11px', color: '#9CA3AF', display: 'flex', alignItems: 'center', gap: '4px' }}>
            <Thermometer size={14} color="#EF4444" /> {activeDef.telemetry.primary.label}
          </div>
          <div style={{ fontSize: '18px', fontWeight: 800, color: '#EF4444', marginTop: '3px' }}>
            {activeDef.telemetry.primary.value}
          </div>
          <div style={{ fontSize: '10px', color: '#F87171' }}>
            {activeDef.telemetry.primary.sub}
          </div>
        </div>

        <div>
          <div style={{ fontSize: '11px', color: '#9CA3AF', display: 'flex', alignItems: 'center', gap: '4px' }}>
            <Zap size={14} color="#F59E0B" /> {activeDef.telemetry.secondary.label}
          </div>
          <div style={{ fontSize: '18px', fontWeight: 800, color: '#FCD34D', marginTop: '3px' }}>
            {activeDef.telemetry.secondary.value}
          </div>
          <div style={{ fontSize: '10px', color: '#9CA3AF' }}>
            {activeDef.telemetry.secondary.sub}
          </div>
        </div>

        <div>
          <div style={{ fontSize: '11px', color: '#9CA3AF', display: 'flex', alignItems: 'center', gap: '4px' }}>
            <ZoomIn size={14} color="#38BDF8" /> CV Zoom State
          </div>
          <div style={{ fontSize: '18px', fontWeight: 800, color: '#38BDF8', marginTop: '3px' }}>
            {zoomLevel.toFixed(2)}x
          </div>
          <div style={{ fontSize: '10px', color: '#9CA3AF' }}>
            {cameraActive ? (trackingInfo.detected ? 'Hand Active: Zooming' : 'Raise hand to zoom') : 'Manual Zoom Ready'}
          </div>
        </div>

        <div>
          <div style={{ fontSize: '11px', color: '#9CA3AF', display: 'flex', alignItems: 'center', gap: '4px' }}>
            <Shield size={14} color="#10B981" /> Condition Rating
          </div>
          <div style={{ fontSize: '14px', fontWeight: 700, color: '#10B981', marginTop: '4px' }}>
            {activeDef.telemetry.status.rating}
          </div>
          <div style={{ fontSize: '10px', color: '#9CA3AF' }}>
            {activeDef.telemetry.status.desc}
          </div>
        </div>
      </div>
    </div>
  );
}
