const express = require('express');
const cors = require('cors');
const { authMiddleware } = require('./middleware/auth');
const { errorHandler, notFoundHandler } = require('./middleware/errorHandler');

const applicationRoutes = require('./routes/applicationRoutes');
const caseRoutes = require('./routes/caseRoutes');
const metaRoutes = require('./routes/metaRoutes');

const app = express();

// Global Middleware
app.use(cors({
  origin: '*',
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'x-user-role', 'x-user-id', 'x-user-name', 'x-user-office']
}));

app.use(express.json());

// Extract user & role context
app.use(authMiddleware);

// API Routes
app.use('/api/applications', applicationRoutes);
app.use('/api/cases', caseRoutes);
app.use('/api', metaRoutes);

// Fallbacks & Error Handlers
app.use(notFoundHandler);
app.use(errorHandler);

module.exports = app;
