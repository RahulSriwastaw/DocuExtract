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
  const [isMobile, setIsMobile] = useState(false);
  const [selectedDocument, setSelectedDocument] = useState<Document | null>(null);
  const [currentDocumentId, setCurrentDocumentId] = useState<string | null>(null);
  const [extractedQuestions, setExtractedQuestions] = useState<Question[]>([]);
  const [editingQuestion, setEditingQuestion] = useState<Question | null>(null);
  const [editingIndex, setEditingIndex] = useState<number>(-1);
  const [documents, setDocuments] = useState<Document[]>([]);

  useEffect(() => {
    const handleResize = () => {
      const mobile = window.innerWidth < 768;
      setIsMobile(mobile);
      if (!mobile) {
        setIsMobileMenuOpen(false);
      }
    };
    handleResize();
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  useEffect(() => {
    const fetchDocuments = async () => {
      try {
        const res = await fetch('/api/get-documents');
        if (res.ok) {
          const data = await res.json();
          if (data.documents && data.documents.length > 0) {
            setDocuments(data.documents);
            return;
          }
        }
      } catch (err) {
        console.error("Failed to fetch documents from server:", err);
      }
      
      // Fallback to local storage
      const savedDocs = localStorage.getItem('recent_extractions');
      if (savedDocs) {
        setDocuments(JSON.parse(savedDocs));
      } else {
        setDocuments(mockDocuments);
      }
    };
    fetchDocuments();
  }, []);

  const saveDocuments = async (newDocs: Document[]) => {
    setDocuments(newDocs);
    localStorage.setItem('recent_extractions', JSON.stringify(newDocs));
    
    try {
      await fetch('/api/save-documents', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ documents: newDocs })
      });
    } catch (err) {
      console.error("Failed to save documents to server:", err);
    }
  };

  const handleExtractionComplete = (questions: Question[], fileName: string) => {
    const newDocId = Date.now().toString();
    const newDoc: Document = {
      id: newDocId,
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
    setCurrentDocumentId(newDocId);
  };

  const handleDocumentClick = (doc: Document) => {
    setExtractedQuestions(doc.questions);
    setCurrentDocumentId(doc.id);
    setSelectedDocument(null);
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
      
      // Update the document in the documents array if we are editing a recent extraction
      if (currentDocumentId) {
        const updatedDocs = documents.map(doc => {
          if (doc.id === currentDocumentId) {
            return { ...doc, questions: updatedList };
          }
          return doc;
        });
        saveDocuments(updatedDocs);
      }
      
      return updatedList;
    });
    setActiveTab('extract');
    setEditingQuestion(null);
    setEditingIndex(-1);
  };

  const handleQuestionsChange = (newQuestions: Question[]) => {
    setExtractedQuestions(newQuestions);
    if (currentDocumentId) {
      const updatedDocs = documents.map(doc => {
        if (doc.id === currentDocumentId) {
          return { ...doc, questions: newQuestions, totalQuestions: newQuestions.length };
        }
        return doc;
      });
      // Only save if there's an actual change to avoid infinite loops
      const currentDoc = documents.find(d => d.id === currentDocumentId);
      if (currentDoc && JSON.stringify(currentDoc.questions) !== JSON.stringify(newQuestions)) {
        saveDocuments(updatedDocs);
      }
    }
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
            x: isMobile ? (isMobileMenuOpen ? 0 : '-100%') : 0,
            width: isMobile ? 256 : (isSidebarCollapsed ? 64 : 256) 
          }}
          transition={{ type: 'spring', stiffness: 300, damping: 30 }}
          className={`
            fixed inset-y-0 left-0 z-40 md:relative md:z-10
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
                      <button onClick={() => { setExtractedQuestions([]); setCurrentDocumentId(null); }} className="mb-6 text-sm font-semibold text-primary hover:text-primary-hover flex items-center gap-1 transition-colors">
                        &larr; Back to Dashboard
                      </button>
                      <Questions questions={extractedQuestions} onEdit={handleEdit} onQuestionsChange={handleQuestionsChange} />
                    </div>
                  ) : (
                    <div className="h-full">
                      <Dashboard documents={documents} onDocumentClick={handleDocumentClick} onExtractionComplete={handleExtractionComplete} />
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
