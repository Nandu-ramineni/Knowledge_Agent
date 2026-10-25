
import "dotenv/config";
import { Worker } from "bullmq";
import { processDocument } from "../services/documentIngestion.js";
import { redisConnection } from "../queues/index.js";
import { pool } from "../db/pool.js";


const worker = new Worker(
  "document-ingestion",

  async (job) => {
    if (job.name === "ping") {
      return { ok: true };
    }

    if (job.name !== "process-document") {
      throw new Error(`Unknown job: ${job.name}`);
    }

    const { documentId } = job.data;

    console.log(`Processing document: ${documentId}`);

    return processDocument(documentId);
  },

  {
    connection: redisConnection,
    concurrency: 2,
  }
);

worker.on("completed", (job, result) => {
  console.log(
    `[Completed] Job ${job.id}`,
    result
  );
});

worker.on("failed", async (job, error) => {
  console.error(
    `[Failed] Job ${job?.id}:`,
    error.message
  );

  if (!job?.data?.documentId) return;

  // Avoid marking intermediate retry attempts as final failures.
  const attempts = job.opts.attempts ?? 1;
  const finalFailure = job.attemptsMade >= attempts;

  if (finalFailure) {
    try {
      await pool.query(
        `UPDATE documents
         SET status = 'failed',
             error_message = $2,
             updated_at = NOW()
         WHERE id = $1
           AND status <> 'extracted'`,
        [job.data.documentId, error.message]
      );
    } catch (dbError) {
      console.error("Failed to persist error:", dbError);
    }
  }
});

worker.on("error", (error) => {
  console.error("[Worker error]", error);
});

console.log("Document ingestion worker started");

async function shutdown() {
  await worker.close();
  await pool.end();
  process.exit(0);
}

process.on("SIGINT", shutdown);
process.on("SIGTERM", shutdown);
