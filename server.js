const express = require('express');
const multer = require('multer');
const sharp = require('sharp');
const potrace = require('potrace');
const path = require('path');

const app = express();
const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 10 * 1024 * 1024 } });

app.use(express.static(path.join(__dirname, 'public')));

// Real vectorization endpoint: PNG in -> traced SVG <path> data out (potrace bitmap tracer)
app.post('/api/vectorize', upload.single('image'), async (req, res) => {
  if (!req.file) {
    return res.status(400).json({ error: 'No image uploaded' });
  }

  try {
    const mode = req.body.mode === 'color' ? 'color' : 'bw';
    const threshold = Number.isFinite(Number(req.body.threshold)) ? Number(req.body.threshold) : 160;

    // Normalize input to PNG (handles any input format sharp supports) and flatten
    // transparency onto white so potrace sees a clean bitmap, not alpha noise.
    const normalizedPng = await sharp(req.file.buffer)
      .flatten({ background: '#ffffff' })
      .png()
      .toBuffer();

    if (mode === 'color') {
      // posterize (color-quantize) tracing: traces several color layers and
      // stacks them, still real <path> bezier/line data per layer, not a raster embed.
      potrace.posterize(
        normalizedPng,
        {
          threshold,
          steps: 4,
          fill: potrace.Potrace.COLOR_AUTO,
          color: potrace.Potrace.COLOR_AUTO,
          background: '#ffffff'
        },
        (err, svg) => {
          if (err) return res.status(500).json({ error: String(err) });
          res.json({ svg, mode, threshold });
        }
      );
    } else {
      potrace.trace(
        normalizedPng,
        {
          threshold,
          color: '#000000',
          background: 'transparent',
          turdSize: 2,
          optTolerance: 0.4
        },
        (err, svg) => {
          if (err) return res.status(500).json({ error: String(err) });
          res.json({ svg, mode, threshold });
        }
      );
    }
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

const PORT = process.env.PORT || 3028;
app.listen(PORT, () => console.log(`puzzle-28 png-to-svg vectorizer listening on http://localhost:${PORT}`));
