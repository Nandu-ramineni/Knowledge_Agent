CREATE TABLE IF NOT EXISTS document_chunks(
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

    document_id UUID NOT NULL
        REFERENCES documents(id) ON DELETE CASCADE,
    
    chunk_index INTEGER NOT NULL,

    content TEXT NOT NULL,

    char_count INTEGER NOT NULL,

    page_start INTEGER,

    page_end INTEGER,

    metadata JSONB NOT NULL DEFAULT '{}' :: jsonb,

    created_at TIMESTAMP DEFAULT NOW(),

    UNIQUE(document_id, chunk_index),

    CHECK (char_count > 0),
    CHECK (chunk_index >=0)
);

CREATE INDEX IF NOT EXISTS idx_chunks_document 
ON document_chunks(document_id);

ALTER TABLE documents
ADD COLUMN IF NOT EXISTS chunk_count INTEGER
DEFAULT 0;

ALTER TABLE documents
ADD COLUMN IF NOT EXISTS extracted_char_count INTEGER
DEFAULT 0;