const multer = require("multer");
const path = require("path");
const fs = require("fs");

const uploadDirectory = path.join(__dirname, "..", "uploads", "family-photos");

fs.mkdirSync(uploadDirectory, {
  recursive: true,
});

const storage = multer.diskStorage({
  destination: (req, file, callback) => {
    callback(null, uploadDirectory);
  },

  filename: (req, file, callback) => {
    const extension = path.extname(file.originalname).toLowerCase();

    const uniqueName = [
      "family",
      req.user.id,
      Date.now(),
      Math.round(Math.random() * 1e9),
    ].join("-");

    callback(null, `${uniqueName}${extension}`);
  },
});

const allowedMimeTypes = ["image/jpeg", "image/png", "image/webp"];

const fileFilter = (req, file, callback) => {
  if (!allowedMimeTypes.includes(file.mimetype)) {
    return callback(new Error("يُسمح فقط بصور JPG أو PNG أو WEBP."));
  }

  callback(null, true);
};

const uploadFamilyPhoto = multer({
  storage,
  fileFilter,
  limits: {
    fileSize: 5 * 1024 * 1024,
  },
});

module.exports = {
  uploadFamilyPhoto,
};
