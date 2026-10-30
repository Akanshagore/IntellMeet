import { useState } from "react";
import "./Meeting.css";

const API_URL = "http://localhost:5000/api/meetings";

function getLoggedInUser() {
  try {
    return JSON.parse(
      sessionStorage.getItem("intellmeet_user") || "{}"
    );
  } catch {
    return {};
  }
}

function toLocalDateTimeValue(date) {
  const localDate = new Date(
    date.getTime() - date.getTimezoneOffset() * 60000
  );

  return localDate.toISOString().slice(0, 16);
}

function CreateMeeting({ onClose, onCreated }) {
  const user = getLoggedInUser();

  const hostEmail =
    user.email || user.emailId || user.user?.email || "";

  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [scheduledAt, setScheduledAt] = useState("");
  const [endAt, setEndAt] = useState("");
  const [participants, setParticipants] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const nowValue = toLocalDateTimeValue(new Date());

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");

    const token = sessionStorage.getItem("intellmeet_token");

    if (!token) {
      setError("Please log in again.");
      return;
    }

    if (!hostEmail) {
      setError(
        "Host email was not found. Please log out and log in again."
      );
      return;
    }

    if (!scheduledAt || !endAt) {
      setError("Please select meeting start and end times.");
      return;
    }

    const startDate = new Date(scheduledAt);
    const endDate = new Date(endAt);

    if (
      Number.isNaN(startDate.getTime()) ||
      Number.isNaN(endDate.getTime())
    ) {
      setError("Please enter valid meeting dates and times.");
      return;
    }

    if (startDate < new Date()) {
      setError("Meeting start time cannot be in the past.");
      return;
    }

    if (endDate <= startDate) {
      setError("Meeting end time must be after start time.");
      return;
    }

    // Participant emails are optional.
    // Guests can join through the invitation link using their names.
    const participantList = [
      ...new Set(
        participants
          .split(",")
          .map((email) => email.trim().toLowerCase())
          .filter(Boolean)
      ),
    ];

    const invalidEmail = participantList.find(
      (email) =>
        !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)
    );

    if (invalidEmail) {
      setError(`Invalid participant email: ${invalidEmail}`);
      return;
    }

    setLoading(true);

    try {
      const response = await fetch(API_URL, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          title: title.trim(),
          description: description.trim(),
          scheduledAt: startDate.toISOString(),
          endAt: endDate.toISOString(),
          participants: participantList,
        }),
      });

      const data = await response.json();
     if (!response.ok || !data.success || !data.meeting) {
    throw new Error(
    data.message || "Could not create meeting."
  );
}

       const inviteResponse = await fetch(
      `${API_URL}/${data.meeting._id}/invite`,
  {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
    },
  }
);

const inviteData = await inviteResponse.json();

if (!inviteResponse.ok || !inviteData.success) {
  throw new Error(
    inviteData.message || "Could not generate invitation link."
  );
}

console.log("Invitation Link:", inviteData.inviteLink); 
      if (typeof onCreated === "function") {
        onCreated(data.meeting);
      }

      if (typeof onClose === "function") {
        onClose();
      }
    } catch (err) {
      setError(
        err.message === "Failed to fetch"
          ? "Cannot connect to the backend server."
          : err.message || "Could not create meeting."
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="meeting-form-overlay">
      <div className="meeting-form-card">
        <h2>Create a Meeting</h2>
        <p>Schedule your next team collaboration.</p>

        <form onSubmit={handleSubmit}>
          <label htmlFor="meetingTitle">Meeting Title</label>
          <input
            id="meetingTitle"
            type="text"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            minLength={3}
            maxLength={100}
            placeholder="Weekly Team Sync"
            required
          />

          <label htmlFor="meetingDescription">
            Description
          </label>
          <textarea
            id="meetingDescription"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            maxLength={1000}
            placeholder="What will you discuss?"
          />

          <label htmlFor="hostEmail">Host Email ID</label>
          <input
            id="hostEmail"
            type="email"
            value={hostEmail}
            readOnly
            placeholder="Login email will appear here"
            required
          />

          <label htmlFor="meetingStart">
            Meeting Start Date &amp; Time
          </label>
          <input
            id="meetingStart"
            type="datetime-local"
            value={scheduledAt}
            onChange={(e) => {
              setScheduledAt(e.target.value);

              if (
                endAt &&
                new Date(endAt) <= new Date(e.target.value)
              ) {
                setEndAt("");
              }
            }}
            min={nowValue}
            required
          />

          <label htmlFor="meetingEnd">
            Meeting End Date &amp; Time
          </label>
          <input
            id="meetingEnd"
            type="datetime-local"
            value={endAt}
            onChange={(e) => setEndAt(e.target.value)}
            min={scheduledAt || nowValue}
            required
          />

          <label htmlFor="meetingParticipants">
            Participants' Email Addresses (Optional)
          </label>
          <input
            id="meetingParticipants"
            type="text"
            value={participants}
            onChange={(e) => setParticipants(e.target.value)}
            placeholder="alex@example.com, emily@example.com"
          />
          <small>
            You can leave this empty. Guests can join using the
            meeting invitation link and their names.
          </small>

          {error && (
            <p className="meeting-form-error" role="alert">
              {error}
            </p>
          )}

          <div className="meeting-form-actions">
            <button
              type="button"
              onClick={onClose}
              disabled={loading}
            >
              Cancel
            </button>

            <button type="submit" disabled={loading}>
              {loading ? "Creating..." : "Create Meeting"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

export default CreateMeeting;