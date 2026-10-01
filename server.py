import base64
import json
import os
from flask import Flask, render_template, request
from flask_cors import CORS
from worker import speech_to_text, text_to_speech, openai_process_message

app = Flask(__name__)
cors = CORS(app, resources={r"/*": {"origins": "*"}})


@app.route('/', methods=['GET'])
def index():
    return render_template('index.html')


@app.route('/speech-to-text', methods=['POST'])
def speech_to_text_route():
    audio_binary = request.data
    text = speech_to_text(audio_binary)
    return app.response_class(
        response=json.dumps({'text': text}),
        status=200,
        mimetype='application/json'
    )


@app.route('/process-message', methods=['POST'])
def process_message_route():
    user_message = request.json.get('userMessage', '')
    voice = request.json.get('voice', 'alloy')

    openai_response_text = openai_process_message(user_message)
    openai_response_text = os.linesep.join([s for s in openai_response_text.splitlines() if s])

    openai_response_speech = text_to_speech(openai_response_text, voice)
    openai_response_speech_b64 = base64.b64encode(openai_response_speech).decode('utf-8')

    return app.response_class(
        response=json.dumps({
            "openaiResponseText": openai_response_text,
            "openaiResponseSpeech": openai_response_speech_b64
        }),
        status=200,
        mimetype='application/json'
    )


if __name__ == "__main__":
    app.run(port=8000, host='0.0.0.0')