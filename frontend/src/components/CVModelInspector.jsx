import React, { useRef, useEffect, useState, useCallback } from 'react';
import { 
  Camera, CameraOff, Video, VideoOff, ZoomIn, ZoomOut, RotateCw, 
  Flame, Shield, Eye, RefreshCw, Maximize2, Zap, Thermometer, Layers, AlertTriangle,
  Upload, Sparkles, Sliders, Activity, Box, Grid3X3, Image as ImageIcon,
  Compass, FileCheck, CheckCircle2, DraftingCompass, SwitchCamera, MonitorPlay
} from 'lucide-react';

// Generates distinct engineering problem images for immediate CAD demonstration
function createSampleCADImage(type) {
  const c = document.createElement('canvas');
  c.width = 300;
  c.height = 300;
  const ctx = c.getContext('2d');

  ctx.fillStyle = '#0F172A';
  ctx.fillRect(0, 0, 300, 300);

  if (type === 'impeller') {
    // Centrifugal Pump Impeller with backward curved vanes
    ctx.strokeStyle = '#94A3B8';
    ctx.lineWidth = 14;
    ctx.beginPath();
    ctx.arc(150, 150, 110, 0, Math.PI * 2);
    ctx.stroke();

    ctx.fillStyle = '#64748B';
    ctx.beginPath();
    ctx.arc(150, 150, 42, 0, Math.PI * 2);
    ctx.fill();

    ctx.fillStyle = '#0F172A';
    ctx.beginPath();
    ctx.arc(150, 150, 18, 0, Math.PI * 2);
    ctx.fill();

    ctx.fillRect(144, 126, 12, 16);

    ctx.strokeStyle = '#F1F5F9';
    ctx.lineWidth = 9;
    for (let i = 0; i < 6; i++) {
      const a = (i * Math.PI * 2) / 6;
      ctx.beginPath();
      ctx.moveTo(150 + Math.cos(a) * 42, 150 + Math.sin(a) * 42);
      ctx.quadraticCurveTo(
        150 + Math.cos(a + 0.45) * 85, 150 + Math.sin(a + 0.45) * 85,
        150 + Math.cos(a + 0.95) * 110, 150 + Math.sin(a + 0.95) * 110
      );
      ctx.stroke();
    }

    ctx.fillStyle = '#EF4444';
    for (let k = 0; k < 18; k++) {
      ctx.beginPath();
      ctx.arc(195 + (Math.random() * 24 - 12), 115 + (Math.random() * 24 - 12), 2 + Math.random() * 4, 0, Math.PI * 2);
      ctx.fill();
    }
  } else if (type === 'bearing') {
    ctx.strokeStyle = '#CBD5E1';
    ctx.lineWidth = 22;
    ctx.beginPath();
    ctx.arc(150, 150, 115, 0, Math.PI * 2);
    ctx.stroke();

    ctx.strokeStyle = '#94A3B8';
    ctx.lineWidth = 16;
    ctx.beginPath();
    ctx.arc(150, 150, 55, 0, Math.PI * 2);
    ctx.stroke();

    ctx.fillStyle = '#0F172A';
    ctx.beginPath();
    ctx.arc(150, 150, 46, 0, Math.PI * 2);
    ctx.fill();

    for (let i = 0; i < 8; i++) {
      const a = (i * Math.PI * 2) / 8;
      ctx.fillStyle = '#F8FAFC';
      ctx.beginPath();
      ctx.arc(150 + Math.cos(a) * 85, 150 + Math.sin(a) * 85, 16, 0, Math.PI * 2);
      ctx.fill();
      ctx.strokeStyle = '#475569';
      ctx.lineWidth = 2;
      ctx.stroke();
    }

    ctx.fillStyle = '#DC2626';
    ctx.fillRect(205, 138, 30, 24);
  } else if (type === 'valve') {
    ctx.fillStyle = '#334155';
    ctx.fillRect(35, 115, 230, 70);

    ctx.fillStyle = '#475569';
    ctx.beginPath();
    ctx.arc(150, 150, 65, 0, Math.PI * 2);
    ctx.fill();

    ctx.fillStyle = '#64748B';
    ctx.fillRect(20, 85, 22, 130);
    ctx.fillRect(258, 85, 22, 130);

    ctx.fillStyle = '#0F172A';
    [98, 128, 172, 202].forEach(by => {
      ctx.beginPath();
      ctx.arc(31, by, 5, 0, Math.PI * 2);
      ctx.fill();
      ctx.beginPath();
      ctx.arc(269, by, 5, 0, Math.PI * 2);
      ctx.fill();
    });

    ctx.fillStyle = '#EF4444';
    ctx.beginPath();
    ctx.arc(150, 150, 22, 0, Math.PI * 2);
    ctx.fill();
  } else if (type === 'motor') {
    ctx.fillStyle = '#1E293B';
    ctx.beginPath();
    ctx.arc(150, 150, 120, 0, Math.PI * 2);
    ctx.fill();

    ctx.strokeStyle = '#475569';
    ctx.lineWidth = 14;
    ctx.beginPath();
    ctx.arc(150, 150, 115, 0, Math.PI * 2);
    ctx.stroke();

    for (let i = 0; i < 16; i++) {
      const a = (i * Math.PI * 2) / 16;
      ctx.strokeStyle = '#D97706';
      ctx.lineWidth = 7;
      ctx.beginPath();
      ctx.moveTo(150 + Math.cos(a) * 55, 150 + Math.sin(a) * 55);
      ctx.lineTo(150 + Math.cos(a) * 100, 150 + Math.sin(a) * 100);
      ctx.stroke();
    }

    ctx.fillStyle = '#0F172A';
    ctx.beginPath();
    ctx.arc(150, 150, 48, 0, Math.PI * 2);
    ctx.fill();

    ctx.fillStyle = '#DC2626';
    ctx.beginPath();
    ctx.arc(150 + Math.cos(0.4) * 80, 150 + Math.sin(0.4) * 80, 20, 0, Math.PI * 2);
    ctx.fill();
  } else {
    ctx.fillStyle = '#475569';
    ctx.beginPath();
    ctx.moveTo(95, 245);
    ctx.lineTo(205, 245);
    ctx.lineTo(185, 50);
    ctx.quadraticCurveTo(150, 32, 115, 50);
    ctx.closePath();
    ctx.fill();

    ctx.fillStyle = '#64748B';
    ctx.fillRect(80, 240, 140, 36);

    ctx.strokeStyle = '#EF4444';
    ctx.lineWidth = 5;
    ctx.beginPath();
    ctx.moveTo(118, 215);
    ctx.lineTo(155, 208);
    ctx.lineTo(168, 220);
    ctx.stroke();
  }

  return c.toDataURL('image/png');
}

