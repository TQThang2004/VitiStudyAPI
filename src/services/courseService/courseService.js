import db from "../../config/db.js";
import { GoogleGenAI } from "@google/genai";

const ai = new GoogleGenAI({
  apiKey: process.env.GEMINI_API_KEY
});

const courseService = {

  // ================== AI CREATE COURSE ==================
  async createCourseWithAI({
    teacher_id,
    subject,
    topic,
    level = "Beginner",
    numSections = 4,
    lessonsPerSection = 3
  }) {
    const client = await db.connect();

    try {
      await client.query("BEGIN");

      // 1️⃣ Prompt tạo khóa học
      const prompt = `
Hãy tạo một KHÓA HỌC E-LEARNING với các thông tin sau:
- Môn học: ${subject}
- Chủ đề: ${topic}
- Trình độ: ${level}
- Số section: ${numSections}
- Số bài học mỗi section: ${lessonsPerSection}
- Ngôn ngữ: Việt Nam

Yêu cầu:
1. 1 khóa học có nhiều section
2. 1 section có nhiều lesson
3. Lesson có type: video hoặc document
4. Không tạo link video hoặc tài liệu thật (để trống "")
5. Tổng số lesson = số section × số lesson mỗi section

Chỉ trả về JSON, không text khác:

{
  "title": "Tên khóa học",
  "description": "Mô tả khóa học",
  "price": 0,
  "duration": "8 tuần",
  "level": "Beginner",
  "total_lessons": 12,
  "thumbnail": "",
  "sections": [
    {
      "title": "Tên section",
      "lessons": [
        {
          "title": "Tên bài học",
          "type": "video",
          "duration": "10 phút",
          "video_url": "",
          "document_url": ""
        }
      ]
    }
  ]
}
`;

      // 2️⃣ Gọi Gemini
      const response = await ai.models.generateContent({
        model: "gemini-2.5-flash",
        contents: prompt
      });

      let jsonText = response.text.trim();
      if (jsonText.startsWith("```")) {
        jsonText = jsonText.replace(/```json/g, "").replace(/```/g, "");
      }

      const courseData = JSON.parse(jsonText);

      // 3️⃣ Insert course
      const courseResult = await client.query(
        `
        INSERT INTO courses
        (title, description, price, duration, level, total_lessons, thumbnail, teacher_id)
        VALUES ($1,$2,$3,$4,$5,$6,$7,$8)
        RETURNING *
        `,
        [
          courseData.title,
          courseData.description,
          courseData.price || 0,
          courseData.duration,
          courseData.level,
          courseData.total_lessons,
          courseData.thumbnail || "",
          teacher_id
        ]
      );

      const course = courseResult.rows[0];

      // 4️⃣ Insert sections + lessons
      for (const section of courseData.sections) {
        const sectionResult = await client.query(
          `INSERT INTO sections (course_id, title) VALUES ($1,$2) RETURNING id`,
          [course.id, section.title]
        );

        const sectionId = sectionResult.rows[0].id;

        for (const lesson of section.lessons) {
          await client.query(
            `
            INSERT INTO lessons
            (section_id, title, type, duration, video_url, document_url)
            VALUES ($1,$2,$3,$4,$5,$6)
            `,
            [
              sectionId,
              lesson.title,
              lesson.type,
              lesson.duration,
              lesson.video_url || "",
              lesson.document_url || ""
            ]
          );
        }
      }

      await client.query("COMMIT");

      return {
        success: true,
        course
      };

    } catch (error) {
      await client.query("ROLLBACK");
      console.error("Create course with AI error:", error);
      throw error;
    } finally {
      client.release();
    }
  },

  // ================== CÁC HÀM CŨ ==================

  async getAll() {
    const query = `
      SELECT c.*, u.username AS teacher_name, u.avatar AS teacher_avatar
      FROM courses c
      LEFT JOIN users u ON c.teacher_id = u.id
      ORDER BY c.id DESC
    `;
    const result = await db.query(query);
    return result.rows;
  },

  async getById(id) {
    const query = `
      SELECT c.*, u.username AS teacher_name, u.avatar AS teacher_avatar
      FROM courses c
      LEFT JOIN users u ON c.teacher_id = u.id
      WHERE c.id = $1
    `;
    const result = await db.query(query, [id]);
    return result.rows[0];
  },

  async createCourse(data) {
    const {
      title,
      description,
      price,
      duration,
      level,
      total_lessons,
      thumbnail,
      teacher_id
    } = data;

    const query = `
      INSERT INTO courses 
      (title, description, price, duration, level, total_lessons, thumbnail, teacher_id)
      VALUES ($1,$2,$3,$4,$5,$6,$7,$8)
      RETURNING *
    `;

    const result = await db.query(query, [
      title,
      description,
      price,
      duration,
      level,
      total_lessons,
      thumbnail,
      teacher_id,
    ]);

    return result.rows[0];
  },

  async updateCourse(id, data) {
    const {
      title,
      description,
      price,
      duration,
      level,
      total_lessons,
      thumbnail,
      teacher_id
    } = data;

    const query = `
      UPDATE courses 
      SET title=$1, description=$2, price=$3, duration=$4, level=$5, 
          total_lessons=$6, thumbnail=$7, teacher_id=$8
      WHERE id=$9 
      RETURNING *
    `;

    const result = await db.query(query, [
      title,
      description,
      price,
      duration,
      level,
      total_lessons,
      thumbnail,
      teacher_id,
      id
    ]);

    return result.rows[0];
  },

  async getByTeacherId(teacherId) {
    const query = `
      SELECT c.*, u.username AS teacher_name, u.avatar AS teacher_avatar
      FROM courses c
      LEFT JOIN users u ON c.teacher_id = u.id
      WHERE c.teacher_id = $1
      ORDER BY c.created_at DESC
    `;
    const result = await db.query(query, [teacherId]);
    return result.rows;
  },

  async deleteCourse(id) {
    const query = `DELETE FROM courses WHERE id=$1 RETURNING *`;
    const result = await db.query(query, [id]);
    return result.rows[0];
  }
};

export default courseService;
