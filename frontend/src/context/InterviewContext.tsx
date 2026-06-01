import React, { createContext, useContext, useReducer, useEffect, useRef } from 'react';
import type { FinalReportResponse } from '../../../backend/src/types';

export interface AppState {
  phase: 'upload' | 'analyzing' | 'interview' | 'terminated' | 'completed';
  candidate: {
    name: string;
    skills: string[];
    experience: number;
    resumeText: string;
    jobDescription: string;
    roleMatchScore: number;
  };
  session: {
    currentQuestionIndex: number;
    currentDifficulty: 'easy' | 'medium' | 'hard';
    consecutiveLowScores: number;
    questions: any[];
    answers: string[];
    scores: number[];
    startTime: number | null;
    totalTimeUsed: number;
  };
  ui: {
    loading: boolean;
    error: string | null;
    timerActive: boolean;
    timeLeft: number;
    timeLimit: number;
  };
  currentQuestion: any | null;
  report: FinalReportResponse | null;
}

export type Action =
  | { type: 'START_SESSION'; payload: { name: string; resumeText: string; jobDescription: string; skills: string[]; experience: number; roleMatchScore: number; question: any } }
  | { type: 'LOAD_QUESTION'; payload: { question: any } }
  | { type: 'SUBMIT_ANSWER'; payload: { answer: string } }
  | { type: 'SCORE_RECEIVED'; payload: { score: number; evaluation: any } }
  | { type: 'TERMINATE'; payload: { reason: string } }
  | { type: 'COMPLETE'; payload: { report: FinalReportResponse } }
  | { type: 'TIMER_TICK' }
  | { type: 'SET_LOADING'; payload: boolean }
  | { type: 'SET_ERROR'; payload: string | null }
  | { type: 'RESTART' };

const initialState: AppState = {
  phase: 'upload',
  candidate: {
    name: 'Candidate',
    skills: [],
    experience: 0,
    resumeText: '',
    jobDescription: '',
    roleMatchScore: 0
  },
  session: {
    currentQuestionIndex: 0,
    currentDifficulty: 'medium',
    consecutiveLowScores: 0,
    questions: [],
    answers: [],
    scores: [],
    startTime: null,
    totalTimeUsed: 0
  },
  ui: {
    loading: false,
    error: null,
    timerActive: false,
    timeLeft: 120,
    timeLimit: 120
  },
  currentQuestion: null,
  report: null
};

// Pure function for adaptive difficulty
function calculateNextDifficulty(score: number, current: 'easy' | 'medium' | 'hard'): 'easy' | 'medium' | 'hard' {
  if (score > 75) {
    if (current === 'easy') return 'medium';
    if (current === 'medium') return 'hard';
  } else if (score < 45) {
    if (current === 'hard') return 'medium';
    if (current === 'medium') return 'easy';
  }
  return current;
}

function interviewReducer(state: AppState, action: Action): AppState {
  switch (action.type) {
    case 'START_SESSION':
      return {
        ...state,
        phase: 'interview',
        candidate: {
          name: action.payload.name,
          skills: action.payload.skills,
          experience: action.payload.experience,
          resumeText: action.payload.resumeText,
          jobDescription: action.payload.jobDescription,
          roleMatchScore: action.payload.roleMatchScore
        },
        session: {
          currentQuestionIndex: 1,
          currentDifficulty: 'medium',
          consecutiveLowScores: 0,
          questions: [action.payload.question],
          answers: [],
          scores: [],
          startTime: Date.now(),
          totalTimeUsed: 0
        },
        ui: {
          loading: false,
          error: null,
          timerActive: true,
          timeLeft: action.payload.question.time_limit_seconds || 120,
          timeLimit: action.payload.question.time_limit_seconds || 120
        },
        currentQuestion: action.payload.question
      };

    case 'LOAD_QUESTION':
      return {
        ...state,
        currentQuestion: action.payload.question,
        session: {
          ...state.session,
          currentQuestionIndex: state.session.currentQuestionIndex + 1,
          questions: [...state.session.questions, action.payload.question]
        },
        ui: {
          ...state.ui,
          loading: false,
          timerActive: true,
          timeLeft: action.payload.question.time_limit_seconds || 120,
          timeLimit: action.payload.question.time_limit_seconds || 120
        }
      };

    case 'SUBMIT_ANSWER':
      return {
        ...state,
        ui: {
          ...state.ui,
          loading: true,
          timerActive: false
        }
      };

    case 'SCORE_RECEIVED': {
      const { score } = action.payload;
      const scores = [...state.session.scores, score];
      
      // Compute consecutive scores < 35
      const consecutiveLowScores = score < 35 ? state.session.consecutiveLowScores + 1 : 0;
      const nextDiff = calculateNextDifficulty(score, state.session.currentDifficulty);

      return {
        ...state,
        session: {
          ...state.session,
          scores,
          consecutiveLowScores,
          currentDifficulty: nextDiff,
          totalTimeUsed: state.session.totalTimeUsed + (state.ui.timeLimit - state.ui.timeLeft)
        },
        ui: {
          ...state.ui,
          loading: false
        }
      };
    }

    case 'TERMINATE':
      return {
        ...state,
        phase: 'terminated',
        ui: {
          ...state.ui,
          loading: false,
          timerActive: false
        }
      };

    case 'COMPLETE':
      return {
        ...state,
        phase: 'completed',
        report: action.payload.report,
        ui: {
          ...state.ui,
          loading: false,
          timerActive: false
        }
      };

    case 'TIMER_TICK':
      if (!state.ui.timerActive || state.ui.timeLeft <= 0) return state;
      return {
        ...state,
        ui: {
          ...state.ui,
          timeLeft: state.ui.timeLeft - 1
        }
      };

    case 'SET_LOADING':
      return {
        ...state,
        ui: { ...state.ui, loading: action.payload }
      };

    case 'SET_ERROR':
      return {
        ...state,
        ui: { ...state.ui, error: action.payload }
      };

    case 'RESTART':
      return initialState;

    default:
      return state;
  }
}

