import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Question, QuestionSet, Folder } from '../types';
import QuestionSetViewer from './QuestionSetViewer';
import { Trash2, Download, Edit, Plus, FolderOpen, Database, FolderPlus, FileText } from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';

export default function QuestionSets({ onCreateSetClick }: { onCreateSetClick: () => void }) {
  const [folders, setFolders] = useState<Folder[]>([]);
  const [sets, setSets] = useState<QuestionSet[]>([]);
  const [currentFolderId, setCurrentFolderId] = useState<string | null>(null);

  // Drag and Drop State
  const [draggedSetId, setDraggedSetId] = useState<string | null>(null);
  const [dragOverTargetId, setDragOverTargetId] = useState<string | null>(null);

  // Modals
  const [isFolderModalOpen, setIsFolderModalOpen] = useState(false);
  const [newFolderName, setNewFolderName] = useState('');
  
  const [isSetModalOpen, setIsSetModalOpen] = useState(false);
  const [newSetName, setNewSetName] = useState('');
  const [newSetFolderId, setNewSetFolderId] = useState<string>('');
  
  const [viewingSet, setViewingSet] = useState<QuestionSet | null>(null);

  // Confirmation Modals
  const [setToDelete, setSetToDelete] = useState<string | null>(null);
  const [folderToDelete, setFolderToDelete] = useState<string | null>(null);
  const [alertMsg, setAlertMsg] = useState<string | null>(null);

  useEffect(() => {
    const savedFolders = localStorage.getItem('question_folders');
    if (savedFolders) setFolders(JSON.parse(savedFolders));
    
    const savedSets = localStorage.getItem('question_sets');
    if (savedSets) setSets(JSON.parse(savedSets));
  }, []);

  const saveFolders = (newFolders: Folder[]) => {
    setFolders(newFolders);
    localStorage.setItem('question_folders', JSON.stringify(newFolders));
  };

  const saveSets = (newSets: QuestionSet[]) => {
    setSets(newSets);
    localStorage.setItem('question_sets', JSON.stringify(newSets));
  };

  // --- Folder Actions ---
  const createFolder = () => {
    if (!newFolderName.trim()) return;
    const newFolder: Folder = {
      id: Date.now().toString(),
      name: newFolderName,
      createdAt: new Date().toISOString()
    };
    saveFolders([...folders, newFolder]);
    setNewFolderName('');
    setIsFolderModalOpen(false);
  };

  const deleteFolder = (id: string) => {
    setFolderToDelete(id);
  };

  const confirmDeleteFolder = () => {
    if (!folderToDelete) return;
    saveFolders((folders || []).filter(f => f.id !== folderToDelete));
    saveSets((sets || []).map(s => s.folderId === folderToDelete ? { ...s, folderId: null } : s));
    setFolderToDelete(null);
  };

  // --- Set Actions ---
  const createSet = () => {
    if (!newSetName.trim()) return;
    const newSet: QuestionSet = {
      id: Date.now().toString(),
      name: newSetName,
      folderId: newSetFolderId || currentFolderId,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      questions: []
    };
    saveSets([...sets, newSet]);
    setNewSetName('');
    setNewSetFolderId('');
    setIsSetModalOpen(false);
  };

  const deleteSet = (id: string) => {
    setSetToDelete(id);
  };

  const confirmDeleteSet = () => {
    if (!setToDelete) return;
    saveSets(sets.filter(s => s.id !== setToDelete));
    setSetToDelete(null);
  };

  const removeQuestion = (setId: string, questionId: string) => {
    const updatedSets = (sets || []).map(s => {
      if (s.id === setId) {
        return {
          ...s,
          questions: (s.questions || []).filter(q => q.id !== questionId),
          updatedAt: new Date().toISOString()
        };
      }
      return s;
    });
    saveSets(updatedSets);
    if (viewingSet && viewingSet.id === setId) {
      setViewingSet(updatedSets.find(s => s.id === setId) || null);
    }
  };

  const getCsvHeaders = () => "question_eng,question_hin,type,subject,chapter,difficulty,option1_eng,option1_hin,option2_eng,option2_hin,option3_eng,option3_hin,option4_eng,option4_hin,answer,solution_eng,solution_hin";

  const formatQuestionToCsvRow = (q: Question) => {
    const fields = [
      q.question_eng || q.text || '',
      q.question_hin || '',
      q.type || '',
      q.subject || '',
      q.chapter || '',
      q.difficulty || '',
      q.option1_eng || q.options?.[0] || '',
      q.option1_hin || '',
      q.option2_eng || q.options?.[1] || '',
      q.option2_hin || '',
      q.option3_eng || q.options?.[2] || '',
      q.option3_hin || '',
      q.option4_eng || q.options?.[3] || '',
      q.option4_hin || '',
      q.answer || q.correctOption || '',
      q.solution_eng || '',
      q.solution_hin || ''
    ];
    return fields.map(val => `"${String(val).replace(/"/g, '""')}"`).join(',');
  };

  const exportSet = (set: QuestionSet) => {
    if ((set.questions || []).length === 0) return setAlertMsg('Set is empty');
    
    const csv = [getCsvHeaders(), ...(set.questions || []).map(formatQuestionToCsvRow)].join('\n');
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${set.name.replace(/\s+/g, '_')}.csv`;
    a.click();
  };

  const exportFolder = (folderId: string | null) => {
    const folderSets = (sets || []).filter(s => (s.folderId || null) === folderId);
    const allQuestions = folderSets.flatMap(s => s.questions || []);
    
    if (allQuestions.length === 0) return setAlertMsg('Folder is empty');
    
    const csv = [getCsvHeaders(), ...(allQuestions || []).map(formatQuestionToCsvRow)].join('\n');
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${folderId ? folders.find(f => f.id === folderId)?.name.replace(/\s+/g, '_') : 'Root'}_questions.csv`;
    a.click();
  };

  // --- Drag and Drop Handlers ---
  const handleDragStart = (e: React.DragEvent, setId: string) => {
    setDraggedSetId(setId);
    e.dataTransfer.effectAllowed = 'move';
    // Optional: set a transparent image or style to show it's being dragged
  };

  const handleDragOver = (e: React.DragEvent, targetId: string) => {
    e.preventDefault(); // Necessary to allow dropping
    e.dataTransfer.dropEffect = 'move';
    if (dragOverTargetId !== targetId) {
      setDragOverTargetId(targetId);
    }
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    setDragOverTargetId(null);
  };

  const handleDropOnFolder = (e: React.DragEvent, folderId: string | null) => {
    e.preventDefault();
    setDragOverTargetId(null);
    if (!draggedSetId) return;

    const draggedSet = (sets || []).find(s => s.id === draggedSetId);
    if (draggedSet && draggedSet.folderId !== folderId) {
      // Move to new folder
      const updatedSets = (sets || []).map(s => 
        s.id === draggedSetId ? { ...s, folderId } : s
      );
      saveSets(updatedSets);
    }
    setDraggedSetId(null);
  };

  const handleDropOnSet = (e: React.DragEvent, targetSetId: string) => {
    e.preventDefault();
    setDragOverTargetId(null);
    if (!draggedSetId || draggedSetId === targetSetId) {
      setDraggedSetId(null);
      return;
    }

    const draggedIndex = sets.findIndex(s => s.id === draggedSetId);
    const targetIndex = sets.findIndex(s => s.id === targetSetId);
    
    if (draggedIndex !== -1 && targetIndex !== -1) {
      const newSets = [...sets];
      const [draggedItem] = newSets.splice(draggedIndex, 1);
      newSets.splice(targetIndex, 0, draggedItem);
      saveSets(newSets);
    }
    setDraggedSetId(null);
  };

  const handleDragEnd = () => {
    setDraggedSetId(null);
    setDragOverTargetId(null);
  };

  // --- Render Helpers ---
  const currentFolder = folders.find(f => f.id === currentFolderId);
  const displayedFolders = currentFolderId === null ? folders : [];
  const displayedSets = sets.filter(s => (s.folderId || null) === currentFolderId);

  return (
    <div className="p-6 space-y-6">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h2 className="text-2xl font-bold flex items-center gap-2">
            Question Sets
          </h2>
          <p className="text-muted-foreground text-sm">Organize and bundle your extracted questions.</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button variant="outline" onClick={() => setIsFolderModalOpen(true)}>
            <FolderPlus className="w-4 h-4 mr-2" /> New Folder
          </Button>
          <Button onClick={onCreateSetClick} className="bg-blue-600 hover:bg-blue-700 text-white">
            <Database className="w-4 h-4 mr-2" /> Create Set from Cloud DB
          </Button>
          <Button variant="outline" onClick={() => setIsSetModalOpen(true)}>
            <Plus className="w-4 h-4 mr-2" /> New Empty Set
          </Button>
        </div>
      </div>

      {/* Breadcrumbs */}
      <div className="flex items-center gap-2 text-sm bg-muted/50 p-2 rounded-lg">
        <Button 
          variant="ghost" 
          size="sm" 
          className={`h-8 px-2 ${dragOverTargetId === 'root' ? 'bg-blue-100 border-blue-400 border-dashed border-2' : ''}`} 
          onClick={() => setCurrentFolderId(null)}
          onDragOver={(e) => handleDragOver(e, 'root')}
          onDragLeave={handleDragLeave}
          onDrop={(e) => handleDropOnFolder(e, null)}
        >
          <FolderOpen className="w-4 h-4 mr-2 text-yellow-500" /> Home
        </Button>
        {currentFolder && (
          <>
            <span className="text-muted-foreground">/</span>
            <span className="font-semibold flex items-center gap-2 px-2">
              <FolderOpen className="w-4 h-4 text-yellow-500" /> {currentFolder.name}
            </span>
          </>
        )}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
        {/* Render Folders */}
        {(displayedFolders || []).map(folder => (
          <Card 
            key={folder.id} 
            className={`hover:shadow-md transition-shadow border-yellow-200 cursor-pointer ${
              dragOverTargetId === folder.id ? 'bg-blue-50 border-blue-400 border-dashed border-2' : 'bg-yellow-50/30'
            }`} 
            onClick={() => setCurrentFolderId(folder.id)}
            onDragOver={(e) => handleDragOver(e, folder.id)}
            onDragLeave={handleDragLeave}
            onDrop={(e) => handleDropOnFolder(e, folder.id)}
          >
            <CardHeader className="pb-2">
              <CardTitle className="flex items-center justify-between text-lg">
                <div className="flex items-center gap-2">
                  <FolderOpen className="w-5 h-5 text-yellow-500 fill-yellow-500" />
                  {folder.name}
                </div>
                <Button variant="ghost" size="icon" className="h-6 w-6 text-muted-foreground hover:text-red-600" onClick={(e) => { e.stopPropagation(); deleteFolder(folder.id); }}>
                  <Trash2 className="w-3 h-3" />
                </Button>
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-center justify-between">
                <p className="text-xs text-muted-foreground">
                  {sets.filter(s => s.folderId === folder.id).length} Sets inside
                </p>
                <Button variant="ghost" size="sm" className="h-6 text-xs" onClick={(e) => { e.stopPropagation(); exportFolder(folder.id); }}>
                  <Download className="w-3 h-3 mr-1" /> Export
                </Button>
              </div>
            </CardContent>
          </Card>
        ))}

        {/* Render Sets */}
        {(displayedSets || []).map(set => (
          <Card 
            key={set.id} 
            draggable
            onDragStart={(e) => handleDragStart(e, set.id)}
            onDragOver={(e) => handleDragOver(e, set.id)}
            onDragLeave={handleDragLeave}
            onDrop={(e) => handleDropOnSet(e, set.id)}
            onDragEnd={handleDragEnd}
            className={`hover:shadow-md transition-shadow flex flex-col cursor-grab active:cursor-grabbing ${
              draggedSetId === set.id ? 'opacity-50' : ''
            } ${
              dragOverTargetId === set.id ? 'border-blue-400 border-dashed border-2 bg-blue-50/30' : ''
            }`}
          >
            <CardHeader className="pb-2">
              <CardTitle className="flex items-center gap-2 text-lg">
                <FileText className="w-5 h-5 text-blue-500" />
                <span className="truncate" title={set.name}>{set.name}</span>
              </CardTitle>
              <CardDescription className="text-xs">
                Created: {new Date(set.createdAt).toLocaleDateString()}
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4 flex-1 flex flex-col justify-end">
              <div className="text-sm font-medium bg-muted/50 p-2 rounded flex justify-between">
                <span>Total Questions:</span>
                <span>{set.questions.length}</span>
              </div>
              <div className="flex gap-2 justify-end mt-auto">
                <Button variant="outline" size="sm" onClick={() => setViewingSet(set)} className="flex-1">
                  <Edit className="w-3 h-3 mr-1" /> View
                </Button>
                <Button variant="outline" size="sm" onClick={() => exportSet(set)} className="flex-1">
                  <Download className="w-3 h-3 mr-1" /> Export
                </Button>
                <Button variant="destructive" size="sm" onClick={() => deleteSet(set.id)}>
                  <Trash2 className="w-3 h-3" />
                </Button>
              </div>
            </CardContent>
          </Card>
        ))}

        {displayedFolders.length === 0 && displayedSets.length === 0 && (
          <div className="col-span-full text-center p-12 text-muted-foreground border rounded-lg border-dashed">
            This folder is empty. Create a new set or import from Cloud DB.
          </div>
        )}
      </div>

      {/* --- Modals --- */}

      {/* Create Folder Modal */}
      <Dialog open={isFolderModalOpen} onOpenChange={setIsFolderModalOpen}>
        <DialogContent>
          <DialogHeader><DialogTitle>Create New Folder</DialogTitle></DialogHeader>
          <div className="space-y-4 py-4">
            <Label>Folder Name</Label>
            <Input value={newFolderName} onChange={e => setNewFolderName(e.target.value)} placeholder="e.g., Physics 2024" onKeyDown={e => e.key === 'Enter' && createFolder()} />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsFolderModalOpen(false)}>Cancel</Button>
            <Button onClick={createFolder} disabled={!newFolderName.trim()}>Create Folder</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Create Empty Set Modal */}
      <Dialog open={isSetModalOpen} onOpenChange={setIsSetModalOpen}>
        <DialogContent>
          <DialogHeader><DialogTitle>Create New Set</DialogTitle></DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label>Set Name</Label>
              <Input value={newSetName} onChange={e => setNewSetName(e.target.value)} placeholder="e.g., Chapter 1 Quiz" onKeyDown={e => e.key === 'Enter' && createSet()} />
            </div>
            <div className="space-y-2">
              <Label>Folder</Label>
              <Select value={newSetFolderId} onValueChange={setNewSetFolderId}>
                <SelectTrigger>
                  <SelectValue placeholder="Select a folder..." />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="root">Root (No Folder)</SelectItem>
                  {(folders || []).map(f => <SelectItem key={f.id} value={f.id}>{f.name}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsSetModalOpen(false)}>Cancel</Button>
            <Button onClick={createSet} disabled={!newSetName.trim()}>Create Set</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* View/Edit Set Modal */}
      {viewingSet && (
        <QuestionSetViewer 
          questions={viewingSet.questions} 
          onClose={() => setViewingSet(null)} 
        />
      )}

      {/* Delete Set Confirmation */}
      <Dialog open={!!setToDelete} onOpenChange={(open) => !open && setSetToDelete(null)}>
        <DialogContent>
          <DialogHeader><DialogTitle>Delete Question Set</DialogTitle></DialogHeader>
          <div className="py-4">
            Are you sure you want to delete this set? This action cannot be undone.
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setSetToDelete(null)}>Cancel</Button>
            <Button variant="destructive" onClick={confirmDeleteSet}>Delete Set</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Folder Confirmation */}
      <Dialog open={!!folderToDelete} onOpenChange={(open) => !open && setFolderToDelete(null)}>
        <DialogContent>
          <DialogHeader><DialogTitle>Delete Folder</DialogTitle></DialogHeader>
          <div className="py-4">
            Delete this folder? All sets inside will be moved to the root directory.
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setFolderToDelete(null)}>Cancel</Button>
            <Button variant="destructive" onClick={confirmDeleteFolder}>Delete Folder</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Alert Modal */}
      <Dialog open={!!alertMsg} onOpenChange={(open) => !open && setAlertMsg(null)}>
        <DialogContent>
          <DialogHeader><DialogTitle>Alert</DialogTitle></DialogHeader>
          <div className="py-4">{alertMsg}</div>
          <DialogFooter>
            <Button onClick={() => setAlertMsg(null)}>OK</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
