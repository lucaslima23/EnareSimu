// Constantes de configuração do Supabase
const SUPABASE_URL = "https://mwjaqhqtjwrkcqnfsfnn.supabase.co";
const SUPABASE_ANON_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im13amFxaHF0andya2NxbmZzZm5uIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTQ0OTMyOTEsImV4cCI6MjA3MDA2OTI5MX0.XkTTu1wWpaoczO6ZsUWAEa8fIJkKzgAtpHiQxArUWR8";

// A inicialização do cliente Supabase será feita de forma assíncrona
let supabaseClient = null;

// Variáveis do simulador
let questions = [];
let userAnswers = [];
let currentQuestionIndex = 0;
let timerInterval;
let timeRemaining = 5 * 60 * 60; // 5 horas em segundos
let userSession = null;
let userProfile = null;

// Elementos da interface
const startScreen = document.getElementById('start-screen');
const quizScreen = document.getElementById('quiz-screen');
const resultsScreen = document.getElementById('results-screen');
const reviewScreen = document.getElementById('review-screen');
const createPasswordScreen = document.getElementById('create-password-screen');

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
const paymentOptions = document.getElementById('payment-options');
const paymentButton = document.getElementById('payment-button');
const quizOptions = document.getElementById('quiz-options');
const userWelcomeMessage = document.getElementById('user-welcome-message');
const logoutButton = document.getElementById('logout-button');
const forgotPasswordLink = document.getElementById('forgot-password-link');

const createPasswordForm = document.getElementById('create-password-form');
const newPasswordInput = document.getElementById('new-password-input');
const newPasswordConfirmInput = document.getElementById('new-password-confirm-input');

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
    if (userSession) {
        await saveProgress();
    }
    const { error } = await supabaseClient.auth.signOut();
    if (error) {
        console.error('Erro ao sair:', error.message);
    } else {
        userSession = null;
        userProfile = null;
        localStorage.removeItem('enareSimuProgress');
        window.location.reload();
    }
}

async function handleForgotPassword(email) {
    if (!supabaseClient) {
        console.error('Supabase client is not initialized.');
        return;
    }
    const { error } = await supabaseClient.auth.resetPasswordForEmail(email, {
        redirectTo: window.location.origin // O Supabase se encarregará do token e redirecionamento
    });
    if (error) {
        console.error('Erro ao solicitar redefinição de senha:', error.message);
        alert('Erro ao solicitar redefinição de senha: ' + error.message);
    } else {
        alert('E-mail de redefinição de senha enviado! Verifique sua caixa de entrada.');
    }
}

async function updatePassword(newPassword) {
    if (!supabaseClient) {
        console.error('Supabase client is not initialized.');
        return;
    }
    const { error } = await supabaseClient.auth.updateUser({
        password: newPassword
    });
    if (error) {
        console.error('Erro ao atualizar a senha:', error.message);
        alert('Erro ao atualizar a senha: ' + error.message);
    } else {
        // Atualiza a coluna password_set no perfil do usuário
        await supabaseClient
            .from('profiles')
            .update({ password_set: true })
            .eq('id', userSession.id);
        alert('Senha atualizada com sucesso!');
        window.location.reload();
    }
}

// Função para gravação dos resultados na tabela quiz_results do Supabase
async function saveQuizResults() {
    if (!userSession) {
        console.warn('Usuário não logado. Os resultados não serão salvos no banco de dados.');
        return;
    }

    try {
        // Recalculamos o performanceData aqui, pois é a informação que queremos salvar.
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

        // O objeto que será inserido no Supabase
        const resultObject = {
            user_id: userSession.id,
            area_results: performanceData
        };

        const { data, error } = await supabaseClient
            .from('quiz_results')
            .insert([resultObject]);

        if (error) {
            console.error('Erro ao salvar os resultados da prova no Supabase:', error.message);
        } else {
            console.log('Resultados salvos com sucesso:', data);
        }
    } catch (error) {
        console.error('Erro ao processar e salvar os resultados:', error);
    }
}

