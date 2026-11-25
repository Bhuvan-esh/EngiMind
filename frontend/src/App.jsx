import React, { useState, useRef } from 'react';
import { 
  Brain, Home, MessageSquare, Activity, BookOpen, Layers, FileText, 
  HelpCircle, ClipboardList, BarChart2, Bookmark, UploadCloud, Scan, 
  Mic, Camera, Search, Bell, ArrowRight, Settings, AlertCircle, 
  CheckCircle, Thermometer, Info, Quote, Rocket, Send, Paperclip,
  Volume2, VolumeX, User, Sparkles, Copy, Flame, ShieldAlert,
  ChevronLeft, ChevronRight, Box, Crosshair, Eye
} from 'lucide-react';
import './index.css';
import { callOpenRouter, getStoredKey, setStoredKey } from './openRouterApi';
import TelemetryChart from './components/TelemetryChart';
import MarkdownRenderer from './components/MarkdownRenderer';
import QuizView from './components/QuizView';
import DocumentsView from './components/DocumentsView';
import CatastropheRoom from './components/CatastropheRoom';
import Turbine3DViewer from './components/Turbine3DViewer';
import ImageDigitalTwin from './components/ImageDigitalTwin';
import CVModelInspector from './components/CVModelInspector';
import Toast from './components/Toast';

