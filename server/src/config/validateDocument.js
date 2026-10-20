
import path from "path"
import { open, readFile } from "node:fs/promises";
const PDF_HEADER = Buffer.from("%PDF-");

const DOCX_ZIP_HEADERS = new Set([
    "504b0304",
    "504b0506",
    "504b0708",
]);

export async function validateDocument(file) {
    const extension = path.extname(file.originalname).toLowerCase();
    const handle = await open(file.path, "r");

    let header;

    try{
        header = Buffer.alloc(8);
        await handle.read(header,0,8,0);
    } finally{
        await handle.close();
    }

    if(extension===".pdf"){
        if(!header.subarray(0,5).equals(PDF_HEADER)){
            throw new Error("Invalid PDF signature")
        }
    }

    if(extension===".docx"){
        const signature = header.subarray(0,4).toString("hex");
        if(!DOCX_ZIP_HEADERS.has(signature)){
            throw new Error("Invalid DOCX container")
        }
    }

    if(extension === ".txt" || extension === ".md"){
        const content = await readFile(file.path);

        try{
            new TextDecoder("utf-8",{
                fatal: true,
            }).decode(content);
        } catch{
            throw new Error("Text file must be use UTF-8 encoding")
        }

        if(content.includes(0)){
            throw new Error("Binary content is not allowed");
        }
    }
    return true;
}