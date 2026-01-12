import { MoveEvent, createSolvedCube, CubeFace, Facelets } from '@/types/cube';
import {
    applyMove,
    checkCrossD, checkCrossU,
    checkF2LD, checkF2LU,
    checkOLLD, checkOLLU,
    checkPLL
} from './cube-solver';
import { logger } from './logger';

export interface SolvedStage {
    timestamp: number;
    duration: number;
    moveCount: number;
}

export interface CFOPStats {
    cross: SolvedStage;
    f2l: SolvedStage;
    oll: SolvedStage;
    pll: SolvedStage;
    totalMoveCount: number;
    isCfop: boolean;
    baseFace: 'U' | 'D' | null;
}

const parseMoveString = (moveStr: string): { face: CubeFace; direction: 1 | -1 }[] => {
    const face = moveStr[0] as CubeFace;
    const modifier = moveStr.length > 1 ? moveStr[1] : '';

    if (modifier === '2') {
        return [
            { face, direction: 1 },
            { face, direction: 1 }
        ];
    } else if (modifier === "'") {
        return [{ face, direction: -1 }];
    } else {
        return [{ face, direction: 1 }];
    }
};

export const analyzeSolve = (scramble: string[], moveHistory: MoveEvent[], startTime: number): CFOPStats | null => {
    let facelets = createSolvedCube();

    logger.log('[CFOP] Starting analysis', {
        scrambleLength: scramble.length,
        historyLength: moveHistory.length,
        scramble: scramble.join(' '),
        firstFewMoves: moveHistory.slice(0, 3).map(m => m.notation)
    });

    // Apply scramble
    scramble.forEach(moveStr => {
        const moves = parseMoveString(moveStr);
        moves.forEach(m => {
            facelets = applyMove(facelets, m.face, m.direction);
        });
    });

    logger.log('[CFOP] After scramble, D edges:', facelets[28], facelets[30], facelets[32], facelets[34]);

    let baseFace: 'U' | 'D' | null = null;
    let crossDone: number | null = null;
    let f2lDone: number | null = null;
    let ollDone: number | null = null;
    let pllDone: number | null = null;

    const moveCounts = { cross: 0, f2l: 0, oll: 0, pll: 0 };

    for (let i = 0; i < moveHistory.length; i++) {
        const move = moveHistory[i];

        // Log first 3 moves for debugging
        if (i < 3) {
            logger.log(`[CFOP] Applying move ${i}: ${move.notation} (face=${move.face}, dir=${move.direction})`);
        }

        facelets = applyMove(facelets, move.face, move.direction);

        // Check states
        if (!crossDone) {
            if (checkCrossD(facelets)) {
                baseFace = 'D';
                crossDone = move.timestamp;
                moveCounts.cross = i + 1;
                logger.log(`[CFOP] Cross (D) detected at move ${i + 1}`);
            } else if (checkCrossU(facelets)) {
                baseFace = 'U';
                crossDone = move.timestamp;
                moveCounts.cross = i + 1;
                logger.log(`[CFOP] Cross (U) detected at move ${i + 1}`);
            }
        } else {
            // F2L
            if (!f2lDone) {
                const isF2L = baseFace === 'D' ? checkF2LD(facelets) : checkF2LU(facelets);
                if (isF2L) {
                    f2lDone = move.timestamp;
                    moveCounts.f2l = i + 1 - moveCounts.cross;
                    logger.log(`[CFOP] F2L detected at move ${i + 1}`);
                }
            }

            // OLL
            if (f2lDone && !ollDone) {
                const isOLL = baseFace === 'D' ? checkOLLD(facelets) : checkOLLU(facelets);
                if (isOLL) {
                    ollDone = move.timestamp;
                    moveCounts.oll = i + 1 - (moveCounts.cross + moveCounts.f2l);
                    logger.log(`[CFOP] OLL detected at move ${i + 1}`);
                }
            }

            // PLL
            if (ollDone && !pllDone) {
                if (checkPLL(facelets)) {
                    pllDone = move.timestamp;
                    moveCounts.pll = i + 1 - (moveCounts.cross + moveCounts.f2l + moveCounts.oll);
                    logger.log(`[CFOP] PLL detected at move ${i + 1}`);
                }
            }
        }
    }

    // Even if not PLL done, return partial?
    // Current logic requires PLL done to trigger from Index.tsx (isSolved check).
    // But if Index.tsx detects solved, checkPLL MUST be true at the end.
    // So we function primarily to segment the timestamps.

    const crossTime = crossDone ? crossDone - startTime : 0;
    // If F2L was skipped/not detected but we finished? 
    // Then F2L time is 0. 

    const f2lTime = f2lDone && crossDone ? f2lDone - crossDone : 0;
    const ollTime = ollDone && f2lDone ? ollDone - f2lDone : 0;
    const pllTime = pllDone && ollDone ? pllDone - ollDone : 0;

    // If steps were skipped, we might have issues.
    // e.g. Cross -> PLL (magic).
    // Then f2lDone is null.
    // We should handle "if done" gracefully.

    // If PLL happened but F2L didn't?
    // Then f2lDone is null.
    // If we finished, and PLL is done, then F2L MUST be done.
    // So if f2lDone is null, we can set it to crossDone (0 duration) or pllDone.

    // Better handling:
    const finalTime = pllDone || moveHistory[moveHistory.length - 1]?.timestamp || Date.now();

    // Debug: log final cube state if F2L failed
    if (!f2lDone && crossDone) {
        logger.log('[CFOP] F2L never detected! Final facelets U:',
            facelets.slice(0, 9).join(','),
            'F:', facelets.slice(18, 27).join(','),
            'R:', facelets.slice(9, 18).join(','));
    }

    return {
        cross: { timestamp: crossDone || 0, duration: crossTime, moveCount: moveCounts.cross },
        f2l: { timestamp: f2lDone || 0, duration: f2lTime, moveCount: moveCounts.f2l },
        oll: { timestamp: ollDone || 0, duration: ollTime, moveCount: moveCounts.oll },
        pll: { timestamp: pllDone || 0, duration: pllTime, moveCount: moveCounts.pll },
        totalMoveCount: moveHistory.length,
        isCfop: !!(crossDone && f2lDone && ollDone && pllDone),
        baseFace
    };
};
