import React, { useState, useEffect } from "react";
import Login from "./Login";
import axios from "axios";
import Chat from "./Chat";

const App = () => {
  const [token, setToken] = useState(null);
  // No need to store public key since we're using the chat_key from get_chat_key endpoint instead

  // Remove the useEffect for fetching public key
  // We don't need this since we're getting the chat key in the Chat component

  return (
    <div>
      {!token ? (
        <Login onLogin={setToken} />
      ) : (
        <Chat token={token} />
      )}
    </div>
  );
};

export default App;