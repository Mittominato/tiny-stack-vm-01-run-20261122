// Tiny stack VM for make.fun's tiny-stack-vm-01 (ISA.md v1): wrapping 32-bit
// ints, 256-value stack, 64-deep call stack, 256 memory words, ten traps.
import { mkdirSync, readdirSync, readFileSync, writeFileSync } from 'node:fs';

const IN = process.env.MAKEFUN_INPUT_DIR ?? '/input';
const OUT = process.env.MAKEFUN_OUTPUT_DIR ?? '/output';

// Immediate length per opcode (-1: no such opcode).
const IMM = new Int8Array(256).fill(-1);
for (const o of [0, 1, 2, 3, 4, 5, 6, 7, 16, 17, 18, 19, 20, 21, 22, 23, 24, 25, 26, 27, 28, 29, 30, 32, 33, 34, 48, 49, 50, 51, 52, 64, 65, 80, 81, 82, 83])
  IMM[o] = o === 1 ? 1 : o === 2 ? 4 : o >= 48 && o < 52 ? 2 : 0;

// A trap is thrown as its exit code; HALT and EXIT break out with code set.
function run(prog, input) {
  const st = new Int32Array(256), cs = new Int32Array(64), mem = new Int32Array(256);
  const out = new Uint8Array(65536);
  let sp = 0, cp = 0, pc = 0, ip = 0, ol = 0, steps = 0, code = 0;
  try {
    loop: while (true) {
      if (steps >= 1000000) throw 10;
      if (pc < 0 || pc >= prog.length) throw 9;
      const op = prog[pc], il = IMM[op];
      if (il < 0) throw 5;
      if (pc + 1 + il > prog.length) throw 9;
      steps++;
      let next = pc + 1 + il;
      switch (op) {
        case 0x00: break loop;
        case 0x01:
          if (sp >= 256) throw 3;
          st[sp++] = (prog[pc + 1] << 24) >> 24;
          break;
        case 0x02:
          if (sp >= 256) throw 3;
          st[sp++] = prog[pc + 1] | prog[pc + 2] << 8 | prog[pc + 3] << 16 | prog[pc + 4] << 24;
          break;
        case 0x03:
          if (sp < 1) throw 2;
          sp--;
          break;
        case 0x04:
          if (sp < 1) throw 2;
          if (sp >= 256) throw 3;
          st[sp] = st[sp - 1]; sp++;
          break;
        case 0x05:
          if (sp < 2) throw 2;
          { const t = st[sp - 1]; st[sp - 1] = st[sp - 2]; st[sp - 2] = t; }
          break;
        case 0x06:
          if (sp < 2) throw 2;
          if (sp >= 256) throw 3;
          st[sp] = st[sp - 2]; sp++;
          break;
        case 0x07:
          if (sp < 3) throw 2;
          { const t = st[sp - 3]; st[sp - 3] = st[sp - 2]; st[sp - 2] = st[sp - 1]; st[sp - 1] = t; }
          break;
        case 0x10: case 0x11: case 0x12: case 0x13: case 0x14: case 0x15:
        case 0x16: case 0x18: case 0x19: case 0x1a: case 0x1c: case 0x1d:
        case 0x1e: case 0x20: case 0x21: case 0x22: {
          if (sp < 2) throw 2;
          const a = st[sp - 2], b = st[sp - 1];
          let r;
          if (op === 0x10) r = (a + b) | 0;
          else if (op === 0x11) r = (a - b) | 0;
          else if (op === 0x12) r = Math.imul(a, b);
          else if (op === 0x13) { if (b === 0) throw 4; r = (a / b) | 0; }
          else if (op === 0x14) { if (b === 0) throw 4; r = a % b; }
          else if (op === 0x15) { if (b === 0) throw 4; r = ((a >>> 0) / (b >>> 0)) | 0; }
          else if (op === 0x16) { if (b === 0) throw 4; r = ((a >>> 0) % (b >>> 0)) | 0; }
          else if (op === 0x18) r = a & b;
          else if (op === 0x19) r = a | b;
          else if (op === 0x1a) r = a ^ b;
          else if (op === 0x1c) r = a << (b & 31);
          else if (op === 0x1d) r = a >> (b & 31);
          else if (op === 0x1e) r = (a >>> (b & 31)) | 0;
          else if (op === 0x20) r = a === b ? 1 : 0;
          else if (op === 0x21) r = a < b ? 1 : 0;
          else r = (a >>> 0) < (b >>> 0) ? 1 : 0;
          st[sp - 2] = r; sp--;
          break;
        }
        case 0x17:
          if (sp < 1) throw 2;
          st[sp - 1] = (-st[sp - 1]) | 0;
          break;
        case 0x1b:
          if (sp < 1) throw 2;
          st[sp - 1] = ~st[sp - 1];
          break;
        case 0x30: case 0x31: case 0x32: {
          const off = ((prog[pc + 1] | prog[pc + 2] << 8) << 16) >> 16;
          if (op === 0x30) { next = pc + 3 + off; break; }
          if (sp < 1) throw 2;
          const v = st[--sp];
          if (op === 0x31 ? v === 0 : v !== 0) next = pc + 3 + off;
          break;
        }
        case 0x33:
          if (cp >= 64) throw 7;
          cs[cp++] = pc + 3;
          next = prog[pc + 1] | prog[pc + 2] << 8;
          break;
        case 0x34:
          if (cp === 0) throw 8;
          next = cs[--cp];
          break;
        case 0x40:
          if (sp < 1) throw 2;
          if (st[sp - 1] < 0 || st[sp - 1] > 255) throw 6;
          st[sp - 1] = mem[st[sp - 1]];
          break;
        case 0x41: {
          if (sp < 2) throw 2;
          const addr = st[sp - 1];
          if (addr < 0 || addr > 255) throw 6;
          mem[addr] = st[sp - 2];
          sp -= 2;
          break;
        }
        case 0x50: {
          if (sp < 1) throw 2;
          const s = String(st[--sp]);
          if (ol + s.length > 65536) throw 11;
          for (let i = 0; i < s.length; i++) out[ol++] = s.charCodeAt(i);
          break;
        }
        case 0x51:
          if (sp < 1) throw 2;
          if (ol + 1 > 65536) throw 11;
          out[ol++] = st[--sp] & 255;
          break;
        case 0x52:
          if (sp >= 256) throw 3;
          st[sp++] = ip < input.length ? input[ip++] : -1;
          break;
        case 0x53:
          if (sp < 1) throw 2;
          code = st[--sp] & 255;
          break loop;
      }
      pc = next;
    }
  } catch (e) { code = typeof e === 'number' ? e : 1; }
  return [out.subarray(0, ol), code];
}

for (const id of readdirSync(IN).sort()) {
  // One bad instance must never sink the whole set: always write both files.
  let out = new Uint8Array(), code = 0;
  try {
    const prog = readFileSync(IN + '/' + id + '/program.bin');
    const input = readFileSync(IN + '/' + id + '/input.bin');
    [out, code] = run(prog, input);
  } catch { /* keep the empty answer above */ }
  mkdirSync(OUT + '/' + id, { recursive: true });
  writeFileSync(OUT + '/' + id + '/stdout.bin', out);
  writeFileSync(OUT + '/' + id + '/exit.txt', String(code) + '\n');
}
