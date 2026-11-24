import React, { useState, useRef } from 'react';
import { 
  Brain, Home, MessageSquare, Activity, BookOpen, Layers, FileText, 
  HelpCircle, ClipboardList, BarChart2, Bookmark, UploadCloud, Scan, 
  Mic, Camera, Search, Bell, ArrowRight, Settings, AlertCircle, 
  CheckCircle, Thermometer, Info, Quote, Rocket, Send, Paperclip,
  Volume2, VolumeX
} from 'lucide-react';
import './index.css';
import { callOpenRouter, getStoredKey, setStoredKey } from './openRouterApi';

function App() {
  const [isProcessing, setIsProcessing] = useState(false);
  const [activeView, setActiveView] = useState('dashboard');
  
  // Ask EngiMind state
  const [prompt, setPrompt] = useState('');
  const [file, setFile] = useState(null);
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
        return entered.trim();
      }
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
    } catch (err) {
      alert(`AI Core error: ${err.message}`);
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
    } catch (err) {
      alert(`AI Core error: ${err.message}`);
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
      const queryPrompt = prompt.trim() || "Please analyze this attached document/image in the context of industrial engineering.";
      const responseText = await callOpenRouter({ prompt: queryPrompt, file });
      setAnalysisResult(responseText);
    } catch (err) {
      setAnalysisResult(`Error generating response: ${err.message}`);
    } finally {
      setIsProcessing(false);
    }
  };

  const handleFileChange = (e) => {
    if (e.target.files && e.target.files[0]) {
      setFile(e.target.files[0]);
    }
  };

  const clearFile = (e) => {
    e.preventDefault();
    e.stopPropagation();
    setFile(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

  const notImplemented = () => {
    alert("This feature is currently in development.");
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
                <img src="https://i.pravatar.cc/150?img=11" alt="User" />
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
                <div className="feature-card" onClick={() => setActiveView('ask')}>
                  <div className="fc-icon green"><BookOpen /></div>
                  <h3>Study Resources</h3>
                  <p>Access notes, PDFs, videos and important links.</p>
                  <div className="fc-arrow"><ArrowRight size={14} /></div>
                </div>
                <div className="feature-card" onClick={() => setActiveView('ask')}>
                  <div className="fc-icon blue"><HelpCircle /></div>
                  <h3>Quiz Generator</h3>
                  <p>Generate quizzes and test your knowledge.</p>
                  <div className="fc-arrow"><ArrowRight size={14} /></div>
                </div>
                <div className="feature-card" onClick={() => setActiveView('ask')}>
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
                    <div className="card-title">AI Insights Overview</div>
                    <span style={{fontSize:'12px', color:'#9CA3AF'}}>This Week ⌄</span>
                  </div>
                  <div className="insights-chart">
                    <div className="chart-path" style={{clipPath: 'polygon(0% 100%, 15% 80%, 30% 90%, 45% 50%, 60% 70%, 75% 20%, 90% 60%, 100% 50%, 100% 100%, 0% 100%)', background:'rgba(124, 58, 237, 0.2)'}}></div>
                    <div className="chart-path" style={{clipPath: 'polygon(0% 100%, 15% 80%, 30% 90%, 45% 50%, 60% 70%, 75% 20%, 90% 60%, 100% 50%, 100% 100%)', height:'1px', opacity:1}}></div>
                    <div style={{position:'absolute', top:'10%', left:'65%', background:'#1F2937', padding:'8px', borderRadius:'8px', fontSize:'11px', border:'1px solid #374151'}}>
                      <span style={{color:'#9CA3AF'}}>AI Confidence</span><br/><strong style={{fontSize:'14px', color:'#10B981'}}>87%</strong><br/>High
                    </div>
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
                    <div className="rec-item">
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
                    
                    <div className="rec-item">
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

                    <div className="rec-item">
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
                  <div className="view-all" onClick={notImplemented}>View All Recommendations <ArrowRight size={14} /></div>
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

              <div className="quote-card">
                <Quote size={24} className="quote-icon" />
                <div className="quote-text">
                  Engineering problems don't need more paperwork. They need intelligence that understands context.
                </div>
                <div className="quote-author">— EngiMind</div>
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
                    placeholder="E.g., What are the common causes of high vibration in a centrifugal pump?"
                    value={prompt}
                    onChange={(e) => setPrompt(e.target.value)}
                  />
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
                  <button 
                    className="btn-speak" 
                    onClick={() => handleSpeakResult(analysisResult)}
                    title={isSpeaking ? "Stop speaking" : "Read aloud"}
                  >
                    {isSpeaking ? <VolumeX size={18} /> : <Volume2 size={18} />}
                  </button>
                </div>
                <div className="ask-result-content">
                  {analysisResult}
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

        {['study-resources', 'syllabus-explorer', 'documents', 'quiz-generator', 'analytics', 'bookmarks'].includes(activeView) && (
          <div className="ask-content" style={{ alignItems: 'center', justifyContent: 'center', height: '100%' }}>
            <div className="ask-form-container" style={{ textAlign: 'center', maxWidth: '500px', width: '100%' }}>
              <div style={{ marginBottom: '24px', opacity: 0.8 }}>
                {activeView === 'study-resources' && <BookOpen size={48} color="#10B981" style={{ margin: '0 auto' }} />}
                {activeView === 'syllabus-explorer' && <Layers size={48} color="#F59E0B" style={{ margin: '0 auto' }} />}
                {activeView === 'documents' && <FileText size={48} color="#3B82F6" style={{ margin: '0 auto' }} />}
                {activeView === 'quiz-generator' && <HelpCircle size={48} color="#8B5CF6" style={{ margin: '0 auto' }} />}
                {activeView === 'analytics' && <BarChart2 size={48} color="#8B5CF6" style={{ margin: '0 auto' }} />}
                {activeView === 'bookmarks' && <Bookmark size={48} color="#F59E0B" style={{ margin: '0 auto' }} />}
              </div>
              <h2 style={{ textTransform: 'capitalize' }}>{activeView.replace('-', ' ')}</h2>
              <p style={{ color: 'var(--text-muted)', marginTop: '12px', marginBottom: '32px' }}>
                Your engineering {activeView.replace('-', ' ')} will be displayed here. The backend synchronization module for this view is currently being deployed.
              </p>
              <button className="btn-ask" style={{ margin: '0 auto' }} onClick={() => setActiveView('ask')}>
                Go to Ask EngiMind <ArrowRight size={14} />
              </button>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}

export default App;
