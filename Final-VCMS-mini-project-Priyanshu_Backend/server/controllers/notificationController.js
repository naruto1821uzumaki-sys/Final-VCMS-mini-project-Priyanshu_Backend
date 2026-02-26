const Notification = require("../models/Notification");
const socketHandler = require('../utils/socketHandler');

// Get all notifications for logged-in user with pagination and filtering
const getNotifications = async (req, res) => {
  try {
    const userId = req.user && req.user._id;
    if (!userId) return res.status(401).json({ message: "Unauthorized" });

    const { page = 1, limit = 10, isRead, type, unreadOnly } = req.query;
    const skip = (parseInt(page) - 1) * parseInt(limit);

    const filter = { userId };
    
    // Filter by read status
    if (isRead !== undefined) {
      filter.isRead = isRead === 'true';
    }
    
    // Filter by type
    if (type) {
      filter.type = type;
    }
    
    // Unread only
    if (unreadOnly === 'true') {
      filter.isRead = false;
    }

    const total = await Notification.countDocuments(filter);
    const notifications = await Notification.find(filter)
      .populate('from', '-password')
      .skip(skip)
      .limit(parseInt(limit))
      .sort({ createdAt: -1 });

    res.json({
      success: true,
      notifications,
      pagination: {
        total,
        page: parseInt(page),
        limit: parseInt(limit),
        pages: Math.ceil(total / parseInt(limit)),
      },
    });
  } catch (error) {
    console.error('getNotifications error:', error);
    return res.status(500).json({ message: "Server error", error: error.message });
  }
};

// Get unread notification count
const getUnreadCount = async (req, res) => {
  try {
    const userId = req.user && req.user._id;
    if (!userId) return res.status(401).json({ message: "Unauthorized" });

    const unreadCount = await Notification.countDocuments({
      userId,
      isRead: false,
    });

    // Get count by type
    const countByType = await Notification.aggregate([
      { $match: { userId: require('mongoose').Types.ObjectId(userId), isRead: false } },
      { $group: { _id: '$type', count: { $sum: 1 } } },
    ]);

    const typeBreakdown = {};
    countByType.forEach(item => {
      typeBreakdown[item._id] = item.count;
    });

    res.json({
      success: true,
      unreadCount,
      byType: typeBreakdown,
    });
  } catch (error) {
    console.error('getUnreadCount error:', error);
    return res.status(500).json({ message: "Server error", error: error.message });
  }
};

// Get single notification by ID
const getNotificationById = async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user && req.user._id;

    if (!userId) return res.status(401).json({ message: "Unauthorized" });

    const notification = await Notification.findById(id).populate('from', '-password');
    
    if (!notification) {
      return res.status(404).json({ message: "Notification not found" });
    }

    if (notification.userId.toString() !== userId.toString()) {
      return res.status(403).json({ message: "Forbidden" });
    }

    res.json({
      success: true,
      notification,
    });
  } catch (error) {
    console.error('getNotificationById error:', error);
    return res.status(500).json({ message: "Server error", error: error.message });
  }
};

// Mark a notification as read
const markAsRead = async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user && req.user._id;

    if (!userId) return res.status(401).json({ message: "Unauthorized" });

    const notification = await Notification.findById(id).populate('from', '-password');
    if (!notification) {
      return res.status(404).json({ message: "Notification not found" });
    }

    // Ensure the notification belongs to the logged-in user
    if (notification.userId.toString() !== userId.toString()) {
      return res.status(403).json({ message: "Forbidden" });
    }

    if (!notification.isRead) {
      notification.isRead = true;
      notification.readAt = new Date();
      await notification.save();
    }

    res.json({
      success: true,
      message: 'Notification marked as read',
      notification,
    });
  } catch (error) {
    console.error('markAsRead error:', error);
    return res.status(500).json({ message: "Server error", error: error.message });
  }
};

