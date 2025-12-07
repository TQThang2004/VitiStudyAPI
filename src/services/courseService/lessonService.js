import db from "../../config/db.js";

const lessonService = {
  // Tạo lesson
  async createLesson(sectionId, data) {
    const { title, type, duration, video_url, document_url } = data;

    const query = `
      INSERT INTO lessons (section_id, title, type, duration, video_url, document_url)
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

  // Xóa lesson
  async deleteLesson(id) {
    const query = `DELETE FROM lessons WHERE id = $1 RETURNING *`;
    const result = await db.query(query, [id]);
    return result.rows[0];
  },
};

export default lessonService;
