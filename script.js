
'use strict';

/*
 * MATRIX FOOTBALL
 * Motor matemático con fracciones exactas BigInt.
 * Admite operaciones dentro de cada casilla y potencias enteras.
 */

class Fraction {
  constructor(numerator, denominator = 1n) {
    let n = BigInt(numerator);
    let d = BigInt(denominator);

    if (d === 0n) throw new Error('El denominador no puede ser cero.');
    if (d < 0n) {
      n = -n;
      d = -d;
    }

    const g = Fraction.gcd(n < 0n ? -n : n, d);
    this.num = n / g;
    this.den = d / g;
  }

  static gcd(a, b) {
    while (b !== 0n) [a, b] = [b, a % b];
    return a || 1n;
  }

  static fromDecimal(value) {
    let s = String(value).trim().replace(',', '.');
    const negative = s.startsWith('-');
    if (s.startsWith('-') || s.startsWith('+')) s = s.slice(1);

    const parts = s.split('.');
    if (parts.length === 1) {
      return new Fraction(BigInt((negative ? '-' : '') + parts[0]));
    }

    const decimals = parts[1].length;
    const denominator = 10n ** BigInt(decimals);
    const numerator = BigInt((parts[0] || '0') + parts[1]);

    return new Fraction(negative ? -numerator : numerator, denominator);
  }

  add(other) {
    return new Fraction(
      this.num * other.den + other.num * this.den,
      this.den * other.den
    );
  }

  subtract(other) {
    return new Fraction(
      this.num * other.den - other.num * this.den,
      this.den * other.den
    );
  }

  multiply(other) {
    return new Fraction(this.num * other.num, this.den * other.den);
  }

  divide(other) {
    if (other.num === 0n) {
      throw new Error('No se puede dividir entre cero.');
    }
    return new Fraction(this.num * other.den, this.den * other.num);
  }

  pow(exponent) {
    if (exponent === 0n) {
      if (this.num === 0n) throw new Error('0^0 no está definido.');
      return new Fraction(1n);
    }

    if (exponent > 1000n || exponent < -1000n) {
      throw new Error('Usa exponentes entre -1000 y 1000.');
    }

    if (exponent < 0n) {
      if (this.num === 0n) {
        throw new Error('Cero no admite exponentes negativos.');
      }
      return new Fraction(this.den, this.num).pow(-exponent);
    }

    return new Fraction(this.num ** exponent, this.den ** exponent);
  }

  toString() {
    return this.den === 1n
      ? String(this.num)
      : `${this.num}/${this.den}`;
  }

  toDecimal(precision = 12) {
    const value = Number(this.num) / Number(this.den);
    if (!Number.isFinite(value)) {
      throw new Error('El resultado es demasiado grande para mostrarlo como decimal.');
    }
    return Number(value.toFixed(precision)).toString();
  }
}

/*
 * Analizador matemático.
 * Respeta los paréntesis y la prioridad de las operaciones.
 * No ejecuta código JavaScript introducido por el usuario.
 *
 * Ejemplos:
 * (2+3)/5 = 1
 * 1/2+1/4 = 3/4
 * 2^3 = 8
 * 0.75 = 3/4
 */
class ExpressionParser {
  constructor(expression) {
    this.expression = String(expression)
      .trim()
      .replace(/,/g, '.')
      .replace(/\s+/g, '');
    this.position = 0;
  }

  peek() {
    return this.expression[this.position];
  }

  consume(char) {
    if (this.peek() === char) {
      this.position++;
      return true;
    }
    return false;
  }

  parse() {
    if (!this.expression) return new Fraction(0n);

    const result = this.parseAddSubtract();

    if (this.position !== this.expression.length) {
      throw new Error(
        `Expresión no válida cerca de "${this.expression.slice(this.position)}".`
      );
    }

    return result;
  }

  parseAddSubtract() {
    let value = this.parseMultiplyDivide();

    while (true) {
      if (this.consume('+')) {
        value = value.add(this.parseMultiplyDivide());
      } else if (this.consume('-')) {
        value = value.subtract(this.parseMultiplyDivide());
      } else {
        return value;
      }
    }
  }

  parseMultiplyDivide() {
    let value = this.parseUnary();

    while (true) {
      if (this.consume('*') || this.consume('×')) {
        value = value.multiply(this.parseUnary());
      } else if (this.consume('/')) {
        value = value.divide(this.parseUnary());
      } else {
        return value;
      }
    }
  }

