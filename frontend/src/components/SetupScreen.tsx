import React, { useState, useEffect, useRef } from 'react';
import { Upload, FileText, ChevronRight, Terminal as TerminalIcon, Brain, Cpu } from 'lucide-react';
import * as pdfjsLib from 'pdfjs-dist';
import mammoth from 'mammoth';

// Set up PDF.js worker
pdfjsLib.GlobalWorkerOptions.workerSrc = `//cdnjs.cloudflare.com/ajax/libs/pdf.js/${pdfjsLib.version}/pdf.worker.min.js`;

interface SetupScreenProps {
  onStart: (name: string, jobDescription: string, resumeFile: File | null, resumeText: string, avatarUrl: string) => Promise<void>;
  loading: boolean;
}

interface AnalyzedData {
  name: string;
  skills: string[];
  experienceYears: number;
  roleMatch: number;
}

const TEMPLATES = [
  {
    title: 'Frontend React Engineer',
    desc: 'Require a Senior Frontend Engineer with 4+ years of React, TypeScript, and state management experience. Needs strong CSS design skills, browser performance profiling, custom hook implementation, and REST/GraphQL API integration.'
  },
  {
    title: 'Node.js Backend Developer',
    desc: 'Looking for a Backend Specialist specializing in Node.js, Express, PostgreSQL, and AWS deployment. Experience with designing REST APIs, rate limiters, database index optimization, and memory profiling. Must be capable of high throughput.'
  },
  {
    title: 'Full Stack Engineer',
    desc: 'Seeking a Full Stack Generalist. Stack: React/NextJS, Node/Express, PostgreSQL. Candidates must understand OAuth flows, database migrations, CI/CD, micro-frontend structures, and responsive design systems.'
  }
];

// Canvas particle background component
const ParticleBackground: React.FC = () => {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let animationFrameId: number;
    let width = canvas.width = window.innerWidth;
    let height = canvas.height = window.innerHeight;

    const handleResize = () => {
      width = canvas.width = window.innerWidth;
      height = canvas.height = window.innerHeight;
    };
    window.addEventListener('resize', handleResize);

    const particles: Array<{ x: number; y: number; vx: number; vy: number; radius: number }> = [];
    const particleCount = 50;
    const maxDistance = 150;

    for (let i = 0; i < particleCount; i++) {
      particles.push({
        x: Math.random() * width,
        y: Math.random() * height,
        vx: (Math.random() - 0.5) * 0.4,
        vy: (Math.random() - 0.5) * 0.4,
        radius: Math.random() * 2 + 1,
      });
    }

    const draw = () => {
      ctx.clearRect(0, 0, width, height);

      // Draw grid lines
      ctx.strokeStyle = 'rgba(35, 35, 44, 0.2)';
      ctx.lineWidth = 1;
      const gridSize = 50;
      for (let x = 0; x < width; x += gridSize) {
        ctx.beginPath();
        ctx.moveTo(x, 0);
        ctx.lineTo(x, height);
        ctx.stroke();
      }
      for (let y = 0; y < height; y += gridSize) {
        ctx.beginPath();
        ctx.moveTo(0, y);
        ctx.lineTo(width, y);
        ctx.stroke();
      }

      ctx.fillStyle = 'rgba(0, 212, 255, 0.4)';
      particles.forEach((p, idx) => {
        p.x += p.vx;
        p.y += p.vy;

        if (p.x < 0 || p.x > width) p.vx *= -1;
        if (p.y < 0 || p.y > height) p.vy *= -1;

        ctx.beginPath();
        ctx.arc(p.x, p.y, p.radius, 0, Math.PI * 2);
        ctx.fill();

        for (let j = idx + 1; j < particleCount; j++) {
          const p2 = particles[j];
          const dx = p.x - p2.x;
          const dy = p.y - p2.y;
          const dist = Math.sqrt(dx * dx + dy * dy);

          if (dist < maxDistance) {
            ctx.strokeStyle = `rgba(0, 212, 255, ${0.12 * (1 - dist / maxDistance)})`;
            ctx.lineWidth = 0.5;
            ctx.beginPath();
            ctx.moveTo(p.x, p.y);
            ctx.lineTo(p2.x, p2.y);
            ctx.stroke();
          }
        }
      });

      animationFrameId = requestAnimationFrame(draw);
    };

    draw();

    return () => {
      window.removeEventListener('resize', handleResize);
      cancelAnimationFrame(animationFrameId);
    };
  }, []);

  return <canvas ref={canvasRef} style={{ position: 'fixed', top: 0, left: 0, width: '100vw', height: '100vh', zIndex: -1, pointerEvents: 'none' }} />;
};

