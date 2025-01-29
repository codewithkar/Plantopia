import nodemailer from 'nodemailer'
import {config} from "dotenv"
import userSchema from '../models/users.js'

config()

const transporter = nodemailer.createTransport({
    host:"smtp.gmail.com",
    service: "gmail",
    port:587,
    auth: {
        user: process.env.EMAIL,
        pass: process.env.PASSWORD,
    },
});


const generateOTP = () => Math.floor(100000 + Math.random() * 900000).toString()


const sendOTPEmail = async (email, otp) => {
    try {
        await transporter.sendMail({
            from: process.env.EMAIL,
            to: email,
            subject: "Your OTP Code",
            text: `Your OTP code is: ${otp}`,

        });
    } catch (error) {
        console.error("Error sending OTP email:", error);
    }
};


const otpValidation = async (req, res) => {
    try {
        const { email } = req.body;

        // Check if the user exists
        const existingUser = await userSchema.findOne({ email });
        if (!existingUser) {
            return res.status(404).json({ success: false, message: 'User not found' });
        }

        // Check if the user is verified
        if (!existingUser.isVerified) {
            return res.status(403).json({ success: false, message: 'User account is not verified' });
        }

        // Generate OTP
        const otp = generateOTP();
        console.log(`Generated OTP for ${email}: ${otp}`);

        // Update or create OTP details for the user
        await userSchema.updateOne(
            { email },
            {
                $set: {
                    otp,
                    otpExpiresAt: Date.now() + 2 * 60 * 1000, // 2 minutes expiry
                    otpAttempts: 0,
                },
            },
            { upsert: true }
        );

        // Schedule deletion of OTP after expiry
        setTimeout(async () => {
            const user = await userSchema.findOne({ email });
            if (user && user.otp && Date.now() > user.otpExpiresAt) {
                await userSchema.updateOne({ email }, { $unset: { otp: 1, otpExpiresAt: 1, otpAttempts: 1 } });
                console.log(`Expired OTP cleared for ${email}`);
            }
        }, 2 * 60 * 1000);

        // Send OTP email
        await sendOTPEmail(email, otp);

        res.status(200).json({
            success: true,
            message: 'OTP sent successfully',
        });
    } catch (error) {
        console.error('Error in sending OTP:', error);
        res.status(500).json({
            success: false,
            message: 'Internal server error',
        });
    }
};


export default { 
    generateOTP,
    sendOTPEmail, 
    otpValidation
 };