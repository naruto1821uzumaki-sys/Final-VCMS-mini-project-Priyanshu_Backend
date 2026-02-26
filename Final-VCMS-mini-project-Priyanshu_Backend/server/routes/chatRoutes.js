const express = require('express');
const router = express.Router();
const { protect } = require('../middleware/authMiddleware');
const {
  sendMessage,
  getChatHistory,
  getChatSessions,
} = require('../controllers/chatController');

// POST /message - Send message to chatbot
router.post('/message', protect, sendMessage);

// GET /history - Get chat history
router.get('/history', protect, getChatHistory);

// GET /sessions - Get all chat sessions
router.get('/sessions', protect, getChatSessions);

module.exports = router;