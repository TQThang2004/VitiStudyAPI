import db from "../../config/db.js";

const lessonService = {
  // ======================
  // CREATE LESSON
  // ======================
  async createLesson(sectionId, data) {
    const { title, type, duration, video_url, document_url } = data;

    const query = `
      INSERT INTO lessons
      (section_id, title, type, duration, video_url, document_url)
      VALUES ($1, $2, $3, $4, $5, $6)
      RETURNING *
    `;

    const result = await db.query(query, [
      sectionId,
      title,
      type,
      duration,
      video_url,
      document_url,
    ]);

    return result.rows[0];
  },

  // ======================
  // UPDATE CONTENT (AI)
  // ======================
  async updateLessonContent(lessonId, { type, url }) {
    let query;

    if (type === "video") {
      query = `
        UPDATE lessons
        SET video_url = $1
        WHERE id = $2
        RETURNING *
      `;
    } else {
      query = `
        UPDATE lessons
        SET document_url = $1
        WHERE id = $2
        RETURNING *
      `;
    }

    const result = await db.query(query, [url, lessonId]);
    return result.rows[0];
  }, // 👈 🔥 DẤU PHẨY QUAN TRỌNG

  // ======================
  // DELETE LESSON
  // ======================
  async deleteLesson(id) {
    const query = `DELETE FROM lessons WHERE id = $1 RETURNING *`;
    const result = await db.query(query, [id]);
    return result.rows[0];
  },
};

export default lessonService;
