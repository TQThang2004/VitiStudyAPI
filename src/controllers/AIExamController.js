import { validationResult } from "express-validator";
import { generateExamWithAI } from "../services/exam/GeminiService.js";

/**
 * Generate exam using AI
 */
export const generateAIExam = async (req, res) => {
    try {
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            return res.status(400).json({
                success: false,
                errors: errors.array()
            });
        }

        const { title, subject, topic, difficulty, numQuestions } = req.body;

        const result = await generateExamWithAI({
            title,
            subject,
            topic,
            difficulty: difficulty || "medium",
            numQuestions: numQuestions || 10,
        });

        return res.status(200).json({
            success: true,
            message: "Exam generated successfully",
            data: result.data
        });
    } catch (error) {
        console.error("Error in generateAIExam:", error);
        return res.status(500).json({
            success: false,
            message: error.message || "Internal server error"
        });
    }
};
