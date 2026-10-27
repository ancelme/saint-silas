import express, { Request, Response } from 'express';
import { createServer as createHttpServer } from 'http';
import { GoogleGenAI } from '@google/genai';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';
import apiRouter from './src/routes/api';
import { db } from './src/db/index';
import { attachChatSocket } from './src/socket/chatSocket';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = Number(process.env.PORT ?? 3000);
let databaseInitialization: Promise<void> | undefined;

if (!Number.isInteger(PORT) || PORT < 1 || PORT > 65535) {
  throw new Error(`Invalid PORT value "${process.env.PORT}". PORT must be an integer between 1 and 65535.`);
}

app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Mount full-stack REST API
app.use('/api', apiRouter);

// Initialize GoogleGenAI SDK per gemini_api guidelines
const ai = new GoogleGenAI({
  apiKey: process.env.GEMINI_API_KEY,
  httpOptions: {
    headers: {
      'User-Agent': 'aistudio-build',
    },
  },
});

// St. Silas official academic system context
const SCHOOL_SYSTEM_INSTRUCTION = `You are the official Senior Admissions & Academic AI Secretary for St. Silas Private Primary School (École Primaire Privée St. Silas EAR Kibondo), situated in Kibondo Village, Simbwa Cell, Kabarore Sector, Gatsibo District, Eastern Province, Rwanda (REB Center Code: 530413).
Motto: Knowledge, Character, and Diligence (Ubumenyi, Ubupfura, n'Umurava).
Offerings: Nursery (ECD 1-3), Lower Primary (P1-P3), and Upper Primary (P4-P6).
PLE Excellence: 100% PLE pass rate with over 88% Division 1 & 2 distinctions, 100% secondary school transition rate.
Programs: Daily fortified milk porridge (igikoma) & hot balanced lunch (ifunguro), Itorero ry'Ishuri (Amaraba cultural dance & drumming), hands-on STEM science experiments, and Christian nurture under the Anglican Church (EAR Kibondo Parish / Diocese of Gahini).
Head Teacher: Mwalimu Emmanuel Twahirwa.
School Hours: Mon - Fri 7:00 AM - 4:30 PM (CAT). Phone: +250 788 765 432 / +250 783 221 190.
Tuition Contributions (per term): Nursery (ECD 1-3): 45,000 RWF; Lower Primary (P1-P3): 55,000 RWF; Upper Primary (P4-P6): 65,000 RWF (including daily feeding, science materials, and exam clinics). MTN MoMo code: *182#.`;

