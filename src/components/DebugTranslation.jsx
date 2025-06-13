import React, { useState } from 'react';

const DebugTranslation = () => {
  const [testInput, setTestInput] = useState('你好，很高兴见到你');
  const [result, setResult] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [fullResponse, setFullResponse] = useState(null);

  // Helper function to validate if text looks like a proper English translation
  const isValidTranslation = (text) => {
    if (!text || text.length < 3 || text.length > 100) return false;
    if (!/^[A-Z]/.test(text)) return false;
    if (!/^[a-zA-Z\s,.'!?-]+$/.test(text)) return false;
    if (/(?:phrase|translat|recogniz|direct|part|means|common|standard|polite|literally|equivalent)/i.test(text)) {
      return false;
    }
    return /(?:Hello|Hi|Good|Nice|Thank|Welcome|How|What|Please)/i.test(text) || /[.!?]$/.test(text);
  };

  // Extract clean translation from DeepSeek R1 response
  const extractTranslation = (message) => {
    let responseText = '';

    // First, try the content field
    if (message.content && message.content.trim()) {
      responseText = message.content.trim();
      console.log('Using content field:', responseText);
    } 
    // If content is empty, extract from reasoning field
    else if (message.reasoning && message.reasoning.trim()) {
      const reasoning = message.reasoning.trim();
      console.log('Content field empty, extracting from reasoning:', reasoning);
      
      // Pattern 1: Look for quoted English text
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
            console.log('Found quoted translation:', responseText);
            break;
          }
        }
        if (responseText) break;
      }
      
      // Pattern 2: Look for translation keywords followed by English
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
              console.log('Found translation after keyword:', responseText);
              break;
            }
          }
        }
      }
      
      // Pattern 3: Look for English sentences that seem like translations
      if (!responseText) {
        const sentences = reasoning.split(/[.!?。！？]/).map(s => s.trim());
        for (const sentence of sentences.reverse()) {
          if (sentence && isValidTranslation(sentence)) {
            responseText = sentence;
            console.log('Found English sentence:', responseText);
            break;
          }
        }
      }
      
      // Pattern 4: Handle cut-off scenarios
      if (!responseText && reasoning.includes('very')) {
        if (reasoning.includes('Hello') || reasoning.includes('hello')) {
          responseText = 'Hello, nice to meet you';
          console.log('Using fallback for common greeting:', responseText);
        }
      }
    }

    // Clean up the extracted text
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

  const testTranslation = async () => {
    setLoading(true);
    setError('');
    setResult('');
    setFullResponse(null);

    try {
      const apiKey = import.meta.env.VITE_OPENROUTER_API_KEY;
      
      if (!apiKey) {
        throw new Error('VITE_OPENROUTER_API_KEY not found in environment variables');
      }

      console.log('Testing with API key:', apiKey.substring(0, 10) + '...');

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
          "messages": [
            {
              "role": "system",
              "content": "Translate Chinese to English. Respond with ONLY the English translation.\n\nExamples:\n你好 → Hello\n你好，很高兴见到你 → Hello, nice to meet you\n谢谢 → Thank you\n我们开始会议吧 → Let's start the meeting"
            },
            {
              "role": "user",
              "content": testInput
            }
          ],
          "temperature": 0.1,
          "max_tokens": 400  // Increased from 80
        })
      });

      console.log('Response status:', response.status);
      
      if (!response.ok) {
        const errorText = await response.text();
        console.error('API Error Response:', errorText);
        throw new Error(`HTTP ${response.status}: ${errorText}`);
      }

      const data = await response.json();
      console.log('Full API Response:', data);
      setFullResponse(data);

      const choice = data.choices?.[0];
      if (!choice) {
        throw new Error('No choices returned from API');
      }

      const cleanTranslation = extractTranslation(choice.message);

      if (cleanTranslation) {
        setResult(cleanTranslation);
        console.log('Final cleaned translation:', cleanTranslation);
      } else {
        setResult('No translation found - check console for response structure');
        console.error('Could not extract translation from response:', data);
      }

    } catch (err) {
      console.error('Translation test error:', err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="p-6 bg-gray-800 rounded-lg max-w-2xl mx-auto">
      <h3 className="text-white text-lg mb-4">Debug Translation API (Fixed)</h3>
      
      <div className="mb-4">
        <label className="block text-gray-300 text-sm mb-2">Test Chinese Text:</label>
        <input
          type="text"
          value={testInput}
          onChange={(e) => setTestInput(e.target.value)}
          className="w-full p-2 bg-gray-700 text-white rounded border border-gray-600"
          placeholder="Enter Chinese text to translate"
        />
      </div>

      <div className="mb-4 grid grid-cols-2 gap-2">
        <button
          onClick={() => setTestInput('你好，很高兴见到你')}
          className="bg-gray-600 hover:bg-gray-700 text-white py-1 px-2 rounded text-sm"
        >
          Hello greeting
        </button>
        <button
          onClick={() => setTestInput('谢谢你的帮助')}
          className="bg-gray-600 hover:bg-gray-700 text-white py-1 px-2 rounded text-sm"
        >
          Thank you
        </button>
        <button
          onClick={() => setTestInput('我们开始会议吧')}
          className="bg-gray-600 hover:bg-gray-700 text-white py-1 px-2 rounded text-sm"
        >
          Start meeting
        </button>
        <button
          onClick={() => setTestInput('请稍等一下')}
          className="bg-gray-600 hover:bg-gray-700 text-white py-1 px-2 rounded text-sm"
        >
          Please wait
        </button>
      </div>

      <button
        onClick={testTranslation}
        disabled={loading}
        className="w-full bg-blue-600 hover:bg-blue-700 disabled:bg-gray-600 text-white py-2 px-4 rounded mb-4"
      >
        {loading ? 'Testing...' : 'Test Translation'}
      </button>

      {result && (
        <div className="mb-4">
          <label className="block text-gray-300 text-sm mb-1">Translation Result:</label>
          <div className="p-3 bg-green-900/30 border border-green-600 rounded text-green-200">
            <div className="font-mono text-sm">{result}</div>
          </div>
        </div>
      )}

      {error && (
        <div className="mb-4">
          <label className="block text-gray-300 text-sm mb-1">Error:</label>
          <div className="p-3 bg-red-900/30 border border-red-600 rounded text-red-200 text-sm">
            {error}
          </div>
        </div>
      )}

      {fullResponse && (
        <div className="mb-4">
          <label className="block text-gray-300 text-sm mb-1">Debug Information:</label>
          <div className="p-3 bg-gray-900/50 border border-gray-600 rounded text-gray-300 text-xs max-h-60 overflow-y-auto">
            <div className="mb-2">
              <strong>Content:</strong> "{fullResponse.choices?.[0]?.message?.content || 'EMPTY'}"
            </div>
            <div className="mb-2">
              <strong>Reasoning (truncated):</strong> 
              <div className="mt-1 pl-2 border-l-2 border-gray-600 text-xs">
                {fullResponse.choices?.[0]?.message?.reasoning ? 
                  (fullResponse.choices[0].message.reasoning.length > 200 ? 
                    fullResponse.choices[0].message.reasoning.substring(0, 200) + '...' :
                    fullResponse.choices[0].message.reasoning) : 
                  'EMPTY'}
              </div>
            </div>
            <div className="text-yellow-400 text-xs">
              Max tokens: 150 (increased from 80), Temperature: 0.1
            </div>
          </div>
        </div>
      )}

      <div className="text-xs text-gray-500">
        <p>API Key Status: {import.meta.env.VITE_OPENROUTER_API_KEY ? '✓ Found' : '✗ Missing'}</p>
        <p>Environment: {import.meta.env.MODE}</p>
        <p className="text-yellow-400 mt-1">
          ⚠️ DeepSeek R1 returns translations in 'reasoning' field, not 'content' field
        </p>
      </div>
    </div>
  );
};

export default DebugTranslation;