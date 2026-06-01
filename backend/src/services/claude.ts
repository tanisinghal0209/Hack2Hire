import Anthropic from '@anthropic-ai/sdk';
import { QuestionResponse, EvaluationResponse, FinalReportResponse, InterviewHistoryEntry, AnalysisResponse } from '../types';

const isProductionModel = 'claude-3-5-sonnet-20241022';

function parseJSONFromText(text: string): any {
  try {
    return JSON.parse(text.trim());
  } catch (e) {
    const jsonMatch = text.match(/```json\s*([\s\S]*?)\s*```/) || text.match(/```\s*([\s\S]*?)\s*```/);
    if (jsonMatch && jsonMatch[1]) {
      try {
        return JSON.parse(jsonMatch[1].trim());
      } catch (innerErr) {
        throw new Error('Failed to parse clean JSON block: ' + innerErr);
      }
    }
    const firstBrace = text.indexOf('{');
    const lastBrace = text.lastIndexOf('}');
    if (firstBrace !== -1 && lastBrace !== -1) {
      try {
        return JSON.parse(text.substring(firstBrace, lastBrace + 1).trim());
      } catch (sliceErr) {
        throw new Error('Failed to parse sliced JSON: ' + sliceErr);
      }
    }
    throw e;
  }
}

export class ClaudeService {
  private anthropic: Anthropic | null = null;
  private isSimulated: boolean = true;

  constructor() {
    const apiKey = process.env.ANTHROPIC_API_KEY;
    if (apiKey && apiKey !== 'YOUR_ANTHROPIC_API_KEY' && apiKey.trim() !== '') {
      this.anthropic = new Anthropic({ apiKey });
      this.isSimulated = false;
      console.log('Claude API Service initialized successfully using Sonnet 3.5.');
    } else {
      console.log('WARNING: No ANTHROPIC_API_KEY found. Running in Hack2Hire SIMULATOR Mode.');
      this.isSimulated = true;
    }
  }

  public getIsSimulated(): boolean {
    return this.isSimulated;
  }

  // 1. POST /api/analyze
  async analyzeResume(resumeText: string, jobDescription: string): Promise<AnalysisResponse> {
    if (this.isSimulated) {
      return this.simulateAnalysis(resumeText, jobDescription);
    }

    try {
      const systemPrompt = `You are a professional HR assessment engine. Analyze the candidate's resume relative to the JD.
You must output a single JSON object. Do not output any markdown formatting other than the JSON itself.
Format:
{
  "name": "Candidate Name",
  "skills": ["Skill A", "Skill B", "Skill C"],
  "experience_years": number,
  "relevant_projects": ["Project Title 1 - short desc", "Project Title 2 - short desc"],
  "role_match_score": number (0-100),
  "suggested_focus_areas": ["Focus A", "Focus B"]
}`;

      const userPrompt = `
Job Description:
${jobDescription}

Resume:
${resumeText}

Analyze and extract the information according to the format.`;

      const response = await this.anthropic!.messages.create({
        model: isProductionModel,
        max_tokens: 800,
        temperature: 0.2,
        system: systemPrompt,
        messages: [{ role: 'user', content: userPrompt }],
      });

      const responseText = response.content[0].type === 'text' ? response.content[0].text : '';
      return parseJSONFromText(responseText) as AnalysisResponse;
    } catch (error) {
      console.error('Claude analyze API call failed:', error);
      return this.simulateAnalysis(resumeText, jobDescription);
    }
  }

