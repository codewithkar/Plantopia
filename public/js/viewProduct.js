// Image zoom functionality
const imageZoom = document.getElementById('imageZoom');

imageZoom.addEventListener('mousemove', (event) => {
  imageZoom.style.setProperty('--display', 'block');
  const pointer = {
    x: (event.offsetX * 100) / imageZoom.offsetWidth,
    y: (event.offsetY * 100) / imageZoom.offsetHeight,
  };
  imageZoom.style.setProperty('--zoom-x', pointer.x + '%');
  imageZoom.style.setProperty('--zoom-y', pointer.y + '%');
});

imageZoom.addEventListener('mouseout', () => {
  imageZoom.style.setProperty('--display', 'none');
});

// Update main image
function updateMainImage(imageUrl) {
  document.getElementById('main-product-image').src = imageUrl;
  imageZoom.style.setProperty('--url', `url(${imageUrl})`);
}

// Add to cart functionality
async function addToCart(productId) {
  try {
    // console.log("clicked");
    const response = await fetch('/cart/add', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        productId,
        quantity: 1
      })
    });
    const data = await response.json();
   
    if (data.error && data.redirectUrl) {
      // Redirect to login page with return URL
      window.location.href = `${data.redirectUrl}?returnTo=/product/${productId}`;
      return;
    }
    
    if (response.ok) {
      // Update the button to "Go to Cart"
      const addToCartBtn = document.querySelector(`button[onclick="addToCart('${productId}')"]`);
      addToCartBtn.innerHTML = `
        <i class="fas fa-shopping-bag mr-2"></i>
        Go to Cart
      `;
      addToCartBtn.onclick = () => window.location.href = '/cart';
      addToCartBtn.classList.remove('bg-black', 'hover:bg-gray-800');
      addToCartBtn.classList.add('bg-green-600', 'hover:bg-green-700');
      
      Swal.fire({
        icon: 'success',
        title: 'Added to Cart',
        text: data.message,
        toast: true,
        position: 'top-end',
        showConfirmButton: false,
        timer: 2000
      });
    
      // Update cart count in navbar
      const cartCountElement = document.querySelector('.cart-count');
      if (cartCountElement) {
        cartCountElement.textContent = data.cartCount;
      }
    } else {
      // If the error is about quantity limit, show toast alert
      if (data.message.includes('Maximum limit')) {
        Swal.fire({
          title: 'Maximum Quantity Reached',
          text: data.message ,
          icon: 'warning',
          toast: true,
          position: 'top-end',
          showConfirmButton: true,
          showCancelButton: true,
          confirmButtonText: 'View Cart',
          cancelButtonText: 'Close',
          timer: 5000,
          timerProgressBar: true,
          customClass: {
            popup: 'rounded-lg shadow-md',
            title: 'text-gray-800 font-semibold',
            htmlContainer: 'text-gray-600',
            actions: 'space-x-2',
            confirmButton: 'bg-black hover:bg-gray-800 text-white px-4 py-2 rounded-lg text-sm transition-colors',
            cancelButton: 'bg-gray-100 hover:bg-gray-200 text-gray-800 px-4 py-2 rounded-lg text-sm transition-colors'
          },
          buttonsStyling: false,
          showClass: {
            popup: 'animate__animated animate__fadeInRight animate__faster'
          },
          hideClass: {
            popup: 'animate__animated animate__fadeOutRight animate__faster'
          }
        }).then((result) => {
          if (result.isConfirmed) {
            window.location.href = '/cart';
          }
        });
      } else {
        throw new Error(data.message);
      }
    }
  } catch (error) {
    console.error('Error:', error);
    Swal.fire({
      icon: 'error',
      title: 'Error',
      text: error.message || 'Failed to add to cart',
      toast: true,
      position: 'top-end',
      showConfirmButton: false,
      timer: 3000
    });
  
  }
}

 // Add to wishlist functionality
 async function addToWishlist(productId) {
  try {
    const response = await fetch('/wishlist/add', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ productId })
    });

    if (response.ok) {
      Swal.fire({
        icon: 'success',
        title: 'Added to Wishlist',
        timer: 1500,
        showConfirmButton: true
      });
    } else {
      const data = await response.json();
      throw new Error(data.message);
    }
  } catch (error) {
    Swal.fire({
      icon: 'error',
      title: 'Error',
      text: error.message || 'Failed to add to wishlist'
    });
  }
}

async function toggleWishlist(productId) {
  try {
      const wishlistBtn = document.querySelector(`#wishlist-btn-${productId} i`);
      const isInWishlist = wishlistBtn.classList.contains('fas');

      let response;
      if (isInWishlist) {
          response = await fetch(`/wishlist/remove/${productId}`, {
              method: 'DELETE'
          });
      } else {
          response = await fetch('/wishlist/add', {
              method: 'POST',
              headers: {
                  'Content-Type': 'application/json'
              },
              body: JSON.stringify({ productId })
          });
      }

      const data = await response.json();

      if (!response.ok) {
          // If not authenticated, redirect to login
          if (response.status === 401) {
              window.location.href = '/login?returnTo=' + window.location.pathname;
              return;
          }
          throw new Error(data.message);
      }

      if (data.success) {
          if (isInWishlist) {
              wishlistBtn.classList.replace('fas', 'far');
              wishlistBtn.classList.remove('text-red-500');
              
              Swal.fire({
                  icon: 'success',
                  title: 'Removed from wishlist',
                  toast: true,
                  position: 'top-end',
                  showConfirmButton: false,
                  timer: 2000
              });
          } else {
              wishlistBtn.classList.replace('far', 'fas');
              wishlistBtn.classList.add('text-red-500');
              
              Swal.fire({
                  icon: 'success',
                  title: 'Added to wishlist',
                  toast: true,
                  position: 'top-end',
                  showConfirmButton: false,
                  timer: 2000
              });
          }
      }
  } catch (error) {
      console.error('Wishlist toggle error:', error);
      Swal.fire({
          icon: 'error',
          title: 'Error',
          text: error.message || 'Error updating wishlist',
          toast: true,
          position: 'top-end',
          showConfirmButton: false,
          timer: 3000
      });
  }
}

// Check initial wishlist status when page loads

document.addEventListener('DOMContentLoaded', async () => {
  try {
      // Get the wishlist button
      const wishlistBtn = document.querySelector(`#wishlist-btn-${productId} i`);
      if (!wishlistBtn) return; // Exit if button doesn't exist

      const response = await fetch(`/wishlist/check/${productId}`);
      const data = await response.json();

      if (response.ok) {
          if (data.success && data.isInWishlist) {
              wishlistBtn.classList.replace('far', 'fas');
              wishlistBtn.classList.add('text-red-500');
          }
      } else {
          console.log('Failed to check wishlist status:', data.message);
      }
  } catch (error) {
      console.error('Error checking wishlist status:', error);
  }
});


