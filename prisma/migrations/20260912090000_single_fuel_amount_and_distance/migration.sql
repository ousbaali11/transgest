-- Deux simplifications de saisie, avec conversion des données existantes
-- AVANT toute suppression de colonne (aucune donnée perdue) :
--
-- 1. Voyage : un seul kilométrage total ("distanceKm") au lieu des deux
--    relevés compteur départ/arrivée. L'existant est converti par la
--    différence arrivée − départ (jamais négative, comme l'affichage
--    le faisait déjà) quand les deux relevés étaient renseignés.
--
-- 2. Dépense : une seule somme totale ("montant", colonne déjà existante)
--    au lieu de quantité × prix unitaire. Toute dépense — quelle que soit
--    sa catégorie, l'API acceptait ces champs partout même si seul le
--    carburant les proposait à l'écran — dont le montant n'avait pas été
--    calculé (0) mais qui portait quantité et prix unitaire est complétée
--    par le produit des deux ; un montant déjà renseigné est conservé tel
--    quel, c'est la valeur réellement enregistrée.

-- 1. Voyages ------------------------------------------------------------
ALTER TABLE "Trip" ADD COLUMN "distanceKm" INTEGER;

UPDATE "Trip"
SET "distanceKm" = GREATEST("kmArrivee" - "kmDepart", 0)
WHERE "kmArrivee" IS NOT NULL AND "kmDepart" IS NOT NULL;

ALTER TABLE "Trip" DROP COLUMN "kmDepart",
DROP COLUMN "kmArrivee";

-- 2. Dépenses -----------------------------------------------------------
UPDATE "Expense"
SET "montant" = ROUND(("quantite" * "prixUnitaire")::numeric, 2)
WHERE "montant" = 0
  AND "quantite" IS NOT NULL
  AND "prixUnitaire" IS NOT NULL;

ALTER TABLE "Expense" DROP COLUMN "quantite",
DROP COLUMN "unite",
DROP COLUMN "prixUnitaire";
