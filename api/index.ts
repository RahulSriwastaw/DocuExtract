import express from "express";
import 'dotenv/config';
import path from "path";
import { fileURLToPath } from "url";
import Airtable from 'airtable';
import fs from 'fs/promises';
import { existsSync, mkdirSync } from 'fs';
import { createClient } from '@supabase/supabase-js';
import OpenAI from "openai";
import pkg from 'pg';
const { Pool } = pkg;

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const CACHE_DIR = process.env.NODE_ENV === 'production' 
  ? path.join('/tmp', '.cache') 
  : path.join(__dirname, '.cache');

if (!existsSync(CACHE_DIR)) {
  mkdirSync(CACHE_DIR, { recursive: true });
}

// Supabase Configuration
const supabaseUrl = process.env.SUPABASE_URL || 'https://yxibppbfrugarjoeoijw.supabase.co';
const supabaseKey = process.env.SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inl4aWJwcGJmcnVnYXJqb2VvaWp3Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzQ1MTgwNjUsImV4cCI6MjA5MDA5NDA2NX0.m7pkeKKDBW4bunM9V8iR1Wo6TzXdhLHAd9BfFagepO0';

// Custom fetch with timeout
const fetchWithTimeout = (url: string, options: any = {}) => {
  const timeout = options.timeout || 10000; // 10 second default
  const controller = new AbortController();
  const id = setTimeout(() => controller.abort(), timeout);
  return fetch(url, {
    ...options,
    signal: controller.signal
  }).finally(() => clearTimeout(id));
};

const supabase = createClient(supabaseUrl, supabaseKey, {
  global: {
    fetch: fetchWithTimeout
  }
});

import util from 'util';

function handleSupabaseError(error: any, res: express.Response, context: string) {
  // Log the full error for debugging
  console.error(`[Supabase Error] Context: ${context}`, {
    message: error.message,
    code: error.code,
    status: error.status,
    details: error.details,
    hint: error.hint
  });

  const errorString = typeof error === 'string' ? error : util.inspect(error);
  const isPausedError = 
    (errorString && (
      errorString.includes('cloudflare') || 
      errorString.includes('522') || 
      errorString.includes('ETIMEDOUT') || 
      errorString.includes('ECONNREFUSED') ||
      errorString.includes('Connection terminated') ||
      errorString.includes('fetch failed') ||
      errorString.includes('<!DOCTYPE html>') || // HTML response usually means Cloudflare error
      errorString.includes('Error code 522')
    )) ||
    (error && (
      error.code === 'ETIMEDOUT' || 
      error.code === 'ECONNREFUSED' || 
      error.status === 522 ||
      error.status === 504
    ));

  if (isPausedError || !isDbConnected) {
    // If not connected, try to re-initialize in background
    if (!isDbConnected && !dbInitInProgress) {
      initDb(1);
    }

    return res.status(503).json({ 
      error: "Database connection issue. Your Supabase project might be paused or experiencing high latency. Please check the Supabase dashboard at https://supabase.com/dashboard/project/yxibppbfrugarjoeoijw",
      folders: [],
      syncStatus: {},
      isPaused: true
    });
  }
  res.status(500).json({ error: error.message || `Failed to ${context}` });
}

const pgPool = new Pool({
  connectionString: 'postgresql://postgres.yxibppbfrugarjoeoijw:iuTKL5bWoinAH6kr@aws-1-ap-south-1.pooler.supabase.com:6543/postgres',
  ssl: { rejectUnauthorized: false },
  max: 20,
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 15000,
  query_timeout: 15000,
});

let isDbConnected = false;
let dbInitInProgress = false;

async function initDb(retries = 3) {
  if (dbInitInProgress) return;
  dbInitInProgress = true;
  
  for (let i = 0; i < retries; i++) {
    try {
      console.log(`Attempting to connect to Supabase DB (Attempt ${i + 1})...`);
      await pgPool.query('SELECT 1');
      isDbConnected = true;
      await pgPool.query(`
        CREATE TABLE IF NOT EXISTS questions (
          id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
          record_id TEXT,
          question_unique_id TEXT,
          question_hin TEXT,
          question_eng TEXT,
          subject TEXT,
          chapter TEXT,
          option1_hin TEXT,
          option1_eng TEXT,
          option2_hin TEXT,
          option2_eng TEXT,
          option3_hin TEXT,
          option3_eng TEXT,
          option4_hin TEXT,
          option4_eng TEXT,
          option5_hin TEXT,
          option5_eng TEXT,
          answer TEXT,
          solution_hin TEXT,
          solution_eng TEXT,
          type TEXT,
          video TEXT,
          page_no TEXT,
          collection TEXT,
          airtable_table_name TEXT,
          section TEXT,
          year TEXT,
          date TEXT,
          shift TEXT,
          exam TEXT,
          previous_of TEXT,
          action TEXT,
          current_status TEXT,
          sync_code TEXT,
          error_report TEXT,
          error_description TEXT,
          tags TEXT,
          test_name TEXT,
          difficulty TEXT,
          topic TEXT,
          sub_topic TEXT,
          sub_subject TEXT,
          sub_chapter TEXT,
          keywords TEXT,
          image TEXT,
          created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
          updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
          UNIQUE(airtable_table_name, question_unique_id)
        );

        CREATE TABLE IF NOT EXISTS documents (
          id TEXT PRIMARY KEY,
          name TEXT,
          status TEXT,
          total_questions INTEGER,
          total_images INTEGER,
          upload_date TEXT,
          questions JSONB,
          created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
        );
      `);
      await pgPool.query(`
        ALTER TABLE questions 
        ADD COLUMN IF NOT EXISTS record_id TEXT,
        ADD COLUMN IF NOT EXISTS question_unique_id TEXT,
        ADD COLUMN IF NOT EXISTS question_hin TEXT,
        ADD COLUMN IF NOT EXISTS question_eng TEXT,
        ADD COLUMN IF NOT EXISTS subject TEXT,
        ADD COLUMN IF NOT EXISTS chapter TEXT,
        ADD COLUMN IF NOT EXISTS option1_hin TEXT,
        ADD COLUMN IF NOT EXISTS option1_eng TEXT,
        ADD COLUMN IF NOT EXISTS option2_hin TEXT,
        ADD COLUMN IF NOT EXISTS option2_eng TEXT,
        ADD COLUMN IF NOT EXISTS option3_hin TEXT,
        ADD COLUMN IF NOT EXISTS option3_eng TEXT,
        ADD COLUMN IF NOT EXISTS option4_hin TEXT,
        ADD COLUMN IF NOT EXISTS option4_eng TEXT,
        ADD COLUMN IF NOT EXISTS option5_hin TEXT,
        ADD COLUMN IF NOT EXISTS option5_eng TEXT,
        ADD COLUMN IF NOT EXISTS answer TEXT,
        ADD COLUMN IF NOT EXISTS solution_hin TEXT,
        ADD COLUMN IF NOT EXISTS solution_eng TEXT,
        ADD COLUMN IF NOT EXISTS type TEXT,
        ADD COLUMN IF NOT EXISTS video TEXT,
        ADD COLUMN IF NOT EXISTS page_no TEXT,
        ADD COLUMN IF NOT EXISTS collection TEXT,
        ADD COLUMN IF NOT EXISTS airtable_table_name TEXT,
        ADD COLUMN IF NOT EXISTS section TEXT,
        ADD COLUMN IF NOT EXISTS year TEXT,
        ADD COLUMN IF NOT EXISTS date TEXT,
        ADD COLUMN IF NOT EXISTS shift TEXT,
        ADD COLUMN IF NOT EXISTS exam TEXT,
        ADD COLUMN IF NOT EXISTS previous_of TEXT,
        ADD COLUMN IF NOT EXISTS action TEXT,
        ADD COLUMN IF NOT EXISTS current_status TEXT,
        ADD COLUMN IF NOT EXISTS sync_code TEXT,
        ADD COLUMN IF NOT EXISTS error_report TEXT,
        ADD COLUMN IF NOT EXISTS error_description TEXT,
        ADD COLUMN IF NOT EXISTS tags TEXT,
        ADD COLUMN IF NOT EXISTS test_name TEXT,
        ADD COLUMN IF NOT EXISTS difficulty TEXT,
        ADD COLUMN IF NOT EXISTS topic TEXT,
        ADD COLUMN IF NOT EXISTS sub_topic TEXT,
        ADD COLUMN IF NOT EXISTS sub_subject TEXT,
        ADD COLUMN IF NOT EXISTS sub_chapter TEXT,
        ADD COLUMN IF NOT EXISTS keywords TEXT,
        ADD COLUMN IF NOT EXISTS image TEXT,
        ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW();
      `);
      
      // Reload PostgREST schema cache
      try {
        await pgPool.query(`NOTIFY pgrst, 'reload schema'`);
      } catch (e) {
        console.warn("Failed to reload schema cache:", e);
      }
      
      // Add unique constraint if it doesn't exist
      try {
        await pgPool.query(`
          ALTER TABLE questions ADD CONSTRAINT questions_airtable_table_name_question_unique_id_key UNIQUE (airtable_table_name, question_unique_id);
        `);
      } catch (e: any) {
        // Constraint might already exist, ignore error
      }
      
      // Reload PostgREST schema cache so Supabase API sees the new columns
      try {
        await pgPool.query(`NOTIFY pgrst, 'reload schema';`);
        console.log("PostgREST schema cache reloaded.");
      } catch (e: any) {
        console.error("Failed to reload PostgREST schema cache:", e);
      }
      
      console.log("Supabase DB initialized successfully");
      dbInitInProgress = false;
      return;
    } catch (err) {
      isDbConnected = false;
      console.error(`Failed to initialize Supabase DB (Attempt ${i + 1}):`, err);
      if (i < retries - 1) {
        console.log("Retrying in 5 seconds...");
        await new Promise(resolve => setTimeout(resolve, 5000));
      }
    }
  }
  dbInitInProgress = false;
}
initDb();

