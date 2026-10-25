
export const normalizeText = (text) => {
    return text
        .normalize("NFKC")
        .replace(/\u0000/g, "")
        .replace(/\r\n?/g, "\n")
        .replace(/[ \t]+/g, " ")
        .replace(/\n{3,}/g, "\n\n")
        .trim();
};

export const chunkText = (
    text,
    {
        chunkSize = 2000,
        overlap = 300,
    } = {}
) => {
    if (!Number.isInteger(chunkSize) || chunkSize <= 0) {
        throw new Error("Chunk size must be a positive integer");
    }

    if (
        !Number.isInteger(overlap) ||
        overlap < 0 ||
        overlap >= chunkSize
    ) {
        throw new Error(
            "Overlap must be non-negative and smaller than chunk size"
        );
    }

    const content = normalizeText(text);

    if (!content) return [];

    // FIX 1: Declare the chunks array.
    const chunks = [];

    let start = 0;

    while (start < content.length) {
        let end = Math.min(
            start + chunkSize,
            content.length
        );

        if (end < content.length) {
            const candidate = content.slice(start, end);

            const paragraphBreak = candidate.lastIndexOf("\n\n");
            const sentenceBreak = candidate.lastIndexOf(". ");

            if (paragraphBreak > chunkSize * 0.5) {
                end = start + paragraphBreak + 2;
            } else if (sentenceBreak > chunkSize * 0.5) {
                end = start + sentenceBreak + 1;
            }
        }

        const chunk = content.slice(start, end).trim();

        if (chunk) {
            chunks.push({
                content: chunk,
                charCount: chunk.length,
                startOffset: start,
                endOffset: end,
            });
        }

        if (end === content.length) break;

        start = Math.max(start + 1, end - overlap);
    }

    return chunks;
};

export const chunkDocument = (pages, options = {}) => {
    const chunks = [];

    for (const page of pages) {
        const pageChunks = chunkText(page.text, options);

        for (const chunk of pageChunks) {
            chunks.push({
                chunkIndex: chunks.length,
                content: chunk.content,
                charCount: chunk.charCount,

                // FIX 2: Match the ingestion service property names.
                pageStart: page.pageNumber ?? null,
                pageEnd: page.pageNumber ?? null,

                metadata: {
                    startOffset: chunk.startOffset,
                    endOffset: chunk.endOffset,
                },
            });
        }
    }

    return chunks;
};
