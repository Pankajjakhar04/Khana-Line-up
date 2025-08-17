import app from '../server/server.js';

// Export the Express app for Vercel serverless functions
export default function handler(req, res) {
  return app(req, res);
}
