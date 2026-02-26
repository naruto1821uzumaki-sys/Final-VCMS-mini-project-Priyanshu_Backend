const express = require("express");
const dotenv = require("dotenv");
const path = require("path");
const http = require("http");
const { Server } = require("socket.io");
const cookieParser = require("cookie-parser"); // ✅ NEW: For httpOnly cookie support
const connectDB = require("./config/db");

// Security middleware
const {
  helmetMiddleware,
  corsMiddleware,
  securityHeaders,
  requestSizeLimiter,
  parameterPollutionProtection,
} = require("./middleware/securityConfig");

const {
  sanitizeInput,
  sanitizeXSS,
} = require("./middleware/inputSanitizer");

const SecurityService = require("./middleware/securityService");

const {
  globalLimiter,
  authLimiter,
  registerLimiter,
  criticalOperationLimiter,
} = require("./middleware/advancedRateLimiter");

const {
  trackAuthAttempt,
  trackDataModification,
  trackUnauthorizedAccess,
  trackDataAccess,
} = require("./middleware/auditLogger");

dotenv.config({ path: path.join(__dirname, ".env") });

connectDB();

const app = express();
const server = http.createServer(app);

const PORT = process.env.PORT || 5000;

/* =========================================================
   ✅ SECURITY + CORS SETUP
========================================================= */

// 1️⃣ Helmet
app.use(helmetMiddleware);

// 2️⃣ CORS (IMPORTANT FIX)
app.use(corsMiddleware);
app.options("*", corsMiddleware); // Fix preflight

// 3️⃣ Custom Security Headers
app.use(securityHeaders);

// 4️⃣ Request size limit
app.use(requestSizeLimiter("10mb"));

// 5️⃣ Parameter pollution protection
app.use(parameterPollutionProtection);

// 6️⃣ Body parsing
app.use(express.json({ limit: "10mb" }));
app.use(express.urlencoded({ extended: true, limit: "10mb" }));

// ✅ NEW: 6️⃣A Cookie parsing (for httpOnly refresh tokens)
app.use(cookieParser());

// 7️⃣ Input sanitization
app.use(sanitizeInput);
app.use(sanitizeXSS);

// 8️⃣ Global rate limiting
app.use(globalLimiter);

// 9️⃣ Audit logging (simplified for college project)
app.use(trackAuthAttempt);
app.use(trackDataModification);
app.use(trackUnauthorizedAccess);
app.use(trackDataAccess);

// Enforcement middleware: CSRF validation, payload scanning
app.use(SecurityService.enforcementMiddleware);

/* =========================================================
   ✅ ROUTES
========================================================= */

const authRoutes = require("./routes/authRoutes");
const appointmentRoutes = require("./routes/appointmentRoutes");
const prescriptionRoutes = require("./routes/prescriptionRoutes");
const notificationRoutes = require("./routes/notificationRoutes");
const adminRoutes = require("./routes/adminRoutes");
const userRoutes = require("./routes/userRoutes");
const medicalHistoryRoutes = require("./routes/medicalHistoryRoutes");
const videoRoutes = require("./routes/videoRoutes");
const chatRoutes = require("./routes/chatRoutes");
const securityRoutes = require("./routes/securityRoutes");
const consultationRoutes = require("./routes/consultationRoutes"); // ✅ NEW: Consultation form routes
const contactRoutes = require("./routes/contactRoutes"); // ✅ NEW: Contact form routes
const publicRoutes = require("./routes/publicRoutes"); // ✅ NEW: Public/guest routes

// Auth rate limiting
app.use("/api/auth/login", authLimiter);
app.use("/api/auth/register", registerLimiter);

