import path from "path"
import { validateDocument } from "../config/validateDocument.js";
import { pool } from "../db/pool.js";
import { documentQueue } from "../queues/index.js";


const mimeTypes = {
    ".pdf": "application/pdf",
    ".docx": "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
    ".md": "text/markdown",
    ".txt": "text/plain"
}

export async function uploadDocument(req,res) {
    if(!req.file) {
        return res.status(400).json({
            error: "No document provided"
        });
    }

    let documentId;

    try {
        await validateDocument(req.file);

        const extension = path.extname(req.file.originalname).toLowerCase();

        const result = await pool.query(
            `INSERT INTO documents
            (title, original_filename, mime_type,file_size, storage_key, status)
            VALUES ($1, $2, $3, $4, $5, $6)
            RETURNING id, title, status`,
            [
                req.file.originalname,
                req.file.originalname,
                mimeTypes[extension],
                req.file.size,
                req.file.filename,
                "pending"
            ]
        );

        const document = result.rows[0];
        documentId = document.id;

        const job = await documentQueue.add(
            "process-document",
            {documentId},
            {
                jobId: documentId,
                attempts: 3,
                backoff:{
                    type: "exponential",
                    delay: 1000,
                },
                removeOnComplete:100,
                removeOnFail:100
            }
        );
        
        await pool.query(
            `UPDATE documents
            SET status = 'queued',
                updated_at = NOW()
            WHERE id = $1 AND status = 'pending'`,
            [documentId]
        );

        return res.status(202).json({
            success: true,
            data: {
                documentId,
                jobId:job.id,
                status: "queued",
            },
        });
    } catch (error) {
        console.error("Upload error:", error);

        if (documentId) {
            await pool.query(
                `UPDATE documents
                SET status = 'failed',
                    error_message = $2,
                    updated_at = NOW()
                WHERE id = $1
                    AND status NOT IN ('stored', 'processing')`,
                [documentId, error.message]
            ).catch(console.error);
        } else {
            await unlink(req.file.path).catch(console.error);
        }

        const isValidationError =
            error.message.startsWith("Invalid") ||
            error.message.includes("UTF-8") ||
            error.message.includes("Binary content");

        return res.status(isValidationError ? 400 : 500).json({
            success: false,
            error: isValidationError
                ? error.message
                : "Document upload failed",
        });
    }
}

export const getDocuments = async(req,res) => {
    try{
        const result = await pool.query(
            `SELECT id, title, original_filename,
                    mime_type, file_size, status,
                    created_at, updated_at
            FROM documents
            ORDER BY created_at DESC
            LIMIT 50`
        );

        return res.json({
            success:true,
            data: result.rows,
        })
    } catch (error) {
        console.error(error);
        return res.status(500).json({
            error: "Failed to fetch documents"
        });
    }
}

export const getDocumentStatus = async(req,res) => {
    try{
        const result = await pool.query(
            `SELECT id, title, status,
                    error_message, updated_at
            FROM documents
            WHERE id = $1`,
            [req.params.jobId]
        );

        if(result.rowCount===0){
            return res.status(404).json({
                error: "Document not found"
            });
        }

        return res.json({
            success: true,
            data: result.rows[0],
        });
    } catch (error) {
        console.error(error);
        return res.status(500).json({
            error: "Failed to fetch document status",
        });
    }
}