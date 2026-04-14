import React, { useState, useEffect } from 'react';
import { Question, TestAttempt, AnswerState, QuestionStatus } from '../types';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Timer, ChevronLeft, ChevronRight, AlertCircle, CheckCircle, XCircle, HelpCircle, Menu, X } from 'lucide-react';

interface Props {
  questions: Question[];
  onClose: () => void;
}

export default function MockTestInterface({ questions, onClose }: Props) {
  const [step, setStep] = useState<'instructions' | 'test' | 'result'>('instructions');
  const [language, setLanguage] = useState<'eng' | 'hin'>('eng');
  const [currentIndex, setCurrentIndex] = useState(0);
  const [answers, setAnswers] = useState<Record<number, AnswerState>>({});
  const [timeRemaining, setTimeRemaining] = useState(questions.length * 60);
  const [isSubmitted, setIsSubmitted] = useState(false);
  const [showPalette, setShowPalette] = useState(false);
  const [viewingSolutions, setViewingSolutions] = useState(false);
  const [showExplanation, setShowExplanation] = useState(false);

  useEffect(() => {
    setShowExplanation(false);
  }, [currentIndex]);

  useEffect(() => {
    if (step === 'test' && timeRemaining > 0 && !isSubmitted) {
      const timer = setInterval(() => setTimeRemaining(prev => prev - 1), 1000);
      return () => clearInterval(timer);
    } else if (timeRemaining === 0 && !isSubmitted) {
      setIsSubmitted(true);
      setStep('result');
    }
  }, [step, timeRemaining, isSubmitted]);

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const getQuestionText = (q: Question | any) => {
    const qHin = q.question_hin || q.question_eng || q.text || q.Question || q.question || q.Name || q['Question Text'] || q.question_text;
    const qEng = q.question_eng || q.Question_Eng || q.question_en || q.Question_En || q.QuestionText;
    if (language === 'hin') return qHin || qEng || 'No text';
    return qEng || qHin || 'No text';
  };
  const getOptionText = (q: Question | any, idx: number) => {
    const i = idx + 1;
    const optHin = q[`option${i}_hin`] || q[`Option_${i}`] || q[`option${i}`] || q[`Option ${i}`] || q[`Option_${i}_Hin`] || q[`Option ${i} Hindi`];
    const optEng = q[`option${i}_eng`] || q[`Option_${i}_Eng`] || q[`Option ${i} English`] || q[`Option_${i}_En`];
    
    if (language === 'hin') return optHin || optEng || (q.options?.[idx]);
    return optEng || optHin || (q.options?.[idx]);
  };

  const handleAnswer = (option: string, status: QuestionStatus = 'answered') => {
    setAnswers(prev => ({ ...prev, [currentIndex]: { selectedOption: option, status } }));
  };

  const markForReview = () => {
    const currentAnswer = answers[currentIndex];
    const newStatus: QuestionStatus = currentAnswer?.selectedOption ? 'answered-marked-for-review' : 'marked-for-review';
    setAnswers(prev => ({ ...prev, [currentIndex]: { ...currentAnswer, status: newStatus } }));
  };

  const clearResponse = () => {
    setAnswers(prev => {
      const next = { ...prev };
      delete next[currentIndex];
      return next;
    });
  };

  const getAllOptions = (q: Question) => {
    const opts: string[] = [];
    for (let i = 1; i <= 5; i++) {
      const opt = getOptionText(q, i - 1);
      if (opt && opt.trim() !== '') {
        opts.push(opt);
      }
    }
    // If we found options in individual fields, use them. 
    // Otherwise fallback to the options array.
    return opts.length > 0 ? opts : (q.options || []);
  };

  if (step === 'instructions') {
    return (
      <div className="fixed inset-0 bg-background z-50 p-4 flex items-center justify-center">
        <Card className="w-full max-w-2xl">
          <CardContent className="p-6 space-y-4">
            <h2 className="text-2xl font-bold">Test Instructions</h2>
            <div className="h-64 overflow-y-auto border p-4 rounded bg-muted">
              <ul className="list-disc pl-5 space-y-2">
                <li>Total Questions: {questions.length}</li>
                <li>Duration: {Math.floor(questions.length)} minutes</li>
                <li>Each question carries 1 mark.</li>
                <li>No negative marking.</li>
              </ul>
            </div>
            <Button className="w-full" onClick={() => setStep('test')}>Agree & Continue</Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (step === 'result') {
    const totalQuestions = questions.length;
    const attempted = Object.keys(answers).length;
    const correct = (Object.values(answers) as AnswerState[]).filter((a, idx) => {
      const q = questions[parseInt(Object.keys(answers).find(k => answers[parseInt(k)] === a) || '0')];
      // Note: This logic for finding the correct question index is a bit flawed if multiple answers have same state
      // Let's use a more robust way by iterating through questions
      return false; // placeholder for now, will fix below
    }).length;

    // Robust calculation
    let correctCount = 0;
    let wrongCount = 0;
    questions.forEach((q, idx) => {
      const ans = answers[idx];
      if (ans?.selectedOption) {
        const correctAns = (q.correctOption || q.answer || '').toString().trim();
        const options = getAllOptions(q);
        const correctOptionText = options[parseInt(correctAns) - 1] || correctAns;
        
        if (ans.selectedOption === correctOptionText) {
          correctCount++;
        } else {
          wrongCount++;
        }
      }
    });

    if (viewingSolutions) {
      const q = questions[currentIndex];
      const ans = answers[currentIndex];
      const correctAns = (q.correctOption || q.answer || q.Answer || q['Correct Option'] || '').toString().trim();
      const options = getAllOptions(q);
      const correctOptionText = options[parseInt(correctAns) - 1] || correctAns;
      
      // Improved solution logic to check multiple possible fields
      const getExplanation = () => {
        const solHin = (q as any).solution_hin || (q as any).explanation_hin || (q as any).solution || (q as any).Solution || (q as any).explanation;
        const solEng = (q as any).solution_eng || (q as any).explanation_eng || (q as any).Solution_Eng || (q as any).Solution_En;
        
        if (language === 'hin') {
          return solHin || solEng;
        }
        return solEng || solHin;
      };
      
      const solution = getExplanation();

      return (
        <div className="fixed inset-0 bg-background z-50 flex flex-col">
          <div className="p-2 border-b flex justify-between items-center bg-muted shrink-0 shadow-sm">
            <div className="flex items-center gap-4">
              <h2 className="font-bold hidden sm:block">Solution Review</h2>
              <select 
                className="p-1 rounded border bg-white text-sm" 
                value={language} 
                onChange={(e) => setLanguage(e.target.value as 'eng' | 'hin')}
              >
                <option value="eng">English</option>
                <option value="hin">Hindi</option>
              </select>
            </div>
            <div className="flex items-center gap-2">
              <Button variant="outline" size="sm" onClick={() => setViewingSolutions(false)}>Back to Scorecard</Button>
            </div>
          </div>
          <div className="flex-1 overflow-hidden flex flex-col sm:flex-row">
            <div className="flex-1 overflow-y-auto p-4 space-y-6">
              <div>
                <div className="flex justify-between items-start mb-4">
                  <h3 className="font-semibold text-lg flex-1">Q{currentIndex + 1}: {getQuestionText(q)}</h3>
                  <Button 
                    variant="outline" 
                    size="sm" 
                    className="ml-4 shrink-0"
                    onClick={() => setShowExplanation(!showExplanation)}
                  >
                    {showExplanation ? 'Hide Solution' : 'Show Solution'}
                  </Button>
                </div>
                <div className="grid grid-cols-1 gap-3">
                  {options.map((optionText, idx) => {
                    const isCorrect = optionText === correctOptionText || (correctAns === (idx + 1).toString());
                    const isUserSelected = ans?.selectedOption === optionText;
                    let statusIcon = null;

                    if (isCorrect) {
                      statusIcon = <CheckCircle className="w-5 h-5 ml-auto text-white" />;
                    } else if (isUserSelected && !isCorrect) {
                      statusIcon = <XCircle className="w-5 h-5 ml-auto text-white" />;
                    }

                    return (
                      <div 
                        key={idx} 
                        className={`flex items-center p-4 rounded-lg border transition-all ${
                          isCorrect ? 'bg-green-500 text-white border-green-600 shadow-sm' : 
                          isUserSelected ? 'bg-red-500 text-white border-red-600 shadow-sm' : 'bg-white border-gray-200'
                        }`}
                      >
                        <span className="font-bold mr-3">{String.fromCharCode(65 + idx)}.</span>
                        <span className="flex-1">{optionText}</span>
                        {statusIcon}
                      </div>
                    );
                  })}
                </div>
              </div>

              {showExplanation && (
                <div className="p-6 bg-blue-50 border border-blue-200 rounded-xl shadow-sm animate-in fade-in slide-in-from-top-2 duration-300">
                  <h4 className="font-bold text-blue-800 mb-3 flex items-center gap-2">
                    <HelpCircle className="w-5 h-5" /> Detailed Explanation:
                  </h4>
                  <div className="text-blue-900 whitespace-pre-wrap leading-relaxed">
                    {solution || "No detailed explanation available for this question."}
                  </div>
                </div>
              )}
            </div>

            <div className="w-full sm:w-80 border-t sm:border-t-0 sm:border-l p-4 overflow-y-auto bg-muted/20 shrink-0">
              <h4 className="font-semibold mb-4 px-2">Question Palette</h4>
              <div className="grid grid-cols-5 gap-2 px-2">
                {questions.map((_, idx) => {
                  const qAns = answers[idx];
                  const qCorrectAns = (questions[idx].correctOption || questions[idx].answer || '').toString().trim();
                  const qOptions = getAllOptions(questions[idx]);
                  const qCorrectOptionText = qOptions[parseInt(qCorrectAns) - 1] || qCorrectAns;
                  
                  const isCorrect = qAns?.selectedOption === qCorrectOptionText;
                  const isWrong = qAns?.selectedOption && !isCorrect;
                  
                  let bgColor = "bg-white";
                  if (isCorrect) bgColor = "bg-green-500 text-white border-green-600";
                  else if (isWrong) bgColor = "bg-red-500 text-white border-red-600";
                  else if (qAns) bgColor = "bg-gray-400 text-white border-gray-500";

                  return (
                    <button 
                      key={idx} 
                      className={`w-10 h-10 rounded-lg flex items-center justify-center text-xs font-bold border transition-all ${bgColor} ${currentIndex === idx ? 'ring-2 ring-primary ring-offset-2 scale-110' : 'hover:scale-105'}`}
                      onClick={() => setCurrentIndex(idx)}
                    >
                      {idx + 1}
                    </button>
                  );
                })}
              </div>
            </div>
          </div>
          <div className="p-4 border-t flex justify-between bg-background shrink-0 shadow-lg">
            <Button variant="outline" disabled={currentIndex === 0} onClick={() => setCurrentIndex(prev => prev - 1)}>
              <ChevronLeft className="w-4 h-4 mr-2" /> Previous
            </Button>
            <div className="text-sm font-medium self-center">
              Question {currentIndex + 1} of {questions.length}
            </div>
            <Button variant="outline" disabled={currentIndex === questions.length - 1} onClick={() => setCurrentIndex(prev => prev + 1)}>
              Next <ChevronRight className="w-4 h-4 ml-2" />
            </Button>
          </div>
        </div>
      );
    }

    return (
      <div className="fixed inset-0 bg-background z-50 p-4 overflow-y-auto flex items-center justify-center">
        <Card className="w-full max-w-3xl">
          <CardContent className="p-6 space-y-8">
            <div className="text-center space-y-2">
              <h2 className="text-3xl font-bold text-primary">Scorecard</h2>
              <p className="text-muted-foreground">Test completed successfully</p>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
              <div className="p-4 bg-blue-50 rounded-xl text-center border border-blue-100">
                <div className="text-2xl font-bold text-blue-700">{totalQuestions}</div>
                <div className="text-xs text-blue-600 uppercase font-semibold">Total</div>
              </div>
              <div className="p-4 bg-purple-50 rounded-xl text-center border border-purple-100">
                <div className="text-2xl font-bold text-purple-700">{attempted}</div>
                <div className="text-xs text-purple-600 uppercase font-semibold">Attempted</div>
              </div>
              <div className="p-4 bg-green-50 rounded-xl text-center border border-green-100">
                <div className="text-2xl font-bold text-green-700">{correctCount}</div>
                <div className="text-xs text-green-600 uppercase font-semibold">Correct</div>
              </div>
              <div className="p-4 bg-red-50 rounded-xl text-center border border-red-100">
                <div className="text-2xl font-bold text-red-700">{wrongCount}</div>
                <div className="text-xs text-red-600 uppercase font-semibold">Wrong</div>
              </div>
            </div>

            <div className="flex flex-col sm:flex-row gap-4">
              <Button className="flex-1 py-6 text-lg" onClick={() => {
                setCurrentIndex(0);
                setViewingSolutions(true);
              }}>
                View Solutions & Explanations
              </Button>
              <Button variant="outline" className="flex-1 py-6 text-lg" onClick={onClose}>
                Close & Exit
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  const currentQuestion = questions[currentIndex];
  const availableOptions = getAllOptions(currentQuestion);

  return (
    <div className="fixed inset-0 bg-background z-50 flex flex-col">
      <div className="p-2 border-b flex justify-between items-center bg-muted shrink-0">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" onClick={() => setShowPalette(!showPalette)}>
            <Menu className="w-5 h-5" />
          </Button>
          <div className="font-mono text-lg flex items-center gap-2"><Timer className="w-5 h-5"/> {formatTime(timeRemaining)}</div>
        </div>
        <div className="flex items-center gap-2">
          <select className="p-1 rounded border bg-white text-sm" value={language} onChange={(e) => setLanguage(e.target.value as 'eng' | 'hin')}>
            <option value="eng">English</option>
            <option value="hin">Hindi</option>
          </select>
          <Button onClick={() => setStep('result')} variant="destructive" size="sm">Submit</Button>
        </div>
      </div>
      
      <div className="flex-1 overflow-hidden flex relative">
        <div className="flex-1 overflow-y-auto p-4">
          <h3 className="font-semibold mb-6 text-lg">Q{currentIndex + 1}: {getQuestionText(currentQuestion)}</h3>
          <div className="grid grid-cols-1 gap-3">
            {availableOptions.map((optionText, idx) => (
              <Button 
                key={idx} 
                variant={answers[currentIndex]?.selectedOption === optionText ? "default" : "outline"}
                className="justify-start h-auto py-4 px-4 text-left whitespace-normal"
                onClick={() => handleAnswer(optionText)}
              >
                <span className="font-bold mr-3 flex-shrink-0">{String.fromCharCode(65 + idx)}.</span>
                {optionText}
              </Button>
            ))}
          </div>
        </div>

        {/* Question Palette Overlay/Sidebar */}
        <div className={`
          absolute inset-y-0 right-0 w-80 bg-background border-l shadow-xl z-10 transition-transform duration-300 ease-in-out
          ${showPalette ? 'translate-x-0' : 'translate-x-full'}
          sm:relative sm:translate-x-0 sm:block ${showPalette ? 'sm:w-80' : 'sm:w-0 sm:border-0 sm:overflow-hidden'}
        `}>
          <div className="p-4 h-full flex flex-col">
            <div className="flex justify-between items-center mb-4">
              <h4 className="font-semibold">Question Palette</h4>
              <Button variant="ghost" size="icon" className="sm:hidden" onClick={() => setShowPalette(false)}>
                <X className="w-5 h-5" />
              </Button>
            </div>
            <div className="flex-1 overflow-y-auto">
              <div className="grid grid-cols-5 gap-2">
                {questions.map((_, idx) => {
                  const status = answers[idx]?.status || 'not-visited';
                  const isCurrent = currentIndex === idx;
                  let variant: "default" | "secondary" | "outline" | "ghost" = 'outline';
                  
                  if (status === 'answered') variant = 'default';
                  else if (status === 'marked-for-review' || status === 'answered-marked-for-review') variant = 'secondary';

                  return (
                    <Button 
                      key={idx} 
                      variant={variant} 
                      className={`w-10 h-10 p-0 ${isCurrent ? 'ring-2 ring-primary ring-offset-2' : ''}`} 
                      onClick={() => {
                        setCurrentIndex(idx);
                        if (window.innerWidth < 640) setShowPalette(false);
                      }}
                    >
                      {idx + 1}
                    </Button>
                  );
                })}
              </div>
            </div>
            <div className="mt-4 pt-4 border-t space-y-2 text-xs">
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 bg-primary rounded" /> Answered
              </div>
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 bg-secondary rounded" /> Marked for Review
              </div>
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 border rounded" /> Not Answered
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="p-4 border-t flex justify-between shrink-0 bg-background">
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={clearResponse}>Clear</Button>
          <Button variant="outline" size="sm" onClick={markForReview}>Review</Button>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" disabled={currentIndex === 0} onClick={() => setCurrentIndex(prev => prev - 1)}><ChevronLeft className="w-4 h-4 mr-1"/> Prev</Button>
          <Button size="sm" disabled={currentIndex === questions.length - 1} onClick={() => setCurrentIndex(prev => prev + 1)}>Save & Next <ChevronRight className="w-4 h-4 ml-1"/></Button>
        </div>
      </div>
    </div>
  );
}
