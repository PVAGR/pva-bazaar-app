const sharp = require('sharp');
const crypto = require('crypto');

class ImageProcessor {
  async generatePerceptualHash(imageBuffer) {
    try {
      const { data } = await sharp(imageBuffer)
        .resize(8, 8)
        .grayscale()
        .raw()
        .toBuffer({ resolveWithObject: true });

      const avg = data.reduce((sum, value) => sum + value, 0) / data.length;
      let hash = '';

      for (let i = 0; i < data.length; i += 1) {
        hash += data[i] > avg ? '1' : '0';
      }

      return hash;
    } catch (error) {
      throw new Error('Invalid image file');
    }
  }

  async generateUniqueID(perceptualHash, metadata) {
    const content = perceptualHash + JSON.stringify(metadata) + Date.now();
    return crypto.createHash('sha256').update(content).digest('hex');
  }

  checkSimilarity(newHash, existingHashes, threshold = 5) {
    const similar = [];

    for (const existing of existingHashes) {
      let distance = 0;
      const currentHash = String(existing.perceptual_hash || '');

      if (currentHash.length !== newHash.length) {
        continue;
      }

      for (let i = 0; i < newHash.length; i += 1) {
        if (newHash[i] !== currentHash[i]) distance += 1;
      }

      if (distance <= threshold) {
        similar.push({ id: existing.id, distance });
      }
    }

    return similar;
  }
}

module.exports = new ImageProcessor();
