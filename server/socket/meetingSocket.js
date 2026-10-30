
const Message = require("../models/Message");

module.exports = function registerMeetingSocket(io) {
  const meetingParticipants = new Map();

  const roomName = (meetingId) => `meeting:${meetingId}`;

  function removeParticipant(socket, meetingId) {
    if (!meetingId) return;

    const participants = meetingParticipants.get(meetingId);

    if (participants) {
      participants.delete(socket.id);

      if (participants.size === 0) {
        meetingParticipants.delete(meetingId);
      }
    }

    socket.to(roomName(meetingId)).emit("participant-left", {
      socketId: socket.id,
    });

    socket.leave(roomName(meetingId));

    socket.data.meetingId = null;
    socket.data.meetingReady = false;
    socket.data.meetingUser = null;
  }

  io.on("connection", (socket) => {
    console.log("Socket connected:", socket.id);

    socket.on("join-meeting", (data = {}) => {
      const meetingId =
        typeof data === "string" ? data : data?.meetingId;

      const user =
        typeof data === "object" && data !== null
          ? data.user || {}
          : {};

      if (
        typeof meetingId !== "string" ||
        !/^[a-fA-F0-9]{24}$/.test(meetingId)
      ) {
        socket.emit("meeting-error", {
          message: "Invalid meeting ID",
        });
        return;
      }

      const safeUser = {
        name:
          typeof user.name === "string" && user.name.trim()
            ? user.name.trim().slice(0, 100)
            : "Participant",
      };

      // Already in the same meeting.
      if (socket.data.meetingId === meetingId) {
        socket.data.meetingUser = safeUser;

        const current = meetingParticipants.get(meetingId);

        if (current?.has(socket.id)) {
          current.get(socket.id).user = safeUser;
        }

        socket.emit("existing-participants", {
          participants: Array.from(current?.entries() || [])
            .filter(([id]) => id !== socket.id)
            .map(([socketId, participant]) => ({
              socketId,
              user: participant.user,
            })),
        });

        return;
      }

      // Leave the previous meeting before joining another.
      if (socket.data.meetingId) {
        removeParticipant(socket, socket.data.meetingId);
      }

      const room = roomName(meetingId);

      let participants = meetingParticipants.get(meetingId);

      if (!participants) {
        participants = new Map();
        meetingParticipants.set(meetingId, participants);
      }

      const existingParticipants = Array.from(
        participants.entries()
      ).map(([socketId, participant]) => ({
        socketId,
        user: participant.user,
      }));

      socket.data.meetingId = meetingId;
      socket.data.meetingReady = true;
      socket.data.meetingUser = safeUser;

      participants.set(socket.id, {
        user: safeUser,
      });

      socket.join(room);

      console.log("Meeting room:", room);
      console.log("Total participants:", participants.size);
      console.log(
      "Participants:",
      Array.from(participants.keys())
    );

      socket.emit("existing-participants", {
        participants: existingParticipants,
      });

      socket.to(room).emit("participant-joined", {
        socketId: socket.id,
        user: safeUser,
      });

      console.log(`${safeUser.name} joined meeting ${meetingId}`);
    });



    socket.on("webrtc-offer", (data = {}) => {
      const { meetingId, targetSocketId, offer, user } = data;
      
        console.log("Received WebRTC offer:", {
        from: socket.id,
        to: targetSocketId,
        meetingId,
      });

      if (
        socket.data.meetingId !== meetingId ||
        !targetSocketId ||
        !offer ||
        offer.type !== "offer" ||
        typeof offer.sdp !== "string"
      ) {
        return;
      }

      const target = io.sockets.sockets.get(targetSocketId);

      if (
        !target ||
        target.data.meetingId !== meetingId ||
        !target.data.meetingReady
      ) {
        return;
      }

      target.emit("webrtc-offer", {
        fromSocketId: socket.id,
        offer,
        user: user || socket.data.meetingUser,
      });
    });

    socket.on("webrtc-answer", (data = {}) => {
      const { meetingId, targetSocketId, answer } = data;

      if (
        socket.data.meetingId !== meetingId ||
        !targetSocketId ||
        !answer ||
        answer.type !== "answer" ||
        typeof answer.sdp !== "string"
      ) {
        return;
      }

      const target = io.sockets.sockets.get(targetSocketId);

      if (!target || target.data.meetingId !== meetingId) {
        return;
      }

      target.emit("webrtc-answer", {
        fromSocketId: socket.id,
        answer,
      });
    });

    socket.on("webrtc-ice-candidate", (data = {}) => {
      const { meetingId, targetSocketId, candidate } = data;

      if (
        socket.data.meetingId !== meetingId ||
        !targetSocketId ||
        !candidate
      ) {
        return;
      }

      const target = io.sockets.sockets.get(targetSocketId);

      if (!target || target.data.meetingId !== meetingId) {
        return;
      }

      target.emit("webrtc-ice-candidate", {
        fromSocketId: socket.id,
        candidate,
      });
    });

    socket.on("send-message", async (data = {}, callback) => {
      try {
        const { meetingId, senderId, senderName, text } = data;

        if (
          socket.data.meetingId !== meetingId ||
          typeof senderId !== "string" ||
          !senderId.trim() ||
          typeof senderName !== "string" ||
          !senderName.trim() ||
          typeof text !== "string" ||
          !text.trim() ||
          text.length > 5000
        ) {
          if (typeof callback === "function") {
            callback({
              error: "Invalid message data or not in meeting",
            });
          }
          return;
        }

        const message = await Message.create({
          meetingId,
          senderId: senderId.trim(),
          senderName: senderName.trim(),
          text: text.trim(),
        });

        io.to(roomName(meetingId)).emit(
          "receive-message",
          message.toObject()
        );

        if (typeof callback === "function") {
          callback({
            success: true,
            messageId: message._id,
          });
        }
      } catch (error) {
        console.error("Message error:", error.message);

        if (typeof callback === "function") {
          callback({ error: "Could not send message" });
        }
      }
    });

    socket.on("leave-meeting", (data = {}) => {
      const meetingId =
        typeof data === "string" ? data : data?.meetingId;

      if (socket.data.meetingId !== meetingId) return;

      removeParticipant(socket, meetingId);

      console.log(`${socket.id} left meeting ${meetingId}`);
    });

    socket.on("disconnect", () => {
      const meetingId = socket.data.meetingId;

      if (meetingId) {
        removeParticipant(socket, meetingId);
      }

      console.log("Socket disconnected:", socket.id);
    });
  });
};
