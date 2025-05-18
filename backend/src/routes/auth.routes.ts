import { Router } from "express";
import { registerUser, loginUser } from "../controllers/auth.controller";
import passport from "../services/passport";
import { generateToken } from "../utils/jwt";

const router = Router();
const FRONTEND_URLS = (process.env.FRONTEND_URL || "https://web-dash-spark.vercel.app").split(",");

router.post("/register", registerUser);
router.post("/login", loginUser);

// Start Google OAuth login
router.get("/google", (req, res, next) => {
  const state = req.query.state?.toString() || "";

  console.log("this is the state from the authRoute", state)

  passport.authenticate("google", {
    scope: ["profile", "email"],
    state, // ✅ pass the state manually
    session: false,
  })(req, res, next);
});
;

// Google OAuth callback
router.get(
  "/google/callback",
  passport.authenticate("google", { session: false }),
  async (req, res) => {
    const user = req.user as any;
    const token = generateToken(user.id);

    // Choose a valid frontend URL
    const redirectBase = req.headers.origin && FRONTEND_URLS.includes(req.headers.origin)
      ? req.headers.origin
      : FRONTEND_URLS[0]; // default

    // Encode user data safely
    const userData = encodeURIComponent(JSON.stringify({
      id: user.id,
      email: user.email,
      name: user.name,
      role: user.role,
    }));

    res.redirect(`${redirectBase}/auth/callback?token=${token}&user=${userData}`);
  }
);

export default router;
