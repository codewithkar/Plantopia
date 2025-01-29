import userSchema from '../../models/users.js';
import bcrypt from 'bcrypt'
import passport from 'passport';
import sendOtp from '../../utils/sendOTP.js'

const saltRounds = 10;

const forgotPassword = (req, res) => {
    res.render('user/forgotPassword'); 
}

// const sendForgotPasswordOTP = async (req, res) => {
//     try {
//         const { email } = req.body;

//         // Check if the user exists
//         const existingUser = await userSchema.findOne({ email });
//         if (!existingUser) {
//             return res.status(404).json({ success: false, message: 'User not found' });
//         }

//         // Check if the user is verified
//         if (!existingUser.isVerified) {
//             return res.status(403).json({ success: false, message: 'User account is not verified' });
//         }

//         // Generate OTP
//         const otp = generateOTP();
//         console.log(`Generated OTP for ${email}: ${otp}`);

//         // Update or create OTP details for the user
//         await userSchema.updateOne(
//             { email },
//             {
//                 $set: {
//                     otp,
//                     otpExpiresAt: Date.now() + 2 * 60 * 1000, // 2 minutes expiry
//                     otpAttempts: 0,
//                 },
//             },
//             { upsert: true }
//         );

//         // Schedule deletion of OTP after expiry
//         setTimeout(async () => {
//             const user = await userSchema.findOne({ email });
//             if (user && user.otp && Date.now() > user.otpExpiresAt) {
//                 await userSchema.updateOne({ email }, { $unset: { otp: 1, otpExpiresAt: 1, otpAttempts: 1 } });
//                 console.log(`Expired OTP cleared for ${email}`);
//             }
//         }, 2 * 60 * 1000);

//         // Send OTP email
//         await sendOTPEmail(email, otp);

//         res.status(200).json({
//             success: true,
//             message: 'OTP sent successfully',
//         });
//     } catch (error) {
//         console.error('Error in sending OTP:', error);
//         res.status(500).json({
//             success: false,
//             message: 'Internal server error',
//         });
//     }
// };

const verifyForgotPasswordOTP = async (req, res) => {
    try {
        const { otp, email } = req.body;
        const user = await userSchema.findOne({ email, otp: otp });

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
        user.otpAttempts += 1;
        if (user.otpAttempts >= 3) {
            await userSchema.deleteOne({ _id: user._id });
            return res.status(400).json({ error: 'Too many attempts. Please signup again.' });
        }
        await user.save();

        // If OTP matches, verify user
        if (user.otp === otp) {
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

const resetPassword = async (req, res) => {
    try {
        const { email, newPassword } = req.body;
        const hashedPassword = await bcrypt.hash(newPassword, saltRounds);

        await userSchema.findOneAndUpdate( {email:email} , {
            password:hashedPassword,
            },
            {new:true});
        
            return res.json({ 
                success: true, 
                message: 'Password reset successfully',
                redirectUrl: '/login'
            });
        
    }
    catch (error) {
        console.error('Error in resetting password:', error);
        
    }

}

export default { 
    forgotPassword, 
    verifyForgotPasswordOTP,
    resetPassword,
     
};