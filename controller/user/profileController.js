import userSchema from '../../models/users.js';
import bcrypt from 'bcrypt'

const saltRounds = 12;

const getProfile = async (req, res) => {
    try {
        const user = await userSchema.findById(req.session.user);
        res.render('user/profile', { user });
    } catch (error) {
        console.error('Error fetching profile:', error);
        res.status(500).send('Error loading profile');
    }
};

const updateProfile = async (req, res) => {
    try {
      const { firstName, lastName, email} = req.body;
            
      // Update user profile
      await userSchema.findOneAndUpdate( {email:email} , {
        firstName,
        lastName,
      },
      {new:true});
  
      res.redirect('/profile')
    } catch (error) {
      console.error('Error updating profile:', error);
      res.status(500).json({ message: 'Error updating profile' });
    }
  };

const getChangePassword = async (req, res) => {
    try {
        // Get user from session
        const userId = req.session.user;
        const user = await userSchema.findById(userId);

        if (!user) {
            return res.redirect('/login');
        }

        // Check if user has a password (not Google login)
        if (!user.password) {
            return res.redirect('/profile');
        }

        // Pass the user object to the view
        res.render('user/changePassword', { user });

    } catch (error) {
        console.error('Get change password error:', error);
        res.status(500).render('error', { 
            message: 'Error loading change password page',
            error: error.message 
        });
    }
  };

const postChangePassword = async (req, res) => {
    try {
        const { currentPassword, newPassword } = req.body;
        const userId = req.session.user;

        const user = await userSchema.findById(userId);
        if (!user) {
            return res.status(404).json({ message: 'User not found' });
        }

        // Verify current password
        const isMatch = await bcrypt.compare(currentPassword, user.password);
        if (!isMatch) {
            return res.status(400).json({ message: 'Current password is incorrect' });
        }

        // Validate new password
        const passwordValidation = validatePassword(newPassword);
        if (!passwordValidation.isValid) {
            return res.status(400).json({ message: passwordValidation.message });
        }

        // Hash new password
        const hashedPassword = await bcrypt.hash(newPassword, saltRounds);
        
        // Update password
        await userSchema.findByIdAndUpdate(userId, {
            password: hashedPassword
        });

        res.status(200).json({ message: 'Password updated successfully' });
    } catch (error) {
        console.error('Change password error:', error);
        res.status(500).json({ message: 'Failed to update password' });
    }
};


const validatePassword = (pwd) => {
  if (pwd.length < 8 || pwd.length > 12) {
      return { isValid: false, message: 'Password must be between 8 and 12 characters long' };
  }
  if (!/[A-Z]/.test(pwd)) {
      return { isValid: false, message: 'Password must contain at least one uppercase letter' };
  }
  if (!/[a-z]/.test(pwd)) {
      return { isValid: false, message: 'Password must contain at least one lowercase letter' };
  }
  if (!/[0-9]/.test(pwd)) {
      return { isValid: false, message: 'Password must contain at least one number' };
  }
  return { isValid: true };
};

export default { getProfile, updateProfile, getChangePassword, postChangePassword}