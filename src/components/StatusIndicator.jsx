import React from 'react';

export const StatusIndicator = ({ isListening, isTranslating }) => (
  <div className="flex items-center space-x-4 mb-6">
    <div className={`flex items-center space-x-2 px-4 py-2 rounded-full transition-all duration-300 ${
      isListening ? 'bg-red-500/20 text-red-300' : 'bg-primary-800 text-primary-300'
    }`}>
      <div className={`w-3 h-3 rounded-full ${isListening ? 'bg-red-400 animate-pulse' : 'bg-primary-500'}`} />
      <span className="text-sm font-medium">
        {isListening ? 'Listening...' : 'Ready'}
      </span>
    </div>
    
    {isTranslating && (
      <div className="flex items-center space-x-2 px-4 py-2 rounded-full bg-accent-500/20 text-accent-300">
        <div className="w-3 h-3 rounded-full bg-accent-400 animate-bounce" />
        <span className="text-sm font-medium">Translating...</span>
      </div>
    )}
  </div>
);