// DOM Elements
const form = document.getElementById('add-word-form');
const engInput = document.getElementById('english');
const chiInput = document.getElementById('chinese');
const successMsg = document.getElementById('add-success-msg');

const batchForm = document.getElementById('batch-word-form');
const batchInput = document.getElementById('batch-input');
const batchSuccessMsg = document.getElementById('batch-success-msg');
const batchCountEle = document.getElementById('batch-count');

const tabSingle = document.getElementById('tab-single');
const tabBatch = document.getElementById('tab-batch');

const vocabList = document.getElementById('vocab-list');
const emptyState = document.getElementById('empty-state');
const wordCount = document.getElementById('word-count');
const searchInput = document.getElementById('search-input');

// Quiz Elements
const startBtn = document.getElementById('start-quiz-btn');
const quizWarning = document.getElementById('quiz-warning');
const quizSetup = document.getElementById('quiz-setup');
const quizActive = document.getElementById('quiz-active');
const quizResult = document.getElementById('quiz-result');

const questionWordEle = document.getElementById('question-word');
const optionsContainer = document.getElementById('options-container');
const progressFill = document.getElementById('progress-fill');
const questionCounter = document.getElementById('question-counter');
const scoreCounter = document.getElementById('score-counter');
const finalScore = document.getElementById('final-score');
const resultMessage = document.getElementById('result-message');
const retryBtn = document.getElementById('retry-btn');

// App State
let vocabulary = JSON.parse(localStorage.getItem('lumina_vocab')) || [];
const MIN_WORDS_FOR_QUIZ = 4;

let quizState = {
    questions: [],
    currentIdx: 0,
    score: 0,
    maxQuestions: 10
};

// Initialize App
function init() {
    renderVocabList();
    checkQuizEligibility();
}

// Save to LocalStorage
function saveVocab() {
    localStorage.setItem('lumina_vocab', JSON.stringify(vocabulary));
    checkQuizEligibility();
    renderVocabList();
}

// Search Functionality
if (searchInput) {
    searchInput.addEventListener('input', renderVocabList);
}

// Tab Switching functionality
tabSingle.addEventListener('click', () => {
    tabSingle.classList.add('active');
    tabBatch.classList.remove('active');
    form.classList.remove('hidden');
    batchForm.classList.add('hidden');
});

tabBatch.addEventListener('click', () => {
    tabBatch.classList.add('active');
    tabSingle.classList.remove('active');
    batchForm.classList.remove('hidden');
    form.classList.add('hidden');
});

// Add Word (Single)
form.addEventListener('submit', (e) => {
    e.preventDefault();
    
    const eng = engInput.value.trim();
    const chi = chiInput.value.trim();
    
    if (eng && chi) {
        const newWord = {
            id: Date.now().toString(),
            eng: eng,
            chi: chi,
            errors: 0,
            appearances: 0
        };
        
        vocabulary.unshift(newWord);
        saveVocab();
        
        engInput.value = '';
        chiInput.value = '';
        engInput.focus();
        
        successMsg.classList.remove('hidden');
        setTimeout(() => successMsg.classList.add('hidden'), 2000);
    }
});

// Add Word (Batch)
batchForm.addEventListener('submit', (e) => {
    e.preventDefault();
    
    const lines = batchInput.value.split('\n').map(l => l.trim()).filter(l => l);
    let addedCount = 0;
    
    for (let line of lines) {
        // split by common delimiters: tab, comma (en/tw), or " - "
        let parts = line.split(/[\t,，]| - | = |：|:/);
        
        // If not split by obvious delimiter, try space followed by chinese/non-ascii
        if (parts.length === 1) {
            const match = line.match(/([a-zA-Z\s]+)\s+(.+)/);
            if (match) {
                parts = [match[1], match[2]];
            }
        }

        if (parts.length >= 2) {
            const eng = parts[0].trim();
            const chi = parts[parts.length - 1].trim();
            if (eng && chi) {
                vocabulary.unshift({ id: Date.now().toString() + Math.random(), eng, chi, errors: 0, appearances: 0 });
                addedCount++;
            }
        }
    }
    
    if (addedCount > 0) {
        saveVocab();
        batchInput.value = '';
        
        batchCountEle.textContent = addedCount;
        batchSuccessMsg.classList.remove('hidden');
        setTimeout(() => batchSuccessMsg.classList.add('hidden'), 3000);
    } else {
        alert('無法解析單字！請確認格式是否為「英文 中文」（可用空白、逗號分隔）。');
    }
});

