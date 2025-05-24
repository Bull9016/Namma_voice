// 'use server';
/**
 * @fileOverview A speech transcription AI agent.
 *
 * - transcribeSpeech - A function that handles the speech transcription process and language detection.
 * - TranscribeSpeechInput - The input type for the transcribeSpeech function.
 * - TranscribeSpeechOutput - The return type for the transcribeSpeech function.
 */

'use server';

import {ai} from '@/ai/genkit';
import {z} from 'genkit';

const TranscribeSpeechInputSchema = z.object({
  audioDataUri: z
    .string()
    .describe(
      "The audio data as a data URI that must include a MIME type and use Base64 encoding. Expected format: 'data:<mimetype>;base64,<encoded_data>'"
    ),
});
export type TranscribeSpeechInput = z.infer<typeof TranscribeSpeechInputSchema>;

const TranscribeSpeechOutputSchema = z.object({
  transcription: z.string().describe('The transcribed text of the audio.'),
  detectedLanguage: z.enum(['en', 'kn', 'hi', 'unknown']).describe('The detected language of the audio from the set [en, kn, hi]. Use "unknown" if the language is not one of these or if detection is uncertain.'),
});
export type TranscribeSpeechOutput = z.infer<typeof TranscribeSpeechOutputSchema>;

export async function transcribeSpeech(input: TranscribeSpeechInput): Promise<TranscribeSpeechOutput> {
  return transcribeSpeechFlow(input);
}

const prompt = ai.definePrompt({
  name: 'transcribeSpeechPrompt',
  input: {schema: TranscribeSpeechInputSchema},
  output: {schema: TranscribeSpeechOutputSchema},
  prompt: `You are a highly accurate speech-to-text transcription service.
Your task is to:
1. Transcribe the following audio into text.
2. Detect the language of the spoken audio. The language MUST be one of English (en), Kannada (kn), or Hindi (hi).
3. If the detected language is clearly one of these, provide its corresponding code (en, kn, or hi) in the 'detectedLanguage' field.
4. If the audio is not clearly in English, Kannada, or Hindi, or if you are uncertain about the language, set 'detectedLanguage' to "unknown".

Audio: {{media url=audioDataUri}}`,
});

const transcribeSpeechFlow = ai.defineFlow(
  {
    name: 'transcribeSpeechFlow',
    inputSchema: TranscribeSpeechInputSchema,
    outputSchema: TranscribeSpeechOutputSchema,
  },
  async input => {
    const {output} = await prompt(input);
    return output!;
  }
);
