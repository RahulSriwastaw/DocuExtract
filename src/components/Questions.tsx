import { useState, useMemo, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Question, QuestionSet } from '../types';
import { Search, Trash2, Edit, Tag, Copy, Wand2, FolderPlus, AlertCircle, ExternalLink, RefreshCw, FileText, Layout, BookOpen, LayoutGrid, List } from 'lucide-react';
import { safeJson } from '../utils';

export default function Questions({ questions: initialQuestions, onEdit }: { questions: Question[], onEdit: (q: Question) => void }) {
  const [questions, setQuestions] = useState<Question[]>(initialQuestions);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('All');
  const [isAiModalOpen, setIsAiModalOpen] = useState(false);
  const [isBulkMetadataModalOpen, setIsBulkMetadataModalOpen] = useState(false);
  const [isAirtableModalOpen, setIsAirtableModalOpen] = useState(false);
  const [isSetModalOpen, setIsSetModalOpen] = useState(false);
  
  // Bulk Metadata State
  const [bulkSubject, setBulkSubject] = useState('');
  const [bulkTopic, setBulkTopic] = useState('');
  const [bulkTags, setBulkTags] = useState('');
  const [testQuestions, setTestQuestions] = useState<Question[]>([]);
  const [aiPrompt, setAiPrompt] = useState('');
  const [aiTask, setAiTask] = useState('variations');
  
  // Save Modal States
  const [saveDestinations, setSaveDestinations] = useState<string[]>(['server']);
  const [airtableTableName, setAirtableTableName] = useState('');
  const [airtableTables, setAirtableTables] = useState<{id: string, name: string}[]>([]);
  const [isCreatingNewTable, setIsCreatingNewTable] = useState(false);
  const [newTableName, setNewTableName] = useState('');
  
  const [serverFolder, setServerFolder] = useState('');
  const [serverFolders, setServerFolders] = useState<{id: string, name: string}[]>([]);
  const [serverError, setServerError] = useState<string | null>(null);
  const [isCreatingNewFolder, setIsCreatingNewFolder] = useState(false);
  const [newServerFolder, setNewServerFolder] = useState('');
  
  const [isLoadingTables, setIsLoadingTables] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  
  const [availableSets, setAvailableSets] = useState<QuestionSet[]>([]);
  const [selectedSetId, setSelectedSetId] = useState<string>('');
  const [newSetName, setNewSetName] = useState('');
  const [newSetFolderId, setNewSetFolderId] = useState<string>('');
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');

  // Edit Modal States
  const [editingQuestion, setEditingQuestion] = useState<Question | null>(null);
  const [editingIndex, setEditingIndex] = useState(-1);

  const handleEditClick = (q: Question) => {
    onEdit(q);
  };

  useEffect(() => {
    if (isAirtableModalOpen || isSetModalOpen) {
      setIsLoadingTables(true);
      setServerError(null);
      
      const fetchAirtable = fetch('/api/get-airtable-tables')
        .then(res => safeJson(res))
        .catch(() => ({ tables: [] }));
        
      const fetchServer = fetch('/api/get-server-folders')
        .then(async res => {
          const data = await safeJson(res);
          if (!res.ok && data.error) {
            setServerError(data.error);
            return { folders: [] };
          }
          return data;
        })
        .catch(() => ({ folders: [] }));

      Promise.all([fetchAirtable, fetchServer]).then(([airtableData, serverData]) => {
        setAirtableTables(airtableData.tables || []);
        setServerFolders(serverData.folders || []);
        setIsLoadingTables(false);
      });
    }
  }, [isAirtableModalOpen, isSetModalOpen]);

  useEffect(() => {
    if (isSetModalOpen) {
      const saved = localStorage.getItem('question_sets');
      if (saved) {
        setAvailableSets(JSON.parse(saved));
      }
    }
  }, [isSetModalOpen]);

  const filteredQuestions = useMemo(() => {
    return questions.filter(q => 
      (statusFilter === 'All' || q.status === statusFilter) &&
      ((q.text || '').toLowerCase().includes((search || '').toLowerCase()))
    );
  }, [questions, search, statusFilter]);

  const toggleSelect = (id: string) => {
    setSelectedIds(prev => 
      prev.includes(id) ? prev.filter(i => i !== id) : [...prev, id]
    );
  };

  const toggleSelectAll = () => {
    setSelectedIds(prev => 
      prev.length === filteredQuestions.length ? [] : filteredQuestions.map(q => q.id)
    );
  };

  const handleDelete = (id: string) => {
    setQuestions(prev => prev.filter(q => q.id !== id));
    setSelectedIds(prev => prev.filter(i => i !== id));
  };

  const handleCopyToTest = () => {
    const selectedQuestions = questions.filter(q => selectedIds.includes(q.id));
    setTestQuestions(prev => [...prev, ...selectedQuestions]);
    console.log('Copied to test:', selectedQuestions);
  };

  const handleAddToSet = () => {
    const selectedQuestions = questions.filter(q => selectedIds.includes(q.id));
    let sets = [...availableSets];
    
    if (selectedSetId === 'new') {
      if (!newSetName.trim()) return alert('Please enter a set name');
      const newSet: QuestionSet = {
        id: Date.now().toString(),
        name: newSetName,
        folderId: newSetFolderId || null,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        questions: selectedQuestions
      };
      sets.push(newSet);
    } else {
      if (!selectedSetId) return alert('Please select a set');
      sets = sets.map(s => {
        if (s.id === selectedSetId) {
          // Avoid duplicates by ID
          const existingIds = new Set(s.questions.map(q => q.id));
          const newQs = selectedQuestions.filter(q => !existingIds.has(q.id));
          return {
            ...s,
            questions: [...s.questions, ...newQs],
            updatedAt: new Date().toISOString()
          };
        }
        return s;
      });
    }
    
    localStorage.setItem('question_sets', JSON.stringify(sets));
    setIsSetModalOpen(false);
    setNewSetName('');
    setSelectedSetId('');
    alert('Questions added to set successfully!');
  };

  const handleSaveQuestions = async () => {
    if (saveDestinations.length === 0) {
      return alert('Please select at least one destination to save.');
    }

    const selectedQuestions = questions.filter(q => selectedIds.includes(q.id));
    let finalAirtableTable = airtableTableName;
    let finalServerFolder = serverFolder;

    try {
      setIsSaving(true);
      
      if (saveDestinations.includes('airtable') && isCreatingNewTable) {
        if (!newTableName.trim()) throw new Error('Please enter a new Airtable table name');
        const response = await fetch('/api/create-airtable-table', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ tableName: newTableName })
        });
        const data = await safeJson(response);
        if (!response.ok) throw new Error(data.error || 'Failed to create table');
        finalAirtableTable = newTableName;
      }

      if (saveDestinations.includes('server') && isCreatingNewFolder) {
        if (!newServerFolder.trim()) throw new Error('Please enter a new Server folder name');
        finalServerFolder = newServerFolder;
      }

      const response = await fetch('/api/save-questions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          destinations: saveDestinations,
          airtableTable: finalAirtableTable,
          serverFolder: finalServerFolder,
          questions: selectedQuestions 
        })
      });
      
      const data = await safeJson(response);
      if (!response.ok) throw new Error(data.error || 'Failed to save');
      
      alert('Questions saved successfully!');
      setIsAirtableModalOpen(false);
      setAirtableTableName('');
      setNewTableName('');
      setIsCreatingNewTable(false);
      setServerFolder('');
      setNewServerFolder('');
      setIsCreatingNewFolder(false);
    } catch (error: any) {
      console.error('Error saving questions:', error);
      alert('Error saving questions: ' + error.message);
    } finally {
      setIsSaving(false);
    }
  };

  const handleBulkMetadataEdit = () => {
    if (selectedIds.length === 0) return alert('Please select at least one question.');
    
    const tagsArray = bulkTags.split(',').map(tag => tag.trim()).filter(tag => tag !== '');
    
    setQuestions(prev => prev.map(q => {
      if (selectedIds.includes(q.id)) {
        return {
          ...q,
          subject: bulkSubject || q.subject,
          topic: bulkTopic || q.topic,
          tags: tagsArray.length > 0 ? tagsArray : q.tags
        };
      }
      return q;
    }));
    
    setIsBulkMetadataModalOpen(false);
    setBulkSubject('');
    setBulkTopic('');
    setBulkTags('');
    alert('Bulk Metadata Edit applied successfully!');
  };

  const handleBulkAiEdit = async () => {
    if (selectedIds.length === 0) return alert('Please select at least one question.');
    
    const selectedQuestions = questions.filter(q => selectedIds.includes(q.id));
    const BATCH_SIZE = 5; // Reduced batch size
    const processedResults: Question[] = [];
    
    try {
      setIsSaving(true);
      const { GoogleGenAI } = await import('@google/genai');
      const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY! });
      
      for (let i = 0; i < selectedQuestions.length; i += BATCH_SIZE) {
        const batch = selectedQuestions.slice(i, i + BATCH_SIZE);
        
        const prompt = `Task: ${aiTask}\nCustom Prompt: ${aiPrompt}\n\nProcess the following list of questions and return an array of updated question objects in JSON format. Do not include any other text.\n\nQuestions to process:\n${JSON.stringify(batch)}`;
        
        const callAi = async (retries = 3, delay = 2000): Promise<any> => {
          try {
            return await ai.models.generateContent({
              model: "gemini-3-flash-preview",
              contents: prompt,
              config: { responseMimeType: "application/json" }
            });
          } catch (error: any) {
            // Check if error is rate limit (429)
            if (error.status === 429) {
              const errorMessage = error.message || '';
              // If it's a hard quota limit, don't retry
              if (errorMessage.includes('exceeded your current quota')) {
                throw error;
              }
              // If it's a temporary rate limit, retry
              if (retries > 0) {
                console.warn(`Rate limited, retrying in ${delay}ms...`);
                await new Promise(resolve => setTimeout(resolve, delay));
                return callAi(retries - 1, delay * 2);
              }
            }
            throw error;
          }
        };
        
        const response = await callAi();
        const processedBatch: Question[] = JSON.parse(response.text || '[]');
        processedResults.push(...processedBatch);
      }
      
      setQuestions(prev => prev.map(q => {
        const updated = processedResults.find(pq => pq.id === q.id);
        return updated ? updated : q;
      }));
      
      setIsAiModalOpen(false);
      alert('Bulk AI Edit applied successfully!');
    } catch (error: any) {
      console.error('Bulk AI Edit failed:', error);
      const errorMessage = error.message || '';
      if (error.status === 429 || errorMessage.includes('429')) {
        if (errorMessage.includes('exceeded your current quota')) {
          alert('Bulk AI Edit failed: Daily quota exhausted. Please check your plan and billing details in Google AI Studio.');
        } else {
          alert('Bulk AI Edit failed: Rate limit exceeded. Please try again in a few minutes.');
        }
      } else {
        alert('Bulk AI Edit failed: ' + errorMessage);
      }
    } finally {
      setIsSaving(false);
    }
  };

  const handleExportToWord = async () => {
    const selectedQuestions = questions.filter(q => selectedIds.includes(q.id));
    if (selectedQuestions.length === 0) return alert('Please select questions to export.');

    const { Document, Packer, Paragraph, TextRun } = await import('docx');
    const { saveAs } = await import('file-saver');

    const children = selectedQuestions.flatMap((q, i) => [
      new Paragraph({
        children: [new TextRun({ text: `Question ${i + 1}: ${q.text}`, bold: true })],
        spacing: { after: 200 }
      }),
      ...q.options.map((opt, j) => new Paragraph({
        children: [new TextRun({ text: `${String.fromCharCode(65 + j)}. ${opt}` })],
        spacing: { after: 100 }
      })),
      new Paragraph({
        children: [new TextRun({ text: `Answer: ${q.answer}`, bold: true })],
        spacing: { after: 400 }
      })
    ]);

    const doc = new Document({
      sections: [{
        properties: {},
        children: children
      }]
    });

    const blob = await Packer.toBlob(doc);
    saveAs(blob, "questions.docx");
  };

  return (
    <div className="space-y-4">
      {/* Top Toolbar */}
      <div className="flex flex-col sm:flex-row gap-3 sm:items-center bg-bg-page p-2 sm:p-3 rounded-xl border border-border">
        <div className="flex items-center justify-between sm:justify-start gap-3">
          <div className="flex items-center gap-2">
            <Checkbox 
              checked={selectedIds.length === filteredQuestions.length && filteredQuestions.length > 0} 
              onCheckedChange={toggleSelectAll}
            />
            <span className="text-xs font-bold text-text-muted">All ({filteredQuestions.length})</span>
          </div>
          
          <div className="flex gap-1 sm:hidden">
            <Button 
              variant={viewMode === 'grid' ? 'secondary' : 'ghost'} 
              size="sm" 
              className="h-8 w-8 p-0" 
              onClick={() => setViewMode('grid')}
            >
              <LayoutGrid className="w-4 h-4" />
            </Button>
            <Button 
              variant={viewMode === 'list' ? 'secondary' : 'ghost'} 
              size="sm" 
              className="h-8 w-8 p-0" 
              onClick={() => setViewMode('list')}
            >
              <List className="w-4 h-4" />
            </Button>
          </div>
        </div>
        
        {selectedIds.length > 0 && (
          <div className="flex flex-wrap gap-1.5 py-2 sm:py-0 border-y sm:border-y-0 sm:border-r sm:pr-3 border-border">
            <Button variant="outline" size="sm" className="h-8 px-2.5 text-[10px] font-bold gap-1.5"><Tag className="w-3.5 h-3.5" /> Tag</Button>
            <Button variant="outline" size="sm" className="h-8 px-2.5 text-[10px] font-bold gap-1.5" onClick={() => setIsBulkMetadataModalOpen(true)}><Edit className="w-3.5 h-3.5" /> Metadata</Button>
            <Button variant="outline" size="sm" className="h-8 px-2.5 text-[10px] font-bold gap-1.5" onClick={() => setIsAiModalOpen(true)}><Wand2 className="w-3.5 h-3.5" /> AI</Button>
            <Button variant="outline" size="sm" className="h-8 px-2.5 text-[10px] font-bold gap-1.5" onClick={handleExportToWord}><FileText className="w-3.5 h-3.5" /> Word</Button>
            <Button variant="outline" size="sm" className="h-8 px-2.5 text-[10px] font-bold gap-1.5" onClick={() => setIsAirtableModalOpen(true)}><Copy className="w-3.5 h-3.5" /> Save</Button>
            <Button variant="outline" size="sm" className="h-8 px-2.5 text-[10px] font-bold gap-1.5" onClick={() => setIsSetModalOpen(true)}><FolderPlus className="w-3.5 h-3.5" /> Set</Button>
            <Button variant="destructive" size="sm" className="h-8 px-2.5 text-[10px] font-bold gap-1.5 text-white bg-danger hover:bg-danger/90" onClick={() => setQuestions(prev => prev.filter(q => !selectedIds.includes(q.id)))}><Trash2 className="w-3.5 h-3.5" /> Delete</Button>
          </div>
        )}
        
        <div className="flex flex-1 gap-2">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-text-muted" />
            <Input placeholder="Search questions..." className="pl-9 h-9 text-sm bg-bg-card border-border" value={search} onChange={(e) => setSearch(e.target.value)} />
          </div>
          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="w-[110px] h-9 text-xs font-bold bg-bg-card border-border">
              <SelectValue placeholder="Status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="All">All Status</SelectItem>
              <SelectItem value="Draft">Draft</SelectItem>
              <SelectItem value="Published">Published</SelectItem>
            </SelectContent>
          </Select>
          <div className="hidden sm:flex gap-1 border-l pl-2 border-border">
            <Button 
              variant={viewMode === 'grid' ? 'secondary' : 'ghost'} 
              size="sm" 
              className="h-8 w-8 p-0" 
              onClick={() => setViewMode('grid')}
              title="Grid View"
            >
              <LayoutGrid className="w-4 h-4" />
            </Button>
            <Button 
              variant={viewMode === 'list' ? 'secondary' : 'ghost'} 
              size="sm" 
              className="h-8 w-8 p-0" 
              onClick={() => setViewMode('list')}
              title="List View"
            >
              <List className="w-4 h-4" />
            </Button>
          </div>
        </div>
      </div>

      {/* Add to Set Modal */}
      <Dialog open={isSetModalOpen} onOpenChange={setIsSetModalOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Add to Question Set</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <Label>Select Set</Label>
            <Select value={selectedSetId} onValueChange={setSelectedSetId}>
              <SelectTrigger>
                <SelectValue placeholder="Choose a set..." />
              </SelectTrigger>
              <SelectContent>
                {availableSets.map(s => <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>)}
                <SelectItem value="new">+ Create New Set</SelectItem>
              </SelectContent>
            </Select>
            {selectedSetId === 'new' && (
              <div className="space-y-4">
                <div className="space-y-2">
                  <Label>New Set Name</Label>
                  <Input 
                    placeholder="e.g., Physics Chapter 1" 
                    value={newSetName} 
                    onChange={(e) => setNewSetName(e.target.value)}
                  />
                </div>
                <div className="space-y-2">
                  <Label>Folder</Label>
                  <Select value={newSetFolderId} onValueChange={setNewSetFolderId}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select a folder..." />
                    </SelectTrigger>
                    <SelectContent>
                      {serverFolders.map(f => <SelectItem key={f.id} value={f.id}>{f.name}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
              </div>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsSetModalOpen(false)}>Cancel</Button>
            <Button onClick={handleAddToSet} disabled={!selectedSetId || (selectedSetId === 'new' && !newSetName)}>Add to Set</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Bulk Metadata Edit Modal */}
      <Dialog open={isBulkMetadataModalOpen} onOpenChange={setIsBulkMetadataModalOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Bulk Edit Metadata</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Subject</Label>
              <Input placeholder="e.g. Math" value={bulkSubject} onChange={(e) => setBulkSubject(e.target.value)} />
            </div>
            <div className="space-y-2">
              <Label>Topic</Label>
              <Input placeholder="e.g. Algebra" value={bulkTopic} onChange={(e) => setBulkTopic(e.target.value)} />
            </div>
            <div className="space-y-2">
              <Label>Tags (Comma separated)</Label>
              <Input placeholder="e.g. easy, important, exam" value={bulkTags} onChange={(e) => setBulkTags(e.target.value)} />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsBulkMetadataModalOpen(false)}>Cancel</Button>
            <Button onClick={handleBulkMetadataEdit}>Apply Changes</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* AI Edit Modal */}
      <Dialog open={isAiModalOpen} onOpenChange={setIsAiModalOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Bulk AI Edit</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <Select value={aiTask} onValueChange={setAiTask}>
              <SelectTrigger>
                <SelectValue placeholder="Select AI Task" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="variations">Generate Variations</SelectItem>
                <SelectItem value="translate">Translate (Hindi/English)</SelectItem>
                <SelectItem value="solution">Generate Solution</SelectItem>
              </SelectContent>
            </Select>
            <Textarea 
              placeholder="Enter custom prompt for AI..." 
              value={aiPrompt} 
              onChange={(e) => setAiPrompt(e.target.value)}
              rows={4}
            />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsAiModalOpen(false)}>Cancel</Button>
            <Button onClick={handleBulkAiEdit} disabled={isSaving}>
              {isSaving ? 'Applying...' : 'Apply AI Edit'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Cloud DB Save Modal */}
      <Dialog open={isAirtableModalOpen} onOpenChange={setIsAirtableModalOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Save Questions</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Save Destination</Label>
              <div className="flex gap-4">
                <div className="flex items-center space-x-2">
                  <Checkbox 
                    id="dest-server" 
                    checked={saveDestinations.includes('server')}
                    onCheckedChange={(checked) => {
                      if (checked) setSaveDestinations(prev => [...prev, 'server']);
                      else setSaveDestinations(prev => prev.filter(d => d !== 'server'));
                    }}
                  />
                  <Label htmlFor="dest-server" className="cursor-pointer">Own Server (Fast)</Label>
                </div>
                <div className="flex items-center space-x-2">
                  <Checkbox 
                    id="dest-airtable" 
                    checked={saveDestinations.includes('airtable')}
                    onCheckedChange={(checked) => {
                      if (checked) setSaveDestinations(prev => [...prev, 'airtable']);
                      else setSaveDestinations(prev => prev.filter(d => d !== 'airtable'));
                    }}
                  />
                  <Label htmlFor="dest-airtable" className="cursor-pointer">Airtable DB</Label>
                </div>
              </div>
            </div>

            {serverError && (
              <div className="p-3 bg-red-50 border border-red-200 rounded-md text-red-700 text-[11px] shadow-sm">
                <p className="font-bold mb-1 flex items-center gap-1.5">
                  <AlertCircle className="w-3 h-3" />
                  Database Connection Issue
                </p>
                <p className="mb-2 opacity-90">{serverError}</p>
                <div className="flex gap-2">
                  <a 
                    href="https://supabase.com/dashboard/project/yxibppbfrugarjoeoijw" 
                    target="_blank" 
                    rel="noopener noreferrer"
                    className="inline-flex items-center px-2 py-1 bg-red-100 hover:bg-red-200 text-red-800 rounded transition-colors font-medium"
                  >
                    Dashboard
                    <ExternalLink className="w-2.5 h-2.5 ml-1" />
                  </a>
                  <button 
                    onClick={() => window.location.reload()}
                    className="inline-flex items-center px-2 py-1 bg-white hover:bg-slate-50 border border-red-200 text-red-800 rounded transition-colors font-medium shadow-xs"
                  >
                    Retry
                    <RefreshCw className="w-2.5 h-2.5 ml-1" />
                  </button>
                </div>
              </div>
            )}

            {isLoadingTables ? (
              <p className="text-sm text-muted-foreground">Loading destinations...</p>
            ) : (
              <div className="space-y-4">
                {saveDestinations.includes('server') && (
                  <div className="space-y-2 border p-3 rounded-md bg-muted/30">
                    <Label>Server Folder</Label>
                    <Select value={isCreatingNewFolder ? 'new' : serverFolder} onValueChange={(val) => {
                      if (val === 'new') {
                        setIsCreatingNewFolder(true);
                        setServerFolder('');
                      } else {
                        setIsCreatingNewFolder(false);
                        setServerFolder(val);
                      }
                    }}>
                      <SelectTrigger>
                        <SelectValue placeholder="Select a folder..." />
                      </SelectTrigger>
                      <SelectContent>
                        {serverFolders.map(f => <SelectItem key={f.id} value={f.name}>{f.name}</SelectItem>)}
                        <SelectItem value="new">+ Create New Folder</SelectItem>
                      </SelectContent>
                    </Select>
                    {isCreatingNewFolder && (
                      <Input 
                        placeholder="Enter new folder name..." 
                        value={newServerFolder} 
                        onChange={(e) => setNewServerFolder(e.target.value)}
                      />
                    )}
                  </div>
                )}

                {saveDestinations.includes('airtable') && (
                  <div className="space-y-2 border p-3 rounded-md bg-muted/30">
                    <Label>Airtable Table</Label>
                    <Select value={isCreatingNewTable ? 'new' : airtableTableName} onValueChange={(val) => {
                      if (val === 'new') {
                        setIsCreatingNewTable(true);
                        setAirtableTableName('');
                      } else {
                        setIsCreatingNewTable(false);
                        setAirtableTableName(val);
                      }
                    }}>
                      <SelectTrigger>
                        <SelectValue placeholder="Select a table..." />
                      </SelectTrigger>
                      <SelectContent>
                        {airtableTables.map(t => <SelectItem key={t.id} value={t.name}>{t.name}</SelectItem>)}
                        <SelectItem value="new">+ Create New Table</SelectItem>
                      </SelectContent>
                    </Select>
                    {isCreatingNewTable && (
                      <Input 
                        placeholder="Enter new table name..." 
                        value={newTableName} 
                        onChange={(e) => setNewTableName(e.target.value)}
                      />
                    )}
                  </div>
                )}
              </div>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsAirtableModalOpen(false)} disabled={isSaving}>Cancel</Button>
            <Button onClick={handleSaveQuestions} disabled={isSaving || saveDestinations.length === 0}>
              {isSaving ? 'Saving...' : 'Save Questions'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Questions Display */}
      {viewMode === 'grid' ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {filteredQuestions.map((q, idx) => (
            <div key={q.id} className="bg-card border border-border rounded-[12px] p-5 shadow-sm hover:shadow-md transition-all flex flex-col relative group">
              {/* Top Row: Checkbox, Index, Status */}
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2">
                  <Checkbox checked={selectedIds.includes(q.id)} onCheckedChange={() => toggleSelect(q.id)} />
                  <div className="w-6 h-6 rounded-full bg-primary-light text-primary flex items-center justify-center font-bold text-[10px]">
                    {idx + 1}
                  </div>
                </div>
                <div className="flex items-center gap-2 bg-slate-50 px-2 py-0.5 rounded-full border border-border">
                  <div className={`w-2 h-2 rounded-full ${q.status === 'Published' ? 'bg-success' : 'bg-slate-300'}`}></div>
                  <span className="text-[9px] font-bold text-text-muted uppercase tracking-wider">{q.status}</span>
                </div>
              </div>

              {/* Badges */}
              <div className="flex flex-wrap items-center gap-1.5 mb-4">
                {q.subject && (
                  <span className="px-2 py-0.5 bg-slate-100 text-slate-600 rounded-full text-[9px] font-bold uppercase tracking-tight">
                    {q.subject}
                  </span>
                )}
                {q.chapter && (
                  <span className="px-2 py-0.5 bg-slate-100 text-slate-600 rounded-full text-[9px] font-bold uppercase tracking-tight">
                    {q.chapter}
                  </span>
                )}
                {q.topic && (
                  <span className="px-2 py-0.5 bg-slate-100 text-slate-600 rounded-full text-[9px] font-bold uppercase tracking-tight">
                    {q.topic}
                  </span>
                )}
                {q.difficulty && (
                  <span className={`px-2 py-0.5 rounded-full text-[9px] font-bold uppercase tracking-tight ${
                    q.difficulty === 'Easy' ? 'bg-green-100 text-green-700' :
                    q.difficulty === 'Medium' ? 'bg-yellow-100 text-yellow-700' :
                    'bg-red-100 text-red-700'
                  }`}>
                    {q.difficulty}
                  </span>
                )}
                <span className="px-2 py-0.5 bg-primary-light text-primary rounded-full text-[9px] font-bold uppercase tracking-tight">
                  {q.type || 'Single Choice'}
                </span>
                {q.page_no && (
                  <span className="px-2 py-0.5 bg-primary-light text-primary rounded-full text-[9px] font-bold uppercase tracking-tight">
                    Page {q.page_no}
                  </span>
                )}
                {q.keywords && (
                  <span className="px-2 py-0.5 bg-purple-100 text-purple-700 rounded-full text-[9px] font-bold uppercase tracking-tight">
                    {q.keywords}
                  </span>
                )}
              </div>

              {/* Question Text */}
              <div className="mb-4 flex-1">
                <p className="text-sm text-text-body leading-relaxed font-medium line-clamp-3">
                  {q.text}
                </p>
              </div>

              {/* Options */}
              <div className="mb-4 space-y-1">
                <span className="text-[10px] font-bold text-text-label uppercase tracking-wider block mb-1">Options:</span>
                <div className="space-y-1">
                  {(q.options || []).slice(0, 4).map((opt, i) => (
                    <div key={i} className={`text-[12px] flex items-center gap-2 ${opt === q.correctOption ? 'text-success font-bold' : 'text-text-body'}`}>
                      <span className="text-[10px] font-bold text-text-label">
                        {String.fromCharCode(65 + i)}.
                      </span>
                      <span className="truncate">{opt}</span>
                    </div>
                  ))}
                </div>
              </div>

              <div className="h-px bg-border w-full mb-3"></div>

              {/* Action Buttons */}
              <div className="grid grid-cols-2 gap-2 mb-3">
                <Button 
                  onClick={() => handleEditClick(q)} 
                  variant="outline" 
                  size="sm" 
                  className="h-8 border-border bg-white text-text-body hover:bg-slate-50 gap-1.5 text-[11px] font-semibold rounded-[8px]"
                >
                  <Edit className="w-3.5 h-3.5" />
                  Edit
                </Button>
                <Button 
                  onClick={() => handleDelete(q.id)} 
                  variant="outline" 
                  size="sm" 
                  className="h-8 border-border bg-white text-danger hover:bg-red-50 gap-1.5 text-[11px] font-semibold rounded-[8px]"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                  Delete
                </Button>
              </div>

              {/* Footer Badges */}
              <div className="flex items-center justify-between gap-2">
                <div className="flex items-center gap-1 px-2 py-0.5 bg-slate-50 text-text-muted rounded-full border border-border text-[9px] font-bold">
                  <BookOpen className="w-2.5 h-2.5" />
                  Question Bank
                </div>
                <div className="flex items-center gap-1 px-2 py-0.5 bg-slate-50 text-text-muted rounded-full border border-border text-[9px] font-bold">
                  <Layout className="w-2.5 h-2.5" />
                  1 Test
                </div>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="space-y-2">
          {filteredQuestions.map((q, idx) => (
            <div key={q.id} className="bg-card border border-border rounded-[12px] p-4 shadow-sm hover:shadow-md transition-all flex items-center gap-4 group">
              <div className="flex items-center gap-3 shrink-0">
                <Checkbox checked={selectedIds.includes(q.id)} onCheckedChange={() => toggleSelect(q.id)} />
                <div className="w-8 h-8 rounded-full bg-primary-light text-primary flex items-center justify-center font-bold text-xs">
                  {idx + 1}
                </div>
              </div>

              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-1">
                  <div className={`w-2 h-2 rounded-full ${q.status === 'Published' ? 'bg-success' : 'bg-slate-300'}`}></div>
                  <span className="text-[10px] font-bold text-text-muted uppercase tracking-wider">{q.status}</span>
                  <span className="text-[10px] text-text-label">•</span>
                  <span className="text-[10px] font-bold text-primary uppercase tracking-tight">{q.type || 'Single Choice'}</span>
                  <span className="text-[10px] text-text-label">•</span>
                  <span className="text-[10px] font-bold text-primary uppercase tracking-tight">Page {q.page_no || 1}</span>
                </div>
                <p className="text-sm text-text-body font-medium truncate">
                  {q.text}
                </p>
              </div>

              <div className="flex items-center gap-3 shrink-0">
                <div className="hidden md:flex gap-2">
                  <div className="flex items-center gap-1 px-2 py-0.5 bg-slate-50 text-text-muted rounded-full border border-border text-[9px] font-bold">
                    <BookOpen className="w-2.5 h-2.5" />
                    Bank
                  </div>
                  <div className="flex items-center gap-1 px-2 py-0.5 bg-slate-50 text-text-muted rounded-full border border-border text-[9px] font-bold">
                    <Layout className="w-2.5 h-2.5" />
                    1 Test
                  </div>
                </div>
                <div className="flex gap-1.5">
                  <Button 
                    onClick={() => handleEditClick(q)} 
                    variant="outline" 
                    size="sm" 
                    className="h-8 w-8 p-0 border-border bg-white text-text-body hover:bg-slate-50 rounded-[8px]"
                    title="Edit"
                  >
                    <Edit className="w-3.5 h-3.5" />
                  </Button>
                  <Button 
                    onClick={() => handleDelete(q.id)} 
                    variant="outline" 
                    size="sm" 
                    className="h-8 w-8 p-0 border-border bg-white text-danger hover:bg-red-50 rounded-[8px]"
                    title="Delete"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </Button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {filteredQuestions.length === 0 && (
        <div className="text-center py-12 text-slate-500 bg-white border border-dashed rounded-xl">
          No questions found matching your filters.
        </div>
      )}

    </div>
  );
}
