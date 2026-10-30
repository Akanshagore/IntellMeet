
import { useState } from "react";

const API_URL =
  import.meta.env.VITE_API_URL || "http://localhost:5000/api";

export default function Summary() {
  const [transcript, setTranscript] = useState("");
  const [summary, setSummary] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  async function generateSummary(event) {
    event.preventDefault();

    if (!transcript.trim()) {
      setError("Please enter the meeting transcript.");
      return;
    }

    const token = sessionStorage.getItem("intellmeet_token");

    if (!token) {
      setError("Please login before generating a summary.");
      return;
    }

    setLoading(true);
    setError("");
    setSummary("");

    try {
      const response = await fetch(`${API_URL}/summary`, {
  method: "POST",
  headers: {
    "Content-Type": "application/json",
    Authorization: `Bearer ${token}`,
  },
  body: JSON.stringify({ transcript }),
});

const responseText = await response.text();

let data;

try {
  data = JSON.parse(responseText);
} catch {
  console.error("Invalid server response:", responseText);

  throw new Error(
    `Server returned invalid data (HTTP ${response.status}). Check the backend URL and route.`
  );
}



if (!response.ok || !data.success) {
  throw new Error(data.message || "Summary generation failed.");
}

setSummary(data.summary);
    } catch (err) {
  console.error("Summary Error:", err);
  setError(err.message || "Unable to connect to the server.");
  } finally {
  setLoading(false);
  }
  }

  return (
    <main style={styles.page}>
      <section style={styles.card}>
        <h1>✨ AI Meeting Summary</h1>
        <p style={styles.subtitle}>
          Generate meeting summaries, decisions and action items using AI.
        </p>

        <form onSubmit={generateSummary}>
          <label htmlFor="transcript">
            <strong>Meeting Transcript</strong>
          </label>

          <textarea
            id="transcript"
            value={transcript}
            onChange={(e) => setTranscript(e.target.value)}
            placeholder="Paste your meeting conversation here..."
            rows={9}
            maxLength={30000}
            required
            style={styles.textarea}
          />

          <button
            type="submit"
            disabled={loading}
            style={styles.button}
          >
            {loading ? "Generating Summary..." : "Generate AI Summary"}
          </button>
        </form>

        {error && (
          <p role="alert" style={styles.error}>
            {error}
          </p>
        )}

        {summary && (
          <section style={styles.result}>
            <h2>Meeting Summary</h2>
            <pre style={styles.summary}>{summary}</pre>

            <button
              type="button"
              style={styles.copyButton}
              onClick={() =>
                navigator.clipboard.writeText(summary)
              }
            >
              Copy Summary
            </button>
          </section>
        )}
      </section>
    </main>
  );
}

const styles = {
  page: {
    minHeight: "100vh",
    padding: "32px 16px",
    background: "#f3f4f6",
    fontFamily: "Arial, sans-serif",
  },
  card: {
    maxWidth: "850px",
    margin: "0 auto",
    padding: "28px",
    background: "#ffffff",
    borderRadius: "14px",
    boxShadow: "0 4px 18px rgba(0,0,0,0.08)",
  },
  subtitle: {
    color: "#666",
    marginBottom: "24px",
  },
  textarea: {
    display: "block",
    boxSizing: "border-box",
    width: "100%",
    marginTop: "10px",
    marginBottom: "16px",
    padding: "14px",
    border: "1px solid #ccc",
    borderRadius: "8px",
    fontSize: "15px",
    resize: "vertical",
  },
  button: {
    padding: "12px 20px",
    background: "#4f46e5",
    color: "#fff",
    border: "none",
    borderRadius: "8px",
    cursor: "pointer",
  },
  error: {
    color: "#b91c1c",
    marginTop: "16px",
  },
  result: {
    marginTop: "28px",
    padding: "20px",
    background: "#f9fafb",
    border: "1px solid #e5e7eb",
    borderRadius: "10px",
  },
  summary: {
    whiteSpace: "pre-wrap",
    overflowWrap: "anywhere",
    fontFamily: "Arial, sans-serif",
    lineHeight: 1.7,
  },
  copyButton: {
    padding: "10px 16px",
    background: "#111827",
    color: "#fff",
    border: "none",
    borderRadius: "7px",
    cursor: "pointer",
  },
};
