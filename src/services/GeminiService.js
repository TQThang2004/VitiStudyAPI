import { GoogleGenAI } from "@google/genai";

const ai = new GoogleGenAI({
    apiKey: process.env.GEMINI_API_KEY || "AIzaSyCQ_KpW1FtHYDQJdT3SeYW2BHk9QvVYYCc"
});

/**
 * Generate exam using Gemini AI
 * @param {Object} params - Parameters for generating exam
 * @param {string} params.subject - Subject of the exam
 * @param {string} params.topic - Specific topic
 * @param {string} params.difficulty - Difficulty level (easy, medium, hard)
 * @param {number} params.numQuestions - Number of questions to generate
 * @param {string} params.language - Language for the exam (default: Vietnamese)
 * @returns {Object} Generated exam structure
 */
export const generateExamWithAI = async ({
    title,
    subject,
    topic,
    difficulty = "medium",
    numQuestions = 10,
}) => {
    try {
        const prompt = `
Hãy tạo một đề kiểm tra với các thông tin sau:
- Tên bài kiểm tra: ${title}
- Môn học: ${subject}
- Chủ đề: ${topic}
- Độ khó: ${difficulty}
- Số câu hỏi: ${numQuestions}
- Ngôn ngữ: Việt Nam

Yêu cầu:
1. Tạo ${numQuestions} câu hỏi với các dạng: trắc nghiệm (MULTIPLE_CHOICE), đúng/sai (TRUE_FALSE), và tự luận ngắn (SHORT_ANSWER)
2. Mỗi câu trắc nghiệm phải có 4 lựa chọn, trong đó có đúng 1 đáp án đúng
3. Câu đúng/sai chỉ có 2 lựa chọn: Đúng và Sai
4. Câu tự luận ngắn cần có đáp án mẫu
5. Phân phối điểm hợp lý (tổng 10 điểm)

Trả về kết quả theo định dạng JSON sau (chỉ trả về JSON, không có text khác):
{
    "title": "Tên đề kiểm tra",
    "description": "Mô tả ngắn về đề kiểm tra (Topic)",
    "subject": "Môn học",
    "sections": [
        {
            "title": "Phần 1: Trắc nghiệm",
            "questions": [
                {
                    "question_text": "Nội dung câu hỏi",
                    "question_type": "MULTIPLE_CHOICE",
                    "points": 1,
                    "options": [
                        {
                            "option_text": "Lựa chọn A",
                            "is_correct": false
                        },
                        {
                            "option_text": "Lựa chọn B",
                            "is_correct": true
                        }
                    ]
                }
            ]
        },
        {
            "title": "Phần 2: Đúng/Sai",
            "questions": [
                {
                    "question_text": "Câu hỏi đúng/sai",
                    "question_type": "TRUE_FALSE",
                    "points": 0.5,
                    "options": [
                        {
                            "option_text": "Đúng",
                            "is_correct": true
                        },
                        {
                            "option_text": "Sai",
                            "is_correct": false
                        }
                    ]
                }
            ]
        },
        {
            "title": "Phần 3: Tự luận",
            "questions": [
                {
                    "question_text": "Câu hỏi tự luận",
                    "question_type": "SHORT_ANSWER",
                    "points": 1.5,
                    "correct_text_answer": "Đáp án mẫu"
                }
            ]
        }
    ]
}
`;

        const response = await ai.models.generateContent({
            model: "gemini-2.5-flash",
            contents: prompt
        });

        const text = response.text;

        // Extract JSON from response (remove markdown code blocks if present)
        let jsonText = text.trim();
        if (jsonText.startsWith("```json")) {
            jsonText = jsonText.replace(/```json\n?/g, "").replace(/```\n?/g, "");
        } else if (jsonText.startsWith("```")) {
            jsonText = jsonText.replace(/```\n?/g, "");
        }

        const examData = JSON.parse(jsonText);

        return {
            success: true,
            data: examData
        };
    } catch (error) {
        console.error("Error generating exam with AI:", error);
        throw new Error(`Failed to generate exam: ${error.message}`);
    }
};
