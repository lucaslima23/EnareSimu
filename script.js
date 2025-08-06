// Variáveis do simulador
let questions = [];
let userAnswers = [];
let currentQuestionIndex = 0;
let timerInterval;
let timeRemaining = 5 * 60 * 60; // 5 horas em segundos

// Elementos da interface
const startScreen = document.getElementById('start-screen');
const quizScreen = document.getElementById('quiz-screen');
const resultsScreen = document.getElementById('results-screen');
const reviewScreen = document.getElementById('review-screen');

const startButton = document.getElementById('start-button');
const questionTextElement = document.getElementById('question-text');
const alternativesContainer = document.getElementById('alternatives-container');
const questionCounterElement = document.getElementById('question-counter');
const timerElement = document.getElementById('timer');
const previousButton = document.getElementById('previous-button');
const nextButton = document.getElementById('next-button');
const finishButton = document.getElementById('finish-button');
const reviewButton = document.getElementById('review-button');
const restartButton = document.getElementById('restart-button');
const backToResultsButton = document.getElementById('back-to-results-button');

// Carrega as questões do arquivo JSON
async function loadQuestions() {
    try {
        const response = await fetch('questions.json');
        const data = await response.json();
        questions = data;
        selectAndShuffleQuestions();
        console.log('Questões carregadas com sucesso! Agora você pode iniciar o simulado.'); // Mensagem de depuração
        enableStartButton(); // <--- Nova chamada: habilita o botão após o carregamento
    } catch (error) {
        console.error('Erro ao carregar as questões:', error);
    }
}

// Nova função para habilitar o botão de início
function enableStartButton() {
    startButton.disabled = false;
}

// Função que seleciona 20 questões de cada área e embaralha o resultado
function selectAndShuffleQuestions() {
    const groupedQuestions = {
        'Clínica Médica': [],
        'Cirurgia Geral': [],
        'Pediatria': [],
        'Ginecologia e Obstetrícia': [],
        'Medicina Preventiva e Social': []
    };

    questions.forEach(q => {
        if (groupedQuestions[q.area]) {
            groupedQuestions[q.area].push(q);
        }
    });

    let finalQuestions = [];

    for (const area in groupedQuestions) {
        for (let i = groupedQuestions[area].length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [groupedQuestions[area][i], groupedQuestions[area][j]] = [groupedQuestions[area][j], groupedQuestions[area][i]];
        }
        finalQuestions = finalQuestions.concat(groupedQuestions[area].slice(0, 20));
    }
    
    for (let i = finalQuestions.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [finalQuestions[i], finalQuestions[j]] = [finalQuestions[j], finalQuestions[i]];
    }

    questions = finalQuestions;
}

// Inicia o simulado
function startQuiz() {
    startScreen.classList.remove('active');
    quizScreen.classList.add('active');
    currentQuestionIndex = 0;
    userAnswers = new Array(questions.length).fill(null);
    renderQuestion();
    startTimer();
}

// Exibe a questão atual
function renderQuestion() {
    const question = questions[currentQuestionIndex];
    questionTextElement.innerText = question.enunciado;
    alternativesContainer.innerHTML = '';
    questionCounterElement.innerText = `Questão ${currentQuestionIndex + 1}/${questions.length}`;

    question.alternativas.forEach((alt, index) => {
        const input = document.createElement('input');
        input.type = 'radio';
        input.name = 'alternative';
        input.id = `q${currentQuestionIndex}-alt${index}`;
        input.value = String.fromCharCode(65 + index);

        const label = document.createElement('label');
        label.htmlFor = input.id;
        
        // Adiciona o input e o texto dentro do label
        label.appendChild(input);
        label.innerHTML += alt;

        // Se o usuário já respondeu, marca a resposta
        if (userAnswers[currentQuestionIndex] === input.value) {
            input.checked = true;
        }

        // Adiciona o label completo (com o input dentro) ao contêiner
        alternativesContainer.appendChild(label);
    });

    // Atualiza o estado dos botões de navegação
    previousButton.disabled = currentQuestionIndex === 0;
    nextButton.style.display = currentQuestionIndex === questions.length - 1 ? 'none' : 'inline-block';
    finishButton.style.display = currentQuestionIndex === questions.length - 1 ? 'inline-block' : 'none';
}

// Salva a resposta do usuário
function handleAnswer(event) {
    if (event.target.type === 'radio') {
        userAnswers[currentQuestionIndex] = event.target.value;
    }
}

// Navega para a próxima questão
function nextQuestion() {
    if (currentQuestionIndex < questions.length - 1) {
        currentQuestionIndex++;
        renderQuestion();
    }
}

