export interface Lesson {
  id: string;
  slug: string;
  title: string;
  description: string;
  videoUrl: string;
  content: string;
  quiz: {
    question: string;
    options: string[];
    correctAnswer: string;
  }[];
  duration: number; // in minutes
}

export interface Course {
  id: string;
  title: string;
  description: string;
  lessons: Lesson[];
  image: string;
}

export interface UserProgress {
  completedLessons: string[]; // array of lesson ids
  scores: { [lessonId: string]: number }; // lessonId -> score
  lastAccessedLesson: string | null;
}
