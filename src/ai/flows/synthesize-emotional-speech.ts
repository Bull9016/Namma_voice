'use server';
import { z } from 'genkit';
import { execFile } from 'child_process';
import fs from 'fs';
import path from 'path';

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

export async function synthesizeEmotionalSpeech(input: SynthesizeEmotionalSpeechInput): Promise<SynthesizeEmotionalSpeechOutput> {
  const { text, language } = input;

  const scriptPath = path.resolve(process.cwd(), 'tts_synthesize.py');
  const outputFile = path.resolve(process.cwd(), 'output.mp3');

  return new Promise((resolve, reject) => {
    execFile('python', [scriptPath, text, language], (error, stdout, stderr) => {
      if (error) {
        console.error('Error executing Python script:', error);
        reject(new Error('Failed to synthesize speech'));
        return;
      }

      fs.readFile(outputFile, (readErr, data) => {
        if (readErr) {
          console.error('Error reading audio file:', readErr);
          reject(new Error('Failed to read audio file'));
          return;
        }

        const base64Audio = data.toString('base64');
        const audioDataUri = `data:audio/mp3;base64,${base64Audio}`;
        resolve({ audioDataUri });
      });
    });
  });
}
