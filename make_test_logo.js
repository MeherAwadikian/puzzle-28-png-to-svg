// Generate a simple 2-color geometric test logo PNG (circle + triangle) for vectorization testing.
const sharp = require('sharp');

const svg = `
<svg width="400" height="400" xmlns="http://www.w3.org/2000/svg">
  <rect width="400" height="400" fill="white"/>
  <circle cx="200" cy="160" r="110" fill="#1a1a1a"/>
  <polygon points="200,60 290,290 110,290" fill="white"/>
  <circle cx="200" cy="200" r="40" fill="#1a1a1a"/>
</svg>
`;

sharp(Buffer.from(svg))
  .png()
  .toFile('test-logo.png')
  .then(() => console.log('test-logo.png written'))
  .catch(e => console.error(e));
