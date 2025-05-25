from flask import Flask, request, jsonify
from flask_cors import CORS
from gtts import gTTS
import base64
import io
import traceback
import os

app = Flask(__name__)
CORS(app)

@app.route('/synthesize', methods=['POST'])
def synthesize():
    try:
        data = request.get_json()
        text = data.get('text')
        lang = data.get('lang', 'en')
        response_type = data.get('response_type', 'base64')

        if not text:
            return jsonify({'error': 'Text parameter is required'}), 400

        tts = gTTS(text=text, lang=lang)
        audio_fp = io.BytesIO()
        tts.write_to_fp(audio_fp)
        audio_fp.seek(0)

        if response_type == 'base64':
            audio_base64 = base64.b64encode(audio_fp.read()).decode('utf-8')
            return jsonify({'audio_base64': f'data:audio/mp3;base64,{audio_base64}'})
        else:
            return jsonify({'error': 'Unsupported response_type'}), 400

    except Exception as e:
        traceback.print_exc()
        return jsonify({'error': 'Internal server error', 'message': str(e)}), 500

if __name__ == '__main__':
    port = int(os.environ.get('PORT', 5000))
    app.run(host='0.0.0.0', port=port, debug=True)
