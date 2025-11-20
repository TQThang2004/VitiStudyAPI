import cloudinary from "../config/cloudinary.js";

export const uploadToCloudinary = (fileBuffer) => {
  return new Promise((resolve, reject) => {
    const stream = cloudinary.uploader.upload_stream(
      { folder: "courses", resource_type: "image" },
      (err, result) => {
        if (err) {
          console.error("Cloudinary error:", err);
          reject(err);
        } else {
          resolve(result.secure_url);
        }
      }
    );

    stream.end(fileBuffer); 
  });
};
