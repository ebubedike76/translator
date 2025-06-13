import React from 'react';

export const ModeSelector = ({ mode, setMode }) => (
  <div className="flex justify-center mb-6">
    <div className="inline-flex rounded-lg bg-primary-800 p-1">
      <button
        onClick={() => setMode('transcribe')}
        className={`px-4 py-2 text-sm font-medium rounded-md transition-colors ${
          mode === 'transcribe' 
            ? 'bg-accent-500 text-white' 
            : 'text-primary-300 hover:bg-primary-700'
        }`}
      >
        Transcribe Only
      </button>
      <button
        onClick={() => setMode('translate')}
        className={`px-4 py-2 text-sm font-medium rounded-md transition-colors ${
          mode === 'translate' 
            ? 'bg-accent-500 text-white' 
            : 'text-primary-300 hover:bg-primary-700'
        }`}
      >
        Real-time Translate
      </button>
    </div>
  </div>
);