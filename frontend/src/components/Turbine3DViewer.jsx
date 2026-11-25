import React, { useRef, useEffect, useState } from 'react';
import { RotateCw, Eye, AlertCircle, Zap, Shield, Maximize2 } from 'lucide-react';

export default function Turbine3DViewer({ onInspectPart }) {
  const canvasRef = useRef(null);
  const [rotationSpeed, setRotationSpeed] = useState(1.0);
  const [viewMode, setViewMode] = useState('thermal'); // 'wireframe' | 'solid' | 'thermal'
  const [activeHotspot, setActiveHotspot] = useState(null);
  const [isDragging, setIsDragging] = useState(false);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });
  const [rotationAngle, setRotationAngle] = useState({ x: 0.35, y: -0.6 });

  // Geometry generator for turbine rotor + blades + shaft
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    let animationFrameId;
    let angleY = rotationAngle.y;
    let angleX = rotationAngle.x;

    // Generate 3D geometry vertices and edges
    // 1. Shaft cylinders
    // 2. Central Impeller / Turbine Discs
    // 3. 12 Angled Rotor Blades
    // 4. Bearing Rings
    const numBlades = 12;
    const bladeR = 75;
    const hubR = 30;

    const render = () => {
      // Auto-rotation when not dragging
      if (!isDragging && rotationSpeed > 0) {
        angleY += 0.012 * rotationSpeed;
      }

      const width = canvas.width;
      const height = canvas.height;
      const cx = width / 2;
      const cy = height / 2;

      ctx.clearRect(0, 0, width, height);

      // Camera / 3D Projection parameters
      const fov = 380;
      const cameraZ = 320;

      const project = (x, y, z) => {
        // Rotate around X
        const cosX = Math.cos(angleX);
        const sinX = Math.sin(angleX);
        const y1 = y * cosX - z * sinX;
        const z1 = y * sinX + z * cosX;

        // Rotate around Y
        const cosY = Math.cos(angleY);
        const sinY = Math.sin(angleY);
        const x2 = x * cosY + z1 * sinY;
        const z2 = -x * sinY + z1 * cosY;

        const distance = cameraZ + z2;
        const scale = fov / Math.max(10, distance);
        return {
          px: cx + x2 * scale,
          py: cy + y1 * scale,
          scale,
          zDepth: z2
        };
      };

      // Draw background telemetry grid
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

      // Collect lines to render with depth sorting
      const renderElements = [];

      // Shaft Rings
      const shaftZ = [-110, -70, -30, 0, 30, 70, 110];
      shaftZ.forEach((sz, idx) => {
        const ringPoints = [];
        const r = (sz === 0) ? hubR : 16;
        for (let a = 0; a < Math.PI * 2; a += Math.PI / 8) {
          const rx = Math.cos(a) * r;
          const ry = Math.sin(a) * r;
          ringPoints.push(project(rx, ry, sz));
        }
        renderElements.push({
          type: 'ring',
          points: ringPoints,
          z: sz,
          color: viewMode === 'thermal' ? '#8B5CF6' : '#60A5FA'
        });
      });

      // Shaft Longitudinal Lines
      for (let a = 0; a < Math.PI * 2; a += Math.PI / 4) {
        const rx = Math.cos(a) * 16;
        const ry = Math.sin(a) * 16;
        const p1 = project(rx, ry, -110);
        const p2 = project(rx, ry, 110);
        renderElements.push({
          type: 'line',
          p1,
          p2,
          z: 0,
          color: viewMode === 'thermal' ? 'rgba(139, 92, 246, 0.4)' : 'rgba(96, 165, 250, 0.4)'
        });
      }

      // 12 Turbine Blades
      for (let i = 0; i < numBlades; i++) {
        const theta = (i * Math.PI * 2) / numBlades;
        const rootX = Math.cos(theta) * hubR;
        const rootY = Math.sin(theta) * hubR;
        
        // Blade tip has twist and sweep
        const tipTheta = theta + 0.35;
        const tipX = Math.cos(tipTheta) * bladeR;
        const tipY = Math.sin(tipTheta) * bladeR;

        // Front and back blade edges
        const pRootFront = project(rootX, rootY, -10);
        const pRootBack = project(rootX, rootY, 10);
        const pTipFront = project(tipX, tipY, -2);
        const pTipBack = project(tipX, tipY, 18);

        const avgZ = (pRootFront.zDepth + pTipFront.zDepth) / 2;

        renderElements.push({
          type: 'blade',
          polygon: [pRootFront, pTipFront, pTipBack, pRootBack],
          z: avgZ,
          index: i
        });
      }

      // Outer Shroud Ring (casing outline)
      const outerRing = [];
      for (let a = 0; a < Math.PI * 2; a += Math.PI / 16) {
        outerRing.push(project(Math.cos(a) * (bladeR + 8), Math.sin(a) * (bladeR + 8), 0));
      }
      renderElements.push({
        type: 'ring',
        points: outerRing,
        z: 0,
        color: 'rgba(245, 158, 11, 0.3)',
        dashed: true
      });

      // Sort elements from back to front for proper 3D rendering
      renderElements.sort((a, b) => b.z - a.z);

      // Render elements
      renderElements.forEach(el => {
        if (el.type === 'ring') {
          ctx.beginPath();
          ctx.strokeStyle = el.color;
          ctx.lineWidth = 1.4;
          if (el.dashed) ctx.setLineDash([4, 4]);
          else ctx.setLineDash([]);
          el.points.forEach((pt, idx) => {
            if (idx === 0) ctx.moveTo(pt.px, pt.py);
            else ctx.lineTo(pt.px, pt.py);
          });
          ctx.closePath();
          ctx.stroke();
          ctx.setLineDash([]);
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
            // Thermal Von-Mises Stress Heatmap
            const heatAlpha = 0.35 + 0.3 * Math.sin(el.index + angleY * 2);
            ctx.fillStyle = el.index % 3 === 0 
              ? `rgba(239, 68, 68, ${heatAlpha})` 
              : `rgba(16, 185, 129, ${heatAlpha})`;
            ctx.fill();
            ctx.strokeStyle = '#FCD34D';
            ctx.lineWidth = 1.2;
            ctx.stroke();
          } else if (viewMode === 'solid') {
            ctx.fillStyle = 'rgba(75, 85, 99, 0.65)';
            ctx.fill();
            ctx.strokeStyle = '#9CA3AF';
            ctx.lineWidth = 1.2;
            ctx.stroke();
          } else {
            // Wireframe
            ctx.strokeStyle = '#A78BFA';
            ctx.lineWidth = 1;
            ctx.stroke();
          }
        }
      });

      // 3D Telemetry Hotspots (Sensor Points)
      const hotspots = [
        {
          id: 'bearing_drive',
          name: 'NDE Bearing',
          coords: project(0, 0, -100),
          status: 'Optimal',
          temp: '58°C',
          vib: '1.8 mm/s'
        },
        {
          id: 'impeller_blade',
          name: 'Impeller Aerofoil',
          coords: project(bladeR * 0.85, 0, 0),
          status: 'High Dynamic Stress',
          temp: '82°C',
          vib: '3.4 mm/s'
        },
        {
          id: 'thrust_collar',
          name: 'DE Thrust Collar',
          coords: project(0, 0, 95),
          status: 'Nominal',
          temp: '64°C',
          vib: '2.1 mm/s'
        }
      ];

      hotspots.forEach(hs => {
        const { px, py } = hs.coords;
        const isHovered = activeHotspot?.id === hs.id;

        // Glowing radar pulse ring
        ctx.beginPath();
        ctx.arc(px, py, isHovered ? 12 : 7, 0, Math.PI * 2);
        ctx.fillStyle = hs.status.includes('High') ? 'rgba(239, 68, 68, 0.85)' : 'rgba(16, 185, 129, 0.85)';
        ctx.fill();

        ctx.beginPath();
        ctx.arc(px, py, isHovered ? 18 : 11, 0, Math.PI * 2);
        ctx.strokeStyle = hs.status.includes('High') ? 'rgba(239, 68, 68, 0.4)' : 'rgba(16, 185, 129, 0.4)';
        ctx.lineWidth = 2;
        ctx.stroke();

        // Label on hover or active
        if (isHovered) {
          ctx.fillStyle = 'rgba(17, 24, 39, 0.9)';
          ctx.strokeStyle = '#4B5563';
          ctx.lineWidth = 1;
          const boxW = 120;
          const boxH = 46;
          ctx.fillRect(px + 14, py - 20, boxW, boxH);
          ctx.strokeRect(px + 14, py - 20, boxW, boxH);

          ctx.fillStyle = '#F9FAFB';
          ctx.font = 'bold 11px sans-serif';
          ctx.fillText(hs.name, px + 20, py - 6);

          ctx.fillStyle = '#9CA3AF';
          ctx.font = '10px sans-serif';
          ctx.fillText(`${hs.temp} • ${hs.vib}`, px + 20, py + 12);
        }
      });

      animationFrameId = requestAnimationFrame(render);
    };

    render();

    return () => {
      cancelAnimationFrame(animationFrameId);
    };
  }, [rotationSpeed, viewMode, activeHotspot, isDragging, rotationAngle]);

  const handleMouseDown = (e) => {
    setIsDragging(true);
    setDragStart({ x: e.clientX, y: e.clientY });
  };

  const handleMouseMove = (e) => {
    if (!isDragging) return;
    const dx = e.clientX - dragStart.x;
    const dy = e.clientY - dragStart.y;
    setRotationAngle(prev => ({
      x: Math.max(-1.2, Math.min(1.2, prev.x + dy * 0.008)),
      y: prev.y + dx * 0.008
    }));
    setDragStart({ x: e.clientX, y: e.clientY });
  };

  const handleMouseUp = () => {
    setIsDragging(false);
  };

  return (
    <div style={{
      background: 'radial-gradient(circle at 50% 50%, rgba(31, 41, 55, 0.7) 0%, rgba(17, 24, 39, 0.95) 100%)',
      border: '1px solid rgba(139, 92, 246, 0.3)',
      borderRadius: '16px',
      padding: '16px',
      position: 'relative',
      overflow: 'hidden',
      display: 'flex',
      flexDirection: 'column',
      boxShadow: '0 8px 32px rgba(0, 0, 0, 0.4)'
    }}>
      {/* HUD Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px', zIndex: 2 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <div style={{
            width: '8px',
            height: '8px',
            borderRadius: '50%',
            background: '#10B981',
            boxShadow: '0 0 8px #10B981'
          }} />
          <span style={{ fontSize: '13px', fontWeight: 700, color: '#F3F4F6', letterSpacing: '0.5px' }}>
            3D DIGITAL TWIN • TURBINE ROTOR
          </span>
        </div>

        {/* View Mode Switcher */}
        <div style={{ display: 'flex', gap: '4px', background: 'rgba(17, 24, 39, 0.8)', padding: '3px', borderRadius: '8px', border: '1px solid #374151' }}>
          <button
            type="button"
            onClick={() => setViewMode('thermal')}
            style={{
              background: viewMode === 'thermal' ? 'rgba(239, 68, 68, 0.25)' : 'transparent',
              border: `1px solid ${viewMode === 'thermal' ? '#EF4444' : 'transparent'}`,
              color: viewMode === 'thermal' ? '#FCA5A5' : '#9CA3AF',
              padding: '3px 8px',
              borderRadius: '6px',
              fontSize: '10px',
              fontWeight: 600,
              cursor: 'pointer'
            }}
          >
            Thermal Stress
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
              fontSize: '10px',
              fontWeight: 600,
              cursor: 'pointer'
            }}
          >
            Wireframe
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
              fontSize: '10px',
              fontWeight: 600,
              cursor: 'pointer'
            }}
          >
            Solid CAD
          </button>
        </div>
      </div>

      {/* 3D Canvas */}
      <div 
        style={{
          width: '100%',
          height: '240px',
          position: 'relative',
          cursor: isDragging ? 'grabbing' : 'grab'
        }}
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onMouseLeave={handleMouseUp}
      >
        <canvas
          ref={canvasRef}
          width={440}
          height={240}
          style={{ width: '100%', height: '100%', display: 'block' }}
        />

        {/* Interaction Hint Overlay */}
        <div style={{
          position: 'absolute',
          bottom: '8px',
          left: '12px',
          fontSize: '10px',
          color: '#6B7280',
          display: 'flex',
          alignItems: 'center',
          gap: '4px',
          pointerEvents: 'none'
        }}>
          <RotateCw size={11} /> Click & drag to rotate 3D assembly • Real-time kinematics
        </div>
      </div>

      {/* Bottom Controls & Telemetry Readouts */}
      <div style={{
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        paddingTop: '10px',
        borderTop: '1px solid rgba(55, 65, 81, 0.5)',
        zIndex: 2,
        flexWrap: 'wrap',
        gap: '8px'
      }}>
        <div style={{ display: 'flex', gap: '14px', fontSize: '11px' }}>
          <div>
            <span style={{ color: '#9CA3AF' }}>Rotor Speed: </span>
            <span style={{ color: '#10B981', fontWeight: 600 }}>{Math.round(1800 * rotationSpeed)} RPM</span>
          </div>
          <div>
            <span style={{ color: '#9CA3AF' }}>1X Harmonics: </span>
            <span style={{ color: '#3B82F6', fontWeight: 600 }}>30.0 Hz</span>
          </div>
          <div>
            <span style={{ color: '#9CA3AF' }}>Max Stress: </span>
            <span style={{ color: '#EF4444', fontWeight: 600 }}>142 MPa</span>
          </div>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <button
            type="button"
            onClick={() => setRotationSpeed(s => s === 0 ? 1.0 : s === 1.0 ? 2.5 : 0)}
            style={{
              background: 'rgba(55, 65, 81, 0.7)',
              border: '1px solid #4B5563',
              color: '#D1D5DB',
              padding: '3px 8px',
              borderRadius: '6px',
              fontSize: '10px',
              cursor: 'pointer'
            }}
          >
            {rotationSpeed === 0 ? '▶ Spin' : rotationSpeed === 1.0 ? '⚡ 2.5x RPM' : '⏸ Pause'}
          </button>
        </div>
      </div>
    </div>
  );
}
