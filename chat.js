import React, { useState, useEffect, useRef } from "react";
import io from "socket.io-client";
import axios from "axios";
import CryptoJS from "crypto-js";

const Chat = ({ token }) => {
  const [socket, setSocket] = useState(null);
  const [message, setMessage] = useState("");
  const [messages, setMessages] = useState([]);
  const [aesKey, setAesKey] = useState(null);
  const [connected, setConnected] = useState(false);
  const [status, setStatus] = useState("Disconnected");
  const [selectedFile, setSelectedFile] = useState(null);
  const [isUploading, setIsUploading] = useState(false);
  const fileInputRef = useRef(null);
  const leftMessageContainerRef = useRef(null);
  const rightMessageContainerRef = useRef(null);

  // Load old messages from localStorage on startup
  useEffect(() => {
    const storedMessages = JSON.parse(localStorage.getItem("chatMessages")) || [];
    setMessages(storedMessages);
    
    // Also load the AES key from localStorage if it exists
    const storedAesKey = localStorage.getItem("chatAesKey");
    if (storedAesKey) {
      console.log("✅ Loaded AES key from localStorage");
      setAesKey(storedAesKey);
    }
  }, []);

  // Auto-scroll to the newest message for both containers
  useEffect(() => {
    if (leftMessageContainerRef.current) {
      leftMessageContainerRef.current.scrollTop = leftMessageContainerRef.current.scrollHeight;
    }
    if (rightMessageContainerRef.current) {
      rightMessageContainerRef.current.scrollTop = rightMessageContainerRef.current.scrollHeight;
    }
  }, [messages]);

  // Initialize WebSocket connection
  useEffect(() => {
    if (!token) return;
    console.log("Attempting socket connection...");
    
    const newSocket = io("http://127.0.0.1:5000", {
      reconnection: true,
      reconnectionAttempts: 5,
      reconnectionDelay: 1000,
      query: { token }
    });

    newSocket.on("connect", () => {
      console.log("✅ Socket successfully connected!");
      setConnected(true);
      setStatus("Connected,yor messages are restored with security");
    });

    newSocket.on("disconnect", () => {
      console.log("❌ Socket disconnected");
      setConnected(false);
      setStatus("Disconnected");
    });

    newSocket.on("connect_error", (error) => {
      console.error("❌ Socket connection error:", error);
      setConnected(false);
      setStatus(Connection error: ${error.message});
    });

    newSocket.on("message", (data) => {
      console.log("📩 Received message:", data);
      
      // Check if the message contains file info
      if (data.fileInfo) {
        setMessages(prev => {
          const updatedMessages = [...prev, { user: data.user, message: "Shared a file", fileInfo: data.fileInfo }];
          localStorage.setItem("chatMessages", JSON.stringify(updatedMessages));
          return updatedMessages;
        });
        return;
      }
      
      // For text messages, we need to decrypt
      if (!aesKey) {
        console.error("🚨 AES key is missing, cannot decrypt message.");
        setStatus("Error: Missing encryption key");
        return;
      }

      try {
        const decryptedMsg = CryptoJS.AES.decrypt(data.text, aesKey).toString(CryptoJS.enc.Utf8);
        if (!decryptedMsg) {
          throw new Error("Decryption returned empty string");
        }

        setMessages(prev => {
          const updatedMessages = [...prev, { user: data.user, message: decryptedMsg }];
          localStorage.setItem("chatMessages", JSON.stringify(updatedMessages));
          return updatedMessages;
        });
      } catch (error) {
        console.error("❌ Decryption error:", error);
        setStatus("Error: Failed to decrypt message");
      }
    });

    setSocket(newSocket);
    return () => newSocket.disconnect();
  }, [token, aesKey]); // Added aesKey as dependency to ensure socket has access to it

  // Fetch chat key with retry logic
  useEffect(() => {
    const fetchChatKey = async () => {
      if (!token) return;
      
      try {
        const response = await axios.get("http://127.0.0.1:5000/get_chat_key", { 
          headers: { Authorization: Bearer ${token} } 
        });
        
        if (response.data && response.data.chat_key) {
          const newKey = response.data.chat_key;
          setAesKey(newKey);
          localStorage.setItem("chatAesKey", newKey); // Save key to localStorage
          console.log("✅ Chat key successfully fetched and set!");
        } else {
          throw new Error("Invalid key response");
        }
      } catch (error) {
        console.error("🚨 Error fetching chat key:", error);
        setStatus("Failed to get encryption key");
        setTimeout(fetchChatKey, 3000);
      }
    };
    
    // Only fetch a new key if we don't already have one
    if (!aesKey) {
      fetchChatKey();
    }
  }, [token, aesKey]);

  const sendMessage = () => {
    if (!socket || !connected) return;
    if (!message.trim()) return;
    if (!aesKey) {
      console.error("🚨 Encryption key not available!");
      setStatus("Waiting for encryption key...");
      return;
    }

    try {
      const encryptedMsg = CryptoJS.AES.encrypt(message, aesKey).toString();
      socket.emit("chat_message", { text: encryptedMsg });
      setMessages(prev => {
        const updatedMessages = [...prev, { user: "You", message }];
        localStorage.setItem("chatMessages", JSON.stringify(updatedMessages));
        return updatedMessages;
      });
      setMessage("");
    } catch (error) {
      console.error("❌ Message sending error:", error);
    }
  };

  const handleFileSelect = (e) => {
    if (e.target.files.length > 0) {
      setSelectedFile(e.target.files[0]);
    }
  };

  const uploadFile = async () => {
    if (!selectedFile || !connected || !aesKey) return;
    setIsUploading(true);
    try {
      const formData = new FormData();
      formData.append("file", selectedFile);
      const response = await axios.post("http://127.0.0.1:5000/upload", formData, {
        headers: { "Content-Type": "multipart/form-data", "Authorization": Bearer ${token} }
      });
      if (response.data && response.data.fileId) {
        const fileInfo = { id: response.data.fileId, name: selectedFile.name, url: response.data.fileUrl };
        socket.emit("chat_message", { text: "Shared a file", fileInfo });
        setMessages(prev => {
          const updatedMessages = [...prev, { user: "You", message: "Shared a file", fileInfo }];
          localStorage.setItem("chatMessages", JSON.stringify(updatedMessages));
          return updatedMessages;
        });
        setSelectedFile(null);
        fileInputRef.current.value = "";
      }
    } catch (error) {
      console.error("❌ File upload error:", error);
    } finally {
      setIsUploading(false);
    }
  };

  const downloadFile = (fileId, fileName) => {
    window.open(http://127.0.0.1:5000/download/${fileId}, '_blank');
  };

  const clearHistory = () => {
    setMessages([]);
    localStorage.removeItem("chatMessages");
    // Don't clear the AES key when clearing history
  };

  // Render the message bubble for a single side
  const renderMessageBubble = (msg, index, side) => {
    const isLeftSide = side === "left";
    const alignSelf = isLeftSide ? 
      (msg.user === "You" ? "flex-end" : "flex-start") : 
      (msg.user === "You" ? "flex-start" : "flex-end");
    
    const backgroundColor = isLeftSide ?
      (msg.user === "You" ? "#dcf8c6" : "#ffffff") :
      (msg.user === "You" ? "#ffffff" : "#dcf8c6");
    
    return (
      <div 
        key={${side}-${index}} 
        className={message ${msg.user === "You" ? "sent" : "received"}}
        style={{
          padding: "10px",
          margin: "5px 0",
          borderRadius: "10px",
          maxWidth: "80%",
          wordBreak: "break-word",
          backgroundColor: backgroundColor,
          alignSelf: alignSelf,
          border: "1px solid #ddd",
          marginLeft: alignSelf === "flex-end" ? "auto" : "0"
        }}
      >
        <div style={{ fontWeight: "bold", marginBottom: "5px" }}>{msg.user}</div>
        <div>{msg.message}</div>
        {msg.fileInfo && (
          <div 
            className="file-attachment"
            style={{
              marginTop: "10px",
              padding: "5px",
              border: "1px solid #ccc",
              borderRadius: "5px",
              backgroundColor: "#f0f0f0",
              cursor: "pointer"
            }}
            onClick={() => downloadFile(msg.fileInfo.id, msg.fileInfo.name)}
          >
            <span role="img" aria-label="file">📎</span> {msg.fileInfo.name}
            <button 
              style={{ marginLeft: "10px", padding: "2px 5px" }}
              onClick={(e) => {
                e.stopPropagation();
                downloadFile(msg.fileInfo.id, msg.fileInfo.name);
              }}
            >
              Download
            </button>
          </div>
        )}
      </div>
    );
  };

  return (
    <div className="chat-container" style={{ maxWidth: "100%", margin: "0 auto", padding: "20px" }}>
      <h2>Secure Chat {connected ? "✅" : "❌"}</h2>
      <p>Status: {status}</p>
      
      {/* Split view for messages */}
      <div style={{ display: "flex", gap: "20px", marginBottom: "20px" }}>
        {/* Left side - Messages */}
        <div style={{ flex: 1 }}>
          <h3>Your View</h3>
          <div 
            ref={leftMessageContainerRef}
            className="message-container-left" 
            style={{ 
              height: "400px", 
              overflow: "auto", 
              border: "1px solid #ccc",
              borderRadius: "5px",
              padding: "10px",
              backgroundColor: "#f9f9f9",
              display: "flex",
              flexDirection: "column"
            }}
          >
            {messages.length > 0 ? (
              messages.map((msg, index) => renderMessageBubble(msg, index, "left"))
            ) : (
              <div style={{ textAlign: "center", color: "#666", marginTop: "20px" }}>
                No messages yet
              </div>
            )}
          </div>
        </div>
        
        {/* Right side - Messages (reversed colors) */}
        <div style={{ flex: 1 }}>
          <h3>Other View</h3>
          <div 
            ref={rightMessageContainerRef}
            className="message-container-right" 
            style={{ 
              height: "400px", 
              overflow: "auto", 
              border: "1px solid #ccc",
              borderRadius: "5px",
              padding: "10px",
              backgroundColor: "#f9f9f9",
              display: "flex",
              flexDirection: "column"
            }}
          >
            {messages.length > 0 ? (
              messages.map((msg, index) => renderMessageBubble(msg, index, "right"))
            ) : (
              <div style={{ textAlign: "center", color: "#666", marginTop: "20px" }}>
                No messages yet
              </div>
            )}
          </div>
        </div>
      </div>

      {/* File upload controls */}
      <div style={{ display: "flex", marginBottom: "10px", alignItems: "center" }}>
        <input 
          type="file" 
          ref={fileInputRef} 
          onChange={handleFileSelect} 
          style={{ marginRight: "10px" }}
        />
        <button 
          onClick={uploadFile} 
          disabled={!selectedFile || isUploading}
          style={{ padding: "5px 10px" }}
        >
          {isUploading ? "Uploading..." : "Upload"}
        </button>
        {selectedFile && (
          <span style={{ marginLeft: "10px" }}>
            Selected: {selectedFile.name}
          </span>
        )}
      </div>

      {/* Message input */}
      <div style={{ display: "flex" }}>
        <input 
          type="text" 
          value={message} 
          onChange={(e) => setMessage(e.target.value)}
          onKeyPress={(e) => e.key === 'Enter' && sendMessage()}
          placeholder="Type a message..." 
          style={{ flexGrow: 1, padding: "10px", borderRadius: "5px", border: "1px solid #ccc" }}
        />
        <button 
          onClick={sendMessage}
          style={{ 
            marginLeft: "10px", 
            padding: "10px 20px", 
            backgroundColor: "#4CAF50", 
            color: "white", 
            border: "none", 
            borderRadius: "5px",
            cursor: "pointer"
          }}
        >
          Send
        </button>
      </div>
      
      <div style={{ marginTop: "10px", textAlign: "right" }}>
        <button
          onClick={clearHistory}
          style={{
            padding: "5px 10px",
            backgroundColor: "#f44336",
            color: "white",
            border: "none",
            borderRadius: "5px",
            cursor: "pointer"
          }}
        >
          Clear History
        </button>
      </div>
    </div>
  );
};

export default Chat;