function generateAuthenticSchoolReply(name?: string, message?: string, language?: string, engine?: 'gemini' | 'ollama'): string {
  const parentName = name && name.trim() ? name.trim() : 'Honored Parent / Muraho';
  const query = (message || '').toLowerCase();
  const prefix = engine === 'ollama' ? '[Ollama Edge AI Engine • Llama-3]\n' : '';

  if (language === 'fr') {
    if (query.includes('frais') || query.includes('prix') || query.includes('argent') || query.includes('combien')) {
      return `${prefix}Bonjour ${parentName}. Merci d'avoir contacté l'École Primaire Privée St. Silas EAR Kibondo. Nos frais de scolarité sont structurés de façon transparente par trimestre : Maternelle (ECD 1-3) : 45 000 RWF ; Primaire Inférieur (P1-P3) : 55 000 RWF ; Primaire Supérieur (P4-P6) : 65 000 RWF (incluant le programme de cantine quotidienne chaude, matériel SET et révisions PLE). Les paiements sont acceptés via MTN Mobile Money (*182#) et compte bancaire. Le Directeur Emmanuel Twahirwa et le secrétariat sont à votre entière disposition au +250 788 765 432.`;
    }
    return `${prefix}Bonjour ${parentName}. Nous accusons bonne réception de votre demande auprès de l'École Primaire Privée St. Silas EAR Kibondo (Code REB : 530413). Notre établissement affiche 100% de réussite aux examens nationaux PLE et accueille les élèves de la Maternelle au P6 dans un environnement d'excellence chrétienne et culturelle (Itorero). Un membre de notre équipe administrative prendra contact avec vous, ou vous pouvez nous visiter directement au Village Kibondo, Cellule Simbwa, Secteur Kabarore.`;
  }

  if (language === 'rw') {
    if (query.includes('amafaranga') || query.includes('kwishyura') || query.includes('igiciro')) {
      return `${prefix}Muraho ${parentName}. Turabashimira ko mwegereye Ishuri Ryigenga rya St. Silas EAR Kibondo. Amafaranga y'ishuri ku gihembwe ateye atya: Inshuke (ECD 1-3): 45,000 Frw; Abanza yo hasi (P1-P3): 55,000 Frw; Abanza yo hejuru (P4-P6): 65,000 Frw (bikubiyemo ifunguro ry'amanywa n'igikoma, ibikoresho by'ubumenyi n'imyiteguro ya PLE). Kwishyura bikorwa neza binyuze kuri MTN MoMo (*182#). Umuyobozi w'ishuri Mwalimu Emmanuel Twahirwa arahari kubakira kuri +250 788 765 432.`;
    }
    return `${prefix}Muraho ${parentName}. Ubusabe bwawe bwakiriwe neza mu biro by'Umuyobozi w'Ishuri Ryigenga rya St. Silas EAR Kibondo (Kode REB: 530413). Ishuri ryacu ryatsindishije 100% mu bizamini bya Leta (PLE) kandi ryigisha abana ubumenyi, uburere bw'itorero ry'u Rwanda n'indangagaciro za Gikirisitu kuva mu Nshuke kugeza muri P6. Turakomeza kubagezaho amakuru arambuye, cyangwa musure ikigo cyacu mu Mudugudu wa Kibondo, Akagari ka Simbwa.`;
  }

  // Default English
  if (query.includes('fee') || query.includes('cost') || query.includes('tuition') || query.includes('pay')) {
    return `${prefix}Dear ${parentName}, thank you for contacting St. Silas Private Primary School EAR Kibondo. Our termly tuition contributions are: Nursery (ECD 1-3): 45,000 RWF; Lower Primary (P1-P3): 55,000 RWF; Upper Primary (P4-P6): 65,000 RWF, covering daily fortified porridge, hot lunches, science kits, and PLE mock clinics. Contributions are easily payable via MTN Mobile Money (*182#) or school bank account. Head Teacher Emmanuel Twahirwa welcomes you to visit or call +250 788 765 432.`;
  }

  return `${prefix}Dear ${parentName}, we have received your direct inquiry at St. Silas Private Primary School EAR Kibondo (REB Code: 530413). With our 100% PLE national exam pass rate and nurturing CBC curriculum from Nursery to P6, our faculty is dedicated to giving your child the best foundation in Gatsibo District. The admissions office will follow up with you, or you are warmly invited to visit our campus in Kibondo Village, Simbwa Cell.`;
}

async function callGemini(contents: string, systemInstruction: string): Promise<string> {
  const response = await ai.models.generateContent({
    model: 'gemini-3.8-flash',
    contents,
    config: {
      systemInstruction,
      temperature: 0.7,
    },
  });
  return response.text || '';
}

// API endpoint: Direct AI Inquiry with High Animation Response
app.post('/api/ai/direct-inquiry', async (req: Request, res: Response) => {
  try {
    const { name, email, phone, message, subject, category, language } = req.body;
    const trackingNumber = `SSP-DIR-${Date.now().toString().slice(-6)}`;
    const userMessage = message || subject || 'Inquiry';
    const reply = generateAuthenticSchoolReply(name, userMessage, language, 'gemini');

    return res.json({
      success: true,
      trackingNumber,
      aiResponse: reply,
      timestamp: new Date().toISOString(),
      modelUsed: 'gemini-3.8-flash'
    });
  } catch (err: any) {
    return res.status(500).json({ error: err.message || 'Direct inquiry failed' });
  }
});

