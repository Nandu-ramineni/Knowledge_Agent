
import { useEffect, useState } from "react";
import {
    FileText,
    FileType,
    Clock3,
    LoaderCircle,
    CircleCheck,
    CircleX,
    ChevronDown,
    ChevronUp,
    Database,
} from "lucide-react";

const statusConfig = {
    pending: {
        label: "Pending",
        color: "#f59e0b",
        Icon: Clock3,
    },
    queued: {
        label: "Queued",
        color: "#f59e0b",
        Icon: Clock3,
    },
    processing: {
        label: "Processing",
        color: "#3b82f6",
        Icon: LoaderCircle,
    },
    stored: {
        label: "Stored",
        color: "#8b5cf6",
        Icon: CircleCheck,
    },
    extracted: {
        label: "Text Extracted",
        color: "#22c55e",
        Icon: CircleCheck,
    },
    failed: {
        label: "Failed",
        color: "#ef4444",
        Icon: CircleX,
    },
};

function formatFileSize(bytes) {
    const size = Number(bytes);

    if (!Number.isFinite(size) || size < 0) {
        return "Unknown size";
    }

    if (size < 1024) return `${size} B`;

    if (size < 1024 * 1024) {
        return `${(size / 1024).toFixed(1)} KB`;
    }

    return `${(size / (1024 * 1024)).toFixed(2)} MB`;
}

function DocumentCard({ document }) {
    const [expanded, setExpanded] = useState(false);
    const [chunks, setChunks] = useState([]);
    const [loadingChunks, setLoadingChunks] = useState(false);
    const [chunkError, setChunkError] = useState("");

    const status =
        statusConfig[document.status] || statusConfig.pending;

    const StatusIcon = status.Icon;

    const isExtracted = document.status === "extracted";

    async function handleToggleChunks() {
        if (expanded) {
            setExpanded(false);
            return;
        }

        setExpanded(true);

        if (chunks.length > 0) return;

        setLoadingChunks(true);
        setChunkError("");

        try {
            const response = await fetch(
                `/api/v1/documents/${document.id}/chunks`
            );

            if (!response.ok) {
                throw new Error("Unable to load document chunks");
            }

            const result = await response.json();

            setChunks((result.data || []).slice(0, 3));
        } catch (error) {
            setChunkError(error.message);
        } finally {
            setLoadingChunks(false);
        }
    }

    const isPDF = document.mime_type === "application/pdf";
    const FileIcon = isPDF ? FileText : FileType;

    return (
        <article className="document-card">
            <div className="document-card-header">
                <div className="document-title">
                    <FileIcon size={22} />
                    <h3>{document.title}</h3>
                </div>

                <span
                    className="document-status"
                    style={{ color: status.color }}
                >
                    <StatusIcon
                        size={16}
                        className={
                            document.status === "processing"
                                ? "spin"
                                : ""
                        }
                    />
                    {status.label}
                </span>
            </div>

            <div className="document-meta">
                <span>{formatFileSize(document.file_size)}</span>

                <span>
                    {document.created_at
                        ? new Date(document.created_at).toLocaleDateString()
                        : "Unknown date"}
                </span>

                {isExtracted && (
                    <span className="chunk-count">
                        <Database size={14} />
                        {document.chunk_count ?? 0} chunks
                    </span>
                )}
            </div>

            {document.status === "failed" && (
                <p className="document-error">
                    {document.error_message ||
                        "Document processing failed."}
                </p>
            )}

            {isExtracted && (
                <div className="document-chunks">
                    <button
                        type="button"
                        className="chunk-toggle"
                        onClick={handleToggleChunks}
                        aria-expanded={expanded}
                    >
                        <span>
                            {expanded
                                ? "Hide Extracted Text"
                                : "Preview Extracted Text"}
                        </span>

                        {expanded ? (
                            <ChevronUp size={16} />
                        ) : (
                            <ChevronDown size={16} />
                        )}
                    </button>

                    {expanded && (
                        <div className="chunk-preview">
                            {loadingChunks && (
                                <p>Loading extracted text...</p>
                            )}

                            {chunkError && (
                                <p className="document-error" role="alert">
                                    {chunkError}
                                </p>
                            )}

                            {!loadingChunks &&
                                !chunkError &&
                                chunks.length === 0 && (
                                    <p>No extracted chunks found.</p>
                                )}

                            {chunks.map((chunk) => (
                                <div
                                    className="chunk-item"
                                    key={chunk.id}
                                >
                                    <div className="chunk-header">
                                        <strong>
                                            Chunk {chunk.chunk_index + 1}
                                        </strong>

                                        {chunk.page_start && (
                                            <small>
                                                Page {chunk.page_start}
                                            </small>
                                        )}
                                    </div>

                                    <p>{chunk.content}</p>

                                    <small>
                                        {chunk.char_count} characters
                                    </small>
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            )}
        </article>
    );
}

export default function DocumentList({
    documents = [],
    loading = false,
    onRefresh,
}) {
    useEffect(() => {
        const hasPendingDocuments = documents.some((document) =>
            ["pending", "queued", "processing"].includes(
                document.status
            )
        );

        if (!hasPendingDocuments || !onRefresh) return;

        const interval = setInterval(() => {
            onRefresh();
        }, 3000);

        return () => clearInterval(interval);
    }, [documents, onRefresh]);

    if (loading) {
        return <p>Loading documents...</p>;
    }

    return (
        <section className="document-list">
            <div className="document-list-header">
                <h2>Your Documents</h2>

                <span>{documents.length} documents</span>
            </div>

            {documents.length === 0 ? (
                <div className="empty-state">
                    <FileText size={32} />
                    <p>No documents uploaded yet.</p>
                    <small>
                        Upload a PDF, DOCX, Markdown, or TXT file.
                    </small>
                </div>
            ) : (
                <div className="documents-grid">
                    {documents.map((document) => (
                        <DocumentCard
                            key={document.id}
                            document={document}
                        />
                    ))}
                </div>
            )}
        </section>
    );
}
