import passport from "passport";
// Import removed to avoid OAuth error

// Creating a simplified passport setup without Google OAuth
console.log("Using simplified passport configuration without Google OAuth");

// Required for session support
passport.serializeUser((user: any, done) => {
  done(null, user.id);
});

passport.deserializeUser(async (id: string, done) => {
  try {
    // In a real app, you would fetch the user from the database
    // For now, we'll just pass the ID as the user object
    done(null, { id });
  } catch (error) {
    done(error, null);
  }
});

export default passport;
