import React, { useRef, useEffect, useState } from 'react';
import { 
  Camera, CameraOff, Video, VideoOff, Crosshair, Flame, Shield, 
  RotateCw, Award, Volume2, VolumeX, RefreshCw, Zap, Trophy, Play, CheckCircle
} from 'lucide-react';

export default function HoloInspectGame({ onClose }) {
  const canvasRef = useRef(null);
  const videoRef = useRef(null);
  const cvCanvasRef = useRef(null);
  const prevFrameRef = useRef(null);

  // CV & Gesture States
  const [cameraActive, setCameraActive] = useState(false);
  const [cameraError, setCameraError] = useState(null);
  const [videoDevices, setVideoDevices] = useState([]);
  const [selectedDeviceId, setSelectedDeviceId] = useState('');
  const [motionCoord, setMotionCoord] = useState({ x: 0.5, y: 0.5 });
  const [gestureStatus, setGestureStatus] = useState('Standby');

  // Game States
  const [gameStarted, setGameStarted] = useState(false);
  const [score, setScore] = useState(0);
  const [timeLeft, setTimeLeft] = useState(45);
  const [gameOver, setGameOver] = useState(false);
  const [victory, setVictory] = useState(false);
  const [soundEnabled, setSoundEnabled] = useState(true);

  // 3D Model Angles
  const [rotationAngle, setRotationAngle] = useState({ x: 0.35, y: -0.6 });
  const [targetLockProgress, setTargetLockProgress] = useState(0);
  const [activeLockTarget, setActiveLockTarget] = useState(null);

  // Hotspot targets on the 3D turbine
  const [hotspots, setHotspots] = useState([
    { id: 1, bladeIdx: 2, name: 'Blade #2 - Cavitation Friction', temp: 98, maxTemp: 115, cooled: false },
    { id: 2, bladeIdx: 5, name: 'Blade #5 - Boundary Layer Stall', temp: 104, maxTemp: 120, cooled: false },
    { id: 3, bladeIdx: 8, name: 'NDE Bearing Race - Oil Starvation', temp: 112, maxTemp: 125, cooled: false },
    { id: 4, bladeIdx: 11, name: 'Blade #11 - Tip Rubbing Casing', temp: 108, maxTemp: 118, cooled: false }
  ]);

  // Audio Synthesizer for feedback
  const playBeep = (freq = 440, type = 'sine', duration = 0.15) => {
    if (!soundEnabled) return;
    try {
      const audioCtx = new (window.AudioContext || window.webkitAudioContext)();
      const osc = audioCtx.createOscillator();
      const gain = audioCtx.createGain();
      osc.type = type;
      osc.frequency.setValueAtTime(freq, audioCtx.currentTime);
      gain.gain.setValueAtTime(0.1, audioCtx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.01, audioCtx.currentTime + duration);
      osc.connect(gain);
      gain.connect(audioCtx.destination);
      osc.start();
      osc.stop(audioCtx.currentTime + duration);
    } catch (e) {
      // AudioContext policy
    }
  };

  // Enumerate video devices on mount
  useEffect(() => {
    if (navigator.mediaDevices && navigator.mediaDevices.enumerateDevices) {
      navigator.mediaDevices.enumerateDevices().then(devices => {
        const cams = devices.filter(d => d.kind === 'videoinput');
        setVideoDevices(cams);
      }).catch(err => console.warn("Enumerate devices error:", err));
    }
  }, []);

  const startStream = async (requestedDeviceId = null) => {
    if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
      if (typeof window !== 'undefined' && !window.isSecureContext) {
        throw new Error("Webcam requires a Secure Context. Please open http://localhost:5173/ instead of IP address.");
      }
      throw new Error("Browser does not support navigator.mediaDevices.getUserMedia.");
    }

    // When requestedDeviceId is specified, try it first, otherwise prefer direct default camera
    const attempts = requestedDeviceId 
      ? [
          { video: { deviceId: { ideal: requestedDeviceId } } },
          { video: { deviceId: requestedDeviceId } },
          { video: true }
        ]
      : [
          { video: true }, // Universal default: browser automatically picks primary user-facing webcam
          { video: { facingMode: 'user' } },
          { video: { width: { ideal: 640 }, height: { ideal: 480 } } }
        ];

    let lastErr = null;
    for (const c of attempts) {
      try {
        const stream = await navigator.mediaDevices.getUserMedia(c);
        if (stream && stream.getVideoTracks().length > 0) {
          return stream;
        }
      } catch (err) {
        lastErr = err;
      }
    }

    throw lastErr || new Error("Unable to capture video stream from any camera.");
  };

  // Start / Stop Webcam Stream
  const toggleCamera = async () => {
    if (cameraActive) {
      if (videoRef.current && videoRef.current.srcObject) {
        videoRef.current.srcObject.getTracks().forEach(track => track.stop());
        videoRef.current.srcObject = null;
      }
      setCameraActive(false);
      setGestureStatus('Standby');
      return;
    }

    try {
      setCameraError(null);
      const stream = await startStream(selectedDeviceId || null);
      
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        videoRef.current.muted = true;
        videoRef.current.playsInline = true;
        await videoRef.current.play().catch(e => console.warn("Video play error:", e));
      }

      setCameraActive(true);
      setGestureStatus('Tracking Motion');
      playBeep(880, 'triangle', 0.2);

      // Re-enumerate to capture proper device names after permission grant
      if (navigator.mediaDevices.enumerateDevices) {
        const devices = await navigator.mediaDevices.enumerateDevices();
        const cams = devices.filter(d => d.kind === 'videoinput');
        setVideoDevices(cams);
        const activeTrack = stream.getVideoTracks()[0];
        if (activeTrack && activeTrack.getSettings) {
          const settings = activeTrack.getSettings();
          if (settings.deviceId) {
            setSelectedDeviceId(settings.deviceId);
          }
        }
      }
    } catch (err) {
      console.error("Camera access error:", err);
      const errDetail = `${err.name || 'Error'}: ${err.message || 'Unknown reason'}`;
      let guidance = "";
      if (err.name === 'NotAllowedError' || err.name === 'PermissionDeniedError') {
        guidance = "Permission Denied: Click the lock/camera icon in your browser URL bar and set Camera to 'Allow'. Also ensure Windows Settings > Privacy & security > Camera is ON.";
      } else if (err.name === 'NotFoundError' || err.name === 'DevicesNotFoundError') {
        guidance = "No Camera Detected: Make sure your webcam is enabled in Windows Device Manager and Windows Settings > Privacy & security > Camera.";
      } else if (err.name === 'NotReadableError' || err.name === 'TrackStartError') {
        guidance = "Camera In Use: Another application (Zoom, Teams, Skype, or another tab) is currently using the camera. Please close other camera apps and retry.";
      } else {
        guidance = err.message || "Failed to initialize camera.";
      }
      setCameraError(`${errDetail} — ${guidance}`);
      setCameraActive(false);
    }
  };

  // Computer Vision Motion Tracker Loop
  useEffect(() => {
    if (!cameraActive) return;

    let animId;
    const processFrame = () => {
      const video = videoRef.current;
      const cvCanvas = cvCanvasRef.current;
      if (video && video.readyState >= 2 && cvCanvas) {
        const ctx = cvCanvas.getContext('2d');
        const w = cvCanvas.width;
        const h = cvCanvas.height;

        ctx.drawImage(video, 0, 0, w, h);
        const currentFrame = ctx.getImageData(0, 0, w, h);

        if (prevFrameRef.current) {
          const prevData = prevFrameRef.current.data;
          const currData = currentFrame.data;
          let motionX = 0;
          let motionY = 0;
          let motionPixels = 0;

          // Downsampled difference detection
          for (let y = 0; y < h; y += 4) {
            for (let x = 0; x < w; x += 4) {
              const idx = (y * w + x) * 4;
              const diff = Math.abs(currData[idx] - prevData[idx]) +
                           Math.abs(currData[idx + 1] - prevData[idx + 1]) +
                           Math.abs(currData[idx + 2] - prevData[idx + 2]);

              if (diff > 65) {
                // Mirror horizontally for natural webcam interaction
                motionX += (w - x);
                motionY += y;
                motionPixels++;
              }
            }
          }

          if (motionPixels > 40) {
            const avgX = (motionX / motionPixels) / w;
            const avgY = (motionY / motionPixels) / h;

            setMotionCoord({ x: avgX, y: avgY });

            // Rotate 3D model based on hand movement delta from center
            const deltaX = (avgX - 0.5) * 0.055;
            const deltaY = (avgY - 0.5) * 0.04;

            setRotationAngle(prev => ({
              x: Math.max(-1.1, Math.min(1.1, prev.x + deltaY)),
              y: prev.y + deltaX
            }));

            setGestureStatus(`Hand at (${Math.round(avgX * 100)}%, ${Math.round(avgY * 100)}%)`);
          }
        }

        prevFrameRef.current = currentFrame;
      }

      animId = requestAnimationFrame(processFrame);
    };

    animId = requestAnimationFrame(processFrame);
    return () => cancelAnimationFrame(animId);
  }, [cameraActive]);

  // Game Timer & Hotspot temperature ramp
  useEffect(() => {
    if (!gameStarted || gameOver) return;

    const timer = setInterval(() => {
      setTimeLeft(t => {
        if (t <= 1) {
          setGameOver(true);
          setVictory(false);
          playBeep(220, 'sawtooth', 0.4);
          return 0;
        }
        return t - 1;
      });

      // Slowly heat uncooled hotspots
      setHotspots(prev => prev.map(h => {
        if (h.cooled) return h;
        const newTemp = Math.min(h.maxTemp, h.temp + 0.6);
        return { ...h, temp: Math.round(newTemp * 10) / 10 };
      }));
    }, 1000);

    return () => clearInterval(timer);
  }, [gameStarted, gameOver]);

  // Target Lock Cooling Ray Mechanic
  useEffect(() => {
    if (!gameStarted || gameOver || !activeLockTarget) return;

    const lockInterval = setInterval(() => {
      setTargetLockProgress(prog => {
        if (prog >= 100) {
          // Hotspot cooled successfully!
          setHotspots(prev => prev.map(h => 
            h.id === activeLockTarget.id ? { ...h, cooled: true, temp: 48.0 } : h
          ));
          setScore(s => s + 250 + timeLeft * 5);
          playBeep(660, 'sine', 0.25);
          setTimeout(() => playBeep(880, 'sine', 0.2), 150);

          // Check if all cooled
          const remaining = hotspots.filter(h => h.id !== activeLockTarget.id && !h.cooled);
          if (remaining.length === 0) {
            setVictory(true);
            setGameOver(true);
            playBeep(1046, 'triangle', 0.5);
          }

          setActiveLockTarget(null);
          return 0;
        }
        playBeep(400 + prog * 4, 'sine', 0.05);
        return prog + 20;
      });
    }, 150);

    return () => clearInterval(lockInterval);
  }, [gameStarted, gameOver, activeLockTarget, timeLeft, hotspots]);

  // 3D Rendering of Turbine + Hotspot Reticles
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    let animId;
    let autoY = rotationAngle.y;

    const render = () => {
      autoY += 0.008; // slow drift
      const effectiveY = rotationAngle.y;
      const effectiveX = rotationAngle.x;

      const width = canvas.width;
      const height = canvas.height;
      const cx = width / 2;
      const cy = height / 2;

      ctx.clearRect(0, 0, width, height);

      const fov = 380;
      const cameraZ = 320;

      const project = (x, y, z) => {
        const cosX = Math.cos(effectiveX);
        const sinX = Math.sin(effectiveX);
        const y1 = y * cosX - z * sinX;
        const z1 = y * sinX + z * cosX;

        const cosY = Math.cos(effectiveY);
        const sinY = Math.sin(effectiveY);
        const x2 = x * cosY + z1 * sinY;
        const z2 = -x * sinY + z1 * cosY;

        const distance = cameraZ + z2;
        const scale = fov / Math.max(10, distance);
        return { px: cx + x2 * scale, py: cy + y1 * scale, zDepth: z2 };
      };

      // Background Hologram Grid
      ctx.strokeStyle = 'rgba(55, 65, 81, 0.25)';
      ctx.lineWidth = 1;
      for (let g = -140; g <= 140; g += 35) {
        const p1 = project(g, 90, -140);
        const p2 = project(g, 90, 140);
        ctx.beginPath();
        ctx.moveTo(p1.px, p1.py);
        ctx.lineTo(p2.px, p2.py);
        ctx.stroke();
      }

      // 12 Blades
      const numBlades = 12;
      const bladeR = 80;
      const hubR = 32;

      for (let i = 0; i < numBlades; i++) {
        const theta = (i * Math.PI * 2) / numBlades;
        const rX = Math.cos(theta) * hubR;
        const rY = Math.sin(theta) * hubR;
        const tX = Math.cos(theta + 0.35) * bladeR;
        const tY = Math.sin(theta + 0.35) * bladeR;

        const p1 = project(rX, rY, -10);
        const p2 = project(tX, tY, -2);
        const p3 = project(tX, tY, 18);
        const p4 = project(rX, rY, 10);

        // Check if blade has active hotspot
        const activeHot = hotspots.find(h => h.bladeIdx === i);

        ctx.beginPath();
        ctx.moveTo(p1.px, p1.py);
        ctx.lineTo(p2.px, p2.py);
        ctx.lineTo(p3.px, p3.py);
        ctx.lineTo(p4.px, p4.py);
        ctx.closePath();

        if (activeHot && !activeHot.cooled) {
          ctx.fillStyle = 'rgba(239, 68, 68, 0.7)';
          ctx.strokeStyle = '#FCA5A5';
        } else if (activeHot && activeHot.cooled) {
          ctx.fillStyle = 'rgba(16, 185, 129, 0.6)';
          ctx.strokeStyle = '#6EE7B7';
        } else {
          ctx.fillStyle = 'rgba(75, 85, 99, 0.45)';
          ctx.strokeStyle = '#8B5CF6';
        }
        ctx.fill();
        ctx.stroke();

        // If blade is an uncooled hotspot, draw targeting lock ring
        if (activeHot && !activeHot.cooled) {
          const midX = (p2.px + p3.px) / 2;
          const midY = (p2.py + p3.py) / 2;

          ctx.beginPath();
          ctx.arc(midX, midY, 18, 0, Math.PI * 2);
          ctx.strokeStyle = '#EF4444';
          ctx.lineWidth = 2;
          ctx.stroke();

          ctx.fillStyle = '#EF4444';
          ctx.font = 'bold 11px sans-serif';
          ctx.fillText(`🚨 ${activeHot.temp}°C`, midX + 22, midY + 4);

          // Check if crosshair is near this hotspot
          const crossX = motionCoord.x * width;
          const crossY = motionCoord.y * height;
          const dist = Math.hypot(crossX - midX, crossY - midY);

          if (dist < 45 && !activeLockTarget) {
            setActiveLockTarget(activeHot);
          }
        }
      }

      // Draw Holographic Crosshair tracking the hand/mouse
      const hx = motionCoord.x * width;
      const hy = motionCoord.y * height;

      ctx.strokeStyle = activeLockTarget ? '#38BDF8' : '#A78BFA';
      ctx.lineWidth = 2;

      // Outer targeting brackets
      ctx.strokeRect(hx - 18, hy - 18, 36, 36);

      // Center crosshair
      ctx.beginPath();
      ctx.moveTo(hx - 24, hy);
      ctx.lineTo(hx + 24, hy);
      ctx.moveTo(hx, hy - 24);
      ctx.lineTo(hx, hy + 24);
      ctx.stroke();

      // If locking, draw cryo laser beam & progress ring
      if (activeLockTarget) {
        ctx.beginPath();
        ctx.arc(hx, hy, 26, -Math.PI / 2, (-Math.PI / 2) + (Math.PI * 2 * (targetLockProgress / 100)));
        ctx.strokeStyle = '#38BDF8';
        ctx.lineWidth = 4;
        ctx.stroke();

        ctx.fillStyle = '#38BDF8';
        ctx.font = 'bold 10px monospace';
        ctx.fillText(`CRYO PURGE: ${targetLockProgress}%`, hx + 28, hy + 14);
      }

      animId = requestAnimationFrame(render);
    };

    animId = requestAnimationFrame(render);
    return () => cancelAnimationFrame(animId);
  }, [rotationAngle, hotspots, motionCoord, activeLockTarget, targetLockProgress]);

  const handleStartGame = () => {
    setGameStarted(true);
    setGameOver(false);
    setVictory(false);
    setScore(0);
    setTimeLeft(45);
    setHotspots([
      { id: 1, bladeIdx: 2, name: 'Blade #2 - Cavitation Friction', temp: 98, maxTemp: 115, cooled: false },
      { id: 2, bladeIdx: 5, name: 'Blade #5 - Boundary Layer Stall', temp: 104, maxTemp: 120, cooled: false },
      { id: 3, bladeIdx: 8, name: 'NDE Bearing Race - Oil Starvation', temp: 112, maxTemp: 125, cooled: false },
      { id: 4, bladeIdx: 11, name: 'Blade #11 - Tip Rubbing Casing', temp: 108, maxTemp: 118, cooled: false }
    ]);
    playBeep(523, 'sine', 0.2);
  };

  return (
    <div style={{
      background: 'radial-gradient(circle at 50% 50%, rgba(31, 41, 55, 0.95) 0%, rgba(11, 15, 23, 0.98) 100%)',
      border: '2px solid rgba(139, 92, 246, 0.5)',
      borderRadius: '20px',
      padding: '24px',
      position: 'relative',
      overflow: 'hidden',
      boxShadow: '0 12px 48px rgba(0,0,0,0.7)',
      color: '#F9FAFB'
    }}>
      {/* Header HUD */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px', flexWrap: 'wrap', gap: '10px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <div style={{
            background: 'rgba(139, 92, 246, 0.2)',
            padding: '8px',
            borderRadius: '10px',
            color: '#A78BFA'
          }}>
            <Crosshair size={22} />
          </div>
          <div>
            <h3 style={{ fontSize: '18px', fontWeight: 800, color: '#F9FAFB' }}>
              HoloInspect: Thermal Crisis 🎮
            </h3>
            <span style={{ fontSize: '12px', color: '#9CA3AF' }}>
              Computer Vision Gesture Control • Steer the 3D Rotor With Your Hand in the Air
            </span>
          </div>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <button
            type="button"
            onClick={toggleCamera}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              background: cameraActive ? 'rgba(16, 185, 129, 0.2)' : 'rgba(239, 68, 68, 0.2)',
              border: `1px solid ${cameraActive ? '#10B981' : '#EF4444'}`,
              color: cameraActive ? '#6EE7B7' : '#FCA5A5',
              padding: '6px 12px',
              borderRadius: '8px',
              fontSize: '12px',
              fontWeight: 600,
              cursor: 'pointer'
            }}
          >
            {cameraActive ? <Video size={14} /> : <VideoOff size={14} />}
            {cameraActive ? 'Camera CV: Active' : 'Enable Webcam Gesture'}
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
                    const s = await startStream(newId);
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

          <button
            type="button"
            onClick={() => setSoundEnabled(!soundEnabled)}
            style={{
              background: 'rgba(55, 65, 81, 0.5)',
              border: '1px solid #4B5563',
              color: '#D1D5DB',
              padding: '6px 10px',
              borderRadius: '8px',
              cursor: 'pointer'
            }}
          >
            {soundEnabled ? <Volume2 size={14} /> : <VolumeX size={14} />}
          </button>
        </div>
      </div>

      {cameraError && (
        <div style={{ background: 'rgba(245, 158, 11, 0.15)', border: '1px solid #F59E0B', color: '#FCD34D', padding: '8px 12px', borderRadius: '8px', fontSize: '12px', marginBottom: '12px' }}>
          ⚠️ {cameraError}
        </div>
      )}

      {/* Main Game Stage */}
      <div style={{ position: 'relative', width: '100%', height: '320px', background: '#0B0F17', borderRadius: '14px', overflow: 'hidden' }}>
        <canvas
          ref={canvasRef}
          width={640}
          height={320}
          style={{ width: '100%', height: '100%', display: 'block' }}
          onMouseMove={(e) => {
            if (!cameraActive) {
              const rect = e.currentTarget.getBoundingClientRect();
              setMotionCoord({
                x: (e.clientX - rect.left) / rect.width,
                y: (e.clientY - rect.top) / rect.height
              });
            }
          }}
        />

        {/* Floating Mini Webcam HUD Preview */}
        {cameraActive && (
          <div style={{
            position: 'absolute',
            top: '12px',
            right: '12px',
            width: '120px',
            height: '90px',
            borderRadius: '10px',
            border: '2px solid #8B5CF6',
            background: '#000',
            overflow: 'hidden',
            boxShadow: '0 4px 16px rgba(0,0,0,0.6)'
          }}>
            <video
              ref={videoRef}
              autoPlay
              playsInline
              muted
              style={{ width: '100%', height: '100%', objectFit: 'cover', transform: 'scaleX(-1)' }}
            />
            <div style={{
              position: 'absolute',
              bottom: '2px',
              left: '4px',
              fontSize: '8px',
              color: '#10B981',
              fontWeight: 700
            }}>
              ● CV TRACKING
            </div>
          </div>
        )}

        {/* Hidden Canvas for CV frame differencing */}
        <canvas ref={cvCanvasRef} width={160} height={120} style={{ display: 'none' }} />

        {/* Game Stats HUD Overlay */}
        {gameStarted && (
          <div style={{
            position: 'absolute',
            top: '12px',
            left: '12px',
            display: 'flex',
            gap: '12px',
            background: 'rgba(17, 24, 39, 0.85)',
            padding: '8px 14px',
            borderRadius: '10px',
            border: '1px solid #374151'
          }}>
            <div>
              <span style={{ fontSize: '10px', color: '#9CA3AF' }}>TIME REMAINING</span>
              <div style={{ fontSize: '18px', fontWeight: 800, color: timeLeft < 15 ? '#EF4444' : '#F9FAFB' }}>
                {timeLeft}s
              </div>
            </div>
            <div style={{ borderLeft: '1px solid #374151', paddingLeft: '12px' }}>
              <span style={{ fontSize: '10px', color: '#9CA3AF' }}>HOTSPOTS REMAINING</span>
              <div style={{ fontSize: '18px', fontWeight: 800, color: '#F59E0B' }}>
                {hotspots.filter(h => !h.cooled).length} / 4
              </div>
            </div>
            <div style={{ borderLeft: '1px solid #374151', paddingLeft: '12px' }}>
              <span style={{ fontSize: '10px', color: '#9CA3AF' }}>SCORE</span>
              <div style={{ fontSize: '18px', fontWeight: 800, color: '#10B981' }}>
                {score}
              </div>
            </div>
          </div>
        )}

        {/* Start Game Overlay */}
        {!gameStarted && (
          <div style={{
            position: 'absolute',
            inset: 0,
            background: 'rgba(11, 15, 23, 0.82)',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            padding: '20px',
            textAlign: 'center'
          }}>
            <Flame size={44} color="#EF4444" style={{ marginBottom: '12px' }} />
            <h4 style={{ fontSize: '22px', fontWeight: 800, marginBottom: '6px' }}>
              MISSION: THERMAL RUNAWAY CRISIS
            </h4>
            <p style={{ fontSize: '13px', color: '#9CA3AF', maxWidth: '440px', marginBottom: '18px' }}>
              Wave your hand in front of the camera (or move your mouse) to steer the 3D turbine. Aim the holographic reticle over red friction hotspots to trigger emergency cryo purge before rupture!
            </p>
            <button
              onClick={handleStartGame}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                background: 'linear-gradient(135deg, #8B5CF6 0%, #6D28D9 100%)',
                border: 'none',
                color: '#fff',
                padding: '12px 28px',
                borderRadius: '10px',
                fontSize: '15px',
                fontWeight: 700,
                cursor: 'pointer',
                boxShadow: '0 4px 20px rgba(139, 92, 246, 0.4)'
              }}
            >
              <Play size={16} /> Start HoloInspect Mission
            </button>
          </div>
        )}

        {/* Game Over / Victory Modal */}
        {gameOver && (
          <div style={{
            position: 'absolute',
            inset: 0,
            background: 'rgba(11, 15, 23, 0.9)',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            padding: '20px',
            textAlign: 'center'
          }}>
            {victory ? (
              <>
                <Trophy size={48} color="#10B981" style={{ marginBottom: '10px' }} />
                <h4 style={{ fontSize: '24px', fontWeight: 800, color: '#10B981', marginBottom: '6px' }}>
                  TURBINE STABILIZED! MISSION ACCOMPLISHED 🏆
                </h4>
                <p style={{ fontSize: '14px', color: '#D1D5DB', maxWidth: '420px', marginBottom: '14px' }}>
                  All 4 thermal hotspots cooled to safe operating margin. Rotor vibration returned to ISO Zone A.
                </p>
                <div style={{ fontSize: '20px', fontWeight: 800, color: '#FCD34D', marginBottom: '16px' }}>
                  Final Score: {score} PTS
                </div>
              </>
            ) : (
              <>
                <Flame size={48} color="#EF4444" style={{ marginBottom: '10px' }} />
                <h4 style={{ fontSize: '24px', fontWeight: 800, color: '#EF4444', marginBottom: '6px' }}>
                  CATASTROPHIC THERMAL TRIP! 💥
                </h4>
                <p style={{ fontSize: '14px', color: '#D1D5DB', maxWidth: '420px', marginBottom: '16px' }}>
                  Hotspot temperatures exceeded 115°C. Emergency turbine load trip initiated to protect stator windings.
                </p>
              </>
            )}

            <button
              onClick={handleStartGame}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                background: '#8B5CF6',
                border: 'none',
                color: '#fff',
                padding: '10px 24px',
                borderRadius: '8px',
                fontSize: '14px',
                fontWeight: 600,
                cursor: 'pointer'
              }}
            >
              <RefreshCw size={15} /> Play Again
            </button>
          </div>
        )}
      </div>

      {/* Bottom Mission Debrief & Status */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '14px', fontSize: '12px', color: '#9CA3AF' }}>
        <div>
          Tracking Status: <strong style={{ color: cameraActive ? '#10B981' : '#A78BFA' }}>{gestureStatus}</strong>
        </div>
        <div style={{ display: 'flex', gap: '8px' }}>
          <span>💡 <strong>Tip:</strong> Wave hand left/right to rotate, hold crosshair on red target to purge.</span>
        </div>
      </div>
    </div>
  );
}