// 🔥 Routes (CSRF removed for college project - using JWT only)
app.use("/api/public", publicRoutes); // ✅ NEW: Public routes (no auth required)
app.use("/api/auth", authRoutes);  // No CSRF for auth routes
app.use("/api/appointments", appointmentRoutes);
app.use("/api/prescriptions", prescriptionRoutes);
app.use("/api/admin", criticalOperationLimiter, adminRoutes);
app.use("/api/users", userRoutes);
app.use("/api/medical-history", medicalHistoryRoutes);
app.use("/api/consultations", consultationRoutes); // ✅ NEW: Consultation form routes
app.use("/api/notifications", notificationRoutes);
app.use("/api/video", videoRoutes);
app.use("/api/chat", chatRoutes);
app.use("/api/contact", contactRoutes); // ✅ NEW: Contact routes
app.use("/api/security", securityRoutes);

/* =========================================================
   ✅ HEALTH + ROOT
========================================================= */

app.get("/api/health", (req, res) => {
  res.json({
    status: "OK",
    timestamp: new Date().toISOString(),
    csrfToken: res.locals.csrfToken,
  });
});

app.get("/", (req, res) => {
  res.send("🔐 Secure VCMS Backend Running...");
});

/* =========================================================
   ✅ SOCKET.IO SETUP (FIXED CORS)
========================================================= */

const io = new Server(server, {
  cors: {
    origin: ["http://localhost:8081", "http://localhost:5173"],
    methods: ["GET", "POST"],
    credentials: true,
  },
});

const socketHandler = require("./utils/socketHandler");
socketHandler.init(io);

const onlineUsers = new Map();
socketHandler.setOnlineUsersMap(onlineUsers);

