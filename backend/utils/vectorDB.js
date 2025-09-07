const { ChromaClient } = require('chromadb');
const Artifact = require('../models/Artifact');
const EmbeddingService = require('./embeddings');

class VectorDB {
  constructor() {
    this.client = new ChromaClient();
    this.embeddingService = new EmbeddingService();
    this.collection = null;
  }

  async initialize() {
    try {
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
      console.error("Error initializing vector database:", error);
      throw error;
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
      const results = await this.collection.query({
        queryTexts: [query],
        nResults: limit
      });
      
      return results;
    } catch (error) {
      console.error("Error searching artifacts:", error);
      throw error;
    }
  }
}

module.exports = VectorDB;