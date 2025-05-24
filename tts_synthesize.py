import sys
import base64
from gtts import gTTS

def text_to_speech(text, lang='en', output_file='output.mp3'):
    tts = gTTS(text=text, lang=lang)
    tts.save(output_file)
    print(f"Audio saved to {output_file}")

def text_to_base64_audio(text, lang='en'):
    tts = gTTS(text=text, lang=lang)
    tts.save("temp.mp3")
    with open("temp.mp3", "rb") as audio_file:
        encoded_string = base64.b64encode(audio_file.read()).decode('utf-8')
    print(f"data:audio/mp3;base64,{encoded_string}")

if __name__ == "__main__":
    if len(sys.argv) < 2:
        print("Usage: python tts_synthesize.py 'Text to synthesize' [lang] [--base64]")
        sys.exit(1)
    text = sys.argv[1]
    lang = sys.argv[2] if len(sys.argv) > 2 else 'en'
    base64_flag = '--base64' in sys.argv

    if base64_flag:
        text_to_base64_audio(text, lang)
    else:
        text_to_speech(text, lang)
