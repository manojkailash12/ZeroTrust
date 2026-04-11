import os
from pymongo import MongoClient
from dotenv import load_dotenv

# Load env variables
load_dotenv()

MONGO_URL = os.getenv("MONGO_URL")

if not MONGO_URL:
    # Fallback to hardcoded for now if env not found
    MONGO_URL = "mongodb+srv://nithin777:nithin777@cluster0.f3czplq.mongodb.net/?appName=Cluster0"

client = MongoClient(
    MONGO_URL,
    serverSelectionTimeoutMS=10000,
    connectTimeoutMS=10000,
    socketTimeoutMS=30000,
    maxPoolSize=50,
    retryWrites=True,
)

db = client["zero_trust_db"]

users_collection = db["users"]
behavior_collection = db["behavior_logs"]
risk_collection = db["risk_reports"]
admin_notifications = db["admin_notifications"]