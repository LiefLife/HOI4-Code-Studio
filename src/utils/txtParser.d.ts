declare module './txtParser' {
  export function parseTxtErrors(content: string): { line: number; msg: string; type: string }[];
}
