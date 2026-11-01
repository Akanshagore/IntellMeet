const SOCKET_URL =
  import.meta.env.VITE_SOCKET_URL || "http://localhost:5000";

// Upload recording to IntellMeet
export const uploadRecording = async (blob, meetingId) => {
  const token = sessionStorage.getItem("intellmeet_token");

  if (!token) {
    throw new Error("Please login again.");
  }

  if (!blob || blob.size === 0) {
    throw new Error("Recording is empty.");
  }

  const formData = new FormData();

  formData.append("recording", blob, "intellmeet-recording.webm");
  formData.append("meetingId", meetingId);

  const response = await fetch(
    `${SOCKET_URL}/api/recordings/upload`,
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
      },
      body: formData,
    }
  );

  const data = await response.json();

  if (!response.ok || !data.success) {
    throw new Error(data.message || "Recording upload failed.");
  }

  return data;
};


// Generate transcription
export const transcribeRecording = async (blob) => {
  const token = sessionStorage.getItem("intellmeet_token");

  if (!token) {
    throw new Error("Please login again.");
  }

  if (!blob || blob.size === 0) {
    throw new Error("Recording is empty.");
  }

  const formData = new FormData();

  formData.append("recording", blob, "intellmeet-recording.webm");

  const response = await fetch(
    `${SOCKET_URL}/api/summary/transcribe`,
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
      },
      body: formData,
    }
  );

  const data = await response.json();

  if (!response.ok || !data.success) {
    throw new Error(data.message || "Transcription failed.");
  }

  return data.transcript;
};


// Generate AI summary
export const generateSummary = async (transcript) => {
  const token = sessionStorage.getItem("intellmeet_token");

  if (!token) {
    throw new Error("Please login again.");
  }

  const response = await fetch(
    `${SOCKET_URL}/api/summary`,
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({ transcript }),
    }
  );

  const data = await response.json();

  if (!response.ok || !data.success) {
    throw new Error(data.message || "AI summary generation failed.");
  }

  return data.summary;
};