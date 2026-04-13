#!/usr/bin/env python3
"""
PVA AI Agent - Telegram Notification Script
Usage: python telegram_notify.py "Chat ID here" "Message here"
"""

import sys
import requests
import json

BOT_TOKEN = "8673642768:AAFHIy1m2fJg_SdZIhLdjViemuND1oUJPPU"
API_URL = f"https://api.telegram.org/bot{BOT_TOKEN}/sendMessage"

def send_notification(chat_id, message):
    """Send a Telegram notification"""
    print(f"📤 Sending notification to chat {chat_id}...")
    
    payload = {
        "chat_id": chat_id,
        "text": message,
        "parse_mode": "Markdown"
    }
    
    try:
        response = requests.post(API_URL, json=payload)
        result = response.json()
        
        if result.get("ok"):
            print(f"✅ Notification sent!")
            return True
        else:
            print(f"❌ Error: {result.get('description')}")
            return False
    except Exception as e:
        print(f"❌ Connection error: {str(e)}")
        return False

if __name__ == "__main__":
    if len(sys.argv) != 3:
        print("Usage: python telegram_notify.py <chat_id> <message>")
        print("\nExample:")
        print('  python telegram_notify.py 123456789 "🤖 Agent is ready!"')
        sys.exit(1)
    
    chat_id = sys.argv[1]
    message = sys.argv[2]
    
    send_notification(chat_id, message)
