📂 Architecture du Projet
Ce projet a été refactorisé pour passer d'un fichier monolithique à une architecture modulaire PWA (Progressive Web App). Cette structure améliore la lisibilité, la sécurité et la performance (notamment la gestion des images et le mode hors-ligne).

Voici l'arborescence des fichiers à la racine du projet :

Plaintext
	/
	├── index.html       # Structure (Squelette + Config)
	├── style.css        # Apparence (Design & Animations)
	├── app.js           # Logique (Cerveau de l'application)
	├── sw.js            # Offline (Service Worker)
	├── manifest.json    # Installation (Config PWA)
	└── logo appli.png   # Ressources
	
📝 Détail des Fichiers
1. index.html (La Structure)
	C'est le point d'entrée de l'application. Il est désormais très léger.
	Contient : Le squelette HTML (Header, Main, Modals), les liens CDN (Tailwind, Chart.js), et la configuration Firebase (dans le <head>).
	Rôle : Charger les ressources et définir la mise en page globale.

2. app.js (La Logique)
	C'est le cœur du réacteur. Tout le code JavaScript fonctionnel se trouve ici.
Contient :
	La gestion de la base de données locale (IndexedDB).
	La logique de synchronisation Cloud (Firebase Firestore + flag _dirty).
	Les fonctions d'affichage (Listes, Graphiques, Calculs).
	La gestion des images optimisée (Conversion en Blob binaire).
	La sécurité (Fonction escapeHTML anti-XSS).

3. style.css (Le Design)
	Gère l'apparence spécifique qui n'est pas couverte par les classes utilitaires Tailwind.
	Contient : Les animations (fade-in, spinners), les styles des cartes interactives, les ajustements de mise en page et les styles des composants personnalisés (comme le widget de mise à jour).

4. sw.js (Service Worker)
	Le script qui tourne en arrière-plan pour permettre le fonctionnement sans internet.
	Rôle : Intercepte les requêtes réseau. Si l'utilisateur est hors-ligne, il sert les fichiers depuis le cache (Cache First strategy).

5. manifest.json
	Le fichier de configuration pour les stores et l'installation sur mobile.
	Contient : Le nom de l'appli, les couleurs de thème, et les icônes à utiliser sur l'écran d'accueil du téléphone.

🛠️ Guide de Modification Rapide : Où aller si je veux changer...

Le texte d'une fiche technique (ex: Sativa/Indica) :
	👉 Fichier : app.js
	📍 Chercher l'objet : const masterData = { ... }

Ajouter une nouvelle fonctionnalité ou changer un calcul :
	👉 Fichier : app.js

Modifier une couleur, une animation ou l'espacement d'un élément spécifique :
	👉 Fichier : style.css (ou les classes Tailwind dans index.html).

Changer l'icône ou le nom de l'application sur l'écran d'accueil :
	👉 Fichier : manifest.json (et remplacer l'image logo appli.png).

Mettre à jour la configuration de la base de données (Clés API) :
	👉 Fichier : index.html (dans le script <script type="module"> en haut).
