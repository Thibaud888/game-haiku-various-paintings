// Narrative content pools for the "Nuit au Musée" story mode.

const STORY = (() => {

  function pick(arr) {
    return arr[Math.floor(Math.random() * arr.length)];
  }

  const introSequences = [
    [
      'Le musée s\'éteint, salle après salle.',
      'Seuls les tableaux murmurent dans le noir.',
      'Rejoignez la Grande Galerie avant le black-out.',
    ],
    [
      'Un craquement. Puis le silence des salles vides.',
      'Vos lampes sont épuisées. Seule la mémoire guide.',
      'La Grande Galerie est là, quelque part dans le noir.',
    ],
    [
      'L\'horloge du musée s\'est arrêtée.',
      'Les tableaux veillent dans l\'ombre des couloirs.',
      'Le temps presse. La Grande Galerie vous attend.',
    ],
  ];

  const turnPrelude = {
    calm: [
      'Une salle s\'ouvre. Les œuvres murmurent dans la pénombre.',
      'Un couloir, une lumière lointaine. Vous avancez.',
      'Les cadres dorés luisent faiblement. Le chemin continue.',
    ],
    tense: [
      'L\'ampoule au plafond vacille. Vous continuez malgré tout.',
      'Un craquement de parquet. Puis le silence, à nouveau.',
      'Les ombres gagnent du terrain. Hâtez-vous.',
    ],
    dire: [
      'L\'obscurité progresse. Chaque instant est précieux.',
      'Un dernier filament de lumière persiste. Pour combien de temps ?',
      'Le black-out est imminent. Ne ralentissez pas.',
    ],
  };

  const passWhisper = [
    'Dans le silence de votre salle…',
    'L\'obscurité vous entoure. Vous êtes seul(e).',
    'Une lueur fragile. Un tableau. Vos mots.',
    'La nuit du musée vous appartient, le temps d\'un haïku.',
    'Chaque pas résonne dans les couloirs vides.',
  ];

  const composeWhisper = [
    'Seul(e) face aux œuvres. Choisissez avec soin.',
    'Dans le silence, un tableau vous parle.',
    'L\'obscurité attend. Vos vers, eux, demeurent.',
    'Trois lignes pour capturer ce que les mots ne peuvent nommer.',
  ];

  const deductionTension = [
    'Les haïkus parviennent jusqu\'à vous. L\'heure de la déduction a sonné.',
    'Les mots s\'assemblent. Les tableaux vous font face.',
    'Qui a écrit quoi ? L\'obscurité n\'attend pas votre hésitation.',
    'Un haïku. Un tableau. Une vérité à déceler.',
  ];

  const resolutionSuccess = [
    'Une porte s\'ouvre plus loin. Les pas se rapprochent.',
    'La lumière progresse. Le chemin se dégage.',
    'Vos mots ont trouvé leur tableau. La galerie avance.',
    'Un accord parfait dans l\'obscurité. La galerie vous récompense.',
  ];

  const resolutionFailure = [
    'Une ampoule grésille puis cède. Le silence s\'épaissit.',
    'L\'obscurité avance d\'un pas. Tenez bon.',
    'Un faux-pas dans le noir. Vous continuez malgré tout.',
    'Les fils se sont emmêlés. L\'ombre en profite.',
  ];

  const endingWin = [
    'Vous avez traversé les couloirs plongés dans le noir, guidés par les seuls murmures des tableaux. La Grande Galerie s\'ouvre devant vous. Les lumières reviennent, timidement. Le musée est sauvé.',
    'Vos haïkus ont tracé un chemin dans l\'obscurité. Pas après pas, vous avez retrouvé la Grande Galerie. Les gardiens se retrouvent, épuisés mais victorieux.',
    'L\'aube trouve le musée intact. Vos mots l\'ont gardé vivant quand les lumières ont failli. La Grande Galerie vous accueille dans le silence doré du matin.',
  ];

  const endingLose = [
    'L\'obscurité a fini par l\'emporter. Salle après salle, les lumières ont rendu les armes. Le musée dort maintenant dans le silence absolu — jusqu\'à l\'aube.',
    'Le black-out total. Les gardiens, éparpillés dans les ailes silencieuses, attendent la lumière du matin. Les tableaux veillent, immobiles, dans l\'obscurité.',
    'Les fils d\'Ariane se sont rompus un à un. Sans lumière, sans voix, le musée disparaît dans la nuit. Il faudra attendre le jour pour retrouver son chemin.',
  ];

  return {
    introSequences,
    turnPrelude,
    passWhisper,
    composeWhisper,
    deductionTension,
    resolutionSuccess,
    resolutionFailure,
    endingWin,
    endingLose,
    pick,
    pickIntro: () => pick(introSequences),
  };

})();

if (typeof module !== "undefined") module.exports = { STORY };
