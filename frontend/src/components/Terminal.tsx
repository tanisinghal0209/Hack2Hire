import { useState, useEffect } from 'react';
import { AlertTriangle, Mic, MicOff, ChevronDown, ChevronUp, User, Award, Activity } from 'lucide-react';

interface TerminalProps {
  question: string;
  questionType: 'technical' | 'behavioral' | 'scenario' | 'conceptual';
  currentQuestionIndex: number;
  maxQuestions: number;
  difficulty: number;
  timeLimit: number;
  onSubmitAnswer: (answer: string, timeSpent: number) => Promise<void>;
  loading: boolean;
  history: any[];
  candidateName: string;
  candidateAvatar: string;
  resumeData: any;
}

export const Terminal: React.FC<TerminalProps> = ({
  question,
  questionType,
  currentQuestionIndex,
  maxQuestions,
  difficulty,
  timeLimit,
  onSubmitAnswer,
  loading,
  history,
  candidateName,
  candidateAvatar,
  resumeData
}) => {
  const [answer, setAnswer] = useState('');
  const [timeLeft, setTimeLeft] = useState(timeLimit);
  const [typedQuestion, setTypedQuestion] = useState('');
  const [isVoiceActive, setIsVoiceActive] = useState(false);
  const [expandedHistoryIdx, setExpandedHistoryIdx] = useState<number | null>(null);
  
  // Timer calculations
  const isTimerCritical = timeLeft <= 10;
  const timerRadius = 40;
  const circumference = 2 * Math.PI * timerRadius;
  const strokeDashoffset = circumference - (timeLeft / timeLimit) * circumference;

  // Track total time elapsed
  const [timeElapsed, setTimeElapsed] = useState(0);
  useEffect(() => {
    if (loading) return;
    const interval = setInterval(() => {
      setTimeElapsed(prev => prev + 1);
    }, 1000);
    return () => clearInterval(interval);
  }, [loading]);

  // Run typewriter effect on question change
  useEffect(() => {
    let idx = 0;
    setTypedQuestion('');
    const interval = setInterval(() => {
      idx++;
      setTypedQuestion(question.slice(0, idx));
      if (idx >= question.length) {
        clearInterval(interval);
      }
    }, 12);
    return () => clearInterval(interval);
  }, [question]);


  // Reset timer on question change
  useEffect(() => {
    setTimeLeft(timeLimit);
    setAnswer('');
  }, [question, timeLimit]);

  // Countdown timer
  useEffect(() => {
    if (loading) return;
    if (timeLeft <= 0) {
      handleFormSubmit();
      return;
    }

    const timer = setTimeout(() => {
      setTimeLeft(prev => prev - 1);
    }, 1000);

    return () => clearTimeout(timer);
  }, [timeLeft, loading]);

  // Voice Recognition System via Web Speech API
  useEffect(() => {
    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!SpeechRecognition) {
      if (isVoiceActive) {
        alert('Web Speech API is not supported in this browser. Please use Chrome or Safari.');
        setIsVoiceActive(false);
      }
      return;
    }

    let recognition: any = null;

    if (isVoiceActive) {
      recognition = new SpeechRecognition();
      recognition.continuous = true;
      recognition.interimResults = true;
      recognition.lang = 'en-US';

      recognition.onresult = (event: any) => {
        let finalTranscript = '';
        for (let i = event.resultIndex; i < event.results.length; ++i) {
          if (event.results[i].isFinal) {
            finalTranscript += event.results[i][0].transcript;
          }
        }
        if (finalTranscript) {
          setAnswer(prev => {
            const trimmed = prev.trim();
            return trimmed ? `${trimmed} ${finalTranscript}` : finalTranscript;
          });
        }
      };

      recognition.onerror = (event: any) => {
        console.error('Speech recognition error:', event.error);
        if (event.error === 'not-allowed') {
          alert('Microphone access denied. Please grant microphone permissions in your browser settings.');
          setIsVoiceActive(false);
        }
      };

      recognition.onend = () => {
        if (isVoiceActive && recognition) {
          try {
            recognition.start();
          } catch (e) {
            console.error('Failed to restart recognition:', e);
          }
        }
      };

      try {
        recognition.start();
      } catch (e) {
        console.error('Failed to start recognition:', e);
      }
    }

    return () => {
      if (recognition) {
        recognition.onend = null;
        try {
          recognition.stop();
        } catch (e) {
          console.error('Failed to stop recognition:', e);
        }
      }
    };
  }, [isVoiceActive]);


  const handleFormSubmit = () => {
    if (loading) return;
    const timeSpent = timeLimit - timeLeft;
    onSubmitAnswer(answer, timeSpent);
  };

  const getDifficultyBadge = (lvl: number) => {
    if (lvl <= 2) return { text: 'EASY', color: '#00FF66' };
    if (lvl === 3) return { text: 'MEDIUM', color: 'var(--accent-amber)' };
    return { text: 'HARD', color: 'var(--red-alert)' };
  };

  const badge = getDifficultyBadge(difficulty);

  // Compute average score
  const avgScore = history.length > 0 
    ? (history.reduce((sum, h) => sum + h.score, 0) / history.length) * 10
    : 0;

  // Build Trajectory sparkline path coordinates
  const renderSparkline = () => {
    const points = [3, ...history.map(h => h.difficulty)];
    if (points.length < 2) {
      return <line x1="10" y1="25" x2="210" y2="25" stroke="rgba(0, 212, 255, 0.2)" strokeWidth="2" strokeDasharray="4" />;
    }
    const width = 200;
    const height = 50;
    const padding = 10;
    const step = (width - padding * 2) / (points.length - 1);
    
    // Map difficulty (1-5) to SVG height (50 to 0)
    const coordinates = points.map((p, idx) => {
      const x = padding + idx * step;
      const y = height - padding - ((p - 1) / 4) * (height - padding * 2);
      return { x, y };
    });

    const pathData = `M ${coordinates.map(c => `${c.x} ${c.y}`).join(' L ')}`;

    return (
      <>
        {/* Fill underneath sparkline */}
        <path 
          d={`${pathData} L ${coordinates[coordinates.length - 1].x} ${height} L ${coordinates[0].x} ${height} Z`} 
          fill="url(#sparkline-grad)" 
          opacity="0.1" 
        />
        {/* Glow behind line */}
        <path d={pathData} fill="none" stroke="var(--accent-blue)" strokeWidth="4" opacity="0.3" />
        {/* Main sparkline path */}
        <path d={pathData} fill="none" stroke="var(--accent-blue)" strokeWidth="2" />
        {/* Dot on last coordinate */}
        {coordinates.map((c, i) => (
          <circle 
            key={i} 
            cx={c.x} 
            cy={c.y} 
            r={i === coordinates.length - 1 ? 4 : 2} 
            fill={i === coordinates.length - 1 ? 'var(--accent-blue)' : 'var(--text-muted)'} 
          />
        ))}
      </>
    );
  };

  // Determine alert banners based on last performance
  const getLastPerformanceAlert = () => {
    if (history.length === 0) return null;
    const last = history[history.length - 1];
    if (last.score >= 8.0) {
      return { text: '🔥 Strong answer — increasing difficulty', color: '#00FF66', bg: 'rgba(0,255,102,0.08)' };
    }
    if (last.score <= 4.5) {
      return { text: '⚠️ Performance dropping — stabilizing difficulty', color: 'var(--accent-amber)', bg: 'rgba(255,184,0,0.08)' };
    }
    return null;
  };

  // Simple CSS wave visualizer bars
  const WaveformVisualizer = () => {
    const barsLeft = [20, 45, 30, 60, 40, 80, 50, 65, 35, 55];
    const barsRight = [55, 35, 65, 50, 80, 40, 60, 30, 45, 20];

    return (
      <div style={styles.voicePanel}>
        <div className="data-font" style={styles.voiceBadge}>
          <Mic size={12} color="var(--accent-blue)" style={{ marginRight: '6px' }} />
          <span>VOICE: ACTIVE</span>
        </div>
        <div style={styles.visualizerRow}>
          {/* Left wave bars */}
          <div style={styles.waveContainer}>
            {barsLeft.map((height, i) => (
              <div 
                key={`l-${i}`} 
                style={{ 
                  ...styles.waveBar, 
                  height: `${height}%`, 
                  backgroundColor: 'var(--accent-blue)',
                  animation: `waveGlow 0.8s ease-in-out infinite alternate ${i * 0.08}s`
                }} 
              />
            ))}
          </div>

          {/* Glowing Microphone Button */}
          <button 
            style={styles.micCircle}
            onClick={() => setIsVoiceActive(false)}
            title="Disable microphone"
          >
            <Mic size={22} color="var(--bg-primary)" />
          </button>

          {/* Right wave bars */}
          <div style={styles.waveContainer}>
            {barsRight.map((height, i) => (
              <div 
                key={`r-${i}`} 
                style={{ 
                  ...styles.waveBar, 
                  height: `${height}%`, 
                  backgroundColor: 'var(--accent-amber)',
                  animation: `waveGlow 0.8s ease-in-out infinite alternate ${i * 0.08}s`
                }} 
              />
            ))}
          </div>
        </div>
        <div style={{ fontSize: '10px', color: 'var(--accent-amber)', fontFamily: 'var(--font-data)' }} className="pulse-warning">
          TRANSCRIPT PIPELINE RUNNING...
        </div>
      </div>
    );
  };

  const alertBanner = getLastPerformanceAlert();

  // Early termination warning
  const isTerminationThresholdCritical = history.length >= 2 && avgScore < 40;

  return (
    <div style={styles.dashboardContainer}>
      
      {/* LEFT PANEL (25% Width) */}
      <div style={styles.sidePanel}>
        {/* Candidate Info Card */}
        <div className="cyber-card" style={styles.card}>
          <div style={styles.panelHeader}>
            <User size={16} color="var(--accent-blue)" />
            <span>CANDIDATE DOSSIER</span>
          </div>
          
          <div style={styles.dossierHeader}>
            <img 
              src={candidateAvatar || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?q=80&w=150&auto=format&fit=crop'} 
              alt="Avatar" 
              style={styles.dossierAvatar} 
            />
            <div style={styles.dossierMeta}>
              <span style={{ fontSize: '9px', color: 'var(--text-muted)', fontWeight: 'bold' }}>CANDIDATE</span>
              <span className="data-font" style={styles.dossierName}>
                {candidateName}
              </span>
            </div>
          </div>

          <div style={styles.dossierContent}>
            <div style={styles.dossierItem}>
              <span style={styles.dossierLabel}>EST. EXP:</span>
              <span style={styles.dossierValue}>
                {resumeData?.experience_years !== undefined ? `${resumeData.experience_years} Years` : '3 Years'}
              </span>
            </div>
            <div style={styles.dossierItem}>
              <span style={styles.dossierLabel}>MATCH FACTOR:</span>
              <span className="data-font" style={{ ...styles.dossierValue, color: '#00FF66' }}>
                {resumeData?.role_match_score !== undefined ? `${resumeData.role_match_score}% Match` : '86% Match'}
              </span>
            </div>
          </div>
        </div>

        {/* Live Metrics Card */}
        <div className="cyber-card" style={styles.card}>
          <div style={styles.panelHeader}>
            <Activity size={16} color="var(--accent-amber)" />
            <span>SESSION Vitals</span>
          </div>
          <div style={styles.metricsBox}>
            <div style={styles.metricRow}>
              <span>QUESTIONS ASKED:</span>
              <span className="data-font" style={{ color: 'var(--accent-blue)' }}>
                {currentQuestionIndex} / {maxQuestions}
              </span>
            </div>
            <div style={styles.metricRow}>
              <span>AVG SCORE SO FAR:</span>
              <span className="data-font" style={{ color: avgScore >= 70 ? '#00FF66' : avgScore >= 40 ? 'var(--accent-amber)' : 'var(--red-alert)' }}>
                {avgScore.toFixed(0)}%
              </span>
            </div>
            <div style={styles.metricRow}>
              <span>DIFFICULTY BADGE:</span>
              <span 
                className="data-font" 
                style={{ 
                  padding: '2px 8px', 
                  backgroundColor: `${badge.color}15`, 
                  border: `1px solid ${badge.color}`, 
                  color: badge.color,
                  borderRadius: '3px',
                  fontSize: '11px'
                }}
              >
                {badge.text}
              </span>
            </div>
            <div style={styles.metricRow}>
              <span>TIME ELAPSED:</span>
              <span className="data-font" style={{ color: 'var(--text-white)' }}>
                {Math.floor(timeElapsed / 60)}m {timeElapsed % 60}s
              </span>
            </div>
            <div style={styles.metricRow}>
              <span>Q-BUFFER REMAINING:</span>
              <span className="data-font" style={{ color: 'var(--text-muted)' }}>
                {maxQuestions - currentQuestionIndex} Modules
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* CENTER PANEL (50% Width) */}
      <div style={styles.centerPanel}>
        <div className="cyber-card active" style={styles.terminalCard}>
          {/* Monospace Header */}
          <div style={styles.terminalHeader}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <span className="data-font" style={{ color: 'var(--accent-blue)' }}>Q{currentQuestionIndex.toString().padStart(2, '0')}</span>
              <span style={{ fontSize: '11px', color: 'var(--text-muted)', letterSpacing: '1px' }}>
                // MODULE: [{questionType.toUpperCase()}]
              </span>
            </div>

            {/* Countdown SVG Circle */}
            <div style={styles.timerWrapper}>
              <svg width="46" height="46" style={{ transform: 'rotate(-90deg)' }}>
                <circle 
                  cx="23" cy="23" r={timerRadius / 2} 
                  stroke="var(--bg-tertiary)" strokeWidth="3" fill="transparent" 
                />
                <circle 
                  cx="23" cy="23" r={timerRadius / 2} 
                  stroke={isTimerCritical ? 'var(--red-alert)' : 'var(--accent-blue)'} strokeWidth="3" fill="transparent"
                  strokeDasharray={circumference / 2}
                  strokeDashoffset={strokeDashoffset / 2}
                  style={{ transition: 'stroke-dashoffset 1s linear' }}
                  className={isTimerCritical ? 'pulse-warning' : ''}
                />
              </svg>
              <div 
                style={{ 
                  ...styles.timerText, 
                  color: isTimerCritical ? 'var(--red-alert)' : 'var(--accent-blue)' 
                }} 
                className={`data-font ${isTimerCritical ? 'pulse-warning' : ''}`}
              >
                {timeLeft}
              </div>
            </div>
          </div>

          {/* Terminal Screen Screen */}
          <div style={styles.screen}>
            <div style={styles.scanline} />
            <div className="data-font" style={styles.questionText}>
              {typedQuestion}
              {typedQuestion.length < question.length && <span className="cursor-blink">_</span>}
            </div>
          </div>

          {/* Voice Waveform Panel (renders when isVoiceActive is true) */}
          {isVoiceActive && <WaveformVisualizer />}

          {/* Text Area */}
          <div style={styles.inputArea}>
            <textarea
              className="cyber-input-mono"
              style={styles.textarea}
              placeholder="// Structure your response with technical rationale. You can use Markdown coding snippets..."
              value={answer}
              onChange={(e) => setAnswer(e.target.value)}
              disabled={loading}
            />
          </div>

          {/* Action Row */}
          <div style={styles.terminalFooter}>
            {/* Toggle voice button */}
            <button 
              className={`cyber-btn ${isVoiceActive ? 'amber' : ''}`}
              style={styles.iconBtn}
              onClick={() => setIsVoiceActive(!isVoiceActive)}
              title={isVoiceActive ? 'Disable Microphone' : 'Enable Microphone (Simulated)'}
            >
              {isVoiceActive ? <MicOff size={16} /> : <Mic size={16} />}
              <span style={{ fontSize: '11px', marginLeft: '6px' }}>
                {isVoiceActive ? 'VOICE: ACTIVE' : 'VOICE CAPTURE'}
              </span>
            </button>

            {isVoiceActive && (
              <span className="data-font pulse-warning" style={{ fontSize: '11px', color: 'var(--accent-amber)', marginLeft: '10px' }}>
                TRANSCRIPT PIPELINE RUNNING...
              </span>
            )}

            <button 
              className="cyber-btn"
              style={{ ...styles.submitBtn, marginLeft: 'auto' }}
              onClick={handleFormSubmit}
              disabled={!answer.trim() || loading}
            >
              {loading ? 'EVALUATING...' : 'SUBMIT ANSWER'}
            </button>
          </div>
        </div>

        {/* Collapsed history accordion */}
        {history.length > 0 && (
          <div style={styles.historyContainer}>
            <div style={styles.historyTitle} className="data-font">INTERVIEW HISTORY TRANSCRIPT</div>
            {history.map((item, idx) => {
              const isOpen = expandedHistoryIdx === idx;
              return (
                <div key={idx} className="cyber-card" style={styles.historyCard}>
                  <div 
                    style={styles.historyHeader} 
                    onClick={() => setExpandedHistoryIdx(isOpen ? null : idx)}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                      <span className="data-font" style={{ color: 'var(--accent-blue)' }}>Q{idx + 1}</span>
                      <span style={{ fontSize: '12px', fontWeight: 'bold' }}>[{item.questionType.toUpperCase()}]</span>
                      <span className="data-font" style={{ fontSize: '11px', color: '#00FF66' }}>SCORE: {item.score}/10</span>
                    </div>
                    {isOpen ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
                  </div>
                  
                  {isOpen && (
                    <div style={styles.historyBody}>
                      <div style={styles.historySection}>
                        <div style={styles.sectionLabel}>QUESTION:</div>
                        <div style={styles.sectionText}>{item.question}</div>
                      </div>
                      <div style={styles.historySection}>
                        <div style={styles.sectionLabel}>YOUR RESPONSE:</div>
                        <div style={{ ...styles.sectionText, color: '#00FF66', fontFamily: 'var(--font-data)' }}>
                          {item.answer}
                        </div>
                      </div>
                      <div style={styles.historySection}>
                        <div style={styles.sectionLabel}>EVALUATION REVIEW:</div>
                        <div style={{ ...styles.sectionText, color: 'var(--accent-amber)' }}>
                          {item.feedback}
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* RIGHT PANEL (25% Width) */}
      <div style={styles.sidePanel}>
        {/* Real-time score feed */}
        <div className="cyber-card" style={styles.card}>
          <div style={styles.panelHeader}>
            <Award size={16} color="var(--accent-blue)" />
            <span>REAL-TIME SCORING</span>
          </div>

          {history.length > 0 ? (
            <div style={styles.scoresList}>
              {history.slice(-3).map((item, idx) => (
                <div key={idx} style={styles.feedCard} className="cyber-card">
                  <div style={styles.feedHeader}>
                    <span style={{ color: 'var(--accent-blue)', fontWeight: 'bold' }}>Q{history.length - idx} EVALUATION</span>
                    <span className="data-font" style={{ color: '#00FF66' }}>{item.score * 10}%</span>
                  </div>
                  
                  {/* Accuracy, clarity, depth bars */}
                  <div style={styles.barContainer}>
                    <div style={styles.miniBarRow}>
                      <span>ACCURACY:</span>
                      <div style={styles.miniBarTrack}>
                        <div style={{ ...styles.miniBarFill, width: `${item.score * 10}%`, backgroundColor: 'var(--accent-blue)' }} />
                      </div>
                    </div>
                    <div style={styles.miniBarRow}>
                      <span>CLARITY:</span>
                      <div style={styles.miniBarTrack}>
                        <div style={{ ...styles.miniBarFill, width: `${(item.score * 1.05) * 10}%`, backgroundColor: '#00FF66' }} />
                      </div>
                    </div>
                    <div style={styles.miniBarRow}>
                      <span>DEPTH:</span>
                      <div style={styles.miniBarTrack}>
                        <div style={{ ...styles.miniBarFill, width: `${(item.score * 0.9) * 10}%`, backgroundColor: 'var(--accent-amber)' }} />
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div style={styles.emptyFeed} className="data-font">
              AWAITING METRICS CONVERGENCE...
            </div>
          )}
        </div>

        {/* Trajectory Sparkline */}
        <div className="cyber-card" style={styles.card}>
          <div style={styles.panelHeader}>
            <Activity size={16} color="var(--accent-blue)" />
            <span>DIFFICULTY TRAJECTORY</span>
          </div>
          <div style={styles.sparklineBox}>
            <svg width="100%" height="60" style={{ overflow: 'visible' }}>
              <defs>
                <linearGradient id="sparkline-grad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="var(--accent-blue)" stopOpacity="0.2"/>
                  <stop offset="100%" stopColor="var(--accent-blue)" stopOpacity="0"/>
                </linearGradient>
              </defs>
              {renderSparkline()}
            </svg>
            <div style={styles.sparklineLabels} className="data-font">
              <span>L1</span>
              <span>L2</span>
              <span>L3</span>
              <span>L4</span>
              <span>L5</span>
            </div>
          </div>
        </div>

        {/* Dynamic warning status banner */}
        {alertBanner && (
          <div 
            className="cyber-card pulse-warning" 
            style={{ 
              padding: '12px', 
              borderColor: alertBanner.color, 
              backgroundColor: alertBanner.bg, 
              color: alertBanner.color,
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              fontSize: '11px',
              fontWeight: 'bold',
              fontFamily: 'var(--font-data)'
            }}
          >
            <AlertTriangle size={16} />
            <span>{alertBanner.text}</span>
          </div>
        )}
      </div>

      {/* Critical Threshold Early Termination Modal */}
      {isTerminationThresholdCritical && (
        <div style={styles.modalOverlay}>
          <div className="cyber-card warning pulse-warning" style={styles.modalCard}>
            <ShieldAlertIcon size={42} color="var(--red-alert)" className="pulse-warning" />
            <h2 style={{ color: 'var(--red-alert)', fontFamily: 'var(--font-headings)', fontSize: '20px', marginTop: '10px' }}>
              CRITICAL SCORE THRESHOLD EXCEEDED
            </h2>
            <p style={{ fontSize: '13px', margin: '12px 0', color: 'var(--text-white)' }}>
              WARNING: Cumulative score metrics fell below 40% over consecutive modules. Enforcing emergency termination protocol on next submission.
            </p>
            <div style={styles.modalFooter}>
              <span className="data-font" style={{ color: 'var(--accent-amber)' }}>TERMINATION WARNING ARMED</span>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

// Simple inline component for warning alerts
const ShieldAlertIcon = ({ size, color, className }: { size: number, color: string, className?: string }) => (
  <svg 
    xmlns="http://www.w3.org/2000/svg" 
    width={size} height={size} 
    viewBox="0 0 24 24" 
    fill="none" 
    stroke={color} 
    strokeWidth="2" 
    strokeLinecap="round" 
    strokeLinejoin="round" 
    className={className}
  >
    <path d="M20 13c0 5-3.5 7.5-7.66 9.7a1 1 0 0 1-.68 0C7.5 20.5 4 18 4 13V6a1 1 0 0 1 .76-.97l8-2a1 1 0 0 1 .48 0l8 2A1 1 0 0 1 20 6v7z"/>
    <line x1="12" y1="9" x2="12" y2="13"/>
    <line x1="12" y1="17" x2="12.01" y2="17"/>
  </svg>
);

const styles: Record<string, React.CSSProperties> = {
  dashboardContainer: {
    display: 'grid',
    gridTemplateColumns: '25% 50% 25%',
    gap: '20px',
    flex: 1,
    minHeight: 0,
    overflow: 'hidden'
  },
  sidePanel: {
    display: 'flex',
    flexDirection: 'column',
    gap: '20px',
    minHeight: 0,
    overflowY: 'auto'
  },
  centerPanel: {
    display: 'flex',
    flexDirection: 'column',
    gap: '20px',
    minHeight: 0,
    overflowY: 'auto'
  },
  card: {
    padding: '16px',
    backgroundColor: '#0F0F13',
    borderColor: 'var(--border-cyber)',
    display: 'flex',
    flexDirection: 'column',
    gap: '12px'
  },
  panelHeader: {
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
    borderBottom: '1px solid var(--border-cyber)',
    paddingBottom: '8px',
    fontSize: '11px',
    fontWeight: 'bold',
    letterSpacing: '1px',
    color: 'var(--text-muted)',
    textTransform: 'uppercase'
  },
  dossierHeader: {
    display: 'flex',
    alignItems: 'center',
    gap: '12px',
    paddingBottom: '10px',
    borderBottom: '1px solid var(--border-cyber)',
    marginBottom: '8px'
  },
  dossierAvatar: {
    width: '45px',
    height: '45px',
    borderRadius: '4px',
    border: '1px solid var(--accent-blue)',
    objectFit: 'cover',
    backgroundColor: 'var(--bg-tertiary)'
  },
  dossierMeta: {
    display: 'flex',
    flexDirection: 'column',
    gap: '2px'
  },
  dossierName: {
    fontSize: '13px',
    fontWeight: 'bold',
    color: 'var(--text-white)'
  },
  dossierContent: {
    display: 'flex',
    flexDirection: 'column',
    gap: '8px',
    fontSize: '12px'
  },
  dossierItem: {
    display: 'flex',
    justifyContent: 'space-between'
  },
  dossierLabel: {
    color: 'var(--text-muted)',
    fontWeight: 'bold'
  },
  dossierValue: {
    color: 'var(--text-white)'
  },
  voicePanel: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    gap: '10px',
    padding: '20px',
    backgroundColor: '#0F0F13',
    borderBottom: '1px solid var(--border-cyber)',
    flexShrink: 0
  },
  voiceBadge: {
    display: 'flex',
    alignItems: 'center',
    fontSize: '11px',
    fontWeight: 'bold',
    padding: '4px 10px',
    border: '1px solid var(--accent-blue)',
    borderRadius: '3px',
    color: 'var(--accent-blue)',
    backgroundColor: 'rgba(0, 212, 255, 0.05)'
  },
  visualizerRow: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    gap: '25px',
    width: '100%'
  },
  waveContainer: {
    display: 'flex',
    alignItems: 'center',
    gap: '3px',
    height: '40px',
    width: '120px',
    justifyContent: 'center'
  },
  waveBar: {
    width: '3px',
    borderRadius: '2px',
    minHeight: '4px',
    transition: 'height 0.15s ease'
  },
  micCircle: {
    width: '48px',
    height: '48px',
    borderRadius: '50%',
    backgroundColor: 'var(--accent-blue)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    border: 'none',
    cursor: 'pointer',
    boxShadow: '0 0 15px var(--accent-blue-glow)',
    transition: 'all 0.3s ease'
  },
  metricsBox: {
    display: 'flex',
    flexDirection: 'column',
    gap: '10px',
    fontSize: '12px'
  },
  metricRow: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center'
  },
  terminalCard: {
    display: 'flex',
    flexDirection: 'column',
    backgroundColor: '#070709',
    minHeight: '400px'
  },
  terminalHeader: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: '14px 16px',
    borderBottom: '1px solid var(--border-cyber)'
  },
  timerWrapper: {
    position: 'relative',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    width: '46px',
    height: '46px'
  },
  timerText: {
    position: 'absolute',
    fontSize: '12px',
    fontWeight: 'bold'
  },
  screen: {
    padding: '20px',
    backgroundColor: '#0A0A0E',
    borderBottom: '1px solid var(--border-cyber)',
    minHeight: '130px',
    position: 'relative',
    overflow: 'hidden'
  },
  scanline: {
    position: 'absolute',
    top: 0, left: 0, right: 0, bottom: 0,
    background: 'linear-gradient(rgba(18, 16, 16, 0) 50%, rgba(0, 0, 0, 0.12) 50%)',
    backgroundSize: '100% 4px',
    pointerEvents: 'none'
  },
  questionText: {
    fontSize: '14px',
    lineHeight: '1.6',
    color: '#D4E2F0',
    whiteSpace: 'pre-wrap'
  },
  inputArea: {
    flex: 1,
    display: 'flex',
    minHeight: '160px'
  },
  textarea: {
    flex: 1,
    backgroundColor: '#070709',
    border: 'none',
    resize: 'none',
    padding: '15px',
    color: '#00FF66',
    caretColor: 'var(--accent-blue)',
    fontSize: '14.5px',
    lineHeight: '1.6',
    fontFamily: 'var(--font-data)',
    outline: 'none'
  },
  terminalFooter: {
    display: 'flex',
    alignItems: 'center',
    padding: '12px 16px',
    backgroundColor: '#0B0B0E',
    borderTop: '1px solid var(--border-cyber)'
  },
  iconBtn: {
    display: 'flex',
    alignItems: 'center',
    padding: '8px 12px',
    fontSize: '12px'
  },
  submitBtn: {
    padding: '10px 20px'
  },
  historyContainer: {
    display: 'flex',
    flexDirection: 'column',
    gap: '10px',
    marginTop: '10px'
  },
  historyTitle: {
    fontSize: '10px',
    color: 'var(--accent-blue)',
    fontWeight: 'bold',
    letterSpacing: '1px'
  },
  historyCard: {
    padding: '10px 14px',
    backgroundColor: '#0F0F13',
    borderColor: 'var(--border-cyber)'
  },
  historyHeader: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    cursor: 'pointer'
  },
  historyBody: {
    marginTop: '10px',
    borderTop: '1px dashed var(--border-cyber)',
    paddingTop: '10px',
    display: 'flex',
    flexDirection: 'column',
    gap: '8px',
    fontSize: '12px'
  },
  historySection: {
    display: 'flex',
    flexDirection: 'column',
    gap: '2px'
  },
  sectionLabel: {
    color: 'var(--text-muted)',
    fontWeight: 'bold',
    fontSize: '10px'
  },
  sectionText: {
    lineHeight: '1.4'
  },
  scoresList: {
    display: 'flex',
    flexDirection: 'column',
    gap: '10px'
  },
  feedCard: {
    padding: '12px',
    backgroundColor: '#070709',
    borderColor: 'var(--border-cyber)',
    display: 'flex',
    flexDirection: 'column',
    gap: '8px'
  },
  feedHeader: {
    display: 'flex',
    justifyContent: 'space-between',
    fontSize: '11px',
    fontWeight: 'bold'
  },
  barContainer: {
    display: 'flex',
    flexDirection: 'column',
    gap: '6px'
  },
  miniBarRow: {
    display: 'flex',
    alignItems: 'center',
    fontSize: '9px',
    fontWeight: 'bold',
    color: 'var(--text-muted)'
  },
  miniBarTrack: {
    flex: 1,
    height: '4px',
    backgroundColor: 'var(--bg-tertiary)',
    marginLeft: '8px',
    borderRadius: '2px',
    overflow: 'hidden'
  },
  miniBarFill: {
    height: '100%',
    borderRadius: '2px'
  },
  emptyFeed: {
    fontSize: '10px',
    color: 'var(--text-muted)',
    textAlign: 'center',
    padding: '20px 0'
  },
  sparklineBox: {
    padding: '5px 0'
  },
  sparklineLabels: {
    display: 'flex',
    justifyContent: 'space-between',
    fontSize: '9px',
    color: 'var(--text-muted)',
    marginTop: '6px'
  },
  modalOverlay: {
    position: 'fixed',
    top: 0, left: 0, right: 0, bottom: 0,
    backgroundColor: 'rgba(13, 13, 15, 0.85)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 999
  },
  modalCard: {
    padding: '24px',
    width: '400px',
    textAlign: 'center',
    backgroundColor: '#0F0F13',
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center'
  },
  modalFooter: {
    borderTop: '1px solid var(--border-cyber)',
    paddingTop: '10px',
    width: '100%',
    marginTop: '10px',
    fontSize: '10px'
  }
};
