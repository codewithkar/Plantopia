
let appliedCoupon = null;
let currentDiscount = 0;
const cartTotal = <%= total %>;

function openCouponModal() {
    fetchCoupons();
    document.getElementById('couponModal').classList.remove('hidden');
}

function closeCouponModal() {
    document.getElementById('couponModal').classList.add('hidden');
}

async function fetchCoupons() {
    try {
        const response = await fetch('/checkout/available-coupons');
        const data = await response.json();

        if (data.success) {
            renderCoupons(data.coupons);
        } else {
            throw new Error(data.message);
        }
    } catch (error) {
        console.error('Error fetching coupons:', error);
        await showAlert('error', 'Failed to load coupons');
    }
}

function renderCoupons(coupons) {
    const activeCouponsList = document.getElementById('activeCouponsList');
    activeCouponsList.innerHTML = '';

    // Separate applicable and non-applicable coupons
    const applicableCoupons = coupons.filter(coupon => coupon.isApplicable);
    const nonApplicableCoupons = coupons.filter(coupon => !coupon.isApplicable);

    // Render applicable coupons first with a header
    if (applicableCoupons.length > 0) {
        activeCouponsList.innerHTML += `
            <div class="mb-4">
                <h4 class="text-sm font-medium text-green-600 mb-3">Available for You</h4>
                <div class="space-y-3">
                    ${applicableCoupons.map(coupon =>
            createCouponElement(coupon, true).outerHTML
        ).join('')}
                </div>
            </div>
        `;
    }

    // Render non-applicable coupons with a header
    if (nonApplicableCoupons.length > 0) {
        activeCouponsList.innerHTML += `
            <div>
                ${applicableCoupons.length > 0 ? '<hr class="my-4">' : ''}
                <h4 class="text-sm font-medium text-gray-600 mb-3">Other Coupons</h4>
                <div class="space-y-3">
                    ${nonApplicableCoupons.map(coupon =>
            createCouponElement(coupon, false).outerHTML
        ).join('')}
                </div>
            </div>
        `;
    }

    // Show "No coupons" message if both sections are empty
    if (!applicableCoupons.length && !nonApplicableCoupons.length) {
        activeCouponsList.innerHTML = `
            <div class="text-gray-500 text-center py-3">
                No coupons available
            </div>
        `;
    }
}

function createCouponElement(coupon, isApplicable) {
    const div = document.createElement('div');
    div.className = `p-4 border rounded-lg ${isApplicable ? 'border-green-200 bg-green-50' : 'border-gray-200 bg-gray-50'}`;

    div.innerHTML = `
        <div class="flex justify-between items-start">
            <div>
                <h3 class="font-medium ${isApplicable ? 'text-green-700' : 'text-gray-700'}">${coupon.code}</h3>
                <p class="text-sm text-gray-600 mt-1">
                    ${coupon.discountPercentage}% OFF
                    ${coupon.maximumDiscount ? ` up to ₹${coupon.maximumDiscount}` : ''}
                </p>
                <p class="text-xs text-gray-500 mt-1">
                    Min purchase: ₹${coupon.minimumPurchase}
                </p>
                <p class="text-xs text-gray-500">
                    Valid till: ${new Date(coupon.expiryDate).toLocaleDateString()}
                </p>
            </div>
            ${isApplicable ? `
                <button onclick="applyCoupon('${coupon.code}')"
                        class="px-3 py-1 bg-blue-500 text-white text-sm rounded hover:bg-blue-600 focus:outline-none focus:ring-2 focus:ring-blue-500">
                    Apply
                </button>
            ` : `
                <span class="text-xs text-gray-500 italic">
                    Not applicable
                </span>
            `}
        </div>
    `;

    return div;
}

function getCouponInactiveReason(coupon) {
    if (coupon.minimumPurchase > cartTotal) return `Min. purchase ₹${coupon.minimumPurchase}`;
    if (coupon.totalCoupon && coupon.usedCouponCount >= coupon.totalCoupon) return 'Coupon limit reached';
    return 'Not applicable';
}

// Add this function to manage the Apply Coupon button state
function toggleApplyCouponButton(disabled) {
    const applyCouponButton = document.querySelector('button[onclick="openCouponModal()"]');
    if (applyCouponButton) {
        applyCouponButton.disabled = disabled;
        if (disabled) {
            applyCouponButton.classList.add('opacity-50', 'cursor-not-allowed');
            applyCouponButton.classList.remove('hover:bg-gray-200');
        } else {
            applyCouponButton.classList.remove('opacity-50', 'cursor-not-allowed');
            applyCouponButton.classList.add('hover:bg-gray-200');
        }
    }
}

