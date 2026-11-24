/**
 * Zero-dependency ISO/IEC 18004 QR Code SVG generator (Byte mode, ECC Level M, Versions 1-10).
 * Used strictly for internal operational traceability metadata on printed work orders.
 */

const GF_EXP = new Uint8Array(512);
const GF_LOG = new Uint8Array(256);

(() => {
  let x = 1;
  for (let i = 0; i < 255; i++) {
    GF_EXP[i] = x;
    GF_LOG[x] = i;
    x <<= 1;
    if (x & 0x100) {
      x ^= 0x11d;
    }
  }
  for (let i = 255; i < 512; i++) {
    GF_EXP[i] = GF_EXP[i - 255];
  }
})();

function gfMul(a: number, b: number): number {
  if (a === 0 || b === 0) return 0;
  return GF_EXP[GF_LOG[a] + GF_LOG[b]];
}

function rsGeneratorPoly(degree: number): number[] {
  let poly = [1];
  for (let i = 0; i < degree; i++) {
    const next = new Array<number>(poly.length + 1).fill(0);
    const factor = GF_EXP[i];
    for (let j = 0; j < poly.length; j++) {
      next[j] ^= poly[j];
      next[j + 1] ^= gfMul(poly[j], factor);
    }
    poly = next;
  }
  return poly;
}

function rsRemainder(data: readonly number[], ecCount: number): number[] {
  const gen = rsGeneratorPoly(ecCount);
  const msg = new Uint8Array(data.length + ecCount);
  msg.set(data);
  for (let i = 0; i < data.length; i++) {
    const coef = msg[i];
    if (coef !== 0) {
      for (let j = 0; j < gen.length; j++) {
        msg[i + j] ^= gfMul(gen[j], coef);
      }
    }
  }
  return Array.from(msg.slice(data.length));
}

type QrSpec = readonly [
  totalDataCodewords: number,
  ecPerBlock: number,
  groups: readonly (readonly [count: number, dataLen: number])[],
  alignmentPositions: readonly number[],
];

// ISO/IEC 18004 ECC Level M specifications for Versions 1..10
const QR_M_SPECS: Record<number, QrSpec> = {
  1: [16, 10, [[1, 16]], []],
  2: [28, 16, [[1, 28]], [6, 18]],
  3: [44, 26, [[1, 44]], [6, 22]],
  4: [64, 18, [[2, 32]], [6, 26]],
  5: [86, 24, [[2, 43]], [6, 30]],
  6: [108, 16, [[4, 27]], [6, 34]],
  7: [124, 18, [[4, 31]], [6, 22, 38]],
  8: [154, 22, [[2, 38], [2, 39]], [6, 24, 42]],
  9: [182, 22, [[3, 36], [2, 37]], [6, 26, 46]],
  10: [216, 26, [[4, 43], [1, 44]], [6, 28, 50]],
};

const QR_VERSION_BITS: Record<number, number> = {
  7: 0x07c94,
  8: 0x085bc,
  9: 0x09a99,
  10: 0x0a4d3,
};

function utf8Bytes(text: string): number[] {
  if (typeof TextEncoder !== 'undefined') {
    return Array.from(new TextEncoder().encode(text));
  }
  const encoded = unescape(encodeURIComponent(text));
  const out: number[] = [];
  for (let i = 0; i < encoded.length; i++) {
    out.push(encoded.charCodeAt(i) & 0xff);
  }
  return out;
}

export interface QrMatrixResult {
  readonly matrix: readonly Int8Array[];
  readonly size: number;
  readonly version: number;
}

