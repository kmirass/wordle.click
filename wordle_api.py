# wordle_api.py
from flask import Flask, jsonify, request
from flask_cors import CORS
from datetime import datetime
import hashlib
import json
import os

app = Flask(__name__)
CORS(app)  # Allows requests from the frontend

# Loads the word list from the corresponding JSON file
def load_word_list(lang: str):
    if lang not in ("en", "es"):
        lang = "en"
    json_path = os.path.join(os.path.dirname(__file__), f"words_{lang}.json")
    with open(json_path, "r", encoding="utf-8") as f:
        return json.load(f)

def get_word_for_date(date_str: str, lang: str) -> str:
    word_list = load_word_list(lang)
    seed = f"wordle-{lang}-{date_str}"
    idx = int(hashlib.md5(seed.encode()).hexdigest()[:8], 16) % len(word_list)
    return word_list[idx]

def get_word_set(lang: str):
    return set(load_word_list(lang))

# v1 routes
@app.route("/api/v1/word", methods=["GET"])
def today_word_v1():
    lang = request.args.get("lang", "en")
    today = datetime.now().strftime("%Y-%m-%d")
    return jsonify({"word": get_word_for_date(today, lang), "date": today, "lang": lang})

@app.route("/api/v1/word/<date>", methods=["GET"])
def word_by_date_v1(date: str):
    lang = request.args.get("lang", "en")
    try:
        datetime.strptime(date, "%Y-%m-%d")
    except ValueError:
        return jsonify({"error": "Invalid date format. Use YYYY-MM-DD"}), 400
    return jsonify({"word": get_word_for_date(date, lang), "date": date, "lang": lang})

@app.route("/api/v1/validate/<word>", methods=["GET"])
def validate_v1(word: str):
    lang = request.args.get("lang", "en")
    w = word.upper()
    word_set = get_word_set(lang)
    valid = len(w) == 5 and w.isalpha() and w in word_set
    return jsonify({"word": w, "valid": valid, "lang": lang})

@app.route("/api/v1/stats", methods=["GET"])
def stats_v1():
    lang = request.args.get("lang", "en")
    word_list = load_word_list(lang)
    return jsonify({"total_words": len(word_list), "api_version": "1.1.0", "lang": lang})

# Legacy routes (opcional) que remiten a v1
@app.route("/api/word", methods=["GET"])
def today_word():
    return today_word_v1()

@app.route("/api/word/<date>", methods=["GET"])
def word_by_date(date: str):
    return word_by_date_v1(date)

@app.route("/api/validate/<word>", methods=["GET"])
def validate(word: str):
    return validate_v1(word)

@app.route("/api/stats", methods=["GET"])
def stats():
    return stats_v1()

if __name__ == "__main__":
    print("Wordle.click API local → http://localhost:5000/api/v1/word?lang=en")
    print("En producción, la API debe estar accesible en https://api.wordle.click/api/v1/")
    app.run(debug=True, host="0.0.0.0", port=5000)
