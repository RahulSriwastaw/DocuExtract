import express from "express";
import { createServer as createViteServer } from "vite";
import path from "path";
import { fileURLToPath } from "url";
import dotenv from 'dotenv';
import Airtable from 'airtable';
import fs from 'fs/promises';
import { existsSync, mkdirSync } from 'fs';
import { createClient } from '@supabase/supabase-js';
import OpenAI from "openai";
import pkg from 'pg';
const { Client } = pkg;

dotenv.config();
const isServerless = process.env.VERCEL === "1" || process.env.VERCEL === "true";
let app: express.Express;

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const CACHE_DIR = path.join(__dirname, '.cache');

if (!existsSync(CACHE_DIR)) {
  mkdirSync(CACHE_DIR, { recursive: true });
}

// Supabase Configuration
const supabaseUrl = process.env.SUPABASE_URL || 'https://yxibppbfrugarjoeoijw.supabase.co';
const supabaseAnonKey = process.env.SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inl4aWJwcGJmcnVnYXJqb2VvaWp3Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzQ1MTgwNjUsImV4cCI6MjA5MDA5NDA2NX0.m7pkeKKDBW4bunM9V8iR1Wo6TzXdhLHAd9BfFagepO0';
const supabaseServiceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY || '';
const supabaseKey = supabaseServiceRoleKey || supabaseAnonKey;

if (!supabaseUrl || !supabaseKey) {
  console.warn('Supabase configuration is incomplete. Set SUPABASE_URL and SUPABASE_ANON_KEY or SUPABASE_SERVICE_ROLE_KEY.');
}

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

const pgClient = new Client({
  connectionString: process.env.DATABASE_URL || 'postgresql://postgres.yxibppbfrugarjoeoijw:iuTKL5bWoinAH6kr@aws-1-ap-south-1.pooler.supabase.com:6543/postgres',
  ssl: { rejectUnauthorized: false },
  connectionTimeoutMillis: 5000, // 5 second timeout
});

let isDbConnected = false;
let dbInitInProgress = false;

