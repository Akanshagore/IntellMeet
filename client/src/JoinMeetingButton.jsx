import { useNavigate } from "react-router-dom";

function JoinMeetingButton({ meeting }) {
  const navigate = useNavigate();

  const handleJoin = () => {
    if (!meeting?._id) {
      alert("Meeting ID is missing.");
      return;
    }

    const status = (
      meeting.status ||
      (meeting.scheduledAt &&
      new Date(meeting.scheduledAt) < new Date()
        ? "completed"
        : "scheduled")
    ).toLowerCase();

    if (!["scheduled", "ongoing"].includes(status)) {
      alert("This meeting is not available to join.");
      return;
    }

    navigate(`/meeting/${meeting._id}`);
  };

  return (
    <button
      type="button"
      className="join-meeting-button"
      onClick={handleJoin}
      disabled={!meeting?._id}
    >
      Join Meeting
    </button>
  );
}

export default JoinMeetingButton;