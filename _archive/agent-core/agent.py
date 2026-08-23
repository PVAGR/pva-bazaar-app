import os
import logging
from pathlib import Path
from telegram import Update
from telegram.ext import ApplicationBuilder, ContextTypes, CommandHandler, MessageHandler, filters
from dotenv import load_dotenv

BASE_DIR = Path(__file__).resolve().parent

# Load environment variables from the agent-core .env file first, then fall back to the process environment.
load_dotenv(BASE_DIR / '.env')

# Configure logging to see what the agent is doing in the terminal
logging.basicConfig(
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s',
    level=logging.INFO
)
logger = logging.getLogger(__name__)

# Get the token from the .env file
TOKEN = os.getenv('TELEGRAM_BOT_TOKEN')

if not TOKEN:
    logger.error("No Telegram Token found. Please check your .env file.")
    exit(1)

async def start(update: Update, context: ContextTypes.DEFAULT_TYPE):
    """Handles the /start command"""
    await context.bot.send_message(
        chat_id=update.effective_chat.id,
        text="PVA Bazaar Agent Online. I am ready for instructions."
    )
    logger.info(f"User {update.effective_user.username} started the agent.")

async def handle_message(update: Update, context: ContextTypes.DEFAULT_TYPE):
    """Handles all text messages. This is the 'Law' receiver."""
    user_text = update.message.text
    logger.info(f"Received Command: {user_text}")
    
    # Acknowledge receipt
    await context.bot.send_message(
        chat_id=update.effective_chat.id,
        text=f"Received: '{user_text}'. Processing..."
    )

async def handle_error(update: object, context: ContextTypes.DEFAULT_TYPE):
    logger.exception("Unhandled Telegram error", exc_info=context.error)

if __name__ == '__main__':
    logger.info("Starting PVA Agent Core...")
    
    # Build the application
    application = ApplicationBuilder().token(TOKEN).build()
    
    # Register handlers
    start_handler = CommandHandler('start', start)
    message_handler = MessageHandler(filters.TEXT & (~filters.COMMAND), handle_message)
    
    application.add_handler(start_handler)
    application.add_handler(message_handler)
    application.add_error_handler(handle_error)
    
    # Start the bot
    application.run_polling(allowed_updates=Update.ALL_TYPES)