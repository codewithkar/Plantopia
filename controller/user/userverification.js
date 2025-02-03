import userSchema from '../../models/users.js'
import bcrypt from 'bcrypt'
import passport from 'passport';
import sendOTP  from '../../utils/sendOTP.js'
import { get } from 'mongoose';


const saltRounds = 10;
 

const getLogin = (req, res) => {
    res.render('user/login',{error:null});
}

const postLogin = async (req, res) => {
    try {
        const { email, password } = req.body;
        
        // Server-side validation
        if (!email || !password) {
            return res.render('user/login', {
                message: 'All fields are required',
                alertType: "error",
            });
        }

        // Email validation
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!emailRegex.test(email)) {
            return res.render('user/login', {
                message: 'Invalid email format',
                alertType: "error",
            });
        }

        // Find user
        const user = await userSchema.findOne({ email });

        // Check if user exists
        if (!user) {
            return res.render('user/login', {
                message: "Your email is not registered. Please signup first.",
                alertType: "error",
            });
        }

        if(!user.password) {
            return res.render('user/login', {
                message: 'This email is linked to a Google login. Please log in with Google.',
                alertType: "error",
            })
        }

        // Check if user is verified
        if (!user.isVerified) {
            return res.render('user/login', {
                message: 'Please verify your email first',
                alertType: "error",
            });
        }

        // Check if user is blocked
        if (user.blocked) {
            return res.render('user/login', {
                message: 'Your account has been blocked',
                alertType: "error",
            });
        }

        // Verify password
        const isMatch = await bcrypt.compare(password, user.password);
        if (!isMatch) {
            return res.render('user/login', {
                message: 'Invalid credentials',
                alertType: "error",
            });
        }

        // Set session
        req.session.user = user._id;
        req.session.userEmail = user.email;

        // Redirect to home
        res.redirect('/home');

    } catch (error) {
        console.error('Login error:', error);
        return res.render('user/login', {
            message: 'Login failed',
            alertType: "error",
        });
    }
};

const getSignin = (req, res) => {
    res.render('user/signup');
}

const postSignUp = async (req, res) => {
    try {
        const { firstName, lastName, email, password } = req.body;
        
        const trimmedFirstName = firstName.trim();
        const trimmedLastName = lastName.trim();

        // Check if user exists
        const existingUser = await userSchema.findOne({ email });

        // console.log(existingUser);

        if (existingUser && !existingUser.isVerified) {

            await userSchema.deleteOne({ _id: existingUser._id });
            
        } else if (existingUser) {
            return res.json({
                success: false,
                message: 'User already exists'
            })
        }

        const otp = sendOTP.generateOTP();
        const hashedPassword = await bcrypt.hash(password, saltRounds);

        const newUser = new userSchema({
            firstName: trimmedFirstName,
            lastName: trimmedLastName,
            email,
            password: hashedPassword,
            otp,
            otpExpiresAt: Date.now() + 120000,
            otpAttempts: 0
        });

        await newUser.save();

        // Schedule deletion after OTP expiry
        setTimeout(async () => {
            const user = await userSchema.findOne({ email });
            if (user && !user.isVerified) {
                await userSchema.deleteOne({ _id: user._id });
            }
        }, 180000);

        await sendOTP.sendOTPEmail(email, otp);
        res.json({ 
            success: true, 
            message: 'OTP sent successfully', 
            email: email
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            message: 'Signup failed'
        });
    }
}


const getLogout = (req, res) => {
    req.session.user = null;
    req.session.userEmail = null;
    res.redirect('/login');
}

const getGoogle = (req, res, next) => {
    // Store the trigger in session before redirecting to Google
    req.session.authTrigger = req.query.trigger;
    
    passport.authenticate("google", {
        scope: ["profile", "email"],
    })(req, res, next);  // Added next here
};

const getGoogleCallback = (req, res) => {
    passport.authenticate("google", { failureRedirect: "/login" }, async (err, profile) => {
        try {
            if (err || !profile) {
                return res.redirect("/login?message=Authentication failed&alertType=error");
            }

            const existingUser = await userSchema.findOne({ email: profile.email });

            const names = profile.displayName.split(' ');
            const firstName = names[0];
            const lastName = names.slice(1).join(' ')
            
            // If user exists, check if blocked before logging in
            if (existingUser) {
                // Check if user is blocked
                if (existingUser.blocked) {
                    return res.redirect("/login?message=Your account has been blocked&alertType=error");
                }

                // Update googleId if it doesn't exist and unset otpAttempts
                await userSchema.findByIdAndUpdate(existingUser._id, {
                    $set: { googleId: existingUser.googleId || profile.id },
                    $unset: { otpAttempts: 1 }
                });
                
                req.session.user = existingUser._id;
                return res.redirect("/home");
            }

            // If user doesn't exist, create new account
            const newUser = new userSchema({
                firstName: firstName,
                lastName: lastName,
                email: profile.email,
                googleId: profile.id,
                isVerified: true,
            });
            await newUser.save();
            await userSchema.findByIdAndUpdate(newUser._id, {
                $unset: { otpAttempts: 1 }
            });
            
            req.session.user = newUser._id;
            return res.redirect("/home");

        } catch (error) {
            console.error("Google authentication error:", error);
            return res.redirect("/login?message=Authentication failed&alertType=error");
        }
    })(req, res);
};


