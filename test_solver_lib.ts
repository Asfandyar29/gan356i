
import Cube from 'cubejs';

console.log("Testing cubejs library...");

// Initialize precomputed tables (required)
Cube.initSolver();

// Solved state string (U9 R9 F9 D9 L9 B9)
// "UUUUUUUUURRRRRRRRRFFFFFFFFFDDDDDDDDDLLLLLLLLLBBBBBBBBB"
const solvedState = "UUUUUUUUURRRRRRRRRFFFFFFFFFDDDDDDDDDLLLLLLLLLBBBBBBBBB";
try {
    const cube = Cube.fromString(solvedState);
    const solution = cube.solve();
    console.log("Solved state solution (expect empty):", solution);
} catch (e) {
    console.error("Solved state error:", e);
}

// Simple scramble state (R U R' U')
// Let's manually construct a simple state or use a known one.
// Actually, let's just use a string that I know is valid.
// Scramble: R
// U face: uuu uuu uuu -> uuu uui uui (changed)
// This is hard to construct manually.

// Let's try to just run the solver on the solved state first. 
// Typically it returns "".

// Attempt a string for "R" move applied to solved cube.
// Centers: u=4, r=13, f=22, d=31, l=40, b=49.
// Applying R (CW) on solved cube.
// U stickers 2,5,8 (right col) move to B 2,5,8 ? No.
// Let's rely on the library being robust.

// State for R scramble:
const stateR = "uuuuuufffrrrbbbrrrfffffdddddddddlllllllllbbbuuubbb";
// This is manual guessing, likely wrong.

// Better test: The library documentation or simple usage.
// If I can't construct a valid string, I might get "no solution".

// Let's just check if it throws "solver is not a function".
console.log("Solver type:", typeof solver);
