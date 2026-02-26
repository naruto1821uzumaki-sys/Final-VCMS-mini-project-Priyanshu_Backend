/**
 * Enhanced Socket.io Handler
 * Features: Room management, reconnection handling, offline queuing, session tracking
 */

let ioInstance = null;
let onlineUsersMap = null;

// ✅ NEW: Room management - track user rooms and session data
const roomSessions = new Map(); // userId → { rooms: [], sessionData: {} }
const socketUserMap = new Map(); // socketId → userId
const eventQueue = new Map(); // userId → [{ event, payload, timestamp }]

// ✅ NEW: Initialize Socket.io instance
const init = (io) => {
  ioInstance = io;
};

// ✅ NEW: Set online users map
const setOnlineUsersMap = (map) => {
  onlineUsersMap = map;
};

// ✅ NEW: Register socket-to-user mapping
const registerSocket = (socketId, userId) => {
  socketUserMap.set(socketId, userId);
};

// ✅ NEW: Unregister socket-to-user mapping
const unregisterSocket = (socketId) => {
  socketUserMap.delete(socketId);
};

/**
 * ✅ NEW: Add user to room and track session
 * Handles room transitions and session persistence
 */
const addUserToRoom = (userId, roomId) => {
  if (!roomSessions.has(userId)) {
    roomSessions.set(userId, { rooms: [], sessionData: {} });
  }

  const session = roomSessions.get(userId);
  if (!session.rooms.includes(roomId)) {
    session.rooms.push(roomId);
  }

  // Emit room join event to others in room
  if (ioInstance) {
    ioInstance.to(roomId).emit('user-joined-room', {
      userId,
      roomId,
      timestamp: new Date().toISOString(),
      userCount: ioInstance.sockets.adapter.rooms.get(roomId)?.size || 0,
    });
  }
};

/**
 * ✅ NEW: Remove user from room
 */
const removeUserFromRoom = (userId, roomId) => {
  if (roomSessions.has(userId)) {
    const session = roomSessions.get(userId);
    session.rooms = session.rooms.filter(r => r !== roomId);

    // Emit room leave event
    if (ioInstance) {
      ioInstance.to(roomId).emit('user-left-room', {
        userId,
        roomId,
        timestamp: new Date().toISOString(),
      });
    }
  }
};

/**
 * ✅ NEW: Get user's rooms
 */
const getUserRooms = (userId) => {
  if (roomSessions.has(userId)) {
    return roomSessions.get(userId).rooms;
  }
  return [];
};

/**
 * ✅ NEW: Store session data for offline persistence
 */
const setSessionData = (userId, key, value) => {
  if (!roomSessions.has(userId)) {
    roomSessions.set(userId, { rooms: [], sessionData: {} });
  }

  const session = roomSessions.get(userId);
  session.sessionData[key] = {
    value,
    setAt: new Date().toISOString(),
  };
};

/**
 * ✅ NEW: Get session data
 */
const getSessionData = (userId, key) => {
  if (roomSessions.has(userId)) {
    const session = roomSessions.get(userId);
    if (session.sessionData[key]) {
      return session.sessionData[key].value;
    }
  }
  return null;
};

/**
 * ✅ NEW: Emit to specific user with offline queuing
 */
const emitToUser = (userId, event, payload, map) => {
  if (!ioInstance) return;

  const m = map || onlineUsersMap;
  if (m && m.has(userId)) {
    const sid = m.get(userId);
    ioInstance.to(sid).emit(event, {
      ...payload,
      timestamp: new Date().toISOString(),
    });
  } else {
    // Queue event if user is offline
    queueEventForUser(userId, event, payload);
  }
};

/**
 * ✅ NEW: Emit to room
 */
const emitToRoom = (roomId, event, payload) => {
  if (!ioInstance) return;

  ioInstance.to(roomId).emit(event, {
    ...payload,
    timestamp: new Date().toISOString(),
    roomId,
  });
};

/**
 * ✅ NEW: Queue event for offline user
 */
const queueEventForUser = (userId, event, payload) => {
  if (!eventQueue.has(userId)) {
    eventQueue.set(userId, []);
  }

  const queue = eventQueue.get(userId);
  queue.push({
    event,
    payload,
    timestamp: new Date().toISOString(),
  });

  // Keep only last 50 events per user (memory limit)
  if (queue.length > 50) {
    queue.shift();
  }
};

/**
 * ✅ NEW: Deliver queued events to user on reconnect
 */
const deliverQueuedEvents = (userId, socketId) => {
  if (!eventQueue.has(userId) || !ioInstance) return;

  const queue = eventQueue.get(userId);
  const socket = ioInstance.to(socketId);

  queue.forEach(({ event, payload, timestamp }) => {
    socket.emit('queued-event', {
      event,
      payload,
      originalTimestamp: timestamp,
      deliveredAt: new Date().toISOString(),
    });
  });

  // Clear queue after delivery
  eventQueue.delete(userId);
};

