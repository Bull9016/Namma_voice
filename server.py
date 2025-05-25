from flask import Flask, request, jsonify
from flask_cors import CORS
from gtts import gTTS
import base64
import io
import traceback
import os
import logging
import time
import threading

app = Flask(__name__)
CORS(app)

logging.basicConfig(level=logging.DEBUG)

# Simple in-memory cache for synthesized audio
synthesis_cache = {}

# Rate limiting parameters
MAX_REQUESTS_PER_MINUTE = 10
request_timestamps = []
lock = threading.Lock()

def is_rate_limited():
    with lock:
        current_time = time.time()
        # Remove timestamps older than 60 seconds
        while request_timestamps and request_timestamps[0] <= current_time - 60:
            request_timestamps.pop(0)
        if len(request_timestamps) >= MAX_REQUESTS_PER_MINUTE:
            return True
        request_timestamps.append(current_time)
        return False

def synthesize_text_to_speech(text, lang):
    cache_key = f"{lang}:{text}"
    if cache_key in synthesis_cache:
        app.logger.debug("Cache hit for synthesis")
        return synthesis_cache[cache_key]

    max_retries = 5
    backoff_factor = 3
    delay = 2  # initial delay in seconds

    for attempt in range(max_retries):
        if is_rate_limited():
            app.logger.warning("Rate limit exceeded, delaying synthesis")
            time.sleep(delay)
            delay *= backoff_factor
            continue
        try:
            tts = gTTS(text=text, lang=lang)
            audio_fp = io.BytesIO()
            tts.write_to_fp(audio_fp)
            audio_fp.seek(0)
            audio_base64 = base64.b64encode(audio_fp.read()).decode('utf-8')
            synthesis_cache[cache_key] = audio_base64
            app.logger.debug("Successfully synthesized audio to base64")
            return audio_base64
        except Exception as e:
            app.logger.error(f"Synthesis attempt {attempt+1} failed: {e}", exc_info=True)
            if attempt < max_retries - 1:
                time.sleep(delay)
                delay *= backoff_factor
            else:
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
            return jsonify({'audio_base64': f'data:audio/mp3;base64,{audio_base64}'})
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
