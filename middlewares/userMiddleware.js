const checkSession = (req, res, next) => {
    if (req.session.user) {
        next()
    } else {
        res.redirect('/login')
    }
}

const checkCartSession = (req, res, next) => {
    try {
        if (!req.session.user) {
          return res.status(401).json({ 
            error: true, 
            message: 'Authentication required',
            redirectUrl: '/login'
          });
        }
        next();
      } catch (error) {
        res.status(500).json({ 
          error: true, 
          message: 'Server error during authentication check' 
        });
      }

      
}

const isLogin  = (req, res, next)=>{
 
    if(req.session.user){
        res.redirect('/home')
    }else{
        next()
    }
}

// export const restrictManualAccess = (req, res, next) => {
//     next();
// };



export default { isLogin, checkSession, checkCartSession}