import { useState, ChangeEvent, forwardRef } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Progress } from '@/components/ui/progress';
import { Question } from '@/src/types';

interface UploadProps {
  onExtractionComplete: (questions: Question[], fileName: string) => void;
}

const STAGES = [
  "Initializing...",
  "Reading PDF file...",
  "Sending to AI for full analysis...",
  "AI is extracting ALL questions from ALL pages (this may take a moment)...",
  "Finalizing results..."
];

const Upload = forwardRef<HTMLInputElement, UploadProps>(({ onExtractionComplete }, ref) => {
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
    if (!file) return;
    setLoading(true);
    setStatus(null);
    setProgress(0);
    setStage(STAGES[0]);
    setTimeLeft(null);
    setCurrentPage(0);

    const reader = new FileReader();
    reader.onloadend = async () => {
      const base64String = reader.result as string;
      const base64Data = base64String.split(',')[1];
      
      try {
        setStage("Analyzing PDF structure...");
        setProgress(5);
        
        // Get total pages using pdfjs-dist
        const pdfjs = await import('pdfjs-dist');
        // Set worker using unpkg and .mjs extension for v5+
        pdfjs.GlobalWorkerOptions.workerSrc = `https://unpkg.com/pdfjs-dist@${pdfjs.version}/build/pdf.worker.min.mjs`;
        
        const loadingTask = pdfjs.getDocument({ data: Uint8Array.from(atob(base64Data), c => c.charCodeAt(0)) });
        const pdf = await loadingTask.promise;
        const total = pdf.numPages;
        setTotalPages(total);
        
        const { GoogleGenAI, Type } = await import('@google/genai');
        const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY! });
        
        let allExtractedQuestions: Question[] = [];
        const startTime = Date.now();
        let pagesProcessed = 0;

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

          const prompt = `Extract ALL questions from this page. For each question, extract: id, question_text (the full question text), options (as an array of strings), answer (A/B/C/D/E). Return a JSON array. Be extremely concise. Use null for empty fields. If there are no questions on this page, return an empty array []. Make sure to escape all quotes inside strings properly. DO NOT use literal newlines inside strings, use \\n instead.`;

          let pageSuccess = false;
          let retries = 0;
          const maxRetries = 2;
          let extracted: Question[] = [];

          while (!pageSuccess && retries <= maxRetries) {
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

              let responseText = response.text || '[]';
              
              const extractJsonArray = (text: string): string => {
                const firstBracket = text.indexOf('[');
                const lastBracket = text.lastIndexOf(']');
                if (firstBracket !== -1 && lastBracket !== -1 && lastBracket > firstBracket) {
                  return text.substring(firstBracket, lastBracket + 1);
                }
                if (firstBracket !== -1) {
                  return text.substring(firstBracket);
                }
                return text;
              };

              responseText = extractJsonArray(responseText).trim();

              // Pre-process to fix literal newlines inside strings
              let fixedText = '';
              let inStringPre = false;
              let escapedPre = false;
              for (let i = 0; i < responseText.length; i++) {
                const char = responseText[i];
                if (inStringPre) {
                  if (char === '\\') {
                    escapedPre = !escapedPre;
                    fixedText += char;
                  } else if (char === '"' && !escapedPre) {
                    inStringPre = false;
                    fixedText += char;
                  } else if (char === '\n') {
                    fixedText += '\\n';
                    escapedPre = false;
                  } else if (char === '\r') {
                    fixedText += '\\r';
                    escapedPre = false;
                  } else if (char === '\t') {
                    fixedText += '\\t';
                    escapedPre = false;
                  } else {
                    fixedText += char;
                    escapedPre = false;
                  }
                } else {
                  if (char === '"') {
                    inStringPre = true;
                  }
                  fixedText += char;
                }
              }
              if (inStringPre) fixedText += '"';
              responseText = fixedText;

              let batchData: any[] = [];
              let wasRepaired = false;

              try {
                batchData = JSON.parse(responseText);
              } catch (e) {
                console.warn(`Page ${pageNum} JSON parse failed (Attempt ${retries + 1}), attempting robust repair...`, e);
                const repairJson = (text: string): any[] | null => {
                  let json = text.trim();
                  const firstBracket = json.indexOf('[');
                  if (firstBracket === -1) return null;
                  if (firstBracket > 0) json = json.substring(firstBracket);
                  
                  let inString = false, escaped = false, lastValidBraceIndex = -1;
                  for (let i = 0; i < json.length; i++) {
                    const char = json[i];
                    if (char === '\\' && inString) escaped = !escaped;
                    else if (char === '"' && !escaped) { inString = !inString; escaped = false; }
                    else { if (!inString && char === '}') lastValidBraceIndex = i; escaped = false; }
                  }
                  
                  if (lastValidBraceIndex !== -1) {
                    try { 
                      let repaired = json.substring(0, lastValidBraceIndex + 1);
                      repaired = repaired.trim();
                      if (repaired.endsWith(',')) {
                        repaired = repaired.substring(0, repaired.length - 1);
                      }
                      repaired += ']';
                      return JSON.parse(repaired); 
                    } catch (err) { 
                      return repairJson(json.substring(0, lastValidBraceIndex)); 
                    }
                  }
                  return null;
                };
                const repaired = repairJson(responseText);
                if (repaired) {
                  batchData = repaired;
                  wasRepaired = true;
                } else {
                  throw e;
                }
              }

              if (Array.isArray(batchData) && batchData.length > 0) {
                extracted = batchData.map((q: any) => {
                  return {
                    id: q.id || Math.random().toString(36).substr(2, 9),
                    question_unique_id: q.id,
                    text: q.question_text,
                    options: q.options,
                    correctOption: q.answer,
                    answer: q.answer,
                    status: 'Draft',
                    difficulty: 'Medium',
                    // Initialize other fields as null/empty
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
              }
              pageSuccess = true; // Successfully processed
            } catch (err) {
              console.error(`Error processing page ${pageNum} (Attempt ${retries + 1}):`, err);
              retries++;
              if (retries <= maxRetries) {
                console.log(`Retrying page ${pageNum}...`);
                await new Promise(resolve => setTimeout(resolve, 1000)); // Wait 1s before retry
              }
            }
          }
          
          return extracted;
        };

        const CONCURRENCY_LIMIT = 10; // Process 10 pages at a time
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
          
          // Small delay between batches to avoid rate limiting
          await new Promise(resolve => setTimeout(resolve, 500));
        }
        
        setStage(STAGES[4]);
        setProgress(100);
        setTimeLeft(0);
        
        console.log('Total extraction complete', allExtractedQuestions.length, 'questions found');
        onExtractionComplete(allExtractedQuestions, file.name);
      } catch (error: any) {
        console.error('Extraction failed:', error);
        setStatus(`Extraction failed: ${error.message || 'Please try again.'}`);
      } finally {
        setLoading(false);
      }
    };
    reader.readAsDataURL(file);
  };

  return (
    <div className="w-full max-w-2xl mx-auto">
      <div 
        className={`relative border-2 border-dashed rounded-xl p-10 text-center transition-all duration-200 ${
          file ? 'border-blue-400 bg-blue-50/50' : 'border-slate-300 hover:border-blue-400 hover:bg-slate-50'
        }`}
      >
        <Input 
          id="pdf" 
          type="file" 
          accept=".pdf" 
          onChange={handleFileChange} 
          ref={ref} 
          className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-10"
        />
        
        {!file ? (
          <div className="space-y-4 pointer-events-none">
            <div className="w-16 h-16 bg-blue-100 text-blue-600 rounded-full flex items-center justify-center mx-auto">
              <svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="17 8 12 3 7 8"/><line x1="12" x2="12" y1="3" y2="15"/></svg>
            </div>
            <div>
              <p className="text-lg font-medium text-slate-900">Click to upload or drag and drop</p>
              <p className="text-sm text-slate-500 mt-1">PDF files only (max 10MB)</p>
            </div>
          </div>
        ) : (
          <div className="space-y-4 pointer-events-none">
            <div className="w-16 h-16 bg-green-100 text-green-600 rounded-full flex items-center justify-center mx-auto">
              <svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M14.5 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7.5L14.5 2z"/><polyline points="14 2 14 8 20 8"/><path d="m9 15 2 2 4-4"/></svg>
            </div>
            <div>
              <p className="text-lg font-medium text-slate-900">{file.name}</p>
              <p className="text-sm text-slate-500 mt-1">{(file.size / 1024 / 1024).toFixed(2)} MB</p>
            </div>
          </div>
        )}
      </div>

      {loading && (
        <div className="mt-6 space-y-4 bg-white p-6 rounded-xl border border-slate-200 shadow-sm">
          <div className="flex justify-between items-center text-sm font-medium">
            <span className="text-slate-700">{stage}</span>
            <span className="text-blue-600 font-bold">{progress}%</span>
          </div>
          
          <Progress value={progress} className="h-2.5" />
          
          <div className="grid grid-cols-2 gap-4 pt-2">
            <div className="bg-slate-50 p-3 rounded-lg border border-slate-100">
              <p className="text-[10px] uppercase tracking-wider text-slate-500 font-bold mb-1">Progress</p>
              <p className="text-sm font-semibold text-slate-800">
                {totalPages ? `Page ${currentPage} of ${totalPages}` : 'Calculating...'}
              </p>
            </div>
            <div className="bg-slate-50 p-3 rounded-lg border border-slate-100">
              <p className="text-[10px] uppercase tracking-wider text-slate-500 font-bold mb-1">Estimated Time</p>
              <p className="text-sm font-semibold text-slate-800">
                {timeLeft !== null ? (timeLeft > 60 ? `${Math.floor(timeLeft / 60)}m ${timeLeft % 60}s` : `${timeLeft}s`) : 'Calculating...'}
              </p>
            </div>
          </div>
          
          <p className="text-xs text-slate-400 text-center italic">
            Large documents may take several minutes. Please do not close this tab.
          </p>
        </div>
      )}

      {status && (
        <div className={`mt-6 p-4 rounded-xl text-sm font-medium flex items-center gap-2 ${
          status.includes('failed') 
            ? 'bg-red-50 text-red-700 border border-red-200' 
            : 'bg-green-50 text-green-700 border border-green-200'
        }`}>
          {status.includes('failed') ? (
            <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><line x1="12" x2="12" y1="8" y2="12"/><line x1="12" x2="12.01" y1="16" y2="16"/></svg>
          ) : (
            <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/><polyline points="22 4 12 14.01 9 11.01"/></svg>
          )}
          {status}
        </div>
      )}

      <div className="mt-6 flex justify-end">
        <Button 
          size="lg"
          className="w-full sm:w-auto px-8" 
          onClick={handleExtraction} 
          disabled={!file || loading}
        >
          {loading ? 'Extracting...' : 'Start Extraction'}
        </Button>
      </div>
    </div>
  );
});

Upload.displayName = 'Upload';

export default Upload;
