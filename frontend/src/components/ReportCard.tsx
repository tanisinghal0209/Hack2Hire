import React, { useState, useEffect } from 'react';
import { ShieldCheck, Award, ArrowRight, RotateCcw, Download } from 'lucide-react';
import { jsPDF } from 'jspdf';
import type { FinalReportResponse, InterviewHistoryEntry } from '../../../backend/src/types';

interface ReportCardProps {
  report: FinalReportResponse | null;
  candidateName: string;
  history: InterviewHistoryEntry[];
  onRestart: () => void;
}

export const ReportCard: React.FC<ReportCardProps> = ({ report, candidateName, history, onRestart }) => {
  if (!report) return null;

  const { overall_score, skill_breakdown, strengths, weaknesses, recommendations, hiring_readiness } = report;

  // 1. Animate circular gauge score on load (2s ease-out curve)
  const [animatedScore, setAnimatedScore] = useState(0);

  useEffect(() => {
    let startTime: number | null = null;
    const duration = 2000; // 2 seconds

    const animate = (timestamp: number) => {
      if (!startTime) startTime = timestamp;
      const elapsed = timestamp - startTime;
      const progress = Math.min(elapsed / duration, 1);
      
      // Ease-out quad curve
      const easeProgress = progress * (2 - progress);
      setAnimatedScore(Math.round(easeProgress * overall_score));

      if (progress < 1) {
        requestAnimationFrame(animate);
      }
    };

    requestAnimationFrame(animate);
  }, [overall_score]);

  // Determine readiness metrics color-codes
  const getReadinessColor = (score: number) => {
    if (score <= 40) return '#FF3B30'; // Red
    if (score <= 70) return '#FFB800'; // Amber
    return '#00FF66'; // Electric Green
  };

  const getReadinessBadge = (readiness: string) => {
    switch (readiness) {
      case 'Strong': return 'STRONG HIRE';
      case 'Average': return 'POTENTIAL HIRE';
      default: return 'NOT READY';
    }
  };

  const ringColor = getReadinessColor(overall_score);
  const ringRadius = 54;
  const circumference = 2 * Math.PI * ringRadius;
  const strokeOffset = circumference - (animatedScore / 100) * circumference;

  // Staggered delay triggers for skills breakdown bars
  const [animateBars, setAnimateBars] = useState(false);
  useEffect(() => {
    const timer = setTimeout(() => setAnimateBars(true), 250);
    return () => clearTimeout(timer);
  }, []);

  // Time calculations
  const totalUsed = history.reduce((sum, h) => sum + h.timeSpent, 0);
  const totalGiven = history.reduce((sum, h) => sum + h.timeLimit, 0);
  const avgTimeUsed = history.length > 0 ? Math.round(totalUsed / history.length) : 0;
  const avgTimeGiven = history.length > 0 ? Math.round(totalGiven / history.length) : 0;

  // PDF Downloader implementation using jsPDF
  const handleDownloadPDF = () => {
    const doc = new jsPDF();
    doc.setFont('Helvetica', 'normal');
    doc.setTextColor(20, 20, 25);
    
    doc.setFontSize(22);
    doc.text('HACK2HIRE INTERVIEW READINESS REPORT', 20, 30);
    
    doc.setDrawColor(35, 35, 44);
    doc.line(20, 35, 190, 35);
    
    doc.setFontSize(14);
    doc.text(`Candidate: ${candidateName}`, 20, 50);
    doc.text(`Readiness Index Score: ${overall_score}/100`, 20, 60);
    doc.text(`Hiring Recommendation Badge: ${getReadinessBadge(hiring_readiness)}`, 20, 70);
    doc.text(`Assessment Date: ${new Date().toLocaleDateString()}`, 20, 80);

    doc.setFontSize(16);
    doc.text('Skill Category Scorecards:', 20, 100);
    doc.setFontSize(12);
    let yPos = 110;
    Object.entries(skill_breakdown).forEach(([skill, rating]) => {
      doc.text(`- ${skill}: ${rating}%`, 25, yPos);
      yPos += 8;
    });

    yPos += 10;
    doc.setFontSize(16);
    doc.text('Core Strengths:', 20, yPos);
    doc.setFontSize(12);
    yPos += 10;
    strengths.forEach((s) => {
      const splitLines = doc.splitTextToSize(s, 160);
      splitLines.forEach((line: string, idx: number) => {
        if (yPos > 275) {
          doc.addPage();
          yPos = 20;
        }
        doc.text(idx === 0 ? `- ${line}` : `  ${line}`, 25, yPos);
        yPos += 7;
      });
    });

    yPos += 10;
    if (yPos > 275) {
      doc.addPage();
      yPos = 20;
    }
    doc.setFontSize(16);
    doc.text('Areas for Development:', 20, yPos);
    doc.setFontSize(12);
    yPos += 10;
    weaknesses.forEach((w) => {
      const splitLines = doc.splitTextToSize(w, 160);
      splitLines.forEach((line: string, idx: number) => {
        if (yPos > 275) {
          doc.addPage();
          yPos = 20;
        }
        doc.text(idx === 0 ? `- ${line}` : `  ${line}`, 25, yPos);
        yPos += 7;
      });
    });

    yPos += 10;
    if (yPos > 275) {
      doc.addPage();
      yPos = 20;
    }
    doc.setFontSize(16);
    doc.text('H2H Action Plan Guidelines:', 20, yPos);
    doc.setFontSize(12);
    yPos += 10;
    recommendations.forEach((rec, idx) => {
      const splitLines = doc.splitTextToSize(rec, 160);
      splitLines.forEach((line: string, lineIdx: number) => {
        if (yPos > 275) {
          doc.addPage();
          yPos = 20;
        }
        doc.text(lineIdx === 0 ? `${idx + 1}. ${line}` : `   ${line}`, 25, yPos);
        yPos += 7;
      });
    });

    doc.save(`hack2hire-report-${candidateName.toLowerCase().replace(/\s+/g, '-')}.pdf`);
  };

  return (
    <div style={styles.container}>
      
      {/* TOP SECTION: Readiness Gauge & Rec Badge */}
      <div className="cyber-card" style={styles.topCard}>
        <div style={styles.topFlex}>
          <div style={styles.gaugeContainer}>
            <svg width="150" height="150">
              <circle 
                cx="75" cy="75" r={ringRadius} 
                stroke="var(--bg-tertiary)" strokeWidth="8" fill="transparent" 
              />
              <circle 
                cx="75" cy="75" r={ringRadius} 
                stroke={ringColor} strokeWidth="8" fill="transparent"
                strokeDasharray={circumference}
                strokeDashoffset={strokeOffset}
                style={{ 
                  transform: 'rotate(-90deg)', 
                  transformOrigin: '75px 75px',
                  transition: 'stroke-dashoffset 0.1s linear'
                }}
              />
            </svg>
            <div style={styles.gaugeCenter}>
              <span className="data-font" style={{ fontSize: '38px', fontWeight: 'bold', color: ringColor }}>
                {animatedScore}
              </span>
              <span className="data-font" style={{ fontSize: '10px', color: 'var(--text-muted)' }}>INDEX SCORE</span>
            </div>
          </div>

          <div style={styles.recBox}>
            <div style={styles.recSubtitle}>READINESS EVALUATION SUMMARY</div>
            <h1 style={{ fontSize: '24px', fontFamily: 'var(--font-headings)' }}>
              {candidateName.toUpperCase()}
            </h1>
            <div 
              className="data-font" 
              style={{
                ...styles.recBadge,
                borderColor: ringColor,
                backgroundColor: `${ringColor}12`,
                color: ringColor
              }}
            >
              RECOMMENDATION: {getReadinessBadge(hiring_readiness)}
            </div>
            <div style={styles.dateLabel} className="data-font">
              DATE: {new Date().toLocaleDateString()} // STATUS: COMPILED
            </div>
          </div>
        </div>
      </div>

      {/* MIDDLE SECTION: Grid of Cards */}
      <div style={styles.middleGrid}>
        
        {/* Card 1: Skill Performance Breakdown */}
        <div className="cyber-card" style={styles.card}>
          <div style={styles.cardHeader}>
            <ShieldCheck size={16} color="var(--accent-blue)" />
            <span>SKILL METRICS BREAKDOWN</span>
          </div>
          <div style={styles.skillsWrapper}>
            {Object.entries(skill_breakdown).map(([skill, val], idx) => (
              <div key={idx} style={styles.skillBarRow}>
                <div style={styles.skillBarLabel}>
                  <span>{skill.toUpperCase()}</span>
                  <span className="data-font">{val}%</span>
                </div>
                <div style={styles.skillBarTrack}>
                  <div 
                    style={{
                      ...styles.skillBarFill,
                      width: animateBars ? `${val}%` : '0%',
                      backgroundColor: idx % 2 === 0 ? 'var(--accent-blue)' : '#00FF66',
                      transition: `width 1.2s cubic-bezier(0.1, 1, 0.1, 1) ${idx * 150}ms`
                    }}
                  />
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Card 2: Question-by-Question Timeline */}
        <div className="cyber-card" style={styles.card}>
          <div style={styles.cardHeader}>
            <ArrowRight size={16} color="var(--accent-amber)" />
            <span>MODULE RESPONSE TIMELINE</span>
          </div>
          <div style={styles.timelineContainer}>
            {history.map((h, i) => (
              <div key={i} style={styles.timelineItem}>
                <div style={styles.timelineDotLine}>
                  <div 
                    style={{ 
                      ...styles.timelineDot, 
                      backgroundColor: h.score >= 70 ? '#00FF66' : h.score >= 40 ? 'var(--accent-amber)' : 'var(--red-alert)'
                    }} 
                  />
                  {i < history.length - 1 && <div style={styles.timelineLine} />}
                </div>
                <div style={styles.timelineContent}>
                  <div style={styles.timelineHeaderRow}>
                    <span className="data-font" style={styles.timelineQIndex}>MOD {i+1} [{h.questionType.toUpperCase()}]</span>
                    <span className="data-font" style={{ color: '#00FF66', fontWeight: 'bold' }}>{h.score}%</span>
                  </div>
                  <div style={styles.timelineQText}>{h.question.substring(0, 75)}...</div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Card 3: Time Management Score */}
        <div className="cyber-card" style={styles.card}>
          <div style={styles.cardHeader}>
            <Award size={16} color="var(--accent-blue)" />
            <span>TIME CONSTRAINTS EFFICIENCY</span>
          </div>
          <div style={styles.timeStatsBox}>
            <div style={styles.timeGaugeRow}>
              <div style={styles.timeGauge}>
                <div className="data-font" style={styles.timeGaugeNum}>{avgTimeUsed}s</div>
                <div style={{ fontSize: '9px', color: 'var(--text-muted)' }}>AVG TIME USED</div>
              </div>
              <div style={styles.timeGauge}>
                <div className="data-font" style={styles.timeGaugeNum}>{avgTimeGiven}s</div>
                <div style={{ fontSize: '9px', color: 'var(--text-muted)' }}>AVG TIME GIVEN</div>
              </div>
            </div>
            <div style={{ ...styles.timeGaugeLabel, color: avgTimeUsed <= avgTimeGiven ? '#00FF66' : 'var(--accent-amber)' }} className="data-font">
              {avgTimeUsed <= avgTimeGiven ? 'PACE RATIO: EFFICIENCY OPTIMAL' : 'PACE RATIO: TIME PENALTIES INVOLVED'}
            </div>
          </div>
        </div>

      </div>

      {/* BOTTOM SECTION: Strengths & Weaknesses */}
      <div style={styles.bottomGrid}>
        
        {/* Strengths Card */}
        <div className="cyber-card" style={styles.feedbackCard}>
          <div style={styles.feedbackHeader}>
            <div style={{ ...styles.colorBar, backgroundColor: '#00FF66' }} />
            <span>KEY ASSESSED STRENGTHS</span>
          </div>
          <ul style={styles.feedbackList}>
            {strengths.map((str, idx) => (
              <li key={idx} style={styles.feedbackItem}>
                <span style={{ color: '#00FF66', marginRight: '8px' }}>✓</span>
                <span>{str}</span>
              </li>
            ))}
          </ul>
        </div>

        {/* Weaknesses Card */}
        <div className="cyber-card" style={styles.feedbackCard}>
          <div style={styles.feedbackHeader}>
            <div style={{ ...styles.colorBar, backgroundColor: 'var(--red-alert)' }} />
            <span>DEVELOPMENT OPPORTUNITIES</span>
          </div>
          <ul style={styles.feedbackList}>
            {weaknesses.map((weak, idx) => (
              <li key={idx} style={styles.feedbackItem}>
                <span style={{ color: 'var(--red-alert)', marginRight: '8px' }}>▲</span>
                <span>{weak}</span>
              </li>
            ))}
          </ul>
        </div>

        {/* Action Plan Card */}
        <div className="cyber-card" style={{ ...styles.feedbackCard, gridColumn: 'span 2' }}>
          <div style={styles.feedbackHeader}>
            <div style={{ ...styles.colorBar, backgroundColor: 'var(--accent-amber)' }} />
            <span>RECOMMENDED H2H ACTION PLAN</span>
          </div>
          <ol style={styles.actionList}>
            {recommendations.map((rec, idx) => (
              <li key={idx} style={styles.actionItem}>
                <span className="data-font" style={{ color: 'var(--accent-blue)', marginRight: '8px' }}>{idx + 1}.</span>
                <span>{rec}</span>
              </li>
            ))}
          </ol>
        </div>

      </div>

      {/* Footer Controls */}
      <div style={styles.footer}>
        <button 
          className="cyber-btn"
          style={styles.actionButton}
          onClick={onRestart}
        >
          <RotateCcw size={16} />
          <span>Practice Again</span>
        </button>

        <button 
          className="cyber-btn"
          style={{ ...styles.actionButton, borderColor: '#00FF66', boxShadow: '0 0 10px rgba(0, 255, 102, 0.1)' }}
          onClick={handleDownloadPDF}
        >
          <Download size={16} />
          <span>Download PDF Report</span>
        </button>
      </div>

    </div>
  );
};

const styles: Record<string, React.CSSProperties> = {
  container: {
    display: 'flex',
    flexDirection: 'column',
    gap: '20px',
    flex: 1,
    minHeight: 0,
    overflowY: 'auto',
    paddingBottom: '20px'
  },
  topCard: {
    padding: '24px',
    backgroundColor: '#0F0F13',
    flexShrink: 0
  },
  topFlex: {
    display: 'flex',
    alignItems: 'center',
    gap: '30px'
  },
  gaugeContainer: {
    position: 'relative',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    width: '150px',
    height: '150px'
  },
  gaugeCenter: {
    position: 'absolute',
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center'
  },
  recBox: {
    display: 'flex',
    flexDirection: 'column',
    gap: '6px'
  },
  recSubtitle: {
    fontSize: '10px',
    color: 'var(--text-muted)',
    fontFamily: 'var(--font-data)',
    letterSpacing: '1.5px'
  },
  recBadge: {
    padding: '6px 14px',
    border: '1px solid',
    borderRadius: '3px',
    fontSize: '13px',
    fontWeight: 'bold',
    marginTop: '4px',
    width: 'max-content'
  },
  dateLabel: {
    fontSize: '10px',
    color: 'var(--text-muted)',
    marginTop: '6px'
  },
  middleGrid: {
    display: 'grid',
    gridTemplateColumns: '1fr 1fr 240px',
    gap: '20px',
    flexShrink: 0
  },
  card: {
    padding: '16px',
    backgroundColor: '#0F0F13',
    minHeight: '220px',
    display: 'flex',
    flexDirection: 'column',
    gap: '12px'
  },
  cardHeader: {
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
  skillsWrapper: {
    display: 'flex',
    flexDirection: 'column',
    gap: '10px',
    flex: 1,
    justifyContent: 'center'
  },
  skillBarRow: {
    display: 'flex',
    flexDirection: 'column',
    gap: '4px'
  },
  skillBarLabel: {
    display: 'flex',
    justifyContent: 'space-between',
    fontSize: '10px',
    fontWeight: 'bold',
    fontFamily: 'var(--font-data)',
    color: 'var(--text-muted)'
  },
  skillBarTrack: {
    width: '100%',
    height: '6px',
    backgroundColor: 'var(--bg-tertiary)',
    borderRadius: '3px',
    overflow: 'hidden'
  },
  skillBarFill: {
    height: '100%',
    borderRadius: '3px'
  },
  timelineContainer: {
    display: 'flex',
    flexDirection: 'column',
    gap: '12px',
    maxHeight: '150px',
    overflowY: 'auto',
    paddingRight: '4px'
  },
  timelineItem: {
    display: 'flex',
    gap: '12px'
  },
  timelineDotLine: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center'
  },
  timelineDot: {
    width: '10px',
    height: '10px',
    borderRadius: '50%',
    zIndex: 1
  },
  timelineLine: {
    width: '2px',
    flex: 1,
    backgroundColor: 'var(--bg-tertiary)',
    marginTop: '2px'
  },
  timelineContent: {
    flex: 1,
    fontSize: '12px'
  },
  timelineHeaderRow: {
    display: 'flex',
    justifyContent: 'space-between'
  },
  timelineQIndex: {
    color: 'var(--text-muted)',
    fontSize: '10px',
    fontWeight: 'bold'
  },
  timelineQText: {
    color: 'var(--text-white)',
    marginTop: '2px',
    fontSize: '11px',
    lineHeight: '1.3'
  },
  timeStatsBox: {
    display: 'flex',
    flexDirection: 'column',
    gap: '15px',
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center'
  },
  timeGaugeRow: {
    display: 'flex',
    gap: '20px'
  },
  timeGauge: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center'
  },
  timeGaugeNum: {
    fontSize: '26px',
    fontWeight: 'bold',
    color: 'var(--text-white)'
  },
  timeGaugeLabel: {
    fontSize: '10px',
    fontWeight: 'bold',
    textAlign: 'center'
  },
  bottomGrid: {
    display: 'grid',
    gridTemplateColumns: '1fr 1fr',
    gap: '20px',
    flexShrink: 0
  },
  feedbackCard: {
    padding: '20px',
    backgroundColor: '#0F0F13',
    minHeight: '140px'
  },
  feedbackHeader: {
    display: 'flex',
    alignItems: 'center',
    gap: '10px',
    fontSize: '11px',
    fontWeight: 'bold',
    fontFamily: 'var(--font-data)',
    borderBottom: '1px solid var(--border-cyber)',
    paddingBottom: '10px',
    marginBottom: '12px',
    color: 'var(--text-white)'
  },
  colorBar: {
    width: '4px',
    height: '14px',
    borderRadius: '2px'
  },
  feedbackList: {
    listStyleType: 'none',
    display: 'flex',
    flexDirection: 'column',
    gap: '8px'
  },
  feedbackItem: {
    display: 'flex',
    alignItems: 'flex-start',
    fontSize: '12.5px',
    lineHeight: '1.4',
    color: 'var(--text-white)'
  },
  actionList: {
    listStyleType: 'none',
    display: 'flex',
    flexDirection: 'column',
    gap: '8px'
  },
  actionItem: {
    display: 'flex',
    alignItems: 'flex-start',
    fontSize: '12.5px',
    lineHeight: '1.4',
    color: 'var(--text-white)'
  },
  footer: {
    display: 'flex',
    justifyContent: 'flex-end',
    gap: '15px',
    marginTop: '10px',
    flexShrink: 0
  },
  actionButton: {
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
    padding: '12px 24px'
  }
};
