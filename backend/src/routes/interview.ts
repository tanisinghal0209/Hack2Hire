import { Router, Request, Response } from 'express';
import multer from 'multer';
import pdfParse from 'pdf-parse';
import crypto from 'crypto';
import { ClaudeService } from '../services/claude';
import { InterviewState, InterviewHistoryEntry } from '../types';

const router = Router();
const upload = multer({ limits: { fileSize: 10 * 1024 * 1024 } }); // 10MB limit
const claudeService = new ClaudeService();

// In-memory session store
const sessions = new Map<string, InterviewState>();

// Helper to determine question type based on index (1-indexed)
function getQuestionTypeForIndex(index: number): 'technical' | 'behavioral' | 'scenario' | 'conceptual' {
  const types: ('technical' | 'behavioral' | 'scenario' | 'conceptual')[] = [
    'technical',
    'behavioral',
    'technical',
    'scenario',
    'conceptual',
    'technical'
  ];
  return types[(index - 1) % types.length];
}

// 1. POST /api/analyze
router.post('/analyze', upload.single('resume'), async (req: Request, res: Response) => {
  try {
    const { jobDescription, resumeText: rawResumeText } = req.body;
    let resumeText = rawResumeText || '';

    if (req.file) {
      if (req.file.mimetype === 'application/pdf') {
        try {
          const pdfData = await pdfParse(req.file.buffer);
          resumeText = pdfData.text;
        } catch (pdfErr) {
          console.error('Error parsing PDF resume in analyze:', pdfErr);
        }
      } else {
        resumeText = req.file.buffer.toString('utf-8');
      }
    }

    if (!jobDescription || jobDescription.trim() === '') {
      return res.status(400).json({ error: 'jobDescription is required.' });
    }
    const analysis = await claudeService.analyzeResume(resumeText, jobDescription);
    return res.status(200).json(analysis);
  } catch (error: any) {
    console.error('Error in /analyze:', error);
    return res.status(500).json({ error: error.message || 'Internal Server Error' });
  }
});

// 2. POST /api/get-question
router.post('/get-question', async (req: Request, res: Response) => {
  try {
    const { resumeData, jobDescription, questionHistory, currentDifficulty, questionNumber } = req.body;
    
    // Adaptive logic:
    // - If last 2 scores > 75 -> pass difficulty="hard"
    // - If last 2 scores < 45 -> pass difficulty="easy"
    // - Otherwise, currentDifficulty
    let adaptedDifficulty: 'easy' | 'medium' | 'hard' = currentDifficulty || 'medium';
    if (questionHistory && questionHistory.length >= 2) {
      const lastTwo = questionHistory.slice(-2);
      const score1 = lastTwo[0].score;
      const score2 = lastTwo[1].score;
      if (score1 > 75 && score2 > 75) {
        adaptedDifficulty = 'hard';
      } else if (score1 < 45 && score2 < 45) {
        adaptedDifficulty = 'easy';
      }
    }

    const type = getQuestionTypeForIndex(questionNumber || 1);
    const questionData = await claudeService.generateQuestion(
      resumeData,
      jobDescription,
      questionHistory || [],
      adaptedDifficulty,
      questionNumber || 1,
      type
    );

    return res.status(200).json(questionData);
  } catch (error: any) {
    console.error('Error in /get-question:', error);
    return res.status(500).json({ error: error.message || 'Internal Server Error' });
  }
});

