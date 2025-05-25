from flask import Flask, request, jsonify
from flask_cors import CORS
import base64
import logging
import tts_synthesize
import io
import sys

app = Flask(__name__)
CORS(app)

logging.basicConfig(level=logging.DEBUG)

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

        # Capture the printed base64 output from text_to_base64_audio
        old_stdout = sys.stdout
        sys.stdout = mystdout = io.StringIO()

        tts_synthesize.text_to_base64_audio(text, lang)

        sys.stdout = old_stdout
        output = mystdout.getvalue().strip()

        if output.startswith("data:audio/mp3;base64,"):
            audio_base64 = output
        else:
            audio_base64 = f"data:audio/mp3;base64,{output}"

        if response_type == 'base64':
            return jsonify({'audio_base64': audio_base64})
        else:
            app.logger.error(f"Unsupported response_type: {response_type}")
            return jsonify({'error': 'Unsupported response_type'}), 400

    except Exception as e:
        app.logger.error("Exception during synthesis", exc_info=True)
        return jsonify({'error': 'Internal server error', 'message': str(e)}), 500

if __name__ == '__main__':
    import os
    port = int(os.environ.get('PORT', 5000))
    app.logger.info(f"Starting server on port {port}")
    app.run(host='0.0.0.0', port=port, debug=True)
