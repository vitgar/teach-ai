const passport = require('passport');
const OAuth2Strategy = require('passport-oauth2');
const Teacher = require('../models/Teacher');
const axios = require('axios');

passport.serializeUser((user, done) => {
  console.log('Serializing user:', user.id);
  done(null, user.id);
});

passport.deserializeUser(async (id, done) => {
  try {
    console.log('Deserializing user:', id);
    const user = await Teacher.findById(id);
    if (!user) {
      console.log('No user found with id:', id);
      return done(null, false);
    }
    done(null, user);
  } catch (error) {
    console.error('Deserialization error:', error);
    done(error, null);
  }
});

passport.use('linkedin', new OAuth2Strategy({
    authorizationURL: 'https://www.linkedin.com/oauth/v2/authorization',
    tokenURL: 'https://www.linkedin.com/oauth/v2/accessToken',
    clientID: process.env.LINKEDIN_CLIENT_ID,
    clientSecret: process.env.LINKEDIN_CLIENT_SECRET,
    callbackURL: "http://localhost:5000/auth/linkedin/callback",
    scope: ['openid', 'profile', 'email'],
    state: true,
    passReqToCallback: true
  },
  async function(req, accessToken, refreshToken, params, profile, done) {
    try {
      console.log('Starting LinkedIn OAuth callback processing');
      console.log('Tokens received:', {
        accessToken: accessToken ? 'present' : 'missing',
        refreshToken: refreshToken ? 'present' : 'missing',
        params
      });

      // Fetch user profile from LinkedIn API
      const userResponse = await axios.get('https://api.linkedin.com/v2/userinfo', {
        headers: {
          'Authorization': `Bearer ${accessToken}`
        }
      });

      console.log('LinkedIn Profile Response:', userResponse.data);

      const userData = userResponse.data;
      const email = userData.email;
      const firstName = userData.given_name;
      const lastName = userData.family_name;

      if (!email) {
        console.error('No email found in profile data');
        return done(new Error('No email found in LinkedIn profile'));
      }

      console.log('Looking for existing teacher with email:', email);
      let teacher = await Teacher.findOne({ email: email });
      
      if (!teacher) {
        console.log('Creating new teacher account');
        teacher = new Teacher({
          email: email,
          firstName: firstName || '',
          lastName: lastName || '',
          linkedinId: userData.sub,
        });
        await teacher.save();
        console.log('New teacher created:', teacher._id);
      } else {
        console.log('Existing teacher found:', teacher._id);
      }
      
      return done(null, teacher);
    } catch (error) {
      console.error('LinkedIn auth processing error:', error);
      return done(error, null);
    }
  }
)); 