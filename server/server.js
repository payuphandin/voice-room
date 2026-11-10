import "dotenv/config";
import express from "express";
import cors from "cors";
import { createServer } from "node:http";
import { Server } from "socket.io";

const app = express();
const httpServer = createServer(app);

const CLIENT_ORIGIN = process.env.CLIENT_ORIGIN || "http://localhost:3000";
const ROOM_ID = "main-room";

// Express Middleware
app.use(
  cors({
    origin: CLIENT_ORIGIN,
  }),
);

app.use(express.json());

// Socket.IO Server
const io = new Server(httpServer, {
  cors: {
    origin: CLIENT_ORIGIN,
    methods: ["GET", "POST"],
  },
});

// HTTP Health Check
app.get("/health", (req, res) => {
  res.json({
    status: "ok",
    message: "Voice Room Server is running",
  });
});

io.on("connection", (socket) => {
  console.log(`Client connected: ${socket.id}`);

  socket.emit("server:welcome", {
    message: "Connected to Voice Room Server",
  });

  // Promote the remaining member to initiator when the other member leaves.
  socket.on("disconnecting", () => {
    const room = io.sockets.adapter.rooms.get(ROOM_ID);

    if (!socket.rooms.has(ROOM_ID) || !room) return;

    for (const peerId of room) {
      if (peerId === socket.id) continue;

      const peerSocket = io.sockets.sockets.get(peerId);

      if (peerSocket) {
        peerSocket.data.isInitiator = true;
      }
    }

    socket.to(ROOM_ID).emit("room:peer-left", {
      members: Math.max(0, room.size - 1),
      isInitiator: true,
    });
  });

  socket.on("disconnect", (reason) => {
    console.log(`Client disconnected: ${socket.id}`);
    console.log(`Reason: ${reason}`);
  });

  // Join the single room. The first member becomes the offer initiator.
  socket.on("room:join", () => {
    // Prevent the same socket from joining twice.
    if (socket.rooms.has(ROOM_ID)) {
      const currentRoom = io.sockets.adapter.rooms.get(ROOM_ID);

      socket.emit("room:joined", {
        members: currentRoom?.size ?? 0,
        isInitiator: Boolean(socket.data.isInitiator),
      });
      return;
    }

    const room = io.sockets.adapter.rooms.get(ROOM_ID);

    if (room && room.size >= 2) {
      socket.emit("room:error", {
        message: "Room is full",
      });
      return;
    }

    socket.join(ROOM_ID);

    const members = io.sockets.adapter.rooms.get(ROOM_ID);
    const memberCount = members?.size ?? 0;
    const isInitiator = memberCount === 1;

    socket.data.isInitiator = isInitiator;

    console.log(`Socket ${socket.id} joined room`);

    socket.to(ROOM_ID).emit("room:peer-joined", {
      members: memberCount,
    });

    socket.emit("room:joined", {
      members: memberCount,
      isInitiator,
    });
  });

  // Relay WebRTC signaling data only to the other member in this room.
  const relaySignal = (eventName) => {
    socket.on(eventName, (data) => {
      if (!socket.rooms.has(ROOM_ID)) return;
      if (!data || typeof data !== "object") return;

      socket.to(ROOM_ID).emit(eventName, data);
    });
  };

  relaySignal("webrtc:offer");
  relaySignal("webrtc:answer");
  relaySignal("webrtc:ice-candidate");
});

const PORT = process.env.PORT || 7000;

httpServer.listen(PORT, "0.0.0.0", () => {
  console.log(`Server listening on port ${PORT}`);
});
