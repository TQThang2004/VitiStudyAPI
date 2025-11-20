import multer from "multer";

const storage = multer.memoryStorage(); // 🔥 quan trọng

const upload = multer({ storage });

export default upload;
