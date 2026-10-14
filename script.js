'use strict';

// Fracciones exactas con BigInt: evita perder precisión al operar con fracciones.
class Fraction {
  constructor(numerator, denominator = 1n) {
    let n = BigInt(numerator), d = BigInt(denominator);
    if (d === 0n) throw new Error('El denominador no puede ser cero.');
    if (d < 0n) { n = -n; d = -d; }
    const g = Fraction.gcd(n < 0n ? -n : n, d);
    this.num = n / (g || 1n);
    this.den = d / (g || 1n);
  }
  static gcd(a, b) { while (b !== 0n) [a, b] = [b, a % b]; return a || 1n; }
  static fromDecimal(str) {
    const negative = str.startsWith('-');
    if (negative || str.startsWith('+')) str = str.slice(1);
    const parts = str.split('.');
    if (parts.length === 1) return new Fraction(BigInt((negative ? '-' : '') + (parts[0] || '0')));
    const digits = parts[1].length;
    const denominator = 10n ** BigInt(digits);
    const numerator = BigInt((parts[0] || '0') + parts[1]);
    return new Fraction(negative ? -numerator : numerator, denominator);
  }
  static parse(input) {
    let s = String(input).trim().replace(/\s+/g, '');
    if (!s) return new Fraction(0n);
    // Se permite una potencia entera al final: 2^3, (3/4)^2, (-2)^-3.
    let exponent = 1n;
    const powerMatch = s.match(/\^([+-]?\d+)$/);
    if (powerMatch) { exponent = BigInt(powerMatch[1]); s = s.slice(0, powerMatch.index); }
    if (s.includes('^')) throw new Error(`Potencia no válida: ${input}. Usa una potencia entera como 2^3.`);

    // Quita paréntesis exteriores equilibrados, sin eliminar los que pertenecen a la base.
    while (s.startsWith('(') && s.endsWith(')')) {
      let depth = 0, wrapsAll = true;
      for (let i = 0; i < s.length; i++) {
        if (s[i] === '(') depth++;
        if (s[i] === ')') depth--;
        if (depth === 0 && i < s.length - 1) { wrapsAll = false; break; }
      }
      if (!wrapsAll) break;
      s = s.slice(1, -1);
    }

    let base;
    const fractionMatch = s.match(/^([+-]?\d+)\/([+-]?\d+)$/);
    if (fractionMatch) {
      base = new Fraction(BigInt(fractionMatch[1]), BigInt(fractionMatch[2]));
    } else if (/^[+-]?\d+(\.\d+)?$/.test(s)) {
      base = Fraction.fromDecimal(s);
    } else {
      throw new Error(`Formato no válido: “${input}”. Ejemplos válidos: 3/4, -1/2, 2^3 o (3/4)^2.`);
    }
    return base.pow(exponent);
  }
  add(other) { return new Fraction(this.num * other.den + other.num * this.den, this.den * other.den); }
  multiply(other) { return new Fraction(this.num * other.num, this.den * other.den); }
  pow(exponent) {
    if (exponent === 0n) {
      if (this.num === 0n) throw new Error('La expresión 0^0 no está definida.');
      return new Fraction(1n);
    }
    if (exponent < 0n) {
      if (this.num === 0n) throw new Error('Cero no puede elevarse a una potencia negativa.');
      return new Fraction(this.den, this.num).pow(-exponent);
    }
    // Evita congelar el navegador por una potencia accidentalmente enorme.
    if (exponent > 1000n) throw new Error('Usa exponentes entre -1000 y 1000.');
    return new Fraction(this.num ** exponent, this.den ** exponent);
  }
  toString() { return this.den === 1n ? String(this.num) : `${this.num}/${this.den}`; }
}

