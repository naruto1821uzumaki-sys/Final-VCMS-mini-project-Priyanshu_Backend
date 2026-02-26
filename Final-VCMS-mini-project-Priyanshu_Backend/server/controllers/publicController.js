const User = require("../models/User");
const Appointment = require("../models/Appointment");
const mongoose = require('mongoose');

// Helper to map internal User -> PublicDoctorProfile shape expected by frontend
function mapUserToPublicProfile(u) {
  // ensure we always return a usable name and at least some location info
  let rawName = u.displayName || u.name || '';
  // if the stored name is just the specialization (or contains it), ignore it
  if (
    rawName &&
    u.specialization &&
    rawName.toLowerCase().includes(u.specialization.toLowerCase())
  ) {
    rawName = '';
  }
  const fallbackName = rawName || u.specialization || 'Doctor';
  return {
    _id: u._id,
    name: fallbackName,
    email: u.email || '',
    phone: u.phone || '',
    specialization: u.specialization || 'General',
    qualifications: u.qualifications || [],
    experience: u.experience || 0,
    bio: u.bio || '',
    avatar: u.profileImage || u.avatar || null,
    location: {
      address: u.location || 'Unknown address',
      city: u.city || 'Unknown city',
      state: u.state || 'Unknown state',
    },
    consultationFee: u.consultationFee || 0,
    rating: u.rating || 0,
    totalReviews: u.reviewCount || 0,
    responseTime: u.responseTime || '24 hours',
    availability: u.availability || [],
    availableOnline: !!u.availableOnline,
    availablePhysical: typeof u.availablePhysical === 'boolean' ? u.availablePhysical : true,
    approvalStatus: u.approvalStatus,
  };
}

// Fallback: map raw PublicDoctor document (legacy collection) to frontend shape
function mapRawPublicDoctor(pd) {
  let rawName = pd.displayName || pd.name || '';
  if (
    rawName &&
    pd.specialization &&
    rawName.toLowerCase().includes(pd.specialization.toLowerCase())
  ) {
    rawName = '';
  }
  const fallbackName = rawName || pd.specialization || (pd.doctorId ? String(pd.doctorId) : 'Doctor');
  return {
    _id: pd._id,
    name: fallbackName,
    email: pd.email || '',
    phone: pd.phone || '',
    specialization: pd.specialization || 'General',
    qualifications: pd.qualifications || [],
    experience: pd.experience || 0,
    bio: pd.bio || '',
    avatar: pd.profileImage || pd.avatar || null,
    location: {
      address: pd.location || 'Unknown address',
      city: pd.city || 'Unknown city',
      state: pd.state || 'Unknown state',
    },
    licenseNumber: pd.licenseNumber || '',
    registrationBody: pd.registrationBody || '',
    consultationFee: pd.consultationFee || 0,
    rating: pd.rating || 0,
    totalReviews: pd.reviewCount || 0,
    responseTime: pd.responseTime || '24 hours',
    availability: pd.availability || [],
    availableOnline: !!pd.availableOnline,
    availablePhysical: typeof pd.availablePhysical === 'boolean' ? pd.availablePhysical : true,
    approvalStatus: pd.approvalStatus || 'approved',
  };
}

/**
 * Public Controller
 * Handles public (non-authenticated) endpoints for:
 * - Doctor search and browse
 * - Public doctor profiles
 * - Inquiry form submissions
 */

// ✅ NEW: Get all public doctors
exports.getPublicDoctors = async (req, res) => {
  try {
    const { page = 1, limit = 10, specialization, city, search, minRating = 0 } = req.query;
    const skip = (parseInt(page) - 1) * parseInt(limit);

    // Build filter (use User collection for public doctors)
    let filter = { role: 'doctor', isActive: true, isPublic: true };

    if (specialization) {
      filter.specialization = { $regex: specialization, $options: 'i' };
    }

    if (city) {
      filter.city = { $regex: city, $options: 'i' };
    }

    if (search) {
      filter.$or = [
        { displayName: { $regex: search, $options: 'i' } },
        { name: { $regex: search, $options: 'i' } },
        { specialization: { $regex: search, $options: 'i' } },
        { expertise_symptoms: { $in: [new RegExp(search, 'i')] } },
      ];
    }

    if (minRating > 0) {
      filter.rating = { $gte: parseFloat(minRating) };
    }

    const total = await User.countDocuments(filter);
    const doctors = await User.find(filter)
      .select('-__v -password -refreshTokens')
      .skip(skip)
      .limit(parseInt(limit))
      .sort({ rating: -1, reviewCount: -1, createdAt: -1 });

    let mapped = doctors.map(mapUserToPublicProfile);

    // If no public doctors found in User collection, try legacy raw collection as a fallback
    if ((!mapped || mapped.length === 0)) {
      try {
        const rawDocs = await mongoose.connection.collection('publicdoctors').find({}).toArray();
        if (rawDocs && rawDocs.length > 0) {
          mapped = rawDocs.map(mapRawPublicDoctor);
        }
      } catch (rawErr) {
        // ignore raw collection errors; we'll return empty list below
        console.warn('Fallback read of publicdoctors collection failed:', rawErr.message);
      }
    }
    res.json({
      success: true,
      doctors: mapped,
      pagination: {
        total,
        page: parseInt(page),
        limit: parseInt(limit),
        pages: Math.ceil(total / parseInt(limit)),
      },
    });
  } catch (error) {
    console.error("getPublicDoctors error:", error);
    res.status(500).json({ message: "Failed to fetch doctors", error: error.message });
  }
};

