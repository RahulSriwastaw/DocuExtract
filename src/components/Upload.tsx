import { useState, ChangeEvent, forwardRef } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Progress } from '@/components/ui/progress';
import { Question } from '@/src/types';
import mammoth from 'mammoth';

interface UploadProps {
  onExtractionComplete: (questions: Question[], fileName: string) => void;
}

const STAGES = [
  "Initializing...",
  "Reading file...",
  "Sending to AI for full analysis...",
  "AI is extracting ALL questions (this may take a moment)...",
  "Finalizing results..."
];

const safeJsonParse = (text: string) => {
  let cleaned = text.replace(/```json\n?|\n?```/g, '').trim();
  try {
    return JSON.parse(cleaned);
  } catch (e) {
    console.warn("JSON parse failed, attempting to salvage truncated JSON...");
    try {
      // Find the last complete object
      const lastBrace = cleaned.lastIndexOf('}');
      if (lastBrace !== -1) {
        let salvaged = cleaned.substring(0, lastBrace + 1);
        // If it started as an array, close the array
        if (cleaned.startsWith('[')) {
            salvaged += ']';
        }
        return JSON.parse(salvaged);
      }
    } catch (e2) {
      console.error("Could not salvage JSON:", e2);
    }
    throw e; // Throw original error if salvage fails
  }
};

