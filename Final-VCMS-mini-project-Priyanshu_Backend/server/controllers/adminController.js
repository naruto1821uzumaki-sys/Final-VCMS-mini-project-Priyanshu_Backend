const User = require("../models/User");
const Appointment = require("../models/Appointment");
const Prescription = require("../models/Prescription");

// Ensure only admin can access
const ensureAdmin = (req, res) => {
  if (!req.user || req.user.role !== "admin") {
    res.status(403).json({ message: "Forbidden: admin only" });
    return false;
  }
  return true;
};

// Get dashboard statistics (Enhanced with Aggregation)
const getDashboardStats = async (req, res) => {
  try {
    if (!ensureAdmin(req, res)) return;

    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);

    // ✅ NEW: Use aggregation pipeline for better performance
    const stats = await User.aggregate([
      {
        $facet: {
          // Total users (excluding deleted)
          totalUsers: [
            {
              $match: {
                $or: [
                  { isDeleted: { $exists: false } },
                  { isDeleted: false }
                ]
              }
            },
            { $count: "count" }
          ],
          // Total doctors (excluding deleted)
          totalDoctors: [
            {
              $match: {
                role: "doctor",
                $or: [
                  { isDeleted: { $exists: false } },
                  { isDeleted: false }
                ]
              }
            },
            { $count: "count" }
          ],
          // Total patients (excluding deleted)
          totalPatients: [
            {
              $match: {
                role: "patient",
                $or: [
                  { isDeleted: { $exists: false } },
                  { isDeleted: false }
                ]
              }
            },
            { $count: "count" }
          ],
          // Pending approvals (doctors waiting approval)
          pendingDoctors: [
            {
              $match: {
                role: "doctor",
                approvalStatus: { $in: ["pending", null] },
                $or: [
                  { isDeleted: { $exists: false } },
                  { isDeleted: false }
                ]
              }
            },
            { $count: "count" }
          ],
        }
      }
    ]);

    // Get appointment stats separately (different collection)
    const appointmentStats = await Appointment.aggregate([
      {
        $facet: {
          totalAppointments: [
            { $count: "count" }
          ],
          todayAppointments: [
            {
              $match: {
                date: { $gte: today, $lt: tomorrow }
              }
            },
            { $count: "count" }
          ],
          pendingAppointments: [
            { $match: { status: "pending" } },
            { $count: "count" }
          ],
          confirmedAppointments: [
            { $match: { status: "confirmed" } },
            { $count: "count" }
          ],
          completedAppointments: [
            { $match: { status: "completed" } },
            { $count: "count" }
          ],
          cancelledAppointments: [
            { $match: { status: "cancelled" } },
            { $count: "count" }
          ],
          inProgressAppointments: [
            { $match: { status: "in-progress" } },
            { $count: "count" }
          ],
        }
      }
    ]);

    // Get prescription stats
    const prescriptionStats = await Prescription.aggregate([
      {
        $facet: {
          totalPrescriptions: [
            { $count: "count" }
          ],
          draftPrescriptions: [
            { $match: { status: "draft" } },
            { $count: "count" }
          ],
          issuedPrescriptions: [
            { $match: { status: "issued" } },
            { $count: "count" }
          ],
          viewedPrescriptions: [
            { $match: { status: "viewed" } },
            { $count: "count" }
          ],
        }
      }
    ]);

    // Extract counts from results (handle empty arrays)
    const extractCount = (arr) => (arr.length > 0 ? arr[0].count : 0);

    const userStats = stats[0];
    const appStats = appointmentStats[0];
    const prescStats = prescriptionStats[0];

    res.json({
      success: true,
      stats: {
        // User Statistics
        totalUsers: extractCount(userStats.totalUsers),
        totalDoctors: extractCount(userStats.totalDoctors),
        totalPatients: extractCount(userStats.totalPatients),
        pendingDoctors: extractCount(userStats.pendingDoctors),

        // Appointment Statistics
        totalAppointments: extractCount(appStats.totalAppointments),
        todayAppointments: extractCount(appStats.todayAppointments),
        pendingAppointments: extractCount(appStats.pendingAppointments),
        confirmedAppointments: extractCount(appStats.confirmedAppointments),
        completedAppointments: extractCount(appStats.completedAppointments),
        cancelledAppointments: extractCount(appStats.cancelledAppointments),
        inProgressAppointments: extractCount(appStats.inProgressAppointments),

        // Prescription Statistics
        totalPrescriptions: extractCount(prescStats.totalPrescriptions),
        draftPrescriptions: extractCount(prescStats.draftPrescriptions),
        issuedPrescriptions: extractCount(prescStats.issuedPrescriptions),
        viewedPrescriptions: extractCount(prescStats.viewedPrescriptions),
      },
      timestamp: new Date(),
    });
  } catch (error) {
    console.error("getDashboardStats error:", error);
    return res.status(500).json({ message: "Server error", error: error.message });
  }
};