function toggleSettingsMenu() {
  document.getElementById('configPanel').classList.toggle('hidden');
}
function parseDimensionInput(id) {
  const input = document.getElementById(id);
  let val = Number.parseInt(input.value, 10);
  if (!Number.isFinite(val)) val = 1;
  val = Math.max(1, Math.min(10, val));
  input.value = val;
  return val;
}
function generateMatrices() {
  const dims = { A: [parseDimensionInput('rowsA'), parseDimensionInput('colsA')], B: [parseDimensionInput('rowsB'), parseDimensionInput('colsB')] };
  Object.entries(dims).forEach(([type, [rows, cols]]) => createGrid(type, rows, cols));
}
function createGrid(type, rows, cols) {
  const grid = document.getElementById(`grid${type}`);
  const previous = new Map();
  grid.querySelectorAll('.matrix-cell').forEach(input => previous.set(input.id, input.value));
  grid.innerHTML = '';
  grid.style.gridTemplateColumns = `repeat(${cols}, minmax(0, 1fr))`;
  const compact = cols > 4 || rows > 4;
  for (let i = 0; i < rows; i++) {
    for (let j = 0; j < cols; j++) {
      const input = document.createElement('input');
      input.type = 'text';
      input.inputMode = 'text';
      input.autocomplete = 'off';
      input.spellcheck = false;
      input.className = `matrix-cell${compact ? ' compact' : ''}`;
      input.id = `cell_${type}_${i}_${j}`;
      input.placeholder = '0';
      input.setAttribute('aria-label', `Matriz ${type}, fila ${i + 1}, columna ${j + 1}`);
      input.title = 'Ejemplos: 3/4, 2^3, (3/4)^2';
      if (previous.has(input.id)) input.value = previous.get(input.id);
      grid.appendChild(input);
    }
  }
}
function getMatrixValues(type) {
  const rows = Number.parseInt(document.getElementById(`rows${type}`).value, 10);
  const cols = Number.parseInt(document.getElementById(`cols${type}`).value, 10);
  const matrix = [];
  try {
    for (let i = 0; i < rows; i++) {
      const row = [];
      for (let j = 0; j < cols; j++) {
        const input = document.getElementById(`cell_${type}_${i}_${j}`);
        row.push(Fraction.parse(input.value || '0'));
      }
      matrix.push(row);
    }
  } catch (error) {
    displayLCDError(`Matriz ${type}: ${error.message}`);
    return null;
  }
  return matrix;
}
function clearInputs() {
  document.querySelectorAll('.matrix-cell').forEach(cell => { cell.value = ''; });
  document.getElementById('lcdHeader').innerHTML = '<span class="status-ball"></span> PIZARRA TÁCTICA · LISTO PARA JUGAR';
  document.getElementById('lcdBody').textContent = 'Marcador reiniciado. Ingresa nuevos valores para comenzar otra jugada.';
}
function displayLCDMatrix(title, matrix, highlightType = null) {
  document.getElementById('lcdHeader').textContent = `RESULTADO · ${title.toUpperCase()}`;
  document.getElementById('lcdBody').innerHTML = buildMatrixHTML(matrix, highlightType);
}
function displayLCDError(message) {
  document.getElementById('lcdHeader').textContent = 'REVISIÓN DEL VAR · ERROR DE DATOS';
  const p = document.createElement('p');
  p.className = 'error-text';
  p.textContent = message;
  const body = document.getElementById('lcdBody');
  body.replaceChildren(p);
}
function buildMatrixHTML(matrix, highlightType = null) {
  const frame = document.createElement('div'); frame.className = 'matrix-frame';
  const table = document.createElement('table'); table.className = 'result-table';
  matrix.forEach((row, i) => {
    const tr = document.createElement('tr');
    row.forEach((value, j) => {
      const td = document.createElement('td');
      td.textContent = value.toString();
      if ((highlightType === 'principal' && i === j) || (highlightType === 'secundaria' && i + j === matrix.length - 1)) td.className = 'highlight-diagonal';
      tr.appendChild(td);
    });
    table.appendChild(tr);
  });
  frame.appendChild(table);
  return frame.outerHTML;
}
function calculateSum() {
  const a = getMatrixValues('A'); if (!a) return;
  const b = getMatrixValues('B'); if (!b) return;
  if (a.length !== b.length || a[0].length !== b[0].length) return displayLCDError('Para sumar, las matrices A y B deben tener las mismas filas y columnas. Ajusta las dimensiones con el engranaje.');
  const result = a.map((row, i) => row.map((value, j) => value.add(b[i][j])));
  displayLCDMatrix('Suma · Local + Visitante', result);
}
function calculateProduct() {
  const a = getMatrixValues('A'); if (!a) return;
  const b = getMatrixValues('B'); if (!b) return;
  if (a[0].length !== b.length) return displayLCDError(`Para multiplicar, las columnas de A (${a[0].length}) deben ser iguales a las filas de B (${b.length}).`);
  const result = Array.from({ length: a.length }, (_, i) => Array.from({ length: b[0].length }, (_, j) => {
    let sum = new Fraction(0n);
    for (let k = 0; k < a[0].length; k++) sum = sum.add(a[i][k].multiply(b[k][j]));
    return sum;
  }));
  displayLCDMatrix('Producto · A × B', result);
}
function calculateTranspose(type) {
  const matrix = getMatrixValues(type); if (!matrix) return;
  const result = matrix[0].map((_, j) => matrix.map(row => row[j]));
  displayLCDMatrix(`Transpuesta · ${type}ᵀ`, result);
}
function calculateTransposesBoth() {
  const a = getMatrixValues('A'); if (!a) return;
  const b = getMatrixValues('B'); if (!b) return;
  const transpose = matrix => matrix[0].map((_, j) => matrix.map(row => row[j]));
  const body = document.getElementById('lcdBody');
  const container = document.createElement('div');
  container.className = 'double-diagonal-container';
  [['A', transpose(a)], ['B', transpose(b)]].forEach(([name, matrix]) => {
    const block = document.createElement('div');
    block.className = 'diagonal-block';
    const heading = document.createElement('h4');
    heading.textContent = `Matriz ${name} · Transpuesta`;
    block.appendChild(heading);
    block.insertAdjacentHTML('beforeend', buildMatrixHTML(matrix));
    container.appendChild(block);
  });
  document.getElementById('lcdHeader').textContent = 'RESULTADO · TRANSPUESTAS DE A Y B';
  body.replaceChildren(container);
}

