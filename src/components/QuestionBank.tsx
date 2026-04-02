import React, { useState, useEffect } from 'react';
import { GoogleGenAI } from '@google/genai';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Folder, Loader2, Database, Search, ArrowLeft, FileText, RefreshCw, Clock, ExternalLink, BookOpen, Layout, LayoutGrid, List, Edit, Trash2, Tag, Copy, Plus, Check, ChevronDown, X, AlertCircle, ChevronRight, FolderPlus, Move, Sparkles } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { safeJson } from '../utils';
import QuestionEditModal from './QuestionEditModal';
import { Question } from '../types';
import { AnimatePresence, motion } from 'motion/react';

export default function QuestionBank() {
  const [tables, setTables] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [selectedFolder, setSelectedFolder] = useState<string | null>(null);
  const [questions, setQuestions] = useState<any[]>([]);
  const [displayCount, setDisplayCount] = useState(100);
  const [loadingQuestions, setLoadingQuestions] = useState(false);
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
  const [search, setSearch] = useState('');
  const [syncStatus, setSyncStatus] = useState<Record<string, { lastSync: string, totalQuestions: number }>>({});
  const [syncingTables, setSyncingTables] = useState<Record<string, boolean>>({});
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [isBulkEditModalOpen, setIsBulkEditModalOpen] = useState(false);
  const [isBulkAIEditModalOpen, setIsBulkAIEditModalOpen] = useState(false);
  const [isBulkTagModalOpen, setIsBulkTagModalOpen] = useState(false);
  const [isCopyToTestModalOpen, setIsCopyToTestModalOpen] = useState(false);
  const [isMoveToFolderModalOpen, setIsMoveToFolderModalOpen] = useState(false);
  const [bulkEditData, setBulkEditData] = useState<Partial<Question>>({});
  const [fieldsToUpdate, setFieldsToUpdate] = useState<Set<string>>(new Set());
  const [aiEditType, setAiEditType] = useState('Solution Add / Change');
  const [aiEditAction, setAiEditAction] = useState('');
  const [aiCustomPrompt, setAiCustomPrompt] = useState('');
  const [aiLanguage, setAiLanguage] = useState('Hindi');
  const [bulkTag, setBulkTag] = useState('');
  const [testName, setTestName] = useState('');
  const [isSelectDropdownOpen, setIsSelectDropdownOpen] = useState(false);
  const [renamingFolder, setRenamingFolder] = useState<string | null>(null);
  const [newFolderName, setNewFolderName] = useState('');
  const [isDeletingFolder, setIsDeletingFolder] = useState<string | null>(null);
  const [deleteConfirmFolder, setDeleteConfirmFolder] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Edit Modal States
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [editingQuestion, setEditingQuestion] = useState<Question | null>(null);
  const [editingIndex, setEditingIndex] = useState(-1);

  const [isSyncingAll, setIsSyncingAll] = useState(false);
  const [syncResults, setSyncResults] = useState<any>(null);
  const [currentPath, setCurrentPath] = useState<string[]>([]);
  const [isCreateFolderModalOpen, setIsCreateFolderModalOpen] = useState(false);
  const [isMoveModalOpen, setIsMoveModalOpen] = useState(false);
  const [newSubfolderName, setNewSubfolderName] = useState('');
  const [isCopying, setIsCopying] = useState(false); // To distinguish between move and copy
  const [targetFolderForMove, setTargetFolderForMove] = useState<string | null>(null);
  const [allFolders, setAllFolders] = useState<any[]>([]);

  // Filter States
  const [filterSubject, setFilterSubject] = useState<string>('');
  const [filterDifficulty, setFilterDifficulty] = useState<string>('');
  const [filterType, setFilterType] = useState<string>('');
  const [filterStatus, setFilterStatus] = useState<string>('');

  useEffect(() => {
    fetchTables();
  }, []);

  const handleSyncAllAirtable = async () => {
    setIsSyncingAll(true);
    try {
      const res = await fetch('/api/sync-all-airtable', { method: 'POST' });
      const data = await res.json();
      if (res.ok) {
        setSyncResults(data.results);
        fetchTables();
        alert("Sync all from Airtable completed successfully!");
      } else {
        alert(data.error || "Failed to sync all tables");
      }
    } catch (e) {
      console.error(e);
      alert("An error occurred during sync all.");
    }
    setIsSyncingAll(false);
  };

  const handleSyncAllSupabase = async () => {
    if (!confirm("Are you sure you want to sync all Supabase data to Airtable? This will update existing records and create new ones for any unsynced questions.")) return;
    
    setIsSyncingAll(true);
    try {
      const res = await fetch('/api/sync-all-to-airtable', { method: 'POST' });
      const data = await res.json();
      if (res.ok) {
        setSyncResults(data.results);
        fetchTables();
        alert("Sync all to Airtable completed successfully!");
      } else {
        alert(data.error || "Failed to sync to Airtable");
      }
    } catch (e) {
      console.error(e);
      alert("An error occurred during sync to Airtable.");
    }
    setIsSyncingAll(false);
  };

  const fetchTables = async () => {
    setLoading(true);
    setError(null);
    try {
      const [tablesRes, serverFoldersRes, syncRes] = await Promise.all([
        fetch('/api/get-airtable-tables').catch(() => null),
        fetch('/api/get-server-folders').catch(() => null),
        fetch('/api/get-sync-status').catch(() => null)
      ]);
      
      let airtableTables: any[] = [];
      if (tablesRes && tablesRes.ok) {
        const tablesData = await safeJson(tablesRes);
        if (tablesData.tables) {
          airtableTables = tablesData.tables.map((t: any) => ({ ...t, isTable: true, fullPath: t.name }));
        }
      }
      
      let serverFolders: any[] = [];
      if (serverFoldersRes && serverFoldersRes.ok) {
        const foldersData = await safeJson(serverFoldersRes);
        if (foldersData.folders) {
          serverFolders = foldersData.folders;
          setAllFolders(serverFolders);
        }
      }
      
      const combinedFolders = [
        ...airtableTables,
        ...serverFolders.filter((sf: any) => !airtableTables.find((at: any) => at.name === sf.name))
          .map((sf: any) => ({ 
            id: sf.id, 
            name: sf.name.split('/').pop(), 
            fullPath: sf.name,
            isTable: false 
          }))
      ];
      
      setTables(combinedFolders);

      if (syncRes && syncRes.ok) {
        const syncData = await safeJson(syncRes);
        if (syncData.syncStatus) {
          setSyncStatus(syncData.syncStatus);
        }
      }
    } catch (e: any) {
      console.error(e);
      setError(e.message || "An unexpected error occurred while fetching folders.");
    }
    setLoading(false);
  };

  const getFoldersAtCurrentPath = () => {
    const pathStr = currentPath.join('/');
    const subfolders = new Set<string>();
    
    tables.forEach(t => {
      const name = t.name;
      if (pathStr === "") {
        // Root level: show top-level parts of all paths
        const parts = name.split('/');
        subfolders.add(parts[0]);
      } else if (name.startsWith(pathStr + '/')) {
        // Inside a folder: show next part of paths starting with pathStr
        const relativePath = name.substring(pathStr.length + 1);
        const parts = relativePath.split('/');
        subfolders.add(parts[0]);
      }
    });
    
    return Array.from(subfolders).map(name => {
      const fullPath = pathStr ? `${pathStr}/${name}` : name;
      const tableInfo = tables.find(t => t.name === fullPath);
      return {
        id: tableInfo?.id || fullPath,
        name: name,
        fullPath: fullPath,
        source: tableInfo?.source || 'server',
        isTable: !!tableInfo
      };
    });
  };

  const handlePushToAirtable = async (tableName: string, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    if (!confirm(`Are you sure you want to push all Supabase questions for "${tableName}" to Airtable? This will create new records in Airtable.`)) return;
    
    setSyncingTables(prev => ({ ...prev, [tableName]: true }));
    try {
      // 1. Fetch questions from Supabase
      const res = await fetch('/api/get-airtable-records', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ tableName })
      });
      const data = await res.json();
      
      if (res.ok && data.records && data.records.length > 0) {
        // 2. Push to Airtable
        const pushRes = await fetch('/api/save-to-airtable', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ tableName, questions: data.records })
        });
        
        if (pushRes.ok) {
          alert(`Successfully pushed ${data.records.length} questions to Airtable for "${tableName}"`);
        } else {
          const pushData = await pushRes.json();
          alert(pushData.error || "Failed to push to Airtable");
        }
      } else {
        alert("No questions found in Supabase to push.");
      }
    } catch (e) {
      console.error(e);
      alert("An error occurred during push to Airtable.");
    }
    setSyncingTables(prev => ({ ...prev, [tableName]: false }));
  };

  const handleSync = async (tableName: string, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    setSyncingTables(prev => ({ ...prev, [tableName]: true }));
    try {
      await fetch('/api/get-airtable-records', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ tableName, forceSync: true })
      });
      
      const syncRes = await fetch('/api/get-sync-status');
      const syncData = await safeJson(syncRes);
      if (syncData.syncStatus) {
        setSyncStatus(syncData.syncStatus);
      }

      if (selectedFolder === tableName) {
        openFolder(tableName);
      }
    } catch (e) {
      console.error(e);
    }
    setSyncingTables(prev => ({ ...prev, [tableName]: false }));
  };

  const openFolder = async (path: string) => {
    const parts = path.split('/');
    setCurrentPath(parts);
    setSelectedFolder(path);
    setLoadingQuestions(true);
    setDisplayCount(100);
    setSelectedIds(new Set());
    try {
      const res = await fetch('/api/get-airtable-records', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          tableName: parts[0], // The Airtable table is the root of the path
          collectionPath: path 
        })
      });
      const data = await safeJson(res);
      if (!res.ok) {
        console.error("Failed to fetch questions:", data.error);
        alert("Failed to load questions: " + (data.error || "Unknown error"));
      }
      setQuestions(data.records || []);
    } catch (e) {
      console.error(e);
      alert("An error occurred while loading questions.");
    }
    setLoadingQuestions(false);
  };

  const handleBulkUpdate = async (dataToUpdate: any) => {
    try {
      const response = await fetch('/api/bulk-update-questions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ids: Array.from(selectedIds), data: dataToUpdate }),
      });
      if (!response.ok) throw new Error('Failed to update questions');
      
      // Refresh questions
      if (selectedFolder) {
        await openFolder(selectedFolder);
      }
      setIsBulkEditModalOpen(false);
      setIsBulkTagModalOpen(false);
      setIsCopyToTestModalOpen(false);
      setIsMoveToFolderModalOpen(false);
      setSelectedIds(new Set());
      alert('Questions updated successfully!');
    } catch (error) {
      console.error('Bulk update error:', error);
      alert('Failed to update questions.');
    }
  };

  const handleCreateSubfolder = async () => {
    if (!newSubfolderName) return;
    const parentPath = currentPath.join('/');
    try {
      const res = await fetch('/api/create-folder', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: newSubfolderName, parentPath })
      });
      if (res.ok) {
        const data = await res.json();
        setIsCreateFolderModalOpen(false);
        setNewSubfolderName('');
        // To show the folder, we might need a dummy question or just refresh
        // For now, let's just add it to the local tables list if it doesn't exist
        if (!tables.find(t => t.name === data.path)) {
          setTables(prev => [...prev, { id: `new-${data.path}`, name: data.path, source: 'server' }]);
        }
      }
    } catch (e) {
      console.error(e);
    }
  };

  const handleBulkMove = async (isCopy: boolean = false) => {
    if (selectedIds.size === 0 || !targetFolderForMove) return;
    
    const endpoint = isCopy ? '/api/copy-questions' : '/api/move-questions';
    try {
      const res = await fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          ids: Array.from(selectedIds), 
          targetFolder: targetFolderForMove,
          targetTable: targetFolderForMove.split('/')[0]
        })
      });
      if (res.ok) {
        alert(`Successfully ${isCopy ? 'copied' : 'moved'} ${selectedIds.size} questions.`);
        setIsMoveToFolderModalOpen(false);
        setSelectedIds(new Set());
        if (selectedFolder) openFolder(selectedFolder);
        fetchTables();
      } else {
        const data = await res.json();
        alert(data.error || "Failed to complete operation");
      }
    } catch (e) {
      console.error(e);
      alert("An error occurred.");
    }
  };

  const handleEditClick = (q: any) => {
    const idx = questions.findIndex(item => item.id === q.id);
    setEditingIndex(idx);
    
    const mapped: Question = {
      id: q.id,
      text: q.question_hin || q.question_eng || q.text || q.Question || q.Name || q.question || '',
      options: [
        q.option1_hin || q.option1_eng || q.options?.[0] || '',
        q.option2_hin || q.option2_eng || q.options?.[1] || '',
        q.option3_hin || q.option3_eng || q.options?.[2] || '',
        q.option4_hin || q.option4_eng || q.options?.[3] || '',
        q.option5_hin || q.option5_eng || q.options?.[4] || ''
      ].filter(Boolean),
      correctOption: q.answer || q.correctOption || '',
      status: q.current_status || q.status || 'Draft',
      subject: q.subject || '',
      difficulty: q.difficulty || 'Medium',
      type: q.type || 'MCQ Single',
      page_no: q.page_no,
      ...q
    };
    
    setEditingQuestion(mapped);
    setIsEditModalOpen(true);
  };

  const handleModalNext = () => {
    if (editingIndex < questions.length - 1) {
      const nextIdx = editingIndex + 1;
      setEditingIndex(nextIdx);
      handleEditClick(questions[nextIdx]);
    }
  };

  const handleModalPrevious = () => {
    if (editingIndex > 0) {
      const prevIdx = editingIndex - 1;
      setEditingIndex(prevIdx);
      handleEditClick(questions[prevIdx]);
    }
  };

  const handleModalSave = async (updated: Question) => {
    try {
      const response = await fetch('/api/update-question', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ question: updated })
      });
      
      if (!response.ok) throw new Error('Failed to update question');
      
      setQuestions(prev => {
        const updatedList = [...prev];
        const idx = updatedList.findIndex(q => q.id === updated.id);
        if (idx !== -1) {
          updatedList[idx] = { ...updatedList[idx], ...updated };
        }
        return updatedList;
      });
      
      setIsEditModalOpen(false);
      setEditingQuestion(null);
      setEditingIndex(-1);
    } catch (error) {
      console.error('Error updating question:', error);
      alert('Failed to update question');
    }
  };

  const toggleSelection = (id: string) => {
    setSelectedIds(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const selectAll = (all: boolean = true) => {
    if (all) {
      setSelectedIds(new Set(filteredQuestions.map(q => q.id)));
    } else {
      setSelectedIds(new Set(filteredQuestions.slice(0, displayCount).map(q => q.id)));
    }
  };

  const clearSelection = () => setSelectedIds(new Set());
  
  const handleRenameFolder = async (oldName: string) => {
    if (!newFolderName.trim() || newFolderName === oldName) {
      setRenamingFolder(null);
      return;
    }
    
    try {
      const res = await fetch('/api/rename-folder', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ oldName, newName: newFolderName.trim() })
      });
      
      if (res.ok) {
        setTables(prev => prev.map(t => t.name === oldName ? { ...t, name: newFolderName.trim() } : t));
        setRenamingFolder(null);
        setNewFolderName('');
        fetchTables(); // Refresh to ensure everything is in sync
      } else {
        const data = await res.json();
        alert(data.error || "Failed to rename folder");
      }
    } catch (e) {
      console.error(e);
      alert("An error occurred while renaming the folder.");
    }
  };

  const handleDeleteFolder = async (folderName: string) => {
    setDeleteConfirmFolder(null);
    setIsDeletingFolder(folderName);
    try {
      const res = await fetch('/api/delete-folder', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ folderName })
      });
      
      if (res.ok) {
        setTables(prev => prev.filter(t => t.name !== folderName));
        setIsDeletingFolder(null);
        fetchTables(); // Refresh
      } else {
        const data = await res.json();
        setErrorMessage(data.error || "Failed to delete folder");
      }
    } catch (e) {
      console.error(e);
      setErrorMessage("An error occurred while deleting the folder.");
    }
    setIsDeletingFolder(null);
  };

  const sleep = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

  const handleBulkAIEdit = async () => {
    console.log('Bulk AI Edit clicked');
    const selectedQuestions = questions.filter(q => selectedIds.has(q.id));
    console.log('Selected questions:', selectedQuestions);
    
    if (selectedQuestions.length === 0) {
      alert('No questions selected!');
      return;
    }
    
    try {
      // Use process.env.GEMINI_API_KEY as per instructions
      const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY || process.env.API_KEY });
      
      const batchSize = 3; // Reduced batch size to be safer
      const delay = 3000; // Increased delay to 3 seconds
      const updatedQuestions: any[] = [];

      for (let i = 0; i < selectedQuestions.length; i += batchSize) {
        const batch = selectedQuestions.slice(i, i + batchSize);
        console.log(`Processing batch ${i / batchSize + 1} of ${Math.ceil(selectedQuestions.length / batchSize)}`);
        
        const batchResults = await Promise.all(batch.map(async (q: any) => {
          let prompt = '';
          if (aiEditType === 'Solution Add / Change') {
            prompt = `For the following question, ${aiEditAction}. Return the updated question object in JSON format.\n\nQuestion: ${JSON.stringify(q)}`;
          } else if (aiEditType === 'Language Variation') {
            prompt = `Translate the following question and its options to ${aiLanguage}. Return the updated question object in JSON format.\n\nQuestion: ${JSON.stringify(q)}`;
          } else {
            prompt = `${aiCustomPrompt}\n\nQuestion: ${JSON.stringify(q)}`;
          }

          console.log('Prompt:', prompt);
          const response = await ai.models.generateContent({
            model: 'gemini-3.1-flash-lite-preview',
            contents: prompt,
            config: { responseMimeType: 'application/json' }
          });
          
          console.log('AI Response:', response.text);
          const updatedQ = JSON.parse(response.text || '{}');
          return { ...q, ...updatedQ, id: q.id };
        }));
        
        updatedQuestions.push(...batchResults);
        
        if (i + batchSize < selectedQuestions.length) {
          console.log(`Waiting ${delay}ms before next batch...`);
          await sleep(delay);
        }
      }

      // Update in database
      const response = await fetch('/api/bulk-update-questions-individual', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          questions: updatedQuestions
        })
      });
      
      if (!response.ok) throw new Error('Bulk AI Edit failed');
      
      // Update local state
      setQuestions(prev => prev.map(q => updatedQuestions.find((uq: Question) => uq.id === q.id) || q));
      setIsBulkAIEditModalOpen(false);
    } catch (error) {
      console.error('Bulk AI Edit error:', error);
      alert('Failed to apply AI edits: ' + error);
    }
  };

  const filteredTables = tables.filter(t => t.name.toLowerCase().includes(search.toLowerCase()));

  const filteredQuestions = questions.filter(q => {
    if (filterSubject && q.subject !== filterSubject) return false;
    if (filterDifficulty && q.difficulty !== filterDifficulty) return false;
    if (filterType && q.type !== filterType) return false;
    if (filterStatus && (q.current_status || q.status) !== filterStatus) return false;
    return true;
  });

  return (
    <div className="h-full flex flex-col overflow-hidden">
      {selectedFolder ? (
        <div className="p-2 sm:p-4 max-w-7xl mx-auto flex flex-col h-full bg-white w-full overflow-hidden">
          {/* Bulk Action Bar */}
          <AnimatePresence>
            {selectedIds.size > 0 && (
              <motion.div 
                initial={{ height: 0, opacity: 0 }}
                animate={{ height: 'auto', opacity: 1 }}
                exit={{ height: 0, opacity: 0 }}
                className="overflow-hidden"
              >
                <div className="bg-blue-50/50 border border-blue-100 rounded-xl p-2 mb-3 flex flex-wrap items-center gap-2">
                  <div className="flex items-center gap-2 px-3 border-r border-blue-100 mr-1">
                    <span className="text-sm font-bold text-blue-700">{selectedIds.size} selected</span>
                  </div>
                  
                  <div className="flex flex-wrap gap-2">
                    <Button 
                      variant="outline" 
                      size="sm" 
                      onClick={() => setIsBulkTagModalOpen(true)}
                      className="h-8 text-[11px] font-bold text-indigo-600 border-indigo-100 bg-white hover:bg-indigo-50 gap-1.5"
                    >
                      <Tag className="w-3.5 h-3.5" />
                      Bulk Tag
                    </Button>
                    
                    <Button 
                      variant="outline" 
                      size="sm" 
                      onClick={() => setIsBulkAIEditModalOpen(true)}
                      className="h-8 text-[11px] font-bold text-purple-600 border-purple-100 bg-white hover:bg-purple-50 gap-1.5"
                    >
                      <Sparkles className="w-3.5 h-3.5" />
                      Bulk AI Edit
                    </Button>
                    
                    <Button 
                      variant="outline" 
                      size="sm" 
                      onClick={() => {
                        setBulkEditData({});
                        setFieldsToUpdate(new Set());
                        setIsBulkEditModalOpen(true);
                      }}
                      className="h-8 text-[11px] font-bold text-pink-600 border-pink-100 bg-white hover:bg-pink-50 gap-1.5"
                    >
                      <Edit className="w-3.5 h-3.5" />
                      Bulk Edit
                    </Button>
                    
                    <Button 
                      variant="outline" 
                      size="sm" 
                      onClick={() => { setIsCopying(false); setIsMoveModalOpen(true); }}
                      className="h-8 text-[11px] font-bold text-blue-600 border-blue-100 bg-white hover:bg-blue-50 gap-1.5"
                    >
                      <Move className="w-3.5 h-3.5" />
                      Move
                    </Button>

                    <Button 
                      variant="outline" 
                      size="sm" 
                      onClick={() => { setIsCopying(true); setIsMoveModalOpen(true); }}
                      className="h-8 text-[11px] font-bold text-emerald-600 border-emerald-100 bg-white hover:bg-emerald-50 gap-1.5"
                    >
                      <Copy className="w-3.5 h-3.5" />
                      Copy
                    </Button>

                    <Button 
                      variant="outline" 
                      size="sm" 
                      onClick={() => setIsCopyToTestModalOpen(true)}
                      className="h-8 text-[11px] font-bold text-orange-600 border-orange-100 bg-white hover:bg-orange-50 gap-1.5"
                    >
                      <FileText className="w-3.5 h-3.5" />
                      Copy to Test
                    </Button>
                    
                    <Button 
                      variant="ghost" 
                      size="sm" 
                      onClick={clearSelection}
                      className="h-8 text-[11px] font-bold text-slate-400 hover:text-slate-600 gap-1.5"
                    >
                      <X className="w-3.5 h-3.5" />
                      Clear Selection
                    </Button>
                  </div>
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          <div className="flex items-center gap-2 mb-2 border-b pb-2 shrink-0">
            <div className="flex items-center gap-2">
              <div className="relative">
                <Button 
                  variant="outline" 
                  size="sm" 
                  className="h-8 px-3 text-[11px] font-bold gap-1.5"
                  onClick={() => setIsSelectDropdownOpen(!isSelectDropdownOpen)}
                >
                  Select <ChevronDown className="w-3.5 h-3.5" />
                </Button>
                {isSelectDropdownOpen && (
                  <div className="absolute top-full left-0 mt-1 w-48 bg-white border rounded-xl shadow-xl z-50 p-1">
                    <button 
                      onClick={() => {
                        selectAll(false);
                        setIsSelectDropdownOpen(false);
                      }}
                      className="w-full text-left px-3 py-2 text-[11px] font-bold text-slate-600 hover:bg-slate-50 rounded-lg"
                    >
                      Select current view ({Math.min(displayCount, filteredQuestions.length)})
                    </button>
                    <button 
                      onClick={() => {
                        selectAll(true);
                        setIsSelectDropdownOpen(false);
                      }}
                      className="w-full text-left px-3 py-2 text-[11px] font-bold text-slate-600 hover:bg-slate-50 rounded-lg"
                    >
                      Select all questions ({filteredQuestions.length})
                    </button>
                  </div>
                )}
              </div>
            </div>

            <Button variant="ghost" size="sm" onClick={() => setSelectedFolder(null)} className="text-slate-500 hover:text-slate-900 h-8 px-2">
              <ArrowLeft className="w-4 h-4 mr-1" /> Back
            </Button>
            <h2 className="text-lg font-bold flex items-center gap-2 truncate">
              <Folder className="w-5 h-5 text-blue-500 fill-blue-100" />
              {selectedFolder}
            </h2>
            
            <Button 
              variant="outline" 
              size="sm" 
              className="ml-2 gap-1 h-8 px-2"
              onClick={() => handleSync(selectedFolder)}
              disabled={syncingTables[selectedFolder]}
            >
              <RefreshCw className={`w-3.5 h-3.5 ${syncingTables[selectedFolder] ? 'animate-spin' : ''}`} />
              <span className="hidden sm:inline">{syncingTables[selectedFolder] ? 'Syncing...' : 'Sync'}</span>
            </Button>

            <div className="ml-auto flex items-center gap-2">
              <div className="text-[10px] text-slate-500 hidden md:flex items-center gap-1">
                <Clock className="w-3 h-3" />
                {syncStatus[selectedFolder]?.lastSync ? new Date(syncStatus[selectedFolder].lastSync).toLocaleString() : 'Never'}
              </div>
              <div className="text-[10px] font-bold text-slate-500 bg-slate-100 px-2 py-0.5 rounded-full">
                {filteredQuestions.length} Qs
              </div>
              <div className="flex gap-1 border-l pl-2 border-slate-200">
                <Button 
                  variant={viewMode === 'grid' ? 'secondary' : 'ghost'} 
                  size="sm" 
                  className="h-7 px-2" 
                  onClick={() => setViewMode('grid')}
                  title="Grid View"
                >
                  <LayoutGrid className="w-3.5 h-3.5" />
                </Button>
                <Button 
                  variant={viewMode === 'list' ? 'secondary' : 'ghost'} 
                  size="sm" 
                  className="h-7 px-2" 
                  onClick={() => setViewMode('list')}
                  title="List View"
                >
                  <List className="w-3.5 h-3.5" />
                </Button>
              </div>
            </div>
          </div>

          {/* Filters */}
          <div className="flex flex-wrap items-center gap-2 mb-4">
            <select
              className="bg-white border border-slate-200 rounded-lg px-3 py-1.5 text-xs font-bold text-slate-700 outline-none"
              value={filterSubject}
              onChange={e => setFilterSubject(e.target.value)}
            >
              <option value="">All Subjects</option>
              <option value="Math">Math</option>
              <option value="Science">Science</option>
              <option value="Geography">Geography</option>
              <option value="History">History</option>
            </select>
            
            <select
              className="bg-white border border-slate-200 rounded-lg px-3 py-1.5 text-xs font-bold text-slate-700 outline-none"
              value={filterDifficulty}
              onChange={e => setFilterDifficulty(e.target.value)}
            >
              <option value="">All Difficulties</option>
              <option value="Easy">Easy</option>
              <option value="Medium">Medium</option>
              <option value="Hard">Hard</option>
            </select>

            <select
              className="bg-white border border-slate-200 rounded-lg px-3 py-1.5 text-xs font-bold text-slate-700 outline-none"
              value={filterType}
              onChange={e => setFilterType(e.target.value)}
            >
              <option value="">All Types</option>
              <option value="MCQ">MCQ</option>
              <option value="Subjective">Subjective</option>
            </select>

            <select
              className="bg-white border border-slate-200 rounded-lg px-3 py-1.5 text-xs font-bold text-slate-700 outline-none"
              value={filterStatus}
              onChange={e => setFilterStatus(e.target.value)}
            >
              <option value="">All Statuses</option>
              <option value="Draft">Draft</option>
              <option value="Published">Published</option>
            </select>

            {(filterSubject || filterDifficulty || filterType || filterStatus) && (
              <Button 
                variant="ghost" 
                size="sm" 
                onClick={() => {
                  setFilterSubject('');
                  setFilterDifficulty('');
                  setFilterType('');
                  setFilterStatus('');
                }}
                className="h-8 text-[11px] font-bold text-slate-500 hover:text-slate-900 gap-1.5"
              >
                <X className="w-3.5 h-3.5" />
                Clear Filters
              </Button>
            )}
          </div>

          {loadingQuestions ? (
            <div className="flex-1 flex items-center justify-center">
              <Loader2 className="w-8 h-8 animate-spin text-blue-500" />
            </div>
          ) : (
            <div className="flex-1 overflow-y-auto pb-8">
              {viewMode === 'grid' ? (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                  {filteredQuestions.slice(0, displayCount).map((q, idx) => (
                    <div key={q.id || idx} className={`bg-white border rounded-xl p-3 shadow-sm hover:shadow-md transition-all flex flex-col relative group ${selectedIds.has(q.id) ? 'border-blue-400 ring-1 ring-blue-400/20' : 'border-slate-200'}`}>
                      <div className="flex items-center justify-between mb-2">
                        <div className="flex items-center gap-1.5">
                          <div className="relative">
                            <input 
                              type="checkbox" 
                              checked={selectedIds.has(q.id)}
                              onChange={() => toggleSelection(q.id)}
                              className="w-4 h-4 rounded border-slate-300 text-blue-600 focus:ring-blue-500 cursor-pointer"
                            />
                          </div>
                          <div className="w-5 h-5 rounded-full bg-blue-50 text-blue-600 flex items-center justify-center font-bold text-[9px]">
                            {idx + 1}
                          </div>
                          <div className={`w-1.5 h-1.5 rounded-full ${q.current_status === 'Published' || q.status === 'Published' ? 'bg-green-500' : 'bg-slate-300'}`}></div>
                          <span className="text-[8px] font-bold text-slate-400 uppercase tracking-tighter">
                            {q.current_status || q.status || 'Draft'}
                          </span>
                        </div>
                        <span className="text-[8px] font-mono text-slate-300">#{q.question_unique_id || q.id?.slice(0, 6)}</span>
                      </div>

                      <div className="flex flex-wrap gap-1 mb-2">
                        <span className="px-1.5 py-0.5 bg-slate-50 text-slate-500 rounded text-[8px] font-bold uppercase">
                          {q.subject || 'General'}
                        </span>
                        <span className="px-1.5 py-0.5 bg-slate-50 text-slate-500 rounded text-[8px] font-bold uppercase">
                          {q.type || 'MCQ'}
                        </span>
                        {q.page_no && (
                          <span className="px-1.5 py-0.5 bg-blue-50 text-blue-600 rounded text-[8px] font-bold uppercase">
                            P. {q.page_no}
                          </span>
                        )}
                      </div>

                      <div className="mb-3 flex-1">
                        <p className="text-[11px] text-slate-700 leading-relaxed font-medium line-clamp-2">
                          {q.question_hin || q.question_eng || q.text || q.Question || q.Name || q.question || 'No text'}
                        </p>
                      </div>

                      <div className="grid grid-cols-2 gap-1.5 pt-2 border-t border-slate-50">
                        <Button 
                          onClick={() => handleEditClick(q)} 
                          variant="ghost" 
                          size="sm" 
                          className="h-7 text-blue-600 hover:bg-blue-50 hover:text-blue-700 gap-1 text-[9px] font-bold rounded-lg"
                        >
                          <Edit className="w-3 h-3" />
                          Edit
                        </Button>
                        <Button 
                          onClick={() => {}} 
                          variant="ghost" 
                          size="sm" 
                          className="h-7 text-slate-600 hover:bg-red-50 hover:text-red-600 gap-1 text-[9px] font-bold rounded-lg"
                        >
                          <Trash2 className="w-3 h-3" />
                          Delete
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="space-y-2">
                  {filteredQuestions.slice(0, displayCount).map((q, idx) => (
                    <div key={q.id || idx} className={`bg-white border rounded-xl p-3 shadow-sm hover:shadow-md transition-all flex items-center gap-4 group ${selectedIds.has(q.id) ? 'border-blue-400 ring-1 ring-blue-400/20' : 'border-slate-200'}`}>
                      <div className="shrink-0 flex items-center gap-3">
                        <input 
                          type="checkbox" 
                          checked={selectedIds.has(q.id)}
                          onChange={() => toggleSelection(q.id)}
                          className="w-4 h-4 rounded border-slate-300 text-blue-600 focus:ring-blue-500 cursor-pointer"
                        />
                        <div className="w-7 h-7 rounded-full bg-blue-50 text-blue-600 flex items-center justify-center font-bold text-xs">
                          {idx + 1}
                        </div>
                      </div>

                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1">
                          <div className={`w-2 h-2 rounded-full ${q.current_status === 'Published' || q.status === 'Published' ? 'bg-green-500' : 'bg-slate-300'}`}></div>
                          <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">{q.current_status || q.status || 'Draft'}</span>
                          <span className="text-[10px] text-slate-400">•</span>
                          <span className="text-[10px] font-bold text-blue-600 uppercase tracking-tight">{q.subject || 'General'}</span>
                          <span className="text-[10px] text-slate-400">•</span>
                          <span className="text-[10px] font-bold text-blue-600 uppercase tracking-tight">{q.type || 'Single Choice'}</span>
                        </div>
                        <p className="text-sm text-slate-800 font-medium truncate">
                          {q.question_hin || q.question_eng || q.text || q.Question || q.Name || q.question || 'No question text found'}
                        </p>
                      </div>

                      <div className="hidden md:flex gap-2 shrink-0">
                        <div className="flex items-center gap-1 px-2 py-0.5 bg-green-50 text-green-700 rounded-md border border-green-100 text-[9px] font-bold">
                          <BookOpen className="w-2.5 h-2.5" />
                          Bank
                        </div>
                        <div className="flex items-center gap-1 px-2 py-0.5 bg-cyan-50 text-cyan-700 rounded-md border border-cyan-100 text-[9px] font-bold">
                          <Layout className="w-2.5 h-2.5" />
                          1 Test
                        </div>
                      </div>
                      <div className="flex gap-1.5 shrink-0">
                        <Button 
                          onClick={() => handleEditClick(q)} 
                          variant="outline" 
                          size="sm" 
                          className="h-7 w-7 p-0 border-yellow-200 bg-white text-yellow-600 hover:bg-yellow-50 hover:border-yellow-300"
                          title="Edit"
                        >
                          <Edit className="w-3.5 h-3.5" />
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
              {filteredQuestions.length === 0 && (
                <div className="col-span-full text-center py-12 text-slate-500 border-2 border-dashed rounded-xl bg-white">
                  No questions found matching the current filters.
                </div>
              )}
              {filteredQuestions.length > displayCount && (
                <div className="flex justify-center mt-4">
                  <Button variant="outline" size="sm" onClick={() => setDisplayCount(prev => prev + 100)}>
                    Load More Questions ({filteredQuestions.length - displayCount} remaining)
                  </Button>
                </div>
              )}
            </div>
          )}
        </div>
      ) : (
        <div className="p-8 max-w-7xl mx-auto h-full flex flex-col overflow-y-auto">
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-4">
              <div>
                <h2 className="text-3xl font-bold tracking-tight text-slate-900 mb-2">Question Bank</h2>
                <p className="text-slate-500">Browse all your questions organized by folders.</p>
              </div>
              <div className="flex flex-wrap items-center gap-3 w-full md:w-auto">
                <div className="relative flex-1 md:w-72">
                  <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                  <Input 
                    placeholder="Search folders..." 
                    className="pl-9 bg-white shadow-sm"
                    value={search}
                    onChange={e => setSearch(e.target.value)}
                  />
                </div>
                <div className="flex gap-2">
                  <Button 
                    variant="outline" 
                    size="sm" 
                    onClick={() => setIsCreateFolderModalOpen(true)}
                    className="h-9 gap-2 text-slate-600 border-slate-200 bg-white hover:bg-slate-50"
                  >
                    <FolderPlus className="w-4 h-4" />
                    New Folder
                  </Button>
                  <Button 
                    variant="outline" 
                    size="sm" 
                    onClick={handleSyncAllAirtable}
                    disabled={isSyncingAll}
                    className="h-9 gap-2 text-blue-600 border-blue-200 bg-blue-50/50 hover:bg-blue-50"
                  >
                    {isSyncingAll ? <Loader2 className="w-4 h-4 animate-spin" /> : <RefreshCw className="w-4 h-4" />}
                    Sync Airtable
                  </Button>
                  <Button 
                    variant="outline" 
                    size="sm" 
                    onClick={handleSyncAllSupabase}
                    disabled={isSyncingAll}
                    className="h-9 gap-2 text-emerald-600 border-emerald-200 bg-emerald-50/50 hover:bg-emerald-50"
                  >
                    <Database className="w-4 h-4" />
                    Sync Supabase
                  </Button>
                </div>
              </div>
            </div>

            {/* Breadcrumbs */}
            <div className="flex items-center gap-2 mb-6 text-sm text-slate-500 overflow-x-auto whitespace-nowrap pb-2">
              <button 
                onClick={() => { setCurrentPath([]); setSelectedFolder(null); }}
                className={`hover:text-blue-600 transition-colors ${currentPath.length === 0 ? 'font-bold text-slate-900' : ''}`}
              >
                Root
              </button>
              {currentPath.map((part, idx) => (
                <React.Fragment key={idx}>
                  <ChevronRight className="w-4 h-4 shrink-0" />
                  <button 
                    onClick={() => {
                      const newPath = currentPath.slice(0, idx + 1);
                      openFolder(newPath.join('/'));
                    }}
                    className={`hover:text-blue-600 transition-colors ${idx === currentPath.length - 1 ? 'font-bold text-slate-900' : ''}`}
                  >
                    {part}
                  </button>
                </React.Fragment>
              ))}
            </div>

          {error && (
            <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm flex items-start gap-3 shadow-sm">
              <div className="mt-0.5 text-lg">⚠️</div>
              <div className="flex-1">
                <p className="font-bold mb-1">Database Connection Issue</p>
                <p className="mb-2 leading-relaxed">{error}</p>
                <div className="flex flex-wrap gap-3 mt-3">
                  <a 
                    href="https://supabase.com/dashboard/project/yxibppbfrugarjoeoijw" 
                    target="_blank" 
                    rel="noopener noreferrer"
                    className="inline-flex items-center px-3 py-1.5 bg-red-100 hover:bg-red-200 text-red-800 rounded-md transition-colors font-medium text-xs"
                  >
                    Go to Supabase Dashboard
                    <ExternalLink className="w-3 h-3 ml-1.5" />
                  </a>
                  <button 
                    onClick={() => window.location.reload()}
                    className="inline-flex items-center px-3 py-1.5 bg-white hover:bg-slate-50 border border-red-200 text-red-800 rounded-md transition-colors font-medium text-xs shadow-sm"
                  >
                    Retry Connection
                    <RefreshCw className="w-3 h-3 ml-1.5" />
                  </button>
                </div>
              </div>
            </div>
          )}

          {loading ? (
            <div className="flex-1 flex items-center justify-center">
              <Loader2 className="w-8 h-8 animate-spin text-blue-500" />
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 pb-8">
              {getFoldersAtCurrentPath()
                .filter(f => f.name.toLowerCase().includes(search.toLowerCase()))
                .map(folder => (
                <Card 
                  key={folder.id} 
                  className="cursor-pointer hover:shadow-md hover:border-blue-200 transition-all group relative"
                  onClick={() => openFolder(folder.fullPath)}
                >
                  <CardContent className="p-6 flex flex-col items-center text-center gap-3">
                    {folder.isTable && (
                      <div className="absolute top-2 right-2 flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8 text-slate-400 hover:text-blue-600"
                          onClick={(e) => handleSync(folder.name, e)}
                          disabled={syncingTables[folder.name]}
                          title="Pull from Airtable"
                        >
                          <RefreshCw className={`w-4 h-4 ${syncingTables[folder.name] ? 'animate-spin text-blue-500' : ''}`} />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8 text-slate-400 hover:text-emerald-600"
                          onClick={(e) => handlePushToAirtable(folder.name, e)}
                          disabled={syncingTables[folder.name]}
                          title="Push to Airtable"
                        >
                          <Database className="w-4 h-4" />
                        </Button>
                      </div>
                    )}

                    <div className="w-16 h-16 bg-blue-50 rounded-2xl flex items-center justify-center group-hover:scale-110 transition-transform">
                      <Folder className="w-8 h-8 text-blue-500 fill-blue-100" />
                    </div>
                    <div className="w-full">
                      {renamingFolder === folder.fullPath ? (
                        <div className="flex items-center gap-1" onClick={e => e.stopPropagation()}>
                          <Input 
                            value={newFolderName}
                            onChange={e => setNewFolderName(e.target.value)}
                            className="h-7 text-xs font-bold"
                            autoFocus
                            onKeyDown={e => {
                              if (e.key === 'Enter') handleRenameFolder(folder.fullPath);
                              if (e.key === 'Escape') setRenamingFolder(null);
                            }}
                          />
                          <Button size="icon" variant="ghost" className="h-7 w-7 text-green-600" onClick={() => handleRenameFolder(folder.fullPath)}>
                            <Check className="w-3.5 h-3.5" />
                          </Button>
                          <Button size="icon" variant="ghost" className="h-7 w-7 text-red-600" onClick={() => setRenamingFolder(null)}>
                            <X className="w-3.5 h-3.5" />
                          </Button>
                        </div>
                      ) : (
                        <div className="flex items-center justify-center gap-2">
                          <h3 className="font-semibold text-slate-800 line-clamp-1">{folder.name}</h3>
                          <div className="flex opacity-0 group-hover:opacity-100 transition-opacity">
                            <Button 
                              variant="ghost" 
                              size="icon" 
                              className="h-6 w-6 text-slate-400 hover:text-blue-600"
                              onClick={(e) => {
                                e.stopPropagation();
                                setRenamingFolder(folder.fullPath);
                                setNewFolderName(folder.name);
                              }}
                            >
                              <Edit className="w-3 h-3" />
                            </Button>
                            <Button 
                              variant="ghost" 
                              size="icon" 
                              className="h-6 w-6 text-slate-400 hover:text-red-600"
                              onClick={(e) => {
                                e.stopPropagation();
                                setDeleteConfirmFolder(folder.fullPath);
                              }}
                              disabled={isDeletingFolder === folder.fullPath}
                            >
                              {isDeletingFolder === folder.fullPath ? <Loader2 className="w-3 h-3 animate-spin" /> : <Trash2 className="w-3 h-3" />}
                            </Button>
                          </div>
                        </div>
                      )}
                      <div className="flex flex-col items-center gap-1 mt-2">
                        <p className="text-[10px] text-slate-500 flex items-center gap-1">
                          <Database className="w-3 h-3" /> {syncStatus[folder.fullPath]?.totalQuestions || 0} Questions
                        </p>
                        <p className="text-[10px] text-slate-400 flex items-center gap-1">
                          <Clock className="w-3 h-3" /> 
                          {syncStatus[folder.fullPath]?.lastSync 
                            ? new Date(syncStatus[folder.fullPath].lastSync).toLocaleDateString(undefined, { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' }) 
                            : 'Never synced'}
                        </p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
              {getFoldersAtCurrentPath().length === 0 && (
                <div className="col-span-full text-center p-12 text-slate-500 border-2 border-dashed rounded-xl">
                  No folders found.
                </div>
              )}
            </div>
          )}
        </div>
      )}

      <QuestionEditModal 
        isOpen={isEditModalOpen}
        onOpenChange={setIsEditModalOpen}
        question={editingQuestion}
        index={editingIndex}
        total={questions.length}
        onSave={handleModalSave}
        onNext={handleModalNext}
        onPrevious={handleModalPrevious}
      />

      {/* Delete Confirmation Modal */}
      <AnimatePresence>
        {deleteConfirmFolder && (
          <div className="fixed inset-0 z-[110] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
            <motion.div 
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="bg-white rounded-2xl shadow-2xl w-full max-w-sm overflow-hidden"
            >
              <div className="p-6 text-center">
                <div className="w-16 h-16 bg-red-50 text-red-600 rounded-full flex items-center justify-center mx-auto mb-4">
                  <Trash2 className="w-8 h-8" />
                </div>
                <h3 className="text-lg font-bold text-slate-900 mb-2">Delete Folder?</h3>
                <p className="text-sm text-slate-500 leading-relaxed">
                  Are you sure you want to delete <span className="font-bold text-slate-700">"{deleteConfirmFolder}"</span>? 
                  This will remove all questions in this folder. This action cannot be undone.
                </p>
              </div>
              <div className="px-6 py-4 bg-slate-50 border-t flex gap-3">
                <Button 
                  variant="ghost" 
                  className="flex-1 font-bold text-slate-600" 
                  onClick={() => setDeleteConfirmFolder(null)}
                >
                  Cancel
                </Button>
                <Button 
                  variant="destructive" 
                  className="flex-1 font-bold bg-red-600 hover:bg-red-700 text-white" 
                  onClick={() => handleDeleteFolder(deleteConfirmFolder)}
                >
                  Delete Folder
                </Button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Error Message Modal */}
      <AnimatePresence>
        {errorMessage && (
          <div className="fixed inset-0 z-[120] flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm">
            <motion.div 
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="bg-white rounded-2xl shadow-2xl w-full max-w-sm overflow-hidden"
            >
              <div className="p-6 text-center">
                <div className="w-16 h-16 bg-red-50 text-red-600 rounded-full flex items-center justify-center mx-auto mb-4">
                  <AlertCircle className="w-8 h-8" />
                </div>
                <h3 className="text-lg font-bold text-slate-900 mb-2">Error</h3>
                <p className="text-sm text-slate-500">{errorMessage}</p>
              </div>
              <div className="px-6 py-4 bg-slate-50 border-t">
                <Button 
                  className="w-full font-bold bg-slate-900 text-white" 
                  onClick={() => setErrorMessage(null)}
                >
                  Dismiss
                </Button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Bulk AI Edit Modal */}
      <AnimatePresence>
        {isBulkAIEditModalOpen && (
          <div className="fixed inset-0 z-[120] flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm">
            <motion.div 
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="bg-white rounded-2xl shadow-2xl w-full max-w-md overflow-hidden"
            >
              <div className="px-6 py-4 border-b flex items-center justify-between">
                <h3 className="text-sm font-bold text-slate-900">Bulk AI Edit</h3>
                <Button variant="ghost" size="icon" onClick={() => setIsBulkAIEditModalOpen(false)} className="h-8 w-8">
                  <X className="w-4 h-4" />
                </Button>
              </div>
              <div className="p-6 space-y-4">
                <p className="text-xs text-slate-500">Apply an AI-powered edit to {selectedIds.size} selected questions in parallel</p>
                
                <div className="space-y-2">
                  <label className="text-[10px] font-bold text-slate-400 uppercase">Edit Type *</label>
                  <select className="w-full border rounded-lg p-2 text-xs" value={aiEditType} onChange={e => setAiEditType(e.target.value)}>
                    <option>Solution Add / Change</option>
                    <option>Question Variation</option>
                    <option>Language Variation</option>
                    <option>Write your own prompt</option>
                  </select>
                </div>

                {aiEditType === 'Solution Add / Change' && (
                  <div className="space-y-2">
                    <label className="text-[10px] font-bold text-slate-400 uppercase">Select action...</label>
                    <select className="w-full border rounded-lg p-2 text-xs" value={aiEditAction} onChange={e => setAiEditAction(e.target.value)}>
                      <option value="">Select action...</option>
                      <option value="Add solution where missing">Add solution where missing</option>
                      <option value="Make solutions more detailed">Make solutions more detailed</option>
                      <option value="Make solutions short & crisp (bullet points)">Make solutions short & crisp (bullet points)</option>
                    </select>
                  </div>
                )}

                {aiEditType === 'Language Variation' && (
                  <div className="space-y-2">
                    <label className="text-[10px] font-bold text-slate-400 uppercase">Select language...</label>
                    <select className="w-full border rounded-lg p-2 text-xs" value={aiLanguage} onChange={e => setAiLanguage(e.target.value)}>
                      <option value="Hindi">Hindi</option>
                      <option value="Bengali">Bengali</option>
                      <option value="Telugu">Telugu</option>
                      <option value="Kannada">Kannada</option>
                      <option value="Marathi">Marathi</option>
                      <option value="Gujarati">Gujarati</option>
                      <option value="Tamil">Tamil</option>
                      <option value="English">English</option>
                    </select>
                  </div>
                )}

                {aiEditType === 'Write your own prompt' && (
                  <div className="space-y-2">
                    <label className="text-[10px] font-bold text-slate-400 uppercase">Prompt</label>
                    <textarea className="w-full border rounded-lg p-2 h-24 text-xs" value={aiCustomPrompt} onChange={e => setAiCustomPrompt(e.target.value)} placeholder="Describe what you want AI to do..." />
                  </div>
                )}

                <div className="bg-amber-50 border border-amber-200 p-3 rounded-lg text-[10px] text-amber-800">
                  ⚠️ Warning: This will modify {selectedIds.size} selected questions. Changes are applied immediately and use AI credits.
                </div>
              </div>
              <div className="px-6 py-4 bg-slate-50 border-t flex gap-3">
                <Button variant="ghost" className="flex-1 font-bold text-slate-600" onClick={() => setIsBulkAIEditModalOpen(false)}>Cancel</Button>
                <Button className="flex-1 font-bold bg-purple-600 hover:bg-purple-700 text-white" onClick={handleBulkAIEdit}>Start Bulk Edit</Button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Move/Copy Modal */}
      <AnimatePresence>
        {isMoveModalOpen && (
          <div className="fixed inset-0 z-[120] flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm">
            <motion.div 
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="bg-white rounded-2xl shadow-2xl w-full max-w-md overflow-hidden"
            >
              <div className="px-6 py-4 border-b flex items-center justify-between">
                <h3 className="text-sm font-bold text-slate-900">
                  {isCopying ? 'Copy' : 'Move'} {selectedIds.size} Questions
                </h3>
                <Button variant="ghost" size="icon" onClick={() => setIsMoveModalOpen(false)} className="h-8 w-8">
                  <X className="w-4 h-4" />
                </Button>
              </div>
              <div className="p-6 space-y-4">
                <div className="space-y-2">
                  <label className="text-[10px] font-bold text-slate-400 uppercase">Select Target Folder</label>
                  <div className="max-h-60 overflow-y-auto border rounded-xl p-2 space-y-1">
                    <button 
                      onClick={() => setTargetFolderForMove('Root')}
                      className={`w-full text-left px-3 py-2 rounded-lg text-xs font-bold transition-colors ${targetFolderForMove === 'Root' ? 'bg-blue-50 text-blue-600' : 'hover:bg-slate-50 text-slate-600'}`}
                    >
                      Root (Airtable Tables)
                    </button>
                    {allFolders.map(folder => (
                      <button 
                        key={folder.fullPath}
                        onClick={() => setTargetFolderForMove(folder.fullPath)}
                        className={`w-full text-left px-3 py-2 rounded-lg text-xs font-bold transition-colors ${targetFolderForMove === folder.fullPath ? 'bg-blue-50 text-blue-600' : 'hover:bg-slate-50 text-slate-600'}`}
                      >
                        {folder.fullPath}
                      </button>
                    ))}
                  </div>
                </div>
              </div>
              <div className="px-6 py-4 bg-slate-50 border-t flex gap-3">
                <Button 
                  variant="ghost" 
                  className="flex-1 font-bold text-slate-600" 
                  onClick={() => setIsMoveModalOpen(false)}
                >
                  Cancel
                </Button>
                <Button 
                  className={`flex-1 font-bold text-white ${isCopying ? 'bg-emerald-600 hover:bg-emerald-700' : 'bg-blue-600 hover:bg-blue-700'}`}
                  onClick={() => handleBulkMove(isCopying)}
                  disabled={!targetFolderForMove}
                >
                  {isCopying ? 'Copy Questions' : 'Move Questions'}
                </Button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
      <AnimatePresence>
        {isBulkEditModalOpen && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm">
            <motion.div 
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="bg-white rounded-2xl shadow-2xl w-full max-w-md overflow-hidden"
            >
              <div className="px-6 py-4 border-b flex items-center justify-between">
                <h3 className="text-sm font-bold text-slate-900">Bulk Edit ({selectedIds.size} questions)</h3>
                <Button variant="ghost" size="icon" onClick={() => setIsBulkEditModalOpen(false)} className="h-8 w-8">
                  <X className="w-4 h-4" />
                </Button>
              </div>
              <div className="p-6 space-y-4 max-h-[60vh] overflow-y-auto">
                <p className="text-xs text-slate-500 mb-4">Select the fields you want to update for the {selectedIds.size} selected questions.</p>
                
                {/* Subject */}
                <div className="flex items-start gap-3">
                  <input 
                    type="checkbox" 
                    className="mt-2"
                    checked={fieldsToUpdate.has('subject')}
                    onChange={() => {
                      const newSet = new Set(fieldsToUpdate);
                      if (newSet.has('subject')) newSet.delete('subject');
                      else newSet.add('subject');
                      setFieldsToUpdate(newSet);
                    }}
                  />
                  <div className="flex-1 space-y-1">
                    <label className="text-[10px] font-bold text-slate-400 uppercase">Subject</label>
                    <select 
                      className="w-full bg-slate-50 border border-slate-100 rounded-lg px-3 py-2 text-xs font-bold text-slate-700 outline-none disabled:opacity-50"
                      disabled={!fieldsToUpdate.has('subject')}
                      value={bulkEditData.subject || ''}
                      onChange={e => setBulkEditData(prev => ({ ...prev, subject: e.target.value }))}
                    >
                      <option value="">Select Subject...</option>
                      <option value="Math">Math</option>
                      <option value="Science">Science</option>
                      <option value="Geography">Geography</option>
                      <option value="History">History</option>
                    </select>
                  </div>
                </div>

                {/* Chapter */}
                <div className="flex items-start gap-3">
                  <input 
                    type="checkbox" 
                    className="mt-2"
                    checked={fieldsToUpdate.has('chapter')}
                    onChange={() => {
                      const newSet = new Set(fieldsToUpdate);
                      if (newSet.has('chapter')) newSet.delete('chapter');
                      else newSet.add('chapter');
                      setFieldsToUpdate(newSet);
                    }}
                  />
                  <div className="flex-1 space-y-1">
                    <label className="text-[10px] font-bold text-slate-400 uppercase">Chapter</label>
                    <Input 
                      className="w-full bg-slate-50 border border-slate-100 rounded-lg px-3 py-2 text-xs font-bold text-slate-700 outline-none disabled:opacity-50"
                      disabled={!fieldsToUpdate.has('chapter')}
                      value={bulkEditData.chapter || ''}
                      placeholder="Enter chapter name"
                      onChange={e => setBulkEditData(prev => ({ ...prev, chapter: e.target.value }))}
                    />
                  </div>
                </div>

                {/* Type */}
                <div className="flex items-start gap-3">
                  <input 
                    type="checkbox" 
                    className="mt-2"
                    checked={fieldsToUpdate.has('type')}
                    onChange={() => {
                      const newSet = new Set(fieldsToUpdate);
                      if (newSet.has('type')) newSet.delete('type');
                      else newSet.add('type');
                      setFieldsToUpdate(newSet);
                    }}
                  />
                  <div className="flex-1 space-y-1">
                    <label className="text-[10px] font-bold text-slate-400 uppercase">Question Type</label>
                    <Input 
                      className="w-full bg-slate-50 border border-slate-100 rounded-lg px-3 py-2 text-xs font-bold text-slate-700 outline-none disabled:opacity-50"
                      disabled={!fieldsToUpdate.has('type')}
                      value={bulkEditData.type || ''}
                      placeholder="e.g. MCQ, Subjective"
                      onChange={e => setBulkEditData(prev => ({ ...prev, type: e.target.value }))}
                    />
                  </div>
                </div>

                {/* Difficulty */}
                <div className="flex items-start gap-3">
                  <input 
                    type="checkbox" 
                    className="mt-2"
                    checked={fieldsToUpdate.has('difficulty')}
                    onChange={() => {
                      const newSet = new Set(fieldsToUpdate);
                      if (newSet.has('difficulty')) newSet.delete('difficulty');
                      else newSet.add('difficulty');
                      setFieldsToUpdate(newSet);
                    }}
                  />
                  <div className="flex-1 space-y-1">
                    <label className="text-[10px] font-bold text-slate-400 uppercase">Difficulty</label>
                    <select 
                      className="w-full bg-slate-50 border border-slate-100 rounded-lg px-3 py-2 text-xs font-bold text-slate-700 outline-none disabled:opacity-50"
                      disabled={!fieldsToUpdate.has('difficulty')}
                      value={bulkEditData.difficulty || ''}
                      onChange={e => setBulkEditData(prev => ({ ...prev, difficulty: e.target.value as any }))}
                    >
                      <option value="">Select Difficulty...</option>
                      <option value="Easy">Easy</option>
                      <option value="Medium">Medium</option>
                      <option value="Hard">Hard</option>
                    </select>
                  </div>
                </div>

                {/* Status */}
                <div className="flex items-start gap-3">
                  <input 
                    type="checkbox" 
                    className="mt-2"
                    checked={fieldsToUpdate.has('status')}
                    onChange={() => {
                      const newSet = new Set(fieldsToUpdate);
                      if (newSet.has('status')) newSet.delete('status');
                      else newSet.add('status');
                      setFieldsToUpdate(newSet);
                    }}
                  />
                  <div className="flex-1 space-y-1">
                    <label className="text-[10px] font-bold text-slate-400 uppercase">Status</label>
                    <select 
                      className="w-full bg-slate-50 border border-slate-100 rounded-lg px-3 py-2 text-xs font-bold text-slate-700 outline-none disabled:opacity-50"
                      disabled={!fieldsToUpdate.has('status')}
                      value={bulkEditData.status || ''}
                      onChange={e => setBulkEditData(prev => ({ ...prev, status: e.target.value as any }))}
                    >
                      <option value="">Select Status...</option>
                      <option value="Draft">Draft</option>
                      <option value="Published">Published</option>
                    </select>
                  </div>
                </div>

                {/* Exam */}
                <div className="flex items-start gap-3">
                  <input 
                    type="checkbox" 
                    className="mt-2"
                    checked={fieldsToUpdate.has('exam')}
                    onChange={() => {
                      const newSet = new Set(fieldsToUpdate);
                      if (newSet.has('exam')) newSet.delete('exam');
                      else newSet.add('exam');
                      setFieldsToUpdate(newSet);
                    }}
                  />
                  <div className="flex-1 space-y-1">
                    <label className="text-[10px] font-bold text-slate-400 uppercase">Exam</label>
                    <Input 
                      className="w-full bg-slate-50 border border-slate-100 rounded-lg px-3 py-2 text-xs font-bold text-slate-700 outline-none disabled:opacity-50"
                      disabled={!fieldsToUpdate.has('exam')}
                      value={bulkEditData.exam || ''}
                      placeholder="e.g. SSC CGL, UPSC"
                      onChange={e => setBulkEditData(prev => ({ ...prev, exam: e.target.value }))}
                    />
                  </div>
                </div>

                {/* Year */}
                <div className="flex items-start gap-3">
                  <input 
                    type="checkbox" 
                    className="mt-2"
                    checked={fieldsToUpdate.has('year')}
                    onChange={() => {
                      const newSet = new Set(fieldsToUpdate);
                      if (newSet.has('year')) newSet.delete('year');
                      else newSet.add('year');
                      setFieldsToUpdate(newSet);
                    }}
                  />
                  <div className="flex-1 space-y-1">
                    <label className="text-[10px] font-bold text-slate-400 uppercase">Year</label>
                    <Input 
                      className="w-full bg-slate-50 border border-slate-100 rounded-lg px-3 py-2 text-xs font-bold text-slate-700 outline-none disabled:opacity-50"
                      disabled={!fieldsToUpdate.has('year')}
                      value={bulkEditData.year || ''}
                      placeholder="e.g. 2023"
                      onChange={e => setBulkEditData(prev => ({ ...prev, year: e.target.value }))}
                    />
                  </div>
                </div>
              </div>
              <div className="px-6 py-4 bg-slate-50 border-t flex justify-end gap-3">
                <Button variant="ghost" size="sm" onClick={() => setIsBulkEditModalOpen(false)} className="text-[11px] font-bold">Cancel</Button>
                <Button 
                  size="sm" 
                  disabled={fieldsToUpdate.size === 0}
                  onClick={() => {
                    const dataToUpdate: any = {};
                    fieldsToUpdate.forEach(key => {
                      dataToUpdate[key] = bulkEditData[key as keyof Question] || '';
                    });
                    if (Object.keys(dataToUpdate).length > 0) {
                      handleBulkUpdate(dataToUpdate);
                    } else {
                      setIsBulkEditModalOpen(false);
                    }
                  }} 
                  className="bg-blue-600 hover:bg-blue-700 text-white text-[11px] font-bold px-6"
                >
                  Update All
                </Button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Bulk Tag Modal */}
      <AnimatePresence>
        {isBulkTagModalOpen && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm">
            <motion.div 
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="bg-white rounded-2xl shadow-2xl w-full max-w-md overflow-hidden"
            >
              <div className="px-6 py-4 border-b flex items-center justify-between">
                <h3 className="text-sm font-bold text-slate-900">Bulk Tag ({selectedIds.size} questions)</h3>
                <Button variant="ghost" size="icon" onClick={() => setIsBulkTagModalOpen(false)} className="h-8 w-8">
                  <X className="w-4 h-4" />
                </Button>
              </div>
              <div className="p-6 space-y-4">
                <div className="space-y-2">
                  <label className="text-[10px] font-bold text-slate-400 uppercase">Tag Name</label>
                  <Input 
                    placeholder="Enter tag..." 
                    value={bulkTag}
                    onChange={e => setBulkTag(e.target.value)}
                    className="bg-slate-50 border-slate-100 text-xs font-bold"
                  />
                </div>
              </div>
              <div className="px-6 py-4 bg-slate-50 border-t flex justify-end gap-3">
                <Button variant="ghost" size="sm" onClick={() => setIsBulkTagModalOpen(false)} className="text-[11px] font-bold">Cancel</Button>
                <Button size="sm" onClick={() => handleBulkUpdate({ tags: bulkTag } as any)} className="bg-indigo-600 hover:bg-indigo-700 text-white text-[11px] font-bold px-6">Apply Tag</Button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Copy to Test Modal */}
      <AnimatePresence>
        {isCopyToTestModalOpen && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm">
            <motion.div 
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="bg-white rounded-2xl shadow-2xl w-full max-w-md overflow-hidden"
            >
              <div className="px-6 py-4 border-b flex items-center justify-between">
                <h3 className="text-sm font-bold text-slate-900">Copy to Test ({selectedIds.size} questions)</h3>
                <Button variant="ghost" size="icon" onClick={() => setIsCopyToTestModalOpen(false)} className="h-8 w-8">
                  <X className="w-4 h-4" />
                </Button>
              </div>
              <div className="p-6 space-y-4">
                <div className="space-y-2">
                  <label className="text-[10px] font-bold text-slate-400 uppercase">Test Name</label>
                  <Input 
                    placeholder="Enter test name..." 
                    value={testName}
                    onChange={e => setTestName(e.target.value)}
                    className="bg-slate-50 border-slate-100 text-xs font-bold"
                  />
                </div>
              </div>
              <div className="px-6 py-4 bg-slate-50 border-t flex justify-end gap-3">
                <Button variant="ghost" size="sm" onClick={() => setIsCopyToTestModalOpen(false)} className="text-[11px] font-bold">Cancel</Button>
                <Button size="sm" onClick={() => {
                  handleBulkUpdate({ test_name: testName } as any);
                  setIsCopyToTestModalOpen(false);
                }} className="bg-orange-600 hover:bg-orange-700 text-white text-[11px] font-bold px-6">Copy to Test</Button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Move to Folder Modal */}
      <AnimatePresence>
        {isMoveToFolderModalOpen && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm">
            <motion.div 
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="bg-white rounded-2xl shadow-2xl w-full max-w-md overflow-hidden"
            >
              <div className="px-6 py-4 border-b flex items-center justify-between">
                <h3 className="text-sm font-bold text-slate-900">Add to Question Bank ({selectedIds.size} questions)</h3>
                <Button variant="ghost" size="icon" onClick={() => setIsMoveToFolderModalOpen(false)} className="h-8 w-8">
                  <X className="w-4 h-4" />
                </Button>
              </div>
              <div className="p-6 space-y-4">
                <div className="space-y-2">
                  <label className="text-[10px] font-bold text-slate-400 uppercase">Select Target Folder</label>
                  <select 
                    className="w-full bg-slate-50 border border-slate-100 rounded-lg px-3 py-2 text-xs font-bold text-slate-700 outline-none"
                    onChange={e => {
                      if (e.target.value) {
                        handleBulkUpdate({ airtable_table_name: e.target.value } as any);
                        setIsMoveToFolderModalOpen(false);
                      }
                    }}
                  >
                    <option value="">Select a folder...</option>
                    {tables.map(t => (
                      <option key={t.id} value={t.name}>{t.name}</option>
                    ))}
                  </select>
                </div>
              </div>
              <div className="px-6 py-4 bg-slate-50 border-t flex justify-end gap-3">
                <Button variant="ghost" size="sm" onClick={() => setIsMoveToFolderModalOpen(false)} className="text-[11px] font-bold">Cancel</Button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
