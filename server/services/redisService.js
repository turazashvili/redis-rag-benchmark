const Redis = require('redis');
const OpenAI = require('openai');
const crypto = require('crypto');
const fs = require('fs').promises;
const path = require('path');

class RedisService {
  constructor() {
    this.client = null;
    this.openai = new OpenAI({
      apiKey: process.env.OPENAI_API_KEY
    });
    this.indexName = 'docs_idx';
  }

  async initialize() {
    try {
      this.client = Redis.createClient({
        host: process.env.REDIS_HOST || 'localhost',
        port: process.env.REDIS_PORT || 6379,
        password: process.env.REDIS_PASSWORD || undefined
      });

      this.client.on('error', (err) => console.log('Redis Client Error', err));
      await this.client.connect();
      
      console.log('Connected to Redis');
      await this.setupVectorIndex();
      await this.loadDocuments();
    } catch (error) {
      console.error('Error initializing Redis service:', error);
      throw error;
    }
  }

  async setupVectorIndex() {
    try {
      await this.client.ft.dropIndex(this.indexName);
      console.log('Dropped existing index');
    } catch (error) {
      console.log('No existing index to drop');
    }

    try {
      const args = [
        this.indexName,
        'ON', 'JSON',
        'PREFIX', '1', 'doc:',
        'SCHEMA',
        '$.title', 'AS', 'title', 'TEXT',
        '$.content', 'AS', 'content', 'TEXT',
        '$.embedding', 'AS', 'embedding', 'VECTOR', 'FLAT', '6', 'TYPE', 'FLOAT32', 'DIM', '1536', 'DISTANCE_METRIC', 'COSINE'
      ];
      
      await this.client.sendCommand(['FT.CREATE', ...args]);
      console.log('Vector index created successfully');
    } catch (error) {
      console.error('Error creating vector index:', error);
      throw error;
    }
  }

  async loadDocuments() {
    try {
      const docsPath = path.join(__dirname, '../../data/documents_with_embeddings.json');
      const docsData = await fs.readFile(docsPath, 'utf8');
      const documents = JSON.parse(docsData);

      for (const doc of documents) {
        const key = `doc:${doc.id}`;
        await this.client.json.set(key, '$', {
          id: doc.id,
          title: doc.title,
          content: doc.content,
          embedding: doc.embedding
        });
      }

      console.log(`Loaded ${documents.length} documents into Redis`);
    } catch (error) {
      console.error('Error loading documents:', error);
      throw error;
    }
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

  generateCacheKey(question) {
    return `cache:${crypto.createHash('md5').update(question.toLowerCase().trim()).digest('hex')}`;
  }

  async getCachedAnswer(question) {
    try {
      const cacheKey = this.generateCacheKey(question);
      const cached = await this.client.json.get(cacheKey);
      return cached;
    } catch (error) {
      return null;
    }
  }

  async setCachedAnswer(question, answer, ttl = 3600) {
    try {
      const cacheKey = this.generateCacheKey(question);
      await this.client.json.set(cacheKey, '$', {
        question,
        answer,
        timestamp: Date.now()
      });
      await this.client.expire(cacheKey, ttl);
    } catch (error) {
      console.error('Error caching answer:', error);
    }
  }

  async vectorSearch(queryEmbedding, topK = 3) {
    try {
      const vectorBuffer = Buffer.from(new Float32Array(queryEmbedding).buffer);
      const query = `*=>[KNN ${topK} @embedding $vector AS score]`;
      
      const args = [
        this.indexName,
        query,
        'PARAMS', '2', 'vector', vectorBuffer,
        'RETURN', '3', 'title', 'content', 'score',
        'DIALECT', '2'
      ];

      const results = await this.client.sendCommand(['FT.SEARCH', ...args]);
      
      const documents = [];
      for (let i = 1; i < results.length; i += 2) {
        const docKey = results[i];
        const docValues = results[i + 1];
        
        const doc = {};
        for (let j = 0; j < docValues.length; j += 2) {
          doc[docValues[j]] = docValues[j + 1];
        }
        
        documents.push({
          title: doc.title,
          content: doc.content,
          score: parseFloat(doc.score || 0)
        });
      }

      return documents;
    } catch (error) {
      console.error('Error in vector search:', error);
      throw error;
    }
  }

  async query(question) {
    const startTime = Date.now();
    
    try {
      const cached = await this.getCachedAnswer(question);
      if (cached) {
        const endTime = Date.now();
        return {
          answer: cached.answer,
          responseTime: endTime - startTime,
          fromCache: true,
          sources: []
        };
      }

      const queryEmbedding = await this.generateEmbedding(question);
      const similarDocs = await this.vectorSearch(queryEmbedding);
      
      const context = similarDocs
        .map(doc => `Title: ${doc.title}\nContent: ${doc.content}`)
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

      const answer = response.choices[0].message.content;
      await this.setCachedAnswer(question, answer);

      const endTime = Date.now();
      const responseTime = endTime - startTime;

      return {
        answer,
        responseTime,
        fromCache: false,
        sources: similarDocs.map(doc => ({
          title: doc.title,
          score: doc.score
        }))
      };
    } catch (error) {
      console.error('Error in Redis query:', error);
      throw error;
    }
  }

  async clearCache() {
    try {
      const keys = await this.client.keys('cache:*');
      if (keys.length > 0) {
        await this.client.del(...keys);
        console.log(`Cleared ${keys.length} cached responses`);
      } else {
        console.log('No cached responses to clear');
      }
      return keys.length;
    } catch (error) {
      console.error('Error clearing cache:', error);
      throw error;
    }
  }

  async disconnect() {
    if (this.client) {
      await this.client.disconnect();
    }
  }
}

module.exports = RedisService;