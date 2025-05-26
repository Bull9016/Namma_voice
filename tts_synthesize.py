import sys
import base64
from google.cloud import texttospeech
import os
import logging

# Set up logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# Set the environment variable for Google credentials
os.environ["GOOGLE_APPLICATION_CREDENTIALS"] = "learned-surge-453718-n6-72ce21a897a9.json"

def text_to_speech(text, lang='en-US', output_file='output.mp3'):
    try:
        client = texttospeech.TextToSpeechClient()

        synthesis_input = texttospeech.SynthesisInput(text=text)

        # Select the language and SSML voice gender
        voice = texttospeech.VoiceSelectionParams(
            language_code=lang,
            ssml_gender=texttospeech.SsmlVoiceGender.NEUTRAL
        )

        # Select the type of audio file you want returned
        audio_config = texttospeech.AudioConfig(
            audio_encoding=texttospeech.AudioEncoding.MP3
        )

        response = client.synthesize_speech(
            input=synthesis_input,
            voice=voice,
            audio_config=audio_config
        )

        # Write the response to the output file.
        with open(output_file, "wb") as out:
            out.write(response.audio_content)
            logger.info(f'Audio content written to file "{output_file}"')

    except Exception as e:
        logger.error(f"Error during text to speech synthesis: {e}")
        raise

def text_to_base64_audio(text, lang='en-US'):
    try:
        client = texttospeech.TextToSpeechClient()

        synthesis_input = texttospeech.SynthesisInput(text=text)

        voice = texttospeech.VoiceSelectionParams(
            language_code=lang,
            ssml_gender=texttospeech.SsmlVoiceGender.NEUTRAL
        )

        audio_config = texttospeech.AudioConfig(
            audio_encoding=texttospeech.AudioEncoding.MP3
        )

        response = client.synthesize_speech(
            input=synthesis_input,
            voice=voice,
            audio_config=audio_config
        )

        audio_content = response.audio_content
        encoded_string = base64.b64encode(audio_content).decode('utf-8')
        print(f"data:audio/mp3;base64,{encoded_string}")

    except Exception as e:
        logger.error(f"Error during base64 audio synthesis: {e}")
        raise

if __name__ == "__main__":
    if len(sys.argv) < 2:
        print("Usage: python tts_synthesize.py 'Text to synthesize' [lang] [--base64]")
        sys.exit(1)
    text = sys.argv[1]
    lang = sys.argv[2] if len(sys.argv) > 2 else 'en-US'
    base64_flag = '--base64' in sys.argv

    if base64_flag:
        text_to_base64_audio(text, lang)
    else:
        text_to_speech(text, lang)
