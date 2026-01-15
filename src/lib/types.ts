export type UserProfile = {
    uid: string;
    username?: string; // Unique username for login
    displayName: string;
    email: string;
    role: 'student' | 'teacher' | 'superadmin' | 'guest' | 'pending';
    class?: string; // e.g. "5/A" or "Yaz Okulu Havuzu"
    schoolName?: string; // e.g. "Değerler Okulu"
    studentNumber?: string; // Add student number
    score?: number;
    avatar?: string;
    createdAt?: any; // To accommodate Firestore's ServerTimestamp or a string
    ownedItems?: string[]; // Array of shop item IDs
    equippedFrameUrl?: string | null;
    equippedBadgeId?: string | null;
    guestPlayers?: string[];
    // Streak properties
    currentStreak?: number;
    longestStreak?: number;
    lastStreakDate?: string; // ISO string 'yyyy-MM-dd'
    lastWheelSpin?: any; // Can be a server timestamp on write, string on read
};

export type ShopItem = {
    id: string;
    name: string;
    price: number;
    type: 'avatarFrame' | 'avatarBadge';
    assetUrl?: string; // For CSS gradients or image URLs
    component?: React.ComponentType<any>; // For SVG icon components
    description: string;
};

export type Achievement = {
  periodType: 'weekly' | 'monthly';
  periodName: string; // e.g., "13-19 Mayıs 2024" or "Haziran 2024"
  rank: number;
  score: number;
};


export type UserProgress = {
    [topicId: string]: {
        completionCount: number;
        lastCompleted: any; // Can be a server timestamp on write, string on read
    };
};

// For Question Bank progression
export type TestResult = {
    status: 'passed' | 'failed';
    correct: number;
    total: number;
    score: number;
};
export type DifficultyProgress = { [testIndex: number]: TestResult };


export type QuestionBankTopicProgress = {
    [topicId: string]: {
        easy?: DifficultyProgress;
        medium?: DifficultyProgress;
        hard?: DifficultyProgress;
    };
};

export type QuestionBankProgress = {
    [topicId: string]: {
        easy?: DifficultyProgress;
        medium?: DifficultyProgress;
        hard?: DifficultyProgress;
    };
};

export type ImageAsset = {
    id: string;
    title: string;
    url: string;
    storagePath: string;
    teacherId: string;
    createdAt: any;
    folderId?: string | null; // ID of the folder it belongs to
    folderName?: string | null; // Name of the folder for display
};

export type Folder = {
    id: string;
    name: string;
    teacherId: string;
    createdAt: any;
};


// Discriminated union for more type-safe lesson steps
export type ContentStep = { type: 'content'; title: string; content: string; isPublished?: boolean; };
export type ObjectiveListStep = { type: 'objectiveList'; title: string; items: string[]; isPublished?: boolean; };
export type ConceptExplanationStep = { type: 'conceptExplanation'; title: string; items: { concept: string; definition: string; }[]; isPublished?: boolean; };
export type McqStep = { type: 'mcq'; title: string; question: string; options: string[]; correctAnswer: string; isPublished?: boolean; };
export type TfStep = { type: 'tf'; title: string; statement: string; isTrue: boolean; isPublished?: boolean; };
export type TrueFalseListStep = { type: 'trueFalseList'; title: string; questions: { statement: string; isTrue: boolean; }[]; isPublished?: boolean; };
export type FitbStep = { type: 'fitb'; title: string; sentenceWithBlank: string; options: string[]; correctAnswer: string; isPublished?: boolean; };
export type FlashcardStep = { type: 'flashcard'; title: string; cards: { term: string; definition: string; }[]; isPublished?: boolean; };
export type AnagramStep = { type: 'anagram'; title: string; definition: string; scrambledWord: string; correctAnswer: string; isPublished?: boolean; };
export type AnagramCard = { definition: string; scrambledWord: string; correctAnswer: string; };
export type AnagramFlashcardStep = { type: 'anagramFlashcard'; title: string; cards: AnagramCard[]; isPublished?: boolean; };
export type SentenceScrambleStep = { type: 'sentenceScramble'; title: string; scrambledSentence: string; correctSentence: string; isPublished?: boolean; };
export type VisualStep = { type: 'visual'; title: string; imageUrl: string; prompt?: string; isPublished?: boolean; };
export type AccordionStep = { type: 'accordion'; title: string; items: { id: string, title: string; content: string; }[]; isPublished?: boolean; };
export type IframeStep = { type: 'iframe'; title: string; url: string; isPublished?: boolean; };
export type ActivityLinkStep = { type: 'activityLink'; title: string; activityType: string; activityLabel: string; isPublished?: boolean; };
export type HtmlSlideStep = { type: 'htmlSlide'; title: string; htmlContent: string; isPublished?: boolean; };
export type VideoStep = { type: 'video'; title: string; url: string; description?: string; isPublished?: boolean; };
export type AnagramGameStep = { type: 'anagramGame'; title: string; cards: AnagramCard[]; isPublished?: boolean; };


