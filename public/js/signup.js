
document.addEventListener('DOMContentLoaded', function () {
    
    const form = document.getElementById('signup-form');
    const passwordToggles = document.querySelectorAll('.fa-eye');

    // Password validation function
    const validatePassword = (password) => {
        const minLength = 8;
        const maxLength = 12;

        // Check length
        if (password.length < minLength || password.length > maxLength) {
            return {
                isValid: false,
                message: `Password must be between ${minLength} and ${maxLength} characters long`
            };
        }

        // Check for uppercase letter
        if (!/[A-Z]/.test(password)) {
            return {
                isValid: false,
                message: 'Password must contain at least one uppercase letter'
            };
        }

        // Check for lowercase letter
        if (!/[a-z]/.test(password)) {
            return {
                isValid: false,
                message: 'Password must contain at least one lowercase letter'
            };
        }

        // Check for number
        if (!/[0-9]/.test(password)) {
            return {
                isValid: false,
                message: 'Password must contain at least one number'
            };
        }

        return { isValid: true };
    };

    // Form validation and submission
    form.addEventListener('submit', async function (e) {
        e.preventDefault();

        const firstName = document.getElementById('firstName').value.trim();
        const lastName = document.getElementById('lastName').value.trim();
        const email = document.getElementById('email').value.trim();
        const password = document.getElementById('password').value;
        const confirmPassword = document.getElementById('confirmPassword').value;

        // Basic field validation
        if (!firstName || !lastName || !email || !password || !confirmPassword) {
            Swal.fire({
                icon: 'error',
                title: 'Validation Error',
                text: 'All fields are required'
            });
            return;
        }

        // Name validation
        if (!/^[a-zA-Z]{3,10}$/.test(firstName)) {
            Swal.fire({
                icon: 'error',
                title: 'Invalid First Name',
                text: 'First name should contain only letters (3-10 characters)'
            });
            return;
        }

        if (!/^[a-zA-Z]{1,10}$/.test(lastName)) {
            Swal.fire({
                icon: 'error',
                title: 'Invalid Last Name',
                text: 'Last name should contain only letters (1-10 characters)'
            });
            return;
        }

        // Email validation
        if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
            Swal.fire({
                icon: 'error',
                title: 'Invalid Email',
                text: 'Please enter a valid email address'
            });
            return;
        }

        // Confirm password


        // Password validation
        const passwordValidation = validatePassword(password);
        if (!passwordValidation.isValid) {
            Swal.fire({
                icon: 'error',
                title: 'Invalid Password',
                text: 'Password doesn\'t meet requirements'
            });
            return;
        }

        if (password !== confirmPassword) {
            Swal.fire({
                icon: 'error',
                title: 'Password Mismatch',
                text: 'Passwords do not match'
            });
            return;
        }

        try {
            const response = await fetch('/signup', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    firstName,
                    lastName,
                    email,
                    password
                })
            });

            const data = await response.json();
            if (data.success) {
                // Show OTP modal
                document.getElementById('otpModal').classList.remove('hidden');
                document.getElementById('otpModal').classList.add('flex');
            } else {
                Swal.fire({
                    icon: 'error',
                    title: 'Error',
                    text: data.message
                });
            }
        } catch (error) {
            console.error('Error:', error);
        }
    });

    // Add password input event listener for real-time validation
    const passwordInput = document.getElementById('confirmPassword');
    const passwordRequirements = document.createElement('div');
    passwordRequirements.className = 'text-xs text-gray-500 mt-1';
    passwordRequirements.innerHTML = `
            Password requirements:
            <ul class="list-disc pl-4 mt-1">
                <li>8-12 characters long</li>
                <li>At least one uppercase letter</li>
                <li>At least one lowercase letter</li>
                <li>At least one number</li>
            </ul>
        `;
    passwordInput.parentNode.appendChild(passwordRequirements);

    // Password toggle functionality
    passwordToggles.forEach(toggle => {
        toggle.addEventListener('click', function () {
            const input = this.closest('.relative').querySelector('input');
            if (input.type === 'password') {
                input.type = 'text';
                this.classList.remove('fa-eye');
                this.classList.add('fa-eye-slash');
            } else {
                input.type = 'password';
                this.classList.remove('fa-eye-slash');
                this.classList.add('fa-eye');
            }
        });
    });

        // Show alert messages if they exist
        <% if (locals.message && locals.alertType) { %>
        Swal.fire({
            icon: '<%= alertType === "error" ? "error" : "success" %>',
            title: '<%= alertType === "error" ? "Error" : "Success" %>',
            text: '<%= message %>',
            timer: 5000,
            timerProgressBar: true
        });
        <% } %>

        // Get URL parameters
        const urlParams = new URLSearchParams(window.location.search);
    const message = urlParams.get('message');
    const alertType = urlParams.get('alertType');

    // Show alert if message exists in URL parameters
    if (message) {
        Swal.fire({
            icon: alertType || 'error',
            title: alertType === 'success' ? 'Success' : 'Error',
            text: message,
            timer: 3000,
            timerProgressBar: true
        });

        // Clean up URL after showing the alert
        window.history.replaceState({}, document.title, window.location.pathname);
    }

    // Add OTP input handling
    const otpInputs = document.querySelectorAll('.otp-input');
    otpInputs.forEach((input, index) => {
        input.addEventListener('input', function () {
            if (this.value.length === 1) {
                if (index < otpInputs.length - 1) otpInputs[index + 1].focus();
            }
        });

        input.addEventListener('keydown', function (e) {
            if (e.key === 'Backspace' && !this.value) {
                if (index > 0) otpInputs[index - 1].focus();
            }
        });
    });

    // Handle OTP verification
    document.getElementById('verifyOtp').addEventListener('click', async function () {
        const otp = Array.from(otpInputs).map(input => input.value).join('');
        const email = document.getElementById('email').value;


        try {
            const response = await fetch('/validate-otp', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({ userOtp: otp, email })
            });

            const data = await response.json();
            if (data.success) {
                window.location.href = data.redirectUrl;
            } else {
                Swal.fire({
                    icon: 'error',
                    title: 'Error',
                    text: data.message
                });
            }
        } catch (error) {
            console.error('Error:', error);
        }
    });

    // Handle resend OTP
    document.getElementById('resendOtp').addEventListener('click', async function () {
        const email = document.getElementById('email').value;
        try {
            const response = await fetch('/validate-otp', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({ email })
            });

            const data = await response.json();
            Swal.fire({
                icon: data.success ? 'success' : 'error',
                title: data.success ? 'Success' : 'Error',
                text: data.message
            });
        } catch (error) {
            console.error('Error:', error);
        }
    });
});

