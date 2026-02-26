const Appointment = require("../models/Appointment");
const User = require("../models/User");
const Notification = require("../models/Notification");
const socketHandler = require('../utils/socketHandler');
const { v4: uuidv4 } = require('uuid');

// Create appointment (patient only)
const createAppointment = async (req, res) => {
  try {
    if (!req.user || req.user.role !== "patient") {
      return res.status(403).json({ message: "Only patients can book appointments" });
    }

    const { doctorId, date, time, symptoms, notes, type = 'video' } = req.body;

    if (!doctorId || !date || !time) {
      return res.status(400).json({ message: "doctorId, date and time are required" });
    }

    // Validate date format and not in past
    const appointmentDate = new Date(date);
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    if (appointmentDate < today) {
      return res.status(400).json({ message: "Cannot book appointment for past dates" });
    }

    // Validate not more than 30 days in future
    const maxDate = new Date(today);
    maxDate.setDate(maxDate.getDate() + 30);
    if (appointmentDate > maxDate) {
      return res.status(400).json({ message: "Cannot book more than 30 days in advance" });
    }

    // Validate time format (HH:MM)
    const timeRegex = /^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/;
    if (!timeRegex.test(time)) {
      return res.status(400).json({ message: "Invalid time format. Use HH:MM (24-hour)" });
    }

    const doctor = await User.findById(doctorId);
    if (!doctor || doctor.role !== "doctor") {
      return res.status(404).json({ message: "Doctor not found" });
    }

    // Check if doctor is approved
    if (doctor.approvalStatus !== 'approved') {
      return res.status(400).json({ 
        message: "This doctor is not available for appointments at the moment" 
      });
    }

    // Check doctor availability for the day of week
    const dayName = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"][
      appointmentDate.getDay()
    ];

    const availableOnDay = doctor.availability?.some(av => av.day === dayName);
    if (!availableOnDay && doctor.availability && doctor.availability.length > 0) {
      return res.status(400).json({ 
        message: `Doctor is not available on ${dayName}` 
      });
    }

    // Check time falls within any of doctor's working hour ranges for that day
    if (doctor.availability && doctor.availability.length > 0) {
      const dayRanges = doctor.availability.filter(av => av.day === dayName);
      if (dayRanges && dayRanges.length > 0) {
        const [reqHour, reqMin] = time.split(':').map(Number);
        const reqTime = reqHour * 60 + reqMin;

        const inAnyRange = dayRanges.some((range) => {
          const [startHour, startMin] = range.startTime.split(':').map(Number);
          const [endHour, endMin] = range.endTime.split(':').map(Number);
          const startTime = startHour * 60 + startMin;
          const endTime = endHour * 60 + endMin;
          return reqTime >= startTime && reqTime < endTime;
        });

        if (!inAnyRange) {
          const rangesText = dayRanges.map(r => `${r.startTime} - ${r.endTime}`).join(', ');
          return res.status(400).json({ 
            message: `Requested time is outside doctor's working hours. Available: ${rangesText}` 
          });
        }
      }
    }

    // Check for conflicting appointments (double booking)
    const existingAppointment = await Appointment.findOne({
      doctorId,
      date: {
        $gte: new Date(appointmentDate.setHours(0, 0, 0, 0)),
        $lt: new Date(appointmentDate.setHours(23, 59, 59, 999)),
      },
      time,
      status: { $in: ['pending', 'confirmed', 'in-progress'] },
    });

    if (existingAppointment) {
      return res.status(400).json({ 
        message: "This time slot is already booked. Please choose another time." 
      });
    }

    // Generate roomId for video consultation
    const roomId = type === 'video' ? require('uuid').v4() : null;

    const appointment = await Appointment.create({
      patientId: req.user._id,
      doctorId,
      date: new Date(date),
      time,
      symptoms: symptoms || '',
      notes: notes || '',
      type,
      roomId,
      status: 'pending',
    });

    // Populate and send back
    const populatedAppointment = await appointment.populate([
      { path: 'patientId', select: '-password' },
      { path: 'doctorId', select: '-password' },
    ]);

    // Create notification for doctor
    try {
      const notif = await Notification.create({
        userId: doctorId,
        title: 'New Appointment Request',
        message: `New appointment request from ${req.user.name} on ${date} at ${time}`,
        type: 'appointment',
        from: req.user._id,
        link: `/appointments/${appointment._id}`,
      });
      socketHandler.emitToUser(doctorId.toString(), 'notification', notif);
      socketHandler.emitToRoom(`doctor_${doctorId}`, 'appointment:created', {
        appointmentId: appointment._id,
        message: 'New appointment request',
      });
    } catch (nErr) {
      console.error("Failed to create notification:", nErr);
    }

    return res.status(201).json({
      success: true,
      message: "Appointment created successfully",
      appointment: populatedAppointment,
    });
  } catch (error) {
    console.error("createAppointment error:", error);
    return res.status(500).json({ message: "Server error", error: error.message });
  }
};

