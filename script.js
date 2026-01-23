// Stato dell'applicazione
let state = {
    totalCards: 0,
    completedCards: 0,
    reviewCards: 0,
    currentCardIndex: 0,
    cardOrder: 'difficulty', // 'difficulty' | 'random'
    cards: []
};

// Al caricamento, inizializza i listener per le card statiche
document.addEventListener('DOMContentLoaded', () => {
    // Aggiunge l'evento flip a tutte le card presenti nell'HTML
    document.querySelectorAll('.card').forEach(card => {
        card.onclick = (e) => flipCard(e, card);
        // Inietta i bottoni di rating dal template HTML per non ripeterli
        const template = document.getElementById('ratingButtonsTemplate');
        const clone = template.content.cloneNode(true);
        card.querySelector('.rating-container').appendChild(clone);
    });
});

/* --- Gestione Ordine --- */
function selectOrder(order) {
    state.cardOrder = order;
    document.getElementById('orderByDifficulty').classList.toggle('selected', order === 'difficulty');
    document.getElementById('orderRandom').classList.toggle('selected', order === 'random');
}

/* --- Avvio e Navigazione --- */
function startDeck() {
    toggleScreen('study');
    
    // Raccoglie le card dal DOM
    let allCards = Array.from(document.querySelectorAll('.card'));
    
    if (state.cardOrder === 'random') {
        shuffleArray(allCards);
        // Riordina il DOM
        const stack = document.querySelector('.card-stack');
        allCards.forEach(card => stack.appendChild(card));
    }
    
    // Inizializza stato
    state.cards = document.querySelectorAll('.card');
    state.totalCards = state.cards.length;
    updateStackVisuals();
    updateCounters();
}

function goToHome() {
    toggleScreen('home');
    resetState();
}

/* --- Logica Core Flashcard --- */
function flipCard(event, card) {
    // Ignora se clicco su un bottone o sull'icona home
    if (event.target.closest('.rating-btn') || event.target.closest('.home-icon')) return;

    const answer = card.querySelector('.answer');
    const rating = card.querySelector('.rating-container');
    
    // Toggle visibilità
    const isVisible = answer.classList.contains('visible');
    answer.classList.toggle('visible', !isVisible);
    rating.classList.toggle('visible', !isVisible);
}

function selectRating(event, btn, ratingType) {
    event.stopPropagation(); // Ferma il flip della carta
    
    const card = btn.closest('.card');
    const wasReview = card.dataset.review === 'true';
    const wasCompleted = card.dataset.completed === 'true';

    // Aggiorna conteggi
    if (!wasCompleted) {
        state.completedCards++;
        card.dataset.completed = 'true';
    }

    // Logica Ripasso: se 'ancora' o 'difficile' -> va ripassata
    const needsReview = (ratingType === 'ancora' || ratingType === 'difficile');
    
    if (needsReview && !wasReview) {
        state.reviewCards++;
        card.dataset.review = 'true';
    } else if (!needsReview && wasReview) {
        state.reviewCards--;
        card.dataset.review = 'false';
    }
    
    // Salva il rating per un eventuale riordino futuro
    card.dataset.lastRating = ratingType;

    updateCounters();
    nextCard();
}

function nextCard() {
    const currentCard = state.cards[state.currentCardIndex];
    currentCard.classList.add('hidden'); // Anima l'uscita
    
    state.currentCardIndex++;

    if (state.currentCardIndex < state.cards.length) {
        updateStackVisuals();
    } else {
        showCompletion();
    }
}