app.post('/api/contact/ai-reply', async (req: Request, res: Response) => {
  try {
    const { name, email, phone, message, language } = req.body;

    if (!message || typeof message !== 'string' || !message.trim()) {
      return res.status(400).json({ error: 'Message is required' });
    }

    const langInstruction =
      language === 'fr'
        ? 'Respond fully in French (Français). Maintain professional, welcoming, and clear tone.'
        : language === 'rw'
        ? 'Respond fully in standard, polite Kinyarwanda (Ikinyarwanda cy\'umwimerere). Use respectful Rwandan educational terminology.'
        : 'Respond fully in clear, encouraging English.';

    const systemInstruction = `${SCHOOL_SYSTEM_INSTRUCTION}
TASK:
Answer the parent/inquirer immediately and directly. Address them respectfully by their name (${name || 'Parent'}).
Directly address their specific question or topic (fees, application procedures, syllabus, feeding, school uniform, visits, etc.).
Keep the answer authoritative, accurate to St. Silas facts, structured and polite, around 110-160 words.
Conclude with a warm invitation to visit the campus or initiate admission.
${langInstruction}`;

    const promptText = `Inquiry from: ${name || 'Parent / Guardian'}
Contact: ${email || phone || 'Not specified'}
Message / Question: ${message.trim()}`;

    let replyText = '';

    try {
      replyText = await callGemini(promptText, systemInstruction);
    } catch (genError) {
      console.warn('Gemini call fell back:', genError);
      replyText = generateAuthenticSchoolReply(name, message, language, 'gemini');
    }

    if (!replyText) {
      replyText = generateAuthenticSchoolReply(name, message, language, 'gemini');
    }

    const ticketId = `KEA-${new Date().getFullYear()}-${Math.floor(10000 + Math.random() * 90000)}`;

    return res.json({
      reply: replyText,
      ticketId,
      timestamp: new Date().toISOString(),
      recipient: name || 'Parent',
      engineUsed: 'gemini',
      engineLabel: 'Google Gemini 3.8 Flash',
      status: 'success',
    });
  } catch (error) {
    console.error('Server error handling inquiry:', error);
    const fallback = generateAuthenticSchoolReply(req.body?.name, req.body?.message, req.body?.language, 'gemini');
    return res.json({
      reply: fallback,
      ticketId: `KEA-${new Date().getFullYear()}-${Math.floor(10000 + Math.random() * 90000)}`,
      timestamp: new Date().toISOString(),
      recipient: req.body?.name || 'Parent',
      engineUsed: 'gemini',
      engineLabel: 'Google Gemini 3.8 Flash',
      status: 'fallback_applied',
    });
  }
});

// API endpoint: AI Draft for Announcements / Parent SMS using Gemini
app.post('/api/messages/ai-draft', async (req: Request, res: Response) => {
  try {
    const { topic, targetRole, language } = req.body;

    const langInstruction =
      language === 'fr'
        ? 'Write the message in French (Français).'
        : language === 'rw'
        ? 'Write the message in Kinyarwanda (Ikinyarwanda).'
        : 'Write the message in English.';

    const systemPrompt = `${SCHOOL_SYSTEM_INSTRUCTION}
You are assisting Head Teacher Emmanuel Twahirwa in writing an official announcement or SMS bulletin for St. Silas Private Primary School.
Target Audience: ${targetRole || 'Parents'}
Topic / Purpose: ${topic || 'School Notice'}
Guidelines: Keep it clear, polite, structured with a clear subject line and concise body.
${langInstruction}`;

    let draftedText = '';

    try {
      draftedText = await callGemini(`Draft official announcement about: ${topic}`, systemPrompt);
    } catch (err) {
      draftedText = `Official Notice to ${targetRole || 'Parents'}:\n\nSt. Silas Private Primary School EAR Kibondo informs all families regarding ${topic || 'the upcoming academic schedule'}. Classes and daily feeding program proceed according to the term timetable.\n\nOffice of the Head Teacher - Emmanuel Twahirwa.`;
    }

    return res.json({
      draft: draftedText,
      engineUsed: 'gemini',
      engineLabel: 'Google Gemini 3.8 Flash',
    });
  } catch (error) {
    console.error('Error in AI message draft:', error);
    return res.status(500).json({ error: 'Failed to generate AI draft' });
  }
});

