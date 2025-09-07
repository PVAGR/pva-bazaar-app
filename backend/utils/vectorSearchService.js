const mongoose = require('mongoose');
const Artifact = require('../models/Artifact');
const EmbeddingService = require('./embeddingService');
const VectorDB = require('./vectorDB');

class VectorSearchService {
  constructor() {
    this.embeddingService = new EmbeddingService();
    this.vectorDB = new VectorDB();
  }

  /**
   * Index all artifacts in the database
   * @returns {Promise<number>} - Number of artifacts indexed
   */
  async indexAllArtifacts() {
    try {
      const artifacts = await Artifact.find({});
      console.log(`Indexing ${artifacts.length} artifacts...`);
      
      let updated = 0;
      for (const artifact of artifacts) {
        await this.indexArtifact(artifact);
        updated++;
      }
      
      console.log(`Successfully indexed ${updated} artifacts`);
      return updated;
    } catch (error) {
      console.error('Error indexing artifacts:', error);
      throw error;
    }
  }
  
  /**
   * Generate and store embedding for a single artifact
   * @param {Object} artifact - The artifact to index
   * @returns {Promise<Object>} - The updated artifact
   */
  async indexArtifact(artifact) {
    try {
      // Create text content from artifact fields
      const textContent = [
        artifact.name,
        artifact.description,
        artifact.materials?.join(' ') || '',
        artifact.artisan
      ].join(' ');
      
      // Generate embedding
      const embedding = await this.embeddingService.generateEmbedding(textContent);
      
      // Update the artifact with the embedding
      const updatedArtifact = await Artifact.findByIdAndUpdate(
        artifact._id,
        { embedding: embedding },
        { new: true }
      );
      
      return updatedArtifact;
    } catch (error) {
      console.error(`Error indexing artifact ${artifact._id}:`, error);
      throw error;
    }
  }
  
  /**
   * Search for artifacts using vector similarity
   * @param {string} query - The search query
   * @param {Object} options - Search options
   * @returns {Promise<Object>} - Search results
   */
  async search(query, options = {}) {
    const { limit = 10, threshold = 0.5 } = options;
    
    try {
      // Get vector search results
      const results = await this.vectorDB.searchSimilar(query, limit);
      
      // Filter by similarity threshold if specified
      const filteredResults = threshold 
        ? results.filter(item => item.score >= threshold)
        : results;
      
      return {
        query,
        results: filteredResults,
        count: filteredResults.length
      };
    } catch (error) {
      console.error('Search error:', error);
      throw error;
    }
  }

  /**
   * Perform a hybrid search using both vector and text search
   * @param {string} query - The search query
   * @param {Object} options - Search options
   * @returns {Promise<Object>} - Search results
   */
  async hybridSearch(query, options = {}) {
    const { limit = 10 } = options;
    
    try {
      // Get both vector and text search results
      const [vectorResults, textResults] = await Promise.all([
        this.vectorDB.searchSimilar(query, limit),
        Artifact.find(
          { $text: { $search: query } },
          { score: { $meta: "textScore" } }
        ).sort({ score: { $meta: "textScore" } }).limit(parseInt(limit))
      ]);

      // Combine results (removing duplicates)
      const seen = new Set();
      const combinedResults = [];
      
      // Add text results first
      for (const item of textResults) {
        seen.add(item._id.toString());
        combinedResults.push({
          ...item.toObject(),
          source: 'text',
          matchType: 'keyword'
        });
      }
      
      // Add vector results that aren't duplicates
      for (const item of vectorResults) {
        const id = item._id.toString();
        if (!seen.has(id)) {
          seen.add(id);
          combinedResults.push({
            ...item,
            source: 'vector',
            matchType: 'semantic'
          });
        }
      }
      
      return {
        query,
        results: combinedResults.slice(0, limit),
        count: combinedResults.length
      };
    } catch (error) {
      console.error('Hybrid search error:', error);
      throw error;
    }
  }
}

module.exports = VectorSearchService;