
import { useEffect, useState } from "react";
import { FileText } from "lucide-react";

import HealthCards from "./components/HealthCards.jsx";
import DocumentUpload from "./components/Documentupload.jsx";
import DocumentList from "./components/DocumentList.jsx";

export default function App() {
    const [health, setHealth] = useState(null);
    const [documents, setDocuments] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState("");

    const fetchDocuments = async (signal) => {
        const response = await fetch("/api/v1/documents", {
            signal,
        });

        if (!response.ok) {
            throw new Error("Failed to fetch documents");
        }

        const result = await response.json();
        setDocuments(result.data || []);
    };

    useEffect(() => {
        const controller = new AbortController();

        const initializeApp = async () => {
            try {
                setLoading(true);

                const response = await fetch("/api/v1/health/ready", {
                    signal: controller.signal,
                });

                if (!response.ok) {
                    throw new Error("Backend health check failed");
                }

                const healthData = await response.json();
                if (controller.signal.aborted) return;

                setHealth(healthData);

                await fetchDocuments(controller.signal);
                setError("");
            } catch (err) {
                if (err.name !== "AbortError") {
                    setError(err.message);
                }
            } finally {
                if (!controller.signal.aborted) {
                    setLoading(false);
                }
            }
        };

        initializeApp();

        return () => controller.abort();
    }, []);

    const handleDocumentUploaded = async () => {
        try {
            await fetchDocuments();
            setError("");
        } catch (err) {
            setError(err.message);
        }
    };

    return (
        <main>
            <header>
                <span className="mark">✦</span>
                <span>Knowledge Agent</span>
                <small>Week 01 / Day 02</small>
            </header>

            <section className="hero">
                <div className="eyebrow">RAG KNOWLEDGE PLATFORM</div>

                <h1>
                    Ask better questions.
                    <br />
                    Get grounded answers.
                </h1>

                <p>
                    Upload documents, manage knowledge sources,
                    and build an intelligent AI-powered research assistant.
                </p>
            </section>

            <HealthCards
                health={health}
                documentCount={documents.length}
            />

            <section className="document-section">
                <div className="section-heading">
                    <FileText size={24} />
                    <h2>Document Management</h2>
                </div>

                <DocumentUpload
                    onUploaded={handleDocumentUploaded}
                />

                <DocumentList
                    documents={documents}
                    loading={loading}
                    onRefresh={fetchDocuments}
                />
            </section>

            {error && (
                <p className="error" role="alert">
                    {error}
                </p>
            )}

            <footer>
                AI Research & Knowledge Agent · Week 01
            </footer>
        </main>
    );
}
