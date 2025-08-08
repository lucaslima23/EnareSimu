// A inicialização do cliente Supabase é feita imediatamente
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
const loginButton = document.getElementById('login-button');
const paymentOptions = document.getElementById('payment-options');
const paymentButton = document.getElementById('payment-button');
const quizOptions = document.getElementById('quiz-options');
const userWelcomeMessage = document.getElementById('user-welcome-message');
const logoutButton = document.getElementById('logout-button');

// Elementos da nova tela de senha
const createPasswordForm = document.getElementById('create-password-form');
const newPasswordInput = document.getElementById('new-password-input');
const newPasswordConfirmInput = document.getElementById('new-password-confirm-input');

// FUNÇÕES DE LÓGICA E ESTADO

// --- Nova função para gerenciar a exibição de telas ---
function showScreen(screenToShow) {
    const screens = [startScreen, quizScreen, resultsScreen, reviewScreen, createPasswordScreen];
    screens.forEach(screen => {
        if (screen) {
            screen.classList.remove('active');
        }
    });
    if (screenToShow) {
        screenToShow.classList.add('active');
    }
}
// --------------------------------------------------------

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

// Lógica de recuperação de senha
async function handleForgotPassword() {
    const email = emailInput.value;
    if (!email) {
        alert('Por favor, insira seu e-mail para redefinir a senha.');
        return;
    }

    const { error } = await supabaseClient.auth.resetPasswordForEmail(email, {
        redirectTo: 'https://enare-simu.vercel.app/#create-password'
    });

    if (error) {
        console.error('Erro ao enviar e-mail de recuperação:', error.message);
        alert('Erro ao enviar e-mail de recuperação.');
    } else {
        alert('E-mail de redefinição de senha enviado. Verifique sua caixa de entrada.');
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
        // Lógica para lidar com o Magic Link
        const { data: { session } } = await supabaseClient.auth.getSession();
        
        if (session) {
            // Limpa o token da URL para evitar problemas futuros
            window.history.replaceState({}, document.title, window.location.pathname);
            console.log('Sessão encontrada. Token de acesso removido da URL.');
        }

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
        logoutButton.style.display = 'inline-block';
        
        const { data: profile, error } = await supabaseClient
            .from('profiles')
            .select('has_subscription, password_set')
            .eq('user_id', user.id)
            .single();

        if (error || !profile) {
            console.error('Erro ao carregar perfil:', error);
            showScreen(startScreen);
            return;
        }

        if (profile.password_set === false) {
            showScreen(createPasswordScreen);
            return;
        }

        if (profile.has_subscription) {
            showScreen(startScreen);
            authContainer.style.display = 'none';
            paymentOptions.style.display = 'none';
            quizOptions.style.display = 'block';
            userWelcomeMessage.innerText = `Olá, ${user.email}!`;
            await loadProgress();
            enableStartButton();
        } else {
            showScreen(startScreen);
            authContainer.style.display = 'block';
            paymentOptions.style.display = 'block';
            quizOptions.style.display = 'none';
        }

    } else {
        showScreen(startScreen);
        authContainer.style.display = 'block';
        paymentOptions.style.display = 'block';
        quizOptions.style.display = 'none';
        logoutButton.style.display = 'none';
    }
}

// Nova função para atualizar a senha do usuário
async function updatePassword(newPassword) {
    if (!supabaseClient || !userSession) {
        alert('Nenhum usuário logado. Por favor, faça o login novamente.');
        return;
    }

    const { error } = await supabaseClient.auth.updateUser({ password: newPassword });

    if (error) {
        console.error('Erro ao atualizar a senha:', error.message);
        alert('Erro ao atualizar a senha: ' + error.message);
    } else {
        const { error: profileError } = await supabaseClient
            .from('profiles')
            .update({ password_set: true })
            .eq('user_id', userSession.id);

        if (profileError) {
            console.error('Erro ao atualizar o perfil:', profileError.message);
        }

        alert('Senha atualizada com sucesso! Você será redirecionado para o início.');
        window.location.reload();
    }
}

