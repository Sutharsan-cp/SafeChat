import React, { useState } from "react";
import axios from "axios";

const Introduction = ({ onProceed }) => {
  return (
    <div style={{ maxWidth: "600px", margin: "auto", textAlign: "center", padding: "20px", border: "1px solid #ccc", borderRadius: "5px", backgroundColor: "#f9f9f9" }}>
      <h1>Welcome to Secure Chat</h1>
      <p>
        Secure Chat is an end-to-end encrypted (E2EE) messaging platform ensuring private and secure communication.
        We employ AES-256 encryption for messages, guaranteeing confidentiality. 
        Messages are encrypted before transmission and only decrypted at the recipient's end.
      </p>
      <h3>Security Features</h3>
      <ul style={{ textAlign: "left", padding: "0 20px" }}>
        <li><strong>End-to-End Encryption (E2EE):</strong> Messages are encrypted using AES-256 before leaving your device.</li>
        <li><strong>Session-Based Encryption:</strong> A unique AES key is generated for each session to enhance security.</li>
        <li><strong>JWT Authentication:</strong> Secure login and user authentication with JSON Web Tokens (JWT).</li>
        <li><strong>Secure File Transfers:</strong> Files are encrypted and shared securely with unique session-based keys.</li>
        <li><strong>Local Message Storage:</strong> Messages are stored only in your local storage, ensuring privacy.</li>
      </ul>
      <button onClick={onProceed} style={{ padding: "10px 20px", backgroundColor: "#007bff", color: "white", border: "none", borderRadius: "4px", cursor: "pointer" }}>Proceed to Login</button>
    </div>
  );
};

const Login = ({ onLogin }) => {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState(null);
  const [showIntro, setShowIntro] = useState(true);

  const handleLogin = async (e) => {
    e.preventDefault();
    try {
      const response = await axios.post("http://127.0.0.1:5000/login", {
        username,
        password,
      }, {
        headers: { "Content-Type": "application/json" }
      });
  
      console.log("Login Response:", response.data);
  
      const token = response.data.access_token;
      localStorage.setItem("token", token);
      onLogin(token);
    } catch (err) {
      console.error("Login Error:", err.response ? err.response.data : err);
      setError("Invalid credentials");
    }
  };

  return (
    <div>
      {showIntro ? (
        <Introduction onProceed={() => setShowIntro(false)} />
      ) : (
        <div style={{ maxWidth: "300px", margin: "auto", textAlign: "center", padding: "20px", border: "1px solid #ccc", borderRadius: "5px", backgroundColor: "#f9f9f9" }}>
          <h2>Login</h2>
          {error && <p style={{ color: "red" }}>{error}</p>}
          <form onSubmit={handleLogin}>
            <input
              type="text"
              placeholder="Username"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              required
              style={{ width: "100%", padding: "8px", margin: "5px 0", borderRadius: "4px", border: "1px solid #ccc" }}
            />
            <input
              type="password"
              placeholder="Password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              style={{ width: "100%", padding: "8px", margin: "5px 0", borderRadius: "4px", border: "1px solid #ccc" }}
            />
            <button type="submit" style={{ width: "100%", padding: "10px", backgroundColor: "#28a745", color: "white", border: "none", borderRadius: "4px", cursor: "pointer" }}>Login</button>
          </form>
          <p style={{ marginTop: "10px", fontSize: "14px", color: "#555" }}>
            For simplicity, login with <strong>user: user1</strong> and <strong>password: password123</strong>
          </p>
        </div>
      )}
    </div>
  );
};

export default Login;