import React, { useState } from 'react';
import { 
  AlertTriangle, Flame, ShieldAlert, CheckCircle, RefreshCw, 
  Send, Zap, Gauge, HeartPulse, Award, Skull, Activity, ArrowRight, Sparkles
} from 'lucide-react';
import { callOpenRouter } from '../openRouterApi';
import MarkdownRenderer from './MarkdownRenderer';

const SCENARIOS = [
  {
    id: 'boiler',
    title: 'High-Pressure Steam Boiler Overpressure',
    icon: Flame,
    color: '#EF4444',
    badge: 'Critical Thermal Alert',
    initialHealth: 65,
    metricName: 'Drum Pressure',
    initialMetric: '92.4 bar',
    threshold: '100 bar (Burst Rating)',
    description: 'Turbine load was shed abruptly. The primary spring-loaded safety relief valve is stuck at 15% open. Steam pressure is climbing at 1.8 bar/min toward the drum rupture rating.',
    initialOptions: [
      { id: 'opt1', label: 'Trip Fuel Master Control & Open Superheater Vent Valve' },
      { id: 'opt2', label: 'Max out Cold Feedwater Inflow to Quench Steam Drum' },
      { id: 'opt3', label: 'Manually override and hammer the stuck relief valve stem' },
      { id: 'opt4', label: 'Divert steam to secondary condenser bypass line' }
    ]
  },
  {
    id: 'pump',
    title: 'Centrifugal Slurry Pump Violent Cavitation',
    icon: AlertTriangle,
    color: '#F59E0B',
    badge: 'Hydrodynamic Crisis',
    initialHealth: 70,
    metricName: 'Vibration RMS',
    initialMetric: '14.8 mm/s',
    threshold: '4.5 mm/s (ISO Trip)',
    description: 'Suction sump level dropped unexpectedly. Suction pipe NPSHa has dipped below required NPSHr. The pump sounds like it is grinding river stones, and bearing housing vibration is in the danger zone.',
    initialOptions: [
      { id: 'opt1', label: 'Throttle discharge valve to push operating point back left on the pump curve' },
      { id: 'opt2', label: 'Throttle suction valve to restrict inlet turbulence' },
      { id: 'opt3', label: 'Inject high-pressure seal purge water into the suction eye' },
      { id: 'opt4', label: 'Initiate emergency switchover to standby pump while slowing VFD' }
    ]
  },
  {
    id: 'motor',
    title: '500kW Induction Motor Phase Unbalance & Thermal Runaway',
    icon: Zap,
    color: '#8B5CF6',
    badge: 'Electrical / Insulation Alert',
    initialHealth: 60,
    metricName: 'Winding Temperature',
    initialMetric: '138°C',
    threshold: '155°C (Class F Insulation Limit)',
    description: 'A loose feeder lug caused a 28% current unbalance across phases. Negative sequence currents are causing rotor eddy current heating, and stator winding temperature is rocketing toward insulation breakdown.',
    initialOptions: [
      { id: 'opt1', label: 'Immediately trip supply breaker to prevent stator rewind ($80k)' },
      { id: 'opt2', label: 'Reduce shaft mechanical load by 50% while checking phase voltages' },
      { id: 'opt3', label: 'Spray industrial CO2 fire extinguisher into the motor cooling duct' },
      { id: 'opt4', label: 'Switch cooling blowers to emergency forced-draft override' }
    ]
  }
];

