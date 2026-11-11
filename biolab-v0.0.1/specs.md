# BIOLAB // Spécifications Complètes de Jeu & Bible de Conception

---

## 1. Gamme Complète des Milieux de Culture (Sélection & Tarification Fixe)

Les milieux ont un coût fixe calibré selon la progression. Aucun système de promotion ou de solde n'altère ces valeurs afin de maintenir une économie prévisible, lente et maîtrisée.

| Milieu de Culture | Coût ($Bio$) | Profil & Spécificités | Tables de Drop / Probabilités | 
| :--- | :--- | :--- | :--- | 
| **1. Gélose Nutritive Ordinaire** | $50$ | Milieu starter standard. Idéal pour accumuler du stock de base. | • Commun : 74.6995 %<br>• Peu Commun : 20.0 %<br>• Rare : 5.0 %<br>• Épique : 0.3 %<br>• Légendaire : 0.0005 %<br>• Secret : 0.0002 % (1/500 000) | 
| **2. Bouillon Cœur-Cervelle Enrichi** | $25\,000$ | Favorise les Bacilles et le métabolisme rapide. | • Commun : 48.0 %<br>• Peu Commun : 37.0 %<br>• Rare : 12.0 %<br>• Épique : 2.8 %<br>• Légendaire : 0.1995 %<br>• Mythique : 0.0005 %<br>• Secret : 0.0005 % (1/200 000) | 
| **3. Gélose Sang-Mouton Sélective** | $95\,000$ | Milieu hautement nutritif, cible les Cocques et les biofilms denses. | • Commun : 30.0 %<br>• Peu Commun : 45.0 %<br>• Rare : 20.0 %<br>• Épique : 4.5 %<br>• Légendaire : 0.499 %<br>• Mythique : 0.001 %<br>• Secret : 0.0007 % (1/140 000) | 
| **4. Gélose Chocolat & IsoVitaleX** | $350\,000$ | Élimine quasiment les déchets cellulaires ordinaires. | • Commun : 12.0 %<br>• Peu Commun : 48.0 %<br>• Rare : 32.0 %<br>• Épique : 7.0 %<br>• Légendaire : 0.98 %<br>• Mythique : 0.02 %<br>• Secret : 0.001 % (1/100 000) | 
| **5. Bouillon Hyper-Salin Volcanique** | $1\,200\,000$ | Milieu extrême réservé aux thermophiles et halophiles. | • Commun : 0 % (Éliminé)<br>• Peu Commun : 35.0 %<br>• Rare : 45.0 %<br>• Épique : 16.5 %<br>• Légendaire : 3.4 %<br>• Mythique : 0.1 %<br>• Secret : 0.002 % (1/50 000) | 
| **6. Sérum Cryo-Abyssal** | $4\,500\,000$ | Milieu cryogénique d'élite, aucun tirage sous le rang Rare. | • Commun : 0 %<br>• Peu Commun : 0 %<br>• Rare : 55.0 %<br>• Épique : 35.0 %<br>• Légendaire : 8.8 %<br>• Mythique : 1.2 %<br>• Secret : 0.004 % (1/25 000) | 
| **7. Gel d'Agar Radio-Isotopique** | $15\,000\,000$<br>$+ 1\text{ Mythique}$ | Conçu pour forcer la rupture de chaîne ADN et la mutagenèse. | • Commun : 0 %<br>• Peu Commun : 0 %<br>• Rare : 20.0 %<br>• Épique : 57.0 %<br>• Légendaire : 18.0 %<br>• Mythique : 4.992 %<br>• **Secret : 0.008 % (1/12 500)** | 

---

## 2. Charte Graphique & Palette Rétro-Labo (Fixe & Immuable)

L'univers visuel repose sur l'esthétique des moniteurs cathodiques CRT et des instruments de laboratoire de recherche des années 1980-1990 : fond sombre phosphoré, balayage scanline subtil et néons chromatiques précis.

* **Fond Principal Labo (Dark Phosphor) :** `#060807`
* **Surface des Boîtes & Cuves (Verre Phtalo) :** `#0B1612`
* **Bordures & Cadres d'Écran :** `#152A22`
* **Lignes de Texte & Chiffres Monospaces :** `#A7F3D0`

### Palette Exacte des Raretés (Néons Rétro)
* **Commun :** Blanc Craie Éteint `#E2E8F0`
* **Peu Commun :** Vert Terminal Cathodique `#22C55E`
* **Rare :** Bleu Cyan Laser `#00E5FF`
* **Épique :** Violet Synthwave `#BD00FF`
* **Légendaire :** Ambre Moniteur Monochrome `#FFB703`
* **Mythique :** Rouge Alarme Décontamination `#FF0055`
* **Secret :** Dégradé Glitch Prismatique Astral (`#EC4899` $\leftrightarrow$ `#38BDF8`) avec micro-particules scintillantes

---

## 3. Cycle Biologique, Mort Cellulaire & Gestion des Déchets Biologiques

### A. La Phase de Croissance (Avant Maturité)
* **Production de Bio continue :** Dès l'ensemencement, la culture produit du Bio en temps réel, proportionnellement à sa jauge de maturité (ex. : à 30 % de pousse, elle génère 30 % de son $Bio/s$).
* **Restrictions :** Impossible de diviser, hybrider ou livrer une colonie avant 100 % de maturité.

| Rareté | Temps de Pousse jusqu'à Maturité | Animation & Comportement Visuel de Croissance | 
| :--- | :--- | :--- | 
| **Commun** | **15 à 30 secondes** | **Germination simple :** Petit amas circulaire opaque qui s'étale lentement du centre vers les bords. | 
| **Peu Commun** | **45 secondes à 1 minute** | **Pulsation mitotique :** La colonie pulse au rythme d'un battement cardiaque régulier, micro-bulles d'oxygène vert néon. | 
| **Rare** | **2 à 3 minutes** | **Filaments & Réseau :** Tentacules fractales s'étendant sur la gélose, halo cyan translucide. | 
| **Épique** | **5 à 7 minutes** | **Bioluminescence :** Noyau violet intense, étincelles orbitales et ondulations à la surface. | 
| **Légendaire** | **10 à 15 minutes** | **Géométrie Cristalline :** Structures polygonales ambrées, micro-arcs dorés crépitant entre les amas. | 
| **Mythique** | **25 à 30 minutes** | **Vortex d'Alarme BSL-4 :** Micro-vibrations de la boîte, bouillonnement carmin et décharges gazeuses. | 
| **Secret** | **45 minutes à 1 heure** | **Distorsion & Glitch Astral :** Aberration chromatique CRT, lentille gravitationnelle et traînées stellaires. | 

