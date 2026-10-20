import React, { useState } from 'react'

const Documentupload = ({ onUploaded }) => {
    const [file, setFile] = useState(null);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState(null);

    const handleUpload = async (event) => {
        event.preventDefault();
        if (!file) return;
        setLoading(true);
        setError(null);
        try {
            const formData = new FormData();
            formData.append("file", file);
            const response = await fetch("/api/v1/documents/upload", {
                method: "POST",
                body: formData,
            });
            const result = await response.json();
            if (!response.ok) {
                throw new Error(result.error || "Upload failed");
            }
            setFile(null);
            event.currentTarget.reset();
            onUploaded?.(result.data);
        } catch (error) {
            setError(error.message);
        } finally {
            setLoading(false);
        }
    }
    return (
        <section className="upload-card">
            <h2>Upload Document</h2>

            <p>
                Supported formats: PDF, DOCX, MD, TXT.
                Maximum file size: 10 MB.
            </p>

            <form onSubmit={handleUpload}>
                <input
                    type="file"
                    accept=".pdf,.docx,.md,.txt"
                    onChange={(event) => {
                        setFile(event.target.files?.[0] || null);
                    }}
                />

                <button disabled={!file || loading}>
                    {loading ? "Uploading..." : "Upload"}
                </button>
            </form>

            {error && <p role="alert">{error}</p>}
        </section>
    )
}

export default Documentupload