export default function CatastropheRoom({ onOpenAskWithPrompt, showToast }) {
  const [selectedScenario, setSelectedScenario] = useState(SCENARIOS[0]);
  const [plantHealth, setPlantHealth] = useState(SCENARIOS[0].initialHealth);
  const [metricValue, setMetricValue] = useState(SCENARIOS[0].initialMetric);
  const [turn, setTurn] = useState(1);
  const [history, setHistory] = useState([]);
  const [customAction, setCustomAction] = useState('');
  const [isSimulating, setIsSimulating] = useState(false);
  const [outcome, setOutcome] = useState(null); // 'survived' | 'disaster' | null

  const handleSelectScenario = (sc) => {
    setSelectedScenario(sc);
    setPlantHealth(sc.initialHealth);
    setMetricValue(sc.initialMetric);
    setTurn(1);
    setHistory([]);
    setCustomAction('');
    setOutcome(null);
  };

  const handleAction = async (actionText) => {
    if (isSimulating || outcome) return;
    setIsSimulating(true);

    try {
      const prompt = `You are the industrial disaster physics engine for a student plant simulation game called "Catastrophe Room".
Scenario: ${selectedScenario.title}
Incident background: ${selectedScenario.description}
Current Plant Integrity: ${plantHealth}%
Key Metric: ${selectedScenario.metricName} (currently ${metricValue}, critical threshold is ${selectedScenario.threshold})
Current Turn: ${turn} of 3
Student's Chosen Action: "${actionText}"

Analyze this engineering action according to real fluid dynamics, heat transfer, and mechanical engineering principles.
Return ONLY a valid JSON object with the following keys:
- "resultText": A vivid, realistic 2-3 sentence radio report from the plant control room describing the physical outcome of this command.
- "healthDelta": An integer between -40 and +35 representing the change in plant integrity. Positive if action was physically sound, negative if hazardous.
- "newMetric": Updated metric string (e.g. "81.2 bar" or "18.5 mm/s").
- "isDisaster": boolean (true if the plant blew up/failed/tripped destructively).
- "isResolved": boolean (true if the crisis is successfully stabilized).
- "physicsExplanation": A 2-sentence engineering debrief explaining why this choice was physically effective or disastrous.
- "nextOptions": An array of 3 realistic next emergency options for the subsequent turn (if not ended).

Return ONLY valid JSON with no markdown wrapping.`;

      const res = await callOpenRouter({ prompt, jsonMode: true });

      const newHealth = Math.max(0, Math.min(100, plantHealth + (res.healthDelta || 0)));
      setPlantHealth(newHealth);
      if (res.newMetric) setMetricValue(res.newMetric);

      const isGameOver = turn >= 3 || res.isDisaster || res.isResolved || newHealth <= 20 || newHealth >= 85;
      
      let finalOutcome = null;
      if (isGameOver) {
        if (newHealth >= 75 || res.isResolved) {
          finalOutcome = 'survived';
          showToast("Crisis successfully averted! Plant stabilized.", "success");
        } else {
          finalOutcome = 'disaster';
          showToast("Catastrophic plant trip! Emergency shutdown initiated.", "error");
        }
        setOutcome(finalOutcome);
      }

      setHistory(prev => [
        ...prev,
        {
          turn,
          action: actionText,
          radioReport: res.resultText,
          physicsDebrief: res.physicsExplanation,
          healthAfter: newHealth,
          metricAfter: res.newMetric || metricValue
        }
      ]);

      if (!isGameOver) {
        setTurn(t => t + 1);
        if (res.nextOptions && res.nextOptions.length > 0) {
          // Update available options for the next turn
          selectedScenario.initialOptions = res.nextOptions.map((opt, i) => ({
            id: `turn-${turn}-${i}`,
            label: typeof opt === 'string' ? opt : opt.label
          }));
        }
      }
    } catch (err) {
      showToast(`Simulation engine error: ${err.message}`, "error");
    } finally {
      setIsSimulating(false);
      setCustomAction('');
    }
  };

  const handleReset = () => {
    handleSelectScenario(selectedScenario);
  };

  const Icon = selectedScenario.icon;

  return (
    <div style={{ maxWidth: '960px', margin: '0 auto', width: '100%', padding: '24px 16px' }}>
      {/* Top Banner */}
      <div style={{ textAlign: 'center', marginBottom: '28px' }}>
        <div style={{
          display: 'inline-flex',
          alignItems: 'center',
          gap: '8px',
          background: 'rgba(239, 68, 68, 0.15)',
          border: '1px solid rgba(239, 68, 68, 0.3)',
          color: '#F87171',
          padding: '6px 14px',
          borderRadius: '20px',
          fontSize: '12px',
          fontWeight: 600,
          marginBottom: '10px'
        }}>
          <ShieldAlert size={15} /> INDUSTRIAL FLIGHT SIMULATOR • FOR ENGINEERING STUDENTS
        </div>
        <h2 style={{ fontSize: '28px', fontWeight: 700, color: '#F9FAFB' }}>The Catastrophe Room 🚨</h2>
        <p style={{ color: '#9CA3AF', fontSize: '14px', maxWidth: '640px', margin: '6px auto 0' }}>
          Test your real-world engineering intuition under pressure. You have 3 tactical decisions to diagnose physical failure modes and save the plant before catastrophic rupture.
        </p>
      </div>

      {/* Scenario Tabs */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '12px', marginBottom: '24px' }}>
        {SCENARIOS.map(sc => {
          const TabIcon = sc.icon;
          const isSelected = selectedScenario.id === sc.id;
          return (
            <button
              key={sc.id}
              onClick={() => handleSelectScenario(sc)}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '10px',
                padding: '12px 14px',
                background: isSelected ? 'rgba(31, 41, 55, 0.95)' : 'rgba(31, 41, 55, 0.5)',
                border: `1.5px solid ${isSelected ? sc.color : '#374151'}`,
                borderRadius: '12px',
                color: isSelected ? '#F9FAFB' : '#9CA3AF',
                cursor: 'pointer',
                textAlign: 'left',
                transition: 'all 0.2s'
              }}
            >
              <div style={{
                background: `${sc.color}20`,
                padding: '8px',
                borderRadius: '8px',
                color: sc.color,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center'
              }}>
                <TabIcon size={20} />
              </div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontSize: '12px', fontWeight: 600, color: sc.color }}>{sc.badge}</div>
                <div style={{ fontSize: '13px', fontWeight: 500, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                  {sc.title}
                </div>
              </div>
            </button>
          );
        })}
      </div>

      {/* Live Plant Telemetry HUD */}
      <div style={{
        background: '#1F2937',
        border: `1px solid ${selectedScenario.color}40`,
        borderRadius: '16px',
        padding: '20px',
        marginBottom: '24px',
        position: 'relative',
        overflow: 'hidden'
      }}>
        <div style={{
          position: 'absolute',
          top: 0,
          left: 0,
          right: 0,
          height: '3px',
          background: `linear-gradient(90deg, ${selectedScenario.color}, #F59E0B, #10B981)`
        }} />

        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px', flexWrap: 'wrap', gap: '12px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <div style={{ background: `${selectedScenario.color}25`, padding: '10px', borderRadius: '10px', color: selectedScenario.color }}>
              <Icon size={24} />
            </div>
            <div>
              <h3 style={{ fontSize: '18px', fontWeight: 700, color: '#F9FAFB' }}>{selectedScenario.title}</h3>
              <p style={{ fontSize: '12px', color: '#9CA3AF', marginTop: '2px' }}>{selectedScenario.description}</p>
            </div>
          </div>

          <div style={{ display: 'flex', gap: '10px' }}>
            <button
              onClick={handleReset}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '6px',
                background: 'rgba(55, 65, 81, 0.7)',
                border: '1px solid #4B5563',
                color: '#D1D5DB',
                padding: '6px 12px',
                borderRadius: '8px',
                fontSize: '12px',
                cursor: 'pointer'
              }}
            >
              <RefreshCw size={14} /> Restart Scenario
            </button>
          </div>
        </div>

        {/* HUD Gauges */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '14px', background: '#111827', padding: '14px', borderRadius: '12px' }}>
          <div>
            <div style={{ fontSize: '11px', color: '#9CA3AF', marginBottom: '4px', display: 'flex', alignItems: 'center', gap: '4px' }}>
              <HeartPulse size={13} color="#EF4444" /> Plant Structural Integrity
            </div>
            <div style={{ fontSize: '22px', fontWeight: 800, color: plantHealth > 60 ? '#10B981' : plantHealth > 30 ? '#F59E0B' : '#EF4444' }}>
              {plantHealth}%
            </div>
            <div style={{ width: '100%', height: '6px', background: '#374151', borderRadius: '4px', marginTop: '6px', overflow: 'hidden' }}>
              <div style={{
                width: `${plantHealth}%`,
                height: '100%',
                background: plantHealth > 60 ? '#10B981' : plantHealth > 30 ? '#F59E0B' : '#EF4444',
                transition: 'width 0.4s'
              }} />
            </div>
          </div>

          <div>
            <div style={{ fontSize: '11px', color: '#9CA3AF', marginBottom: '4px', display: 'flex', alignItems: 'center', gap: '4px' }}>
              <Gauge size={13} color="#3B82F6" /> {selectedScenario.metricName}
            </div>
            <div style={{ fontSize: '22px', fontWeight: 800, color: '#F9FAFB' }}>
              {metricValue}
            </div>
            <div style={{ fontSize: '11px', color: '#EF4444', marginTop: '4px', fontWeight: 500 }}>
              Threshold: {selectedScenario.threshold}
            </div>
          </div>

          <div>
            <div style={{ fontSize: '11px', color: '#9CA3AF', marginBottom: '4px', display: 'flex', alignItems: 'center', gap: '4px' }}>
              <Activity size={13} color="#A78BFA" /> Triage Turn
            </div>
            <div style={{ fontSize: '22px', fontWeight: 800, color: '#A78BFA' }}>
              {outcome ? 'FINISHED' : `Turn ${turn} of 3`}
            </div>
            <div style={{ fontSize: '11px', color: '#9CA3AF', marginTop: '4px' }}>
              {outcome ? 'Debrief Ready' : `${3 - turn + 1} tactical commands left`}
            </div>
          </div>
        </div>
      </div>

      {/* Incident Radio Log */}
      {history.length > 0 && (
        <div style={{ background: '#111827', border: '1px solid #374151', borderRadius: '16px', padding: '18px', marginBottom: '24px' }}>
          <h4 style={{ fontSize: '14px', fontWeight: 600, color: '#9CA3AF', marginBottom: '12px', display: 'flex', alignItems: 'center', gap: '6px' }}>
            <Activity size={16} color="#8B5CF6" /> Control Room Incident Transcript
          </h4>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
            {history.map((h, i) => (
              <div key={i} style={{ borderLeft: '3px solid #8B5CF6', paddingLeft: '12px' }}>
                <div style={{ fontSize: '12px', color: '#A78BFA', fontWeight: 600 }}>
                  Turn {h.turn} Command: "{h.action}"
                </div>
                <div style={{ fontSize: '13px', color: '#F3F4F6', marginTop: '4px', lineHeight: 1.5 }}>
                  📻 <em>{h.radioReport}</em>
                </div>
                {h.physicsDebrief && (
                  <div style={{ fontSize: '12px', color: '#9CA3AF', marginTop: '6px', background: '#1F2937', padding: '8px 12px', borderRadius: '8px' }}>
                    💡 <strong>Engineering Analysis:</strong> {h.physicsDebrief}
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Mission Outcome Banner */}
      {outcome && (
        <div style={{
          background: outcome === 'survived' ? 'rgba(16, 185, 129, 0.15)' : 'rgba(239, 68, 68, 0.15)',
          border: `1.5px solid ${outcome === 'survived' ? '#10B981' : '#EF4444'}`,
          borderRadius: '16px',
          padding: '24px',
          textAlign: 'center',
          marginBottom: '24px'
        }}>
          <div style={{
            display: 'inline-flex',
            padding: '12px',
            borderRadius: '50%',
            background: outcome === 'survived' ? 'rgba(16, 185, 129, 0.2)' : 'rgba(239, 68, 68, 0.2)',
            color: outcome === 'survived' ? '#10B981' : '#EF4444',
            marginBottom: '10px'
          }}>
            {outcome === 'survived' ? <Award size={36} /> : <Skull size={36} />}
          </div>
          <h3 style={{ fontSize: '22px', fontWeight: 800, color: '#F9FAFB' }}>
            {outcome === 'survived' ? '🏆 Crisis Stabilized: Plant Hero!' : '💥 Catastrophic Failure: Unit Scrambled!'}
          </h3>
          <p style={{ color: '#D1D5DB', fontSize: '14px', maxWidth: '600px', margin: '8px auto 16px' }}>
            {outcome === 'survived' 
              ? `You made sound thermo-hydraulic decisions. Plant integrity finished at ${plantHealth}% and equipment damage was minimized.`
              : `The equipment exceeded mechanical safety limits. Total emergency shutdown executed with major overhaul required.`}
          </p>
          <div style={{ display: 'flex', justifyContent: 'center', gap: '12px' }}>
            <button
              onClick={handleReset}
              style={{
                background: '#8B5CF6',
                border: 'none',
                color: '#fff',
                padding: '10px 20px',
                borderRadius: '8px',
                fontSize: '13px',
                fontWeight: 600,
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: '6px'
              }}
            >
              <RefreshCw size={15} /> Play Again
            </button>
            <button
              onClick={() => onOpenAskWithPrompt(`Explain in detail the failure dynamics of ${selectedScenario.title} and why the proper engineering standard procedure is critical.`)}
              style={{
                background: 'rgba(255, 255, 255, 0.1)',
                border: '1px solid #4B5563',
                color: '#F9FAFB',
                padding: '10px 20px',
                borderRadius: '8px',
                fontSize: '13px',
                fontWeight: 600,
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: '6px'
              }}
            >
              <Sparkles size={15} color="#A78BFA" /> Deep-Dive Physics with EngiMind
            </button>
          </div>
        </div>
      )}

      {/* Available Tactical Actions (If not game over) */}
      {!outcome && (
        <div style={{ background: '#1F2937', border: '1px solid #374151', borderRadius: '16px', padding: '20px' }}>
          <h4 style={{ fontSize: '15px', fontWeight: 600, color: '#F3F4F6', marginBottom: '14px', display: 'flex', alignItems: 'center', gap: '8px' }}>
            <Zap size={16} color="#F59E0B" /> Select Your Command (Turn {turn} of 3)
          </h4>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '12px', marginBottom: '16px' }}>
            {selectedScenario.initialOptions.map((opt) => (
              <button
                key={opt.id}
                disabled={isSimulating}
                onClick={() => handleAction(opt.label)}
                style={{
                  background: 'rgba(31, 41, 55, 0.8)',
                  border: '1px solid #4B5563',
                  borderRadius: '10px',
                  padding: '14px',
                  color: '#E5E7EB',
                  fontSize: '13px',
                  fontWeight: 500,
                  textAlign: 'left',
                  cursor: isSimulating ? 'not-allowed' : 'pointer',
                  opacity: isSimulating ? 0.6 : 1,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  gap: '8px',
                  lineHeight: 1.4,
                  transition: 'all 0.2s'
                }}
              >
                <span>{opt.label}</span>
                <ArrowRight size={16} color="#8B5CF6" />
              </button>
            ))}
          </div>

          {/* Custom Action Input */}
          <form
            onSubmit={(e) => {
              e.preventDefault();
              if (customAction.trim()) handleAction(customAction.trim());
            }}
            style={{ display: 'flex', gap: '10px' }}
          >
            <input
              type="text"
              placeholder="Or type a custom engineering command (e.g. 'Ramp auxiliary oil pump, throttle bypass to 40%')..."
              value={customAction}
              onChange={(e) => setCustomAction(e.target.value)}
              disabled={isSimulating}
              style={{
                flex: 1,
                background: '#111827',
                border: '1px solid #4B5563',
                borderRadius: '8px',
                padding: '10px 14px',
                color: '#fff',
                fontSize: '13px'
              }}
            />
            <button
              type="submit"
              disabled={isSimulating || !customAction.trim()}
              style={{
                background: '#8B5CF6',
                border: 'none',
                color: '#fff',
                padding: '10px 18px',
                borderRadius: '8px',
                fontSize: '13px',
                fontWeight: 600,
                cursor: isSimulating || !customAction.trim() ? 'not-allowed' : 'pointer',
                opacity: isSimulating || !customAction.trim() ? 0.5 : 1,
                display: 'flex',
                alignItems: 'center',
                gap: '6px'
              }}
            >
              {isSimulating ? <RefreshCw className="spin" size={15} /> : <Send size={15} />} Dispatch
            </button>
          </form>
        </div>
      )}
    </div>
  );
}
