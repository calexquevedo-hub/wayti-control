import multer from "multer";
import path from "path";
import fs from "fs";

const termsDir = path.resolve(process.cwd(), "uploads", "terms");
fs.mkdirSync(termsDir, { recursive: true });

const storage = multer.diskStorage({
  destination: (_req, _file, cb) => {
    cb(null, termsDir);
  },
  filename: (_req, file, cb) => {
    const ext = path.extname(file.originalname || "").toLowerCase();
    const safeExt = ext || ".pdf";
    const unique = `${Date.now()}-${Math.round(Math.random() * 1e9)}`;
    cb(null, `term-${unique}${safeExt}`);
  },
});

const allowed = new Set(["application/pdf", "image/jpeg", "image/png"]);

function fileFilter(
  _req: Express.Request,
  file: Express.Multer.File,
  cb: multer.FileFilterCallback
) {
  const ext = path.extname(file.originalname || "").toLowerCase();
  const extAllowed = ext === ".pdf" || ext === ".jpg" || ext === ".jpeg" || ext === ".png";
  const mimeAllowed = allowed.has(file.mimetype);

  if (extAllowed && mimeAllowed) {
    cb(null, true);
    return;
  }

  cb(new Error("Arquivo inválido. Envie PDF, JPG ou PNG."));
}

export const uploadSignedTermMiddleware = multer({
  storage,
  limits: { fileSize: 5 * 1024 * 1024 },
  fileFilter,
});
