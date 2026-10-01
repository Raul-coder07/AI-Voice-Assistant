import io
import os
from dotenv import load_dotenv
from google import genai
from google.genai import types
from gtts import gTTS
from faster_whisper import WhisperModel

# Cargar variables de entorno desde el archivo .env
load_dotenv()

# Inicializar cliente oficial de Gemini API
client = genai.Client(api_key=os.getenv("GEMINI_API_KEY"))

# Cargar modelo ligero local de Whisper (100% gratis en CPU)
whisper_model = WhisperModel("tiny", device="cpu", compute_type="int8")


def speech_to_text(audio_binary):
    """
    Transcribe audio usando faster-whisper localmente.
    """
    try:
        temp_audio_path = "temp_input.wav"
        with open(temp_audio_path, "wb") as f:
            f.write(audio_binary)

        segments, _ = whisper_model.transcribe(temp_audio_path, beam_size=5)
        text = " ".join([segment.text for segment in segments]).strip()

        if os.path.exists(temp_audio_path):
            os.remove(temp_audio_path)

        print("Texto reconocido:", text)
        return text if text else "null"
    except Exception as e:
        print("Error en Speech-to-Text:", e)
        return "null"


def openai_process_message(user_message):
    """
    Procesa la consulta enviándola a Gemini API.
    Incluye lista de modelos de respaldo por si alguno presenta alta demanda.
    """
    sys_instruction = (
        "Act like a personal assistant. You can respond to questions, "
        "translate sentences, summarize news, and give recommendations. "
        "Keep responses concise - 2 to 3 sentences maximum."
    )

    models_to_try = [
        "gemini-3.5-flash",
        "gemini-2.0-flash",
        "gemini-1.5-flash"
    ]

    for model_name in models_to_try:
        try:
            response = client.models.generate_content(
                model=model_name,
                contents=user_message,
                config=types.GenerateContentConfig(
                    system_instruction=sys_instruction,
                    max_output_tokens=800,
                ),
            )
            if response and response.text:
                print(f"Respuesta generada exitosamente con: {model_name}")
                return response.text
        except Exception as e:
            print(f"El modelo {model_name} no respondió ({e}). Intentando con el siguiente...")
            continue

    return "I'm sorry, the AI service is currently unavailable. Please try again in a moment."


def text_to_speech(text, voice="com"):
    """
    Sintetiza audio con gTTS aplicando el acento seleccionado.
    """
    try:
        tld = voice if voice in ['com', 'co.uk', 'com.au', 'co.in'] else 'com'
        tts = gTTS(text=text, lang='en', tld=tld)
        
        fp = io.BytesIO()
        tts.write_to_fp(fp)
        fp.seek(0)
        return fp.read()
    except Exception as e:
        print("Error en Text-to-Speech:", e)
        raise e