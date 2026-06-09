const express = require('express');
const cors = require('cors');
const app = express();

app.use(cors());
app.use(express.json());

// État initial global de la partie
let gameState = {
    board: Array(14).fill(5), // 14 cases contenant chacune 5 graines
    currentPlayer: "SUD",
    moveCounter: 0,
    lastMoveFrom: null,
    scoreSud: 0,
    scoreNord: 0,
    tickerMessage: "Connexion établie. Joueur SUD, ouvrez les hostilités !",
    speakMessage: "La matrice est prête. Joueur Sud, à vous."
};

function resetGame() {
    gameState = {
        board: Array(14).fill(5),
        currentPlayer: "SUD",
        moveCounter: 0,
        lastMoveFrom: null,
        scoreSud: 0,
        scoreNord: 0,
        tickerMessage: "Plateau réinitialisé par commande centrale. Prêt !",
        speakMessage: "Le serveur a remis à zéro la partie."
    };
}

// Route d'interrogation (Polling du client)
app.get('/state', (req, res) => {
    res.json(gameState);
});

// Route de réinitialisation
app.post('/reset', (req, res) => {
    resetGame();
    res.json({ success: true });
});

// Route principale de gestion d'un coup
app.post('/move', (req, res) => {
    const { index, player } = req.body;
    const idx = parseInt(index);

    if (player !== gameState.currentPlayer) {
        return res.status(400).json({ error: `Refusé : Ce n'est pas le tour de ${player}.` });
    }
    if (gameState.board[idx] === 0) {
        return res.status(400).json({ error: "Action impossible : La case sélectionnée est vide." });
    }

    let boardClone = [...gameState.board];
    let seeds = boardClone[idx];
    boardClone[idx] = 0; // On vide la case de départ

    let curr = idx;
    // Distribution circulaire (on sème une graine par case)
    while (seeds > 0) {
        curr = (curr + 1) % 14;
        if (curr !== idx) { 
            boardClone[curr]++;
            seeds--;
        }
    }

    // Calcul des captures (uniquement dans les lignes du camp adverse)
    let minOpp = (player === "SUD") ? 7 : 0;
    let maxOpp = (player === "SUD") ? 13 : 6;
    let capturedPoints = 0;
    let capturedIndices = [];

    let checkIdx = curr;
    // Rafle à rebours (rétrograde)
    while (checkIdx >= minOpp && checkIdx <= maxOpp) {
        if (boardClone[checkIdx] >= 2 && boardClone[checkIdx] <= 4) {
            capturedPoints += boardClone[checkIdx];
            capturedIndices.push(checkIdx);
            checkIdx--;
        } else {
            break;
        }
    }

    // Règle anti-famine (interdiction d'affamer totalement l'adversaire)
    let totalOppRemaining = 0;
    for (let i = minOpp; i <= maxOpp; i++) {
        totalOppRemaining += boardClone[i];
    }

    let famineAlert = "";
    if (capturedPoints === totalOppRemaining && totalOppRemaining > 0) {
        capturedPoints = 0;
        capturedIndices = [];
        famineAlert = " (Prise annulée : Règle de Famine)";
    }

    // Application des captures validées
    capturedIndices.forEach(i => { boardClone[i] = 0; });
    
    if (player === "SUD") gameState.scoreSud += capturedPoints;
    else gameState.scoreNord += capturedPoints;

    // Sauvegarde des métadonnées pour que l'animation sache d'où proviennent les pions
    gameState.board = boardClone;
    gameState.lastMoveFrom = idx; 
    gameState.moveCounter++;

    // Changement de tour
    const nextPlayer = (player === "SUD") ? "NORD" : "SUD";
    gameState.currentPlayer = nextPlayer;

    // Messages dynamiques pour le ticker et la synthèse vocale
    let displayLabel = (player === "SUD") ? `S${idx + 1}` : `N${idx - 6}`;
    gameState.tickerMessage = `Dernier coup : ${player} a joué ${displayLabel}.${famineAlert} Prise : ${capturedPoints} pions.`;
    gameState.speakMessage = `${player} joue la case ${displayLabel}. ` + (capturedPoints > 0 ? `Capture de ${capturedPoints} pions.` : "");

    res.json(gameState);
});

app.listen(4000, () => {
    console.log("=================================================");
    console.log("🚀 BACKEND SONGO ACTIF SUR LE PORT : 4000");
    console.log("=================================================");
});
