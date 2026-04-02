import { useState, useEffect } from 'react';
import { Dialog, DialogContent } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Question } from '../types';
import { Sparkles, FileText, Library, Database, ChevronLeft, ChevronRight, Save, X, Info } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

interface QuestionEditModalProps {
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  question: Question | null;
  index: number;
  total: number;
  onSave: (updated: Question) => void;
  onNext: () => void;
  onPrevious: () => void;
}

export default function QuestionEditModal({
  isOpen,
  onOpenChange,
  question: initialQuestion,
  index,
  total,
  onSave,
  onNext,
  onPrevious
}: QuestionEditModalProps) {
  const [editingQuestion, setEditingQuestion] = useState<Question | null>(null);

  const [activeTab, setActiveTab] = useState<'content' | 'options'>('content');

  useEffect(() => {
    if (initialQuestion) {
      setEditingQuestion({ ...initialQuestion });
    }
  }, [initialQuestion]);

  if (!editingQuestion) return null;

  const handleSave = () => {
    if (editingQuestion) {
      onSave(editingQuestion);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-[1100px] w-[98vw] h-[92vh] p-0 overflow-hidden flex flex-col border-0 shadow-2xl bg-white rounded-[32px]">
        {/* Header - Matches Image */}
        <div className="px-6 py-4 bg-white border-b flex items-center justify-between shrink-0">
          <div className="flex items-center gap-4">
            <div className="bg-blue-600 p-2 rounded-2xl shadow-lg shadow-blue-100">
              <FileText className="w-5 h-5 text-white" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-slate-900 leading-none">Editor</h2>
              <p className="text-[10px] font-bold text-slate-400 mt-1 uppercase tracking-wider">Question {index + 1} of {total}</p>
            </div>
            
            <div className="ml-4 flex items-center bg-slate-100 p-1 rounded-2xl">
              {['Draft', 'Published'].map((s) => (
                <button
                  key={s}
                  onClick={() => setEditingQuestion(prev => prev ? {...prev, status: s as any} : null)}
                  className={`px-4 py-1.5 rounded-xl text-[10px] font-bold transition-all ${editingQuestion.status === s ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-400 hover:text-slate-500'}`}
                >
                  {s}
                </button>
              ))}
            </div>
          </div>

          <div className="flex items-center gap-3">
            <Button 
              onClick={handleSave}
              className="bg-blue-600 hover:bg-blue-700 text-white shadow-xl shadow-blue-200 rounded-2xl px-6 h-11 text-xs font-bold transition-all gap-2"
            >
              <Save className="w-4 h-4" />
              Save
            </Button>
            <div className="h-8 w-[1px] bg-slate-100 mx-1"></div>
            <Button variant="ghost" size="icon" onClick={() => onOpenChange(false)} className="h-10 w-10 text-slate-300 hover:text-slate-600 hover:bg-slate-50 rounded-2xl">
              <X className="w-6 h-6" />
            </Button>
          </div>
        </div>

        {/* Main Workspace - 3 Column Layout */}
        <div className="flex-1 overflow-hidden flex flex-col md:flex-row bg-slate-50/30">
          {/* Left Sidebar - Navigation */}
          <div className="w-full md:w-[200px] bg-white border-r flex flex-col shrink-0 p-4 gap-4">
            <button 
              onClick={() => setActiveTab('content')}
              className={`group relative flex flex-col items-center justify-center p-6 rounded-[24px] border-2 transition-all duration-300 ${activeTab === 'content' ? 'bg-white border-blue-100 shadow-xl shadow-blue-50/50' : 'bg-slate-50/50 border-transparent hover:bg-white hover:border-slate-100'}`}
            >
              <div className={`absolute top-4 left-4 w-1.5 h-3 rounded-full ${activeTab === 'content' ? 'bg-blue-600' : 'bg-slate-300'}`}></div>
              <span className={`text-[10px] font-black uppercase tracking-[0.15em] text-center leading-tight ${activeTab === 'content' ? 'text-blue-600' : 'text-slate-400'}`}>
                Question<br/>Content
              </span>
            </button>

            <button 
              onClick={() => setActiveTab('options')}
              className={`group relative flex flex-col items-center justify-center p-6 rounded-[24px] border-2 transition-all duration-300 ${activeTab === 'options' ? 'bg-white border-green-100 shadow-xl shadow-green-50/50' : 'bg-slate-50/50 border-transparent hover:bg-white hover:border-slate-100'}`}
            >
              <div className={`absolute top-4 left-4 w-1.5 h-3 rounded-full ${activeTab === 'options' ? 'bg-green-500' : 'bg-slate-300'}`}></div>
              <span className={`text-[10px] font-black uppercase tracking-[0.15em] text-center leading-tight ${activeTab === 'options' ? 'text-green-600' : 'text-slate-400'}`}>
                Options &<br/>Answer
              </span>
            </button>
          </div>

          {/* Middle Area - Content Editor */}
          <div className="flex-1 overflow-y-auto p-8 bg-slate-50/50">
            <AnimatePresence mode="wait">
              {activeTab === 'content' ? (
                <motion.div 
                  key="content"
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -10 }}
                  className="max-w-3xl mx-auto"
                >
                  <div className="bg-white rounded-[32px] border border-slate-100 shadow-2xl shadow-slate-200/50 overflow-hidden min-h-[400px] flex flex-col">
                    <div className="px-8 py-6 border-b bg-white flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <div className="w-2 h-2 rounded-full bg-blue-500 shadow-lg shadow-blue-200"></div>
                        <span className="text-[11px] font-black text-slate-400 uppercase tracking-[0.2em]">Question Content</span>
                      </div>
                      <div className="flex gap-2">
                        <Button variant="outline" size="sm" className="h-9 text-[10px] font-bold text-slate-500 border-slate-100 hover:bg-slate-50 rounded-xl px-4">
                          <Library className="w-3.5 h-3.5 mr-2" /> Passage
                        </Button>
                        <Button variant="outline" size="sm" className="h-9 text-[10px] font-bold text-slate-500 border-slate-100 hover:bg-slate-50 rounded-xl px-4">
                          <Database className="w-3.5 h-3.5 mr-2" /> Image
                        </Button>
                      </div>
                    </div>
                    <Textarea 
                      className="flex-1 resize-none border-0 focus-visible:ring-0 text-xl p-10 leading-relaxed font-medium bg-transparent placeholder:text-slate-200" 
                      value={editingQuestion.text || ''} 
                      onChange={e => setEditingQuestion(prev => prev ? {...prev, text: e.target.value} : null)} 
                      placeholder="Enter your question text here..."
                    />
                  </div>
                </motion.div>
              ) : (
                <motion.div 
                  key="options"
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -10 }}
                  className="max-w-3xl mx-auto space-y-4"
                >
                  <div className="flex items-center gap-3 px-2 mb-6">
                    <div className="w-2 h-2 rounded-full bg-green-500 shadow-lg shadow-green-200"></div>
                    <span className="text-[11px] font-black text-slate-400 uppercase tracking-[0.2em]">Options & Answer</span>
                  </div>
                  
                  <div className="grid gap-3">
                    {editingQuestion.options.map((opt, i) => {
                      const label = String.fromCharCode(65 + i);
                      const isCorrect = editingQuestion.correctOption === label;
                      return (
                        <div 
                          key={i} 
                          className={`flex items-center gap-4 p-2 pr-6 rounded-[24px] border-2 transition-all duration-300 ${isCorrect ? 'bg-white border-green-200 shadow-xl shadow-green-50/50' : 'bg-white border-slate-50 hover:border-slate-100'}`}
                        >
                          <button
                            onClick={() => setEditingQuestion(prev => prev ? {...prev, correctOption: label} : null)}
                            className={`w-12 h-12 rounded-2xl flex items-center justify-center text-sm font-black shrink-0 transition-all duration-300 ${isCorrect ? 'bg-green-600 text-white shadow-lg shadow-green-200' : 'bg-slate-50 text-slate-400 hover:bg-slate-100'}`}
                          >
                            {label}
                          </button>
                          <Input 
                            className="border-0 bg-transparent focus-visible:ring-0 text-base font-bold h-12 p-0 placeholder:text-slate-200" 
                            value={opt} 
                            onChange={e => {
                              if (editingQuestion) {
                                const newOptions = [...editingQuestion.options];
                                newOptions[i] = e.target.value;
                                setEditingQuestion({...editingQuestion, options: newOptions});
                              }
                            }} 
                            placeholder={`Option ${label}...`}
                          />
                          {isCorrect && (
                            <div className="flex items-center gap-2 bg-green-50 px-3 py-1.5 rounded-xl border border-green-100">
                              <div className="w-1.5 h-1.5 rounded-full bg-green-500 animate-pulse"></div>
                              <span className="text-[9px] font-black text-green-600 uppercase tracking-wider">Correct</span>
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          {/* Right Sidebar - Properties */}
          <div className="w-full md:w-[280px] bg-white border-l flex flex-col shrink-0 overflow-y-auto">
            <div className="p-6 space-y-8">
              {/* Properties Section */}
              <div className="space-y-6">
                <div className="flex items-center gap-3 text-slate-300">
                  <Info className="w-4 h-4" />
                  <span className="text-[10px] font-black uppercase tracking-[0.2em]">Properties</span>
                </div>
                
                <div className="space-y-5">
                  <div className="space-y-2">
                    <Label className="text-[10px] font-black text-slate-400 uppercase tracking-wider ml-1">Subject</Label>
                    <select 
                      className="w-full bg-slate-50 border-2 border-transparent hover:border-slate-100 rounded-2xl px-4 py-3 text-xs font-bold text-slate-700 outline-none focus:bg-white focus:border-blue-200 transition-all appearance-none"
                      value={editingQuestion.subject || ''}
                      onChange={e => setEditingQuestion(prev => prev ? {...prev, subject: e.target.value} : null)}
                    >
                      <option value="">None</option>
                      <option value="Math">Math</option>
                      <option value="Science">Science</option>
                      <option value="Geography">Geography</option>
                      <option value="History">History</option>
                    </select>
                  </div>

                  <div className="space-y-2">
                    <Label className="text-[10px] font-black text-slate-400 uppercase tracking-wider ml-1">Difficulty</Label>
                    <div className="flex p-1 bg-slate-50 rounded-2xl border-2 border-transparent">
                      {['Easy', 'Medium', 'Hard'].map((d) => (
                        <button
                          key={d}
                          onClick={() => setEditingQuestion(prev => prev ? {...prev, difficulty: d as any} : null)}
                          className={`flex-1 py-2 rounded-xl text-[10px] font-black transition-all duration-300 ${editingQuestion.difficulty === d ? 'bg-white text-slate-900 shadow-lg shadow-slate-200/50' : 'text-slate-400 hover:text-slate-600'}`}
                        >
                          {d === 'Easy' ? 'E' : d === 'Medium' ? 'M' : 'H'}
                        </button>
                      ))}
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label className="text-[10px] font-black text-slate-400 uppercase tracking-wider ml-1">Type</Label>
                    <select 
                      className="w-full bg-slate-50 border-2 border-transparent hover:border-slate-100 rounded-2xl px-4 py-3 text-xs font-bold text-slate-700 outline-none focus:bg-white focus:border-blue-200 transition-all appearance-none"
                      value={editingQuestion.type || 'MCQ Single'}
                      onChange={e => setEditingQuestion(prev => prev ? {...prev, type: e.target.value} : null)}
                    >
                      <option value="MCQ Single">MCQ Single</option>
                      <option value="MCQ Multiple">MCQ Multiple</option>
                      <option value="True/False">True/False</option>
                      <option value="Subjective">Subjective</option>
                    </select>
                  </div>
                </div>
              </div>

              {/* AI Magic Section */}
              <div className="space-y-4">
                <div className="flex items-center gap-3 text-indigo-300">
                  <Sparkles className="w-4 h-4" />
                  <span className="text-[10px] font-black uppercase tracking-[0.2em] text-indigo-400">AI Magic</span>
                </div>
                <div className="bg-indigo-50/30 rounded-[28px] p-5 border-2 border-indigo-50 space-y-3">
                  <select className="w-full bg-white border-2 border-indigo-100 rounded-2xl px-4 py-2.5 text-[11px] font-bold text-slate-600 outline-none focus:border-indigo-300 transition-all">
                    <option>Select Tool</option>
                    <option>Fix Grammar</option>
                    <option>Simplify</option>
                    <option>Translate</option>
                  </select>
                  <Button className="w-full bg-indigo-600 hover:bg-indigo-700 text-white shadow-lg shadow-indigo-100 h-10 font-black text-[11px] rounded-2xl transition-all uppercase tracking-widest">
                    Apply
                  </Button>
                </div>
              </div>
            </div>

            <div className="mt-auto p-6 border-t bg-slate-50/30">
              <div className="flex items-center justify-between text-[10px] font-black text-slate-300 uppercase tracking-[0.1em]">
                <span>Page Reference</span>
                <span className="text-slate-900 bg-white px-3 py-1 rounded-lg shadow-sm border border-slate-100">P. {editingQuestion.page_no || 1}</span>
              </div>
            </div>
          </div>
        </div>

        {/* Navigation Footer */}
        <div className="px-8 py-4 bg-white border-t flex items-center justify-between shrink-0">
          <Button 
            variant="ghost" 
            onClick={onPrevious} 
            disabled={index <= 0}
            className="rounded-2xl px-6 h-11 text-xs font-black text-slate-400 hover:text-slate-900 hover:bg-slate-50 transition-all gap-2"
          >
            <ChevronLeft className="w-5 h-5" />
            Prev
          </Button>

          <div className="flex flex-col items-center gap-2">
            <span className="text-xs font-black text-slate-900 tracking-widest">{index + 1} / {total}</span>
            <div className="w-48 h-1.5 bg-slate-100 rounded-full overflow-hidden">
              <motion.div 
                initial={{ width: 0 }}
                animate={{ width: `${((index + 1) / total) * 100}%` }}
                className="h-full bg-blue-600 rounded-full shadow-[0_0_10px_rgba(37,99,235,0.5)]" 
              />
            </div>
          </div>

          <Button 
            variant="ghost" 
            onClick={onNext} 
            disabled={index >= total - 1}
            className="rounded-2xl px-6 h-11 text-xs font-black text-slate-400 hover:text-slate-900 hover:bg-slate-50 transition-all gap-2"
          >
            Next
            <ChevronRight className="w-5 h-5" />
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