// Get all users (admin only)
const getUsers = async (req, res) => {
  try {
    if (!ensureAdmin(req, res)) return;

    const { page = 1, limit = 10, role, search } = req.query;
    const skip = (parseInt(page) - 1) * parseInt(limit);

    const filter = { isDeleted: false }; // Exclude deleted users by default
    if (role) {
      filter.role = role;
    }
    if (search) {
      filter.$or = [
        { name: { $regex: search, $options: 'i' } },
        { email: { $regex: search, $options: 'i' } },
      ];
    }

    const total = await User.countDocuments(filter);
    const users = await User.find(filter)
      .select('-password')
      .skip(skip)
      .limit(parseInt(limit))
      .sort({ createdAt: -1 });

    res.json({
      success: true,
      users,
      pagination: {
        total,
        page: parseInt(page),
        limit: parseInt(limit),
        pages: Math.ceil(total / parseInt(limit)),
      },
    });
  } catch (error) {
    console.error("getUsers error:", error);
    return res.status(500).json({ message: "Server error", error: error.message });
  }
};

// Get all appointments
const getAppointments = async (req, res) => {
  try {
    if (!ensureAdmin(req, res)) return;

    const { page = 1, limit = 10, status, search } = req.query;
    const skip = (parseInt(page) - 1) * parseInt(limit);

    const filter = {};
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
      .sort({ createdAt: -1 });

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

// Change user role
const changeUserRole = async (req, res) => {
  try {
    if (!ensureAdmin(req, res)) return;

    const { userId } = req.params;
    const { role } = req.body;

    if (!role || !['patient', 'doctor', 'admin'].includes(role)) {
      return res.status(400).json({ message: 'Valid role is required (patient, doctor, admin)' });
    }

    const user = await User.findByIdAndUpdate(
      userId,
      { role },
      { new: true }
    ).select('-password');

    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    res.json({
      success: true,
      message: 'User role updated',
      user,
    });
  } catch (error) {
    console.error("changeUserRole error:", error);
    return res.status(500).json({ message: "Server error", error: error.message });
  }
};

// Get pending doctors (for approval)
const getPendingDoctors = async (req, res) => {
  try {
    if (!ensureAdmin(req, res)) return;

    const { page = 1, limit = 10 } = req.query;
    const skip = (parseInt(page) - 1) * parseInt(limit);

    const total = await User.countDocuments({ 
      role: 'doctor', 
      approvalStatus: 'pending' 
    });

    const doctors = await User.find({ 
      role: 'doctor', 
      approvalStatus: 'pending' 
    })
      .select('-password')
      .skip(skip)
      .limit(parseInt(limit))
      .sort({ createdAt: -1 });

    res.json({
      success: true,
      doctors,
      pagination: {
        total,
        page: parseInt(page),
        limit: parseInt(limit),
        pages: Math.ceil(total / parseInt(limit)),
      },
    });
  } catch (error) {
    console.error('getPendingDoctors error:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

// Approve doctor registration
const approveDoctor = async (req, res) => {
  try {
    if (!ensureAdmin(req, res)) return;

    const { doctorId } = req.params;
    const admin = req.user;

    const doctor = await User.findById(doctorId);
    if (!doctor || doctor.role !== 'doctor') {
      return res.status(404).json({ message: 'Doctor not found' });
    }

    if (doctor.approvalStatus !== 'pending') {
      return res.status(400).json({ 
        message: `Doctor is already ${doctor.approvalStatus}` 
      });
    }

    doctor.approvalStatus = 'approved';
    doctor.approvedBy = admin._id;
    doctor.approvedAt = new Date();
    await doctor.save();

    // Create notification
    const Notification = require('../models/Notification');
    try {
      await Notification.create({
        userId: doctorId,
        title: 'Registration Approved',
        message: 'Your registration has been approved! You can now login.',
        type: 'system',
        from: admin._id,
      });
    } catch (nErr) {
      console.error('Notification creation error:', nErr);
    }

    const socketHandler = require('../utils/socketHandler');
    socketHandler.emitToUser(doctorId.toString(), 'doctor:approved', {
      message: 'Your registration has been approved',
    });

    res.json({
      success: true,
      message: 'Doctor approved successfully',
      doctor: doctor.toObject({ getters: true }),
    });
  } catch (error) {
    console.error('approveDoctor error:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

// Reject doctor registration
const rejectDoctor = async (req, res) => {
  try {
    if (!ensureAdmin(req, res)) return;

    const { doctorId } = req.params;
    const { reason } = req.body;
    const admin = req.user;

    if (!reason || !reason.trim()) {
      return res.status(400).json({ message: 'Rejection reason is required' });
    }

    const doctor = await User.findById(doctorId);
    if (!doctor || doctor.role !== 'doctor') {
      return res.status(404).json({ message: 'Doctor not found' });
    }

    if (doctor.approvalStatus !== 'pending') {
      return res.status(400).json({ 
        message: `Doctor is already ${doctor.approvalStatus}` 
      });
    }

    doctor.approvalStatus = 'rejected';
    doctor.rejectionReason = reason;
    doctor.approvedBy = admin._id;
    doctor.rejectedAt = new Date();
    await doctor.save();

    // Create notification
    const Notification = require('../models/Notification');
    try {
      await Notification.create({
        userId: doctorId,
        title: 'Registration Rejected',
        message: `Your registration was rejected. Reason: ${reason}. Please contact admin for more details.`,
        type: 'system',
        from: admin._id,
      });
    } catch (nErr) {
      console.error('Notification creation error:', nErr);
    }

    const socketHandler = require('../utils/socketHandler');
    socketHandler.emitToUser(doctorId.toString(), 'doctor:rejected', {
      message: 'Your registration was rejected',
      reason,
    });

    res.json({
      success: true,
      message: 'Doctor rejected',
      doctor: doctor.toObject({ getters: true }),
    });
  } catch (error) {
    console.error('rejectDoctor error:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

// Get system reports
const getReports = async (req, res) => {
  try {
    if (!ensureAdmin(req, res)) return;

    const [
      appointmentStats,
      prescriptionStats,
      userStats,
    ] = await Promise.all([
      Appointment.aggregate([
        {
          $group: {
            _id: '$status',
            count: { $sum: 1 },
          },
        },
      ]),
      Prescription.aggregate([
        {
          $group: {
            _id: null,
            total: { $sum: 1 },
          },
        },
      ]),
      User.aggregate([
        {
          $group: {
            _id: '$role',
            count: { $sum: 1 },
          },
        },
      ]),
    ]);

    res.json({
      success: true,
      reports: {
        appointments: appointmentStats,
        prescriptions: prescriptionStats,
        users: userStats,
      },
    });
  } catch (error) {
    console.error('getReports error:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

// Admin warns user
const warnUser = async (req, res) => {
  try {
    if (!ensureAdmin(req, res)) return;

    const { userId } = req.params;
    const { message } = req.body;

    if (!message || !message.trim()) {
      return res.status(400).json({ message: 'Warning message is required' });
    }

    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    // Add warning
    if (!user.adminWarnings) user.adminWarnings = [];
    user.adminWarnings.push({
      message: message.trim(),
      givenAt: new Date(),
      givenBy: req.user._id,
    });

    await user.save();

    // Notify user
    try {
      const Notification = require('../models/Notification');
      const socketHandler = require('../utils/socketHandler');

      const notif = await Notification.create({
        userId: userId,
        title: 'Admin Warning',
        message: `You have received a warning from admin: ${message}`,
        type: 'admin-warning',
        from: req.user._id,
        priority: 'high',
      });

      socketHandler.emitToUser(userId.toString(), 'notification', notif);
      socketHandler.emitToUser(userId.toString(), 'admin:warning', {
        warningMessage: message,
        timestamp: new Date(),
      });
    } catch (nErr) {
      console.error("Failed to notify user:", nErr);
    }

    res.json({
      success: true,
      message: `Warning sent to ${user.name}`,
      user,
    });
  } catch (error) {
    console.error('warnUser error:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

// Admin deletes user
const deleteUser = async (req, res) => {
  try {
    if (!ensureAdmin(req, res)) return;

    const { userId } = req.params;

    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    // Soft delete
    user.isDeleted = true;
    user.deletedAt = new Date();
    user.deletedBy = req.user._id;
    await user.save();

    res.json({
      success: true,
      message: `User ${user.name} has been deleted`,
    });
  } catch (error) {
    console.error('deleteUser error:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

// Get pending doctors list
const getPendingDoctorsList = async (req, res) => {
  try {
    if (!ensureAdmin(req, res)) return;

    const doctors = await User.find({
      role: 'doctor',
      approvalStatus: 'pending',
    })
      .select('-password')
      .sort({ createdAt: -1 });

    res.json({
      success: true,
      doctors,
      count: doctors.length,
    });
  } catch (error) {
    console.error('getPendingDoctorsList error:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

// Get pending patients list
const getPendingPatients = async (req, res) => {
  try {
    if (!ensureAdmin(req, res)) return;

    const patients = await User.find({
      role: 'patient',
      approvalStatus: 'pending',
    })
      .select('-password')
      .sort({ createdAt: -1 });

    res.json({
      success: true,
      patients,
      count: patients.length,
    });
  } catch (error) {
    console.error('getPendingPatients error:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

// Approve patient
const approvePatient = async (req, res) => {
  try {
    if (!ensureAdmin(req, res)) return;

    const { patientId } = req.params;

    const patient = await User.findById(patientId);
    if (!patient) return res.status(404).json({ message: 'Patient not found' });

    patient.approvalStatus = 'approved';
    patient.approvedBy = req.user._id;
    patient.approvedAt = new Date();
    await patient.save();

    res.json({ success: true, message: 'Patient approved', patient });
  } catch (error) {
    console.error('approvePatient error:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

// Reject patient
const rejectPatient = async (req, res) => {
  try {
    if (!ensureAdmin(req, res)) return;

    const { patientId } = req.params;
    const { reason } = req.body;

    const patient = await User.findById(patientId);
    if (!patient) return res.status(404).json({ message: 'Patient not found' });

    patient.approvalStatus = 'rejected';
    patient.rejectionReason = reason || 'Not specified';
    patient.rejectedAt = new Date();
    await patient.save();

    res.json({ success: true, message: 'Patient rejected', patient });
  } catch (error) {
    console.error('rejectPatient error:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

module.exports = {
  getDashboardStats,
  getUsers,
  getAppointments,
  changeUserRole,
  getReports,
  getPendingDoctors,
  getPendingDoctorsList,
  getPendingPatients,
  approveDoctor,
  rejectDoctor,
  approvePatient,
  rejectPatient,
  warnUser,
  deleteUser,
};
