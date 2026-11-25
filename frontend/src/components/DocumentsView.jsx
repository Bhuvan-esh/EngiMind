import React, { useState } from 'react';
import { FileText, ArrowRight, Search, Download, ExternalLink, Bookmark } from 'lucide-react';

const technicalDocuments = [
  {
    id: 'iso-10816',
    title: 'ISO 10816-3 Mechanical Vibration Severity Standards',
    category: 'Vibration & Diagnostics',
    badgeColor: '#EF4444',
    readTime: '8 min read',
    summary: 'Standardized vibration severity velocity zones (Zone A: Good, Zone B: Acceptable, Zone C: Alert, Zone D: Danger) for industrial machines rated 15 kW to 300 kW.',
    keyTakeaway: 'Threshold of 4.5 mm/s RMS indicates impending bearing degradation and requires maintenance scheduling within 48h.',
    sampleQuery: 'Based on ISO 10816-3, what action should I take if a 75kW rigid-mounted motor DE bearing vibration reaches 5.2 mm/s RMS?'
  },
  {
    id: 'pump-cavitation',
    title: 'Centrifugal Pump Cavitation & NPSH Troubleshooting Guide',
    category: 'Fluid Machinery',
    badgeColor: '#3B82F6',
    readTime: '12 min read',
    summary: 'Comprehensive analysis of Net Positive Suction Head available (NPSHa) vs required (NPSHr), vapor pressure flashing, and impeller pitting mechanics.',
    keyTakeaway: 'Classic signs of suction cavitation include marbles-rattling acoustic noise, erratic discharge pressure, and eye impeller erosion.',
    sampleQuery: 'How can I calculate available NPSH (NPSHa) in an industrial cooling water circuit to eliminate cavitation?'
  },
  {
    id: 'motor-bearings',
    title: 'Three-Phase Induction Motor Failure Modes & Prevention',
    category: 'Electrical & Drives',
    badgeColor: '#10B981',
    readTime: '15 min read',
    summary: 'Root-cause analysis of deep groove ball bearings (6200/6300 series), electrical fluting caused by VFD common-mode currents, and lubrication breakdown.',
    keyTakeaway: 'Over 51% of motor failures stem from mechanical bearings, followed by stator insulation breakdown (16%).',
    sampleQuery: 'What are the main indicators of bearing electrical fluting caused by Variable Frequency Drives (VFDs)?'
  },
  {
    id: 'heat-exchangers',
    title: 'Shell and Tube Heat Exchanger Fouling & Thermal Efficiency',
    category: 'Thermal Systems',
    badgeColor: '#F59E0B',
    readTime: '10 min read',
    summary: 'Monitoring Overall Heat Transfer Coefficient (U), fouling resistance factor (Rf), and temperature cross for shell-and-tube configurations.',
    keyTakeaway: 'A 15% drop in U-value with rising tube-side delta-P confirms asymptotic biological or particulate fouling.',
    sampleQuery: 'How do I evaluate heat exchanger fouling from inlet/outlet temperatures and flow rates?'
  }
];

export default function DocumentsView({ onAnalyzeDoc }) {
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedDoc, setSelectedDoc] = useState(null);

  const filteredDocs = technicalDocuments.filter(doc => 
    doc.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
    doc.category.toLowerCase().includes(searchTerm.toLowerCase()) ||
    doc.summary.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div style={{ maxWidth: '900px', margin: '0 auto', width: '100%', padding: '24px' }}>
      <div style={{ textAlign: 'center', marginBottom: '28px' }}>
        <div style={{ display: 'inline-flex', padding: '12px', background: 'rgba(59, 130, 246, 0.1)', borderRadius: '16px', color: '#3B82F6', marginBottom: '12px' }}>
          <FileText size={36} />
        </div>
        <h2 style={{ fontSize: '24px', fontWeight: 700, color: '#F9FAFB' }}>Technical Engineering Library</h2>
        <p style={{ color: '#9CA3AF', fontSize: '14px', marginTop: '6px' }}>
          Standardized industrial codes, troubleshooting SOPs, and equipment maintenance manuals.
        </p>
      </div>

      {/* Search Input */}
      <div style={{ display: 'flex', alignItems: 'center', background: '#1F2937', border: '1px solid #374151', borderRadius: '12px', padding: '10px 16px', marginBottom: '24px' }}>
        <Search size={18} color="#9CA3AF" style={{ marginRight: '10px' }} />
        <input
          type="text"
          placeholder="Filter documents by ISO code, machinery type, failure mode..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          style={{
            flex: 1,
            background: 'transparent',
            border: 'none',
            outline: 'none',
            color: '#F9FAFB',
            fontSize: '13px'
          }}
        />
      </div>

      {/* Documents Grid */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(400px, 1fr))', gap: '16px' }}>
        {filteredDocs.map((doc) => (
          <div
            key={doc.id}
            style={{
              background: '#1F2937',
              border: '1px solid #374151',
              borderRadius: '14px',
              padding: '20px',
              display: 'flex',
              flexDirection: 'column',
              justifyContent: 'space-between',
              transition: 'all 0.2s'
            }}
          >
            <div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' }}>
                <span style={{ 
                  fontSize: '11px', 
                  fontWeight: 600, 
                  padding: '3px 8px', 
                  borderRadius: '4px', 
                  background: `${doc.badgeColor}20`, 
                  color: doc.badgeColor 
                }}>
                  {doc.category}
                </span>
                <span style={{ fontSize: '11px', color: '#9CA3AF' }}>{doc.readTime}</span>
              </div>

              <h3 style={{ fontSize: '16px', fontWeight: 600, color: '#F3F4F6', marginBottom: '8px', lineHeight: '1.4' }}>
                {doc.title}
              </h3>

              <p style={{ fontSize: '13px', color: '#9CA3AF', lineHeight: '1.6', marginBottom: '12px' }}>
                {doc.summary}
              </p>

              <div style={{ background: '#111827', borderRadius: '8px', padding: '10px 12px', marginBottom: '16px', borderLeft: `3px solid ${doc.badgeColor}` }}>
                <span style={{ fontSize: '11px', fontWeight: 700, color: '#D1D5DB', textTransform: 'uppercase' }}>Key Spec: </span>
                <span style={{ fontSize: '12px', color: '#9CA3AF' }}>{doc.keyTakeaway}</span>
              </div>
            </div>

            <div style={{ display: 'flex', gap: '10px' }}>
              <button
                type="button"
                onClick={() => onAnalyzeDoc && onAnalyzeDoc(doc.sampleQuery)}
                style={{
                  flex: 1,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '6px',
                  background: 'rgba(139, 92, 246, 0.15)',
                  border: '1px solid rgba(139, 92, 246, 0.4)',
                  color: '#C4B5FD',
                  borderRadius: '8px',
                  padding: '8px 12px',
                  fontSize: '12px',
                  fontWeight: 600,
                  cursor: 'pointer'
                }}
              >
                Analyze with EngiMind <ArrowRight size={13} />
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
