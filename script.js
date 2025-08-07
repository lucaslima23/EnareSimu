// A inicialização do cliente Supabase é feita imediatamente
// Certifique-se de que o script do Supabase está carregado no HTML antes deste script
const { createClient } = supabase;
const supabaseClient = createClient(window.SUPABASE_URL, window.SUPABASE_ANON_KEY);

// Variáveis do simulador
let questions = [];
let userAnswers = [];
let currentQuestionIndex = 0;
let timerInterval;
let timeRemaining = 5 * 60 * 60; // 5 horas em segundos
let userSession = null;

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

const authContainer = document.getElementById('auth-container');
const authForm = document.getElementById('auth-form');
const emailInput = document.getElementById('email-input');
const passwordInput = document.getElementById('password-input');
const loginButton = document.getElementById('login-button');
const paymentOptions = document.getElementById('payment-options');
const paymentButton = document.getElementById('payment-button');
const quizOptions = document.getElementById('quiz-options');
const userWelcomeMessage = document.getElementById('user-welcome-message');
const logoutButton = document.getElementById('logout-button');

// FUNÇÕES DE LÓGICA E ESTADO

// Funções de Autenticação
async function signIn(email, password) {
    if (!supabaseClient) {
        console.error('Supabase client is not initialized.');
        return;
    }
    const { data, error } = await supabaseClient.auth.signInWithPassword({
        email: email,
        password: password
    });
    if (error) {
        console.error('Erro no login:', error.message);
        alert('Erro no login: ' + error.message);
    } else {
        userSession = data.user;
        checkUser();
    }
}

async function signOut() {
    if (!supabaseClient) {
        return;
    }
    const { error } = await supabaseClient.auth.signOut();
    if (error) {
        console.error('Erro ao sair:', error.message);
    } else {
        userSession = null;
        window.location.reload();
    }
}

// Funções de inicialização e autenticação
async function init() {
    try {
        await loadQuestions();
        await checkUser();
    } catch (error) {
        console.error('Falha na inicialização:', error);
    }
}

// Carrega as questões do arquivo JSON
async function loadQuestions() {
    try {
        const response = await fetch('questions.json');
        const data = await response.json();
        questions = data;
    } catch (error) {
        console.error('Erro ao carregar as questões:', error);
    }
}

// Verifica se o usuário está logado e atualiza a interface
async function checkUser() {
    if (!supabaseClient) {
        console.error('Supabase client is not initialized.');
        return;
    }
    const { data: { user } } = await supabaseClient.auth.getUser();
    userSession = user;
    
    if (user) {
        authContainer.style.display = 'none';
        quizOptions.style.display = 'block';
        userWelcomeMessage.innerText = `Olá, ${user.email}!`;
        
        // Lógica de verificação de assinatura
        const hasSubscription = false; // <<< AQUI VOCÊ FARÁ A VERIFICAÇÃO DO STATUS DE ASSINATURA

        if (hasSubscription) {
            await loadProgress(); // Carrega o progresso do usuário logado
            enableStartButton();
        } else {
            paymentOptions.style.display = 'block'; // Mostra opções de pagamento
            startButton.style.display = 'none'; // Esconde o botão de iniciar simulador
        }
    } else {
        authContainer.style.display = 'block';
        paymentOptions.style.display = 'block';
        quizOptions.style.display = 'none';
        enableStartButton(); // Habilita o botão para o login/cadastro
    }
}

// Salva o progresso no Supabase ou no localStorage
async function saveProgress() {
    try {
        const progress = {
            questions: questions,
            userAnswers: userAnswers,
            currentQuestionIndex: currentQuestionIndex,
            timeRemaining: timeRemaining
        };
        
        if (userSession) {
            const { data, error } = await supabaseClient
                .from('performance')
                .upsert({ user_id: userSession.id, data: progress }, { onConflict: 'user_id' });
            
            if (error) console.error('Erro ao salvar desempenho no Supabase:', error);
        } else {
            localStorage.setItem('enareSimuProgress', JSON.stringify(progress));
        }
    } catch (error) {
        console.error('Erro ao salvar o progresso:', error);
    }
}