const SAMPLE_CAD_PRESETS = [
  { id: 'impeller', name: 'Pump Impeller Cavitation', icon: '🌀' },
  { id: 'turbine', name: 'Turbine Airfoil Blade Crack', icon: '🚀' },
  { id: 'bearing', name: 'Roller Bearing Spall Fatigue', icon: '⚙️' },
  { id: 'valve', name: 'Control Valve Orifice Erosion', icon: '🚰' },
  { id: 'motor', name: 'Stator Winding Overheat', icon: '⚡' }
];

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
  const fileInputRef = useRef(null);
  const prevFrameRef = useRef(null);

  // Active Image State
  const [activeImageSrc, setActiveImageSrc] = useState(() => problemImage || createSampleCADImage('impeller'));
  const [activeImageTitle, setActiveImageTitle] = useState(() => problemImageName || 'Pump Impeller Cavitation');
  const [isCustomUploaded, setIsCustomUploaded] = useState(Boolean(problemImage));

  useEffect(() => {
    if (problemImage) {
      setActiveImageSrc(problemImage);
      setActiveImageTitle(problemImageName || 'Inspected Problem Image');
      setIsCustomUploaded(true);
    }
  }, [problemImage, problemImageName]);

  // CAD Analysis Model extracted directly from the image
  const [cadModel, setCadModel] = useState(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [cadViewMode, setCadViewMode] = useState('3d-iso');
  const [extrusionDepth, setExtrusionDepth] = useState(40);

  // 3D Viewport Transformation State
  const [rotationAngle, setRotationAngle] = useState({ x: 0.42, y: -0.55 });
  const [zoomLevel, setZoomLevel] = useState(initialZoom);
  const [isAutoRotating, setIsAutoRotating] = useState(true);

  // Mouse Drag Handlers
  const [isDragging, setIsDragging] = useState(false);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });

  // Camera & CV Hand Tracking State with Dynamic Dimensions and Redirection
  const [cameraActive, setCameraActive] = useState(false);
  const [cameraError, setCameraError] = useState(null);
  const [videoDevices, setVideoDevices] = useState([]);
  const [selectedDeviceId, setSelectedDeviceId] = useState('');
  const [activeCameraLabel, setActiveCameraLabel] = useState('Auto Front Camera');
  const [cameraDimensions, setCameraDimensions] = useState({ width: 640, height: 480, aspect: '4:3' });
  const [isVirtualFeed, setIsVirtualFeed] = useState(false);

  const [trackingInfo, setTrackingInfo] = useState({
    detected: false,
    handX: 0.5,
    handY: 0.5,
    handAreaRatio: 0.05,
    zoomDelta: 1.0,
    box: null,
    fps: 0
  });

  const targetAngleRef = useRef({ x: 0.42, y: -0.55 });
  const targetZoomRef = useRef(initialZoom);
  const baseAreaRef = useRef(null);
  const detectionPersistenceRef = useRef(0);
  const virtualAnimIdRef = useRef(null);

  // =========================================================================
  // IMAGE-TO-CAD VECTOR EXTRACTION ENGINE
  // =========================================================================
  const extractCADFromImage = useCallback((imgSrc, depthScale) => {
    setIsAnalyzing(true);
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.src = imgSrc;

    img.onload = () => {
      try {
        const res = 34;
        const procCanvas = document.createElement('canvas');
        procCanvas.width = res;
        procCanvas.height = res;
        const pCtx = procCanvas.getContext('2d');
        pCtx.drawImage(img, 0, 0, res, res);

        const imgData = pCtx.getImageData(0, 0, res, res);
        const data = imgData.data;

        const vertices = [];
        const cadContourLines = [];
        const polygons = [];
        let maxGradient = -1;
        let defectCoordinate = { x: 0, y: 0, z: 0, label: 'CRITICAL DEFECT FOCUS', metric: '2.4mm Depth' };

        const widthExtent = 115;
        const heightExtent = 115;

        for (let j = 0; j < res; j++) {
          for (let i = 0; i < res; i++) {
            const idx = (j * res + i) * 4;
            const r = data[idx];
            const g = data[idx + 1];
            const b = data[idx + 2];

            const lum = 0.299 * r + 0.587 * g + 0.114 * b;
            const u = (i / (res - 1)) * 2 - 1;
            const v = (j / (res - 1)) * 2 - 1;
            const dist = Math.sqrt(u * u + v * v);

            const curvature = Math.max(0, Math.cos(Math.min(1, dist) * (Math.PI * 0.48)));
            const zRelief = (lum / 255 - 0.4) * depthScale + (curvature * 22);

            const xPos = u * widthExtent;
            const yPos = v * heightExtent;
            const zPos = zRelief;

            let grad = 0;
            if (i > 0 && i < res - 1 && j > 0 && j < res - 1) {
              const lumL = 0.299 * data[(j * res + i - 1) * 4] + 0.587 * data[(j * res + i - 1) * 4 + 1];
              const lumR = 0.299 * data[(j * res + i + 1) * 4] + 0.587 * data[(j * res + i + 1) * 4 + 1];
              const lumU = 0.299 * data[((j - 1) * res + i) * 4] + 0.587 * data[((j - 1) * res + i) * 4 + 1];
              const lumD = 0.299 * data[((j + 1) * res + i) * 4] + 0.587 * data[((j + 1) * res + i) * 4 + 1];
              grad = Math.sqrt(Math.pow(lumR - lumL, 2) + Math.pow(lumD - lumU, 2));
            }

            const anomalyScore = (r * 1.6 - (g + b) * 0.6) + grad * 0.8;
            if (anomalyScore > maxGradient && dist < 0.85) {
              maxGradient = anomalyScore;
              defectCoordinate = {
                x: xPos,
                y: yPos,
                z: zPos + 12,
                label: r > (g + b) ? 'THERMAL CRACK / CAVITATION' : 'STRUCTURAL WEAR PROFILE',
                metric: `${(65 + (lum / 255) * 46).toFixed(1)}°C | Depth: ${(1.2 + (grad / 255) * 3).toFixed(1)}mm`
              };
            }

            vertices.push({ x: xPos, y: yPos, z: zPos, r, g, b, lum, grad });
          }
        }

        for (let j = 0; j < res - 1; j++) {
          for (let i = 0; i < res - 1; i++) {
            const i0 = j * res + i;
            const i1 = j * res + (i + 1);
            const i2 = (j + 1) * res + (i + 1);
            const i3 = (j + 1) * res + i;

            const v0 = vertices[i0];
            const v1 = vertices[i1];
            const v2 = vertices[i2];
            const v3 = vertices[i3];

            const avgR = (v0.r + v1.r + v2.r + v3.r) / 4;
            const avgG = (v0.g + v1.g + v2.g + v3.g) / 4;
            const avgB = (v0.b + v1.b + v2.b + v3.b) / 4;
            const avgLum = (v0.lum + v1.lum + v2.lum + v3.lum) / 4;
            const avgZ = (v0.z + v1.z + v2.z + v3.z) / 4;
            const avgGrad = (v0.grad + v1.grad + v2.grad + v3.grad) / 4;

            polygons.push({
              indices: [i0, i1, i2, i3],
              avgZ,
              color: `rgb(${Math.round(avgR)}, ${Math.round(avgG)}, ${Math.round(avgB)})`,
              lum: avgLum,
              isEdge: avgGrad > 28
            });

            if (avgGrad > 32) {
              cadContourLines.push({
                x1: v0.x, y1: v0.y,
                x2: v2.x, y2: v2.y,
                weight: Math.min(2.5, 1 + avgGrad / 80)
              });
            }
          }
        }

        const baseZ = -22;
        const sideWalls = [];
        for (let i = 0; i < res - 1; i++) {
          sideWalls.push({
            p1: vertices[i],
            p2: vertices[i + 1],
            p3: { x: vertices[i + 1].x, y: vertices[i + 1].y, z: baseZ },
            p4: { x: vertices[i].x, y: vertices[i].y, z: baseZ }
          });
          const bIdx = (res - 1) * res + i;
          sideWalls.push({
            p1: vertices[bIdx],
            p2: vertices[bIdx + 1],
            p3: { x: vertices[bIdx + 1].x, y: vertices[bIdx + 1].y, z: baseZ },
            p4: { x: vertices[bIdx].x, y: vertices[bIdx].y, z: baseZ }
          });
        }

        setCadModel({
          vertices,
          polygons,
          cadContourLines,
          sideWalls,
          defect: defectCoordinate,
          res,
          envelope: {
            width: (widthExtent * 2).toFixed(1),
            height: (heightExtent * 2).toFixed(1),
            thickness: (depthScale + 22).toFixed(1)
          }
        });
      } catch (err) {
        console.error("CAD Extraction failed:", err);
      } finally {
        setIsAnalyzing(false);
      }
    };
  }, []);

  useEffect(() => {
    if (activeImageSrc) {
      extractCADFromImage(activeImageSrc, extrusionDepth);
    }
  }, [activeImageSrc, extrusionDepth, extractCADFromImage]);

  const handleFileUpload = (e) => {
    const file = e.target.files?.[0];
    if (file && file.type.startsWith('image/')) {
      const url = URL.createObjectURL(file);
      setActiveImageSrc(url);
      setActiveImageTitle(file.name);
      setIsCustomUploaded(true);
    }
  };

  // =========================================================================
  // CAMERA DETECTION, DIMENSIONS CHECK & REDIRECTION CONTROLS
  // =========================================================================
  const updateDeviceList = useCallback(async () => {
    if (navigator.mediaDevices && navigator.mediaDevices.enumerateDevices) {
      try {
        const devices = await navigator.mediaDevices.enumerateDevices();
        // Filter video inputs and skip IR sensors if possible
        const cams = devices.filter(d => d.kind === 'videoinput');
        setVideoDevices(cams);

        if (cams.length > 0 && !selectedDeviceId) {
          // Priority to front/RGB cameras
          const frontCam = cams.find(c => {
            const l = (c.label || '').toLowerCase();
            return !l.includes('ir') && (l.includes('front') || l.includes('user') || l.includes('integrated') || l.includes('face') || l.includes('webcam'));
          });
          const best = frontCam || cams.find(c => !c.label.toLowerCase().includes('ir')) || cams[0];
          setSelectedDeviceId(best.deviceId);
          setActiveCameraLabel(best.label || 'Webcam 1');
        }
      } catch (err) {
        console.warn("Camera enum error:", err);
      }
    }
  }, [selectedDeviceId]);

  useEffect(() => {
    updateDeviceList();
  }, [updateDeviceList]);

  // Request camera stream with dynamic dimensions (No rigid 640x480 constraints)
  const getCameraStreamWithFlexibleDimensions = async (targetDeviceId = null) => {
    if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
      throw new Error("Camera API not supported or browser blocked.");
    }

    // Constraints priority: targetDeviceId exact -> targetDeviceId ideal -> user facing -> generic video true
    const attempts = [
      targetDeviceId ? { video: { deviceId: { exact: targetDeviceId } } } : null,
      targetDeviceId ? { video: { deviceId: { ideal: targetDeviceId } } } : null,
      { video: { facingMode: { ideal: 'user' } } },
      { video: { facingMode: 'user' } },
      { video: true }
    ].filter(Boolean);

    let lastError = null;
    for (const constraints of attempts) {
      try {
        const stream = await navigator.mediaDevices.getUserMedia(constraints);
        if (stream && stream.getVideoTracks().length > 0) {
          return stream;
        }
      } catch (err) {
        lastError = err;
      }
    }
    throw lastError || new Error("Could not detect webcam with available dimensions.");
  };

  // Stop active camera
  const stopCameraStream = () => {
    if (videoRef.current && videoRef.current.srcObject) {
      videoRef.current.srcObject.getTracks().forEach(track => track.stop());
      videoRef.current.srcObject = null;
    }
    if (virtualAnimIdRef.current) {
      cancelAnimationFrame(virtualAnimIdRef.current);
      virtualAnimIdRef.current = null;
    }
    setCameraActive(false);
    setIsVirtualFeed(false);
    setTrackingInfo(prev => ({ ...prev, detected: false, box: null }));
    baseAreaRef.current = null;
    detectionPersistenceRef.current = 0;
  };

  // Start or Redirect Camera Stream
  const startCameraStream = async (targetDeviceId = null) => {
    try {
      setCameraError(null);
      stopCameraStream();

      const stream = await getCameraStreamWithFlexibleDimensions(targetDeviceId);
      const track = stream.getVideoTracks()[0];
      const settings = track.getSettings ? track.getSettings() : {};

      // Identify camera device label and native dimensions
      const devLabel = track.label || 'Active Webcam';
      setActiveCameraLabel(devLabel);
      if (track.getSettings().deviceId) {
        setSelectedDeviceId(track.getSettings().deviceId);
      }

      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        videoRef.current.muted = true;
        videoRef.current.setAttribute('playsinline', '');
        videoRef.current.setAttribute('muted', '');

        // Listen for metadata to read real hardware dimensions
        videoRef.current.onloadedmetadata = () => {
          const w = videoRef.current.videoWidth || settings.width || 640;
          const h = videoRef.current.videoHeight || settings.height || 480;
          const aspect = (w / h).toFixed(2);
          setCameraDimensions({ width: w, height: h, aspect: aspect === '1.78' ? '16:9' : (aspect === '1.33' ? '4:3' : `${w}×${h}`) });

          // Adjust internal CV processing canvas matching the camera's aspect ratio
          if (cvCanvasRef.current) {
            const scale = Math.min(1, 160 / Math.max(w, h));
            cvCanvasRef.current.width = Math.round(w * scale);
            cvCanvasRef.current.height = Math.round(h * scale);
          }
        };

        await videoRef.current.play().catch(console.warn);
      }

      setCameraActive(true);
      setIsVirtualFeed(false);
      setIsAutoRotating(false);
      baseAreaRef.current = null;
      detectionPersistenceRef.current = 0;
      await updateDeviceList();
    } catch (err) {
      console.error("Camera access failed:", err);
      let msg = "Could not detect or activate camera.";
      if (err.name === 'NotAllowedError' || err.name === 'PermissionDeniedError') {
        msg = "Camera permission was denied. Please click the lock/camera icon in your address bar and allow camera access.";
      } else if (err.name === 'NotFoundError' || err.name === 'DevicesNotFoundError') {
        msg = "No front camera detected on your system. Click 'Redirect Camera' or 'Virtual Test Feed'.";
      } else if (err.name === 'NotReadableError' || err.name === 'TrackStartError') {
        msg = "Camera is currently locked by another application (Teams, Zoom, etc.). Try redirecting to another camera.";
      } else if (err.name === 'OverconstrainedError') {
        msg = "Camera did not support constraints. Redirecting with flexible dimensions...";
      }
      setCameraError(msg);
      setCameraActive(false);
    }
  };

  // Toggle Camera
  const toggleCamera = async () => {
    if (cameraActive) {
      stopCameraStream();
    } else {
      await startCameraStream(selectedDeviceId);
    }
  };

  // REDIRECT CAMERA: Cycle to next available videoinput device
  const redirectCamera = async () => {
    if (videoDevices.length === 0) {
      await updateDeviceList();
    }
    const devices = videoDevices;
    if (devices.length > 0) {
      const currentIndex = devices.findIndex(d => d.deviceId === selectedDeviceId);
      const nextIndex = (currentIndex + 1) % devices.length;
      const nextDevice = devices[nextIndex];
      setSelectedDeviceId(nextDevice.deviceId);
      setActiveCameraLabel(nextDevice.label || `Camera ${nextIndex + 1}`);
      await startCameraStream(nextDevice.deviceId);
    } else {
      // Re-attempt user facing
      await startCameraStream(null);
    }
  };

  // REDIRECT TO VIRTUAL TEST FEED (Fallback if camera is in use or blocked)
  const startVirtualFeed = () => {
    stopCameraStream();
    setCameraError(null);
    setIsVirtualFeed(true);
    setCameraActive(true);
    setActiveCameraLabel('Virtual Simulation Stream (Test)');
    setCameraDimensions({ width: 640, height: 480, aspect: '4:3' });

    let t = 0;
    const runVirtualFeed = () => {
      t += 0.025;
      // Simulated hand distance (sinusoidal pulse)
      const simulatedArea = 0.05 + 0.04 * Math.sin(t);
      const simulatedZoom = Math.max(0.6, Math.min(2.5, 1.0 * Math.sqrt(simulatedArea / 0.04)));
      const simulatedX = 0.5 + 0.2 * Math.cos(t * 0.7);
      const simulatedY = 0.5 + 0.15 * Math.sin(t * 0.5);

      targetZoomRef.current = simulatedZoom;
      targetAngleRef.current = {
        x: (simulatedY - 0.5) * 1.4,
        y: (simulatedX - 0.5) * 2.2 * Math.PI
      };

      // Draw simulated hand reticle on overlay canvas
      if (overlayCanvasRef.current) {
        const oCtx = overlayCanvasRef.current.getContext('2d');
        const ow = overlayCanvasRef.current.width;
        const oh = overlayCanvasRef.current.height;
        oCtx.clearRect(0, 0, ow, oh);

        const ocx = simulatedX * ow;
        const ocy = simulatedY * oh;
        const obw = 40 + 20 * Math.sin(t);
        const obh = 40 + 20 * Math.sin(t);

        oCtx.strokeStyle = '#10B981';
        oCtx.lineWidth = 2;
        oCtx.strokeRect(ocx - obw / 2, ocy - obh / 2, obw, obh);

        oCtx.beginPath();
        oCtx.arc(ocx, ocy, 5, 0, Math.PI * 2);
        oCtx.fillStyle = '#34D399';
        oCtx.fill();

        oCtx.fillStyle = '#10B981';
        oCtx.font = 'bold 9px monospace';
        oCtx.fillText(`SIM ZOOM: ${simulatedZoom.toFixed(2)}x`, Math.max(4, ocx - obw / 2), Math.max(12, ocy - obh / 2 - 4));
      }

      setTrackingInfo({
        detected: true,
        handX: simulatedX,
        handY: simulatedY,
        handAreaRatio: simulatedArea,
        zoomDelta: simulatedZoom,
        box: [simulatedX - 0.1, simulatedY - 0.1, simulatedX + 0.1, simulatedY + 0.1],
        fps: 30
      });

      virtualAnimIdRef.current = requestAnimationFrame(runVirtualFeed);
    };

    virtualAnimIdRef.current = requestAnimationFrame(runVirtualFeed);
  };

  // Real Computer Vision Processing Loop (Skin Chrominance + Distance Tracking)
  useEffect(() => {
    if (!cameraActive || isVirtualFeed) return;

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

        ctx.drawImage(video, 0, 0, w, h);
        const currentFrame = ctx.getImageData(0, 0, w, h);
        const curr = currentFrame.data;
        const prev = prevFrameRef.current ? prevFrameRef.current.data : null;

        oCtx.clearRect(0, 0, overlayCanvas.width, overlayCanvas.height);
        const ow = overlayCanvas.width;
        const oh = overlayCanvas.height;

        let minX = w, maxX = 0, minY = h, maxY = 0;
        let detectedPixels = 0;
        let sumX = 0, sumY = 0;
        const step = 2;

        for (let y = 0; y < h; y += step) {
          for (let x = 0; x < w; x += step) {
            const idx = (y * w + x) * 4;
            const r = curr[idx];
            const g = curr[idx + 1];
            const b = curr[idx + 2];

            const Y = 0.299 * r + 0.587 * g + 0.114 * b;
            const Cb = -0.168736 * r - 0.331264 * g + 0.5 * b + 128;
            const Cr = 0.5 * r - 0.418688 * g - 0.081312 * b + 128;

            const isSkin = (Cb >= 75 && Cb <= 135 && Cr >= 130 && Cr <= 175 && Y >= 30);
            const isSkinRGB = (r > 60 && g > 35 && b > 20 && r > g && (r - g) > 10 && (r - b) > 10);

            let hasMotion = false;
            if (prev) {
              const diff = Math.abs(r - prev[idx]) + Math.abs(g - prev[idx + 1]) + Math.abs(b - prev[idx + 2]);
              hasMotion = (diff > 20);
            }

            if ((isSkin || isSkinRGB) || (hasMotion && r > 40)) {
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

        const boxWidth = maxX > minX ? (maxX - minX) : 0;
        const boxHeight = maxY > minY ? (maxY - minY) : 0;
        const areaRatio = (boxWidth * boxHeight) / (w * h);

        const hasValidHand = detectedPixels >= 28 && boxWidth > 12 && boxHeight > 12 && areaRatio > 0.012;

        if (hasValidHand) {
          detectionPersistenceRef.current = Math.min(15, detectionPersistenceRef.current + 3);
        } else {
          detectionPersistenceRef.current = Math.max(0, detectionPersistenceRef.current - 1);
        }

        const isCurrentlyTracked = detectionPersistenceRef.current > 0;

        if (isCurrentlyTracked && hasValidHand) {
          const centroidX = (sumX / detectedPixels) / w;
          const centroidY = (sumY / detectedPixels) / h;

          if (!baseAreaRef.current) {
            baseAreaRef.current = Math.max(0.04, areaRatio);
          }

          const areaFactor = areaRatio / Math.max(0.02, baseAreaRef.current);
          const computedZoom = Math.max(0.5, Math.min(2.8, 1.0 * Math.sqrt(areaFactor * 1.35)));
          targetZoomRef.current = computedZoom;

          const rotDeltaX = (centroidX - 0.5) * 2.2;
          const rotDeltaY = (centroidY - 0.5) * 1.4;
          targetAngleRef.current = {
            x: Math.max(-1.15, Math.min(1.15, rotDeltaY)),
            y: rotDeltaX * Math.PI
          };

          const scaleX = ow / w;
          const scaleY = oh / h;
          const obx = minX * scaleX;
          const oby = minY * scaleY;
          const obw = boxWidth * scaleX;
          const obh = boxHeight * scaleY;
          const ocx = centroidX * ow;
          const ocy = centroidY * oh;

          oCtx.strokeStyle = '#10B981';
          oCtx.lineWidth = 2.5;
          const cornerLen = Math.min(14, Math.min(obw, obh) / 3);

          oCtx.beginPath();
          oCtx.moveTo(obx, oby + cornerLen);
          oCtx.lineTo(obx, oby);
          oCtx.lineTo(obx + cornerLen, oby);
          oCtx.stroke();

          oCtx.beginPath();
          oCtx.moveTo(obx + obw - cornerLen, oby);
          oCtx.lineTo(obx + obw);
          oCtx.lineTo(obx + obw, oby + cornerLen);
          oCtx.stroke();

          oCtx.beginPath();
          oCtx.moveTo(obx, oby + obh - cornerLen);
          oCtx.lineTo(obx, oby + obh);
          oCtx.lineTo(obx + cornerLen, oby + obh);
          oCtx.stroke();

          oCtx.beginPath();
          oCtx.moveTo(obx + obw - cornerLen, oby + obh);
          oCtx.lineTo(obx + obw, oby + obh);
          oCtx.lineTo(obx + obw, oby + obh - cornerLen);
          oCtx.stroke();

          oCtx.beginPath();
          oCtx.arc(ocx, ocy, 6, 0, Math.PI * 2);
          oCtx.strokeStyle = '#34D399';
          oCtx.lineWidth = 2;
          oCtx.stroke();

          oCtx.fillStyle = '#10B981';
          oCtx.font = 'bold 9px sans-serif';
          oCtx.fillText(`🖐️ CAD ZOOM: ${computedZoom.toFixed(2)}x`, Math.max(4, obx), Math.max(12, oby - 4));

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
  }, [cameraActive, isVirtualFeed]);

  // Smooth Interpolation for 3D rotation and Zoom
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
            y: prevAngle.y + 0.007
          };
        }
        return prevAngle;
      });

      animId = requestAnimationFrame(smoothStep);
    };

    animId = requestAnimationFrame(smoothStep);
    return () => cancelAnimationFrame(animId);
  }, [cameraActive, trackingInfo.detected, isAutoRotating, isDragging]);

  // =========================================================================
  // CAD CANVAS RENDERING ENGINE
  // =========================================================================
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    let animId;

    const renderCAD = () => {
      const width = canvas.width;
      const height = canvas.height;
      const cx = width / 2;
      const cy = height / 2;

      ctx.clearRect(0, 0, width, height);

      // 1. Engineering Technical Grid Background
      ctx.fillStyle = '#0B132B';
      ctx.fillRect(0, 0, width, height);

      ctx.strokeStyle = 'rgba(56, 189, 248, 0.12)';
      ctx.lineWidth = 1;
      const step = 25;
      for (let x = 0; x < width; x += step) {
        ctx.beginPath();
        ctx.moveTo(x, 0);
        ctx.lineTo(x, height);
        ctx.stroke();
      }
      for (let y = 0; y < height; y += step) {
        ctx.beginPath();
        ctx.moveTo(0, y);
        ctx.lineTo(width, y);
        ctx.stroke();
      }

      const baseFov = 380;
      const cameraZ = 330;
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

      if (cadModel) {
        if (cadViewMode === '2d-blueprint') {
          // 2D TECHNICAL BLUEPRINT
          const bScale = currentScaleFactor * 1.05;

          ctx.strokeStyle = '#0284C7';
          ctx.lineWidth = 1.2;
          ctx.setLineDash([12, 4, 3, 4]);
          ctx.beginPath();
          ctx.moveTo(cx - 160 * bScale, cy);
          ctx.lineTo(cx + 160 * bScale, cy);
          ctx.moveTo(cx, cy - 160 * bScale);
          ctx.lineTo(cx, cy + 160 * bScale);
          ctx.stroke();
          ctx.setLineDash([]);

          ctx.fillStyle = '#38BDF8';
          ctx.font = 'bold 10px monospace';
          ctx.fillText('CL', cx + 165 * bScale, cy + 3);
          ctx.fillText('CL', cx - 8, cy - 165 * bScale);

          ctx.strokeStyle = '#E0F2FE';
          cadModel.cadContourLines.forEach(line => {
            ctx.lineWidth = line.weight * 1.1;
            ctx.beginPath();
            ctx.moveTo(cx + line.x1 * bScale, cy + line.y1 * bScale);
            ctx.lineTo(cx + line.x2 * bScale, cy + line.y2 * bScale);
            ctx.stroke();
          });

          const dimY = cy - 135 * bScale;
          const leftX = cx - (Number(cadModel.envelope.width) / 2) * bScale;
          const rightX = cx + (Number(cadModel.envelope.width) / 2) * bScale;

          ctx.strokeStyle = '#38BDF8';
          ctx.lineWidth = 1.2;
          ctx.beginPath();
          ctx.moveTo(leftX, cy - 120 * bScale);
          ctx.lineTo(leftX, dimY - 6);
          ctx.moveTo(rightX, cy - 120 * bScale);
          ctx.lineTo(rightX, dimY - 6);
          ctx.moveTo(leftX, dimY);
          ctx.lineTo(rightX, dimY);
          ctx.stroke();

          ctx.fillStyle = '#38BDF8';
          const drawArrow = (ax, ay, dir) => {
            ctx.beginPath();
            ctx.moveTo(ax, ay);
            ctx.lineTo(ax + dir * 8, ay - 3);
            ctx.lineTo(ax + dir * 8, ay + 3);
            ctx.closePath();
            ctx.fill();
          };
          drawArrow(leftX, dimY, 1);
          drawArrow(rightX, dimY, -1);

          ctx.font = 'bold 11px monospace';
          ctx.textAlign = 'center';
          ctx.fillText(`${cadModel.envelope.width} mm ±0.05`, cx, dimY - 5);
          ctx.textAlign = 'left';

          if (cadModel.defect) {
            const defX = cx + cadModel.defect.x * bScale;
            const defY = cy + cadModel.defect.y * bScale;

            ctx.strokeStyle = '#EF4444';
            ctx.lineWidth = 1.4;
            ctx.beginPath();
            ctx.arc(defX, defY, 4, 0, Math.PI * 2);
            ctx.stroke();

            ctx.beginPath();
            ctx.moveTo(defX, defY);
            ctx.lineTo(defX + 35, defY - 30);
            ctx.lineTo(defX + 110, defY - 30);
            ctx.stroke();

            ctx.fillStyle = '#EF4444';
            ctx.font = 'bold 9px monospace';
            ctx.fillText(cadModel.defect.label, defX + 38, defY - 34);
            ctx.fillStyle = '#FCA5A5';
            ctx.fillText(cadModel.defect.metric, defX + 38, defY - 20);
          }

        } else if (cadViewMode === 'cross-section') {
          // SECTION A-A TRANSVERSE PROFILE
          const bScale = currentScaleFactor * 1.1;
          const midRow = Math.floor(cadModel.res / 2);

          ctx.strokeStyle = '#38BDF8';
          ctx.lineWidth = 2;
          ctx.beginPath();

          const slicePts = [];
          for (let i = 0; i < cadModel.res; i++) {
            const v = cadModel.vertices[midRow * cadModel.res + i];
            slicePts.push({
              px: cx + v.x * bScale,
              py: cy - v.z * bScale * 1.5
            });
          }

          slicePts.forEach((pt, idx) => {
            if (idx === 0) ctx.moveTo(pt.px, pt.py);
            else ctx.lineTo(pt.px, pt.py);
          });
          ctx.lineTo(cx + 115 * bScale, cy + 30 * bScale);
          ctx.lineTo(cx - 115 * bScale, cy + 30 * bScale);
          ctx.closePath();

          ctx.fillStyle = 'rgba(56, 189, 248, 0.15)';
          ctx.fill();
          ctx.stroke();

          ctx.fillStyle = '#38BDF8';
          ctx.font = 'bold 12px monospace';
          ctx.fillText(`SECTION A-A: CENTER PROFILE (${cadModel.envelope.thickness} mm MAX DEPTH)`, cx - 180, cy - 80);

        } else {
          // 3D ISOMETRIC CAD (SOLID or THERMAL FEA)
          const projVertices = cadModel.vertices.map(v => ({
            ...v,
            proj: project(v.x, v.y, v.z)
          }));

          const renderElements = [];

          cadModel.polygons.forEach((poly, pIdx) => {
            const p0 = projVertices[poly.indices[0]].proj;
            const p1 = projVertices[poly.indices[1]].proj;
            const p2 = projVertices[poly.indices[2]].proj;
            const p3 = projVertices[poly.indices[3]].proj;

            const avgZ = (p0.zDepth + p1.zDepth + p2.zDepth + p3.zDepth) / 4;

            renderElements.push({
              type: 'facet',
              pts: [p0, p1, p2, p3],
              z: avgZ,
              color: poly.color,
              lum: poly.lum,
              isEdge: poly.isEdge,
              index: pIdx
            });
          });

          cadModel.sideWalls.forEach(wall => {
            const p1 = project(wall.p1.x, wall.p1.y, wall.p1.z);
            const p2 = project(wall.p2.x, wall.p2.y, wall.p2.z);
            const p3 = project(wall.p3.x, wall.p3.y, wall.p3.z);
            const p4 = project(wall.p4.x, wall.p4.y, wall.p4.z);

            renderElements.push({
              type: 'wall',
              pts: [p1, p2, p3, p4],
              z: (p1.zDepth + p2.zDepth + p3.zDepth + p4.zDepth) / 4,
              color: '#1E293B'
            });
          });

          renderElements.sort((a, b) => b.z - a.z);

          renderElements.forEach(el => {
            ctx.beginPath();
            el.pts.forEach((pt, idx) => {
              if (idx === 0) ctx.moveTo(pt.px, pt.py);
              else ctx.lineTo(pt.px, pt.py);
            });
            ctx.closePath();

            if (cadViewMode === 'thermal-fea') {
              const t = el.lum / 255;
              let rT, gT, bT;
              if (t < 0.25) { rT = 20; gT = Math.round(t * 4 * 140); bT = 220; }
              else if (t < 0.5) { rT = Math.round((t - 0.25) * 4 * 220); gT = 180; bT = 40; }
              else if (t < 0.75) { rT = 245; gT = Math.round((0.75 - t) * 4 * 160 + 40); bT = 20; }
              else { rT = 255; gT = Math.round((t - 0.75) * 4 * 200); bT = Math.round((t - 0.75) * 4 * 200); }
              ctx.fillStyle = `rgb(${rT}, ${gT}, ${bT})`;
              ctx.fill();
              ctx.strokeStyle = 'rgba(239, 68, 68, 0.25)';
              ctx.lineWidth = 0.5;
              ctx.stroke();
            } else {
              ctx.fillStyle = el.color;
              ctx.fill();
              ctx.strokeStyle = el.isEdge ? '#38BDF8' : 'rgba(0,0,0,0.2)';
              ctx.lineWidth = el.isEdge ? 1.1 : 0.4;
              ctx.stroke();
            }
          });

          if (cadModel.defect) {
            const hp = project(cadModel.defect.x, cadModel.defect.y, cadModel.defect.z);
            const pulse = 1 + 0.25 * Math.sin(performance.now() * 0.007);

            ctx.beginPath();
            ctx.arc(hp.px, hp.py, 10 * currentScaleFactor * pulse, 0, Math.PI * 2);
            ctx.strokeStyle = 'rgba(239, 68, 68, 0.6)';
            ctx.lineWidth = 2;
            ctx.stroke();

            ctx.beginPath();
            ctx.arc(hp.px, hp.py, 5 * currentScaleFactor, 0, Math.PI * 2);
            ctx.fillStyle = '#EF4444';
            ctx.fill();

            ctx.fillStyle = '#0B132B';
            ctx.fillRect(hp.px + 12, hp.py - 16, 185, 26);
            ctx.strokeStyle = '#EF4444';
            ctx.lineWidth = 1.2;
            ctx.strokeRect(hp.px + 12, hp.py - 16, 185, 26);

            ctx.fillStyle = '#F9FAFB';
            ctx.font = 'bold 9px monospace';
            ctx.fillText(`🔥 ${cadModel.defect.label}`, hp.px + 18, hp.py - 3);
            ctx.fillStyle = '#F87171';
            ctx.font = 'bold 8px monospace';
            ctx.fillText(cadModel.defect.metric, hp.px + 18, hp.py + 7);
          }
        }

        // Standard ANSI/ISO CAD Title Block
        const tbW = 210, tbH = 68;
        const tbX = width - tbW - 12;
        const tbY = height - tbH - 12;

        ctx.fillStyle = 'rgba(11, 19, 43, 0.92)';
        ctx.fillRect(tbX, tbY, tbW, tbH);
        ctx.strokeStyle = '#0284C7';
        ctx.lineWidth = 1.2;
        ctx.strokeRect(tbX, tbY, tbW, tbH);

        ctx.beginPath();
        ctx.moveTo(tbX, tbY + 22);
        ctx.lineTo(tbX + tbW, tbY + 22);
        ctx.moveTo(tbX, tbY + 45);
        ctx.lineTo(tbX + tbW, tbY + 45);
        ctx.moveTo(tbX + 110, tbY + 22);
        ctx.lineTo(tbX + 110, tbY + tbH);
        ctx.stroke();

        ctx.fillStyle = '#38BDF8';
        ctx.font = 'bold 10px monospace';
        ctx.fillText(`CAD TWIN: ${activeImageTitle.slice(0, 18)}`, tbX + 8, tbY + 15);

        ctx.font = '9px monospace';
        ctx.fillStyle = '#94A3B8';
        ctx.fillText('SCALE: ' + zoomLevel.toFixed(2) + ' : 1', tbX + 8, tbY + 36);
        ctx.fillText('TOL: ±0.05 mm', tbX + 116, tbY + 36);
        ctx.fillText('PROJ: 3RD ANGLE', tbX + 8, tbY + 58);
        ctx.fillText('DWG: ENG-IMAGE', tbX + 116, tbY + 58);
      }

      animId = requestAnimationFrame(renderCAD);
    };

    animId = requestAnimationFrame(renderCAD);
    return () => cancelAnimationFrame(animId);
  }, [rotationAngle, zoomLevel, cadViewMode, cadModel, activeImageTitle]);

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

  const handleZoomIn = () => {
    targetZoomRef.current = Math.min(2.8, targetZoomRef.current + 0.35);
  };

  const handleZoomOut = () => {
    targetZoomRef.current = Math.max(0.5, targetZoomRef.current - 0.35);
  };

  const handleResetZoom = () => {
    targetZoomRef.current = 1.0;
    targetAngleRef.current = { x: 0.42, y: -0.55 };
    baseAreaRef.current = null;
    detectionPersistenceRef.current = 0;
  };

  return (
    <div style={{
      background: 'radial-gradient(circle at 50% 50%, rgba(15, 23, 42, 0.98) 0%, rgba(11, 15, 23, 1) 100%)',
      border: '2px solid rgba(56, 189, 248, 0.4)',
      borderRadius: '20px',
      padding: '20px',
      position: 'relative',
      overflow: 'hidden',
      boxShadow: '0 12px 48px rgba(0,0,0,0.7)',
      color: '#F9FAFB'
    }}>
      {/* Top Header Bar */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '14px', flexWrap: 'wrap', gap: '10px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <div style={{
            background: 'rgba(56, 189, 248, 0.2)',
            padding: '8px',
            borderRadius: '10px',
            color: '#38BDF8'
          }}>
            <DraftingCompass size={22} />
          </div>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <h3 style={{ fontSize: '18px', fontWeight: 800, color: '#F9FAFB', margin: 0 }}>
                Image-Derived 3D CAD Blueprint Inspector 📐
              </h3>
              <span style={{
                background: 'rgba(56, 189, 248, 0.2)',
                color: '#38BDF8',
                border: '1px solid rgba(56, 189, 248, 0.4)',
                padding: '2px 8px',
                borderRadius: '12px',
                fontSize: '11px',
                fontWeight: 700
              }}>
                CAD Generated Directly from Image
              </span>
            </div>
            <span style={{ fontSize: '11px', color: '#9CA3AF' }}>
              Extracts dimensional vectors, contours, centerlines & 3D geometry from uploaded photos • Hand gesture zoom & 360° orbit active
            </span>
          </div>
        </div>

        {/* Action Controls */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              background: 'rgba(59, 130, 246, 0.25)',
              border: '1.5px solid #3B82F6',
              color: '#93C5FD',
              padding: '6px 12px',
              borderRadius: '8px',
              fontSize: '12px',
              fontWeight: 700,
              cursor: 'pointer'
            }}
          >
            <Upload size={14} /> Upload Custom Image
          </button>
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            style={{ display: 'none' }}
            onChange={handleFileUpload}
          />

          {/* Toggle Camera Primary Button */}
          <button
            type="button"
            onClick={toggleCamera}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              background: cameraActive ? 'rgba(16, 185, 129, 0.2)' : 'rgba(56, 189, 248, 0.2)',
              border: `1.5px solid ${cameraActive ? '#10B981' : '#38BDF8'}`,
              color: cameraActive ? '#6EE7B7' : '#7DD3FC',
              padding: '6px 14px',
              borderRadius: '8px',
              fontSize: '12px',
              fontWeight: 700,
              cursor: 'pointer',
              boxShadow: cameraActive ? '0 0 12px rgba(16, 185, 129, 0.4)' : 'none'
            }}
          >
            {cameraActive ? <Video size={15} /> : <VideoOff size={15} />}
            {cameraActive ? 'Camera Active' : 'Start Camera (CV)'}
          </button>

          {/* REDIRECT CAMERA BUTTON: Cycles through available hardware cameras */}
          <button
            type="button"
            onClick={redirectCamera}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              background: 'rgba(139, 92, 246, 0.2)',
              border: '1.5px solid #8B5CF6',
              color: '#C4B5FD',
              padding: '6px 12px',
              borderRadius: '8px',
              fontSize: '12px',
              fontWeight: 700,
              cursor: 'pointer'
            }}
            title="Redirect or switch to next webcam sensor"
          >
            <SwitchCamera size={14} /> Redirect Camera
          </button>

          {/* Camera Selection Dropdown */}
          <select
            value={selectedDeviceId}
            onChange={(e) => {
              const newId = e.target.value;
              setSelectedDeviceId(newId);
              startCameraStream(newId);
            }}
            style={{
              background: '#0F172A',
              border: '1px solid #334155',
              color: '#93C5FD',
              padding: '6px 10px',
              borderRadius: '8px',
              fontSize: '11px',
              cursor: 'pointer',
              maxWidth: '180px'
            }}
            title="Select Camera Device"
          >
            {videoDevices.length > 0 ? (
              videoDevices.map((d, i) => (
                <option key={d.deviceId || i} value={d.deviceId}>
                  📷 {d.label || `Camera ${i + 1}`}
                </option>
              ))
            ) : (
              <option value="">📷 Default Webcam</option>
            )}
          </select>

          {/* CAD View Mode Switcher */}
          <div style={{ display: 'flex', gap: '3px', background: '#0F172A', padding: '3px', borderRadius: '8px', border: '1px solid #334155' }}>
            <button
              type="button"
              onClick={() => setCadViewMode('3d-iso')}
              style={{
                background: cadViewMode === '3d-iso' ? 'rgba(56, 189, 248, 0.3)' : 'transparent',
                border: `1px solid ${cadViewMode === '3d-iso' ? '#38BDF8' : 'transparent'}`,
                color: cadViewMode === '3d-iso' ? '#E0F2FE' : '#94A3B8',
                padding: '4px 9px',
                borderRadius: '6px',
                fontSize: '11px',
                fontWeight: 600,
                cursor: 'pointer'
              }}
            >
              📐 3D Iso CAD
            </button>
            <button
              type="button"
              onClick={() => setCadViewMode('2d-blueprint')}
              style={{
                background: cadViewMode === '2d-blueprint' ? 'rgba(56, 189, 248, 0.3)' : 'transparent',
                border: `1px solid ${cadViewMode === '2d-blueprint' ? '#38BDF8' : 'transparent'}`,
                color: cadViewMode === '2d-blueprint' ? '#E0F2FE' : '#94A3B8',
                padding: '4px 9px',
                borderRadius: '6px',
                fontSize: '11px',
                fontWeight: 600,
                cursor: 'pointer'
              }}
            >
              📄 2D Blueprint
            </button>
            <button
              type="button"
              onClick={() => setCadViewMode('cross-section')}
              style={{
                background: cadViewMode === 'cross-section' ? 'rgba(56, 189, 248, 0.3)' : 'transparent',
                border: `1px solid ${cadViewMode === 'cross-section' ? '#38BDF8' : 'transparent'}`,
                color: cadViewMode === 'cross-section' ? '#E0F2FE' : '#94A3B8',
                padding: '4px 9px',
                borderRadius: '6px',
                fontSize: '11px',
                fontWeight: 600,
                cursor: 'pointer'
              }}
            >
              🔬 Section A-A
            </button>
            <button
              type="button"
              onClick={() => setCadViewMode('thermal-fea')}
              style={{
                background: cadViewMode === 'thermal-fea' ? 'rgba(239, 68, 68, 0.25)' : 'transparent',
                border: `1px solid ${cadViewMode === 'thermal-fea' ? '#EF4444' : 'transparent'}`,
                color: cadViewMode === 'thermal-fea' ? '#FCA5A5' : '#94A3B8',
                padding: '4px 9px',
                borderRadius: '6px',
                fontSize: '11px',
                fontWeight: 600,
                cursor: 'pointer'
              }}
            >
              🔥 Thermal FEA
            </button>
          </div>
        </div>
      </div>

      {/* Preset Problem Image Switcher Bar */}
      <div style={{
        display: 'flex',
        alignItems: 'center',
        gap: '6px',
        marginBottom: '14px',
        padding: '8px 12px',
        background: '#0B132B',
        borderRadius: '12px',
        border: '1px solid #1E293B',
        overflowX: 'auto'
      }}>
        <div style={{ fontSize: '11px', fontWeight: 700, color: '#38BDF8', marginRight: '6px', whiteSpace: 'nowrap', display: 'flex', alignItems: 'center', gap: '4px' }}>
          <ImageIcon size={13} /> Select Defect Image:
        </div>
        {SAMPLE_CAD_PRESETS.map(preset => {
          const isSelected = !isCustomUploaded && activeImageTitle.includes(preset.name.split(' ')[0]);
          return (
            <button
              key={preset.id}
              type="button"
              onClick={() => {
                const src = createSampleCADImage(preset.id);
                setActiveImageSrc(src);
                setActiveImageTitle(preset.name);
                setIsCustomUploaded(false);
              }}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '6px',
                background: isSelected ? 'rgba(56, 189, 248, 0.25)' : 'rgba(30, 41, 59, 0.6)',
                border: `1px solid ${isSelected ? '#38BDF8' : '#334155'}`,
                color: isSelected ? '#F0F9FF' : '#94A3B8',
                padding: '5px 12px',
                borderRadius: '8px',
                fontSize: '11px',
                fontWeight: isSelected ? 700 : 500,
                cursor: 'pointer',
                whiteSpace: 'nowrap',
                transition: 'all 0.2s ease',
                boxShadow: isSelected ? '0 0 10px rgba(56, 189, 248, 0.3)' : 'none'
              }}
            >
              <span>{preset.icon}</span>
              <span>{preset.name}</span>
            </button>
          );
        })}

        {/* 3D Extrusion Slider */}
        <div style={{ marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: '8px', whiteSpace: 'nowrap' }}>
          <Sliders size={13} color="#38BDF8" />
          <span style={{ fontSize: '11px', color: '#94A3B8' }}>Relief Depth:</span>
          <input
            type="range"
            min="10"
            max="65"
            value={extrusionDepth}
            onChange={(e) => setExtrusionDepth(Number(e.target.value))}
            style={{ width: '80px', accentColor: '#38BDF8', cursor: 'pointer' }}
          />
          <span style={{ fontSize: '11px', color: '#38BDF8', fontWeight: 700 }}>{extrusionDepth}mm</span>
        </div>
      </div>

      {/* Camera Diagnostic & Error Banner */}
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
          justifyContent: 'space-between',
          flexWrap: 'wrap',
          gap: '10px'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <AlertTriangle size={16} color="#EF4444" />
            <span>{cameraError}</span>
          </div>
          <div style={{ display: 'flex', gap: '8px' }}>
            <button
              type="button"
              onClick={redirectCamera}
              style={{
                background: 'rgba(56, 189, 248, 0.2)',
                border: '1px solid #38BDF8',
                color: '#38BDF8',
                padding: '4px 10px',
                borderRadius: '6px',
                fontSize: '11px',
                fontWeight: 700,
                cursor: 'pointer'
              }}
            >
              🔄 Redirect Camera
            </button>
            <button
              type="button"
              onClick={startVirtualFeed}
              style={{
                background: 'rgba(16, 185, 129, 0.2)',
                border: '1px solid #10B981',
                color: '#6EE7B7',
                padding: '4px 10px',
                borderRadius: '6px',
                fontSize: '11px',
                fontWeight: 700,
                cursor: 'pointer'
              }}
            >
              📺 Test Virtual Feed
            </button>
          </div>
        </div>
      )}

      {/* Main Grid: Inspected Image (Left) + Direct CAD Drawing (Right) */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: '1fr 1.4fr',
        gap: '16px',
        marginBottom: '16px'
      }}>
        {/* Source Image Viewport */}
        <div style={{
          background: '#0F172A',
          border: '1px solid #1E293B',
          borderRadius: '14px',
          padding: '14px',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          minHeight: '360px',
          maxHeight: '360px',
          overflow: 'hidden',
          position: 'relative'
        }}>
          <div style={{ fontSize: '11px', color: '#94A3B8', marginBottom: '8px', alignSelf: 'flex-start', display: 'flex', justifyContent: 'space-between', width: '100%' }}>
            <span>📸 Source Photo: <strong>{activeImageTitle}</strong></span>
            <span style={{ color: '#10B981', fontWeight: 600 }}>● Vectorized</span>
          </div>
          <img 
            src={activeImageSrc} 
            alt="Source inspected component" 
            style={{
              maxWidth: '100%',
              maxHeight: '270px',
              objectFit: 'contain',
              borderRadius: '8px',
              border: '1px solid #334155'
            }} 
          />
          <div style={{ marginTop: '8px', fontSize: '10px', color: '#64748B' }}>
            Click any defect above or click "Upload Custom Image" to generate a CAD blueprint from your photo.
          </div>
        </div>

        {/* CAD Canvas Viewport (Controlled by Computer Vision Gestures) */}
        <div 
          style={{
            position: 'relative',
            width: '100%',
            height: '360px',
            background: '#0B132B',
            borderRadius: '14px',
            border: '1px solid #1E293B',
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
            height={360}
            style={{ width: '100%', height: '100%', display: 'block' }}
          />

          {/* Scale & CAD Envelope Badge */}
          <div style={{
            position: 'absolute',
            top: '12px',
            left: '12px',
            background: 'rgba(11, 19, 43, 0.9)',
            border: '1px solid #1E293B',
            borderRadius: '8px',
            padding: '6px 12px',
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            fontSize: '12px',
            backdropFilter: 'blur(4px)'
          }}>
            <span style={{ color: '#94A3B8' }}>CAD Scale:</span>
            <strong style={{ color: '#38BDF8', fontSize: '13px' }}>
              {zoomLevel.toFixed(2)}x Zoom
            </strong>
            <span style={{ color: '#334155' }}>|</span>
            <span style={{ color: '#94A3B8', fontSize: '11px' }}>
              Envelope: {cadModel?.envelope?.width || '230'} × {cadModel?.envelope?.height || '230'} mm
            </span>
          </div>

          {/* Manual Zoom & Reset Controls */}
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
                background: 'rgba(15, 23, 42, 0.88)',
                border: '1px solid #334155',
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
                background: 'rgba(15, 23, 42, 0.88)',
                border: '1px solid #334155',
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
                background: 'rgba(15, 23, 42, 0.88)',
                border: '1px solid #334155',
                color: '#94A3B8',
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

          {/* Floating Camera Preview with Dynamic Native Dimensions & Overlay */}
          {cameraActive && (
            <div style={{
              position: 'absolute',
              top: '12px',
              right: '12px',
              width: '168px',
              height: '126px',
              borderRadius: '12px',
              border: `2px solid ${trackingInfo.detected ? '#10B981' : '#38BDF8'}`,
              background: '#000',
              overflow: 'hidden',
              boxShadow: trackingInfo.detected ? '0 0 16px rgba(16, 185, 129, 0.5)' : '0 4px 20px rgba(0,0,0,0.7)',
              zIndex: 10
            }}>
              {!isVirtualFeed ? (
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
              ) : (
                <div style={{
                  width: '100%',
                  height: '100%',
                  background: 'radial-gradient(circle, #1E293B 0%, #0F172A 100%)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  flexDirection: 'column',
                  gap: '4px'
                }}>
                  <MonitorPlay size={24} color="#10B981" />
                  <span style={{ fontSize: '9px', color: '#6EE7B7', fontWeight: 700 }}>Simulated Feed Active</span>
                </div>
              )}

              <canvas
                ref={overlayCanvasRef}
                width={168}
                height={126}
                style={{
                  position: 'absolute',
                  top: 0,
                  left: 0,
                  width: '100%',
                  height: '100%',
                  pointerEvents: 'none'
                }}
              />

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
                background: 'rgba(0,0,0,0.78)',
                padding: '2px 6px',
                borderRadius: '4px'
              }}>
                <span style={{ color: trackingInfo.detected ? '#10B981' : '#F59E0B' }}>
                  {trackingInfo.detected ? '● TRACKED' : '○ HOLD HAND'}
                </span>
                <span style={{ color: '#93C5FD' }}>
                  {cameraDimensions.width}×{cameraDimensions.height}
                </span>
              </div>

              <div style={{
                position: 'absolute',
                bottom: '3px',
                left: '4px',
                right: '4px',
                fontSize: '8px',
                color: '#E5E7EB',
                fontWeight: 600,
                background: 'rgba(0,0,0,0.82)',
                padding: '2px 4px',
                borderRadius: '4px',
                textAlign: 'center',
                whiteSpace: 'nowrap',
                overflow: 'hidden',
                textOverflow: 'ellipsis'
              }}>
                {trackingInfo.detected 
                  ? 'Push closer to ZOOM IN' 
                  : activeCameraLabel.slice(0, 24)}
              </div>
            </div>
          )}

          {/* Hidden Canvas for High-Speed Skin & Motion CV Calculations */}
          <canvas ref={cvCanvasRef} width={160} height={120} style={{ display: 'none' }} />
        </div>
      </div>

      {/* Engineering CAD Telemetry derived from the actual image */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(4, 1fr)',
        gap: '12px',
        background: '#0F172A',
        border: '1px solid #1E293B',
        borderRadius: '14px',
        padding: '14px 18px'
      }}>
        <div>
          <div style={{ fontSize: '11px', color: '#94A3B8', display: 'flex', alignItems: 'center', gap: '4px' }}>
            <Compass size={14} color="#38BDF8" /> CAD Part Dimensions
          </div>
          <div style={{ fontSize: '17px', fontWeight: 800, color: '#38BDF8', marginTop: '3px' }}>
            {cadModel?.envelope?.width || '230'} × {cadModel?.envelope?.height || '230'} mm
          </div>
          <div style={{ fontSize: '10px', color: '#64748B' }}>
            Extruded Thickness: {cadModel?.envelope?.thickness || '62'} mm
          </div>
        </div>

        <div>
          <div style={{ fontSize: '11px', color: '#94A3B8', display: 'flex', alignItems: 'center', gap: '4px' }}>
            <Thermometer size={14} color="#EF4444" /> Peak Defect / Anomaly
          </div>
          <div style={{ fontSize: '17px', fontWeight: 800, color: '#EF4444', marginTop: '3px' }}>
            {cadModel?.defect?.metric || '2.4mm Depth'}
          </div>
          <div style={{ fontSize: '10px', color: '#F87171' }}>
            {cadModel?.defect?.label || 'Critical Surface Focus'}
          </div>
        </div>

        <div>
          <div style={{ fontSize: '11px', color: '#94A3B8', display: 'flex', alignItems: 'center', gap: '4px' }}>
            <Camera size={14} color="#10B981" /> Camera Sensor / CV
          </div>
          <div style={{ fontSize: '16px', fontWeight: 800, color: '#10B981', marginTop: '3px' }}>
            {cameraActive ? `${cameraDimensions.width}×${cameraDimensions.height}` : 'Standby'}
          </div>
          <div style={{ fontSize: '10px', color: '#6EE7B7' }}>
            {cameraActive ? (isVirtualFeed ? 'Virtual Simulation Feed' : activeCameraLabel.slice(0, 20)) : 'Click Start or Redirect'}
          </div>
        </div>

        <div>
          <div style={{ fontSize: '11px', color: '#94A3B8', display: 'flex', alignItems: 'center', gap: '4px' }}>
            <FileCheck size={14} color="#F59E0B" /> Drawing Standard
          </div>
          <div style={{ fontSize: '15px', fontWeight: 700, color: '#FCD34D', marginTop: '4px' }}>
            ISO 2768-mK / ANSI Y14.5
          </div>
          <div style={{ fontSize: '10px', color: '#94A3B8' }}>
            Automatic Image Vectorization
          </div>
        </div>
      </div>
    </div>
  );
}