export function encodeQrMatrix(text: string): QrMatrixResult {
  let bytes = utf8Bytes(text);
  // Version 10 ECC-M byte-mode capacity is 213 bytes (216 codewords - 3 header/length bytes)
  if (bytes.length > 213) {
    bytes = bytes.slice(0, 213);
  }

  let version = 10;
  for (let v = 1; v <= 10; v++) {
    const headerBits = 4 + (v >= 10 ? 16 : 8);
    if (Math.ceil((headerBits + bytes.length * 8) / 8) <= QR_M_SPECS[v][0]) {
      version = v;
      break;
    }
  }

  const [totalDataCw, ecPerBlock, groups, alignPos] = QR_M_SPECS[version];
  const bits: number[] = [];
  const pushBits = (val: number, len: number): void => {
    for (let i = len - 1; i >= 0; i--) {
      bits.push((val >>> i) & 1);
    }
  };

  pushBits(0b0100, 4); // Byte mode indicator
  pushBits(bytes.length, version >= 10 ? 16 : 8);
  for (const b of bytes) {
    pushBits(b, 8);
  }

  const maxBits = totalDataCw * 8;
  for (let i = 0; i < 4 && bits.length < maxBits; i++) {
    bits.push(0);
  }
  while (bits.length % 8 !== 0) {
    bits.push(0);
  }

  const dataCw: number[] = [];
  for (let i = 0; i < bits.length; i += 8) {
    let byteVal = 0;
    for (let j = 0; j < 8; j++) {
      byteVal = (byteVal << 1) | bits[i + j];
    }
    dataCw.push(byteVal);
  }

  const padBytes = [0xec, 0x11];
  for (let i = 0; dataCw.length < totalDataCw; i++) {
    dataCw.push(padBytes[i % 2]);
  }

  const dataBlocks: number[][] = [];
  const ecBlocks: number[][] = [];
  let offset = 0;
  for (const [count, len] of groups) {
    for (let i = 0; i < count; i++) {
      const blk = dataCw.slice(offset, offset + len);
      offset += len;
      dataBlocks.push(blk);
      ecBlocks.push(rsRemainder(blk, ecPerBlock));
    }
  }

  const finalCw: number[] = [];
  const maxDataLen = Math.max(...dataBlocks.map((b) => b.length));
  for (let i = 0; i < maxDataLen; i++) {
    for (const blk of dataBlocks) {
      if (i < blk.length) finalCw.push(blk[i]);
    }
  }
  for (let i = 0; i < ecPerBlock; i++) {
    for (const ec of ecBlocks) {
      finalCw.push(ec[i]);
    }
  }

  const finalBits: number[] = [];
  for (const cw of finalCw) {
    for (let i = 7; i >= 0; i--) {
      finalBits.push((cw >>> i) & 1);
    }
  }

  const size = version * 4 + 17;
  const grid = Array.from({ length: size }, () => new Int8Array(size).fill(-1));
  const isFunc = Array.from({ length: size }, () => new Uint8Array(size));

  const setFunc = (r: number, c: number, dark: boolean): void => {
    if (r >= 0 && r < size && c >= 0 && c < size) {
      grid[r][c] = dark ? 1 : 0;
      isFunc[r][c] = 1;
    }
  };

  const drawFinder = (tr: number, tc: number): void => {
    for (let dr = -1; dr <= 7; dr++) {
      for (let dc = -1; dc <= 7; dc++) {
        const r = tr + dr;
        const c = tc + dc;
        if (r < 0 || r >= size || c < 0 || c >= size) continue;
        const inOuter = dr >= 0 && dr <= 6 && dc >= 0 && dc <= 6;
        const dark =
          inOuter &&
          (dr === 0 ||
            dr === 6 ||
            dc === 0 ||
            dc === 6 ||
            (dr >= 2 && dr <= 4 && dc >= 2 && dc <= 4));
        setFunc(r, c, dark);
      }
    }
  };

  drawFinder(0, 0);
  drawFinder(0, size - 7);
  drawFinder(size - 7, 0);

  for (let i = 8; i < size - 8; i++) {
    setFunc(6, i, i % 2 === 0);
    setFunc(i, 6, i % 2 === 0);
  }

  for (const r0 of alignPos) {
    for (const c0 of alignPos) {
      if (
        (r0 === 6 && c0 === 6) ||
        (r0 === 6 && c0 === size - 7) ||
        (r0 === size - 7 && c0 === 6)
      ) {
        continue;
      }
      for (let dr = -2; dr <= 2; dr++) {
        for (let dc = -2; dc <= 2; dc++) {
          setFunc(r0 + dr, c0 + dc, Math.max(Math.abs(dr), Math.abs(dc)) !== 1);
        }
      }
    }
  }

  setFunc(size - 8, 8, true);
  for (let i = 0; i <= 8; i++) {
    if (!isFunc[8][i]) setFunc(8, i, false);
    if (!isFunc[i][8]) setFunc(i, 8, false);
  }
  for (let i = 0; i < 8; i++) {
    if (!isFunc[8][size - 1 - i]) setFunc(8, size - 1 - i, false);
    if (!isFunc[size - 1 - i][8]) setFunc(size - 1 - i, 8, false);
  }

  if (version >= 7) {
    const vb = QR_VERSION_BITS[version];
    for (let i = 0; i < 18; i++) {
      const bit = ((vb >>> i) & 1) === 1;
      const a = Math.floor(i / 3);
      const b = size - 11 + (i % 3);
      setFunc(a, b, bit);
      setFunc(b, a, bit);
    }
  }

  let bitIdx = 0;
  let upward = true;
  for (let right = size - 1; right >= 1; right -= 2) {
    if (right === 6) right = 5;
    for (let vert = 0; vert < size; vert++) {
      const r = upward ? size - 1 - vert : vert;
      for (let j = 0; j < 2; j++) {
        const c = right - j;
        if (!isFunc[r][c]) {
          grid[r][c] = bitIdx < finalBits.length ? finalBits[bitIdx++] : 0;
        }
      }
    }
    upward = !upward;
  }

  const maskFns: readonly ((r: number, c: number) => boolean)[] = [
    (r, c) => (r + c) % 2 === 0,
    (r) => r % 2 === 0,
    (_r, c) => c % 3 === 0,
    (r, c) => (r + c) % 3 === 0,
    (r, c) => (Math.floor(r / 2) + Math.floor(c / 3)) % 2 === 0,
    (r, c) => ((r * c) % 2) + ((r * c) % 3) === 0,
    (r, c) => (((r * c) % 2) + ((r * c) % 3)) % 2 === 0,
    (r, c) => (((r + c) % 2) + ((r * c) % 3)) % 2 === 0,
  ];

  // Format bits for ECC Level M (00) + mask (3 bits) -> BCH(15,5) XOR 0x5412
  const formatBitsForMask = (mask: number): number => {
    const data = (0b00 << 3) | mask;
    let rem = data;
    for (let i = 0; i < 10; i++) {
      rem = (rem << 1) ^ ((rem >>> 9) * 0x537);
    }
    return ((data << 10) | rem) ^ 0x5412;
  };

  let bestMatrix = grid;
  let bestScore = Number.POSITIVE_INFINITY;

  for (let mask = 0; mask < 8; mask++) {
    const candidate = grid.map((row) => Int8Array.from(row));
    for (let r = 0; r < size; r++) {
      for (let c = 0; c < size; c++) {
        if (!isFunc[r][c] && maskFns[mask](r, c)) {
          candidate[r][c] ^= 1;
        }
      }
    }

    const fmt = formatBitsForMask(mask);
    for (let i = 0; i <= 5; i++) candidate[i][8] = (fmt >>> i) & 1;
    candidate[7][8] = (fmt >>> 6) & 1;
    candidate[8][8] = (fmt >>> 7) & 1;
    candidate[8][7] = (fmt >>> 8) & 1;
    for (let i = 9; i < 15; i++) candidate[8][14 - i] = (fmt >>> i) & 1;
    for (let i = 0; i < 8; i++) candidate[8][size - 1 - i] = (fmt >>> i) & 1;
    for (let i = 8; i < 15; i++) candidate[size - 15 + i][8] = (fmt >>> i) & 1;

    let score = 0;
    for (let r = 0; r < size; r++) {
      let run = 1;
      for (let c = 1; c < size; c++) {
        if (candidate[r][c] === candidate[r][c - 1]) {
          run++;
          if (run === 5) score += 3;
          else if (run > 5) score += 1;
        } else {
          run = 1;
        }
      }
    }
    for (let c = 0; c < size; c++) {
      let run = 1;
      for (let r = 1; r < size; r++) {
        if (candidate[r][c] === candidate[r - 1][c]) {
          run++;
          if (run === 5) score += 3;
          else if (run > 5) score += 1;
        } else {
          run = 1;
        }
      }
    }
    for (let r = 0; r < size - 1; r++) {
      for (let c = 0; c < size - 1; c++) {
        const v = candidate[r][c];
        if (v === candidate[r][c + 1] && v === candidate[r + 1][c] && v === candidate[r + 1][c + 1]) {
          score += 3;
        }
      }
    }

    if (score < bestScore) {
      bestScore = score;
      bestMatrix = candidate;
    }
  }

  return { matrix: bestMatrix, size, version };
}

export function buildInternalTraceabilityQrSvg(
  payload: string,
  pixelSize = 58,
  color = '#031c43',
): string {
  const { matrix, size } = encodeQrMatrix(payload);
  const quiet = 4;
  const vb = size + quiet * 2;
  let pathD = '';
  for (let r = 0; r < size; r++) {
    for (let c = 0; c < size; c++) {
      if (matrix[r][c] === 1) {
        pathD += `M${c + quiet},${r + quiet}h1v1h-1z`;
      }
    }
  }
  return `<svg class="emx-trace-qr" xmlns="http://www.w3.org/2000/svg" width="${pixelSize}" height="${pixelSize}" viewBox="0 0 ${vb} ${vb}" shape-rendering="crispEdges" role="img" aria-label="Código QR de trazabilidad interna"><rect width="${vb}" height="${vb}" fill="#ffffff"/><path d="${pathD}" fill="${color}"/></svg>`;
}
