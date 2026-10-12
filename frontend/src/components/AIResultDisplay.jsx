import React from 'react';
import AIReport from './AIReport';

export default function AIResultDisplay({ result, loading, onClose }) {
  if (loading) {
    return <div className="ai-result-container"><div className="ai-loading"><div className="spinner" /><span>AI is analyzing your data...</span></div></div>;
  }
  if (result === null || result === undefined) return null;

  return <div className="ai-result-container">
    {onClose && <button type="button" className="btn btn-secondary" onClick={onClose}>Close result</button>}
    <AIReport response={result.result ?? result} title="AI analysis" model={result.model} tokens={result.usage} />
  </div>;
}
