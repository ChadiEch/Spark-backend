const multer = require('multer');
const path = require('path');
const fs = require('fs');

// Ensure uploads directory exists
const uploadsDir = 'uploads/';
if (!fs.existsSync(uploadsDir)) {
  fs.mkdirSync(uploadsDir, { recursive: true });
}

// Use memory storage to support both local and cloud uploads
// The controller will decide where to store the file
const storage = multer.memoryStorage();

// File filter to only allow certain file types
const fileFilter = (req, file, cb) => {
  // Allow images, videos, and documents
  if (
    file.mimetype.startsWith('image/') || 
    file.mimetype.startsWith('video/') ||
    file.mimetype === 'application/pdf' ||
    file.mimetype === 'text/plain' ||
    file.mimetype === 'application/msword' ||
    file.mimetype === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
  ) {
    cb(null, true);
  } else {
    cb(new Error('Invalid file type. Only images, videos, and documents are allowed.'), false);
  }
};

// Create upload middleware with memory storage
const upload = multer({ 
  storage: storage,
  fileFilter: fileFilter,
  limits: {
    fileSize: 50 * 1024 * 1024 // 50MB limit for videos
  }
});

// Helper to save buffer to local file (used when Google Drive is not connected)
const saveToLocal = async (buffer, originalname) => {
  const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
  const filename = 'file-' + uniqueSuffix + path.extname(originalname);
  const filepath = path.join(uploadsDir, filename);
  await fs.promises.writeFile(filepath, buffer);
  return filename;
};

module.exports = upload;
module.exports.saveToLocal = saveToLocal;