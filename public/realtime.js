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
    
    // Helper function to enable/disable microphone
    setMicEnabled(enabled) {
        if (!this.localStream) return;
        
        this.micEnabled = enabled;
        this.localStream.getAudioTracks().forEach(track => {
            track.enabled = enabled;
        });
        
        console.log(enabled ? 'Microphone enabled' : 'Microphone muted during AI speech');
    }
    
    async startVoiceSession() {
        try {
            console.log('Starting voice session with WebRTC...');
            this.updateStatus('connecting', '🟡 Connecting to voice services...');
            
            // Step 1: Request microphone permission
            console.log('Step 1: Requesting microphone access...');
            const stream = await navigator.mediaDevices.getUserMedia({ 
                audio: {
                    echoCancellation: true,
                    noiseSuppression: true,
                    autoGainControl: true,
                    channelCount: 1
                } 
            });
            console.log('Step 1: Microphone access granted');
            
            // Step 2: Get ephemeral token
            console.log('Step 2: Getting ephemeral token...');
            const response = await fetch('/api/voice/ephemeral', { method: 'POST' });
            
            if (!response.ok) {
                const errorData = await response.json();
                let errorMessage = 'Voice features unavailable';
                
                if (response.status === 401 || response.status === 403) {
                    errorMessage = 'OpenAI key invalid or billing issue';
                } else if (response.status === 502) {
                    errorMessage = errorData.error || 'OpenAI service unavailable';
                } else {
                    errorMessage = errorData.error || 'Network error connecting to voice services';
                }
                
                throw new Error(errorMessage);
            }
            
            const { client_secret } = await response.json();
            console.log('Step 2: Ephemeral token received');
            
            // Step 3: Set up WebRTC connection
            console.log('Step 3: Setting up WebRTC connection...');
            await this.connectWebRTC(stream, client_secret);
            console.log('Step 3: WebRTC connection established');
            
            this.startBtn.disabled = true;
            this.stopBtn.disabled = false;
            this.updateStatus('connected', '🟢 Voice session active - Start speaking!');
            this.showAudioVisualizer();
            
            console.log('Voice session fully active!');
            
        } catch (error) {
            console.error('Voice session failed:', error);
            
            // Show precise error messages
            let errorMessage = error.message;
            if (error.name === 'NotAllowedError') {
                errorMessage = 'Mic permission denied — click the lock icon → Allow microphone';
            } else if (error.message.includes('NetworkError')) {
                errorMessage = 'Network blocked to OpenAI Realtime. Check VPN/Firewall';
            }
            
            this.showToast(errorMessage, 'error');
            this.updateStatus('disconnected', '💬 Text mode - Type your message below');
        }
    }
    
    async connectWebRTC(stream, clientSecret) {
        return new Promise(async (resolve, reject) => {
            try {
                // Create RTCPeerConnection
                this.pc = new RTCPeerConnection();
                
                // Store local stream for cleanup
                this.localStream = stream;
                
                // Store microphone control state
                this.micEnabled = true;
                this.aiSpeaking = false;
                
                // Add local microphone stream
                stream.getTracks().forEach(track => {
                    console.log('Adding track to peer connection:', track.kind);
                    this.pc.addTrack(track, stream);
                });
                
                // Set up remote audio playback
                let audioEl = document.getElementById('remote-audio');
                if (!audioEl) {
                    audioEl = document.createElement('audio');
                    audioEl.autoplay = true;
                    audioEl.id = 'remote-audio';
                    audioEl.volume = 0.7; // Lower volume to help prevent feedback
                    audioEl.playsInline = true;
                    document.body.appendChild(audioEl);
                }
                
                this.pc.ontrack = (event) => {
                    console.log('Received remote track:', event.track.kind);
                    audioEl.srcObject = event.streams[0];
                };
                
                // Handle server-created data channel from OpenAI
                this.pc.ondatachannel = (event) => {
                    console.log('Received data channel from OpenAI:', event.channel.label);
                    const channel = event.channel;
                    this.controlChannel = channel; // Store for sending session updates
                    
                    channel.onopen = () => {
                        console.log('OpenAI data channel opened');
                        
                        // Send session configuration to pin language and improve settings
                        const sessionConfig = {
                            type: 'session.update',
                            session: {
                                voice: 'alloy',
                                instructions: 'Always respond in English, concise, caring. Do not switch languages unless explicitly asked.',
                                turn_detection: { 
                                    type: 'server_vad', 
                                    threshold: 0.6, 
                                    prefix_padding_ms: 200, 
                                    silence_duration_ms: 700 
                                },
                                modalities: ['text', 'audio']
                            }
                        };
                        
                        channel.send(JSON.stringify(sessionConfig));
                        console.log('Sent session configuration to pin English language');
                    };
                    
                    channel.onmessage = (event) => {
                        console.log('[OpenAI Event]:', event.data);
                        this.handleOpenAIEvent(event.data);
                    };
                };
                
                // Create offer
                const offer = await this.pc.createOffer();
                await this.pc.setLocalDescription(offer);
                console.log('Created WebRTC offer, waiting for ICE gathering...');
                
                // Wait for ICE gathering to complete
                await new Promise((resolve) => {
                    if (this.pc.iceGatheringState === 'complete') {
                        resolve();
                    } else {
                        this.pc.addEventListener('icegatheringstatechange', () => {
                            if (this.pc.iceGatheringState === 'complete') {
                                resolve();
                            }
                        });
                    }
                });
                
                console.log('ICE gathering complete, sending offer to OpenAI...');
                
                // Send complete SDP offer to OpenAI Realtime API
                const response = await fetch('https://api.openai.com/v1/realtime?model=gpt-4o-realtime-preview', {
                    method: 'POST',
                    headers: {
                        'Authorization': `Bearer ${clientSecret}`,
                        'Content-Type': 'application/sdp',
                        'OpenAI-Beta': 'realtime=v1'
                    },
                    body: this.pc.localDescription.sdp
                });
                
                if (!response.ok) {
                    throw new Error(`WebRTC connection failed: ${response.status}`);
                }
                
                const answerSdp = await response.text();
                const answer = { type: 'answer', sdp: answerSdp };
                await this.pc.setRemoteDescription(answer);
                console.log('WebRTC connection established');
                
                resolve();
                
            } catch (error) {
                console.error('WebRTC connection failed:', error);
                reject(error);
            }
        });
    }
    
    handleOpenAIEvent(data) {
        try {
            const event = JSON.parse(data);
            console.log('OpenAI Event:', event);
            
            switch (event.type) {
                case 'conversation.item.input_audio_transcription.completed':
                    this.updateTranscript(`You: ${event.transcript}`, 'user');
                    break;
                    
                case 'conversation.item.input_audio_transcription.partial':
                    this.updateTranscript(`You (partial): ${event.transcript}`, 'user-partial');
                    break;
                    
                case 'response.audio_transcript.partial':
                    this.updateTranscript(`Assistant (speaking): ${event.transcript}`, 'assistant-partial');
                    // Mute microphone during AI speech to prevent feedback (only on first partial)
                    if (!this.aiSpeaking) {
                        this.aiSpeaking = true;
                        this.setMicEnabled(false);
                    }
                    break;
                    
                case 'response.audio_transcript.done':
                    this.addMessage(event.transcript, 'assistant');
                    // Re-enable microphone when AI is done speaking
                    this.aiSpeaking = false;
                    this.setMicEnabled(true);
                    break;
                    
                case 'conversation.item.created':
                    if (event.item && event.item.type === 'message') {
                        const content = event.item.content?.[0];
                        if (content && content.text) {
                            this.addMessage(content.text, 'assistant');
                        }
                    }
                    break;
                    
                case 'response.completed':
                    // Fallback to re-enable microphone if we missed audio_transcript.done
                    if (this.aiSpeaking) {
                        console.log('Re-enabling microphone after response completed');
                        this.aiSpeaking = false;
                        this.setMicEnabled(true);
                    }
                    break;
                    
                case 'error':
                    console.error('OpenAI Error:', event);
                    this.showToast('Voice error: ' + event.message, 'error');
                    break;
            }
        } catch (error) {
            console.error('Error handling OpenAI event:', error);
        }
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
                    console.log('OpenAI connection ready! Sending session update...');
                    // Send session configuration to ensure proper language/location settings
                    this.sendSessionUpdate();
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
                    
                case 'status':
                    console.log('Status update:', message.message);
                    this.showToast(message.message, 'info');
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
        console.log('Stopping voice session...');
        
        if (this.mediaRecorder && this.isRecording) {
            this.mediaRecorder.stop();
        }
        
        // Close WebRTC peer connection
        if (this.pc) {
            this.pc.close();
            this.pc = null;
        }
        
        // Close any data channels (handled by peer connection closure)
        this.dataChannel = null;
        this.controlChannel = null;
        
        // Reset microphone and AI speaking state
        this.micEnabled = true;
        this.aiSpeaking = false;
        
        // Stop local media tracks
        if (this.localStream) {
            this.localStream.getTracks().forEach(track => track.stop());
            this.localStream = null;
        }
        
        // Clear audio queue
        this.audioQueue = [];
        this.isPlayingAudio = false;
        
        this.startBtn.disabled = false;
        this.stopBtn.disabled = true;
        this.updateStatus('disconnected', '🔴 Voice session ended');
        this.hideAudioVisualizer();
        
        console.log('Voice session stopped');
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
    
    async reconnect() {
        this.reconnectBtn.style.display = 'none';
        this.updateStatus('connecting', '🟡 Checking voice services...');
        
        try {
            // Check voice health first
            const healthResponse = await fetch('/api/voice/health');
            const healthData = await healthResponse.json();
            
            if (!healthData.ok) {
                this.showToast(`Voice service issue: ${healthData.reason}`, 'error');
                this.reconnectBtn.style.display = 'inline-block';
                this.updateStatus('disconnected', '💬 Text mode - Type your message below');
                return;
            }
            
            // If health check passes, try to reconnect
            this.startVoiceSession();
        } catch (error) {
            this.showToast('Voice health check failed', 'error');
            this.reconnectBtn.style.display = 'inline-block';
            this.updateStatus('disconnected', '💬 Text mode - Type your message below');
        }
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