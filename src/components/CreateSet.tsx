import { useState, useEffect, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import { Question, QuestionSet, Folder } from '../types';
import { Database, ArrowLeft, Loader2, Save, FolderPlus, Search, Filter, X, CheckCircle2, RefreshCw } from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { safeJson } from '../utils';

export default function CreateSet({ onBack }: { onBack: () => void }) {
  const [folders, setFolders] = useState<Folder[]>([]);
  const [cloudTables, setCloudTables] = useState<{id: string, name: string}[]>([]);
  const [selectedCloudTable, setSelectedCloudTable] = useState('');
  const [cloudRecords, setCloudRecords] = useState<any[]>([]);
  const [isLoadingCloud, setIsLoadingCloud] = useState(false);
  
  const [cloudSearch, setCloudSearch] = useState('');
  const [cloudFilters, setCloudFilters] = useState<Record<string, string>>({});
  const [selectedCloudIds, setSelectedCloudIds] = useState<string[]>([]);
  
  const [cloudSetName, setCloudSetName] = useState('');
  const [selectedFolderId, setSelectedFolderId] = useState<string>('root');

  // New Folder Modal
  const [isFolderModalOpen, setIsFolderModalOpen] = useState(false);
  const [newFolderName, setNewFolderName] = useState('');

  useEffect(() => {
    // Load folders
    const savedFolders = localStorage.getItem('question_folders');
    if (savedFolders) setFolders(JSON.parse(savedFolders));

    // Load tables
    fetchTables();
  }, []);

  const fetchTables = async (forceSync = false) => {
    setIsLoadingCloud(true);
    try {
      const res = await fetch(`/api/get-airtable-tables${forceSync ? '?forceSync=true' : ''}`);
      const data = await safeJson(res);
      setCloudTables(data.tables || []);
    } catch (e) {
      console.error(e);
    }
    setIsLoadingCloud(false);
  };

  const fetchCloudRecords = async (tableName: string, forceSync = false) => {
    setSelectedCloudTable(tableName);
    setIsLoadingCloud(true);
    setCloudFilters({});
    setCloudSearch('');
    setSelectedCloudIds([]);
    try {
      const res = await fetch('/api/get-airtable-records', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ tableName, forceSync })
      });
      const data = await safeJson(res);
      setCloudRecords(data.records || []);
    } catch (e) {
      console.error(e);
    }
    setIsLoadingCloud(false);
  };

  const handleSync = async () => {
    if (selectedCloudTable) {
      await fetchCloudRecords(selectedCloudTable, true);
    } else {
      await fetchTables(true);
    }
  };

  const filterableFields = useMemo(() => {
    const fields: Record<string, Set<string>> = {};
    cloudRecords.forEach(r => {
      Object.keys(r).forEach(k => {
        if (['id', 'question_hin', 'question_eng', 'options', 'solution_hin', 'solution_eng', 'text'].includes(k)) return;
        if (!fields[k]) fields[k] = new Set();
        if (r[k]) fields[k].add(String(r[k]));
      });
    });
    
    const result: Record<string, string[]> = {};
    Object.keys(fields).forEach(k => {
      if (fields[k].size > 0 && fields[k].size < 50) {
        result[k] = Array.from(fields[k]).sort();
      }
    });
    return result;
  }, [cloudRecords]);

  const filteredCloudRecords = useMemo(() => {
    return cloudRecords.filter(r => {
      if (cloudSearch && !JSON.stringify(r).toLowerCase().includes(cloudSearch.toLowerCase())) return false;
      for (const [field, value] of Object.entries(cloudFilters)) {
        if (value && value !== 'all' && String(r[field]) !== value) return false;
      }
      return true;
    });
  }, [cloudRecords, cloudSearch, cloudFilters]);

  const toggleCloudSelect = (id: string) => {
    setSelectedCloudIds(prev => prev.includes(id) ? prev.filter(i => i !== id) : [...prev, id]);
  };

  const toggleCloudSelectAll = () => {
    setSelectedCloudIds(prev => prev.length === filteredCloudRecords.length ? [] : filteredCloudRecords.map(r => r.id));
  };

  const handleCreateFolder = () => {
    if (!newFolderName.trim()) return;
    const newFolder: Folder = {
      id: Date.now().toString(),
      name: newFolderName,
      createdAt: new Date().toISOString()
    };
    const updatedFolders = [...folders, newFolder];
    setFolders(updatedFolders);
    localStorage.setItem('question_folders', JSON.stringify(updatedFolders));
    setSelectedFolderId(newFolder.id);
    setNewFolderName('');
    setIsFolderModalOpen(false);
  };

  const handleCreateSet = () => {
    if (!cloudSetName.trim() || selectedCloudIds.length === 0) return;
    
    const savedSets = localStorage.getItem('question_sets');
    const sets: QuestionSet[] = savedSets ? JSON.parse(savedSets) : [];
    
    const selectedRecords = cloudRecords.filter(r => selectedCloudIds.includes(r.id));
    
    const newSet: QuestionSet = {
      id: Date.now().toString(),
      name: cloudSetName,
      folderId: selectedFolderId === 'root' ? null : selectedFolderId,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      questions: selectedRecords as Question[]
    };
    
    localStorage.setItem('question_sets', JSON.stringify([...sets, newSet]));
    onBack();
  };

  return (
    <div className="p-2 md:p-3 max-w-[1600px] mx-auto space-y-2 h-full flex flex-col">
      {/* Header Section */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-2 shrink-0 bg-white p-2 px-3 rounded-lg border border-slate-200 shadow-sm">
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="icon" onClick={onBack} className="hover:bg-slate-100 rounded-full w-8 h-8">
            <ArrowLeft className="w-4 h-4 text-slate-600" />
          </Button>
          <h2 className="text-lg font-bold tracking-tight text-slate-900 flex items-center gap-2">
            Create Set
          </h2>
        </div>
        
        <div className="flex flex-wrap items-center gap-2">
          <div className="flex items-center gap-1 bg-slate-50 p-1 rounded-lg border border-slate-200">
            <Select value={selectedFolderId} onValueChange={setSelectedFolderId}>
              <SelectTrigger className="w-[140px] bg-white border-slate-200 shadow-sm h-8 text-xs">
                <SelectValue placeholder="Select Folder" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="root">Root (No Folder)</SelectItem>
                {folders.map(f => <SelectItem key={f.id} value={f.id}>{f.name}</SelectItem>)}
              </SelectContent>
            </Select>
            <Button variant="outline" size="icon" className="h-8 w-8 bg-white border-slate-200 shadow-sm" onClick={() => setIsFolderModalOpen(true)} title="Create New Folder">
              <FolderPlus className="w-3.5 h-3.5 text-slate-600" />
            </Button>
          </div>
          <Input 
            placeholder="Enter Set Name..." 
            value={cloudSetName} 
            onChange={e => setCloudSetName(e.target.value)} 
            className="w-[180px] bg-white border-slate-200 shadow-sm h-8 text-sm"
          />
          <Button 
            onClick={handleCreateSet} 
            disabled={!cloudSetName.trim() || selectedCloudIds.length === 0} 
            className="bg-blue-600 hover:bg-blue-700 text-white shadow-sm h-8 px-4 rounded-lg text-sm transition-all"
          >
            <Save className="w-3.5 h-3.5 mr-2" /> 
            Save Set {selectedCloudIds.length > 0 && <span className="ml-1 bg-blue-500 px-1.5 py-0.5 rounded text-[10px]">{selectedCloudIds.length}</span>}
          </Button>
        </div>
      </div>

      {/* Main Content Area */}
      <div className="flex flex-col lg:flex-row gap-4 flex-1 overflow-hidden">
        
        {/* Left Column: All Questions & Filters */}
        <div className="flex flex-col gap-0 flex-1 overflow-hidden bg-white border border-slate-200 rounded-lg shadow-sm">
          {/* Toolbar */}
          <div className="flex flex-wrap gap-2 items-center shrink-0 p-2 border-b border-slate-100 bg-slate-50/50">
            <div className="flex items-center gap-2">
              <Database className="w-4 h-4 text-slate-400" />
              <Select value={selectedCloudTable} onValueChange={(val) => fetchCloudRecords(val)}>
                <SelectTrigger className="w-[160px] bg-white shadow-sm border-slate-200 h-8 text-xs font-medium">
                  <SelectValue placeholder="Select Table..." />
                </SelectTrigger>
                <SelectContent>
                  {cloudTables.map(t => <SelectItem key={t.id} value={t.name}>{t.name}</SelectItem>)}
                </SelectContent>
              </Select>
              <Button 
                variant="outline" 
                size="icon" 
                className="h-8 w-8 bg-white border-slate-200 shadow-sm" 
                onClick={handleSync} 
                disabled={isLoadingCloud}
                title="Sync from Airtable"
              >
                <RefreshCw className={`w-3.5 h-3.5 text-slate-600 ${isLoadingCloud ? 'animate-spin' : ''}`} />
              </Button>
            </div>

            <div className="h-4 w-px bg-slate-200 mx-1 hidden sm:block"></div>

            {/* Dynamic Filters */}
            {Object.keys(filterableFields).slice(0, 4).map(field => (
              <div key={field} className="flex items-center gap-2">
                <Select value={cloudFilters[field] || 'all'} onValueChange={val => setCloudFilters({...cloudFilters, [field]: val})}>
                  <SelectTrigger className="w-[130px] bg-white shadow-sm border-slate-200 h-8 text-xs">
                    <div className="flex items-center gap-1.5 truncate">
                      <Filter className="w-3 h-3 text-slate-400 shrink-0" />
                      <span className="truncate">{cloudFilters[field] && cloudFilters[field] !== 'all' ? cloudFilters[field] : field.replace(/_/g, ' ')}</span>
                    </div>
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All {field.replace(/_/g, ' ')}</SelectItem>
                    {filterableFields[field].map(val => <SelectItem key={val} value={val}>{val}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
            ))}

            <div className="flex-1 min-w-[150px] ml-auto">
              <div className="relative">
                <Search className="w-3.5 h-3.5 absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400" />
                <Input 
                  value={cloudSearch} 
                  onChange={e => setCloudSearch(e.target.value)} 
                  placeholder="Search questions..." 
                  className="pl-8 bg-white shadow-sm border-slate-200 h-8 text-xs"
                />
              </div>
            </div>
          </div>

          {/* Data Table */}
          <div className="flex-1 overflow-auto relative">
            {isLoadingCloud ? (
              <div className="absolute inset-0 flex flex-col items-center justify-center bg-white/80 backdrop-blur-sm z-10">
                <Loader2 className="w-6 h-6 animate-spin text-blue-600 mb-3" />
                <p className="text-slate-500 text-sm font-medium">Loading records...</p>
              </div>
            ) : cloudRecords.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-full text-slate-400 space-y-3 p-6 text-center">
                <div className="w-12 h-12 bg-slate-50 rounded-full flex items-center justify-center border border-slate-100 mb-1">
                  <Database className="w-6 h-6 text-slate-300" />
                </div>
                <p className="text-base font-medium text-slate-600">{selectedCloudTable ? 'No records found.' : 'Select a table to load questions.'}</p>
                <p className="text-xs max-w-sm">Choose a table from the dropdown menu above to view and select questions.</p>
              </div>
            ) : (
              <table className="w-full text-xs text-left border-collapse">
                <thead className="bg-slate-50 sticky top-0 z-10 shadow-sm ring-1 ring-slate-200">
                  <tr>
                    <th className="py-1.5 px-2 w-8 text-center border-b border-slate-200">
                      <Checkbox 
                        checked={selectedCloudIds.length === filteredCloudRecords.length && filteredCloudRecords.length > 0} 
                        onCheckedChange={toggleCloudSelectAll} 
                        className="w-3.5 h-3.5 border-slate-300 data-[state=checked]:bg-blue-600 data-[state=checked]:border-blue-600"
                      />
                    </th>
                    <th className="py-1.5 px-2 font-semibold text-slate-700 border-b border-slate-200">Question</th>
                    {Object.keys(filterableFields).slice(0, 4).map(f => (
                      <th key={f} className="py-1.5 px-2 font-semibold text-slate-700 capitalize whitespace-nowrap border-b border-slate-200">{f.replace(/_/g, ' ')}</th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {filteredCloudRecords.map(r => (
                    <tr 
                      key={r.id} 
                      className={`transition-colors cursor-pointer ${selectedCloudIds.includes(r.id) ? 'bg-blue-50/50' : 'hover:bg-slate-50'}`} 
                      onClick={() => toggleCloudSelect(r.id)}
                    >
                      <td className="py-1.5 px-2 text-center" onClick={e => e.stopPropagation()}>
                        <Checkbox 
                          checked={selectedCloudIds.includes(r.id)} 
                          onCheckedChange={() => toggleCloudSelect(r.id)} 
                          className="w-3.5 h-3.5 border-slate-300 data-[state=checked]:bg-blue-600 data-[state=checked]:border-blue-600"
                        />
                      </td>
                      <td className="py-1.5 px-2 max-w-xl">
                        <div className="line-clamp-3 text-slate-800 font-medium leading-snug" title={r.question_hin || r.question_eng || r.text}>
                          {r.question_hin || r.question_eng || r.text || <span className="text-slate-400 italic font-normal">No text content</span>}
                        </div>
                      </td>
                      {Object.keys(filterableFields).slice(0, 4).map(f => (
                        <td key={f} className="py-1.5 px-2 whitespace-nowrap text-slate-500">{r[f] || '-'}</td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </div>

        {/* Right Column: Selected Questions */}
        <div className="w-full lg:w-[260px] xl:w-[300px] flex flex-col gap-0 overflow-hidden bg-slate-50 border border-slate-200 rounded-lg shadow-sm shrink-0">
          <div className="p-2 px-3 border-b border-slate-200 bg-white flex items-center justify-between">
            <h3 className="font-semibold text-slate-800 text-sm flex items-center gap-2">
              Selected
              <span className="bg-blue-100 text-blue-700 py-0.5 px-2 rounded-full text-[10px] font-bold">{selectedCloudIds.length}</span>
            </h3>
            {selectedCloudIds.length > 0 && (
              <Button variant="ghost" size="sm" onClick={() => setSelectedCloudIds([])} className="h-7 px-2 text-[10px] text-slate-500 hover:text-red-600 hover:bg-red-50">
                Clear All
              </Button>
            )}
          </div>
          
          <div className="flex-1 overflow-y-auto p-2 space-y-1.5">
            {selectedCloudIds.length === 0 ? (
              <div className="h-full flex flex-col items-center justify-center text-center text-slate-400 space-y-2">
                <div className="w-8 h-8 bg-white rounded-full flex items-center justify-center border border-slate-200 shadow-sm">
                  <CheckCircle2 className="w-4 h-4 text-slate-300" />
                </div>
                <p className="text-[11px] px-2">Select questions from the table to add them to your set.</p>
              </div>
            ) : (
              cloudRecords.filter(r => selectedCloudIds.includes(r.id)).map((r, index) => (
                <div key={r.id} className="p-2 bg-white border border-slate-200 rounded-md shadow-sm hover:border-blue-300 transition-colors group relative pr-6">
                  <div className="text-[9px] font-bold text-blue-600 mb-0.5">Q{index + 1}</div>
                  <div className="text-[11px] text-slate-700 line-clamp-2 font-medium leading-snug">
                    {r.question_hin || r.question_eng || r.text || 'No text content'}
                  </div>
                  <button 
                    onClick={() => toggleCloudSelect(r.id)}
                    className="absolute top-2 right-2 text-slate-300 hover:text-red-500 opacity-0 group-hover:opacity-100 transition-opacity bg-white rounded-full p-1 shadow-sm border border-slate-100"
                    title="Remove question"
                  >
                    <X className="w-3 h-3" />
                  </button>
                </div>
              ))
            )}
          </div>
        </div>
      </div>

      {/* Create Folder Modal */}
      <Dialog open={isFolderModalOpen} onOpenChange={setIsFolderModalOpen}>
        <DialogContent className="sm:max-w-md rounded-2xl p-0 overflow-hidden border-0 shadow-2xl">
          <DialogHeader className="px-6 py-4 border-b bg-slate-50/50">
            <DialogTitle className="text-lg font-semibold text-slate-800">Create New Folder</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 p-6">
            <div className="space-y-2">
              <Label className="text-slate-700 font-medium">Folder Name</Label>
              <Input 
                value={newFolderName} 
                onChange={e => setNewFolderName(e.target.value)} 
                placeholder="e.g., Physics 2024" 
                onKeyDown={e => e.key === 'Enter' && handleCreateFolder()} 
                className="border-slate-200 focus-visible:ring-blue-500 rounded-xl shadow-sm h-11"
                autoFocus
              />
            </div>
          </div>
          <DialogFooter className="px-6 py-4 border-t bg-slate-50/50">
            <Button variant="ghost" onClick={() => setIsFolderModalOpen(false)} className="text-slate-500">Cancel</Button>
            <Button onClick={handleCreateFolder} disabled={!newFolderName.trim()} className="bg-blue-600 hover:bg-blue-700 text-white shadow-sm rounded-lg px-6">Create Folder</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