async function applyCoupon(couponCode) {
    try {

        // Check for empty or whitespace-only coupon code
        if (!couponCode || !couponCode.trim()) {
            await showAlert('error', 'Please enter a valid coupon code');
            return;
        }

        // Remove leading and trailing spaces
        const trimmedCode = couponCode.trim().toUpperCase();


        const response = await fetch('/checkout/apply-coupon', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ code: trimmedCode })
        });

        const data = await response.json();

        if (data.success) {

            // Update UI elements
            const discountRow = document.getElementById('discountRow');
            const discountAmount = document.getElementById('discountAmount');
            const finalTotal = document.getElementById('finalTotal');
            const appliedCouponInfo = document.getElementById('appliedCouponInfo');
            const appliedCouponCode = document.getElementById('appliedCouponCode');
            const discountInfo = document.getElementById('discountInfo');
            const walletOption = document.getElementById('walletOption');
            const walletPayment = document.getElementById('walletPayment');
            const walletAvailability = document.getElementById('walletAvailability');

            // Check if all required elements exist
            if (!discountRow || !discountAmount || !finalTotal || !appliedCouponInfo ||
                !appliedCouponCode || !discountInfo || !walletOption ||
                !walletPayment || !walletAvailability) {
                console.error('Some required elements are missing');
                return;
            }

            // Update discount and coupon info
            discountRow.classList.remove('hidden');
            discountAmount.textContent = data.discount.toFixed(2);
            finalTotal.textContent = (cartTotal - data.discount).toFixed(2);

            appliedCouponInfo.classList.remove('hidden');
            appliedCouponCode.textContent = trimmedCode;
            discountInfo.textContent = `₹${data.discount.toFixed(2)} discount applied`;

            // Close coupon modal
            closeCouponModal();

            // Get the new final total and wallet balance
            const newTotal = parseFloat(finalTotal.textContent);
            const walletBalance = parseFloat(walletOption.dataset.balance || '0');

            // Update wallet payment option visibility
            if (newTotal <= walletBalance) {
                walletOption.classList.remove('opacity-60');
                walletPayment.disabled = false;
                walletAvailability.textContent = 'Available';
                walletAvailability.classList.remove('bg-red-100', 'text-red-800');
                walletAvailability.classList.add('bg-green-100', 'text-green-800');
            }

            if (newTotal <= 1000) {
                // Enable COD
                codOption.classList.remove('opacity-60');
                codOption.classList.add('hover:bg-gray-50');
                codPayment.disabled = false;
                codAvailability.classList.add('hidden');
                codMessage.textContent = 'Pay when you receive the order';
            } else {
                // Disable COD
                codOption.classList.add('opacity-60');
                codOption.classList.remove('hover:bg-gray-50');
                codPayment.disabled = true;
                codAvailability.classList.remove('hidden');
                codAvailability.classList.add('bg-red-100', 'text-red-800');
                codAvailability.textContent = 'Not Available';
                codMessage.textContent = 'Not available for orders above ₹1,000';
            }

            // Show success message
            await showAlert('success', 'Coupon applied successfully!');
        } else {
            throw new Error(data.message || 'Failed to apply coupon');
        }
    } catch (error) {
        console.error('Error in applyCoupon:', error);
    }
}

