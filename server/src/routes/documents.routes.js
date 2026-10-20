import { Router } from "express";
import { upload } from "../config/upload.js";
import { getDocuments, getDocumentStatus, uploadDocument } from "../controllers/document.controller.js";



const router = Router();

router.post(
    "/upload",
    upload.single("file"),
    uploadDocument
);

router.get("/",getDocuments);

router.get("/:id/status", getDocumentStatus);

export default router;