require('dotenv').config();
const express = require('express');
const cors = require('cors');
const EmbeddingService = require('./utils/embeddings');
const RAGService = require('./services/ragService');
const RedisService = require('./services/redisService');

const app = express();
const PORT = process.env.PORT || 3001;

app.use(cors());
app.use(express.json());

let ragService;
let redisService;
let embeddingService;

async function initializeServices() {
  try {
    console.log('Initializing services...');
    
    embeddingService = new EmbeddingService();
    
    try {
      await embeddingService.processDocuments();
    } catch (error) {
      console.log('Documents already processed or error:', error.message);
    }

    ragService = new RAGService();
    await ragService.initialize();

    redisService = new RedisService();
    await redisService.initialize();

    console.log('All services initialized successfully');
  } catch (error) {
    console.error('Error initializing services:', error);
    process.exit(1);
  }
}

app.get('/health', (req, res) => {
  res.json({ status: 'OK', timestamp: new Date().toISOString() });
});

app.post('/query/rag', async (req, res) => {
  try {
    const { question } = req.body;
    
    if (!question) {
      return res.status(400).json({ error: 'Question is required' });
    }

    const result = await ragService.query(question);
    res.json({
      ...result,
      system: 'RAG',
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error('RAG query error:', error);
    res.status(500).json({ 
      error: 'Internal server error',
      system: 'RAG',
      responseTime: 0
    });
  }
});

app.post('/query/redis', async (req, res) => {
  try {
    const { question } = req.body;
    
    if (!question) {
      return res.status(400).json({ error: 'Question is required' });
    }

    const result = await redisService.query(question);
    res.json({
      ...result,
      system: 'Redis',
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error('Redis query error:', error);
    res.status(500).json({ 
      error: 'Internal server error',
      system: 'Redis',
      responseTime: 0
    });
  }
});

app.post('/query/both', async (req, res) => {
  try {
    const { question } = req.body;
    
    if (!question) {
      return res.status(400).json({ error: 'Question is required' });
    }

    const [ragResult, redisResult] = await Promise.all([
      ragService.query(question).catch(error => ({
        error: error.message,
        system: 'RAG',
        responseTime: 0
      })),
      redisService.query(question).catch(error => ({
        error: error.message,
        system: 'Redis',
        responseTime: 0
      }))
    ]);

    res.json({
      rag: {
        ...ragResult,
        system: 'RAG',
        timestamp: new Date().toISOString()
      },
      redis: {
        ...redisResult,
        system: 'Redis',
        timestamp: new Date().toISOString()
      }
    });
  } catch (error) {
    console.error('Both query error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

app.get('/stats', async (req, res) => {
  try {
    res.json({
      documentsCount: ragService.documents.length,
      ragInitialized: !!ragService,
      redisInitialized: !!redisService,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    res.status(500).json({ error: 'Error getting stats' });
  }
});

app.delete('/cache', async (req, res) => {
  try {
    await redisService.clearCache();
    res.json({ 
      message: 'Cache cleared successfully',
      timestamp: new Date().toISOString() 
    });
  } catch (error) {
    console.error('Error clearing cache:', error);
    res.status(500).json({ error: 'Error clearing cache' });
  }
});

process.on('SIGINT', async () => {
  console.log('Shutting down gracefully...');
  if (redisService) {
    await redisService.disconnect();
  }
  process.exit(0);
});

initializeServices().then(() => {
  app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
  });
});