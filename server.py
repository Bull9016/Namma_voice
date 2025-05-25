from flask import Flask, request, jsonify
from flask_cors import CORS
import base64
import io
import os
import logging
import torch
from TTS.api import TTS

app = Flask(__name__)
CORS(app)

logging.basicConfig(level=logging.DEBUG)

# Initialize Coqui TTS model
tts_model_name = "tts_models/en/ljspeech/glow-tts"  # lighter model
tts = TTS(tts_model_name)

# Simple in-memory cache for synthesized audio
synthesis_cache = {}

def synthesize_text_to_speech(text, lang):
    cache_key = f"{lang}:{text}"
    if cache_key in synthesis_cache:
        app.logger.debug("Cache hit for synthesis")
        return synthesis_cache[cache_key]

    try:
        wav = tts.tts(text)
        sample_rate = tts.synthesizer.output_sample_rate

        import soundfile as sf
        audio_buffer = io.BytesIO()
        sf.write(audio_buffer, wav, sample_rate, format='WAV')
        audio_bytes = audio_buffer.getvalue()

        audio_base64 = base64.b64encode(audio_bytes).decode('utf-8')
        synthesis_cache[cache_key] = audio_base64

        app.logger.debug("Successfully synthesized audio to base64")
        return audio_base64
    except Exception as e:
        app.logger.error(f"Synthesis failed: {e}", exc_info=True)
        raise

@app.route('/synthesize', methods=['POST'])
def synthesize():
    try:
        data = request.get_json()
        app.logger.debug(f"Received data: {data}")
        text = data.get('text')
        lang = data.get('lang', 'en')
        response_type = data.get('response_type', 'base64')

        if not text:
            app.logger.error("Missing 'text' parameter in request")
            return jsonify({'error': 'Text parameter is required'}), 400

        audio_base64 = synthesize_text_to_speech(text, lang)

        if response_type == 'base64':
            return jsonify({'audio_base64': f'data:audio/wav;base64,{audio_base64}'})
        else:
            app.logger.error(f"Unsupported response_type: {response_type}")
            return jsonify({'error': 'Unsupported response_type'}), 400

    except Exception as e:
        app.logger.error("Exception during synthesis", exc_info=True)
        return jsonify({'error': 'Internal server error', 'message': str(e)}), 500

if __name__ == '__main__':
    port = int(os.environ.get('PORT', 5000))
    app.logger.info(f"Starting server on port {port}")
    app.run(host='0.0.0.0', port=port, debug=True)
