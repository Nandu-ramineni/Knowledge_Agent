import 'dotenv/config';
import { Worker } from 'bullmq';
import { redisConnection } from '../queues/index.js';
import { pool } from '../db/pool.js';
import path from "path"
import { upload_DIR } from '../config/upload.js';
import { stat } from 'fs';
const worker = new Worker(
  "document-ingestion",
  async (job) => {
    if(job.name=== "ping"){
      console.log(`Test job ${job.id} completed`);
      return { ok: true};
    }

    if(job.name !== "process-document"){
      throw new Error(`Unknown job: ${job.name}`);
    }

    const {documentId} = job.data;

    const result = await pool.query(
      `SELECT id, storage_key, status
      FROM documents
      WHERE id = $1`,
      [documentId]
    );

    if(result.rowCount === 0){
      throw new Error("Document not found");
    }

    const document = result.rows[0];

    if(document.status === "stored") {
      return { documentId, status: "stored"};
    }

    if(!document.storage_key){
      throw new Error("Missing storage key");
    }

    const fullPath = path.join(
      upload_DIR, path.basename(document.storage_key)
    );

    try{
      await pool.query(
        `UPDATE documents
        SET status = 'processing'
            error_message = NULL,
            updated_at = NOW()
        WHERE id= $1`,
        [documentId]
      );

      const fileInfo = await stat(fullPath);

      if(!fileInfo.isFIle()){
        throw new Error("Storage path is not a file")
      }

      await pool.query(
        `UPDATE documets
        SET status = "stored',
            updated_at = NOW()
        WHERE id = $1`,
        [documentId]
      );

      console.log(
        `Stored document ${documentId} (${fileInfo.size} bytes)`
      );
      return { documentId, status: "stored"}
    } catch (error) {
      await pool.query(
        `UPDATE documents
        SET status='failded',
            error_message = $2,
            updated_at = NOW()
        WHERE id =$1`,
        [documentId, error.message]
      );
      throw error;
    }
  },
  {
    connection: redisConnection,
    concurrency: 2
  }
);

worker.on("completed",(job)=> {
  console.log(`[worker] completed: ${job.id}`);
})

worker.on("failed", (job, error) => {
  console.error(
    `[worker] Failed: ${job?.id}`,
    error.message
  );
});

console.log("Document worker running");

async function shutdown() {
  await worker.close();
  await pool.end();
  process.exit(0);
}

process.on("SIGINT",shutdown);
process.on("SIGTERM",shutdown);
