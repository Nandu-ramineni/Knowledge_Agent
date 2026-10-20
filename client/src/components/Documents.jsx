
import { useEffect, useState } from "react";

export default function DocumentList({ refreshKey }) {
    const [documents, setDocuments] = useState([]);
    const [error, setError] = useState("");

    useEffect(() => {
        const controller = new AbortController();

        async function loadDocuments() {
            try {
                const response = await fetch(
                    "/api/v1/documents",
                    { signal: controller.signal }
                );

                if (!response.ok) {
                    throw new Error("Unable to load documents");
                }

                const result = await response.json();

                setDocuments(result.data);
                setError("");
            } catch (error) {
                if (error.name !== "AbortError") {
                    setError(error.message);
                }
            }
        }

        loadDocuments();

        // Poll to reflect worker status changes.
        const interval = setInterval(loadDocuments, 3000);

        return () => {
            clearInterval(interval);
            controller.abort();
        };
    }, [refreshKey]);

    return (
        <section>
            <h2>Your Documents</h2>

            {error && <p role="alert">{error}</p>}

            {documents.length === 0 && !error && (
                <p>No documents uploaded yet.</p>
            )}

            {documents.map((doc) => (
                <article key={doc.id} className="document-card">
                    <h3>{doc.title}</h3>

                    <p>
                        Size: {Math.round(doc.file_size / 1024)} KB
                    </p>

                    <p>Status: {doc.status}</p>
                </article>
            ))}
        </section>
    );
}
