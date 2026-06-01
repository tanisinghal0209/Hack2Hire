import React, { useState, useEffect } from 'react';
import { Shield, Clock, Cpu, Radio } from 'lucide-react';

interface HeaderProps {
  status: 'setup' | 'ongoing' | 'terminated' | 'completed';
  isSimulated: boolean;
}

export const Header: React.FC<HeaderProps> = ({ status, isSimulated }) => {
  const [timeString, setTimeString] = useState<string>('');

  useEffect(() => {
    const updateTime = () => {
      const now = new Date();
      setTimeString(now.toTimeString().split(' ')[0]);
    };
    updateTime();
    const interval = setInterval(updateTime, 1000);
    return () => clearInterval(interval);
  }, []);

  const getStatusText = () => {
    switch (status) {
      case 'setup': return 'CONFIGURATION_PHASE';
      case 'ongoing': return 'INTERVIEW_IN_PROGRESS';
      case 'terminated': return 'CRITICAL_TERMINATION_TRIGGERED';
      case 'completed': return 'INTERVIEW_COMPLETED';
    }
  };

  const getStatusColor = () => {
    switch (status) {
      case 'setup': return 'var(--accent-blue)';
      case 'ongoing': return '#00FF66';
      case 'terminated': return 'var(--red-alert)';
      case 'completed': return '#00D4FF';
    }
  };

  return (
    <div className="status-hud cyber-card">
      <div style={{ display: 'flex', alignItems: 'center', gap: '15px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontWeight: 'bold', fontSize: '15px' }}>
          <Shield size={16} color="var(--accent-blue)" />
          <span style={{ fontFamily: 'var(--font-headings)', letterSpacing: '2px' }}>HACK2HIRE</span>
          <span style={{ color: 'var(--accent-blue)', fontSize: '11px' }}>v2.4.0-CORE</span>
        </div>
        <div style={{ width: '1px', height: '16px', backgroundColor: 'var(--border-cyber)' }} />
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <Radio size={14} className={status === 'ongoing' ? 'pulse-warning' : ''} color={getStatusColor()} />
          <span className="data-font" style={{ color: getStatusColor() }}>
            {getStatusText()}
          </span>
        </div>
      </div>

      <div style={{ display: 'flex', alignItems: 'center', gap: '20px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: varTextColor() }}>
          <Cpu size={14} />
          <span className="data-font">
            MODEL: {isSimulated ? 'H2H-SIMULATOR-v1' : 'CLAUDE-3.5-SONNET'}
          </span>
        </div>
        
        <div style={{ width: '1px', height: '16px', backgroundColor: 'var(--border-cyber)' }} />

        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: 'var(--text-muted)' }}>
          <Clock size={14} />
          <span className="data-font">{timeString}</span>
        </div>
      </div>
    </div>
  );

  function varTextColor() {
    return isSimulated ? 'var(--accent-amber)' : 'var(--accent-blue)';
  }
};