async function removeCoupon() {
    try {

        // Reset UI elements
        const discountRow = document.getElementById('discountRow');
        const discountAmount = document.getElementById('discountAmount');
        const finalTotal = document.getElementById('finalTotal');
        const appliedCouponInfo = document.getElementById('appliedCouponInfo');
        const subtotalElement = document.getElementById('subtotal');
        const walletOption = document.getElementById('walletOption');
        const walletPayment = document.getElementById('walletPayment');
        const walletAvailability = document.getElementById('walletAvailability');
        const appliedCouponCode = document.getElementById('appliedCouponCode');

        // Get the original subtotal
        const originalTotal = parseFloat(subtotalElement.textContent);

        // Update UI elements
        discountRow.classList.add('hidden');
        discountAmount.textContent = '0.00';
        finalTotal.textContent = originalTotal.toFixed(2);
        appliedCouponInfo.classList.add('hidden');

        // Important: Clear the appliedCouponCode content
        if (appliedCouponCode) {
            appliedCouponCode.textContent = '';
            appliedCouponCode.setAttribute('data-coupon', ''); // Also clear data attribute if exists
        }

        // Update payment methods based on original total
        updatePaymentMethodsAfterCoupon(originalTotal);

        // Update wallet availability based on original total
        if (walletOption && walletPayment && walletAvailability) {
            const walletBalance = parseFloat(walletOption.dataset.balance || '0');
            if (cartTotal <= walletBalance) {
                walletOption.classList.remove('opacity-60');
                walletPayment.disabled = false;
                walletAvailability.textContent = 'Available';
                walletAvailability.classList.remove('bg-red-100', 'text-red-800');
                walletAvailability.classList.add('bg-green-100', 'text-green-800');
            } else {
                walletOption.classList.add('opacity-60');
                walletPayment.disabled = true;
                walletAvailability.textContent = 'Insufficient Balance';
                walletAvailability.classList.remove('bg-green-100', 'text-green-800');
                walletAvailability.classList.add('bg-red-100', 'text-red-800');
            }
        }

        // Update COD availability
        updateCODAvailability(cartTotal);

        // Enable the Apply Coupon button
        toggleApplyCouponButton(false);

        // Reset the applied coupon state
        appliedCoupon = null;
        currentDiscount = 0;

        // Show success message
        await showAlert('success', 'Coupon removed successfully');
    } catch (error) {
        console.error('Error removing coupon:', error);
        await showAlert('error', error.message || 'Failed to remove coupon. Please try again.');
    }
}

function updateTotalWithDiscount(discount) {
    const finalTotalElement = document.getElementById('finalTotal');
    const discountElement = document.getElementById('discountAmount');
    const discountRow = document.getElementById('discountRow');

    if (discount > 0) {
        discountRow.classList.remove('hidden');
        discountElement.textContent = discount.toFixed(2);
        finalTotalElement.textContent = (cartTotal - discount).toFixed(2);
    } else {
        discountRow.classList.add('hidden');
        discountElement.textContent = '0';
        finalTotalElement.textContent = cartTotal.toFixed(2);
    }
}

// Add this function to get the current total with discount
function getDiscountedTotal() {
    const subtotal = parseFloat(document.getElementById('subtotal').textContent);
    const discountAmount = parseFloat(document.getElementById('discountAmount').textContent) || 0;
    return subtotal - discountAmount;
}

// Update createRazorpayOrder function
async function createRazorpayOrder(addressId) {
    try {
        const finalAmount = getDiscountedTotal();

        // Validate amount limits
        if (finalAmount < 1) {
            throw new Error('Minimum order amount should be ₹1');
        }

        if (finalAmount > 500000) {
            throw new Error('Maximum order amount cannot exceed ₹5,00,000');
        }

        const response = await fetch('/checkout/create-razorpay-order', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                addressId: addressId,
                amount: finalAmount,
                couponCode: document.getElementById('appliedCouponCode')?.textContent
            })
        });

        const data = await response.json();
        if (!data.success) {
            throw new Error(data.message);
        }
        return data;
    } catch (error) {
        console.error('Error creating Razorpay order:', error);
        throw error;
    }
}

// Update wallet payment function
async function processWalletPayment(addressId) {
    try {
        const finalAmount = getDiscountedTotal();

        const response = await fetch('/checkout/wallet-payment', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                addressId: addressId,
                amount: finalAmount,
                couponCode: document.getElementById('appliedCouponCode')?.textContent
            })
        });

        const data = await response.json();
        if (!data.success) {
            throw new Error(data.message || 'Wallet payment failed');
        }
        return data;
    } catch (error) {
        console.error('Error processing wallet payment:', error);
        throw error;
    }
}

