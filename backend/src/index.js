import express from 'express';
import http from 'http';
import cors from 'cors';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';
import { env } from './config/env.js';

import authRoutes from './routes/auth.js';
import workspaceRoutes from './routes/workspaces.js';
import boardRoutes from './routes/boards.js';
import notificationRoutes from './routes/notifications.js';
import integrationRoutes from './routes/integrations.js';
import documentRoutes from './routes/documents.js';
import inboxRoutes from './routes/inbox.js';
import gmailRoutes from './routes/gmail.js';
import cloudmailinRoutes from './routes/cloudmailin.js';

import { initSocket } from './socket.js';

dotenv.config();

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const app = express();
const server = http.createServer(app);

// Initialize Socket.io
initSocket(server);

// Enable CORS
app.use(cors({
  origin: '*',
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH'],
  allowedHeaders: ['Content-Type', 'Authorization']
}));
app.use(express.json({ limit: '200mb' }));
app.use(express.urlencoded({ limit: '200mb', extended: true }));

import fs from 'fs';

// Serve uploaded files
const uploadsDir = path.join(__dirname, '../../uploads');
if (!fs.existsSync(uploadsDir)) {
  fs.mkdirSync(uploadsDir, { recursive: true });
}
app.use('/uploads', express.static(uploadsDir));

// Route handler for attachments download & uploads fallback
app.get(['/uploads/*', '/api/attachments/download/*'], (req, res) => {
  const rawParam = req.params[0] || req.path.split('/').pop() || 'attachment';
  const cleanName = decodeURIComponent(rawParam.replace(/^uploads\//, ''));
  const filePath = path.join(uploadsDir, cleanName);

  if (fs.existsSync(filePath) && fs.statSync(filePath).isFile()) {
    return res.sendFile(filePath);
  }

  // Gracefully handle dummy or remote email attachments without crashing with Cannot GET
  const displayName = cleanName.includes('gmail-dummy') ? 'Email Attachment' : cleanName;
  res.status(200).send(`
    <!DOCTYPE html>
    <html lang="en">
    <head>
      <meta charset="UTF-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>Attachment Preview - Frankloo</title>
      <style>
        body {
          font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
          background-color: #0f172a;
          color: #f8fafc;
          display: flex;
          align-items: center;
          justify-content: center;
          min-height: 100vh;
          margin: 0;
          padding: 20px;
        }
        .card {
          background: #1e293b;
          border: 1px solid #334155;
          border-radius: 16px;
          padding: 32px;
          max-width: 500px;
          width: 100%;
          box-shadow: 0 20px 25px -5px rgba(0,0,0,0.5);
          text-align: center;
        }
        .icon {
          width: 56px;
          height: 56px;
          background: rgba(99, 102, 241, 0.15);
          color: #818cf8;
          border-radius: 14px;
          display: flex;
          align-items: center;
          justify-content: center;
          margin: 0 auto 20px;
          font-size: 26px;
        }
        h2 { margin: 0 0 10px 0; font-size: 20px; font-weight: 700; color: #ffffff; }
        p { color: #94a3b8; font-size: 14px; line-height: 1.6; margin: 0 0 24px 0; }
        .filename {
          background: #0f172a;
          border: 1px solid #334155;
          padding: 12px 16px;
          border-radius: 10px;
          font-size: 13px;
          font-weight: 600;
          color: #38bdf8;
          word-break: break-all;
          margin-bottom: 20px;
        }
        .btn {
          display: inline-block;
          background: #4f46e5;
          color: #ffffff;
          padding: 10px 24px;
          border-radius: 10px;
          text-decoration: none;
          font-size: 14px;
          font-weight: 600;
          transition: background 0.2s;
        }
        .btn:hover { background: #4338ca; }
      </style>
    </head>
    <body>
      <div class="card">
        <div class="icon">📎</div>
        <h2>Email Attachment Preview</h2>
        <div class="filename">${displayName}</div>
        <p>This attachment was received from an email message. Content is linked to your workspace email integration.</p>
        <a href="javascript:window.close()" class="btn">Close Preview</a>
      </div>
    </body>
    </html>
  `);
});

// Routes
app.use('/api/auth', authRoutes);
app.use('/api/workspaces', workspaceRoutes);
app.use('/api/boards', boardRoutes);
app.use('/api/notifications', notificationRoutes);
app.use('/api/integrations', integrationRoutes);
app.use('/api/documents', documentRoutes);
app.use('/api/inbox', inboxRoutes);
app.use('/api/cloudmailin', cloudmailinRoutes);
app.use('/api/gmail', gmailRoutes);

app.get('/', (_req, res) => {
  res.json({ message: 'Frankloo API Server Running', status: 'ok', health: '/health' });
});

app.get('/health', (_req, res) => {
  res.json({ status: 'ok', timestamp: new Date() });
});

const PORT = env.port;

server.listen(env.port, env.host, () => {
  console.log(`🚀 Frankloo running on ${env.backendBaseUrl}`);
});
