const OpenAI = require('openai');
const fs = require('fs').promises;
const path = require('path');

class RAGService {
  constructor() {
    this.openai = new OpenAI({
      apiKey: process.env.OPENAI_API_KEY 
    });
    this.documents = [];
    this.embeddings = [];
  }

  async initialize() {
    try {
      const docsPath = path.join(__dirname, '../../data/documents_with_embeddings.json');
      const docsData = await fs.readFile(docsPath, 'utf8');
      const processedDocs = JSON.parse(docsData);

      this.documents = processedDocs;
      this.embeddings = processedDocs.map(doc => doc.embedding);
      
      console.log(`RAG Service initialized with ${this.documents.length} documents`);
    } catch (error) {
      console.error('Error initializing RAG service:', error);
      throw error;
    }
  }

  cosineSimilarity(a, b) {
    const dotProduct = a.reduce((sum, ai, i) => sum + ai * b[i], 0);
    const magnitudeA = Math.sqrt(a.reduce((sum, ai) => sum + ai * ai, 0));
    const magnitudeB = Math.sqrt(b.reduce((sum, bi) => sum + bi * bi, 0));
    return dotProduct / (magnitudeA * magnitudeB);
  }

  async findSimilarDocuments(queryEmbedding, topK = 3) {
    const similarities = this.embeddings.map((embedding, index) => ({
      index,
      similarity: this.cosineSimilarity(queryEmbedding, embedding),
      document: this.documents[index]
    }));

    return similarities
      .sort((a, b) => b.similarity - a.similarity)
      .slice(0, topK);
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

  async query(question) {
    const startTime = Date.now();
    
    try {
      const queryEmbedding = await this.generateEmbedding(question);
      const similarDocs = await this.findSimilarDocuments(queryEmbedding);
      
      const context = similarDocs
        .map(doc => `Title: ${doc.document.title}\nContent: ${doc.document.content}`)
        .join('\n\n');

      const prompt = `Based on the following context, answer the question. If the context doesn't contain relevant information, say so.

Context:
${context}

Question: ${question}

Answer:`;

      const response = await this.openai.chat.completions.create({
        model: 'gpt-3.5-turbo',
        messages: [
          { role: 'user', content: prompt }
        ],
        max_tokens: 500,
        temperature: 0.7
      });

      const endTime = Date.now();
      const responseTime = endTime - startTime;

      return {
        answer: response.choices[0].message.content,
        responseTime,
        sources: similarDocs.map(doc => ({
          title: doc.document.title,
          similarity: doc.similarity
        }))
      };
    } catch (error) {
      console.error('Error in RAG query:', error);
      throw error;
    }
  }
}

module.exports = RAGService;