import { useCallback, useEffect, useState } from "react";
import "./Meeting.css";
import CreateMeeting from "./CreateMeeting";
import JoinMeetingButton from "./JoinMeetingButton";

const API_URL = "http://localhost:5000/api/meetings";

function Meetings() {
  const [meetings, setMeetings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [selectedMeeting, setSelectedMeeting] = useState(null);
  const [deletingId, setDeletingId] = useState(null);
  const [sharingId, setSharingId] = useState(null);
  const [now, setNow] = useState(Date.now());

  const getToken = () =>
    sessionStorage.getItem("intellmeet_token");

  // Refresh the current time every second so meeting statuses
  // update automatically without refreshing the page.
  useEffect(() => {
    const timer = setInterval(() => {
      setNow(Date.now());
    }, 1000);

    return () => clearInterval(timer);
  }, []);

  const fetchMeetings = useCallback(async () => {
    const token = getToken();

    if (!token) {
      setError("Please log in to view your meetings.");
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      setError("");

      const response = await fetch(API_URL, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(
          data.message || "Failed to load meetings."
        );
      }

      const list = Array.isArray(data)
        ? data
        : data.meetings;

      if (!Array.isArray(list)) {
        throw new Error("Unexpected API response.");
      }

      setMeetings(list);
    } catch (err) {
      setError(
        err.message === "Failed to fetch"
          ? "Cannot connect to the backend server."
          : err.message
      );
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchMeetings();
  }, [fetchMeetings]);

  const handleCreated = (newMeeting) => {
    if (newMeeting?._id) {
      setMeetings((previous) => [
        newMeeting,
        ...previous.filter(
          (meeting) => meeting._id !== newMeeting._id
        ),
      ]);
    } else {
      fetchMeetings();
    }

    setShowCreateForm(false);
  };

   
const handleShareMeeting = async (meeting) => {
  if (!meeting?._id) {
    setError("Meeting ID is missing.");
    return;
  }

  const authToken = getToken();

  if (!authToken) {
    setError("Please log in again.");
    return;
  }

  setSharingId(meeting._id);
  setError("");

  try {
    let inviteToken = meeting.inviteToken;

    // Generate/retrieve the invite token from the backend.
    const response = await fetch(
      `${API_URL}/${meeting._id}/invite`,
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${authToken}`,
          "Content-Type": "application/json",
        },
      }
    );

    const data = await response.json();

    if (!response.ok) {
      throw new Error(
        data.message || `Invite API error: ${response.status}`
      );
    }

    inviteToken =
      data.inviteToken ||
      data.meeting?.inviteToken ||
      inviteToken;

    if (!inviteToken) {
      console.error("Invite API response:", data);
      throw new Error("Backend did not return an invite token.");
    }

    const inviteLink =
      `${window.location.origin}/meeting/${encodeURIComponent(inviteToken)}`;

    let copied = false;

    try {
      if (navigator.clipboard?.writeText) {
        await navigator.clipboard.writeText(inviteLink);
        copied = true;
      }
    } catch (err) {
      console.warn("Clipboard API failed:", err);
    }

    if (!copied) {
      // Display the URL so it can still be copied manually.
      window.prompt("Copy this meeting link:", inviteLink);
    } else {
      window.alert("Meeting link copied successfully!");
    }
  } catch (err) {
    console.error("Copy Meeting Link error:", err);
    setError(err.message || "Unable to generate meeting link.");
  } finally {
    setSharingId(null);
  }
};


  const handleDelete = async (meeting) => {
    const confirmed = window.confirm(
      `Are you sure you want to delete "${meeting.title}"?`
    );

    if (!confirmed) return;

    const token = getToken();

    if (!token) {
      setError("Please log in again.");
      return;
    }

    try {
      setDeletingId(meeting._id);
      setError("");

      const response = await fetch(
        `${API_URL}/${meeting._id}`,
        {
          method: "DELETE",
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      );

      const data = await response.json();

      if (!response.ok || data.success === false) {
        throw new Error(
          data.message || "Failed to delete meeting."
        );
      }

      setMeetings((previous) =>
        previous.filter((item) => item._id !== meeting._id)
      );

      if (selectedMeeting?._id === meeting._id) {
        setSelectedMeeting(null);
      }
    } catch (err) {
      setError(err.message || "Could not delete meeting.");
    } finally {
      setDeletingId(null);
    }
  };

  const formatDate = (dateValue) => {
    if (!dateValue) return "Date not set";

    const date = new Date(dateValue);

    if (Number.isNaN(date.getTime())) {
      return "Invalid date";
    }

    return date.toLocaleString([], {
      dateStyle: "medium",
      timeStyle: "short",
    });
  };

  // Derive status from start and end times.
  // This does not change the saved meeting or its room connection.
  const getStatus = (meeting) => {
    if (meeting.status === "cancelled") {
      return "cancelled";
    }

    if (meeting.status === "completed") {
      return "completed";
    }

    const startTime = new Date(
      meeting.scheduledAt
    ).getTime();

    const endTime = meeting.endAt
      ? new Date(meeting.endAt).getTime()
      : NaN;

    if (!Number.isFinite(startTime)) {
      return "scheduled";
    }

    if (now < startTime) {
      return "scheduled";
    }

    if (Number.isFinite(endTime)) {
      if (endTime <= startTime) {
        return "expired";
      }

      if (now >= endTime) {
        return "expired";
      }

      return "ongoing";
    }

    // Compatibility fallback for older meetings without endAt.
    return meeting.status === "ongoing"
      ? "ongoing"
      : "expired";
  };

  const getHostEmail = (meeting) => {
    if (
      meeting.createdBy &&
      typeof meeting.createdBy === "object"
    ) {
      return (
        meeting.createdBy.email ||
        "Host email unavailable"
      );
    }

    return (
      meeting.hostEmail ||
      meeting.createdByEmail ||
      "Host email unavailable"
    );
  };

  const upcomingMeetings = meetings.filter(
    (meeting) => getStatus(meeting) === "scheduled"
  );

  const liveMeetings = meetings.filter(
    (meeting) => getStatus(meeting) === "ongoing"
  );

  const expiredMeetings = meetings.filter((meeting) =>
    ["expired", "completed", "cancelled"].includes(
      getStatus(meeting)
    )
  );

  const renderMeetingSection = (
    title,
    items,
    emptyMessage
  ) => (
    <section className="meeting-section" key={title}>
      <h2 className="meeting-section-title">
        {title}
        <span className="meeting-section-count">
          {items.length}
        </span>
      </h2>

      {items.length === 0 ? (
        <p className="meetings-message">
          {emptyMessage}
        </p>
      ) : (
        <div className="meetings-grid">
          {items.map((meeting) => {
            const status = getStatus(meeting);

            return (
              <article
                className="meeting-card"
                key={meeting._id}
              >
                <div className="meeting-card-top">
                  <span
                    className={`meeting-status status-${status}`}
                  >
                    {status === "scheduled"
                      ? "Upcoming"
                      : status === "ongoing"
                        ? "Live"
                        : status === "expired"
                          ? "Expired"
                          : status}
                  </span>

                  <span className="meeting-date">
                    {formatDate(meeting.scheduledAt)}
                  </span>
                </div>

                <h2>{meeting.title}</h2>

                <p className="meeting-description">
                  {meeting.description ||
                    "No description provided."}
                </p>

                <p className="meeting-host-email">
                  <strong>Host Email:</strong>{" "}
                  {getHostEmail(meeting)}
                </p>

                <p className="meeting-date">
                  <strong>End time:</strong>{" "}
                  {formatDate(meeting.endAt)}
                </p>

                <div className="meeting-card-actions">
                  <button
                    type="button"
                    onClick={() =>
                      setSelectedMeeting(meeting)
                    }
                  >
                    View Details
                  </button>

                  {["scheduled", "ongoing"].includes(
                    status
                  ) && (
                    <JoinMeetingButton
                      meeting={{
                        ...meeting,
                        status,
                      }}
                    />
                  )}

                  <button
                    type="button"
                    onClick={() =>
                      handleShareMeeting(meeting)
                    }
                    disabled={sharingId === meeting._id}
                  >
                    {sharingId === meeting._id
                      ? "Creating Link..."
                      : "Copy Meeting Link"}
                  </button>

                  <button
                    type="button"
                    onClick={() => handleDelete(meeting)}
                    disabled={deletingId === meeting._id}
                  >
                    {deletingId === meeting._id
                      ? "Deleting..."
                      : "Delete"}
                  </button>
                </div>
              </article>
            );
          })}
        </div>
      )}
    </section>
  );

  return (
    <section className="meetings-page">
      <header className="meetings-header">
        <div>
          <p className="meetings-eyebrow">
            INTELLMEET WORKSPACE
          </p>
          <h1>My Meetings</h1>
          <p>Create, view and manage your meetings.</p>
        </div>

        <button
          type="button"
          onClick={() => setShowCreateForm(true)}
        >
          + Create Meeting
        </button>
      </header>

      <div className="meetings-summary">
        <div className="meeting-summary-card">
          <span>Total Meetings</span>
          <strong>{meetings.length}</strong>
        </div>

        <div className="meeting-summary-card">
          <span>Upcoming Meetings</span>
          <strong>{upcomingMeetings.length}</strong>
        </div>

        <div className="meeting-summary-card">
          <span>Live Meetings</span>
          <strong>{liveMeetings.length}</strong>
        </div>

        <div className="meeting-summary-card">
          <span>Expired Meetings</span>
          <strong>{expiredMeetings.length}</strong>
        </div>
      </div>

      {error && (
        <div className="meetings-error" role="alert">
          {error}
          <button
            type="button"
            onClick={fetchMeetings}
          >
            Retry
          </button>
        </div>
      )}

      {loading ? (
        <p className="meetings-message">
          Loading meetings...
        </p>
      ) : meetings.length === 0 ? (
        <div className="meetings-empty">
          <h2>No meetings yet</h2>
          <p>
            Create your first team meeting to get started.
          </p>
          <button
            type="button"
            onClick={() => setShowCreateForm(true)}
          >
            Create your first meeting
          </button>
        </div>
      ) : (
        <div className="meeting-sections">
          {renderMeetingSection(
            "🔵 Upcoming Meetings",
            upcomingMeetings,
            "No upcoming meetings."
          )}

          {renderMeetingSection(
            "🟢 Live Meetings",
            liveMeetings,
            "No live meetings right now."
          )}

          {renderMeetingSection(
            "⚫ Expired Meetings",
            expiredMeetings,
            "No expired meetings."
          )}
        </div>
      )}

      {selectedMeeting && (
        <div className="meeting-details-overlay">
          <div
            className="meeting-details-card"
            role="dialog"
            aria-modal="true"
            aria-labelledby="meeting-details-title"
          >
            <h2 id="meeting-details-title">
              {selectedMeeting.title}
            </h2>

            <p>
              <strong>Start time:</strong>{" "}
              {formatDate(selectedMeeting.scheduledAt)}
            </p>

            <p>
              <strong>End time:</strong>{" "}
              {formatDate(selectedMeeting.endAt)}
            </p>

            <p>
              <strong>Status:</strong>{" "}
              {getStatus(selectedMeeting) === "scheduled"
                ? "Upcoming"
                : getStatus(selectedMeeting) === "ongoing"
                  ? "Live"
                  : getStatus(selectedMeeting) === "expired"
                    ? "Expired"
                    : getStatus(selectedMeeting)}
            </p>

            <p>
              <strong>Host Email:</strong>{" "}
              {getHostEmail(selectedMeeting)}
            </p>

            <p>
              <strong>Description:</strong>{" "}
              {selectedMeeting.description ||
                "No description provided."}
            </p>

            <p>
              <strong>Participants:</strong>{" "}
              {Array.isArray(selectedMeeting.participants)
                ? selectedMeeting.participants
                    .map((participant) =>
                      typeof participant === "string"
                        ? participant
                        : participant.email ||
                          participant.name ||
                          ""
                    )
                    .filter(Boolean)
                    .join(", ") ||
                  "No participants listed"
                : "No participants listed"}
            </p>

            <div className="meeting-card-actions">
              {["scheduled", "ongoing"].includes(
                getStatus(selectedMeeting)
              ) && (
                <JoinMeetingButton
                  meeting={{
                    ...selectedMeeting,
                    status: getStatus(selectedMeeting),
                  }}
                />
              )}

              <button
                type="button"
                onClick={() =>
                  handleShareMeeting(selectedMeeting)
                }
                disabled={
                  sharingId === selectedMeeting._id
                }
              >
                {sharingId === selectedMeeting._id
                  ? "Creating Link..."
                  : "Copy Meeting Link"}
              </button>

              <button
                type="button"
                onClick={() => setSelectedMeeting(null)}
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {showCreateForm && (
        <CreateMeeting
          onClose={() => setShowCreateForm(false)}
          onCreated={handleCreated}
        />
      )}
    </section>
  );
}

export default Meetings;