// Navega para a questão anterior
function previousQuestion() {
    if (currentQuestionIndex > 0) {
        currentQuestionIndex--;
        renderQuestion();
    }
}

// Inicia o cronômetro
function startTimer() {
    timerInterval = setInterval(() => {
        timeRemaining--;
        const hours = Math.floor(timeRemaining / 3600);
        const minutes = Math.floor((timeRemaining % 3600) / 60);
        const seconds = timeRemaining % 60;
        timerElement.innerText = `Tempo: ${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;
        if (timeRemaining <= 0) {
            endQuiz();
        }
    }, 1000);
}

// Finaliza o simulado
function endQuiz() {
    clearInterval(timerInterval);
    quizScreen.classList.remove('active');
    resultsScreen.classList.add('active');
    renderResults();
}

// Exibe a tela de resultados
function renderResults() {
    let score = 0;
    const areasPerformance = {};

    questions.forEach((q, index) => {
        const userAnswer = userAnswers[index];
        const isCorrect = userAnswer === q.resposta_correta;

        if (isCorrect) {
            score++;
        }

        const area = q.area;
        if (!areasPerformance[area]) {
            areasPerformance[area] = { correct: 0, total: 0 };
        }
        areasPerformance[area].total++;
        if (isCorrect) {
            areasPerformance[area].correct++;
        }
    });

    const summaryHtml = `
        <p>Você acertou **${score}** de **${questions.length}** questões.</p>
        <h3>Desempenho por Área:</h3>
        <ul>
            ${Object.keys(areasPerformance).map(area => `
                <li>**${area}**: ${areasPerformance[area].correct} acertos de ${areasPerformance[area].total} (${(areasPerformance[area].correct / areasPerformance[area].total * 100).toFixed(2)}%)</li>
            `).join('')}
        </ul>
    `;
    document.getElementById('results-summary').innerHTML = summaryHtml;
}

// Inicia o modo de revisão
function startReview() {
    resultsScreen.classList.remove('active');
    reviewScreen.classList.add('active');
    currentQuestionIndex = 0;
    renderReviewQuestion();
}

// Exibe a questão na tela de revisão
function renderReviewQuestion() {
    const question = questions[currentQuestionIndex];
    const reviewQuestionTextElement = document.getElementById('review-question-text');
    const reviewAlternativesContainer = document.getElementById('review-alternatives-container');
    const reviewExplanationElement = document.getElementById('review-explanation').querySelector('p');

    reviewQuestionTextElement.innerText = question.enunciado;
    reviewAlternativesContainer.innerHTML = '';
    document.getElementById('review-counter').innerText = `Questão ${currentQuestionIndex + 1}/${questions.length}`;

    question.alternativas.forEach((alt, index) => {
        const optionLetter = String.fromCharCode(65 + index);
        const label = document.createElement('label');
        label.innerText = alt;
        
        if (optionLetter === question.resposta_correta) {
            label.classList.add('correct');
            label.innerHTML += ' **(Correta)**';
        } else if (optionLetter === userAnswers[currentQuestionIndex] && optionLetter !== question.resposta_correta) {
            label.classList.add('incorrect');
            label.innerHTML += ' **(Sua resposta)**';
        }

        reviewAlternativesContainer.appendChild(label);
    });

    reviewExplanationElement.innerText = question.explicacao || 'Nenhuma explicação disponível para esta questão.';
    
    // Atualiza botões de navegação da revisão
    document.getElementById('review-previous-button').disabled = currentQuestionIndex === 0;
    document.getElementById('review-next-button').disabled = currentQuestionIndex === questions.length - 1;
}

// Event Listeners
startButton.addEventListener('click', startQuiz);
nextButton.addEventListener('click', nextQuestion);
previousButton.addEventListener('click', previousQuestion);
alternativesContainer.addEventListener('change', handleAnswer);
finishButton.addEventListener('click', endQuiz);
reviewButton.addEventListener('click', startReview);
restartButton.addEventListener('click', () => {
    resultsScreen.classList.remove('active');
    startScreen.classList.add('active');
});

document.getElementById('review-next-button').addEventListener('click', () => {
    if (currentQuestionIndex < questions.length - 1) {
        currentQuestionIndex++;
        renderReviewQuestion();
    }
});
document.getElementById('review-previous-button').addEventListener('click', () => {
    if (currentQuestionIndex > 0) {
        currentQuestionIndex--;
        renderReviewQuestion();
    }
});
backToResultsButton.addEventListener('click', () => {
    reviewScreen.classList.remove('active');
    resultsScreen.classList.add('active');
});

// Inicializa a aplicação
loadQuestions();

