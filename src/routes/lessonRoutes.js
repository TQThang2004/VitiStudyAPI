import express from "express";
import multer from "multer";
import {
  createLesson,
  deleteLesson,
  uploadLessonContent
} from "../controllers/courseController/lessonController.js";

const router = express.Router();

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 1024 * 1024 * 500 }, // 500MB
});

// ======================
// CREATE LESSON (manual)
// ======================
router.post(
  "/:sectionId",
  upload.single("file"),
  createLesson
);

// ======================
// UPLOAD CONTENT (AI)
// ======================
router.put(
  "/:lessonId/upload",
  upload.single("file"),
  uploadLessonContent
);

// ======================
// DELETE LESSON
// ======================
router.delete("/:lessonId", deleteLesson);

export default router;
