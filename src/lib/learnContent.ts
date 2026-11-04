export const ARTICLE_SECTIONS = ["Débuter", "Dépenses", "Épargne", "Investissement", "Couple"] as const;

export type LearnArticle = {
  id: string;
  sec: (typeof ARTICLE_SECTIONS)[number];
  title: string;
  min: number;
  lede: string;
  body: string[];
};

export const ARTICLES: LearnArticle[] = [
  {
    id: "budget",
    sec: "Débuter",
    title: "Qu’est-ce qu’un budget ?",
    min: 2,
    lede: "Un plan simple pour décider à l’avance où va votre argent.",
    body: [
      "Un budget, c’est un plan. Au début du mois, vous regardez combien d’argent va entrer, puis vous décidez à quoi il va servir. Chaque ariary reçoit une destination : le loyer, la nourriture, l’épargne, un projet, les loisirs.",
      "Sans budget, on découvre en fin de mois où l’argent est parti. Avec un budget, on le décide avant. C’est toute la différence entre subir ses dépenses et les choisir.",
      "Un budget n’est pas une punition. Il ne sert pas à tout interdire, mais à s’assurer que l’essentiel est couvert et qu’il reste de la place pour ce qui vous fait plaisir.",
      "Il n’a pas besoin d’être parfait dès le premier mois. Il s’améliore en l’utilisant : vous comparez le prévu et le réel, vous ajustez, et il devient chaque mois un peu plus juste.",
    ],
  },
  {
    id: "pourquoi",
    sec: "Débuter",
    title: "Pourquoi faire un budget ?",
    min: 2,
    lede: "Savoir combien vous pouvez encore dépenser, sans calcul de tête.",
    body: [
      "Beaucoup de familles gagnent correctement leur vie et se retrouvent pourtant à court avant la fin du mois. Le problème n’est pas toujours le revenu, mais l’absence de plan.",
      "Un budget vous permet de répondre à tout moment à quatre questions : combien j’ai, combien j’ai dépensé, combien je peux encore dépenser, et est-ce que je respecte mon objectif.",
      "Il rend aussi l’épargne possible. Quand on épargne ce qui reste en fin de mois, il ne reste souvent rien. Quand on décide de l’épargne au début, elle devient une priorité comme les autres.",
      "Enfin, il apaise les discussions. Dans un couple, un budget partagé remplace les reproches par des chiffres que chacun peut consulter.",
    ],
  },
  {
    id: "premier",
    sec: "Débuter",
    title: "Créer son premier budget",
    min: 3,
    lede: "Quatre étapes pour démarrer, même sans rien connaître à la finance.",
    body: [
      "Commencez par vos revenus. Additionnez tout ce qui entre dans le mois : salaire, travaux en freelance, petit commerce, primes. C’est votre point de départ.",
      "Répartissez ensuite ce total entre quatre grandes catégories : besoins essentiels, épargne, investissement et dépenses personnelles. L’application propose 50, 15, 10 et 25 %. Ce n’est qu’une référence : si vos besoins prennent 70 % aujourd’hui, partez de là.",
      "Découpez chaque catégorie en enveloppes : alimentation, loyer, transport, fonds d’urgence, loisirs. Donnez à chacune un montant réaliste, basé sur ce que vous dépensez vraiment.",
      "Enfin, notez vos dépenses au fil du mois. C’est cette habitude qui fait fonctionner le budget. En fin de mois, l’analyse vous montre ce qui a marché et ce qu’il faut ajuster.",
    ],
  },
  {
    id: "suivre",
    sec: "Débuter",
    title: "Suivre ses dépenses au quotidien",
    min: 2,
    lede: "Une minute par jour suffit.",
    body: [
      "Le plus simple est de noter chaque dépense au moment où elle a lieu, ou le soir même. Plus on attend, plus on oublie les petits montants, et ce sont souvent eux qui déséquilibrent le budget.",
      "Indiquez si la dépense était prévue ou imprévue. Cela ne change rien au calcul, mais cela vous aidera à comprendre en fin de mois pourquoi une enveloppe a débordé.",
      "Regardez vos enveloppes une fois par semaine. Si l’une approche de sa limite, vous pouvez ralentir, ou déplacer un peu d’argent d’une autre enveloppe moins utilisée.",
    ],
  },
  {
    id: "besoins-envies",
    sec: "Dépenses",
    title: "Besoins ou envies ?",
    min: 2,
    lede: "La question à se poser avant chaque achat.",
    body: [
      "Un besoin est une dépense sans laquelle votre vie quotidienne serait vraiment compromise : se loger, se nourrir, se déplacer pour travailler, scolariser les enfants.",
      "Une envie rend la vie plus agréable, mais on peut s’en passer ou la reporter : un repas au restaurant, un nouveau téléphone alors que l’ancien fonctionne, un abonnement de plus.",
      "La frontière dépend de votre situation. Internet est un besoin pour quelqu’un qui travaille en ligne, une envie pour quelqu’un qui l’utilise surtout pour se divertir. Il n’y a pas de mauvaise réponse, seulement une réponse honnête.",
      "Distinguer les deux ne veut pas dire supprimer les envies. Cela veut dire les financer après avoir couvert l’essentiel.",
    ],
  },
  {
    id: "essentielle",
    sec: "Dépenses",
    title: "Reconnaître une dépense essentielle",
    min: 2,
    lede: "Récurrent ne veut pas dire essentiel.",
    body: [
      "Posez-vous une question simple : si je ne payais pas cette dépense ce mois-ci, qu’est-ce qui se passerait ? Si la réponse est grave pour le foyer, elle est essentielle.",
      "Attention au piège de la récurrence. Un abonnement revient tous les mois, mais cela ne le rend pas indispensable. À l’inverse, une réparation ponctuelle du toit peut être tout à fait essentielle.",
      "Classer correctement vos dépenses vous donne une vision juste : vous savez combien coûte réellement le fonctionnement de base de votre foyer.",
    ],
  },
  {
    id: "imprevus",
    sec: "Dépenses",
    title: "Gérer les dépenses imprévues",
    min: 2,
    lede: "Elles arrivent toujours. Autant s’y préparer.",
    body: [
      "Une panne, une réparation, un problème de santé dans la famille : les imprévus font partie de la vie. Ce qui est imprévisible, c’est le moment, pas le fait qu’ils arrivent.",
      "Dans l’application, une dépense imprévue reste rangée dans son enveloppe habituelle, mais elle est marquée comme imprévue. En fin de mois, vous voyez combien les imprévus vous ont coûté.",
      "Si ce montant revient chaque mois, c’est un signal : prévoyez une petite marge dans vos enveloppes ou renforcez votre fonds d’urgence.",
    ],
  },
  {
    id: "pourquoi-epargner",
    sec: "Épargne",
    title: "Pourquoi épargner ?",
    min: 2,
    lede: "Pour ne plus dépendre du prochain salaire.",
    body: [
      "Épargner, c’est se donner du temps et des choix. Une somme de côté évite de s’endetter au premier imprévu et permet de financer un projet sans stress.",
      "La règle la plus efficace : épargner en début de mois, pas en fin de mois. Dès que le revenu arrive, versez la part prévue vers l’épargne. Ce qui reste est ce que vous pouvez dépenser.",
      "Même un petit montant compte. 50 000 Ar par mois représentent 600 000 Ar au bout d’un an. L’habitude est plus importante que le montant.",
    ],
  },
  {
    id: "fonds-urgence",
    sec: "Épargne",
    title: "Le fonds d’urgence",
    min: 2,
    lede: "Votre filet de sécurité.",
    body: [
      "Le fonds d’urgence est une réserve destinée uniquement aux vrais imprévus : perte de revenus, réparation importante, urgence familiale.",
      "Une référence courante est de viser l’équivalent de trois mois de dépenses essentielles. Si vos besoins représentent 1 500 000 Ar par mois, l’objectif serait de 4 500 000 Ar. C’est une indication, pas une obligation : commencez par un premier palier atteignable.",
      "Gardez ce fonds séparé de l’argent du quotidien, pour ne pas y puiser par habitude. Et si vous l’utilisez, reconstituez-le en priorité les mois suivants.",
    ],
  },
  {
    id: "objectif",
    sec: "Épargne",
    title: "Définir un objectif d’épargne",
    min: 2,
    lede: "Un montant, une date, un versement mensuel.",
    body: [
      "Un bon objectif a un nom, un montant et une échéance. « Voyage à Nosy Be, 1 800 000 Ar, dans huit mois » est plus motivant que « mettre de l’argent de côté ».",
      "Divisez le montant restant par le nombre de mois : vous obtenez le versement mensuel à prévoir dans votre budget. Si ce montant est trop élevé, repoussez la date plutôt que d’abandonner.",
      "Suivre la progression, même lente, entretient la motivation. Chaque versement vous rapproche du but.",
    ],
  },
  {
    id: "epargne-invest",
    sec: "Investissement",
    title: "Épargne ou investissement ?",
    min: 2,
    lede: "Mettre de côté n’est pas la même chose que faire fructifier.",
    body: [
      "L’épargne protège : elle est disponible rapidement et sert aux imprévus et aux objectifs proches. Son rôle n’est pas de rapporter, mais d’être là quand on en a besoin.",
      "L’investissement construit : il sert à créer de la valeur ou des revenus futurs. Une formation, du matériel de travail, un petit commerce. Il comporte souvent plus de risque et demande du temps.",
      "L’ordre recommandé est simple : d’abord un fonds d’urgence, ensuite l’investissement. On évite ainsi de devoir revendre un investissement au mauvais moment pour faire face à un imprévu.",
    ],
  },
  {
    id: "formation",
    sec: "Investissement",
    title: "Investir dans une formation",
    min: 2,
    lede: "Souvent l’investissement le plus rentable.",
    body: [
      "Apprendre une compétence utile peut augmenter durablement vos revenus : obtenir un meilleur poste, proposer un nouveau service, lancer une activité.",
      "Avant de payer une formation, demandez-vous ce qu’elle vous permettra de faire concrètement, et en combien de temps elle peut se rembourser.",
      "Classez ces dépenses dans Investissement et projets : cela vous aide à voir la part de votre revenu que vous consacrez à votre avenir.",
    ],
  },
  {
    id: "couple",
    sec: "Couple",
    title: "Gérer l’argent en couple",
    min: 3,
    lede: "Un budget commun, des dépenses personnelles, et des règles claires.",
    body: [
      "Il n’existe pas une seule bonne façon de gérer l’argent à deux. Certains couples mettent tout en commun, d’autres gardent tout séparé. La formule la plus fréquente combine les deux.",
      "Les dépenses du foyer (loyer, alimentation, école, énergie) forment le budget commun. Chacun y contribue selon une règle convenue ensemble. Le reste de l’argent permet à chacun de garder une part d’autonomie.",
      "Dans l’application, une dépense personnelle n’est visible que par la personne qui l’a enregistrée. Seul son montant est pris en compte dans les totaux. Chacun garde sa vie privée, le couple garde une vision commune.",
      "Prenez un moment chaque mois pour regarder l’analyse ensemble. Parler des chiffres, c’est éviter de se disputer sur des impressions.",
    ],
  },
  {
    id: "5050",
    sec: "Couple",
    title: "50/50 ou proportionnel aux revenus ?",
    min: 2,
    lede: "Deux façons justes de partager, selon les situations.",
    body: [
      "Avec le 50/50, chacun paie la moitié des dépenses communes. C’est simple et adapté quand les deux revenus sont proches.",
      "Avec le partage proportionnel, chacun contribue selon ce qu’il gagne. Si l’un gagne 2 500 000 Ar et l’autre 1 500 000 Ar, le premier paie 62,5 % et le second 37,5 %. Chacun garde ainsi un reste à vivre comparable.",
      "Vous pouvez aussi choisir une répartition personnalisée, par exemple 60/40. L’essentiel est que la règle soit discutée, acceptée par les deux, et revue si la situation change.",
    ],
  },
  {
    id: "projet-commun",
    sec: "Couple",
    title: "Préparer un projet commun",
    min: 2,
    lede: "Un objectif partagé avance plus vite.",
    body: [
      "Voyage, mariage, terrain, maison : un projet commun se prépare comme un objectif d’épargne, avec un montant, une date et un versement mensuel.",
      "Décidez ensemble de la contribution de chacun, avec la même règle que pour le budget commun ou une autre si vous préférez.",
      "Suivez la progression ensemble dans l’onglet Objectifs. Voir le montant grandir mois après mois est une vraie source de motivation à deux.",
    ],
  },
];

