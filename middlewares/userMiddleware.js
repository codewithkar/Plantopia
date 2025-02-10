import User from '../models/users.js'; // Adjust path as needed

const checkSession = async (req, res, next) => {
  try {
      // Check if session exists
      if (!req.session.user) {
          return res.redirect('/login?message=Please+login+to+continue&alertType=info');
      }

      // Verify user exists and is active
      const user = await User.findById(req.session.user);
      
      if (!user) {
          // User no longer exists
          req.session.user = null;
          return res.redirect('/login?message=Account+not+found&alertType=error');
      }

      if (user.blocked) {
          // User is blocked
          req.session.user = null;
          return res.redirect('/login?message=Your+account+has+been+blocked&alertType=error');
      }

      next();

  } catch (error) {
      console.error('Session Check Error:', error);
      return res.redirect('/login?message=Session+error+occurred&alertType=error');
  }
}

const checkCartSession = async (req, res, next) => {
    try {
        if (!req.session.user) {
            return res.status(401).json({ 
                error: true, 
                message: 'Authentication required',
                redirectUrl: '/login'
            });
        }
        // Add block check for cart actions
        // await checkBlockedStatus(req, res, next);
    } catch (error) {
        res.status(500).json({ 
            error: true, 
            message: 'Server error during authentication check' 
        });
    }
};

const isLogin = async (req, res, next) => {
  try {
      if (req.session.user) {
          return res.redirect('/home');
      }
      next();
  } catch (error) {
      console.error('Login Check Error:', error);
      next();
  }
}

export default { isLogin, checkSession, checkCartSession };






// const checkSession = (req, res, next) => {
//     if (req.session.user) {
//         next()
//     } else {
//         res.redirect('/login')
//     }
// }

// const checkCartSession = (req, res, next) => {
//     try {
//         if (!req.session.user) {
//           return res.status(401).json({ 
//             error: true, 
//             message: 'Authentication required',
//             redirectUrl: '/login'
//           });
//         }
//         next();
//       } catch (error) {
//         res.status(500).json({ 
//           error: true, 
//           message: 'Server error during authentication check' 
//         });
//       }

      
// }

// const isLogin  = (req, res, next)=>{
 
//     if(req.session.user){
//         res.redirect('/home')
//     }else{
//         next()
//     }
// }


// export default { isLogin, checkSession, checkCartSession}