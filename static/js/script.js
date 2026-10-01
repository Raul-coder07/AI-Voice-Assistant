let mediaRecorder;
let audioChunks = [];

const themeToggle = document.getElementById('theme-toggle');
const voiceSelect = document.getElementById('voice-select');
const chatContainer = document.getElementById('chat-container');
const userInput = document.getElementById('user-input');
const micBtn = document.getElementById('mic-btn');

// Alternar Modo Claro / Oscuro
themeToggle.addEventListener('change', () => {
    if (themeToggle.checked) {
        document.body.classList.add('dark-mode');
        document.body.classList.remove('light-mode');
    } else {
        document.body.classList.add('light-mode');
        document.body.classList.remove('dark-mode');
    }
});

// Enviar mensaje con la tecla Enter
userInput.addEventListener('keypress', (e) => {
    if (e.key === 'Enter') {
        processTextMessage();
    }
});

async function processTextMessage() {
    const text = userInput.value.trim();
    if (!text) return;

    appendMessage(text, 'user-msg');
    userInput.value = '';

    await sendToProcessMessage(text);
}

// Grabación de Micrófono
micBtn.addEventListener('click', async () => {
    if (!mediaRecorder || mediaRecorder.state === 'inactive') {
        try {
            const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
            mediaRecorder = new MediaRecorder(stream);
            audioChunks = [];

            mediaRecorder.ondataavailable = (event) => {
                audioChunks.push(event.data);
            };

            mediaRecorder.onstop = async () => {
                const audioBlob = new Blob(audioChunks, { type: 'audio/wav' });
                await sendToSpeechToText(audioBlob);
            };

            mediaRecorder.start();
            micBtn.classList.add('recording');
        } catch (err) {
            alert('Acceso al micrófono denegado o no soportado.');
        }
    } else if (mediaRecorder.state === 'recording') {
        mediaRecorder.stop();
        micBtn.classList.remove('recording');
    }
});

// Enviar binario de audio al endpoint Speech-to-Text
async function sendToSpeechToText(audioBlob) {
    const tempId = appendMessage('Transcribing speech...', 'user-msg');
    try {
        const response = await fetch('/speech-to-text', {
            method: 'POST',
            headers: { 'Content-Type': 'audio/wav' },
            body: audioBlob
        });
        const data = await response.json();
        
        document.getElementById(tempId)?.remove();

        if (data.text && data.text !== 'null') {
            appendMessage(data.text, 'user-msg');
            await sendToProcessMessage(data.text);
        } else {
            alert('No se pudo reconocer la voz.');
        }
    } catch (error) {
        console.error(error);
        alert('Error al procesar audio.');
    }
}

// Enviar texto al endpoint Process-Message
async function sendToProcessMessage(text) {
    const tempId = appendMessage('Thinking...', 'assistant-msg');
    const voice = voiceSelect.value;

    try {
        const response = await fetch('/process-message', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ userMessage: text, voice: voice })
        });
        const data = await response.json();

        document.getElementById(tempId)?.remove();

        appendAssistantMessage(data.openaiResponseText, data.openaiResponseSpeech);
    } catch (error) {
        console.error(error);
        alert('Error al comunicarse con el asistente.');
    }
}

function appendMessage(text, className) {
    const msgId = 'msg-' + Date.now();
    const msgDiv = document.createElement('div');
    msgDiv.id = msgId;
    msgDiv.className = `message ${className}`;
    msgDiv.textContent = text;
    chatContainer.appendChild(msgDiv);
    chatContainer.scrollTop = chatContainer.scrollHeight;
    return msgId;
}

function appendAssistantMessage(text, base64Audio) {
    const msgDiv = document.createElement('div');
    msgDiv.className = 'message assistant-msg';

    const textSpan = document.createElement('span');
    textSpan.textContent = text;
    msgDiv.appendChild(textSpan);

    if (base64Audio) {
        const audioBtn = document.createElement('button');
        audioBtn.className = 'audio-btn';
        audioBtn.innerHTML = '🔊';

        const audio = new Audio(`data:audio/mp3;base64,${base64Audio}`);
        audioBtn.onclick = () => audio.play();

        msgDiv.insertBefore(audioBtn, textSpan);
        audio.play().catch(e => console.log('Autoplay bloqueado por el navegador:', e));
    }

    chatContainer.appendChild(msgDiv);
    chatContainer.scrollTop = chatContainer.scrollHeight;
}