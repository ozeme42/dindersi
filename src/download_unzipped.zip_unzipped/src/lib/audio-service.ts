'use client';

// This module encapsulates the logic for playing sounds to prevent re-creation of Audio objects on re-renders.
// The Audio objects are created once when the module is loaded on the client-side.

let correctSound: HTMLAudioElement | null = null;
let incorrectSound: HTMLAudioElement | null = null;
let timerSound: HTMLAudioElement | null = null;
let timeUpSound: HTMLAudioElement | null = null;

if (typeof window !== 'undefined') {
  try {
    // A clear, positive chime for correct answers.
    correctSound = new Audio("data:audio/wav;base64,UklGRlAFAABXQVZFZm10IBAAAAABAAEAQB8AAEAfAAABAAgAZGF0YVgFAAD//wAA//8CAP/+///+//78/v39/P38/f39/v7+/gACAAEAAgADAAQABQAHAAgACQALAAwADQAOAA8AEQASABMAFAAVABcAGAAaABsAHAAdAB8AIAAiACMAJgAnACkA");
    if (correctSound) correctSound.preload = 'auto';

    // A soft, low-pitched buzz for incorrect answers.
    incorrectSound = new Audio("data:audio/wav;base64,UklGRoAEAABXQVZFZm10IBAAAAABAAEAQB8AAEAfAAABAAgAZGF0YYAEAAAAD/D97/bv5+fl5eTj4eLg3d7e3t3c29ra2djW1tXT09LR0c/Pzs7Ozc3My8vKycfGx8TDwsLBwcC/v769vbu5ubm4t7a1tbS0srGwsLCvq6urrKurqqmpqaWlpaOjo6GhoJ+fn56dnZ2ampqZmZmYl5aVlJSQj46OjYyLiYiGhoaFhYSCgX9/f35+fX18fHt7e3p6enl5eHh3d3dwdnZwb29ubWxsa2traWloZ2dnaGhpZ2dnZ2dnZ2dnZ2dnZ2dnZ2dnZ2dnZ2dnZ2dnZ2dnZ2dnZ2dnZ2dnZ2dnZ2dnZ2dnZ2dnZ2dnZ2dnZ2dnZ2dnZ2dnZ2dnZ2dnZ2dnZ2dnZ2dnZ2dnZ2dnZ2dnZ2dnZ2dnZ2dnZ2dnZ2dnZ2dnZ2dnZ2dnZ2dnZ2dnZ2dnZ2dnZ2dnZ2dnZ2dnZ2dnZ2dnZ2dnZ2dnZ2dnZ2dnZ2dnZ2dnZ2dnZ2dnZ2dnZ2dnZ2dnZ2dnZ2dnZ2dnZ2dnZ2dnZ2dnZ2dnZ2dnZ2dnZ2dnZ2dnZ2dnZ2dnZ2dnZ2dnZ2dnZ2dnZ2dnZ2dnZ2dnZ2dnZ2dnZ2dnZ2dnZ2dnZ2dnZ2dnZ2dnZ2dnZ2dnZ2dnZ2dnZ2dnZ2dnZ2dnZ2dnZ2dnZ2dnZ2dnZ2dnZ2dnZ2dnZ2dnZ2dnZ2dnZ2dnZ2dnZ2dnZ2dnZ2dnZ2dnZ2dnZ2dnZ2dnZ2dnZ2dnZ2dnZ2dnZ2dnZ2dnZ2dnZ2dnZ2dnZ2dnZ2dnZ2dnZ2dnZ2dnZ2dnZ2dnZ2dnZ2dnZ2dnZ2dnZ2dnZ2dnZ2dnZ2dnZ2dnZ2dnZ2dnZ2dnZ2dnZ2dnZ2dnZ2dnZ2dnZ2dnZ2dnZ2dnZ2dnZ2dnZ2dnZ2dnZ2dnZ2dnZ2dnZ2dnZ2dnZ2dnZ2dnZ2dnZ2dnZ2dnZ2dnZ2dnZ2dnZ2dnZ2dnZ2dnZ2dnZ2dnZ2dnZ2dnZ2dnZ2dnZ2dnZ2dnZ2dnZ2dnZ2dnZ2dnZ2dnZ2dnZ2dnZ2dnZ2dnZ2dnZ2dnZ2dnZ2dnZ2dnZ2dnZ2dnZ2dnZ2dnZ2dnZ2dnZ2dnZ2dnZ2dnZ2dnZ2dnZ2dnZ2dnZ2dnZ2dnZ2dnZ2dnZ2dnZ2dnZ2dnZ2dnZ2dnZ2dnZ2dnZ2dnZ2dnZ2dnZ2dnZ2dnZ2dnZ2dnZ2dnZ2dnZ2dnZ2dnZ2dnZ2dnZ2dnZ2dnZ2dnZ2dnZ2dnZ2dnZ2dnZ2dnZ2dnZ2dnZ2dnZ2dnZ2dnZ2dnZ2dnZ2dnZ2dnZ2dnZ2dnZ2dnZ2dnZ2dnZ2dnZ2dnZ2dnZ2dnZ2dnZ2dnZ2dnZ2dnZ2dnZ2dnZ2dnZ2dnZ2dnZ2dnZ2dnZ2dnZ2dnZ2dnZ2dnZ2dnZ2dnZ2dnZ2dnZ2dnZ2dnZ2dnZ2dnZ2dnZ2dnZ2dnZ2dnZ2dnZ2dnZ2dnZ2dnZ2dnZ2dnZ2dnZ2dnZ2dnZ2dnZ2dnZ2dnZ2dnZ2dnZ2dnZ2dnZ2dnZ2dnZ2dnZ2dnZ2dnZ2dnZ2dnZ2dnZ2dnZ2dnZ2dnZ2dnZ2dnZ2dnZ2dnZ2dnZ2dnZ2dnZ2dnZ2dnZ2dnZ2dnZ2dnZ2dnZ2dnZ2dnZ2dnZ2dnZ2dnZ2dnZ2dnZ2dnZ2dnZ2dnZ2dnZ2dnZ2dnZ2dnZ2dnZ2dnZ2dnZ2dnZ2dnZ2dnZ2dnZ2dnZ2dnZ2dnZ2dnZ2dnZ2dnZ2dnZ2dnZ2dnZ2dnZ2dnZ2dnZ2dnZ2dnZ2dnZ2dnZ2dnZ2dnZ2dnZ2dnZ2dnZ2dnZ2dnZ2dnZ2dnZ2dnZ2dnZ2dnZ2dnZ2dnZ2dnZ2dnZ2dnZ2dnZ2dnZ2dnZ2dnZ2dnZ2dnZ2dnZ2dnZ2dnZ2dnZ2dnZ2dnZ2dnZ2dnZ2dnZ2dnZ2dnZ2dnZ2dnZ2dnZ2dnZ2dnZ2dnZ2dnZ2dnZ2dnZ2dnZ2dnZ2dnZ2dnZ2dnZ2dnZ2dnZ2dnZ2dnZ2dnZ2dnZ2dnZ2dnZ2dnZ2dnZ2dnZ2dnZ2dnZ2dnZ2dnZ2dnZ2dnZ2dnZ2dnZ2dnZ2dnZ2dnZ2dnZ2dnZ2dnZ2dnZ2dnZ2dnZ2dnZ2dnZ2dnZ2dnZ2dnZ2dnZ2dnZ2dnZ2dnZ2dnZ2dnZ2dnZ2dnZ2dnZ2dnZ2dnZ2dnZ2dnZ2dnZ2dnZ2dnZ2dnZ2dnZ2dnZ2dnZ2dnZ2dnZ2dnZ2dnZ2dnZ2dnZ2dnZ2dnZ2dnZ2dnZ2dnZ2dnZ2dnZ2dnZ2dnZ2dnZ2dnZ2dnZ2dnZ2dnZ2dnZ2dnZ2dnZ2dnZ2dnZ2dnZ2dnZ2dnZ2dnZ2dnZ2dnZ2dnZ2dnZ2dnZ2dnZ2dnZ2dnZ2dnZ2dnZ2dnZ2dnZ2dnZ2dnZ2dnZ2dnZ2dnZ2dnZ2dnZ2dnZ2dnZ2dnZ2dnZ2dnZ2dnZ2dnZ2dnZ2dnZ2dnZ2dnZ2dnZ2dnZ2dnZ2dnZ2dnZ2dnZ2dnZ2dnZ2dnZ2dnZ2dnZ2dnZ2dnZ2dnZ2dnZ2dnZ2dnZ2dnZ2dnZ2dnZ2dnZ2dnZ2dnZ2dnZ2dnZ2dnZ2dnZ2dnZ2dnZ2dnZ2dnZ2dnZ2dnZ2dnZ2dnZ2dnZ2dnZ2dnZ2dnZ2dnZ2dnZ2dnZ2dnZ2dnZ2dnZ2dnZ2dnZ2dnZ2dnZ2dnZ2dnZ2dnZ2dnZ2dnZ2dnZ2dnZ2dnZ2dnZ2dnZ2dnZ2dnZ2dnZ2dnZ2dnZ2dnZ2dnZ2dnZ2dnZ2dnZ2dnZ2dnZ2dnZ2dnZ2dnZ2dnZ2dnZ2dnZ2dnZ2dnZ2dnZ2dnZ2dnZ2dnZ2dnZ2dnZ2dnZ2dnZ2dnZ2dnZ2dnZ2dnZ2dnZ2dnZ2dnZ2dnZ2dnZ2dnZ2dnZ2dnZ2dnZ2dnZ2dnZ2dnZ2dnZ2dnZ2dnZ2dnZ2dnZ2dnZ2dnZ2dnZ2dnZ2dnZ2dnZ2dnZ2dnZ2dnZ2dnZ2dnZ2dnZ2dnZ2dnZ2dnZ2dnZ2dnZ2dnZ2dnZ2dnZ2dnZ2dnZ2dnZ2dnZ2dnZ2dnZ2dnZ2dnZ2dnZ2dnZ2dnZ2dnZ2dnZ2dnZ2dnZ2dnZ2dnZ2dnZ2dnZ2dnZ2dnZ2dnZ2dnZ2dnZ2dnZ2dnZ2dnZ2dnZ2dnZ2dnZ2dnZ2dnZ2dnZ2dnZ2dnZ2dnZ2dnZ2dnZ2dnZ2dnZ2dnZ2dnZ2dnZ2dnZ2dnZ2dnZ2dnZ2dnZ2dnZ2dnZ2dnZ2dnZ2dnZ2dnZ2dnZ2dnZ2dnZ2dnZ2dnZ2dnZ2dnZ2dnZ2dnZ2dnZ2dnZ2dnZ2dnZ2dnZ2dnZ2dnZ2dnZ2dnZ2dnZwU");
    if (incorrectSound) incorrectSound.preload = 'auto';

    // A consistent ticking sound.
    timerSound = new Audio("data:audio/wav;base64,UklGRkIAAABXQVZFZm10IBAAAAABAAEAQB8AAEAfAAABAAgAZGF0YRgAAAAA////AAAAAP///wAAAAABAAEAAgADAAQABQAGAAcACAAJAAoACwAMAA0ADgAPABAAEQASABMAFAAVABYAFwAYABkAGgAbABwAHQAeAB8AIAAhACIAIwAkACUAJgAnACgAKQAqACsALAAtAC4ALwAwADEAMgAzADQANQA2ADcAOAA5ADoAOwA8AD0APgA/AEAAQQBCAEMARABFAEYARwBIAEkASgBLAEwATQBOAE8AUABRAFIAUwBUAFUAVgBXAFgAWQBaAFsAXABdAF4AXwBgAGEAYgBjAGQAZQBmAGcAaABpAGoAawBsAG0AbgBvAHAAcQByAHMAdAB1AGMAaABpAGoAawBsAG0AbgBvAHAAcQByAHMAdAB1AHYAdwB4AHkAegB7AHwAfQB+AH8AgACBAIIAgwCEAIUAhgCHAIgAiQCKAIsAjACNAI4AjwCQAGUEAQUHCAkKCw0NDg8QERITFBUWFxgZGhscHR4fICEiIyQlJicoKSorLC0uLzAyMzQ1Njc4OTo7PD0+P0BBQkNERUZHSElKS0xNTk9QUVJTVFVWV1hZWltcXV5fYGFiY2RlZmdoaWprbG1ub3BxcnN0dXZ3eHl6e3x9fn+AgYKDhIWGh4iJiouMjY6PkJGSk5SVlpeYmZqbnJ2en6ChoqOkpaanqKmqq6ytrq+wsbKztLW2t7i5uru8vb6/wMHCw8TFxsfIycrLzM3Oz9DR0tPU1dbX2Nna29zd3t/g4eLj5OXm5+jp6uvs7e7v8PHy8/T19vf4+fr7/P3+/w==");
    if (timerSound) timerSound.preload = 'auto';

    // A distinct buzzer sound.
    timeUpSound = new Audio("data:audio/wav;base64,UklGRmACAABXQVZFZm10IBAAAAABAAEAQB8AAEAfAAABAAgAZGF0YVwCAACYmJiUlJSUlJSZmZmZmZmZmZmampqampqampqampqampqbm5ubm5ubm5ubnJycnJycnJycnJydnZ2dnZ2dnZ2enp6enp6enp6fn5+fn5+fn5+goKCgoKCgoKCgoaGhoaGhoaGhoaGioqKioqKioqKio6Ojo6Ojo6Ojo6SkpKSkpKSkpKWlpaWlpaWlpaampqampqampqamp6enp6enp6enp6ioqKioqKioqKipqampqampqampqqqqqqqqqqqqqqurq6urq6urq6usrKysrKysrKysrK2tra2tra2tra2trq6urq6urq6urq6urq6urq6urq6urq6urq6urq6urq6urq6urq6urq6urq6urq6urq6urq6urq6urq6urq6urq6urq6urq6urq6urq6urq6urq6urq6urq6urq6urq6urq6urq6urq6urq6urq6urq6urq6urq6urq6urq6urq6urq6urq6urq6urq6urq6urq6urq6urq6urq6urq6urq6urq6urq6urq6urq6urq6urq6urq6urq6urq6urq6urq6urq6urq6urq6urq6urq6urq6urq6urq6urq6urq6urq6urq6urq6urq6urq6urq6urq6urq6urq6urq6urq6urq6urq6urq6urq6urq6urq6urq6urq6urq6urq6urq6urq6urq6urq6urq6urq6urq6urq6urqGhoaGhoaGhoaGioqKioqKioqKio6Ojo6Ojo6Ojo6SkpKSkpKSkpKWlpaWlpaWlpaampqampqampqamp6enp6enp6enp6ioqKioqKioqKipqampqampqampqqqqqqqqqqqqqqurq6urq6urq6usrKysrKysrKysrK2tra2tra2tra2trq6urq6urq6urq6urq6urq6urq6urq6urq6urq6urq6urq6urq6urq6urq6urq6urq6urq6urq6urq6urq6urq6urq6urq6urq6urq6urq6urq6urq6urq6urq6urq6urq6urq6urq6urq6urq6urq6urq6urq6urq6urq6urq6urq6urq6urq6urq6urq6urq6urq6urq6urq6urq6urq6urq6urq6urq6urq6urq6urq6urq6urq6urq6urq6urq6urq6urq6urq6urq6urq6urq6urq6urq6urq6urq6urq6urq6urq6urq6urq6urq6urq6urq6urq6urq6urq6urq6urq6urq6urq6urq6urq6urq6urq6urq6urq6urq6urq6urq6urq6urq6urq6urq6urq");
    if (timeUpSound) timeUpSound.preload = 'auto';

  } catch (e) {
    console.error("Audio Service: Failed to create Audio objects.", e);
    correctSound = null;
    incorrectSound = null;
    timerSound = null;
    timeUpSound = null;
  }
}

