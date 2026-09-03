const express = require('express');
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const multer = require('multer');
const sharp = require('sharp');

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

// Upload de imagens de PRODUTO — mantém o arquivo como foi enviado
// (galeria, várias fotos, proporções livres).
router.post('/', (req, res) => {
  upload.array('imagens', 8)(req, res, error => {
    if (error) return res.status(400).json({ erro: error.message });
    if (!req.files?.length) return res.status(400).json({ erro: 'Selecione pelo menos uma imagem.' });
    const imagens = req.files.map(file => `/assets/uploads/${file.filename}`);
    res.status(201).json({ imagem_url: imagens[0], imagens });
  });
});

// ---------------------------------------------------------
// Upload de imagem do BANNER/CARROSSEL (ofertas).
// Padroniza toda imagem enviada para 3840x2160 (16:9, UHD),
// cortando o excesso para preencher o quadro sem distorcer —
// assim todo banner fica com o mesmo tamanho e proporção,
// e a página só precisa adaptar a ALTURA do banner por CSS
// (responsivo) para caber em celular, tablet e PC.
// ---------------------------------------------------------
const BANNER_WIDTH = 3840;
const BANNER_HEIGHT = 2160;
const memoryUpload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 15 * 1024 * 1024 },
  fileFilter: (req, file, callback) => {
    if (['image/jpeg', 'image/png', 'image/webp', 'image/gif'].includes(file.mimetype)) return callback(null, true);
    callback(new Error('Envie uma imagem JPG, PNG, WEBP ou GIF de até 15 MB.'));
  }
});

router.post('/oferta', (req, res) => {
  memoryUpload.single('imagem')(req, res, async error => {
    if (error) return res.status(400).json({ erro: error.message });
    if (!req.file) return res.status(400).json({ erro: 'Selecione uma imagem para o banner.' });

    try {
      // sharp decodifica o arquivo de verdade — se não for uma imagem
      // válida, cai no catch abaixo (proteção extra além do mimetype
      // declarado pelo navegador, que pode ser falsificado).
      const filename = `${Date.now()}-${crypto.randomBytes(8).toString('hex')}.jpg`;
      await sharp(req.file.buffer)
        .rotate() // corrige orientação de fotos tiradas com celular (EXIF)
        .resize(BANNER_WIDTH, BANNER_HEIGHT, { fit: 'cover', position: 'attention' })
        .jpeg({ quality: 88, mozjpeg: true })
        .toFile(path.join(uploadDirectory, filename));

      res.status(201).json({ imagem_url: `/assets/uploads/${filename}` });
    } catch (err) {
      console.error(err);
      res.status(400).json({ erro: 'Não foi possível processar essa imagem. Envie um arquivo de imagem válido.' });
    }
  });
});

module.exports = router;