interface InterviewContextType {
  state: AppState;
  dispatch: React.Dispatch<Action>;
  submitAnswer: (answer: string) => Promise<void>;
  restartSession: () => void;
}

const InterviewContext = createContext<InterviewContextType | null>(null);

export const InterviewProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [state, dispatch] = useReducer(interviewReducer, initialState);
  const timerRef = useRef<any>(null);

  // Timer tick effect
  useEffect(() => {
    if (state.ui.timerActive && state.ui.timeLeft > 0) {
      timerRef.current = setInterval(() => {
        dispatch({ type: 'TIMER_TICK' });
      }, 1000);
    } else {
      if (timerRef.current) clearInterval(timerRef.current);
    }

    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [state.ui.timerActive, state.ui.timeLeft]);

  // Handle Timeout Auto-submit
  useEffect(() => {
    if (state.ui.timerActive && state.ui.timeLeft === 0 && !state.ui.loading) {
      submitAnswer('TIME_UP');
    }
  }, [state.ui.timeLeft, state.ui.timerActive]);

  const submitAnswer = async (answerText: string) => {
    dispatch({ type: 'SUBMIT_ANSWER', payload: { answer: answerText } });
    
    try {
      const timeSpent = state.ui.timeLimit - state.ui.timeLeft;
      const historyEntriesForEvaluation = state.session.scores.map((s, idx) => ({
        score: s,
        isEmpty: state.session.answers[idx]?.length < 20
      }));

      const evaluateRes = await fetch('http://localhost:5001/api/evaluate-answer', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          question: state.currentQuestion.question,
          answer: answerText === 'TIME_UP' ? '' : answerText,
          idealPoints: state.currentQuestion.ideal_answer_points,
          timeUsed: timeSpent,
          timeLimitSeconds: state.ui.timeLimit,
          difficulty: state.session.currentDifficulty,
          history: historyEntriesForEvaluation
        })
      });

      if (!evaluateRes.ok) throw new Error('API answer evaluation failed.');
      const data = await evaluateRes.json();

      dispatch({ type: 'SCORE_RECEIVED', payload: { score: data.total_score, evaluation: data } });

      // Determine next phase actions
      const updatedScores = [...state.session.scores, data.total_score];
      const isLowPerformance = data.terminated; // backend termination flag

      if (isLowPerformance) {
        dispatch({ type: 'TERMINATE', payload: { reason: data.reason } });
        return;
      }

      const isLast = state.session.currentQuestionIndex >= 10;
      if (isLast) {
        // Fetch final report
        const reportRes = await fetch('http://localhost:5001/api/final-report', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            allQuestions: state.session.questions.map(q => q.question),
            allAnswers: [...state.session.answers, answerText === 'TIME_UP' ? '' : answerText],
            allScores: updatedScores,
            resumeData: state.candidate,
            jobDescription: state.candidate.jobDescription
          })
        });

        if (!reportRes.ok) throw new Error('Failed fetching report.');
        const reportData = await reportRes.json();
        dispatch({ type: 'COMPLETE', payload: { report: reportData } });
      } else {
        // Fetch next question
        const qResponse = await fetch('http://localhost:5001/api/get-question', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            resumeData: state.candidate,
            jobDescription: state.candidate.jobDescription,
            questionHistory: updatedScores.map((s, idx) => ({
              question: state.session.questions[idx].question,
              score: s,
              topic: state.session.questions[idx].topic
            })),
            currentDifficulty: state.session.currentDifficulty,
            questionNumber: state.session.currentQuestionIndex + 1
          })
        });

        if (!qResponse.ok) throw new Error('Failed fetching next question.');
        const qData = await qResponse.json();
        
        dispatch({ type: 'LOAD_QUESTION', payload: { question: qData } });
      }
    } catch (err: any) {
      console.error(err);
      dispatch({ type: 'SET_ERROR', payload: err.message || 'API connection failed.' });
    }
  };

  const restartSession = () => {
    dispatch({ type: 'RESTART' });
  };

  return (
    <InterviewContext.Provider value={{ state, dispatch, submitAnswer, restartSession }}>
      {children}
    </InterviewContext.Provider>
  );
};

export const useInterview = () => {
  const context = useContext(InterviewContext);
  if (!context) throw new Error('useInterview must be used within an InterviewProvider');
  return context;
};
