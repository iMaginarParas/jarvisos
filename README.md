# Voice E-Commerce Assistant

A voice-controlled e-commerce platform with ElevenLabs text-to-speech integration. Control your online shopping experience using natural voice commands!

## Features

- **Voice Commands**: Speak naturally to search products, manage cart, and checkout
- **Text-to-Speech**: AI-powered voice responses using ElevenLabs
- **Real-time Updates**: Live product catalog and cart management
- **Beautiful UI**: Modern, responsive interface with gradient design
- **Command History**: Track all your interactions

## Voice Commands

- `"search for [product]"` - Search for products
- `"add [product] to cart"` - Add items to your cart
- `"show cart"` - View cart contents
- `"checkout"` - Place your order
- `"list all products"` - See all available products
- `"view orders"` - Check order history
- `"clear cart"` - Empty your cart
- `"help"` - Get list of available commands

## Setup

### 1. Install Dependencies

```bash
pip install -r requirements.txt
```

### 2. Configure Environment Variables

Create a `.env` file from the example:

```bash
cp .env.example .env
```

Edit `.env` and add your ElevenLabs API key:

```
ELEVENLABS_API_KEY=your_actual_api_key_here
```

Get your API key from: https://elevenlabs.io/

### 3. Run Locally

```bash
python main.py
```

Visit `http://localhost:5000` in your browser.

## Deploy to Railway

1. Push your code to GitHub
2. Connect your repository to Railway
3. Add environment variable `ELEVENLABS_API_KEY` in Railway dashboard
4. Railway will automatically deploy using `railway.json` configuration

## Project Structure

```
jarvisos/
├── main.py              # Flask backend with e-commerce logic
├── index.html           # Frontend interface
├── styles.css           # Styling
├── script.js            # Voice recognition and API calls
├── requirements.txt     # Python dependencies
├── railway.json         # Railway deployment config
├── .env.example         # Environment variables template
└── README.md           # This file
```

## API Endpoints

- `GET /` - Serve frontend
- `POST /api/process-command` - Process voice/text commands
- `POST /api/text-to-speech` - Convert text to speech
- `GET /api/products` - Get all products
- `GET /api/cart` - Get cart items
- `GET /api/orders` - Get order history

## Integration with Your E-Commerce Site

To integrate this with your existing e-commerce website:

1. **Replace Mock Data**: Update the `products` array in `main.py` with your actual product database
2. **Connect Backend**: Replace in-memory storage with your database (PostgreSQL, MongoDB, etc.)
3. **Add Authentication**: Implement user authentication to track individual carts and orders
4. **Payment Integration**: Add Stripe/PayPal for actual checkout processing
5. **Embed Frontend**: Include the voice interface in your existing site as a widget or overlay

Example integration:

```javascript
// In your existing e-commerce site
<iframe src="https://your-voice-assistant.railway.app" width="400" height="600"></iframe>
```

Or use the API directly:

```javascript
// Call from your existing JavaScript
fetch('https://your-voice-assistant.railway.app/api/process-command', {
    method: 'POST',
    headers: {'Content-Type': 'application/json'},
    body: JSON.stringify({command: 'add laptop to cart'})
});
```

## Browser Compatibility

- Chrome/Edge: Full support for Web Speech API
- Firefox: Limited voice recognition support
- Safari: May require user permissions for microphone

## License

MIT License
