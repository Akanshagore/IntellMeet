import { useState } from "react";
import "./Meeting.css";

const getHostEmail = () => {
  try {
    const user = JSON.parse(
      sessionStorage.getItem("intellmeet_user") || "{}"
    );

    return (
      user.email ||
      user.emailId ||
      user.user?.email ||
      ""
    );
  } catch {
    return "";
  }
};

const toDateTimeLocal = (value) => {
  if (!value) return "";

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) return "";

  const localDate = new Date(
    date.getTime() - date.getTimezoneOffset() * 60000
  );

  return localDate.toISOString().slice(0, 16);
};

const getCurrentLocalDateTime = () => {
  const now = new Date();
  const localDate = new Date(
    now.getTime() - now.getTimezoneOffset() * 60000
  );

  return localDate.toISOString().slice(0, 16);
};

function EditMeeting({ meeting, onClose, onUpdated }) {
  const [title, setTitle] = useState(meeting.title || "");
  const [description, setDescription] = useState(
    meeting.description || ""
  );

  const [scheduledAt, setScheduledAt] = useState(
    toDateTimeLocal(meeting.scheduledAt)
  );

  const [endAt, setEndAt] = useState(
    toDateTimeLocal(meeting.endAt)
  );

  const [participants, setParticipants] = useState(
    (meeting.participants || []).join(", ")
  );

  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const hostEmail = getHostEmail();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");

    const token = sessionStorage.getItem("intellmeet_token");

    if (!token) {
      setError("Please log in again.");
      return;
    }

    if (!title.trim() || title.trim().length < 3) {
      setError("Meeting title must be at least 3 characters.");
      return;
    }

    if (!scheduledAt || !endAt) {
      setError("Please select both start and end times.");
      return;
    }

    const startDate = new Date(scheduledAt);
    const endDate = new Date(endAt);

    if (
      Number.isNaN(startDate.getTime()) ||
      Number.isNaN(endDate.getTime())
    ) {
      setError("Please select valid dates and times.");
      return;
    }

    if (startDate.getTime() <= Date.now()) {
      setError("Meeting start time must be in the future.");
      return;
    }

    if (endDate.getTime() <= startDate.getTime()) {
      setError("End time must be after start time.");
      return;
    }

    const participantList = [
      ...new Set(
        participants
          .split(",")
          .map((email) => email.trim().toLowerCase())
          .filter(Boolean)
      ),
    ];

    const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

    const invalidEmail = participantList.find(
      (email) => !emailPattern.test(email)
    );

    if (invalidEmail) {
      setError(`Invalid participant email: ${invalidEmail}`);
      return;
    }

    setLoading(true);

    try {
      const response = await fetch(
        `http://localhost:5000/api/meetings/${meeting._id}`,
        {
          method: "PUT",
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
        }
      );

      const data = await response.json();

      if (!response.ok || !data.success) {
        throw new Error(
          data.message || "Unable to update meeting."
        );
      }

      if (typeof onUpdated === "function") {
        onUpdated(data.meeting);
      }

      if (typeof onClose === "function") {
        onClose();
      }
    } catch (err) {
      setError(
        err.message === "Failed to fetch"
          ? "Cannot connect to the backend server."
          : err.message || "Update failed."
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="meeting-form-overlay">
      <div className="meeting-form-card">
        <h2>Edit Meeting</h2>
        <p>Update your meeting details and schedule.</p>

        <form onSubmit={handleSubmit}>
          <label htmlFor="edit-title">Meeting title</label>
          <input
            id="edit-title"
            type="text"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            minLength={3}
            maxLength={100}
            placeholder="Weekly Team Sync"
            required
          />

          <label htmlFor="edit-description">Description</label>
          <textarea
            id="edit-description"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            maxLength={1000}
            placeholder="What will you discuss?"
          />

          <label htmlFor="edit-host-email">Host Email</label>
          <input
            id="edit-host-email"
            type="email"
            value={hostEmail}
            placeholder="Host email from your account"
            readOnly
          />

          <label htmlFor="edit-start">Start date and time</label>
          <input
            id="edit-start"
            type="datetime-local"
            value={scheduledAt}
            min={getCurrentLocalDateTime()}
            onChange={(e) => setScheduledAt(e.target.value)}
            required
          />

          <label htmlFor="edit-end">End date and time</label>
          <input
            id="edit-end"
            type="datetime-local"
            value={endAt}
            min={scheduledAt || getCurrentLocalDateTime()}
            onChange={(e) => setEndAt(e.target.value)}
            required
          />

          <label htmlFor="edit-participants">
            Participants' email addresses (optional)
          </label>

          <input
            id="edit-participants"
            type="text"
            value={participants}
            onChange={(e) => setParticipants(e.target.value)}
            placeholder="alex@example.com, sam@example.com"
          />

          <small>
            Guests can join through the meeting invitation link
            using their name. An email address is not required
            to join.
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
              {loading ? "Saving..." : "Save Changes"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

export default EditMeeting;