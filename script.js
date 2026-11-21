let moves = 0;
let gridSize = 9;
let mode = "Normal";
let easyScore = Number(localStorage.getItem("easyScore")) || 0;
let normalScore = Number(localStorage.getItem("normalScore")) || 0;
let hardScore = Number(localStorage.getItem("hardScore")) || 0;
let seed = Math.floor(Math.random() * 12345);
let range;

const moveLog = [];
const enemies = [];
const directions = {
    ArrowUp: { x: 0, y: -1 },
    ArrowDown: { x: 0, y: 1 },
    ArrowLeft: { x: -1, y: 0 },
    ArrowRight: { x: 1, y: 0 },
    w: { x: 0, y: -1 },
    s: { x: 0, y: 1 },
    a: { x: -1, y: 0 },
    d: { x: 1, y: 0 }
};
const symbols = {
    ArrowUp: "↑ ",
    ArrowDown: "↓ ",
    ArrowLeft: "← ",
    ArrowRight: "→ ",
    w: "↑ ",
    s: "↓ ",
    a: "← ",
    d: "→ "
};

const grid = document.getElementById("dots");
const hint = document.getElementById("hint");
const message = document.getElementById("message");
const startButton = document.getElementById("startButton");
const randomizeButton = document.getElementById("randomize");
const seedInput = document.getElementById("seed");
const easyScoreElement = document.getElementById("easyScore");
const normalScoreElement = document.getElementById("normalScore");
const hardScoreElement = document.getElementById("hardScore");
const playerColorInput = document.getElementById("playerColor");
const enemyColorInput = document.getElementById("enemyColor");
const playerShapeInput = document.getElementById("playerShape");
const enemyShapeInput = document.getElementById("enemyShape");
let enemySpawnIntervalInput = document.getElementById("enemySpawnInterval");
let difficultySelect = document.getElementById("difficulty");

let difficulty = difficultySelect.value || "Normal";

switch (difficulty) {
    case "Easy":
        range = 5;
        break;
    case "Normal":
        range = 3;
        break;
    case "Hard":
        range = 1;
        break;
    default:
        range = 3;
        break;
}

const player = {
    x: 4,
    y: 4,
    shape: localStorage.getItem("playerShape") || playerShapeInput.value || "dot",
    color: { r: 0, g: 0, b: 0 }
};

const getColor = color => ({
    r: parseInt(color.slice(1, 3), 16),
    g: parseInt(color.slice(3, 5), 16),
    b: parseInt(color.slice(5, 7), 16)
});

const setPlayerColor = color => {
    player.color = getColor(color);
};

const setEnemyColors = color => {
    const rgb = getColor(color);
    for (const enemy of enemies) enemy.color = { ...rgb };
};

const savedPlayerColor = localStorage.getItem("playerColor") || "#3232FF";
const savedEnemyColor = localStorage.getItem("enemyColor") || "#FF3232";
const savedPlayerShape = localStorage.getItem("playerShape") || "dot";
const savedEnemyShape = localStorage.getItem("enemyShape") || "diamond";

playerColorInput.value = savedPlayerColor;
enemyColorInput.value = savedEnemyColor;
playerShapeInput.value = savedPlayerShape;
enemyShapeInput.value = savedEnemyShape;

player.shape = savedPlayerShape;
setPlayerColor(savedPlayerColor);

easyScoreElement.textContent = `Easy: ${easyScore}`;
normalScoreElement.textContent = `Normal: ${normalScore}`;
hardScoreElement.textContent = `Hard: ${hardScore}`;

seedInput.value = seed;

const inputSeed = parseInt(seedInput.value);
seed = Number.isFinite(inputSeed) ? inputSeed : Math.floor(Math.random() * 12345);

function random() {
    seed = (seed * 1664525 + 1013904223) % 4294967296;
    return seed / 4294967296;
}

function isInsideGrid(x, y) {
    return x >= 0 && x < gridSize && y >= 0 && y < gridSize;
}

function isOccupied(x, y, ignoredEnemy = null) {
    if (x === player.x && y === player.y) return true;
    return enemies.some(enemy => enemy !== ignoredEnemy && enemy.x === x && enemy.y === y);
}

