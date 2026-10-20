import { mkdirSync } from 'node:fs';
import path from 'node:path';
import multer from "multer"
import { randomUUID } from 'node:crypto';

export const upload_DIR = path.resolve(process.cwd(), 'uploads');
mkdirSync(upload_DIR, { recursive: true });

const allowedExtensions = new Set([
    ".pdf",
    ".docx",
    ".md",
    ".txt",
]);

const storage = multer.diskStorage({
    destination: (_req, _file, callback) => {
        callback(null,upload_DIR);
    },

    filename: (_req,file,callback) => {
        const extension = path.extname(file.originalname).toLowerCase();
        callback(null,`${randomUUID()}${extension}`);
    }
});

const fileFilter = (_req, file, callback) => {
    const extension = path.extname(file.originalname).toLowerCase();
    if(!allowedExtensions.has(extension)){
        const error = new Error("Unsupported file format");
        error.status = 400;
        return callback(error);
    }

    callback(null,true);
};

export const upload = multer({
    storage,
    fileFilter,
    limits:{
        fileSize: 10*1024*1024,
        files:1,
        fields:0,
        parts:1,
    },
})