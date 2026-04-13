import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Question } from '../types';
import { ChevronLeft, Save, Sparkles, Image as ImageIcon, Trash2, Plus, X } from 'lucide-react';
import { motion } from 'motion/react';

interface QuestionEditPageProps {
  question: Question | null;
  index: number;
  total: number;
  onSave: (updated: Question) => void;
  onNext: () => void;
  onPrevious: () => void;
  onBack: () => void;
  onDelete?: (id: string) => void;
}

export default function QuestionEditPage({
  question: initialQuestion,
  index,
  total,
  onSave,
  onNext,
  onPrevious,
  onBack,
  onDelete
}: QuestionEditPageProps) {
  const [editingQuestion, setEditingQuestion] = useState<Question | null>(null);
  const [isAIProcessing, setIsAIProcessing] = useState(false);
  const [aiEditType, setAiEditType] = useState('Solution Add / Change');
  const [aiEditAction, setAiEditAction] = useState('Add solution where missing');
  const [aiLanguage, setAiLanguage] = useState('Hindi');
  const [aiCustomPrompt, setAiCustomPrompt] = useState('');

  useEffect(() => {
    if (initialQuestion) {
      setEditingQuestion({ ...initialQuestion });
    }
  }, [initialQuestion]);

  if (!editingQuestion) return <div className="p-8 text-center">Loading...</div>;

  const handleSave = () => {
    if (editingQuestion) {
      onSave(editingQuestion);
    }
  };

  // Properties
  const properties = [
    { label: 'Subject', key: 'subject' },
    { label: 'Sub Subject', key: 'sub_subject' },
    { label: 'Chapter', key: 'chapter' },
    { label: 'Sub Chapter', key: 'sub_chapter' },
    { label: 'Topic', key: 'topic' },
    { label: 'Sub Topic', key: 'sub_topic' },
    { label: 'Keywords', key: 'keywords' },
    { label: 'Type', key: 'type' },
    { label: 'Difficulty', key: 'difficulty' },
    { label: 'Status', key: 'status' },
    { label: 'Page No', key: 'page_no' },
    { label: 'Exam', key: 'exam' },
    { label: 'Year', key: 'year' },
    { label: 'Date', key: 'date' },
    { label: 'Collection', key: 'collection' },
    { label: 'Section', key: 'section' },
  ];

  // Metadata
  const metadata = [
    { label: 'Record ID', key: 'record_id' },
    { label: 'Unique ID', key: 'question_unique_id' },
    { label: 'Airtable Table', key: 'airtable_table_name' },
    { label: 'Action', key: 'action' },
    { label: 'Current Status', key: 'current_status' },
    { label: 'Sync Code', key: 'sync_code' },
    { label: 'Error Report', key: 'error_report' },
    { label: 'Error Description', key: 'error_description' },
  ];

  const handleApplyAIEdit = async () => {
    setIsAIProcessing(true);
    try {
      const { GoogleGenAI } = await import('@google/genai');
      const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY || process.env.API_KEY });
      
      let prompt = '';
      const subjectChapterInstruction = `Also, analyze the question to identify its "subject", "sub_subject", "chapter", "sub_chapter", "topic", "sub_topic", "keywords", and "difficulty" level (Easy, Medium, or Hard). If these fields are missing or empty, populate them with appropriate values based on the question content.`;
      
      if (aiEditType === 'Solution Add / Change') {
        prompt = `You are an expert educator. Perform the following action on the provided question: ${aiEditAction}. 
        ${subjectChapterInstruction}
        Return ONLY the updated question object in JSON format. Do not include any markdown formatting like \`\`\`json.
        Preserve all existing fields, only update the solution fields (solution_eng, solution_hin) and subject/chapter as requested.
        
        Question: ${JSON.stringify(editingQuestion)}`;
      } else if (aiEditType === 'Classify & Tag') {
        let specificInstruction = subjectChapterInstruction;
        if (aiEditAction === 'Generate keywords only') {
          specificInstruction = `Analyze the question and generate a comma-separated list of highly relevant "keywords". Populate the "keywords" field if it is missing or empty. Do not modify other fields.`;
        } else if (aiEditAction === 'Determine difficulty only') {
          specificInstruction = `Analyze the question and determine its "difficulty" level (Easy, Medium, or Hard). Populate the "difficulty" field if it is missing or empty. Do not modify other fields.`;
        } else {
          specificInstruction = `Analyze the question to identify and populate its "subject", "sub_subject", "chapter", "sub_chapter", "topic", "sub_topic", "keywords", and "difficulty" level. Only populate fields that are currently missing or empty.`;
        }
        prompt = `You are an expert educator. Perform classification and tagging on the provided question. 
        ${specificInstruction}
        Return ONLY the updated question object in JSON format. Do not include any markdown formatting like \`\`\`json.
        Preserve all existing fields, only update the classification fields as requested.
        
        Question: ${JSON.stringify(editingQuestion)}`;
      } else if (aiEditType === 'Question Variation') {
        prompt = `You are an expert educator. Create a variation of the following question. 
        Keep the same difficulty and topic, but change the specific values or scenario.
        ${subjectChapterInstruction}
        Return ONLY the updated question object in JSON format. Do not include any markdown formatting like \`\`\`json.
        Update question_eng, question_hin, options, correctOption, solution_eng, and solution_hin accordingly.
        
        Question: ${JSON.stringify(editingQuestion)}`;
      } else if (aiEditType === 'Language Variation') {
        prompt = `You are an expert translator. Translate the question, options, and solution into ${aiLanguage}.
        ${subjectChapterInstruction}
        Return ONLY the updated question object in JSON format. Do not include any markdown formatting like \`\`\`json.
        Store the translation in the appropriate language fields (e.g., if Hindi, use question_hin, solution_hin). If the language is not Hindi or English, add a new field like question_${(aiLanguage || '').toLowerCase().substring(0,3)}.
        
        Question: ${JSON.stringify(editingQuestion)}`;
      } else if (aiEditType === 'Write your own prompt') {
        prompt = `You are an expert educator. Follow these instructions to modify the question: ${aiCustomPrompt}.
        ${subjectChapterInstruction}
        Return ONLY the updated question object in JSON format. Do not include any markdown formatting like \`\`\`json.
        
        Question: ${JSON.stringify(editingQuestion)}`;
      }

      const response = await ai.models.generateContent({
        model: 'gemini-3-flash-preview',
        contents: prompt,
        config: { responseMimeType: 'application/json' }
      });

      let responseText = response.text || '{}';
      // Clean up potential markdown formatting if the model still includes it
      responseText = responseText.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();
      
      const updatedQuestion = JSON.parse(responseText);
      
      // Merge the updated fields back into the editingQuestion state
      setEditingQuestion(prev => prev ? { ...prev, ...updatedQuestion } : null);
      
      alert('AI Edit applied successfully! Please review the changes before saving.');
    } catch (error: any) {
      console.error('AI Edit error:', error);
      const isRateLimit = error?.status === 429 || error?.message?.includes('429') || error?.message?.includes('quota') || error?.error?.code === 429;
      if (isRateLimit) {
        alert('AI Quota exceeded. Please wait a moment and try again, or check your API key limits.');
      } else {
        alert('Failed to apply AI edit. Please try again.');
      }
    } finally {
      setIsAIProcessing(false);
    }
  };

  return (
    <div className="min-h-screen flex flex-col bg-slate-50 font-sans text-slate-900">
      {/* Header */}
      <header className="sticky top-0 z-10 bg-white border-b border-slate-200 px-4 sm:px-6 py-3 flex flex-col sm:flex-row items-start sm:items-center justify-between shadow-sm gap-3">
        <div className="flex items-center gap-3 w-full sm:w-auto">
          <Button variant="ghost" size="icon" onClick={onBack} className="rounded-full hover:bg-slate-100 shrink-0">
            <ChevronLeft className="w-5 h-5" />
          </Button>
          <h2 className="text-base sm:text-lg font-semibold text-slate-800 truncate">Edit Question <span className="text-slate-400 font-normal">#{index + 1}</span></h2>
        </div>
        <div className="flex items-center gap-2 w-full sm:w-auto justify-between sm:justify-end">
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" onClick={onPrevious} disabled={index <= 0} className="rounded-full h-8 px-3 text-xs">Prev</Button>
            <Button variant="outline" size="sm" onClick={onNext} disabled={index >= total - 1} className="rounded-full h-8 px-3 text-xs">Next</Button>
          </div>
          <div className="flex items-center gap-2">
            <Button size="sm" onClick={handleSave} className="bg-indigo-600 hover:bg-indigo-700 text-white rounded-full px-4 sm:px-6 h-8 sm:h-9 font-semibold shadow-md shadow-indigo-200 text-xs sm:text-sm">
              <Save className="w-3.5 h-3.5 sm:w-4 sm:h-4 mr-1.5 sm:mr-2" /> Save
            </Button>
            <Button 
              size="sm" 
              variant="outline"
              onClick={() => {
                if (editingQuestion?.id && onDelete) {
                  onDelete(editingQuestion.id);
                }
              }} 
              className="border-red-200 text-red-600 hover:bg-red-50 rounded-full px-3 h-8 sm:h-9 text-xs"
            >
              <Trash2 className="w-3.5 h-3.5" />
            </Button>
          </div>
        </div>
      </header>

      {/* Main Workspace */}
      <main className="flex-1 p-4 sm:p-6 grid grid-cols-1 lg:grid-cols-12 gap-6 max-w-7xl mx-auto w-full">
        
        {/* Left Panel - Content */}
        <div className="lg:col-span-8 space-y-6">
          <section className="bg-white rounded-2xl border border-slate-200 p-6 shadow-sm">
            <div className="flex items-center justify-between mb-4">
              <Label className="text-xs font-bold text-slate-500 uppercase tracking-wider">Question Content</Label>
            </div>
            <div className="space-y-4">
              <div className="space-y-2">
                <Label className="text-xs text-slate-500">Question (English)</Label>
                <Textarea 
                  placeholder="Enter question in English..." 
                  className="w-full min-h-[120px] resize-y border-slate-200 focus:border-indigo-500 focus:ring-indigo-500 rounded-xl text-base p-4"
                  value={editingQuestion.question_eng || ''} 
                  onChange={e => setEditingQuestion(prev => prev ? {...prev, question_eng: e.target.value} : null)} 
                />
              </div>
              <div className="space-y-2">
                <Label className="text-xs text-slate-500">Question (Hindi)</Label>
                <Textarea 
                  placeholder="Enter question in Hindi..." 
                  className="w-full min-h-[120px] resize-y border-slate-200 focus:border-indigo-500 focus:ring-indigo-500 rounded-xl text-base p-4"
                  value={editingQuestion.question_hin || ''} 
                  onChange={e => setEditingQuestion(prev => prev ? {...prev, question_hin: e.target.value} : null)} 
                />
              </div>
            </div>
          </section>

          <section className="bg-white rounded-2xl border border-slate-200 p-6 shadow-sm">
            <div className="flex items-center justify-between mb-4">
              <Label className="text-xs font-bold text-slate-500 uppercase tracking-wider">Question Image</Label>
            </div>
            <div className="space-y-4">
              {editingQuestion.image ? (
                <div className="relative inline-block">
                  <img src={editingQuestion.image} alt="Question" className="max-h-64 rounded-lg border border-slate-200" />
                  <Button 
                    variant="destructive" 
                    size="icon" 
                    className="absolute -top-2 -right-2 h-6 w-6 rounded-full"
                    onClick={() => setEditingQuestion(prev => prev ? {...prev, image: ''} : null)}
                  >
                    <X className="w-3 h-3" />
                  </Button>
                </div>
              ) : (
                <div className="flex items-center justify-center w-full">
                  <label className="flex flex-col items-center justify-center w-full h-32 border-2 border-slate-300 border-dashed rounded-xl cursor-pointer bg-slate-50 hover:bg-slate-100 transition-colors">
                    <div className="flex flex-col items-center justify-center pt-5 pb-6">
                      <ImageIcon className="w-8 h-8 mb-2 text-slate-400" />
                      <p className="text-sm text-slate-500 font-semibold">Click to upload image</p>
                      <p className="text-xs text-slate-400">SVG, PNG, JPG or GIF</p>
                    </div>
                    <input 
                      type="file" 
                      className="hidden" 
                      accept="image/*"
                      onChange={(e) => {
                        const file = e.target.files?.[0];
                        if (file) {
                          const reader = new FileReader();
                          reader.onloadend = () => {
                            setEditingQuestion(prev => prev ? {...prev, image: reader.result as string} : null);
                          };
                          reader.readAsDataURL(file);
                        }
                      }}
                    />
                  </label>
                </div>
              )}
            </div>
          </section>
          
          <section className="bg-white rounded-2xl border border-slate-200 p-6 shadow-sm">
            <div className="flex items-center justify-between mb-4">
              <Label className="text-xs font-bold text-slate-500 uppercase tracking-wider">Solution</Label>
            </div>
            <div className="space-y-4">
              <div className="space-y-2">
                <Label className="text-xs text-slate-500">Solution (English)</Label>
                <Textarea 
                  placeholder="Enter solution in English..." 
                  className="w-full min-h-[100px] resize-y border-slate-200 focus:border-indigo-500 focus:ring-indigo-500 rounded-xl text-base p-4"
                  value={editingQuestion.solution_eng || ''} 
                  onChange={e => setEditingQuestion(prev => prev ? {...prev, solution_eng: e.target.value} : null)} 
                />
              </div>
              <div className="space-y-2">
                <Label className="text-xs text-slate-500">Solution (Hindi)</Label>
                <Textarea 
                  placeholder="Enter solution in Hindi..." 
                  className="w-full min-h-[100px] resize-y border-slate-200 focus:border-indigo-500 focus:ring-indigo-500 rounded-xl text-base p-4"
                  value={editingQuestion.solution_hin || ''} 
                  onChange={e => setEditingQuestion(prev => prev ? {...prev, solution_hin: e.target.value} : null)} 
                />
              </div>
            </div>
          </section>
          
          <section className="bg-white rounded-2xl border border-slate-200 p-6 shadow-sm">
            <div className="flex items-center justify-between mb-4">
              <Label className="text-xs font-bold text-slate-500 uppercase tracking-wider">Options</Label>
              <Button 
                variant="outline" 
                size="sm" 
                className="h-8 text-xs font-semibold rounded-full"
                onClick={() => setEditingQuestion(prev => prev ? {...prev, options: [...(prev.options || []), '']} : null)}
              >
                <Plus className="w-3.5 h-3.5 mr-1.5" /> Add Option
              </Button>
            </div>
            <div className="grid gap-3">
              {editingQuestion.options?.map((opt, i) => {
                const label = String.fromCharCode(65 + i);
                const isCorrect = editingQuestion.correctOption === label;
                return (
                  <div key={i} className={`flex items-start gap-3 p-3 rounded-xl border-2 transition-all ${isCorrect ? 'bg-emerald-50 border-emerald-200' : 'bg-slate-50 border-transparent hover:border-slate-200'}`}>
                    <button
                      onClick={() => setEditingQuestion(prev => prev ? {...prev, correctOption: label} : null)}
                      className={`w-8 h-8 shrink-0 rounded-lg flex items-center justify-center text-xs font-mono font-bold mt-1 ${isCorrect ? 'bg-emerald-600 text-white' : 'bg-slate-200 text-slate-500'}`}
                    >
                      {label}
                    </button>
                    <Textarea 
                      className="border-0 bg-transparent focus-visible:ring-0 text-sm font-medium p-1 resize-y min-h-[60px] w-full" 
                      value={opt} 
                      placeholder={`Option ${label}`}
                      onChange={e => {
                        if (editingQuestion) {
                          const newOptions = [...editingQuestion.options];
                          newOptions[i] = e.target.value;
                          setEditingQuestion({...editingQuestion, options: newOptions});
                        }
                      }} 
                    />
                    <Button 
                      variant="ghost" 
                      size="icon" 
                      className="h-8 w-8 shrink-0 text-slate-400 hover:text-red-500 mt-1"
                      onClick={() => setEditingQuestion(prev => prev ? {...prev, options: prev.options.filter((_, idx) => idx !== i)} : null)}
                    >
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </div>
                );
              })}
            </div>
          </section>
        </div>
        
        {/* Right Panel - Properties */}
        <aside className="lg:col-span-4 space-y-6">
          <section className="bg-white rounded-2xl border border-slate-200 p-6 shadow-sm">
            <Label className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-4 block">Properties</Label>
            <div className="space-y-4">
              {properties.map(p => (
                <div key={p.key} className="space-y-1.5">
                  <Label className="text-[11px] font-semibold text-slate-600">{p.label}</Label>
                  <Input 
                    value={(editingQuestion as any)[p.key] || ''} 
                    onChange={e => setEditingQuestion(prev => prev ? {...prev, [p.key]: e.target.value} : null)} 
                  />
                </div>
              ))}
            </div>
          </section>
          
          <section className="bg-white rounded-2xl border border-slate-200 p-6 shadow-sm">
            <Label className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-4 block">Metadata</Label>
            <div className="space-y-4">
              {metadata.map(p => (
                <div key={p.key} className="space-y-1.5">
                  <Label className="text-[11px] font-semibold text-slate-600">{p.label}</Label>
                  {p.key === 'current_status' ? (
                    <select
                      className="flex h-9 w-full rounded-md border border-slate-200 bg-transparent px-3 py-1 text-sm shadow-sm transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-slate-950 disabled:cursor-not-allowed disabled:opacity-50"
                      value={(editingQuestion as any)[p.key] || 'Draft'}
                      onChange={e => setEditingQuestion(prev => prev ? {...prev, [p.key]: e.target.value} : null)}
                    >
                      <option value="Draft">Draft</option>
                      <option value="Editing">Editing</option>
                      <option value="Saved">Saved</option>
                      <option value="Published">Published</option>
                    </select>
                  ) : (
                    <Input 
                      value={(editingQuestion as any)[p.key] || ''} 
                      onChange={e => setEditingQuestion(prev => prev ? {...prev, [p.key]: e.target.value} : null)} 
                    />
                  )}
                </div>
              ))}
            </div>
          </section>
          
          <section className="bg-indigo-900 rounded-2xl p-6 text-white shadow-lg shadow-indigo-200">
            <div className="flex items-center gap-2 mb-4 text-indigo-200">
              <Sparkles className="w-4 h-4" />
              <Label className="text-xs font-bold uppercase tracking-wider">AI Assistant</Label>
            </div>
            <p className="text-sm text-indigo-100 mb-4">Use AI to generate variations, solutions, or translations.</p>
            
            <div className="space-y-3 mb-4">
              <select className="w-full bg-indigo-800 border border-indigo-700 rounded-xl px-4 py-2.5 text-sm font-medium text-white outline-none" value={aiEditType} onChange={e => {
                setAiEditType(e.target.value);
                setAiEditAction('');
              }}>
                <option>Solution Add / Change</option>
                <option>Classify & Tag</option>
                <option>Question Variation</option>
                <option>Language Variation</option>
                <option>Write your own prompt</option>
              </select>

              {aiEditType === 'Solution Add / Change' && (
                <select className="w-full bg-indigo-800 border border-indigo-700 rounded-xl px-4 py-2.5 text-sm font-medium text-white outline-none" value={aiEditAction} onChange={e => setAiEditAction(e.target.value)}>
                  <option value="">Select action...</option>
                  <option value="Add solution where missing">Add solution where missing</option>
                  <option value="Make solutions more detailed">Make solutions more detailed</option>
                  <option value="Make solutions short & crisp (bullet points)">Make solutions short & crisp (bullet points)</option>
                </select>
              )}

              {aiEditType === 'Classify & Tag' && (
                <select className="w-full bg-indigo-800 border border-indigo-700 rounded-xl px-4 py-2.5 text-sm font-medium text-white outline-none" value={aiEditAction} onChange={e => setAiEditAction(e.target.value)}>
                  <option value="">Select action...</option>
                  <option value="Fill all missing classification fields">Fill all missing fields (Subject, Sub Subject, Chapter, Sub Chapter, Topic, Sub Topic, Keywords, Difficulty)</option>
                  <option value="Generate keywords only">Generate Keywords only</option>
                  <option value="Determine difficulty only">Determine Difficulty only</option>
                </select>
              )}

              {aiEditType === 'Language Variation' && (
                <select className="w-full bg-indigo-800 border border-indigo-700 rounded-xl px-4 py-2.5 text-sm font-medium text-white outline-none" value={aiLanguage} onChange={e => setAiLanguage(e.target.value)}>
                  <option value="Hindi">Hindi</option>
                  <option value="Bengali">Bengali</option>
                  <option value="Telugu">Telugu</option>
                  <option value="Kannada">Kannada</option>
                  <option value="Marathi">Marathi</option>
                  <option value="Gujarati">Gujarati</option>
                  <option value="Tamil">Tamil</option>
                  <option value="English">English</option>
                </select>
              )}

              {aiEditType === 'Write your own prompt' && (
                <textarea className="w-full bg-indigo-800 border border-indigo-700 rounded-xl px-4 py-2.5 text-sm font-medium text-white outline-none h-24" value={aiCustomPrompt} onChange={e => setAiCustomPrompt(e.target.value)} placeholder="Describe what you want AI to do..." />
              )}
            </div>

            <Button className="w-full bg-white text-indigo-900 hover:bg-indigo-50 rounded-xl h-10 font-bold" onClick={handleApplyAIEdit} disabled={isAIProcessing}>
              {isAIProcessing ? 'Processing...' : 'Apply AI Edit'}
            </Button>
          </section>
        </aside>
      </main>
    </div>
  );
}