// 3. POST /api/evaluate-answer
router.post('/evaluate-answer', async (req: Request, res: Response) => {
  try {
    const { question, answer, idealPoints, timeUsed, timeLimitSeconds, difficulty, sessionId, history } = req.body;

    const evaluation = await claudeService.evaluateAnswer(
      question || '',
      answer || '',
      idealPoints || [],
      timeUsed || 0,
      timeLimitSeconds || 120,
      difficulty || 'medium'
    );

    // Termination rules:
    // Create simulated history including current evaluation to run threshold checks
    const activeHistory = [...(history || [])];
    const cleanAns = (answer || '').trim();
    const wordCount = cleanAns.length > 0 ? cleanAns.split(/\s+/).length : 0;
    
    const currentEntry = {
      score: evaluation.total_score,
      isEmpty: wordCount < 20
    };
    activeHistory.push(currentEntry);

    // Rule 1: If 3 consecutive scores < 35 -> immediate termination
    let terminated = false;
    let reason = '';

    if (activeHistory.length >= 3) {
      const lastThree = activeHistory.slice(-3);
      if (lastThree.every(h => h.score < 35)) {
        terminated = true;
        reason = 'Performance below threshold (3 consecutive scores < 35)';
      }
    }

    // Rule 2: If 2 consecutive "empty" answers (< 20 words) -> immediate termination
    if (activeHistory.length >= 2) {
      const lastTwo = activeHistory.slice(-2);
      if (lastTwo.every(h => h.isEmpty)) {
        terminated = true;
        reason = 'Immediate termination (2 consecutive empty or extremely brief answers)';
      }
    }

    if (terminated) {
      return res.status(200).json({
        ...evaluation,
        terminated: true,
        reason
      });
    }

    return res.status(200).json({
      ...evaluation,
      terminated: false
    });
  } catch (error: any) {
    console.error('Error in /evaluate-answer:', error);
    return res.status(500).json({ error: error.message || 'Internal Server Error' });
  }
});

// 4. POST /api/final-report
router.post('/final-report', async (req: Request, res: Response) => {
  try {
    const { allQuestions, allAnswers, allScores, resumeData, jobDescription, history } = req.body;
    
    const report = await claudeService.generateFinalReport(
      allQuestions || [],
      allAnswers || [],
      allScores || [],
      resumeData || {},
      jobDescription || '',
      history || []
    );

    return res.status(200).json(report);
  } catch (error: any) {
    console.error('Error in /final-report:', error);
    return res.status(500).json({ error: error.message || 'Internal Server Error' });
  }
});

// Legacy Endpoint for full-session flow start
router.post('/start', upload.single('resume'), async (req: Request, res: Response) => {
  try {
    const { candidateName, jobDescription, resumeText: rawResumeText } = req.body;
    let resumeText = rawResumeText || '';

    if (req.file) {
      if (req.file.mimetype === 'application/pdf') {
        try {
          const pdfData = await pdfParse(req.file.buffer);
          resumeText = pdfData.text;
        } catch (pdfErr) {
          console.error('Error parsing PDF resume:', pdfErr);
          return res.status(400).json({ error: 'Could not extract text from PDF resume.' });
        }
      } else {
        resumeText = req.file.buffer.toString('utf-8');
      }
    }

    if (!jobDescription || jobDescription.trim() === '') {
      return res.status(400).json({ error: 'Job description is required.' });
    }

    const analysis = await claudeService.analyzeResume(resumeText, jobDescription);

    const sessionId = crypto.randomUUID();
    const initialDifficulty = 'medium';
    const initialType = getQuestionTypeForIndex(1);

    const questionData = await claudeService.generateQuestion(
      analysis,
      jobDescription,
      [],
      initialDifficulty,
      1,
      initialType
    );

    const newState: InterviewState = {
      id: sessionId,
      candidateName: candidateName || 'Candidate',
      resumeText,
      jobDescription,
      difficulty: initialDifficulty,
      currentQuestionIndex: 1,
      maxQuestions: 6,
      history: [],
      status: 'ongoing',
      overallScore: 0,
      resumeData: analysis
    };

    sessions.set(sessionId, newState);

    return res.status(200).json({
      sessionId,
      status: newState.status,
      currentQuestionIndex: newState.currentQuestionIndex,
      maxQuestions: newState.maxQuestions,
      difficulty: newState.difficulty,
      nextQuestion: questionData.question,
      type: questionData.type,
      topic: questionData.topic,
      idealPoints: questionData.ideal_answer_points,
      timeLimit: questionData.time_limit_seconds,
      isSimulated: claudeService.getIsSimulated(),
      resumeData: analysis
    });

  } catch (error: any) {
    console.error('Error in legacy /start:', error);
    return res.status(500).json({ error: error.message || 'Internal Server Error' });
  }
});

export default router;
