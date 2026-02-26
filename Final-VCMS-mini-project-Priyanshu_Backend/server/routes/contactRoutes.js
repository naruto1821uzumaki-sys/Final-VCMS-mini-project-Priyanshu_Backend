const express = require("express");
const router = express.Router();
const { check } = require("express-validator");
const validateRequest = require("../middleware/validateRequest");
const { protect } = require("../middleware/authMiddleware");
const {
  submitContact,
  getUserContacts,
  getAllContacts,
  getContactById,
  updateContactStatus,
  getContactStats,
} = require("../controllers/contactController");

// POST /submit - User: Submit contact form
router.post(
  "/submit",
  protect,
  [
    check("problemType")
      .notEmpty()
      .isIn([
        "technical-issue",
        "payment-issue",
        "account-issue",
        "appointment-issue",
        "medical-concern",
        "feedback",
        "other",
      ])
      .withMessage("Invalid problem type"),
    check("subject")
      .notEmpty()
      .trim()
      .isLength({ min: 5, max: 100 })
      .withMessage("Subject must be 5-100 characters"),
    check("description")
      .notEmpty()
      .trim()
      .isLength({ min: 10, max: 2000 })
      .withMessage("Description must be 10-2000 characters"),
    check("priority")
      .optional()
      .isIn(["low", "medium", "high", "urgent"])
      .withMessage("Invalid priority"),
  ],
  validateRequest,
  submitContact
);

// GET /my-contacts - User: Get own contacts
router.get("/my-contacts", protect, getUserContacts);

// GET /:contactId - User/Admin: Get single contact
router.get("/:contactId", protect, getContactById);

// GET / - Admin: Get all contacts
router.get("/", protect, getAllContacts);

// GET /stats/dashboard - Admin: Get contact statistics
router.get("/stats/dashboard", protect, getContactStats);

// PUT /:contactId/status - Admin: Update contact status
router.put(
  "/:contactId/status",
  protect,
  [
    check("status")
      .notEmpty()
      .isIn(["open", "in-progress", "resolved", "closed"])
      .withMessage("Invalid status"),
    check("adminNotes")
      .optional()
      .trim()
      .isLength({ max: 1000 })
      .withMessage("Admin notes must be max 1000 characters"),
  ],
  validateRequest,
  updateContactStatus
);

module.exports = router;
