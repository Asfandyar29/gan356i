import { createSolvedCube } from '@/types/cube';
import { applyMove, checkCross, checkF2L, checkOLL, checkPLL } from '@/lib/cube-solver';

// Simple test
const runTest = () => {
    let cube = createSolvedCube();
    console.log("Initial state solved:", checkPLL(cube));

    // Apply standard T-Perm to check cycles
    // R U R' U' R' F R2 U' R' U' R U R' F'
    const algo = ["R", "U", "R'", "U'", "R'", "F", "R2", "U'", "R'", "U'", "R", "U", "R'", "F'"];

    // Helper to parse
    const parse = (s: string) => {
        const f = s[0];
        const m = s.length > 1 ? s[1] : "";
        const dir = m === "'" ? -1 : 1;
        const count = m === "2" ? 2 : 1;
        return { f, dir, count };
    };

    algo.forEach(move => {
        const p = parse(move);
        for (let i = 0; i < p.count; i++)
            cube = applyMove(cube, p.f as any, p.dir as any);
    });

    // T-Perm swaps two corners and two edges. PLL should be FALSE.
    console.log("After T-Perm, PLL Solved?", checkPLL(cube)); // Should be false

    // Apply T-Perm again -> Solved.
    algo.forEach(move => {
        const p = parse(move);
        for (let i = 0; i < p.count; i++)
            cube = applyMove(cube, p.f as any, p.dir as any);
    });

    console.log("After 2nd T-Perm, PLL Solved?", checkPLL(cube)); // Should be true
}

runTest();
