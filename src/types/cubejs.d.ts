declare module 'cubejs' {
  export class Cube {
    static initSolver(): void;
    static fromString(state: string): Cube;
    solve(): string;
  }
  export default Cube;
}

declare module 'cubejs/lib/solve' {
  // This module provides side effects only
}