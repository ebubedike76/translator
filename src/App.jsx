import { useState, useCallback, useEffect } from 'react';
import { useSpeechRecognition } from './hooks/useSpeechRecognition';
import { useDeepSeek } from './hooks/useDeepSeek';
import { usePWA } from './hooks/usePWA';
import { StatusIndicator } from './components/StatusIndicator';
import { AudioCapture } from './components/AudioCapture';
import { ModeSelector } from './components/ModeSelector';
import { SentenceBox } from './components/SentenceBox';
import { useTypewriter } from './hooks/useTypewriter';
import DebugTranslation from './components/DebugTranslation'

// Enhanced translation item component with explanation feature
const TranslationItem = ({ item, index, onExplain, isExplaining }) => {
  const [showExplanation, setShowExplanation] = useState(false);
  const [explanation, setExplanation] = useState('');
  
  const textToDisplay = item.translation && item.translation.length > 0 
    ? item.translation 
    : item.original;
  
  const { displayText: translationText, isTyping: isTypingTranslation } = useTypewriter(
    textToDisplay,
    25 // Faster typing for real-time feel
  );

  const handleExplain = async () => {
    if (showExplanation) {
      setShowExplanation(false);
      return;
    }
    
    setShowExplanation(true);
    if (!explanation) {
      const result = await onExplain(item.original, item.translation);
      setExplanation(result || 'No explanation available');
    }
  };

  return (
    
    <div key={`${item.id || item.timestamp}-${index}`} className="animate-fadeIn mb-4">
      
      <div className={`bg-primary-800/40 rounded-xl p-4 border transition-all duration-300 ${
        item.isParagraphComplete ? 'border-purple-500/40 shadow-lg shadow-purple-500/20' : 
        item.isSentenceComplete ? 'border-accent-500/30 shadow-md' : 'border-primary-700/30'
      }`}>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <div className="text-xs text-primary-400 mb-1 flex items-center space-x-2">
              <span>ORIGINAL</span>
              {item.contextInfo && (
                <span className="text-accent-400 bg-accent-500/20 px-1.5 py-0.5 rounded text-xs">
                  {item.contextInfo.replace(/[\[\]]/g, '')}
                </span>
              )}
              {item.isParagraphComplete && (
                <span className="text-purple-400 bg-purple-500/20 px-2 py-0.5 rounded text-xs font-medium">
                  PARAGRAPH
                </span>
              )}
              {item.isSentenceComplete && !item.isParagraphComplete && (
                <span className="text-green-400 bg-green-500/20 px-2 py-0.5 rounded text-xs">
                  COMPLETE
                </span>
              )}
            </div>
            <p className="text-primary-200 text-sm leading-relaxed min-h-[1.2rem]">
              {item.original}
            </p>
          </div>

          <div>
            <div className="text-xs text-accent-400 mb-1 flex items-center space-x-2">
              <span>TRANSLATION</span>
              {item.tone && item.tone !== 'Neutral' && (
                <span className="text-orange-400 bg-orange-500/20 px-2 py-0.5 rounded text-xs">
                  {item.tone}
                </span>
              )}
              {isTypingTranslation && (
                <span className="text-green-400 animate-pulse">AI Translating...</span>
              )}
            </div>
            <p className="text-white text-sm font-medium leading-relaxed min-h-[1.2rem]">
              {translationText}
              {isTypingTranslation && <span className="animate-pulse ml-1">|</span>}
            </p>
          </div>
        </div>

        <div className="mt-3 pt-3 border-t border-primary-700/30 flex items-center justify-between text-xs text-primary-400">
          <div className="flex items-center space-x-4">
            {item.confidence && (
              <span>Confidence: {Math.round(item.confidence * 100)}%</span>
            )}
            {item.context && (
              <span>Context: {item.context}</span>
            )}
            <span className={`px-2 py-1 rounded transition-colors ${
              item.isFinal ? 'bg-green-500/20 text-green-400' : 'bg-yellow-500/20 text-yellow-400'
            }`}>
              {item.isFinal ? 'Final' : 'Live'}
            </span>
          </div>
          <div className="flex items-center space-x-2">
            <button
              onClick={handleExplain}
              disabled={isExplaining}
              className={`px-3 py-1 rounded text-xs font-medium transition-all duration-200 ${
                showExplanation 
                  ? 'bg-blue-500/30 text-blue-300 border border-blue-500/50' 
                  : 'bg-blue-500/20 text-blue-400 hover:bg-blue-500/30 border border-blue-500/30'
              } ${isExplaining ? 'opacity-50 cursor-not-allowed' : 'hover:scale-105'}`}
            >
              {isExplaining ? 'Explaining...' : showExplanation ? 'Hide' : 'Explain'}
            </button>
            <span>{new Date(item.timestamp).toLocaleTimeString()}</span>
          </div>
        </div>

        {showExplanation && explanation && (
          <div className="mt-3 pt-3 border-t border-blue-500/30 bg-blue-500/10 rounded-lg p-3">
            <div className="text-xs text-blue-400 mb-1 font-medium">AI EXPLANATION</div>
            <p className="text-blue-200 text-sm leading-relaxed">{explanation}</p>
          </div>
        )}

        {item.alternatives && item.alternatives.length > 0 && (
          <div className="mt-2 pt-2 border-t border-primary-700/30">
            <div className="text-xs text-primary-400 mb-1">ALTERNATIVES</div>
            <div className="flex flex-wrap gap-2">
              {item.alternatives.map((alt, altIndex) => (
                <span key={altIndex} className="text-xs bg-primary-700/50 px-2 py-1 rounded text-primary-300 hover:bg-primary-600/50 transition-colors">
                  {alt}
                </span>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default function TranslationApp() {
  const [mode, setMode] = useState('translate');
  const [realtimeTranscript, setRealtimeTranscript] = useState('');
  const [stableTranslations, setStableTranslations] = useState([]);
  
  const { installPWA, canInstall, isInstalled } = usePWA();
  const { translateText, translations, isTranslating, isExplaining, explainTranslation, clearTranslations } = useDeepSeek();

  // Stabilize translations to prevent flickering
  useEffect(() => {
    if (translations.length > 0) {
      const finalTranslations = translations.filter(t => t.isFinal || t.isSentenceComplete);
      if (finalTranslations.length > 0) {
        setStableTranslations(prev => {
          const newTranslations = finalTranslations.filter(newT => 
            !prev.some(prevT => prevT.id === newT.id || 
              (prevT.original === newT.original && prevT.timestamp === newT.timestamp))
          );
          return [...newTranslations, ...prev].slice(0, 15); // Keep last 15 translations
        });
      }
    }
  }, [translations]);

  const handleTranscriptUpdate = useCallback(async (transcriptData) => {
  if (transcriptData.isSentenceComplete) {
    // Clear interim transcript when sentence is complete
    setRealtimeTranscript('');
    // Only translate complete sentences
    await translateText(transcriptData);
  } else {
    // Show interim results
    setRealtimeTranscript(transcriptData.text);
  }
}, [translateText]);

  const { 
    isListening, 
    currentTranscript, 
    confidence,
    startListening, 
    stopListening
  } = useSpeechRecognition(handleTranscriptUpdate);

  const handleToggleListening = useCallback(() => {
    if (isListening) {
      stopListening();
      setRealtimeTranscript('');
    } else {
      startListening();
      clearTranslations();
      setStableTranslations([]);
      setRealtimeTranscript('');
    }
  }, [isListening, startListening, stopListening, clearTranslations]);

  const renderRealtimeTranscript = () => {
  if (!isListening && stableTranslations.length > 0) return null;

  return (
    <div className="mb-6 bg-primary-800/30 rounded-xl p-4 border border-primary-700/50">
      <div className="flex justify-between items-center mb-2">
        <span className="text-xs text-primary-400 font-medium">
          {realtimeTranscript ? 'LIVE TRANSCRIPTION' : 'READY TO TRANSLATE'}
        </span>
        <div className="flex items-center space-x-2">
          {isListening && (
            <>
              <div className="w-2 h-2 bg-red-500 rounded-full animate-pulse"></div>
              <span className="text-xs text-primary-400">Listening</span>
            </>
          )}
          {isTranslating && (
            <div className="flex items-center space-x-1">
              <div className="w-2 h-2 bg-blue-500 rounded-full animate-pulse"></div>
              <span className="text-xs text-blue-400">Translating</span>
            </div>
          )}
        </div>
      </div>
      <p className="text-primary-200 text-lg leading-relaxed min-h-[1.5rem]">
        {realtimeTranscript || 'Speak in Chinese to begin...'}
      </p>
    </div>
  );
};
  const renderTranslations = () => {
    if (stableTranslations.length === 0) return null;

    return (
      <div className="mb-24 space-y-3">
        <div className="text-xs text-primary-400 font-medium mb-4 flex items-center space-x-2">
          <span>AI TRANSLATIONS</span>
          <span className="text-accent-400">({stableTranslations.length} completed)</span>
          <div className="flex items-center space-x-1 text-blue-400">
            <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 20 20">
              <path d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"/>
            </svg>
            <span>AI-Powered</span>
          </div>
        </div>
        {stableTranslations.map((item, index) => (
          <TranslationItem 
            key={`${item.id || item.timestamp}-${index}`} 
            item={item} 
            index={index}
            onExplain={explainTranslation}
            isExplaining={isExplaining}
          />
        ))}
      </div>
    );
  };

  const renderTranscriptionMode = () => {
    if (mode !== 'transcribe' || !currentTranscript) return null;
    
    return (
      <div className="mb-24">
        <SentenceBox
          text={currentTranscript}
          mode={mode}
          confidence={confidence}
        />
      </div>
    );
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-primary-900 via-primary-800 to-primary-900 text-white">
      <div className="fixed inset-0 overflow-hidden pointer-events-none">
        <div className="absolute -top-40 -right-40 w-80 h-80 bg-accent-500/10 rounded-full blur-3xl animate-pulse-slow" />
        <div className="absolute -bottom-40 -left-40 w-80 h-80 bg-primary-600/10 rounded-full blur-3xl animate-pulse-slow" />
        <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-60 h-60 bg-blue-500/5 rounded-full blur-3xl animate-pulse-slow" />
      </div>

      <div className="relative z-10 container mx-auto px-6 py-8 max-w-4xl">
        <div className="text-center mb-8">
          <h1 className="text-4xl font-bold bg-gradient-to-r from-accent-400 via-blue-400 to-accent-600 bg-clip-text text-transparent mb-3">
            AI-Powered Real-Time Translator
          </h1>
          <p className="text-primary-300 text-lg mb-2">
            {mode === 'translate' ? 'Professional meeting translation with AI explanations' : 'AI-enhanced speech transcription'}
          </p>
          <div className="flex items-center justify-center space-x-2 text-sm text-blue-400">
            <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
              <path d="M13 6a3 3 0 11-6 0 3 3 0 016 0zM18 8a2 2 0 11-4 0 2 2 0 014 0zM14 15a4 4 0 00-8 0v3h8v-3z"/>
            </svg>
            <span>Optimized for Business Meetings</span>
            <span className="text-primary-500">•</span>
            <span>Context-Aware AI</span>
            <span className="text-primary-500">•</span>
            <span>Instant Explanations</span>
          </div>
        </div>

        <ModeSelector mode={mode} setMode={setMode} />

        <StatusIndicator isListening={isListening} isTranslating={isTranslating} />

        {renderRealtimeTranscript()}

        {mode === 'translate' && renderTranslations()}

        {renderTranscriptionMode()}

        <AudioCapture 
          isListening={isListening} 
          onToggleListening={handleToggleListening}
          isLoading={isTranslating}
        />

        {isListening && (
          <div className="fixed bottom-32 left-1/2 transform -translate-x-1/2 z-20">
            <div className="bg-primary-800/90 backdrop-blur-sm rounded-full px-4 py-2 border border-primary-700/50 flex items-center space-x-3 text-xs text-primary-300">
              <div className="flex items-center space-x-1">
                <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
                <span>Live Speech</span>
              </div>
              <div className="w-px h-4 bg-primary-600"></div>
              <div className="flex items-center space-x-1">
                <div className="w-2 h-2 bg-blue-500 rounded-full animate-pulse"></div>
                <span>AI Translation</span>
              </div>
              <div className="w-px h-4 bg-primary-600"></div>
              <div className="flex items-center space-x-1">
                <div className="w-2 h-2 bg-purple-500 rounded-full animate-pulse"></div>
                <span>Smart Context</span>
              </div>
              <div className="w-px h-4 bg-primary-600"></div>
              <div className="flex items-center space-x-1">
                <div className="w-2 h-2 bg-orange-500 rounded-full animate-pulse"></div>
                <span>Meeting Mode</span>
              </div>
            </div>
          </div>
        )}

        {canInstall && !isInstalled && (
          <div className="fixed bottom-24 left-1/2 transform -translate-x-1/2 z-20">
            <button
              onClick={installPWA}
              className="bg-accent-500 hover:bg-accent-600 text-white px-4 py-2 rounded-full shadow-lg flex items-center space-x-2 transition-all hover:scale-105"
            >
              <span>Install App</span>
              <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                <path d="M3 17a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zm3.293-7.707a1 1 0 011.414 0L9 10.586V3a1 1 0 112 0v7.586l1.293-1.293a1 1 0 111.414 1.414l-3 3a1 1 0 01-1.414 0l-3-3a1 1 0 010-1.414z" />
              </svg>
            </button>
          </div>
        )}
      </div>
      <DebugTranslation/>
    </div>
    
  );
}