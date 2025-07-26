# Redis RAG Benchmark

A performance comparison between traditional RAG (Retrieval-Augmented Generation) and Redis-powered Q&A systems.

## 🚀 Quick Start

### Prerequisites
- Node.js 18+
- Docker & Docker Compose
- OpenAI API Key

### Setup

1. **Clone and setup environment:**
   ```bash
   cp .env.example .env
   # Add your OPENAI_API_KEY to .env file
   ```

2. **Start Redis Stack:**
   ```bash
   docker-compose up -d
   ```

3. **Install dependencies:**
   ```bash
   npm run install-all
   ```

4. **Start the application:**
   ```bash
   npm run dev
   ```

Visit http://localhost:3000 to see the comparison interface.

## 🏗️ Architecture

### Traditional RAG System
- **Vector Store**: In-memory FAISS index
- **Search**: Cosine similarity search (~20-60ms)
- **LLM**: OpenAI GPT-3.5-turbo on every query
- **Caching**: None

### Redis-Powered System  
- **Vector Store**: Redis with RediSearch module
- **Search**: Redis vector search (~2-5ms)
- **LLM**: OpenAI GPT-3.5-turbo (cache miss only)
- **Caching**: RedisJSON with TTL (1 hour)

## 📊 Performance Comparison

| Metric | Traditional RAG | Redis System |
|--------|----------------|--------------|
| Vector Search | 20-60ms | 2-5ms |
| Cache Hit | N/A | <10ms |
| Cache Miss | 500-1500ms | 500-1500ms |
| Cost per Query | 1x LLM call | 0.1x LLM call (90% cache hit) |

## 🛠️ API Endpoints

- `POST /query/rag` - Query traditional RAG system
- `POST /query/redis` - Query Redis-powered system  
- `POST /query/both` - Query both systems in parallel
- `GET /health` - Health check
- `GET /stats` - System statistics

## 🔧 Configuration

Environment variables in `.env`:
```
OPENAI_API_KEY=your_api_key_here
REDIS_HOST=localhost
REDIS_PORT=6379
REDIS_PASSWORD=
```

## 📁 Project Structure

```
├── server/          # Node.js backend
│   ├── services/    # RAG and Redis services
│   ├── utils/       # Embedding utilities
│   └── index.js     # Express server
├── client/          # React TypeScript frontend
│   ├── src/
│   │   ├── components/
│   │   └── App.tsx
├── data/            # Sample documents
└── docker-compose.yml
```

## 🧪 Sample Questions

Try these questions to see the performance difference:
- "What is Redis?"
- "How do vector databases work?"
- "What is RAG?"
- "Explain caching strategies"
- "What is semantic search?"

## 🚀 Production Deployment

For production use:
1. Use Redis Cloud or managed Redis instance
2. Implement proper error handling and monitoring
3. Add authentication and rate limiting
4. Scale with load balancers and multiple backend instances
5. Use environment-specific configurations

## 📈 Benchmarking

The interface shows real-time metrics:
- Response time comparison
- Cache hit indicators
- Source document relevance scores
- System performance indicators

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Test thoroughly
5. Submit a pull request

## 📄 License

MIT License - see LICENSE file for details.