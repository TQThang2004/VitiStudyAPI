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

      // =========================
      // 1️⃣ PROMPT (ĐÃ SỬA)
      // =========================
      const prompt = `
Bạn là một hệ thống tạo nội dung khóa học E-LEARNING.

Thông tin đầu vào:
- Môn học: ${subject}
- Chủ đề: ${topic}
- Trình độ: ${level}
- Số section: ${numSections}
- Số bài học mỗi section: ${lessonsPerSection}
- Ngôn ngữ: Tiếng Việt

YÊU CẦU BẮT BUỘC:
1. Section.title CHỈ là tên nội dung
   ❌ KHÔNG chứa "Section", "Chương", số thứ tự
   ✅ Ví dụ đúng: "Bối cảnh lịch sử và Sự chuẩn bị"

2. Lesson.title cũng KHÔNG đánh số
   ❌ Sai: "Bài 1: Khái niệm"
   ✅ Đúng: "Khái niệm cơ bản"

3. Mỗi section có đúng ${lessonsPerSection} lesson
4. Tổng số lesson = ${numSections * lessonsPerSection}
5. Lesson.type chỉ có: "video" hoặc "document"
6. Không tạo link thật → để chuỗi rỗng ""
7. CHỈ trả về JSON thuần, KHÔNG markdown, KHÔNG giải thích

FORMAT JSON CHÍNH XÁC:

{
  "title": "Tên khóa học",
  "description": "Mô tả ngắn gọn khóa học",
  "price": 0,
  "duration": "8 tuần",
  "level": "${level}",
  "total_lessons": ${numSections * lessonsPerSection},
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

      // =========================
      // 2️⃣ GỌI GEMINI
      // =========================
      const response = await ai.models.generateContent({
        model: "gemini-2.5-flash",
        contents: prompt
      });

      let jsonText = response.text.trim();

      // clean markdown nếu có
      if (jsonText.startsWith("```")) {
        jsonText = jsonText
          .replace(/```json/gi, "")
          .replace(/```/g, "")
          .trim();
      }

      const courseData = JSON.parse(jsonText);

      // =========================
      // 3️⃣ INSERT COURSE
      // =========================
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

      // =========================
      // 4️⃣ INSERT SECTIONS + LESSONS
      // (CÓ CLEAN TITLE PHÒNG THỦ)
      // =========================
      for (const section of courseData.sections) {

        // 🧼 CLEAN SECTION TITLE
        const cleanSectionTitle = section.title
          .replace(/^section\s*\d+[:\-]?\s*/i, "")
          .replace(/^chương\s*\d+[:\-]?\s*/i, "")
          .trim();

        const sectionResult = await client.query(
          `INSERT INTO sections (course_id, title) VALUES ($1,$2) RETURNING id`,
          [course.id, cleanSectionTitle]
        );

        const sectionId = sectionResult.rows[0].id;

        for (const lesson of section.lessons) {

          // 🧼 CLEAN LESSON TITLE
          const cleanLessonTitle = lesson.title
            .replace(/^bài\s*\d+[:\-]?\s*/i, "")
            .trim();

          await client.query(
            `
            INSERT INTO lessons
            (section_id, title, type, duration, video_url, document_url)
            VALUES ($1,$2,$3,$4,$5,$6)
            `,
            [
              sectionId,
              cleanLessonTitle,
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

  // ================== UPDATE COURSE METADATA ==================
  async updateCourseMetadata(courseId, { price, thumbnail }) {
    const fields = [];
    const values = [];
    let idx = 1;

    if (price !== undefined) {
      fields.push(`price = $${idx++}`);
      values.push(price);
    }

    if (thumbnail) {
      fields.push(`thumbnail = $${idx++}`);
      values.push(thumbnail);
    }

    if (fields.length === 0) return null;

    const query = `
    UPDATE courses
    SET ${fields.join(", ")}
    WHERE id = $${idx}
    RETURNING *
  `;

    values.push(courseId);

    const result = await db.query(query, values);
    return result.rows[0];
  },

  // ================== STUDENT ENROLL COURSE ==================
  async enrollCourse({ student_id, course_id }) {
    const client = await db.connect();

    try {
      await client.query("BEGIN");

      // 1️⃣ Check user tồn tại & là student
      const userRes = await client.query(
        `SELECT id, role FROM users WHERE id = $1`,
        [student_id]
      );

      if (userRes.rowCount === 0) {
        throw new Error("User không tồn tại");
      }

      if (userRes.rows[0].role !== "student") {
        throw new Error("Chỉ học sinh mới được đăng ký khóa học");
      }

      // 2️⃣ Check course tồn tại
      const courseRes = await client.query(
        `SELECT id, price FROM courses WHERE id = $1`,
        [course_id]
      );

      if (courseRes.rowCount === 0) {
        throw new Error("Khóa học không tồn tại");
      }

      // 3️⃣ Check đã đăng ký chưa
      const enrolledRes = await client.query(
        `
      SELECT id 
      FROM course_enrollments
      WHERE student_id = $1 AND course_id = $2
      `,
        [student_id, course_id]
      );

      if (enrolledRes.rowCount > 0) {
        throw new Error("Bạn đã đăng ký khóa học này rồi");
      }

      // 4️⃣ Insert enrollment
      const enrollResult = await client.query(
        `
      INSERT INTO course_enrollments (student_id, course_id)
      VALUES ($1, $2)
      RETURNING *
      `,
        [student_id, course_id]
      );

      await client.query("COMMIT");

      return {
        success: true,
        enrollment: enrollResult.rows[0]
      };

    } catch (error) {
      await client.query("ROLLBACK");
      console.error("Enroll course error:", error.message);
      throw error;
    } finally {
      client.release();
    }
  },


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