// Unified function for sending/resending OTP
// const handleOTP = async (req, res) => {
//     try {
//         const { email, isResend } = req.body;
        
//         // For resend, find existing unverified user
//         if (isResend) {
//             const existingUser = await userSchema.findOne({ email, isVerified: false });
//             if (!existingUser) {
//                 return res.json({
//                     success: false,
//                     message: 'No pending verification found for this email'
//                 });
//             }

//             const otp = sendOTP.generateOTP();
//             existingUser.otp = otp;
//             existingUser.otpExpiresAt = Date.now() + 120000; // 2 minutes
//             existingUser.otpAttempts = 0;
//             await existingUser.save();
//             await sendOTP.sendOTPEmail(email, otp);

//             return res.json({
//                 success: true,
//                 message: 'OTP has been resent successfully'
//             });
//         }
        
//         // For initial signup
//         const { firstName, lastName, password } = req.body;
        
//         if (!isResend && (!firstName || !lastName || !password)) {
//             return res.json({
//                 success: false,
//                 message: 'All fields are required'
//             });
//         }

//         // Check for existing verified user
//         const existingVerifiedUser = await userSchema.findOne({ email, isVerified: true });
//         if (existingVerifiedUser) {
//             return res.json({
//                 success: false,
//                 message: 'User already exists'
//             });
//         }

//         // Delete any existing unverified user
//         const existingUnverifiedUser = await userSchema.findOne({ email, isVerified: false });
//         if (existingUnverifiedUser) {
//             await userSchema.deleteOne({ _id: existingUnverifiedUser._id });
//         }

//         // Create new user for signup
//         const otp = sendOTP.generateOTP();
//         const hashedPassword = await bcrypt.hash(password, saltRounds);

//         const newUser = new userSchema({
//             firstName: firstName?.trim(),
//             lastName: lastName?.trim(),
//             email,
//             password: hashedPassword,
//             otp,
//             otpExpiresAt: Date.now() + 120000,
//             otpAttempts: 0
//         });

//         await newUser.save();

//         // Schedule deletion after OTP expiry
//         setTimeout(async () => {
//             const user = await userSchema.findOne({ email });
//             if (user && !user.isVerified) {
//                 await userSchema.deleteOne({ _id: user._id });
//             }
//         }, 180000); // 3 minutes

//         await sendOTP.sendOTPEmail(email, otp);

//         return res.json({
//             success: true,
//             message: 'OTP sent successfully',
//             email: email
//         });

//     } catch (error) {
//         console.error('OTP handling error:', error);
//         return res.json({
//             success: false,
//             message: 'Failed to process OTP request'
//         });
//     }
// };


const postOtp = async (req, res) => {
    try {
        const { userOtp, email } = req.body;
        const user = await userSchema.findOne({ email, otp: userOtp });

        if (!user) {
            return res.status(400).json({ success: false, message: 'Invalid OTP' });
        }

        if (Date.now() > user.otpExpiresAt) {
            user.otpAttempts += 1;
            if (user.otpAttempts >= 3) {
                await userSchema.deleteOne({ _id: user._id });
                return res.status(400).json({ error: 'Too many attempts. Please signup again.' });
            }
            await user.save();
            return res.status(400).json({ error: 'OTP expired' });
        }

        // Increment attempts before validating to prevent brute force
      
        await user.save();

        // If OTP matches, verify user
        if (user.otp === userOtp) {
            await userSchema.findByIdAndUpdate(user._id, {
                $set: { isVerified: true },
                $unset: { otp: 1, otpExpiresAt: 1, otpAttempts: 1 }
            });

            req.session.user = user._id;
            return res.json({ 
                success: true, 
                message: 'OTP verified successfully',
                redirectUrl: '/home'
            });
        } else {
            return res.status(400).json({ error: 'Invalid OTP' });
        }

    } catch (error) {
        console.error('OTP verification error:', error);
        return res.status(500).json({ error: 'OTP verification failed' });
    }
}


const postResendOtp = async (req, res) => {
    try {
        const { email } = req.body; // Get email from request body
        
        const user = await userSchema.findOne({ email, isVerified: false });
        if (!user) {
            return res.json({ 
                success: false, 
                message: 'User not found' 
            });
        }

        const otp = sendOTP.generateOTP();
        user.otp = otp;
        user.otpExpiresAt = Date.now() + 120 * 1000; // 2 minutes
        user.otpAttempts = 0;
        await user.save();

        await sendOTP.sendOTPEmail(user.email, otp);
        
        return res.json({ 
            success: true, 
            message: 'OTP has been resent successfully' 
        });
    } catch (error) {
        return res.json({ 
            success: false, 
            message: 'Failed to resend OTP' 
        });
    }
}
export default { 
    getLogin, 
    getSignin, 
    getLogout,  
    postSignUp, 
    postOtp,
    postResendOtp,
    postLogin, 
    getGoogle,
    getGoogleCallback }; 