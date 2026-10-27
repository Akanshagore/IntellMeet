import { useEffect, useRef, useState } from "react";
import "./ScreenShare.css";

export default function ScreenShare({
  peerConnection,
  localStream,
}) {
  const [isSharing, setIsSharing] = useState(false);
  const [error, setError] = useState("");

  const screenStreamRef = useRef(null);
  const senderRef = useRef(null);
  const cameraTrackRef = useRef(null);
  const stoppingRef = useRef(false);

  async function startSharing() {
    setError("");

    if (!peerConnection || peerConnection.connectionState === "closed") {
      setError("Please join the meeting before sharing your screen.");
      return;
    }

    if (!navigator.mediaDevices?.getDisplayMedia) {
      setError("Screen sharing is not supported in this browser.");
      return;
    }

    try {
      const cameraTrack = localStream?.getVideoTracks()[0];

      if (!cameraTrack) {
        setError("Camera video is not ready. Please rejoin the meeting.");
        return;
      }

      const sender = peerConnection
        .getSenders()
        .find((item) => item.track?.kind === "video");

      if (!sender) {
        setError("Video connection is not ready. Please rejoin the meeting.");
        return;
      }

      const screenStream =
        await navigator.mediaDevices.getDisplayMedia({
          video: true,
          audio: false,
        });

      const screenTrack = screenStream.getVideoTracks()[0];

      if (!screenTrack) {
        screenStream.getTracks().forEach((track) => track.stop());
        setError("Could not capture your screen.");
        return;
      }

      screenStreamRef.current = screenStream;
      senderRef.current = sender;
      cameraTrackRef.current = cameraTrack;

      await sender.replaceTrack(screenTrack);

      setIsSharing(true);

      screenTrack.onended = () => {
        stopSharing();
      };
    } catch (err) {
      screenStreamRef.current?.getTracks().forEach((track) => {
        track.stop();
      });

      screenStreamRef.current = null;
      senderRef.current = null;
      cameraTrackRef.current = null;

      if (err.name === "NotAllowedError") {
        setError("Screen sharing was cancelled or permission was denied.");
      } else {
        setError(err.message || "Unable to share your screen.");
      }
    }
  }

  async function stopSharing() {
    if (stoppingRef.current || !screenStreamRef.current) return;

    stoppingRef.current = true;

    const screenStream = screenStreamRef.current;
    const sender = senderRef.current;
    const cameraTrack = cameraTrackRef.current;

    // Clear refs first so the browser's onended event cannot run twice.
    screenStreamRef.current = null;
    senderRef.current = null;
    cameraTrackRef.current = null;

    try {
      if (
        sender &&
        cameraTrack &&
        peerConnection &&
        peerConnection.connectionState !== "closed"
      ) {
        await sender.replaceTrack(cameraTrack);
      }
    } catch (err) {
      setError("Could not restore camera video. Please rejoin the meeting.");
    } finally {
      screenStream.getTracks().forEach((track) => track.stop());
      setIsSharing(false);
      stoppingRef.current = false;
    }
  }

  useEffect(() => {
    return () => {
      const screenStream = screenStreamRef.current;
      const sender = senderRef.current;
      const cameraTrack = cameraTrackRef.current;

      screenStreamRef.current = null;
      senderRef.current = null;
      cameraTrackRef.current = null;

      if (sender && cameraTrack && peerConnection &&
          peerConnection.connectionState !== "closed") {
        sender.replaceTrack(cameraTrack).catch(() => {});
      }

      screenStream?.getTracks().forEach((track) => track.stop());
    };
  }, [peerConnection]);

  return (
    <div className="screen-share-control">
      {!isSharing ? (
        <button
          type="button"
          className="screen-start-button"
          onClick={startSharing}
          disabled={!localStream || !peerConnection}
        >
          <span>🖥️</span>
          <small>Share Screen</small>
        </button>
      ) : (
        <button
          type="button"
          className="screen-stop-button"
          onClick={stopSharing}
        >
          <span>⏹️</span>
          <small>Stop Sharing</small>
        </button>
      )}

      {error && (
        <p className="screen-share-error" role="alert">
          {error}
        </p>
      )}
    </div>
  );
}