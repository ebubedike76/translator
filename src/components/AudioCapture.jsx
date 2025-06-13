import React from 'react';

export const AudioCapture = ({ isListening, onToggleListening, isLoading }) => {
  const buttonRef = React.useRef(null);

  const handleClick = () => {
    if (isLoading) return;
    buttonRef.current?.blur();
    onToggleListening();
  };

  return (
    <div className="fixed bottom-8 left-1/2 transform -translate-x-1/2">
      <button
        ref={buttonRef}
        onClick={handleClick}
        disabled={isLoading}
        className={`relative w-20 h-20 rounded-full transition-all duration-300 transform hover:scale-110 active:scale-95 shadow-2xl focus:outline-none ${
          isListening 
            ? 'bg-red-500 hover:bg-red-600' 
            : 'bg-accent-500 hover:bg-accent-600'
        } ${isLoading ? 'opacity-50 cursor-not-allowed' : ''}`}
      >
        <div className="flex items-center justify-center">
          {isListening ? (
            <div className="w-6 h-6 bg-white rounded-sm" />
          ) : (
            <div className="w-8 h-8 bg-white rounded-full" />
          )}
        </div>
        {isLoading && (
          <div className="absolute inset-0 flex items-center justify-center">
            <div className="w-6 h-6 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
          </div>
        )}
      </button>
      <p className="text-center text-primary-300 text-sm mt-3 font-medium">
        {isLoading ? 'Processing...' : isListening ? 'Tap to Stop' : 'Tap to Start'}
      </p>
    </div>
  );
};