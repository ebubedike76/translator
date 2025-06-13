import React from 'react';

export const SentenceBox = ({ text, translation, mode, confidence }) => (
  <div className="mb-4 space-y-2">
    <div className="bg-primary-800/50 rounded-xl p-4 border border-primary-700/50">
      <p className="text-primary-100">{text}</p>
      {confidence && (
        <div className="text-xs mt-2 text-primary-400">
          Confidence: {Math.round(confidence * 100)}%
        </div>
      )}
    </div>
    {mode === 'translate' && translation && (
      <div className="bg-accent-500/10 rounded-xl p-4 border border-accent-500/30">
        <p className="text-primary-50">{translation}</p>
      </div>
    )}
  </div>
);