  parseUnary() {
    if (this.consume('+')) return this.parseUnary();

    if (this.consume('-')) {
      return new Fraction(-1n).multiply(this.parseUnary());
    }

    return this.parsePower();
  }

  parsePower() {
    let value = this.parsePrimary();

    if (this.consume('^')) {
      const exponent = this.parseUnary();

      if (exponent.den !== 1n) {
        throw new Error('El exponente debe ser un número entero.');
      }

      value = value.pow(exponent.num);
    }

    return value;
  }

  parsePrimary() {
    if (this.consume('(')) {
      const value = this.parseAddSubtract();

      if (!this.consume(')')) {
        throw new Error('Falta cerrar un paréntesis.');
      }

      return value;
    }

    const rest = this.expression.slice(this.position);
    const match = rest.match(/^(?:\d+\.?\d*|\.\d+)/);

    if (!match) {
      throw new Error(
        `Se esperaba un número o paréntesis en "${rest}".`
      );
    }

    this.position += match[0].length;
    return Fraction.fromDecimal(match[0]);
  }
}

function evaluateExpression(expression) {
  return new ExpressionParser(expression).parse();
}

function toggleSettingsMenu() {
  document.getElementById('configPanel').classList.toggle('hidden');
}

function parseDimensionInput(id) {
  const input = document.getElementById(id);
  let value = Number.parseInt(input.value, 10);

  if (!Number.isFinite(value)) value = 1;
  value = Math.max(1, Math.min(10, value));
  input.value = value;

  return value;
}

function generateMatrices() {
  const dimensions = {
    A: [
      parseDimensionInput('rowsA'),
      parseDimensionInput('colsA')
    ],
    B: [
      parseDimensionInput('rowsB'),
      parseDimensionInput('colsB')
    ]
  };

  Object.entries(dimensions).forEach(([type, [rows, cols]]) => {
    createGrid(type, rows, cols);
  });
}

function createGrid(type, rows, cols) {
  const grid = document.getElementById(`grid${type}`);
  const previous = new Map();

  grid.querySelectorAll('.matrix-cell').forEach(input => {
    previous.set(input.id, input.value);
  });

  grid.innerHTML = '';
  grid.style.gridTemplateColumns = `repeat(${cols}, minmax(0, 1fr))`;

  const compact = cols > 4 || rows > 4;

  for (let i = 0; i < rows; i++) {
    for (let j = 0; j < cols; j++) {
      const wrapper = document.createElement('div');
      wrapper.className = 'matrix-cell-wrapper';

      const input = document.createElement('input');
      input.type = 'text';
      input.inputMode = 'text';
      input.autocomplete = 'off';
      input.spellcheck = false;
      input.className = `matrix-cell${compact ? ' compact' : ''}`;
      input.id = `cell_${type}_${i}_${j}`;
      input.placeholder = '0';
      input.setAttribute(
        'aria-label',
        `Matriz ${type}, fila ${i + 1}, columna ${j + 1}`
      );
      input.title = 'Ejemplos: (2+3)/5, 1/2+1/4, 2^3, 0.75';

      if (previous.has(input.id)) {
        input.value = previous.get(input.id);
      }

      // Vista previa del resultado de cada operación.
      const preview = document.createElement('div');
      preview.className = 'cell-preview';
      preview.id = `preview_${type}_${i}_${j}`;
      preview.setAttribute('aria-live', 'polite');

      input.addEventListener('input', () => {
        updateCellPreview(input, preview);
      });

      wrapper.append(input, preview);
      grid.appendChild(wrapper);

      updateCellPreview(input, preview);
    }
  }
}

function updateCellPreview(input, preview) {
  const expression = input.value.trim();

  if (!expression) {
    preview.replaceChildren();
    preview.textContent = '';
    return;
  }

  try {
    const result = evaluateExpression(expression);
    preview.replaceChildren(createFractionElement(result));
  } catch {
    // Mientras se escribe una operación incompleta no mostramos error.
    preview.textContent = '';
  }
}