const mapQuestionToDb = (q: any) => {
  const mapped: any = {};
  
  const getVal = (variations: string[]) => {
    for (const v of variations) {
      if (q[v] !== undefined && q[v] !== null && q[v] !== '') return q[v];
    }
    return undefined;
  };

  // Question text
  const qHin = getVal(['question_hin', 'text', 'Question', 'question', 'Name', 'Question Hindi', 'Question_Hin', 'Question Text', 'question_text', 'Question_Text', 'QuestionText']);
  if (qHin !== undefined) mapped.question_hin = qHin;
  
  const qEng = getVal(['question_eng', 'Question_Eng', 'question_en', 'Question English', 'Question_En', 'Question Text English', 'Question_Text_Eng']);
  if (qEng !== undefined) mapped.question_eng = qEng;
  
  // Classification
  const subject = getVal(['subject', 'Subject']);
  if (subject !== undefined) mapped.subject = subject;
  
  const subSubject = getVal(['sub_subject', 'Sub_Subject', 'Sub Subject']);
  if (subSubject !== undefined) mapped.sub_subject = subSubject;
  
  const chapter = getVal(['chapter', 'Chapter']);
  if (chapter !== undefined) mapped.chapter = chapter;
  
  const subChapter = getVal(['sub_chapter', 'Sub_Chapter', 'Sub Chapter']);
  if (subChapter !== undefined) mapped.sub_chapter = subChapter;
  
  const topic = getVal(['topic', 'Topic']);
  if (topic !== undefined) mapped.topic = topic;
  
  const subTopic = getVal(['sub_topic', 'Sub_Topic', 'Sub Topic']);
  if (subTopic !== undefined) mapped.sub_topic = subTopic;
  
  const keywords = getVal(['keywords', 'Keywords']);
  if (keywords !== undefined) mapped.keywords = keywords;
  
  // Options
  for (let i = 1; i <= 5; i++) {
    const optHin = getVal([
      `option${i}_hin`, `Option_${i}`, `option${i}`, `Option ${i}`, `Option_${i}_Hin`, `Option ${i} Hindi`, 
      `Option${i}`, `opt${i}`, `Opt ${i}`, `Choice ${i}`, `choice${i}`
    ]);
    if (optHin !== undefined) mapped[`option${i}_hin`] = optHin;
    else if (q.options && q.options[i-1] !== undefined) mapped[`option${i}_hin`] = q.options[i-1];
    
    const optEng = getVal([
      `option${i}_eng`, `Option_${i}_Eng`, `Option ${i} English`, `Option_${i}_En`, 
      `Option${i} English`, `opt${i}_eng`, `Choice ${i} English`
    ]);
    if (optEng !== undefined) mapped[`option${i}_eng`] = optEng;
  }
  
  // Answer & Solution
  const answer = getVal(['answer', 'Answer', 'correctOption', 'Correct Option', 'Correct_Option']);
  if (answer !== undefined) mapped.answer = answer;
  
  const solHin = getVal(['solution_hin', 'Solution', 'solution', 'Solution Hindi', 'Solution_Hin']);
  if (solHin !== undefined) mapped.solution_hin = solHin;
  
  const solEng = getVal(['solution_eng', 'Solution_Eng', 'Solution English', 'Solution_En']);
  if (solEng !== undefined) mapped.solution_eng = solEng;
  
  // Metadata
  const type = getVal(['type', 'Type']);
  if (type !== undefined) mapped.type = type;
  
  const difficulty = getVal(['difficulty', 'Difficulty']);
  if (difficulty !== undefined) mapped.difficulty = difficulty;
  
  const video = getVal(['video', 'Video', 'Video Link', 'Video_Link']);
  if (video !== undefined) mapped.video = video;
  
  const pageNo = getVal(['page_no', 'Page_No', 'Page', 'Page No', 'page_number']);
  if (pageNo !== undefined) mapped.page_no = pageNo;
  
  const collection = getVal(['collection', 'Collection']);
  if (collection !== undefined) mapped.collection = collection;
  
  const tableName = getVal(['airtable_table_name', 'Table_Name', 'Table Name', 'tableName']);
  if (tableName !== undefined) mapped.airtable_table_name = tableName;
  
  const section = getVal(['section', 'Section']);
  if (section !== undefined) mapped.section = section;
  
  const year = getVal(['year', 'Year']);
  if (year !== undefined) mapped.year = year;
  
  const date = getVal(['date', 'Date']);
  if (date !== undefined) mapped.date = date;
  
  const shift = getVal(['shift', 'Shift']);
  if (shift !== undefined) mapped.shift = shift;
  
  const exam = getVal(['exam', 'Exam']);
  if (exam !== undefined) mapped.exam = exam;
  
  const prevOf = getVal(['previous_of', 'Previous_Of', 'Previous Of']);
  if (prevOf !== undefined) mapped.previous_of = prevOf;
  
  const action = getVal(['action', 'Action']);
  if (action !== undefined) mapped.action = action;
  
  const status = getVal(['current_status', 'status', 'Status', 'Current Status', 'Current_Status']);
  if (status !== undefined) mapped.current_status = status;
  
  const syncCode = getVal(['sync_code', 'Sync_Code', 'Sync Code']);
  if (syncCode !== undefined) mapped.sync_code = syncCode;
  
  const errReport = getVal(['error_report', 'Error_Report', 'Error Report']);
  if (errReport !== undefined) mapped.error_report = errReport;
  
  const errDesc = getVal(['error_description', 'Error_Description', 'Error Description']);
  if (errDesc !== undefined) mapped.error_description = errDesc;
  
  const image = getVal(['image', 'Image']);
  if (image !== undefined) mapped.image = image;
  
  const tags = getVal(['tags', 'Tags']);
  if (tags !== undefined) {
    mapped.tags = Array.isArray(tags) ? tags : (typeof tags === 'string' ? (tags.includes('[') ? JSON.parse(tags) : tags.split(',').map((t: string) => t.trim())) : []);
  }

  return mapped;
};

const app = express();
const PORT = 3000;

app.use(express.json({ limit: '50mb' }));

// Add request logging
app.use((req, res, next) => {
  console.log(`[${new Date().toISOString()}] ${req.method} ${req.url}`);
  next();
});