// Render Vocabulary List
function renderVocabList() {
    const filterText = searchInput ? searchInput.value.toLowerCase().trim() : '';
    const filteredVocab = filterText 
        ? vocabulary.filter(w => w.eng.toLowerCase().includes(filterText) || w.chi.includes(filterText))
        : vocabulary;
        
    wordCount.textContent = vocabulary.length;
    
    if (filteredVocab.length === 0) {
        vocabList.innerHTML = '';
        emptyState.classList.remove('hidden');
        if (filterText) {
            emptyState.querySelector('p').textContent = '找不到符合條件的單字！';
        } else {
            emptyState.querySelector('p').textContent = '目前字典是空的，趕快新增單字吧！';
        }
        return;
    }
    
    emptyState.classList.add('hidden');
    vocabList.innerHTML = filteredVocab.map((word) => `
        <li class="vocab-item">
            <div class="vocab-content">
                <span class="vocab-eng">${escapeHTML(word.eng)}</span>
                <span class="vocab-chi">
                    ${escapeHTML(word.chi)}
                    <span class="badges-container">
                        <span class="badge appear-badge"><i class="fa-solid fa-eye"></i> 測驗 ${word.appearances || 0} 次</span>
                        <span class="badge ${word.errors > 0 ? 'has-errors' : ''}">
                            <i class="fa-solid fa-circle-xmark"></i> 錯誤 ${word.errors || 0} 次
                        </span>
                    </span>
                </span>
            </div>
            <button type="button" class="delete-btn" data-id="${escapeHTML(String(word.id))}" title="刪除單字">
                <i class="fa-solid fa-trash-can"></i>
            </button>
        </li>
    `).join('');
}

// Global Event Delegation for Dynamic Elements (e.g., Delete Button)
vocabList.addEventListener('click', (e) => {
    // Find the closest button if the icon was clicked
    const deleteBtn = e.target.closest('.delete-btn');
    if (deleteBtn) {
        const idToRemove = deleteBtn.getAttribute('data-id');
        console.log("正在刪除單字 ID:", idToRemove);
        
        const prevLen = vocabulary.length;
        // 使用字串比對確保不會有型別不一致的問題
        vocabulary = vocabulary.filter(w => String(w.id).trim() !== String(idToRemove).trim());
        
        if (vocabulary.length === prevLen) {
            console.error("刪除失敗！找不到對應的 ID。當前所有 ID:", vocabulary.map(w => w.id));
        } else {
            console.log("成功刪除！剩餘數量:", vocabulary.length);
            saveVocab();
        }
    }
});

