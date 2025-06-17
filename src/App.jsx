import { useState, useCallback, useEffect } from 'react';
import { useSpeechRecognition } from './hooks/useSpeechRecognition';
import { useDeepSeek } from './hooks/useDeepSeek';
import { usePWA } from './hooks/usePWA';
import { StatusIndicator } from './components/StatusIndicator';
import { AudioCapture } from './components/AudioCapture';
import { ModeSelector } from './components/ModeSelector';
import { SentenceBox } from './components/SentenceBox';
import { useTypewriter } from './hooks/useTypewriter';
import ModelDownloader from './components/ModelDownloader';

const TranslationItem = ({ item, index, onExplain, isExplaining }) => {
  const [showExplanation, setShowExplanation] = useState(false);
  const [explanation, setExplanation] = useState('');
  
  const textToDisplay = item.translation && item.translation.length > 0 
    ? item.translation 
    : item.original;
  
  const { displayText: translationText, isTyping: isTypingTranslation } = useTypewriter(
    textToDisplay,
    25
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
    <div key={`${item.id || item.timestamp}-${index}`} className="mb-6 animate-fadeIn">
      <div className={`bg-white/5 rounded-lg p-6 border transition-all duration-300 ${
        item.isParagraphComplete ? 'border-purple-500/40' : 
        item.isSentenceComplete ? 'border-accent-500/30' : 'border-white/10'
      }`}>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="space-y-3">
            <div className="text-xs text-gray-400 uppercase tracking-wider mb-1 flex items-center space-x-3">
              <span>Original</span>
              {item.contextInfo && (
                <span className="text-accent-400 bg-accent-500/10 px-2 py-1 rounded text-xs">
                  {item.contextInfo.replace(/[\[\]]/g, '')}
                </span>
              )}
              {item.isParagraphComplete && (
                <span className="text-purple-400 bg-purple-500/10 px-2 py-1 rounded text-xs">
                  Paragraph
                </span>
              )}
            </div>
            <p className="text-gray-100 text-base leading-relaxed">
              {item.original}
            </p>
          </div>

          <div className="space-y-3">
            <div className="text-xs text-accent-400 uppercase tracking-wider mb-1 flex items-center space-x-3">
              <span>Translation</span>
              {item.tone && item.tone !== 'Neutral' && (
                <span className="text-orange-400 bg-orange-500/10 px-2 py-1 rounded text-xs">
                  {item.tone}
                </span>
              )}
              {isTypingTranslation && (
                <span className="text-green-400 animate-pulse text-xs">Translating...</span>
              )}
            </div>
            <p className="text-white text-base font-medium leading-relaxed">
              {translationText}
              {isTypingTranslation && <span className="animate-pulse ml-1">|</span>}
            </p>
          </div>
        </div>

        <div className="mt-4 pt-4 border-t border-white/10 flex items-center justify-between text-sm text-gray-400">
          <div className="flex items-center space-x-4">
            {item.confidence && (
              <span>Confidence: {Math.round(item.confidence * 100)}%</span>
            )}
            <span className={`px-2 py-1 rounded ${
              item.isFinal ? 'bg-green-500/10 text-green-400' : 'bg-yellow-500/10 text-yellow-400'
            }`}>
              {item.isFinal ? 'Final' : 'Live'}
            </span>
          </div>
          <div className="flex items-center space-x-3">
            <button
              onClick={handleExplain}
              disabled={isExplaining}
              className={`px-3 py-1.5 rounded text-sm transition-all ${
                showExplanation 
                  ? 'bg-blue-500/20 text-blue-300' 
                  : 'bg-white/10 text-gray-300 hover:bg-white/20'
              } ${isExplaining ? 'opacity-50 cursor-not-allowed' : ''}`}
            >
              {isExplaining ? 'Explaining...' : showExplanation ? 'Hide' : 'Explain'}
            </button>
            <span className="text-xs">{new Date(item.timestamp).toLocaleTimeString()}</span>
          </div>
        </div>

        {showExplanation && explanation && (
          <div className="mt-4 pt-4 border-t border-blue-500/20 bg-blue-500/5 rounded-lg p-4">
            <div className="text-xs text-blue-400 uppercase tracking-wider mb-2">AI Explanation</div>
            <p className="text-blue-100 text-sm leading-relaxed">{explanation}</p>
          </div>
        )}

        {item.alternatives && item.alternatives.length > 0 && (
          <div className="mt-4 pt-4 border-t border-white/10">
            <div className="text-xs text-gray-400 uppercase tracking-wider mb-2">Alternatives</div>
            <div className="flex flex-wrap gap-2">
              {item.alternatives.map((alt, altIndex) => (
                <span key={altIndex} className="text-xs bg-white/10 px-2 py-1 rounded text-gray-300">
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
  const [modelsReady, setModelsReady] = useState(false);
  
  const { installPWA, canInstall, isInstalled } = usePWA();
  const { translateText, translations, isTranslating, isExplaining, explainTranslation, clearTranslations } = useDeepSeek();

  useEffect(() => {
    if (translations.length > 0) {
      const finalTranslations = translations.filter(t => t.isFinal || t.isSentenceComplete);
      if (finalTranslations.length > 0) {
        setStableTranslations(prev => {
          const newTranslations = finalTranslations.filter(newT => 
            !prev.some(prevT => prevT.id === newT.id || 
              (prevT.original === newT.original && prevT.timestamp === newT.timestamp))
          );
          return [...newTranslations, ...prev].slice(0, 15);
        });
      }
    }
  }, [translations]);

  const handleTranscriptUpdate = useCallback(async (transcriptData) => {
    if (transcriptData.isSentenceComplete) {
      setRealtimeTranscript('');
      await translateText(transcriptData);
    } else {
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
    if (!realtimeTranscript) return null;

    return (
      <div className="bg-white/5 rounded-lg p-6 mb-6 border border-white/10">
        <div className="text-xs text-gray-400 uppercase tracking-wider mb-2">Live Transcription</div>
        <p className="text-gray-200 text-lg">{realtimeTranscript}</p>
      </div>
    );
  };

  const renderTranslations = () => {
    if (stableTranslations.length === 0) {
      return (
        <div className="bg-white/5 rounded-lg p-8 text-center border border-white/10">
          <p className="text-gray-400 mb-2">No translations yet</p>
          <p className="text-sm text-gray-500">Start speaking to see real-time translations</p>
        </div>
      );
    }

    return (
      <div className="space-y-6">
        <div className="text-sm text-gray-400 uppercase tracking-wider">Completed Translations</div>
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
      <div className="space-y-6">
        <div className="text-sm text-gray-400 uppercase tracking-wider">Transcription</div>
        <SentenceBox
          text={currentTranscript}
          mode={mode}
          confidence={confidence}
        />
      </div>
    );
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900 text-white">
      <ModelDownloader onComplete={() => setModelsReady(true)} />
      
      {!modelsReady ? (
        <div className="fixed inset-0 flex items-center justify-center bg-gray-900/90 backdrop-blur-sm z-50">
          <div className="text-center p-8 max-w-md">
            <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-white mx-auto mb-6"></div>
            <h3 className="text-xl font-medium text-white mb-2">Loading Translation Engine</h3>
            <p className="text-gray-400">This may take a moment...</p>
          </div>
        </div>
      ) : (
        <div className="relative z-10 container mx-auto px-4 sm:px-6 py-12 max-w-3xl">
          <div className="text-center mb-12">
            <h1 className="text-3xl sm:text-4xl font-bold text-white mb-4">
              AI-Powered Real-Time Translator
            </h1>
            <p className="text-gray-400 text-lg max-w-2xl mx-auto">
              {mode === 'translate' 
                ? 'Professional meeting translation with contextual understanding' 
                : 'Accurate speech transcription with AI enhancements'}
            </p>
          </div>

          <div className="mb-8">
            <ModeSelector mode={mode} setMode={setMode} />
          </div>

          <div className="mb-8">
            <StatusIndicator isListening={isListening} isTranslating={isTranslating} />
          </div>

          {renderRealtimeTranscript()}

          <div className="space-y-10">
            {mode === 'translate' && renderTranslations()}
            {renderTranscriptionMode()}
          </div>

          <div className="fixed bottom-6 left-1/2 transform -translate-x-1/2 z-20">
            <AudioCapture 
              isListening={isListening} 
              onToggleListening={handleToggleListening}
            />
          </div>

          {canInstall && !isInstalled && (
            <div className="fixed bottom-24 left-1/2 transform -translate-x-1/2 z-20">
              <button
                onClick={installPWA}
                className="bg-accent-500 hover:bg-accent-600 text-white px-5 py-2.5 rounded-full shadow-lg flex items-center space-x-2 transition-all"
              >
                <span>Install App</span>
                <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                  <path d="M3 17a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zm3.293-7.707a1 1 0 011.414 0L9 10.586V3a1 1 0 112 0v7.586l1.293-1.293a1 1 0 111.414 1.414l-3 3a1 1 0 01-1.414 0l-3-3a1 1 0 010-1.414z" />
                </svg>
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}