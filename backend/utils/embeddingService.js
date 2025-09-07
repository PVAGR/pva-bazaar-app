const axios = require('axios');

class EmbeddingService {
  constructor() {
    // Using sentence-transformers model from Hugging Face (free to use)
    this.apiUrl = 'https://api-inference.huggingface.co/models/sentence-transformers/all-MiniLM-L6-v2';
    this.apiKey = process.env.HUGGINGFACE_API_KEY || ''; // Optional, works without key with rate limiting
  }

  async generateEmbedding(text) {
    try {
      const response = await axios.post(
        this.apiUrl,
        { inputs: text },
        {
          headers: this.apiKey ? { 'Authorization': `Bearer ${this.apiKey}` } : {},
          timeout: 30000
        }
      );
      
      return response.data;
    } catch (error) {
      console.error('Error generating embedding:', error.message);
      
      // Fallback to simple embedding generation if API fails
      return this.generateSimpleEmbedding(text);
    }
  }

  // Simple fallback embedding generator (when API is unavailable)
  generateSimpleEmbedding(text) {
    const words = text.toLowerCase().split(/\s+/);
    const embedding = new Array(384).fill(0); // Match dimensions with MiniLM
    
    words.forEach(word => {
      const index = this.hashString(word) % 384;
      embedding[index] += 1 / words.length;
    });
    
    // Normalize
    const magnitude = Math.sqrt(embedding.reduce((sum, val) => sum + val * val, 0));
    return magnitude > 0 ? embedding.map(val => val / magnitude) : embedding;
  }

  hashString(str) {
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
      hash = ((hash << 5) - hash) + str.charCodeAt(i);
      hash |= 0;
    }
    return Math.abs(hash);
  }

  // Create a single text representation of an artifact for embedding
  createArtifactText(artifact) {
    return `${artifact.name} ${artifact.description} ${artifact.materials.join(' ')} ${artifact.artisan}`;
  }
}

module.exports = EmbeddingService;