import { bucket } from "../config/gcs.js";
import { v4 as uuidv4 } from "uuid";

export const uploadToGCS = (file, folder = "images") => {
  return new Promise((resolve, reject) => {
    const fileName = `${folder}/${uuidv4()}-${file.originalname}`;
    const blob = bucket.file(fileName);

    const blobStream = blob.createWriteStream({
      resumable: false,
      contentType: file.mimetype
    });

    blobStream.on("error", err => reject(err));

    blobStream.on("finish", async () => {
      const publicUrl = `https://storage.googleapis.com/${bucket.name}/${fileName}`;
      resolve(publicUrl);
    });

    blobStream.end(file.buffer);
  });
};
