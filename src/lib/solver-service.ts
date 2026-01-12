import * as CubeImport from 'cubejs';
// Import solver extension for side effects (monkey-patches Cube)
import 'cubejs/lib/solve';

import { Facelets } from '@/types/cube';
import { logger } from './logger';

// Handle CommonJS/ESM interop
const Cube = (CubeImport as any).default || CubeImport;

// Initialize solver once
let solverInitialized = false;

// Indices of centers in the facelets array
const CENTERS = {
    u: 4,
    r: 13,
    f: 22,
    d: 31,
    l: 40,
    b: 49
};

const getNotationMap = (facelets: Facelets) => {
    // Map CENTER COLORS to CHARACTERS (U, R, F, D, L, B)
    const centerColors: Record<string, string | null> = {
        U: facelets[CENTERS.u],
        R: facelets[CENTERS.r],
        F: facelets[CENTERS.f],
        D: facelets[CENTERS.d],
        L: facelets[CENTERS.l],
        B: facelets[CENTERS.b],
    };

    // Invert: Color -> Char
    const colorToChar: Record<string, string> = {};
    Object.entries(centerColors).forEach(([char, color]) => {
        if (color) colorToChar[color] = char;
    });

    return colorToChar;
};

export const getCubeSolution = (facelets: Facelets): { solution: string | null; error?: string } => {
    try {
        if (!solverInitialized) {
            logger.log("Initializing CubeJS solver tables...");
            try {
                Cube.initSolver();
                solverInitialized = true;
            } catch (initErr) {
                logger.error("CubeJS init failed:", initErr);
                return { solution: null, error: `Solver init failed: ${initErr}` };
            }
        }

        const colorToChar = getNotationMap(facelets);

        let stateString = '';

        for (let i = 0; i < 54; i++) {
            const color = facelets[i];
            if (!color) return { solution: null, error: `Missing color at index ${i}` };

            const char = colorToChar[color];
            if (!char) return { solution: null, error: `Unknown color '${color}'` };

            stateString += char;
        }

        logger.log('Solving for state:', stateString);
        const cube = Cube.fromString(stateString);
        const solution = cube.solve();
        logger.log('Solution found:', solution);

        return { solution };
    } catch (err: any) {
        logger.error('Solver failed:', err);
        return { solution: null, error: err.message || String(err) };
    }
};