function createTintFilter(id, color) {
    const svg = document.createElementNS("http://www.w3.org/2000/svg", "svg");
    const defs = document.createElementNS("http://www.w3.org/2000/svg", "defs");
    const filter = document.createElementNS("http://www.w3.org/2000/svg", "filter");
    const flood = document.createElementNS("http://www.w3.org/2000/svg", "feFlood");
    const composite = document.createElementNS("http://www.w3.org/2000/svg", "feComposite");

    svg.style.position = "absolute";
    svg.style.width = "0";
    svg.style.height = "0";

    filter.id = id;
    flood.setAttribute("flood-color", `rgb(${color.r},${color.g},${color.b})`);
    composite.setAttribute("in", "flood");
    composite.setAttribute("in2", "SourceAlpha");
    composite.setAttribute("operator", "in");

    filter.append(flood, composite);
    defs.appendChild(filter);
    svg.appendChild(defs);
    document.body.appendChild(svg);
}

function updateTintFilter(id, color) {
    const flood = document.querySelector(`#${id} feFlood`);
    if (flood) flood.setAttribute("flood-color", `rgb(${color.r},${color.g},${color.b})`);
}

function randomPositionFarFromPlayer() {
    let x, y;

    do {
        x = Math.floor(random() * gridSize);
        y = Math.floor(random() * gridSize);
    } while (
        Math.abs(x - player.x) + Math.abs(y - player.y) <= range ||
        isOccupied(x, y)
    );
    return { x, y };
}

function createEnemy() {
    const { x, y } = randomPositionFarFromPlayer();
    const enemy = {
        x,
        y,
        shape: enemyShapeInput.value,
        color: getColor(enemyColorInput.value)
    };
    enemies.push(enemy);
    return enemy;
}

function getEnemyMoves(enemy) {
    const moves = [];

    const chaseChance = {
        Easy: 0.20,
        Normal: 0.80,
        Hard: 1.00
    };

    const shouldChase = random() < chaseChance[difficulty];

    const directions = [
        { x: 1, y: 0 },
        { x: -1, y: 0 },
        { x: 0, y: 1 },
        { x: 0, y: -1 }
    ];

    // EASY: 80% random movement
    if (difficulty === "Easy" && !shouldChase) {
        for (const direction of directions) {
            const x = enemy.x + direction.x;
            const y = enemy.y + direction.y;

            if (
                isInsideGrid(x, y) &&
                !isOccupied(x, y, enemy)
            ) {
                moves.push({ x, y });
            }
        }

        return moves;
    }

    // EASY: 20% chase
    // NORMAL: 80% chase
    if (difficulty === "Easy" || difficulty === "Normal") {
        const dx = Math.sign(player.x - enemy.x);
        const dy = Math.sign(player.y - enemy.y);

        if (dx) {
            const x = enemy.x + dx;

            if (
                isInsideGrid(x, enemy.y) &&
                !isOccupied(x, enemy.y, enemy)
            ) {
                moves.push({ x, y: enemy.y });
            }
        }

        if (dy) {
            const y = enemy.y + dy;

            if (
                isInsideGrid(enemy.x, y) &&
                !isOccupied(enemy.x, y, enemy)
            ) {
                moves.push({ x: enemy.x, y });
            }
        }

        return moves;
    }

    // HARD: 100% chase, choosing the closest direction
    if (difficulty === "Hard") {
        for (const direction of directions) {
            const x = enemy.x + direction.x;
            const y = enemy.y + direction.y;

            if (
                !isInsideGrid(x, y) ||
                isOccupied(x, y, enemy)
            ) continue;

            moves.push({
                x,
                y,
                distance:
                    Math.abs(x - player.x) +
                    Math.abs(y - player.y)
            });
        }

        if (!moves.length) return [];

        const closestDistance = Math.min(
            ...moves.map(move => move.distance)
        );

        return moves.filter(
            move => move.distance === closestDistance
        );
    }

    return moves;
}

function canMove(direction) {
    const movement = directions[direction];
    if (!movement) return false;

    const x = player.x + movement.x;
    const y = player.y + movement.y;

    if (!isInsideGrid(x, y) || isOccupied(x, y)) return false;

    for (const enemy of enemies) {
        if (getEnemyMoves(enemy).some(move => move.x === x && move.y === y)) return false;
    }

    return true;
}

function move(direction) {
    const movement = directions[direction];
    if (!movement) return false;

    player.x += movement.x;
    player.y += movement.y;
    return true;
}

function moveEnemies() {
    for (const enemy of enemies) {
        const possibleMoves = getEnemyMoves(enemy);
        if (!possibleMoves.length) continue;

        const chosenMove = possibleMoves[Math.floor(random() * possibleMoves.length)];
        enemy.x = chosenMove.x;
        enemy.y = chosenMove.y;
    }
}

function checkDeath() {
    for (const direction of Object.keys(directions)) {
        if (canMove(direction)) return false;
    }
    return true;
}