function getDiagonalsBoth(diagType) {
  const a = getMatrixValues('A'); if (!a) return;
  const b = getMatrixValues('B'); if (!b) return;
  const isSquareA = a.length === a[0].length, isSquareB = b.length === b[0].length;
  if (!isSquareA && !isSquareB) return displayLCDError('Ninguna de las matrices es cuadrada. Las diagonales se muestran para matrices cuadradas.');
  const label = diagType === 'principal' ? 'principal' : 'secundaria';
  const body = document.getElementById('lcdBody');
  const container = document.createElement('div'); container.className = 'double-diagonal-container';
  [['A', a, isSquareA], ['B', b, isSquareB]].forEach(([name, matrix, isSquare]) => {
    const block = document.createElement('div'); block.className = 'diagonal-block';
    const heading = document.createElement('h4'); heading.textContent = `Matriz ${name}`; block.appendChild(heading);
    if (isSquare) {
      block.insertAdjacentHTML('beforeend', buildMatrixHTML(matrix, diagType));
      const values = matrix.map((row, i) => row[diagType === 'principal' ? i : matrix.length - 1 - i].toString());
      const p = document.createElement('p'); p.style.cssText = 'margin-top:8px;color:var(--gold);'; p.textContent = `Elementos de la diagonal ${label}: [ ${values.join(', ')} ]`;
      block.appendChild(p);
    } else {
      const p = document.createElement('p'); p.className = 'error-text'; p.textContent = 'Esta matriz no es cuadrada.'; block.appendChild(p);
    }
    container.appendChild(block);
  });
  document.getElementById('lcdHeader').textContent = `RESULTADO · DIAGONAL ${label.toUpperCase()}`;
  body.replaceChildren(container);
}

window.addEventListener('DOMContentLoaded', () => {
  generateMatrices();
});