function getMatrixValues(type) {
  const rows = Number.parseInt(
    document.getElementById(`rows${type}`).value, 10
  );
  const cols = Number.parseInt(
    document.getElementById(`cols${type}`).value, 10
  );

  const matrix = [];

  try {
    for (let i = 0; i < rows; i++) {
      const row = [];

      for (let j = 0; j < cols; j++) {
        const input = document.getElementById(`cell_${type}_${i}_${j}`);
        row.push(evaluateExpression(input.value || '0'));
      }

      matrix.push(row);
    }
  } catch (error) {
    displayLCDError(`Matriz ${type}: ${error.message}`);
    return null;
  }

  return matrix;
}

/*
 * Convierte una fracción en HTML vertical.
 * Ejemplo: 3/4 se representa con 3 arriba y 4 abajo.
 */
function createFractionElement(value) {
  const fraction = document.createElement('span');

  if (value.den === 1n) {
    fraction.className = 'math-integer';
    fraction.textContent = String(value.num);
    return fraction;
  }

  fraction.className = 'math-fraction';

  const numerator = document.createElement('span');
  numerator.className = 'math-numerator';
  numerator.textContent = String(value.num);

  const denominator = document.createElement('span');
  denominator.className = 'math-denominator';
  denominator.textContent = String(value.den);

  fraction.append(numerator, denominator);
  return fraction;
}

function buildMatrixHTML(matrix, highlightType = null) {
  const frame = document.createElement('div');
  frame.className = 'matrix-frame';

  const table = document.createElement('table');
  table.className = 'result-table';

  matrix.forEach((row, i) => {
    const tr = document.createElement('tr');

    row.forEach((value, j) => {
      const td = document.createElement('td');

      if (
        (highlightType === 'principal' && i === j) ||
        (
          highlightType === 'secundaria' &&
          i + j === matrix.length - 1
        )
      ) {
        td.className = 'highlight-diagonal';
      }

      td.appendChild(createFractionElement(value));
      tr.appendChild(td);
    });

    table.appendChild(tr);
  });

  frame.appendChild(table);
  return frame;
}

function displayLCDMatrix(title, matrix, highlightType = null) {
  document.getElementById('lcdHeader').textContent =
    `RESULTADO · ${title.toUpperCase()}`;

  const body = document.getElementById('lcdBody');
  body.replaceChildren(buildMatrixHTML(matrix, highlightType));
}

function displayLCDError(message) {
  document.getElementById('lcdHeader').textContent =
    'REVISIÓN DEL VAR · ERROR DE DATOS';

  const p = document.createElement('p');
  p.className = 'error-text';
  p.textContent = message;

  document.getElementById('lcdBody').replaceChildren(p);
}

function calculateSum() {
  const a = getMatrixValues('A');
  if (!a) return;

  const b = getMatrixValues('B');
  if (!b) return;

  if (a.length !== b.length || a[0].length !== b[0].length) {
    return displayLCDError(
      'Para sumar, A y B deben tener las mismas filas y columnas.'
    );
  }

  const result = a.map((row, i) =>
    row.map((value, j) => value.add(b[i][j]))
  );

  displayLCDMatrix('Suma · Local + Visitante', result);
}

function calculateProduct() {
  const a = getMatrixValues('A');
  if (!a) return;

  const b = getMatrixValues('B');
  if (!b) return;

  if (a[0].length !== b.length) {
    return displayLCDError(
      `Para multiplicar, las columnas de A (${a[0].length}) ` +
      `deben ser iguales a las filas de B (${b.length}).`
    );
  }

  const result = Array.from({ length: a.length }, (_, i) =>
    Array.from({ length: b[0].length }, (_, j) => {
      let sum = new Fraction(0n);

      for (let k = 0; k < a[0].length; k++) {
        sum = sum.add(a[i][k].multiply(b[k][j]));
      }

      return sum;
    })
  );

  displayLCDMatrix('Producto · A × B', result);
}

function calculateTranspose(type) {
  const matrix = getMatrixValues(type);
  if (!matrix) return;

  const result = matrix[0].map((_, j) =>
    matrix.map(row => row[j])
  );

  displayLCDMatrix(`Transpuesta · ${type}ᵀ`, result);
}

function calculateTransposesBoth() {
  const a = getMatrixValues('A');
  if (!a) return;

  const b = getMatrixValues('B');
  if (!b) return;

  const transpose = matrix =>
    matrix[0].map((_, j) => matrix.map(row => row[j]));

  const body = document.getElementById('lcdBody');
  const container = document.createElement('div');
  container.className = 'double-diagonal-container';

  [['A', transpose(a)], ['B', transpose(b)]].forEach(([name, matrix]) => {
    const block = document.createElement('div');
    block.className = 'diagonal-block';

    const heading = document.createElement('h4');
    heading.textContent = `Matriz ${name} · Transpuesta`;

    block.append(heading, buildMatrixHTML(matrix));
    container.appendChild(block);
  });

  document.getElementById('lcdHeader').textContent =
    'RESULTADO · TRANSPUESTAS DE A Y B';

  body.replaceChildren(container);
}

