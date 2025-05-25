from flask import Flask, request, jsonify
from flask_cors import CORS
import base64
import io
import os
import logging
import pyttsx3
import tempfile

app = Flask(__name__)
CORS(app)

logging.basicConfig(level=logging.DEBUG)

# Initialize pyttsx3 engine
engine = pyttsx3.init()
engine.setProperty('rate', 150)  # Set speech rate

# Simple in-memory cache for synthesized audio
synthesis_cache = {}

def synthesize_text_to_speech(text, lang):
    cache_key = f"{lang}:{text}"
    if cache_key in synthesis_cache:
        app.logger.debug("Cache hit for synthesis")
        return synthesis_cache[cache_key]

    try:
        # Use pyttsx3 to synthesize speech to a temporary WAV file
        with tempfile.NamedTemporaryFile(delete=False, suffix='.wav') as tmpfile:
            temp_filename = tmpfile.name

        engine.save_to_file(text, temp_filename)
        engine.runAndWait()

        # Read the WAV file and encode to base64
        with open(temp_filename, 'rb') as f:
            audio_data = f.read()
        audio_base64 = base64.b64encode(audio_data).decode('utf-8')

        synthesis_cache[cache_key] = audio_base64

        # Clean up temp file
        os.remove(temp_filename)

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
