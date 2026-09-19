import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import { config } from './config/env.js';
import { errorHandler } from './middleware/error-handler.js';
import healthRoutes from './routes/health.routes.js';

import authRoutes from './routes/auth.routes.js';

const app = express();

app.use(helmet());
app.use(cors({ origin: config.frontendUrl }));
app.use(express.json());
app.use(morgan('dev'));

// Routes
app.use('/api', healthRoutes);
app.use('/api/auth', authRoutes);

// Centralized error handling
app.use(errorHandler);

export default app;
