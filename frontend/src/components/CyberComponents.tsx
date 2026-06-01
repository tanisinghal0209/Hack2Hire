import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { AlertOctagon, Brain } from 'lucide-react';

// Color Mapping Utility
const getColorForDifficulty = (level: 'easy' | 'medium' | 'hard') => {
  switch (level) {
    case 'easy': return 'var(--accent-green)';
    case 'medium': return 'var(--accent-amber)';
    case 'hard': return 'var(--accent-red)';
  }
};

// 1. DifficultyBadge
export const DifficultyBadge: React.FC<{ level: 'easy' | 'medium' | 'hard' }> = ({ level }) => {
  const color = getColorForDifficulty(level);
  return (
    <span 
      className="data-font"
      style={{
        padding: '3px 10px',
        fontSize: '11px',
        fontWeight: 'bold',
        borderRadius: '3px',
        border: `1px solid ${color}`,
        backgroundColor: `${color}12`,
        color,
        boxShadow: `0 0 8px ${color}22`
      }}
    >
      {level.toUpperCase()}
    </span>
  );
};

// 2. ScoreGauge
export const ScoreGauge: React.FC<{ score: number; size?: 'lg' | 'sm' }> = ({ score, size = 'lg' }) => {
  const radius = size === 'lg' ? 50 : 22;
  const strokeWidth = size === 'lg' ? 6 : 4;
  const circ = 2 * Math.PI * radius;
  const strokeOffset = circ - (score / 100) * circ;
  
  const color = score <= 40 ? 'var(--accent-red)' : score <= 70 ? 'var(--accent-amber)' : 'var(--accent-green)';

  return (
    <div style={{ position: 'relative', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <svg width={size === 'lg' ? 120 : 54} height={size === 'lg' ? 120 : 54}>
        <circle 
          cx={size === 'lg' ? 60 : 27} cy={size === 'lg' ? 60 : 27} r={radius}
          stroke="var(--bg-elevated)" strokeWidth={strokeWidth} fill="transparent"
        />
        <motion.circle 
          cx={size === 'lg' ? 60 : 27} cy={size === 'lg' ? 60 : 27} r={radius}
          stroke={color} strokeWidth={strokeWidth} fill="transparent"
          strokeDasharray={circ}
          initial={{ strokeDashoffset: circ }}
          animate={{ strokeDashoffset: strokeOffset }}
          transition={{ duration: 1.5, ease: 'easeOut' }}
          style={{ transform: 'rotate(-90deg)', transformOrigin: 'center' }}
        />
      </svg>
      <div style={{ position: 'absolute', display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
        <span className="data-font" style={{ fontSize: size === 'lg' ? '28px' : '12px', fontWeight: 'bold', color }}>
          {score}
        </span>
        {size === 'lg' && (
          <span style={{ fontSize: '8px', color: 'var(--text-secondary)', letterSpacing: '1px' }}>READINESS</span>
        )}
      </div>
    </div>
  );
};

// 3. TimerRing
export const TimerRing: React.FC<{ seconds: number; total: number }> = ({ seconds, total }) => {
  const radius = 30;
  const circ = 2 * Math.PI * radius;
  const strokeOffset = circ - (seconds / total) * circ;
  const isCritical = seconds < 15;
  const strokeColor = isCritical ? 'var(--accent-red)' : 'var(--accent-blue)';

  return (
    <div style={{ position: 'relative', display: 'flex', alignItems: 'center', justifyContent: 'center', width: '70px', height: '70px' }}>
      <svg width="70" height="70" style={{ transform: 'rotate(-90deg)' }}>
        <circle cx="35" cy="35" r={radius} stroke="var(--bg-elevated)" strokeWidth="3" fill="transparent" />
        <circle 
          cx="35" cy="35" r={radius} 
          stroke={strokeColor} strokeWidth="3" fill="transparent"
          strokeDasharray={circ}
          strokeDashoffset={strokeOffset}
          style={{ transition: 'stroke-dashoffset 1s linear' }}
        />
      </svg>
      <motion.div 
        animate={isCritical ? { scale: [1, 1.08, 1] } : {}}
        transition={{ repeat: Infinity, duration: 1 }}
        style={{
          position: 'absolute',
          fontSize: '15px',
          fontWeight: 'bold',
          color: strokeColor,
          fontFamily: 'var(--font-data)'
        }}
      >
        {seconds}s
      </motion.div>
    </div>
  );
};

// 4. SkillBar
export const SkillBar: React.FC<{ skill: string; score: number }> = ({ skill, score }) => {
  const color = score >= 75 ? 'var(--accent-green)' : score >= 50 ? 'var(--accent-amber)' : 'var(--accent-red)';
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '4px', width: '100%', marginBottom: '10px' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '11px', fontWeight: 'bold', color: 'var(--text-secondary)' }}>
        <span>{skill.toUpperCase()}</span>
        <span className="data-font" style={{ color }}>{score}%</span>
      </div>
      <div style={{ width: '100%', height: '6px', backgroundColor: 'var(--bg-elevated)', borderRadius: '3px', overflow: 'hidden' }}>
        <motion.div 
          initial={{ width: 0 }}
          animate={{ width: `${score}%` }}
          transition={{ duration: 1.2, ease: 'easeOut' }}
          style={{ height: '100%', borderRadius: '3px', backgroundColor: color }}
        />
      </div>
    </div>
  );
};

// 5. QuestionCard
export const QuestionCard: React.FC<{ question: string; type: string; difficulty: 'easy' | 'medium' | 'hard' }> = ({
  question,
  type,
  difficulty
}) => {
  return (
    <motion.div 
      initial={{ opacity: 0, y: 15 }}
      animate={{ opacity: 1, y: 0 }}
      className="cyber-card active"
      style={{
        padding: '20px',
        backgroundColor: 'var(--bg-card)',
        display: 'flex',
        flexDirection: 'column',
        gap: '12px'
      }}
    >
      <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px solid var(--border)', paddingBottom: '10px' }}>
        <span className="data-font" style={{ fontSize: '10px', color: 'var(--accent-blue)', letterSpacing: '1px', fontWeight: 'bold' }}>
          // MODULE: [{type.toUpperCase()}]
        </span>
        <DifficultyBadge level={difficulty} />
      </div>
      <div className="data-font" style={{ fontSize: '14.5px', color: '#D4E2F0', lineHeight: '1.6' }}>
        {question}
      </div>
    </motion.div>
  );
};

// 6. AnswerInput
interface AnswerInputProps {
  value: string;
  onChange: (val: string) => void;
  onSubmit: () => void;
  disabled: boolean;
}

export const AnswerInput: React.FC<AnswerInputProps> = ({ value, onChange, onSubmit, disabled }) => {
  const wordCount = value.trim() ? value.trim().split(/\s+/).length : 0;
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', width: '100%' }}>
      <div style={{ display: 'flex', border: '1px solid var(--border)', borderRadius: '4px', overflow: 'hidden', minHeight: '140px' }}>
        <div style={{ width: '40px', backgroundColor: 'var(--bg-primary)', display: 'flex', flexDirection: 'column', alignItems: 'center', padding: '12px 0', borderRight: '1px solid var(--border)', gap: '4px', fontSize: '11px', color: '#44445A', userSelect: 'none' }} className="data-font">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i}>{(i + 1).toString().padStart(2, '0')}</div>
          ))}
        </div>
        <textarea
          className="cyber-input-mono"
          style={{
            flex: 1,
            backgroundColor: 'var(--bg-card)',
            border: 'none',
            outline: 'none',
            padding: '12px',
            color: 'var(--accent-green)',
            fontSize: '14px',
            lineHeight: '1.5',
            resize: 'none',
            fontFamily: 'var(--font-data)'
          }}
          placeholder="// Paste or type your engineering response here. Accuracy, depth, and relevance are graded..."
          value={value}
          onChange={(e) => onChange(e.target.value)}
          disabled={disabled}
        />
      </div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <span className="data-font" style={{ fontSize: '11px', color: wordCount < 20 ? 'var(--accent-amber)' : 'var(--text-secondary)' }}>
          WORD COUNT: {wordCount} {wordCount < 20 && '(MIN 20 words for scoring)'}
        </span>
        <button 
          className="cyber-btn"
          onClick={onSubmit}
          disabled={disabled || wordCount === 0}
        >
          SUBMIT RESPONSE
        </button>
      </div>
    </div>
  );
};

