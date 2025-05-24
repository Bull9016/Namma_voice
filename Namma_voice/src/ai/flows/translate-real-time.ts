'use server';

/**
 * @fileOverview A real-time translation AI agent that translates between Kannada, Hindi, and English.
 *
 * - translateRealTime - A function that handles the real-time translation process.
 * - TranslateRealTimeInput - The input type for the translateRealTime function.
 * - TranslateRealTimeOutput - The return type for the translateRealTime function.
 */

import {ai} from '@/ai/genkit';
import {z} from 'genkit';

const TranslateRealTimeInputSchema = z.object({
  text: z.string().describe('The text to translate.'),
  sourceLanguage: z
    .enum(['kn', 'hi', 'en'])
    .describe('The source language of the text (kn=Kannada, hi=Hindi, en=English).'),
  targetLanguage: z
    .enum(['kn', 'hi', 'en'])
    .describe('The target language for the translation (kn=Kannada, hi=Hindi, en=English).'),
});
export type TranslateRealTimeInput = z.infer<typeof TranslateRealTimeInputSchema>;

const TranslateRealTimeOutputSchema = z.object({
  translation: z.string().describe('The translated text.'),
});
export type TranslateRealTimeOutput = z.infer<typeof TranslateRealTimeOutputSchema>;

export async function translateRealTime(input: TranslateRealTimeInput): Promise<TranslateRealTimeOutput> {
  return translateRealTimeFlow(input);
}

const prompt = ai.definePrompt({
  name: 'translateRealTimePrompt',
  input: {schema: TranslateRealTimeInputSchema},
  output: {schema: TranslateRealTimeOutputSchema},
  prompt: `You are a real-time translation expert. Translate the given text from the source language to the target language.

Source Language: {{{sourceLanguage}}}
Target Language: {{{targetLanguage}}}
Text to Translate: {{{text}}}

Translation:`, // Keep translation simple and direct
});

const translateRealTimeFlow = ai.defineFlow(
  {
    name: 'translateRealTimeFlow',
    inputSchema: TranslateRealTimeInputSchema,
    outputSchema: TranslateRealTimeOutputSchema,
  },
  async input => {
    const {output} = await prompt(input);
    return output!;
  }
);
