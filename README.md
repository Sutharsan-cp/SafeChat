# SafeChat Application

## Overview

Secure Chat is an end-to-end encrypted messaging platform that ensures private and secure communication. The application employs AES-256 encryption for messages, guaranteeing confidentiality. Messages are encrypted before transmission and only decrypted at the recipient's end.

## Features

- **End-to-End Encryption (E2EE)**: Messages are encrypted using AES-256 before leaving your device.
- **Session-Based Encryption**: A unique AES key is generated for each session to enhance security.
- **JWT Authentication**: Secure login and user authentication with JSON Web Tokens (JWT).
- **Secure File Transfers**: Files are encrypted and shared securely with unique session-based keys.
- **Local Message Storage**: Messages are stored only in your local storage, ensuring privacy.

## Technologies Used

- **Frontend**: React.js
- **Backend**: Flask, Flask-SocketIO
- **Database**: Local JSON file for file tracking
- **Authentication**: JWT (JSON Web Tokens)
- **Encryption**: AES-256 via CryptoJS

## Getting Started

### Prerequisites

- Node.js and npm (for the frontend)
- Python 3.x (for the backend)
- Flask and required libraries (see requirements below)

### Installation

1. **Clone the repository**:

   ```bash
   git clone https://github.com/yourusername/secure-chat.git
   cd secure-chat

2. **Set up the backend**:

   - Navigate to the backend directory and install the required packages:
   ```bash
   cd backend
   pip install -r requirements.txt

  - Start the Flask server:
    ```bash
    python app.py
    
3. **Set up the frontend**:
   
   -Navigate to the frontend directory and install the required packages:
   ```bash
   cd frontend
   npm install

   -Start the React application:
   ```bash
   npm start

4. **Access the application**:
   -Open your browser and go to http://localhost:3000 to access the Secure Chat application.

# Usage

## Login
Use the credentials:

- **Username**: `user1`
- **Password**: `password123`

## Chat
Once logged in, you can send and receive messages securely. You can also upload and download files.

## Clear History
You can clear your chat history using the provided button in the chat interface.

# API Endpoints

- **POST /login**: Authenticate user and return a JWT token.
- **GET /get_chat_key**: Retrieve a unique chat key for the session.
- **POST /upload**: Upload a file securely.
- **GET /download/<file_id>**: Download a file using its ID.

# Contributing

Contributions are welcome! Please feel free to submit a pull request or open an issue for any suggestions or improvements.

# License

This project is licensed under the MIT License - see the LICENSE file for details.

# Acknowledgments

- **Flask** - The web framework used for the backend.
- **React** - The JavaScript library for building user interfaces.
- **Socket.IO** - For real-time communication.
- **CryptoJS** - For encryption and decryption.
