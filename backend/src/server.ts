import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import interviewRouter from './routes/interview';

// Load environment variables
dotenv.config();

const app = express();
const PORT = process.env.PORT || 5001;

// Middlewares
app.use(cors({
  origin: '*', // For development, allow all origins
  methods: ['GET', 'POST', 'PUT', 'DELETE'],
  allowedHeaders: ['Content-Type', 'Authorization']
}));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Health Check
app.get('/health', (req, res) => {
  res.status(200).json({ status: 'OK', timestamp: new Date().toISOString() });
});

// Alias redirects for root API matching the user's specific request
app.use('/api/analyze', (req, res, next) => {
  req.url = '/analyze';
  interviewRouter(req, res, next);
});

app.use('/api/get-question', (req, res, next) => {
  req.url = '/get-question';
  interviewRouter(req, res, next);
});

app.use('/api/evaluate-answer', (req, res, next) => {
  req.url = '/evaluate-answer';
  interviewRouter(req, res, next);
});

app.use('/api/final-report', (req, res, next) => {
  req.url = '/final-report';
  interviewRouter(req, res, next);
});

// Router
app.use('/api/interview', interviewRouter);

// Global Error Handler
app.use((err: any, req: express.Request, res: express.Response, next: express.NextFunction) => {
  console.error('Unhandled Server Error:', err);
  res.status(500).json({
    error: 'Internal Server Error',
    message: err.message || 'Something went wrong'
  });
});

// Start Server
app.listen(PORT, () => {
  console.log(`===============================================`);
  console.log(`  Hack2Hire API Server running on port ${PORT}`);
  console.log(`  Health Check: http://localhost:${PORT}/health`);
  console.log(`===============================================`);
});
