import lessonService from "../../services/courseService/lessonService.js";
import { uploadToGCS } from "../../utils/uploadFile.js";
import { success, error } from "../../utils/response.js";

export const createLesson = async (req, res) => {
  try {
    const { title, duration } = req.body; // bỏ description
    const sectionId = req.params.sectionId;

    if (!title) return error(res, "Title is required");

    let type = null;
    let video_url = null;
    let document_url = null;

    if (req.file) {
      const mime = req.file.mimetype;

      if (mime.startsWith("video/")) {
        type = "video";
        video_url = await uploadToGCS(req.file, "lessons");
      } else {
        type = "document";
        document_url = await uploadToGCS(req.file, "lessons");
      }
    }

    const lesson = await lessonService.createLesson(sectionId, {
      title,
      type,
      duration,
      video_url,
      document_url,
    });

    return success(res, lesson, "Lesson created successfully");
  } catch (err) {
    console.error("Create lesson error:", err);
    return error(res, err.message);
  }
};

export const deleteLesson = async (req, res) => {
  try {
    const lessonId = req.params.lessonId;
    const deleted = await lessonService.deleteLesson(lessonId);

    if (!deleted) return error(res, "Lesson not found", 404);

    return success(res, deleted, "Lesson deleted successfully");
  } catch (err) {
    return error(res, err.message);
  }
};