  // 2. POST /api/get-question
  async generateQuestion(
    resumeData: any,
    jobDescription: string,
    history: any[],
    currentDifficulty: 'easy' | 'medium' | 'hard',
    questionNumber: number,
    questionType: 'technical' | 'behavioral' | 'scenario' | 'conceptual'
  ): Promise<QuestionResponse> {
    if (this.isSimulated) {
      return this.simulateQuestion(resumeData, jobDescription, history, currentDifficulty, questionNumber, questionType);
    }

    try {
      const historyStr = history.map((h, i) => `Q${i+1}: ${h.question} (Topic: ${h.topic})`).join('\n');

      const systemPrompt = `You are a senior technical interviewer. Generate exactly ONE interview question.
You must output a single JSON object. Do not output any markdown formatting other than the JSON itself.
Format:
{
  "question": "The question text",
  "type": "technical" | "behavioral" | "scenario" | "conceptual",
  "difficulty": "easy" | "medium" | "hard",
  "topic": "The targeted skill area (e.g. React, system design, etc.)",
  "time_limit_seconds": number,
  "ideal_answer_points": ["Expected Point 1", "Expected Point 2", "Expected Point 3"]
}`;

      const userPrompt = `
Job Description:
${jobDescription}

Candidate Profile:
${JSON.stringify(resumeData || {})}

Previous questions asked:
${historyStr || 'None. This is the first question.'}

Current Targeted Difficulty: ${currentDifficulty}
Current Question Number: ${questionNumber}
Current Targeted Type: ${questionType}

Rules:
1. No repeated topics.
2. Formulate a challenging, clean question.
3. Easy difficulty: standard questions. Medium: core scenarios. Hard: deep system performance / architectural optimizations.`;

      const response = await this.anthropic!.messages.create({
        model: isProductionModel,
        max_tokens: 1000,
        temperature: 0.7,
        system: systemPrompt,
        messages: [{ role: 'user', content: userPrompt }],
      });

      const responseText = response.content[0].type === 'text' ? response.content[0].text : '';
      return parseJSONFromText(responseText) as QuestionResponse;
    } catch (error) {
      console.error('Claude generate-question API call failed:', error);
      return this.simulateQuestion(resumeData, jobDescription, history, currentDifficulty, questionNumber, questionType);
    }
  }

  // 3. POST /api/evaluate-answer
  async evaluateAnswer(
    question: string,
    answer: string,
    idealPoints: string[],
    timeUsed: number,
    timeLimitSeconds: number,
    difficulty: 'easy' | 'medium' | 'hard'
  ): Promise<EvaluationResponse> {
    
    // Core check 1: If answer is empty or too short (< 20 words) -> score = 5 max.
    const cleanAnswer = (answer || '').trim();
    const wordCount = cleanAnswer.length > 0 ? cleanAnswer.split(/\s+/).length : 0;
    
    if (wordCount < 20) {
      // Calculate time penalty if any
      let time_penalty = 0;
      if (timeUsed > timeLimitSeconds) {
        time_penalty = (timeUsed - timeLimitSeconds) * 0.5;
      }
      return {
        total_score: Math.max(0, parseFloat((5.0 - time_penalty).toFixed(1))),
        accuracy: 1.5,
        clarity: 1.5,
        depth: 1.0,
        relevance: 1.0,
        time_efficiency: 0,
        time_penalty,
        feedback_line: 'Answer is too short (< 20 words). Please elaborate with technical explanations.'
      };
    }

    if (this.isSimulated) {
      return this.simulateEvaluation(question, answer, idealPoints, timeUsed, timeLimitSeconds, difficulty);
    }

    try {
      const systemPrompt = `You are a technical bar-raiser evaluating a candidate answer.
Score the answer based on these rules:
- Accuracy (0 to 25 points)
- Clarity (0 to 20 points)
- Depth (0 to 25 points)
- Relevance (0 to 20 points)
- Time Efficiency (0 to 10 points)

Time limit for this question is: ${timeLimitSeconds} seconds.
Ideal key points expected in response:
${idealPoints.map(p => `- ${p}`).join('\n')}

You must output a single JSON object. Do not output any markdown formatting other than the JSON itself.
Format:
{
  "accuracy": number (0-25),
  "clarity": number (0-20),
  "depth": number (0-25),
  "relevance": number (0-20),
  "time_efficiency": number (0-10),
  "feedback_line": "Constructive short critique feedback string"
}`;

      const userPrompt = `
Question: ${question}
Candidate Answer: "${answer}"
Time Used: ${timeUsed} seconds.
Difficulty Tier: ${difficulty}

Evaluate fairly and score metrics accordingly.`;

      const response = await this.anthropic!.messages.create({
        model: isProductionModel,
        max_tokens: 800,
        temperature: 0.2,
        system: systemPrompt,
        messages: [{ role: 'user', content: userPrompt }],
      });

      const responseText = response.content[0].type === 'text' ? response.content[0].text : '';
      const data = parseJSONFromText(responseText);

      // Perform penalty calculation: if timeUsed > timeLimitSeconds, deduct (timeUsed - timeLimitSeconds) * 0.5 points from total.
      let time_penalty = 0;
      if (timeUsed > timeLimitSeconds) {
        time_penalty = (timeUsed - timeLimitSeconds) * 0.5;
      }

      const sumScore = data.accuracy + data.clarity + data.depth + data.relevance + data.time_efficiency;
      const total_score = Math.max(0, parseFloat((sumScore - time_penalty).toFixed(1)));

      return {
        total_score,
        accuracy: data.accuracy,
        clarity: data.clarity,
        depth: data.depth,
        relevance: data.relevance,
        time_efficiency: data.time_efficiency,
        time_penalty,
        feedback_line: data.feedback_line
      };
    } catch (error) {
      console.error('Claude evaluate API call failed:', error);
      return this.simulateEvaluation(question, answer, idealPoints, timeUsed, timeLimitSeconds, difficulty);
    }
  }

