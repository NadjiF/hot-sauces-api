# 🌶️ Piiquante API

API REST sécurisée pour une application de notation de sauces piquantes.
Permet aux utilisateurs de créer, modifier, supprimer des sauces, et de les liker/disliker.

## 🚀 Fonctionnalités

- 🔐 **Authentification** sécurisée (JWT + bcrypt)
- 📝 **CRUD complet** sur les sauces
- 📸 **Upload d'images** avec Multer
- 👍 **Système de likes/dislikes** avec gestion d'état
- 🛡️ Validation des entrées et gestion d'erreurs

## 🛠 Stack technique

- **Node.js** / **Express.js**
- **MongoDB** / **Mongoose**
- **JWT** (jsonwebtoken) pour l'authentification
- **bcrypt** pour le hashing des mots de passe
- **Multer** pour l'upload de fichiers
- **Helmet** / **Express-rate-limit** pour la sécurité

## 📂 Structure du projet

\`\`\`
.
├── controllers/
│   ├── sauce.js
│   └── user.js
├── middleware/
│   ├── auth.js
│   └── multer-config.js
├── models/
│   ├── Sauce.js
│   └── User.js
├── routes/
│   ├── sauce.js
│   └── user.js
├── images/
├── app.js
└── server.js
\`\`\`

## 🔧 Installation

\`\`\`bash
# Cloner le repo
git clone https://github.com/NadjiF/piiquante-api.git

# Installer les dépendances
cd piiquante-api
npm install

# Créer un fichier .env avec :
# DB_URI=mongodb+srv://...
# JWT_SECRET=your_secret_key

# Lancer le serveur
npm start
\`\`\`

Le serveur tourne par défaut sur **http://localhost:3000**.

## 📡 Endpoints principaux

### Auth
- \`POST /api/auth/signup\` — Création d'un compte
- \`POST /api/auth/login\` — Connexion

### Sauces
- \`GET /api/sauces\` — Liste toutes les sauces
- \`GET /api/sauces/:id\` — Récupère une sauce
- \`POST /api/sauces\` — Crée une sauce (auth requise)
- \`PUT /api/sauces/:id\` — Modifie une sauce (auth requise)
- \`DELETE /api/sauces/:id\` — Supprime une sauce (auth requise)
- \`POST /api/sauces/:id/like\` — Like/Dislike une sauce

## 👤 Auteur

**Nadji Fali** — Développeur front-end
- Portfolio : [nadji-portfolio.vercel.app](https://nadji-portfolio.vercel.app)
- LinkedIn : [linkedin.com/in/nadji-fali](https://linkedin.com/in/nadji-fali)

## 📝 Notes

Ce projet est en cours de refactoring vers des patterns modernes
(async/await, validation renforcée, gestion d'erreurs améliorée).
