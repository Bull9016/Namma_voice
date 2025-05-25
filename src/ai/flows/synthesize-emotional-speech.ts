'use server';
import { z } from 'genkit';

const SynthesizeEmotionalSpeechInputSchema = z.object({
  text: z.string().describe('The text to be synthesized into speech.'),
  language: z.enum(['en', 'kn', 'hi']).describe('The language of the text (en: English, kn: Kannada, hi: Hindi).'),
  emotion: z.string().describe('The desired emotion to be conveyed in the speech synthesis.'),
});
export type SynthesizeEmotionalSpeechInput = z.infer<typeof SynthesizeEmotionalSpeechInputSchema>;

const SynthesizeEmotionalSpeechOutputSchema = z.object({
  audioDataUri: z.string().describe(
    'The audio data URI of the synthesized speech, including MIME type and Base64 encoding (e.g., data:audio/wav;base64,...).'
  ),
});
export type SynthesizeEmotionalSpeechOutput = z.infer<typeof SynthesizeEmotionalSpeechOutputSchema>;

const BACKEND_URL = process.env.BACKEND_URL || 'http://localhost:5000';

export async function synthesizeEmotionalSpeech(input: SynthesizeEmotionalSpeechInput): Promise<SynthesizeEmotionalSpeechOutput> {
  const { text, language } = input;

  const response = await fetch(`${BACKEND_URL}/synthesize`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      text,
      lang: language,
      response_type: 'base64'
    })
  });

  if (!response.ok) {
    throw new Error(`Backend synthesis request failed with status ${response.status}`);
  }

  const data = await response.json();

  if (!data.audio_base64) {
    throw new Error('Backend synthesis response missing audio_base64');
  }

  return {
    audioDataUri: data.audio_base64
  };
}