// Mark all notifications as read
const markAllAsRead = async (req, res) => {
  try {
    const userId = req.user && req.user._id;
    if (!userId) return res.status(401).json({ message: "Unauthorized" });

    const { type } = req.query;
    const filter = { userId, isRead: false };
    
    if (type) {
      filter.type = type;
    }

    const result = await Notification.updateMany(
      filter,
      { 
        isRead: true,
        readAt: new Date(),
      }
    );

    res.json({
      success: true,
      message: 'Notifications marked as read',
      modifiedCount: result.modifiedCount,
    });
  } catch (error) {
    console.error('markAllAsRead error:', error);
    return res.status(500).json({ message: "Server error", error: error.message });
  }
};

// Delete a notification
const deleteNotification = async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user && req.user._id;

    if (!userId) return res.status(401).json({ message: "Unauthorized" });

    const notification = await Notification.findById(id);
    if (!notification) {
      return res.status(404).json({ message: "Notification not found" });
    }

    // Ensure the notification belongs to the logged-in user
    if (notification.userId.toString() !== userId.toString()) {
      return res.status(403).json({ message: "Forbidden" });
    }

    await Notification.findByIdAndDelete(id);

    res.json({
      success: true,
      message: 'Notification deleted',
    });
  } catch (error) {
    console.error('deleteNotification error:', error);
    return res.status(500).json({ message: "Server error", error: error.message });
  }
};

// Delete all notifications for a user
const deleteAllNotifications = async (req, res) => {
  try {
    const userId = req.user && req.user._id;
    if (!userId) return res.status(401).json({ message: "Unauthorized" });

    const { type, olderThan } = req.query;
    const filter = { userId };
    
    if (type) {
      filter.type = type;
    }
    
    // Delete notifications older than specified days
    if (olderThan) {
      const daysAgo = parseInt(olderThan);
      const date = new Date();
      date.setDate(date.getDate() - daysAgo);
      filter.createdAt = { $lt: date };
    }

    const result = await Notification.deleteMany(filter);

    res.json({
      success: true,
      message: 'Notifications deleted',
      deletedCount: result.deletedCount,
    });
  } catch (error) {
    console.error('deleteAllNotifications error:', error);
    return res.status(500).json({ message: "Server error", error: error.message });
  }
};

// Create notification (internal use - called from other controllers)
const createNotification = async (userId, notificationData) => {
  try {
    const { title, message, type = 'system', from, link, data, priority = 'normal', actions } = notificationData;

    if (!userId || !title || !message) {
      throw new Error("userId, title, and message are required");
    }

    const notification = await Notification.create({
      userId,
      title,
      message,
      type,
      from: from || null,
      link: link || null,
      data: data || null,
      priority,
      actions: actions || [],
      isRead: false,
    });

    // Emit Socket.io event to user
    socketHandler.emitToUser(userId.toString(), 'notification', notification);

    return notification;
  } catch (error) {
    console.error('createNotification error:', error);
    throw error;
  }
};

// Create notification via API endpoint
const createNotificationAPI = async (req, res) => {
  try {
    if (req.user.role !== 'admin' && req.user.role !== 'doctor') {
      return res.status(403).json({ message: "Unauthorized" });
    }

    const { userId, title, message, type, link, data, priority, actions } = req.body;

    const notification = await createNotification(userId, {
      title,
      message,
      type,
      from: req.user._id,
      link,
      data,
      priority,
      actions,
    });

    res.status(201).json({
      success: true,
      message: 'Notification created and sent',
      notification,
    });
  } catch (error) {
    console.error('createNotificationAPI error:', error);
    return res.status(500).json({ message: "Server error", error: error.message });
  }
};

module.exports = {
  getNotifications,
  getUnreadCount,
  getNotificationById,
  markAsRead,
  markAllAsRead,
  deleteNotification,
  deleteAllNotifications,
  createNotification, // For internal use by other controllers
  createNotificationAPI, // For API endpoint
};
