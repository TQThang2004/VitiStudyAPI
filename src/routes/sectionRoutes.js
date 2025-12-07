import express from "express";
import {
  getSectionsByCourse,
  createSection,
  deleteSection,
} from "../controllers/courseController/sectionController.js";

const router = express.Router();

router.get("/:courseId", getSectionsByCourse);
router.post("/:courseId", createSection);
router.delete("/:sectionId", deleteSection);

export default router;