// 7. ScoreFeed
export const ScoreFeed: React.FC<{ scores: Array<{ score: number; topic: string }> }> = ({ scores }) => {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
      <div className="data-font" style={{ fontSize: '11px', color: 'var(--text-secondary)', fontWeight: 'bold' }}>
        REAL-TIME FEEDBACK LOGS
      </div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', maxHeight: '180px', overflowY: 'auto' }}>
        <AnimatePresence>
          {scores.map((s, idx) => {
            const color = s.score >= 70 ? 'var(--accent-green)' : s.score >= 40 ? 'var(--accent-amber)' : 'var(--accent-red)';
            return (
              <motion.div 
                key={idx}
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0 }}
                className="cyber-card"
                style={{
                  padding: '8px 12px',
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  fontSize: '12px',
                  backgroundColor: 'var(--bg-elevated)',
                  borderColor: 'var(--border)'
                }}
              >
                <span>{s.topic.toUpperCase()}</span>
                <span className="data-font" style={{ color, fontWeight: 'bold' }}>{s.score}%</span>
              </motion.div>
            );
          })}
        </AnimatePresence>
        {scores.length === 0 && (
          <div style={{ fontSize: '11px', color: 'var(--text-secondary)', textAlign: 'center', padding: '15px' }}>
            AWAITING EVALUATIONS...
          </div>
        )}
      </div>
    </div>
  );
};

