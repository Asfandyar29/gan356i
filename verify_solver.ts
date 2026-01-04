import { createSolvedCube } from './src/types/cube';
import { checkF2LD, checkOLLD, checkPLL } from './src/lib/cube-solver';

const cube = createSolvedCube();
console.log('Testing Solved Cube against CFOP checks...');

const f2l = checkF2LD(cube);
console.log(`F2L Check: ${f2l ? 'PASS' : 'FAIL'}`);

const oll = checkOLLD(cube);
console.log(`OLL Check: ${oll ? 'PASS' : 'FAIL'}`);

const pll = checkPLL(cube);
console.log(`PLL Check: ${pll ? 'PASS' : 'FAIL'}`);

if (!f2l) {
    console.log('Debugging F2L Failure...');
    // We can't easily debug internal matching here without copy-paste code,
    // but knowing it fails is enough to confirm the bug.
}
