import { useState, useEffect, useRef } from 'react';

export const useTypewriter = (text, speed = 15) => {
  const [displayText, setDisplayText] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const intervalRef = useRef(null);

  useEffect(() => {
    // Clear previous interval
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }

    if (!text) {
      setDisplayText('');
      setIsTyping(false);
      return;
    }
    
    setIsTyping(true);
    setDisplayText('');
    let i = 0;
    
    intervalRef.current = setInterval(() => {
      if (i < text.length) {
        setDisplayText(prev => text.substring(0, i + 1));
        i++;
      } else {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
        setIsTyping(false);
      }
    }, speed);

    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
    };
  }, [text, speed]);

  return { displayText, isTyping };
};