async function initDb(retries = 3) {
  if (dbInitInProgress) return;
  dbInitInProgress = true;
  
  for (let i = 0; i < retries; i++) {
    try {
      console.log(`Attempting to connect to Supabase DB (Attempt ${i + 1})...`);
      await pgClient.connect();
      isDbConnected = true;
      await pgClient.query(`
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
      `);
      await pgClient.query(`
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
        await pgClient.query(`NOTIFY pgrst, 'reload schema'`);
      } catch (e) {
        console.warn("Failed to reload schema cache:", e);
      }
      
      // Add unique constraint if it doesn't exist
      try {
        await pgClient.query(`
          ALTER TABLE questions ADD CONSTRAINT questions_airtable_table_name_question_unique_id_key UNIQUE (airtable_table_name, question_unique_id);
        `);
      } catch (e: any) {
        // Constraint might already exist, ignore error
      }
      
      // Reload PostgREST schema cache so Supabase API sees the new columns
      try {
        await pgClient.query(`NOTIFY pgrst, 'reload schema';`);
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
  
  // Question text
  if (q.question_hin !== undefined) mapped.question_hin = q.question_hin;
  else if (q.text !== undefined) mapped.question_hin = q.text;
  if (q.question_eng !== undefined) mapped.question_eng = q.question_eng;
  
  // Classification
  if (q.subject !== undefined) mapped.subject = q.subject;
  if (q.sub_subject !== undefined) mapped.sub_subject = q.sub_subject;
  if (q.chapter !== undefined) mapped.chapter = q.chapter;
  if (q.sub_chapter !== undefined) mapped.sub_chapter = q.sub_chapter;
  if (q.topic !== undefined) mapped.topic = q.topic;
  if (q.sub_topic !== undefined) mapped.sub_topic = q.sub_topic;
  if (q.keywords !== undefined) mapped.keywords = q.keywords;
  
  // Options
  if (q.option1_hin !== undefined) mapped.option1_hin = q.option1_hin;
  else if (q.options?.[0] !== undefined) mapped.option1_hin = q.options[0];
  
  if (q.option2_hin !== undefined) mapped.option2_hin = q.option2_hin;
  else if (q.options?.[1] !== undefined) mapped.option2_hin = q.options[1];
  
  if (q.option3_hin !== undefined) mapped.option3_hin = q.option3_hin;
  else if (q.options?.[2] !== undefined) mapped.option3_hin = q.options[2];
  
  if (q.option4_hin !== undefined) mapped.option4_hin = q.option4_hin;
  else if (q.options?.[3] !== undefined) mapped.option4_hin = q.options[3];
  
  if (q.option5_hin !== undefined) mapped.option5_hin = q.option5_hin;
  else if (q.options?.[4] !== undefined) mapped.option5_hin = q.options[4];
  
  if (q.option1_eng !== undefined) mapped.option1_eng = q.option1_eng;
  if (q.option2_eng !== undefined) mapped.option2_eng = q.option2_eng;
  if (q.option3_eng !== undefined) mapped.option3_eng = q.option3_eng;
  if (q.option4_eng !== undefined) mapped.option4_eng = q.option4_eng;
  if (q.option5_eng !== undefined) mapped.option5_eng = q.option5_eng;
  
  // Answer & Solution
  if (q.answer !== undefined) mapped.answer = q.answer;
  else if (q.correctOption !== undefined) mapped.answer = q.correctOption;
  
  if (q.solution_hin !== undefined) mapped.solution_hin = q.solution_hin;
  if (q.solution_eng !== undefined) mapped.solution_eng = q.solution_eng;
  
  // Metadata
  if (q.type !== undefined) mapped.type = q.type;
  if (q.difficulty !== undefined) mapped.difficulty = q.difficulty;
  if (q.video !== undefined) mapped.video = q.video;
  if (q.page_no !== undefined) mapped.page_no = q.page_no;
  if (q.collection !== undefined) mapped.collection = q.collection;
  if (q.airtable_table_name !== undefined) mapped.airtable_table_name = q.airtable_table_name;
  if (q.section !== undefined) mapped.section = q.section;
  if (q.year !== undefined) mapped.year = q.year;
  if (q.date !== undefined) mapped.date = q.date;
  if (q.exam !== undefined) mapped.exam = q.exam;
  if (q.previous_of !== undefined) mapped.previous_of = q.previous_of;
  if (q.action !== undefined) mapped.action = q.action;
  
  if (q.current_status !== undefined) mapped.current_status = q.current_status;
  else if (q.status !== undefined) mapped.current_status = q.status;
  
  if (q.sync_code !== undefined) mapped.sync_code = q.sync_code;
  if (q.error_report !== undefined) mapped.error_report = q.error_report;
  if (q.error_description !== undefined) mapped.error_description = q.error_description;
  if (q.image !== undefined) mapped.image = q.image;
  
  if (q.tags !== undefined) {
    mapped.tags = Array.isArray(q.tags) ? q.tags : (typeof q.tags === 'string' ? JSON.parse(q.tags) : []);
  }

  return mapped;
};

async function startServer() {
  app = express();
  const PORT = 3000;

  app.use(express.json({ limit: '50mb' }));

  // API routes FIRST
  app.get("/health", (req, res) => {
    res.json({ status: "ok" });
  });

  app.post("/ai/generate", async (req, res) => {
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

  app.get("/get-airtable-tables", async (req, res) => {
    const { forceSync } = req.query;
    const apiKey = process.env.AIRTABLE_API_KEY;
    const baseId = process.env.AIRTABLE_BASE_ID;

    if (!apiKey || !baseId) {
      return res.status(500).json({ error: "Airtable credentials not configured" });
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
        throw new Error(errorData.error?.message || "Failed to fetch tables");
      }

      const data = await response.json();
      console.log('Airtable API response tables:', JSON.stringify(data.tables, null, 2));
      await fs.writeFile(cacheFile, JSON.stringify(data.tables));
      res.json({ tables: data.tables, source: 'airtable' });
    } catch (error: any) {
      console.error("Airtable error:", error);
      res.status(500).json({ error: error.message || "Failed to fetch tables" });
    }
  });

  app.post("/get-table-stats", async (req, res) => {
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
      const apiKey = process.env.AIRTABLE_API_KEY;
      const baseId = process.env.AIRTABLE_BASE_ID;

      if (!apiKey || !baseId) {
        return res.status(500).json({ error: "Airtable credentials not configured" });
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
      res.status(500).json({ error: error.message || "Failed to fetch table stats" });
    }
  });

  app.post("/sync-all-airtable", async (req, res) => {
    const apiKey = process.env.AIRTABLE_API_KEY;
    const baseId = process.env.AIRTABLE_BASE_ID;

    if (!apiKey || !baseId) {
      return res.status(500).json({ error: "Airtable credentials not configured" });
    }

    try {
      // 1. Get all tables
      const listRes = await fetch(`https://api.airtable.com/v0/meta/bases/${baseId}/tables`, {
        headers: {
          Authorization: `Bearer ${apiKey}`,
        },
      });

      if (!listRes.ok) {
        throw new Error("Failed to fetch tables from Airtable");
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
            const supabaseData = formatted.map(q => ({
              record_id: q.record_id || q.id || '',
              question_unique_id: q.question_unique_id || q.id || Math.random().toString(36).substring(7),
              question_hin: q.question_hin || q.text || '',
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
              airtable_table_name: table.name,
              section: q.section || '',
              year: q.year || '',
              date: q.date || '',
              exam: q.exam || '',
              previous_of: q.previous_of || '',
              action: q.action || 'UPDATED',
              current_status: q.status || q.current_status || 'Draft',
              sync_code: q.sync_code || '',
              error_report: q.error_report || '',
              error_description: q.error_description || '',
              updated_at: new Date().toISOString()
            }));

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

  app.post("/sync-all-to-airtable", async (req, res) => {
    const apiKey = process.env.AIRTABLE_API_KEY;
    const baseId = process.env.AIRTABLE_BASE_ID;

    if (!apiKey || !baseId) {
      return res.status(500).json({ error: "Airtable credentials not configured" });
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
                exam: q.exam || '',
                previous_of: q.previous_of || '',
                action: q.action || 'UPDATED',
                current_status: q.current_status || 'Draft',
                sync_code: q.sync_code || '',
                error_report: q.error_report || '',
                error_description: q.error_description || '',
                updated_at: new Date().toISOString()
              };

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
              await base(tableName).update(chunk);
            }

            // Handle Creates
            for (let i = 0; i < toCreate.length; i += batchSize) {
              const chunk = toCreate.slice(i, i + batchSize);
              const createdRecords = await base(tableName).create(chunk);
              
              // Update Supabase with new record IDs
              const updates = createdRecords.map((r, idx) => ({
                id: questions.find(q => !q.record_id && q.question_unique_id === chunk[idx].fields.question_unique_id)?.id,
                record_id: r.id
              })).filter(u => u.id);

              for (const update of updates) {
                await supabase.from('questions').update({ record_id: update.record_id }).eq('id', update.id);
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
      res.status(500).json({ error: error.message || "Failed to sync to Airtable" });
    }
  });

  app.post("/get-airtable-records", async (req, res) => {
    const { tableName, forceSync, collectionPath } = req.body;
    const apiKey = process.env.AIRTABLE_API_KEY;
    const baseId = process.env.AIRTABLE_BASE_ID;

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
        return res.status(500).json({ error: "Airtable credentials not configured" });
      }

      const base = new Airtable({ apiKey }).base(baseId);
      const records = await base(tableName).select().all();
      console.log(`Fetched ${records.length} records from Airtable for table ${tableName}`);
      const formatted = records.map(r => ({ id: r.id, ...(r as any).fields }));
      
      // 3. Sync to Supabase in background
      if (formatted.length > 0) {
        const supabaseData = formatted.map(q => ({
          record_id: q.record_id || q.id || '',
          question_unique_id: q.question_unique_id || q.id || Math.random().toString(36).substring(7),
          question_hin: q.question_hin || q.text || '',
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
          exam: q.exam || '',
          previous_of: q.previous_of || '',
          action: q.action || 'UPDATED',
          current_status: q.status || q.current_status || 'Draft',
          sync_code: q.sync_code || '',
          error_report: q.error_report || '',
          error_description: q.error_description || '',
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
      if (error.statusCode === 401 || error.statusCode === 403) {
        return res.status(400).json({ 
          error: "Airtable access denied (NOT_AUTHORIZED). Please check your AIRTABLE_API_KEY and ensure it has 'data.records:read' scope and access to the base.",
          details: error.message
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

  app.get("/get-sync-status", async (req, res) => {
    try {
      const result = await pgClient.query('SELECT airtable_table_name, MAX(updated_at) as last_sync, COUNT(*) as total_questions FROM questions GROUP BY airtable_table_name');
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

  app.post("/create-airtable-table", async (req, res) => {
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
            { name: 'error_report', type: 'singleLineText' },
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

  app.get("/get-server-folders", async (req, res) => {
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

  app.post("/move-questions", async (req, res) => {
    const { ids, targetFolder, targetTable } = req.body;
    if (!ids || !Array.isArray(ids) || targetFolder === undefined) {
      return res.status(400).json({ error: "IDs and target folder are required" });
    }

    try {
      const { error } = await supabase
        .from('questions')
        .update({ 
          collection: targetFolder,
          airtable_table_name: targetTable || (targetFolder ? targetFolder.split('/')[0] : null),
          updated_at: new Date().toISOString(),
          action: 'MOVED'
        })
        .in('id', ids);

      if (error) throw error;
      res.json({ success: true });
    } catch (error: any) {
      handleSupabaseError(error, res, "move questions");
    }
  });

  app.post("/copy-questions", async (req, res) => {
    const { ids, targetFolder, targetTable } = req.body;
    if (!ids || !Array.isArray(ids) || targetFolder === undefined) {
      return res.status(400).json({ error: "IDs and target folder are required" });
    }

    try {
      // 1. Fetch original questions
      const { data: originals, error: fetchError } = await supabase
        .from('questions')
        .select('*')
        .in('id', ids);

      if (fetchError) throw fetchError;

      // 2. Create copies
      const copies = originals.map(q => {
        const { id, created_at, ...rest } = q;
        return {
          ...rest,
          collection: targetFolder,
          airtable_table_name: targetTable || (targetFolder ? targetFolder.split('/')[0] : null),
          question_unique_id: `${q.question_unique_id}_copy_${Math.random().toString(36).substring(7)}`,
          updated_at: new Date().toISOString(),
          action: 'COPIED'
        };
      });

      const { error: insertError } = await supabase
        .from('questions')
        .insert(copies);

      if (insertError) throw insertError;
      res.json({ success: true });
    } catch (error: any) {
      handleSupabaseError(error, res, "copy questions");
    }
  });

  app.post("/create-folder", async (req, res) => {
    const { name, parentPath } = req.body;
    if (!name) return res.status(400).json({ error: "Folder name is required" });

    const fullPath = parentPath ? `${parentPath}/${name}` : name;
    
    try {
      // We don't actually "create" a folder in the DB, we just return the path
      // The UI will use this path to tag new questions
      res.json({ success: true, path: fullPath });
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  app.post("/save-questions", async (req, res) => {
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

      // 1. Save to Airtable if selected
      if (destinations.includes('airtable')) {
        if (!apiKey || !baseId) {
          throw new Error("Airtable credentials not configured");
        }
        if (!airtableTable) {
          throw new Error("Airtable table name is required");
        }
        const base = new Airtable({ apiKey }).base(baseId);
        const airtableRecords = records.map((r: any) => ({ fields: r }));
        const batchSize = 10;
        for (let i = 0; i < airtableRecords.length; i += batchSize) {
          const chunk = airtableRecords.slice(i, i + batchSize);
          await base(airtableTable).create(chunk);
        }
      }

      // 2. Save to Supabase (Server) if selected
      if (destinations.includes('server')) {
        if (!serverFolder && !airtableTable) {
          throw new Error("Folder name is required for server save");
        }
        const { error } = await supabase.from('questions').upsert(records, { onConflict: 'airtable_table_name,question_unique_id' });
        if (error) {
          console.error("Supabase sync error during save:", error);
          throw new Error("Failed to save to Server DB: " + error.message);
        }
      }

      res.json({ success: true });
    } catch (error: any) {
      console.error("Save error:", error);
      res.status(500).json({ error: error.message || "Failed to save data" });
    }
  });

  app.post("/save-to-airtable", async (req, res) => {
    const { tableName, questions } = req.body;
    const apiKey = process.env.AIRTABLE_API_KEY;
    const baseId = process.env.AIRTABLE_BASE_ID;

    if (!apiKey || !baseId) {
      return res.status(500).json({ error: "Airtable credentials not configured" });
    }

    try {
      const base = new Airtable({ apiKey }).base(baseId);
      
      const records = questions.map((q: any) => ({
        fields: {
          record_id: q.record_id || '',
          question_unique_id: q.id || q.question_unique_id || '',
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
          exam: q.exam || '',
          previous_of: q.previous_of || '',
          action: q.action || 'UPDATED',
          current_status: q.status || q.current_status || 'Draft',
          sync_code: q.sync_code || '',
          error_report: q.error_report || '',
          error_description: q.error_description || '',
          updated_at: new Date().toISOString()
        }
      }));

      // 1. Save to Airtable
      const batchSize = 10;
      for (let i = 0; i < records.length; i += batchSize) {
        const chunk = records.slice(i, i + batchSize);
        await base(tableName).create(chunk);
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
      res.status(500).json({ error: error.message || "Failed to save data" });
    }
  });

  app.post("/update-question", async (req, res) => {
    const { question } = req.body;
    
    if (!question || !question.id) {
      return res.status(400).json({ error: "Question ID is required" });
    }

    try {
      const { error } = await supabase
        .from('questions')
        .update({
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
          updated_at: new Date().toISOString()
        })
        .eq('id', question.id);

      if (error) throw error;
      res.json({ success: true });
    } catch (error: any) {
      console.error("Update error:", error);
      res.status(500).json({ error: error.message || "Failed to update question" });
    }
  });

  app.post("/bulk-update-questions", async (req, res) => {
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
      if (data.topic !== undefined) updateData.topic = data.topic;
      if (data.sub_topic !== undefined) updateData.sub_topic = data.sub_topic;
      if (data.keywords !== undefined) updateData.keywords = data.keywords;

      const { error } = await supabase
        .from('questions')
        .update(updateData)
        .in('id', ids);

      if (error) throw error;
      res.json({ success: true });
    } catch (error: any) {
      console.error("Bulk update error:", error);
      res.status(500).json({ error: error.message || "Failed to bulk update questions" });
    }
  });

  app.post("/bulk-update-questions-individual", async (req, res) => {
    const { questions } = req.body;
    
    if (!questions || !Array.isArray(questions)) {
      return res.status(400).json({ error: "Questions are required" });
    }

    try {
      const records = questions.map(q => ({
        ...mapQuestionToDb(q),
        id: q.id,
        updated_at: new Date().toISOString()
      }));

      const { error } = await supabase
        .from('questions')
        .upsert(records);

      if (error) throw error;
      res.json({ success: true });
    } catch (error: any) {
      console.error("Bulk update individual error:", error);
      res.status(500).json({ error: error.message || "Failed to bulk update questions" });
    }
  });

  app.post("/rename-folder", async (req, res) => {
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

  app.post("/delete-question", async (req, res) => {
    const { id } = req.body;
    if (!id) return res.status(400).json({ error: "ID is required" });

    try {
      const { error } = await supabase
        .from('questions')
        .delete()
        .eq('id', id);

      if (error) throw error;
      res.json({ success: true });
    } catch (error: any) {
      console.error("Delete error:", error);
      res.status(500).json({ error: error.message || "Failed to delete question" });
    }
  });

  app.post("/bulk-delete-questions", async (req, res) => {
    const { ids } = req.body;
    if (!ids || !Array.isArray(ids) || ids.length === 0) {
      return res.status(400).json({ error: "IDs are required" });
    }

    try {
      const { error } = await supabase
        .from('questions')
        .delete()
        .in('id', ids);

      if (error) throw error;
      res.json({ success: true });
    } catch (error: any) {
      console.error("Bulk delete error:", error);
      res.status(500).json({ error: error.message || "Failed to bulk delete questions" });
    }
  });

  app.post("/delete-folder", async (req, res) => {
    const { folderName } = req.body;
    
    if (!folderName) {
      return res.status(400).json({ error: "Folder name is required" });
    }

    try {
      // 1. Delete from Supabase
      const { error } = await supabase
        .from('questions')
        .delete()
        .eq('airtable_table_name', folderName);

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

      // 3. Try to delete from Airtable if it's an Airtable table
      const apiKey = process.env.AIRTABLE_API_KEY;
      const baseId = process.env.AIRTABLE_BASE_ID;
      
      if (apiKey && baseId) {
        try {
          // 3a. List tables to find the ID for the folderName (Metadata API)
          // Note: This requires 'schema.bases:read' scope
          const listRes = await fetch(`https://api.airtable.com/v0/meta/bases/${baseId}/tables`, {
            headers: {
              Authorization: `Bearer ${apiKey}`,
            },
          });
          
          if (listRes.ok) {
            const { tables } = await listRes.json();
            const table = tables.find((t: any) => t.name === folderName || t.id === folderName);
            
            if (table) {
              // 3b. Delete via Airtable Meta API using Table ID
              // Note: This requires 'schema.bases:write' scope
              const deleteRes = await fetch(`https://api.airtable.com/v0/meta/bases/${baseId}/tables/${table.id}`, {
                method: 'DELETE',
                headers: {
                  Authorization: `Bearer ${apiKey}`,
                },
              });
              
              if (!deleteRes.ok) {
                const errData = await deleteRes.json();
                // If it's already deleted (NOT_FOUND), we can ignore it
                if (errData.error === 'NOT_FOUND') {
                  console.log(`Airtable table ${folderName} (${table.id}) was already deleted.`);
                } else {
                  console.warn(`Airtable table deletion failed for ${folderName} (${table.id}):`, errData);
                }
              } else {
                console.log(`Successfully deleted Airtable table ${folderName} (${table.id})`);
              }
            } else {
              console.warn(`Airtable table not found for name "${folderName}" during deletion attempt.`);
            }
          } else if (listRes.status === 401 || listRes.status === 403) {
            console.warn(`Airtable Metadata API access denied (NOT_AUTHORIZED). Ensure your token has 'schema.bases:read' and 'schema.bases:write' scopes.`);
          } else {
            const errData = await listRes.json();
            console.warn(`Failed to list Airtable tables for deletion:`, errData);
          }
        } catch (atErr) {
          console.warn(`Airtable delete error for ${folderName}:`, atErr);
        }
      }

      res.json({ success: true });
    } catch (error: any) {
      handleSupabaseError(error, res, "delete folder");
    }
  });

  // Vite middleware for development
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(__dirname, "dist");
    app.use(express.static(distPath));
    app.get("*", (req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  if (!isServerless) {
    app.listen(PORT, "0.0.0.0", () => {
      console.log(`Server running on http://localhost:${PORT}`);
    });
  } else {
    console.log("Server initialized for Vercel serverless function.");
  }
}

const appStartup = startServer().catch(err => console.error("Server startup error:", err));

export default async function handler(req: express.Request, res: express.Response) {
  console.log("Vercel function request:", req.method, req.url);
  await appStartup;
  return app(req, res);
}
