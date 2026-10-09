// controllers/user.js
// --------------------------------------------------------------
// Controller pour l'authentification (signup + login)
// Refactor 2026 : async/await, secrets dans .env, sécurité renforcée
// --------------------------------------------------------------

// bcrypt : hash du mot de passe (fonction irréversible, lente par design)
const bcrypt = require("bcrypt");

// crypto-js : chiffrement HMAC-SHA512 de l'email
// (choix historique OpenClassrooms, inhabituel mais on garde)
const cryptojs = require("crypto-js");

// jsonwebtoken : génération de tokens JWT pour l'authentification
const jwt = require("jsonwebtoken");

const User = require("../models/user");

// --------------------------------------------------------------
// POST /api/auth/signup
// Crée un nouveau compte utilisateur
// --------------------------------------------------------------
exports.signup = async (req, res, next) => {
  try {
    const { email, password } = req.body;

    // ✅ Validation : vérifier que email et password sont présents
    // Avant : si l'un manquait, bcrypt crashait sur undefined
    if (!email || !password) {
      return res.status(400).json({ message: "Email et mot de passe requis" });
    }

    // ✅ Fix sécurité : clé secrète via variable d'environnement
    // Avant : "CLE_SECRETE" en dur dans le code sur GitHub public
    const emailCryptoJs = cryptojs
      .HmacSHA512(email, process.env.EMAIL_SECRET)
      .toString();

    // Hash du mot de passe avec bcrypt (10 rounds = compromis sécurité/perf)
    const hash = await bcrypt.hash(password, 10);

    const user = new User({
      email: emailCryptoJs,
      password: hash,
    });

    await user.save();
    res.status(201).json({ message: "Utilisateur créé !" });
  } catch (error) {
    // ✅ Gestion fine des erreurs
    // Si c'est une erreur de validation Mongoose ou de duplicate email → 400
    // Sinon → 500 (erreur serveur)
    if (error.name === "ValidationError" || error.code === 11000) {
      return res
        .status(400)
        .json({ message: "Email déjà utilisé ou invalide" });
    }
    res.status(500).json({ error: error.message });
  }
};

// --------------------------------------------------------------
// POST /api/auth/login
// Connecte un utilisateur existant et renvoie un token JWT
// --------------------------------------------------------------
exports.login = async (req, res, next) => {
  try {
    const { email, password } = req.body;

    // ✅ Validation des inputs
    if (!email || !password) {
      return res.status(400).json({ message: "Email et mot de passe requis" });
    }

    // Chiffrement de l'email pour rechercher dans la DB
    // (même algo que signup pour que ça match)
    const emailCryptoJs = cryptojs
      .HmacSHA512(email, process.env.EMAIL_SECRET)
      .toString();

    const user = await User.findOne({ email: emailCryptoJs });

    // ✅ Fix sécurité : message d'erreur générique
    // Avant : "Utilisateur non trouvé" permettait d'énumérer les emails existants
    // Maintenant : même message pour "email inexistant" OU "mot de passe incorrect"
    // → un attaquant ne peut pas distinguer les 2 cas
    if (!user) {
      return res.status(401).json({ message: "Identifiants incorrects" });
    }

    const valid = await bcrypt.compare(password, user.password);

    if (!valid) {
      return res.status(401).json({ message: "Identifiants incorrects" });
    }

    // ✅ Fix sécurité : secret JWT via variable d'environnement
    // Avant : 'RANDOM_TOKEN_SECRET' en dur → n'importe qui peut forger des tokens
    const token = jwt.sign({ userId: user._id }, process.env.SECRET_TOKEN, {
      expiresIn: "24h",
    });

    res.status(200).json({
      userId: user._id,
      token: token,
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};