### B. Sénescence & Mécanique des Bio-Déchets (Régulateur Anti-Richesse)

Lorsque le temps de vie adulte d'une colonie arrive à zéro, elle devient une **Masse Organique Nécrosée (Résidu Toxique)**.

1. **Blocage de l'Emplacement :** L'incubateur reste indisponible tant que le déchet n'est pas évacué.
2. **Émanation Toxique Temporelle :** Si un résidu reste sur la paillasse plus de 60 secondes, il libère des toxines qui réduisent le rendement des boîtes saines adjacentes de **$-25\ \%$**.
3. **Filière d'Élimination & Traitement :**
   * **Incinération Rapide (Autoclave Flash) :** Coûte un montant forfaitaire en $Bio$ proportionnel au rang de la colonie morte. Libère immédiatement la place :
     $$\text{Coût d'Évacuation} = 15\ Bio \times \sqrt{\text{Multiplicateur Souche}}$$
   * **Bioréacteur de Recyclage (Décontamination Lente) :** Place le résidu dans la cuve à boue biologique. L'opération prend $90\text{ secondes}$ sans coût en Bio, et restitue $10\ \%$ de la valeur du milieu d'origine sous forme de compost nutritif réutilisable.
4. **Impact Économique :** Ce système empêche le joueur de laisser tourner le jeu en fond ("idle") sans surveillance : s'il s'absente trop longtemps, ses incubateurs s'encombrent de déchets toxiques, ce qui stoppe net ses gains passifs et impose une facture de nettoyage à la reprise.

---

## 4. Infrastructure d'Usine Terrestre & Navigation Modulaire

### A. Navigation & Interaction dans l'Usine
Sur l'écran principal, une vue architecturale 2D en coupe montre le Complexe Industriel.
Au clic sur la porte de sas pneumatique, quatre modules s'ouvrent :
1. **[PAILLASSE & INCUBATEURS] :** Boîtes de Pétri actives, pipettes, becs Bunsen, micro-événements et jauge de toxicité.
2. **[CHAMBRE CRYOGÉNIQUE] :** Sas étanche sous vapeur d'azote liquide (`#00E5FF`) pour stocker les souches sans vieillissement.
3. **[ARMOIRE DES DISTINCTIONS] :** Vitrine murale rétro abritant les 16 trophées scientifiques débloqués.
4. **[JOURNAL DE BORD MANUSCRIT] :** Grand cahier à petits carreaux posé à droite de la paillasse consignant notes, croquis et recettes.

### B. Paliers d'Usine, Coûts & Scénographie

| Palier & Infrastructure | Coût de Déblocage | Boîtes / Cryo | Palette Dominante | Description Décor & Paillasse | Cryo-Chambre & Équipement |
| :--- | :--- | :--- | :--- | :--- | :--- |
| **Niv 1 : Établi de Garage DIY** | *Gratuit (Départ)* | **4 boîtes** / **2 tubes** | Murs : Béton `#1E2421`<br>Sol : Carrelage `#2B2D24`<br>Néon : Vert tremblotant `#22C55E` | Établi en contreplaqué taché, tubes à essai dans des boîtes d'œufs, vieille télé CRT monochrome 12". | Vieux congélateur ménager d'occasion fermé par une chaîne, givre épais. |
| **Niv 2 : Annexe Universitaire** | $150\,000\ Bio$<br>$+ 500\ PR$ | **6 boîtes** / **4 tubes** | Murs : Faïence `#22302A`<br>Sol : Vinyle vert `#0D1C16`<br>Néon : Blanc froid `#E2E8F0` | Paillasses en résine phénolique, bec Bunsen sur gaz de ville, étagères de registres cornés et tableau de craie. | Caisson mural en inox brossé avec hublots ronds et manomètres de vapeur. |
| **Niv 3 : Pôle Pharmaceutique** | $1\,800\,000\ Bio$<br>$+ 4\,500\ PR$ | **8 boîtes** / **8 tubes** | Murs : Isolation bleu nuit `#0B192C`<br>Sol : Résine époxy `#071322`<br>Néon : Cyan `#00E5FF` | Hotte à flux laminaire UV germicide, bras micrométriques, doubles moniteurs à graphiques vectoriels ambrés. | Salle blanche pressurisée, cuves titane avec affichage numérique à DEL ambrée. |
| **Niv 4 : Bio-Usine Industrielle** | $12\,000\,000\ Bio$<br>$+ 25\,000\ PR$ | **10 boîtes** / **12 tubes** | Murs : Tôles rivetées `#141C1A`<br>Sol : Caillebotis `#0A110E`<br>Néon : Ambre `#FFB703` | Tuyauteries chromées massives, centrifugeuses au sol, pupitre de commande industriel à gros boutons rétro. | Chambre forte à $-196\ ^\circ\text{C}$, paniers de tubes motorisés émergeant d'un brouillard dense. |
| **Niv 5 : Complexe Bunker BSL-4** | $85\,000\,000\ Bio$<br>$+ 150\,000\ PR$ | **12 boîtes** / **18 tubes** | Murs : Plomb massif `#111618`<br>Sol : Antistatique rouge `#1D0A10`<br>Néon : Alarme rouge `#FF0055` | Sas de décontamination acide, scaphandres pressurisés, triple vitrage blindé, console holographique CRT centrale. | Cryo-matrice sub-zéro circulaire : capsules automatisées plongeant dans un vortex liquide lumineux. |

---

## 5. Modèle Économique de Régulation (Progression Tempérée & Charges Réelles)

Pour garantir un rythme apaisé ("chill") sans croissance exponentielle incontrôlée, le jeu applique des frottements économiques clairs.

```
                  [ PRODUCTION BRUTE DE BIO/S ]
                               │
                               ▼
                ┌───────────────────────────────┐
                │  Étouffement de Niche (-√N)   │  (Pénalise le monosouche)
                └──────────────┬────────────────┘
                               │
                               ▼
                ┌───────────────────────────────┐
                │  Frais Fixes d'Infrastructure │  (Entretien par seconde)
                └──────────────┬────────────────┘
                               │
                               ▼
                ┌───────────────────────────────┐
                │  Coûts d'Azote Liquide (Cryo) │  (Entretien par tube actif)
                └──────────────┬────────────────┘
                               │
                               ▼
                ┌───────────────────────────────┐
                │  Traitement des Bio-Déchets   │  (Frais d'autoclave récurrents)
                └──────────────┬────────────────┘
                               │
                               ▼
                   [ GAIN NET RÉEL DU JOUEUR ]
```

### A. Charges d'Exploitation Fixes par Seconde
Chaque niveau d'usine requiert une maintenance énergétique continue déduite de la production brute :
* **Niveau 1 :** $0.5\ Bio/s$
* **Niveau 2 :** $15\ Bio/s$
* **Niveau 3 :** $140\ Bio/s$
* **Niveau 4 :** $1\,200\ Bio/s$
* **Niveau 5 :** $8\,500\ Bio/s$

*Conséquence :* Le joueur ne peut pas se précipiter sur un bâtiment supérieur sans avoir d'abord consolidé des souches stables pour financer les frais de structure. Si le solde net devient négatif, le labo passe en **Sous-Tension** (vitesse de pousse divisée par 2, sans perte irrémédiable de souche).

### B. Rendements Décroissants de Monoculture (Principe de Niche Écologique)
Cloner la même bactérie d'élite en boucle sur tous les incubateurs sature le milieu. Pour $N$ colonies de la même espèce actives simultanément :

$$\text{Rendement Individuel} = \text{Rendement Théorique} \times \frac{1}{\sqrt{N}}$$

| Nombre de Colonies Identiques ($N$) | Rendement par Boîte | Multiplicateur Global Réel |
| :---: | :---: | :---: |
| **1** | $100\ \%$ | $\times 1.00$ |
| **2** | $70.7\ \%$ | $\approx \times 1.41$ (au lieu de 2.0) |
| **3** | $57.7\ \%$ | $\approx \times 1.73$ (au lieu de 3.0) |
| **4** | $50.0\ PN$ | $\approx \times 2.00$ (au lieu de 4.0) |

*Objectif de jeu :* Inciter le joueur à cultiver une variété d'espèces pour combiner leurs bonus d'adjacence plutôt que de spammer une seule souche optimisée.

---

## 6. L'Armoire des Distinctions (Cabinet de Trophées de Recherche)

Installée contre le mur de l'atelier, cette vitrine en acier martelé vert olive (`#152A22`) avec vitres en verre grillagé protège les 16 récompenses de carrière. Chaque trophée est un objet physique d'époque offrant un bonus permanent mesuré.

### Les 16 Trophées Historiques de BIOLAB

```
┌────────────────────────────────────────────────────────────────────────┐
│                   ARMOIRE DES DISTINCTIONS // BSL-84                   │
├────────────────────────────────────────────────────────────────────────┤
│ [ ÉTAGÈRE 1 : APPRENTISSAGE & SOL ]                                    │
│   [#01 Anse d'Étain]     [#02 Erlenmeyer 1984]   [#03 Manuel Corné]    │
│   [#04 Mortier d'Agate]                                                │
│                                                                        │
│ [ ÉTAGÈRE 2 : PRATIQUE DE PAILLASSE ]                                  │
│   [#05 Pipette Laiton]   [#06 Cloche de Verre]   [#07 Prisme Optique]  │
│   [#08 Spatule Dorée]                                                  │
│                                                                        │
│ [ ÉTAGÈRE 3 : MAÎTRISE INDUSTRIELLE ]                                  │
│   [#09 Bec Bunsen]       [#10 Chronomètre Acier] [#11 Hydromètre]      │
│   [#12 Électrode Argent]                                               │
│                                                                        │
│ [ ÉTAGÈRE 4 : HAUTE CONFINATION ]                                      │
│   [#13 Fiole Scellée]    [#14 Sceau Titane BSL4] [#15 Spirale Fossile] │
│                                                                        │
│ [ CLOCHE SUPÉRIEURE : ANOMALIE RARE ]                                  │
│   [#16 Éprouvette d'Anti-Matière Cristallisée]                         │
└────────────────────────────────────────────────────────────────────────┘
```

| ID | Trophée | Objet Graphique Pixel-Art | Défi de Déblocage | Effet Permanent Actif |
| :---: | :--- | :--- | :--- | :--- |
| **#01** | **L'Anse d'Étain Ébréchée** | Tige métallique fine à boucle noircie par la flamme. | Réaliser $50$ ensemencements manuels. | $+5\ \%$ de vitesse de pousse sur le rang Commun. |
| **#02** | **L'Erlenmeyer Pyrex 1984** | Fiole conique graduée avec graduation patinée. | Cumuler $10\,000\ Bio$ au cours de la partie. | Réduit le coût de la gélose ordinaire de $50$ à $45\ Bio$. |
| **#03** | **Le Manuel de Microbiologie** | Livre broché épais, tranche dorée et signet rouge. | Débloquer l'Annexe Universitaire (Palier 2). | Durée de vie adulte des Bacilles accrue de $+10\ \%$. |
| **#04** | **Le Mortier d'Agate Dense** | Bol et pilon en pierre d'agate verte polie. | Réussir une première mitose végétale sans lyse. | Coût en Bio de scissiparité réduit de $5\ \%$. |
| **#05** | **La Pipette Mécanique en Laiton** | Pipette à bouton-poussoir strié en laiton patiné. | Compléter $25$ contrats de commanditaires civils. | $+5\ \%$ de Bio-crédits sur tous les contrats. |
| **#06** | **La Cloche sous Vide Préservée** | Dôme de verre épais sur socle de liège noir. | Garder une colonie congelée pendant $2\text{ heures}$. | Entretien cryogénique réduit de $10\ \%$. |
| **#07** | **Le Prisme Réfractif de Quartz** | Triangle de cristal réfractant une lueur cyan `#00E5FF`. | Découvrir une souche Rare dans chaque branche. | Chance de mutation spontanée en mitose $+1\ \%$. |
| **#08** | **La Spatule d'Or Chimique** | Fine spatule à double palette en alliage aurifère. | Atteindre une production nette de $500\ Bio/s$. | Frais fixes d'usine réduits de $6\ \%$. |
| **#09** | **Le Brûleur Bunsen Ciselé** | Réchaud en fonte avec manchon en cuivre et veilleuse violette. | Réaliser $15$ mutagenèses chimiques sans échec. | Taux d'échec de mutagenèse réduit de $2\ \%$. |
| **#10** | **Le Chronomètre de Béchamp** | Boîtier de poche à aiguille blanche sur cadran noir. | Valider un contrat sous modificateur *[Urgence Vitale]*. | Les comptes à rebours de mission gagnent $+25\text{ secondes}$. |
| **#11** | **L'Hydromètre d'Étalonnage** | Flotteur de verre gradué avec billes de mercure. | Débloquer la Bio-Usine Industrielle (Palier 4). | Vitesse de traitement des bio-déchets $+20\ \%$. |
| **#12** | **L'Électrode d'Argent Pur** | Cylindre rainuré baignant dans une solution bleu roi. | Amener une bactérie Légendaire à 100 % de maturité. | $+10\ \%$ de Points de Recherche (PR) passifs. |
| **#13** | **La Fiole de Confinement Blindée** | Capsule cylindrique lourde cerclée de vis hexagonales. | Stabiliser une souche Mythique sans la cryogéniser. | Durée de vie adulte des Mythiques prolongée de $+1\text{ min}$. |
| **#14** | **Le Sceau de Sécurité BSL-4** | Médaille d'acier lourd frappée d'un trèfle biologique carmin. | Débloquer le Complexe Bunker BSL-4 (Palier 5). | Réduit le coût d'évacuation par autoclave de $25\ \%$. |
| **#15** | **La Spirale de Plasmide Fossile** | Cube d'ambre transparent renfermant une chaîne luminescente. | Compléter $100\ \%$ des technologies de l'arbre PR. | Les multiplicateurs de symbiose de biofilm gagnent $+2\ \%$. |
| **#16** | **L'Éprouvette d'Anti-Matière** | Tube scellé lévitant dans un champ magnétique vibrant (`#EC4899`). | Isoler n'importe quel Organisme Cosmique Secret. | Supprime le risque de mise en sous-tension du labo. |

---

## 7. Micro-Événements Aléatoires de Paillasse (Ambiance Interactive & Chill)

Pour dynamiser les sessions d'observation sans stresser le joueur, un micro-événement survient toutes les **3 à 5 minutes réelles**. Un carillon feutré de moniteur CRT (`#A7F3D0`) avertit de son apparition.

### A. 10 Micro-Événements Bénéfiques (Interactions Gratuites & Bonus Modérés)

| ID | Événement Visuel | Interaction Requise | Durée d'Affichage | Récompense / Effet Positif |
| :---: | :--- | :--- | :---: | :--- |
| **B1** | **Goutte de Condensat**<br>Brumisation sur le couvercle de Pétri. | Glisser la souris (swipe) pour essuyer la boîte. | 25 s | Prolonge la durée de vie adulte de la colonie de $+15\text{ secondes}$. |
| **B2** | **Pic de Tension Nocturne**<br>Le néon de paillasse tremble et crépite. | Automatique (aucun clic nécessaire). | 30 s | L'incubateur surchauffe doucement : vitesse de pousse $+20\ \%$ temporaire. |
| **B3** | **Spore Vagabonde**<br>Mote lumineuse flottant lentement en travers de l'écran. | Cliquer sur la spore avant qu'elle ne sorte. | 18 s | Accorde immédiatement $+3\ \text{à}\ 8\ PR$ ou 1 boîte d'agar starter gratuite. |
| **B4** | **Bulle de Fermentation**<br>Grosse bulle translucide gonflant dans un tube à essai. | Cliquer pour faire éclater la bulle. | 15 s | Libère un micro-nuage gazeux qui donne un boost de $+10\ \%\ Bio/s$ pendant $45\ s$. |
| **B5** | **Visite du Facteur Scientifique**<br>Une enveloppe kraft tamponnée glisse sur le bureau. | Cliquer sur l'enveloppe pour l'ouvrir. | 40 s | Contient un micro-financement public ponctuel ($+50\ \text{à}\ 350\ Bio$ selon le palier). |
| **B6** | **Reflet Cristallin**<br>Un rayon de soleil traverse un erlenmeyer d'eau distillée. | Cliquer sur le halo irisé projeté sur la paillasse. | 20 s | Réduit de $15\ \%$ le coût de la prochaine division cellulaire mitotique. |
| **B7** | **Lecture Aiguille Stable**<br>Le manomètre à aiguille se cale parfaitement dans le vert. | Tapoter une fois sur le cadran de verre. | 25 s | Le système fonctionne au ralenti parfait : charges fixes annulées pendant $60\ s$. |
| **B8** | **Effusion Métabolique Spontanée**<br>Une boîte de Pétri active se met à luire vivement. | Observer sans toucher (clic non requis). | 20 s | Éjection d'enzymes pures : double la génération de cette boîte pendant $30\ s$. |
| **B9** | **Note Glissée par le Stagiaire**<br>Un post-it jaune d'astuce de paillasse scotché au coin de l'écran. | Cliquer sur le post-it pour le lire. | 35 s | $+5\ \%$ de chance de mutation lors de la prochaine mutagenèse chimique. |
| **B10**| **Vapeur d'Azote Relaxante**<br>Un léger panache de froid s'échappe doucement de la cryo. | Cliquer sur la vanne pour la resserrer. | 22 s | Stoppe gratuitement la consommation d'azote des cryo-tubes pendant $90\ s$. |

---

### B. 5 Micro-Incidents de Paillasse (À Résoudre sous 45 s — Malus Mineurs)

Ces micro-incidents ne détruisent jamais les cultures, mais infligent un léger contretemps économique si le joueur les ignore complètement.

| ID | Incident Visuel | Action de Résolution | Temps imparti | Mini-Malus si non résolu |
| :---: | :--- | :--- | :---: | :--- |
| **M1** | **Bouchon de Suie sur le Bec Bunsen**<br>La flamme vacille, devient jaune et noircit le verre. | Cliquer sur la bague d'air du brûleur pour réajuster le flux. | 45 s | La flamme produit un dépôt : les temps de pousse du plateau augmentent de $+10\ \%$ pendant 2 minutes. |
| **M2** | **Givre Épais sur Manomètre Cryo**<br>Une couche blanche masque les cadrans de température. | Cliquer 3 fois pour gratter le givre de surface. | 40 s | La jauge se dérègle : surcoût d'entretien cryo de $+15\ \%$ pendant 3 minutes. |
| **M3** | **Filtre d'Air Colmaté**<br>Voyant orange clignotant sur la hotte laminaire. | Cliquer sur le boîtier du ventilateur pour décolmater. | 50 s | Micro-poussières : risque de lyse en mitose augmenté de $+3\ \%$ temporairement. |
| **M4** | **Pipette Automatique Désaxée**<br>Un ressort grince lors du prélèvement d'échantillons. | Faire tourner la molette de calibration (1 clic). | 45 s | Précision réduite : la prochaine boîte ensemencée démarre avec $10\ \%$ de vie adulte en moins. |
| **M5** | **Suintement d'Agar-Agar**<br>Une fine bavure de gel s'étale le long du bord d'une boîte. | Cliquer avec un coton stérile pour essuyer le rebord. | 45 s | Encrassement de la vitre : l'évacuation de son résidu mort coûtera $+20\ Bio$ supplémentaire. |

---

## 8. Le Journal de Bord & Carnet de Laboratoire (Module Manuscrit)

Accessible en cliquant sur le vieux classeur cartonné posé sur le bord droit de la paillasse (touches de reliure en laiton, papier jauni à petits carreaux 5x5 mm). 
* **Police Visuelle :** Écriture manuscrite vintage au stylo plume bleu-nuit (`#1E3A8A`) ou typographie de machine à écrire mécanique à ruban usé.
* **Sonorité :** Bruit authentique de page tournée cartonnée et froissement de papier.

```
┌────────────────────────────────────────────────────────────────────────┐
│  BIOLAB // REGISTRE D'OBSERVATION & PROTOCOLES EXPÉRIMENTAUX           │
├──────────────────────────────────┬─────────────────────────────────────┤
│  PAGE GAUCHE : ANNALES AUTOMATIQUES│  PAGE DROITE : FEUILLE DE PAILLASSE │
│                                  │                                     │
│  [12 Octobre - 14:22]            │  ■ PROTOCOLES DÉCOUVERTS :          │
│  "Première colonie de Deinococcus│  • Bacille I + Cocque II            │
│   stabilisée. Halo bleuté intense│    ➔ Taux de mitose stable (98%)    │
│   sur gélose chocolat."          │  • Spirille III + Extrêmophile      │
│                                  │    ➔ Forme une matrice cryo-résistante│
│  [13 Octobre - 09:05]            │                                     │
│  "Tentative #18 de conjugaison : │  ■ NOTES LIBRES DU CHERCHEUR :      │
│   Le biofilm a viré au carmin.   │  [Zone éditable : le joueur peut    │
│   Noter la sensibilité à l'azote"│   taper ses propres annotations,    │
│                                  │   mémos de contrats et priorités]   │
│  [14 Octobre - 18:40]            │                                     │
│  "Rupture de chaîne ADN validée. │  ■ STATISTIQUES VINTAGE DU LABO :   │
│   La souche présente des reflets │  • Heures d'observation : 14 h 32   │
│   prismatiques insolites."       │  • Bio-déchets autoclavés : 87      │
│                                  │  • Taux d'intégrité moyen : 96.2 %  │
└──────────────────────────────────┴─────────────────────────────────────┘
```

### Fonctions Clés du Carnet :
1. **L'Encre d'Archivage (Automatique) :** Chaque fois que le joueur découvre une espèce, réussit une mutation rare ou survit à une sous-tension, le carnet écrit automatiquement une phrase d'époque datée, plongeant le joueur dans la peau d'un microbiologiste des années 80.
2. **Le Manuel d'Hybridation (Codex Découvert) :** Liste sous forme de croquis à l'encre les souches parentes testées et les probabilités réelles observées lors des conjugaisons passées.
3. **Le Bloc-Notes Libre :** Champ de texte entièrement interactif où le joueur note ses objectifs personnels (ex. : *"Garder 2 Cryo-tubes pour la mission spatiale de ce soir"*, *"Éviter de cloner les Spirilles avant palier 3"*). La sauvegarde est persistante.

---

## 9. Arbre Technologique des Points de Recherche (PR)

Les Points de Recherche s'acquièrent via les contrats scientifiques ou via certaines souches spécialisées. Leurs effets sont permanents.

```
[ARBRE DE RECHERCHE // DÉPENSES PR DÉFINITIVES]
 ├── BRANCHE I : CELLULAIRE & SÉNESCENCE
 │    ├── T1 : Télomères Renforcés (250 PR) ➔ +15 % de durée de vie sur toutes les cultures
 │    ├── T2 : Stabilisateur d'Histones (1 200 PR) ➔ Risque de lyse en mitose abaissé à 4 % (au lieu de 8 %)
 │    └── T3 : Longévité Éternelle (15 000 PR) ➔ Double la durée de vie adulte des Légendaires et Mythiques
 │
 ├── BRANCHE II : GESTION THERMIQUE & CRYOGÉNIE
 │    ├── C1 : Isolation Azote Liquide (400 PR) ➔ -25 % sur le coût d'entretien cryo en Bio/s
 │    ├── C2 : Condensateur Cryogénique (3 500 PR) ➔ -50 % sur le coût d'entretien cryo en Bio/s
 │    └── C3 : Métabolisme Basal Gelé (30 000 PR) ➔ Les souches cryogénisées produisent 5 % de leur Bio/s
 │
 ├── BRANCHE III : ANALYSE & TRAITEMENT DES FLUX
 │    ├── S1 : Centrifugeuse de Précision (800 PR) ➔ +10 % de chance relative sur les paliers Rare et Épique
 │    ├── S2 : Incinérateur à Induction (6 000 PR) ➔ Divise par deux le temps de recyclage des bio-déchets
 │    └── S3 : Filtres HEPA Régénératifs (50 000 PR) ➔ Réduit les charges fixes d'usine de 20 %
 │
 └── BRANCHE IV : HYBRIDATION PLASMIDIQUE
      ├── M1 : Pipettes Chauffantes (500 PR) ➔ Divise le coût en Bio de scissiparité par deux
      ├── M2 : Catalyseur Chimique (8 000 PR) ➔ +10 % de probabilité de rang supérieur en croisement
      └── M3 : Matrice à Trois Canaux (75 000 PR) ➔ Permet de conjuguer trois souches en une seule opération
```

---

## 10. Protocoles de Multiplication Cellulaire

### Méthode A : Scissiparité Végétative (Clonage Stable)
* **Coût :** $25\ \%\ \text{du prix du milieu d'origine}$ en $Bio$.
* **Exigences :** Colonie donneuse à 100 % de maturité et 1 emplacement libre.
* **Issues possibles :**
  * **90 % — Clone Régulier :** Copie neuve identique avec durée de vie réinitialisée.
  * **2 % — Mutation Spontanée :** La nouvelle boîte gagne $+1$ rang de rareté au sein de sa branche.
  * **8 % — Lyse Cellulaire :** La boîte fille éclate à l'ensemencement (la boîte mère reste intacte).

### Méthode B : Mutagenèse Chimique & Rayons UV (Pari Risqué)
* **Coût :** Frais en $Bio$ élevés $+ 15\ PR$.
* **Issues possibles :**
  * **65 % :** Clone standard conforme.
  * **19.9 % :** **Mutation Ascendante Réussie (+1 rang)**.
  * **0.1 % :** **Super-Saut Génétique (+2 rangs directs)**.
  * **15 % :** **Lyse Cellulaire Totale** (destruction définitive de la culture fille).

### Méthode C : Conjugaison Thermochimique (Hybridation)
* **Coût :** $(Multiplicateur_A + Multiplicateur_B) \times 1\,500\ Bio$.
* **Règles :**
  * 50 % de chance d'hériter de la structure physique du Parent A, 50 % du Parent B.
  * Rang résultant au moins égal à la souche parente la plus modeste, avec possibilité d'obtenir des chimères uniques de laboratoire.

---

## 11. Contrats Dynamiques Procéduraux

Chaque mission affichée sur le panneau d'affichage résulte d'une formule non redondante :

$$\text{Commanditaire} \times \text{Objectif} \times \text{Contrainte de Validation} \times \text{Gains Multiples}$$

### A. Profils des Commanditaires
1. **Hôpitaux Régionaux & Dispensaires :** Rémunération solide en $Bio$, requièrent des souches thérapeutiques stables.
2. **Coopératives Agro-Alimentaires :** Demandent de gros volumes de ferments, fournissent des milieux de culture spécifiques scellés.
3. **Agences de Recherche Militaire & Aérospatiale :** Recherchent des extrêmophiles coriaces, paient quasi exclusivement en gros volumes de **Points de Recherche (PR)**.
4. **Laboratoires Clandestins :** Missions courtes à haut risque, délivrent des souches mutagènes ou des réactifs radio-isotopiques rares.

### B. Typologies d'Objectifs
1. **Prélèvement Définitif (Livraison directe) :** La boîte demandée est expédiée et consommée.
2. **Extraction Métabolique Continue :** Maintenir une culture adulte active sur la paillasse pendant une durée donnée sans la perdre. La culture est conservée.
3. **Course d'Incubation Chronométrée :** Ensemencer et faire monter une colonie à 100 % de maturité avant l'échéance.
4. **Symbiose de Plateau :** Agencer simultanément 3 ou 4 souches de même famille sur les incubateurs.
5. **Chimère Spécifique :** Conjuguer deux espèces précises pour valider un profil plasmidique demandé.

### C. Contraintes & Multiplicateurs Associés
* **[Urgence Vitale] :** Délai de livraison réduit à 3 minutes. $\rightarrow$ Récompenses $\times 2.5$.
* **[Pureté Génétique] :** La culture ne doit avoir subi aucune mutation préalable. $\rightarrow$ Récompenses $\times 1.8$.
* **[Stabilisation Cryo] :** Doit avoir passé au moins 2 minutes en tube d'azote avant validation. $\rightarrow$ Récompenses $\times 1.5$.
* **[Culture Économique] :** Doit avoir été ensemencée sur Gélose Ordinaire ($50\ Bio$). $\rightarrow$ Récompenses $\times 3.0$.

---

## 12. Arbre Phylogénétique Complet (24 Souches Détaillées)

### Branche I : Bacilles Métaboliques (Spécialisation : Rendement en $Bio/s$)

* **[Commun] *Bacillus subtilis***
  * *Temps de pousse :* 20 secondes | *Durée de vie adulte :* 35 minutes
  * *Multiplicateur :* $\times 1.0$ | *Entretien Cryo :* $0.5\ Bio/s$ | *Coût Scissiparité :* $12\ Bio$
  * *Effet :* Souche starter robuste et simple à stabiliser.

* **[Peu Commun] *Lactobacillus fermenti***
  * *Temps de pousse :* 50 secondes | *Durée de vie adulte :* 28 minutes
  * *Multiplicateur :* $\times 3.2$ | *Entretien Cryo :* $3.0\ Bio/s$ | *Coût Scissiparité :* $80\ Bio$
  * *Effet :* Acidification : stimule la production des Bacilles adjacents de $+10\ \%$.

* **[Rare] *Clostridium butyricum***
  * *Temps de pousse :* 2 minutes 30 | *Durée de vie adulte :* 22 minutes
  * *Multiplicateur :* $\times 8.5$ | *Entretien Cryo :* $15.0\ Bio/s$ | *Coût Scissiparité :* $600\ Bio$
  * *Effet :* Anaérobie stricte : maintient 100 % de sa production pendant les temps de pause.

* **[Épique] *Pseudomonas fluorescens***
  * *Temps de pousse :* 6 minutes | *Durée de vie adulte :* 17 minutes
  * *Multiplicateur :* $\times 28.0$ | *Entretien Cryo :* $80.0\ Bio/s$ | *Coût Scissiparité :* $4\,500\ Bio$
  * *Effet :* Halo vert fluorescent : octroie $+20\ \%$ de Bio/s aux 2 incubateurs voisins.

* **[Légendaire] *Geobacter electronica***
  * *Temps de pousse :* 12 minutes | *Durée de vie adulte :* 12 minutes
  * *Multiplicateur :* $\times 110.0$ | *Entretien Cryo :* $450.0\ Bio/s$ | *Coût Scissiparité :* $35\,000\ Bio$
  * *Effet :* Pili conducteurs : convertit passivement $5\ \%$ de ses gains en Points de Recherche.

---

### Branche II : Cocques & Biofilms (Spécialisation : Synergies & Robustesse)

* **[Commun] *Micrococcus luteus***
  * *Temps de pousse :* 25 secondes | *Durée de vie adulte :* 34 minutes
  * *Multiplicateur :* $\times 1.2$ | *Entretien Cryo :* $0.6\ Bio/s$ | *Coût Scissiparité :* $15\ Bio$
  * *Effet :* Immunité aux dépôts : n'est pas ralentie par la présence d'un déchet adjacent.

* **[Peu Commun] *Streptococcus lactis***
  * *Temps de pousse :* 55 secondes | *Durée de vie adulte :* 27 minutes
  * *Multiplicateur :* $\times 3.5$ | *Entretien Cryo :* $3.5\ Bio/s$ | *Coût Scissiparité :* $95\ Bio$
  * *Effet :* Chaînette d'adhésion : $+15\ \%$ de production par autre Cocque présent sur le plateau.

* **[Rare] *Staphylococcus aureus***
  * *Temps de pousse :* 2 minutes 45 | *Durée de vie adulte :* 21 minutes
  * *Multiplicateur :* $\times 9.0$ | *Entretien Cryo :* $18.0\ Bio/s$ | *Coût Scissiparité :* $750\ Bio$
  * *Effet :* Facteur de coagulase : augmente la valeur de vente des contrats médicaux de $+12\ \%$.

* **[Épique] *Deinococcus radiodurans***
  * *Temps de pousse :* 6 minutes 30 | *Durée de vie adulte :* 18 minutes
  * *Multiplicateur :* $\times 30.0$ | *Entretien Cryo :* $90.0\ Bio/s$ | *Coût Scissiparité :* $5\,000\ Bio$
  * *Effet :* Recombinaison ADN ultra-rapide : annule le risque d'échec mortel en mutagenèse UV.

* **[Légendaire] *Sarcina prismatica***
  * *Temps de pousse :* 14 minutes | *Durée de vie adulte :* 11 minutes
  * *Multiplicateur :* $\times 125.0$ | *Entretien Cryo :* $500.0\ Bio/s$ | *Coût Scissiparité :* $42\,000\ Bio$
  * *Effet :* Géométrie en paquets : réduit le coût fixe énergétique global de l'usine de $15\ \%$.

---

### Branche III : Spirilles & Extrêmophiles (Spécialisation : Vitesse & Taux RNG)

* **[Commun] *Spirillum minus***
  * *Temps de pousse :* 18 secondes | *Durée de vie adulte :* 32 minutes
  * *Multiplicateur :* $\times 1.4$ | *Entretien Cryo :* $0.8\ Bio/s$ | *Coût Scissiparité :* $18\ Bio$
  * *Effet :* Flagelle ondulant : accélère la division cellulaire générale du labo de $+5\ \%$.

* **[Peu Commun] *Rhodospirillum rubrum***
  * *Temps de pousse :* 45 secondes | *Durée de vie adulte :* 26 minutes
  * *Multiplicateur :* $\times 3.8$ | *Entretien Cryo :* $4.0\ Bio/s$ | *Coût Scissiparité :* $110\ Bio$
  * *Effet :* Pigment caroténoïde : double le gain immédiat lors des injections manuelles de nutriments.

* **[Rare] *Halobacterium salinarum***
  * *Temps de pousse :* 2 minutes 15 | *Durée de vie adulte :* 20 minutes
  * *Multiplicateur :* $\times 10.0$ | *Entretien Cryo :* $22.0\ Bio/s$ | *Coût Scissiparité :* $900\ Bio$
  * *Effet :* Équilibre osmotique : rehausse de $+7\ \%$ la probabilité de tirage Rare sur tous les bouillons.

* **[Épique] *Thermus aquaticus***
  * *Temps de pousse :* 5 minutes 30 | *Durée de vie adulte :* 16 minutes
  * *Multiplicateur :* $\times 32.0$ | *Entretien Cryo :* $110.0\ Bio/s$ | *Coût Scissiparité :* $6\,200\ Bio$
  * *Effet :* Enzyme polymérase thermique : accélère le processus de conjugaison génétique de $50\ \%$.

* **[Légendaire] *Pyrodictium abyssi***
  * *Temps de pousse :* 13 minutes | *Durée de vie adulte :* 10 minutes
  * *Multiplicateur :* $\times 130.0$ | *Entretien Cryo :* $550.0\ Bio/s$ | *Coût Scissiparité :* $50\,000\ Bio$
  * *Effet :* Réseau de tubules creux : accorde $+25\ \%$ de chance de saut de rang direct lors d'une hybridation.

---

### Branche IV : Mycobactéries & Actinomycètes (Spécialisation : Économie & Recyclage)

* **[Commun] *Corynebacterium simplex***
  * *Temps de pousse :* 22 secondes | *Durée de vie adulte :* 36 minutes
  * *Multiplicateur :* $\times 1.1$ | *Entretien Cryo :* $0.5\ Bio/s$ | *Coût Scissiparité :* $10\ Bio$
  * *Effet :* Métabolisme économe : divise ses propres frais de maintien cryogénique par 2.

* **[Peu Commun] *Streptomyces albus***
  * *Temps de pousse :* 50 secondes | *Durée de vie adulte :* 28 minutes
  * *Multiplicateur :* $\times 3.4$ | *Entretien Cryo :* $3.2\ Bio/s$ | *Coût Scissiparité :* $90\ Bio$
  * *Effet :* Barrière antibiotique : protège les incubateurs voisins de toute contamination par déchet.

* **[Rare] *Actinomyces bovis***
  * *Temps de pousse :* 2 minutes 30 | *Durée de vie adulte :* 21 minutes
  * *Multiplicateur :* $\times 9.5$ | *Entretien Cryo :* $20.0\ Bio/s$ | *Coût Scissiparité :* $850\ Bio$
  * *Effet :* Hyphes mycéliens : aligne son multiplicateur sur la boîte adjacente la plus rentable.

* **[Épique] *Nocardia asteroides***
  * *Temps de pousse :* 6 minutes | *Durée de vie adulte :* 15 minutes
  * *Multiplicateur :* $\times 35.0$ | *Entretien Cryo :* $120.0\ Bio/s$ | *Coût Scissiparité :* $7\,000\ Bio$
  * *Effet :* Digestion organique : détruire un bio-déchet adjacent rapporte un bonus de $+200\ Bio$.

* **[Légendaire] *Streptomyces coelicolor***
  * *Temps de pousse :* 11 minutes | *Durée de vie adulte :* 9 minutes 30
  * *Multiplicateur :* $\times 140.0$ | *Entretien Cryo :* $600.0\ Bio/s$ | *Coût Scissiparité :* $60\,000\ Bio$
  * *Effet :* Teinture actinorhodine : débloque sans frais un emplacement de cryo-tube supplémentaire.

---

### Branche V : Anomalies Mythiques (Obtention : 1 / 10 000 ou hybridations avancées)

* **[Mythique] *Chronobacterium temporalis***
  * *Temps de pousse :* 28 minutes | *Durée de vie adulte :* 7 minutes
  * *Multiplicateur :* $\times 550.0$ | *Entretien Cryo :* $2\,200.0\ Bio/s$ | *Coût Scissiparité :* $250\,000\ Bio$ $+ 100\ PR$
  * *Effet :* Dilatation temporelle : accélère la vitesse d'incubation du labo de $+30\ \%$ en temps réel.

* **[Mythique] *Quantum Coccus***
  * *Temps de pousse :* 26 minutes | *Durée de vie adulte :* 6 minutes 30
  * *Multiplicateur :* $\times 620.0$ | *Entretien Cryo :* $2\,500.0\ Bio/s$ | *Coût Scissiparité :* $300\,000\ Bio$ $+ 120\ PR$
  * *Effet :* Superposition d'états : compte double dans le calcul des synergies de biofilm.

* **[Mythique] *Necro-Spore Oblivion***
  * *Temps de pousse :* 25 minutes | *Durée de vie adulte :* 6 minutes
  * *Multiplicateur :* $\times 750.0$ | *Entretien Cryo :* $3\,000.0\ Bio/s$ | *Coût Scissiparité :* $400\,000\ Bio$ $+ 150\ PR$
  * *Effet :* Absorption nécrotique : incinère automatiquement les déchets du labo et gagne $+2\ \%$ de rendement par déchet absorbé.

* **[Mythique] *Astro-Bacillus Radiata***
  * *Temps de pousse :* 30 minutes | *Durée de vie adulte :* 5 minutes 30
  * *Multiplicateur :* $\times 900.0$ | *Entretien Cryo :* $3\,800.0\ Bio/s$ | *Coût Scissiparité :* $550\,000\ Bio$ $+ 200\ PR$
  * *Effet :* Rayonnement cosmique : accorde $15\ \%$ de chance de doubler le résultat de tout ensemencement.

---

### Branche Spéciale : Secrets Cosmiques (Taux : 1 sur 200 000 standard / 1 sur 12 500 en Radio-Isotopique)

* **[SECRET #1] *Deinococcus Genesis* ("L'Organisme Zéro")**
  * *Temps de pousse :* 50 minutes | *Durée de vie adulte :* 5 minutes
  * *Multiplicateur :* $\times 5\,000.0$ | *Entretien Cryo :* $5\,000.0\ Bio/s$ | *Coût Scissiparité :* $2\,500\,000\ Bio$ $+ 1\,000\ PR$
  * *Effet :* Onde matricielle : décuple ($\times 10$) la production brute de l'ensemble de la paillasse.

* **[SECRET #2] *Plasmidus Infinitum* ("Le Vecteur Éternel")**
  * *Temps de pousse :* 55 minutes | *Durée de vie adulte :* 5 minutes
  * *Multiplicateur :* $\times 7\,500.0$ | *Entretien Cryo :* $5\,000.0\ Bio/s$ | *Coût Scissiparité :* $3\,000\,000\ Bio$ $+ 1\,500\ PR$
  * *Effet :* Transmission parfaite : garantit 100 % de réussite sur toute hybridation sans détruire les souches parentes.

* **[SECRET #3] *Void Spirillum* ("L'Entropie Négative")**
  * *Temps de pousse :* 60 minutes | *Durée de vie adulte :* 4 minutes 30
  * *Multiplicateur :* $\times 12\,000.0$ | *Entretien Cryo :* $5\,000.0\ Bio/s$ | *Coût Scissiparité :* $5\,000\,000\ Bio$ $+ 2\,500\ PR$
  * *Effet :* Déphasage métabolique : annule intégralement les charges fixes de tout le complexe industriel.