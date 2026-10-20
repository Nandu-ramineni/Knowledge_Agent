import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import { pool } from './db/pool.js';
import { documentQueue } from './queues/index.js';
import documentRoutes from "./routes/documents.routes.js";
import multer from "multer"
const app = express();
app.use(cors({ origin: process.env.CLIENT_ORIGIN || 'http://localhost:5173' }));
app.use(express.json({ limit: '1mb' }));

app.get('/api/v1/health/live', (_req, res) => res.json({ status: 'ok', service: 'api' }));
app.get('/api/v1/health/ready', async (_req, res) => {
  try {
    const { rows } = await pool.query("SELECT NOW() AS database_time, (SELECT extversion FROM pg_extension WHERE extname = 'vector') AS pgvector_version");
    const redis = await documentQueue.client;
    await redis.ping();
    res.json({ status: 'ready', postgres: true, redis: true, ...rows[0] });
  } catch (error) {
    res.status(503).json({ status: 'unavailable', error: error.message });
  }
});

// Development smoke test only, not a production public endpoint.
app.post('/api/v1/dev/test-job', async (_req, res) => {
  try {
    const job = await documentQueue.add('ping', { createdAt: new Date().toISOString() });
    res.status(202).json({ jobId: job.id, status: 'queued' });
  } catch (error) {
    res.status(503).json({ error: error.message });
  }
});

app.use("/api/v1/documents", documentRoutes)
app.use((error, req, res, next) => {
  if (error instanceof multer.MulterError) {
    const status =
      error.code === "LIMIT_FILE_SIZE" ? 413 : 400;

    return res.status(status).json({
      success: false,
      error: error.message,
    });
  }

  if (error.status === 400) {
    return res.status(400).json({
      success: false,
      error: error.message,
    });
  }

  console.error(error);

  res.status(500).json({
    success: false,
    error: "Internal server error",
  });
});

const port = Number(process.env.PORT || 5000);
const server = app.listen(port, () => console.log(`API listening at http://localhost:${port}`));
async function shutdown() {
  server.close();
  await documentQueue.close();
  await pool.end();
  process.exit(0);
}
process.on('SIGTERM', shutdown);
process.on('SIGINT', shutdown);
