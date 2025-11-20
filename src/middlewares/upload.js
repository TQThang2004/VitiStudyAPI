import multer from "multer";

const storage = multer.memoryStorage(); // lưu file vào RAM

const upload = multer({
  storage,
  limits: { fileSize: 5 * 1024 * 1024 }, // giới hạn 5MB
});

export default upload;
