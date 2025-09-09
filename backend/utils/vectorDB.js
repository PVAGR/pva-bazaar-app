let ChromaClient;
try {
  // Optional dependency; may not be installed in all environments
  ({ ChromaClient } = require('chromadb'));
} catch (e) {
  ChromaClient = null;
}
const Artifact = require('../models/Artifact');
const EmbeddingService = require('./embeddingService');

class VectorDB {
  constructor() {
    this.client = ChromaClient ? new ChromaClient() : null;
    this.embeddingService = new EmbeddingService();
    this.collection = null;
  }

  async initialize() {
    try {
      if (!this.client) {
        console.warn("chromadb not installed. Falling back to MongoDB text search.");
        return;
      }
      // Create or get collection
      this.collection = await this.client.getOrCreateCollection({
        name: "pva_artifacts",
        embeddingFunction: {
          generate: async (texts) => {
            const embeddings = [];
            for (const text of texts) {
              const embedding = await this.embeddingService.generateEmbedding(text);
              embeddings.push(embedding);
            }
            return embeddings;
          }
        }
      });
      console.log("Vector database initialized");
    } catch (error) {
  // If Chroma is unavailable, degrade gracefully and use Mongo text search fallback
  console.warn("Vector DB (Chroma) unavailable. Using MongoDB text search fallback. Detail:", error?.message || error);
  this.client = null;
  this.collection = null;
  return;
    }
  }

  async indexArtifacts() {
    try {
      const artifacts = await Artifact.find({});
      const embeddings = await this.embeddingService.generateArtifactEmbeddings(artifacts);
      
      const ids = embeddings.map(e => e.artifactId.toString());
      const embeddingsData = embeddings.map(e => e.embedding);
      const documents = embeddings.map(e => e.text);
      
      await this.collection.add({
        ids: ids,
        embeddings: embeddingsData,
        documents: documents,
        metadatas: embeddings.map(e => ({ artifactId: e.artifactId.toString() }))
      });
      
      console.log(`Indexed ${artifacts.length} artifacts`);
    } catch (error) {
      console.error("Error indexing artifacts:", error);
      throw error;
    }
  }

  async searchSimilar(query, limit = 5) {
    try {
      if (this.collection) {
        const results = await this.collection.query({
          queryTexts: [query],
          nResults: limit
        });
        return results;
      }
      // Fallback: basic text search via MongoDB if chromadb is unavailable
      const docs = await Artifact.find(
        { $text: { $search: query } },
        { score: { $meta: "textScore" } }
      )
        .sort({ score: { $meta: "textScore" } })
        .limit(parseInt(limit));
      // Normalize to an array of plain objects with an optional score for consistency
      return docs.map(d => ({ ...d.toObject(), score: d.score }));
    } catch (error) {
      console.error("Error searching artifacts:", error);
      throw error;
    }
  }
}

module.exports = VectorDB;