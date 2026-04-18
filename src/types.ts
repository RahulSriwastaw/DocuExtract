export interface Folder {
  id: string;
  name: string;
  createdAt: string;
}

export interface QuestionSet {
  id: string;
  name: string;
  folderId?: string | null;
  createdAt: string;
  updatedAt: string;
  questions: Question[];
}

export interface Question {
  id: string;
  record_id?: string;
  question_unique_id?: string;
  question_hin?: string;
  question_eng?: string;
  subject?: string;
  chapter?: string;
  option1_hin?: string;
  option1_eng?: string;
  option2_hin?: string;
  option2_eng?: string;
  option3_hin?: string;
  option3_eng?: string;
  option4_hin?: string;
  option4_eng?: string;
  option5_hin?: string;
  option5_eng?: string;
  answer?: string;
  solution_hin?: string;
  solution_eng?: string;
  type?: string;
  video?: string;
  page_no?: string;
  collection?: string;
  airtable_table_name?: string;
  section?: string;
  year?: string;
  date?: string;
  exam?: string;
  previous_of?: string;
  action?: string;
  current_status?: string;
  sync_code?: string;
  error_report?: string;
  error_description?: string;
  topic?: string;
  sub_topic?: string;
  sub_subject?: string;
  sub_chapter?: string;
  keywords?: string;
  
  // Airtable variations
  Question?: string;
  Name?: string;
  question?: string;
  Answer?: string;
  'Correct Option'?: string;
  Solution?: string;
  solution?: string;
  Subject?: string;
  Chapter?: string;
  Topic?: string;
  Difficulty?: string;
  Type?: string;
  Page?: string;
  Page_No?: string;
  Tags?: string | string[];
  
  // Legacy fields for UI compatibility
  text: string;
  options: string[];
  correctOption: string;
  status: 'Draft' | 'Published';
  difficulty: 'Easy' | 'Medium' | 'Hard';
  image?: string;
  tags?: string[];
}

export interface Document {
  id: string;
  name: string;
  status: 'Completed' | 'Processed' | 'Error';
  totalQuestions: number;
  totalImages: number;
  uploadDate: string;
  questions: Question[];
}

export type QuestionStatus = 'not-visited' | 'not-answered' | 'answered' | 'marked-for-review' | 'answered-marked-for-review';

export interface AnswerState {
  selectedOption?: string;
  status: QuestionStatus;
}

export interface TestAttempt {
  id: string;
  questionSetId: string;
  startTime: string;
  endTime?: string;
  answers: Record<number, AnswerState>;
  score?: number;
}
