import { CubeColor, CubeFace, Facelets, MoveEvent } from '@/types/cube';

// Indices for each face (Kociemba standard)
// U: 0-8, R: 9-17, F: 18-26, D: 27-35, L: 36-44, B: 45-53

const CENTER_U = 4;
const CENTER_R = 13;
const CENTER_F = 22;
const CENTER_D = 31;
const CENTER_L = 40;
const CENTER_B = 49;

// Move Cycles (Simplified for reference, using same logic as previous but cleaner if needed)
// Using the applied move logic from before.
const MOVES: Record<CubeFace, { cycles: number[][] }> = {
    U: { cycles: [[0, 2, 8, 6], [1, 5, 7, 3], [18, 36, 45, 9], [19, 37, 46, 10], [20, 38, 47, 11]] },
    D: { cycles: [[27, 29, 35, 33], [28, 32, 34, 30], [24, 15, 51, 42], [25, 16, 52, 43], [26, 17, 53, 44]] },
    F: { cycles: [[18, 20, 26, 24], [19, 23, 25, 21], [6, 9, 29, 44], [7, 12, 28, 41], [8, 15, 27, 38]] },
    B: { cycles: [[45, 47, 53, 51], [46, 50, 52, 48], [2, 36, 33, 11], [1, 39, 34, 14], [0, 42, 35, 17]] },
    L: { cycles: [[36, 38, 44, 42], [37, 41, 43, 39], [0, 18, 27, 53], [3, 21, 30, 50], [6, 24, 33, 47]] },
    R: { cycles: [[9, 11, 17, 15], [10, 14, 16, 12], [8, 45, 35, 26], [5, 48, 32, 23], [2, 51, 29, 20]] }
};

const applyCycle = (arr: any[], indices: number[]) => {
    const temp = arr[indices[indices.length - 1]];
    for (let i = indices.length - 1; i > 0; i--) {
        arr[indices[i]] = arr[indices[i - 1]];
    }
    arr[indices[0]] = temp;
};

export const applyMove = (facelets: Facelets, move: MoveEvent['face'], direction: 1 | -1): Facelets => {
    const newFacelets = [...facelets];
    const def = MOVES[move];
    if (!def) return newFacelets;

    const count = direction === 1 ? 1 : 3;
    for (let i = 0; i < count; i++) {
        def.cycles.forEach(cycle => applyCycle(newFacelets, cycle));
    }
    return newFacelets;
};

const match = (facelets: Facelets, idx: number, centerIdx: number) => facelets[idx] === facelets[centerIdx];

// --- D Face CFOP (Yellow Cross) ---
export const checkCrossD = (f: Facelets): boolean => {
    // D-F: D28, F25
    if (!match(f, 28, CENTER_D) || !match(f, 25, CENTER_F)) return false;
    // D-R: D32, R16
    if (!match(f, 32, CENTER_D) || !match(f, 16, CENTER_R)) return false;
    // D-B: D34, B52
    if (!match(f, 34, CENTER_D) || !match(f, 52, CENTER_B)) return false;
    // D-L: D30, L43
    if (!match(f, 30, CENTER_D) || !match(f, 43, CENTER_L)) return false;
    return true;
};

export const checkF2LD = (f: Facelets): boolean => {
    if (!checkCrossD(f)) return false;
    // Pairs
    // FR: D29, F26, R15. Edge F23, R12.
    if (!match(f, 29, CENTER_D) || !match(f, 26, CENTER_F) || !match(f, 15, CENTER_R)) return false;
    if (!match(f, 23, CENTER_F) || !match(f, 12, CENTER_R)) return false;
    // RB: D35, B51, R17. Edge B48, R14.
    if (!match(f, 35, CENTER_D) || !match(f, 51, CENTER_B) || !match(f, 17, CENTER_R)) return false;
    if (!match(f, 48, CENTER_B) || !match(f, 14, CENTER_R)) return false;
    // BL: D33, B53, L42. Edge B50, L39.
    if (!match(f, 33, CENTER_D) || !match(f, 53, CENTER_B) || !match(f, 42, CENTER_L)) return false;
    if (!match(f, 50, CENTER_B) || !match(f, 39, CENTER_L)) return false;
    // LF: D27, F24, L44. Edge F21, L41.
    if (!match(f, 27, CENTER_D) || !match(f, 24, CENTER_F) || !match(f, 44, CENTER_L)) return false;
    if (!match(f, 21, CENTER_F) || !match(f, 41, CENTER_L)) return false;
    return true;
};

