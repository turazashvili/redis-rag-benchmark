import React, { useState } from 'react';
import './QueryInput.css';

interface QueryInputProps {
  onQuery: (question: string) => void;
  isLoading: boolean;
}

const QueryInput: React.FC<QueryInputProps> = ({ onQuery, isLoading }) => {
  const [question, setQuestion] = useState('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (question.trim() && !isLoading) {
      onQuery(question.trim());
    }
  };

  const sampleQuestions = [
    "What is Redis?",
    "How do vector databases work?",
    "What is RAG?",
    "Explain caching strategies",
    "What is semantic search?"
  ];

  const handleSampleClick = (sampleQuestion: string) => {
    setQuestion(sampleQuestion);
    onQuery(sampleQuestion);
  };

  return (
    <div className="query-input-container">
      <form onSubmit={handleSubmit} className="query-form">
        <div className="input-group">
          <input
            type="text"
            value={question}
            onChange={(e) => setQuestion(e.target.value)}
            placeholder="Ask a question to compare both systems..."
            className="query-input"
            disabled={isLoading}
          />
          <button 
            type="submit" 
            disabled={!question.trim() || isLoading}
            className="query-button"
          >
            {isLoading ? 'Querying...' : 'Ask Both Systems'}
          </button>
        </div>
      </form>
      
      <div className="sample-questions">
        <p>Try these sample questions:</p>
        <div className="sample-buttons">
          {sampleQuestions.map((sample, index) => (
            <button
              key={index}
              onClick={() => handleSampleClick(sample)}
              className="sample-button"
              disabled={isLoading}
            >
              {sample}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
};

export default QueryInput;