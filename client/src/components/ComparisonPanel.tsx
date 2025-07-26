import React from 'react';
import './ComparisonPanel.css';

interface QueryResult {
  answer: string;
  responseTime: number;
  system: string;
  fromCache?: boolean;
  sources?: Array<{ title: string; similarity?: number; score?: number }>;
  error?: string;
}

interface ComparisonPanelProps {
  title: string;
  subtitle: string;
  result: QueryResult | null;
  isLoading: boolean;
}

const ComparisonPanel: React.FC<ComparisonPanelProps> = ({ 
  title, 
  subtitle, 
  result, 
  isLoading 
}) => {
  const getResponseTimeColor = (responseTime: number, isFromCache: boolean = false) => {
    if (isFromCache) return '#10b981'; // green for cache
    if (responseTime < 100) return '#10b981'; // green
    if (responseTime < 500) return '#f59e0b'; // yellow
    return '#ef4444'; // red
  };

  const formatResponseTime = (responseTime: number) => {
    if (responseTime < 1000) {
      return `${responseTime}ms`;
    }
    return `${(responseTime / 1000).toFixed(2)}s`;
  };

  return (
    <div className="comparison-panel">
      <div className="panel-header">
        <h2>{title}</h2>
        <p className="panel-subtitle">{subtitle}</p>
        
        {result && (
          <div className="response-time">
            <span 
              className="time-badge"
              style={{ 
                backgroundColor: getResponseTimeColor(result.responseTime, result.fromCache),
                color: 'white'
              }}
            >
              {formatResponseTime(result.responseTime)}
              {result.fromCache && ' (cached)'}
            </span>
          </div>
        )}
      </div>

      <div className="panel-content">
        {isLoading && (
          <div className="loading-state">
            <div className="spinner"></div>
            <p>Processing query...</p>
          </div>
        )}

        {result && !isLoading && (
          <div className="result-content">
            {result.error ? (
              <div className="error-message">
                <p>❌ Error: {result.error}</p>
              </div>
            ) : (
              <>
                <div className="answer-section">
                  <h4>Answer:</h4>
                  <p className="answer-text">{result.answer}</p>
                </div>

                {result.sources && result.sources.length > 0 && (
                  <div className="sources-section">
                    <h4>Sources:</h4>
                    <ul className="sources-list">
                      {result.sources.map((source, index) => (
                        <li key={index} className="source-item">
                          <span className="source-title">{source.title}</span>
                          {source.similarity && (
                            <span className="source-score">
                              (similarity: {source.similarity.toFixed(3)})
                            </span>
                          )}
                          {source.score && (
                            <span className="source-score">
                              (score: {source.score.toFixed(3)})
                            </span>
                          )}
                        </li>
                      ))}
                    </ul>
                  </div>
                )}

                <div className="metadata-section">
                  <small className="metadata">
                    System: {result.system} | 
                    Response Time: {formatResponseTime(result.responseTime)}
                    {result.fromCache && ' | From Cache'}
                  </small>
                </div>
              </>
            )}
          </div>
        )}

        {!result && !isLoading && (
          <div className="empty-state">
            <p>Enter a question above to see results</p>
          </div>
        )}
      </div>
    </div>
  );
};

export default ComparisonPanel;