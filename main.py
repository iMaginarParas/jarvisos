from flask import Flask, request, jsonify, send_from_directory
from flask_cors import CORS
from elevenlabs import ElevenLabs, VoiceSettings
import os
from dotenv import load_dotenv
import json
from datetime import datetime

load_dotenv()

app = Flask(__name__, static_folder='frontend')
CORS(app)

# Initialize ElevenLabs client
client = ElevenLabs(api_key=os.getenv("ELEVENLABS_API_KEY"))

# In-memory storage for demo (replace with database in production)
products = [
    {"id": 1, "name": "Wireless Headphones", "price": 79.99, "stock": 50},
    {"id": 2, "name": "Smart Watch", "price": 199.99, "stock": 30},
    {"id": 3, "name": "Laptop Stand", "price": 49.99, "stock": 100},
    {"id": 4, "name": "USB-C Cable", "price": 12.99, "stock": 200},
    {"id": 5, "name": "Mechanical Keyboard", "price": 129.99, "stock": 45},
]

cart = []
orders = []

def process_voice_command(command):
    """Process voice commands and return appropriate response"""
    command = command.lower()

    # Search products
    if "search" in command or "find" in command or "show" in command:
        keywords = command.split()
        results = []
        for product in products:
            for keyword in keywords:
                if keyword in product["name"].lower():
                    results.append(product)
                    break

        if results:
            response = f"I found {len(results)} product(s): "
            response += ", ".join([f"{p['name']} for ${p['price']}" for p in results])
            return {"success": True, "message": response, "data": results}
        else:
            return {"success": False, "message": "No products found matching your search.", "data": []}

    # Add to cart
    elif "add" in command and "cart" in command:
        for product in products:
            if product["name"].lower() in command:
                cart.append(product)
                return {"success": True, "message": f"Added {product['name']} to your cart for ${product['price']}", "data": cart}
        return {"success": False, "message": "Product not found. Please specify the product name.", "data": []}

    # View cart
    elif "cart" in command or "show cart" in command:
        if not cart:
            return {"success": True, "message": "Your cart is empty.", "data": []}
        total = sum(item["price"] for item in cart)
        response = f"You have {len(cart)} item(s) in your cart. "
        response += ", ".join([item["name"] for item in cart])
        response += f". Total: ${total:.2f}"
        return {"success": True, "message": response, "data": {"items": cart, "total": total}}

    # Clear cart
    elif "clear cart" in command or "empty cart" in command:
        cart.clear()
        return {"success": True, "message": "Your cart has been cleared.", "data": []}

    # Checkout
    elif "checkout" in command or "place order" in command:
        if not cart:
            return {"success": False, "message": "Your cart is empty. Add items before checking out.", "data": []}

        total = sum(item["price"] for item in cart)
        order = {
            "id": len(orders) + 1,
            "items": cart.copy(),
            "total": total,
            "date": datetime.now().isoformat()
        }
        orders.append(order)
        cart.clear()
        return {"success": True, "message": f"Order placed successfully! Your order number is {order['id']}. Total: ${total:.2f}", "data": order}

    # List all products
    elif "all products" in command or "list products" in command:
        response = f"We have {len(products)} products available: "
        response += ", ".join([f"{p['name']} for ${p['price']}" for p in products])
        return {"success": True, "message": response, "data": products}

    # View orders
    elif "orders" in command or "order history" in command:
        if not orders:
            return {"success": True, "message": "You have no previous orders.", "data": []}
        response = f"You have {len(orders)} order(s). "
        return {"success": True, "message": response, "data": orders}

    # Help
    elif "help" in command:
        response = "You can say: search for products, add to cart, show cart, checkout, list all products, view orders, or clear cart."
        return {"success": True, "message": response, "data": []}

    else:
        return {"success": False, "message": "I didn't understand that command. Say 'help' for available commands.", "data": []}

@app.route('/')
def index():
    return send_from_directory('frontend', 'index.html')

@app.route('/<path:path>')
def serve_static(path):
    return send_from_directory('frontend', path)

@app.route('/api/process-command', methods=['POST'])
def process_command():
    """Process text or voice command"""
    data = request.json
    command = data.get('command', '')

    if not command:
        return jsonify({"error": "No command provided"}), 400

    result = process_voice_command(command)
    return jsonify(result)

@app.route('/api/text-to-speech', methods=['POST'])
def text_to_speech():
    """Convert text to speech using ElevenLabs"""
    data = request.json
    text = data.get('text', '')

    if not text:
        return jsonify({"error": "No text provided"}), 400

    try:
        # Generate speech using ElevenLabs
        audio = client.text_to_speech.convert(
            voice_id="21m00Tcm4TlvDq8ikWAM",  # Rachel voice
            optimize_streaming_latency=0,
            output_format="mp3_22050_32",
            text=text,
            model_id="eleven_turbo_v2_5",
            voice_settings=VoiceSettings(
                stability=0.5,
                similarity_boost=0.75,
                style=0.0,
                use_speaker_boost=True,
            ),
        )

        # Save audio to bytes
        audio_bytes = b"".join(audio)

        # Return audio data
        from flask import Response
        return Response(audio_bytes, mimetype='audio/mpeg')

    except Exception as e:
        return jsonify({"error": str(e)}), 500

@app.route('/api/products', methods=['GET'])
def get_products():
    """Get all products"""
    return jsonify(products)

@app.route('/api/cart', methods=['GET'])
def get_cart():
    """Get cart items"""
    total = sum(item["price"] for item in cart)
    return jsonify({"items": cart, "total": total})

@app.route('/api/orders', methods=['GET'])
def get_orders():
    """Get all orders"""
    return jsonify(orders)

if __name__ == '__main__':
    port = int(os.getenv('PORT', 5000))
    app.run(host='0.0.0.0', port=port, debug=True)
