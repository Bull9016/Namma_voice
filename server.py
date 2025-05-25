from flask import Flask, request, jsonify, send_file
import io
import base64
from gtts import gTTS
from flask_cors import CORS
import logging
import traceback

app = Flask(__name__)
app.debug = True  # Enable debug mode for detailed error logs
CORS(app)  # Enable CORS for all routes

# Setup logging to file
logging.basicConfig(filename='server_error.log', level=logging.ERROR, format='%(asctime)s %(levelname)s %(message)s')

def text_to_speech_bytes(text, lang='en'):
    tts = gTTS(text=text, lang=lang)
    mp3_fp = io.BytesIO()
    tts.write_to_fp(mp3_fp)
    mp3_fp.seek(0)
    return mp3_fp

@app.route('/synthesize', methods=['POST'])
def synthesize():
    try:
        data = request.json
        if not data or 'text' not in data:
            return jsonify({'error': 'Missing "text" in request body'}), 400
        text = data['text']
        lang = data.get('lang', 'en')
        response_type = data.get('response_type', 'file')  # 'file' or 'base64'

        mp3_fp = text_to_speech_bytes(text, lang)

        if response_type == 'base64':
            encoded_string = base64.b64encode(mp3_fp.read()).decode('utf-8')
            return jsonify({'audio_base64': f'data:audio/mp3;base64,{encoded_string}'})
        else:
            return send_file(mp3_fp, mimetype='audio/mpeg', as_attachment=True, download_name='output.mp3')
    except Exception as e:
        error_message = str(e)
        traceback_str = traceback.format_exc()
        app.logger.error(f"Error in /synthesize: {error_message}\n{traceback_str}")
        response = jsonify({'error': error_message})
        response.status_code = 500
        response.headers['x-error-digest'] = error_message
        return response

import os

if __name__ == '__main__':
    port = int(os.environ.get('PORT', 5000))
    app.run(host='0.0.0.0', port=port, debug=True)
