import React, { useRef, useEffect, useState, useCallback } from 'react';
import { 
  Camera, CameraOff, Video, VideoOff, ZoomIn, ZoomOut, RotateCw, 
  Flame, Shield, Eye, RefreshCw, Maximize2, Zap, Thermometer, Layers, AlertTriangle
} from 'lucide-react';

export default function CVModelInspector({ 
  problemImage = null,
  problemImageName = '',
  initialZoom = 1.0,
  onInspectPart = null
}) {
  const canvasRef = useRef(null);
  const videoRef = useRef(null);
  const cvCanvasRef = useRef(null);
  const prevFrameRef = useRef(null);

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
  const [trackingInfo, setTrackingInfo] = useState({
    detected: false,
    handX: 0.5,
    handY: 0.5,
    handAreaRatio: 0.05, // area of bounding box relative to frame
    zoomDelta: 0,
    fps: 0
  });

  // Smoothing refs for buttery smooth motion & zoom
  const targetAngleRef = useRef({ x: 0.35, y: -0.6 });
  const targetZoomRef = useRef(initialZoom);
  const baseAreaRef = useRef(null); // baseline hand area when first detected

  // Enumerate video devices
  const updateDeviceList = useCallback(async () => {
    if (navigator.mediaDevices && navigator.mediaDevices.enumerateDevices) {
      try {
        const devices = await navigator.mediaDevices.enumerateDevices();
        const cams = devices.filter(d => d.kind === 'videoinput');
        setVideoDevices(cams);
        if (cams.length > 0 && !selectedDeviceId) {
          // Look for front/user/integrated camera
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

    // Try front-facing camera constraints in priority order
    const constraintsAttempts = [
      // 1. Explicit user facingMode (Front Camera)
      { 
        video: { 
          facingMode: { ideal: 'user' },
          width: { ideal: 640 }, 
          height: { ideal: 480 } 
        } 
      },
      // 2. Specific device ID if chosen
      deviceId ? { video: { deviceId: { ideal: deviceId } } } : null,
      // 3. Fallback standard video
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
      setTrackingInfo(prev => ({ ...prev, detected: false }));
      baseAreaRef.current = null;
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
      setIsAutoRotating(false); // Let hand gesture drive rotation
      baseAreaRef.current = null;
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

  // Computer Vision Processing Loop (Centroid + Size/Distance for Zoom)
  useEffect(() => {
    if (!cameraActive) return;

    let animId;
    let lastTime = performance.now();
    let frameCount = 0;

    const processCVFrame = () => {
      const video = videoRef.current;
      const cvCanvas = cvCanvasRef.current;

      if (video && video.readyState >= 2 && cvCanvas) {
        const ctx = cvCanvas.getContext('2d');
        const w = cvCanvas.width;
        const h = cvCanvas.height;

        ctx.drawImage(video, 0, 0, w, h);
        const currentFrame = ctx.getImageData(0, 0, w, h);

        if (prevFrameRef.current) {
          const prev = prevFrameRef.current.data;
          const curr = currentFrame.data;

          let minX = w, maxX = 0, minY = h, maxY = 0;
          let motionPixels = 0;
          let sumX = 0, sumY = 0;

          // Motion + Skin threshold check
          for (let y = 0; y < h; y += 3) {
            for (let x = 0; x < w; x += 3) {
              const idx = (y * w + x) * 4;
              const r = curr[idx];
              const g = curr[idx + 1];
              const b = curr[idx + 2];

              // Motion delta
              const diff = Math.abs(r - prev[idx]) + Math.abs(g - prev[idx + 1]) + Math.abs(b - prev[idx + 2]);

              // Skin color heuristic in RGB (r > 60, r > g, r > b)
              const isSkin = (r > 60 && g > 40 && b > 20 && r > g && (r - g) > 12 && (r - b) > 12);

              if (diff > 45 || (diff > 25 && isSkin)) {
                // Mirror X for intuitive natural mirror interaction
                const mirroredX = w - x;
                sumX += mirroredX;
                sumY += y;
                motionPixels++;

                if (mirroredX < minX) minX = mirroredX;
                if (mirroredX > maxX) maxX = mirroredX;
                if (y < minY) minY = y;
                if (y > maxY) maxY = y;
              }
            }
          }

          const hasHand = motionPixels > 35 && maxX > minX && maxY > minY;

          if (hasHand) {
            const centroidX = (sumX / motionPixels) / w;
            const centroidY = (sumY / motionPixels) / h;
            const boxWidth = (maxX - minX) / w;
            const boxHeight = (maxY - minY) / h;
            const handArea = boxWidth * boxHeight;

            // Set initial baseline area if not set
            if (!baseAreaRef.current) {
              baseAreaRef.current = handArea;
            }

            // Calculate Zoom factor based on Hand Area (Hand Closer to Camera = Larger Area = Zoom In)
            // Area ratio relative to baseline:
            const areaRatio = handArea / Math.max(0.01, baseAreaRef.current);
            // Smooth zoom target: closer hand (> 1.2 ratio) zooms in, farther hand (< 0.8 ratio) zooms out
            const computedZoom = Math.max(0.5, Math.min(2.8, 1.0 * Math.sqrt(areaRatio * 1.4)));
            targetZoomRef.current = computedZoom;

            // Hand X, Y controls rotation & pitch tilt
            const rotDeltaX = (centroidX - 0.5) * 1.8;
            const rotDeltaY = (centroidY - 0.5) * 1.2;
            targetAngleRef.current = {
              x: Math.max(-1.1, Math.min(1.1, rotDeltaY)),
              y: rotDeltaX * Math.PI
            };

            setTrackingInfo({
              detected: true,
              handX: centroidX,
              handY: centroidY,
              handAreaRatio: handArea,
              zoomDelta: computedZoom,
              fps: Math.round(1000 / Math.max(1, performance.now() - lastTime))
            });
          } else {
            setTrackingInfo(prev => ({ ...prev, detected: false }));
          }
        }

        prevFrameRef.current = currentFrame;
        lastTime = performance.now();
        frameCount++;
      }

      animId = requestAnimationFrame(processCVFrame);
    };

    animId = requestAnimationFrame(processCVFrame);
    return () => cancelAnimationFrame(animId);
  }, [cameraActive]);

  // Smooth Interpolation (Lerp) for 3D model rotation and Zoom
  useEffect(() => {
    let animId;
    const smoothStep = () => {
      // Smoothly interpolate zoom towards targetZoomRef
      setZoomLevel(prevZoom => {
        const diff = targetZoomRef.current - prevZoom;
        if (Math.abs(diff) < 0.005) return targetZoomRef.current;
        return prevZoom + diff * 0.12;
      });

      // Smoothly interpolate rotation towards targetAngleRef (or auto-rotate if inactive)
      setRotationAngle(prevAngle => {
        if (cameraActive && trackingInfo.detected) {
          const diffX = targetAngleRef.current.x - prevAngle.x;
          const diffY = targetAngleRef.current.y - prevAngle.y;
          return {
            x: prevAngle.x + diffX * 0.1,
            y: prevAngle.y + diffY * 0.1
          };
        } else if (isAutoRotating && !isDragging) {
          return {
            x: prevAngle.x,
            y: prevAngle.y + 0.01
          };
        }
        return prevAngle;
      });

      animId = requestAnimationFrame(smoothStep);
    };

    animId = requestAnimationFrame(smoothStep);
    return () => cancelAnimationFrame(animId);
  }, [cameraActive, trackingInfo.detected, isAutoRotating, isDragging]);

  // 3D Canvas Rendering Engine (with dynamic Zoom & Stress Thermography)
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

      // Camera & Zoom parameters (FOV and Scale influenced by zoomLevel)
      const baseFov = 380;
      const cameraZ = 320;
      const currentScaleFactor = zoomLevel; // Hand CV Zoom Level

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

      // Background telemetry grid
      ctx.strokeStyle = 'rgba(55, 65, 81, 0.25)';
      ctx.lineWidth = 1;
      const gridSize = 140;
      for (let g = -gridSize; g <= gridSize; g += 35) {
        const p1 = project(g, 90, -gridSize);
        const p2 = project(g, 90, gridSize);
        ctx.beginPath();
        ctx.moveTo(p1.px, p1.py);
        ctx.lineTo(p2.px, p2.py);
        ctx.stroke();

        const p3 = project(-gridSize, 90, g);
        const p4 = project(gridSize, 90, g);
        ctx.beginPath();
        ctx.moveTo(p3.px, p3.py);
        ctx.lineTo(p4.px, p4.py);
        ctx.stroke();
      }

      const elements = [];
      const numBlades = 12;
      const bladeR = 75;
      const hubR = 30;

      // Shaft Rings
      const shaftZ = [-110, -70, -30, 0, 30, 70, 110];
      shaftZ.forEach(sz => {
        const ringPoints = [];
        const r = (sz === 0) ? hubR : 16;
        for (let a = 0; a < Math.PI * 2; a += Math.PI / 8) {
          const rx = Math.cos(a) * r;
          const ry = Math.sin(a) * r;
          ringPoints.push(project(rx, ry, sz));
        }
        elements.push({
          type: 'ring',
          points: ringPoints,
          z: sz,
          color: viewMode === 'thermal' ? '#8B5CF6' : '#60A5FA'
        });
      });

      // Longitudinal Lines
      for (let a = 0; a < Math.PI * 2; a += Math.PI / 4) {
        const rx = Math.cos(a) * 16;
        const ry = Math.sin(a) * 16;
        elements.push({
          type: 'line',
          p1: project(rx, ry, -110),
          p2: project(rx, ry, 110),
          z: 0,
          color: viewMode === 'thermal' ? 'rgba(139, 92, 246, 0.4)' : 'rgba(96, 165, 250, 0.4)'
        });
      }

      // 12 Blades with Thermal & FEA stress shaders
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
          type: 'blade',
          polygon: [pRootFront, pTipFront, pTipBack, pRootBack],
          z: avgZ,
          index: i
        });
      }

      // Sort elements back-to-front
      elements.sort((a, b) => b.z - a.z);

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
          ctx.lineWidth = 1;
          ctx.moveTo(el.p1.px, el.p1.py);
          ctx.lineTo(el.p2.px, el.p2.py);
          ctx.stroke();
        } else if (el.type === 'blade') {
          ctx.beginPath();
          el.polygon.forEach((pt, idx) => {
            if (idx === 0) ctx.moveTo(pt.px, pt.py);
            else ctx.lineTo(pt.px, pt.py);
          });
          ctx.closePath();

          if (viewMode === 'thermal') {
            const isHighHeat = el.index % 4 === 0;
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

      // Hotspot Annotations
      const hot1 = project(bladeR * 0.85, 0, 0);
      ctx.beginPath();
      ctx.arc(hot1.px, hot1.py, 8 * currentScaleFactor, 0, Math.PI * 2);
      ctx.fillStyle = '#EF4444';
      ctx.fill();
      ctx.strokeStyle = 'rgba(239, 68, 68, 0.4)';
      ctx.lineWidth = 3;
      ctx.stroke();

      ctx.fillStyle = '#F9FAFB';
      ctx.font = `bold ${Math.max(9, Math.round(11 * currentScaleFactor))}px sans-serif`;
      ctx.fillText(`🔥 88.5°C Hotspot`, hot1.px + 14, hot1.py + 4);

      animId = requestAnimationFrame(render3D);
    };

    animId = requestAnimationFrame(render3D);
    return () => cancelAnimationFrame(animId);
  }, [rotationAngle, zoomLevel, viewMode]);

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
  };

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
      {/* Top Controls Bar */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px', flexWrap: 'wrap', gap: '10px' }}>
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
            <h3 style={{ fontSize: '17px', fontWeight: 800, color: '#F9FAFB' }}>
              3D Digital Twin • Computer Vision Gesture Inspector 🖐️
            </h3>
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
            {cameraActive ? 'Front Camera: Active' : 'Start Front Camera (CV)'}
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

      {/* Main Stage Grid: Problem Image (if provided) + 3D Canvas */}
      <div style={{
        display: problemImage ? 'grid' : 'block',
        gridTemplateColumns: problemImage ? '1fr 1.3fr' : '1fr',
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
            maxHeight: '320px',
            overflow: 'hidden'
          }}>
            <div style={{ fontSize: '11px', color: '#9CA3AF', marginBottom: '8px', alignSelf: 'flex-start' }}>
              📸 Inspected Problem Source: <strong>{problemImageName || 'Component'}</strong>
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
            height: '320px',
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
            height={320}
            style={{ width: '100%', height: '100%', display: 'block' }}
          />

          {/* Live Zoom Level Indicator Badge */}
          <div style={{
            position: 'absolute',
            top: '12px',
            left: '12px',
            background: 'rgba(17, 24, 39, 0.85)',
            border: '1px solid #374151',
            borderRadius: '8px',
            padding: '6px 12px',
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            fontSize: '12px'
          }}>
            <span style={{ color: '#9CA3AF' }}>Scale:</span>
            <strong style={{ color: '#10B981', fontSize: '14px' }}>
              {zoomLevel.toFixed(2)}x Zoom
            </strong>
          </div>

          {/* Quick Manual Zoom Controls (Always available alongside CV) */}
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

          {/* Floating Live Front-Camera Feed with CV Tracking Overlay */}
          {cameraActive && (
            <div style={{
              position: 'absolute',
              top: '12px',
              right: '12px',
              width: '140px',
              height: '105px',
              borderRadius: '10px',
              border: '2px solid #8B5CF6',
              background: '#000',
              overflow: 'hidden',
              boxShadow: '0 4px 20px rgba(0,0,0,0.7)',
              zIndex: 10
            }}>
              <video
                ref={videoRef}
                autoPlay
                playsInline
                muted
                style={{ width: '100%', height: '100%', objectFit: 'cover', transform: 'scaleX(-1)' }}
              />

              {/* CV Tracking Reticle Overlay on Video Feed */}
              {trackingInfo.detected && (
                <div style={{
                  position: 'absolute',
                  left: `${trackingInfo.handX * 100}%`,
                  top: `${trackingInfo.handY * 100}%`,
                  width: '28px',
                  height: '28px',
                  transform: 'translate(-50%, -50%)',
                  border: '2px solid #10B981',
                  borderRadius: '50%',
                  pointerEvents: 'none',
                  boxShadow: '0 0 8px #10B981'
                }} />
              )}

              <div style={{
                position: 'absolute',
                bottom: '2px',
                left: '4px',
                fontSize: '8px',
                color: trackingInfo.detected ? '#10B981' : '#F59E0B',
                fontWeight: 800,
                background: 'rgba(0,0,0,0.7)',
                padding: '1px 4px',
                borderRadius: '4px'
              }}>
                {trackingInfo.detected ? '● HAND TRACKED' : '○ WAVE HAND'}
              </div>
            </div>
          )}

          {/* Hidden Canvas for Processing Computer Vision Frame Diff */}
          <canvas ref={cvCanvasRef} width={160} height={120} style={{ display: 'none' }} />
        </div>
      </div>

      {/* Real-Time Telemetry & Status Readouts */}
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
            <Thermometer size={14} color="#EF4444" /> Peak Hotspot Temp
          </div>
          <div style={{ fontSize: '20px', fontWeight: 800, color: '#EF4444', marginTop: '3px' }}>
            88.5°C
          </div>
          <div style={{ fontSize: '10px', color: '#F87171' }}>
            Threshold: 75.0°C (Alert)
          </div>
        </div>

        <div>
          <div style={{ fontSize: '11px', color: '#9CA3AF', display: 'flex', alignItems: 'center', gap: '4px' }}>
            <Zap size={14} color="#F59E0B" /> Operating Harmonics
          </div>
          <div style={{ fontSize: '20px', fontWeight: 800, color: '#FCD34D', marginTop: '3px' }}>
            30.0 Hz (1X)
          </div>
          <div style={{ fontSize: '10px', color: '#9CA3AF' }}>
            Shaft Speed: 1,800 RPM
          </div>
        </div>

        <div>
          <div style={{ fontSize: '11px', color: '#9CA3AF', display: 'flex', alignItems: 'center', gap: '4px' }}>
            <ZoomIn size={14} color="#38BDF8" /> CV Zoom State
          </div>
          <div style={{ fontSize: '20px', fontWeight: 800, color: '#38BDF8', marginTop: '3px' }}>
            {zoomLevel.toFixed(2)}x
          </div>
          <div style={{ fontSize: '10px', color: '#9CA3AF' }}>
            {cameraActive ? (trackingInfo.detected ? 'Push hand closer to zoom' : 'Awaiting hand movement') : 'Manual zoom ready'}
          </div>
        </div>

        <div>
          <div style={{ fontSize: '11px', color: '#9CA3AF', display: 'flex', alignItems: 'center', gap: '4px' }}>
            <Shield size={14} color="#10B981" /> Condition Rating
          </div>
          <div style={{ fontSize: '15px', fontWeight: 700, color: '#10B981', marginTop: '4px' }}>
            ISO 10816 Zone B
          </div>
          <div style={{ fontSize: '10px', color: '#9CA3AF' }}>
            Unrestricted Continuous Run
          </div>
        </div>
      </div>
    </div>
  );
}
