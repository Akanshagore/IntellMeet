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
    "scheduled"
  ).toLowerCase();

  if (!["scheduled", "ongoing"].includes(status)) {
    alert("This meeting is not available to join.");
    return;
  }

  if (!meeting.inviteToken) {
    alert("Meeting invite token is unavailable. Please generate the meeting link first.");
    return;
  }

  navigate(`/meeting/${meeting.inviteToken}`);
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