// Configuration
const API_URL = window.location.origin;

// Elements
const voiceBtn = document.getElementById('voiceBtn');
const voiceStatus = document.getElementById('voiceStatus');
const textCommand = document.getElementById('textCommand');
const sendBtn = document.getElementById('sendBtn');
const responseText = document.getElementById('responseText');
const productsContainer = document.getElementById('productsContainer');
const cartContainer = document.getElementById('cartContainer');
const cartTotal = document.getElementById('cartTotal');
const historyContainer = document.getElementById('historyContainer');

// Speech Recognition Setup
let recognition;
let isListening = false;

if ('webkitSpeechRecognition' in window || 'SpeechRecognition' in window) {
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    recognition = new SpeechRecognition();
    recognition.continuous = false;
    recognition.interimResults = false;
    recognition.lang = 'en-US';

    recognition.onstart = () => {
        isListening = true;
        voiceBtn.classList.add('listening');
        voiceStatus.textContent = 'Listening...';
    };

    recognition.onend = () => {
        isListening = false;
        voiceBtn.classList.remove('listening');
        voiceStatus.textContent = 'Click to speak';
    };

    recognition.onresult = (event) => {
        const transcript = event.results[0][0].transcript;
        textCommand.value = transcript;
        processCommand(transcript);
    };

    recognition.onerror = (event) => {
        console.error('Speech recognition error:', event.error);
        voiceStatus.textContent = 'Error: ' + event.error;
        voiceBtn.classList.remove('listening');
        isListening = false;
    };
} else {
    voiceStatus.textContent = 'Voice recognition not supported';
    voiceBtn.disabled = true;
}

// Event Listeners
voiceBtn.addEventListener('click', () => {
    if (recognition) {
        if (isListening) {
            recognition.stop();
        } else {
            recognition.start();
        }
    }
});

sendBtn.addEventListener('click', () => {
    const command = textCommand.value.trim();
    if (command) {
        processCommand(command);
    }
});

textCommand.addEventListener('keypress', (e) => {
    if (e.key === 'Enter') {
        const command = textCommand.value.trim();
        if (command) {
            processCommand(command);
        }
    }
});

// Quick command buttons
document.querySelectorAll('.command-btn').forEach(btn => {
    btn.addEventListener('click', () => {
        const command = btn.getAttribute('data-command');
        textCommand.value = command;
        processCommand(command);
    });
});

// Process Command
async function processCommand(command) {
    try {
        // Show loading state
        responseText.textContent = 'Processing...';

        // Send command to backend
        const response = await fetch(`${API_URL}/api/process-command`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({ command: command })
        });

        const result = await response.json();

        // Display response
        responseText.textContent = result.message;

        // Add to history
        addToHistory(command, result.message);

        // Speak the response using ElevenLabs
        await speakResponse(result.message);

        // Update displays if needed
        updateProducts();
        updateCart();

        // Clear input
        textCommand.value = '';

    } catch (error) {
        console.error('Error processing command:', error);
        responseText.textContent = 'Error processing command: ' + error.message;
    }
}

// Text to Speech using ElevenLabs
async function speakResponse(text) {
    try {
        const response = await fetch(`${API_URL}/api/text-to-speech`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({ text: text })
        });

        if (response.ok) {
            const audioBlob = await response.blob();
            const audioUrl = URL.createObjectURL(audioBlob);
            const audio = new Audio(audioUrl);

            // Play the audio
            await audio.play();

            // Clean up the URL after playing
            audio.onended = () => {
                URL.revokeObjectURL(audioUrl);
            };
        }
    } catch (error) {
        console.error('Error with text-to-speech:', error);
        // Continue even if TTS fails
    }
}

// Update Products Display
async function updateProducts() {
    try {
        const response = await fetch(`${API_URL}/api/products`);
        const products = await response.json();

        productsContainer.innerHTML = products.map(product => `
            <div class="product-card">
                <div class="product-name">${product.name}</div>
                <div class="product-price">$${product.price.toFixed(2)}</div>
                <div class="product-stock">Stock: ${product.stock}</div>
            </div>
        `).join('');
    } catch (error) {
        console.error('Error loading products:', error);
    }
}

// Update Cart Display
async function updateCart() {
    try {
        const response = await fetch(`${API_URL}/api/cart`);
        const cartData = await response.json();

        if (cartData.items.length === 0) {
            cartContainer.innerHTML = '<p class="empty-message">Your cart is empty</p>';
        } else {
            cartContainer.innerHTML = cartData.items.map(item => `
                <div class="cart-item">
                    <span>${item.name}</span>
                    <span class="product-price">$${item.price.toFixed(2)}</span>
                </div>
            `).join('');
        }

        cartTotal.textContent = cartData.total.toFixed(2);
    } catch (error) {
        console.error('Error loading cart:', error);
    }
}

// Add to History
function addToHistory(command, response) {
    const historyItem = document.createElement('div');
    historyItem.className = 'history-item';
    historyItem.innerHTML = `
        <div class="history-command">You: ${command}</div>
        <div class="history-response">Assistant: ${response}</div>
    `;
    historyContainer.insertBefore(historyItem, historyContainer.firstChild);

    // Keep only last 10 items
    while (historyContainer.children.length > 10) {
        historyContainer.removeChild(historyContainer.lastChild);
    }
}

// Initialize on page load
document.addEventListener('DOMContentLoaded', () => {
    updateProducts();
    updateCart();
});
