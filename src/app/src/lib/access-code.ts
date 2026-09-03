import { randomInt } from "crypto";

/** Génère un code de connexion chauffeur à 16 chiffres, cryptographiquement aléatoire. */
export function generateAccessCode(): string {
  let code = "";
  for (let i = 0; i < 16; i++) code += randomInt(0, 10).toString();
  return code;
}

/** Découpe le code en groupes de 4 pour l'affichage ("1234 5678 9012 3456"). */
export function formatAccessCode(code: string): string {
  return code.replace(/(.{4})/g, "$1 ").trim();
}