/**
 * Plays a sound effect.
 * @param type The type of sound to play: 'correct', 'incorrect', 'timer', or 'timeUp'.
 */
export function playSound(type: 'correct' | 'incorrect' | 'timer' | 'timeUp') {
  let soundToPlay: HTMLAudioElement | null = null;
  switch (type) {
    case 'correct':
      soundToPlay = correctSound;
      break;
    case 'incorrect':
      soundToPlay = incorrectSound;
      break;
    case 'timer':
      soundToPlay = timerSound;
      break;
    case 'timeUp':
        soundToPlay = timeUpSound;
        break;
  }

  if (soundToPlay) {
    try {
        soundToPlay.currentTime = 0; // Rewind to the start
        soundToPlay.play().catch(error => {
        // Autoplay is often restricted by browsers until a user interaction.
        // This error is common and can sometimes be ignored, but we log it for debugging.
        console.warn(`Audio play failed for '${type}':`, error);
        });
    } catch(e) {
        console.error(`Could not play sound ${type}:`, e);
    }
  } else {
    console.warn(`Audio object for '${type}' is not available.`);
  }
}

/**
 * Stops the specified sound and rewinds it.
 */
export function stopSound(type: 'timer' | 'correct' | 'incorrect' | 'timeUp') {
   let soundToStop: HTMLAudioElement | null = null;
   switch(type) {
       case 'timer': soundToStop = timerSound; break;
       case 'correct': soundToStop = correctSound; break;
       case 'incorrect': soundToStop = incorrectSound; break;
       case 'timeUp': soundToStop = timeUpSound; break;
   }
  if (soundToStop && !soundToStop.paused) {
    try {
      soundToStop.pause();
      soundToStop.currentTime = 0;
    } catch (error) {
        console.warn(`Could not stop sound ${type}:`, error);
    }
  }
}
