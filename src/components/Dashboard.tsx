import { Document, Question } from '../types';
import { Card, CardContent } from '@/components/ui/card';
import { FileText, Clock, CheckCircle2, AlertCircle, UploadCloud, ChevronRight } from 'lucide-react';
import Upload from './Upload';

interface DashboardProps {
  documents: Document[];
  onDocumentClick: (doc: Document) => void;
  onExtractionComplete: (questions: Question[], fileName: string) => void;
}

export default function Dashboard({ documents, onDocumentClick, onExtractionComplete }: DashboardProps) {
  return (
    <div className="p-8 max-w-7xl mx-auto space-y-8">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold tracking-tight text-slate-900">Dashboard & Extract</h1>
        <p className="text-slate-500 mt-2">Upload PDFs to extract questions or view your recent extractions.</p>
      </div>

      {/* Upload Section */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="p-6 border-b border-slate-100 bg-slate-50/50">
          <h2 className="text-lg font-semibold text-slate-800 flex items-center gap-2">
            <UploadCloud className="w-5 h-5 text-blue-600" />
            New Extraction
          </h2>
        </div>
        <div className="p-6">
          <Upload onExtractionComplete={onExtractionComplete} />
        </div>
      </div>

      {/* Recent Extractions */}
      <div>
        <h2 className="text-xl font-semibold text-slate-800 mb-4 flex items-center gap-2">
          <Clock className="w-5 h-5 text-slate-400" />
          Recent Extractions
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {documents.map((doc) => (
            <Card 
              key={doc.id} 
              className="group cursor-pointer hover:shadow-md hover:border-blue-200 transition-all duration-200 overflow-hidden" 
              onClick={() => onDocumentClick(doc)}
            >
              <CardContent className="p-0">
                <div className="p-5">
                  <div className="flex items-start justify-between mb-4">
                    <div className="w-10 h-10 rounded-xl bg-blue-50 flex items-center justify-center text-blue-600 group-hover:bg-blue-600 group-hover:text-white transition-colors">
                      <FileText className="w-5 h-5" />
                    </div>
                    <div className={`px-2.5 py-1 rounded-full text-xs font-medium flex items-center gap-1.5 ${
                      doc.status === 'Completed' ? 'bg-green-50 text-green-700 border border-green-200' : 'bg-red-50 text-red-700 border border-red-200'
                    }`}>
                      {doc.status === 'Completed' ? <CheckCircle2 className="w-3.5 h-3.5" /> : <AlertCircle className="w-3.5 h-3.5" />}
                      {doc.status}
                    </div>
                  </div>
                  <h3 className="font-semibold text-slate-900 mb-1 line-clamp-1 group-hover:text-blue-600 transition-colors">{doc.name}</h3>
                  <div className="flex items-center justify-between text-sm text-slate-500">
                    <span>{doc.totalQuestions} questions</span>
                    <span>{doc.uploadDate}</span>
                  </div>
                </div>
                <div className="bg-slate-50 px-5 py-3 border-t border-slate-100 flex items-center justify-between text-sm font-medium text-slate-600 group-hover:text-blue-600 transition-colors">
                  View Content
                  <ChevronRight className="w-4 h-4" />
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    </div>
  );
}
