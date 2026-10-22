const boardElement = document.getElementById("board");
const statusElement = document.getElementById("status");

const PIECES = {
  wP: "♙", wR: "♖", wN: "♘", wB: "♗", wQ: "♕", wK: "♔",
  bP: "♟", bR: "♜", bN: "♞", bB: "♝", bQ: "♛", bK: "♚"
};

let board = [];
let selectedSquare = null;
let currentPlayer = "w";
let legalMoves = [];

function createInitialBoard() {
  const b = Array(8).fill(null).map(() => Array(8).fill(null));

  const backRank = ["bR", "bN", "bB", "bQ", "bK", "bB", "bN", "bR"];
  const pawns = Array(8).fill("bP");

  for (let col = 0; col < 8; col++) {
    b[0][col] = backRank[col];
    b[1][col] = pawns[col];
    b[6][col] = "wP";
    b[7][col] = backRank[col].replace("b", "w");
  }

  return b;
}

function cloneBoard(state) {
  return state.map(row => row.slice());
}

function getPieceColor(piece) {
  if (!piece) return null;
  return piece === piece.toUpperCase() ? "w" : "b";
}

function isInsideBoard(row, col) {
  return row >= 0 && row < 8 && col >= 0 && col < 8;
}

function getPieceAt(state, row, col) {
  if (!isInsideBoard(row, col)) return null;
  return state[row][col];
}

function isOpponent(piece, color) {
  return piece && getPieceColor(piece) !== color;
}

function findKing(state, color) {
  const target = color === "w" ? "wK" : "bK";
  for (let row = 0; row < 8; row++) {
    for (let col = 0; col < 8; col++) {
      if (state[row][col] === target) return { row, col };
    }
  }
  return null;
}

function generatePseudoMovesForPiece(state, row, col) {
  const piece = state[row][col];
  if (!piece) return [];

  const color = getPieceColor(piece);
  const moves = [];
  const type = piece.toLowerCase();

  if (type === "p") {
    const direction = color === "w" ? -1 : 1;
    const startRow = color === "w" ? 6 : 1;

    let oneStepRow = row + direction;
    if (isInsideBoard(oneStepRow, col) && !state[oneStepRow][col]) {
      moves.push({ row: oneStepRow, col });
      const twoStepRow = row + 2 * direction;
      if (row === startRow && !state[twoStepRow][col]) {
        moves.push({ row: twoStepRow, col });
      }
    }

    [-1, 1].forEach(deltaCol => {
      const targetRow = row + direction;
      const targetCol = col + deltaCol;
      if (!isInsideBoard(targetRow, targetCol)) return;
      const target = state[targetRow][targetCol];
      if (target && isOpponent(target, color)) {
        moves.push({ row: targetRow, col: targetCol });
      }
    });
  }

  if (type === "n") {
    const offsets = [
      [-2, -1], [-2, 1], [-1, -2], [-1, 2],
      [1, -2], [1, 2], [2, -1], [2, 1]
    ];
    offsets.forEach(([dr, dc]) => {
      const targetRow = row + dr;
      const targetCol = col + dc;
      if (!isInsideBoard(targetRow, targetCol)) return;
      const target = state[targetRow][targetCol];
      if (!target || isOpponent(target, color)) {
        moves.push({ row: targetRow, col: targetCol });
      }
    });
  }

  if (type === "b" || type === "r" || type === "q") {
    const directions = [];
    if (type === "b" || type === "q") {
      directions.push([-1, -1], [-1, 1], [1, -1], [1, 1]);
    }
    if (type === "r" || type === "q") {
      directions.push([-1, 0], [1, 0], [0, -1], [0, 1]);
    }

    directions.forEach(([dr, dc]) => {
      let nextRow = row + dr;
      let nextCol = col + dc;
      while (isInsideBoard(nextRow, nextCol)) {
        const target = state[nextRow][nextCol];
        if (!target) {
          moves.push({ row: nextRow, col: nextCol });
        } else {
          if (isOpponent(target, color)) {
            moves.push({ row: nextRow, col: nextCol });
          }
          break;
        }
        nextRow += dr;
        nextCol += dc;
      }
    });
  }

  if (type === "k") {
    const directions = [
      [-1, -1], [-1, 0], [-1, 1],
      [0, -1],           [0, 1],
      [1, -1],  [1, 0],  [1, 1]
    ];

    directions.forEach(([dr, dc]) => {
      const targetRow = row + dr;
      const targetCol = col + dc;
      if (!isInsideBoard(targetRow, targetCol)) return;
      const target = state[targetRow][targetCol];
      if (!target || isOpponent(target, color)) {
        moves.push({ row: targetRow, col: targetCol });
      }
    });
  }

  return moves;
}

function isKingInCheck(state, color) {
  const kingPos = findKing(state, color);
  if (!kingPos) return false;

  for (let row = 0; row < 8; row++) {
    for (let col = 0; col < 8; col++) {
      const piece = state[row][col];
      if (!piece || getPieceColor(piece) === color) continue;

      const pseudoMoves = generatePseudoMovesForPiece(state, row, col);
      const isAttacking = pseudoMoves.some(move => move.row === kingPos.row && move.col === kingPos.col);
      if (isAttacking) return true;
    }
  }

  return false;
}