async function placeOrder() {
    try {

        // Check if address is selected
        const selectedAddress = document.querySelector('input[name="selectedAddress"]:checked');
        if (!selectedAddress) {
            await showAlert('error', 'Please select a delivery address.');
            return;
        }

        // Check if payment method is selected
        const selectedPayment = document.querySelector('input[name="paymentMethod"]:checked');
        if (!selectedPayment) {
            await showAlert('error', 'Please select a payment method to proceed with your order.');
            return;
        }

        const paymentMethod = selectedPayment.value;
        const finalAmount = parseFloat(document.getElementById('finalTotal').textContent);

        // Validate COD payment method
        if (paymentMethod === 'cod' && finalAmount > 1000) {
            await showAlert('error', 'Cash on Delivery is not available for orders above ₹1,000. Please choose a different payment method.');
            return;
        }

        let response;

        if (paymentMethod === 'wallet') {
            response = await processWalletPayment(selectedAddress.value);

            if (response.success) {
                await showAlert('success', `Order Placed Successfully! Order ID: ${response.orderId}`);
                window.location.href = `/orders?success=true&orderId=${response.orderId}`;
            } else {
                throw new Error(response.message);
            }
        } else if (paymentMethod === 'cod') {
            response = await fetch('/checkout/place-order', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    addressId: selectedAddress.value,
                    paymentMethod: 'cod',
                    couponCode: document.getElementById('appliedCouponCode')?.textContent
                })
            });
            const data = await response.json();

            if (data.success) {
                await showAlert('success', `Order Placed Successfully! Order ID: ${data.orderId}`);
                window.location.href = `/orders?success=true&orderId=${data.orderId}`;
            } else {
                throw new Error(data.message);
            }
        } else if (paymentMethod === 'online') {
            const data = await createRazorpayOrder(selectedAddress.value);
            if (!data.success) {
                throw new Error(data.message);
            }
            const options = {
                key: data.key,
                amount: data.order.amount,
                currency: "INR",
                name: "Plantopia",
                description: "Order Payment",
                order_id: data.order.id,
                handler: async function (response) {
                    try {
                        await showAlert('loading', 'Verifying payment...');
                        const verifyResponse = await fetch('/checkout/verify-payment', {
                            method: 'POST',
                            headers: {
                                'Content-Type': 'application/json'
                            },
                            body: JSON.stringify({
                                razorpay_order_id: response.razorpay_order_id,
                                razorpay_payment_id: response.razorpay_payment_id,
                                razorpay_signature: response.razorpay_signature
                            })
                        });

                        const verifyData = await verifyResponse.json();
                        if (verifyData.success) {
                            hideAlert(); // Hide loading alert

                            // Show success alert before redirecting
                            await showAlert('success', 'Payment Successful!', `Order ID: ${verifyData.orderId}`);

                            // Redirect to orders page
                            window.location.href = `/orders?success=true&orderId=${verifyData.orderId}`;
                        } else {
                            throw new Error(verifyData.message || 'Payment verification failed');
                        }
                    } catch (error) {
                        hideAlert(); // Hide loading alert

                        await handlePaymentFailure({
                            error: error,
                            orderId: data.order.id,
                            message: 'Payment verification failed'
                        });
                    }
                },
                prefill: {
                    name: "<%= user.firstName %> <%= user.lastName %>",
                    email: "<%= user.email %>",
                    contact: "<%= user.phone %>"
                },
                theme: {
                    color: "#000000"
                },
                modal: {
                    ondismiss: async function () {
                        try {
                            await fetch('/checkout/payment-failed', {
                                method: 'POST',
                                headers: {
                                    'Content-Type': 'application/json'
                                },
                                body: JSON.stringify({
                                    error: { description: 'Payment cancelled by user' },
                                    razorpay_order_id: options.order_id
                                })
                            });

                            // Show alert and handle redirect in the callback
                            showAlert('error', 'Payment cancelled. You can retry the payment from your orders page.')
                                .then(() => {
                                    // Use a direct redirect without delay
                                    window.location.href = '/orders';
                                });

                        } catch (error) {
                            console.error('Error handling payment failure:', error);
                            showAlert('error', 'Payment failed. Please check your orders page.')
                                .then(() => {
                                    window.location.href = '/orders';
                                });
                        }
                    }
                }
            };

            const rzp = new Razorpay(options);
            rzp.open();
        }
    } catch (error) {
        console.error('Error in placeOrder:', error);
    }
}

function showInputModal(amountNeeded) {
    const modal = document.getElementById('inputModal');
    const backdrop = document.getElementById('modalBackdrop');
    const modalContent = modal.querySelector('div');

    document.getElementById('amountNeeded').textContent = amountNeeded.toFixed(2);
    document.getElementById('fundAmount').value = Math.ceil(amountNeeded);

    modal.classList.remove('hidden');
    backdrop.classList.remove('hidden');
    setTimeout(() => {
        backdrop.classList.remove('opacity-0');
        modalContent.classList.remove('scale-90', 'opacity-0', 'translate-y-4');
    }, 50);
}

