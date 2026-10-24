// Vercel Node serverless function: real PNG -> traced SVG vectorization via potrace.
// Runs on Node runtime (not the edge/Workers runtime) because potrace does genuine
// bitmap-tracing CPU work (not WASM-compiled) that needs a real Node process.
const sharp = require('sharp');
const potrace = require('potrace');
const { IncomingForm } = require('formidable');
const fs = require('fs');

const config = {
  api: { bodyParser: false }
};

function parseForm(req) {
  return new Promise((resolve, reject) => {
    const form = new IncomingForm({ maxFileSize: 10 * 1024 * 1024 });
    form.parse(req, (err, fields, files) => {
      if (err) return reject(err);
      resolve({ fields, files });
    });
  });
}

async function handler(req, res) {
  if (req.method !== 'POST') {
    res.status(405).json({ error: 'POST only' });
    return;
  }

  try {
    const { fields, files } = await parseForm(req);
    const fileField = files.image;
    const file = Array.isArray(fileField) ? fileField[0] : fileField;
    if (!file) {
      res.status(400).json({ error: 'No image uploaded' });
      return;
    }

    const buffer = fs.readFileSync(file.filepath);
    const mode = (Array.isArray(fields.mode) ? fields.mode[0] : fields.mode) === 'color' ? 'color' : 'bw';
    const thresholdRaw = Array.isArray(fields.threshold) ? fields.threshold[0] : fields.threshold;
    const threshold = Number.isFinite(Number(thresholdRaw)) ? Number(thresholdRaw) : 160;

    const normalizedPng = await sharp(buffer)
      .flatten({ background: '#ffffff' })
      .png()
      .toBuffer();

    if (mode === 'color') {
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
          res.status(200).json({ svg, mode, threshold });
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
          res.status(200).json({ svg, mode, threshold });
        }
      );
    }
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
}

module.exports = handler;
module.exports.config = config;