function drawGrid() {
    const fragment = document.createDocumentFragment();
    const enemyMap = new Map();

    for (const enemy of enemies) {
        enemyMap.set(`${enemy.x},${enemy.y}`, enemy);
    }

    for (let y = 0; y < gridSize; y++) {
        for (let x = 0; x < gridSize; x++) {
            const cell = document.createElement("div");
            cell.className = "cell";

            if (x === player.x && y === player.y) {
                const dot = document.createElement("div");
                const img = document.createElement("img");

                dot.className = "dot";
                img.src = `${player.shape}.png`;
                img.style.filter = "url(#playerTint)";
                dot.appendChild(img);
                cell.appendChild(dot);
            } else {
                const enemy = enemyMap.get(`${x},${y}`);

                if (enemy) {
                    const dot = document.createElement("div");
                    const img = document.createElement("img");

                    dot.className = "dot";
                    img.src = `${enemy.shape}.png`;
                    img.style.filter = "url(#enemyTint)";
                    dot.appendChild(img);
                    cell.appendChild(dot);
                }
            }

            fragment.appendChild(cell);
        }
    }

    grid.replaceChildren(fragment);
    hint.textContent = mode === "Game Over" ? "Press Space to restart the game." : "Use ARROWS or WASD keys to move";
}

function refreshGame() {
    console.clear();
    moves = 0;
    gridSize = 9;
    moveLog.length = 0;
    player.x = 4;
    player.y = 4;
    enemies.length = 0;
    mode = "Normal";
    let seed = Math.floor(Math.random() * 12345);
    seedInput.value = seed;
    message.textContent = `Moves: ${moves}`;
    difficulty = difficultySelect.value || "Normal";
    switch (difficulty) {
        case "Easy":
            range = 5;
            break;
        case "Normal":
            range = 3;
            break;
        case "Hard":
            range = 1;
            break;
        default:
            range = 3;
            break;
    }
    drawGrid();
}

createTintFilter("playerTint", player.color);
createTintFilter("enemyTint", getColor(enemyColorInput.value));
updateTintFilter("playerTint", player.color);
updateTintFilter("enemyTint", getColor(enemyColorInput.value));

document.addEventListener("keydown", event => {
    if (event.key === " " || event.key === "r") {
        refreshGame();
        event.preventDefault();
        return;
    }

    if (!canMove(event.key)) return;

    if (symbols[event.key]) moveLog.push(symbols[event.key]);

    moves++;
    move(event.key);
    moveEnemies();

    console.clear();
    console.log(moveLog.join(""));

    if (checkDeath()) mode = "Game Over";

    if (moves % 5 === 0 || moves == 1 && mode !== "Game Over") createEnemy();

    drawGrid();

    message.textContent = mode === "Game Over"
        ? `Game Over! Total Moves: ${moves}`
        : `Moves: ${moves}`;

    if (difficulty === "Easy" && moves > easyScore) {
        easyScore = moves;
        localStorage.setItem("easyScore", easyScore);
        easyScoreElement.textContent = `Easy: ${easyScore}`;
    }
    if (difficulty === "Normal" && moves > normalScore) {
        normalScore = moves;
        localStorage.setItem("normalScore", normalScore);
        normalScoreElement.textContent = `Normal: ${normalScore}`;
    }
    if (difficulty === "Hard" && moves > hardScore) {
        hardScore = moves;
        localStorage.setItem("hardScore", hardScore);
        hardScoreElement.textContent = `Hard: ${hardScore}`;
    }

    event.preventDefault();
});

startButton.addEventListener("click", refreshGame);

randomizeButton.addEventListener("click", () => {
    seed = Math.floor(Math.random() * 12345);
    seedInput.value = seed;
    refreshGame();
});

playerColorInput.addEventListener("input", () => {
    localStorage.setItem("playerColor", playerColorInput.value);
    setPlayerColor(playerColorInput.value);
    updateTintFilter("playerTint", player.color);
    drawGrid();
});

enemyColorInput.addEventListener("input", () => {
    localStorage.setItem("enemyColor", enemyColorInput.value);
    const color = getColor(enemyColorInput.value);
    updateTintFilter("enemyTint", color);
    setEnemyColors(enemyColorInput.value);
    drawGrid();
});

playerShapeInput.addEventListener("change", () => {
    localStorage.setItem("playerShape", playerShapeInput.value);
    player.shape = playerShapeInput.value;
    drawGrid();
});

enemyShapeInput.addEventListener("change", () => {
    localStorage.setItem("enemyShape", enemyShapeInput.value);

    for (const enemy of enemies) {
        enemy.shape = enemyShapeInput.value;
    }

    drawGrid();
});

drawGrid();