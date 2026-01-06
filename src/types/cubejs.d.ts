declare module 'cubejs' {
    export default class Cube {
        static initSolver(): void;
        static fromString(str: string): Cube;
        solve(): string;
        move(moves: string): void;
    }
}
