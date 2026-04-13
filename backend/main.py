from fastapi.staticfiles import StaticFiles
from fastapi.responses import FileResponse
import os
from fastapi import FastAPI, HTTPException, Depends, Request
from fastapi.middleware.cors import CORSMiddleware
from passlib.context import CryptContext
from pydantic import BaseModel
from datetime import datetime, timezone, timedelta
from bson import ObjectId
import uuid
import random
import numpy as np
from dotenv import load_dotenv
import logging
import traceback
from jose import JWTError, jwt
from fastapi.security import OAuth2PasswordBearer

from sklearn.ensemble import IsolationForest
from sklearn.feature_extraction.text import TfidfVectorizer
from sklearn.metrics.pairwise import cosine_similarity

from database import (
    users_collection,
    behavior_collection,
    risk_collection,
    admin_notifications
)

from email_service import send_email

# ================= LOAD ENV =================
load_dotenv()

# ================= LOGGING =================
logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [%(levelname)s] %(name)s: %(message)s",
    handlers=[logging.StreamHandler()]
)
logger = logging.getLogger("zero_trust_api")

# ================= SECURITY CONFIG =================
SECRET_KEY = os.getenv("JWT_SECRET_KEY", "super-secret-production-key-change-me")
ALGORITHM = "HS256"
ACCESS_TOKEN_EXPIRE_MINUTES = 60
PROD_MODE = os.getenv("RENDER", "false").lower() == "true"

# ================= TIMEZONE =================
IST = timezone(timedelta(hours=5, minutes=30))

# ================= APP =================
app = FastAPI(
    title="AI-Based Zero Trust Security System",
    docs_url="/docs" if not PROD_MODE else None,
    redoc_url="/redoc" if not PROD_MODE else None
)

ADMIN_EMAIL = os.getenv("ADMIN_EMAIL", "libroflow8@gmail.com")
FRONTEND_BASE = os.getenv("FRONTEND_URL", "https://zero-trust-security-zqun.onrender.com")

FRONTEND_ORIGIN = os.getenv("FRONTEND_URL", "*")

