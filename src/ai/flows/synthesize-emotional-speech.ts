import axios from 'axios';

interface SynthesizeEmotionalSpeechParams {
  text: string;
  language: string;
  emotion: string; // Currently unused, but can be extended for emotion-based synthesis
}

interface SynthesizeEmotionalSpeechResult {
  audioDataUri: string;
}

const BACKEND_URL = process.env.NODE_ENV === 'development' ? 'http://localhost:10000' : 'https://nammavoicebackend.onrender.com';

export async function synthesizeEmotionalSpeech(params: SynthesizeEmotionalSpeechParams): Promise<SynthesizeEmotionalSpeechResult> {
  const { text, language } = params;

  try {
    const response = await axios.post(`${BACKEND_URL}/synthesize`, {
      text,
      lang: language,
      response_type: 'base64',
    });

    if (response.status !== 200) {
      throw new Error(`Synthesis API returned status ${response.status}`);
    }

    const data = response.data;
    if (!data.audio_base64) {
      throw new Error('Synthesis API response missing audio_base64');
    }

    return {
      audioDataUri: data.audio_base64,
    };
  } catch (error) {
    console.error('Error calling synthesis API:', error);
    throw error;
  }
}
