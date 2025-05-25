"use client";

import { useState, useEffect, useCallback, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { Textarea } from '@/components/ui/textarea';
import { Label } from "@/components/ui/label";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Mic, StopCircle, Play, Loader2, AlertTriangle, Languages, Trash2, Volume2 } from 'lucide-react';
import { LanguageSelect } from './language-select';
import type { LanguageCode } from '@/types/polyvoice';
import { languageOptions } from '@/types/polyvoice';
import { useAudioRecorder } from '@/hooks/use-audio-recorder';
import type { ManualAudioRecorderControls } from '@/hooks/use-audio-recorder';
import { useToast } from "@/hooks/use-toast";

import { transcribeSpeech } from '@/ai/flows/transcribe-speech';
import { translateRealTime } from '@/ai/flows/translate-real-time';
import { synthesizeEmotionalSpeech } from '@/ai/flows/synthesize-emotional-speech';

type ProcessingStep = 'transcribing' | 'translating' | 'synthesizing' | null;
interface ConversationEntry {
  id: string;
  originalText: string;
  detectedLanguage: string;
  translatedText: string;
  synthesizedAudioUri: string | null;
  sourceLanguage: LanguageCode;
  targetLanguage: LanguageCode;
}

export function ConversationUI() {
  const [languageOne, setLanguageOne] = useState<LanguageCode>('en');
  const [languageTwo, setLanguageTwo] = useState<LanguageCode>('hi');
  
  const recorderControls = useAudioRecorder();
  const { 
    isRecording,
    error: recorderError, 
    startRecording,
    stopRecording,
  } = recorderControls as ManualAudioRecorderControls;

  const [latestTranscribedText, setLatestTranscribedText] = useState('');
  const [latestDetectedLanguageLabel, setLatestDetectedLanguageLabel] = useState('');
  const [latestTranslatedText, setLatestTranslatedText] = useState('');
  const [latestSynthesizedAudioDataUri, setLatestSynthesizedAudioDataUri] = useState<string | null>(null);
  
  const [processingStep, setProcessingStep] = useState<ProcessingStep>(null);
  const [currentError, setCurrentError] = useState<string | null>(null);
  const [conversationLog, setConversationLog] = useState<ConversationEntry[]>([]);

  const { toast } = useToast();
  const synthesizedAudioRef = useRef<HTMLAudioElement | null>(null);

  useEffect(() => {
    if (recorderError) {
      setCurrentError(recorderError);
      toast({ variant: "destructive", title: "Recorder Error", description: recorderError });
    }
  }, [recorderError, toast]);

  const resetCurrentSegmentState = () => {
    setLatestTranscribedText('');
    setLatestDetectedLanguageLabel('');
    setLatestTranslatedText('');
    setLatestSynthesizedAudioDataUri(null);
    setCurrentError(null); 
  }

  const clearConversationLog = () => {
    setConversationLog([]);
    resetCurrentSegmentState();
    toast({ title: "Conversation Cleared", description: "The chat log has been cleared." });
  }

  useEffect(() => {
    // Reset conversation if languages change
    setConversationLog([]);
    resetCurrentSegmentState();
  }, [languageOne, languageTwo]);


  const handleToggleRecording = async () => {
    setCurrentError(null);
    if (!isRecording) {
      resetCurrentSegmentState();
      try {
        await startRecording();
        toast({ title: "Recording Started", description: "Speak now..." });
      } catch (err) {
        // Error is handled by the useEffect for recorderError
      }
    } else {
      toast({ title: "Processing Audio...", description: "Please wait." });
      const audioUri = await stopRecording();
      if (audioUri && audioUri !== 'data:,' && audioUri.length > 50) {
        processAudioFlow(audioUri);
      } else {
        toast({ variant: "default", title: "No Audio Recorded", description: "Recording was empty or too short." });
        setProcessingStep(null); // Ensure loading state is cleared
      }
    }
  };
  
  const processAudioFlow = async (audioUri: string) => {
    resetCurrentSegmentState(); 
    setProcessingStep('transcribing');

    let entry: Partial<ConversationEntry> = { 
        id: Date.now().toString(),
        sourceLanguage: languageOne, // Tentative, will be updated by detection
        targetLanguage: languageTwo, // Tentative
    };

    try {
      const transcriptionResult = await transcribeSpeech({ audioDataUri: audioUri });
      if (!transcriptionResult || !transcriptionResult.transcription) {
        toast({ variant: "default", title: "No Speech Detected", description: "Could not transcribe speech from the recording." });
        setProcessingStep(null);
        entry.originalText = "No speech detected in recording.";
        entry.translatedText = "N/A";
        setConversationLog(prev => [...prev, entry as ConversationEntry]);
        return;
      }
      setLatestTranscribedText(transcriptionResult.transcription);
      entry.originalText = transcriptionResult.transcription;
      
      const detectedLang = transcriptionResult.detectedLanguage;
      const detectedLangOption = languageOptions.find(opt => opt.value === detectedLang);
      const detectedLangLabel = detectedLangOption ? detectedLangOption.label : 'Unknown';
      setLatestDetectedLanguageLabel(detectedLangLabel);
      entry.detectedLanguage = detectedLangLabel;

      if (detectedLang === 'unknown') {
        toast({ variant: "destructive", title: "Language Detection Failed", description: "Could not determine the spoken language." });
        setProcessingStep(null);
        entry.translatedText = "Language detection failed.";
        setConversationLog(prev => [...prev, entry as ConversationEntry]);
        return;
      }
      
      let actualSourceLanguage: LanguageCode = detectedLang;
      let actualTargetLanguage: LanguageCode;

      if (detectedLang === languageOne) {
        actualTargetLanguage = languageTwo;
      } else if (detectedLang === languageTwo) {
        actualTargetLanguage = languageOne;
      } else {
        toast({ variant: "destructive", title: "Language Mismatch", description: `Detected ${detectedLangLabel}, but expected ${languageOptions.find(o=>o.value===languageOne)?.label} or ${languageOptions.find(o=>o.value===languageTwo)?.label}.` });
        setProcessingStep(null);
        entry.translatedText = `Language mismatch: detected ${detectedLangLabel}.`;
        setConversationLog(prev => [...prev, entry as ConversationEntry]);
        return;
      }
      entry.sourceLanguage = actualSourceLanguage;
      entry.targetLanguage = actualTargetLanguage;
      
      toast({ title: "Speech Transcribed", description: `"${transcriptionResult.transcription}" (Detected: ${detectedLangLabel})` });

      if (actualSourceLanguage === actualTargetLanguage) {
        setLatestTranslatedText(transcriptionResult.transcription); 
        entry.translatedText = transcriptionResult.transcription;
        toast({ title: "Same Language", description: "Input and output languages are effectively the same. No translation performed." });
        
        setProcessingStep('synthesizing');
        try {
          const synthesisResult = await synthesizeEmotionalSpeech({
            text: transcriptionResult.transcription,
            language: actualSourceLanguage,
            emotion: 'neutral',
          });
          setLatestSynthesizedAudioDataUri(synthesisResult.audioDataUri);
          console.log("Synthesized Audio Data URI:", synthesisResult.audioDataUri);
          entry.synthesizedAudioUri = synthesisResult.audioDataUri;
          toast({ title: "Speech Synthesized", description: "Successfully synthesized original text to speech." });
          if (synthesisResult.audioDataUri) await playAudio(synthesisResult.audioDataUri);
        } catch (synthError) {
          console.error("Synthesis error:", synthError);
          toast({ variant: "destructive", title: "Synthesis Error", description: synthError instanceof Error ? synthError.message : String(synthError) });
          setCurrentError(`Synthesis error: ${synthError instanceof Error ? synthError.message : String(synthError)}`);
        }
      } else {
        setProcessingStep('translating');
        let translationResult;
        try {
          translationResult = await translateRealTime({
            text: transcriptionResult.transcription,
            sourceLanguage: actualSourceLanguage,
            targetLanguage: actualTargetLanguage,
          });
          if (!translationResult || typeof translationResult.translation !== 'string') {
            throw new Error("Translation result was invalid or missing.");
          }
          setLatestTranslatedText(translationResult.translation);
          entry.translatedText = translationResult.translation;
          toast({ title: "Text Translated", description: `"${translationResult.translation}"` });
        } catch (translationError) {
          console.error("Translation error:", translationError);
          toast({ variant: "destructive", title: "Translation Error", description: translationError instanceof Error ? translationError.message : String(translationError) });
          setCurrentError(`Translation error: ${translationError instanceof Error ? translationError.message : String(translationError)}`);
          setProcessingStep(null);
          setConversationLog(prev => [...prev, entry as ConversationEntry]);
          return;
        }
        setProcessingStep('synthesizing');
        try {
          const synthesisResult = await synthesizeEmotionalSpeech({
            text: translationResult.translation,
            language: actualTargetLanguage,
            emotion: 'neutral', 
          });
          if (!synthesisResult || typeof synthesisResult.audioDataUri !== 'string') {
            throw new Error("Speech synthesis result was invalid or missing.");
          }
          setLatestSynthesizedAudioDataUri(synthesisResult.audioDataUri);
          console.log("Synthesized Audio Data URI:", synthesisResult.audioDataUri);
          entry.synthesizedAudioUri = synthesisResult.audioDataUri;
          toast({ title: "Speech Synthesized", description: "Successfully synthesized translated text to speech." });
          if (synthesisResult.audioDataUri) await playAudio(synthesisResult.audioDataUri);
        } catch (synthError) {
          console.error("Synthesis error:", synthError);
          toast({ variant: "destructive", title: "Synthesis Error", description: synthError instanceof Error ? synthError.message : String(synthError) });
          setCurrentError(`Synthesis error: ${synthError instanceof Error ? synthError.message : String(synthError)}`);
        }
      }

    } catch (err) {
      console.error("Processing error:", err);
      const errObject = err as any;
      let extractedMessage: string = "An unknown error occurred during processing.";
      let digestInfo = "";

      if (errObject instanceof Error) {
        extractedMessage = errObject.message;
        if ('digest' in errObject) {
          digestInfo = ` Digest: ${JSON.stringify((errObject as any).digest)}`;
        }
      } else if (typeof errObject === 'string' && errObject) {
        extractedMessage = errObject;
      } else if (errObject && typeof errObject === 'object') {
        if (typeof errObject.message === 'string' && errObject.message) {
          extractedMessage = errObject.message;
        } else if (typeof errObject.details === 'string' && errObject.details) {
          extractedMessage = errObject.details;
        } else {
          try {
            if (typeof errObject.type === 'string' && typeof errObject.isTrusted === 'boolean') {
                extractedMessage = `An event of type '${errObject.type}' occurred.`;
            } else {
                const stringifiedError = JSON.stringify(errObject);
                extractedMessage = (stringifiedError && stringifiedError !== '{}') ? stringifiedError : "An undescribed error object was received.";
            }
          } catch (e) {
            extractedMessage = "An error object was received, but it could not be stringified.";
          }
        }
      }
      
      setCurrentError(`Error during ${processingStep || 'processing'}: ${extractedMessage}${digestInfo}`);
      toast({ variant: "destructive", title: "Processing Error", description: `${extractedMessage}${digestInfo}` });
      
      entry.translatedText = entry.translatedText || (entry.originalText ? `Error processing "${entry.originalText}"` : `Error: ${extractedMessage}`);
    } finally {
      setProcessingStep(null);
      if (!entry.originalText && !entry.translatedText && !currentError) {
        // Avoid adding totally empty entries unless there was a specific error message set
      } else {
         if (!entry.originalText && !currentError) entry.originalText = "Recording error or no speech detected.";
         if (!entry.translatedText && !currentError) entry.translatedText = "Processing did not complete.";
         setConversationLog(prev => [...prev, entry as ConversationEntry]);
      }
    }
  };

  const playAudio = (audioDataUri: string): Promise<void> => {
    return new Promise((resolve, reject) => {
      const audioDataUriPattern = /^data:audio\/(wav|mpeg|mp3|ogg|webm);base64,[A-Za-z0-9+/=]+$/;
      if (!audioDataUri || audioDataUri === 'data:,' || !audioDataUriPattern.test(audioDataUri)) {
        toast({ variant: "destructive", title: "Invalid Audio Source", description: "The audio source is invalid or unsupported." });
        resolve();
        return;
      }

      if (synthesizedAudioRef.current) {
        synthesizedAudioRef.current.src = audioDataUri;
        synthesizedAudioRef.current.onended = () => resolve();
        
        synthesizedAudioRef.current.onerror = (event: any) => {
          console.error("Error playing audio event:", event);
          let errorMessage = "Could not play synthesized audio.";
          const audioElement = event?.target as HTMLAudioElement | undefined;
          if (audioElement && audioElement.error) {
            switch (audioElement.error.code) {
              case 1: 
                errorMessage = "Audio playback aborted.";
                break;
              case 2:
                errorMessage = "A network error caused audio playback to fail.";
                break;
              case 3:
                errorMessage = "Audio decoding error. The format may be unsupported or corrupted.";
                break;
              case 4:
                errorMessage = "Audio source not supported or invalid format.";
                break;
              default:
                errorMessage = `Audio playback error (code ${audioElement.error.code}).`;
            }
          } else {
            errorMessage = "Unknown audio playback error occurred.";
          }
          toast({ variant: "destructive", title: "Playback Error", description: errorMessage });
          reject(new Error(errorMessage));
        };

        synthesizedAudioRef.current.play().catch(playPromiseError => {
          console.error("Error initiating audio play:", playPromiseError);
          let finalErrorMessage = "Could not play synthesized audio.";

          if (playPromiseError instanceof Error) {
            finalErrorMessage = playPromiseError.message;
            if (playPromiseError.name === 'NotAllowedError') {
               finalErrorMessage = "Audio playback was not allowed by the browser. Please ensure you've interacted with the page or check site permissions.";
            } else if (playPromiseError.name === 'AbortError') {
                finalErrorMessage = "Audio playback was aborted, possibly by another play request.";
            }
          } else if (typeof playPromiseError === 'string') {
            finalErrorMessage = playPromiseError;
          } else if (playPromiseError && typeof playPromiseError === 'object' && (playPromiseError as any).message) {
            finalErrorMessage = (playPromiseError as any).message;
          }
          
          toast({ variant: "destructive", title: "Playback Initiation Error", description: finalErrorMessage });
          reject(new Error(finalErrorMessage));
        });
      } else {
        toast({ variant: "default", title: "No Audio Element", description: "Audio element is not available for playback." });
        resolve();
      }
    });
  };
  
  const playSpecificAudio = (audioUri: string | null) => {
    if (audioUri && synthesizedAudioRef.current && audioUri !== 'data:,') {
      synthesizedAudioRef.current.src = audioUri;
      synthesizedAudioRef.current.play().catch(err => {
        console.error("Error playing specific audio:", err);
        let errorMessage = "Could not play selected audio.";
         if (err instanceof Error) {
            errorMessage = err.message;
            if (err.name === 'NotAllowedError') {
               errorMessage = "Audio playback was not allowed by the browser. Interaction may be required.";
            }
        }
        toast({ variant: "destructive", title: "Playback Error", description: errorMessage });
      });
    } else if (!audioUri || audioUri === 'data:,') {
        toast({ variant: "default", title: "No Audio", description: "No audio available for this entry." });
    }
  };

  const isLoading = !!processingStep || isRecording;

  return (
    <Card className="w-full shadow-2xl">
      <CardHeader>
        <CardTitle className="text-2xl sm:text-3xl text-center text-primary flex items-center justify-center">
          <Languages className="mr-3 h-8 w-8" /> PolyVoice Translator
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 items-end">
          <LanguageSelect
            id="language-one"
            label="Language 1"
            value={languageOne}
            onChange={(newLang) => {
              if (newLang === languageTwo) setLanguageTwo(languageOne); 
              setLanguageOne(newLang);
            }}
            options={languageOptions}
            disabled={isLoading}
          />
          <LanguageSelect
            id="language-two"
            label="Language 2"
            value={languageTwo}
            onChange={(newLang) => {
              if (newLang === languageOne) setLanguageOne(languageTwo);
              setLanguageTwo(newLang);
            }}
            options={languageOptions}
            disabled={isLoading} 
          />
        </div>
        
        <div className="flex flex-col sm:flex-row items-center justify-center space-y-2 sm:space-y-0 sm:space-x-4">
          <Button
            onClick={handleToggleRecording}
            disabled={processingStep !== null}
            className="w-full sm:w-auto px-8 py-6 text-lg rounded-full shadow-lg transition-all duration-300 ease-in-out hover:shadow-xl focus:ring-4 focus:ring-primary/50"
            variant={isRecording ? "destructive" : "default"}
          >
            {isRecording ? (
              <StopCircle className="mr-2 h-6 w-6" />
            ) : (
              <Mic className="mr-2 h-6 w-6" />
            )}
            {isRecording ? "Stop Recording & Translate" : "Start Recording"}
          </Button>
           <Button
            onClick={clearConversationLog}
            variant="outline"
            size="icon"
            className="rounded-full shadow-md hover:shadow-lg"
            title="Clear Conversation Log"
            disabled={isLoading || conversationLog.length === 0}
          >
            <Trash2 className="h-5 w-5" />
          </Button>
        </div>
        
        {currentError && (
          <div className="p-3 bg-destructive/10 border border-destructive/30 rounded-md flex items-center text-destructive">
            <AlertTriangle className="h-5 w-5 mr-2 shrink-0" />
            <p className="text-sm">{currentError}</p>
          </div>
        )}

        {(latestTranscribedText || (processingStep && processingStep !== 'transcribing')) && (
          <Card className="bg-muted/20 p-4 rounded-lg shadow">
            <CardHeader className="p-2">
              <CardTitle className="text-lg">Current Segment</CardTitle>
            </CardHeader>
            <CardContent className="p-2 space-y-2">
              <div>
                <Label htmlFor="latest-transcribed-text" className="text-sm font-semibold">
                  {processingStep === 'transcribing' ? "Transcribing..." : `Your Speech ${latestDetectedLanguageLabel && `(Detected: ${latestDetectedLanguageLabel})`}:`}
                </Label>
                <Textarea
                  id="latest-transcribed-text"
                  value={latestTranscribedText}
                  readOnly
                  placeholder="Transcribed text will appear here..."
                  className="mt-1 min-h-[60px] bg-background shadow-inner text-sm"
                />
              </div>
              <div>
                <Label htmlFor="latest-translated-text" className="text-sm font-semibold">
                  {processingStep === 'translating' ? "Translating..." : "Translation:"}
                </Label>
                <Textarea
                  id="latest-translated-text"
                  value={latestTranslatedText}
                  readOnly
                  placeholder="Translated text will appear here..."
                  className="mt-1 min-h-[60px] bg-background shadow-inner text-sm"
                />
              </div>
              {latestSynthesizedAudioDataUri && !processingStep && (
                <div className="flex items-center space-x-2 pt-2">
                  <Button onClick={() => playSpecificAudio(latestSynthesizedAudioDataUri)} variant="outline" size="sm" className="shadow-sm">
                    <Play className="mr-2 h-4 w-4" /> Play Latest Translation
                  </Button>
                </div>
              )}
               {processingStep === 'synthesizing' && (
                 <div className="flex items-center text-muted-foreground text-sm">
                   <Loader2 className="mr-2 h-4 w-4 animate-spin" /> Generating audio...
                 </div>
               )}
            </CardContent>
          </Card>
        )}
        
        {conversationLog.length > 0 && (
          <div className="space-y-3">
            <h3 className="text-xl font-semibold text-center text-primary">Conversation Log</h3>
            <ScrollArea className="h-[300px] w-full rounded-md border p-4 bg-muted/30 shadow-inner">
              <div className="space-y-4">
                {conversationLog.map((entry) => (
                  <Card key={entry.id} className="bg-card shadow-sm">
                    <CardContent className="p-3 space-y-1 text-sm">
                      <p><strong>Said ({entry.detectedLanguage || languageOptions.find(l=>l.value === entry.sourceLanguage)?.label || 'N/A'}):</strong> {entry.originalText || "..."}</p>
                      <p><strong>Translated ({languageOptions.find(l=>l.value === entry.targetLanguage)?.label || 'N/A'}):</strong> {entry.translatedText || "..."}</p>
                      {entry.synthesizedAudioUri && (
                        <Button 
                          onClick={() => playSpecificAudio(entry.synthesizedAudioUri)} 
                          variant="ghost" 
                          size="sm"
                          className="text-xs h-auto p-1 text-accent hover:text-accent-foreground"
                        >
                          <Volume2 className="mr-1 h-3 w-3" /> Play Audio
                        </Button>
                      )}
                    </CardContent>
                  </Card>
                ))}
              </div>
            </ScrollArea>
          </div>
        )}
        <audio ref={synthesizedAudioRef} muted={false} />

      </CardContent>
      <CardFooter className="flex justify-center min-h-[40px]">
        { (isRecording || processingStep ) && ( 
          <div className="flex items-center text-muted-foreground">
            <Loader2 className="mr-2 h-5 w-5 animate-spin" />
            <p>
              {isRecording && !processingStep && "Recording..."}
              {processingStep === 'transcribing' && "Transcribing..."}
              {processingStep === 'translating' && "Translating..."}
              {processingStep === 'synthesizing' && "Generating audio..."}
            </p>
          </div>
        )}
      </CardFooter>
    </Card>
  );
}
