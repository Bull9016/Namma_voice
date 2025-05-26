import type { NextApiRequest, NextApiResponse } from 'next';
import { TextToSpeechClient } from '@google-cloud/text-to-speech';
import path from 'path';

const client = new TextToSpeechClient();

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    res.status(405).json({ error: 'Method not allowed' });
    return;
  }

  const { text, lang } = req.body;
  if (!text || typeof text !== 'string') {
    res.status(400).json({ error: 'Invalid text parameter' });
    return;
  }
  const language = typeof lang === 'string' ? lang : 'en-US';

  try {
    const [response] = await client.synthesizeSpeech({
      input: { text },
      voice: {
        languageCode: language,
        ssmlGender: 'NEUTRAL',
      },
      audioConfig: {
        audioEncoding: 'MP3',
      },
    });

    if (!response.audioContent) {
      res.status(500).json({ error: 'No audio content received from TTS service' });
      return;
    }

    const audioBase64 = response.audioContent.toString('base64');
    res.status(200).json({ audio_base64: `data:audio/mp3;base64,${audioBase64}` });
  } catch (error) {
    console.error('Error synthesizing speech:', error);
    res.status(500).json({ error: 'Failed to synthesize speech' });
  }
}
