const OpenAI = require('openai');
const fs = require('fs').promises;
const path = require('path');

class EmbeddingService {
  constructor() {
    this.openai = new OpenAI({
      apiKey: process.env.OPENAI_API_KEY
    });
  }

  async generateEmbedding(text) {
    try {
      const response = await this.openai.embeddings.create({
        model: 'text-embedding-3-small',
        input: text
      });
      return response.data[0].embedding;
    } catch (error) {
      console.error('Error generating embedding:', error);
      throw error;
    }
  }

  async generateBatchEmbeddings(texts) {
    try {
      const response = await this.openai.embeddings.create({
        model: 'text-embedding-3-small',
        input: texts
      });
      return response.data.map(item => item.embedding);
    } catch (error) {
      console.error('Error generating batch embeddings:', error);
      throw error;
    }
  }

  async processDocuments() {
    try {
      const docsPath = path.join(__dirname, '../../data/sample_docs.json');
      const docsData = await fs.readFile(docsPath, 'utf8');
      const documents = JSON.parse(docsData);

      console.log('Generating embeddings for documents...');
      const texts = documents.map(doc => `${doc.title}\n${doc.content}`);
      const embeddings = await this.generateBatchEmbeddings(texts);

      const processedDocs = documents.map((doc, index) => ({
        ...doc,
        text: texts[index],
        embedding: embeddings[index]
      }));

      const outputPath = path.join(__dirname, '../../data/documents_with_embeddings.json');
      await fs.writeFile(outputPath, JSON.stringify(processedDocs, null, 2));
      
      console.log(`Processed ${processedDocs.length} documents with embeddings`);
      return processedDocs;
    } catch (error) {
      console.error('Error processing documents:', error);
      throw error;
    }
  }
}

module.exports = EmbeddingService;