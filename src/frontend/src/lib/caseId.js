/** One stable “case file” id per screen mount (demo / hackathon polish). */
export function makeCaseId() {
  const part = Date.now().toString(36).toUpperCase().slice(-5);
  const rand = Math.random().toString(36).toUpperCase().slice(2, 6);
  return `SNV-${part}-${rand}`;
}
