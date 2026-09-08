// Tiny id/code helpers kept out of components so the React purity lint
// (no Date.now / Math.random in render) stays clean.
let counter = 0;

export function uid(prefix = "") {
  counter += 1;
  return `${prefix}${Date.now().toString(36)}${counter.toString(36)}${Math.random().toString(36).slice(2, 6)}`;
}

const ALPHABET = "abcdefghijklmnopqrstuvwxyz0123456789";
export function randomCode(length: number, upper = false) {
  let out = "";
  for (let i = 0; i < length; i++) out += ALPHABET[Math.floor(Math.random() * ALPHABET.length)];
  return upper ? out.toUpperCase() : out;
}

export function cacheBust() {
  return Date.now();
}