// ✅ NEW: Get single public doctor profile
exports.getPublicDoctorProfile = async (req, res) => {
  try {
    const { doctorId } = req.params;

    let doctor = await User.findOne({ _id: doctorId, role: 'doctor', isActive: true, isPublic: true }).select('-__v -password -refreshTokens');
    if (!doctor) {
      // Try legacy publicdoctors collection by id or by doctorId field
      try {
        const rawCollection = mongoose.connection.collection('publicdoctors');
        // attempt with _id first
        let rawDoc = null;
        try {
          rawDoc = await rawCollection.findOne({ _id: mongoose.Types.ObjectId(doctorId) });
        } catch (idErr) {
          // if doctorId is not an ObjectId, try matching doctorId field
          rawDoc = await rawCollection.findOne({ doctorId: doctorId });
        }

        if (rawDoc) {
          return res.json({ success: true, doctor: mapRawPublicDoctor(rawDoc) });
        }
      } catch (rawErr) {
        console.warn('Fallback lookup in publicdoctors failed:', rawErr.message);
      }

      return res.status(404).json({ message: "Doctor not found or profile not public" });
    }

    res.json({ success: true, doctor: mapUserToPublicProfile(doctor) });
  } catch (error) {
    console.error("getPublicDoctorProfile error:", error);
    res.status(500).json({ message: "Failed to fetch doctor profile", error: error.message });
  }
};

// ✅ NEW: Get specializations (for filtering)
exports.getSpecializations = async (req, res) => {
  try {
    const specializations = await User.aggregate([
      { $match: { role: 'doctor', isActive: true, isPublic: true } },
      { $group: { _id: "$specialization", count: { $sum: 1 } } },
      { $sort: { count: -1 } },
      { $project: { specialization: "$_id", count: 1, _id: 0 } },
    ]);

    res.json({
      success: true,
      specializations,
    });
  } catch (error) {
    console.error("getSpecializations error:", error);
    res.status(500).json({ message: "Failed to fetch specializations", error: error.message });
  }
};

// ✅ NEW: Get available cities
exports.getCities = async (req, res) => {
  try {
    const cities = await User.aggregate([
      { $match: { role: 'doctor', isActive: true, isPublic: true, city: { $ne: null } } },
      { $group: { _id: "$city", count: { $sum: 1 } } },
      { $sort: { count: -1 } },
      { $project: { city: "$_id", count: 1, _id: 0 } },
    ]);

    res.json({
      success: true,
      cities,
    });
  } catch (error) {
    console.error("getCities error:", error);
    res.status(500).json({ message: "Failed to fetch cities", error: error.message });
  }
};

// ✅ NEW: Search doctors by symptoms (public endpoint)
exports.searchDoctorsBySymptoms = async (req, res) => {
  try {
    const { symptoms, page = 1, limit = 10 } = req.query;

    if (!symptoms) {
      return res.status(400).json({ message: "Symptoms parameter is required" });
    }

    const symptomArray = symptoms.split(",").map(s => s.trim());
    const skip = (parseInt(page) - 1) * parseInt(limit);

    const doctors = await User.find({
      role: 'doctor',
      isActive: true,
      isPublic: true,
      expertise_symptoms: { $in: symptomArray },
    })
      .skip(skip)
      .limit(parseInt(limit))
      .sort({ rating: -1 })
      .select("-__v -password -refreshTokens");

    const total = await User.countDocuments({
      role: 'doctor',
      isActive: true,
      isPublic: true,
      expertise_symptoms: { $in: symptomArray },
    });

    res.json({
      success: true,
      doctors,
      queriedSymptoms: symptomArray,
      pagination: {
        total,
        page: parseInt(page),
        limit: parseInt(limit),
        pages: Math.ceil(total / parseInt(limit)),
      },
    });
  } catch (error) {
    console.error("searchDoctorsBySymptoms error:", error);
    res.status(500).json({ message: "Search failed", error: error.message });
  }
};

