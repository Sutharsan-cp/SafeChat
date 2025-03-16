from flask import Flask, request, jsonify, send_from_directory
from flask_jwt_extended import JWTManager, create_access_token, jwt_required, get_jwt_identity
from flask_socketio import SocketIO, emit, disconnect
import os
import logging
from flask_cors import CORS
from werkzeug.utils import secure_filename
import uuid
import json

# Configure logging
logging.basicConfig(level=logging.DEBUG)
logger = logging.getLogger(_name_)

app = Flask(_name_)
# Enable CORS for all routes with all origins (for development)
CORS(app, resources={r"/": {"origins": ""}})

# JWT Configuration
app.config['JWT_SECRET_KEY'] = os.getenv('JWT_SECRET_KEY', 'supersecretkey')
jwt = JWTManager(app)

# File upload configuration
UPLOAD_FOLDER = os.path.join(os.getcwd(), 'uploads')
if not os.path.exists(UPLOAD_FOLDER):
    os.makedirs(UPLOAD_FOLDER)
app.config['UPLOAD_FOLDER'] = UPLOAD_FOLDER
app.config['MAX_CONTENT_LENGTH'] = 16 * 1024 * 1024  # 16MB max file size

# File tracking database
FILE_TRACKING_DB = os.path.join(os.getcwd(), 'file_tracking.json')

# SocketIO with debugging
socketio = SocketIO(app, 
                   cors_allowed_origins="*", 
                   logger=True, 
                   engineio_logger=True,
                   ping_timeout=60,
                   ping_interval=25)

# Dummy user database
users = {"user1": "password123"}

# Simple session management
active_sessions = {}
file_uploads = {}

# Load existing file uploads from database if it exists
def load_file_tracking():
    global file_uploads
    if os.path.exists(FILE_TRACKING_DB):
        try:
            with open(FILE_TRACKING_DB, 'r') as f:
                file_uploads = json.load(f)
                logger.info(f"Loaded {len(file_uploads)} file records from database")
        except Exception as e:
            logger.error(f"Error loading file tracking database: {str(e)}")
            file_uploads = {}

# Save file uploads to database
def save_file_tracking():
    try:
        with open(FILE_TRACKING_DB, 'w') as f:
            json.dump(file_uploads, f)
            logger.info(f"Saved {len(file_uploads)} file records to database")
    except Exception as e:
        logger.error(f"Error saving file tracking database: {str(e)}")

# Load existing file uploads at startup
load_file_tracking()

@app.route("/")
def home():
    return jsonify({"message": "Secure Chat API is running!"})

@app.route("/login", methods=["POST"])
def login():
    try:
        data = request.json
        username, password = data.get("username"), data.get("password")
        
        if not username or not password:
            return jsonify({"error": "Username and password required"}), 400
            
        if username in users and users[username] == password:
            # Create JWT token
            access_token = create_access_token(identity=username)
            return jsonify(access_token=access_token)
        return jsonify({"error": "Invalid credentials"}), 401
    except Exception as e:
        logger.error(f"Login error: {str(e)}")
        return jsonify({"error": "Server error during login"}), 500

@app.route("/get_chat_key", methods=["GET"])
@jwt_required()
def get_chat_key():
    try:
        username = get_jwt_identity()
        # Generate a simple session key (this would be more secure in production)
        session_key = f"session_{username}_{os.urandom(4).hex()}"
        active_sessions[username] = session_key
        return jsonify({"chat_key": session_key})
    except Exception as e:
        logger.error(f"Error generating chat key: {str(e)}")
        return jsonify({"error": "Failed to generate chat key"}), 500

@app.route("/upload", methods=["POST"])
@jwt_required()
def upload_file():
    try:
        username = get_jwt_identity()
        
        # Check if the post request has the file part
        if 'file' not in request.files:
            return jsonify({"error": "No file part"}), 400
        
        file = request.files['file']
        
        # If user does not select file, browser also
        # submit an empty part without filename
        if file.filename == '':
            return jsonify({"error": "No selected file"}), 400
        
        if file:
            # Generate a unique ID for the file
            file_id = str(uuid.uuid4())
            
            # Create a secure filename
            original_filename = secure_filename(file.filename)
            # Add the file ID to the filename to make it unique
            filename = f"{file_id}_{original_filename}"
            
            # Save the file
            file_path = os.path.join(app.config['UPLOAD_FOLDER'], filename)
            file.save(file_path)
            
            # Store the file info
            file_uploads[file_id] = {
                'filename': original_filename,
                'path': file_path,
                'uploader': username,
                'timestamp': os.path.getmtime(file_path)
            }
            
            # Save the updated file tracking database
            save_file_tracking()
            
            # Generate a URL for the file
            file_url = f"/download/{file_id}"
            
            return jsonify({
                "success": True,
                "fileId": file_id,
                "fileUrl": file_url
            })
    except Exception as e:
        logger.error(f"Error uploading file: {str(e)}")
        return jsonify({"error": f"Failed to upload file: {str(e)}"}), 500