// Carrega as chaves do Supabase e depois as questões
async function init() {
    try {
        const { createClient } = supabase;
        supabaseClient = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
        
        await loadQuestions();
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
        
        await checkUser();
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
    
    // Esconde todas as telas e botões de navegação
    document.querySelectorAll('.screen').forEach(screen => screen.classList.remove('active'));
    logoutButton.style.display = 'none';
    quizOptions.style.display = 'none';
    authContainer.style.display = 'none';
    paymentOptions.style.display = 'none';

    // O Supabase lida com o token do magic link
    const { data: { user } } = await supabaseClient.auth.getUser();
    userSession = user;
    
    if (user) {
        const { data: profile, error } = await supabaseClient
            .from('profiles')
            .select('*')
            .eq('id', user.id)
            .single();

        if (error) {
            console.error('Erro ao carregar o perfil do usuário:', error.message);
            // Se o perfil não existir, assume que o usuário não tem assinatura e senha
            userProfile = { has_subscription: false, password_set: false };
        } else {
            userProfile = profile;
        }

        userWelcomeMessage.innerText = `Olá, ${user.email}!`;
        logoutButton.style.display = 'inline-block';
        
        if (userProfile && !userProfile.password_set) {
            createPasswordScreen.classList.add('active');
            return;
        }
        
        if (userProfile && userProfile.has_subscription) {
            quizOptions.style.display = 'block';
            paymentOptions.style.display = 'none';
            startScreen.classList.add('active');
            await loadProgress();
            enableStartButton();
        } else {
            quizOptions.style.display = 'none';
            paymentOptions.style.display = 'block';
            startScreen.classList.add('active');
        }
    } else {
        startScreen.classList.add('active');
        authContainer.style.display = 'block';
        paymentOptions.style.display = 'block';
        startButton.disabled = true;
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

// Uma nova função que encapsula o cálculo, salvamento e renderização
async function saveQuizResultsAndRender() {
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

    // Salva os resultados no Supabase
    if (userSession) {
        try {
            const { error } = await supabaseClient
                .from('quiz_results')
                .insert({ user_id: userSession.id, area_results: performanceData });
                
            if (error) {
                console.error('Erro ao salvar os resultados da prova:', error);
            } else {
                console.log('Resultados da prova salvos com sucesso!');
            }
        } catch (err) {
            console.error('Erro inesperado ao salvar resultados:', err);
        }
    }

    // Renderiza os resultados na tela
    renderResults(performanceData); // Modifiquei a função renderResults para receber os dados como argumento
}

// Finaliza o simulado
async function endQuiz() {
    clearInterval(timerInterval);
    localStorage.removeItem('enareSimuProgress');
    quizScreen.classList.remove('active');
    resultsScreen.classList.add('active');

    // Chama a função que apresenta os resultados e salva no quiz_results
    await saveQuizResultsAndRender();
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

        const subjectsToReview = subjectsList.filter(s => parseFloat(s.percentage) < 50);

        const areaDiv = document.createElement('div');
        areaDiv.className = 'report-area';

        areaDiv.innerHTML = `
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
                        <span class="percentage ${parseFloat(s.percentage) < 50 ? 'red' : ''}">${s.percentage}%</span>
                    </li>
                `).join('')}
            </ul>

            <div class="review-suggestion">
                <p>
                    <strong>Análise e Sugestão:</strong>
                    ${subjectsToReview.length > 0 ? `Seu desempenho nesta área foi de <strong>${areaPercentage}%</strong>. Sugerimos revisar os seguintes assuntos, do mais fraco para o menos fraco: <strong>${subjectsToReview.map(s => s.assunto).join(', ')}</strong>.` : `Seu desempenho nesta área foi excelente! Não há assuntos com menos de 50% de acerto para revisar.`}
                </p>
            </div>
        `;
        resultsContainer.appendChild(areaDiv);
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

        reviewAlternativesContainer.appendChild(label);
    });

    reviewExplanationElement.innerText = question.explicacao || 'Nenhuma explicação disponível para esta questão.';
    
    document.getElementById('review-previous-button').disabled = currentQuestionIndex === 0;
    document.getElementById('review-next-button').disabled = currentQuestionIndex === questions.length - 1;
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
    currentQuestionIndex = 0;
    userAnswers = new Array(questions.length).fill(null);
    timeRemaining = 5 * 60 * 60;
    selectAndShuffleQuestions();
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

logoutButton.addEventListener('click', async () => {
    await signOut();
});

forgotPasswordLink.addEventListener('click', (e) => {
    e.preventDefault();
    const email = prompt('Por favor, digite seu e-mail para recuperar a senha:');
    if (email) {
        handleForgotPassword(email);
    }
});

paymentButton.addEventListener('click', async () => {
  try {
    // Faz a requisição POST para sua função serverless
    const response = await fetch('/api/create-checkout-session', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
    });

    // Se a requisição foi bem sucedida (status 200), obtém a URL do Stripe
    if (response.ok) {
      const { url } = await response.json();
      // Redireciona o usuário para a página de checkout do Stripe
      window.location.href = url;
    } else {
      // Se houve um erro na função, exibe uma mensagem no console e um alerta para o usuário
      console.error('Falha ao criar a sessão de checkout:', response.statusText);
      alert('Ocorreu um erro. Por favor, tente novamente.');
    }

  } catch (error) {
    // Trata erros de rede que impedem a requisição de ser enviada
    console.error('Erro de rede:', error);
    alert('Ocorreu um erro de rede. Por favor, verifique sua conexão.');
  }
});

// Event listener da tela de criação de senha
createPasswordForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    const newPassword = newPasswordInput.value;
    const confirmPassword = newPasswordConfirmInput.value;
    
    if (newPassword !== confirmPassword) {
        alert('As senhas não coincidem. Por favor, tente novamente.');
        return;
    }
    await updatePassword(newPassword);
});

// Inicia a aplicação
init();



