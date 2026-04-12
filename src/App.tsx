import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import Dashboard from './components/Dashboard';
import Questions from './components/Questions';
import QuestionBank from './components/QuestionBank';
import QuestionSets from './components/QuestionSets';
import CreateSet from './components/CreateSet';
import SettingsView from './components/Settings';
import QuestionEditPage from './components/QuestionEditPage';
import { mockDocuments } from './mockData';
import { Document, Question } from './types';
import { Button } from '@/components/ui/button';
import { FileText, Database, FolderOpen, LayoutDashboard, Settings, Sparkles, Library, Menu, X, ChevronLeft, ChevronRight } from 'lucide-react';

export default function App() {
  const [activeTab, setActiveTab] = useState<'extract' | 'question-bank' | 'sets' | 'create-set' | 'settings' | 'edit-question'>('extract');
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [selectedDocument, setSelectedDocument] = useState<Document | null>(null);
  const [extractedQuestions, setExtractedQuestions] = useState<Question[]>([]);
  const [editingQuestion, setEditingQuestion] = useState<Question | null>(null);
  const [editingIndex, setEditingIndex] = useState<number>(-1);
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
    setActiveTab('edit-question');
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

  const handleSave = (updated: Question) => {
    setExtractedQuestions(prev => {
      const updatedList = [...prev];
      updatedList[editingIndex] = updated;
      return updatedList;
    });
    setActiveTab('extract');
    setEditingQuestion(null);
    setEditingIndex(-1);
  };

  return (
    <div className="flex h-screen bg-bg-page font-sans overflow-hidden text-text-body flex-col md:flex-row">
      {/* Mobile Header */}
      {activeTab !== 'edit-question' && (
        <header className="md:hidden bg-bg-sidebar border-b border-border p-4 flex items-center justify-between z-20 shadow-sm">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 bg-primary rounded-lg flex items-center justify-center shadow-sm">
              <Sparkles className="w-4 h-4 text-white" />
            </div>
            <h1 className="text-lg font-bold tracking-tight text-text-heading">
              DocuExtract
            </h1>
          </div>
          <Button 
            variant="ghost" 
            size="icon" 
            onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
            className="h-9 w-9 rounded-lg text-text-muted hover:text-text-body hover:bg-slate-100"
          >
            {isMobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
          </Button>
        </header>
      )}

      {/* Sidebar Overlay */}
      <AnimatePresence>
        {isMobileMenuOpen && activeTab !== 'edit-question' && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/40 z-30 md:hidden backdrop-blur-sm"
            onClick={() => setIsMobileMenuOpen(false)}
          />
        )}
      </AnimatePresence>

      {/* Sidebar */}
      {activeTab !== 'edit-question' && (
        <motion.aside 
          initial={false}
          animate={{ 
            x: isMobileMenuOpen ? 0 : (window.innerWidth >= 768 ? 0 : '-100%'),
            width: isSidebarCollapsed ? 64 : 256 
          }}
          transition={{ type: 'spring', stiffness: 300, damping: 30 }}
          className={`
            fixed inset-y-0 left-0 z-40 md:relative md:z-10
            md:translate-x-0
            ${isSidebarCollapsed ? 'md:w-16' : 'md:w-64'} 
            w-64 border-r border-border bg-bg-sidebar flex flex-col shrink-0 shadow-xl md:shadow-none transition-all duration-300
          `}>
          <div className={`p-4 border-b border-border flex items-center ${isSidebarCollapsed ? 'justify-center' : 'justify-between gap-3'}`}>
            <motion.div 
              className="flex items-center gap-3 overflow-hidden"
              animate={{ opacity: isSidebarCollapsed ? 0 : 1 }}
            >
              <div className="w-9 h-9 bg-primary rounded-xl flex items-center justify-center shadow-sm shrink-0">
                <Sparkles className="w-5 h-5 text-white" />
              </div>
              <h1 className="text-xl font-bold tracking-tight text-text-heading truncate">
                DocuExtract
              </h1>
            </motion.div>
            <Button 
              variant="ghost" 
              size="icon" 
              onClick={() => setIsSidebarCollapsed(!isSidebarCollapsed)}
              className={`h-8 w-8 rounded-lg text-text-muted hover:text-text-body hover:bg-slate-100 ${isSidebarCollapsed ? 'hidden md:flex' : ''}`}
            >
              {isSidebarCollapsed ? <ChevronRight className="w-4 h-4" /> : <ChevronLeft className="w-4 h-4" />}
            </Button>
          </div>
          
          <nav className="flex-1 p-3 space-y-1.5 overflow-y-auto">
            <Button 
              variant="ghost"
              onClick={() => { setActiveTab('extract'); setIsMobileMenuOpen(false); }}
              className={`w-full ${isSidebarCollapsed ? 'md:justify-center md:px-0' : 'justify-start gap-3 px-3'} rounded-lg transition-all ${activeTab === 'extract' ? 'bg-primary-light text-primary font-semibold' : 'text-text-body hover:bg-slate-50'}`}
              title="Dashboard & Extract"
            >
              <LayoutDashboard className="w-4 h-4 shrink-0" /> 
              {(!isSidebarCollapsed || isMobileMenuOpen) && <span>Dashboard</span>}
            </Button>
            <Button 
              variant="ghost"
              onClick={() => { setActiveTab('question-bank'); setIsMobileMenuOpen(false); }}
              className={`w-full ${isSidebarCollapsed ? 'md:justify-center md:px-0' : 'justify-start gap-3 px-3'} rounded-lg transition-all ${activeTab === 'question-bank' ? 'bg-primary-light text-primary font-semibold' : 'text-text-body hover:bg-slate-50'}`}
              title="Question Bank"
            >
              <Library className="w-4 h-4 shrink-0" /> 
              {(!isSidebarCollapsed || isMobileMenuOpen) && <span>Question Bank</span>}
            </Button>
            <Button 
              variant="ghost"
              onClick={() => { setActiveTab('sets'); setIsMobileMenuOpen(false); }}
              className={`w-full ${isSidebarCollapsed ? 'md:justify-center md:px-0' : 'justify-start gap-3 px-3'} rounded-lg transition-all ${activeTab === 'sets' || activeTab === 'create-set' ? 'bg-primary-light text-primary font-semibold' : 'text-text-body hover:bg-slate-50'}`}
              title="Question Sets"
            >
              <FolderOpen className="w-4 h-4 shrink-0" /> 
              {(!isSidebarCollapsed || isMobileMenuOpen) && <span>Question Sets</span>}
            </Button>
          </nav>
          <div className="p-3 border-t border-border">
            <Button 
              variant="ghost" 
              onClick={() => { setActiveTab('settings'); setIsMobileMenuOpen(false); }}
              className={`w-full ${isSidebarCollapsed ? 'md:justify-center md:px-0' : 'justify-start gap-3 px-3'} rounded-lg transition-all ${activeTab === 'settings' ? 'bg-primary-light text-primary font-semibold' : 'text-text-muted hover:text-text-body hover:bg-slate-50'}`}
              title="Settings"
            >
              <Settings className="w-4 h-4 shrink-0" /> 
              {(!isSidebarCollapsed || isMobileMenuOpen) && <span>Settings</span>}
            </Button>
          </div>
        </motion.aside>
      )}

      {/* Main Content */}
      <main className="flex-1 overflow-auto relative bg-bg-page">
        <AnimatePresence mode="wait">
          <motion.div
            key={activeTab}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            transition={{ duration: 0.2 }}
            className="h-full"
          >
            {activeTab === 'edit-question' ? (
              <QuestionEditPage 
                question={editingQuestion}
                index={editingIndex}
                total={extractedQuestions.length}
                onSave={handleSave}
                onNext={handleNext}
                onPrevious={handlePrevious}
                onBack={() => setActiveTab('extract')}
              />
            ) : (
              <>
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
                        {(selectedDocument.questions || []).map((q) => (
                          <div key={q.id} className="border border-border p-5 rounded-[12px] shadow-sm bg-card hover:shadow-md transition-shadow flex flex-col">
                            <p className="font-medium text-text-body mb-4 line-clamp-3">{q.text}</p>
                            <ul className="text-sm text-text-muted mb-6 space-y-1.5 flex-1">
                              {(q.options || []).map((opt, i) => (
                                <li key={i} className="flex items-start gap-2">
                                  <span className="w-4 h-4 rounded-full border border-border flex-shrink-0 mt-0.5"></span>
                                  <span className="line-clamp-2">{opt}</span>
                                </li>
                              ))}
                            </ul>
                            <div className="flex gap-2 mt-auto pt-4 border-t border-border">
                              <Button variant="outline" size="sm" className="flex-1 h-8 text-xs border-border text-text-body hover:bg-slate-50" onClick={() => handleEdit(q)}>Edit</Button>
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
              </>
            )}
          </motion.div>
        </AnimatePresence>
      </main>
    </div>
  );
}
