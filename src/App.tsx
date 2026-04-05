import { useState, useEffect } from 'react';
import Dashboard from './components/Dashboard';
import Questions from './components/Questions';
import QuestionBank from './components/QuestionBank';
import QuestionSets from './components/QuestionSets';
import CreateSet from './components/CreateSet';
import SettingsView from './components/Settings';
import QuestionEditModal from './components/QuestionEditModal';
import { mockDocuments } from './mockData';
import { Document, Question } from './types';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { FileText, Database, FolderOpen, LayoutDashboard, Settings, Sparkles, Library } from 'lucide-react';

export default function App() {
  const [activeTab, setActiveTab] = useState<'extract' | 'question-bank' | 'sets' | 'create-set' | 'settings'>('extract');
  const [selectedDocument, setSelectedDocument] = useState<Document | null>(null);
  const [extractedQuestions, setExtractedQuestions] = useState<Question[]>([]);
  const [editingQuestion, setEditingQuestion] = useState<Question | null>(null);
  const [editingIndex, setEditingIndex] = useState<number>(-1);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [documents, setDocuments] = useState<Document[]>([]);

  useEffect(() => {
    const savedDocs = localStorage.getItem('recent_extractions');
    if (savedDocs) {
      setDocuments(JSON.parse(savedDocs));
    } else {
      setDocuments(mockDocuments);
    }
  }, []);

  const saveDocuments = (newDocs: Document[]) => {
    setDocuments(newDocs);
    localStorage.setItem('recent_extractions', JSON.stringify(newDocs));
  };

  const handleExtractionComplete = (questions: Question[], fileName: string) => {
    const newDoc: Document = {
      id: Date.now().toString(),
      name: fileName,
      status: 'Completed',
      totalQuestions: questions.length,
      totalImages: 0,
      uploadDate: new Date().toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' }),
      questions: questions
    };
    
    const updatedDocs = [newDoc, ...documents];
    saveDocuments(updatedDocs);
    setExtractedQuestions(questions);
  };

  const handleEdit = (q: Question) => {
    const index = extractedQuestions.findIndex(item => item.id === q.id);
    setEditingIndex(index);
    setEditingQuestion({ ...q });
    setIsModalOpen(true);
  };

  const handleSave = () => {
    if (editingQuestion && editingIndex !== -1) {
      setExtractedQuestions(prev => {
        const updated = [...prev];
        updated[editingIndex] = editingQuestion;
        return updated;
      });
      setIsModalOpen(false);
      setEditingQuestion(null);
      setEditingIndex(-1);
    }
  };

  const handleNext = () => {
    if (editingIndex < extractedQuestions.length - 1) {
      const nextIndex = editingIndex + 1;
      setEditingIndex(nextIndex);
      setEditingQuestion({ ...extractedQuestions[nextIndex] });
    }
  };

  const handlePrevious = () => {
    if (editingIndex > 0) {
      const prevIndex = editingIndex - 1;
      setEditingIndex(prevIndex);
      setEditingQuestion({ ...extractedQuestions[prevIndex] });
    }
  };

  const handleModalSave = (updated: Question) => {
    setExtractedQuestions(prev => {
      const updatedList = [...prev];
      updatedList[editingIndex] = updated;
      return updatedList;
    });
    setIsModalOpen(false);
    setEditingQuestion(null);
    setEditingIndex(-1);
  };

  return (
    <div className="flex h-screen bg-bg-page font-sans overflow-hidden text-text-body">
      {/* Sidebar */}
      <aside className="w-64 border-r border-border bg-bg-sidebar flex flex-col shrink-0 shadow-sm z-10">
        <div className="p-6 border-b border-border flex items-center gap-3">
          <div className="w-9 h-9 bg-primary rounded-xl flex items-center justify-center shadow-sm">
            <Sparkles className="w-5 h-5 text-white" />
          </div>
          <h1 className="text-xl font-bold tracking-tight text-text-heading">
            DocuExtract
          </h1>
        </div>
        <nav className="flex-1 p-4 space-y-1.5 overflow-y-auto">
          <div className="text-[11px] font-bold text-text-label uppercase tracking-wider mb-3 px-3 mt-2">Menu</div>
          <Button 
            variant="ghost"
            onClick={() => setActiveTab('extract')}
            className={`w-full justify-start gap-3 rounded-lg transition-all ${activeTab === 'extract' ? 'bg-primary-light text-primary font-semibold border-l-4 border-primary rounded-l-none' : 'text-text-body hover:bg-slate-50'}`}
          >
            <LayoutDashboard className="w-4 h-4" /> Dashboard & Extract
          </Button>
          <Button 
            variant="ghost"
            onClick={() => setActiveTab('question-bank')}
            className={`w-full justify-start gap-3 rounded-lg transition-all ${activeTab === 'question-bank' ? 'bg-primary-light text-primary font-semibold border-l-4 border-primary rounded-l-none' : 'text-text-body hover:bg-slate-50'}`}
          >
            <Library className="w-4 h-4" /> Question Bank
          </Button>
          <Button 
            variant="ghost"
            onClick={() => setActiveTab('sets')}
            className={`w-full justify-start gap-3 rounded-lg transition-all ${activeTab === 'sets' || activeTab === 'create-set' ? 'bg-primary-light text-primary font-semibold border-l-4 border-primary rounded-l-none' : 'text-text-body hover:bg-slate-50'}`}
          >
            <FolderOpen className="w-4 h-4" /> Question Sets
          </Button>
        </nav>
        <div className="p-4 border-t border-border">
          <Button 
            variant="ghost" 
            onClick={() => setActiveTab('settings')}
            className={`w-full justify-start gap-3 rounded-lg transition-all ${activeTab === 'settings' ? 'bg-primary-light text-primary font-semibold border-l-4 border-primary rounded-l-none' : 'text-text-muted hover:text-text-body hover:bg-slate-50'}`}
          >
            <Settings className="w-4 h-4" /> Settings
          </Button>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 overflow-auto relative">
        {activeTab === 'extract' && (
          extractedQuestions.length > 0 ? (
            <div className="p-8 max-w-7xl mx-auto">
              <button onClick={() => setExtractedQuestions([])} className="mb-6 text-sm font-semibold text-primary hover:text-primary-hover flex items-center gap-1 transition-colors">
                &larr; Back to Dashboard
              </button>
              <Questions questions={extractedQuestions} onEdit={handleEdit} />
            </div>
          ) : !selectedDocument ? (
            <div className="h-full">
              <Dashboard documents={documents} onDocumentClick={setSelectedDocument} onExtractionComplete={handleExtractionComplete} />
            </div>
          ) : (
            <div className="p-8 max-w-7xl mx-auto">
              <button onClick={() => setSelectedDocument(null)} className="mb-6 text-sm font-semibold text-primary hover:text-primary-hover flex items-center gap-1 transition-colors">
                &larr; Back to Dashboard
              </button>
              <h2 className="text-2xl font-semibold mb-6 tracking-tight text-text-heading">{selectedDocument.name}</h2>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                {selectedDocument.questions.map((q) => (
                  <div key={q.id} className="border border-border p-5 rounded-[12px] shadow-sm bg-card hover:shadow-md transition-shadow flex flex-col">
                    <p className="font-medium text-text-body mb-4 line-clamp-3">{q.text}</p>
                    <ul className="text-sm text-text-muted mb-6 space-y-1.5 flex-1">
                      {q.options.map((opt, i) => (
                        <li key={i} className="flex items-start gap-2">
                          <span className="w-4 h-4 rounded-full border border-border flex-shrink-0 mt-0.5"></span>
                          <span className="line-clamp-2">{opt}</span>
                        </li>
                      ))}
                    </ul>
                    <div className="flex gap-2 mt-auto pt-4 border-t border-border">
                      <Button variant="outline" size="sm" className="flex-1 h-8 text-xs border-border text-text-body hover:bg-slate-50">Edit</Button>
                      <Button variant="destructive" size="sm" className="flex-1 h-8 text-xs bg-danger text-white hover:bg-red-600 border-0">Delete</Button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )
        )}

        {activeTab === 'question-bank' && <QuestionBank />}
        {activeTab === 'sets' && <QuestionSets onCreateSetClick={() => setActiveTab('create-set')} />}
        {activeTab === 'create-set' && <CreateSet onBack={() => setActiveTab('sets')} />}
        {activeTab === 'settings' && <SettingsView />}
      </main>

      <QuestionEditModal 
        isOpen={isModalOpen}
        onOpenChange={setIsModalOpen}
        question={editingQuestion}
        index={editingIndex}
        total={extractedQuestions.length}
        onSave={handleModalSave}
        onNext={handleNext}
        onPrevious={handlePrevious}
      />
    </div>
  );
}
