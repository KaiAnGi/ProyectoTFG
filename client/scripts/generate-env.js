const fs = require('fs');
const path = require('path');

// Defaults provided by the user when missing in the client build environment
const DEFAULT_FRONTEND = process.env.DEFAULT_FRONTEND || 'https://cliente-2a5q.onrender.com';
const DEFAULT_BACKEND = process.env.DEFAULT_BACKEND || 'https://server-567m.onrender.com';

const apiUrl = process.env.API_URL || `${DEFAULT_BACKEND}`;
// Socket.IO will upgrade http(s) to ws/wss automatically; provide wss if backend is https
const socketUrl = process.env.SOCKET_URL || (DEFAULT_BACKEND.startsWith('https') ? `wss://${DEFAULT_BACKEND.replace(/^https?:\/\//, '')}` : `${DEFAULT_BACKEND}`);

const content = `window.__env = {
  API_URL: '${apiUrl}',
  SOCKET_URL: '${socketUrl}',
  FRONTEND_URL: '${process.env.FRONTEND_URL || DEFAULT_FRONTEND}'
};`;

const outPath = path.join(__dirname, '..', 'public', 'env.js');
fs.mkdirSync(path.dirname(outPath), { recursive: true });
fs.writeFileSync(outPath, content);
console.log('Wrote', outPath, 'with', { apiUrl, socketUrl });