// 8. TerminationModal
interface TerminationModalProps {
  reason: string;
  finalScore: number;
  onViewReport: () => void;
}

export const TerminationModal: React.FC<TerminationModalProps> = ({ reason, finalScore, onViewReport }) => {
  return (
    <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(13, 13, 15, 0.9)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 9999 }} className="app-container">
      <motion.div 
        initial={{ scale: 0.9, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        className="cyber-card warning"
        style={{
          width: '450px',
          margin: 'auto',
          padding: '30px',
          backgroundColor: 'var(--bg-card)',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          textAlign: 'center',
          gap: '15px',
          borderColor: 'var(--accent-red)'
        }}
      >
        <AlertOctagon size={48} color="var(--accent-red)" className="pulse-warning" />
        <h2 style={{ color: 'var(--accent-red)', fontFamily: 'var(--font-headings)', fontSize: '20px' }}>
          SESSION TERMINATION PROTOCOL ACTIVE
        </h2>
        <p className="data-font" style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>
          {reason.toUpperCase()}
        </p>
        <div style={{ borderTop: '1px solid var(--border)', borderBottom: '1px solid var(--border)', width: '100%', padding: '15px 0' }}>
          <div style={{ fontSize: '11px', color: 'var(--text-secondary)' }}>FINAL ACCUMULATED SCORE</div>
          <div className="data-font" style={{ fontSize: '42px', fontWeight: 'bold', color: 'var(--accent-red)' }}>
            {finalScore}
          </div>
        </div>
        <button 
          className="cyber-btn"
          style={{ width: '100%', borderColor: 'var(--accent-red)', color: 'var(--accent-red)' }}
          onClick={onViewReport}
        >
          COMPILE DAMAGE ASSESSMENT REPORT
        </button>
      </motion.div>
    </div>
  );
};

// 9. LoadingBrain
export const LoadingBrain: React.FC = () => {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '15px' }}>
      <motion.div 
        animate={{ 
          scale: [1, 1.15, 1],
          opacity: [0.6, 1, 0.6]
        }}
        transition={{ repeat: Infinity, duration: 1.5, ease: 'easeInOut' }}
        style={{ display: 'flex', justifyContent: 'center' }}
      >
        <Brain size={48} color="var(--accent-blue)" style={{ filter: 'drop-shadow(0 0 10px rgba(0, 212, 255, 0.4))' }} />
      </motion.div>
      <span className="data-font" style={{ fontSize: '11px', color: 'var(--accent-blue)', letterSpacing: '1px' }}>
        AI BRAIN INTERFACING...
      </span>
    </div>
  );
};
