const express = require('express');
const router = express.Router();
const { protect } = require('../middleware/authMiddleware');
const OpenAI = require('openai');
const multer = require('multer');
const Tesseract = require('tesseract.js');
const path = require('path');
const fs = require('fs');

// Lazy OpenAI client — only created when a route is hit, so missing key won't crash startup
let _openai = null;
const getOpenAI = () => {
  if (!_openai) {
    if (!process.env.OPENAI_API_KEY) return null;
    _openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
  }
  return _openai;
};

// Rule-based fallback analysis when no OpenAI key
const ruleBasedAnalysis = (text) => {
  const lower = text.toLowerCase();
  const keyPoints = [];
  const recommendations = [];

  if (lower.includes('glucose') || lower.includes('sugar') || lower.includes('hba1c')) {
    keyPoints.push('Blood glucose / sugar levels detected in report');
    recommendations.push('Monitor blood sugar regularly and consult an endocrinologist if values are abnormal');
  }
  if (lower.includes('hemoglobin') || lower.includes('haemoglobin') || lower.includes('hb ')) {
    keyPoints.push('Hemoglobin levels mentioned');
    recommendations.push('Ensure adequate iron and vitamin intake; follow up with doctor if levels are low');
  }
  if (lower.includes('cholesterol') || lower.includes('ldl') || lower.includes('hdl') || lower.includes('triglyceride')) {
    keyPoints.push('Lipid/cholesterol profile included');
    recommendations.push('Maintain a heart-healthy diet and exercise; consult cardiologist if values are high');
  }
  if (lower.includes('creatinine') || lower.includes('urea') || lower.includes('kidney')) {
    keyPoints.push('Kidney function markers noted');
    recommendations.push('Stay hydrated; consult nephrologist if creatinine/urea values are outside normal range');
  }
  if (lower.includes('thyroid') || lower.includes('tsh') || lower.includes('t3') || lower.includes('t4')) {
    keyPoints.push('Thyroid function test results present');
    recommendations.push('Regular thyroid monitoring recommended; consult endocrinologist for abnormal values');
  }
  if (lower.includes('blood pressure') || lower.includes('bp ') || lower.includes('hypertension') || lower.includes('mmhg')) {
    keyPoints.push('Blood pressure readings present');
    recommendations.push('Monitor BP regularly; low-sodium diet and stress management are beneficial');
  }
  if (lower.includes('xray') || lower.includes('x-ray') || lower.includes('ct scan') || lower.includes('mri') || lower.includes('ultrasound')) {
    keyPoints.push('Imaging/scan report detected');
    recommendations.push('Discuss imaging findings with your doctor for a detailed interpretation');
  }
  if (lower.includes('infection') || lower.includes('bacteria') || lower.includes('virus') || lower.includes('wbc') || lower.includes('white blood')) {
    keyPoints.push('Signs of infection or immune response markers noted');
    recommendations.push('Complete the prescribed antibiotic course if applicable; follow up if symptoms persist');
  }

  if (keyPoints.length === 0) {
    keyPoints.push('Medical document successfully extracted and processed');
    keyPoints.push('Document contains ' + text.split(/\s+/).length + ' words of medical data');
    recommendations.push('Please consult your doctor for a detailed interpretation of this report');
    recommendations.push('Keep this report for your medical records');
  }

  const summary = `This medical report has been extracted and analyzed. ${keyPoints.length} key medical indicator(s) were identified. The document appears to contain ${lower.includes('lab') || lower.includes('test') ? 'laboratory test results' : lower.includes('prescription') ? 'prescription details' : 'medical information'}. Please review findings below and consult your healthcare provider for professional advice.`;

  return { summary, keyPoints, recommendations };
};

// Configure multer for file uploads
const upload = multer({
  dest: 'uploads/reports/',
  limits: { fileSize: 10 * 1024 * 1024 }, // 10MB
  fileFilter: (req, file, cb) => {
    const allowed = ['image/jpeg', 'image/png', 'application/pdf'];
    if (allowed.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error('Invalid file type'));
    }
  },
});

/**
 * POST /ai/summarize
 * Summarize a prescription using OpenAI
 */
