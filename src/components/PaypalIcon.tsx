/**
 * Rendu du mot-symbole PayPal en texte stylé plutôt qu'en tracé SVG copié
 * de mémoire — un tracé de logo complexe reconstruit sans le fichier
 * source réel risque de rendre déformé. Le texte, avec les vraies couleurs
 * de marque officielles (bleu foncé "Pay" + bleu clair "Pal"), reste
 * fidèle et fiable à l'affichage.
 */
export default function PaypalIcon({ fontSize = 17 }: { fontSize?: number }) {
  return (
    <span style={{ fontFamily: "'Helvetica Neue', Arial, sans-serif", fontStyle: "italic", fontWeight: 700, fontSize, lineHeight: 1 }}>
      <span style={{ color: "#003087" }}>Pay</span>
      <span style={{ color: "#009cde" }}>Pal</span>
    </span>
  );
}
