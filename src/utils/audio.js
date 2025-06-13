// src/utils/audio.js - Audio processing utilities
export class AudioProcessor {
  constructor() {
    this.audioContext = null;
    this.mediaRecorder = null;
    this.stream = null;
    this.chunks = [];
  }
  // Initialize audio context
  async initializeAudio() {
    try {
      this.audioContext = new (window.AudioContext || window.webkitAudioContext)();
      return true;
    } catch (error) {
      console.error('Audio context initialization failed:', error);
      return false;
    }
  }

  // Get user media with optimized settings for speech
  async getUserMedia() {
    try {
      const constraints = {
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true,
          sampleRate: 44100,
          channelCount: 1
        }
      };

      this.stream = await navigator.mediaDevices.getUserMedia(constraints);
      return this.stream;
    } catch (error) {
      console.error('Failed to get user media:', error);
      throw error;
    }
  }

  // Start recording audio
  startRecording(onDataAvailable) {
    if (!this.stream) {
      throw new Error('Stream not initialized');
    }

    this.mediaRecorder = new MediaRecorder(this.stream, {
      mimeType: 'audio/webm;codecs=opus'
    });

    this.chunks = [];

    this.mediaRecorder.ondataavailable = (event) => {
      if (event.data.size > 0) {
        this.chunks.push(event.data);
        if (onDataAvailable) {
          onDataAvailable(event.data);
        }
      }
    };

    this.mediaRecorder.onstop = () => {
      const audioBlob = new Blob(this.chunks, { type: 'audio/webm' });
      this.chunks = [];
      return audioBlob;
    };

    this.mediaRecorder.start(100); // Collect data every 100ms
    return this.mediaRecorder;
  }

  // Stop recording
  stopRecording() {
    if (this.mediaRecorder && this.mediaRecorder.state !== 'inactive') {
      this.mediaRecorder.stop();
    }
  }

  // Analyze audio levels for visual feedback
  createAudioAnalyzer() {
    if (!this.audioContext || !this.stream) {
      return null;
    }

    const analyser = this.audioContext.createAnalyser();
    const source = this.audioContext.createMediaStreamSource(this.stream);
    
    analyser.fftSize = 256;
    analyser.smoothingTimeConstant = 0.8;
    
    source.connect(analyser);
    
    const bufferLength = analyser.frequencyBinCount;
    const dataArray = new Uint8Array(bufferLength);

    return {
      analyser,
      dataArray,
      getAudioLevel: () => {
        analyser.getByteFrequencyData(dataArray);
        let sum = 0;
        for (let i = 0; i < bufferLength; i++) {
          sum += dataArray[i];
        }
        return sum / bufferLength / 255; // Normalize to 0-1
      }
    };
  }

  // Clean up resources
  cleanup() {
    if (this.mediaRecorder) {
      this.mediaRecorder.stop();
    }
    
    if (this.stream) {
      this.stream.getTracks().forEach(track => track.stop());
    }
    
    if (this.audioContext) {
      this.audioContext.close();
    }
  }

  // Check browser compatibility
  static isSupported() {
    return !!(
      navigator.mediaDevices &&
      navigator.mediaDevices.getUserMedia &&
      window.MediaRecorder &&
      (window.AudioContext || window.webkitAudioContext)
    );
  }

  // Generate audio visualization data
  getVisualizationData(analyzer) {
    if (!analyzer) return [];
    
    const { analyser, dataArray } = analyzer;
    analyser.getByteFrequencyData(dataArray);
    
    // Convert to array for easier manipulation
    return Array.from(dataArray).map(value => value / 255);
  }
}

// Audio utility functions
export const playNotificationSound = (frequency = 800, duration = 200) => {
  const audioContext = new (window.AudioContext || window.webkitAudioContext)();
  const oscillator = audioContext.createOscillator();
  const gainNode = audioContext.createGain();
  
  oscillator.connect(gainNode);
  gainNode.connect(audioContext.destination);
  
  oscillator.frequency.value = frequency;
  oscillator.type = 'sine';
  
  gainNode.gain.setValueAtTime(0.3, audioContext.currentTime);
  gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + duration / 1000);
  
  oscillator.start(audioContext.currentTime);
  oscillator.stop(audioContext.currentTime + duration / 1000);
};

// Check microphone permissions
export const checkMicrophonePermission = async () => {
  try {
    const result = await navigator.permissions.query({ name: 'microphone' });
    return result.state; // 'granted', 'denied', or 'prompt'
  } catch (error) {
    console.warn('Permission API not supported:', error);
    return 'unknown';
  }
};

// Format audio duration
export const formatDuration = (seconds) => {
  const mins = Math.floor(seconds / 60);
  const secs = Math.floor(seconds % 60);
  return `${mins}:${secs.toString().padStart(2, '0')}`;
};