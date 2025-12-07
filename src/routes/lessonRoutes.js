import express from "express";
import multer from "multer";
import { createLesson, deleteLesson } from "../controllers/courseController/lessonController.js";

const router = express.Router();

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 1024 * 1024 * 500 }, // 500MB
});

router.post(
  "/:sectionId",
  upload.single("file"), 
  createLesson
);

router.delete("/:lessonId", deleteLesson);

export default router;
