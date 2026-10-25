import path from "path";
import { pool } from "../db/pool.js";
import { upload_DIR } from "../config/upload.js";
import { stat } from "fs/promises";
import { parseDocument } from "./documentParser.js";
import { chunkDocument } from "./textChunker.js";



export const processDocument = async (documentId) => {
    const result = await pool.query(
        `SELECT id, storage_key, mime_type, status
        FROM documents
        WHERE ID =$1`,
        [documentId]
    );

    if (result.rowCount === 0) {
        throw new Error(`Document with ID ${documentId} not found`);
    }

    const document = result.rows[0];

    if (document.status === "extracted") {
        return {
            documentId,
            status: "extracted",
            skipped: true,
        }
    }
    if (!/^[0-9a-f-]{36}\.(pdf|docx|md|txt)$/i.test(
        document.storage_key ?? ""
    )) {
        throw new Error("Invalid document storage key");
    }

    const filePath = path.join(
        upload_DIR,
        document.storage_key
    );

    const fileInfo = await stat(filePath)

    if (!fileInfo.isFile()) {
        throw new Error(`Document file not found: ${filePath}`);
    }

    await pool.query(
        `UPDATE documents
        SET status = 'processing',
            error_message = NULL,
            updated_at = NOW()
        WHERE id = $1`,
        [documentId]
    );

    const pages = await parseDocument(
        filePath,
        document.mime_type
    );

    const chunks = chunkDocument(pages, {
        chunkSize: 2000,
        overlap: 300,
    });

    if (chunks.length === 0) {
        throw new Error(
            "No extractable text found in document"
        );
    }

    const client = await pool.connect();
    try {
        await client.query("BEGIN");

        // Delete previous chunks to make reprocessing idempotent.
        await client.query(
            "DELETE FROM document_chunks WHERE document_id = $1",
            [documentId]
        );

        for (const chunk of chunks) {
            await client.query(
                `INSERT INTO document_chunks (
                    document_id,
                    chunk_index,
                    content,
                    char_count,
                    page_start,
                    page_end,
                    metadata
            )
            VALUES ($1, $2, $3, $4, $5, $6, $7)`,
                [
                    documentId,
                    chunk.chunkIndex,
                    chunk.content,
                    chunk.charCount,
                    chunk.pageStart,
                    chunk.pageEnd,
                    JSON.stringify(chunk.metadata),
                ]
            );
        }

        await client.query(
            `UPDATE documents
            SET status = 'extracted',
                chunk_count = $2,
                extracted_char_count = $3,
                error_message = NULL,
                updated_at = NOW()
            WHERE id = $1`,
            [
                documentId,
                chunks.length,
                chunks.reduce(
                    (total, chunk) => total + chunk.charCount,
                    0
                ),
            ]
        );

        await client.query("COMMIT");

        return {
            documentId,
            status: "extracted",
            chunkCount: chunks.length,
        };
    } catch (error) {
        await client.query("ROLLBACK");
        throw error;
    } finally {
        client.release();
    }

}