// Salva o progresso no Supabase ou no localStorage
async function saveProgress() {
    try {
        const progress = {
            userAnswers: userAnswers,
            currentQuestionIndex: currentQuestionIndex,
            timeRemaining: timeRemaining
        };
        
        if (userSession) {
            const { error } = await supabaseClient
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
        if (!userSession) return;
        
        const { data: progressData, error } = await supabaseClient
            .from('performance')
            .select('data')
            .eq('user_id', userSession.id)
            .single();

        if (error && error.code === '406') {
             console.log('Nenhum progresso salvo encontrado para o usuário. Iniciando um novo simulado.');
             selectAndShuffleQuestions();
             return;
        }

        if (progressData && progressData.data) {
            const progress = progressData.data;
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


// NOVO: Função para calcular os dados de desempenho por área
function calculatePerformanceData() {
    const areas = ['Clínica Médica', 'Cirurgia Geral', 'Pediatria', 'Ginecologia e Obstetrícia', 'Medicina Preventiva e Social'];
    const performanceData = {};
    
    areas.forEach(area => {
        performanceData[area] = { correct: 0, total: 0 };
    });
    
    questions.forEach((q, index) => {
        const userAnswer = userAnswers[index];
        const isCorrect = userAnswer === q.resposta_correta;
        const area = q.area;
        if (performanceData[area]) {
            performanceData[area].total++;
            if (isCorrect) {
                performanceData[area].correct++;
            }
        }
    });
    
    const areaResults = {};
    areas.forEach(area => {
        const data = performanceData[area];
        const percentage = data.total > 0 ? (data.correct / data.total * 100).toFixed(2) : 0;
        areaResults[area] = parseFloat(percentage);
    });
    
    return areaResults;
}

// NOVO: Função para salvar os resultados no banco de dados
async function saveQuizResults(areaResults) {
    if (!userSession) return;
    
    // Adicionamos logs para depuração
    console.log("Tentando salvar resultados com user_id:", userSession.id);
    console.log("Resultados a serem salvos:", areaResults);
    
    const { error } = await supabaseClient
        .from('quiz_results')
        .insert({
            user_id: userSession.id,
            area_results: areaResults
        });
        
    if (error) {
        console.error('Erro ao salvar resultados históricos:', error);
    } else {
        console.log('Resultados do simulado salvos com sucesso!');
    }
}

// Finaliza o simulado
async function endQuiz() {
    clearInterval(timerInterval);
    localStorage.removeItem('enareSimuProgress');
    quizScreen.classList.remove('active');
    
    // Calcula e salva os resultados históricos
    const performanceData = calculatePerformanceData();
    await saveQuizResults(performanceData);
    
    resultsScreen.classList.add('active');
    renderResults();
}

// Exibe a tela de resultados
async function renderResults() {
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

    // NOVO: Carregar e exibir o gráfico de evolução
    const { data: historicalResults, error } = await supabaseClient
        .from('quiz_results')
        .select('created_at, area_results')
        .eq('user_id', userSession.id)
        .order('created_at', { ascending: true });
        
    if (error) {
        console.error('Erro ao carregar resultados históricos:', error);
        return;
    }

    const chartData = {
        labels: historicalResults.map(res => new Date(res.created_at).toLocaleDateString()),
        datasets: areas.map(area => ({
            label: area,
            data: historicalResults.map(res => res.area_results[area]),
            fill: false,
            borderColor: getRandomColor(),
            tension: 0.1
        }))
    };
    
    const chartConfig = {
        type: 'line',
        data: chartData,
        options: {
            responsive: true,
            scales: {
                y: {
                    beginAtZero: true,
                    max: 100
                }
            }
        }
    };
    
    const chartContainer = document.createElement('div');
    chartContainer.innerHTML = `
        <div class="report-area">
            <h3>Gráfico de Evolução</h3>
            <canvas id="evolution-chart"></canvas>
        </div>
    `;
    resultsContainer.appendChild(chartContainer);
    
    new Chart(document.getElementById('evolution-chart'), chartConfig);
}

// Função auxiliar para gerar cores aleatórias para o gráfico
function getRandomColor() {
    const letters = '0123456789ABCDEF';
    let color = '#';
    for (let i = 0; i < 6; i++) {
        color += letters[Math.floor(Math.random() * 16)];
    }
    return color;
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
