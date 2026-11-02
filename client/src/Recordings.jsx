import { useState, useEffect, useCallback } from "react";

const API_URL = import.meta.env.VITE_API_URL;
const SERVER_URL = import.meta.env.VITE_SOCKET_URL;

function Recordings() {
  const [recordings, setRecordings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  // Fetch recordings from backend
  const loadRecordings = useCallback(async () => {
    const token = sessionStorage.getItem("intellmeet_token");

    if (!token) {
      setError("Please login to view your recordings.");
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      setError("");

      const response = await fetch(`${API_URL}/recordings/my`, {
        method: "GET",
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      const data = await response.json();

      if (!response.ok || !data.success) {
        throw new Error(
          data.message || "Unable to load recordings"
        );
      }

      setRecordings(
        Array.isArray(data.recordings) ? data.recordings : []
      );
    } catch (err) {
      setError(err.message || "Something went wrong.");
    } finally {
      setLoading(false);
    }
  }, []);

   const handleDeleteRecording = async (recordingId) => {
    const confirmed = window.confirm(
      "Are you sure you want to delete this recording?"
    );

    if (!confirmed) return;

    try {
      const token = sessionStorage.getItem("intellmeet_token");

      const response = await fetch(
        `${API_URL}/recordings/${recordingId}`,
        {
          method: "DELETE",
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      );

      const data = await response.json();

      if (!response.ok || !data.success) {
        throw new Error(data.message || "Failed to delete recording");
      }

      setRecordings((current) =>
        current.filter((recording) => recording._id !== recordingId)
      );

      alert("Recording deleted successfully!");
    } catch (error) {
      alert(error.message);
    }
  };

  // Load recordings when page opens
  useEffect(() => {
    loadRecordings();
  }, [loadRecordings]);

  // Loading
  if (loading) {
    return (
      <main className="main-content">
        <h2>My Recordings</h2>
        <p>Loading your recordings...</p>
      </main>
    );
  }

  // Error
  if (error) {
    return (
      <main className="main-content">
        <h2>My Recordings</h2>

        <p style={{ color: "red" }}>{error}</p>

        <button onClick={loadRecordings}>
          Try Again
        </button>
      </main>
    );
  }

  return (
    <main className="main-content">
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          marginBottom: "25px",
          flexWrap: "wrap",
          gap: "12px",
        }}
      >
        <div>
          <h2>My Recordings</h2>
          <p>Your saved meeting recordings</p>
        </div>

        <button onClick={loadRecordings}>
          Refresh
        </button>
      </div>

      {recordings.length === 0 ? (
        <div className="recording-empty">
          <h3>No Recordings Found</h3>
          <p>
            Your meeting recordings will appear here
            after they are uploaded successfully.
          </p>
        </div>
      ) : (
        <div className="recordings-list">
          {recordings.map((recording) => {
            const videoUrl =
              `${SERVER_URL}${recording.filePath}`;

            return (
              <div
                className="recording-card"
                key={recording._id}
                style={{
                  padding: "20px",
                  marginBottom: "20px",
                  border: "1px solid #ddd",
                  borderRadius: "12px",
                }}
              >
                <h3>
                  {recording.meetingId?.title ||
                    "Meeting Recording"}
                </h3>

                <p>
                  Date:{" "}
                  {new Date(
                    recording.createdAt
                  ).toLocaleString()}
                </p>

                <p>
                  File size:{" "}
                  {(
                    recording.fileSize /
                    (1024 * 1024)
                  ).toFixed(2)} MB
                </p>

                <video
                  controls
                  preload="metadata"
                  src={videoUrl}
                  style={{
                    width: "100%",
                    maxWidth: "750px",
                    borderRadius: "10px",
                    background: "#000",
                  }}
                >
                  Your browser does not support video playback.
                </video>

                <div
  style={{
    marginTop: "15px",
    display: "flex",
    gap: "15px",
    alignItems: "center",
  }}
>
  <a href={videoUrl} download={recording.fileName}>
    Download Recording
  </a>

  <button
    type="button"
    onClick={() => handleDeleteRecording(recording._id)}
    style={{
      background: "#dc2626",
      color: "white",
      padding: "10px 18px",
      border: "none",
      borderRadius: "6px",
      cursor: "pointer",
    }}
  >
    Delete Recording
  </button>
</div>
              </div>
            );
          })}
        </div>
      )}
    </main>
  );
}

export default Recordings;