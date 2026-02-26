const ChatMessage = require('../models/ChatMessage');
const { v4: uuidv4 } = require('uuid');

// Predefined medical FAQ responses (can be replaced with AI API)
const medicalFAQ = {
  'fever': 'A fever is an elevation of body temperature above normal. For a fever, you can:\n1. Stay hydrated\n2. Get adequate rest\n3. Take over-the-counter fever reducers (consult with a doctor)\n4. Contact a doctor if fever persists beyond 3 days',
  'cough': 'A cough is a reflex action to clear the breathing passages. For a cough:\n1. Use honey or throat lozenges\n2. Stay hydrated\n3. Use a humidifier\n4. Avoid irritants like smoke\n5. Contact a doctor if it persists',
  'pain': 'For pain management:\n1. Rest the affected area\n2. Apply ice for acute injuries\n3. Use over-the-counter pain relievers\n4. Do gentle stretching\n5. Contact a doctor for severe or persistent pain',
  'headache': 'For headaches:\n1. Rest in a quiet, dark room\n2. Apply a cold or warm compress\n3. Stay hydrated\n4. Take over-the-counter pain relievers\n5. Practice relaxation techniques',
  'appointment': 'To book an appointment:\n1. Go to the Appointments section\n2. Select a doctor\n3. Choose your preferred date and time\n4. Describe your symptoms\n5. Submit the booking\nThe doctor will confirm within 24 hours',
  'prescription': 'Your prescriptions can be found in the Medical History section. You can:\n1. View prescription details\n2. Download prescriptions\n3. Share with pharmacists\n4. Get refill requests approved by doctors',
  'default': 'I\'m a medical assistant chatbot. I can help with general health information. For specific medical advice, please consult with a doctor. How can I help you? (Common topics: fever, cough, pain, appointment, prescription)'
};

// Send message to chatbot and get response
const sendMessage = async (req, res) => {
  try {
    if (!req.user) {
      return res.status(401).json({ message: 'Unauthorized' });
    }

    const { message, sessionId } = req.body;
    if (!message) {
      return res.status(400).json({ message: 'Message is required' });
    }

    const newSessionId = sessionId || uuidv4();

    // Save user message
    const userMsg = await ChatMessage.create({
      userId: req.user._id,
      message,
      sender: 'user',
      sessionId: newSessionId,
    });

    // Generate bot response based on keywords
    let botResponse = medicalFAQ['default'];
    const lowerMessage = message.toLowerCase();

    for (const [key, value] of Object.entries(medicalFAQ)) {
      if (key !== 'default' && lowerMessage.includes(key)) {
        botResponse = value;
        break;
      }
    }

    // Save bot response
    const botMsg = await ChatMessage.create({
      userId: req.user._id,
      message: botResponse,
      sender: 'bot',
      sessionId: newSessionId,
    });

    res.status(201).json({
      success: true,
      sessionId: newSessionId,
      userMessage: userMsg,
      botMessage: botMsg,
    });
  } catch (err) {
    console.error('sendMessage error:', err);
    res.status(500).json({ message: 'Server error' });
  }
};

// Get chat history for user
const getChatHistory = async (req, res) => {
  try {
    if (!req.user) {
      return res.status(401).json({ message: 'Unauthorized' });
    }

    const { sessionId } = req.query;
    const userId = req.user._id;

    let filter = { userId };
    if (sessionId) {
      filter.sessionId = sessionId;
    }

    const messages = await ChatMessage.find(filter)
      .populate('userId', '-password')
      .sort({ createdAt: 1 });

    res.json({
      success: true,
      messages,
    });
  } catch (err) {
    console.error('getChatHistory error:', err);
    res.status(500).json({ message: 'Server error' });
  }
};

// Get all sessions for user
const getChatSessions = async (req, res) => {
  try {
    if (!req.user) {
      return res.status(401).json({ message: 'Unauthorized' });
    }

    // Get distinct sessions for the user
    const sessions = await ChatMessage.distinct('sessionId', {
      userId: req.user._id,
    });

    // Get the most recent message from each session
    const sessionData = await Promise.all(
      sessions.map(async (sessionId) => {
        const lastMessage = await ChatMessage.findOne({ sessionId })
          .sort({ createdAt: -1 });

        return {
          sessionId,
          lastMessage: lastMessage?.message || '',
          lastMessageTime: lastMessage?.createdAt || null,
        };
      })
    );

    res.json({
      success: true,
      sessions: sessionData.sort((a, b) => new Date(b.lastMessageTime) - new Date(a.lastMessageTime)),
    });
  } catch (err) {
    console.error('getChatSessions error:', err);
    res.status(500).json({ message: 'Server error' });
  }
};

module.exports = {
  sendMessage,
  getChatHistory,
  getChatSessions,
};
