import { useState, useEffect } from 'react';
import JSZip from 'jszip';

export default function ModelDownloader({ onComplete }) {
  const [downloadProgress, setDownloadProgress] = useState(0);
  const [error, setError] = useState(null);
  const [modelReady, setModelReady] = useState(false);
  const [stage, setStage] = useState('checking');
  const [currentModel, setCurrentModel] = useState('');

  const MODELS = {
    translation: {
      name: 'opus-mt-zh-en',
      displayName: 'Translation Model',
      size: '298MB',
      files: [
        'pytorch_model.bin',
        'config.json',
        'tokenizer.json',
        'tokenizer_config.json',
        'source.spm',
        'target.spm',
        'vocab.json'
      ]
    },
    sentiment: {
      name: 'twitter-xlm-roberta-base-sentiment',
      displayName: 'Sentiment Analyzer',
      size: '279MB',
      files: [
        'pytorch_model.bin',
        'config.json',
        'tokenizer.json',
        'tokenizer_config.json',
        'special_tokens_map.json',
        'sentencepiece.bpe.model'
      ]
    }
  };

  useEffect(() => {
    checkAllModelsStatus();
    downloadAllModels(); // Auto-start download
  }, []);

  const checkAllModelsStatus = async () => {
    try {
      const statusResponse = await fetch('/api/models/status');
      if (statusResponse.ok) {
        const { translation_ready, sentiment_ready } = await statusResponse.json();
        if (translation_ready && sentiment_ready) {
          completeSetup();
          return;
        }
      }
      
      const db = await openDB('modelDB', 1);
      const translationModel = await db.get('models', MODELS.translation.name);
      const sentimentModel = await db.get('models', MODELS.sentiment.name);
      
      if (translationModel && sentimentModel) {
        await sendModelsToBackend(db);
        completeSetup();
      }
    } catch (err) {
      console.error('Model check error:', err);
    }
  };

  const completeSetup = () => {
    setModelReady(true);
    onComplete(true);
  };

  const sendModelsToBackend = async (db) => {
    setStage('sending');
    try {
      for (const [modelType, config] of Object.entries(MODELS)) {
        const modelFiles = await db.get('models', config.name);
        if (!modelFiles) continue;

        const formData = new FormData();
        formData.append('model_type', modelType);
        formData.append('model_name', config.name);
        
        for (const [path, content] of Object.entries(modelFiles)) {
          const blob = new Blob([content], { type: 'application/octet-stream' });
          formData.append('files', blob, path);
        }
        
        await fetch('/api/model/setup', {
          method: 'POST',
          body: formData
        });
      }
    } catch (error) {
      console.error('Failed to send models:', error);
      throw error;
    }
  };

  const downloadAllModels = async () => {
    try {
      setError(null);
      setStage('downloading');
      
      const db = await openDB('modelDB', 1, {
        upgrade(db) {
          if (!db.objectStoreNames.contains('models')) {
            db.createObjectStore('models');
          }
        }
      });

      let totalProgress = 0;
      
      for (const [modelType, config] of Object.entries(MODELS)) {
        setCurrentModel(config.displayName);
        
        const modelFiles = {};
        const baseUrl = `https://huggingface.co/Helsinki-NLP/${config.name}/resolve/main/`;
        
        for (let i = 0; i < config.files.length; i++) {
          const filename = config.files[i];
          const fileUrl = modelType === 'sentiment' 
            ? `https://huggingface.co/cardiffnlp/${config.name}/resolve/main/${filename}`
            : `${baseUrl}${filename}`;
          
          try {
            const response = await fetch(fileUrl);
            if (!response.ok) throw new Error(`Failed to download ${filename}`);
            
            const content = await response.arrayBuffer();
            modelFiles[filename] = content;
            
            const progress = ((i + 1) / config.files.length) * 50;
            setDownloadProgress(totalProgress + Math.round(progress));
          } catch (fileError) {
            console.warn(`Skipping ${filename}:`, fileError.message);
          }
        }
        
        await db.put('models', modelFiles, config.name);
        totalProgress += 50;
      }
      
      await sendModelsToBackend(db);
      completeSetup();
      
    } catch (err) {
      console.error('Download failed:', err);
      setError(err.message);
      setStage('error');
    }
  };

  if (modelReady) return null;

  return (
    <div className="fixed inset-0 bg-primary-900/90 backdrop-blur-md z-50 flex items-center justify-center p-6">
      <div className="bg-primary-800 border border-primary-700 rounded-xl p-8 max-w-md w-full space-y-6">
        <h2 className="text-2xl font-bold text-white">AI Models Required</h2>
        
        <div className="space-y-2">
          {Object.entries(MODELS).map(([type, config]) => (
            <div key={type} className="flex justify-between text-sm text-primary-400">
              <span>• {config.displayName}</span>
              <span>{config.size}</span>
            </div>
          ))}
        </div>

        <div>
          <div className="flex justify-between text-sm text-primary-400 mb-1">
            <span>Progress</span>
            <span>{downloadProgress}% - {stage === 'sending' ? 'Initializing' : currentModel || 'Preparing'}</span>
          </div>
          <div className="w-full bg-primary-700 rounded-full h-2.5">
            <div 
              className="bg-accent-500 h-2.5 rounded-full transition-all" 
              style={{ width: `${downloadProgress}%` }}
            />
          </div>
        </div>

        {error && (
          <button
            onClick={downloadAllModels}
            className="w-full py-2 px-4 bg-red-500/20 text-red-300 rounded-lg text-sm hover:bg-red-500/30 transition-colors"
          >
            Retry Download
          </button>
        )}

        <div className="text-xs text-primary-500 text-center">
          <p>This only happens once. Models will be cached for offline use.</p>
        </div>
      </div>
    </div>
  );
}

function openDB(name, version, upgradeCallback) {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(name, version);
    request.onerror = () => reject(request.error);
    request.onsuccess = () => resolve(request.result);
    request.onupgradeneeded = (event) => upgradeCallback?.(event.target.result);
  });
}