io.on("connection", (socket) => {
  console.log("✅ Socket connected:", socket.id);

  // ✅ NEW: User connected - register socket and update online status
  socket.on("user-connected", (data) => {
    const userId = data.userId || data;
    onlineUsers.set(userId, socket.id);
    socketHandler.registerSocket(socket.id, userId);

    console.log(`👤 User ${userId} connected with socket ${socket.id}`);

    // Emit user online to everyone
    io.emit("user-online", {
      userId,
      socketId: socket.id,
      connectedAt: new Date().toISOString(),
    });
  });

  // ✅ NEW: User reconnected - restore session and deliver queued events
  socket.on("user-reconnected", (data) => {
    const userId = data.userId || data;
    const previousRooms = data.previousRooms || [];

    // Update socket mapping
    onlineUsers.set(userId, socket.id);
    socketHandler.registerSocket(socket.id, userId);

    console.log(`🔄 User ${userId} reconnected, rejoin ${previousRooms.length} rooms`);

    // Rejoin previous rooms
    previousRooms.forEach((roomId) => {
      socket.join(roomId);
      socketHandler.addUserToRoom(userId, roomId);

      // Notify others in room that user rejoined
      io.to(roomId).emit("user-rejoined-room", {
        userId,
        roomId,
        timestamp: new Date().toISOString(),
      });
    });

    // Deliver queued events
    socketHandler.deliverQueuedEvents(userId, socket.id);

    // Send session info to client
    const sessionInfo = socketHandler.getUserSessionInfo(userId);
    socket.emit("session-restored", {
      rooms: previousRooms,
      queuedEventsCount: sessionInfo?.queuedEventsCount || 0,
      timestamp: new Date().toISOString(),
    });
  });

  // ✅ ENHANCED: Join room with session tracking
  socket.on("join-room", (data) => {
    const roomId = typeof data === 'string' ? data : data.roomId;
    const userId = data.userId;

    socket.join(roomId);

    if (userId) {
      socketHandler.addUserToRoom(userId, roomId);
    }

    console.log(`📍 Socket ${socket.id} joined room ${roomId}`);

    // Notify room that user joined
    io.to(roomId).emit("user-joined-room", {
      userId,
      roomId,
      timestamp: new Date().toISOString(),
    });
  });

  // ✅ ENHANCED: Leave room with cleanup
  socket.on("leave-room", (data) => {
    const roomId = typeof data === 'string' ? data : data.roomId;
    const userId = data.userId;

    socket.leave(roomId);

    if (userId) {
      socketHandler.removeUserFromRoom(userId, roomId);
    }

    console.log(`📍 Socket ${socket.id} left room ${roomId}`);

    // Notify room that user left
    io.to(roomId).emit("user-left-room", {
      userId,
      roomId,
      timestamp: new Date().toISOString(),
    });
  });

  // ✅ NEW: Store session data for persistence
  socket.on("store-session-data", (data) => {
    const { userId, key, value } = data;
    if (userId && key) {
      socketHandler.setSessionData(userId, key, value);
    }
  });

  // ✅ NEW: Get session data
  socket.on("get-session-info", (userId, callback) => {
    const sessionInfo = socketHandler.getUserSessionInfo(userId);
    if (callback) {
      callback(sessionInfo);
    }
  });

  // ✅ ENHANCED: Video consultation events
  socket.on("video:offer", (data) => {
    const { to, offer, roomId } = data;
    socketHandler.emitToUser(to, "video:offer", {
      offer,
      from: socket.id,
      roomId,
    });
  });

  socket.on("video:answer", (data) => {
    const { to, answer, roomId } = data;
    socketHandler.emitToUser(to, "video:answer", {
      answer,
      from: socket.id,
      roomId,
    });
  });

  socket.on("video:ice-candidate", (data) => {
    const { to, candidate, roomId } = data;
    socketHandler.emitToUser(to, "video:ice-candidate", {
      candidate,
      from: socket.id,
      roomId,
    });
  });

  socket.on("video:end-call", (data) => {
    const { to, roomId } = data;
    socketHandler.emitToUser(to, "video:end-call", {
      from: socket.id,
      roomId,
    });
  });

  // ✅ ENHANCED: Chat events
  socket.on("chat:message", (data) => {
    const { to, message, roomId } = data;
    socketHandler.emitToUser(to, "chat:message", {
      message,
      from: socket.id,
      roomId,
      timestamp: new Date().toISOString(),
    });
  });

  // ✅ NEW: Real-time appointment status changes
  socket.on("appointment:status-changed", (data) => {
    const { appointmentId, patientId, doctorId, status } = data;
    socketHandler.emitAppointmentStatusChanged(
      appointmentId,
      patientId,
      doctorId,
      status
    );
  });

  // ✅ NEW: Real-time prescription issued
  socket.on("prescription:issued", (data) => {
    const { prescriptionId, patientId, doctorId } = data;
    socketHandler.emitPrescriptionIssued(prescriptionId, patientId, doctorId);
  });

  // ✅ NEW: Doctor approval changed
  socket.on("doctor:approved", (data) => {
    const { doctorId, doctor } = data;
    socketHandler.emitDoctorApproved(doctorId, doctor);
  });

  // ✅ NEW: Doctor rejected
  socket.on("doctor:rejected", (data) => {
    const { doctorId, reason } = data;
    socketHandler.emitDoctorRejected(doctorId, reason);
  });

  // ✅ NEW: Broadcast admin event
  socket.on("admin:broadcast", (data) => {
    const { event, payload } = data;
    socketHandler.emitToAllAdmins(event, payload);
  });

  // ✅ NEW: Disconnect handler with session cleanup
  socket.on("disconnect", () => {
    let disconnectedUserId = null;

    // Find and remove user from online map
    for (const [userId, sid] of onlineUsers.entries()) {
      if (sid === socket.id) {
        onlineUsers.delete(userId);
        socketHandler.unregisterSocket(socket.id);
        disconnectedUserId = userId;

        console.log(`👤 User ${userId} disconnected`);

        // Emit user offline event
        io.emit("user-offline", {
          userId,
          disconnectedAt: new Date().toISOString(),
        });

        break;
      }
    }

    console.log(`❌ Socket disconnected: ${socket.id}`);
  });

  // ✅ NEW: Handle errors
  socket.on("error", (error) => {
    console.error("Socket error:", error);
  });
});

/* =========================================================
   ✅ ERROR HANDLER
========================================================= */

const errorHandler = require("./middleware/errorHandler");
app.use(errorHandler);

/* =========================================================
   ✅ START SERVER
========================================================= */

server.listen(PORT, () => {
  console.log(`🚀 Secure VCMS Server running on port ${PORT}`);
  console.log(`Environment: ${process.env.NODE_ENV || "development"}`);
});