  // 4. POST /api/final-report
  async generateFinalReport(
    allQuestions: string[],
    allAnswers: string[],
    allScores: number[],
    resumeData: any,
    jobDescription: string,
    history: InterviewHistoryEntry[]
  ): Promise<FinalReportResponse> {
    if (this.isSimulated) {
      return this.simulateFinalReport(history);
    }

    try {
      const logs = history.map((h, i) => 
        `Q${i+1} [${h.questionType}]: ${h.question}\nAnswer: ${h.answer}\nScore: ${h.score}/100\nFeedback: ${h.feedback}`
      ).join('\n\n');

      const systemPrompt = `You are a principal hiring manager reviewing an interview report.
Generate a structured JSON output. Do not include markdown code block syntax.
Format:
{
  "overall_score": number (0-100),
  "skill_breakdown": {
    "React & Frontend": number,
    "DSA & Algorithms": number,
    "System Design": number,
    "Communication": number
  },
  "strengths": ["Strength A", "Strength B"],
  "weaknesses": ["Weakness A", "Weakness B"],
  "recommendations": ["Action A", "Action B"],
  "hiring_readiness": "Strong" | "Average" | "Needs Improvement"
}`;

      const userPrompt = `
Job Description:
${jobDescription}

Profile Analyzed:
${JSON.stringify(resumeData || {})}

Interview Logs:
${logs}

Compile the final assessment.`;

      const response = await this.anthropic!.messages.create({
        model: isProductionModel,
        max_tokens: 1500,
        temperature: 0.5,
        system: systemPrompt,
        messages: [{ role: 'user', content: userPrompt }],
      });

      const responseText = response.content[0].type === 'text' ? response.content[0].text : '';
      return parseJSONFromText(responseText) as FinalReportResponse;
    } catch (error) {
      console.error('Claude final-report API call failed:', error);
      return this.simulateFinalReport(history);
    }
  }

  // --- MOCK SIMULATORS ---

  private simulateAnalysis(resumeText: string, jobDescription: string): AnalysisResponse {
    const availableSkills = ['React', 'TypeScript', 'Node.js', 'Express', 'SQL', 'MongoDB', 'AWS', 'Docker', 'System Design', 'Communication'];
    const matched: string[] = [];
    const lower = resumeText.toLowerCase();
    availableSkills.forEach(s => {
      if (lower.includes(s.toLowerCase())) matched.push(s);
    });
    if (matched.length === 0) matched.push('JavaScript', 'System Architecture');

    let extractedName = 'Candidate';
    const lines = resumeText.split('\n').map(l => l.trim()).filter(l => l.length > 0);
    if (lines.length > 0) {
      const firstLine = lines[0];
      if (firstLine.length < 40 && !firstLine.includes(':') && !firstLine.includes('/') && !firstLine.includes('@')) {
        extractedName = firstLine;
      }
    }

    return {
      name: extractedName,
      skills: matched.slice(0, 5),
      experience_years: lower.includes('5 years') ? 5 : lower.includes('10 years') ? 10 : 3,
      relevant_projects: ['E-commerce Microservice API', 'Admin Analytics Panel'],
      role_match_score: Math.min(95, 40 + matched.length * 7),
      suggested_focus_areas: ['Optimize DB index scans', 'Review asynchronous queue concurrency']
    };
  }

