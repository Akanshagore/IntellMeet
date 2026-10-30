
import { useEffect, useState } from "react";
import { useParams, Link } from "react-router-dom";
import MeetingRoom from "./assets/pages/MeetingRoom.jsx";

const API_URL =
  import.meta.env.VITE_API_URL || "http://localhost:5000/api";

export default function SharedMeeting() {
  const { meetingId: inviteToken } = useParams();

  const [meeting, setMeeting] = useState(null);
  const [participantName, setParticipantName] = useState("");
  const [joined, setJoined] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    const controller = new AbortController();

    async function loadMeeting() {
      try {
        setLoading(true);
        setError("");
        setMeeting(null);

        if (!inviteToken) {
          throw new Error("Meeting link is missing.");
        }

        const response = await fetch(
          `${API_URL}/meetings/invite/${encodeURIComponent(
            inviteToken
          )}`,
          { signal: controller.signal }
        );

        const data = await response.json();

        if (!response.ok || !data.success || !data.meeting) {
  console.error("Meeting invite API error:", {
    status: response.status,
    response: data,
    inviteToken,
  });

  throw new Error(
    data.message || `Meeting link failed (HTTP ${response.status}).`
  );
}

        setMeeting(data.meeting);
      } catch (err) {
        if (err.name !== "AbortError") {
          setError(
            err.message || "Unable to connect to the meeting server."
          );
        }
      } finally {
        if (!controller.signal.aborted) {
          setLoading(false);
        }
      }
    }

    loadMeeting();

    return () => controller.abort();
  }, [inviteToken]);

  function handleJoin(event) {
    event.preventDefault();

    const name = participantName.trim();

    if (!name) {
      setError("Please enter your name.");
      return;
    }

    setParticipantName(name);
    setError("");
    setJoined(true);
  }

  if (loading) {
    return (
      <main style={styles.center}>
        <p>Loading meeting...</p>
      </main>
    );
  }

  if (error && !meeting) {
    return (
      <main style={styles.center}>
        <section style={styles.card}>
          <h2>Unable to open meeting</h2>
          <p style={styles.error}>{error}</p>
          <Link to="/">Return to IntellMeet</Link>
        </section>
      </main>
    );
  }

  if (!meeting) {
    return (
      <main style={styles.center}>
        <section style={styles.card}>
          <h2>Meeting not found</h2>
          <Link to="/">Return to IntellMeet</Link>
        </section>
      </main>
    );
  }

  if (!joined) {
    return (
      <main style={styles.center}>
        <form onSubmit={handleJoin} style={styles.card}>
          <h1 style={styles.heading}>IntellMeet</h1>
          <h2>Join Meeting</h2>

          <p style={styles.meetingTitle}>
            {meeting.title || "Meeting"}
          </p>

          <label htmlFor="participantName">Your name</label>

          <input
            id="participantName"
            type="text"
            value={participantName}
            onChange={(event) => setParticipantName(event.target.value)}
            placeholder="Enter your name"
            maxLength={80}
            autoComplete="name"
            required
            style={styles.input}
          />

          {error && <p style={styles.error}>{error}</p>}

          <button type="submit" style={styles.button}>
            Join Meeting
          </button>

          <p style={styles.note}>
            Enter your name to join as a guest.
          </p>
        </form>
      </main>
    );
  }

  const participant = {
    name: participantName.trim(),
    isGuest: true,
  };

  return (
    <MeetingRoom
      meetings={[meeting]}
      user={participant}
      selectedMeetingId={meeting._id}
    />
  );
}

const styles = {
  center: {
    minHeight: "100vh",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    padding: 20,
    boxSizing: "border-box",
    background: "#f5f7fb",
    fontFamily: "Arial, sans-serif",
  },
  card: {
    width: "100%",
    maxWidth: 420,
    boxSizing: "border-box",
    padding: 28,
    background: "#fff",
    borderRadius: 16,
    boxShadow: "0 8px 30px rgba(0,0,0,0.08)",
  },
  heading: {
    color: "#4f46e5",
    marginTop: 0,
  },
  meetingTitle: {
    fontWeight: "bold",
    overflowWrap: "anywhere",
  },
  input: {
    display: "block",
    width: "100%",
    boxSizing: "border-box",
    padding: 12,
    marginTop: 8,
    marginBottom: 16,
    border: "1px solid #ccc",
    borderRadius: 8,
    fontSize: 16,
  },
  button: {
    width: "100%",
    padding: 12,
    border: 0,
    borderRadius: 8,
    background: "#4f46e5",
    color: "#fff",
    fontSize: 16,
    cursor: "pointer",
  },
  error: {
    color: "#dc2626",
    overflowWrap: "anywhere",
  },
  note: {
    color: "#666",
    fontSize: 13,
    textAlign: "center",
    marginBottom: 0,
  },
};
