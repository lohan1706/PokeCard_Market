-- Filtres d'égalité du catalogue. Le nom continue d'utiliser l'index GIN trigram.
CREATE INDEX "Card_rarity_idx" ON "Card"("rarity");

CREATE INDEX "Set_language_idx" ON "Set"("language");
