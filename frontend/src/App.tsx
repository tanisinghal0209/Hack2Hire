import { useState, useEffect } from 'react';
import { Header } from './components/Header';
import { SetupScreen } from './components/SetupScreen';
import { Terminal } from './components/Terminal';
import { ReportCard } from './components/ReportCard';
import type { FinalReportResponse, InterviewHistoryEntry } from '../../backend/src/types';

const API_BASE = 'http://localhost:5001/api';

function App() {
  const [status, setStatus] = useState<'setup' | 'ongoing' | 'terminated' | 'completed'>('setup');
  const [loading, setLoading] = useState(false);
  const [isSimulated, setIsSimulated] = useState(true);
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [candidateName, setCandidateName] = useState('Candidate');
  const [jobDescriptionText, setJobDescriptionText] = useState('');
  const [resumeData, setResumeData] = useState<any>(null);
  
  // Active Question info
  const [currentQuestion, setCurrentQuestion] = useState('');
  const [currentQuestionType, setCurrentQuestionType] = useState<'technical' | 'behavioral' | 'scenario' | 'conceptual'>('technical');
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(1);
  const [maxQuestions] = useState(6);
  const [difficulty, setDifficulty] = useState<'easy' | 'medium' | 'hard'>('medium');
  const [timeLimit, setTimeLimit] = useState(120);
  const [idealPoints, setIdealPoints] = useState<string[]>([]);
  const [topic, setTopic] = useState('');

  // History and Final Report
  const [history, setHistory] = useState<InterviewHistoryEntry[]>([]);
  const [report, setReport] = useState<FinalReportResponse | null>(null);

  // Ping backend on boot to check mode
  useEffect(() => {
    fetch('http://localhost:5001/health')
      .then(res => res.json())
      .then(data => {
        console.log('Backend connected. System Health check: OK.', data);
      })
      .catch(err => {
        console.warn('Backend is offline. Run "npm run dev" in the backend directory.', err);
      });
  }, []);

  const handleStartInterview = async (name: string, jobDescription: string, resumeFile: File | null, resumeText: string) => {
    setLoading(true);
    setCandidateName(name || 'Candidate');
    setJobDescriptionText(jobDescription);
    try {
      const formData = new FormData();
      formData.append('candidateName', name || 'Candidate');
      formData.append('jobDescription', jobDescription);
      formData.append('resumeText', resumeText || '');
      if (resumeFile) {
        formData.append('resume', resumeFile);
      }

      const response = await fetch(`${API_BASE}/interview/start`, {
        method: 'POST',
        body: formData,
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to start interview.');
      }

      const data = await response.json();
      setSessionId(data.sessionId);
      setStatus(data.status); // 'ongoing'
      setCurrentQuestion(data.nextQuestion);
      setCurrentQuestionType(data.type);
      setTopic(data.topic || 'Software Engineering');
      setIdealPoints(data.idealPoints || []);
      setCurrentQuestionIndex(data.currentQuestionIndex);
      setDifficulty(data.difficulty);
      setTimeLimit(data.timeLimit);
      setIsSimulated(data.isSimulated);
      setResumeData(data.resumeData);
      setHistory([]);
      setReport(null);

    } catch (err: any) {
      console.error(err);
      alert(`API Connection Failure: ${err.message}. Ensure your backend server is running on port 5001.`);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmitAnswer = async (answer: string, timeSpent: number) => {
    if (!sessionId) return;
    setLoading(true);
    try {
      const response = await fetch(`${API_BASE}/evaluate-answer`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          sessionId,
          question: currentQuestion,
          answer,
          idealPoints,
          timeUsed: timeSpent,
          timeLimitSeconds: timeLimit,
          difficulty,
          history
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to submit response.');
      }

      const data = await response.json();

      // Add last evaluation to history
      const newHistoryItem: InterviewHistoryEntry = {
        question: currentQuestion,
        questionType: currentQuestionType,
        answer,
        score: data.total_score || 0,
        accuracy: data.accuracy || 0,
        clarity: data.clarity || 0,
        depth: data.depth || 0,
        relevance: data.relevance || 0,
        time_efficiency: data.time_efficiency || 0,
        time_penalty: data.time_penalty || 0,
        feedback: data.feedback_line || '',
        difficulty,
        topic,
        timeSpent,
        timeLimit,
        idealPoints
      };
      
      const updatedHistory = [...history, newHistoryItem];
      setHistory(updatedHistory);

      const isLastQuestion = currentQuestionIndex >= maxQuestions;

      if (data.terminated || isLastQuestion) {
        // Compile Final Report
        const nextStatus = data.terminated ? 'terminated' : 'completed';
        
        const reportRes = await fetch(`${API_BASE}/final-report`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            allQuestions: updatedHistory.map(h => h.question),
            allAnswers: updatedHistory.map(h => h.answer),
            allScores: updatedHistory.map(h => h.score),
            resumeData,
            jobDescription: jobDescriptionText,
            history: updatedHistory
          }),
        });

        if (!reportRes.ok) {
          throw new Error('Failed to compile final interview assessment scorecard.');
        }

        const reportData = await reportRes.json();
        setReport(reportData);
        setStatus(nextStatus);
      } else {
        // Fetch Next Question
        const qNumber = currentQuestionIndex + 1;
        const qResponse = await fetch(`${API_BASE}/get-question`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            resumeData,
            jobDescription: jobDescriptionText,
            questionHistory: updatedHistory,
            currentDifficulty: difficulty,
            questionNumber: qNumber
          }),
        });

        if (!qResponse.ok) {
          throw new Error('Failed to retrieve the next adaptive question module.');
        }

        const qData = await qResponse.json();
        
        // Next Question setup
        setCurrentQuestion(qData.question);
        setCurrentQuestionType(qData.type);
        setDifficulty(qData.difficulty);
        setTopic(qData.topic || 'Engineering Architecture');
        setIdealPoints(qData.ideal_answer_points || []);
        setTimeLimit(qData.time_limit_seconds || 120);
        setCurrentQuestionIndex(qNumber);
      }

    } catch (err: any) {
      console.error(err);
      alert(`Error submitting response: ${err.message}`);
    } finally {
      setLoading(false);
    }
  };

  const handleRestart = () => {
    setStatus('setup');
    setSessionId(null);
    setHistory([]);
    setReport(null);
  };

  return (
    <div className="app-container scanlines">
      <Header status={status} isSimulated={isSimulated} />
      
      {status === 'setup' && (
        <SetupScreen onStart={handleStartInterview} loading={loading} />
      )}

      {status === 'ongoing' && (
        <Terminal
          question={currentQuestion}
          questionType={currentQuestionType}
          currentQuestionIndex={currentQuestionIndex}
          maxQuestions={maxQuestions}
          difficulty={difficulty === 'hard' ? 5 : difficulty === 'easy' ? 1 : 3}
          timeLimit={timeLimit}
          onSubmitAnswer={handleSubmitAnswer}
          loading={loading}
          history={history}
        />
      )}

      {(status === 'completed' || status === 'terminated') && report && (
        <ReportCard 
          report={report} 
          candidateName={candidateName} 
          history={history}
          onRestart={handleRestart} 
        />
      )}
    </div>
  );
}

export default App;