/**
 * ✅ NEW: Broadcast to all admins
 */
const emitToAllAdmins = (event, payload) => {
  if (!ioInstance) return;

  ioInstance.emit(`admin:${event}`, {
    ...payload,
    timestamp: new Date().toISOString(),
  });
};

/**
 * ✅ NEW: Broadcast stats update
 */
const broadcastStatsUpdate = () => {
  if (!ioInstance) return;

  ioInstance.emit('admin:stats-updated', {
    timestamp: new Date().toISOString(),
    onlineUsers: onlineUsersMap ? onlineUsersMap.size : 0,
  });
};

/**
 * ✅ NEW: Broadcast new appointment
 */
const broadcastNewAppointment = (appointment) => {
  if (!ioInstance) return;

  ioInstance.emit('admin:new-appointment', {
    appointment,
    timestamp: new Date().toISOString(),
  });

  // Also emit to relevant doctor
  if (appointment.doctorId) {
    emitToUser(appointment.doctorId.toString(), 'appointment-created', {
      appointment,
    });
  }
};

/**
 * ✅ NEW: Broadcast doctor registration
 */
const broadcastDoctorRegistered = (doctor) => {
  if (!ioInstance) return;

  ioInstance.emit('admin:doctor-registered', {
    doctor,
    timestamp: new Date().toISOString(),
  });
};

/**
 * ✅ NEW: Emit doctor approval to doctor
 */
const emitDoctorApproved = (doctorId, doctor) => {
  if (!ioInstance) return;

  emitToUser(doctorId, 'doctor-approved', {
    message: 'Your registration has been approved!',
    doctor,
  });

  // Broadcast to admins too
  emitToAllAdmins('doctor-approved-changed', {
    doctorId,
    status: 'approved',
  });
};

/**
 * ✅ NEW: Emit doctor rejection to doctor
 */
const emitDoctorRejected = (doctorId, reason) => {
  if (!ioInstance) return;

  emitToUser(doctorId, 'doctor-rejected', {
    message: 'Your registration has been rejected.',
    reason,
  });

  // Broadcast to admins
  emitToAllAdmins('doctor-rejected-changed', {
    doctorId,
    status: 'rejected',
    reason,
  });
};

/**
 * ✅ NEW: Emit appointment status change
 */
const emitAppointmentStatusChanged = (appointmentId, patientId, doctorId, status) => {
  if (!ioInstance) return;

  const payload = {
    appointmentId,
    status,
    timestamp: new Date().toISOString(),
  };

  // Notify patient
  if (patientId) {
    emitToUser(patientId.toString(), 'appointment-status-changed', payload);
  }

  // Notify doctor
  if (doctorId) {
    emitToUser(doctorId.toString(), 'appointment-status-changed', payload);
  }

  // Broadcast to admins
  emitToAllAdmins('appointment-status-changed', payload);
};

/**
 * ✅ NEW: Emit prescription issued
 */
const emitPrescriptionIssued = (prescriptionId, patientId, doctorId) => {
  if (!ioInstance) return;

  const payload = {
    prescriptionId,
    message: 'New prescription issued',
    timestamp: new Date().toISOString(),
  };

  // Notify patient
  if (patientId) {
    emitToUser(patientId.toString(), 'prescription-issued', payload);
  }

  // Notify doctor
  if (doctorId) {
    emitToUser(doctorId.toString(), 'prescription-issued', payload);
  }
};

/**
 * ✅ NEW: Get user's session info
 */
const getUserSessionInfo = (userId) => {
  if (roomSessions.has(userId)) {
    const session = roomSessions.get(userId);
    return {
      rooms: session.rooms,
      sessionData: session.sessionData,
      hasQueuedEvents: eventQueue.has(userId),
      queuedEventsCount: eventQueue.has(userId) ? eventQueue.get(userId).length : 0,
    };
  }
  return null;
};

/**
 * ✅ NEW: Clear user session on logout
 */
const clearUserSession = (userId) => {
  roomSessions.delete(userId);
  eventQueue.delete(userId);
};

module.exports = {
  init,
  setOnlineUsersMap,
  registerSocket,
  unregisterSocket,
  addUserToRoom,
  removeUserFromRoom,
  getUserRooms,
  setSessionData,
  getSessionData,
  emitToUser,
  emitToRoom,
  queueEventForUser,
  deliverQueuedEvents,
  emitToAllAdmins,
  broadcastStatsUpdate,
  broadcastNewAppointment,
  broadcastDoctorRegistered,
  emitDoctorApproved,
  emitDoctorRejected,
  emitAppointmentStatusChanged,
  emitPrescriptionIssued,
  getUserSessionInfo,
  clearUserSession,
};