app.add_middleware(
    CORSMiddleware,
    allow_origins=[FRONTEND_ORIGIN] if FRONTEND_ORIGIN != "*" else ["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

oauth2_scheme = OAuth2PasswordBearer(tokenUrl="login")

def create_access_token(data: dict, expires_delta: timedelta = None):
    to_encode = data.copy()
    if expires_delta:
        expire = datetime.now(timezone.utc) + expires_delta
    else:
        expire = datetime.now(timezone.utc) + timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES)
    to_encode.update({"exp": expire})
    encoded_jwt = jwt.encode(to_encode, SECRET_KEY, algorithm=ALGORITHM)
    return encoded_jwt

async def get_current_user(token: str = Depends(oauth2_scheme)):
    credentials_exception = HTTPException(
        status_code=401,
        detail="Could not validate credentials",
        headers={"WWW-Authenticate": "Bearer"},
    )
    try:
        payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
        username: str = payload.get("sub")
        if username is None:
            raise credentials_exception
    except JWTError:
        raise credentials_exception
    
    user = users_collection.find_one({"username": username})
    if user is None:
        raise credentials_exception
    return user

# ================= STARTUP =================
@app.on_event("startup")
async def startup_db_client():
    try:
        # Pre-warm the MongoDB connection so first request is fast
        client.admin.command('ping')
        users_collection.create_index("username", unique=True)
        users_collection.create_index("email", unique=True)
        behavior_collection.create_index([("user_id", 1), ("timestamp", -1)])
        risk_collection.create_index([("user_id", 1), ("timestamp", -1)])
        logger.info("✅ Database connected and indexes verified.")
    except Exception as e:
        logger.warning(f"Startup DB warning: {e}")

from fastapi.responses import JSONResponse
import traceback

@app.exception_handler(Exception)
async def global_exception_handler(request, exc):
    logger.error(f"🚨 GLOBAL ERROR: {str(exc)}")
    logger.error(traceback.format_exc())
    return JSONResponse(
        status_code=500,
        content={"detail": f"Internal Server Error: {str(exc)}"}
    )

pwd = CryptContext(schemes=["bcrypt"], deprecated="auto")

# ================= PING (keepalive / health check) =================
@app.get("/ping")
async def ping():
    return {"status": "ok"}

# ================= GET BLOCKED EMAIL (for login key flow) =================
@app.post("/get-blocked-email")
async def get_blocked_email(data: GetBlockedEmailRequest):
    user = users_collection.find_one({"username": data.username})
    if not user or user.get("status") != "blocked":
        raise HTTPException(404, "Blocked user not found")
    # Return masked email for display, full email for API use
    email = user["email"]
    parts = email.split("@")
    masked = parts[0][:2] + "***@" + parts[1] if len(parts) == 2 else email
    return {"email": email, "masked_email": masked}

# Frontend is served at / by the catch-all route at the bottom

# ================= MODELS =================

class RegisterRequest(BaseModel):
    username: str
    password: str
    email: str
    mobile: str

class LoginRequest(BaseModel):
    username: str
    password: str

class BehaviorRequest(BaseModel):
    user_id: str
    location: str
    device: str
    access_speed: float
    browser: str = ""
    ip: str = ""

class VerifyRequest(BaseModel):
    token: str

class ForgotPasswordRequest(BaseModel):
    email: str

class ResetPasswordRequest(BaseModel):
    email: str
    otp: str
    new_password: str

class UnblockRequestModel(BaseModel):
    email: str
    reason: str = ""

class GetBlockedEmailRequest(BaseModel):
    username: str

class AdminSendKeyRequest(BaseModel):
    username: str
    key: str

class VerifyUnblockKeyRequest(BaseModel):
    email: str
    key: str

class ChangePasswordRequest(BaseModel):
    old_password: str
    new_password: str

class UpdateProfileRequest(BaseModel):
    email: str = None
    mobile: str = None

# ================= ADMIN CREATE (setup endpoint) =================

@app.post("/register")
async def register(data: RegisterRequest):
    try:
        if users_collection.find_one({"username": data.username}):
            raise HTTPException(400, "Username already exists")

        if users_collection.find_one({"email": data.email}):
            raise HTTPException(400, "Email already in use")

        # Generate a 6-digit OTP for registration verification
        otp = str(random.randint(100000, 999999))
        logger.info(f"Generated OTP for user {data.username}")

        user_data = {
            "username": data.username,
            "password": pwd.hash(data.password),
            "email": data.email,
            "mobile": data.mobile,
            "role": "user",
            "status": "pending",
            "verify_token": otp,
            "created_at": datetime.now(IST)
        }

        logger.info(f"Attempting to insert user {data.username} into database")
        users_collection.insert_one(user_data)
        logger.info(f"Successfully inserted user {data.username}")

        # Send OTP via EmailJS
        logger.info(f"Attempting to send email to {data.email}")
        send_email(
            data.email,
            "Verify Your Account",
            "Welcome to the Zero Trust Security System! Please use the following One-Time Password (OTP) to complete your verification process.",
            otp=otp
        )
        logger.info(f"send_email call completed")

        return {"message": "OTP sent to your email. Please verify."}
    except HTTPException as he:
        raise he
    except Exception as e:
        logger.error(f"❌ REGISTRATION ERROR: {str(e)}")
        logger.error(traceback.format_exc())
        raise HTTPException(500, f"Registration failed: {str(e)}")

# ================= LOGIN =================

@app.post("/login")
async def login(data: LoginRequest):
    try:
        logger.info(f"Login attempt for username: {data.username}")
        user = users_collection.find_one({"username": data.username})

        if not user:
            logger.warning(f"User '{data.username}' not found")
            raise HTTPException(401, "Invalid credentials")

        if not pwd.verify(data.password, user["password"]):
            logger.warning(f"Password verification failed for '{data.username}'")
            raise HTTPException(401, "Invalid credentials")

        if user.get("status") == "blocked":
            logger.warning(f"User '{data.username}' is blocked")
            raise HTTPException(403, "Account blocked")

        if user.get("status") == "pending":
            logger.warning(f"User '{data.username}' has not verified their account")
            raise HTTPException(403, "Account not verified. Please check your email for the OTP.")

        access_token = create_access_token(data={"sub": user["username"]})

        # Send login notification email with change password link
        try:
            change_pwd_link = f"{FRONTEND_BASE}/change-password"
            send_email(
                user["email"],
                "New Login Detected – Zero Trust Security",
                f"Hello {user['username']},\n\nA new login was detected on your account at {datetime.now(IST).strftime('%d-%m-%Y %H:%M:%S')} IST.\n\nIf this was not you, please contact the administrator immediately.",
                link=change_pwd_link,
                link_label="Change Password"
            )
        except Exception as mail_err:
            logger.warning(f"Login email notification failed: {mail_err}")

        force_password_change = user.get("force_password_change", False)

        logger.info(f"Login successful for user '{data.username}'")
        return {
            "access_token": access_token,
            "token_type": "bearer",
            "user_id": str(user["_id"]),
            "role": user["role"],
            "username": user["username"],
            "email": user["email"],
            "mobile": user.get("mobile", ""),
            "status": user["status"],
            "force_password_change": force_password_change,
            "message": "Login successful"
        }
    except HTTPException as he:
        raise he
    except Exception as e:
        logger.error(f"❌ LOGIN ERROR: {str(e)}")
        logger.error(traceback.format_exc())
        raise HTTPException(500, f"Login failed: {str(e)}")

# ================= LOG BEHAVIOR =================

def get_location_from_ip(ip: str) -> str:
    """Resolve approximate city/country from IP using free ip-api.com"""
    try:
        if ip in ("127.0.0.1", "::1", "localhost"):
            return "Local"
        r = requests.get(f"http://ip-api.com/json/{ip}?fields=city,country,status", timeout=2)
        data = r.json()
        if data.get("status") == "success":
            return f"{data.get('city', '')}, {data.get('country', '')}".strip(", ")
    except Exception:
        pass
    return "Unknown"

@app.post("/log-behavior")
async def log_behavior(data: BehaviorRequest, request: Request, current_user: dict = Depends(get_current_user)):
    # Get real client IP (handle proxies/Render)
    forwarded = request.headers.get("X-Forwarded-For")
    ip = forwarded.split(",")[0].strip() if forwarded else request.client.host

    # Use frontend-provided location if available, otherwise fall back to IP lookup
    location = data.location
    if not location or location.strip() == '':
        location = get_location_from_ip(ip)

    behavior_collection.insert_one({
        "user_id":      data.user_id,
        "username":     current_user["username"],
        "location":     location,
        "device":       data.device,
        "browser":      data.browser,
        "ip":           ip,
        "access_speed": data.access_speed,
        "timestamp":    datetime.now(IST)
    })
    return {"message": "Behavior logged", "location": location, "ip": ip}

# ================= ANALYZE RISK =================

@app.post("/analyze-risk/{user_id}")
async def analyze_risk(user_id: str, current_user: dict = Depends(get_current_user)):
    logs = list(behavior_collection.find({"user_id": user_id}).sort("timestamp", -1).limit(20))

    if len(logs) < 3:
        # Still save Low risk to DB so reports show activity
        user = users_collection.find_one({"_id": ObjectId(user_id)})
        if user:
            risk_collection.insert_one({
                "user_id": user_id,
                "username": user["username"],
                "risk_score": 20,
                "risk_level": "Low",
                "timestamp": datetime.now(IST)
            })
        return {"risk_level": "Low", "risk_score": 20, "action": "Allowed"}

    speeds = np.array([[l["access_speed"]] for l in logs])

    # Use a low contamination so normal browsing speeds don't get flagged
    # IsolationForest needs enough variance to detect real anomalies
    speed_std = float(np.std(speeds))
    speed_mean = float(np.mean(speeds))

    # If all speeds are very similar (std < 0.5), it's normal behavior — skip anomaly detection
    if speed_std < 0.5:
        anomaly_ratio = 0.0
    else:
        anomaly_labels = list(
            IsolationForest(contamination=0.05, random_state=42)
            .fit_predict(speeds)
        )
        anomaly_count = anomaly_labels.count(-1)
        anomaly_ratio = anomaly_count / len(logs)

    texts = [f'{l["location"]} {l["device"]}' for l in logs]
    tfidf = TfidfVectorizer().fit_transform(texts)
    similarity = cosine_similarity(tfidf[-1:], tfidf[:-1]).mean()

    user = users_collection.find_one({"_id": ObjectId(user_id)})

    # High risk: needs BOTH high anomaly ratio AND low similarity
    # Raised thresholds to avoid false positives from normal usage
    if anomaly_ratio >= 0.5 and similarity < 0.2:
        risk_score = random.randint(80, 95)

        risk_collection.insert_one({
            "user_id": user_id,
            "username": user["username"],
            "risk_score": risk_score,
            "risk_level": "High",
            "timestamp": datetime.now(IST)
        })

        if user["status"] != "blocked":
            token = str(uuid.uuid4())

            users_collection.update_one(
                {"_id": ObjectId(user_id)},
                {"$set": {
                    "status": "blocked",
                    "verify_token": token,
                    "blocked_at": datetime.now(IST)
                }}
            )

            admin_notifications.insert_one({
                "user_id": user_id,
                "username": user["username"],
                "risk_level": "High",
                "message": "User blocked – verification required",
                "timestamp": datetime.now(IST)
            })

            send_email(
                user["email"],
                "Zero Trust Alert – Account Blocked",
                f"Hello {user['username']},\n\nYour account has been blocked due to suspicious activity detected by our AI security system.\n\nRisk Score: {risk_score}/100\n\nTo regain access, please submit an unblock request or contact the administrator.",
            )

        return {"risk_level": "High", "risk_score": risk_score, "action": "Blocked"}

    # Medium risk: moderate anomaly ratio AND some similarity drop (avoid false positives)
    if anomaly_ratio >= 0.3 and similarity < 0.6:
        risk_score = random.randint(40, 65)
        risk_collection.insert_one({
            "user_id": user_id,
            "username": user["username"],
            "risk_score": risk_score,
            "risk_level": "Medium",
            "timestamp": datetime.now(IST)
        })
        return {"risk_level": "Medium", "risk_score": risk_score, "action": "Restricted"}

    # Low risk — normal behavior
    risk_score = random.randint(10, 35)
    risk_collection.insert_one({
        "user_id": user_id,
        "username": user["username"],
        "risk_score": risk_score,
        "risk_level": "Low",
        "timestamp": datetime.now(IST)
    })
    return {"risk_level": "Low", "risk_score": risk_score, "action": "Allowed"}

# ================= VERIFY USER =================

@app.post("/verify-user")
async def verify_user(data: VerifyRequest):
    user = users_collection.find_one({"verify_token": data.token})

    if not user:
        raise HTTPException(400, "Invalid or expired OTP")

    users_collection.update_one(
        {"_id": user["_id"]},
        {"$set": {"status": "active"},
         "$unset": {"verify_token": "", "blocked_at": ""}}
    )

    admin_notifications.delete_many({"username": user["username"]})
    # Keep behavior and risk history for audit trail

    access_token = create_access_token(data={"sub": user["username"]})

    return {
        "access_token": access_token,
        "token_type": "bearer",
        "user_id": str(user["_id"]),
        "role": user["role"],
        "message": "Account verified successfully"
    }

# ================= ADMIN UNBLOCK =================

@app.post("/admin/unblock/{username}")
async def admin_unblock(username: str, current_user: dict = Depends(get_current_user)):
    # Verify admin role
    if current_user.get("role") != "admin":
        raise HTTPException(403, "Admin access required")
    user = users_collection.find_one({"username": username})

    if not user:
        raise HTTPException(404, "User not found")

    users_collection.update_one(
        {"_id": user["_id"]},
        {"$set": {"status": "active", "force_password_change": True},
         "$unset": {"verify_token": "", "blocked_at": ""}}
    )

    admin_notifications.delete_many({"username": username})
    # Keep behavior and risk history for audit trail

    # Notify user via email
    try:
        send_email(
            user["email"],
            "Account Unblocked – Zero Trust Security",
            f"Hello {username},\n\nYour account has been unblocked by the administrator. You can now log in.\n\nFor security reasons, you will be required to change your password upon next login."
        )
    except Exception as mail_err:
        logger.warning(f"Unblock email failed: {mail_err}")

    return {"message": "User unblocked"}

# ================= FORGOT / RESET PASSWORD =================

@app.post("/forgot-password")
async def forgot_password(data: ForgotPasswordRequest):
    user = users_collection.find_one({"email": data.email})
    if not user:
        logger.warning(f"Forgot password attempt for non-existent email: {data.email}")
        raise HTTPException(404, "User not found")

    otp = str(random.randint(100000, 999999))
    expiry = datetime.now(IST) + timedelta(minutes=10)

    users_collection.update_one(
        {"email": data.email},
        {"$set": {"otp": otp, "otp_expiry": expiry}}
    )

    logger.info(f"Sending password reset OTP to {data.email}")
    send_email(
        data.email,
        "Password Reset OTP",
        "You requested a password reset. Please use the following One-Time Password (OTP) to reset your password. This OTP will expire in 10 minutes.",
        otp=otp
    )

    return {"message": "OTP sent to your email"}

@app.post("/reset-password")
async def reset_password(data: ResetPasswordRequest):
    user = users_collection.find_one({
        "email": data.email,
        "otp": data.otp
    })

    if not user:
        logger.warning(f"Invalid OTP attempt for {data.email}")
        raise HTTPException(400, "Invalid OTP or email")

    if datetime.now(IST) > user.get("otp_expiry", datetime.min.replace(tzinfo=IST)):
        logger.warning(f"Expired OTP attempt for {data.email}")
        raise HTTPException(400, "OTP has expired")

    users_collection.update_one(
        {"email": data.email},
        {"$set": {"password": pwd.hash(data.new_password)},
         "$unset": {"otp": "", "otp_expiry": ""}}
    )

    logger.info(f"Password reset successful for {data.email}")
    return {"message": "Password reset successful"}


@app.get("/admin/notifications")
async def get_notifications(current_user: dict = Depends(get_current_user)):
    if current_user.get("role") != "admin":
        raise HTTPException(403, "Admin access required")
    return list(admin_notifications.find({}, {"_id": 0}).sort("timestamp", -1))

@app.get("/admin/risk-reports")
async def get_risk_reports(current_user: dict = Depends(get_current_user)):
    if current_user.get("role") != "admin":
        raise HTTPException(403, "Admin access required")
    reports = list(risk_collection.find({}, {"_id": 0}).sort("timestamp", -1))
    # Ensure timestamps have IST timezone info for correct frontend display
    for r in reports:
        if "timestamp" in r and r["timestamp"] is not None:
            ts = r["timestamp"]
            if ts.tzinfo is None:
                ts = ts.replace(tzinfo=IST)
            r["timestamp"] = ts.isoformat()
    return reports

@app.get("/admin/users")
async def get_all_users(current_user: dict = Depends(get_current_user)):
    if current_user.get("role") != "admin":
        raise HTTPException(403, "Admin access required")
    users = list(users_collection.find({}, {"password": 0, "verify_token": 0}))
    for u in users:
        u["_id"] = str(u["_id"])
    return users

# ================= LIVE USER SESSIONS (Admin monitoring) =================

@app.get("/admin/live-sessions")
async def get_live_sessions(current_user: dict = Depends(get_current_user)):
    if current_user.get("role") != "admin":
        raise HTTPException(403, "Admin access required")
    pipeline = [
        {"$sort": {"timestamp": -1}},
        {"$group": {
            "_id": "$user_id",
            "username": {"$first": "$username"},
            "location": {"$first": "$location"},
            "device": {"$first": "$device"},
            "browser": {"$first": "$browser"},
            "ip": {"$first": "$ip"},
            "access_speed": {"$first": "$access_speed"},
            "last_seen": {"$first": "$timestamp"}
        }}
    ]
    sessions = list(behavior_collection.aggregate(pipeline))
    result = []
    for s in sessions:
        user = users_collection.find_one({"_id": ObjectId(s["_id"])}) if s["_id"] else None
        latest_risk = risk_collection.find_one({"user_id": s["_id"]}, sort=[("timestamp", -1)])
        # Convert last_seen to ISO string with UTC offset so frontend shows correct time
        last_seen = s.get("last_seen")
        if last_seen and last_seen.tzinfo is None:
            last_seen = last_seen.replace(tzinfo=IST)
        result.append({
            "user_id": s["_id"],
            "username": s.get("username", ""),
            "location": s.get("location", ""),
            "device": s.get("device", ""),
            "browser": s.get("browser", ""),
            "ip": s.get("ip", ""),
            "access_speed": s.get("access_speed", 0),
            "last_seen": last_seen.isoformat() if last_seen else None,
            "status": user["status"] if user else "unknown",
            "risk_score": latest_risk["risk_score"] if latest_risk else 0,
            "risk_level": latest_risk["risk_level"] if latest_risk else "Low",
        })
    return result

# ================= ADMIN SEND UNBLOCK KEY =================

@app.post("/admin/send-unblock-key/{username}")
async def send_unblock_key(username: str, current_user: dict = Depends(get_current_user)):
    if current_user.get("role") != "admin":
        raise HTTPException(403, "Admin access required")
    user = users_collection.find_one({"username": username})
    if not user:
        raise HTTPException(404, "User not found")

    key = str(random.randint(100000, 999999))
    users_collection.update_one(
        {"username": username},
        {"$set": {"unblock_key": key, "unblock_key_expiry": datetime.now(IST) + timedelta(hours=1)}}
    )

    try:
        send_email(
            user["email"],
            "Your Unblock Key – Zero Trust Security",
            f"Hello {username},\n\nThe administrator has reviewed your request and issued an unblock key.\n\nPlease use this key to unblock your account:",
            otp=key
        )
    except Exception as e:
        logger.warning(f"Unblock key email failed: {e}")

    return {"message": f"Unblock key sent to {user['email']}"}

# ================= USER VERIFY UNBLOCK KEY =================

@app.post("/verify-unblock-key")
async def verify_unblock_key(data: VerifyUnblockKeyRequest):
    user = users_collection.find_one({"email": data.email})
    if not user:
        raise HTTPException(404, "No account found with that email")
    if user.get("unblock_key") != data.key:
        raise HTTPException(400, "Invalid unblock key")
    if datetime.now(IST) > user.get("unblock_key_expiry", datetime.min.replace(tzinfo=IST)):
        raise HTTPException(400, "Unblock key has expired")

    users_collection.update_one(
        {"email": data.email},
        {"$set": {"status": "active", "force_password_change": True},
         "$unset": {"unblock_key": "", "unblock_key_expiry": "", "blocked_at": ""}}
    )
    admin_notifications.delete_many({"username": user["username"]})

    access_token = create_access_token(data={"sub": user["username"]})
    return {
        "access_token": access_token,
        "token_type": "bearer",
        "user_id": str(user["_id"]),
        "role": user["role"],
        "username": user["username"],
        "email": user["email"],
        "mobile": user.get("mobile", ""),
        "status": "active",
        "force_password_change": True,
        "message": "Account unblocked. Please change your password."
    }

# ================= UNBLOCK REQUEST =================

@app.post("/request-unblock")
async def request_unblock(data: UnblockRequestModel):
    user = users_collection.find_one({"email": data.email})
    if not user:
        raise HTTPException(404, "No account found with that email")
    if user.get("status") != "blocked":
        raise HTTPException(400, "Account is not blocked")

    username = user["username"]

    # Generate and store unblock key immediately — no admin approval needed
    key = str(random.randint(100000, 999999))
    users_collection.update_one(
        {"email": data.email},
        {"$set": {"unblock_key": key, "unblock_key_expiry": datetime.now(IST) + timedelta(hours=1)}}
    )

    # Store request in notifications for admin visibility
    admin_notifications.update_one(
        {"username": username},
        {"$set": {
            "unblock_requested": True,
            "unblock_reason": data.reason or "No reason provided",
            "unblock_requested_at": datetime.now(IST)
        }},
        upsert=True
    )

    # Send key directly to user's email
    try:
        send_email(
            data.email,
            "Your Unblock Key – Zero Trust Security",
            f"Hello {username},\n\nYour unblock key has been generated. Use it to restore access to your account:",
            otp=key
        )
    except Exception as mail_err:
        logger.warning(f"Unblock key email failed: {mail_err}")

    # Also notify admin
    try:
        admin_email = os.getenv("ADMIN_EMAIL", "libroflow8@gmail.com")
        send_email(
            admin_email,
            f"Unblock Request from {username}",
            f"User '{username}' ({data.email}) has requested to unblock their account.\n\nReason: {data.reason or 'No reason provided'}\n\nAn unblock key has been sent to the user automatically.",
            link=f"{FRONTEND_BASE}/admin",
            link_label="Go to Admin Dashboard"
        )
    except Exception as mail_err:
        logger.warning(f"Admin notification email failed: {mail_err}")

    return {"message": "Unblock key sent to your email. Please check your inbox."}

# ================= CHANGE PASSWORD =================

@app.post("/change-password")
async def change_password(data: ChangePasswordRequest, current_user: dict = Depends(get_current_user)):
    if not pwd.verify(data.old_password, current_user["password"]):
        raise HTTPException(400, "Current password is incorrect")

    users_collection.update_one(
        {"_id": current_user["_id"]},
        {"$set": {"password": pwd.hash(data.new_password)},
         "$unset": {"force_password_change": ""}}
    )
    return {"message": "Password changed successfully"}

# ================= USER PROFILE =================

@app.get("/profile")
async def get_profile(current_user: dict = Depends(get_current_user)):
    user = dict(current_user)
    user["_id"] = str(user["_id"])
    user.pop("password", None)
    user.pop("verify_token", None)
    user.pop("otp", None)
    return user

@app.put("/profile")
async def update_profile(data: UpdateProfileRequest, current_user: dict = Depends(get_current_user)):
    updates = {}
    if data.email:
        updates["email"] = data.email
    if data.mobile:
        updates["mobile"] = data.mobile
    if updates:
        users_collection.update_one({"_id": current_user["_id"]}, {"$set": updates})
    return {"message": "Profile updated"}

# ================= ADMIN UPDATE USER =================

@app.put("/admin/users/{username}")
async def admin_update_user(username: str, data: UpdateProfileRequest, current_user: dict = Depends(get_current_user)):
    if current_user.get("role") != "admin":
        raise HTTPException(403, "Admin access required")
    user = users_collection.find_one({"username": username})
    if not user:
        raise HTTPException(404, "User not found")
    updates = {}
    if data.email:
        updates["email"] = data.email
    if data.mobile:
        updates["mobile"] = data.mobile
    if updates:
        users_collection.update_one({"username": username}, {"$set": updates})
    return {"message": "User updated"}

# ================= DB CHECK =================

@app.get("/db-check")
async def db_check():
    try:
        from database import client, MONGO_URL
        # Mask the password in MONGO_URL for security
        masked_url = "URL Hidden"
        if MONGO_URL:
            host_part = MONGO_URL.split("@")[-1] if "@" in MONGO_URL else "Unknown"
            masked_url = f"mongodb+srv://***:***@{host_part}"
            
        client.admin.command('ping')
        count = users_collection.count_documents({})
        return {
            "status": "connected",
            "database": "Atlas",
            "host": client.address,
            "url_detected": masked_url,
            "user_count": count,
            "message": "Database is reachable and responding."
        }
    except Exception as e:
        from database import MONGO_URL
        host_part = MONGO_URL.split("@")[-1] if MONGO_URL and "@" in MONGO_URL else "Unknown"
        return {
            "status": "error",
            "url_detected": f"mongodb+srv://***:***@{host_part}",
            "message": str(e)
        }

# ================= SERVE FRONTEND =================

frontend_path = os.path.join(os.path.dirname(__file__), "../frontend/dist")

if os.path.exists(frontend_path):
    app.mount("/assets", StaticFiles(directory=f"{frontend_path}/assets"), name="assets")

    @app.get("/{full_path:path}")
    async def serve_react_app(full_path: str):
        index_file = os.path.join(frontend_path, "index.html")
        return FileResponse(index_file)

# No startup events currently needed