export type ConceptMapData = {
  nodes: { id: string; label: string; isCentral?: boolean }[];
  edges: { from: string; to:string; label?: string }[];
};

export type ConceptMapStep = {
  type: 'conceptMap';
  title: string;
  mapData: ConceptMapData;
  isPublished?: boolean;
};

export type LessonStep = 
  | ContentStep 
  | ObjectiveListStep
  | McqStep 
  | TfStep 
  | TrueFalseListStep
  | FitbStep 
  | FlashcardStep 
  | AnagramStep 
  | AnagramFlashcardStep
  | SentenceScrambleStep 
  | VisualStep
  | AccordionStep
  | IframeStep
  | ActivityLinkStep
  | ConceptMapStep
  | HtmlSlideStep
  | ConceptExplanationStep
  | AnagramGameStep
  | VideoStep;

export type CategorizationGameData = {
    title: string;
    categories: string[];
    items: { text: string; category: string }[];
};

export type SortingGameData = {
    title: string;
    items: string[];
};

export type ActivityItem = {
  id: string;
  type: 'concept' | 'definition' | 'sentence' | 'categorization' | 'sorting';
  content: {
    text?: string;
    term?: string;
    definition?: string;
    title?: string;
    // Fields for categorization type
    categories?: string[];
    items?: { text: string; category: string }[] | string[];
  };
  courseId: string;
  unitId: string;
  topicId: string;
  createdAt?: any;
};

export type YazilacaklarContent = {
  conceptDefinitions: { concept: string; definition: string; }[];
  notes: string[];
};

export type Topic = {
    id: string;
    title: string;
    steps?: LessonStep[]; // Unified content for both student and teacher
    externalLink?: string;
    sourceText?: string;
    htmlContent?: string;
    writingContent?: YazilacaklarContent; // For the new "Yazılacaklar" module
    createdAt?: any;
    isPublished?: boolean;
};

export type Unit = {
    id: string;
    title: string;
    topics?: Topic[];
    createdAt?: any;
    htmlContent?: string; // YENİ EKLENDİ
    isPublished?: boolean;
    steps?: LessonStep[];
    sourceText?: string;
};

export type Course = {
    id: string;
    title: string;
    classId?: string;
    className?: string;
    description?: string;
    progress?: number; 
    unitsCount?: number;
    topicsCount?: number;
    completedTopicsCount?: number;
    units?: Unit[]; // Subcollection
    createdAt?: any;
    isTeacherOnly?: boolean;
    isSummerSchool?: boolean;
    isPublished?: boolean;
};

export type Question = {
    id: string;
    text: string;
    type: 'Çoktan Seçmeli' | 'Doğru/Yanlış' | 'Boşluk Doldurma';
    courseId: string;
    unitId?: string;
    topicId: string;
    topic: string; // The name of the topic for display
    difficulty: 'Kolay' | 'Orta' | 'Zor';
    options?: string[];
    correctAnswer?: string;
    isTrue?: boolean;
    classId?: string;
    className?: string;
    createdAt?: any;
};

// Represents a class in the school
export type SchoolClass = {
    id: string;
    name: string;
    studentCount?: number;
    branches?: string[];
    branchCounts?: { [branchName: string]: number };
    students?: UserProfile[]; // Now holds student data directly
    createdAt?: any;
    isPublished?: boolean;
};

export type School = {
    id: string;
    name: string;
};

export type DailyQuest = {
    completed: boolean;
    score: number;
    bonus: number;
    timestamp: any; // To accommodate Firestore's ServerTimestamp
}

export type Anagram = {
  definition: string;
  scrambledWord: string;
  correctAnswer: string;
};

export type SentenceScramble = {
  scrambledSentence: string;
  correctSentence: string;
};

