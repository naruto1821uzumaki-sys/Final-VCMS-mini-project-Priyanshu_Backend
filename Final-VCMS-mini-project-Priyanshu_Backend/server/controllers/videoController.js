const VideoSession = require('../models/VideoSession');
const Appointment = require('../models/Appointment');
const { v4: uuidv4 } = require('uuid');

// Create video room for appointment
const createRoom = async (req, res) => {
  try {
    if (!req.user) {
      return res.status(401).json({ message: 'Unauthorized' });
    }

    const { appointmentId } = req.body;
    if (!appointmentId) {
      return res.status(400).json({ message: 'appointmentId is required' });
    }

    const appointment = await Appointment.findById(appointmentId);
    if (!appointment) {
      return res.status(404).json({ message: 'Appointment not found' });
    }

    // Only participants (doctor/patient) or admin can create session
    if (req.user.role !== 'admin' &&
        req.user._id.toString() !== appointment.doctorId.toString() &&
        req.user._id.toString() !== appointment.patientId.toString()) {
      return res.status(403).json({ message: 'Forbidden' });
    }

    // Check if session already exists for this appointment
    let session = await VideoSession.findOne({ appointmentId });
    
    if (!session) {
      const roomId = uuidv4();
      session = await VideoSession.create({
        appointmentId,
        roomId,
        doctorId: appointment.doctorId,
        patientId: appointment.patientId,
        status: 'waiting',
      });
    }

    const populated = await VideoSession.findById(session._id).populate([
      { path: 'appointmentId' },
      { path: 'doctorId', select: '-password' },
      { path: 'patientId', select: '-password' },
    ]);

    res.json({
      success: true,
      session: populated,
    });
  } catch (err) {
    console.error('createRoom error:', err);
    res.status(500).json({ message: 'Server error' });
  }
};

// Get room details by roomId
const getRoom = async (req, res) => {
  try {
    const { roomId } = req.params;
    if (!req.user) {
      return res.status(401).json({ message: 'Unauthorized' });
    }

    const session = await VideoSession.findOne({ roomId }).populate([
      { path: 'appointmentId' },
      { path: 'doctorId', select: '-password' },
      { path: 'patientId', select: '-password' },
    ]);

    if (!session) {
      return res.status(404).json({ message: 'Room not found' });
    }

    res.json({
      success: true,
      session,
    });
  } catch (err) {
    console.error('getRoom error:', err);
    res.status(500).json({ message: 'Server error' });
  }
};

// Update room status
const updateRoomStatus = async (req, res) => {
  try {
    if (!req.user) {
      return res.status(401).json({ message: 'Unauthorized' });
    }

    const { roomId } = req.params;
    const { status } = req.body;

    if (!status || !['waiting', 'active', 'ended'].includes(status)) {
      return res.status(400).json({ message: 'Valid status is required (waiting, active, ended)' });
    }

    const session = await VideoSession.findOne({ roomId });
    if (!session) {
      return res.status(404).json({ message: 'Room not found' });
    }

    // Only participants can update
    if (req.user._id.toString() !== session.doctorId.toString() &&
        req.user._id.toString() !== session.patientId.toString()) {
      return res.status(403).json({ message: 'Forbidden' });
    }

    session.status = status;

    if (status === 'active' && !session.startTime) {
      session.startTime = new Date();
    } else if (status === 'ended' && !session.endTime) {
      session.endTime = new Date();
    }

    await session.save();

    const populated = await VideoSession.findById(session._id).populate([
      { path: 'appointmentId' },
      { path: 'doctorId', select: '-password' },
      { path: 'patientId', select: '-password' },
    ]);

    res.json({
      success: true,
      message: 'Room status updated',
      session: populated,
    });
  } catch (err) {
    console.error('updateRoomStatus error:', err);
    res.status(500).json({ message: 'Server error' });
  }
};

// Get room by appointment ID
const getRoomByAppointment = async (req, res) => {
  try {
    const { appointmentId } = req.params;
    if (!req.user) {
      return res.status(401).json({ message: 'Unauthorized' });
    }

    const session = await VideoSession.findOne({ appointmentId }).populate([
      { path: 'appointmentId' },
      { path: 'doctorId', select: '-password' },
      { path: 'patientId', select: '-password' },
    ]);

    if (!session) {
      return res.status(404).json({ message: 'Session not found' });
    }

    res.json({
      success: true,
      session,
    });
  } catch (err) {
    console.error('getRoomByAppointment error:', err);
    res.status(500).json({ message: 'Server error' });
  }
};

module.exports = {
  createRoom,
  getRoom,
  updateRoomStatus,
  getRoomByAppointment,
};
