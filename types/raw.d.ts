declare module "*?raw" {
  const source: string;
  export default source;
}

// Versioned source imports end in &raw; keep the declaration narrow so other
// asset imports still require their own types.
declare module "*&raw" {
  const source: string;
  export default source;
}