// Carrega o progresso do Supabase ou do localStorage
async function loadProgress() {
    try {
        if (userSession) {
            const { data: progressData, error } = await supabaseClient
                .from('performance')
                .select('data')
                .eq('user_id', userSession.id)
                .single();

            if (progressData && progressData.data) {
                const progress = progressData.data;
                questions = progress.questions;
                userAnswers = progress.userAnswers;
                currentQuestionIndex = progress.currentQuestionIndex;
                timeRemaining = progress.timeRemaining;
                startButton.innerText = 'Continuar Simulador';
                return;
            }
        }
        
        const savedProgress = localStorage.getItem('enareSimuProgress');
        if (savedProgress) {
            const progress = JSON.parse(savedProgress);
            questions = progress.questions;
            userAnswers = progress.userAnswers;
            currentQuestionIndex = progress.currentQuestionIndex;
            timeRemaining = progress.timeRemaining;
            startButton.innerText = 'Continuar Simulador';
            return;
        }
    } catch (error) {
        console.error('Erro ao carregar o progresso:', error);
    }
    selectAndShuffleQuestions();
}

// Habilita o botão de início
function enableStartButton() {
    startButton.disabled = false;
}

// Embaralha as questões de forma proporcional
function selectAndShuffleQuestions() {
    const originalQuestions = questions;
    const groupedQuestions = {
        'Clínica Médica': [],
        'Cirurgia Geral': [],
        'Pediatria': [],
        'Ginecologia e Obstetrícia': [],
        'Medicina Preventiva e Social': []
    };

    originalQuestions.forEach(q => {
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
    
    if (startButton.innerText === 'Iniciar Simulador') {
        currentQuestionIndex = 0;
        userAnswers = new Array(questions.length).fill(null);
        timeRemaining = 5 * 60 * 60;
    }
    
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
        
        label.appendChild(input);
        label.innerHTML += alt;

        if (userAnswers[currentQuestionIndex] === input.value) {
            input.checked = true;
            label.classList.add('selected');
        }

        alternativesContainer.appendChild(label);
    });

    previousButton.disabled = currentQuestionIndex === 0;
    nextButton.style.display = currentQuestionIndex === questions.length - 1 ? 'none' : 'inline-block';
    finishButton.style.display = currentQuestionIndex === questions.length - 1 ? 'inline-block' : 'none';
}

// Salva a resposta do usuário
function handleAnswer(event) {
    if (event.target.type === 'radio') {
        document.querySelectorAll('.alternatives label').forEach(label => {
            label.classList.remove('selected');
        });
        
        event.target.parentNode.classList.add('selected');
        
        userAnswers[currentQuestionIndex] = event.target.value;
        saveProgress();
    }
}

// Navega para a próxima questão
function nextQuestion() {
    if (currentQuestionIndex < questions.length - 1) {
        currentQuestionIndex++;
        renderQuestion();
        saveProgress();
    }
}

// Navega para a questão anterior
function previousQuestion() {
    if (currentQuestionIndex > 0) {
        currentQuestionIndex--;
        renderQuestion();
        saveProgress();
    }
}