function getDiagonalsBoth(diagType) {
  const a = getMatrixValues('A');
  if (!a) return;

  const b = getMatrixValues('B');
  if (!b) return;

  const isSquareA = a.length === a[0].length;
  const isSquareB = b.length === b[0].length;

  if (!isSquareA && !isSquareB) {
    return displayLCDError(
      'Ninguna matriz es cuadrada. Las diagonales requieren matrices cuadradas.'
    );
  }

  const label = diagType === 'principal' ? 'principal' : 'secundaria';
  const body = document.getElementById('lcdBody');
  const container = document.createElement('div');
  container.className = 'double-diagonal-container';

  [['A', a, isSquareA], ['B', b, isSquareB]].forEach(
    ([name, matrix, isSquare]) => {
      const block = document.createElement('div');
      block.className = 'diagonal-block';

      const heading = document.createElement('h4');
      heading.textContent = `Matriz ${name}`;
      block.appendChild(heading);

      if (isSquare) {
        block.appendChild(buildMatrixHTML(matrix, diagType));

        const values = matrix.map((row, i) =>
          row[diagType === 'principal' ? i : matrix.length - 1 - i]
        );

        const p = document.createElement('p');
        p.style.cssText = 'margin-top:8px;color:var(--gold);';
        p.textContent = `Elementos de la diagonal ${label}: `;

        values.forEach((value, index) => {
          if (index) p.append(', ');
          p.appendChild(createFractionElement(value));
        });

        block.appendChild(p);
      } else {
        const p = document.createElement('p');
        p.className = 'error-text';
        p.textContent = 'Esta matriz no es cuadrada.';
        block.appendChild(p);
      }

      container.appendChild(block);
    }
  );

  document.getElementById('lcdHeader').textContent =
    `RESULTADO · DIAGONAL ${label.toUpperCase()}`;

  body.replaceChildren(container);
}

/*
 * Convierte todas las expresiones válidas de las matrices
 * a fracciones exactas y reemplaza el contenido de cada casilla.
 */
function convertAllDecimals() {
  convertMatrixInputs(value => value.toString());
}

/*
 * Convierte los valores de las casillas a representación decimal.
 * El cálculo interno sigue usando fracciones exactas.
 */
function convertAllToDecimals() {
  convertMatrixInputs(value => value.toDecimal());
}

function convertMatrixInputs(converter) {
  const inputs = document.querySelectorAll('.matrix-cell');
  const changes = [];

  try {
    // Primero valida todo; así no modifica parcialmente las matrices.
    inputs.forEach(input => {
      const result = evaluateExpression(input.value || '0');
      changes.push({ input, value: converter(result) });
    });

    changes.forEach(({ input, value }) => {
      input.value = value;

      const idParts = input.id.split('_');
      const type = idParts[1];
      const row = idParts[2];
      const col = idParts[3];
      const preview = document.getElementById(
        `preview_${type}_${row}_${col}`
      );

      if (preview) updateCellPreview(input, preview);
    });

    document.getElementById('lcdHeader').textContent =
      'CONVERSIÓN COMPLETADA';

    document.getElementById('lcdBody').textContent =
      'Los valores de las matrices se convirtieron correctamente.';
  } catch (error) {
    displayLCDError(`No se pudo convertir: ${error.message}`);
  }
}

function clearInputs() {
  document.querySelectorAll('.matrix-cell').forEach(input => {
    input.value = '';

    const parts = input.id.split('_');
    const preview = document.getElementById(
      `preview_${parts[1]}_${parts[2]}_${parts[3]}`
    );

    if (preview) preview.textContent = '';
  });

  document.getElementById('lcdHeader').innerHTML =
    '<span class="status-ball"></span> PIZARRA TÁCTICA · LISTO PARA JUGAR';

  document.getElementById('lcdBody').textContent =
    'Marcador reiniciado. Ingresa nuevos valores para comenzar otra jugada.';
}

window.addEventListener('DOMContentLoaded', () => {
  generateMatrices();
});