// Get appointments (based on role)
const getAppointments = async (req, res) => {
  try {
    if (!req.user) {
      return res.status(401).json({ message: "Unauthorized" });
    }

    const { page = 1, limit = 10, status, search } = req.query;
    const skip = (parseInt(page) - 1) * parseInt(limit);

    let filter = {};

    if (req.user.role === 'patient') {
      filter.patientId = req.user._id;
    } else if (req.user.role === 'doctor') {
      filter.doctorId = req.user._id;
    } else if (req.user.role !== 'admin') {
      return res.status(403).json({ message: "Forbidden" });
    }

    if (status) {
      filter.status = status;
    }

    const total = await Appointment.countDocuments(filter);
    const appointments = await Appointment.find(filter)
      .populate([
        { path: 'patientId', select: '-password' },
        { path: 'doctorId', select: '-password' },
      ])
      .skip(skip)
      .limit(parseInt(limit))
      .sort({ date: -1, time: -1 });

    res.json({
      success: true,
      appointments,
      pagination: {
        total,
        page: parseInt(page),
        limit: parseInt(limit),
        pages: Math.ceil(total / parseInt(limit)),
      },
    });
  } catch (error) {
    console.error("getAppointments error:", error);
    return res.status(500).json({ message: "Server error", error: error.message });
  }
};

// Get today's appointments (doctor only)
const getTodayAppointments = async (req, res) => {
  try {
    if (!req.user || req.user.role !== 'doctor') {
      return res.status(403).json({ message: "Doctor only" });
    }

    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);

    const appointments = await Appointment.find({
      doctorId: req.user._id,
      date: { $gte: today, $lt: tomorrow },
    })
      .populate([
        { path: 'patientId', select: '-password' },
        { path: 'doctorId', select: '-password' },
      ])
      .sort({ time: 1 });

    res.json({
      success: true,
      appointments,
    });
  } catch (error) {
    console.error("getTodayAppointments error:", error);
    return res.status(500).json({ message: "Server error", error: error.message });
  }
};

// Get single appointment
const getAppointmentById = async (req, res) => {
  try {
    const { id } = req.params;

    const appointment = await Appointment.findById(id).populate([
      { path: 'patientId', select: '-password' },
      { path: 'doctorId', select: '-password' },
    ]);

    if (!appointment) {
      return res.status(404).json({ message: 'Appointment not found' });
    }

    res.json({
      success: true,
      appointment,
    });
  } catch (error) {
    console.error("getAppointmentById error:", error);
    return res.status(500).json({ message: "Server error", error: error.message });
  }
};

// Update appointment
const updateAppointment = async (req, res) => {
  try {
    const { id } = req.params;
    const { status, notes } = req.body;

    const appointment = await Appointment.findById(id);
    if (!appointment) {
      return res.status(404).json({ message: 'Appointment not found' });
    }

    // Check authorization
    if (req.user.role !== 'admin' && 
        req.user._id.toString() !== appointment.patientId.toString() &&
        req.user._id.toString() !== appointment.doctorId.toString()) {
      return res.status(403).json({ message: 'Forbidden' });
    }

    if (status) {
      appointment.status = status;
    }
    if (notes !== undefined) {
      appointment.notes = notes;
    }

    await appointment.save();

    // Notify both parties of status change
    try {
      const otherUserId = req.user._id.toString() === appointment.patientId.toString()
        ? appointment.doctorId
        : appointment.patientId;

      const notif = await Notification.create({
        userId: otherUserId,
        title: 'Appointment Status Updated',
        message: `Appointment status changed to: ${status}`,
        type: 'appointment',
        link: `/appointments/${appointment._id}`,
      });
      socketHandler.emitToUser(otherUserId.toString(), 'notification', notif);
    } catch (nErr) {
      console.error("Failed to create notification:", nErr);
    }

    const updatedAppointment = await Appointment.findById(id).populate([
      { path: 'patientId', select: '-password' },
      { path: 'doctorId', select: '-password' },
    ]);

    res.json({
      success: true,
      message: 'Appointment updated',
      appointment: updatedAppointment,
    });
  } catch (error) {
    console.error("updateAppointment error:", error);
    return res.status(500).json({ message: "Server error", error: error.message });
  }
};