// Helper to prevent XSS
function escapeHTML(str) {
    return str.replace(/[&<>'"]/g, 
        tag => ({
            '&': '&amp;',
            '<': '&lt;',
            '>': '&gt;',
            "'": '&#39;',
            '"': '&quot;'
        }[tag])
    );
}

// Quiz Eligibility
function checkQuizEligibility() {
    if (vocabulary.length >= MIN_WORDS_FOR_QUIZ) {
        startBtn.disabled = false;
        quizWarning.classList.add('hidden');
    } else {
        startBtn.disabled = true;
        quizWarning.classList.remove('hidden');
    }
}

// --- Quiz Logic ---
startBtn.addEventListener('click', startQuiz);
retryBtn.addEventListener('click', () => {
    quizResult.classList.add('hidden');
    quizSetup.classList.remove('hidden');
    checkQuizEligibility();
});

function startQuiz() {
    // Generate questions
    const totalQ = Math.min(vocabulary.length, 10); // Max 10 questions
    quizState.maxQuestions = totalQ;
    quizState.currentIdx = 0;
    quizState.score = 0;
    
    // Intelligent Sorting: Prioritize high errors and low appearances
    const sortedVocab = [...vocabulary].sort((a, b) => {
        const weightA = (a.errors || 0) * 3 - (a.appearances || 0) + Math.random() * 2;
        const weightB = (b.errors || 0) * 3 - (b.appearances || 0) + Math.random() * 2;
        return weightB - weightA; // Descending order
    });
    const selectedWords = sortedVocab.slice(0, totalQ);
    
    // Increment appearances
    selectedWords.forEach(w => {
        w.appearances = (w.appearances || 0) + 1;
    });
    saveVocab();
    
    quizState.questions = selectedWords.map(word => {
        // Generate options: 1 correct + 3 wrongs (or up to how many we have)
        let otherWords = vocabulary.filter(w => w.id !== word.id);
        otherWords.sort(() => 0.5 - Math.random());
        
        let wrongOptions = otherWords.slice(0, 3).map(w => w.chi);
        let options = [word.chi, ...wrongOptions];
        // Shuffle options
        options.sort(() => 0.5 - Math.random());
        
        return {
            word: word.eng,
            correct: word.chi,
            options: options
        };
    });

    // UI Transition
    quizSetup.classList.add('hidden');
    quizActive.classList.remove('hidden');
    
    renderQuestion();
}

function renderQuestion() {
    const q = quizState.questions[quizState.currentIdx];
    questionWordEle.textContent = q.word;
    
    // Update stats
    questionCounter.textContent = `題數: ${quizState.currentIdx + 1} / ${quizState.maxQuestions}`;
    scoreCounter.textContent = `得分: ${quizState.score}`;
    progressFill.style.width = `${((quizState.currentIdx) / quizState.maxQuestions) * 100}%`;
    
    // Render options
    optionsContainer.innerHTML = '';
    q.options.forEach((opt, index) => {
        const btn = document.createElement('button');
        btn.className = 'option-btn';
        btn.innerHTML = `<span>${escapeHTML(opt)}</span> <i class="fa-solid fa-circle-check hidden icon-right"></i>`;
        
        btn.addEventListener('click', () => handleOptionClick(btn, opt, q.correct));
        optionsContainer.appendChild(btn);
    });
}

function handleOptionClick(selectedBtn, selectedOpt, correctOpt) {
    // Disable all buttons
    const allBtns = optionsContainer.querySelectorAll('.option-btn');
    allBtns.forEach(b => b.disabled = true);
    
    const isCorrect = selectedOpt === correctOpt;
    const q = quizState.questions[quizState.currentIdx]; // Get current question 'q'
    
    if (isCorrect) {
        selectedBtn.classList.add('correct');
        selectedBtn.querySelector('i').classList.remove('hidden');
        quizState.score += Math.round(100 / quizState.maxQuestions); // Calculate out of 100
        // Fix rounding issues for last question
        if(quizState.currentIdx === quizState.maxQuestions - 1 && quizState.score > 90 && quizState.score < 100 && Math.round(100/quizState.maxQuestions)*quizState.maxQuestions == 100) {
            quizState.score = 100; // Force 100 if all correct but math failed
        }
    } else {
        selectedBtn.classList.add('wrong');
        selectedBtn.querySelector('i').className = 'fa-solid fa-circle-xmark icon-right';
        
        // Find the word and increment error count
        const wrongWord = vocabulary.find(w => w.eng === q.word);
        if (wrongWord) {
            wrongWord.errors = (wrongWord.errors || 0) + 1;
            saveVocab();
        }

        // Highlight correct answer
        allBtns.forEach(b => {
            const spanText = b.querySelector('span').textContent.trim();
            if (spanText === correctOpt) {
                b.classList.add('correct');
                const icon = b.querySelector('i');
                icon.className = 'fa-solid fa-circle-check icon-right';
                // the hidden class is automatically removed since we overwrote the className
            }
        });
    }

    scoreCounter.textContent = `得分: ${quizState.score}`;

    // Next question delay
    setTimeout(() => {
        quizState.currentIdx++;
        if (quizState.currentIdx < quizState.maxQuestions) {
            renderQuestion();
        } else {
            showResults();
        }
    }, 1500);
}

function showResults() {
    quizActive.classList.add('hidden');
    quizResult.classList.remove('hidden');
    
    // Ensure final score is accurate
    if(quizState.score > 95 && quizState.score < 100) quizState.score = 100; // Rounding safety
    if(quizState.score < 0) quizState.score = 0;
    
    finalScore.textContent = quizState.score;
    progressFill.style.width = '100%';
    
    if (quizState.score >= 90) {
        resultMessage.textContent = '太棒了！您幾乎答對所有的題目。';
    } else if (quizState.score >= 70) {
        resultMessage.textContent = '表現不錯，繼續保持練習！';
    } else {
        resultMessage.textContent = '再接再厲，多熟悉單字後再來挑戰一次！';
    }
}

// Run init on load
init();
