export const ARTICLE_SECTIONS = ["Débuter", "Dépenses", "Épargne", "Investissement", "Couple"] as const;

/** Un paragraphe, ou une liste (numérotée si `ordered`). */
export type ArticleBlock = string | { items: string[]; ordered?: boolean };

export type LearnArticle = {
  id: string;
  sec: (typeof ARTICLE_SECTIONS)[number];
  title: string;
  min: number;
  lede: string;
  body: ArticleBlock[];
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
    lede: "Distinguer ce dont vous avez besoin de ce dont vous avez envie.",
    body: [
      "Un besoin, c’est ce dont vous ne pouvez pas vous passer pour vivre et travailler : se loger, manger, se soigner, se déplacer pour aller travailler. Une envie, c’est ce qui fait plaisir mais dont vous pouvez vous passer : sorties, vêtements de marque, dernier téléphone.",
      "Les envies ne sont pas un problème. Elles ont leur place dans la catégorie « Dépenses personnelles ». Le problème commence quand elles prennent la place des besoins.",
      "Certaines dépenses sont entre les deux. Un forfait internet peut être un besoin si vous travaillez avec, mais le forfait le plus cher est une envie. Posez-vous la question : de quoi ai-je vraiment besoin, et qu’est-ce que j’ajoute en plus ?",
      "Astuce : devant un achat non prévu, attendez 24 heures. Si l’envie est passée, vous avez économisé. Si elle reste, achetez-le l’esprit tranquille.",
    ],
  },
  {
    id: "essentielle",
    sec: "Dépenses",
    title: "Reconnaître une dépense essentielle",
    min: 2,
    lede: "Un test simple pour savoir ce qui ne peut pas attendre.",
    body: [
      "Demandez-vous : si je ne paie pas cette dépense, y a-t-il une conséquence grave sur mon logement, ma santé, ma sécurité ou mon travail ? Si oui, elle est essentielle.",
      "Les dépenses essentielles sont en général :",
      {
        items: [
          "le loyer, l’eau et l’électricité,",
          "la nourriture de base,",
          "les soins et médicaments,",
          "le transport vers le travail ou l’école,",
          "la scolarité des enfants,",
          "le remboursement minimum d’une dette.",
        ],
      },
      "Attention au niveau. Manger est essentiel, mais manger au restaurant tous les jours ne l’est pas. Dans chaque dépense essentielle, il y a une version minimum (le nécessaire) et des options en plus (le confort). Budgétisez d’abord le minimum.",
    ],
  },
  {
    id: "imprevus",
    sec: "Dépenses",
    title: "Gérer les dépenses imprévues",
    min: 3,
    lede: "Un imprévu est normal, pas exceptionnel.",
    body: [
      "Réparation, maladie, cérémonie familiale, panne de téléphone : chaque mois apporte quelque chose qu’on n’avait pas prévu. Le budget doit donc en tenir compte.",
      "Avant : gardez une enveloppe « Imprévus », environ 5 % de vos revenus.",
      "Quand ça arrive :",
      {
        ordered: true,
        items: [
          "Vérifiez si c’est urgent ou si cela peut attendre.",
          "Payez d’abord avec l’enveloppe « Imprévus ».",
          "Si elle ne suffit pas et que c’est une vraie urgence, utilisez le fonds d’urgence.",
          "Sinon, déplacez de l’argent d’une enveloppe « envies » (loisirs, sorties), jamais des besoins essentiels.",
        ],
      },
      "Après : notez la dépense comme « imprévue », puis reconstituez l’enveloppe le mois suivant. Évitez de vous endetter pour un imprévu : c’est exactement le rôle de l’épargne.",
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
    lede: "Votre protection contre les mauvaises surprises.",
    body: [
      "C’est une réserve d’argent réservée aux vrais coups durs : perte de revenu, maladie, réparation indispensable. Ce n’est ni pour les fêtes, ni pour une promotion.",
      "Quel montant ? Visez 3 mois de dépenses essentielles. Si vos besoins coûtent 600 000 Ar par mois, l’objectif est de 1 800 000 Ar. Si c’est trop haut au début, commencez par 1 mois, puis augmentez.",
      "Où le garder ? Dans un endroit accessible rapidement, mais séparé de votre argent du quotidien, pour ne pas être tenté de le dépenser. Il ne doit pas être bloqué dans un placement risqué.",
      "Règle d’or : si vous l’utilisez, reconstituez-le dès que possible. Il passe avant tout investissement.",
    ],
  },
  {
    id: "objectif",
    sec: "Épargne",
    title: "Définir un objectif d’épargne",
    min: 2,
    lede: "Un objectif clair se réalise plus facilement qu’une vague intention.",
    body: [
      "« Je veux économiser » est difficile à tenir. Un bon objectif répond à trois questions : combien, pour quoi, pour quand ?",
      "Exemple : 1 200 000 Ar pour du matériel de travail dans 12 mois. Calcul : 1 200 000 ÷ 12 = 100 000 Ar à mettre de côté chaque mois.",
      "Si ce montant est trop élevé, deux options : allonger le délai, ou réduire l’objectif. Mieux vaut un plan réaliste tenu que parfait et abandonné.",
      "Donnez un nom à chaque objectif dans une enveloppe séparée. Voir l’argent avancer motive. Si vous en avez plusieurs, commencez par le fonds d’urgence.",
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
    min: 3,
    lede: "Une formation est un investissement quand elle augmente vos revenus.",
    body: [
      "Se former peut être l’un des meilleurs investissements, car ce que vous apprenez reste avec vous. Mais toutes les formations ne se valent pas. Avant de payer, posez-vous trois questions :",
      {
        ordered: true,
        items: [
          "Va-t-elle m’aider à gagner plus ou à trouver un meilleur emploi ? Soyez précis.",
          "Combien de temps pour récupérer le coût ? Une formation à 300 000 Ar qui vous rapporte 50 000 Ar de plus par mois est rentabilisée en 6 mois.",
          "Puis-je me le permettre sans toucher à mon fonds d’urgence ?",
        ],
      },
      "Méfiez-vous des promesses de gains rapides et garantis. Renseignez-vous auprès de personnes qui ont suivi la formation. Si le coût est élevé, vous pouvez la financer progressivement par une épargne dédiée.",
    ],
  },
  {
    id: "couple",
    sec: "Couple",
    title: "Gérer l’argent en couple",
    min: 2,
    lede: "Parler d’argent ensemble évite bien des disputes.",
    body: [
      "L’argent est une cause fréquente de tensions dans les couples, souvent parce qu’on n’en parle pas assez. Voici une méthode simple :",
      {
        items: [
          "Tout mettre sur la table : revenus, dépenses, dettes, objectifs de chacun.",
          "Créer 3 espaces : une enveloppe commune (loyer, nourriture, enfants), et une enveloppe personnelle pour chacun, dont l’autre n’a pas à connaître l’usage.",
          "Se retrouver chaque mois : 20 minutes pour regarder le budget ensemble, sans reproches, avec les chiffres.",
        ],
      },
      "Les enveloppes personnelles sont importantes : elles donnent à chacun une liberté et évitent de se justifier pour chaque petite dépense.",
    ],
  },
  {
    id: "5050",
    sec: "Couple",
    title: "50/50 ou proportionnel aux revenus ?",
    min: 3,
    lede: "Deux façons de partager les dépenses communes.",
    body: [
      "Le 50/50 : chacun paie la même somme. C’est simple, mais cela pèse davantage sur celui qui gagne le moins.",
      "Le proportionnel : chacun contribue selon ses revenus.",
      "Exemple : dépenses communes de 1 000 000 Ar. Revenus : 1 200 000 Ar et 800 000 Ar, soit 60 % et 40 %.",
      {
        items: [
          "En 50/50 : 500 000 Ar chacun. Il reste 700 000 Ar à l’un et 300 000 Ar à l’autre.",
          "En proportionnel : 600 000 Ar et 400 000 Ar. Il reste 600 000 Ar et 400 000 Ar.",
        ],
      },
      "Le proportionnel est souvent plus équitable quand les revenus sont très différents. Mais il n’y a pas de bonne réponse unique : le meilleur système est celui que les deux trouvent juste. Quel que soit le choix, vous pouvez le revoir si la situation change.",
    ],
  },
  {
    id: "projet-commun",
    sec: "Couple",
    title: "Préparer un projet commun",
    min: 3,
    lede: "Mariage, maison, terrain, voyage : avancer dans la même direction.",
    body: [
      "Un projet commun réussit quand il est précis et partagé.",
      {
        ordered: true,
        items: [
          "Décrivez-le ensemble : quel est le projet ? Pourquoi est-il important pour chacun ?",
          "Chiffrez-le : combien cela coûte-t-il ? Pour quelle date ?",
          "Calculez l’effort mensuel : par exemple, 6 000 000 Ar en 24 mois = 250 000 Ar par mois.",
          "Répartissez la contribution : à parts égales ou proportionnelles aux revenus.",
          "Ouvrez une enveloppe dédiée, séparée du budget courant.",
          "Faites le point chaque mois : on avance, on ajuste, on célèbre les étapes.",
        ],
      },
      "Si l’un des deux ne peut pas contribuer un mois, parlez-en tôt plutôt que de laisser s’installer le non-dit.",
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
