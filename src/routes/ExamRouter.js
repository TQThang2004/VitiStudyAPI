import express from "express";
import { body } from "express-validator";
import { createExam, getExam, getAllExams } from "../controllers/ExamController.js";
import { generateAIExam } from "../controllers/AIExamController.js";
import authMiddleware from "../middlewares/AuthMiddleware.js";
import checkRoles from "../middlewares/CheckRole.js"

const examRouter = express.Router();

/**
 * Validation rules for create exam
 */
const optionValidator = [
    body("sections.*.questions.*.options").optional().isArray().withMessage("options must be an array"),
    body("sections.*.questions.*.options.*.option_text").if(body("sections.*.questions.*.options").exists())
        .notEmpty().withMessage("option_text is required"),
    body("sections.*.questions.*.options.*.is_correct").if(body("sections.*.questions.*.options").exists())
        .isBoolean().withMessage("is_correct must be boolean"),
];

const createExamValidation = [
    body("title").notEmpty().withMessage("title is required"),
    body("duration_minutes").optional().isInt({ min: 1 }).withMessage("duration_minutes must be a positive integer"),
    body("sections").isArray({ min: 1 }).withMessage("sections must be a non-empty array"),
    body("sections.*.title").notEmpty().withMessage("each section must have a title"),
    body("sections.*.questions").isArray().withMessage("questions must be an array"),
    body("sections.*.questions.*.question_text").notEmpty().withMessage("question_text is required"),
    body("sections.*.questions.*.question_type")
        .notEmpty().withMessage("question_type is required")
        .isIn(["MULTIPLE_CHOICE", "TRUE_FALSE", "SHORT_ANSWER"]).withMessage("question_type must be one of MULTIPLE_CHOICE, TRUE_FALSE, SHORT_ANSWER"),
    body("sections.*.questions.*.points").optional().isFloat({ gt: 0 }).withMessage("points must be > 0"),
    body("sections.*.questions.*.correct_text_answer").optional().isString(),
    // options validation (optional for SHORT_ANSWER)
    ...optionValidator,
];

examRouter.post("/create",
    authMiddleware,
    checkRoles(["admin", "teacher"]),
    createExamValidation,
    createExam
);

examRouter.get("/",
    authMiddleware,
    getAllExams
);

examRouter.get("/:id",
    authMiddleware,
    getExam
);

/**
 * Validation rules for AI exam generation
 */
const generateAIExamValidation = [
    body("title").notEmpty().withMessage("title is required"),
    body("subject").notEmpty().withMessage("subject is required"),
    body("topic").notEmpty().withMessage("topic is required"),
    body("difficulty").optional().isIn(["easy", "medium", "hard"]).withMessage("difficulty must be easy, medium, or hard"),
    body("numQuestions").optional().isInt({ min: 1, max: 50 }).withMessage("numQuestions must be between 1 and 50"),
];

examRouter.post("/generate-ai",
    authMiddleware,
    checkRoles(["admin", "teacher"]),
    generateAIExamValidation,
    generateAIExam
);

export default examRouter;