export const checkOLLD = (f: Facelets): boolean => {
    // If solving D cross, OLL is on U
    if (!checkF2LD(f)) return false;
    const uColor = f[CENTER_U];
    for (let i = 0; i < 9; i++) {
        if (f[i] !== uColor) return false;
    }
    return true;
};


// --- U Face CFOP (White Cross) ---
export const checkCrossU = (f: Facelets): boolean => {
    // U-B (Top, 1): U1, B46
    if (!match(f, 1, CENTER_U) || !match(f, 46, CENTER_B)) return false;
    // U-L (Left, 3): U3, L37
    if (!match(f, 3, CENTER_U) || !match(f, 37, CENTER_L)) return false;
    // U-R (Right, 5): U5, R10
    if (!match(f, 5, CENTER_U) || !match(f, 10, CENTER_R)) return false;
    // U-F (Bottom, 7): U7, F19
    if (!match(f, 7, CENTER_U) || !match(f, 19, CENTER_F)) return false;
    return true;
};

export const checkF2LU = (f: Facelets): boolean => {
    if (!checkCrossU(f)) return false;
    // Pairs (Corners are 0,2,6,8 on U face)
    // BL (U0): U0, B47, L36. Edge B50, L39 (Wait, edges are Middle layer: B50/L39 is middle? L top is 36,37,38. L mid is 39,40,41. B mid is 48,49,50. Yes.)
    if (!match(f, 0, CENTER_U) || !match(f, 47, CENTER_B) || !match(f, 36, CENTER_L)) return false;
    if (!match(f, 50, CENTER_B) || !match(f, 39, CENTER_L)) return false;

    // BR (U2): U2, B45, R11. Edge B48, R14.
    if (!match(f, 2, CENTER_U) || !match(f, 45, CENTER_B) || !match(f, 11, CENTER_R)) return false;
    if (!match(f, 48, CENTER_B) || !match(f, 14, CENTER_R)) return false;

    // FL (U6): U6, F18, L38. Edge F21, L41. (Wait, L top-right is 38? L is 36-38 Top. L38 is L-Top-Right. Touches F-Top-Left F18. Correct.)
    if (!match(f, 6, CENTER_U) || !match(f, 18, CENTER_F) || !match(f, 38, CENTER_L)) return false;
    if (!match(f, 21, CENTER_F) || !match(f, 41, CENTER_L)) return false;

    // FR (U8): U8, F20, R9. Edge F23, R12.
    if (!match(f, 8, CENTER_U) || !match(f, 20, CENTER_F) || !match(f, 9, CENTER_R)) return false;
    if (!match(f, 23, CENTER_F) || !match(f, 12, CENTER_R)) return false;

    return true;
};

export const checkOLLU = (f: Facelets): boolean => {
    // If solving U cross, OLL is on D
    if (!checkF2LU(f)) return false;
    const dColor = f[CENTER_D];
    for (let i = 27; i < 36; i++) {
        if (f[i] !== dColor) return false;
    }
    return true;
};

// --- Generic wrappers ---
export const checkCross = (f: Facelets): boolean => checkCrossD(f) || checkCrossU(f);
export const checkF2L = (f: Facelets): boolean => checkF2LD(f) || checkF2LU(f);
export const checkOLL = (f: Facelets): boolean => checkOLLD(f) || checkOLLU(f);
export const checkPLL = (f: Facelets): boolean => {
    // All faces solved matches all centers
    for (let faceStart = 0; faceStart < 54; faceStart += 9) {
        const center = faceStart + 4;
        for (let i = 0; i < 9; i++) {
            if (f[faceStart + i] !== f[center]) return false;
        }
    }
    return true;
};

// We need a stateful detector for the Analyzer because we shouldn't switch between U and D mid-solve.
export const determineBaseFace = (f: Facelets): 'U' | 'D' | null => {
    if (checkCrossD(f)) return 'D';
    if (checkCrossU(f)) return 'U';
    return null;
};
