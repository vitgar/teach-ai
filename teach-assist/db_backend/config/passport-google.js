const GoogleStrategy = require('passport-google-oauth20').Strategy;
const passport = require('passport');
const Teacher = require('../models/Teacher');

passport.use(new GoogleStrategy({
    clientID: process.env.GOOGLE_CLIENT_ID,
    clientSecret: process.env.GOOGLE_CLIENT_SECRET,
    callbackURL: "http://localhost:5000/auth/google/callback",
    passReqToCallback: true
  },
  async function(request, accessToken, refreshToken, profile, done) {
    try {
      // Check if teacher exists by email or googleId
      let teacher = await Teacher.findOne({
        $or: [
          { email: profile.emails[0].value },
          { googleId: profile.id }
        ]
      });
      
      if (!teacher) {
        // Create new teacher if doesn't exist
        teacher = new Teacher({
          email: profile.emails[0].value,
          firstName: profile.name.givenName,
          lastName: profile.name.familyName,
          googleId: profile.id,
          profilePicture: profile.photos[0].value
        });
        await teacher.save();
      } else {
        // Update existing teacher with Google info if needed
        if (!teacher.googleId) {
          teacher.googleId = profile.id;
        }
        if (!teacher.firstName && profile.name.givenName) {
          teacher.firstName = profile.name.givenName;
        }
        if (!teacher.lastName && profile.name.familyName) {
          teacher.lastName = profile.name.familyName;
        }
        if (!teacher.profilePicture && profile.photos[0].value) {
          teacher.profilePicture = profile.photos[0].value;
        }
        await teacher.save();
      }
      
      return done(null, teacher);
    } catch (error) {
      console.error('Google auth error:', error);
      return done(error, null);
    }
  }
)); 