const express = require('express');
const cors = require('cors');
const path = require('path');
const dotenv = require('dotenv');
const db = require('./config/db');

// Load environment variables
dotenv.config();

const app = express();
const PORT = process.env.PORT || 5000;

// Enable CORS with default settings for frontend local development
app.use(cors({
  origin: '*',
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization']
}));

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Health Check Route
app.get('/api/health', (req, res) => {
  res.json({
    success: true,
    message: 'College Workshop Registration Portal API is active.',
    dbType: db.dbType,
    timestamp: new Date()
  });
});

// Register routers
app.use('/api/workshops', require('./routes/workshopRoutes'));
app.use('/api/registrations', require('./routes/registrationRoutes'));
app.use('/api/admin', require('./routes/adminRoutes'));
app.use('/api/ai', require('./routes/aiRoutes'));
app.use('/api/students', require('./routes/studentRoutes'));
app.use('/api/certificates', require('./routes/certificateRoutes'));

// Serve static assets if in production environment (Optional React build binding)
if (process.env.NODE_ENV === 'production') {
  app.use(express.static(path.join(__dirname, '../frontend/dist')));
  app.get('*', (req, res) => {
    res.sendFile(path.join(__dirname, '../frontend/dist/index.html'));
  });
}

// Custom error handling middleware
app.use((err, req, res, next) => {
  console.error('Express Error Handler caught:', err.stack);
  res.status(500).json({
    success: false,
    message: 'An unexpected internal server error occurred.'
  });
});

// Initialize database schema and start server
async function startServer() {
  try {
    await db.initDb();
    
    app.listen(PORT, () => {
      console.log(`===================================================`);
      console.log(`  SANSAH INNOVATIONS - WORKSHOP PORTAL SERVER`);
      console.log(`  Server is running on: http://localhost:${PORT}`);
      console.log(`  Database type: ${db.dbType.toUpperCase()}`);
      console.log(`===================================================`);
    });
  } catch (error) {
    console.error('Failed to initialize database and start backend server:', error);
    process.exit(1);
  }
}

if (!process.env.VERCEL) {
  startServer();
} else {
  db.initDb().catch(err => {
    console.error('Failed to initialize database on Vercel startup:', err);
  });
}

module.exports = app;
