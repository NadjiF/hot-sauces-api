const jwt = require("jsonwebtoken");
require("dotenv").config();

module.exports = (req, res, next) => {
  try {
    // ✅ Garde contre un header absent
    if (!req.headers.authorization) {
      return res.status(401).json({ error: "Token manquant" });
    }

    const token = req.headers.authorization.split(" ")[1];

    // ✅ Fix principal : vrai secret depuis .env (plus de 'RANDOM_TOKEN_SECRET' hardcodé)
    const decodedToken = jwt.verify(token, process.env.SECRET_TOKEN);

    const userId = decodedToken.userId;
    req.auth = { userId };

    if (req.body.userId && req.body.userId !== userId) {
      return res.status(403).json({ error: "User ID non valide" });
    }

    next();
  } catch (error) {
    // ✅ Fix sérialisation : message en string, pas Error object
    res.status(401).json({ error: "Requête non authentifiée" });
  }
};