// Atualiza a exibição do cronômetro
function renderTimer() {
    const hours = Math.floor(timeRemaining / 3600);
    const minutes = Math.floor((timeRemaining % 3600) / 60);
    const seconds = timeRemaining % 60;
    timerElement.innerText = `Tempo: ${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;
}

// Inicia o cronômetro
function startTimer() {
    renderTimer();
    timerInterval = setInterval(() => {
        timeRemaining--;
        if (timeRemaining >= 0) {
            renderTimer();
            saveProgress();
        }
        if (timeRemaining <= 0) {
            endQuiz();
        }
    }, 1000);
}

// Finaliza o simulado
function endQuiz() {
    clearInterval(timerInterval);
    localStorage.removeItem('enareSimuProgress');
    quizScreen.classList.remove('active');
    resultsScreen.classList.add('active');
    renderResults();
}

// Exibe a tela de resultados
function renderResults() {
    let resultsContainer = document.getElementById('results-summary');
    resultsContainer.innerHTML = '';

    const areas = ['Clínica Médica', 'Cirurgia Geral', 'Pediatria', 'Ginecologia e Obstetrícia', 'Medicina Preventiva e Social'];

    const performanceData = {};
    questions.forEach((q, index) => {
        const userAnswer = userAnswers[index];
        const isCorrect = userAnswer === q.resposta_correta;
        const area = q.area;
        const assunto = q.assunto_especifico;

        if (!performanceData[area]) {
            performanceData[area] = { correct: 0, total: 0, subjects: {} };
        }
        performanceData[area].total++;
        if (isCorrect) {
            performanceData[area].correct++;
        }

        if (!performanceData[area].subjects[assunto]) {
            performanceData[area].subjects[assunto] = { correct: 0, total: 0 };
        }
        performanceData[area].subjects[assunto].total++;
        if (isCorrect) {
            performanceData[area].subjects[assunto].correct++;
        }
    });

    areas.forEach(area => {
        const areaPerformance = performanceData[area] || { correct: 0, total: 0, subjects: {} };
        const areaPercentage = areaPerformance.total > 0 ? (areaPerformance.correct / areaPerformance.total * 100).toFixed(2) : 0;

        const subjectsList = Object.keys(areaPerformance.subjects).map(assunto => {
            const subjectData = areaPerformance.subjects[assunto];
            const percentage = (subjectData.correct / subjectData.total * 100).toFixed(2);
            return { assunto, percentage };
        }).sort((a, b) => b.percentage - a.percentage);

        const subjectsToReview = subjectsList.filter(s => s.percentage < 50);

        const areaHtml = `
            <div class="report-area">
                <h3>${area}</h3>
                <div class="performance-charts">
                    <div class="chart-container" style="background: conic-gradient(var(--primary-color) ${areaPercentage}%, var(--secondary-color) 0%);">
                        <span class="chart-text">Seu Desempenho<br>${areaPercentage}%</span>
                    </div>
                    <div class="chart-container" style="background: conic-gradient(lightgrey 50%, #ccc 0%);">
                        <span class="chart-text">Média Geral<br>Em breve</span>
                    </div>
                </div>

                <h4>Desempenho por Assunto:</h4>
                <ul class="subjects-list">
                    ${subjectsList.map(s => `
                        <li>
                            <span class="subject-title">${s.assunto}</span>
                            <span class="percentage ${s.percentage < 50 ? 'red' : ''}">${s.percentage}%</span>
                        </li>
                    `).join('')}
                </ul>

                <div class="review-suggestion">
                    <p>
                        **Análise e Sugestão:**
                        ${subjectsToReview.length > 0 ? `Seu desempenho nesta área foi de **${areaPercentage}%**. Sugerimos revisar os seguintes assuntos, do mais fraco para o menos fraco: <strong>${subjectsToReview.map(s => s.assunto).join(', ')}</strong>.` : `Seu desempenho nesta área foi excelente! Não há assuntos com menos de 50% de acerto para revisar.`}
                    </p>
                </div>
            </div>
        `;

        resultsContainer.innerHTML += areaHtml;
    });
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
        } else if (userAnswers[currentQuestionIndex] === optionLetter && optionLetter !== question.resposta_correta) {
            label.classList.add('incorrect');
            label.innerHTML += ' **(Sua resposta)**';
        }

        reviewAlternativesContainer.appendChild(label);
    });

    reviewExplanationElement.innerText = question.explicacao || 'Nenhuma explicação disponível para esta questão.';
    
    document.getElementById('review-previous-button').disabled = currentQuestionIndex === 0;
    document.getElementById('review-next-button').disabled = currentQuestionIndex === questions.length - 1;
}

// Adicionada a função para lidar com o pagamento do Stripe
async function handlePayment() {
    paymentButton.disabled = true;
    paymentButton.innerText = 'Carregando...';

    try {
        // Removemos a verificação de usuário e não passamos o userSession
        const { data, error } = await supabaseClient.functions.invoke('create-checkout-session', {
            // Não há mais um 'body' com o objeto 'user'
        });

        if (error) {
            console.error('Erro ao criar sessão de checkout:', error);
            alert('Não foi possível iniciar o pagamento. Tente novamente.');
        } else {
            window.location.href = `https://checkout.stripe.com/c/pay/${data.sessionId}`;
        }
    } catch (err) {
        console.error('Erro inesperado:', err);
        alert('Ocorreu um erro. Tente novamente mais tarde.');
    } finally {
        paymentButton.disabled = false;
        paymentButton.innerText = 'Assinar Plataforma (R$ 299,90/ano)';
    }
}


// LISTA DE EVENT LISTENERS
startButton.addEventListener('click', startQuiz);
nextButton.addEventListener('click', nextQuestion);
previousButton.addEventListener('click', previousQuestion);
alternativesContainer.addEventListener('change', handleAnswer);
finishButton.addEventListener('click', endQuiz);
reviewButton.addEventListener('click', startReview);
restartButton.addEventListener('click', () => {
    localStorage.removeItem('enareSimuProgress');
    resultsScreen.classList.remove('active');
    startScreen.classList.add('active');
    startButton.innerText = 'Iniciar Simulador';
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

// Event listeners do formulário de autenticação
authForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    await signIn(emailInput.value, passwordInput.value);
});

// Adicionado o event listener para o botão de pagamento
paymentButton.addEventListener('click', handlePayment);

// Removido o event listener do registerButton, pois ele não existe no HTML
// registerButton.addEventListener('click', async () => {
//    await signUp(emailInput.value, passwordInput.value);
// });


// Inicializa a aplicação
init();

