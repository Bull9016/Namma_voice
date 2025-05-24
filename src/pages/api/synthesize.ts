import type { NextApiRequest, NextApiResponse } from 'next';
import { execFile } from 'child_process';
import path from 'path';
import fs from 'fs';

export default function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    res.status(405).json({ error: 'Method not allowed' });
    return;
  }

  const { text, lang } = req.body;
  if (!text || typeof text !== 'string') {
    res.status(400).json({ error: 'Invalid text parameter' });
    return;
  }
  const language = typeof lang === 'string' ? lang : 'en';

  const scriptPath = path.resolve(process.cwd(), 'tts_synthesize.py');
  const outputFile = path.resolve(process.cwd(), 'output.mp3');

  execFile('python', [scriptPath, text, language], (error, stdout, stderr) => {
    if (error) {
      console.error('Error executing Python script:', error);
      res.status(500).json({ error: 'Failed to synthesize speech' });
      return;
    }

    fs.readFile(outputFile, (readErr, data) => {
      if (readErr) {
        console.error('Error reading audio file:', readErr);
        res.status(500).json({ error: 'Failed to read audio file' });
        return;
      }

      const base64Audio = data.toString('base64');
      const audioDataUri = `data:audio/mp3;base64,${base64Audio}`;
      res.status(200).json({ audioDataUri });
    });
  });
}
