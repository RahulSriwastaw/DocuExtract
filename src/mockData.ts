import { Document } from './types';

export const mockDocuments: Document[] = [
  {
    id: '1',
    name: 'SSC GD Mock Test - 17',
    status: 'Completed',
    totalQuestions: 98,
    totalImages: 0,
    uploadDate: 'February 25, 2026',
    questions: [
      {
        id: 'q1',
        text: 'उस संख्या युग्म की पहचान करें जो बाकी सबसे अलग है।',
        options: ['A. 72-9', 'B. 45-5', 'C. 18-2', 'D. 90-10'],
        correctOption: 'C',
        type: 'MCQ Single',
        status: 'Draft',
        subject: 'Reasoning',
        difficulty: 'Medium',
      },
      {
        id: 'q2',
        text: 'निम्न श्रृंखला में आने वाले अगले संयोजन का चयन करें।',
        options: ['A. (A)', 'B. (B)', 'C. (C)', 'D. (D)'],
        correctOption: 'A',
        type: 'MCQ Single',
        status: 'Draft',
        subject: 'Reasoning',
        difficulty: 'Medium',
      },
    ],
  },
  {
    id: '2',
    name: 'Reasoning Test',
    status: 'Error',
    totalQuestions: 0,
    totalImages: 0,
    uploadDate: 'February 12, 2026',
    questions: [],
  },
];
