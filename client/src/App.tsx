import React, { useState } from 'react';
import './App.css';
import QueryInput from './components/QueryInput';
import ComparisonPanel from './components/ComparisonPanel';

interface QueryResult {
  answer: string;
  responseTime: number;
  system: string;
  fromCache?: boolean;
  sources?: Array<{ title: string; similarity?: number; score?: number }>;
  error?: string;
}

function App() {
  const [ragResult, setRagResult] = useState<QueryResult | null>(null);
  const [redisResult, setRedisResult] = useState<QueryResult | null>(null);
  const [ragLoading, setRagLoading] = useState(false);
  const [redisLoading, setRedisLoading] = useState(false);
  const [currentQuery, setCurrentQuery] = useState('');

  const handleQuery = async (question: string) => {
    setCurrentQuery(question);
    setRagResult(null);
    setRedisResult(null);
    setRagLoading(true);
    setRedisLoading(true);

    // Query RAG system independently
    const queryRag = async () => {
      try {
        const response = await fetch('http://localhost:3001/query/rag', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ question }),
        });

        const data = await response.json();
        setRagResult(data);
      } catch (error) {
        console.error('Error querying RAG:', error);
        setRagResult({ 
          answer: 'Error occurred while querying', 
          responseTime: 0, 
          system: 'RAG',
          error: 'Network error'
        });
      } finally {
        setRagLoading(false);
      }
    };

    // Query Redis system independently
    const queryRedis = async () => {
      try {
        const response = await fetch('http://localhost:3001/query/redis', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ question }),
        });

        const data = await response.json();
        setRedisResult(data);
      } catch (error) {
        console.error('Error querying Redis:', error);
        setRedisResult({ 
          answer: 'Error occurred while querying', 
          responseTime: 0, 
          system: 'Redis',
          error: 'Network error'
        });
      } finally {
        setRedisLoading(false);
      }
    };

    // Execute both queries in parallel but update UI independently
    queryRag();
    queryRedis();
  };

  return (
    <div className="App">
      <header className="App-header">
        <h1>RAG vs Redis Q&A Benchmark</h1>
        <p>Compare traditional RAG with Redis-powered caching</p>
      </header>
      
      <main className="App-main">
        <QueryInput onQuery={handleQuery} isLoading={ragLoading || redisLoading} />
        
        {currentQuery && (
          <div className="query-display">
            <h3>Query: "{currentQuery}"</h3>
          </div>
        )}
        
        <div className="comparison-container">
          <ComparisonPanel
            title="Traditional RAG"
            subtitle="FAISS + OpenAI (No Caching)"
            result={ragResult}
            isLoading={ragLoading}
          />
          <ComparisonPanel
            title="Redis-Powered"
            subtitle="Redis Vector Search + Caching"
            result={redisResult}
            isLoading={redisLoading}
          />
        </div>
      </main>
    </div>
  );
}

export default App;
