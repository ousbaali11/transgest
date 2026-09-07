import { randomInt } from "crypto";

// Chiffres et lettres, sans les caractères ambigus à l'écrit ou à l'oral
// (0/O, 1/l/I) — un chauffeur peu à l'aise avec la technologie doit
// pouvoir le recopier sans se tromper. ~48 bits d'entropie sur 8
// caractères : largement suffisant contre une tentative de deviner le
// code, avec une limite de tentatives en plus côté connexion.
const CODE_ALPHABET = "23456789ABCDEFGHJKMNPQRSTUVWXYZabcdefghjkmnpqrstuvwxyz";

/** Génère un code de connexion chauffeur à 8 caractères (chiffres + lettres), cryptographiquement aléatoire. */
export function generateAccessCode(): string {
  let code = "";
  for (let i = 0; i < 8; i++) code += CODE_ALPHABET[randomInt(0, CODE_ALPHABET.length)];
  return code;
}

/** Découpe le code en 2 groupes de 4 pour l'affichage ("A1b2 C3d4"). */
export function formatAccessCode(code: string): string {
  return code.replace(/(.{4})/g, "$1 ").trim();
}
