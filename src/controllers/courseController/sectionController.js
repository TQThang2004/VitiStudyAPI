import sectionService from "../../services/courseService/sectionService.js";
import { success, error } from "../../utils/response.js";

export const getSectionsByCourse = async (req, res) => {
  try {
    const data = await sectionService.getByCourseId(req.params.courseId);
    return success(res, data, "Fetched sections and lessons successfully");
  } catch (err) {
    return error(res, err.message);
  }
};

export const createSection = async (req, res) => {
  try {
    const { title } = req.body;
    if (!title) return error(res, "Section title is required", 400);

    const section = await sectionService.createSection(req.params.courseId, title);
    return success(res, section, "Section created successfully");
  } catch (err) {
    return error(res, err.message);
  }
};

export const deleteSection = async (req, res) => {
  try {
    const removed = await sectionService.deleteSection(req.params.sectionId);
    if (!removed) return error(res, "Section not found", 404);

    return success(res, removed, "Section deleted successfully");
  } catch (err) {
    return error(res, err.message);
  }
};