export const SetupScreen: React.FC<SetupScreenProps> = ({ onStart, loading }) => {
  const [jobDescription, setJobDescription] = useState(TEMPLATES[0].desc);
  const [file, setFile] = useState<File | null>(null);
  const [resumeText, setResumeText] = useState('');
  const [avatar, setAvatar] = useState<string>('');
  const [dragActive, setDragActive] = useState(false);
  
  // Analysis state
  const [analyzing, setAnalyzing] = useState(false);
  const [analyzedData, setAnalyzedData] = useState<AnalyzedData | null>(null);

  const [bootLogs, setBootLogs] = useState<string[]>([]);
  const [booting, setBooting] = useState(false);

  // Trigger analysis when both are available
  useEffect(() => {
    const triggerAnalysis = async () => {
      if (!file && !resumeText.trim()) return;
      if (!jobDescription.trim()) return;
      const apiBase = import.meta.env.VITE_API_BASE_URL || 'http://localhost:5001/api';
      setAnalyzing(true);
      try {
        let response;
        if (file) {
          const formData = new FormData();
          formData.append('resume', file);
          formData.append('jobDescription', jobDescription);
          response = await fetch(`${apiBase}/analyze`, {
            method: 'POST',
            body: formData
          });
        } else {
          response = await fetch(`${apiBase}/analyze`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json'
            },
            body: JSON.stringify({
              resumeText,
              jobDescription
            })
          });
        }
        if (response.ok) {
          const data = await response.json();
          setAnalyzedData({
            name: data.name || file?.name.replace(/\.[^/.]+$/, "") || 'Candidate',
            skills: data.skills || [],
            experienceYears: data.experience_years !== undefined ? data.experience_years : (data.experienceYears || 0),
            roleMatch: data.role_match_score !== undefined ? data.role_match_score : (data.roleMatch || 0),
          });
        }
      } catch (err) {
        console.error('Analysis failed:', err);
      } finally {
        setAnalyzing(false);
      }
    };

    // Debounce analysis a bit
    const timer = setTimeout(triggerAnalysis, 800);
    return () => clearTimeout(timer);
  }, [file, resumeText, jobDescription]);

  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === "dragenter" || e.type === "dragover") {
      setDragActive(true);
    } else if (e.type === "dragleave") {
      setDragActive(false);
    }
  };

  const handleDrop = async (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      const uploadedFile = e.dataTransfer.files[0];
      setFile(uploadedFile);
      setResumeText('');
      setAnalyzedData(null);
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const uploadedFile = e.target.files[0];
      setFile(uploadedFile);
      setResumeText('');
      setAnalyzedData(null);
    }
  };

  const handleAvatarChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const imgFile = e.target.files[0];
      const reader = new FileReader();
      reader.onload = (event) => {
        if (event.target?.result) {
          setAvatar(event.target.result as string);
        }
      };
      reader.readAsDataURL(imgFile);
    }
  };

  const executeBootSequence = async () => {
    if (!jobDescription.trim() || (!file && !resumeText.trim())) return;
    setBooting(true);
    const logs = [
      '>> BOOTING INTERVIEW PROTOCOL...',
      '>> SYNCING PROFILE ANALYTICS MATRIX...',
      `>> MATCHING PROFILE FOR CANDIDATE: "${analyzedData?.name || 'CANDIDATE'}"`,
      `>> ALIGNING TARGET SKILLS: ${analyzedData?.skills.join(', ')}`,
      `>> JOB PROFILE MATCH: ${analyzedData?.roleMatch}% ACCURATE`,
      '>> SYNCHRONIZING DIALS & RADAR CALIBRATIONS...',
      '>> CONNECTION ESTABLISHED. TERMINAL HANDSHAKE COMPLETE.'
    ];

    for (let i = 0; i < logs.length; i++) {
      await new Promise((r) => setTimeout(r, 200));
      setBootLogs(prev => [...prev, logs[i]]);
    }

    await new Promise((r) => setTimeout(r, 300));
    await onStart(analyzedData?.name || 'Candidate', jobDescription, file, resumeText, avatar);
    setBooting(false);
  };

  const isFormValid = (file !== null || resumeText.trim().length > 0) && jobDescription.trim().length > 0 && analyzedData !== null;

  return (
    <div style={styles.container}>
      <ParticleBackground />
      
      {/* Title Panel */}
      <div style={styles.header}>
        <h1 style={styles.title}>Are You Interview-Ready?</h1>
        <p style={styles.subtitle}>Upload your resume & JD. Our AI will interview you like a real hiring manager.</p>
      </div>

      <div style={styles.grid}>
        {/* LEFT: Resume Upload Card */}
        <div className={`cyber-card ${file ? 'active' : ''}`} style={styles.card}>
          <div style={styles.cardHeader}>
            <Upload size={18} color="var(--accent-blue)" />
            <span style={styles.cardTitle}>UPLOAD RESUME & PROFILE</span>
          </div>

          {/* Profile Picture Uploader */}
          <div style={styles.avatarUploadContainer}>
            <div style={{ position: 'relative' }}>
              <img 
                src={avatar || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?q=80&w=150&auto=format&fit=crop'} 
                alt="Candidate Avatar" 
                style={styles.avatarImage} 
              />
              <input 
                type="file" 
                id="avatar-upload" 
                accept="image/*" 
                style={{ display: 'none' }} 
                onChange={handleAvatarChange}
                disabled={loading || booting}
              />
              <label htmlFor="avatar-upload" style={styles.avatarUploadLabel}>
                +
              </label>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column' }}>
              <span style={{ fontSize: '11px', color: 'var(--text-white)', fontWeight: 'bold' }}>UPLOAD CANDIDATE PHOTO</span>
              <span style={{ fontSize: '9px', color: 'var(--text-muted)' }}>Click "+" to select profile picture (Optional)</span>
            </div>
          </div>

          <div 
            style={{
              ...styles.dropZone,
              borderColor: dragActive ? 'var(--accent-blue)' : 'var(--border-cyber)',
              backgroundColor: dragActive ? 'rgba(0,212,255,0.05)' : 'var(--bg-tertiary)'
            }}
            onDragEnter={handleDrag}
            onDragOver={handleDrag}
            onDragLeave={handleDrag}
            onDrop={handleDrop}
          >
            <input 
              type="file" 
              id="file-upload" 
              accept=".pdf,.txt,.docx" 
              style={{ display: 'none' }}
              onChange={handleFileChange}
              disabled={loading || booting}
            />
            <label htmlFor="file-upload" style={{ width: '100%', cursor: 'pointer' }}>
              <div style={{ textAlign: 'center' }}>
                <FileText size={32} color={file ? 'var(--accent-blue)' : 'var(--text-muted)'} style={{ marginBottom: '8px' }} />
                <div style={{ fontSize: '13px', color: 'var(--text-white)' }}>
                  {file ? file.name : 'Drag Resume (PDF, DOCX, TXT) here'}
                </div>
                <div style={{ fontSize: '11px', color: 'var(--text-muted)', marginTop: '4px' }}>
                  {file ? 'Click to replace document' : 'or click to browse local files'}
                </div>
              </div>
            </label>
          </div>

          {/* Analysis Results Preview Panel */}
          {analyzedData && (
            <div style={styles.previewPanel} className="cyber-card">
              <div style={styles.previewTitle} className="data-font">ANALYSIS PREVIEW</div>
              <div style={styles.previewContent}>
                <div style={styles.previewItem}>
                  <span style={styles.previewLabel}>CANDIDATE NAME:</span>
                  <span style={styles.previewValue}>{analyzedData.name}</span>
                </div>
                <div style={styles.previewItem}>
                  <span style={styles.previewLabel}>EXPERIENCE (EST):</span>
                  <span style={styles.previewValue}>{analyzedData.experienceYears} Years</span>
                </div>
                <div style={styles.previewItem}>
                  <span style={styles.previewLabel}>ROLE MATCH RATE:</span>
                  <span style={{ ...styles.previewValue, color: analyzedData.roleMatch >= 75 ? '#00FF66' : 'var(--accent-amber)' }}>
                    {analyzedData.roleMatch}%
                  </span>
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', marginTop: '6px' }}>
                  <span style={styles.previewLabel}>EXTRACTED SKILLS:</span>
                  <div style={styles.skillsContainer}>
                    {analyzedData.skills.map((skill, idx) => (
                      <span key={idx} style={styles.skillTag} className="data-font">
                        {skill}
                      </span>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* RIGHT: JD Paste Card */}
        <div className="cyber-card" style={styles.card}>
          <div style={styles.cardHeader}>
            <TerminalIcon size={18} color="var(--accent-amber)" />
            <span style={styles.cardTitle}>PASTE JOB DESCRIPTION</span>
          </div>

          <textarea 
            placeholder="// Paste target requirements, tasks or role qualifications here..."
            className="cyber-input"
            style={styles.textarea}
            value={jobDescription}
            onChange={(e) => setJobDescription(e.target.value)}
            disabled={loading || booting}
          />
          <div style={styles.charCounter} className="data-font">
            CHARACTER COUNT: {jobDescription.length}
          </div>

          {/* Preset templates picker */}
          <div style={{ marginTop: '10px' }}>
            <div style={{ fontSize: '10px', color: 'var(--accent-blue)', fontWeight: 'bold', marginBottom: '6px', letterSpacing: '1px' }}>
              LOAD TEMPLATE:
            </div>
            <div style={styles.presetRow}>
              {TEMPLATES.map((tmpl, idx) => (
                <button 
                  key={idx}
                  className="cyber-btn"
                  style={styles.presetButton}
                  onClick={() => setJobDescription(tmpl.desc)}
                  disabled={loading || booting}
                >
                  {tmpl.title.split(' ')[0]}
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Analyzer/Initializing Panel Overlay */}
      {(analyzing || booting) && (
        <div style={styles.overlayContainer}>
          <div className="cyber-card warning" style={styles.loaderCard}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '15px', padding: '10px 0' }}>
              {booting ? (
                <Cpu size={32} color="var(--accent-amber)" className="pulse-warning" />
              ) : (
                <Brain size={32} color="var(--accent-blue)" className="pulse-warning" />
              )}
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: '15px', fontWeight: 'bold', fontFamily: 'var(--font-headings)' }}>
                  {booting ? 'INITIALIZING INTERVIEW ENGINE...' : 'Analyzing your profile...'}
                </div>
                <div style={{ fontSize: '11px', color: 'var(--text-muted)', marginTop: '4px' }}>
                  {booting ? 'Establishing secure connection...' : 'Claude is mapping skill matches client-side...'}
                </div>
              </div>
            </div>

            {booting && (
              <div style={styles.bootLogsBox} className="data-font">
                {bootLogs.map((log, idx) => (
                  <div key={idx} style={{ color: 'var(--accent-blue)', marginBottom: '4px' }}>{log}</div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* Start Button */}
      <div style={styles.footer}>
        <button 
          className="cyber-btn"
          style={{
            ...styles.startBtn,
            backgroundColor: isFormValid ? 'var(--accent-blue)' : 'transparent',
            color: isFormValid ? 'var(--bg-primary)' : 'var(--text-muted)'
          }}
          onClick={executeBootSequence}
          disabled={!isFormValid || loading || booting}
        >
          <span>START INTERVIEW</span>
          <ChevronRight size={18} />
        </button>
      </div>
    </div>
  );
};

const styles: Record<string, React.CSSProperties> = {
  container: {
    display: 'flex',
    flexDirection: 'column',
    flex: 1,
    gap: '20px',
    minHeight: 0,
    zIndex: 1,
    overflowY: 'auto'
  },
  header: {
    textAlign: 'center',
    margin: '10px 0'
  },
  title: {
    fontSize: '32px',
    fontFamily: 'var(--font-headings)',
    color: 'var(--text-white)',
    marginBottom: '8px'
  },
  subtitle: {
    fontSize: '14px',
    color: 'var(--text-muted)',
    maxWidth: '600px',
    margin: '0 auto'
  },
  grid: {
    display: 'grid',
    gridTemplateColumns: '1fr 1fr',
    gap: '20px',
    alignItems: 'start'
  },
  card: {
    padding: '20px',
    display: 'flex',
    flexDirection: 'column',
    gap: '15px',
    backgroundColor: '#0F0F13'
  },
  avatarUploadContainer: {
    display: 'flex',
    alignItems: 'center',
    gap: '15px',
    paddingBottom: '10px',
    borderBottom: '1px solid var(--border-cyber)',
    marginBottom: '10px'
  },
  avatarImage: {
    width: '60px',
    height: '60px',
    borderRadius: '4px',
    border: '1px solid var(--accent-blue)',
    objectFit: 'cover',
    backgroundColor: 'var(--bg-tertiary)'
  },
  avatarUploadLabel: {
    position: 'absolute',
    bottom: '-5px',
    right: '-5px',
    width: '20px',
    height: '20px',
    borderRadius: '50%',
    backgroundColor: 'var(--accent-blue)',
    color: 'var(--bg-primary)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    fontSize: '14px',
    fontWeight: 'bold',
    cursor: 'pointer',
    boxShadow: '0 0 5px var(--accent-blue-glow)'
  },
  cardHeader: {
    display: 'flex',
    alignItems: 'center',
    gap: '10px',
    borderBottom: '1px solid var(--border-cyber)',
    paddingBottom: '10px'
  },
  cardTitle: {
    fontSize: '12px',
    fontWeight: 'bold',
    letterSpacing: '1.5px',
    color: 'var(--text-white)',
    fontFamily: 'var(--font-data)'
  },
  dropZone: {
    border: '1px dashed var(--border-cyber)',
    borderRadius: '4px',
    padding: '30px 20px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    transition: 'all 0.3s ease'
  },
  textarea: {
    width: '100%',
    height: '200px',
    padding: '12px',
    fontSize: '13px',
    backgroundColor: 'var(--bg-tertiary)',
    border: '1px solid var(--border-cyber)',
    resize: 'none',
    lineHeight: '1.5',
    color: '#D4E2F0'
  },
  charCounter: {
    fontSize: '10px',
    color: 'var(--text-muted)',
    textAlign: 'right'
  },
  presetRow: {
    display: 'flex',
    gap: '8px'
  },
  presetButton: {
    flex: 1,
    padding: '6px',
    fontSize: '11px'
  },
  previewPanel: {
    padding: '12px',
    backgroundColor: '#070709',
    borderColor: 'var(--border-cyber)',
    display: 'flex',
    flexDirection: 'column',
    gap: '10px'
  },
  previewTitle: {
    fontSize: '10px',
    color: 'var(--accent-blue)',
    fontWeight: 'bold',
    borderBottom: '1px solid var(--border-cyber)',
    paddingBottom: '4px'
  },
  previewContent: {
    display: 'flex',
    flexDirection: 'column',
    gap: '6px',
    fontSize: '12px'
  },
  previewItem: {
    display: 'flex',
    justifyContent: 'space-between'
  },
  previewLabel: {
    color: 'var(--text-muted)',
    fontWeight: 'bold'
  },
  previewValue: {
    color: 'var(--text-white)'
  },
  skillsContainer: {
    display: 'flex',
    flexWrap: 'wrap',
    gap: '6px',
    marginTop: '2px'
  },
  skillTag: {
    fontSize: '10px',
    padding: '3px 8px',
    backgroundColor: 'rgba(0, 212, 255, 0.1)',
    border: '1px solid var(--accent-blue)',
    color: 'var(--accent-blue)',
    borderRadius: '10px',
    boxShadow: '0 0 5px var(--accent-blue-glow)'
  },
  overlayContainer: {
    position: 'fixed',
    top: 0, left: 0, right: 0, bottom: 0,
    backgroundColor: 'rgba(13, 13, 15, 0.85)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 999
  },
  loaderCard: {
    padding: '24px',
    width: '450px',
    backgroundColor: '#0F0F13'
  },
  bootLogsBox: {
    marginTop: '15px',
    padding: '10px',
    backgroundColor: '#070709',
    borderRadius: '4px',
    height: '150px',
    overflowY: 'auto',
    fontSize: '11px',
    lineHeight: '1.5'
  },
  footer: {
    display: 'flex',
    justifyContent: 'center',
    marginTop: '10px',
    paddingBottom: '20px'
  },
  startBtn: {
    width: '260px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    gap: '10px',
    padding: '14px',
    fontSize: '15px',
    boxShadow: '0 0 15px var(--accent-blue-glow)'
  }
};
