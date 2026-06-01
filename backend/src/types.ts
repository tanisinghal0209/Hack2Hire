export interface InterviewHistoryEntry {
  question: string;
  questionType: 'technical' | 'behavioral' | 'scenario' | 'conceptual';
  answer: string;
  score: number; // 0 to 100
  accuracy: number; // 0 to 25
  clarity: number; // 0 to 20
  depth: number; // 0 to 25
  relevance: number; // 0 to 20
  time_efficiency: number; // 0 to 10
  time_penalty: number;
  feedback: string;
  difficulty: 'easy' | 'medium' | 'hard';
  topic: string;
  timeSpent: number;
  timeLimit: number;
  idealPoints: string[];
}

export interface InterviewState {
  id: string;
  candidateName: string;
  resumeText: string;
  jobDescription: string;
  difficulty: 'easy' | 'medium' | 'hard';
  currentQuestionIndex: number;
  maxQuestions: number;
  history: InterviewHistoryEntry[];
  status: 'setup' | 'ongoing' | 'terminated' | 'completed';
  overallScore: number;
  resumeData?: any;
}

export interface QuestionResponse {
  question: string;
  type: 'technical' | 'behavioral' | 'scenario' | 'conceptual';
  difficulty: 'easy' | 'medium' | 'hard';
  topic: string;
  time_limit_seconds: number;
  ideal_answer_points: string[];
}

export interface EvaluationResponse {
  total_score: number; // 0 to 100
  accuracy: number; // 0 to 25
  clarity: number; // 0 to 20
  depth: number; // 0 to 25
  relevance: number; // 0 to 20
  time_efficiency: number; // 0 to 10
  time_penalty: number;
  feedback_line: string;
}

export interface FinalReportResponse {
  overall_score: number;
  skill_breakdown: Record<string, number>;
  strengths: string[];
  weaknesses: string[];
  recommendations: string[];
  hiring_readiness: 'Strong' | 'Average' | 'Needs Improvement';
}

export interface AnalysisResponse {
  name?: string;
  skills: string[];
  experience_years: number;
  relevant_projects: string[];
  role_match_score: number;
  suggested_focus_areas: string[];
}
