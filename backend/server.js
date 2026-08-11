import express from 'express';
import { createServer } from 'http';
import cors from 'cors';
import dotenv from 'dotenv';
import { initDatabase } from './database.js';
import apiRouter from './routes/api.js';

dotenv.config();

const app = express();
const port = process.env.PORT || 5000;

app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Serve API routes under /api
app.use('/api', apiRouter);

// Create HTTP server
const server = createServer(app);

// Start server
async function start() {
  try {
    // Initialises the tables and triggers dynamic column migrations
    await initDatabase();
    
    // Listen on 0.0.0.0 so physical devices on the same LAN can connect
    server.listen(port, '0.0.0.0', () => {
      console.log(`Server running on http://0.0.0.0:${port} (LAN accessible)`);
    });
  } catch (err) {
    console.error('Failed to start server:', err);
  }
}

start();