const Upload = forwardRef<HTMLInputElement, UploadProps>(({ onExtractionComplete }, ref) => {
  const [uploadMode, setUploadMode] = useState<'file' | 'text'>('file');
  const [inputText, setInputText] = useState('');
  const [file, setFile] = useState<File | null>(null);
  const [loading, setLoading] = useState(false);
  const [status, setStatus] = useState<string | null>(null);
  const [progress, setProgress] = useState(0);
  const [stage, setStage] = useState(STAGES[0]);
  const [timeLeft, setTimeLeft] = useState<number | null>(null);
  const [totalPages, setTotalPages] = useState<number | null>(null);
  const [currentPage, setCurrentPage] = useState(0);

  const handleFileChange = (e: ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      setFile(e.target.files[0]);
      setStatus(null);
      setProgress(0);
      setTotalPages(null);
      setCurrentPage(0);
      setTimeLeft(null);
    }
  };

  const handleExtraction = async () => {
    if (uploadMode === 'file' && !file) return;
    if (uploadMode === 'text' && !inputText.trim()) return;
    
    setLoading(true);
    setStatus(null);
    setProgress(0);
    setStage(STAGES[0]);
    setTimeLeft(null);
    setCurrentPage(0);

    let allExtractedQuestions: Question[] = [];
    try {
      const { GoogleGenAI, Type } = await import('@google/genai');
      const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY! });

      if (uploadMode === 'text' || (file && file.type !== 'application/pdf')) {
        // TXT/DOCX or Direct Text logic
        setStage("Reading content...");
        setProgress(20);
        
        let text = '';
        if (uploadMode === 'text') {
          text = inputText;
        } else if (file && file.type === 'text/plain') {
          text = await file.text();
        } else if (file && file.type === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document') {
          const arrayBuffer = await file.arrayBuffer();
          const result = await mammoth.extractRawText({ arrayBuffer });
          text = result.value;
        } else {
          throw new Error("Unsupported file type.");
        }

        setStage("Sending to AI for analysis...");
        setProgress(50);
        
        const prompt = `CRITICAL INSTRUCTION: You MUST extract EVERY SINGLE QUESTION from the following text. Do not skip, summarize, or omit any questions. 

For each question, extract:
- id: The question number (e.g., "Q.1", "Q.2").
- question_text: The full question text.
- options: An array of strings containing the options.
- answer: The correct option (A/B/C/D/E).

Return a JSON array of objects. Be extremely concise. Use null for empty fields. Make sure to escape all quotes inside strings properly. DO NOT use literal newlines inside strings, use \\n instead.

Text:
${text}`;

        let retries = 3;
        let responseText = '[]';
        while (retries > 0) {
          try {
            const response = await ai.models.generateContent({
              model: "gemini-3-flash-preview",
              contents: prompt,
              config: { responseMimeType: "application/json" }
            });
            responseText = response.text || '[]';
            break;
          } catch (err: any) {
            const isHardQuota = err?.message?.includes('billing details') || err?.message?.includes('current quota');
            const isRateLimit = !isHardQuota && (err?.status === 429 || err?.message?.includes('429') || err?.message?.includes('quota') || err?.error?.code === 429 || err?.status === 'RESOURCE_EXHAUSTED');
            if (isRateLimit && retries > 1) {
              const waitTime = (4 - retries) * 15000;
              console.warn(`Rate limit hit. Waiting ${waitTime/1000}s...`);
              await new Promise(resolve => setTimeout(resolve, waitTime));
              retries--;
            } else {
              if (isHardQuota) {
                throw new Error("Gemini API quota exhausted. Please check your billing details or wait for the daily reset.");
              }
              throw err;
            }
          }
        }

        const extracted: any[] = safeJsonParse(responseText);
        allExtractedQuestions = extracted.map((q: any) => {
          const baseId = q.id || Math.random().toString(36).substr(2, 9);
          return {
            id: baseId,
            question_unique_id: `${baseId}-${Date.now()}-${Math.random().toString(36).substr(2, 5)}`,
            text: q.question_text,
            options: q.options,
            correctOption: q.answer,
            answer: q.answer,
            status: 'Draft',
            difficulty: 'Medium',
            question_hin: '',
            question_eng: '',
            subject: '',
            chapter: '',
            type: 'MCQ',
            page_no: '1',
          collection: '',
          section: '',
          year: '',
          date: '',
          exam: '',
          previous_of: '',
          solution_hin: '',
          solution_eng: ''
          };
        });
      } else if (file && file.type === 'application/pdf') {
        setStage("Analyzing PDF structure...");
        setProgress(5);
        
        const base64Data = await new Promise<string>((resolve) => {
          const reader = new FileReader();
          reader.onloadend = () => resolve((reader.result as string).split(',')[1]);
          reader.readAsDataURL(file);
        });

        const pdfjs = await import('pdfjs-dist');
        pdfjs.GlobalWorkerOptions.workerSrc = `https://unpkg.com/pdfjs-dist@${pdfjs.version}/build/pdf.worker.min.mjs`;
        
        const loadingTask = pdfjs.getDocument({ data: Uint8Array.from(atob(base64Data), c => c.charCodeAt(0)) });
        const pdf = await loadingTask.promise;
        const total = pdf.numPages;
        setTotalPages(total);
        
        let pagesProcessed = 0;
        const startTime = Date.now();

        const processPage = async (pageNum: number): Promise<Question[]> => {
          const page = await pdf.getPage(pageNum);
          const viewport = page.getViewport({ scale: 2.0 });
          const canvas = document.createElement('canvas');
          const context = canvas.getContext('2d');
          if (!context) return [];
          canvas.height = viewport.height;
          canvas.width = viewport.width;
          
          await page.render({ canvasContext: context, viewport: viewport, canvas: canvas }).promise;
          
          const pageBase64 = canvas.toDataURL('image/jpeg', 0.8).split(',')[1];

          const prompt = `CRITICAL INSTRUCTION: You MUST extract EVERY SINGLE QUESTION from this page. Do not skip, summarize, or omit any questions. There are typically around 20-25 questions per page. 

The page has a two-column layout. Scan the left column completely from top to bottom, then scan the right column completely from top to bottom.

For each question, extract:
- id: The question number (e.g., "Q.1", "Q.2").
- question_text: The full question text.
- options: An array of strings containing the options.
- answer: The correct option (A/B/C/D/E), which is usually marked with a green tick or similar indicator.

Return a JSON array of objects. Be extremely concise. Use null for empty fields. If there are no questions on this page, return an empty array []. Make sure to escape all quotes inside strings properly. DO NOT use literal newlines inside strings, use \\n instead.`;

          let retries = 3;
          while (retries > 0) {
            try {
              const response = await ai.models.generateContent({
                model: "gemini-3-flash-preview",
                contents: {
                  parts: [
                    { inlineData: { mimeType: "image/jpeg", data: pageBase64 } },
                    { text: prompt }
                  ]
                },
                config: {
                  responseMimeType: "application/json",
                  maxOutputTokens: 8192,
                  responseSchema: {
                    type: Type.ARRAY,
                    items: {
                      type: Type.OBJECT,
                      properties: {
                        id: { type: Type.STRING },
                        question_text: { type: Type.STRING },
                        options: { type: Type.ARRAY, items: { type: Type.STRING } },
                        answer: { type: Type.STRING }
                      },
                      required: ["id", "question_text", "options", "answer"]
                    }
                  }
                }
              });

              const batchData: any[] = safeJsonParse(response.text || '[]');
              return batchData.map((q: any) => {
                const baseId = q.id || Math.random().toString(36).substr(2, 9);
                return {
                  id: baseId,
                  question_unique_id: `${baseId}-${Date.now()}-${Math.random().toString(36).substr(2, 5)}`,
                  text: q.question_text,
                  options: q.options,
                  correctOption: q.answer,
                  answer: q.answer,
                  status: 'Draft',
                  difficulty: 'Medium',
                  question_hin: '',
                  question_eng: '',
                  subject: '',
                chapter: '',
                type: 'MCQ',
                page_no: pageNum.toString(),
                collection: '',
                section: '',
                year: '',
                date: '',
                exam: '',
                previous_of: '',
                solution_hin: '',
                solution_eng: ''
                };
              });
            } catch (err: any) {
              const isHardQuota = err?.message?.includes('billing details') || err?.message?.includes('current quota');
              const isRateLimit = !isHardQuota && (err?.status === 429 || err?.message?.includes('429') || err?.message?.includes('quota') || err?.error?.code === 429 || err?.status === 'RESOURCE_EXHAUSTED');
              if (isRateLimit && retries > 1) {
                const waitTime = (4 - retries) * 15000;
                console.warn(`Rate limit hit on page ${pageNum}. Waiting ${waitTime/1000}s...`);
                await new Promise(resolve => setTimeout(resolve, waitTime));
                retries--;
              } else {
                console.error(`Failed to process page ${pageNum}:`, err);
                if (isHardQuota) {
                  throw new Error("Gemini API quota exhausted. Please check your billing details or wait for the daily reset.");
                }
                return []; // Return empty array instead of failing the whole batch
              }
            }
          }
          return [];
        };

        const CONCURRENCY_LIMIT = 3;
        for (let i = 1; i <= total; i += CONCURRENCY_LIMIT) {
          const batchPromises: Promise<Question[]>[] = [];
          for (let j = 0; j < CONCURRENCY_LIMIT && i + j <= total; j++) {
            const pageNum = i + j;
            batchPromises.push(
              processPage(pageNum).then(results => {
                pagesProcessed++;
                setCurrentPage(pagesProcessed);
                setStage(`Extracting questions (Processed ${pagesProcessed} of ${total})...`);
                setProgress(Math.min(10 + (pagesProcessed / total * 85), 95));
                const elapsed = (Date.now() - startTime) / 1000;
                const pagesPerSec = pagesProcessed > 0 ? pagesProcessed / elapsed : 0;
                if (pagesPerSec > 0 && total > pagesProcessed) {
                  setTimeLeft(Math.round((total - pagesProcessed) / pagesPerSec));
                }
                return results;
              })
            );
          }
          const batchResults = await Promise.all(batchPromises);
          for (const results of batchResults) {
            allExtractedQuestions = [...allExtractedQuestions, ...results];
          }
          await new Promise(resolve => setTimeout(resolve, 500));
        }
      }

      onExtractionComplete(allExtractedQuestions, uploadMode === 'file' && file ? file.name : 'Pasted Text');
      setStage(STAGES[4]);
      setProgress(100);
    } catch (error: any) {
      console.error('Extraction failed:', error);
      setStatus(`Extraction failed: ${error.message || 'Please try again.'}`);
    } finally {
      setLoading(false);
    }
  };


  return (
    <div className="w-full max-w-2xl mx-auto space-y-4 sm:space-y-6">
      <div className="flex bg-bg-page p-1 rounded-xl w-full sm:w-fit sm:mx-auto">
        <button 
          className={`flex-1 sm:flex-none px-4 py-2 rounded-lg text-xs sm:text-sm font-bold transition-all ${uploadMode === 'file' ? 'bg-bg-card text-primary shadow-sm' : 'text-text-muted hover:text-text-heading'}`}
          onClick={() => setUploadMode('file')}
        >
          Upload File
        </button>
        <button 
          className={`flex-1 sm:flex-none px-4 py-2 rounded-lg text-xs sm:text-sm font-bold transition-all ${uploadMode === 'text' ? 'bg-bg-card text-primary shadow-sm' : 'text-text-muted hover:text-text-heading'}`}
          onClick={() => setUploadMode('text')}
        >
          Direct Text
        </button>
      </div>

      {uploadMode === 'file' ? (
        <div 
          className={`relative border-2 border-dashed rounded-xl p-6 sm:p-10 text-center transition-all duration-200 ${
            file ? 'border-primary bg-primary-light/50' : 'border-border hover:border-primary hover:bg-bg-page'
          }`}
        >
          <Input 
            id="pdf" 
            type="file" 
            accept=".pdf,.txt,.docx" 
            onChange={handleFileChange} 
            ref={ref} 
            className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-10"
          />
          
          {!file ? (
            <div className="space-y-3 sm:space-y-4 pointer-events-none">
              <div className="w-12 h-12 sm:w-16 sm:h-16 bg-primary-light text-primary rounded-full flex items-center justify-center mx-auto">
                <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" className="sm:w-8 sm:h-8" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="17 8 12 3 7 8"/><line x1="12" x2="12" y1="3" y2="15"/></svg>
              </div>
              <div>
                <p className="text-base sm:text-lg font-medium text-text-heading">Click to upload or drag and drop</p>
                <p className="text-xs sm:text-sm text-text-muted mt-1">PDF, TXT, or DOCX files (max 10MB)</p>
              </div>
            </div>
          ) : (
            <div className="space-y-3 sm:space-y-4 pointer-events-none">
              <div className="w-12 h-12 sm:w-16 sm:h-16 bg-success/10 text-success rounded-full flex items-center justify-center mx-auto">
                <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" className="sm:w-8 sm:h-8" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M14.5 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7.5L14.5 2z"/><polyline points="14 2 14 8 20 8"/><path d="m9 15 2 2 4-4"/></svg>
              </div>
              <div>
                <p className="text-base sm:text-lg font-medium text-text-heading truncate max-w-xs mx-auto">{file.name}</p>
                <p className="text-xs sm:text-sm text-text-muted mt-1">{(file.size / 1024 / 1024).toFixed(2)} MB</p>
              </div>
            </div>
          )}
        </div>
      ) : (
        <div className="w-full">
          <textarea
            className="w-full h-48 sm:h-64 p-3 sm:p-4 border border-border rounded-xl focus:ring-2 focus:ring-primary focus:border-primary outline-none resize-y text-sm"
            placeholder="Paste your questions text here...&#10;&#10;Example:&#10;Q1. What is the capital of France?&#10;A) London&#10;B) Paris&#10;C) Berlin&#10;D) Madrid&#10;Answer: B"
            value={inputText}
            onChange={(e) => setInputText(e.target.value)}
          />
        </div>
      )}

      {loading && (
        <div className="mt-4 sm:mt-6 space-y-3 sm:space-y-4 bg-bg-card p-4 sm:p-6 rounded-xl border border-border shadow-sm">
          <div className="flex justify-between items-center text-xs sm:text-sm font-medium">
            <span className="text-text-body truncate mr-2">{stage}</span>
            <span className="text-primary font-bold shrink-0">{progress}%</span>
          </div>
          
          <Progress value={progress} className="h-2 sm:h-2.5" />
          
          <div className="grid grid-cols-2 gap-3 sm:gap-4 pt-1 sm:pt-2">
            <div className="bg-bg-page p-2 sm:p-3 rounded-lg border border-border">
              <p className="text-[9px] sm:text-[10px] uppercase tracking-wider text-text-muted font-bold mb-0.5 sm:mb-1">Progress</p>
              <p className="text-xs sm:text-sm font-semibold text-text-heading">
                {totalPages ? `Page ${currentPage} of ${totalPages}` : 'Calculating...'}
              </p>
            </div>
            <div className="bg-bg-page p-2 sm:p-3 rounded-lg border border-border">
              <p className="text-[9px] sm:text-[10px] uppercase tracking-wider text-text-muted font-bold mb-0.5 sm:mb-1">Est. Time</p>
              <p className="text-xs sm:text-sm font-semibold text-text-heading">
                {timeLeft !== null ? (timeLeft > 60 ? `${Math.floor(timeLeft / 60)}m ${timeLeft % 60}s` : `${timeLeft}s`) : 'Calculating...'}
              </p>
            </div>
          </div>
          
          <p className="text-[10px] sm:text-xs text-text-muted text-center italic">
            Large documents may take several minutes. Please do not close this tab.
          </p>
        </div>
      )}

      {status && (
        <div className={`mt-4 sm:mt-6 p-3 sm:p-4 rounded-xl text-xs sm:text-sm font-medium flex items-center gap-2 ${
          status.includes('failed') 
            ? 'bg-danger/10 text-danger border border-danger/20' 
            : 'bg-success/10 text-success border border-success/20'
        }`}>
          {status.includes('failed') ? (
            <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" className="sm:w-4 sm:h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><line x1="12" x2="12" y1="8" y2="12"/><line x1="12" x2="12.01" y1="16" y2="16"/></svg>
          ) : (
            <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" className="sm:w-4 sm:h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/><polyline points="22 4 12 14.01 9 11.01"/></svg>
          )}
          {status}
        </div>
      )}

      <div className="mt-4 sm:mt-6 flex justify-end">
        <Button 
          size="lg"
          className="w-full sm:w-auto px-6 sm:px-8 h-10 sm:h-11 bg-primary hover:bg-primary-hover text-white" 
          onClick={handleExtraction} 
          disabled={(uploadMode === 'file' && !file) || (uploadMode === 'text' && !inputText.trim()) || loading}
        >
          {loading ? 'Extracting...' : 'Start Extraction'}
        </Button>
      </div>
    </div>
  );
});

Upload.displayName = 'Upload';

export default Upload;
