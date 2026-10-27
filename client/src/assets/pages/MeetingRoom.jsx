import { useCallback, useEffect, useRef, useState } from "react";
import { io } from "socket.io-client";
import MessagePanel from "../../MessagePanel";
import "./MeetingRoom.css";

const SOCKET_URL =
  import.meta.env.VITE_SOCKET_URL || "http://localhost:5000";

const ICE_SERVERS = [
  { urls: "stun:stun.l.google.com:19302" },
];

function ParticipantTile({ participant }) {
  const videoRef = useRef(null);

  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;

    video.srcObject = participant.stream || null;

    if (participant.stream) {
      video.play().catch(() => {});
    }

    return () => {
      video.srcObject = null;
    };
  }, [participant.stream]);

  return (
    <div className="video-tile">
      <video
        ref={videoRef}
        autoPlay
        playsInline
      />

      {!participant.stream && (
        <div className="video-placeholder">
          <div className="avatar-circle remote-avatar">
            {(participant.name || "P")
              .charAt(0)
              .toUpperCase()}
          </div>
          <span>Connecting...</span>
        </div>
      )}

      <span className="participant-name">
        {participant.name || "Participant"}
      </span>
    </div>
  );
}

export default function MeetingRoom({
  meetings = [],
  user,
  selectedMeetingId = "",
}) {
  const [meetingId, setMeetingId] = useState(selectedMeetingId);
  const [localStream, setLocalStream] = useState(null);
  const [participants, setParticipants] = useState([]);
  const [callStatus, setCallStatus] = useState("Ready to join");
  const [error, setError] = useState("");
  const [micOn, setMicOn] = useState(true);
  const [cameraOn, setCameraOn] = useState(true);
  const [isChatOpen, setIsChatOpen] = useState(false);
  const [isSharing, setIsSharing] = useState(false);

  const localVideoRef = useRef(null);
  const socketRef = useRef(null);
  const streamRef = useRef(null);
  const screenStreamRef = useRef(null);

  // Each participant has a separate WebRTC connection.
  const peersRef = useRef(new Map());
  const pendingCandidatesRef = useRef(new Map());
  const joiningRef = useRef(false);
  const leavingRef = useRef(false);
  const meetingIdRef = useRef(meetingId);
  const userRef = useRef(user);

  useEffect(() => {
    meetingIdRef.current = meetingId;
  }, [meetingId]);

  useEffect(() => {
    userRef.current = user;
  }, [user]);

  useEffect(() => {
    setMeetingId(selectedMeetingId || "");
  }, [selectedMeetingId]);

  const selectedMeeting = meetings.find(
    (meeting) => meeting._id === meetingId
  );

  useEffect(() => {
    if (!localVideoRef.current) return;

    localVideoRef.current.srcObject = localStream || null;

    if (localStream) {
      localVideoRef.current.play().catch(() => {});
    }
  }, [localStream]);

  const updateParticipant = useCallback((socketId, changes) => {
    setParticipants((current) => {
      const exists = current.some(
        (person) => person.socketId === socketId
      );

      if (!exists) {
        return [
          ...current,
          {
            socketId,
            name: changes.name || "Participant",
            stream: changes.stream || null,
          },
        ];
      }

      return current.map((person) =>
        person.socketId === socketId
          ? { ...person, ...changes }
          : person
      );
    });
  }, []);

  const removeParticipant = useCallback((socketId) => {
    const peer = peersRef.current.get(socketId);

    if (peer) {
      peer.ontrack = null;
      peer.onicecandidate = null;
      peer.onconnectionstatechange = null;
      peer.close();
      peersRef.current.delete(socketId);
    }

    pendingCandidatesRef.current.delete(socketId);

    setParticipants((current) =>
      current.filter((person) => person.socketId !== socketId)
    );
  }, []);

  const createPeerConnection = useCallback(
    (remoteSocketId, remoteUser = {}) => {
      const existing = peersRef.current.get(remoteSocketId);

      if (existing) return existing;

      const socket = socketRef.current;
      const localStream = streamRef.current;

      if (!socket || !localStream) {
        throw new Error("Join the meeting first.");
      }

      const peer = new RTCPeerConnection({
        iceServers: ICE_SERVERS,
      });

      peersRef.current.set(remoteSocketId, peer);

      // Add camera/microphone tracks.
      localStream.getTracks().forEach((track) => {
        peer.addTrack(track, localStream);
      });

      // If screen sharing is already active, add its video track.
      const screenTrack =
        screenStreamRef.current?.getVideoTracks()[0];

      if (screenTrack) {
        const videoSender = peer
          .getSenders()
          .find((sender) => sender.track?.kind === "video");

        if (videoSender) {
          videoSender.replaceTrack(screenTrack).catch(console.error);
        }
      }

      updateParticipant(remoteSocketId, {
        name: remoteUser.name || "Participant",
        stream: null,
      });

      peer.ontrack = (event) => {
        const remoteStream =
          event.streams?.[0] || new MediaStream([event.track]);

        updateParticipant(remoteSocketId, {
          name: remoteUser.name || "Participant",
          stream: remoteStream,
        });
      };

      peer.onicecandidate = (event) => {
        if (event.candidate && socket.connected) {
          socket.emit("webrtc-ice-candidate", {
            meetingId: meetingIdRef.current,
            targetSocketId: remoteSocketId,
            candidate: event.candidate,
          });
        }
      };

      peer.onconnectionstatechange = () => {
        if (peer.connectionState === "failed") {
          setError(
            "Participant connection failed. Check your network."
          );
        }
      };

      return peer;
    },
    [updateParticipant]
  );

  const flushPendingCandidates = useCallback(
    async (socketId, peer) => {
      const pending =
        pendingCandidatesRef.current.get(socketId) || [];

      for (const candidate of pending) {
        try {
          await peer.addIceCandidate(candidate);
        } catch (err) {
          console.error("ICE candidate error:", err);
        }
      }

      pendingCandidatesRef.current.delete(socketId);
    },
    []
  );

  const createOffer = useCallback(
    async (socketId, remoteUser = {}) => {
      try {
        const peer = createPeerConnection(socketId, remoteUser);

        if (peer.signalingState !== "stable") return;

        const offer = await peer.createOffer();
        await peer.setLocalDescription(offer);

        socketRef.current?.emit("webrtc-offer", {
          meetingId: meetingIdRef.current,
          targetSocketId: socketId,
          offer: peer.localDescription,
          user: {
            name: userRef.current?.name || "Participant",
          },
        });
      } catch (err) {
        console.error("Create offer error:", err);
        setError("Could not connect to a participant.");
      }
    },
    [createPeerConnection]
  );

  const handleOffer = useCallback(
    async ({ fromSocketId, offer, user: remoteUser } = {}) => {
      if (!fromSocketId || !offer) return;

      try {
        const peer = createPeerConnection(
          fromSocketId,
          remoteUser
        );

        if (peer.signalingState !== "stable") {
          console.warn("Peer is not ready for an offer.");
          return;
        }

        await peer.setRemoteDescription(offer);

        await flushPendingCandidates(fromSocketId, peer);

        const answer = await peer.createAnswer();
        await peer.setLocalDescription(answer);

        socketRef.current?.emit("webrtc-answer", {
          meetingId: meetingIdRef.current,
          targetSocketId: fromSocketId,
          answer: peer.localDescription,
        });
      } catch (err) {
        console.error("Handle offer error:", err);
        setError("Could not establish the participant connection.");
      }
    },
    [createPeerConnection, flushPendingCandidates]
  );

  const handleAnswer = useCallback(
    async ({ fromSocketId, answer } = {}) => {
      if (!fromSocketId || !answer) return;

      try {
        const peer = peersRef.current.get(fromSocketId);

        if (!peer || peer.signalingState !== "have-local-offer") {
          return;
        }

        await peer.setRemoteDescription(answer);

        await flushPendingCandidates(fromSocketId, peer);
      } catch (err) {
        console.error("Handle answer error:", err);
      }
    },
    [flushPendingCandidates]
  );

  const handleIceCandidate = useCallback(
    async ({ fromSocketId, candidate } = {}) => {
      if (!fromSocketId || !candidate) return;

      const peer = peersRef.current.get(fromSocketId);

      if (!peer || !peer.remoteDescription) {
        const pending =
          pendingCandidatesRef.current.get(fromSocketId) || [];

        pending.push(candidate);
        pendingCandidatesRef.current.set(fromSocketId, pending);
        return;
      }

      try {
        await peer.addIceCandidate(candidate);
      } catch (err) {
        console.error("Add ICE candidate error:", err);
      }
    },
    []
  );

  const joinCall = async () => {
    if (!meetingId || joiningRef.current || socketRef.current) {
      return;
    }

    joiningRef.current = true;
    leavingRef.current = false;
    setError("");

    if (!navigator.mediaDevices?.getUserMedia) {
      setError(
        "Camera access requires localhost or a secure HTTPS connection."
      );
      joiningRef.current = false;
      return;
    }

    try {
      setCallStatus("Requesting camera and microphone...");

      const stream = await navigator.mediaDevices.getUserMedia({
        video: true,
        audio: true,
      });

      if (leavingRef.current) {
        stream.getTracks().forEach((track) => track.stop());
        return;
      }

      streamRef.current = stream;
      setLocalStream(stream);
      setMicOn(true);
      setCameraOn(true);

      const socket = io(SOCKET_URL, {
        transports: ["websocket", "polling"],
      });

      socketRef.current = socket;

      socket.on("connect", () => {
        setError("");
        setCallStatus("Joining meeting...");

        socket.emit("join-meeting", {
          meetingId: meetingIdRef.current,
          user: {
            name: userRef.current?.name || "Guest",
          },
        });
      });

      socket.on(
        "existing-participants",
        ({ participants: existing = [] } = {}) => {
          existing.forEach((person) => {
            const socketId = person.socketId;

            if (socketId && socketId !== socket.id) {
              createOffer(
                socketId,
                person.user || person
              );
            }
          });

          setCallStatus(
            existing.length
              ? "Connecting to participants..."
              : "Waiting for participants..."
          );
        }
      );

      socket.on(
        "participant-joined",
        ({ socketId, user: remoteUser } = {}) => {
          if (!socketId || socketId === socket.id) return;

          updateParticipant(socketId, {
            name: remoteUser?.name || "Participant",
            stream: null,
          });
        }
      );

      socket.on("participant-left", ({ socketId } = {}) => {
        if (socketId) removeParticipant(socketId);
      });

      socket.on("webrtc-offer", handleOffer);
      socket.on("webrtc-answer", handleAnswer);
      socket.on("webrtc-ice-candidate", handleIceCandidate);

      socket.on("meeting-error", (message) => {
        setError(
          typeof message === "string"
            ? message
            : message?.message || "Could not join the meeting."
        );
      });

      socket.on("connect_error", (err) => {
        console.error("Socket connection error:", err);
        setError("Cannot connect to the meeting server.");
        setCallStatus("Server connection failed");
      });

      socket.on("disconnect", () => {
        if (!leavingRef.current) {
          setCallStatus("Meeting server disconnected");
        }
      });

      setCallStatus("Connecting to meeting server...");
    } catch (err) {
      console.error("Join meeting error:", err);

      const message =
        err.name === "NotAllowedError"
          ? "Allow camera and microphone permissions in your browser."
          : err.name === "NotFoundError"
            ? "Camera or microphone was not found."
            : err.message || "Unable to join the meeting.";

      setError(message);

      streamRef.current?.getTracks().forEach((track) => track.stop());
      streamRef.current = null;
      setLocalStream(null);

      socketRef.current?.disconnect();
      socketRef.current = null;

      joiningRef.current = false;
      setCallStatus("Ready to join");
    }
  };

  const stopScreenShare = useCallback(async () => {
    const screenStream = screenStreamRef.current;
    if (!screenStream) return;

    screenStream.getTracks().forEach((track) => track.stop());
    screenStreamRef.current = null;

    const cameraTrack = streamRef.current?.getVideoTracks()[0];

    const replacements = [];

    peersRef.current.forEach((peer) => {
      const sender = peer
        .getSenders()
        .find((item) => item.track?.kind === "video");

      if (sender) {
        replacements.push(
          sender.replaceTrack(cameraTrack || null)
        );
      }
    });

    await Promise.allSettled(replacements);

    setIsSharing(false);
    setCallStatus("Screen sharing stopped");
  }, []);

  const startScreenShare = async () => {
    if (!streamRef.current || !socketRef.current) {
      setError("Join the meeting before sharing your screen.");
      return;
    }

    if (!navigator.mediaDevices?.getDisplayMedia) {
      setError("Screen sharing is not supported by this browser.");
      return;
    }

    try {
      const screenStream =
        await navigator.mediaDevices.getDisplayMedia({
          video: true,
          audio: false,
        });

      screenStreamRef.current = screenStream;
      const screenTrack = screenStream.getVideoTracks()[0];

      const replacements = [];

      peersRef.current.forEach((peer) => {
        const sender = peer
          .getSenders()
          .find((item) => item.track?.kind === "video");

        if (sender) {
          replacements.push(sender.replaceTrack(screenTrack));
        }
      });

      await Promise.all(replacements);

      screenTrack.onended = () => {
        stopScreenShare();
      };

      setIsSharing(true);
      setCallStatus("Sharing your screen");
    } catch (err) {
      if (err.name !== "NotAllowedError") {
        setError(err.message || "Could not share your screen.");
      }
    }
  };

  const leaveCall = useCallback(() => {
    leavingRef.current = true;

    const socket = socketRef.current;

    if (socket?.connected && meetingIdRef.current) {
      socket.emit("leave-meeting", {
        meetingId: meetingIdRef.current,
      });
    }

    socket?.disconnect();
    socketRef.current = null;

    screenStreamRef.current?.getTracks().forEach((track) => {
      track.stop();
    });
    screenStreamRef.current = null;

    peersRef.current.forEach((peer) => {
      peer.ontrack = null;
      peer.onicecandidate = null;
      peer.onconnectionstatechange = null;
      peer.close();
    });

    peersRef.current.clear();
    pendingCandidatesRef.current.clear();

    streamRef.current?.getTracks().forEach((track) => {
      track.stop();
    });
    streamRef.current = null;

    if (localVideoRef.current) {
      localVideoRef.current.srcObject = null;
    }

    setLocalStream(null);
    setParticipants([]);
    setIsSharing(false);
    setMicOn(true);
    setCameraOn(true);
    setCallStatus("Ready to join");
    setError("");

    joiningRef.current = false;
  }, []);

  useEffect(() => {
    return () => {
      leavingRef.current = true;

      socketRef.current?.disconnect();

      peersRef.current.forEach((peer) => peer.close());
      peersRef.current.clear();
      pendingCandidatesRef.current.clear();

      streamRef.current?.getTracks().forEach((track) => {
        track.stop();
      });

      screenStreamRef.current?.getTracks().forEach((track) => {
        track.stop();
      });
    };
  }, []);

  const toggleMic = () => {
    const track = streamRef.current?.getAudioTracks()[0];
    if (!track) return;

    track.enabled = !track.enabled;
    setMicOn(track.enabled);
  };

  const toggleCamera = () => {
    const track = streamRef.current?.getVideoTracks()[0];
    if (!track) return;

    track.enabled = !track.enabled;
    setCameraOn(track.enabled);
  };

  return (
    <div className="meeting-page">
      <header className="meeting-header">
        <div className="meeting-brand">
          <span className="brand-icon">I</span>
          <div>
            <strong>IntellMeet</strong>
            <small>Video conference</small>
          </div>
        </div>

        <div className="meeting-heading">
          <strong>{selectedMeeting?.title || "Meeting Room"}</strong>
          <span className="meeting-status">{callStatus}</span>
        </div>

        <button
          type="button"
          className="chat-toggle-button"
          onClick={() => setIsChatOpen((current) => !current)}
        >
          {isChatOpen ? "Close Chat" : "Meeting Chat"}
        </button>

        <button
          type="button"
          className="exit-page-button"
          onClick={leaveCall}
        >
          Leave
        </button>
      </header>

      <div className="meeting-layout">
        <main className="meeting-main">
          <div className="meeting-info-row">
            <div>
              <h1>{selectedMeeting?.title || "Your meeting"}</h1>
              <p>
                {meetingId
                  ? `Meeting ID: ${meetingId}`
                  : "Select a meeting to get started"}
              </p>
            </div>

            {!localStream && (
              <select
                className="meeting-select"
                value={meetingId}
                onChange={(event) => {
                  setMeetingId(event.target.value);
                  setError("");
                }}
              >
                <option value="">Select meeting</option>
                {meetings.map((meeting) => (
                  <option key={meeting._id} value={meeting._id}>
                    {meeting.title}
                  </option>
                ))}
              </select>
            )}
          </div>

          <div className="video-grid">
            <div
              className={`video-tile ${!cameraOn ? "camera-off" : ""}`}
            >
              <video
                ref={localVideoRef}
                autoPlay
                muted
                playsInline
              />

              {(!localStream || !cameraOn) && (
                <div className="video-placeholder">
                  <div className="avatar-circle">
                    {(user?.name || "You")
                      .charAt(0)
                      .toUpperCase()}
                  </div>
                  <span>
                    {localStream ? "Camera is off" : "Camera preview"}
                  </span>
                </div>
              )}

              <span className="participant-name">
                {user?.name || "You"} (You)
              </span>
            </div>

            {participants.map((participant) => (
              <ParticipantTile
                key={participant.socketId}
                participant={participant}
              />
            ))}
          </div>

          {error && (
            <div className="meeting-error" role="alert">
              {error}
            </div>
          )}

          <div className="meeting-bottom-bar">
            <div className="bottom-meeting-info">
              <strong>{selectedMeeting?.title || "IntellMeet"}</strong>
              <span>
                {participants.length + (localStream ? 1 : 0)} participant(s)
              </span>
            </div>

            <div className="meeting-controls">
              {!localStream ? (
                <button
                  type="button"
                  className="control-button join-button"
                  onClick={joinCall}
                  disabled={!meetingId || joiningRef.current}
                >
                  <span>▶️</span>
                  <small>Join</small>
                </button>
              ) : (
                <>
                  <button
                    type="button"
                    className={`control-button ${!micOn ? "control-off" : ""}`}
                    onClick={toggleMic}
                  >
                    <span>{micOn ? "🎙️" : "🔇"}</span>
                    <small>{micOn ? "Mute" : "Unmute"}</small>
                  </button>

                  <button
                    type="button"
                    className={`control-button ${!cameraOn ? "control-off" : ""}`}
                    onClick={toggleCamera}
                  >
                    <span>{cameraOn ? "📹" : "🚫"}</span>
                    <small>{cameraOn ? "Camera" : "Camera off"}</small>
                  </button>

                  <button
                    type="button"
                    className="control-button"
                    onClick={isSharing ? stopScreenShare : startScreenShare}
                  >
                    <span>{isSharing ? "⏹️" : "🖥️"}</span>
                    <small>{isSharing ? "Stop sharing" : "Share screen"}</small>
                  </button>

                  <button
                    type="button"
                    className="control-button leave-button"
                    onClick={leaveCall}
                  >
                    <span>☎️</span>
                    <small>Leave</small>
                  </button>
                </>
              )}
            </div>
          </div>
        </main>

        {isChatOpen && (
          <aside className="meeting-chat-panel">
            <MessagePanel
              meetingId={meetingId}
              user={user}
            />
          </aside>
        )}
      </div>
    </div>
  );
}