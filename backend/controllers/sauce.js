// controllers/sauce.js
// --------------------------------------------------------------
// Controller pour la gestion des sauces (CRUD + likes/dislikes)

const Sauce = require("../models/sauce");
const fs = require("fs");
const { promisify } = require("util");

// On "promisifie" fs.unlink pour pouvoir l'utiliser avec async/await
// (au lieu du callback old-school)
const unlinkAsync = promisify(fs.unlink);

// --------------------------------------------------------------
// GET /api/sauces
// Récupère toutes les sauces
// --------------------------------------------------------------
exports.getAllSauces = async (req, res, next) => {
  try {
    const sauces = await Sauce.find();
    res.status(200).json(sauces);
  } catch (error) {
    // ✅ 500 est plus logique ici qu'un 404 : si Mongo plante,
    // c'est une erreur serveur, pas "pas trouvé"
    res.status(500).json({ error: error.message });
  }
};

// --------------------------------------------------------------
// GET /api/sauces/:id
// Récupère une sauce par son id
// --------------------------------------------------------------
exports.getOneSauce = async (req, res, next) => {
  try {
    const sauce = await Sauce.findOne({ _id: req.params.id });

    // ✅ Nouveau : on gère explicitement le cas où la sauce n'existe pas
    // Avant : si findOne renvoyait null, on envoyait null au client sans erreur
    if (!sauce) {
      return res.status(404).json({ message: "Sauce non trouvée" });
    }

    res.status(200).json(sauce);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

// --------------------------------------------------------------
// POST /api/sauces
// Crée une nouvelle sauce (avec upload image via multer)
// --------------------------------------------------------------
exports.createSauce = async (req, res, next) => {
  try {
    // Parse les données JSON envoyées en multipart
    const sauceObject = JSON.parse(req.body.sauce);

    // On supprime l'_id envoyé par le client (Mongo génère le sien)
    delete sauceObject._id;

    const sauce = new Sauce({
      ...sauceObject,
      imageUrl: `${req.protocol}://${req.get("host")}/images/${req.file.filename}`,
      // ✅ Fix : tableaux vides au lieu de [' '] (chaîne avec espace)
      // Avant : usersLiked: [' '] polluait les données initiales
      likes: 0,
      dislikes: 0,
      usersLiked: [],
      usersDisliked: [], // ✅ Fix : cohérence de casse (était "usersdisLiked")
    });

    await sauce.save();
    res.status(201).json({ message: "Sauce enregistrée !" });
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
};

// --------------------------------------------------------------
// PUT /api/sauces/:id
// Modifie une sauce (avec ou sans nouvelle image)
// --------------------------------------------------------------
exports.updateSauce = async (req, res, next) => {
  try {
    // Si req.file existe → nouvelle image uploadée
    // Sinon → juste des données JSON classiques
    const sauceObject = req.file
      ? {
          ...JSON.parse(req.body.sauce),
          imageUrl: `${req.protocol}://${req.get("host")}/images/${req.file.filename}`,
        }
      : { ...req.body };

    // ✅ Fix majeur : updateOne() renvoie une Promise
    // Avant : .then(res.status(200)...) exécutait la réponse immédiatement
    // Maintenant avec await, on attend bien que l'update soit terminé
    await Sauce.updateOne(
      { _id: req.params.id },
      { ...sauceObject, _id: req.params.id },
    );

    res.status(200).json({ message: "Sauce modifiée !" });
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
};

// --------------------------------------------------------------
// DELETE /api/sauces/:id
// Supprime une sauce + son image associée
// --------------------------------------------------------------
exports.deleteSauce = async (req, res, next) => {
  try {
    const sauce = await Sauce.findOne({ _id: req.params.id });

    // ✅ Nouveau : gestion du cas "sauce inexistante"
    if (!sauce) {
      return res.status(404).json({ message: "Sauce non trouvée" });
    }

    // Extraction du nom de fichier depuis l'URL complète
    const filename = sauce.imageUrl.split("/images/")[1];

    // ✅ Suppression du fichier avec async/await (grâce à promisify)
    // Avant : fs.unlink avec callback imbriqué → "pyramid of doom"
    await unlinkAsync(`images/${filename}`);

    // ✅ Fix majeur (même bug que updateSauce) :
    // Avant : .then(res.status(200)...) → réponse envoyée sans attendre
    // Maintenant : on attend bien la suppression avant de répondre
    await Sauce.deleteOne({ _id: req.params.id });

    res.status(200).json({ message: "Sauce supprimée !" });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

// --------------------------------------------------------------
// POST /api/sauces/:id/like
// Gère les likes/dislikes
// like = 1  → l'utilisateur like
// like = 0  → l'utilisateur annule son like/dislike
// like = -1 → l'utilisateur dislike
// --------------------------------------------------------------
exports.likeDislikeSauce = async (req, res, next) => {
  try {
    const { like, userId } = req.body;
    const sauceId = req.params.id;

    // ✅ Nouveau : validation de l'input dès le début
    // Avant : si "like" était une string "1" au lieu du number 1, le switch ne matchait pas
    if (![1, 0, -1].includes(like)) {
      return res
        .status(400)
        .json({ message: "Valeur de like invalide (doit être -1, 0 ou 1)" });
    }

    // Récupération de la sauce pour vérifier son état actuel
    const sauce = await Sauce.findOne({ _id: sauceId });

    if (!sauce) {
      return res.status(404).json({ message: "Sauce non trouvée" });
    }

    // --------------------------------------------------------
    // CAS 1 : L'utilisateur LIKE la sauce
    // --------------------------------------------------------
    if (like === 1) {
      // ✅ Protection : empêche de liker 2 fois la même sauce
      if (sauce.usersLiked.includes(userId)) {
        return res
          .status(400)
          .json({ message: "Vous avez déjà liké cette sauce" });
      }

      await Sauce.updateOne(
        { _id: sauceId },
        {
          $push: { usersLiked: userId },
          $inc: { likes: 1 },
        },
      );

      return res.status(200).json({ message: "Like ajouté !" });
    }

    // --------------------------------------------------------
    // CAS 2 : L'utilisateur DISLIKE la sauce
    // --------------------------------------------------------
    if (like === -1) {
      if (sauce.usersDisliked.includes(userId)) {
        return res
          .status(400)
          .json({ message: "Vous avez déjà disliké cette sauce" });
      }

      await Sauce.updateOne(
        { _id: sauceId },
        {
          $push: { usersDisliked: userId },
          $inc: { dislikes: 1 },
        },
      );

      return res.status(200).json({ message: "Dislike ajouté !" });
    }

    // --------------------------------------------------------
    // CAS 3 : L'utilisateur annule son like/dislike (like === 0)
    // ✅ Fix majeur : avant, si l'utilisateur n'avait ni liké ni disliké,
    // AUCUNE réponse n'était envoyée → l'API restait pendante côté client
    // --------------------------------------------------------
    if (sauce.usersLiked.includes(userId)) {
      await Sauce.updateOne(
        { _id: sauceId },
        {
          $pull: { usersLiked: userId },
          $inc: { likes: -1 },
        },
      );
      return res.status(200).json({ message: "Like retiré" });
    }

    if (sauce.usersDisliked.includes(userId)) {
      await Sauce.updateOne(
        { _id: sauceId },
        {
          $pull: { usersDisliked: userId },
          $inc: { dislikes: -1 },
        },
      );
      return res.status(200).json({ message: "Dislike retiré" });
    }

    // ✅ Nouveau : réponse par défaut si rien à annuler
    // L'utilisateur a envoyé "like = 0" mais n'avait ni liké ni disliké
    return res.status(200).json({ message: "Aucune action à annuler" });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};
