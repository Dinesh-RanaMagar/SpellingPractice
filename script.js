/* ===== SPELLING PRACTICE APP ===== */
(function() {
  'use strict';

  // ---------- WORD BANK ----------
  const wordBank = [
    { word: 'accommodate', difficulty: 'Hard' },
    { word: 'rhythm', difficulty: 'Medium' },
    { word: 'necessary', difficulty: 'Medium' },
    { word: 'beautiful', difficulty: 'Easy' },
    { word: 'separate', difficulty: 'Medium' },
    { word: 'definitely', difficulty: 'Medium' },
    { word: 'embarrass', difficulty: 'Hard' },
    { word: 'occurrence', difficulty: 'Hard' },
    { word: 'conscience', difficulty: 'Hard' },
    { word: 'pronunciation', difficulty: 'Hard' },
    { word: 'environment', difficulty: 'Medium' },
    { word: 'government', difficulty: 'Medium' },
    { word: 'independent', difficulty: 'Medium' },
    { word: 'recommend', difficulty: 'Medium' },
    { word: 'existence', difficulty: 'Medium' },
    { word: 'maintenance', difficulty: 'Hard' },
    { word: 'curiosity', difficulty: 'Medium' },
    { word: 'definite', difficulty: 'Medium' },
    { word: 'apparent', difficulty: 'Medium' },
    { word: 'argument', difficulty: 'Easy' }
  ];

  // ---------- STATE ----------
  let currentWordIndex = 0;
  let score = 0;
  let correctCount = 0;
  let mistakeCount = 0;
  let attempts = [];               // history: { word, correct }
  let currentAnswerRevealed = false;
  let wordList = [];               // current session's 10 words (shuffled subset)

  // ---------- DOM ELEMENTS ----------
  const wordCounter = document.getElementById('wordCounter');
  const difficultyBadge = document.getElementById('difficultyBadge');
  const playAudioBtn = document.getElementById('playAudioBtn');
  const audioHint = document.getElementById('audioHint');
  const spellingInput = document.getElementById('spellingInput');
  const submitBtn = document.getElementById('submitBtn');
  const feedbackMessage = document.getElementById('feedbackMessage');
  const progressBar = document.getElementById('progressBar');
  const skipBtn = document.getElementById('skipBtn');
  const nextBtn = document.getElementById('nextBtn');
  const resetBtn = document.getElementById('resetBtn');
  const scoreDisplay = document.getElementById('scoreDisplay');
  const correctDisplay = document.getElementById('correctDisplay');
  const mistakeDisplay = document.getElementById('mistakeDisplay');
  const historyList = document.getElementById('historyList');
  const spellingCard = document.getElementById('spellingCard');

  // ---------- SPEECH SYNTHESIS ----------
  function speakWord(word) {
    if (!window.speechSynthesis) {
      audioHint.textContent = 'Speech not supported.';
      return;
    }
    // Cancel any ongoing speech
    window.speechSynthesis.cancel();

    const utterance = new SpeechSynthesisUtterance(word);
    utterance.rate = 0.8;      // slower for clarity
    utterance.pitch = 1;
    utterance.volume = 1;
    utterance.lang = 'en-US';

    // Choose a voice (prefer a natural one)
    const voices = window.speechSynthesis.getVoices();
    const preferred = voices.find(v => v.lang.startsWith('en') && v.name.includes('Google'));
    const englishVoice = voices.find(v => v.lang.startsWith('en'));
    if (preferred) utterance.voice = preferred;
    else if (englishVoice) utterance.voice = englishVoice;

    window.speechSynthesis.speak(utterance);
  }

  // preload voices (some browsers need this)
  if (window.speechSynthesis) {
    window.speechSynthesis.getVoices();
    window.speechSynthesis.onvoiceschanged = () => {};
  }

  // ---------- HELPER: SHUFFLE ----------
  function shuffleArray(arr) {
    const copy = [...arr];
    for (let i = copy.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [copy[i], copy[j]] = [copy[j], copy[i]];
    }
    return copy;
  }

  // ---------- INITIALIZE SESSION ----------
  function initSession() {
    // Create a shuffled subset of 10 words (if fewer than 10, use all)
    const shuffled = shuffleArray(wordBank);
    wordList = shuffled.slice(0, 10);
    currentWordIndex = 0;
    score = 0;
    correctCount = 0;
    mistakeCount = 0;
    attempts = [];
    currentAnswerRevealed = false;
    updateStatsUI();
    renderHistory();
    loadWord(0);
    spellingInput.disabled = false;
    submitBtn.disabled = false;
    nextBtn.disabled = true;
    spellingInput.focus();
    feedbackMessage.textContent = '';
    feedbackMessage.className = 'feedback-message';
  }

  // ---------- LOAD A WORD ----------
  function loadWord(index) {
    if (index >= wordList.length) {
      // end of session
      wordCounter.textContent = `Completed!`;
      difficultyBadge.textContent = '—';
      audioHint.textContent = 'Session finished 🎉';
      spellingInput.disabled = true;
      submitBtn.disabled = true;
      nextBtn.disabled = true;
      skipBtn.disabled = true;
      feedbackMessage.textContent = `You completed the practice! Score: ${score}`;
      feedbackMessage.className = 'feedback-message info';
      progressBar.style.width = '100%';
      return;
    }

    const entry = wordList[index];
    currentWordIndex = index;
    currentAnswerRevealed = false;

    // Update UI
    wordCounter.textContent = `Word ${index + 1} of ${wordList.length}`;
    difficultyBadge.textContent = entry.difficulty;

    // Reset input & feedback
    spellingInput.value = '';
    spellingInput.disabled = false;
    spellingInput.focus();
    feedbackMessage.textContent = '';
    feedbackMessage.className = 'feedback-message';
    submitBtn.disabled = false;
    skipBtn.disabled = false;
    nextBtn.disabled = true;

    // Audio hint
    audioHint.textContent = 'Tap to hear the word';

    // Update progress bar
    const progressPercent = (index / wordList.length) * 100;
    progressBar.style.width = `${progressPercent}%`;

    // Remove shake
    spellingCard.classList.remove('shake');
  }

  // ---------- CHECK SPELLING ----------
  function checkSpelling() {
    if (currentWordIndex >= wordList.length) return;

    const currentEntry = wordList[currentWordIndex];
    const correctWord = currentEntry.word.toLowerCase();
    const userInput = spellingInput.value.trim().toLowerCase();

    // Empty input
    if (userInput === '') {
      feedbackMessage.textContent = 'Please type a word before checking.';
      feedbackMessage.className = 'feedback-message error';
      spellingCard.classList.add('shake');
      setTimeout(() => spellingCard.classList.remove('shake'), 300);
      return;
    }

    // If answer was already revealed (incorrect previously), prevent re-checking
    if (currentAnswerRevealed) {
      feedbackMessage.textContent = 'You already revealed the answer. Click "Next" to continue.';
      feedbackMessage.className = 'feedback-message info';
      return;
    }

    // Compare
    const isCorrect = (userInput === correctWord);

    // Record attempt (only first attempt counts for stats)
    if (!currentAnswerRevealed) {
      // Mark that we've attempted
      currentAnswerRevealed = true;

      if (isCorrect) {
        // Correct!
        score += 10;
        correctCount++;
        feedbackMessage.textContent = `✅ Correct! "${currentEntry.word}" is spelled correctly.`;
        feedbackMessage.className = 'feedback-message correct';
        spellingInput.disabled = true;
        submitBtn.disabled = true;
        nextBtn.disabled = false;
        // Add to history
        attempts.push({ word: currentEntry.word, correct: true });
        renderHistory();
        updateStatsUI();
        // update progress bar slightly? It updates on next word
      } else {
        // Incorrect
        mistakeCount++;
        feedbackMessage.textContent = `❌ Incorrect. The correct spelling is: "${currentEntry.word}".`;
        feedbackMessage.className = 'feedback-message error';
        spellingInput.disabled = true;
        submitBtn.disabled = true;
        nextBtn.disabled = false;
        spellingCard.classList.add('shake');
        setTimeout(() => spellingCard.classList.remove('shake'), 300);
        // Add to history
        attempts.push({ word: currentEntry.word, correct: false });
        renderHistory();
        updateStatsUI();
      }
    }

    // Update the word counter progress bar based on current index
    const progressPercent = ((currentWordIndex + 1) / wordList.length) * 100;
    progressBar.style.width = `${progressPercent}%`;

    // If this was the last word, update final progress
    if (currentWordIndex === wordList.length - 1) {
      setTimeout(() => {
        progressBar.style.width = '100%';
      }, 300);
    }
  }

  // ---------- NEXT WORD ----------
  function nextWord() {
    if (currentWordIndex + 1 < wordList.length) {
      loadWord(currentWordIndex + 1);
    } else {
      // End of session
      loadWord(wordList.length); // triggers finished state
      progressBar.style.width = '100%';
      nextBtn.disabled = true;
      skipBtn.disabled = true;
      spellingInput.disabled = true;
      submitBtn.disabled = true;
    }
  }

  // ---------- SKIP WORD (counts as mistake) ----------
  function skipWord() {
    if (currentWordIndex >= wordList.length) return;
    if (currentAnswerRevealed) {
      // If already answered, just go next
      nextWord();
      return;
    }

    // Treat as incorrect
    const currentEntry = wordList[currentWordIndex];
    mistakeCount++;
    attempts.push({ word: currentEntry.word, correct: false });
    renderHistory();
    updateStatsUI();

    feedbackMessage.textContent = `⏭️ Skipped. The correct spelling is: "${currentEntry.word}".`;
    feedbackMessage.className = 'feedback-message error';

    spellingInput.disabled = true;
    submitBtn.disabled = true;
    nextBtn.disabled = false;
    currentAnswerRevealed = true;

    // Update progress
    const progressPercent = ((currentWordIndex + 1) / wordList.length) * 100;
    progressBar.style.width = `${progressPercent}%`;
  }

  // ---------- UPDATE STATS UI ----------
  function updateStatsUI() {
    scoreDisplay.textContent = score;
    correctDisplay.textContent = correctCount;
    mistakeDisplay.textContent = mistakeCount;
  }

  // ---------- RENDER HISTORY ----------
  function renderHistory() {
    if (attempts.length === 0) {
      historyList.innerHTML = '<span class="empty-history">No words attempted yet.</span>';
      return;
    }

    // Show last 12 attempts (newest first)
    const recent = [...attempts].reverse().slice(0, 12);
    historyList.innerHTML = recent.map(item => {
      const icon = item.correct
        ? '<i class="fas fa-check-circle"></i>'
        : '<i class="fas fa-times-circle"></i>';
      const cls = item.correct ? 'correct' : 'incorrect';
      return `<span class="history-word ${cls}">${icon} ${item.word}</span>`;
    }).join('');
  }

  // ---------- RESET ----------
  function resetGame() {
    // Clear speech
    if (window.speechSynthesis) window.speechSynthesis.cancel();
    initSession();
  }

  // ---------- EVENT LISTENERS ----------
  function attachListeners() {
    // Play audio
    playAudioBtn.addEventListener('click', () => {
      if (currentWordIndex < wordList.length) {
        speakWord(wordList[currentWordIndex].word);
      }
    });

    // Submit / check
    submitBtn.addEventListener('click', checkSpelling);

    // Enter key in input
    spellingInput.addEventListener('keydown', (e) => {
      if (e.key === 'Enter') {
        e.preventDefault();
        if (!submitBtn.disabled) {
          checkSpelling();
        } else if (!nextBtn.disabled) {
          nextWord();
        }
      }
    });

    // Next button
    nextBtn.addEventListener('click', nextWord);

    // Skip button
    skipBtn.addEventListener('click', skipWord);

    // Reset
    resetBtn.addEventListener('click', resetGame);

    // Auto-focus input after audio
    playAudioBtn.addEventListener('click', () => {
      setTimeout(() => spellingInput.focus(), 100);
    });
  }

  // ---------- START ----------
  window.addEventListener('load', () => {
    // Preload voices (needed for some browsers)
    if (window.speechSynthesis) {
      window.speechSynthesis.getVoices();
    }
    initSession();
    attachListeners();
  });

})();