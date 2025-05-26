interface SynthesizeEmotionalSpeechParams {
  text: string;
  language: string;
  emotion: string; // Currently unused, but can be extended for emotion-based synthesis
}

interface SynthesizeEmotionalSpeechResult {
  audioDataUri: string;
}

export async function synthesizeEmotionalSpeech(params: SynthesizeEmotionalSpeechParams): Promise<SynthesizeEmotionalSpeechResult> {
  const { text, language } = params;

  try {
    const response = await fetch('/api/synthesize', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ text, lang: language }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`API error: ${response.status} ${response.statusText} - ${errorText}`);
    }

    const data = await response.json();

    if (!data.audioDataUri) {
      throw new Error('No audioDataUri received from API');
    }

    return {
      audioDataUri: data.audioDataUri,
    };
  } catch (error) {
    console.error('Error synthesizing speech:', error);
    throw error;
  }
}