  private simulateQuestion(
    resumeData: any,
    jobDescription: string,
    history: any[],
    currentDifficulty: 'easy' | 'medium' | 'hard',
    questionNumber: number,
    questionType: 'technical' | 'behavioral' | 'scenario' | 'conceptual'
  ): QuestionResponse {
    const questions: Record<string, Array<{ q: string, topic: string, points: string[] }>> = {
      technical: [
        {
          q: 'Explain how you would design a cache eviction policy using a Least Recently Used (LRU) algorithm in React or memory buffers.',
          topic: 'Caching & Algorithms',
          points: ['Define hash map mapping keys to nodes', 'Explain DLL adjustments', 'State O(1) time complexity bounds']
        },
        {
          q: 'What is the purpose of database partitioning and indexing? Explain when to choose horizontal vs vertical split.',
          topic: 'Database Optimization',
          points: ['Discuss network CPU bottlenecks', 'Explain split metrics range-based vs hash', 'Analyze index memory footprints']
        }
      ],
      behavioral: [
        {
          q: 'Describe a situation where a major bug leaked to production under your supervision. How did you triage and coordinate fixes?',
          topic: 'Crisis Coordination',
          points: ['State clear timeline details', 'Outline root-cause post-mortem details', 'Explain rollback safety thresholds']
        }
      ],
      scenario: [
        {
          q: 'Our payment microservice begins returning 504 gateway timeouts during high throughput sale events. Walk me through your diagnostics step-by-step.',
          topic: 'Fault Diagnostics',
          points: ['Investigate database lock durations', 'Check ingress API limits', 'Enforce dead-letter queue retries']
        }
      ],
      conceptual: [
        {
          q: 'Explain the SOLID design principles in software engineering and how they improve module decoupling.',
          topic: 'SOLID Architecture',
          points: ['Explain single responsibility constraints', 'Detail open-closed pattern application', 'Detail Liskov substitution logic']
        }
      ]
    };

    const typeQList = questions[questionType] || questions.technical;
    const item = typeQList[history.length % typeQList.length];

    return {
      question: item.q,
      type: questionType,
      difficulty: currentDifficulty,
      topic: item.topic,
      time_limit_seconds: questionType === 'scenario' ? 150 : 120,
      ideal_answer_points: item.points
    };
  }

  private simulateEvaluation(
    question: string,
    answer: string,
    idealPoints: string[],
    timeUsed: number,
    timeLimitSeconds: number,
    difficulty: 'easy' | 'medium' | 'hard'
  ): EvaluationResponse {
    const cleanAnswer = (answer || '').trim();
    const wordCount = cleanAnswer.split(/\s+/).length;

    // Base mock metrics calculations
    let accuracy = Math.min(25, 10 + (wordCount / 12));
    let clarity = Math.min(20, 8 + (wordCount / 15));
    let depth = Math.min(25, 6 + (wordCount / 10));
    let relevance = Math.min(20, 10 + (wordCount / 18));
    let time_efficiency = timeUsed <= timeLimitSeconds ? 9 : 3;

    // Match keywords to ideal points
    idealPoints.forEach(pt => {
      const words = pt.toLowerCase().split(/\s+/);
      const matched = words.filter(w => w.length > 3 && cleanAnswer.toLowerCase().includes(w));
      if (matched.length > 0) {
        accuracy = Math.min(25, accuracy + 1.5);
        depth = Math.min(25, depth + 1.5);
      }
    });

    let time_penalty = 0;
    if (timeUsed > timeLimitSeconds) {
      time_penalty = (timeUsed - timeLimitSeconds) * 0.5;
    }

    const sumScore = accuracy + clarity + depth + relevance + time_efficiency;
    const total_score = Math.max(0, parseFloat((sumScore - time_penalty).toFixed(1)));

    return {
      total_score,
      accuracy: parseFloat(accuracy.toFixed(1)),
      clarity: parseFloat(clarity.toFixed(1)),
      depth: parseFloat(depth.toFixed(1)),
      relevance: parseFloat(relevance.toFixed(1)),
      time_efficiency,
      time_penalty,
      feedback_line: `Simulated critique: Good coverage of key parameters. Technical depth is ${difficulty}.`
    };
  }

  private simulateFinalReport(history: InterviewHistoryEntry[]): FinalReportResponse {
    if (history.length === 0) {
      return {
        overall_score: 0,
        skill_breakdown: {},
        strengths: [],
        weaknesses: [],
        recommendations: [],
        hiring_readiness: 'Needs Improvement'
      };
    }

    const avg = history.reduce((sum, h) => sum + h.score, 0) / history.length;
    const hireReadiness = avg >= 75 ? 'Strong' : avg >= 50 ? 'Average' : 'Needs Improvement';

    return {
      overall_score: Math.round(avg),
      skill_breakdown: {
        'React & Frontend': Math.round(avg * 0.95),
        'DSA & Algorithms': Math.round(avg * 0.9),
        'System Design': Math.round(avg * 0.85),
        'Communication': Math.round(avg * 1.05)
      },
      strengths: [
        'Structured responses showing clear planning',
        'Direct identification of potential trade-offs in design structures'
      ],
      weaknesses: [
        'Occasionally goes over the set time limits',
        'Could elaborate further on database schema indexes and partition layouts'
      ],
      recommendations: [
        'Practice timed mock scenarios to improve pacing stability',
        'Dive deeper into data layer vertical splitting constraints'
      ],
      hiring_readiness: hireReadiness
    };
  }
}
