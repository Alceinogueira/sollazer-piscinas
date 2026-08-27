const express = require('express');
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const multer = require('multer');

const router = express.Router();
const uploadDirectory = path.join(__dirname, '..', '..', 'frontend', 'assets', 'uploads');
fs.mkdirSync(uploadDirectory, { recursive: true });

const upload = multer({
  storage: multer.diskStorage({
    destination: uploadDirectory,
    filename: (req, file, callback) => {
      const extension = path.extname(file.originalname).toLowerCase();
      callback(null, `${Date.now()}-${crypto.randomBytes(8).toString('hex')}${extension}`);
    }
  }),
  limits: { fileSize: 5 * 1024 * 1024 },
  fileFilter: (req, file, callback) => {
    if (['image/jpeg', 'image/png', 'image/webp', 'image/gif'].includes(file.mimetype)) return callback(null, true);
    callback(new Error('Envie uma imagem JPG, PNG, WEBP ou GIF de até 5 MB.'));
  }
});

router.post('/', (req, res) => {
  upload.array('imagens', 8)(req, res, error => {
    if (error) return res.status(400).json({ erro: error.message });
    if (!req.files?.length) return res.status(400).json({ erro: 'Selecione pelo menos uma imagem.' });
    const imagens = req.files.map(file => `/assets/uploads/${file.filename}`);
    res.status(201).json({ imagem_url: imagens[0], imagens });
  });
});

module.exports = router;