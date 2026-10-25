import path from "path";
import { readFile } from "fs/promises";
import { getDocument } from "pdfjs-dist/legacy/build/pdf.mjs";
import mammoth from "mammoth"


const parsePDF = async(filePath) => {
    const buffer = await readFile(filePath)

    const task = getDocument({
        data: new Uint8Array(buffer),
        useSystemFonts: true,
    });

    const pdf = await task.promise;
    const pages = [];

    try {
        for(let pageNo = 1; pageNo <= pdf.numPages; pageNo++){
            const page = await pdf.getPage(pageNo);
            const textContent = await page.getTextContent();

            let text = "";;

            for(const item of textContent.items) {
                if(typeof item.str !== "string") continue;
                text+= item.str;
                if(item.hasEOL){
                    text+="\n";
                } else{
                    text += " ";
                }
            }

            pages.push({
                pageNo,
                text: text.trim(),
            });

            page.cleanup();
        }
    } finally{
        await task.destroy();
    }

    return pages;

}

const parseDOCX = async(filePath) => {
    const result = await mammoth.extractRawText({
        path: filePath,
    })

    if(result.messages.length > 0) {
        console.warn("DOCX parser warnings:", result.messages);
    }

    return [{
        pageNo: null,
        text: result.value,
    }];
}

const parseText = async(filePath) => {
    const text = await readFile(filePath,"utf-8");

    return [{
        pageNo: null,
        text,
    }];
}

export const parseDocument = async(filePath, mimeType) => {
    const extraction = path.extname(filePath).toLocaleLowerCase();

    switch(extraction) {
        case ".pdf":
            return parsePDF(filePath);
        case ".docx":
            return parseDOCX(filePath);
        case ".txt":
        case ".md":
            return parseText(filePath);
        
        default:
            throw new Error(
                `Unsupported document type: ${mimeType||extension}`
            );
    }
}