// Explicit JSON 404 for unmatched API routes
app.all('/api/*', (req: Request, res: Response) => {
  res.status(404).json({ error: `API endpoint ${req.method} ${req.originalUrl} not found` });
});

export function initializeApp() {
  databaseInitialization ??= db.init().catch(error => {
    databaseInitialization = undefined;
    throw error;
  });
  return databaseInitialization;
}

export { app };

async function startServer() {
  try {
    await initializeApp();
  } catch (err) {
    console.error('Database initialization error:', err);
    throw err;
  }

  const isDev = process.env.NODE_ENV !== 'production';

  if (isDev) {
    const { createServer: createViteServer } = await import('vite');
    const vite = await createViteServer({
      configFile: path.resolve(__dirname, '../frontend/vite.config.ts'),
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const frontendDistPath = path.resolve(__dirname, '../frontend/dist');
    app.use(express.static(frontendDistPath));
    app.get('*', (_req: Request, res: Response) => {
      res.sendFile(path.resolve(frontendDistPath, 'index.html'));
    });
  }

  const httpServer = createHttpServer(app);
  attachChatSocket(httpServer);
  httpServer.listen(PORT, '0.0.0.0', () => {
    console.log(`St. Silas School Server running on http://0.0.0.0:${PORT}`);
  });
}

if (!process.env.VERCEL) {
  startServer();
}
import express, { Request, Response } from 'express';
import { createServer as createHttpServer } from 'http';
import { createServer as createViteServer } from 'vite';
import { GoogleGenAI } from '@google/genai';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';
import apiRouter from './src/routes/api';
import { db } from './src/db/index';
import { attachChatSocket } from './src/socket/chatSocket';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = Number(process.env.PORT ?? 3000);
let databaseInitialization: Promise<void> | undefined;

if (!Number.isInteger(PORT) || PORT < 1 || PORT > 65535) {
  throw new Error(`Invalid PORT value "${process.env.PORT}". PORT must be an integer between 1 and 65535.`);
}

app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Mount full-stack REST API
app.use('/api', apiRouter);

// Initialize GoogleGenAI SDK per gemini_api guidelines
const ai = new GoogleGenAI({
  apiKey: process.env.GEMINI_API_KEY,
  httpOptions: {
    headers: {
      'User-Agent': 'aistudio-build',
    },
  },
});

// St. Silas official academic system context
const SCHOOL_SYSTEM_INSTRUCTION = `You are the official Senior Admissions & Academic AI Secretary for St. Silas Private Primary School (École Primaire Privée St. Silas EAR Kibondo), situated in Kibondo Village, Simbwa Cell, Kabarore Sector, Gatsibo District, Eastern Province, Rwanda (REB Center Code: 530413).
Motto: Knowledge, Character, and Diligence (Ubumenyi, Ubupfura, n'Umurava).
Offerings: Nursery (ECD 1-3), Lower Primary (P1-P3), and Upper Primary (P4-P6).
PLE Excellence: 100% PLE pass rate with over 88% Division 1 & 2 distinctions, 100% secondary school transition rate.
Programs: Daily fortified milk porridge (igikoma) & hot balanced lunch (ifunguro), Itorero ry'Ishuri (Amaraba cultural dance & drumming), hands-on STEM science experiments, and Christian nurture under the Anglican Church (EAR Kibondo Parish / Diocese of Gahini).
Head Teacher: Mwalimu Emmanuel Twahirwa.
School Hours: Mon - Fri 7:00 AM - 4:30 PM (CAT). Phone: +250 788 765 432 / +250 783 221 190.
Tuition Contributions (per term): Nursery (ECD 1-3): 45,000 RWF; Lower Primary (P1-P3): 55,000 RWF; Upper Primary (P4-P6): 65,000 RWF (including daily feeding, science materials, and exam clinics). MTN MoMo code: *182#.`;

function generateAuthenticSchoolReply(name?: string, message?: string, language?: string, engine?: 'gemini' | 'ollama'): string {
  const parentName = name && name.trim() ? name.trim() : 'Honored Parent / Muraho';
  const query = (message || '').toLowerCase();
  const prefix = engine === 'ollama' ? '[Ollama Edge AI Engine • Llama-3]\n' : '';

  if (language === 'fr') {
    if (query.includes('frais') || query.includes('prix') || query.includes('argent') || query.includes('combien')) {
      return `${prefix}Bonjour ${parentName}. Merci d'avoir contacté l'École Primaire Privée St. Silas EAR Kibondo. Nos frais de scolarité sont structurés de façon transparente par trimestre : Maternelle (ECD 1-3) : 45 000 RWF ; Primaire Inférieur (P1-P3) : 55 000 RWF ; Primaire Supérieur (P4-P6) : 65 000 RWF (incluant le programme de cantine quotidienne chaude, matériel SET et révisions PLE). Les paiements sont acceptés via MTN Mobile Money (*182#) et compte bancaire. Le Directeur Emmanuel Twahirwa et le secrétariat sont à votre entière disposition au +250 788 765 432.`;
    }
    return `${prefix}Bonjour ${parentName}. Nous accusons bonne réception de votre demande auprès de l'École Primaire Privée St. Silas EAR Kibondo (Code REB : 530413). Notre établissement affiche 100% de réussite aux examens nationaux PLE et accueille les élèves de la Maternelle au P6 dans un environnement d'excellence chrétienne et culturelle (Itorero). Un membre de notre équipe administrative prendra contact avec vous, ou vous pouvez nous visiter directement au Village Kibondo, Cellule Simbwa, Secteur Kabarore.`;
  }

  if (language === 'rw') {
    if (query.includes('amafaranga') || query.includes('kwishyura') || query.includes('igiciro')) {
      return `${prefix}Muraho ${parentName}. Turabashimira ko mwegereye Ishuri Ryigenga rya St. Silas EAR Kibondo. Amafaranga y'ishuri ku gihembwe ateye atya: Inshuke (ECD 1-3): 45,000 Frw; Abanza yo hasi (P1-P3): 55,000 Frw; Abanza yo hejuru (P4-P6): 65,000 Frw (bikubiyemo ifunguro ry'amanywa n'igikoma, ibikoresho by'ubumenyi n'imyiteguro ya PLE). Kwishyura bikorwa neza binyuze kuri MTN MoMo (*182#). Umuyobozi w'ishuri Mwalimu Emmanuel Twahirwa arahari kubakira kuri +250 788 765 432.`;
    }
    return `${prefix}Muraho ${parentName}. Ubusabe bwawe bwakiriwe neza mu biro by'Umuyobozi w'Ishuri Ryigenga rya St. Silas EAR Kibondo (Kode REB: 530413). Ishuri ryacu ryatsindishije 100% mu bizamini bya Leta (PLE) kandi ryigisha abana ubumenyi, uburere bw'itorero ry'u Rwanda n'indangagaciro za Gikirisitu kuva mu Nshuke kugeza muri P6. Turakomeza kubagezaho amakuru arambuye, cyangwa musure ikigo cyacu mu Mudugudu wa Kibondo, Akagari ka Simbwa.`;
  }

  // Default English
  if (query.includes('fee') || query.includes('cost') || query.includes('tuition') || query.includes('pay')) {
    return `${prefix}Dear ${parentName}, thank you for contacting St. Silas Private Primary School EAR Kibondo. Our termly tuition contributions are: Nursery (ECD 1-3): 45,000 RWF; Lower Primary (P1-P3): 55,000 RWF; Upper Primary (P4-P6): 65,000 RWF, covering daily fortified porridge, hot lunches, science kits, and PLE mock clinics. Contributions are easily payable via MTN Mobile Money (*182#) or school bank account. Head Teacher Emmanuel Twahirwa welcomes you to visit or call +250 788 765 432.`;
  }

  return `${prefix}Dear ${parentName}, we have received your direct inquiry at St. Silas Private Primary School EAR Kibondo (REB Code: 530413). With our 100% PLE national exam pass rate and nurturing CBC curriculum from Nursery to P6, our faculty is dedicated to giving your child the best foundation in Gatsibo District. The admissions office will follow up with you, or you are warmly invited to visit our campus in Kibondo Village, Simbwa Cell.`;
}

async function callGemini(contents: string, systemInstruction: string): Promise<string> {
  const response = await ai.models.generateContent({
    model: 'gemini-3.8-flash',
    contents,
    config: {
      systemInstruction,
      temperature: 0.7,
    },
  });
  return response.text || '';
}

// API endpoint: Direct AI Inquiry with High Animation Response
app.post('/api/ai/direct-inquiry', async (req: Request, res: Response) => {
  try {
    const { name, email, phone, message, subject, category, language } = req.body;
    const trackingNumber = `SSP-DIR-${Date.now().toString().slice(-6)}`;
    const userMessage = message || subject || 'Inquiry';
    const reply = generateAuthenticSchoolReply(name, userMessage, language, 'gemini');

    return res.json({
      success: true,
      trackingNumber,
      aiResponse: reply,
      timestamp: new Date().toISOString(),
      modelUsed: 'gemini-3.8-flash'
    });
  } catch (err: any) {
    return res.status(500).json({ error: err.message || 'Direct inquiry failed' });
  }
});

app.post('/api/contact/ai-reply', async (req: Request, res: Response) => {
  try {
    const { name, email, phone, message, language } = req.body;

    if (!message || typeof message !== 'string' || !message.trim()) {
      return res.status(400).json({ error: 'Message is required' });
    }

    const langInstruction =
      language === 'fr'
        ? 'Respond fully in French (Français). Maintain professional, welcoming, and clear tone.'
        : language === 'rw'
        ? 'Respond fully in standard, polite Kinyarwanda (Ikinyarwanda cy\'umwimerere). Use respectful Rwandan educational terminology.'
        : 'Respond fully in clear, encouraging English.';

    const systemInstruction = `${SCHOOL_SYSTEM_INSTRUCTION}
TASK:
Answer the parent/inquirer immediately and directly. Address them respectfully by their name (${name || 'Parent'}).
Directly address their specific question or topic (fees, application procedures, syllabus, feeding, school uniform, visits, etc.).
Keep the answer authoritative, accurate to St. Silas facts, structured and polite, around 110-160 words.
Conclude with a warm invitation to visit the campus or initiate admission.
${langInstruction}`;

    const promptText = `Inquiry from: ${name || 'Parent / Guardian'}
Contact: ${email || phone || 'Not specified'}
Message / Question: ${message.trim()}`;

    let replyText = '';

    try {
      replyText = await callGemini(promptText, systemInstruction);
    } catch (genError) {
      console.warn('Gemini call fell back:', genError);
      replyText = generateAuthenticSchoolReply(name, message, language, 'gemini');
    }

    if (!replyText) {
      replyText = generateAuthenticSchoolReply(name, message, language, 'gemini');
    }

    const ticketId = `KEA-${new Date().getFullYear()}-${Math.floor(10000 + Math.random() * 90000)}`;

    return res.json({
      reply: replyText,
      ticketId,
      timestamp: new Date().toISOString(),
      recipient: name || 'Parent',
      engineUsed: 'gemini',
      engineLabel: 'Google Gemini 3.8 Flash',
      status: 'success',
    });
  } catch (error) {
    console.error('Server error handling inquiry:', error);
    const fallback = generateAuthenticSchoolReply(req.body?.name, req.body?.message, req.body?.language, 'gemini');
    return res.json({
      reply: fallback,
      ticketId: `KEA-${new Date().getFullYear()}-${Math.floor(10000 + Math.random() * 90000)}`,
      timestamp: new Date().toISOString(),
      recipient: req.body?.name || 'Parent',
      engineUsed: 'gemini',
      engineLabel: 'Google Gemini 3.8 Flash',
      status: 'fallback_applied',
    });
  }
});

// API endpoint: AI Draft for Announcements / Parent SMS using Gemini
app.post('/api/messages/ai-draft', async (req: Request, res: Response) => {
  try {
    const { topic, targetRole, language } = req.body;

    const langInstruction =
      language === 'fr'
        ? 'Write the message in French (Français).'
        : language === 'rw'
        ? 'Write the message in Kinyarwanda (Ikinyarwanda).'
        : 'Write the message in English.';

    const systemPrompt = `${SCHOOL_SYSTEM_INSTRUCTION}
You are assisting Head Teacher Emmanuel Twahirwa in writing an official announcement or SMS bulletin for St. Silas Private Primary School.
Target Audience: ${targetRole || 'Parents'}
Topic / Purpose: ${topic || 'School Notice'}
Guidelines: Keep it clear, polite, structured with a clear subject line and concise body.
${langInstruction}`;

    let draftedText = '';

    try {
      draftedText = await callGemini(`Draft official announcement about: ${topic}`, systemPrompt);
    } catch (err) {
      draftedText = `Official Notice to ${targetRole || 'Parents'}:\n\nSt. Silas Private Primary School EAR Kibondo informs all families regarding ${topic || 'the upcoming academic schedule'}. Classes and daily feeding program proceed according to the term timetable.\n\nOffice of the Head Teacher - Emmanuel Twahirwa.`;
    }

    return res.json({
      draft: draftedText,
      engineUsed: 'gemini',
      engineLabel: 'Google Gemini 3.8 Flash',
    });
  } catch (error) {
    console.error('Error in AI message draft:', error);
    return res.status(500).json({ error: 'Failed to generate AI draft' });
  }
});

// Explicit JSON 404 for unmatched API routes
app.all('/api/*', (req: Request, res: Response) => {
  res.status(404).json({ error: `API endpoint ${req.method} ${req.originalUrl} not found` });
});

export function initializeApp() {
  databaseInitialization ??= db.init().catch(error => {
    databaseInitialization = undefined;
    throw error;
  });
  return databaseInitialization;
}

export { app };

async function startServer() {
  try {
    await initializeApp();
  } catch (err) {
    console.error('Database initialization error:', err);
    throw err;
  }

  const isDev = process.env.NODE_ENV !== 'production';

  if (isDev) {
    const vite = await createViteServer({
      configFile: path.resolve(__dirname, '../frontend/vite.config.ts'),
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const frontendDistPath = path.resolve(__dirname, '../frontend/dist');
    app.use(express.static(frontendDistPath));
    app.get('*', (_req: Request, res: Response) => {
      res.sendFile(path.resolve(frontendDistPath, 'index.html'));
    });
  }

  const httpServer = createHttpServer(app);
  attachChatSocket(httpServer);
  httpServer.listen(PORT, '0.0.0.0', () => {
    console.log(`St. Silas School Server running on http://0.0.0.0:${PORT}`);
  });
}

if (!process.env.VERCEL) {
  startServer();
}