export type CatHelp = { def: string; ex: string[]; warn: string };

export const CAT_HELP: Record<string, CatHelp> = {
  besoins: {
    def: "Ce sont les dépenses nécessaires à votre vie quotidienne ou familiale. Sans elles, le foyer ne peut pas fonctionner normalement.",
    ex: [
      "Logement : loyer, charges, entretien nécessaire",
      "Électricité et eau",
      "Alimentation de base : riz, courses, marché",
      "Transport pour le travail ou l’école",
      "Éducation : écolage, cantine, fournitures",
      "Communication utile au travail ou au foyer",
    ],
    warn: "Une dépense récurrente n’est pas automatiquement essentielle. Un abonnement de streaming revient chaque mois, mais reste un loisir. Internet utilisé pour travailler peut en revanche être essentiel. La classification dépend de votre situation.",
  },
  epargne: {
    def: "L’épargne est l’argent que vous mettez de côté au lieu de le dépenser tout de suite. Elle vous protège et vous permet de financer ce qui compte pour vous.",
    ex: [
      "Fonds d’urgence : perte de revenus, réparation importante, urgence familiale",
      "Objectif à court terme : téléphone, meuble, voyage, événement",
      "Épargne familiale : projets du foyer",
    ],
    warn: "Un versement vers l’épargne n’est pas une dépense : l’argent reste à vous. L’application le compte à part pour ne pas le déduire deux fois.",
  },
  invest: {
    def: "Cette catégorie concerne l’argent destiné à créer de la valeur ou à financer un projet futur : ce qui peut vous rapporter plus tard.",
    ex: [
      "Business : stock, lancement d’activité",
      "Formation : cours, certification",
      "Matériel professionnel : ordinateur, outils de travail",
      "Projets : construction, terrain",
    ],
    warn: "Un ordinateur acheté surtout pour travailler va ici. Le même ordinateur acheté pour jouer serait une dépense personnelle.",
  },
  perso: {
    def: "Ce sont les dépenses de confort, de loisirs et d’envies. Elles rendent la vie plus agréable.",
    ex: ["Loisirs : sorties, abonnements, jeux", "Restaurants", "Vêtements", "Cadeaux", "Achats personnels"],
    warn: "Une dépense personnelle n’est pas une mauvaise dépense. L’objectif est de profiter de votre argent tout en respectant vos priorités : c’est pour cela qu’elle a sa propre enveloppe.",
  },
};
