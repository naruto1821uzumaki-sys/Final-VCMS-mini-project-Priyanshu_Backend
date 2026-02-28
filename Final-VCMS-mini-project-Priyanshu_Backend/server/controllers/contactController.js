const Contact = require("../models/Contact");
const User = require("../models/User");

// Submit contact form
const submitContact = async (req, res) => {
  try {
    const { problemType, subject, description, priority } = req.body;
    const user = req.user;

    const normalizedSubject = (subject || "").trim();
    const normalizedDescription = (description || "").trim();

    // Validate
    if (!problemType || !normalizedSubject || !normalizedDescription) {
      return res.status(400).json({ 
        message: "Problem type, subject, and description are required" 
      });
    }

    // Create contact record
    const contact = await Contact.create({
      userId: user._id,
      userName: user.name || "Unknown User",
      userEmail: user.email || "no-email@example.com",
      userPhone: user.phone || "N/A",
      userRole: user.role,
      problemType,
      subject: normalizedSubject,
      description: normalizedDescription,
      priority: priority || "medium",
    });

    res.status(201).json({
      success: true,
      message: "Your contact request has been submitted. Our team will review it soon.",
      contact,
    });
  } catch (error) {
    console.error("submitContact error:", error);
    res.status(500).json({ message: "Server error", error: error.message });
  }
};

// Get user's own contacts
const getUserContacts = async (req, res) => {
  try {
    const contacts = await Contact.find({ userId: req.user._id })
      .sort({ createdAt: -1 });

    res.json({
      success: true,
      contacts,
      count: contacts.length,
    });
  } catch (error) {
    console.error("getUserContacts error:", error);
    res.status(500).json({ message: "Server error", error: error.message });
  }
};

// Get all contacts (admin only)
const getAllContacts = async (req, res) => {
  try {
    if (!req.user || req.user.role !== "admin") {
      return res.status(403).json({ message: "Forbidden: admin only" });
    }

    const { status, priority, userRole, problemType } = req.query;

    // Build filter
    const filter = {};
    if (status) filter.status = status;
    if (priority) filter.priority = priority;
    if (userRole) filter.userRole = userRole;
    if (problemType) filter.problemType = problemType;

    const contacts = await Contact.find(filter)
      .populate("userId", "name email phone")
      .populate("resolvedBy", "name email")
      .sort({ createdAt: -1 });

    res.json({
      success: true,
      contacts,
      count: contacts.length,
    });
  } catch (error) {
    console.error("getAllContacts error:", error);
    res.status(500).json({ message: "Server error", error: error.message });
  }
};

// Get single contact
const getContactById = async (req, res) => {
  try {
    const { contactId } = req.params;

    const contact = await Contact.findById(contactId)
      .populate("userId", "name email phone")
      .populate("resolvedBy", "name email");

    if (!contact) {
      return res.status(404).json({ message: "Contact not found" });
    }

    // Check authorization (user or admin)
    if (req.user._id.toString() !== contact.userId.toString() && req.user.role !== "admin") {
      return res.status(403).json({ message: "Forbidden" });
    }

    res.json({
      success: true,
      contact,
    });
  } catch (error) {
    console.error("getContactById error:", error);
    res.status(500).json({ message: "Server error", error: error.message });
  }
};

// Update contact status (admin only)
const updateContactStatus = async (req, res) => {
  try {
    if (!req.user || req.user.role !== "admin") {
      return res.status(403).json({ message: "Forbidden: admin only" });
    }

    const { contactId } = req.params;
    const { status, adminNotes } = req.body;

    if (!status) {
      return res.status(400).json({ message: "Status is required" });
    }

    const contact = await Contact.findById(contactId);
    if (!contact) {
      return res.status(404).json({ message: "Contact not found" });
    }

    contact.status = status;
    if (adminNotes) contact.adminNotes = adminNotes;

    if (status === "resolved") {
      contact.resolvedAt = new Date();
      contact.resolvedBy = req.user._id;
    }

    await contact.save();

    res.json({
      success: true,
      message: "Contact status updated",
      contact,
    });
  } catch (error) {
    console.error("updateContactStatus error:", error);
    res.status(500).json({ message: "Server error", error: error.message });
  }
};

// Get contact stats (admin)
const getContactStats = async (req, res) => {
  try {
    if (!req.user || req.user.role !== "admin") {
      return res.status(403).json({ message: "Forbidden: admin only" });
    }

    const stats = await Contact.aggregate([
      {
        $facet: {
          total: [{ $count: "count" }],
          open: [
            { $match: { status: "open" } },
            { $count: "count" },
          ],
          inProgress: [
            { $match: { status: "in-progress" } },
            { $count: "count" },
          ],
          resolved: [
            { $match: { status: "resolved" } },
            { $count: "count" },
          ],
          urgent: [
            { $match: { priority: "urgent" } },
            { $count: "count" },
          ],
          byType: [
            {
              $group: {
                _id: "$problemType",
                count: { $sum: 1 },
              },
            },
          ],
          byRole: [
            {
              $group: {
                _id: "$userRole",
                count: { $sum: 1 },
              },
            },
          ],
        },
      },
    ]);

    res.json({
      success: true,
      stats: stats[0],
    });
  } catch (error) {
    console.error("getContactStats error:", error);
    res.status(500).json({ message: "Server error", error: error.message });
  }
};

module.exports = {
  submitContact,
  getUserContacts,
  getAllContacts,
  getContactById,
  updateContactStatus,
  getContactStats,
};
