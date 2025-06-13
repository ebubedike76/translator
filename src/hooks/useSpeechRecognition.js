import { useState, useEffect, useRef, useCallback } from 'react';

export const useSpeechRecognition = (onTranscriptUpdate) => {
  const [isListening, setIsListening] = useState(false);
  const recognition = useRef(null);
  const sentenceBuffer = useRef('');
  const silenceTimer = useRef(null);
  const lastActivityTime = useRef(0);

  // Enhanced sentence end detection
  const detectSentenceEnd = useCallback((text) => {
    // Punctuation-based detection
    const punctuationEnd = /[。.！!？?]\s*$/;
    // Question patterns
    const questionPattern = /(吗|呢|吧|啊|啦|呀|哩|么|呢|吧)\s*$/;
    // Natural pause detection
    const naturalPause = /\s{2,}$/;
    
    return punctuationEnd.test(text) || 
           questionPattern.test(text) || 
           naturalPause.test(text);
  }, []);

  // Reset the silence timer
  const resetSilenceTimer = useCallback(() => {
    if (silenceTimer.current) clearTimeout(silenceTimer.current);
    silenceTimer.current = setTimeout(() => {
      if (sentenceBuffer.current.trim().length > 0) {
        onTranscriptUpdate({
          text: sentenceBuffer.current.trim(),
          isFinal: true,
          isSentenceComplete: true,
          timestamp: new Date().toISOString(),
          sentenceId: `${Date.now()}-${Math.random()}`
        });
        sentenceBuffer.current = '';
      }
    }, 1200); // 1.2 seconds of silence indicates sentence end
    lastActivityTime.current = Date.now();
  }, [onTranscriptUpdate]);

  useEffect(() => {
    if (!('webkitSpeechRecognition' in window)) {
      console.error('Speech recognition not supported');
      return;
    }

    recognition.current = new window.webkitSpeechRecognition();
    const rec = recognition.current;
    
    rec.continuous = true;
    rec.interimResults = true;
    rec.lang = 'zh-CN';
    rec.maxAlternatives = 3;

    rec.onresult = (event) => {
      let interimTranscript = '';
      let finalTranscript = '';
      
      for (let i = event.resultIndex; i < event.results.length; i++) {
        const result = event.results[i];
        const transcript = result[0].transcript;
        
        if (result.isFinal) {
          finalTranscript += transcript;
        } else {
          interimTranscript += transcript;
        }
      }

      // Process final results
      if (finalTranscript) {
        sentenceBuffer.current += ' ' + finalTranscript;
        const isComplete = detectSentenceEnd(sentenceBuffer.current);
        
        if (isComplete) {
          onTranscriptUpdate({
            text: sentenceBuffer.current.trim(),
            isFinal: true,
            isSentenceComplete: true,
            timestamp: new Date().toISOString(),
            sentenceId: `${Date.now()}-${Math.random()}`
          });
          sentenceBuffer.current = '';
        }
        resetSilenceTimer();
      }

      // Process interim results
      if (interimTranscript) {
        const currentText = sentenceBuffer.current + ' ' + interimTranscript;
        onTranscriptUpdate({
          text: currentText.trim(),
          isFinal: false,
          isSentenceComplete: false,
          timestamp: new Date().toISOString(),
          sentenceId: `${Date.now()}-${Math.random()}`
        });
        resetSilenceTimer();
      }
    };

    rec.onerror = (event) => {
      console.warn('Speech recognition error:', event.error);
      if (event.error === 'no-speech' || event.error === 'aborted') {
        setTimeout(() => {
          if (isListening && recognition.current) {
            recognition.current.start();
          }
        }, 500);
      }
    };

    rec.onend = () => {
      if (isListening) {
        setTimeout(() => {
          if (isListening && recognition.current) {
            recognition.current.start();
          }
        }, 100);
      }
    };

    return () => {
      if (silenceTimer.current) clearTimeout(silenceTimer.current);
      if (recognition.current) recognition.current.stop();
    };
  }, [isListening, detectSentenceEnd, resetSilenceTimer, onTranscriptUpdate]);

  const startListening = useCallback(() => {
    if (recognition.current && !isListening) {
      sentenceBuffer.current = '';
      recognition.current.start();
      setIsListening(true);
      lastActivityTime.current = Date.now();
    }
  }, [isListening]);

  const stopListening = useCallback(() => {
    if (recognition.current && isListening) {
      if (silenceTimer.current) clearTimeout(silenceTimer.current);
      recognition.current.stop();
      setIsListening(false);
      
      // Flush any remaining content in the buffer
      if (sentenceBuffer.current.trim().length > 0) {
        onTranscriptUpdate({
          text: sentenceBuffer.current.trim(),
          isFinal: true,
          isSentenceComplete: true,
          timestamp: new Date().toISOString(),
          sentenceId: `${Date.now()}-${Math.random()}`
        });
        sentenceBuffer.current = '';
      }
    }
  }, [isListening, onTranscriptUpdate]);

  return { 
    isListening,
    startListening, 
    stopListening
  };
};