export type Assignment = {
  id: string;
  title: string;
  teacherId: string;
  assignmentType: 'standard' | 'deneme';
  courseId: string;
  courseName: string;
  classId: string;
  className: string;
  topicIds: string[];
  topicNames: string[];
  questionIds?: string[];
  assignedTo: string[]; // array of student UIDs
  startDate?: any; // Firestore Timestamp
  dueDate?: any; // Firestore Timestamp
  createdAt: any; // Firestore Timestamp
  duration?: number; // Total exam duration in minutes
  successThreshold?: number; // Puan barajı
  successReward?: number;    // Ödül puanı
  rewardsDistributed?: boolean; // Ödüller dağıtıldı mı?
};

export type EvaluationScaleColumn = {
  id: string;
  name: string;
  type: 'status'; // For now, only status is needed for checklists
};

// A manually created scale
export type EvaluationScale = {
  id: string;
  name: string;
  teacherId: string;
  classId: string;
  courseId: string;
  type: 'tally' | 'checklist';
  columns: EvaluationScaleColumn[];
  createdAt: any;
};

// An entry for a student within a scale
export type ScaleEntry = {
    // For tally type
    plus?: number;
    minus?: number;

    // For checklist type
    statuses?: { [columnId: string]: '+' | '-' | 'o' | null };

    // Common field
    note?: string;
    lastUpdated?: any;
}


export type AssignmentProgress = {
    status: 'not-started' | 'in-progress' | 'completed';
    completedTopicIds: string[];
    startedAt?: any;
    completedAt?: any;
}

export type CurriculumData = {
  classes: SchoolClass[];
  courses: (Course & { units?: (Unit & { topics: Topic[] })[] })[];
  students: UserProfile[];
  error?: string;
}

export type ErrorReportConversationItem = {
    sender: 'student' | 'teacher';
    message: string;
    createdAt: any; // ISO String
};

export type ErrorReport = {
    id: string;
    message: string; // The original message
    pathname: string;
    userId: string;
    userName:string;
    itemData?: string; // JSON string of the reported item
    createdAt: any; // ISO String
    status: 'new' | 'in-progress' | 'resolved';
    conversation: ErrorReportConversationItem[];
    studentHasUnreadMessages?: boolean;
}

export type ScoreEvent = {
    id: string;
    userId: string;
    points: number;
    gameType: string;
    context: string;
    timestamp: any;
    answers?: (string|boolean|null)[];
};

export type CourseProgress = {
    courseId: string;
    courseName: string;
    completedTopics: number;
    totalTopics: number;
    progress: number;
};

export type QuestionBankStats = {
    courseId: string;
    courseName: string;
    totalTests: number;
    passedTests: number;
    completionPercentage: number;
    totalScore: number;
};

export type StudentDetails = {
    profile: UserProfile;
    recentActivity: ScoreEvent[];
    coursesProgress: CourseProgress[];
    questionBankStats: QuestionBankStats[];
};

export type GetQuizInput = {
    courseId?: string;
    unitId?: string;
    topicId?: string;
    questionCount?: number;
    difficulty?: string[];
    questionTypes?: string[];
    isStatic?: boolean;
};

export type GetQuizOutput = {
    questions: Partial<Question>[];
    error?: string;
};

export type YaziTuraQuestions = {
    easy: Question[];
    medium: Question[];
    hard: Question[];
};

export type Announcement = {
  id: string;
  title: string;
  content: string;
  type: 'info' | 'warning' | 'success';
  category: 'general' | 'exam';
  createdAt: any; // Can be a Timestamp or string after serialization
};

export type GameTask = {
    id: string;
    title: string;
    gameType: string; // Örn: 'kelime-avi', 'milyoner-yarismasi'
    minSuccessRate: number; // Örn: 50 (Yüzde)
    description: string;
    xpReward?: number; // Görev başına ufak ödül
  };
  
  export type TopicMission = {
    id: string;
    title: string;
    description: string;
    order: number; // Listeleme sırası
    color: string; // Kart rengi (örn: 'from-blue-600 to-indigo-600')
    tasks: GameTask[]; // İçindeki oyunlar
    totalRewardMultiplier: number; // Bölüm sonu çarpanı (örn: 5)
    isPublished?: boolean;
  };
  
  export type UserMissionProgress = {
    userId: string;
    completedTaskIds: string[]; // Biten görev ID'leri
    scores: { [taskId: string]: number }; // Her görevden alınan puan
    completedTopicIds: string[]; // Tamamen biten konular
    lastUpdated?: any;
  };