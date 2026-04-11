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
    <div className="p-4 sm:p-8 max-w-7xl mx-auto space-y-6 sm:space-y-8">
      {/* Header */}
      <div>
        <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-text-heading">Dashboard & Extract</h1>
        <p className="text-sm sm:text-base text-text-muted mt-1 sm:mt-2">Upload PDFs to extract questions or view your recent extractions.</p>
      </div>

      {/* Upload Section */}
      <div className="bg-bg-card rounded-2xl border border-border shadow-sm overflow-hidden">
        <div className="p-4 sm:p-6 border-b border-border bg-bg-page/50">
          <h2 className="text-base sm:text-lg font-semibold text-text-heading flex items-center gap-2">
            <UploadCloud className="w-5 h-5 text-primary" />
            New Extraction
          </h2>
        </div>
        <div className="p-4 sm:p-6">
          <Upload onExtractionComplete={onExtractionComplete} />
        </div>
      </div>

      {/* Recent Extractions */}
      <div>
        <h2 className="text-lg sm:text-xl font-semibold text-text-heading mb-4 flex items-center gap-2">
          <Clock className="w-5 h-5 text-text-muted" />
          Recent Extractions
        </h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-5">
          {(documents || []).map((doc) => (
            <Card 
              key={doc.id} 
              className="group cursor-pointer hover:shadow-md hover:border-primary transition-all duration-200 overflow-hidden" 
              onClick={() => onDocumentClick(doc)}
            >
              <CardContent className="p-0">
                <div className="p-4 sm:p-5">
                  <div className="flex items-start justify-between mb-3 sm:mb-4">
                    <div className="w-9 h-9 sm:w-10 sm:h-10 rounded-xl bg-primary-light flex items-center justify-center text-primary group-hover:bg-primary group-hover:text-white transition-colors">
                      <FileText className="w-4.5 h-4.5 sm:w-5 sm:h-5" />
                    </div>
                    <div className={`px-2 py-0.5 sm:px-2.5 sm:py-1 rounded-full text-[10px] sm:text-xs font-medium flex items-center gap-1 sm:gap-1.5 ${
                      doc.status === 'Completed' ? 'bg-green-50 text-green-700 border border-green-200' : 'bg-red-50 text-red-700 border border-red-200'
                    }`}>
                      {doc.status === 'Completed' ? <CheckCircle2 className="w-3 h-3 sm:w-3.5 sm:h-3.5" /> : <AlertCircle className="w-3 h-3 sm:w-3.5 sm:h-3.5" />}
                      {doc.status}
                    </div>
                  </div>
                  <h3 className="text-sm sm:text-base font-semibold text-text-heading mb-1 line-clamp-1 group-hover:text-primary transition-colors">{doc.name}</h3>
                  <div className="flex items-center justify-between text-[11px] sm:text-sm text-text-muted">
                    <span>{doc.totalQuestions} questions</span>
                    <span>{doc.uploadDate}</span>
                  </div>
                </div>
                <div className="bg-bg-page px-4 py-2 sm:px-5 sm:py-3 border-t border-border flex items-center justify-between text-xs sm:text-sm font-medium text-text-muted group-hover:text-primary transition-colors">
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
