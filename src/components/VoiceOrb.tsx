import { useState, useRef } from 'react';
import { Mic, MicOff, Loader2 } from 'lucide-react';
import { useAppStore } from '@/store';
import { toast } from 'sonner';

export function VoiceOrb() {
  const [isListening, setIsListening] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [history, setHistory] = useState<{role: 'user' | 'assistant', text: string}[]>([]);
  const recognitionRef = useRef<any>(null);
  const { addTask } = useAppStore();

  const handleToggleListen = () => {
    if (isListening) {
      stopListening();
    } else {
      startListening();
    }
  };

  const startListening = () => {
    // Check for browser support
    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!SpeechRecognition) {
      toast.error('Voice recognition not supported in this browser.');
      return;
    }

    const recognition = new SpeechRecognition();
    recognition.lang = 'en-US';
    recognition.interimResults = false;
    recognition.maxAlternatives = 1;

    recognition.onstart = () => {
      setIsListening(true);
      toast('Listening...', { id: 'voice-toast' });
    };

    recognition.onresult = async (event: any) => {
      const transcript = event.results[0][0].transcript;
      setIsListening(false);
      setIsProcessing(true);
      toast.loading(`Processing: "${transcript}"`, { id: 'voice-toast' });
      
      const currentHistory = [...history, { role: 'user' as const, text: transcript }];
      setHistory(currentHistory);
      
      try {
        const response = await fetch('/api/agents/voice', {
          method: 'POST',
          headers: { 
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({ transcript, history }),
        });
        
        if (!response.ok) { const errData = await response.json().catch(() => ({})); throw new Error(errData.error || 'Failed to parse voice command'); }
        const data = await response.json();
        
        const speak = (text: string) => {
          const synth = window.speechSynthesis;
          if (synth) {
            const utterance = new SpeechSynthesisUtterance(text);
            synth.speak(utterance);
          }
        };

        if (data.responseText) {
          toast.success(data.responseText, { id: 'voice-toast' });
          speak(data.responseText);
          setHistory([...currentHistory, { role: 'assistant' as const, text: data.responseText }]);
        }

        if (data.createTask) {
          addTask({
            id: crypto.randomUUID(),
            userId: 'user', // would be actual uid
            title: data.createTask.title,
            description: `Generated from voice interaction.`,
            deadline: data.createTask.deadline || new Date(Date.now() + 86400000).toISOString(),
            status: 'pending',
            priorityScore: data.createTask.priorityScore || 5,
            subtasks: [],
            focusBlocks: [],
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
          });
        }
      } catch (err: any) {
        const errMsg = err.message || String(err);
        if (errMsg.includes("503") || errMsg.includes("unavailable") || errMsg.includes("overloaded")) {
          toast.error("Model Temporarily Unavailable (503): Google's voice agent is currently experience high load. Please try again later.", { 
            id: 'voice-toast', 
            duration: 8000 
          });
        } else {
          toast.error(err.message || 'Could not parse task from voice.', { id: 'voice-toast' });
        }
        console.error(err);
      } finally {
        setIsProcessing(false);
      }
    };

    recognition.onerror = (event: any) => {
      setIsListening(false);
      toast.error(`Voice error: ${event.error}`, { id: 'voice-toast' });
    };

    recognition.onend = () => {
      setIsListening(false);
    };

    recognitionRef.current = recognition;
    recognition.start();
  };

  const stopListening = () => {
    if (recognitionRef.current) {
      recognitionRef.current.stop();
    }
  };

  return (
    <button
      onClick={handleToggleListen}
      disabled={isProcessing}
      className={`fixed bottom-6 right-6 z-50 flex h-14 w-14 items-center justify-center rounded-full shadow-lg shadow-emerald-500/20 transition-all duration-300 hover:scale-105 ${
        isListening ? 'bg-red-500 animate-pulse ring-4 ring-red-500/30' : 'bg-emerald-600 hover:bg-emerald-500'
      }`}
    >
      {isProcessing ? (
        <Loader2 className="h-6 w-6 animate-spin text-slate-900" />
      ) : isListening ? (
        <MicOff className="h-6 w-6 text-slate-900" />
      ) : (
        <Mic className="h-6 w-6 text-slate-900" />
      )}
    </button>
  );
}