// ✅ NEW: Submit guest inquiry form
exports.submitInquiry = async (req, res) => {
  try {
    const { name, email, phone, message, subject } = req.body;

    // Basic validation
    if (!name || !email || !phone || !message) {
      return res.status(400).json({ message: "All fields are required" });
    }

    // Email validation
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return res.status(400).json({ message: "Invalid email format" });
    }

    // In a real app, save to database and send email notification
    // For now, just log it
    console.log("📋 New Inquiry Received:", {
      name,
      email,
      phone,
      subject,
      message,
      timestamp: new Date(),
    });

    // TODO: Send email to support team
    // TODO: Save to database for admin review

    res.json({
      success: true,
      message: "Thank you for your inquiry. Our team will contact you soon.",
      inquiryId: `INQ_${Date.now()}`, // Dummy ID for reference
    });
  } catch (error) {
    console.error("submitInquiry error:", error);
    res.status(500).json({ message: "Failed to submit inquiry", error: error.message });
  }
};

// ✅ NEW: Get doctor availability slots (public)
exports.getAvailableSlots = async (req, res) => {
  try {
    const { doctorId, date } = req.query;

    if (!doctorId || !date) {
      return res.status(400).json({ message: "Doctor ID and date are required" });
    }

    // Get doctor's availability
    const doctor = await User.findById(doctorId).select("availability");
    if (!doctor) {
      return res.status(404).json({ message: "Doctor not found" });
    }

    // Get day of week from date
    const appointmentDate = new Date(date);
    const dayOfWeek = appointmentDate.toLocaleString('en-US', { weekday: 'lowercase' });


    // Find all availability ranges for that day (support multiple slots per day)
    const dayAvailabilities = doctor.availability.filter(
      (av) => av.day && av.day.toLowerCase() === dayOfWeek
    );

    if (!dayAvailabilities || dayAvailabilities.length === 0) {
      return res.json({
        success: true,
        availableSlots: [],
        message: `Doctor not available on ${dayOfWeek}`,
      });
    }

    // Generate time slots (30-minute intervals) for each availability range
    const slots = [];

    for (const range of dayAvailabilities) {
      const [startHour, startMin] = range.startTime.split(":").map(Number);
      const [endHour, endMin] = range.endTime.split(":").map(Number);

      let currentTime = new Date(appointmentDate);
      currentTime.setHours(startHour, startMin, 0);

      const endTime = new Date(appointmentDate);
      endTime.setHours(endHour, endMin, 0);

      while (currentTime < endTime) {
        const hour = currentTime.getHours();
        const min = currentTime.getMinutes();
        const time24 = `${String(hour).padStart(2, '0')}:${String(min).padStart(2, '0')}`;
        const label = currentTime.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: true });

        // Check if booked
        const isBooked = await Appointment.exists({
          doctorId,
          date: {
            $gte: new Date(appointmentDate.setHours(0, 0, 0, 0)),
            $lt: new Date(appointmentDate.setHours(23, 59, 59, 999)),
          },
          time: time24,
          status: { $in: ['pending', 'confirmed', 'in-progress'] },
        });

        if (!isBooked) {
          slots.push({ time: time24, label, available: true });
        }

        currentTime.setMinutes(currentTime.getMinutes() + 30);
      }
    }

    // Remove duplicates and sort times, preserve label
    const timeLabelMap = new Map();
    for (const s of slots) {
      timeLabelMap.set(s.time, s.label || s.time);
    }
    const uniqueTimes = Array.from(timeLabelMap.keys()).sort((a, b) => {
      const [ah, am] = a.split(':').map(Number);
      const [bh, bm] = b.split(':').map(Number);
      return ah * 60 + am - (bh * 60 + bm);
    });
    const uniqueSlots = uniqueTimes.map(t => ({ time: t, label: timeLabelMap.get(t), available: true }));

    res.json({
      success: true,
      availableSlots: uniqueSlots,
      doctor: {
        _id: doctor._id,
        name: doctor.name,
        specialization: doctor.specialization,
      },
    });
  } catch (error) {
    console.error("getAvailableSlots error:", error);
    res.status(500).json({ message: "Failed to fetch available slots", error: error.message });
  }
};
