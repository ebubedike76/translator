import { useState, useCallback, useRef } from 'react';

export const useDeepSeek = () => {
  const [translations, setTranslations] = useState([]);
  const [isTranslating, setIsTranslating] = useState(false);
  const [isExplaining, setIsExplaining] = useState(false);
  const [useLocalModel, setUseLocalModel] = useState(true); // Prefer local model
  const [modelStatus, setModelStatus] = useState({ translation_ready: false, sentiment_ready: false });
  const [modelStatusChecked, setModelStatusChecked] = useState(false);
  const processedTexts = useRef(new Set());
  const translationCache = useRef(new Map());

  // Check if local models are available
  const checkModelStatus = useCallback(async () => {
    console.log("🔄 Checking model status...");
  try {
    const response = await fetch("http://localhost:5000/api/models/status");
    console.log("HTTP status:", response.status); // Should be 200
    const status = await response.json();
    console.log("Model status:", status); // Should show translation_ready: true
    return status.translation_ready;
  } catch (error) {
    console.error("❌ Model check failed:", error); // Likely CORS/network error
    return false;
  }
  }, []);

  
  // Local translation using the Python backend
  const translateWithLocalModel = async (text) => {
     console.log("Sending to local model:", text); // Verify Chinese characters appear correctly
  try {
    const response = await fetch("http://localhost:5000/translate", {
      method: "POST",
      headers: {
        "Content-Type": "application/json; charset=utf-8", // Explicit UTF-8
      },
      body: JSON.stringify({ text }),
    });

      if (!response.ok) {
        throw new Error(`Local translation failed: ${response.status}`);
      }

      const data = await response.json();
      return {
        text: data.translation,
        context: 'Local model translation',
        tone: 'Professional',
        alternatives: []
      };
    } catch (error) {
      console.error('Local translation error:', error);
      throw error;
    }
  };

  // Extract clean translation from DeepSeek R1 response (kept as fallback)
  const extractTranslation = (message) => {
    let responseText = '';

    if (message.content && message.content.trim()) {
      responseText = message.content.trim();
    } 
    else if (message.reasoning && message.reasoning.trim()) {
      const reasoning = message.reasoning.trim();
      
      const quotedPatterns = [
        /["""']([A-Z][^"""']{5,50})["""']/g,
        /["""']([Hello|Hi|Good|Nice|Thank|Welcome][^"""']*)["""']/gi
      ];
      
      for (const pattern of quotedPatterns) {
        const matches = [...reasoning.matchAll(pattern)];
        for (const match of matches) {
          const candidate = match[1]?.trim();
          if (candidate && isValidTranslation(candidate)) {
            responseText = candidate;
            break;
          }
        }
        if (responseText) break;
      }
      
      if (!responseText) {
        const translationPatterns = [
          /(?:translates? to|means?|is|would be)[:\s]*["""']?([A-Z][^"""'\n.]{5,50})["""']?[.!]?\s*$/i,
          /(?:should be|equivalent)[:\s]*["""']?([A-Z][^"""'\n.]{5,50})["""']?[.!]?\s*$/i
        ];
        
        for (const pattern of translationPatterns) {
          const match = reasoning.match(pattern);
          if (match && match[1]) {
            const candidate = match[1].trim();
            if (isValidTranslation(candidate)) {
              responseText = candidate;
              break;
            }
          }
        }
      }
    }

    if (responseText) {
      responseText = responseText
        .replace(/^(Translation:|English:|Output:|Answer:|Result:)\s*/i, '')
        .replace(/["""]/g, '"')
        .replace(/^["""']|["""']$/g, '')
        .replace(/\s+/g, ' ')
        .trim();
      
      if (responseText && !/[.!?]$/.test(responseText)) {
        responseText += '.';
      }
    }

    return responseText;
  };

  const isValidTranslation = (text) => {
    if (!text || text.length < 3 || text.length > 100) return false;
    if (!/^[A-Z]/.test(text)) return false;
    if (!/^[a-zA-Z\s,.'!?-]+$/.test(text)) return false;
    if (/(?:phrase|translat|recogniz|direct|part|means|common|standard|polite|literally|equivalent)/i.test(text)) {
      return false;
    }
    return /(?:Hello|Hi|Good|Nice|Thank|Welcome|How|What|Please)/i.test(text) || /[.!?]$/.test(text);
  };

  // AI translation as fallback
  const translateWithAI = async (text) => {
    const apiKey = import.meta.env.VITE_OPENROUTER_API_KEY;
    if (!apiKey) {
      throw new Error('API key is required');
    }

    const systemPrompt = `Translate Chinese to English. Respond with ONLY the English translation.

Examples:
你好 → Hello
你好，很高兴见到你 → Hello, nice to meet you
谢谢 → Thank you
我们开始会议吧 → Let's start the meeting`;

    const messages = [
      { role: "system", content: systemPrompt },
      { role: "user", content: text }
    ];

    const response = await fetch("https://openrouter.ai/api/v1/chat/completions", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${apiKey}`,
        "HTTP-Referer": window.location.origin,
        "X-Title": "Professional Real-Time Translator",
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        "model": "deepseek/deepseek-r1-0528:free",
        "messages": messages,
        "temperature": 0.1,
        "max_tokens": 300,
        "stream": false
      })
    });

    if (!response.ok) {
      throw new Error(`AI API error: ${response.status}`);
    }

    const data = await response.json();
    const choice = data.choices?.[0];
    if (!choice) {
      throw new Error('No choices returned from API');
    }

    const responseText = extractTranslation(choice.message);
    if (!responseText) {
      throw new Error('No translation content found in API response');
    }

    return {
      text: responseText,
      context: 'AI translation',
      tone: 'Professional',
      alternatives: []
    };
  };

  // Smart translation function that chooses between local and AI
  const generateTranslation = async (text) => {
    console.log('Generating translation for:', text);
    console.log('Model status:', modelStatus);
    console.log('Use local model:', useLocalModel);
    
    // Always try local model first if it's ready and we prefer it
    if (useLocalModel && modelStatus.translation_ready) {
      try {
        console.log('🚀 Using LOCAL MODEL for fast translation');
        const result = await translateWithLocalModel(text);
        console.log('✅ Local translation successful:', result);
        return result;
      } catch (error) {
        console.log('❌ Local model failed, falling back to AI:', error.message);
      }
    } else {
      console.log('Local model not ready:', { 
        useLocalModel, 
        ready: modelStatus.translation_ready,
        checked: modelStatusChecked 
      });
    }

    // Fallback to AI translation
    console.log('🤖 Using AI for translation (fallback)');
    return await translateWithAI(text);
  };

  const isDuplicate = useCallback((text) => {
    const normalizedText = text.toLowerCase().trim();
    return processedTexts.current.has(normalizedText);
  }, []);

  const translateText = useCallback(async (transcriptData) => {
    const { text, isFinal, isSentenceComplete, sentenceId } = transcriptData;
    
    if (!text.trim()) return;

    const normalizedText = text.toLowerCase().trim();
    
    if (!isSentenceComplete && !isFinal) {
      console.log('Skipping incomplete sentence:', text);
      return;
    }

    if (processedTexts.current.has(normalizedText)) {
      console.log('Already processed:', text);
      return;
    }

    processedTexts.current.add(normalizedText);
    
    if (translationCache.current.has(normalizedText)) {
      console.log('Using cached translation for:', text);
      const cached = translationCache.current.get(normalizedText);
      updateTranslationEntry(text, cached, transcriptData);
      return;
    }

    setIsTranslating(true);
    
    try {
      // Ensure model status is checked before translation
      if (!modelStatusChecked) {
        console.log('Checking model status before translation...');
        await checkModelStatus();
      }
      
      const translation = await generateTranslation(text);
      translationCache.current.set(normalizedText, translation);
      updateTranslationEntry(text, translation, transcriptData);
      
    } catch (error) {
      console.error('Translation error:', error);
      updateTranslationEntry(text, {
        text: `[Translation Error] ${text}`,
        context: 'Error occurred during translation',
        tone: 'Error',
        alternatives: []
      }, transcriptData);
    } finally {
      setIsTranslating(false);
    }
  }, [useLocalModel, modelStatus.translation_ready, modelStatusChecked, checkModelStatus]);

  const updateTranslationEntry = useCallback((text, translation, transcriptData) => {
    const { confidence, contextInfo, isFinal, isSentenceComplete, sentenceId } = transcriptData;
    
    const newEntry = {
      id: sentenceId || `${Date.now()}-${Math.random()}`,
      original: text,
      translation: translation.text || translation,
      context: translation.context || 'Translation',
      tone: translation.tone || 'Professional',
      alternatives: translation.alternatives || [],
      confidence: confidence || 1,
      contextInfo: contextInfo || '',
      isFinal: isFinal || true,
      isSentenceComplete: isSentenceComplete || true,
      isParagraphComplete: false,
      timestamp: new Date().toISOString()
    };

    setTranslations(prev => {
      const existingIndex = prev.findIndex(t => t.id === newEntry.id);
      if (existingIndex >= 0) {
        const updated = [...prev];
        updated[existingIndex] = newEntry;
        return updated;
      }
      return [newEntry, ...prev.slice(0, 14)];
    });
  }, []);

  const explainTranslation = useCallback(async (originalText, translatedText) => {
    if (!originalText || !translatedText) return null;

    setIsExplaining(true);
    
    try {
      // Always use AI for explanations since local model doesn't handle this
      const apiKey = import.meta.env.VITE_OPENROUTER_API_KEY;
      if (!apiKey) {
        return 'API key required for explanations.';
      }

      const systemPrompt = `Explain Chinese-English translations briefly (max 30 words).`;
      const userPrompt = `Why is "${originalText}" translated as "${translatedText}"?`;

      const messages = [
        { role: "system", content: systemPrompt },
        { role: "user", content: userPrompt }
      ];

      const response = await fetch("https://openrouter.ai/api/v1/chat/completions", {
        method: "POST",
        headers: {
          "Authorization": `Bearer ${apiKey}`,
          "HTTP-Referer": window.location.origin,
          "X-Title": "Professional Real-Time Translator",
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          "model": "deepseek/deepseek-r1-0528:free",
          "messages": messages,
          "temperature": 0.3,
          "max_tokens": 400,
          "stream": false
        })
      });

      if (!response.ok) {
        throw new Error(`API error: ${response.status}`);
      }

      const data = await response.json();
      const choice = data.choices?.[0];
      const explanation = extractTranslation(choice.message);
      return explanation || 'Unable to provide explanation.';
      
    } catch (error) {
      console.error('Explanation error:', error);
      return 'Unable to provide explanation at this time.';
    } finally {
      setIsExplaining(false);
    }
  }, []);

  const clearTranslations = useCallback(() => {
    console.log('Clearing translations and cache');
    setTranslations([]);
    processedTexts.current.clear();
    translationCache.current.clear();
  }, []);

  const trainFromCorrection = useCallback((original, corrected) => {
    const normalizedOriginal = original.toLowerCase().trim();
    translationCache.current.set(normalizedOriginal, {
      text: corrected,
      context: 'User corrected',
      tone: 'Professional',
      alternatives: []
    });
  }, []);

  const toggleModelPreference = useCallback(() => {
    setUseLocalModel(prev => !prev);
  }, []);

  // Initialize model status on mount
  useState(() => {
    console.log('🔄 Initializing model status check...');
    checkModelStatus();
  }, []);

  return { 
    translations, 
    isTranslating,
    isExplaining,
    translateText, 
    explainTranslation,
    clearTranslations,
    trainFromCorrection,
    useLocalModel,
    toggleModelPreference,
    modelStatus,
    modelStatusChecked,
    checkModelStatus
  };
};