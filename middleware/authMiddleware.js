const jwt = require("jsonwebtoken");

const verifyToken = (req, res, next) => {
  try {
    //Get token from cookie
    const token = req.cookies.token;
    if (!token) {
      return res.status(401).json({ message: "Access denied. No token provided." });
    }
    //Verify token
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    //Attach decoded user to request
    req.user = decoded;
    //Continue to next middleware
    next();
  } catch (err) {
    console.error("JWT verification failed:", err.message);
    return res.status(403).json({ message: "Invalid or expired token" });
  }
};
module.exports = verifyToken;
