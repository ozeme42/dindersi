import type { Course, Lesson, UserProgress } from './types';

export const lessons: Lesson[] = [
  {
    id: 'l1',
    slug: 'introduction-to-calculus',
    title: 'Introduction to Calculus',
    description: 'Learn the fundamental concepts of calculus.',
    videoUrl: 'https://www.youtube.com/embed/videoseries?list=PL49CF3715CB9EF31D',
    content:
      'Calculus is a branch of mathematics that deals with rates of change and accumulation of quantities. This lesson introduces the core concepts of limits, derivatives, and integrals. We will explore how these concepts are used to solve real-world problems in physics, engineering, and economics.',
    quiz: [
      {
        question: 'What is the derivative of x^2?',
        options: ['2x', 'x', 'x/2', '2'],
        correctAnswer: '2x',
      },
      {
        question: 'What does an integral represent?',
        options: [
          'The area under a curve',
          'The slope of a curve',
          'The rate of change',
          'A single point on a graph',
        ],
        correctAnswer: 'The area under a curve',
      },
    ],
    duration: 15,
  },
  {
    id: 'l2',
    slug: 'advanced-differentiation',
    title: 'Advanced Differentiation',
    description: 'Master complex differentiation techniques.',
    videoUrl: 'https://www.youtube.com/embed/videoseries?list=PL49CF3715CB9EF31D',
    content:
      'Building on the basics, this lesson covers advanced differentiation rules such as the product rule, quotient rule, and chain rule. You will learn how to differentiate trigonometric, exponential, and logarithmic functions.',
    quiz: [
      {
        question: 'What is the product rule?',
        options: ["f'g + fg'", "f'g - fg'", "f/g'", "g/f'"],
        correctAnswer: "f'g + fg'",
      },
    ],
    duration: 20,
  },
  {
    id: 'l3',
    slug: 'mastering-integration',
    title: 'Mastering Integration',
    description: 'Deep dive into integration methods.',
    videoUrl: 'https://www.youtube.com/embed/videoseries?list=PL49CF3715CB9EF31D',
    content: 'This lesson explores various integration techniques, including substitution, integration by parts, and partial fractions. We will solve a variety of definite and indefinite integrals.',
    quiz: [
        {
            question: 'What is a common technique for integration?',
            options: ['Substitution', 'Factorization', 'Simplification', 'Multiplication'],
            correctAnswer: 'Substitution',
        }
    ],
    duration: 25,
  },
  {
    id: 'l4',
    slug: 'fundamentals-of-physics',
    title: 'Fundamentals of Physics',
    description: 'Explore the basic principles of classical mechanics.',
    videoUrl: 'https://www.youtube.com/embed/videoseries?list=PL49CF3715CB9EF31D',
    content: 'This lesson covers Newton\'s laws of motion, work, energy, and momentum. Understand the foundational concepts that govern the motion of objects in our everyday world.',
    quiz: [
        {
            question: "Which of Newton's laws is also known as the law of inertia?",
            options: ['First Law', 'Second Law', 'Third Law', 'Law of Gravitation'],
            correctAnswer: 'First Law',
        }
    ],
    duration: 18,
  },
];

export const course: Course = {
  id: 'c1',
  title: 'STEM Foundations',
  description: 'A comprehensive course on fundamental Science, Technology, Engineering, and Mathematics concepts.',
  lessons,
  image: '/images/course-banner.jpg',
};

export const userProgress: UserProgress = {
  completedLessons: ['l1'],
  scores: {
    l1: 85,
  },
  lastAccessedLesson: 'l2',
};

export const getLessonBySlug = (slug: string): Lesson | undefined => {
  return lessons.find((lesson) => lesson.slug === slug);
}