@app.route("/download/<file_id>", methods=["GET"])
def download_file(file_id):
    try:
        # Check if the file exists
        if file_id not in file_uploads:
            return jsonify({"error": "File not found"}), 404
        
        file_info = file_uploads[file_id]
        file_path = file_info['path']
        
        # Check if the file exists on disk
        if not os.path.exists(file_path):
            return jsonify({"error": "File not found on disk"}), 404
        
        # Get the filename and directory
        filename = file_info['filename']
        directory = os.path.dirname(file_path)
        
        return send_from_directory(directory, os.path.basename(file_path), as_attachment=True, download_name=filename)
    except Exception as e:
        logger.error(f"Error downloading file: {str(e)}")
        return jsonify({"error": f"Failed to download file: {str(e)}"}), 500

@app.route("/files", methods=["GET"])
@jwt_required()
def list_files():
    """List all files available for download"""
    try:
        username = get_jwt_identity()
        
        # Get files sorted by newest first
        user_files = []
        for file_id, file_info in file_uploads.items():
            user_files.append({
                "id": file_id,
                "name": file_info["filename"],
                "uploader": file_info["uploader"],
                "timestamp": file_info.get("timestamp", 0),
                "url": f"/download/{file_id}"
            })
        
        # Sort by timestamp (newest first)
        user_files.sort(key=lambda x: x["timestamp"], reverse=True)
        
        return jsonify({
            "success": True,
            "files": user_files
        })
    except Exception as e:
        logger.error(f"Error listing files: {str(e)}")
        return jsonify({"error": f"Failed to list files: {str(e)}"}), 500

@app.route("/file-info/<file_id>", methods=["GET"])
def get_file_info(file_id):
    """Get information about a specific file"""
    try:
        if file_id not in file_uploads:
            return jsonify({"error": "File not found"}), 404
            
        file_info = file_uploads[file_id]
        
        return jsonify({
            "success": True,
            "fileInfo": {
                "id": file_id,
                "name": file_info["filename"],
                "uploader": file_info["uploader"],
                "timestamp": file_info.get("timestamp", 0),
                "url": f"/download/{file_id}"
            }
        })
    except Exception as e:
        logger.error(f"Error getting file info: {str(e)}")
        return jsonify({"error": f"Failed to get file info: {str(e)}"}), 500

@app.route("/verify-files", methods=["POST"])
@jwt_required()
def verify_files():
    """Verify that files in the history still exist"""
    try:
        file_ids = request.json.get("fileIds", [])
        results = {}
        
        for file_id in file_ids:
            if file_id in file_uploads:
                file_info = file_uploads[file_id]
                file_exists = os.path.exists(file_info["path"])
                results[file_id] = {
                    "exists": file_exists,
                    "name": file_info["filename"] if file_exists else None
                }
            else:
                results[file_id] = {"exists": False, "name": None}
        
        return jsonify({
            "success": True,
            "results": results
        })
    except Exception as e:
        logger.error(f"Error verifying files: {str(e)}")
        return jsonify({"error": f"Failed to verify files: {str(e)}"}), 500

# Socket connection handling
@socketio.on('connect')
def handle_connect():
    try:
        # Get token from query param
        token = request.args.get('token')
        
        if not token:
            logger.warning("Socket connection attempted without token")
            return False
            
        # Very basic validation - in production use proper JWT verification
        # This is just to get the basic connection working
        logger.info(f"Client connected with token: {token[:10]}...")
        return True
    except Exception as e:
        logger.error(f"Socket connection error: {str(e)}")
        return False

@socketio.on('disconnect')
def handle_disconnect():
    logger.info("Client disconnected")

@socketio.on('chat_message')
def handle_message(data):
    try:
        # In a production environment, we would properly verify the JWT token here
        # For simplicity, we're using a basic approach
        
        # Extract username from socket connection data
        token = request.args.get('token')
        # This is a simplified version - in production use proper JWT verification
        username = "user"  # Default fallback
        
        try:
            # Try to get the identity from the token
            username = get_jwt_identity() or username
        except Exception as e:
            logger.warning(f"Could not extract username from token: {str(e)}")
        
        # Check if this is a text message or a file message
        if 'fileInfo' in data:
            # This is a file message
            file_info = data.get('fileInfo')
            
            # Verify the file still exists
            file_id = file_info.get('id')
            if file_id in file_uploads and os.path.exists(file_uploads[file_id]['path']):
                logger.info(f"Broadcasting file message from {username}")
                # Broadcast to all clients
                emit('message', {
                    'user': username,
                    'text': data.get('text', 'Shared a file'),
                    'fileInfo': file_info
                }, broadcast=True)
            else:
                logger.warning(f"File {file_id} does not exist or is not registered")
                emit('error', {'message': 'File not found'})
        else:
            # This is a text message
            text = data.get('text', '')
            if not text:
                logger.warning("Received empty message")
                return
                
            logger.info(f"Broadcasting message from {username}: {text[:20]}...")
            # Broadcast to all clients
            emit('message', {'user': username, 'text': text}, broadcast=True)
    except Exception as e:
        logger.error(f"Error handling message: {str(e)}")
        emit('error', {'message': 'Failed to process message'})

if _name_ == "_main_":
    logger.info("Starting Secure Chat Server...")
    socketio.run(app, host="0.0.0.0", port=5000, debug=True, allow_unsafe_werkzeug=True)