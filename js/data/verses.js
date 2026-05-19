// 16 vers poétiques originaux organisés en trois groupes haïku (5-7-5 syllabes).
// Groupe A : vers d'ouverture (~5 syllabes)
// Groupe B : vers du milieu (~7 syllabes)
// Groupe C : vers de clôture (~5 syllabes)
//
// Chaque joueur choisit un vers par groupe pour composer son haïku (3 lignes).

const VERSES = [
  // ── Groupe A — Ouverture ────────────────────────
  { id: 0,  group: 'A', text: 'Sous un ciel de feu' },       // 5
  { id: 1,  group: 'A', text: 'Un regard se perd' },          // 5
  { id: 2,  group: 'A', text: 'La lumière fuit' },            // 5
  { id: 3,  group: 'A', text: 'Des mains vers le ciel' },     // 5
  { id: 4,  group: 'A', text: 'Tout s\'est figé là' },        // 5
  { id: 5,  group: 'A', text: 'La chair est dorée' },         // 5

  // ── Groupe B — Milieu ───────────────────────────
  { id: 6,  group: 'B', text: 'quelque chose d\'ancien respire' },     // ~7
  { id: 7,  group: 'B', text: 'l\'ombre tient la lumière' },           // ~7
  { id: 8,  group: 'B', text: 'au fond du chaos un visage' },          // ~7
  { id: 9,  group: 'B', text: 'la foule s\'est tue dans la nuit' },    // ~7
  { id: 10, group: 'B', text: 'le temps a tout oublié' },              // ~7

  // ── Groupe C — Clôture ──────────────────────────
  { id: 11, group: 'C', text: 'rien ne bougera' },            // 5
  { id: 12, group: 'C', text: 'tout a disparu' },             // 5
  { id: 13, group: 'C', text: 'l\'écho s\'est tu là' },       // 5
  { id: 14, group: 'C', text: 'les dieux sont partis' },      // 5
  { id: 15, group: 'C', text: 'demain n\'existe pas' },       // 5
];

const VERSE_GROUPS = {
  A: { label: 'Ouverture', syllables: '~5 syllabes', verses: VERSES.filter(v => v.group === 'A') },
  B: { label: 'Milieu',    syllables: '~7 syllabes', verses: VERSES.filter(v => v.group === 'B') },
  C: { label: 'Clôture',   syllables: '~5 syllabes', verses: VERSES.filter(v => v.group === 'C') },
};
