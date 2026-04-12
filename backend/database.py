import os
from pymongo import MongoClient
from dotenv import load_dotenv

load_dotenv()

MONGO_URL = os.getenv("MONGO_URL") or \
    "mongodb+srv://nithin777:nithin777@cluster0.f3czplq.mongodb.net/?appName=Cluster0"

# TLS-safe connection — fixes SSL handshake timeout on Render/cloud environments
client = MongoClient(
    MONGO_URL,
    serverSelectionTimeoutMS=15000,
    connectTimeoutMS=15000,
    socketTimeoutMS=45000,
    maxPoolSize=10,
    minPoolSize=1,
    retryWrites=True,
    retryReads=True,
    tls=True,
    tlsAllowInvalidCertificates=False,
)

db = client["zero_trust_db"]

users_collection      = db["users"]
behavior_collection   = db["behavior_logs"]
risk_collection       = db["risk_reports"]
admin_notifications   = db["admin_notifications"]
