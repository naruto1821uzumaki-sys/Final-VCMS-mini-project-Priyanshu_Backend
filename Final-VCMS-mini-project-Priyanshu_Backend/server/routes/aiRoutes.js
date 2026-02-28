const express = require('express');
const router = express.Router();
const { protect } = require('../middleware/authMiddleware');
const OpenAI = require('openai');
const multer = require('multer');
const Tesseract = require('tesseract.js');
const pdfParse = require('pdf-parse');
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

// Rule-based summary specifically for prescriptions (no OpenAI key)
const ruleBasedPrescriptionSummary = (content) => {
  const lines = content.split('\n').map(l => l.trim()).filter(Boolean);

  let diagnosis = '';
  const medications = [];
  let treatmentPlan = '';
  let followUp = '';
  let followUpDate = '';

  for (const line of lines) {
    if (line.startsWith('Diagnosis:')) diagnosis = line.replace('Diagnosis:', '').trim();
    else if (line.startsWith('Treatment Plan:')) treatmentPlan = line.replace('Treatment Plan:', '').trim();
    else if (line.startsWith('Follow-up Recommendations:')) followUp = line.replace('Follow-up Recommendations:', '').trim();
    else if (line.startsWith('Follow-up Date:')) followUpDate = line.replace('Follow-up Date:', '').trim();
    else if (/^[-•]\s/.test(line)) {
      // Medication line: "- Name Dosage, Frequency for Duration"
      const medText = line.replace(/^[-•]\s*/, '').trim();
      medications.push(medText);
    }
  }

  const summary = diagnosis
    ? `You have been prescribed treatment for ${diagnosis}. ${medications.length} medication${medications.length !== 1 ? 's have' : ' has'} been prescribed.${followUp ? ' ' + followUp : ''}`
    : `Your prescription includes ${medications.length} medication${medications.length !== 1 ? 's' : ''}.`;

  const keyPoints = medications.length > 0
    ? medications.map(med => `💊 ${med}`)
    : ['Your prescription details are listed above.'];

  if (treatmentPlan) keyPoints.push(`📋 Treatment plan: ${treatmentPlan}`);

  const recommendations = [];
  if (followUp) recommendations.push(followUp);
  if (followUpDate) recommendations.push(`📅 Follow-up appointment on: ${followUpDate}`);
  if (recommendations.length === 0) {
    recommendations.push('Take all medications exactly as prescribed and complete the full course.');
    recommendations.push('Contact your doctor if you experience any unexpected side effects.');
  }

  return { summary, keyPoints, recommendations };
};

// Parse raw prescription text extracted from PDF/screenshot
const parsePrescriptionRawText = (text) => {
  const lower = text.toLowerCase();
  const lines = text.split(/[\n\r]+/).map(l => l.trim()).filter(Boolean);

  let patientName = '';
  let doctorName = '';
  let specialty = '';
  let diagnosis = '';
  let clinicalNotes = '';
  const medications = [];

  // Extract patient name (line after "PATIENT" label)
  for (let i = 0; i < lines.length; i++) {
    const up = lines[i].toUpperCase();
    if (up === 'PATIENT' || up.endsWith('PATIENT')) {
      // Next non-email non-short line is the name
      for (let j = i + 1; j < Math.min(i + 4, lines.length); j++) {
        if (!lines[j].includes('@') && lines[j].length > 2 && !/^(DOCTOR|MEDICATION|DOSAGE|FREQUENCY|DURATION)/i.test(lines[j])) {
          patientName = lines[j]; break;
        }
      }
    }
    if (up === 'DOCTOR' || up.endsWith('DOCTOR')) {
      for (let j = i + 1; j < Math.min(i + 5, lines.length); j++) {
        if (!doctorName && lines[j].length > 2 && !/^(PATIENT|MEDICATION|DOSAGE)/i.test(lines[j])) {
          doctorName = lines[j].replace(/^Dr\.?\s*/i, ''); 
        } else if (doctorName && !specialty && lines[j].length > 2) {
          specialty = lines[j]; break;
        }
      }
    }
    if (/clinical\s*notes?/i.test(lines[i]) && i + 1 < lines.length) {
      clinicalNotes = lines[i + 1];
      diagnosis = clinicalNotes;
    }
    if (/^diagnosis[:\s]/i.test(lines[i])) {
      diagnosis = lines[i].replace(/^diagnosis[:\s]*/i, '').trim() || (lines[i + 1] || '');
    }
  }

  // Extract medications: look for "Medication / MEDICATION" header followed by name, dosage etc.
  let inMedBlock = false;
  let curMed = null;
  for (let i = 0; i < lines.length; i++) {
    const up = lines[i].toUpperCase();
    if (up === 'MEDICATIONS' || up === 'MEDICATION') { inMedBlock = true; continue; }
    if (!inMedBlock) continue;

    if (up === 'MEDICATION' || /^medication\b/i.test(lines[i])) {
      if (curMed && curMed.name) medications.push(curMed);
      curMed = { name: '', dosage: '', frequency: '', duration: '', instructions: '' };
      const nameCandidate = lines[i].replace(/^medication[:\s]*/i, '').trim();
      if (nameCandidate.length > 1) curMed.name = nameCandidate;
      else if (lines[i + 1] && !/^(dosage|frequency|duration|instruction)/i.test(lines[i + 1])) {
        curMed.name = lines[++i];
      }
    } else if (/^dosage[:\s]*/i.test(lines[i])) {
      const v = lines[i].replace(/^dosage[:\s]*/i, '').trim();
      if (curMed) curMed.dosage = v || lines[i + 1] || '';
      if (!v) i++;
    } else if (/^frequency[:\s]*/i.test(lines[i])) {
      const v = lines[i].replace(/^frequency[:\s]*/i, '').trim();
      if (curMed) curMed.frequency = v || lines[i + 1] || '';
      if (!v) i++;
    } else if (/^duration[:\s]*/i.test(lines[i])) {
      const v = lines[i].replace(/^duration[:\s]*/i, '').trim();
      if (curMed) curMed.duration = v || lines[i + 1] || '';
      if (!v) i++;
    } else if (/^instructions?[:\s]*/i.test(lines[i])) {
      const v = lines[i].replace(/^instructions?[:\s]*/i, '').trim();
      if (curMed) curMed.instructions = v || lines[i + 1] || '';
      if (!v) i++;
    }
  }
  if (curMed && curMed.name) medications.push(curMed);

  const docLabel = doctorName ? ` by Dr. ${doctorName}${specialty ? ' (' + specialty + ')' : ''}` : '';
  const diagLabel = diagnosis ? ` Treated condition: ${diagnosis}.` : '';
  const summary = medications.length > 0
    ? `This prescription${docLabel} lists ${medications.length} medication${medications.length !== 1 ? 's' : ''}${diagLabel} Follow your doctor's instructions carefully.`
    : `Medical prescription document${docLabel} detected.${diagLabel} See medication details below.`;

  const keyPoints = medications.length > 0
    ? medications.map(m => {
        const parts = [`💊 ${m.name || 'Medication'}`];
        if (m.dosage) parts.push(`— ${m.dosage}`);
        if (m.frequency) parts.push(`• ${m.frequency}`);
        if (m.duration) parts.push(`for ${m.duration}`);
        return parts.join(' ');
      })
    : ['Prescription identified. Check extracted text for full medication list.'];

  const recommendations = [];
  medications.forEach(m => {
    if (m.instructions) recommendations.push(`📋 ${m.name}: ${m.instructions}`);
  });
  recommendations.push('Take all medications exactly as prescribed — complete the full course even if you feel better.');
  recommendations.push('Contact your doctor immediately if you experience severe side effects.');

  return { summary, keyPoints, recommendations };
};

