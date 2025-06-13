import React from 'react';
import { useTypewriter } from '../hooks/useTypewriter';

export const TranslationDisplay = ({ chineseText, translation, context }) => {
  const { displayText: translationText, isTyping: isTypingTranslation } = useTypewriter(translation, 30);
  const { displayText: contextText, isTyping: isTypingContext } = useTypewriter(context, 20);

  return (
    <div className="space-y-6">
      {/* Chinese Input */}
      <div className="bg-primary-800/50 backdrop-blur-sm rounded-2xl p-6 border border-primary-700/50">
        <h3 className="text-accent-400 text-sm font-semibold mb-3 tracking-wide">CHINESE INPUT</h3>
        <p className="text-primary-100 text-lg leading-relaxed min-h-[2rem]">
          {chineseText || 'Waiting for speech...'}
        </p>
      </div>

      {/* English Translation */}
      {translation && (
        <div className="bg-accent-500/10 backdrop-blur-sm rounded-2xl p-6 border border-accent-500/30 animate-glow">
          <h3 className="text-accent-400 text-sm font-semibold mb-3 tracking-wide">ENGLISH TRANSLATION</h3>
          <p className="text-primary-50 text-lg leading-relaxed min-h-[2rem]">
            {translationText}
            {isTypingTranslation && <span className="animate-pulse ml-1">|</span>}
          </p>
        </div>
      )}

      {/* Context */}
      {context && (
        <div className="bg-primary-900/50 backdrop-blur-sm rounded-2xl p-6 border border-primary-600/30">
          <h3 className="text-primary-400 text-sm font-semibold mb-3 tracking-wide">CONTEXT & INSIGHTS</h3>
          <p className="text-primary-200 text-base leading-relaxed min-h-[2rem]">
            {contextText}
            {isTypingContext && <span className="animate-pulse ml-1">|</span>}
          </p>
        </div>
      )}
    </div>
  );
};