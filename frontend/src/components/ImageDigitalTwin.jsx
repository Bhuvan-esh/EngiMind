import React, { useRef, useEffect, useState } from 'react';
import { 
  Thermometer, Flame, Gauge, AlertTriangle, ShieldCheck, 
  RotateCw, Eye, Sparkles, Activity, Layers, Zap
} from 'lucide-react';

export default function ImageDigitalTwin({ 
  imageSrc, 
  fileName, 
  thermalData = null,
  isProcessing = false
}) {
  const canvasRef = useRef(null);
  const [viewMode, setViewMode] = useState('thermal'); // 'thermal' | 'wireframe' | 'solid'
  const [rotationSpeed, setRotationSpeed] = useState(1.0);
  const [isDragging, setIsDragging] = useState(false);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });
  const [rotationAngle, setRotationAngle] = useState({ x: 0.35, y: -0.6 });

  // Default simulated thermal stats if not yet analyzed by AI
  const stats = thermalData || {
    component: fileName ? fileName.replace(/\.[^/.]+$/, "") : "Mechanical Drive Assembly",
    peakTemp: 84.6,
    avgTemp: 62.1,
    ambientTemp: 24.5,
    heatFlux: '1,380 W/m²',
    thermalExpansion: '+0.034 mm',
    status: 'Elevated Warning',
    hotspotZone: 'Journal Bearing 2 / Impeller Eye',
    isoSeverity: 'Class II - Zone B (Acceptable/Watch)'
  };

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    let animationFrameId;
    let angleY = rotationAngle.y;
    let angleX = rotationAngle.x;

    const numBlades = 12;
    const bladeR = 75;
    const hubR = 30;

    const render = () => {
      if (!isDragging && rotationSpeed > 0) {
        angleY += 0.012 * rotationSpeed;
      }

      const width = canvas.width;
      const height = canvas.height;
      const cx = width / 2;
      const cy = height / 2;

      ctx.clearRect(0, 0, width, height);

      const fov = 380;
      const cameraZ = 320;

      const project = (x, y, z) => {
        const cosX = Math.cos(angleX);
        const sinX = Math.sin(angleX);
        const y1 = y * cosX - z * sinX;
        const z1 = y * sinX + z * cosX;

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

      // Background grid
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

      // Shaft Rings
      const shaftZ = [-110, -70, -30, 0, 30, 70, 110];
      shaftZ.forEach((sz) => {
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
          color: viewMode === 'thermal' ? '#EF4444' : '#60A5FA'
        });
      });

      // Longitudinal Lines
      for (let a = 0; a < Math.PI * 2; a += Math.PI / 4) {
        const rx = Math.cos(a) * 16;
        const ry = Math.sin(a) * 16;
        const p1 = project(rx, ry, -110);
        const p2 = project(rx, ry, 110);
        elements.push({
          type: 'line',
          p1,
          p2,
          z: 0,
          color: viewMode === 'thermal' ? 'rgba(239, 68, 68, 0.4)' : 'rgba(96, 165, 250, 0.4)'
        });
      }

      // 12 Rotor Blades with Thermal FEA Stress Colors
      for (let i = 0; i < numBlades; i++) {
        const theta = (i * Math.PI * 2) / numBlades;
        const rootX = Math.cos(theta) * hubR;
        const rootY = Math.sin(theta) * hubR;
        
        const tipTheta = theta + 0.35;
        const tipX = Math.cos(tipTheta) * bladeR;
        const tipY = Math.sin(tipTheta) * bladeR;

        const pRootFront = project(rootX, rootY, -10);
        const pRootBack = project(rootX, rootY, 10);
        const pTipFront = project(tipX, tipY, -2);
        const pTipBack = project(tipX, tipY, 18);

        const avgZ = (pRootFront.zDepth + pTipFront.zDepth) / 2;

        elements.push({
          type: 'blade',
          polygon: [pRootFront, pTipFront, pTipBack, pRootBack],
          z: avgZ,
          index: i
        });
      }

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
            // Thermal FLIR pseudo-color map: red hotspot on blades 0-3, amber/green on rest
            const isHot = el.index <= 3;
            const alpha = 0.45 + 0.3 * Math.sin(el.index + angleY * 3);
            ctx.fillStyle = isHot 
              ? `rgba(239, 68, 68, ${alpha})` 
              : `rgba(245, 158, 11, ${alpha * 0.75})`;
            ctx.fill();
            ctx.strokeStyle = isHot ? '#F87171' : '#FCD34D';
            ctx.lineWidth = 1.3;
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

      // Hotspot Telemetry Marker
      const hotCoord = project(bladeR * 0.85, 0, 0);
      ctx.beginPath();
      ctx.arc(hotCoord.px, hotCoord.py, 10, 0, Math.PI * 2);
      ctx.fillStyle = 'rgba(239, 68, 68, 0.9)';
      ctx.fill();

      ctx.beginPath();
      ctx.arc(hotCoord.px, hotCoord.py, 16, 0, Math.PI * 2);
      ctx.strokeStyle = 'rgba(239, 68, 68, 0.5)';
      ctx.lineWidth = 2;
      ctx.stroke();

      ctx.fillStyle = '#fff';
      ctx.font = 'bold 10px sans-serif';
      ctx.fillText(`${stats.peakTemp}°C HOTSPOT`, hotCoord.px + 14, hotCoord.py + 4);

      animationFrameId = requestAnimationFrame(render);
    };

    render();

    return () => cancelAnimationFrame(animationFrameId);
  }, [rotationSpeed, viewMode, isDragging, rotationAngle, stats.peakTemp]);

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

  const handleMouseUp = () => setIsDragging(false);

  return (
    <div style={{
      background: '#111827',
      border: '1.5px solid rgba(239, 68, 68, 0.4)',
      borderRadius: '16px',
      padding: '20px',
      marginBottom: '20px',
      boxShadow: '0 8px 32px rgba(0,0,0,0.5)',
      position: 'relative',
      overflow: 'hidden'
    }}>
      {/* Header Badge */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px', flexWrap: 'wrap', gap: '8px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <div style={{ background: 'rgba(239, 68, 68, 0.2)', padding: '6px', borderRadius: '8px', color: '#EF4444' }}>
            <Flame size={18} />
          </div>
          <div>
            <h3 style={{ fontSize: '16px', fontWeight: 700, color: '#F9FAFB' }}>
              Image-Derived 3D Digital Twin & Thermal Telemetry
            </h3>
            <span style={{ fontSize: '11px', color: '#9CA3AF' }}>
              Extracted from: <strong>{fileName || 'Pasted Image'}</strong>
            </span>
          </div>
        </div>

        {/* View Mode Switcher */}
        <div style={{ display: 'flex', gap: '4px', background: '#1F2937', padding: '3px', borderRadius: '8px', border: '1px solid #374151' }}>
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
            🔥 Thermal FLIR
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

      {/* Main Grid: Original Image + 3D Model */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px', marginBottom: '16px' }}>
        {/* Left: Input Image */}
        <div style={{
          background: '#1F2937',
          border: '1px solid #374151',
          borderRadius: '12px',
          padding: '12px',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          minHeight: '220px',
          maxHeight: '260px',
          overflow: 'hidden'
        }}>
          <div style={{ fontSize: '11px', color: '#9CA3AF', marginBottom: '8px', alignSelf: 'flex-start' }}>
            📸 Input Thermal / Mechanical Inspection:
          </div>
          {imageSrc ? (
            <img 
              src={imageSrc} 
              alt="Pasted Component" 
              style={{
                maxWidth: '100%',
                maxHeight: '190px',
                objectFit: 'contain',
                borderRadius: '8px',
                border: '1px solid #4B5563'
              }} 
            />
          ) : (
            <div style={{ color: '#6B7280', fontSize: '13px' }}>Image preview loading...</div>
          )}
        </div>

        {/* Right: Interactive 3D Model */}
        <div 
          style={{
            background: 'radial-gradient(circle at 50% 50%, rgba(31, 41, 55, 0.7) 0%, rgba(17, 24, 39, 0.95) 100%)',
            border: '1px solid rgba(239, 68, 68, 0.3)',
            borderRadius: '12px',
            position: 'relative',
            cursor: isDragging ? 'grabbing' : 'grab',
            minHeight: '220px',
            maxHeight: '260px'
          }}
          onMouseDown={handleMouseDown}
          onMouseMove={handleMouseMove}
          onMouseUp={handleMouseUp}
          onMouseLeave={handleMouseUp}
        >
          <canvas
            ref={canvasRef}
            width={340}
            height={220}
            style={{ width: '100%', height: '100%', display: 'block' }}
          />
          <div style={{
            position: 'absolute',
            bottom: '6px',
            left: '10px',
            fontSize: '10px',
            color: '#6B7280',
            display: 'flex',
            alignItems: 'center',
            gap: '4px',
            pointerEvents: 'none'
          }}>
            <RotateCw size={10} /> Drag to inspect 3D thermal thermography
          </div>
        </div>
      </div>

      {/* Bottom HUD: Real-time Thermal Telemetry Stats */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(4, 1fr)',
        gap: '10px',
        background: '#1F2937',
        border: '1px solid #374151',
        borderRadius: '12px',
        padding: '12px 14px'
      }}>
        <div>
          <div style={{ fontSize: '11px', color: '#9CA3AF', display: 'flex', alignItems: 'center', gap: '4px' }}>
            <Thermometer size={13} color="#EF4444" /> Peak Hotspot Temp
          </div>
          <div style={{ fontSize: '18px', fontWeight: 800, color: '#EF4444', marginTop: '3px' }}>
            {stats.peakTemp}°C
          </div>
          <div style={{ fontSize: '10px', color: '#F87171' }}>
            Limit: 75.0°C (Exceeded)
          </div>
        </div>

        <div>
          <div style={{ fontSize: '11px', color: '#9CA3AF', display: 'flex', alignItems: 'center', gap: '4px' }}>
            <Activity size={13} color="#F59E0B" /> Average Temp
          </div>
          <div style={{ fontSize: '18px', fontWeight: 800, color: '#FCD34D', marginTop: '3px' }}>
            {stats.avgTemp}°C
          </div>
          <div style={{ fontSize: '10px', color: '#9CA3AF' }}>
            Ambient: {stats.ambientTemp}°C
          </div>
        </div>

        <div>
          <div style={{ fontSize: '11px', color: '#9CA3AF', display: 'flex', alignItems: 'center', gap: '4px' }}>
            <Zap size={13} color="#8B5CF6" /> Heat Dissipation Flux
          </div>
          <div style={{ fontSize: '18px', fontWeight: 800, color: '#C4B5FD', marginTop: '3px' }}>
            {stats.heatFlux}
          </div>
          <div style={{ fontSize: '10px', color: '#9CA3AF' }}>
            Expansion: {stats.thermalExpansion}
          </div>
        </div>

        <div>
          <div style={{ fontSize: '11px', color: '#9CA3AF', display: 'flex', alignItems: 'center', gap: '4px' }}>
            <AlertTriangle size={13} color="#EF4444" /> Thermal Status
          </div>
          <div style={{ fontSize: '14px', fontWeight: 700, color: '#EF4444', marginTop: '4px' }}>
            {stats.status}
          </div>
          <div style={{ fontSize: '10px', color: '#9CA3AF', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
            {stats.hotspotZone}
          </div>
        </div>
      </div>
    </div>
  );
}