// Rule-based fallback analysis when no OpenAI key
const ruleBasedAnalysis = (text) => {
  const lower = text.toLowerCase();

  // Detect prescriptions first and use dedicated parser
  const isPrescription =
    (lower.includes('prescription') || lower.includes('medications')) &&
    (lower.includes('dosage') || lower.includes('frequency') || lower.includes('duration'));
  if (isPrescription) {
    const parsed = parsePrescriptionRawText(text);
    if (parsed && parsed.keyPoints.length > 0) return parsed;
  }

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
      // For prescriptions, use the prescription-specific fallback
      const fallback = type === 'prescription'
        ? ruleBasedPrescriptionSummary(content)
        : ruleBasedAnalysis(content);
      return res.json({ ...fallback, aiPowered: false });
    }

    const prescriptionPrompt = `
You are a friendly medical assistant helping patients understand their prescriptions.
Please analyze the following prescription and provide a clear, patient-friendly summary:
1. A 2-3 sentence summary explaining what the prescription is for
2. Key points: for each medication, explain when and how to take it (e.g., "Take Paracetamol 500mg twice daily after meals for 5 days")
3. Important recommendations: follow-up advice, storage instructions, or warnings

Format your response as JSON:
{
  "summary": "...",
  "keyPoints": ["...", "..."],
  "recommendations": ["...", "..."]
}
`;

    const reportPrompt = `
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
`;

    const prompt = (type === 'prescription' ? prescriptionPrompt : reportPrompt) + `\nContent to analyze:\n${content}`;

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
      const { content, type } = req.body;
      const fallback = type === 'prescription'
        ? ruleBasedPrescriptionSummary(content || '')
        : ruleBasedAnalysis(content || '');
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

    // If content is missing or too short, fall back to a generic rule-based response
    if (!content || content.trim().length < 5) {
      const fallback = ruleBasedAnalysis(content || '');
      return res.json({ ...fallback, aiPowered: false });
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
  const uploadedPath = req.file?.path;
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'No file provided' });
    }

    let extractedText = '';
    let confidence = 100;

    if (req.file.mimetype === 'application/pdf') {
      // Extract text from PDF using pdf-parse
      const dataBuffer = await fs.promises.readFile(req.file.path);
      const pdfData = await pdfParse(dataBuffer);
      extractedText = pdfData.text ? pdfData.text.trim() : '';

      if (!extractedText || extractedText.length < 20) {
        // Scanned/image-only PDF — no selectable text
        return res.status(422).json({
          error: 'This PDF appears to be a scanned document with no selectable text. Please export the report as a JPG or PNG image and upload that instead.',
        });
      }
      confidence = 99; // PDF text extraction is deterministic
    } else {
      // Use Tesseract.js for image OCR
      const result = await Tesseract.recognize(req.file.path, 'eng');
      extractedText = result.data.text;
      confidence = result.data.confidence;
    }

    // Delete uploaded file after processing
    await fs.promises.unlink(req.file.path).catch(() => {});

    res.json({
      text: extractedText,
      confidence,
    });
  } catch (error) {
    console.error('OCR error:', error);
    res.status(500).json({
      error: 'Failed to extract text',
      message: error.message,
    });
  } finally {
    if (uploadedPath) {
      fs.promises.unlink(uploadedPath).catch(() => {});
    }
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
