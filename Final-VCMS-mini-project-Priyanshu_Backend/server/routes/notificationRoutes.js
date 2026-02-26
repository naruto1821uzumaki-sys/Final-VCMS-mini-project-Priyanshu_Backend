const express = require("express");
const router = express.Router();
const { protect } = require("../middleware/authMiddleware");
const {
  getNotifications,
  getUnreadCount,
  getNotificationById,
  markAsRead,
  markAllAsRead,
  deleteNotification,
  deleteAllNotifications,
  createNotificationAPI,
} = require("../controllers/notificationController");

// GET / - Get all notifications for logged-in user with filtering
router.get("/", protect, getNotifications);

// GET /unread-count - Get unread notification count
router.get("/unread-count", protect, getUnreadCount);

// GET /:id - Get single notification
router.get("/:id", protect, getNotificationById);

// POST / - Create notification via API
router.post("/", protect, createNotificationAPI);

// POST /:id/mark-read - Mark notification as read
router.post("/:id/mark-read", protect, markAsRead);

// POST /mark-all-read - Mark all notifications as read
router.post("/mark-all-read", protect, markAllAsRead);

// DELETE /:id - Delete notification
router.delete("/:id", protect, deleteNotification);

// DELETE / - Delete all notifications (with optional filters)
router.delete("/", protect, deleteAllNotifications);

module.exports = router;
