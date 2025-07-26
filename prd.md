# Product Requirements Document (PRD)

## Title
**On-the-fly LLM Q&A vs Redis-Powered Q&A Benchmark**

---

## 1. Objective
Compare the performance, cost, and user experience of two question–answer services:
1. **RAG without Caching**: Traditional retrieval-augmented generation, fetching context and invoking an LLM on every query.
2. **Redis-Powered**: In-memory vector search with optional answer caching for sub-millisecond retrieval and reduced LLM usage.

---

## 2. Background
- **RAG (Retrieval-Augmented Generation)** pipelines retrieve relevant document snippets from a vector store (e.g., FAISS) and then call an external LLM (e.g., OpenAI Chat) for each query.\  
- **Redis Stack** combines vector search (RediSearch), in-memory hosting of embeddings (RedisAI), and JSON caching (RedisJSON) for ultra-fast semantic lookup and optional stored responses.

---

## 3. Real‑World Use Cases
- **Customer Support**: Instant self‑service knowledge base.
- **Developer Docs Assistant**: On‑demand code examples and API details.
- **Internal Helpdesk**: HR/IT policy queries.
- **Sales Collateral**: Rapid retrieval of pitch decks and product specs.

---

## 4. Proposed UI
- **Single Input Box**: Type your question once.
- **Dual Chat Panels**:
  - **Left**: “RAG (no cache)” responses.
  - **Right**: “Redis-Powered” responses.
- **Response-Time Tracker**: Milliseconds displayed atop each panel.
- **Async Execution**: Both systems queried in parallel; fastest answer highlights.

---

## 5. Features & MVP Scope
| Feature                                | RAG Only                    | Redis Solution                   |
|----------------------------------------|-----------------------------|----------------------------------|
| Document Ingestion & Embedding         | Loader → FAISS + API calls  | Loader → RedisAI or precomputed  |
| Vector Search                          | FAISS / Pinecone (~20–60 ms)| RediSearch in‑memory (~2–5 ms)   |
| LLM Invocation                         | Every query (500–1,500 ms)  | Only on cache-miss or ANSWER_GEN |
| Caching Layer                          | None                        | RedisJSON with TTL               |
| Frontend UI                            | Chat widget                 | Side‑by‑side panels + timers     |

**MVP Tasks (≤1 week)**  
1. Ingest ~10 documents, compute embeddings.  
2. Set up FAISS retriever + OpenAI chain (RAG).  
3. Deploy Redis Stack with vector index + simple cache TTL.  
4. Build frontend: input box + two async fetch endpoints.  
5. Display answers + latency metrics.

---

## 6. User Stories
- **As a user**, I enter my question once and see two answers with response times.  
- **As a developer**, I want to compare latencies in real time under load.  
- **As a product manager**, I can demonstrate cost savings by reduced LLM calls.

---

## 7. Technical Requirements

### 7.1 RAG Without Caching
- **Pipeline**: LangChain (or custom)  
- **Vector Store**: FAISS or Pinecone  
- **LLM API**: OpenAI Chat Completions  
- **Infra**: Node.js / Python backend

### 7.2 Redis-Powered Solution
- **Redis Modules**:
  - `RediSearch` for vector index  
  - `RedisAI` to host embedding model or store raw vectors  
  - `RedisJSON` for caching full answers  
- **Key Commands**:
  ```bash
  # Create vector index on embeddings
  FT.CREATE docs_idx ON JSON PREFIX 1 "doc:" SCHEMA $.vector VECTOR FLAT      6 TYPE FLOAT32 DIM 1536 DISTANCE_METRIC COSINE
  # Cache answer with TTL
  JSON.SET "cache:{question_hash}" .answer ""<LLM answer>"" EX 3600
  ```
- **Embedding Prep**:
  1. Compute embeddings locally or via API.
  2. Push vectors into Redis JSON docs at `$.vector`.

---

## 8. Architecture Diagram
*(Illustration of frontend → backend endpoints → RAG vs Redis flows)*

---

## 9. Comparison Metrics
- **Latency**: ms/query  
- **Throughput**: queries/sec  
- **Cost**: $/query (LLM invocations)  
- **Hit Rate**: cache vs total requests  
- **Answer Quality**: semantic similarity / human eval

---

## 10. Pre‑Work & Setup

### 10.1 For RAG
1. Sign up for OpenAI API, set `OPENAI_API_KEY`.  
2. Implement document loader & FAISS index.  
3. Build retrieval → LLM chain.

### 10.2 For Redis
1. Deploy Redis Stack (`docker run redis/redis-stack:latest`).  
2. Install modules: RediSearch, RedisAI, RedisJSON.  
3. Ingest docs and vectors:  
   ```python
   from openai import OpenAI
   import redis
   client = redis.Redis()
   for doc in docs:
       vec = embed(doc.text)
       client.json().set(f"doc:{doc.id}", "$", {"text": doc.text, "vector": vec})
   ```  
4. Create the vector index (see §7.2).

---

## 11. Timeline & Milestones
| Day | Task                                |
|-----|-------------------------------------|
| 1‑2 | Data ingestion & indexing           |
| 3   | Backend endpoints for both systems  |
| 4   | Frontend chat panels + timers       |
| 5   | Benchmarking & tuning               |
| 6   | QA, accessibility & documentation   |
| 7   | Demo recording & final polish       |

---

## 12. Success Criteria
- **Performance**: Redis solution ≤10 ms vs RAG ≥500 ms.  
- **Functionality**: Dual-panel UI working end-to-end.  
- **Cost Savings**: ≥50% fewer LLM calls using cache.  
- **Quality**: Answers semantically comparable (≥90% accuracy).

---

### Is this a good approach?
Yes. It provides a clear, interactive demonstration of Redis’s in‑memory speed and caching benefits compared to vanilla RAG. Users immediately see the latency delta and cost impact.

---

## Appendix: Sample LangChain Snippet
```python
from langchain.embeddings import OpenAIEmbeddings
from langchain.vectorstores import FAISS
from langchain.chains import RetrievalQA

# RAG setup
embeddings = OpenAIEmbeddings()
vector_store = FAISS.from_documents(docs, embeddings)
qa_chain = RetrievalQA.from_llm(llm=chat_model, retriever=vector_store.as_retriever())

# Redis setup (conceptual)
# ... see commands in §7.2 ...
```