// Update appointment status
const updateAppointmentStatus = async (req, res) => {
  try {
    const { id } = req.params;
    const { status } = req.body;

    if (!status) {
      return res.status(400).json({ message: 'Status is required' });
    }

    if (!['pending', 'confirmed', 'completed', 'cancelled', 'in-progress', 'rejected'].includes(status)) {
      return res.status(400).json({ message: 'Invalid status' });
    }

    // Only doctor or admin can change status
    if (req.user.role !== 'admin' && req.user.role !== 'doctor') {
      return res.status(403).json({ message: 'Forbidden' });
    }

    const appointment = await Appointment.findById(id);
    if (!appointment) {
      return res.status(404).json({ message: 'Appointment not found' });
    }

    const oldStatus = appointment.status;
    appointment.status = status;
    await appointment.save();

    // Notify patient with detailed message
    try {
      let message = `Your appointment status is now: ${status}`;
      if (status === 'in-progress') {
        message = 'Your appointment is starting now';
      } else if (status === 'completed') {
        message = 'Your appointment is complete';
      } else if (status === 'rejected') {
        message = 'Your appointment was rejected';
      }

      const notif = await Notification.create({
        userId: appointment.patientId,
        title: `Appointment ${status}`,
        message,
        type: 'appointment',
        from: req.user._id,
        link: `/appointments/${appointment._id}`,
      });
      socketHandler.emitToUser(appointment.patientId.toString(), 'notification', notif);
      socketHandler.emitToUser(appointment.patientId.toString(), 'appointment:status-changed', {
        appointmentId: appointment._id,
        status,
      });
    } catch (nErr) {
      console.error("Failed to create notification:", nErr);
    }

    // Notify doctor
    socketHandler.emitToUser(appointment.doctorId.toString(), 'appointment:status-changed', {
      appointmentId: appointment._id,
      status,
    });

    const updatedAppointment = await Appointment.findById(id).populate([
      { path: 'patientId', select: '-password' },
      { path: 'doctorId', select: '-password' },
    ]);

    res.json({
      success: true,
      message: 'Appointment status updated',
      appointment: updatedAppointment,
    });
  } catch (error) {
    console.error("updateAppointmentStatus error:", error);
    return res.status(500).json({ message: "Server error", error: error.message });
  }
};

// Delete/cancel appointment
const deleteAppointment = async (req, res) => {
  try {
    const { id } = req.params;

    const appointment = await Appointment.findById(id);
    if (!appointment) {
      return res.status(404).json({ message: 'Appointment not found' });
    }

    // Check authorization
    if (req.user.role !== 'admin' &&
        req.user._id.toString() !== appointment.patientId.toString() &&
        req.user._id.toString() !== appointment.doctorId.toString()) {
      return res.status(403).json({ message: 'Forbidden' });
    }

    appointment.status = 'cancelled';
    await appointment.save();

    // Notify other party
    try {
      const otherUserId = req.user._id.toString() === appointment.patientId.toString()
        ? appointment.doctorId
        : appointment.patientId;

      const notif = await Notification.create({
        userId: otherUserId,
        title: 'Appointment Cancelled',
        message: 'An appointment has been cancelled',
        type: 'appointment',
        link: `/appointments/${appointment._id}`,
      });
      socketHandler.emitToUser(otherUserId.toString(), 'notification', notif);
    } catch (nErr) {
      console.error("Failed to create notification:", nErr);
    }

    res.json({
      success: true,
      message: 'Appointment cancelled',
    });
  } catch (error) {
    console.error("deleteAppointment error:", error);
    return res.status(500).json({ message: "Server error", error: error.message });
  }
};