// API routes FIRST
app.get("/api/health", (req, res) => {
  res.json({ status: "ok" });
});

  app.post("/api/ai/generate", async (req, res) => {
    try {
      const { prompt, config } = req.body;
      if (!prompt || !config) {
        return res.status(400).json({ error: "Missing prompt or config" });
      }

      const { provider, model } = config;

      if (provider === 'openrouter' || provider === 'groq' || provider === 'modal') {
        let baseURL = "";
        let apiKey = "";
        const headers: Record<string, string> = {};
        
        if (provider === 'openrouter') {
          baseURL = "https://openrouter.ai/api/v1";
          apiKey = process.env.OPENROUTER_API_KEY || "";
          headers["HTTP-Referer"] = "https://ai.studio/build";
          headers["X-Title"] = "AI Studio App";
        } else if (provider === 'groq') {
          baseURL = "https://api.groq.com/openai/v1";
          apiKey = process.env.GROQ_API_KEY || "";
        } else {
          baseURL = "https://api.us-west-2.modal.direct/v1";
          apiKey = process.env.MODAL_API_KEY || "";
        }
        
        if (!apiKey) throw new Error(`${provider} API Key not found`);
        
        const openai = new OpenAI({ 
          baseURL, 
          apiKey,
          defaultHeaders: headers,
          timeout: 180000, // 180 second timeout for bulk operations
          maxRetries: 5 // Increase built-in retries
        });
        
        try {
          const response = await openai.chat.completions.create({
            model: model,
            messages: [{ role: 'user', content: prompt }],
            response_format: provider === 'modal' ? undefined : { type: 'json_object' },
            max_tokens: 2000
          });
          
          return res.json({ text: response.choices[0].message.content || "" });
        } catch (apiErr: any) {
          // If 502, 429 or Timeout, try manual retries with longer backoff
          const isRetryable = apiErr.status === 502 || apiErr.status === 429 || apiErr.name === 'APIConnectionTimeoutError' || apiErr.message?.includes('Too many concurrent requests');
          
          if (isRetryable) {
            let errorType = "Error";
            if (apiErr.status === 502) errorType = "502 Upstream Error";
            if (apiErr.status === 429 || apiErr.message?.includes('Too many concurrent requests')) errorType = "429 Rate Limit";
            if (apiErr.name === 'APIConnectionTimeoutError') errorType = "Timeout";
            
            console.warn(`${errorType} from ${provider}. Starting manual retry sequence...`);
            
            // Try up to 2 manual retries with increasing backoff
            for (let attempt = 1; attempt <= 2; attempt++) {
              const waitTime = (apiErr.status === 429 || apiErr.message?.includes('Too many concurrent requests')) 
                ? (15000 * attempt) // 15s, then 30s
                : (5000 * attempt); // 5s, then 10s
              
              console.log(`Manual retry attempt ${attempt} for ${provider}. Waiting ${waitTime/1000}s...`);
              await new Promise(resolve => setTimeout(resolve, waitTime + Math.random() * 3000));
              
              try {
                const retryResponse = await openai.chat.completions.create({
                  model: model,
                  messages: [{ role: 'user', content: prompt }],
                  max_tokens: 2000
                });
                return res.json({ text: retryResponse.choices[0].message.content || "" });
              } catch (retryErr: any) {
                console.error(`Manual retry ${attempt} failed:`, retryErr.message);
                if (attempt === 2) throw retryErr; // Throw if last manual retry fails
              }
            }
          }
          throw apiErr;
        }
      }

      throw new Error("Unsupported AI Provider");
    } catch (error: any) {
      console.error("Server AI Error:", error);
      const status = (error.status === 429 || error.message?.includes('Too many concurrent requests')) ? 429 : 500;
      res.status(status).json({ error: error.message || "Unknown AI error" });
    }
  });

  app.get("/api/test-airtable", async (req, res) => {
    const apiKey = process.env.AIRTABLE_API_KEY?.trim();
    const baseId = process.env.AIRTABLE_BASE_ID?.trim();

    const results: any = {
      apiKeyConfigured: !!apiKey,
      baseIdConfigured: !!baseId,
      apiKeyPrefix: apiKey ? (apiKey.startsWith('pat.') ? 'pat.' : 'other') : null,
      metaApi: { status: 'pending' },
      recordsApi: { status: 'pending' }
    };

    if (!apiKey || !baseId) {
      return res.status(400).json({ error: "Airtable credentials not configured", results });
    }

    // 1. Test Meta API
    try {
      const metaRes = await fetch(`https://api.airtable.com/v0/meta/bases/${baseId}/tables`, {
        headers: { Authorization: `Bearer ${apiKey}` }
      });
      results.metaApi.status = metaRes.status;
      if (metaRes.ok) {
        const data = await metaRes.json();
        results.metaApi.tableCount = data.tables?.length || 0;
        results.metaApi.success = true;
      } else {
        const err = await metaRes.json();
        results.metaApi.error = err.error?.type || err.error?.message || "Failed";
        results.metaApi.success = false;
      }
    } catch (e: any) {
      results.metaApi.status = 'error';
      results.metaApi.error = e.message;
      results.metaApi.success = false;
    }

    // 2. Test Records API
    try {
      const base = new Airtable({ apiKey }).base(baseId);
      // Try to list tables first to get a valid table name if possible, or just use a dummy one to test auth
      // Actually, we can just try to fetch from any table if we have one from Meta API
      let tableToTest = 'Questions'; // Default guess
      if (results.metaApi.success && results.metaApi.tableCount > 0) {
        // We'll try the first table found
        try {
          const metaRes = await fetch(`https://api.airtable.com/v0/meta/bases/${baseId}/tables`, {
            headers: { Authorization: `Bearer ${apiKey}` }
          });
          const data = await metaRes.json();
          if (data.tables && data.tables.length > 0) {
            tableToTest = data.tables[0].name;
          }
        } catch (e) {}
      }

      try {
        await base(tableToTest).select({ maxRecords: 1 }).firstPage();
        results.recordsApi.success = true;
        results.recordsApi.status = 200;
        results.recordsApi.testedTable = tableToTest;
      } catch (e: any) {
        results.recordsApi.success = false;
        results.recordsApi.status = e.statusCode || 500;
        results.recordsApi.error = e.error || e.message;
        results.recordsApi.type = e.type || 'UNKNOWN';
      }
    } catch (e: any) {
      results.recordsApi.status = 'error';
      results.recordsApi.error = e.message;
      results.recordsApi.success = false;
    }

    res.json(results);
  });

  app.get("/api/get-airtable-tables", async (req, res) => {
    const { forceSync } = req.query;
    const apiKey = process.env.AIRTABLE_API_KEY?.trim();
    const baseId = process.env.AIRTABLE_BASE_ID?.trim();

    if (!apiKey || !baseId) {
      return res.status(500).json({ error: "Airtable credentials not configured. Please set AIRTABLE_API_KEY and AIRTABLE_BASE_ID in the Secrets panel." });
    }

    const cacheFile = path.join(CACHE_DIR, `tables.json`);

    try {
      if (forceSync !== 'true' && existsSync(cacheFile)) {
        try {
          const cachedData = await fs.readFile(cacheFile, 'utf-8');
          const parsed = JSON.parse(cachedData);
          if (Array.isArray(parsed)) {
            return res.json({ tables: parsed, source: 'cache' });
          }
        } catch (e) {
          console.error("Failed to parse cache, fetching fresh", e);
          // Delete corrupted cache
          try { await fs.unlink(cacheFile); } catch (err) {}
        }
      }

      const response = await fetch(`https://api.airtable.com/v0/meta/bases/${baseId}/tables`, {
        headers: {
          Authorization: `Bearer ${apiKey}`,
        },
      });

      if (!response.ok) {
        const errorData = await response.json();
        const errorMessage = errorData.error?.message || "Failed to fetch tables";
        const errorType = errorData.error?.type || "";
        
        if (errorType === 'NOT_AUTHORIZED' || response.status === 401) {
          throw new Error("Airtable access denied (NOT_AUTHORIZED). Please ensure your AIRTABLE_API_KEY is a valid Personal Access Token (starts with 'pat.') and has the 'schema.bases:read' scope.");
        }
        throw new Error(errorMessage);
      }

      const data = await response.json();
      console.log('Airtable API response tables:', JSON.stringify(data.tables, null, 2));
      await fs.writeFile(cacheFile, JSON.stringify(data.tables));
      res.json({ tables: data.tables, source: 'airtable' });
    } catch (error: any) {
      console.error("Airtable error:", error);
      const isNotAuthorized = error.statusCode === 401 || error.statusCode === 403 || error.error === 'NOT_AUTHORIZED' || (error.message && error.message.includes('NOT_AUTHORIZED'));
      
      if (isNotAuthorized) {
        return res.status(400).json({ 
          error: "Airtable access denied (NOT_AUTHORIZED).",
          details: "Please check your AIRTABLE_API_KEY. Ensure it is a valid Personal Access Token (starts with 'pat.') and has the following scopes: 'data.records:read', 'data.records:write', 'schema.bases:read', 'schema.bases:write'. Also verify it has access to the specific base.",
          message: error.message
        });
      }
      res.status(500).json({ error: error.message || "Failed to fetch tables" });
    }
  });

  app.post("/api/get-table-stats", async (req, res) => {
    const { tableName } = req.body;
    
    try {
      // First try to get count from Supabase for speed
      const { count, error } = await supabase
        .from('questions')
        .select('*', { count: 'exact', head: true })
        .eq('airtable_table_name', tableName);
        
      if (!error && count !== null && count > 0) {
        return res.json({ 
          count: count, 
          lastUpdated: new Date().toISOString(),
          source: 'supabase'
        });
      }

      // Fallback to Airtable
      const apiKey = process.env.AIRTABLE_API_KEY?.trim();
      const baseId = process.env.AIRTABLE_BASE_ID?.trim();

      if (!apiKey || !baseId) {
        return res.status(500).json({ error: "Airtable credentials not configured. Please set AIRTABLE_API_KEY and AIRTABLE_BASE_ID in the Secrets panel." });
      }

      const base = new Airtable({ apiKey }).base(baseId);
      const records = await base(tableName).select({ fields: [] }).all();

      let lastUpdated = null;
      if (records.length > 0) {
        const times = records.map(r => new Date((r as any)._rawJson?.createdTime || 0).getTime());
        const maxTime = Math.max(...times);
        if (maxTime > 0) {
          lastUpdated = new Date(maxTime).toISOString();
        }
      }

      res.json({ 
        count: records.length, 
        lastUpdated: lastUpdated || new Date().toISOString(),
        source: 'airtable'
      });
    } catch (error: any) {
      console.error(`Stats error for ${tableName}:`, error);
      const isNotAuthorized = error.statusCode === 401 || error.statusCode === 403 || error.error === 'NOT_AUTHORIZED' || (error.message && error.message.includes('NOT_AUTHORIZED'));
      
      if (isNotAuthorized) {
        return res.status(400).json({ 
          error: "Airtable access denied (NOT_AUTHORIZED).",
          details: "Please check your AIRTABLE_API_KEY. Ensure it is a valid Personal Access Token (starts with 'pat.') and has the following scopes: 'data.records:read', 'data.records:write', 'schema.bases:read', 'schema.bases:write'. Also verify it has access to the specific base.",
          message: error.message
        });
      }
      res.status(500).json({ error: error.message || "Failed to fetch table stats" });
    }
  });

  app.post("/api/sync-all-airtable", async (req, res) => {
    const apiKey = process.env.AIRTABLE_API_KEY?.trim();
    const baseId = process.env.AIRTABLE_BASE_ID?.trim();

    if (!apiKey || !baseId) {
      return res.status(500).json({ error: "Airtable credentials not configured. Please set AIRTABLE_API_KEY and AIRTABLE_BASE_ID in the Secrets panel." });
    }

    try {
      // 1. Get all tables
      const listRes = await fetch(`https://api.airtable.com/v0/meta/bases/${baseId}/tables`, {
        headers: {
          Authorization: `Bearer ${apiKey}`,
        },
      });

      if (!listRes.ok) {
        const errorData = await listRes.json().catch(() => ({}));
        const errorType = errorData.error?.type || "";
        if (errorType === 'NOT_AUTHORIZED' || listRes.status === 401) {
          throw new Error("Airtable access denied (NOT_AUTHORIZED). Please ensure your AIRTABLE_API_KEY is a valid Personal Access Token (starts with 'pat.') and has the 'schema.bases:read' scope.");
        }
        throw new Error(errorData.error?.message || "Failed to fetch tables from Airtable");
      }

      const { tables } = await listRes.json();
      const results: any[] = [];

      // 2. Sync each table (sequentially to avoid rate limits)
      const base = new Airtable({ apiKey }).base(baseId);
      
      for (const table of tables) {
        try {
          const records = await base(table.name).select().all();
          const formatted = records.map(r => ({ id: r.id, ...(r as any).fields }));

          if (formatted.length > 0) {
            const supabaseData = formatted.map(q => {
              const mapped = mapQuestionToDb(q);
              return {
                ...mapped,
                record_id: mapped.record_id || q.id || '',
                question_unique_id: mapped.question_unique_id || q.id || Math.random().toString(36).substring(7),
                airtable_table_name: table.name,
                updated_at: new Date().toISOString()
              };
            });

            const chunkSize = 500;
            for (let i = 0; i < supabaseData.length; i += chunkSize) {
              const chunk = supabaseData.slice(i, i + chunkSize);
              const { error } = await supabase.from('questions').upsert(chunk, { onConflict: 'airtable_table_name,question_unique_id' });
              if (error) console.error(`Sync all: chunk ${i} for ${table.name} failed:`, error);
            }
            results.push({ table: table.name, count: formatted.length, status: 'success' });
          }
        } catch (tableErr: any) {
          console.error(`Failed to sync table ${table.name}:`, tableErr);
          results.push({ table: table.name, status: 'failed', error: tableErr.message });
        }
      }

      res.json({ success: true, results });
    } catch (error: any) {
      console.error("Sync all error:", error);
      res.status(500).json({ error: error.message || "Failed to sync all tables" });
    }
  });

  app.post("/api/sync-all-to-airtable", async (req, res) => {
    const apiKey = process.env.AIRTABLE_API_KEY?.trim();
    const baseId = process.env.AIRTABLE_BASE_ID?.trim();

    if (!apiKey || !baseId) {
      return res.status(500).json({ error: "Airtable credentials not configured. Please set AIRTABLE_API_KEY and AIRTABLE_BASE_ID in the Secrets panel." });
    }

    try {
      // 1. Get all unique table names from Supabase
      const { data: tablesData, error: tablesError } = await supabase
        .from('questions')
        .select('airtable_table_name')
        .not('airtable_table_name', 'is', null);

      if (tablesError) throw tablesError;

      const tableNames = Array.from(new Set(tablesData.map(t => t.airtable_table_name)));
      const results: any[] = [];
      const base = new Airtable({ apiKey }).base(baseId);

      // 2. Sync each table
      for (const tableName of tableNames) {
        try {
          const { data: questions, error: questionsError } = await supabase
            .from('questions')
            .select('*')
            .eq('airtable_table_name', tableName);

          if (questionsError) throw questionsError;

          if (questions && questions.length > 0) {
            const toCreate: any[] = [];
            const toUpdate: any[] = [];

            questions.forEach(q => {
              const fields = {
                record_id: q.record_id || '',
                question_unique_id: q.question_unique_id || '',
                question_hin: q.question_hin || '',
                question_eng: q.question_eng || '',
                subject: q.subject || '',
                sub_subject: q.sub_subject || '',
                chapter: q.chapter || '',
                sub_chapter: q.sub_chapter || '',
                topic: q.topic || '',
                sub_topic: q.sub_topic || '',
                keywords: q.keywords || '',
                difficulty: q.difficulty || '',
                image: q.image || '',
                option1_hin: q.option1_hin || '',
                option1_eng: q.option1_eng || '',
                option2_hin: q.option2_hin || '',
                option2_eng: q.option2_eng || '',
                option3_hin: q.option3_hin || '',
                option3_eng: q.option3_eng || '',
                option4_hin: q.option4_hin || '',
                option4_eng: q.option4_eng || '',
                option5_hin: q.option5_hin || '',
                option5_eng: q.option5_eng || '',
                answer: q.answer || '',
                solution_hin: q.solution_hin || '',
                solution_eng: q.solution_eng || '',
                type: q.type || '',
                video: q.video || '',
                page_no: q.page_no || '',
                collection: q.collection || '',
                airtable_table_name: q.airtable_table_name || '',
                section: q.section || '',
                year: q.year || '',
                date: q.date || '',
                shift: q.shift || '',
                exam: q.exam || '',
                previous_of: q.previous_of || '',
                action: q.action || 'UPDATED',
                current_status: q.current_status || 'Draft',
                updated_at: new Date().toISOString()
              };

              if (q.sync_code) (fields as any).sync_code = q.sync_code;
              if (q.error_report) (fields as any)['error_report'] = q.error_report;
              if (q.error_description) (fields as any)['error_description'] = q.error_description;
              if (q.image) (fields as any).image = q.image;
              if (q.tags) (fields as any).tags = Array.isArray(q.tags) ? q.tags.join(', ') : q.tags;

              if (q.record_id && q.record_id.startsWith('rec')) {
                toUpdate.push({ id: q.record_id, fields });
              } else {
                toCreate.push({ fields });
              }
            });

            const batchSize = 10;
            
            // Handle Updates
            for (let i = 0; i < toUpdate.length; i += batchSize) {
              const chunk = toUpdate.slice(i, i + batchSize);
              await base(tableName).update(chunk, { typecast: true });
            }

            // Handle Creates
            for (let i = 0; i < toCreate.length; i += batchSize) {
              const chunk = toCreate.slice(i, i + batchSize);
              const createdRecords = await base(tableName).create(chunk, { typecast: true });
              
              // Update Supabase with new record IDs
              const updates = createdRecords.map((r, idx) => ({
                question_unique_id: chunk[idx].fields.question_unique_id,
                record_id: r.id
              })).filter(u => u.question_unique_id);

              for (const update of updates) {
                await supabase.from('questions').update({ record_id: update.record_id }).eq('question_unique_id', update.question_unique_id);
              }
            }

            results.push({ table: tableName, updated: toUpdate.length, created: toCreate.length, status: 'success' });
          }
        } catch (tableErr: any) {
          console.error(`Failed to push table ${tableName}:`, tableErr);
          results.push({ table: tableName, status: 'failed', error: tableErr.message });
        }
      }

      res.json({ success: true, results });
    } catch (error: any) {
      console.error("Sync to Airtable error:", error);
      const isNotAuthorized = error.statusCode === 401 || error.statusCode === 403 || error.error === 'NOT_AUTHORIZED' || (error.message && error.message.includes('NOT_AUTHORIZED'));
      
      if (isNotAuthorized) {
        return res.status(400).json({ 
          error: "Airtable access denied (NOT_AUTHORIZED).",
          details: "Please check your AIRTABLE_API_KEY. Ensure it is a valid Personal Access Token (starts with 'pat.') and has the following scopes: 'data.records:read', 'data.records:write', 'schema.bases:read', 'schema.bases:write'. Also verify it has access to the specific base.",
          message: error.message
        });
      }
      res.status(500).json({ error: error.message || "Failed to sync to Airtable" });
    }
  });

  app.post("/api/get-airtable-records", async (req, res) => {
    const { tableName, forceSync, collectionPath } = req.body;
    const apiKey = process.env.AIRTABLE_API_KEY?.trim();
    const baseId = process.env.AIRTABLE_BASE_ID?.trim();

    try {
      // 1. Try fetching from Supabase first (if not forceSync)
      if (!forceSync) {
        try {
          let query = supabase
            .from('questions')
            .select('*')
            .eq('airtable_table_name', tableName)
            .order('created_at', { ascending: false });
          
          if (collectionPath) {
            query = query.eq('collection', collectionPath);
          }
            
          const { data: supabaseRecords, error } = await query;
            
          if (error) {
            console.error("Supabase fetch error:", error);
          }
            
          if (!error && supabaseRecords && supabaseRecords.length > 0) {
            // Map back to expected format
            const formatted = supabaseRecords.map(r => ({
              id: r.question_unique_id,
              ...r
            }));
            return res.json({ records: formatted, source: 'supabase' });
          }
        } catch (supabaseErr) {
          console.error("Supabase fetch exception:", supabaseErr);
          // Continue to Airtable fallback
        }
      }

      // 2. Fetch from Airtable
      if (!apiKey || !baseId) {
        return res.status(500).json({ error: "Airtable credentials not configured. Please set AIRTABLE_API_KEY and AIRTABLE_BASE_ID in the Secrets panel." });
      }

      if (!apiKey.startsWith('pat.')) {
        console.warn("Airtable API Key does not start with 'pat.'. Airtable now requires Personal Access Tokens.");
      }

      const base = new Airtable({ apiKey }).base(baseId);
      const records = await base(tableName).select().all();
      console.log(`Fetched ${records.length} records from Airtable for table ${tableName}`);
      const formatted = records.map(r => {
        const raw = { id: r.id, ...(r as any).fields };
        return {
          ...raw,
          ...mapQuestionToDb(raw)
        };
      });
      
      // 3. Sync to Supabase in background
      if (formatted.length > 0) {
        const supabaseData = formatted.map(q => ({
          ...mapQuestionToDb(q),
          record_id: q.record_id || q.id || '',
          question_unique_id: q.question_unique_id || q.id || Math.random().toString(36).substring(7),
          airtable_table_name: tableName,
          updated_at: new Date().toISOString()
        }));
        
        // Upsert to Supabase in chunks to avoid payload too large errors
        const chunkSize = 500;
        for (let i = 0; i < supabaseData.length; i += chunkSize) {
          const chunk = supabaseData.slice(i, i + chunkSize);
          supabase.from('questions').upsert(chunk, { onConflict: 'airtable_table_name,question_unique_id' })
            .then(({ error }) => {
              if (error) console.error(`Background sync chunk ${i} failed:`, error);
            });
        }
        console.log(`Triggered background sync of ${supabaseData.length} records to Supabase for ${tableName}`);
      }

      res.json({ records: formatted, source: 'airtable' });
    } catch (error: any) {
      console.error(`Fetch error for ${tableName}:`, error);
      
      // Handle Airtable specific errors
      if (error.statusCode === 401 || error.statusCode === 403 || error.error === 'NOT_AUTHORIZED' || (error.message && error.message.includes('NOT_AUTHORIZED'))) {
        return res.status(400).json({ 
          error: "Airtable access denied (NOT_AUTHORIZED).",
          details: "Please check your AIRTABLE_API_KEY. Ensure it is a valid Personal Access Token (starts with 'pat.') and has the following scopes: 'data.records:read', 'data.records:write', 'schema.bases:read', 'schema.bases:write'. Also verify it has access to the specific base.",
          message: error.message,
          type: error.type || 'NOT_AUTHORIZED'
        });
      }
      
      if (error.statusCode === 404) {
        return res.status(400).json({
          error: `Airtable table "${tableName}" not found. Please check the table name and AIRTABLE_BASE_ID.`,
          details: error.message
        });
      }

      res.status(500).json({ error: error.message || "Failed to fetch records" });
    }
  });

  app.get("/api/get-sync-status", async (req, res) => {
    try {
      const result = await pgPool.query('SELECT airtable_table_name, MAX(updated_at) as last_sync, COUNT(*) as total_questions FROM questions GROUP BY airtable_table_name');
      const syncStatus: Record<string, { lastSync: string, totalQuestions: number }> = {};
      result.rows.forEach(row => {
        if (row.airtable_table_name) {
          syncStatus[row.airtable_table_name] = {
            lastSync: row.last_sync,
            totalQuestions: parseInt(row.total_questions, 10)
          };
        }
      });
      res.json({ syncStatus });
    } catch (error: any) {
      handleSupabaseError(error, res, "fetch sync status");
    }
  });

  app.post("/api/create-airtable-table", async (req, res) => {
    const { tableName } = req.body;
    const apiKey = process.env.AIRTABLE_API_KEY;
    const baseId = process.env.AIRTABLE_BASE_ID;

    if (!apiKey || !baseId) {
      return res.status(500).json({ error: "Airtable credentials not configured" });
    }

    try {
      const response = await fetch(`https://api.airtable.com/v0/meta/bases/${baseId}/tables`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${apiKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          name: tableName,
          fields: [
            { name: 'record_id', type: 'singleLineText' },
            { name: 'question_unique_id', type: 'singleLineText' },
            { name: 'question_hin', type: 'multilineText' },
            { name: 'question_eng', type: 'multilineText' },
            { name: 'subject', type: 'singleLineText' },
            { name: 'sub_subject', type: 'singleLineText' },
            { name: 'chapter', type: 'singleLineText' },
            { name: 'sub_chapter', type: 'singleLineText' },
            { name: 'topic', type: 'singleLineText' },
            { name: 'sub_topic', type: 'singleLineText' },
            { name: 'keywords', type: 'singleLineText' },
            { name: 'difficulty', type: 'singleLineText' },
            { name: 'image', type: 'singleLineText' },
            { name: 'option1_hin', type: 'singleLineText' },
            { name: 'option1_eng', type: 'singleLineText' },
            { name: 'option2_hin', type: 'singleLineText' },
            { name: 'option2_eng', type: 'singleLineText' },
            { name: 'option3_hin', type: 'singleLineText' },
            { name: 'option3_eng', type: 'singleLineText' },
            { name: 'option4_hin', type: 'singleLineText' },
            { name: 'option4_eng', type: 'singleLineText' },
            { name: 'option5_hin', type: 'singleLineText' },
            { name: 'option5_eng', type: 'singleLineText' },
            { name: 'answer', type: 'singleLineText' },
            { name: 'solution_hin', type: 'multilineText' },
            { name: 'solution_eng', type: 'multilineText' },
            { name: 'type', type: 'singleLineText' },
            { name: 'video', type: 'singleLineText' },
            { name: 'page_no', type: 'singleLineText' },
            { name: 'collection', type: 'singleLineText' },
            { name: 'airtable_table_name', type: 'singleLineText' },
            { name: 'section', type: 'singleLineText' },
            { name: 'year', type: 'singleLineText' },
            { name: 'date', type: 'singleLineText' },
            { name: 'exam', type: 'singleLineText' },
            { name: 'previous_of', type: 'singleLineText' },
            { name: 'action', type: 'singleLineText' },
            { name: 'current_status', type: 'singleLineText' },
            { name: 'sync_code', type: 'singleLineText' },
            { name: 'error_report', type: 'multilineText' },
            { name: 'error_description', type: 'multilineText' }
          ]
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error?.message || "Failed to create table");
      }

      const data = await response.json();
      res.json({ table: data });
    } catch (error: any) {
      console.error("Airtable error:", error);
      res.status(500).json({ error: error.message || "Failed to create table" });
    }
  });

  app.get("/api/get-server-folders", async (req, res) => {
    try {
      const { data, error } = await supabase
        .from('questions')
        .select('airtable_table_name, collection')
        .limit(10000);
        
      if (error) throw error;
      
      // Get all unique paths
      const paths = new Set<string>();
      data.forEach(d => {
        if (d.collection) paths.add(d.collection);
        if (d.airtable_table_name) paths.add(d.airtable_table_name);
      });

      res.json({ folders: Array.from(paths).map(p => ({ id: p, name: p })) });
    } catch (error: any) {
      handleSupabaseError(error, res, "fetch server folders");
    }
  });

  app.post("/api/move-questions", async (req, res) => {
    const { ids, targetFolder, targetTable } = req.body;
    if (!ids || !Array.isArray(ids) || targetFolder === undefined) {
      return res.status(400).json({ error: "IDs and target folder are required" });
    }

    try {
      // Try to update by question_unique_id first, then by id (UUID)
      const { error: error1, data: data1 } = await supabase
        .from('questions')
        .update({ 
          collection: targetFolder,
          airtable_table_name: targetTable || (targetFolder ? targetFolder.split('/')[0] : null),
          updated_at: new Date().toISOString(),
          action: 'MOVED'
        })
        .in('question_unique_id', ids)
        .select();

      const { error: error2, data: data2 } = await supabase
        .from('questions')
        .update({ 
          collection: targetFolder,
          airtable_table_name: targetTable || (targetFolder ? targetFolder.split('/')[0] : null),
          updated_at: new Date().toISOString(),
          action: 'MOVED'
        })
        .in('id', ids)
        .select();

      if (error1 && error2) throw error1;
      
      res.json({ 
        success: true, 
        updatedCount: (data1?.length || 0) + (data2?.length || 0) 
      });
    } catch (error: any) {
      handleSupabaseError(error, res, "move questions");
    }
  });

  app.post("/api/copy-questions", async (req, res) => {
    const { ids, targetFolder, targetTable } = req.body;
    if (!ids || !Array.isArray(ids) || targetFolder === undefined) {
      return res.status(400).json({ error: "IDs and target folder are required" });
    }

    try {
      // 1. Fetch original questions (try both unique_id and id)
      const { data: originals1, error: fetchError1 } = await supabase
        .from('questions')
        .select('*')
        .in('question_unique_id', ids);

      const { data: originals2, error: fetchError2 } = await supabase
        .from('questions')
        .select('*')
        .in('id', ids);

      if (fetchError1 && fetchError2) throw fetchError1;

      const allOriginals = [...(originals1 || []), ...(originals2 || [])];
      // Deduplicate by id
      const uniqueOriginals = Array.from(new Map(allOriginals.map(item => [item.id, item])).values());

      if (uniqueOriginals.length === 0) {
        return res.status(404).json({ error: "No questions found to copy" });
      }

      // 2. Create copies
      const copies = uniqueOriginals.map(q => {
        const { id, created_at, ...rest } = q;
        return {
          ...rest,
          collection: targetFolder,
          airtable_table_name: targetTable || (targetFolder ? targetFolder.split('/')[0] : null),
          question_unique_id: `${q.question_unique_id || q.id}_copy_${Math.random().toString(36).substring(7)}`,
          updated_at: new Date().toISOString(),
          action: 'COPIED'
        };
      });

      const { error: insertError } = await supabase
        .from('questions')
        .insert(copies);

      if (insertError) throw insertError;
      res.json({ success: true, copiedCount: copies.length });
    } catch (error: any) {
      handleSupabaseError(error, res, "copy questions");
    }
  });

  app.post("/api/create-folder", async (req, res) => {
    const { name, parentPath } = req.body;
    if (!name) return res.status(400).json({ error: "Folder name is required" });

    const fullPath = parentPath ? `${parentPath}/${name}` : name;
    
    try {
      // Insert a dummy question to ensure the folder exists in the database
      const dummyId = `dummy-${Date.now()}`;
      const { error } = await supabase.from('questions').insert({
        question_unique_id: dummyId,
        airtable_table_name: fullPath,
        collection: fullPath,
        question_hin: '--- DUMMY QUESTION FOR FOLDER CREATION ---',
        current_status: 'Draft'
      });

      if (error) throw error;

      res.json({ success: true, path: fullPath });
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  app.post("/api/save-questions", async (req, res) => {
    const { destinations, airtableTable, serverFolder, questions } = req.body;
    const apiKey = process.env.AIRTABLE_API_KEY;
    const baseId = process.env.AIRTABLE_BASE_ID;

    try {
      const records = questions.map((q: any) => ({
        ...mapQuestionToDb(q),
        record_id: q.record_id || '',
        question_unique_id: q.question_unique_id || q.id || '',
        collection: serverFolder || airtableTable || q.collection || '',
        airtable_table_name: airtableTable || serverFolder || q.airtable_table_name || '',
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      }));

      // 1. Save to Supabase (Server)
      if (!serverFolder && !airtableTable) {
        throw new Error("Folder name is required for server save");
      }
      const { error } = await supabase.from('questions').upsert(records, { onConflict: 'airtable_table_name,question_unique_id' });
      if (error) {
        console.error("Supabase sync error during save:", error);
        throw new Error("Failed to save to Server DB: " + error.message);
      }

      res.json({ success: true });
    } catch (error: any) {
      console.error("Save error:", error);
      res.status(500).json({ error: error.message || "Failed to save data" });
    }
  });

  app.post("/api/save-to-airtable", async (req, res) => {
    const { tableName, questions } = req.body;
    const apiKey = process.env.AIRTABLE_API_KEY?.trim();
    const baseId = process.env.AIRTABLE_BASE_ID?.trim();

    if (!apiKey || !baseId) {
      return res.status(500).json({ error: "Airtable credentials not configured. Please set AIRTABLE_API_KEY and AIRTABLE_BASE_ID in the Secrets panel." });
    }

    try {
      const base = new Airtable({ apiKey }).base(baseId);
      
      const records = questions.map((q: any) => {
        const fields: any = {
          record_id: q.record_id || '',
          question_unique_id: q.question_unique_id || q.id || '',
          question_hin: q.question_hin || q.text || '',
          question_eng: q.question_eng || '',
          subject: q.subject || '',
          chapter: q.chapter || '',
          option1_hin: q.option1_hin || q.options?.[0] || '',
          option1_eng: q.option1_eng || '',
          option2_hin: q.option2_hin || q.options?.[1] || '',
          option2_eng: q.option2_eng || '',
          option3_hin: q.option3_hin || q.options?.[2] || '',
          option3_eng: q.option3_eng || '',
          option4_hin: q.option4_hin || q.options?.[3] || '',
          option4_eng: q.option4_eng || '',
          option5_hin: q.option5_hin || q.options?.[4] || '',
          option5_eng: q.option5_eng || '',
          answer: q.answer || q.correctOption || '',
          solution_hin: q.solution_hin || '',
          solution_eng: q.solution_eng || '',
          type: q.type || '',
          video: q.video || '',
          page_no: q.page_no || '',
          collection: q.collection || '',
          airtable_table_name: tableName,
          section: q.section || '',
          year: q.year || '',
          date: q.date || '',
          shift: q.shift || '',
          exam: q.exam || '',
          previous_of: q.previous_of || '',
          action: q.action || 'UPDATED',
          current_status: q.status || q.current_status || 'Draft',
          updated_at: new Date().toISOString()
        };

        if (q.sync_code) fields.sync_code = q.sync_code;
        if (q.error_report) fields['error_report'] = q.error_report;
        if (q.error_description) fields['error_description'] = q.error_description;
        if (q.image) fields.image = q.image;
        if (q.tags) fields.tags = Array.isArray(q.tags) ? q.tags.join(', ') : q.tags;

        return { fields };
      });

      // 1. Save to Airtable
      const batchSize = 10;
      for (let i = 0; i < records.length; i += batchSize) {
        const chunk = records.slice(i, i + batchSize);
        await base(tableName).create(chunk, { typecast: true });
      }

      // 2. Save to Supabase
      const supabaseData = records.map(r => r.fields);
      const { error } = await supabase.from('questions').upsert(supabaseData, { onConflict: 'airtable_table_name,question_unique_id' });
      
      if (error) {
        console.error("Supabase sync error during save:", error);
      }

      res.json({ success: true });
    } catch (error: any) {
      console.error("Save error:", error);
      const isNotAuthorized = error.statusCode === 401 || error.statusCode === 403 || error.error === 'NOT_AUTHORIZED' || (error.message && error.message.includes('NOT_AUTHORIZED'));
      
      if (isNotAuthorized) {
        return res.status(400).json({ 
          error: "Airtable access denied (NOT_AUTHORIZED).",
          details: "Please check your AIRTABLE_API_KEY. Ensure it is a valid Personal Access Token (starts with 'pat.') and has the following scopes: 'data.records:read', 'data.records:write', 'schema.bases:read', 'schema.bases:write'. Also verify it has access to the specific base.",
          message: error.message
        });
      }
      res.status(500).json({ error: error.message || "Failed to save data" });
    }
  });

  app.post("/api/update-question", async (req, res) => {
    const { question } = req.body;
    
    if (!question || !question.id) {
      return res.status(400).json({ error: "Question ID is required" });
    }

    try {
      const updateData = {
        question_hin: question.question_hin || question.text || '',
        question_eng: question.question_eng || '',
        subject: question.subject || '',
        chapter: question.chapter || '',
        option1_hin: question.option1_hin || question.options?.[0] || '',
        option1_eng: question.option1_eng || '',
        option2_hin: question.option2_hin || question.options?.[1] || '',
        option2_eng: question.option2_eng || '',
        option3_hin: question.option3_hin || question.options?.[2] || '',
        option3_eng: question.option3_eng || '',
        option4_hin: question.option4_hin || question.options?.[3] || '',
        option4_eng: question.option4_eng || '',
        option5_hin: question.option5_hin || question.options?.[4] || '',
        option5_eng: question.option5_eng || '',
        answer: question.answer || question.correctOption || '',
        solution_hin: question.solution_hin || '',
        solution_eng: question.solution_eng || '',
        type: question.type || '',
        video: question.video || '',
        page_no: question.page_no || '',
        collection: question.collection || '',
        airtable_table_name: question.airtable_table_name || '',
        section: question.section || '',
        year: question.year || '',
        date: question.date || '',
        exam: question.exam || '',
        previous_of: question.previous_of || '',
        action: 'UPDATED',
        current_status: question.status || question.current_status || 'Draft',
        image: question.image || '',
        error_report: question.error_report || '',
        error_description: question.error_description || '',
        sync_code: question.sync_code || '',
        topic: question.topic || '',
        sub_topic: question.sub_topic || '',
        sub_subject: question.sub_subject || '',
        sub_chapter: question.sub_chapter || '',
        keywords: question.keywords || '',
        updated_at: new Date().toISOString()
      };

      const { error: error1, data: data1 } = await supabase
        .from('questions')
        .update(updateData)
        .eq('question_unique_id', question.id)
        .select();

      const { error: error2, data: data2 } = await supabase
        .from('questions')
        .update(updateData)
        .eq('id', question.id)
        .select();

      if (error1 && error2) throw error1;
      res.json({ success: true, updated: data1?.[0] || data2?.[0] });
    } catch (error: any) {
      console.error("Update error:", error);
      res.status(500).json({ error: error.message || "Failed to update question" });
    }
  });

  app.post("/api/bulk-update-questions", async (req, res) => {
    const { ids, data } = req.body;
    
    if (!ids || !Array.isArray(ids) || ids.length === 0) {
      return res.status(400).json({ error: "IDs are required" });
    }

    try {
      const updateData: any = {
        updated_at: new Date().toISOString(),
        action: 'BULK_UPDATED'
      };

      if (data.subject !== undefined) updateData.subject = data.subject;
      if (data.sub_subject !== undefined) updateData.sub_subject = data.sub_subject;
      if (data.difficulty !== undefined) updateData.difficulty = data.difficulty;
      if (data.status !== undefined) updateData.current_status = data.status;
      if (data.tags !== undefined) updateData.tags = data.tags;
      if (data.test_name !== undefined) updateData.test_name = data.test_name;
      if (data.chapter !== undefined) updateData.chapter = data.chapter;
      if (data.sub_chapter !== undefined) updateData.sub_chapter = data.sub_chapter;
      if (data.type !== undefined) updateData.type = data.type;
      if (data.exam !== undefined) updateData.exam = data.exam;
      if (data.year !== undefined) updateData.year = data.year;
      if (data.date !== undefined) updateData.date = data.date;
      if (data.shift !== undefined) updateData.shift = data.shift;
      if (data.topic !== undefined) updateData.topic = data.topic;
      if (data.sub_topic !== undefined) updateData.sub_topic = data.sub_topic;
      if (data.keywords !== undefined) updateData.keywords = data.keywords;
      if (data.error_report !== undefined) updateData.error_report = data.error_report;
      if (data.error_description !== undefined) updateData.error_description = data.error_description;
      if (data.sync_code !== undefined) updateData.sync_code = data.sync_code;

      const { error: error1, data: data1 } = await supabase
        .from('questions')
        .update(updateData)
        .in('question_unique_id', ids)
        .select();

      const { error: error2, data: data2 } = await supabase
        .from('questions')
        .update(updateData)
        .in('id', ids)
        .select();

      if (error1 && error2) throw error1;
      res.json({ success: true, updatedCount: (data1?.length || 0) + (data2?.length || 0) });
    } catch (error: any) {
      console.error("Bulk update error:", error);
      res.status(500).json({ error: error.message || "Failed to bulk update questions" });
    }
  });

  app.post("/api/bulk-update-questions-individual", async (req, res) => {
    const { questions } = req.body;
    
    if (!questions || !Array.isArray(questions)) {
      return res.status(400).json({ error: "Questions are required" });
    }

    try {
      const records = questions.map(q => ({
        ...mapQuestionToDb(q),
        question_unique_id: q.question_unique_id || q.id,
        airtable_table_name: q.airtable_table_name || q.collection,
        updated_at: new Date().toISOString()
      }));

      const { error } = await supabase
        .from('questions')
        .upsert(records, { onConflict: 'airtable_table_name,question_unique_id' });

      if (error) throw error;
      res.json({ success: true });
    } catch (error: any) {
      console.error("Bulk update individual error:", error);
      res.status(500).json({ error: error.message || "Failed to bulk update questions" });
    }
  });

  app.post("/api/rename-folder", async (req, res) => {
    const { oldName, newName } = req.body;
    
    if (!oldName || !newName) {
      return res.status(400).json({ error: "Old name and new name are required" });
    }

    try {
      const { error } = await supabase
        .from('questions')
        .update({ airtable_table_name: newName })
        .eq('airtable_table_name', oldName);

      if (error) throw error;

      // Also update sync status if needed (it's derived from the table, so it should be fine)
      res.json({ success: true });
    } catch (error: any) {
      handleSupabaseError(error, res, "rename folder");
    }
  });

  app.post("/api/save-documents", async (req, res) => {
    const { documents } = req.body;
    if (!documents || !Array.isArray(documents)) {
      return res.status(400).json({ error: "Documents array is required" });
    }

    try {
      const mappedDocuments = documents.map((doc: any) => ({
        id: doc.id,
        name: doc.name,
        status: doc.status,
        total_questions: doc.totalQuestions || doc.total_questions || 0,
        total_images: doc.totalImages || doc.total_images || 0,
        upload_date: doc.uploadDate || doc.upload_date || '',
        questions: doc.questions || []
      }));

      const { error } = await supabase
        .from('documents')
        .upsert(mappedDocuments, { onConflict: 'id' });

      if (error) throw error;
      res.json({ success: true });
    } catch (error: any) {
      console.error("Save documents error:", error);
      res.status(500).json({ error: error.message || "Failed to save documents" });
    }
  });

  app.get("/api/get-documents", async (req, res) => {
    try {
      const { data, error } = await supabase
        .from('documents')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;

      const mappedData = (data || []).map((doc: any) => ({
        id: doc.id,
        name: doc.name,
        status: doc.status,
        totalQuestions: doc.total_questions || 0,
        totalImages: doc.total_images || 0,
        uploadDate: doc.upload_date || '',
        questions: doc.questions || []
      }));

      res.json({ documents: mappedData });
    } catch (error: any) {
      console.error("Get documents error:", error);
      res.status(500).json({ error: error.message || "Failed to get documents" });
    }
  });

  app.post("/api/delete-question", async (req, res) => {
    const { id } = req.body;
    if (!id) return res.status(400).json({ error: "ID is required" });

    try {
      const { error: error1, data: data1 } = await supabase
        .from('questions')
        .delete()
        .eq('question_unique_id', id)
        .select();

      const { error: error2, data: data2 } = await supabase
        .from('questions')
        .delete()
        .eq('id', id)
        .select();

      if (error1 && error2) throw error1;
      res.json({ success: true, deletedCount: (data1?.length || 0) + (data2?.length || 0) });
    } catch (error: any) {
      console.error("Delete error:", error);
      res.status(500).json({ error: error.message || "Failed to delete question" });
    }
  });

  app.post("/api/bulk-delete-questions", async (req, res) => {
    const { ids } = req.body;
    if (!ids || !Array.isArray(ids) || ids.length === 0) {
      return res.status(400).json({ error: "IDs are required" });
    }

    try {
      const { error: error1, data: data1 } = await supabase
        .from('questions')
        .delete()
        .in('question_unique_id', ids)
        .select();

      const { error: error2, data: data2 } = await supabase
        .from('questions')
        .delete()
        .in('id', ids)
        .select();

      if (error1 && error2) throw error1;
      res.json({ success: true, deletedCount: (data1?.length || 0) + (data2?.length || 0) });
    } catch (error: any) {
      console.error("Bulk delete error:", error);
      res.status(500).json({ error: error.message || "Failed to bulk delete questions" });
    }
  });

  // Helper to escape regex characters
  const escapeRegExp = (string: string) => {
    return string.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'); // $& means the whole matched string
  };

  app.post("/api/move-folder", async (req, res) => {
    const { sourceFolder, targetFolder } = req.body;
    console.log(`[API] move-folder called. source: ${sourceFolder}, target: ${targetFolder}`);
    
    if (!sourceFolder || targetFolder === undefined) {
      return res.status(400).json({ error: "Source and target folders are required" });
    }

    try {
      // Safely escape quotes for PostgREST
      const safeSource = sourceFolder.replace(/"/g, '""');
      
      // Find all questions in the source folder
      const { data: questions, error: fetchError } = await supabase
        .from('questions')
        .select('*')
        .or(`collection.eq."${safeSource}",collection.like."${safeSource}/%",airtable_table_name.eq."${safeSource}"`);

      if (fetchError) throw fetchError;

      console.log(`[API] move-folder found ${questions?.length || 0} questions to move.`);

      if (!questions || questions.length === 0) {
        return res.json({ success: true, message: "Folder is empty" });
      }

      // Update their paths
      const updates = questions.map(q => {
        const oldCollection = q.collection || q.airtable_table_name || '';
        // If it's the exact folder, new path is targetFolder/sourceFolderName
        // If it's a subfolder, new path is targetFolder/sourceFolderName/subfolderName
        const sourceFolderName = sourceFolder.split('/').pop();
        
        let newCollection;
        const escapedSource = escapeRegExp(sourceFolder);
        
        if (targetFolder === '') {
          // Moving to root
          newCollection = oldCollection.replace(new RegExp(`^.*${escapedSource}`), sourceFolderName);
        } else {
          // Moving to another folder
          newCollection = oldCollection.replace(new RegExp(`^${escapedSource}`), `${targetFolder}/${sourceFolderName}`);
        }

        return {
          ...q,
          collection: newCollection,
          airtable_table_name: newCollection.split('/')[0],
          updated_at: new Date().toISOString()
        };
      });

      console.log(`[API] move-folder first update sample:`, updates[0]?.collection);

      // Use 'id' for conflict resolution since we are updating existing records by their primary key
      const { error: updateError } = await supabase
        .from('questions')
        .upsert(updates, { onConflict: 'id' });

      if (updateError) {
        console.error(`[API] move-folder upsert error:`, updateError);
        throw updateError;
      }

      console.log(`[API] move-folder successfully updated ${updates.length} questions.`);
      res.json({ success: true, updatedCount: updates.length });
    } catch (error: any) {
      console.error(`[API] move-folder caught error:`, error);
      handleSupabaseError(error, res, "move folder");
    }
  });

  app.post("/api/copy-folder", async (req, res) => {
    const { sourceFolder, targetFolder } = req.body;
    console.log(`[API] copy-folder called. source: ${sourceFolder}, target: ${targetFolder}`);
    
    if (!sourceFolder || targetFolder === undefined) {
      return res.status(400).json({ error: "Source and target folders are required" });
    }

    try {
      // Safely escape quotes for PostgREST
      const safeSource = sourceFolder.replace(/"/g, '""');

      // Find all questions in the source folder
      const { data: questions, error: fetchError } = await supabase
        .from('questions')
        .select('*')
        .or(`collection.eq."${safeSource}",collection.like."${safeSource}/%",airtable_table_name.eq."${safeSource}"`);

      if (fetchError) throw fetchError;

      console.log(`[API] copy-folder found ${questions?.length || 0} questions to copy.`);

      if (!questions || questions.length === 0) {
        return res.json({ success: true, message: "Folder is empty" });
      }

      // Create copies with new paths
      const copies = questions.map(q => {
        const { id, created_at, ...rest } = q;
        const oldCollection = q.collection || q.airtable_table_name || '';
        const sourceFolderName = sourceFolder.split('/').pop();
        
        let newCollection;
        const escapedSource = escapeRegExp(sourceFolder);
        
        if (targetFolder === '') {
          // Copying to root
          newCollection = oldCollection.replace(new RegExp(`^.*${escapedSource}`), `${sourceFolderName}_copy`);
        } else {
          // Copying to another folder
          newCollection = oldCollection.replace(new RegExp(`^${escapedSource}`), `${targetFolder}/${sourceFolderName}_copy`);
        }

        return {
          ...rest,
          collection: newCollection,
          airtable_table_name: newCollection.split('/')[0],
          question_unique_id: `${q.question_unique_id || q.id}_copy_${Math.random().toString(36).substring(7)}`,
          updated_at: new Date().toISOString(),
          action: 'COPIED'
        };
      });

      const { error: insertError } = await supabase
        .from('questions')
        .insert(copies);

      if (insertError) {
        console.error(`[API] copy-folder insert error:`, insertError);
        throw insertError;
      }

      console.log(`[API] copy-folder successfully copied ${copies.length} questions.`);
      res.json({ success: true, copiedCount: copies.length });
    } catch (error: any) {
      console.error(`[API] copy-folder caught error:`, error);
      handleSupabaseError(error, res, "copy folder");
    }
  });

  app.post("/api/delete-folder", async (req, res) => {
    const { folderName } = req.body;
    
    if (!folderName) {
      return res.status(400).json({ error: "Folder name is required" });
    }

    try {
      const safeFolder = folderName.replace(/"/g, '""');
      // 1. Delete from Supabase
      const { error } = await supabase
        .from('questions')
        .delete()
        .or(`collection.eq."${safeFolder}",collection.like."${safeFolder}/%",airtable_table_name.eq."${safeFolder}"`);

      if (error) throw error;

      // 2. Invalidate Airtable tables cache
      const cacheFile = path.join(CACHE_DIR, `tables.json`);
      if (existsSync(cacheFile)) {
        try {
          const cachedData = await fs.readFile(cacheFile, 'utf-8');
          let tables = JSON.parse(cachedData);
          if (Array.isArray(tables)) {
            tables = tables.filter((t: any) => t.name !== folderName);
            await fs.writeFile(cacheFile, JSON.stringify(tables));
          }
        } catch (e) {
          console.error("Failed to update cache during folder deletion:", e);
        }
      }

      res.json({ success: true });
    } catch (error: any) {
      handleSupabaseError(error, res, "delete folder");
    }
  });

  app.post("/api/update-folder-sync-location", async (req, res) => {
    const { folderName, airtableTableName } = req.body;
    
    if (!folderName) {
      return res.status(400).json({ error: "Folder name is required" });
    }

    try {
      // Update the folder's airtable_table_name in Supabase
      const { error } = await supabase
        .from('questions')
        .update({ airtable_table_name: airtableTableName || null })
        .eq('collection', folderName);

      if (error) throw error;
      res.json({ success: true });
    } catch (error: any) {
      console.error("Update folder sync location error:", error);
      res.status(500).json({ error: error.message || "Failed to update sync location" });
    }
  });

  // Vite middleware for development
  if (process.env.NODE_ENV !== "production") {
    import("vite").then(({ createServer: createViteServer }) => {
      createViteServer({
        server: { middlewareMode: true },
        appType: "spa",
      }).then((vite) => {
        app.use(vite.middlewares);
        app.listen(PORT, "0.0.0.0", () => {
          console.log(`Server running on http://localhost:${PORT}`);
        });
      });
    });
  } else {
    // In production (Vercel), we don't need to serve static files from Express
    // Vercel handles static routing via vercel.json
  }

export default app;
