import os
import datetime
import requests
from serpapi import GoogleSearch
from flask import Flask, request, jsonify, send_from_directory
from flask_cors import CORS
import google.generativeai as genai

app = Flask(__name__)
CORS(app)

# Configure Gemini API
genai.configure(api_key=os.getenv("GEMINI_API_KEY"))

# Configure SerpApi Key
SERP_API_KEY = os.getenv("SERP_API_KEY")

@app.route('/')
def serve_index():
    return send_from_directory('.', 'index.html')

@app.route('/style.css')
def serve_style():
    return send_from_directory('.', 'style.css')

@app.route('/script.js')
def serve_script():
    return send_from_directory('.', 'script.js')

@app.route('/chat', methods=['POST', 'OPTIONS'])
def chat():
    if request.method == 'OPTIONS':
        return '', 204

    data = request.json
    user_message = data.get('message', '')

    if not user_message:
        return jsonify({'error': 'No message provided'}), 400

    try:
        live_keywords = [
            "today", "live", "latest", "current", "news", 
            "score", "ipl", "weather", "stock"
        ]
        
        search_context = ""
        user_msg_lower = user_message.lower()
        if any(keyword in user_msg_lower for keyword in live_keywords):
            try:
                params = {
                    "q": user_message,
                    "api_key": SERP_API_KEY
                }
                search = GoogleSearch(params)
                results = search.get_dict()
                
                snippet = "No live information available."
                if "organic_results" in results and len(results["organic_results"]) > 0:
                    first_result = results["organic_results"][0]
                    snippet = first_result.get("snippet", "No result found")
                
                if snippet != "No live information available.":
                    search_context = f"\n\nLive Internet Search Results:\n- {snippet}"
            except Exception as e:
                print(f"Search API error: {e}")

        now = datetime.datetime.now()
        current_time_context = f"\n\nThe current date and time is {now.strftime('%Y-%m-%d %H:%M:%S')}."
        
        system_prompt = f"""You are an intelligent AI chatbot.

Answer user questions clearly, accurately, and naturally.

For general questions, use your AI knowledge.

For live information such as:
- latest news
- IPL scores
- current year
- weather
- trending topics
- stock market
- live events

use internet search results provided by the backend.

Provide short, meaningful, and accurate answers.

If future prediction is asked, provide analysis based on available trends and patterns instead of claiming exact future results.

Always behave like a professional and helpful AI assistant.{current_time_context}{search_context}
"""

        configured_model = genai.GenerativeModel(
            model_name='gemini-flash-latest',
            system_instruction=system_prompt
        )

        response = configured_model.generate_content(user_message)

        return jsonify({'response': response.text})

    except Exception as e:
        print(f"Error: {e}")
        error_message = str(e)
        if "429" in error_message or "quota" in error_message.lower():
            return jsonify({'error': 'Rate limit exceeded. Please try again later.', 'details': error_message}), 429
        return jsonify({'error': 'Failed to generate response', 'details': error_message}), 500


if __name__ == '__main__':
    app.run(debug=True, port=5002)