/* --- Gestione Finale e Riavvio --- */
function showCompletion() {
    document.querySelector('.card-stack').classList.add('completed');
    const msg = document.getElementById('completionMessage');
    msg.classList.add('visible');
    
    msg.innerHTML = `
        <h2>Sessione finita!</h2>
        <p>Hai completato ${state.totalCards} flashcard.</p>
        <p style="color: ${state.reviewCards > 0 ? 'var(--danger)' : 'var(--success)'}; font-weight: bold;">
            ${state.reviewCards > 0 ? `${state.reviewCards} da rivedere` : 'Tutto appreso perfettamente!'}
        </p>
        <div class="button-container">
            <button class="restart-btn" onclick="restartCards()">Continua a ripassare</button>
            <button class="restart-btn secondary" onclick="goToHome()">Termina</button>
        </div>
    `;
}

function restartCards() {
    // Logica di riordino intelligente: prima quelle sbagliate (ancora/difficile)
    const cardArray = Array.from(state.cards).map(card => {
        let priority = 4; // Default facile
        const r = card.dataset.lastRating;
        if (r === 'ancora') priority = 1;
        else if (r === 'difficile') priority = 2;
        else if (r === 'capito') priority = 3;
        
        return { element: card, priority };
    });

    // Ordina
    cardArray.sort((a, b) => a.priority - b.priority);

    // Riapplica al DOM
    const stack = document.querySelector('.card-stack');
    cardArray.forEach(item => {
        // Reset visivo completo della carta
        const c = item.element;
        c.classList.remove('hidden', 'active');
        c.querySelector('.answer').classList.remove('visible');
        c.querySelector('.rating-container').classList.remove('visible');
        stack.appendChild(c);
    });

    // Reset Stato parziale
    state.cards = document.querySelectorAll('.card');
    state.currentCardIndex = 0;
    state.completedCards = 0;
    state.reviewCards = 0; // Reset counter ripasso per la nuova sessione
    
    // Reset dataset sulle card
    state.cards.forEach(c => {
        c.dataset.completed = 'false';
        c.dataset.review = 'false';
    });

    document.querySelector('.card-stack').classList.remove('completed');
    document.getElementById('completionMessage').classList.remove('visible');
    
    updateStackVisuals();
    updateCounters();
}

/* --- Utility Functions --- */
function updateStackVisuals() {
    // Gestisce lo Z-Index per dare l'effetto pila
    state.cards.forEach((card, index) => {
        card.classList.remove('active');
        if (index === state.currentCardIndex) {
            card.classList.add('active'); // La carta in cima
            card.style.zIndex = '50';
        } else if (index > state.currentCardIndex) {
            // Le carte sotto hanno z-index decrescente
            card.style.zIndex = (50 - (index - state.currentCardIndex)).toString();
        } else {
            // Carte passate
            card.style.zIndex = '0';
        }
    });
}

function toggleScreen(screenName) {
    const home = document.getElementById('homeScreen');
    const stats = document.getElementById('statsHeader');
    const study = document.getElementById('studyContainer');

    if (screenName === 'home') {
        home.classList.add('visible');
        stats.style.display = 'none';
        study.style.display = 'none';
    } else {
        home.classList.remove('visible');
        stats.style.display = 'flex';
        study.style.display = 'block';
    }
}

function updateCounters() {
    document.getElementById('totalCards').innerText = `● ${state.totalCards}`;
    document.getElementById('remainingCards').innerText = `● ${state.totalCards - state.completedCards}`;
    document.getElementById('reviewCards').innerText = `● ${state.reviewCards}`;
}

function resetState() {
    state.completedCards = 0;
    state.reviewCards = 0;
    state.currentCardIndex = 0;
    
    document.querySelector('.card-stack').classList.remove('completed');
    document.getElementById('completionMessage').classList.remove('visible');

    // Reset visivo carte
    document.querySelectorAll('.card').forEach(card => {
        card.classList.remove('hidden', 'active');
        card.querySelector('.answer').classList.remove('visible');
        card.querySelector('.rating-container').classList.remove('visible');
        card.dataset.completed = 'false';
        card.dataset.review = 'false';
    });
}

function shuffleArray(array) {
    for (let i = array.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [array[i], array[j]] = [array[j], array[i]];
    }
}