function hideInputModal() {
    const modal = document.getElementById('inputModal');
    const backdrop = document.getElementById('modalBackdrop');
    const modalContent = modal.querySelector('div');

    backdrop.classList.add('opacity-0');
    modalContent.classList.add('scale-90', 'opacity-0', 'translate-y-4');

    setTimeout(() => {
        modal.classList.add('hidden');
        backdrop.classList.add('hidden');
    }, 300);
}

function updateCODAvailability(finalAmount) {
    const codOption = document.getElementById('codOption');
    const codPayment = document.getElementById('codPayment');
    const codAvailability = document.getElementById('codAvailability');
    const codMessage = document.getElementById('codMessage');

    if (finalAmount > 1000) {
        codOption.classList.add('opacity-60');
        codOption.classList.remove('hover:bg-gray-50');
        codPayment.disabled = true;
        codAvailability.classList.remove('hidden');
        codAvailability.classList.add('bg-red-100', 'text-red-800');
        codAvailability.textContent = 'Not Available';
        codMessage.textContent = 'Not available for orders above ₹1,000';

        // If COD was selected, switch to a different payment method
        if (codPayment.checked) {
            document.querySelector('input[name="paymentMethod"][value="online"]').checked = true;
        }
    } else {
        codOption.classList.remove('opacity-60');
        codOption.classList.add('hover:bg-gray-50');
        codPayment.disabled = false;
        codAvailability.classList.add('hidden');
        codMessage.textContent = 'Pay when you receive the order';
    }
}

// Update COD availability when coupon is applied or removed
function updatePaymentMethodsAfterCoupon(finalAmount) {
    updateCODAvailability(finalAmount);
}

// Initial update
document.addEventListener('DOMContentLoaded', function () {
    const finalTotal = parseFloat(document.getElementById('codOption').dataset.finalTotal);
    updateCODAvailability(finalTotal);
});

document.addEventListener('DOMContentLoaded', function () {
    // Check for success parameter in URL
    const urlParams = new URLSearchParams(window.location.search);
    const success = urlParams.get('success');
    const orderId = urlParams.get('orderId');

    if (success === 'true' && orderId) {
        showAlert('success', `Your order (${orderId}) has been placed successfully.`)
            .then(() => {
                // Clean up URL without refreshing the page
                window.history.replaceState({}, document.title, '/orders');
            });
    }
});

function showAlert(type, message) {
    return new Promise((resolve) => {
        const modal = document.getElementById('alertModal');
        const backdrop = document.getElementById('modalBackdrop');
        const modalContent = modal.querySelector('div');

        // Hide all alert types first
        ['successAlert', 'errorAlert', 'loadingAlert'].forEach(alertId => {
            document.getElementById(alertId).classList.add('hidden');
        });

        // Show selected alert type
        const alertElement = document.getElementById(`${type}Alert`);
        if (!alertElement) {
            console.error(`Alert type "${type}" not found`);
            return;
        }
        alertElement.classList.remove('hidden');

        // Update message if provided
        if (message) {
            const messageElement = document.getElementById(`${type}Message`);
            if (messageElement) {
                messageElement.textContent = message;
            }
        }

        // Show modal with animation
        modal.classList.remove('hidden');
        backdrop.classList.remove('hidden');
        setTimeout(() => {
            backdrop.classList.remove('opacity-0');
            modalContent.classList.remove('scale-90', 'opacity-0', 'translate-y-4');
        }, 50);

        // Add click handler to button (except for loading state)
        if (type !== 'loading') {
            const button = alertElement.querySelector('button');
            if (button) {
                button.onclick = () => {
                    hideAlert();
                    resolve(true);
                };
            }
        }
    });
}

function hideAlert() {
    const modal = document.getElementById('alertModal');
    const backdrop = document.getElementById('modalBackdrop');
    const modalContent = modal.querySelector('div');

    backdrop.classList.add('opacity-0');
    modalContent.classList.add('scale-90', 'opacity-0', 'translate-y-4');

    setTimeout(() => {
        modal.classList.add('hidden');
        backdrop.classList.add('hidden');
    }, 300);
}

document.addEventListener('DOMContentLoaded', async function () {
    const urlParams = new URLSearchParams(window.location.search);
    const success = urlParams.get('success');
    const orderId = urlParams.get('orderId');

    if (success === 'true' && orderId) {
        await showAlert('success', `Your order (${orderId}) has been placed successfully.`);
        window.history.replaceState({}, document.title, '/orders');
    }
});