function App() {
  const [hasEntered, setHasEntered] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [activeView, setActiveView] = useState('dashboard');
  const [toast, setToast] = useState(null);

  const quotes = [
    { text: "Scientists discover the world that exists; engineers create the world that never was.", author: "Theodore von Kármán" },
    { text: "Engineering problems don't need more paperwork. They need intelligence that understands context.", author: "EngiMind AI" },
    { text: "The present is theirs; the future, for which I really worked, is mine.", author: "Nikola Tesla" },
    { text: "Strive for perfection in everything you do. Take the best that exists and make it better.", author: "Sir Henry Royce" },
    { text: "Without data, you're just another person with an opinion.", author: "W. Edwards Deming" },
    { text: "To the engineer falls the job of clothing the bare bones of science with life, comfort, and hope.", author: "Herbert Hoover" }
  ];
  const [quoteIdx, setQuoteIdx] = useState(0);

  const showToast = (message, type = 'info') => {
    setToast({ message, type });
  };
  
  // Ask EngiMind state
  const [prompt, setPrompt] = useState('');
  const [file, setFile] = useState(null);
  const [imagePreviewUrl, setImagePreviewUrl] = useState(null);
  const [imageThermalData, setImageThermalData] = useState(null);
  const [persona, setPersona] = useState('eli5'); // 'eli5' | 'academic' | 'veteran'
  const [analysisResult, setAnalysisResult] = useState('');
  const [isListening, setIsListening] = useState(false);
  const [isSpeaking, setIsSpeaking] = useState(false);
  
  const fileInputRef = useRef(null);

  const [diagnosisResult, setDiagnosisResult] = useState(null);
  const [reportResult, setReportResult] = useState(null);

  const ensureApiKey = () => {
    let currentKey = getStoredKey();
    if (!currentKey) {
      const entered = window.prompt("Please enter your OpenRouter API Key (get one free at openrouter.ai/keys):");
      if (entered && entered.trim()) {
        setStoredKey(entered.trim());
        showToast("OpenRouter key saved successfully", "success");
        return entered.trim();
      }
      showToast("API key is required to query AI models", "error");
      return null;
    }
    return currentKey;
  };

  const triggerDiagnosisUI = async () => {
    setActiveView('fault-diagnosis');
    if (!ensureApiKey()) return;
    setIsProcessing(true);
    try {
      const diagPrompt = `You are an AI diagnostic assistant for an industrial plant.
Generate a random but realistic machine fault diagnosis.
Return ONLY a JSON object with the following keys:
- "issue": a short string describing the mechanical or electrical issue.
- "severity": a string, either "Low", "Medium", or "High".
- "recommendation": a short string with a recommended corrective action.
Ensure it is valid JSON and nothing else.`;
      const data = await callOpenRouter({ prompt: diagPrompt, jsonMode: true });
      setDiagnosisResult(data);
      showToast("Machine diagnostics completed", "success");
    } catch (err) {
      showToast(`AI Core error: ${err.message}`, "error");
    } finally {
      setIsProcessing(false);
    }
  };

  const triggerReportUI = async () => {
    setActiveView('maintenance-logs');
    if (!ensureApiKey()) return;
    setIsProcessing(true);
    try {
      const repPrompt = `You are an AI reporting system for an industrial plant.
Generate a random but realistic machine maintenance report summary.
Return ONLY a JSON object with the following keys:
- "machine": a string indicating a machine name or ID (e.g., "Turbine #3B").
- "status": a string, e.g., "Critical", "Warning", "Normal", "Offline".
- "action": a string describing the required action.
Ensure it is valid JSON and nothing else.`;
      const data = await callOpenRouter({ prompt: repPrompt, jsonMode: true });
      setReportResult(data);
      showToast("Maintenance log generated", "success");
    } catch (err) {
      showToast(`AI Core error: ${err.message}`, "error");
    } finally {
      setIsProcessing(false);
    }
  };

  const handleAnalyze = async (e) => {
    e.preventDefault();
    if (!prompt && !file) return;
    if (!ensureApiKey()) return;
    
    setIsProcessing(true);
    setAnalysisResult('');

    try {
      const personaPrefixes = {
        eli5: "Explain this using intuitive everyday real-world analogies (like bicycle pumps, teapots, or garden hoses). Avoid overly dry jargon unless explained simply. Keep it engaging, clear, and fun for a first-year engineering student.\n\n",
        academic: "Provide an academically rigorous, exam-ready engineering derivation. State the governing physics equations, Navier-Stokes/Euler/thermodynamic laws, boundary conditions, and dimensionless numbers where applicable.\n\n",
        veteran: "Adopt the persona of a grumpy, salty 30-year industrial plant maintenance veteran. Speak directly from dirty-hands field experience. Warn against rookie mistakes, mention wrench clearances, torque patterns, PPE, and safety, and deliver pragmatic, humorous advice.\n\n"
      };
      const basePrompt = prompt.trim() || "Please analyze this attached document/image in the context of industrial engineering.";
      const queryPrompt = `${personaPrefixes[persona] || ""}${basePrompt}`;
      const responseText = await callOpenRouter({ prompt: queryPrompt, file });
      setAnalysisResult(responseText);
      showToast("Analysis complete", "success");
    } catch (err) {
      setAnalysisResult(`Error generating response: ${err.message}`);
      showToast(`Error: ${err.message}`, "error");
    } finally {
      setIsProcessing(false);
    }
  };

  const processPastedFile = (pastedFile) => {
    if (pastedFile && pastedFile.type.startsWith('image/')) {
      setFile(pastedFile);
      const url = URL.createObjectURL(pastedFile);
      setImagePreviewUrl(url);
      setActiveView('ask');
      setImageThermalData({
        component: pastedFile.name ? pastedFile.name.replace(/\.[^/.]+$/, "") : "Inspected Component",
        peakTemp: 88.2,
        avgTemp: 64.5,
        ambientTemp: 25.0,
        heatFlux: '1,420 W/m²',
        thermalExpansion: '+0.038 mm',
        status: 'Elevated Warning',
        hotspotZone: 'Bearing Race & Impeller Seal Collar',
        isoSeverity: 'Class II - Zone B (Maintenance Required)'
      });
      showToast("Pasted image: 3D Digital Twin & Thermal Telemetry Generated!", "success");
    }
  };

  const handleFileChange = (e) => {
    if (e.target.files && e.target.files[0]) {
      const f = e.target.files[0];
      setFile(f);
      if (f.type.startsWith('image/')) {
        setImagePreviewUrl(URL.createObjectURL(f));
        setImageThermalData({
          component: f.name.replace(/\.[^/.]+$/, ""),
          peakTemp: 86.4,
          avgTemp: 63.8,
          ambientTemp: 24.5,
          heatFlux: '1,380 W/m²',
          thermalExpansion: '+0.035 mm',
          status: 'Elevated Warning',
          hotspotZone: 'Drive Bearing & Dynamic Seal Interface',
          isoSeverity: 'Class II - Zone B (Acceptable/Watch)'
        });
        showToast(`Image loaded: 3D Digital Twin & Thermal Telemetry Generated!`, "success");
      } else {
        setImagePreviewUrl(null);
        setImageThermalData(null);
        showToast(`Attached ${f.name}`, "info");
      }
    }
  };

  const clearFile = (e) => {
    e?.preventDefault?.();
    e?.stopPropagation?.();
    setFile(null);
    setImagePreviewUrl(null);
    setImageThermalData(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
    showToast("Attachment removed", "info");
  };

  const notImplemented = () => {
    showToast("This feature is scheduled for the upcoming update.", "info");
  };

  const handleVoiceRecord = () => {
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SpeechRecognition) {
      alert("Your browser does not support Speech Recognition.");
      return;
    }

    const recognition = new SpeechRecognition();
    recognition.continuous = false;
    recognition.interimResults = false;
    recognition.lang = 'en-US';

    recognition.onstart = () => {
      setIsListening(true);
    };

    recognition.onresult = (event) => {
      const transcript = event.results[0][0].transcript;
      setPrompt(prev => prev ? `${prev} ${transcript}` : transcript);
    };

    recognition.onerror = (event) => {
      console.error("Speech recognition error", event.error);
      setIsListening(false);
    };

    recognition.onend = () => {
      setIsListening(false);
    };

    recognition.start();
  };

  const handleSpeakResult = (text) => {
    if (!window.speechSynthesis) {
      alert("Your browser does not support Speech Synthesis.");
      return;
    }
    
    if (isSpeaking) {
      window.speechSynthesis.cancel();
      setIsSpeaking(false);
      return;
    }

    const utterance = new SpeechSynthesisUtterance(text);
    utterance.onend = () => setIsSpeaking(false);
    setIsSpeaking(true);
    window.speechSynthesis.speak(utterance);
  };

  const triggerVoiceQuery = () => {
    setActiveView('ask');
    setTimeout(() => {
      handleVoiceRecord();
    }, 150);
  };

  const triggerUploadData = () => {
    setActiveView('ask');
    setTimeout(() => {
      if (fileInputRef.current) {
        fileInputRef.current.click();
      }
    }, 150);
  };

  React.useEffect(() => {
    return () => {
      if (window.speechSynthesis) {
        window.speechSynthesis.cancel();
      }
    };
  }, []);

  React.useEffect(() => {
    const handleGlobalPaste = (e) => {
      if (e.clipboardData && e.clipboardData.files && e.clipboardData.files.length > 0) {
        const pasted = e.clipboardData.files[0];
        if (pasted.type.startsWith('image/')) {
          processPastedFile(pasted);
        }
      }
    };
    window.addEventListener('paste', handleGlobalPaste);
    return () => window.removeEventListener('paste', handleGlobalPaste);
  }, []);

  React.useEffect(() => {
    const handleKeyDown = (e) => {
      if (!hasEntered && (e.key === 'Enter' || e.key === ' ')) {
        setHasEntered(true);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [hasEntered]);

  if (!hasEntered) {
    return (
      <div style={{
        position: 'fixed',
        inset: 0,
        background: '#0B0F17',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 99999,
        padding: '24px',
        color: '#F9FAFB',
        userSelect: 'none'
      }}>
        {/* Glow ambient background */}
        <div style={{
          position: 'absolute',
          width: '650px',
          height: '650px',
          background: 'radial-gradient(circle, rgba(139, 92, 246, 0.18) 0%, rgba(11, 15, 23, 0) 70%)',
          pointerEvents: 'none'
        }} />

        <div style={{ textAlign: 'center', marginBottom: '20px', zIndex: 10 }}>
          <div style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: '8px',
            background: 'rgba(139, 92, 246, 0.15)',
            border: '1px solid rgba(139, 92, 246, 0.35)',
            color: '#C4B5FD',
            padding: '6px 16px',
            borderRadius: '20px',
            fontSize: '12px',
            fontWeight: 600,
            marginBottom: '12px',
            letterSpacing: '0.5px'
          }}>
            <Box size={14} /> 3D DIGITAL TWIN • TELEMETRY CORE
          </div>
          <h1 style={{ fontSize: '38px', fontWeight: 800, color: '#F9FAFB', letterSpacing: '-0.5px', marginBottom: '6px' }}>
            Engi<span style={{ color: '#8B5CF6' }}>Mind</span>
          </h1>
          <p style={{ color: '#9CA3AF', fontSize: '15px', maxWidth: '560px', margin: '0 auto', lineHeight: 1.5 }}>
            AI Engineering Companion • Industrial Diagnostics, Real-Time Telemetry & 3D Digital Twin.
          </p>
        </div>

        {/* 3D Model Centerpiece */}
        <div style={{ width: '100%', maxWidth: '680px', marginBottom: '24px', zIndex: 10 }}>
          <Turbine3DViewer />
        </div>

        {/* Enter Button */}
        <div style={{ zIndex: 10, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '8px' }}>
          <button
            type="button"
            onClick={() => {
              setHasEntered(true);
              showToast("Welcome to EngiMind Workspace", "success");
            }}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '10px',
              background: 'linear-gradient(135deg, #8B5CF6 0%, #6D28D9 100%)',
              border: 'none',
              color: '#fff',
              padding: '14px 38px',
              borderRadius: '12px',
              fontSize: '16px',
              fontWeight: 700,
              cursor: 'pointer',
              boxShadow: '0 8px 30px rgba(139, 92, 246, 0.45)'
            }}
          >
            Enter Workspace <ArrowRight size={20} />
          </button>
          <span style={{ fontSize: '12px', color: '#6B7280' }}>
            Click above or press Enter to launch
          </span>
        </div>
      </div>
    );
  }

  return (
    <div className="app-container">
      {/* Sidebar */}
      <aside className="sidebar">
        <div className="brand">
          <Brain className="brand-icon" />
          <div>
            <h1>EngiMind</h1>
            <p>AI Engineering Assistant</p>
          </div>
        </div>

        <nav className="nav-menu">
          <div className={`nav-item ${activeView === 'dashboard' ? 'active' : ''}`} onClick={() => setActiveView('dashboard')}>
            <Home size={18} /> Dashboard
          </div>
          <div className={`nav-item ${activeView === 'ask' ? 'active' : ''}`} onClick={() => setActiveView('ask')}>
            <MessageSquare size={18} /> Ask EngiMind
          </div>
          <div className={`nav-item ${activeView === 'fault-diagnosis' ? 'active' : ''}`} onClick={triggerDiagnosisUI}><Activity size={18} /> Fault Diagnosis</div>
          <div className={`nav-item ${activeView === 'study-resources' ? 'active' : ''}`} onClick={() => setActiveView('study-resources')}><BookOpen size={18} /> Study Resources</div>
          <div className={`nav-item ${activeView === 'syllabus-explorer' ? 'active' : ''}`} onClick={() => setActiveView('syllabus-explorer')}><Layers size={18} /> Syllabus Explorer</div>
          <div className={`nav-item ${activeView === 'documents' ? 'active' : ''}`} onClick={() => setActiveView('documents')}><FileText size={18} /> Documents</div>
          <div className={`nav-item ${activeView === 'quiz-generator' ? 'active' : ''}`} onClick={() => setActiveView('quiz-generator')}><HelpCircle size={18} /> Quiz Generator</div>
          <div className={`nav-item ${activeView === 'catastrophe-room' ? 'active' : ''}`} onClick={() => setActiveView('catastrophe-room')}><ShieldAlert size={18} color="#EF4444" /> Catastrophe Room 🚨</div>
          <div className={`nav-item ${activeView === 'cad-inspector' ? 'active' : ''}`} onClick={() => setActiveView('cad-inspector')}><Box size={18} color="#38BDF8" /> 3D Image CAD Twin 📐</div>
          <div className={`nav-item ${activeView === 'maintenance-logs' ? 'active' : ''}`} onClick={triggerReportUI}><ClipboardList size={18} /> Maintenance Logs</div>
          <div className={`nav-item ${activeView === 'analytics' ? 'active' : ''}`} onClick={() => setActiveView('analytics')}><BarChart2 size={18} /> Analytics</div>
          <div className={`nav-item ${activeView === 'bookmarks' ? 'active' : ''}`} onClick={() => setActiveView('bookmarks')}><Bookmark size={18} /> Bookmarks</div>
        </nav>

        <div className="nav-section-title">Quick Access</div>
        <div className="quick-access-grid">
          <div className="qa-card" onClick={triggerUploadData}><UploadCloud size={20} color="#8B5CF6" /> <span>Upload Data</span></div>
          <div className="qa-card" onClick={triggerUploadData}><Scan size={20} color="#10B981" /> <span>Scan Image</span></div>
          <div className="qa-card" onClick={triggerVoiceQuery}><Mic size={20} color="#F59E0B" /> <span>Voice Query</span></div>
          <div className="qa-card" onClick={triggerUploadData}><Camera size={20} color="#3B82F6" /> <span>Camera Input</span></div>
        </div>

        <div className="upgrade-card">
          <h3><Rocket size={16} color="#8B5CF6" /> Upgrade to Pro</h3>
          <p>Unlock advanced AI model, unlimited uploads and smart insights.</p>
          <button className="btn-upgrade" onClick={notImplemented}>Upgrade Now <ArrowRight size={14} /></button>
        </div>
      </aside>

      {/* Main Area */}
      <main className="main-area">
        {/* Top Header */}
        <header className="top-header">
          <div className="greeting">
            <h2>Good morning, Engineer! 👋</h2>
            <h1>How can <span>EngiMind</span> help you today?</h1>
          </div>
          
          <div className="header-actions">
            <div className="search-bar">
              <Search size={18} color="#9CA3AF" />
              <input type="text" placeholder="Search topics, machines, notes..." />
              <span className="shortcut-key">⌘ K</span>
            </div>
            
            <button 
              className="btn-api-key"
              onClick={() => setHasEntered(false)}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '6px',
                background: 'rgba(139, 92, 246, 0.12)',
                border: '1px solid rgba(139, 92, 246, 0.35)',
                color: '#C4B5FD',
                padding: '8px 12px',
                borderRadius: '8px',
                fontSize: '13px',
                fontWeight: '500',
                cursor: 'pointer'
              }}
              title="Return to 3D Digital Twin Intro"
            >
              <Box size={15} /> 3D View
            </button>
            <button 
              className="btn-api-key"
              onClick={() => {
                const k = window.prompt("Enter or Update OpenRouter API Key (sk-or-v1-...):", getStoredKey());
                if (k !== null) {
                  setStoredKey(k.trim());
                  alert(k.trim() ? "API Key saved successfully!" : "API Key cleared.");
                }
              }}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '6px',
                background: 'rgba(139, 92, 246, 0.15)',
                border: '1px solid rgba(139, 92, 246, 0.4)',
                color: '#A78BFA',
                padding: '8px 14px',
                borderRadius: '8px',
                fontSize: '13px',
                fontWeight: '500',
                cursor: 'pointer'
              }}
              title="Configure OpenRouter API Key"
            >
              <Settings size={15} /> {getStoredKey() ? 'OpenRouter Active' : 'Set API Key'}
            </button>
            <div className="notification-bell">
              <Bell size={20} />
              <div className="notification-badge">3</div>
            </div>
            
            <div className="user-profile">
              <div className="avatar">
                <User size={18} color="#9CA3AF" />
                <div className="status-dot"></div>
              </div>
            </div>
          </div>
        </header>

        {/* Dynamic Content Area */}
        {activeView === 'dashboard' && (
          <div className="dashboard-content">
            <div className="center-column">
              
              {/* Hero Banner */}
              <div className="hero-banner">
                <div className="hero-content">
                  <div className="hero-subtitle">
                    <Brain size={14} /> Your AI Engineering Companion
                  </div>
                  <div className="hero-title">
                    “AI should not replace engineers —<br />it should amplify engineering decisions.”
                  </div>
                  <div className="hero-description">
                    Turning fragmented engineering data into actionable industrial intelligence.
                  </div>
                  <div className="hero-features">
                    <div className="hero-feature">
                      <div className="hf-icon"><Search size={20} /></div>
                      <div className="hf-text">
                        <strong>Understand</strong>
                        <span>Complex Issues</span>
                      </div>
                    </div>
                    <div className="hero-feature">
                      <div className="hf-icon"><Activity size={20} /></div>
                      <div className="hf-text">
                        <strong>Analyze</strong>
                        <span>Root Causes</span>
                      </div>
                    </div>
                    <div className="hero-feature">
                      <div className="hf-icon"><BarChart2 size={20} /></div>
                      <div className="hf-text">
                        <strong>Recommend</strong>
                        <span>Smart Solutions</span>
                      </div>
                    </div>
                  </div>
                  <button className="btn-ask" onClick={() => setActiveView('ask')}>
                    Ask EngiMind
                    <div className="arrow-circle"><ArrowRight size={14} /></div>
                  </button>
                </div>
                <div className="hero-illustration">
                  <img src="/robot.png" alt="EngiMind Robot" />
                </div>
              </div>

              {/* Features Row */}
              <div className="features-row">
                <div className="feature-card" onClick={() => setActiveView('ask')}>
                  <div className="fc-icon purple"><MessageSquare /></div>
                  <h3>Ask EngiMind</h3>
                  <p>Get instant answers to your engineering questions.</p>
                  <div className="fc-arrow"><ArrowRight size={14} /></div>
                </div>
                <div className="feature-card" onClick={triggerDiagnosisUI}>
                  <div className="fc-icon red"><Activity /></div>
                  <h3>Fault Diagnosis</h3>
                  <p>Detect, analyze and find root causes of equipment failures.</p>
                  <div className="fc-arrow"><ArrowRight size={14} /></div>
                </div>
                <div className="feature-card" onClick={() => setActiveView('study-resources')}>
                  <div className="fc-icon green"><BookOpen /></div>
                  <h3>Study Resources</h3>
                  <p>Access notes, PDFs, videos and important links.</p>
                  <div className="fc-arrow"><ArrowRight size={14} /></div>
                </div>
                <div className="feature-card" onClick={() => setActiveView('quiz-generator')}>
                  <div className="fc-icon blue"><HelpCircle /></div>
                  <h3>Quiz Generator</h3>
                  <p>Generate quizzes and test your knowledge.</p>
                  <div className="fc-arrow"><ArrowRight size={14} /></div>
                </div>
                <div className="feature-card" onClick={() => setActiveView('syllabus-explorer')}>
                  <div className="fc-icon orange"><Layers /></div>
                  <h3>Syllabus Explorer</h3>
                  <p>Explore subjects and course curriculum.</p>
                  <div className="fc-arrow"><ArrowRight size={14} /></div>
                </div>
              </div>

              {/* Bottom Grid: Insights & Recommendations */}
              <div className="bottom-grid">
                <div className="card">
                  <div className="card-header">
                    <div className="card-title">Plant Telemetry & Health</div>
                  </div>
                  <div style={{ padding: '4px 6px 12px' }}>
                    <TelemetryChart />
                  </div>
                  <div className="stats-grid">
                    <div className="stat-item">
                      <div className="stat-icon" style={{color:'#8B5CF6'}}><BarChart2 size={16}/></div>
                      <div className="stat-info">
                        <span className="stat-label">Analyses</span>
                        <span className="stat-value">124 <span className="stat-trend up">↑ 18%</span></span>
                      </div>
                    </div>
                    <div className="stat-item">
                      <div className="stat-icon" style={{color:'#EF4444'}}><AlertCircle size={16}/></div>
                      <div className="stat-info">
                        <span className="stat-label">Issues</span>
                        <span className="stat-value">23 <span className="stat-trend down">↓ 8%</span></span>
                      </div>
                    </div>
                    <div className="stat-item">
                      <div className="stat-icon" style={{color:'#10B981'}}><CheckCircle size={16}/></div>
                      <div className="stat-info">
                        <span className="stat-label">Accuracy</span>
                        <span className="stat-value">94% <span className="stat-trend up">↑ 12%</span></span>
                      </div>
                    </div>
                    <div className="stat-item">
                      <div className="stat-icon" style={{color:'#3B82F6'}}><Search size={16}/></div>
                      <div className="stat-info">
                        <span className="stat-label">Time Saved</span>
                        <span className="stat-value">18.6h <span className="stat-trend up">↑ 20%</span></span>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="card">
                  <div className="card-header">
                    <div className="card-title">Top Recommendations</div>
                  </div>
                  <div className="recommendations-list">
                    <div 
                      className="rec-item"
                      style={{ cursor: 'pointer' }}
                      onClick={() => {
                        setPrompt("What is the root cause and standard procedure to replace a damaged DE bearing on industrial Motor #12A displaying excessive vibration?");
                        setActiveView('ask');
                        showToast("Loaded Motor #12A action into Ask EngiMind", "info");
                      }}
                    >
                      <div className="rec-icon" style={{background:'rgba(139,92,246,0.1)', color:'#A78BFA'}}><Settings size={20}/></div>
                      <div className="rec-content">
                        <div className="rec-header">
                          <span className="rec-title">Replace Bearing — Motor #12A</span>
                          <span className="badge high">High Priority</span>
                        </div>
                        <div className="rec-desc">High vibration detected in DE bearing. Replace within 48 hours.</div>
                      </div>
                      <ArrowRight size={16} color="#6B7280" />
                    </div>
                    
                    <div 
                      className="rec-item"
                      style={{ cursor: 'pointer' }}
                      onClick={() => {
                        setPrompt("How should I perform precision laser shaft alignment for centrifugal Pump #3B showing misalignment wear?");
                        setActiveView('ask');
                        showToast("Loaded Pump #3B action into Ask EngiMind", "info");
                      }}
                    >
                      <div className="rec-icon" style={{background:'rgba(245,158,11,0.1)', color:'#FCD34D'}}><Search size={20}/></div>
                      <div className="rec-content">
                        <div className="rec-header">
                          <span className="rec-title">Check Alignment — Pump #3B</span>
                          <span className="badge medium">Medium</span>
                        </div>
                        <div className="rec-desc">Misalignment detected. Realign to prevent further wear.</div>
                      </div>
                      <ArrowRight size={16} color="#6B7280" />
                    </div>

                    <div 
                      className="rec-item"
                      style={{ cursor: 'pointer' }}
                      onClick={() => {
                        setPrompt("What are the thermal limits and common causes of temperature elevation in industrial reciprocating Compressor #7?");
                        setActiveView('ask');
                        showToast("Loaded Compressor #7 action into Ask EngiMind", "info");
                      }}
                    >
                      <div className="rec-icon" style={{background:'rgba(59,130,246,0.1)', color:'#93C5FD'}}><ClipboardList size={20}/></div>
                      <div className="rec-content">
                        <div className="rec-header">
                          <span className="rec-title">Monitor Temperature — Compressor #7</span>
                          <span className="badge low">Low</span>
                        </div>
                        <div className="rec-desc">Temperature is slightly above normal range. Continue monitoring.</div>
                      </div>
                      <ArrowRight size={16} color="#6B7280" />
                    </div>
                  </div>
                  <div className="view-all" onClick={() => { setActiveView('fault-diagnosis'); showToast("Opened Fault Diagnosis", "info"); }}>
                    View All Diagnostics <ArrowRight size={14} />
                  </div>
                </div>
              </div>

            </div>

            <div className="right-column">
              
              <div className="card">
                <div className="card-header">
                  <div className="card-title">System Health</div>
                </div>
                <div className="health-circle">
                  <h2>92%</h2>
                  <p>Optimal</p>
                </div>
                <div className="health-desc">
                  All systems are operating within normal parameters.
                </div>
                <div className="view-all" onClick={notImplemented}>View Details <ArrowRight size={14} /></div>
              </div>

              <div className="card">
                <div className="card-header">
                  <div className="card-title">Recent Activity</div>
                </div>
                <div className="activity-list">
                  <div className="activity-item">
                    <Activity size={16} className="act-icon" style={{color:'#EF4444'}} />
                    <div className="act-content">
                      <div className="act-title">High Vibration Detected</div>
                      <div className="act-sub">Motor #12A</div>
                    </div>
                    <div className="act-time">2 min ago</div>
                  </div>
                  <div className="activity-item">
                    <Settings size={16} className="act-icon" style={{color:'#F59E0B'}} />
                    <div className="act-content">
                      <div className="act-title">Bearing Fault Prediction</div>
                      <div className="act-sub">Pump #38</div>
                    </div>
                    <div className="act-time">15 min ago</div>
                  </div>
                  <div className="activity-item">
                    <Thermometer size={16} className="act-icon" style={{color:'#EF4444'}} />
                    <div className="act-content">
                      <div className="act-title">Thermal Anomaly</div>
                      <div className="act-sub">Compressor #7</div>
                    </div>
                    <div className="act-time">1 hr ago</div>
                  </div>
                  <div className="activity-item">
                    <CheckCircle size={16} className="act-icon" style={{color:'#10B981'}} />
                    <div className="act-content">
                      <div className="act-title">Maintenance Log Added</div>
                      <div className="act-sub">Turbine #5</div>
                    </div>
                    <div className="act-time">2 hr ago</div>
                  </div>
                </div>
                <div className="view-all" onClick={notImplemented}>View All Activity <ArrowRight size={14} /></div>
              </div>

              {/* Quotes Below Recent Activity */}
              <div className="quote-card" style={{ position: 'relative' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <Quote size={20} className="quote-icon" />
                    <span style={{ fontSize: '11px', color: '#9CA3AF', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.5px' }}>Engineering Wisdom</span>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                    <button
                      type="button"
                      onClick={() => setQuoteIdx((prev) => (prev - 1 + quotes.length) % quotes.length)}
                      style={{ background: 'rgba(55, 65, 81, 0.4)', border: '1px solid #4B5563', borderRadius: '4px', color: '#9CA3AF', cursor: 'pointer', padding: '2px 4px', display: 'flex' }}
                      title="Previous Quote"
                    >
                      <ChevronLeft size={14} />
                    </button>
                    <span style={{ fontSize: '11px', color: '#9CA3AF', fontWeight: 600, padding: '0 4px' }}>{quoteIdx + 1}/{quotes.length}</span>
                    <button
                      type="button"
                      onClick={() => setQuoteIdx((prev) => (prev + 1) % quotes.length)}
                      style={{ background: 'rgba(55, 65, 81, 0.4)', border: '1px solid #4B5563', borderRadius: '4px', color: '#9CA3AF', cursor: 'pointer', padding: '2px 4px', display: 'flex' }}
                      title="Next Quote"
                    >
                      <ChevronRight size={14} />
                    </button>
                  </div>
                </div>
                <div className="quote-text" style={{ minHeight: '52px', fontStyle: 'italic', lineHeight: 1.45, transition: 'all 0.3s' }}>
                  "{quotes[quoteIdx].text}"
                </div>
                <div className="quote-author" style={{ marginTop: '8px', color: '#A78BFA', fontWeight: 600 }}>
                  — {quotes[quoteIdx].author}
                </div>
              </div>

            </div>
          </div>
        )}

        {activeView === 'ask' && (
          <div className="ask-content">
            <div className="ask-form-container">
              <h2>Ask EngiMind</h2>
              <p style={{color: '#9CA3AF', fontSize: '14px', marginBottom: '8px'}}>Describe your engineering problem, paste logs, or upload documents and images for analysis.</p>
              
              <form onSubmit={handleAnalyze} style={{display: 'flex', flexDirection: 'column', gap: '16px'}}>
                {/* Persona Dial */}
                <div style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  background: 'rgba(31, 41, 55, 0.6)',
                  border: '1px solid #374151',
                  borderRadius: '10px',
                  padding: '8px 12px',
                  flexWrap: 'wrap',
                  gap: '8px'
                }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '12px', color: '#9CA3AF', fontWeight: 600 }}>
                    <Sparkles size={14} color="#A78BFA" /> Response Persona:
                  </div>
                  <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
                    <button
                      type="button"
                      onClick={() => { setPersona('eli5'); showToast("Switched to ELI5 Analogies mode", "info"); }}
                      style={{
                        padding: '4px 10px',
                        borderRadius: '6px',
                        fontSize: '11px',
                        fontWeight: 600,
                        cursor: 'pointer',
                        background: persona === 'eli5' ? 'rgba(245, 158, 11, 0.25)' : 'transparent',
                        border: `1px solid ${persona === 'eli5' ? '#F59E0B' : '#374151'}`,
                        color: persona === 'eli5' ? '#FCD34D' : '#9CA3AF'
                      }}
                      title="Explains using everyday analogies and intuitive physical models"
                    >
                      🐣 ELI5 Analogies
                    </button>
                    <button
                      type="button"
                      onClick={() => { setPersona('academic'); showToast("Switched to Exam Derivations mode", "info"); }}
                      style={{
                        padding: '4px 10px',
                        borderRadius: '6px',
                        fontSize: '11px',
                        fontWeight: 600,
                        cursor: 'pointer',
                        background: persona === 'academic' ? 'rgba(59, 130, 246, 0.25)' : 'transparent',
                        border: `1px solid ${persona === 'academic' ? '#3B82F6' : '#374151'}`,
                        color: persona === 'academic' ? '#93C5FD' : '#9CA3AF'
                      }}
                      title="Academically rigorous, formulas, governing equations, and derivations"
                    >
                      🎓 Exam Derivations
                    </button>
                    <button
                      type="button"
                      onClick={() => { setPersona('veteran'); showToast("Switched to Grumpy Plant Veteran mode", "info"); }}
                      style={{
                        padding: '4px 10px',
                        borderRadius: '6px',
                        fontSize: '11px',
                        fontWeight: 600,
                        cursor: 'pointer',
                        background: persona === 'veteran' ? 'rgba(16, 185, 129, 0.25)' : 'transparent',
                        border: `1px solid ${persona === 'veteran' ? '#10B981' : '#374151'}`,
                        color: persona === 'veteran' ? '#6EE7B7' : '#9CA3AF'
                      }}
                      title="Blunt, salty 30-year industrial maintenance veteran advice"
                    >
                      🛠️ Grumpy Plant Veteran
                    </button>
                  </div>
                </div>

                <div className="ask-input-group">
                  <div style={{display: 'flex', justifyContent: 'space-between', alignItems: 'center'}}>
                    <label htmlFor="prompt">Your Query</label>
                    <button 
                      type="button"
                      className={`btn-mic ${isListening ? 'listening' : ''}`} 
                      onClick={handleVoiceRecord}
                      title="Speak your query"
                    >
                      <Mic size={16} /> {isListening ? 'Listening...' : 'Voice Query'}
                    </button>
                  </div>
                  <textarea 
                    id="prompt"
                    className="ask-textarea"
                    placeholder="E.g., What are the common causes of high vibration in a centrifugal pump? (Or paste an image anywhere with Ctrl+V)"
                    value={prompt}
                    onChange={(e) => setPrompt(e.target.value)}
                    onPaste={(e) => {
                      if (e.clipboardData && e.clipboardData.files && e.clipboardData.files.length > 0) {
                        const p = e.clipboardData.files[0];
                        if (p.type.startsWith('image/')) {
                          processPastedFile(p);
                        }
                      }
                    }}
                  />

                  {/* Student Fun Presets */}
                  <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', marginTop: '8px' }}>
                    <button
                      type="button"
                      onClick={() => setPrompt("🔥 Roast my engineering design: Check for severe stress concentration factors, impossible machining features, tool clearance failures, and assembly headaches. Tell me why my shop technician will throw a wrench at me.")}
                      style={{ background: 'rgba(239, 68, 68, 0.12)', border: '1px solid rgba(239, 68, 68, 0.3)', color: '#FCA5A5', padding: '4px 10px', borderRadius: '16px', fontSize: '11px', cursor: 'pointer' }}
                    >
                      🔥 Roast My CAD / Design
                    </button>
                    <button
                      type="button"
                      onClick={() => setPrompt("🚀 Sanity check my homework calculation: I calculated a motor shaft speed of 180,000 RPM delivering 4,500 kW for a small 50mm centrifugal water pump. Does this make physical sense or will it vaporize the laboratory?")}
                      style={{ background: 'rgba(59, 130, 246, 0.12)', border: '1px solid rgba(59, 130, 246, 0.3)', color: '#93C5FD', padding: '4px 10px', borderRadius: '16px', fontSize: '11px', cursor: 'pointer' }}
                    >
                      🚀 Sanity Check My Calculation
                    </button>
                    <button
                      type="button"
                      onClick={() => setPrompt("🎧 Diagnose this machine sound: High-pitched whistling followed by rhythmic metallic thumping at 1x RPM in a centrifugal slurry pump. What is failing and how do I verify it?")}
                      style={{ background: 'rgba(139, 92, 246, 0.12)', border: '1px solid rgba(139, 92, 246, 0.3)', color: '#C4B5FD', padding: '4px 10px', borderRadius: '16px', fontSize: '11px', cursor: 'pointer' }}
                    >
                      🎧 Diagnose Weird Machine Sound
                    </button>
                  </div>
                </div>
                
                <div className="ask-input-group">
                  <label>Attachments (Optional)</label>
                  <div className="ask-file-upload" onClick={() => fileInputRef.current?.click()}>
                    <Paperclip size={18} color="#9CA3AF" />
                    <span className="ask-file-label">
                      {file ? file.name : "Click to attach a document, image, or log file..."}
                    </span>
                    {file && (
                      <button onClick={clearFile} style={{background: 'transparent', border: 'none', color: '#EF4444', cursor: 'pointer', padding: '4px'}}>
                        Clear
                      </button>
                    )}
                  </div>
                  <input 
                    type="file" 
                    className="ask-file-input" 
                    ref={fileInputRef}
                    onChange={handleFileChange}
                    accept="image/*,.pdf,.txt,.doc,.docx,.csv"
                  />
                </div>

                {/* 3D Problem Image Model with CV Gesture Orbit & Zoom */}
                {imagePreviewUrl && file && file.type?.startsWith('image/') && (
                  <div style={{ marginBottom: '16px' }}>
                    <CVModelInspector 
                      problemImage={imagePreviewUrl} 
                      problemImageName={file.name} 
                    />
                  </div>
                )}
                
                <div className="ask-actions">
                  <button type="submit" className="ask-submit-btn" disabled={isProcessing || (!prompt && !file)}>
                    {isProcessing ? (
                      <>Processing <span className="loading-dots">...</span></>
                    ) : (
                      <>Analyze <Send size={16} /></>
                    )}
                  </button>
                </div>
              </form>
            </div>
            
            {analysisResult && (
              <div className="ask-result-container">
                <div className="ask-result-header">
                  <div style={{display: 'flex', alignItems: 'center', gap: '12px'}}>
                    <Brain className="ask-result-icon" size={24} />
                    <div className="ask-result-title">EngiMind Analysis</div>
                  </div>
                  <div style={{ display: 'flex', gap: '8px' }}>
                    <button 
                      className="btn-speak" 
                      onClick={() => {
                        navigator.clipboard.writeText(analysisResult);
                        showToast("Copied to clipboard", "success");
                      }}
                      title="Copy to clipboard"
                    >
                      <Copy size={18} />
                    </button>
                    <button 
                      className="btn-speak" 
                      onClick={() => handleSpeakResult(analysisResult)}
                      title={isSpeaking ? "Stop speaking" : "Read aloud"}
                    >
                      {isSpeaking ? <VolumeX size={18} /> : <Volume2 size={18} />}
                    </button>
                  </div>
                </div>
                <div className="ask-result-content">
                  <MarkdownRenderer content={analysisResult} />
                </div>
              </div>
            )}
          </div>
        )}

        {activeView === 'fault-diagnosis' && (
          <div className="ask-content" style={{ alignItems: 'center' }}>
            <div className="ask-form-container" style={{ textAlign: 'center', maxWidth: '600px', width: '100%', marginTop: '40px' }}>
              <Activity size={48} color="#EF4444" style={{ margin: '0 auto 16px' }} />
              <h2>AI Fault Diagnosis</h2>
              <p style={{ color: 'var(--text-muted)', marginBottom: '24px' }}>
                Run deep learning diagnostics on your connected machinery to detect anomalies and find root causes.
              </p>
              
              <button className="ask-submit-btn" style={{ margin: '0 auto 24px' }} onClick={triggerDiagnosisUI} disabled={isProcessing}>
                {isProcessing ? 'Scanning Systems...' : 'Run Diagnostics Scan'}
              </button>

              {diagnosisResult && (
                <div style={{ textAlign: 'left', background: 'rgba(0,0,0,0.2)', padding: '24px', borderRadius: '12px', borderLeft: `4px solid ${diagnosisResult.severity === 'High' ? '#EF4444' : '#F59E0B'}` }}>
                  <h3 style={{ marginBottom: '16px', color: '#fff' }}>Diagnosis Complete</h3>
                  <div style={{ marginBottom: '12px' }}>
                    <span style={{ color: 'var(--text-muted)', fontSize: '13px' }}>Detected Issue</span>
                    <div style={{ fontSize: '16px', fontWeight: '500', color: '#fff' }}>{diagnosisResult.issue}</div>
                  </div>
                  <div style={{ marginBottom: '12px' }}>
                    <span style={{ color: 'var(--text-muted)', fontSize: '13px' }}>Severity Level</span>
                    <div><span className={`badge ${diagnosisResult.severity.toLowerCase()}`}>{diagnosisResult.severity}</span></div>
                  </div>
                  <div>
                    <span style={{ color: 'var(--text-muted)', fontSize: '13px' }}>AI Recommendation</span>
                    <div style={{ fontSize: '15px', color: 'var(--success)' }}>{diagnosisResult.recommendation}</div>
                  </div>
                </div>
              )}
            </div>
          </div>
        )}

        {activeView === 'maintenance-logs' && (
          <div className="ask-content" style={{ alignItems: 'center' }}>
            <div className="ask-form-container" style={{ textAlign: 'center', maxWidth: '600px', width: '100%', marginTop: '40px' }}>
              <ClipboardList size={48} color="#10B981" style={{ margin: '0 auto 16px' }} />
              <h2>Maintenance Logs</h2>
              <p style={{ color: 'var(--text-muted)', marginBottom: '24px' }}>
                Generate automated maintenance reports based on the latest equipment data.
              </p>
              
              <button className="ask-submit-btn" style={{ margin: '0 auto 24px' }} onClick={triggerReportUI} disabled={isProcessing}>
                {isProcessing ? 'Generating...' : 'Generate Latest Report'}
              </button>

              {reportResult && (
                <div style={{ textAlign: 'left', background: 'rgba(0,0,0,0.2)', padding: '24px', borderRadius: '12px', borderLeft: '4px solid #10B981' }}>
                  <h3 style={{ marginBottom: '16px', color: '#fff' }}>Generated Report</h3>
                  <div style={{ marginBottom: '12px' }}>
                    <span style={{ color: 'var(--text-muted)', fontSize: '13px' }}>Machine Identifier</span>
                    <div style={{ fontSize: '16px', fontWeight: '500', color: '#fff' }}>{reportResult.machine}</div>
                  </div>
                  <div style={{ marginBottom: '12px' }}>
                    <span style={{ color: 'var(--text-muted)', fontSize: '13px' }}>Current Status</span>
                    <div><span className="badge high" style={{ background: 'rgba(16,185,129,0.1)', color: '#6EE7B7' }}>{reportResult.status}</span></div>
                  </div>
                  <div>
                    <span style={{ color: 'var(--text-muted)', fontSize: '13px' }}>Required Action</span>
                    <div style={{ fontSize: '15px', color: 'var(--text-main)' }}>{reportResult.action}</div>
                  </div>
                </div>
              )}
            </div>
          </div>
        )}

        {activeView === 'quiz-generator' && (
          <QuizView onShowToast={showToast} />
        )}

        {activeView === 'catastrophe-room' && (
          <CatastropheRoom 
            onOpenAskWithPrompt={(query) => {
              setPrompt(query);
              setActiveView('ask');
              showToast("Loaded incident physics into Ask EngiMind", "info");
            }} 
            showToast={showToast} 
          />
        )}

        {activeView === 'cad-inspector' && (
          <div style={{ maxWidth: '1200px', margin: '0 auto', width: '100%', padding: '20px 16px' }}>
            <CVModelInspector problemImage={imagePreviewUrl} problemImageName={file?.name} />
          </div>
        )}

        {(activeView === 'documents' || activeView === 'study-resources') && (
          <DocumentsView onAnalyzeDoc={(query) => {
            setPrompt(query);
            setActiveView('ask');
            showToast("Loaded query into Ask EngiMind", "info");
          }} />
        )}

        {activeView === 'syllabus-explorer' && (
          <div style={{ maxWidth: '850px', margin: '0 auto', width: '100%', padding: '24px' }}>
            <div style={{ textAlign: 'center', marginBottom: '28px' }}>
              <div style={{ display: 'inline-flex', padding: '12px', background: 'rgba(245, 158, 11, 0.1)', borderRadius: '16px', color: '#F59E0B', marginBottom: '12px' }}>
                <Layers size={36} />
              </div>
              <h2 style={{ fontSize: '24px', fontWeight: 700, color: '#F9FAFB' }}>Engineering Curriculum & Syllabus Explorer</h2>
              <p style={{ color: '#9CA3AF', fontSize: '14px', marginTop: '6px' }}>
                Explore fundamental core engineering subjects and analyze syllabus modules with AI.
              </p>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(380px, 1fr))', gap: '16px' }}>
              {[
                { title: 'Machine Design & Stress Analysis', code: 'ME-401', topics: 'Mohr Circle, Fatigue Failure (S-N Curve), Shaft & Key Sizing, Bearing Selection', color: '#8B5CF6' },
                { title: 'Applied Thermodynamics & Heat Transfer', code: 'ME-302', topics: 'Rankine & Brayton Cycles, Heat Exchanger LMTD/NTU, Carnot Efficiency', color: '#EF4444' },
                { title: 'Fluid Mechanics & Hydraulic Machinery', code: 'ME-305', topics: 'Navier-Stokes, Bernoulli Equation, Boundary Layer Theory, Pump Affinity Laws', color: '#3B82F6' },
                { title: 'Industrial Control & Mechatronics', code: 'EE-410', topics: 'PID Controller Tuning, PLC Ladder Logic, Sensor Interfacing, Actuator Feedback', color: '#10B981' }
              ].map((mod, i) => (
                <div key={i} style={{ background: '#1F2937', border: '1px solid #374151', borderRadius: '14px', padding: '20px', display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
                  <div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
                      <span style={{ fontSize: '11px', fontWeight: 700, color: mod.color, background: `${mod.color}20`, padding: '3px 8px', borderRadius: '4px' }}>{mod.code}</span>
                      <span style={{ fontSize: '11px', color: '#9CA3AF' }}>Semester V/VI</span>
                    </div>
                    <h3 style={{ fontSize: '16px', fontWeight: 600, color: '#F3F4F6', marginBottom: '8px' }}>{mod.title}</h3>
                    <p style={{ fontSize: '13px', color: '#9CA3AF', marginBottom: '16px', lineHeight: '1.5' }}>
                      <strong style={{ color: '#D1D5DB' }}>Core Topics: </strong>{mod.topics}
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => {
                      setPrompt(`Please provide a comprehensive study guide and key formulas for "${mod.title}" focusing on ${mod.topics}.`);
                      setActiveView('ask');
                      showToast(`Opened study guide for ${mod.code}`, "info");
                    }}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      gap: '6px',
                      background: 'rgba(245, 158, 11, 0.15)',
                      border: '1px solid rgba(245, 158, 11, 0.4)',
                      color: '#FCD34D',
                      padding: '8px 12px',
                      borderRadius: '8px',
                      fontSize: '12px',
                      fontWeight: 600,
                      cursor: 'pointer'
                    }}
                  >
                    Study Module with EngiMind <ArrowRight size={13} />
                  </button>
                </div>
              ))}
            </div>
          </div>
        )}

        {(activeView === 'analytics' || activeView === 'bookmarks') && (
          <div style={{ maxWidth: '850px', margin: '0 auto', width: '100%', padding: '24px' }}>
            <div style={{ textAlign: 'center', marginBottom: '28px' }}>
              <div style={{ display: 'inline-flex', padding: '12px', background: 'rgba(139, 92, 246, 0.1)', borderRadius: '16px', color: '#8B5CF6', marginBottom: '12px' }}>
                <BarChart2 size={36} />
              </div>
              <h2 style={{ fontSize: '24px', fontWeight: 700, color: '#F9FAFB' }}>Plant Analytics & Asset Registry</h2>
              <p style={{ color: '#9CA3AF', fontSize: '14px', marginTop: '6px' }}>
                Fleet health overview, vibration spectral trends, and active equipment monitors.
              </p>
            </div>

            <div style={{ background: '#1F2937', border: '1px solid #374151', borderRadius: '16px', padding: '24px', marginBottom: '20px' }}>
              <h3 style={{ fontSize: '16px', fontWeight: 600, color: '#F3F4F6', marginBottom: '16px' }}>24-Hour Telemetry Multi-Sensor Monitor</h3>
              <TelemetryChart />
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '16px' }}>
              {[
                { title: 'Fleet Availability', val: '98.4%', trend: '↑ 1.2%', color: '#10B981' },
                { title: 'Mean Time Between Failures (MTBF)', val: '1,420 hrs', trend: '↑ 85 hrs', color: '#3B82F6' },
                { title: 'Preventive Action Completion', val: '92.1%', trend: '↑ 4.3%', color: '#8B5CF6' }
              ].map((m, idx) => (
                <div key={idx} style={{ background: '#1F2937', border: '1px solid #374151', borderRadius: '12px', padding: '16px', textAlign: 'center' }}>
                  <div style={{ fontSize: '12px', color: '#9CA3AF', marginBottom: '6px' }}>{m.title}</div>
                  <div style={{ fontSize: '20px', fontWeight: 700, color: '#F9FAFB', marginBottom: '4px' }}>{m.val}</div>
                  <div style={{ fontSize: '11px', color: m.color, fontWeight: 600 }}>{m.trend}</div>
                </div>
              ))}
            </div>
          </div>
        )}
      </main>

      <Toast 
        message={toast?.message} 
        type={toast?.type} 
        onClose={() => setToast(null)} 
      />
    </div>
  );
}

export default App;