// Doctor accepts appointment
const acceptAppointment = async (req, res) => {
  try {
    const { id } = req.params;

    if (!req.user || req.user.role !== 'doctor') {
      return res.status(403).json({ message: 'Only doctors can accept appointments' });
    }

    const appointment = await Appointment.findById(id);
    if (!appointment) {
      return res.status(404).json({ message: 'Appointment not found' });
    }

    if (appointment.doctorId.toString() !== req.user._id.toString()) {
      return res.status(403).json({ message: 'Forbidden' });
    }

    if (appointment.status !== 'pending') {
      return res.status(400).json({ message: 'Only pending appointments can be accepted' });
    }

    appointment.status = 'confirmed';
    await appointment.save();

    // Notify patient
    try {
      const notif = await Notification.create({
        userId: appointment.patientId,
        title: 'Appointment Accepted',
        message: `Dr. ${req.user.name} has accepted your appointment request`,
        type: 'appointment',
        from: req.user._id,
        link: `/appointments/${appointment._id}`,
      });
      socketHandler.emitToUser(appointment.patientId.toString(), 'notification', notif);
      socketHandler.emitToRoom(`patient_${appointment.patientId}`, 'appointment:accepted', {
        appointmentId: appointment._id,
      });
    } catch (nErr) {
      console.error("Failed to create notification:", nErr);
    }

    const updatedAppointment = await Appointment.findById(id).populate([
      { path: 'patientId', select: '-password' },
      { path: 'doctorId', select: '-password' },
    ]);

    res.json({
      success: true,
      message: 'Appointment accepted',
      appointment: updatedAppointment,
    });
  } catch (error) {
    console.error('acceptAppointment error:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

// Doctor rejects appointment
const rejectAppointment = async (req, res) => {
  try {
    const { id } = req.params;
    const { reason } = req.body;

    if (!req.user || req.user.role !== 'doctor') {
      return res.status(403).json({ message: 'Only doctors can reject appointments' });
    }

    if (!reason || !reason.trim()) {
      return res.status(400).json({ message: 'Rejection reason is required' });
    }

    const appointment = await Appointment.findById(id);
    if (!appointment) {
      return res.status(404).json({ message: 'Appointment not found' });
    }

    if (appointment.doctorId.toString() !== req.user._id.toString()) {
      return res.status(403).json({ message: 'Forbidden' });
    }

    if (appointment.status !== 'pending') {
      return res.status(400).json({ message: 'Only pending appointments can be rejected' });
    }

    appointment.status = 'rejected';
    appointment.notes = reason;
    await appointment.save();

    // Notify patient
    try {
      const notif = await Notification.create({
        userId: appointment.patientId,
        title: 'Appointment Rejected',
        message: `Dr. ${req.user.name} declined your appointment request. Reason: ${reason}`,
        type: 'appointment',
        from: req.user._id,
        link: `/appointments/${appointment._id}`,
      });
      socketHandler.emitToUser(appointment.patientId.toString(), 'notification', notif);
      socketHandler.emitToRoom(`patient_${appointment.patientId}`, 'appointment:rejected', {
        appointmentId: appointment._id,
        reason,
      });
    } catch (nErr) {
      console.error("Failed to create notification:", nErr);
    }

    const updatedAppointment = await Appointment.findById(id).populate([
      { path: 'patientId', select: '-password' },
      { path: 'doctorId', select: '-password' },
    ]);

    res.json({
      success: true,
      message: 'Appointment rejected',
      appointment: updatedAppointment,
    });
  } catch (error) {
    console.error('rejectAppointment error:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

// Get available slots for doctor on a given date
const getAvailableSlots = async (req, res) => {
  try {
    const { doctorId, date } = req.query;

    if (!doctorId || !date) {
      return res.status(400).json({ message: 'doctorId and date are required' });
    }

    const doctor = await User.findById(doctorId);
    if (!doctor || doctor.role !== 'doctor') {
      return res.status(404).json({ message: 'Doctor not found' });
    }

    const appointmentDate = new Date(date);
    const dayName = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"][
      appointmentDate.getDay()
    ];

    // Find all availability ranges for this day
    const dayRanges = doctor.availability?.filter(av => av.day === dayName) || [];
    if (!dayRanges || dayRanges.length === 0) {
      return res.json({
        success: true,
        slots: [],
        message: 'Doctor not available on this day',
      });
    }

    // Generate 30-minute slots for each range, checking bookings
    const allSlots = [];

    for (const range of dayRanges) {
      const [startHour, startMin] = range.startTime.split(':').map(Number);
      const [endHour, endMin] = range.endTime.split(':').map(Number);

      let current = startHour * 60 + startMin;
      const end = endHour * 60 + endMin;

      while (current < end) {
        const hour = Math.floor(current / 60);
        const min = current % 60;
        const timeStr = `${String(hour).padStart(2, '0')}:${String(min).padStart(2, '0')}`;

        // Check if this slot is already booked
        const isBooked = await Appointment.exists({
          doctorId,
          date: {
            $gte: new Date(appointmentDate.setHours(0, 0, 0, 0)),
            $lt: new Date(appointmentDate.setHours(23, 59, 59, 999)),
          },
          time: timeStr,
          status: { $in: ['pending', 'confirmed', 'in-progress'] },
        });

        if (!isBooked) {
          allSlots.push(timeStr);
        }

        current += 30; // 30-minute slots
      }
    }

    // Deduplicate and sort
    const unique = Array.from(new Set(allSlots)).sort((a, b) => {
      const [ah, am] = a.split(':').map(Number);
      const [bh, bm] = b.split(':').map(Number);
      return ah * 60 + am - (bh * 60 + bm);
    });

    const slots = unique.map(t => ({ time: t, available: true }));

    res.json({
      success: true,
      slots,
      dayName,
      availability: dayRanges,
    });
  } catch (error) {
    console.error('getAvailableSlots error:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

// Patient cancels appointment
const cancelAppointment = async (req, res) => {
  try {
    const { id } = req.params;
    const { reason } = req.body;

    if (!req.user) {
      return res.status(401).json({ message: 'Unauthorized' });
    }

    const appointment = await Appointment.findById(id);
    if (!appointment) {
      return res.status(404).json({ message: 'Appointment not found' });
    }

    // Allow patient to cancel or doctor to cancel
    const isPatient = appointment.patientId.toString() === req.user._id.toString();
    const isDoctor = appointment.doctorId.toString() === req.user._id.toString();

    if (!isPatient && !isDoctor) {
      return res.status(403).json({ message: 'Forbidden' });
    }

    if (appointment.status === 'cancelled') {
      return res.status(400).json({ message: 'Appointment is already cancelled' });
    }

    if (appointment.status === 'completed') {
      return res.status(400).json({ message: 'Cannot cancel completed appointment' });
    }

    const cancellationReason = reason || (isPatient ? 'Patient cancelled' : 'Doctor cancelled');

    appointment.status = 'cancelled';
    appointment.notes = cancellationReason;
    await appointment.save();

    // Notify the other party
    try {
      const recipientId = isPatient ? appointment.doctorId : appointment.patientId;
      const notifTitle = isPatient ? 'Appointment Cancelled by Patient' : 'Appointment Cancelled';
      const notifMsg = isPatient
        ? `${req.user.name} cancelled the appointment. Reason: ${cancellationReason}`
        : `${req.user.name} cancelled the appointment. Reason: ${cancellationReason}`;

      const notif = await Notification.create({
        userId: recipientId,
        title: notifTitle,
        message: notifMsg,
        type: 'appointment',
        from: req.user._id,
        link: `/appointments/${appointment._id}`,
      });

      socketHandler.emitToUser(recipientId.toString(), 'notification', notif);
      socketHandler.emitToRoom(
        isPatient ? `doctor_${appointment.doctorId}` : `patient_${appointment.patientId}`,
        'appointment:cancelled',
        { appointmentId: appointment._id, reason: cancellationReason }
      );
    } catch (nErr) {
      console.error("Failed to create cancellation notification:", nErr);
    }

    const updatedAppointment = await Appointment.findById(id).populate([
      { path: 'patientId', select: '-password' },
      { path: 'doctorId', select: '-password' },
    ]);

    res.json({
      success: true,
      message: 'Appointment cancelled',
      appointment: updatedAppointment,
    });
  } catch (error) {
    console.error('cancelAppointment error:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

// Get analytics for admin dashboard
const getAppointmentAnalytics = async (req, res) => {
  try {
    const appointments = await Appointment.find();
    
    // Overall stats
    const total = appointments.length;
    const completed = appointments.filter(a => a.status === 'completed').length;
    const cancelled = appointments.filter(a => a.status === 'cancelled').length;
    const pending = appointments.filter(a => ['pending', 'confirmed'].includes(a.status)).length;
    const inProgress = appointments.filter(a => a.status === 'in-progress').length;
    
    // Cancellation breakdown — include ALL cancelled, split by cancelledBy when available
    const cancelledAppts = appointments.filter(a => a.status === 'cancelled');
    const cancelledByPatient = cancelledAppts.filter(a =>
      a.cancelledBy && a.patientId &&
      a.cancelledBy.toString() === (a.patientId?._id || a.patientId).toString()
    ).length;
    // Doctor-cancelled OR cancelled without cancelledBy field
    const cancelledByDoctor = cancelled - cancelledByPatient;

    // Monthly trends
    const lastMonths = {};
    appointments.forEach(apt => {
      const month = new Date(apt.createdAt).toLocaleDateString('en-US', { year: 'numeric', month: 'short' });
      lastMonths[month] = (lastMonths[month] || 0) + 1;
    });

    // Sort monthly trends chronologically
    const sortedMonths = {};
    Object.keys(lastMonths).sort((a, b) => new Date(a) - new Date(b)).forEach(k => {
      sortedMonths[k] = lastMonths[k];
    });

    // Status distribution
    const statusDistribution = {
      completed,
      cancelled,
      pending,
      inProgress,
    };

    res.json({
      success: true,
      data: {
        total,
        statusDistribution,
        cancelledByDoctor,
        cancelledByPatient,
        monthlyTrends: sortedMonths,
        completionRate: total > 0 ? Math.round((completed / total) * 100) : 0,
      },
    });
  } catch (error) {
    console.error('getAppointmentAnalytics error:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

// Get doctor demand analytics
const getDoctorDemandAnalytics = async (req, res) => {
  try {
    const appointments = await Appointment.aggregate([
      {
        $match: {
          status: { $in: ['completed', 'in-progress', 'confirmed'] },
        },
      },
      {
        $group: {
          _id: '$doctorId',
          appointmentCount: { $sum: 1 },
          completedCount: {
            $sum: { $cond: [{ $eq: ['$status', 'completed'] }, 1, 0] },
          },
          averageRating: { $avg: 1 }, // Placeholder for future rating system
        },
      },
      {
        $sort: { appointmentCount: -1 },
      },
      {
        $limit: 10,
      },
      {
        $lookup: {
          from: 'users',
          localField: '_id',
          foreignField: '_id',
          as: 'doctorInfo',
        },
      },
    ]);

    const doctorList = appointments.map(apt => ({
      doctorId: apt._id,
      doctorName: apt.doctorInfo[0]?.name || 'Unknown',
      specialization: apt.doctorInfo[0]?.specialization || 'N/A',
      appointmentCount: apt.appointmentCount,
      completedCount: apt.completedCount,
      cancellationRate: apt.appointmentCount > 0 
        ? Math.round(((apt.appointmentCount - apt.completedCount) / apt.appointmentCount) * 100) 
        : 0,
    }));

    res.json({
      success: true,
      data: {
        topDoctors: doctorList,
        highDemandThreshold: 10,
        highDemandDoctors: doctorList.filter(d => d.appointmentCount > 10),
      },
    });
  } catch (error) {
    console.error('getDoctorDemandAnalytics error:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

// Enhanced patient deletion with warning
const patientRequestDeletion = async (req, res) => {
  try {
    const { appointmentId } = req.params;
    const { reason } = req.body;
    const patientId = req.user._id;

    if (!appointmentId) {
      return res.status(400).json({ message: 'Appointment ID is required' });
    }

    const appointment = await Appointment.findById(appointmentId)
      .populate('doctorId', 'name email')
      .populate('patientId', 'name email');

    if (!appointment) {
      return res.status(404).json({ message: 'Appointment not found' });
    }

    if (appointment.patientId._id.toString() !== patientId.toString()) {
      return res.status(403).json({ message: 'Only patient can request deletion' });
    }

    // Create warning for doctor
    const warning = await Notification.create({
      userId: appointment.doctorId._id,
      title: 'Appointment Cancellation Notice',
      message: `Patient ${appointment.patientId.name} has cancelled the appointment scheduled for ${appointment.date}. Reason: ${reason || 'No reason provided'}`,
      type: 'warning',
      from: patientId,
      link: `/appointments/${appointmentId}`,
    });

    // Mark appointment as cancelled
    appointment.status = 'cancelled';
    appointment.cancellationReason = reason || 'Cancelled by patient';
    appointment.cancelledBy = patientId;
    appointment.cancelledAt = new Date();
    await appointment.save();

    // Emit socket event
    socketHandler.emitToUser(
      appointment.doctorId._id.toString(),
      'notification',
      warning
    );

    res.json({
      success: true,
      message: 'Appointment cancelled and doctor notified',
      appointment,
    });
  } catch (error) {
    console.error('patientRequestDeletion error:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

// Enhanced doctor rejection with warning
const doctorRejectWithWarning = async (req, res) => {
  try {
    const { appointmentId } = req.params;
    const { reason } = req.body;
    const doctorId = req.user._id;

    if (!appointmentId || !reason) {
      return res.status(400).json({ message: 'Appointment ID and rejection reason are required' });
    }

    const appointment = await Appointment.findById(appointmentId)
      .populate('doctorId', 'name email')
      .populate('patientId', 'name email');

    if (!appointment) {
      return res.status(404).json({ message: 'Appointment not found' });
    }

    if (appointment.doctorId._id.toString() !== doctorId.toString()) {
      return res.status(403).json({ message: 'Only assigned doctor can reject' });
    }

    // Create warning notification for patient
    const patientNotif = await Notification.create({
      userId: appointment.patientId._id,
      title: 'Appointment Rejection',
      message: `Doctor ${appointment.doctorId.name} has rejected your appointment. Reason: ${reason}`,
      type: 'warning',
      from: doctorId,
      link: `/appointments/${appointmentId}`,
    });

    // Update appointment
    appointment.status = 'cancelled';
    appointment.cancellationReason = `Doctor rejection: ${reason}`;
    appointment.cancelledBy = doctorId;
    appointment.cancelledAt = new Date();
    await appointment.save();

    socketHandler.emitToUser(
      appointment.patientId._id.toString(),
      'notification',
      patientNotif
    );

    res.json({
      success: true,
      message: 'Appointment rejected and patient notified',
      appointment,
    });
  } catch (error) {
    console.error('doctorRejectWithWarning error:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

// Admin send warning to doctor
const adminSendWarningToDoctor = async (req, res) => {
  try {
    const { doctorId } = req.params;
    const { reason, message } = req.body;

    if (!doctorId || !reason) {
      return res.status(400).json({ message: 'Doctor ID and reason are required' });
    }

    // Verify doctor exists
    const doctor = await User.findById(doctorId);
    if (!doctor || doctor.role !== 'doctor') {
      return res.status(404).json({ message: 'Doctor not found' });
    }

    // Create warning notification
    const warning = await Notification.create({
      userId: doctorId,
      title: `⚠️ Admin Warning: ${reason}`,
      message: message || `You have received a warning from admin: ${reason}`,
      type: 'warning',
      from: req.user._id,
      priority: 'high',
    });

    socketHandler.emitToUser(
      doctorId.toString(),
      'notification',
      warning
    );

    res.json({
      success: true,
      message: 'Warning sent to doctor',
      warning,
    });
  } catch (error) {
    console.error('adminSendWarningToDoctor error:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

module.exports = {
  createAppointment,
  getAppointments,
  getTodayAppointments,
  getAppointmentById,
  updateAppointment,
  updateAppointmentStatus,
  deleteAppointment,
  acceptAppointment,
  rejectAppointment,
  cancelAppointment,
  getAvailableSlots,
  getAppointmentAnalytics,
  getDoctorDemandAnalytics,
  patientRequestDeletion,
  doctorRejectWithWarning,
  adminSendWarningToDoctor,
};
