const express = require('express');
const router = express.Router();
const { protect } = require('../middleware/authMiddleware');
const {
  createRoom,
  getRoom,
  updateRoomStatus,
  getRoomByAppointment,
} = require('../controllers/videoController');

// POST /create-room - Create video room for appointment
router.post('/create-room', protect, createRoom);

// GET /room/:roomId - Get room details
router.get('/room/:roomId', protect, getRoom);

// PUT /room/:roomId/status - Update room status
router.put('/room/:roomId/status', protect, updateRoomStatus);

// GET /room/:appointmentId - Get room by appointment ID
router.get('/appointment/:appointmentId', protect, getRoomByAppointment);

module.exports = router;