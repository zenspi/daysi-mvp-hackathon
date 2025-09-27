class HealthcareVoiceAssistant {
    constructor() {
        this.ws = null;
        this.mediaRecorder = null;
        this.audioContext = null;
        this.isRecording = false;
        this.currentLanguage = 'en';
        this.userLocation = null;
        this.connectionId = null;
        this.audioChunks = [];
        this.audioQueue = [];
        this.isPlayingAudio = false;
        this.openaiReady = false;
        
        // UI Elements
        this.startBtn = document.getElementById('startBtn');
        this.stopBtn = document.getElementById('stopBtn');
        this.langBtn = document.getElementById('langBtn');
        this.locationBtn = document.getElementById('locationBtn');
        this.reconnectBtn = document.getElementById('reconnectBtn');
        this.textInput = document.getElementById('textInput');
        this.sendBtn = document.getElementById('sendBtn');
        this.transcript = document.getElementById('transcript');
        this.messages = document.getElementById('messages');
        this.status = document.getElementById('status');
        this.toast = document.getElementById('toast');
        
        this.bindEvents();
        this.initializeAudio();
    }
    
    bindEvents() {
        this.startBtn.addEventListener('click', () => this.startVoiceSession());
        this.stopBtn.addEventListener('click', () => this.stopVoiceSession());
        this.langBtn.addEventListener('click', () => this.toggleLanguage());
        this.locationBtn.addEventListener('click', () => this.requestLocation());
        this.reconnectBtn.addEventListener('click', () => this.reconnect());
        this.sendBtn.addEventListener('click', () => this.sendTextMessage());
        
        this.textInput.addEventListener('keypress', (e) => {
            if (e.key === 'Enter') {
                this.sendTextMessage();
            }
        });

        // WebSocket connection now working - focus on voice functionality
    }
    
    async initializeAudio() {
        try {
            this.audioContext = new (window.AudioContext || window.webkitAudioContext)();
        } catch (error) {
            console.error('Failed to initialize audio context:', error);
            this.showToast('Audio not supported in this browser', 'error');
        }
    }
    
    async startVoiceSession() {
        try {
            console.log('Starting voice session...');
            this.updateStatus('connecting', '🟡 Connecting to voice services...');
            
            // Connect WebSocket first
            console.log('Step 1: Connecting WebSocket...');
            await this.connectWebSocket();
            console.log('Step 1: WebSocket connected successfully');
            
            // Request microphone permission
            console.log('Step 2: Requesting microphone access...');
            const stream = await navigator.mediaDevices.getUserMedia({ 
                audio: {
                    echoCancellation: true,
                    noiseSuppression: true,
                    autoGainControl: true,
                    sampleRate: 16000
                } 
            });
            console.log('Step 2: Microphone access granted');
            
            // Start recording
            console.log('Step 3: Starting audio recording...');
            this.startRecording(stream);
            console.log('Step 3: Audio recording started');
            
            this.startBtn.disabled = true;
            this.stopBtn.disabled = false;
            this.updateStatus('connected', '🟢 Voice session active - Start speaking!');
            this.showAudioVisualizer();
            
            console.log('Voice session fully active!');
            
        } catch (error) {
            console.error('Voice session failed:', error);
            this.showToast('Voice not available: ' + error.message, 'error');
            this.updateStatus('disconnected', '💬 Text mode - Type your message below');
        }
    }
    
    async connectWebSocket() {
        return new Promise((resolve, reject) => {
            const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
            const wsUrl = `${protocol}//${window.location.host}/realtime`;
            
            this.ws = new WebSocket(wsUrl);
            this.openaiReady = false; // Track OpenAI connection state
            
            this.ws.onopen = () => {
                console.log('WebSocket connected, waiting for OpenAI ready...');
                console.log('WebSocket readyState:', this.ws.readyState);
                // Don't resolve yet - wait for connection.ready message
            };
            
            this.ws.onmessage = (event) => {
                this.handleWebSocketMessage(event, resolve);
            };
            
            this.ws.onclose = (event) => {
                console.log('WebSocket disconnected:', event.code, event.reason);
                console.log('Close event details:', event);
                this.openaiReady = false;
                this.handleDisconnection();
            };
            
            this.ws.onerror = (error) => {
                console.error('WebSocket error:', error);
                this.openaiReady = false;
                reject(new Error('Voice features unavailable'));
            };
            
            // Timeout after 5 seconds for faster fallback
            setTimeout(() => {
                if (this.ws.readyState !== WebSocket.OPEN || !this.openaiReady) {
                    this.ws.close();
                    reject(new Error('Voice features unavailable'));
                }
            }, 5000);
        });
    }
    
    startRecording(stream) {
        try {
            // Try opus first, fallback to webm
            let mimeType = 'audio/webm;codecs=opus';
            if (!MediaRecorder.isTypeSupported(mimeType)) {
                mimeType = 'audio/webm';
            }
            
            this.mediaRecorder = new MediaRecorder(stream, {
                mimeType: mimeType,
                audioBitsPerSecond: 16000
            });
        } catch (error) {
            // Fallback to default
            this.mediaRecorder = new MediaRecorder(stream);
        }
        
        this.mediaRecorder.ondataavailable = (event) => {
            if (event.data.size > 0 && this.ws && this.ws.readyState === WebSocket.OPEN) {
                // Convert to PCM16 and send as binary
                this.convertAndSendAudio(event.data);
            }
        };
        
        this.mediaRecorder.onstart = () => {
            this.isRecording = true;
            console.log('Recording started');
        };
        
        this.mediaRecorder.onstop = () => {
            this.isRecording = false;
            console.log('Recording stopped');
            // Stop all tracks to release microphone
            stream.getTracks().forEach(track => track.stop());
        };
        
        // Start recording with small chunks for real-time streaming
        this.mediaRecorder.start(100); // 100ms chunks for better responsiveness
    }
    
    async convertAndSendAudio(audioBlob) {
        try {
            const arrayBuffer = await audioBlob.arrayBuffer();
            const audioBuffer = await this.audioContext.decodeAudioData(arrayBuffer.slice());
            
            // Resample to 16kHz if needed and convert to PCM16
            const pcmData = this.convertToPCM16(audioBuffer);
            
            // Send as binary data
            if (this.ws && this.ws.readyState === WebSocket.OPEN) {
                this.ws.send(pcmData);
            }
        } catch (error) {
            console.error('Audio conversion error:', error);
            // Don't send raw blob as fallback - it won't work with OpenAI Realtime
            // Instead log the error and continue
        }
    }
    
    convertToPCM16(audioBuffer) {
        let samples = audioBuffer.getChannelData(0);
        
        // Resample to 16kHz if the source isn't already 16kHz
        if (audioBuffer.sampleRate !== 16000) {
            samples = this.resampleTo16kHz(samples, audioBuffer.sampleRate);
        }
        
        const pcm16 = new Int16Array(samples.length);
        
        for (let i = 0; i < samples.length; i++) {
            // Convert float32 to int16
            const sample = Math.max(-1, Math.min(1, samples[i]));
            pcm16[i] = sample < 0 ? sample * 0x8000 : sample * 0x7FFF;
        }
        
        return pcm16.buffer;
    }
    
    resampleTo16kHz(samples, originalSampleRate) {
        if (originalSampleRate === 16000) return samples;
        
        const ratio = originalSampleRate / 16000;
        const newLength = Math.floor(samples.length / ratio);
        const resampled = new Float32Array(newLength);
        
        for (let i = 0; i < newLength; i++) {
            const srcIndex = i * ratio;
            const srcIndexFloor = Math.floor(srcIndex);
            const srcIndexCeil = Math.min(srcIndexFloor + 1, samples.length - 1);
            const fraction = srcIndex - srcIndexFloor;
            
            // Linear interpolation
            resampled[i] = samples[srcIndexFloor] * (1 - fraction) + samples[srcIndexCeil] * fraction;
        }
        
        return resampled;
    }
    
    handleWebSocketMessage(event, connectResolve = null) {
        try {
            // All OpenAI Realtime messages are JSON, not binary
            console.log('Raw message received:', event.data);
            const message = JSON.parse(event.data);
            console.log('Parsed message:', message);
            
            switch (message.type) {
                case 'connection.ready':
                    console.log('Received connection.ready, connectionId:', message.connection_id);
                    this.connectionId = message.connection_id;
                    this.openaiReady = true;
                    console.log('OpenAI connection ready! Resolving promise...');
                    // Resolve connection promise if we're still connecting
                    if (connectResolve) {
                        console.log('Resolving connection promise');
                        connectResolve();
                    }
                    break;
                    
                case 'conversation.item.input_audio_transcription.completed':
                    this.updateTranscript(`You: ${message.transcript}`, 'user');
                    break;
                    
                case 'conversation.item.input_audio_transcription.partial':
                    this.updateTranscript(`You (partial): ${message.transcript}`, 'user-partial');
                    break;
                    
                case 'response.audio_transcript.partial':
                    this.updateTranscript(`Assistant (speaking): ${message.transcript}`, 'assistant-partial');
                    break;
                    
                case 'response.audio_transcript.done':
                    this.addMessage(message.transcript, 'assistant');
                    break;
                    
                case 'response.output_audio.delta':
                    // Handle assistant audio data (base64 PCM16)
                    if (message.delta) {
                        this.playAssistantAudioDelta(message.delta);
                    }
                    break;
                    
                case 'conversation.item.created':
                    if (message.item && message.item.type === 'message') {
                        const content = message.item.content?.[0];
                        if (content && content.text) {
                            this.addMessage(content.text, 'assistant');
                        }
                    }
                    break;
                    
                case 'error':
                    console.error('WebSocket error received:', message);
                    this.showToast('Error: ' + message.message, 'error');
                    break;
                    
                default:
                    // Handle other message types as needed
                    break;
            }
        } catch (error) {
            console.error('Error handling WebSocket message:', error);
        }
    }
    
    sendSessionUpdate() {
        if (!this.ws || this.ws.readyState !== WebSocket.OPEN) return;
        
        const sessionUpdate = {
            type: 'session.update',
            session: {
                voice: 'alloy',
                input_audio_format: 'pcm16',
                output_audio_format: 'pcm16',
                instructions: this.getLanguageInstructions(),
                turn_detection: {
                    type: 'server_vad',
                    threshold: 0.5,
                    prefix_padding_ms: 300,
                    silence_duration_ms: 800
                },
                metadata: {
                    language: this.currentLanguage,
                    ...(this.userLocation && { location: this.userLocation })
                }
            }
        };
        
        this.ws.send(JSON.stringify(sessionUpdate));
    }
    
    getLanguageInstructions() {
        const baseInstructions = `You are a helpful healthcare navigation assistant. Provide empathetic, concise responses focusing on:
        - Healthcare provider recommendations  
        - Social services guidance
        - Emergency triage when appropriate
        - Practical next steps and contact information`;
        
        if (this.currentLanguage === 'es') {
            return baseInstructions + `\n\nFor Spanish responses: Use formal "usted" tone, warm and respectful. Keep responses under 120 words. Provide caring, professional guidance in Spanish.`;
        } else {
            return baseInstructions + `\n\nFor English responses: Use empathetic tone, maximum 120 words. Provide caring, practical guidance.`;
        }
    }
    
    async playAssistantAudioDelta(base64Delta) {
        try {
            if (!this.audioContext) {
                await this.initializeAudio();
            }
            
            // Decode base64 PCM16 data
            const binaryString = atob(base64Delta);
            const bytes = new Uint8Array(binaryString.length);
            for (let i = 0; i < binaryString.length; i++) {
                bytes[i] = binaryString.charCodeAt(i);
            }
            
            // Convert to AudioBuffer and add to queue
            const audioBuffer = this.pcm16ToAudioBuffer(bytes.buffer);
            this.audioQueue.push(audioBuffer);
            
            // Start playback if not already playing
            if (!this.isPlayingAudio) {
                this.processAudioQueue();
            }
            
        } catch (error) {
            console.error('Error processing assistant audio delta:', error);
        }
    }
    
    async processAudioQueue() {
        if (this.audioQueue.length === 0) {
            this.isPlayingAudio = false;
            return;
        }
        
        this.isPlayingAudio = true;
        const audioBuffer = this.audioQueue.shift();
        
        const source = this.audioContext.createBufferSource();
        source.buffer = audioBuffer;
        source.connect(this.audioContext.destination);
        
        // Continue processing queue when this chunk ends
        source.onended = () => {
            this.processAudioQueue();
        };
        
        source.start();
    }
    
    pcm16ToAudioBuffer(arrayBuffer) {
        const pcm16 = new Int16Array(arrayBuffer);
        const sampleRate = 16000; // OpenAI Realtime API uses 16kHz
        
        const audioBuffer = this.audioContext.createBuffer(1, pcm16.length, sampleRate);
        const channelData = audioBuffer.getChannelData(0);
        
        // Convert Int16 PCM to Float32
        for (let i = 0; i < pcm16.length; i++) {
            channelData[i] = pcm16[i] / (pcm16[i] < 0 ? 0x8000 : 0x7FFF);
        }
        
        return audioBuffer;
    }
    
    stopVoiceSession() {
        if (this.mediaRecorder && this.isRecording) {
            this.mediaRecorder.stop();
        }
        
        if (this.ws && this.ws.readyState === WebSocket.OPEN) {
            // Commit any pending audio and create final response
            this.ws.send(JSON.stringify({
                type: 'input_audio_buffer.commit'
            }));
            this.ws.send(JSON.stringify({
                type: 'response.create'
            }));
            
            // Wait a moment then cancel and close
            setTimeout(() => {
                if (this.ws && this.ws.readyState === WebSocket.OPEN) {
                    this.ws.send(JSON.stringify({
                        type: 'response.cancel'
                    }));
                    this.ws.close();
                }
            }, 500);
        }
        
        // Clear audio queue
        this.audioQueue = [];
        this.isPlayingAudio = false;
        
        this.startBtn.disabled = false;
        this.stopBtn.disabled = true;
        this.updateStatus('disconnected', '🔴 Voice session ended');
        this.hideAudioVisualizer();
    }
    
    async sendTextMessage() {
        const text = this.textInput.value.trim();
        if (!text) return;
        
        this.addMessage(text, 'user');
        this.textInput.value = '';
        
        if (this.ws && this.ws.readyState === WebSocket.OPEN) {
            // Send as text via WebSocket
            const textMessage = {
                type: 'conversation.item.create',
                item: {
                    type: 'message',
                    role: 'user',
                    content: [{
                        type: 'input_text',
                        text: text
                    }]
                }
            };
            this.ws.send(JSON.stringify(textMessage));
            
            // Trigger response
            this.ws.send(JSON.stringify({ type: 'response.create' }));
        } else {
            // Fallback to /api/ask
            await this.fallbackToApiAsk(text);
        }
    }
    
    async fallbackToApiAsk(message) {
        try {
            this.addMessage('Using text-based API (voice unavailable)...', 'system');
            
            const response = await fetch('/api/ask', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    message,
                    lang: this.currentLanguage === 'es' ? 'Spanish' : 'English',
                    location: this.userLocation,
                    user: { email: 'voice-user@demo.com', name: 'Voice User' }
                })
            });
            
            const data = await response.json();
            
            if (data.success) {
                this.addMessage(data.reply, 'assistant');
                
                // Use speech synthesis to speak the reply
                if ('speechSynthesis' in window) {
                    const utterance = new SpeechSynthesisUtterance(data.reply);
                    utterance.lang = this.currentLanguage === 'es' ? 'es-ES' : 'en-US';
                    utterance.rate = 0.9;
                    utterance.pitch = 1.0;
                    speechSynthesis.speak(utterance);
                }
            } else {
                this.addMessage('Error: ' + (data.error || 'Unknown error'), 'error');
            }
        } catch (error) {
            console.error('Fallback API error:', error);
            this.addMessage('Connection error. Please try again.', 'error');
        }
    }
    
    toggleLanguage() {
        this.currentLanguage = this.currentLanguage === 'en' ? 'es' : 'en';
        this.langBtn.textContent = this.currentLanguage === 'en' ? '🌍 EN' : '🌍 ES';
        this.langBtn.classList.toggle('active', this.currentLanguage === 'es');
        
        // Session config handled by server, no need to update here
        
        this.showToast(`Language switched to ${this.currentLanguage === 'en' ? 'English' : 'Spanish'}`, 'info');
    }
    
    async requestLocation() {
        if ('geolocation' in navigator) {
            try {
                const position = await new Promise((resolve, reject) => {
                    navigator.geolocation.getCurrentPosition(resolve, reject, {
                        enableHighAccuracy: true,
                        timeout: 10000,
                        maximumAge: 300000
                    });
                });
                
                this.userLocation = {
                    lat: position.coords.latitude,
                    lng: position.coords.longitude,
                    consent: true
                };
                
                this.locationBtn.textContent = '📍 ✓ Location Shared';
                this.locationBtn.classList.add('active');
                this.showToast('Location shared for better recommendations', 'success');
                
                // Session config handled by server
                
            } catch (error) {
                console.error('Location error:', error);
                this.showToast('Location access denied', 'error');
            }
        } else {
            this.showToast('Location not supported in this browser', 'error');
        }
    }
    
    reconnect() {
        this.reconnectBtn.style.display = 'none';
        this.startVoiceSession();
    }
    
    handleDisconnection() {
        this.updateStatus('disconnected', '💬 Text mode ready - Type your questions below');
        this.startBtn.disabled = false;
        this.stopBtn.disabled = true;
        this.reconnectBtn.style.display = 'inline-block';
        this.hideAudioVisualizer();
        // Switch to text mode quietly without showing error
    }
    
    updateStatus(state, text) {
        this.status.className = `status ${state}`;
        this.status.textContent = text;
    }
    
    updateTranscript(text, type = 'user') {
        // Update the live transcript area
        if (type.includes('partial')) {
            // Replace last partial line or add new
            const lines = this.transcript.textContent.split('\n');
            if (lines[lines.length - 1].includes('(partial)') || lines[lines.length - 1].includes('(speaking)')) {
                lines[lines.length - 1] = text;
            } else {
                lines.push(text);
            }
            this.transcript.textContent = lines.join('\n');
        } else {
            this.transcript.textContent += (this.transcript.textContent ? '\n' : '') + text;
        }
        
        this.transcript.scrollTop = this.transcript.scrollHeight;
    }
    
    addMessage(text, type) {
        const messageDiv = document.createElement('div');
        messageDiv.className = `message ${type}`;
        
        const timestamp = new Date().toLocaleTimeString();
        const prefix = type === 'user' ? '👤 You' : type === 'assistant' ? '🤖 Assistant' : '📋 System';
        
        messageDiv.innerHTML = `<small>${timestamp}</small><br><strong>${prefix}:</strong> ${text}`;
        
        this.messages.appendChild(messageDiv);
        this.messages.scrollTop = this.messages.scrollHeight;
    }
    
    showAudioVisualizer() {
        const visualizer = document.querySelector('.audio-visualizer');
        visualizer.style.display = 'flex';
        
        // Animate bars
        const bars = document.querySelectorAll('.audio-bar');
        const animate = () => {
            if (!this.isRecording) return;
            
            bars.forEach(bar => {
                const height = Math.random() * 16 + 4;
                bar.style.height = `${height}px`;
            });
            
            setTimeout(animate, 150);
        };
        animate();
    }
    
    hideAudioVisualizer() {
        const visualizer = document.querySelector('.audio-visualizer');
        visualizer.style.display = 'none';
    }
    
    showToast(message, type = 'info') {
        this.toast.textContent = message;
        this.toast.className = `toast show ${type}`;
        
        setTimeout(() => {
            this.toast.classList.remove('show');
        }, 4000);
    }

}

// Initialize when DOM is ready
document.addEventListener('DOMContentLoaded', () => {
    new HealthcareVoiceAssistant();
});

// Export for testing
if (typeof module !== 'undefined' && module.exports) {
    module.exports = HealthcareVoiceAssistant;
}