import React from 'react';
import ReactMarkdown from 'react-markdown';

export default function AIResultDisplay({ result, loading, onClose }) {
  if (loading) {
    return (
      <div className="ai-result-container">
        <div className="ai-loading">
          <div className="spinner"></div>
          <span>AI is analyzing your data...</span>
        </div>
      </div>
    );
  }

  if (!result) return null;

  return (
    <div className="ai-result-container">
      <div className="ai-result-header">
        <div className="ai-badge">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M12 2a5 5 0 0 1 5 5v3a5 5 0 0 1-10 0V7a5 5 0 0 1 5-5z"/>
            <path d="M8.5 2A6.5 6.5 0 0 0 2 8.5V10a6 6 0 0 0 6 6"/>
            <path d="M15.5 2A6.5 6.5 0 0 1 22 8.5V10a6 6 0 0 1-6 6"/>
            <path d="M12 16v6"/>
          </svg>
          AI Analysis
        </div>
        <div className="ai-meta">
          {result.model && <span>Model: {result.model} | </span>}
          {result.usage && <span>Tokens: {result.usage.total_tokens} | </span>}
          <span>{new Date(result.timestamp).toLocaleString()}</span>
        </div>
      </div>
      <div className="ai-result-body">
        <ReactMarkdown>{result.analysis}</ReactMarkdown>
      </div>
    </div>
  );
}