router.post('/summarize', protect, async (req, res) => {
  try {
    const { type, content } = req.body;

    if (!content || !type) {
      return res.status(400).json({ error: 'Missing content or type' });
    }

    const openai = getOpenAI();
    if (!openai) {
      // Fallback: rule-based analysis
      const fallback = ruleBasedAnalysis(content);
      return res.json({ ...fallback, aiPowered: false });
    }

    const prompt = `
You are a medical assistant AI. Please analyze the following ${type} and provide:
1. A concise summary (2-3 sentences)
2. Key points (3-5 bullet points)
3. Important recommendations (2-3 bullet points if applicable)

Format your response as JSON with the following structure:
{
  "summary": "...",
  "keyPoints": ["...", "..."],
  "recommendations": ["...", "..."]
}

Content to analyze:
${content}
    `;

    const response = await openai.chat.completions.create({
      model: 'gpt-3.5-turbo',
      messages: [{ role: 'user', content: prompt }],
      temperature: 0.7,
      max_tokens: 500,
    });

    const jsonResponse = JSON.parse(response.choices[0].message.content);
    res.json({ ...jsonResponse, aiPowered: true });
  } catch (error) {
    console.error('OpenAI error:', error);
    // Fallback on any OpenAI failure
    try {
      const { content } = req.body;
      const fallback = ruleBasedAnalysis(content || '');
      return res.json({ ...fallback, aiPowered: false });
    } catch (_) {}
    res.status(500).json({
      error: 'Failed to generate summary',
      message: error.message,
    });
  }
});

/**
 * POST /ai/analyze-report
 * Analyze a medical report text using OpenAI
 */
router.post('/analyze-report', protect, async (req, res) => {
  try {
    const { type, content } = req.body;

    if (!content) {
      return res.status(400).json({ error: 'Missing report content' });
    }

    const openai = getOpenAI();
    if (!openai) {
      // Fallback: rule-based analysis
      const fallback = ruleBasedAnalysis(content);
      return res.json({ ...fallback, aiPowered: false });
    }

    const prompt = `
You are a medical report analyzer. Please analyze the following medical report text and provide:
1. A comprehensive summary (3-4 sentences)
2. Key findings (3-5 important points)
3. Health recommendations (2-4 actionable recommendations)

Format your response as JSON with this structure:
{
  "summary": "...",
  "keyPoints": ["...", "..."],
  "recommendations": ["...", "..."]
}

Report content:
${content}
    `;

    const response = await openai.chat.completions.create({
      model: 'gpt-3.5-turbo',
      messages: [{ role: 'user', content: prompt }],
      temperature: 0.7,
      max_tokens: 800,
    });

    let jsonResponse;
    try {
      jsonResponse = JSON.parse(response.choices[0].message.content);
    } catch (_) {
      // Strip markdown code fences if present
      const raw = response.choices[0].message.content.replace(/```[\w]*\n?/g, '').trim();
      jsonResponse = JSON.parse(raw);
    }
    res.json({ ...jsonResponse, aiPowered: true });
  } catch (error) {
    console.error('OpenAI error:', error);
    // Fallback on any OpenAI failure
    try {
      const { content } = req.body;
      const fallback = ruleBasedAnalysis(content || '');
      return res.json({ ...fallback, aiPowered: false });
    } catch (_) {}
    res.status(500).json({
      error: 'Failed to analyze report',
      message: error.message,
    });
  }
});

/**
 * POST /ai/extract-text
 * Extract text from image using OCR
 */
router.post('/extract-text', protect, upload.single('file'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'No file provided' });
    }

    // Use Tesseract.js for OCR
    const result = await Tesseract.recognize(req.file.path, 'eng');
    const extractedText = result.data.text;

    // Delete uploaded file after processing
    require('fs').unlinkSync(req.file.path);

    res.json({
      text: extractedText,
      confidence: result.data.confidence,
    });
  } catch (error) {
    console.error('OCR error:', error);
    res.status(500).json({
      error: 'Failed to extract text',
      message: error.message,
    });
  }
});

/**
 * POST /medical-history/upload-report
 * Upload medical report to server
 */
router.post('/upload-report', protect, upload.single('file'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'No file provided' });
    }

    // Save file info (in production, store in database)
    const fileName = `report_${Date.now()}_${req.file.originalname}`;

    res.json({
      success: true,
      fileName,
      fileSize: req.file.size,
      uploadedAt: new Date().toISOString(),
    });
  } catch (error) {
    console.error('Upload error:', error);
    res.status(500).json({
      error: 'Failed to upload report',
      message: error.message,
    });
  }
});

module.exports = router;
