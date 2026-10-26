const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const config = require('./config/env');
const errorHandler = require('./middleware/errorHandler');

const authRoutes = require('./routes/authRoutes');
const complaintRoutes = require('./routes/complaintRoutes');
const userRoutes = require('./routes/userRoutes');
const reportRoutes = require('./routes/reportRoutes');
const officerRegistrationRoutes = require('./routes/officerRegistrationRoutes');

const app = express();

// Security Headers
app.use(helmet({
  crossOriginResourcePolicy: { policy: "cross-origin" },
}));

// CORS configuration (allow frontend origin, no wildcard with credentials)
app.use(cors({
  origin: config.FRONTEND_URL || 'http://localhost:5173',
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
}));

app.use(express.json({ limit: '1mb' }));
app.use(express.urlencoded({ extended: true, limit: '1mb' }));

// Health check endpoint
app.get('/api/v1/health', (req, res) => {
  res.status(200).json({
    success: true,
    data: {
      status: 'UP',
      service: 'CivicPulse Hub Backend',
      version: '1.0.0',
      timestamp: new Date().toISOString(),
    },
  });
});

// Mount API v1 Routes
app.use('/api/v1/auth', authRoutes);
app.use('/api/v1/complaints', complaintRoutes);
app.use('/api/v1/users', userRoutes);
app.use('/api/v1/reports', reportRoutes);
app.use('/api/v1/officer-registrations', officerRegistrationRoutes);

// Serve the production React frontend when the build exists.

const path = require('path');

const fs = require('fs');



const frontendDist = path.resolve(__dirname, '../../frontend/dist');



if (fs.existsSync(path.join(frontendDist, 'index.html'))) {

  app.use(express.static(frontendDist));



  app.get('*', (req, res, next) => {

    if (req.path.startsWith('/api/') || req.path.startsWith('/uploads/')) return next();

    res.sendFile(path.join(frontendDist, 'index.html'));

  });

}

// 404 Catch-All
app.use((req, res) => {
  res.status(404).json({
    success: false,
    error: {
      code: 'ROUTE_NOT_FOUND',
      message: `Endpoint ${req.method} ${req.originalUrl} does not exist.`,
    },
  });
});

// Centralized error handling
app.use(errorHandler);

module.exports = app;
