import { useEffect, useRef, useState } from "react";
import "./MessagePanel.css";

const API_URL = "http://localhost:5000/api/messages";

export default function MessagePanel({ meetingId, user }) {
  const [messages, setMessages] = useState([]);
  const [text, setText] = useState("");
  const [loading, setLoading] = useState(false);
  const [sending, setSending] = useState(false);
  const [error, setError] = useState("");

  const bottomRef = useRef(null);

  // Load messages for selected meeting
  useEffect(() => {
    let active = true;

    async function loadMessages() {
      setLoading(true);
      setError("");
      setMessages([]);

      try {
        const token = sessionStorage.getItem("intellmeet_token");

        const response = await fetch(
          `${API_URL}/${encodeURIComponent(meetingId)}`,
          {
            headers: {
              Authorization: `Bearer ${token}`,
            },
          }
        );

        const data = await response.json();

        if (!response.ok) {
          throw new Error(data.message || "Unable to load messages");
        }

        if (active) {
          setMessages(
            Array.isArray(data) ? data : data.messages || []
          );
        }
      } catch (err) {
        if (active) setError(err.message);
      } finally {
        if (active) setLoading(false);
      }
    }

    if (meetingId) {
      loadMessages();
    } else {
      setLoading(false);
      setMessages([]);
    }

    return () => {
      active = false;
    };
  }, [meetingId]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  // Send message
  async function handleSend(event) {
    event.preventDefault();

    const cleanText = text.trim();

    if (!cleanText || sending || !meetingId) return;

    setSending(true);
    setError("");

    try {
      const token = sessionStorage.getItem("intellmeet_token");

      const savedUser = JSON.parse(
        sessionStorage.getItem("intellmeet_user") || "null"
      );

      if (!token || !savedUser) {
        throw new Error("Please login again.");
      }

      const senderId = String(
        user?._id ||
        user?.id ||
        savedUser._id ||
        savedUser.id ||
        ""
      );

      const senderName =
        user?.name ||
        user?.fullName ||
        savedUser.name ||
        savedUser.fullName ||
        savedUser.username ||
        savedUser.email ||
        "";

      if (!senderId || !senderName) {
        throw new Error(
          "User ID or name missing. Check saved login data."
        );
      }

      const response = await fetch(API_URL, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          meetingId: String(meetingId),
          senderId,
          senderName,
          text: cleanText,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || "Unable to send message");
      }

      const savedMessage = data.message || data;

      if (!savedMessage._id) {
        throw new Error("Server did not return the saved message.");
      }

      setMessages((previous) => [...previous, savedMessage]);
      setText("");
    } catch (err) {
      console.error("Message send error:", err);
      setError(err.message || "Unable to send message");
    } finally {
      setSending(false);
    }
  }

  return (
    <section className="message-panel">
      <header className="message-header">
        <div>
          <h2>Meeting Chat</h2>
          <p>
            {meetingId
              ? `Meeting ID: ${meetingId}`
              : "Select a meeting first"}
          </p>
        </div>
      </header>

      <div className="message-list">
        {loading && (
          <p className="chat-status">Loading messages...</p>
        )}

        {!loading && !error && messages.length === 0 && (
          <p className="chat-status">
            No messages yet. Start the conversation!
          </p>
        )}

        {messages.map((message) => (
          <article className="chat-message" key={message._id}>
            <div className="chat-message-top">
              <strong>
                {message.senderName ||
                  message.sender?.name ||
                  "User"}
              </strong>

              <time>
                {message.createdAt &&
                  new Date(message.createdAt).toLocaleTimeString(
                    [],
                    {
                      hour: "2-digit",
                      minute: "2-digit",
                    }
                  )}
              </time>
            </div>

            <p>{message.text}</p>
          </article>
        ))}

        <div ref={bottomRef} />
      </div>

      {error && (
        <p className="chat-error" role="alert">
          {error}
        </p>
      )}

      <form className="message-form" onSubmit={handleSend}>
        <input
          type="text"
          value={text}
          onChange={(event) => setText(event.target.value)}
          placeholder="Type a message..."
          maxLength={5000}
          aria-label="Message"
          disabled={loading || sending || !meetingId}
        />

        <button
          type="submit"
          disabled={
            loading || sending || !text.trim() || !meetingId
          }
        >
          {sending ? "Sending..." : "Send"}
        </button>
      </form>
    </section>
  );
}