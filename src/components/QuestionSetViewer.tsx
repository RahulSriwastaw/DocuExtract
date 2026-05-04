import React, { useState } from 'react';
import { Question } from '../types';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import MockTestInterface from './MockTestInterface';

type ViewMode = 'reading' | 'mocktest';

interface Props {
  questions: Question[];
  onClose: () => void;
}

export default function QuestionSetViewer({ questions, onClose }: Props) {
  const [mode, setMode] = useState<ViewMode>('reading');
  const [currentIndex, setCurrentIndex] = useState(0);

  const renderReadingMode = () => (
    <div className="space-y-6">
      <div className="prose max-w-none">
        <h3 className="font-semibold">Q{currentIndex + 1}: {questions[currentIndex].text || (questions[currentIndex] as any).question_hin || (questions[currentIndex] as any).question_eng}</h3>
        <div className="grid grid-cols-1 gap-2 mt-4">
          {(questions[currentIndex].options || []).map((opt, idx) => (
            <div key={idx} className="p-3 border rounded bg-muted/50">{opt}</div>
          ))}
        </div>
        <div className="mt-4 p-3 bg-green-50 border border-green-200 rounded">
          <p className="font-semibold text-green-800">Answer: {questions[currentIndex].correctOption || (questions[currentIndex] as any).answer}</p>
        </div>
      </div>
    </div>
  );

  if (mode === 'mocktest') {
    return <MockTestInterface questions={questions} onClose={onClose} />;
  }

  return (
    <div className="fixed inset-0 bg-background z-50 p-3">
      <Card className="w-full h-full flex flex-col max-w-4xl max-h-[90vh] mx-auto">
        <div className="p-3 border-b flex justify-between items-center shrink-0">
          <div className="flex gap-2">
            <Button variant={mode === 'reading' ? 'default' : 'outline'} onClick={() => setMode('reading')}>Reading Mode</Button>
            <Button variant={mode === 'mocktest' ? 'default' : 'outline'} onClick={() => setMode('mocktest')}>Mock Test Mode</Button>
          </div>
          <Button variant="ghost" onClick={onClose}>Close</Button>
        </div>
        
        <CardContent className="flex-1 overflow-hidden p-3 sm:p-4 flex flex-col gap-3">
          <div className="flex-1 overflow-y-auto">
            {renderReadingMode()}
          </div>
        </CardContent>

        <div className="p-3 border-t flex justify-between shrink-0">
          <Button disabled={currentIndex === 0} onClick={() => setCurrentIndex(prev => prev - 1)}><ChevronLeft className="w-4 h-4 mr-2"/> Previous</Button>
          <span className="self-center text-[13px]">Q {currentIndex + 1} / {questions.length}</span>
          <Button disabled={currentIndex === questions.length - 1} onClick={() => setCurrentIndex(prev => prev + 1)}>Next <ChevronRight className="w-4 h-4 ml-2"/></Button>
        </div>
      </Card>
    </div>
  );
}
