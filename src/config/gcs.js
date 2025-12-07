import { Storage } from "@google-cloud/storage";
import path from "path";

const storage = new Storage({
  keyFilename: path.join(process.cwd(), "gcs-key.json"), 
  projectId: "your-project-id"
});

const bucketName = "vitistudy-upload";
const bucket = storage.bucket(bucketName);

export { bucket };
