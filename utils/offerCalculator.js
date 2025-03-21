// Calculate the final price after applying offers
export const calculateFinalPrice = (product, categoryOffer, productOffer) => {
    let finalPrice = product.price;
    let appliedDiscount = 0;

    if (categoryOffer) {
        const categoryDiscountAmount = (finalPrice * categoryOffer.discount) / 100;
        appliedDiscount = Math.max(appliedDiscount, categoryDiscountAmount);
    }

    if (productOffer) {
        const productDiscountAmount = (finalPrice * productOffer.discount) / 100;
        appliedDiscount = Math.max(appliedDiscount, productDiscountAmount);
    }

    finalPrice -= appliedDiscount;
    return Math.round(finalPrice);
}; 