function wouldLeaveKingInCheck(state, fromRow, fromCol, toRow, toCol) {
  const newBoard = cloneBoard(state);
  const movingPiece = newBoard[fromRow][fromCol];
  newBoard[fromRow][fromCol] = null;
  newBoard[toRow][toCol] = movingPiece;

  if (movingPiece.toLowerCase() === "p" && (toRow === 0 || toRow === 7)) {
    newBoard[toRow][toCol] = movingPiece === "wP" ? "wQ" : "bQ";
  }

  const color = getPieceColor(movingPiece);
  return isKingInCheck(newBoard, color);
}

function generateLegalMovesForColor(state, color) {
  const moves = [];

  for (let row = 0; row < 8; row++) {
    for (let col = 0; col < 8; col++) {
      const piece = state[row][col];
      if (!piece || getPieceColor(piece) !== color) continue;

      const pseudoMoves = generatePseudoMovesForPiece(state, row, col);
      pseudoMoves.forEach(move => {
        if (!wouldLeaveKingInCheck(state, row, col, move.row, move.col)) {
          moves.push({
            from: { row, col },
            to: { row: move.row, col: move.col }
          });
        }
      });
    }
  }

  return moves;
}

function renderBoard() {
  boardElement.innerHTML = "";

  for (let row = 0; row < 8; row++) {
    for (let col = 0; col < 8; col++) {
      const square = document.createElement("div");
      square.className = `square ${(row + col) % 2 === 0 ? "light" : "dark"}`;
      square.dataset.row = row;
      square.dataset.col = col;

      if (selectedSquare && selectedSquare.row === row && selectedSquare.col === col) {
        square.classList.add("selected");
      }

      const moveTarget = legalMoves.find(
        move => move.to.row === row && move.to.col === col
      );

      if (moveTarget) {
        const isCapture = !!board[row][col];
        square.classList.add(isCapture ? "capture" : "possible-move");
      }

      const piece = board[row][col];
      if (piece) {
        const pieceEl = document.createElement("span");
        pieceEl.textContent = PIECES[piece];
        square.appendChild(pieceEl);
      }

      square.addEventListener("click", () => handleSquareClick(row, col));
      boardElement.appendChild(square);
    }
  }
}

function updateStatus(message) {
  statusElement.textContent = message;
}

function selectPiece(row, col) {
  selectedSquare = { row, col };
  const piece = board[row][col];
  legalMoves = [];

  if (piece && getPieceColor(piece) === currentPlayer) {
    legalMoves = generateLegalMovesForColor(board, currentPlayer)
      .filter(move => move.from.row === row && move.from.col === col)
      .map(move => ({ from: move.from, to: move.to }));
  }

  renderBoard();
}

function movePiece(fromRow, fromCol, toRow, toCol) {
  const piece = board[fromRow][fromCol];
  board[fromRow][fromCol] = null;

  if (piece.toLowerCase() === "p" && (toRow === 0 || toRow === 7)) {
    board[toRow][toCol] = piece === "wP" ? "wQ" : "bQ";
  } else {
    board[toRow][toCol] = piece;
  }

  selectedSquare = null;
  legalMoves = [];
  currentPlayer = currentPlayer === "w" ? "b" : "w";
  const winner = checkGameState();
  renderBoard();
  updateStatus(winner || (currentPlayer === "w" ? "White to move" : "Black to move"));
}

function checkGameState() {
  const opponent = currentPlayer === "w" ? "b" : "w";
  const inCheck = isKingInCheck(board, opponent);

  if (generateLegalMovesForColor(board, opponent).length === 0) {
    if (inCheck) {
      return `${currentPlayer === "w" ? "White" : "Black"} wins by checkmate!`;
    }
    return "Stalemate!";
  }

  if (inCheck) {
    return `${opponent === "w" ? "White" : "Black"} is in check`;
  }

  return "";
}

function handleSquareClick(row, col) {
  const clickedPiece = board[row][col];

  if (!selectedSquare) {
    if (clickedPiece && getPieceColor(clickedPiece) === currentPlayer) {
      selectPiece(row, col);
    }
    return;
  }

  const fromRow = selectedSquare.row;
  const fromCol = selectedSquare.col;

  const validMove = legalMoves.some(
    move => move.from.row === fromRow && move.from.col === fromCol &&
            move.to.row === row && move.to.col === col
  );

  if (validMove) {
    movePiece(fromRow, fromCol, row, col);
    return;
  }

  if (clickedPiece && getPieceColor(clickedPiece) === currentPlayer) {
    selectPiece(row, col);
    return;
  }

  selectedSquare = null;
  legalMoves = [];
  renderBoard();
}

function initGame() {
  board = createInitialBoard();
  selectedSquare = null;
  currentPlayer = "w";
  legalMoves = [];
  renderBoard();
  updateStatus("White to move");
}

initGame();