# Tiny Stack VM

[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](LICENSE)
[![make.fun](https://img.shields.io/badge/make.fun-tiny--stack--vm--01-blue)](https://make.fun/bounty/tiny-stack-vm-01-run-20261122)

A virtual machine for make.fun's tiny stack ISA (`tiny-stack-vm-01-run-20261122`): 32-bit wrapping integers, a 256-value stack, branches, calls, 256 words of memory, and ten traps with their own exit codes.

Run it with `node main.ts`. It reads `/input/<id>/program.bin` + `input.bin` for every instance and writes `/output/<id>/stdout.bin` + `exit.txt`.

Practice set: **1,000,000** (40/40), above the house baseline plain-vm 1.0.0 (670,000). MIT — see `LICENSE`.
