// shop.js
document.addEventListener('DOMContentLoaded', () => {
  const elements = {
      sortFilter: document.getElementById('sortFilter'),
      catTypeFilter: document.getElementById('catType'),
      sizeFilter: document.getElementById('size'),
      minPriceInput: document.getElementById('minPrice'),
      maxPriceInput: document.getElementById('maxPrice'),
      stockFilter: document.getElementById('stockFilter'),
      resetButton: document.getElementById('resetButton'),
      productGrid: document.getElementById('productGrid'),
      searchForm: document.getElementById('searchForm'),
      paginationContainer: document.getElementById('pagination')
  };

  let currentPage = 1;
  let debounceTimer;

  // Function to update URL parameters
  function updateURLParameters(params) {
      const url = new URL(window.location);
      Object.entries(params).forEach(([key, value]) => {
          if (value) {
              url.searchParams.set(key, value);
          } else {
              url.searchParams.delete(key);
          }
      });
      window.history.pushState({}, '', url);
  }

  // Debounced filter function
  function debounceFilters(func, delay) {
      clearTimeout(debounceTimer);
      debounceTimer = setTimeout(func, delay);
  }

  // Function to fetch and render products
  async function fetchProducts(page = 1) {
      const queryParams = new URLSearchParams({
          page: page,
          sortBy: elements.sortFilter.value,
          category: elements.catTypeFilter.value,
          size: elements.sizeFilter.value,
          minPrice: elements.minPriceInput.value,
          maxPrice: elements.maxPriceInput.value,
          stockStatus: elements.stockFilter.value,
          q: new URLSearchParams(window.location.search).get('q') || ''
      });

      try {
          const response = await fetch(`/shop?${queryParams.toString()}`, {
              headers: {
                  'X-Requested-With': 'XMLHttpRequest'
              }
          });
          const data = await response.json();
          renderProducts(data.products);
          renderPagination(data.pagination);
          updateURLParameters(Object.fromEntries(queryParams));
      } catch (error) {
          console.error('Error fetching products:', error);
          showError('Failed to load products');
      }
  }

  // Render products function
  function renderProducts(products) {
      if (!products || products.length === 0) {
          elements.productGrid.innerHTML = `
              <div class="col-span-full text-center py-8">
                  <p class="text-gray-500">No products found matching your criteria.</p>
              </div>`;
          return;
      }

      elements.productGrid.innerHTML = products.map(product => `
          <a href="/product/${product._id}" 
             class="bg-white rounded-lg overflow-hidden shadow-sm hover:shadow-md transition-all duration-300 relative">
              <div class="relative aspect-[4/5] overflow-hidden">
                  <img
                      src="${product.imageUrl[0]}"
                      alt="${product.productName}"
                      class="w-full h-full object-cover hover:scale-105 transition-transform duration-300 ${product.stock === 0 ? 'opacity-60' : ''}"
                      loading="lazy"
                  >
                  ${product.hasDiscount ? `
                      <div class="absolute top-2 right-2 bg-red-500 text-white px-2 py-0.5 rounded text-xs font-medium">
                          -${product.discountPercentage}%
                      </div>
                  ` : ''}
                  ${product.stock === 0 ? `
                      <div class="absolute inset-0 flex items-center justify-center">
                          <span class="bg-black bg-opacity-75 text-white px-3 py-1.5 rounded-full text-sm font-medium">
                              Out of Stock
                          </span>
                      </div>
                  ` : ''}
              </div>
              <div class="p-2">
                  <h2 class="text-gray-800 text-sm font-medium truncate">
                      ${product.productName}
                  </h2>
                  <div class="flex items-baseline gap-1 mt-1">
                      <span class="text-base font-bold text-gray-900">₹${product.discountPrice}</span>
                      ${product.hasDiscount ? `
                          <span class="text-xs text-gray-500 line-through">₹${product.price}</span>
                      ` : ''}
                  </div>
              </div>
          </a>
      `).join('');
  }

  // Render pagination function
  function renderPagination({ currentPage, totalPages, hasNextPage, hasPrevPage }) {
      elements.paginationContainer.innerHTML = `
          <div class="flex justify-center space-x-2 mt-8">
              ${hasPrevPage ? `
                  <button 
                      class="px-4 py-2 bg-gray-200 rounded hover:bg-gray-300" 
                      onclick="changePage(${currentPage - 1})"
                  >
                      Previous
                  </button>
              ` : ''}
              
              <span class="px-4 py-2">
                  Page ${currentPage} of ${totalPages}
              </span>
              
              ${hasNextPage ? `
                  <button 
                      class="px-4 py-2 bg-gray-200 rounded hover:bg-gray-300" 
                      onclick="changePage(${currentPage + 1})"
                  >
                      Next
                  </button>
              ` : ''}
          </div>
      `;
  }

  // Event listeners
  if (elements.searchForm) {
      elements.searchForm.addEventListener('submit', function(e) {
          e.preventDefault();
          currentPage = 1;
          fetchProducts(currentPage);
      });
  }

  // Filter change handlers
  [elements.sortFilter, elements.catTypeFilter, elements.sizeFilter, elements.stockFilter].forEach(filter => {
      filter.addEventListener('change', () => {
          currentPage = 1;
          fetchProducts(currentPage);
      });
  });

  // Price input handlers with debounce
  [elements.minPriceInput, elements.maxPriceInput].forEach(input => {
      input.addEventListener('input', () => {
          debounceFilters(() => {
              currentPage = 1;
              fetchProducts(currentPage);
          }, 500);
      });
  });

  // Reset filters
  elements.resetButton.addEventListener('click', () => {
      elements.sortFilter.value = 'default';
      elements.catTypeFilter.value = 'All';
      elements.sizeFilter.value = 'All';
      elements.minPriceInput.value = '';
      elements.maxPriceInput.value = '';
      elements.stockFilter.value = 'All';
      currentPage = 1;
      fetchProducts(currentPage);
  });

  // Page change function
  window.changePage = (page) => {
      currentPage = page;
      fetchProducts(page);
      window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  // Initial load
  fetchProducts(currentPage);
});






// document.addEventListener('DOMContentLoaded', () => {
//   const elements = {
//     sortFilter: document.getElementById('sortFilter'),
//     catTypeFilter: document.getElementById('catType'),
//     sizeFilter: document.getElementById('size'),
//     minPriceInput: document.getElementById('minPrice'),
//     maxPriceInput: document.getElementById('maxPrice'),
//     stockFilter: document.getElementById('stockFilter'),
//     resetButton: document.getElementById('resetButton'), 
//     productGrid: document.getElementById('productGrid'),
//     searchForm: document.getElementById('searchForm')
//   };

  
//    // Add search form handler
//    if (elements.searchForm) {
//     elements.searchForm.addEventListener('submit', function(e) {
//       e.preventDefault();
//       const searchInput = this.querySelector('input[name="q"]');
//       const searchQuery = searchInput.value.trim();
      
//       if (searchQuery) {
//         fetch(`/shop/search?q=${encodeURIComponent(searchQuery)}`)
//           .then(response => response.json())
//           .then(products => {
//             renderProducts(products);
//           })
//           .catch(error => {
//             console.error('Search Error:', error);
//             showError('Failed to perform search');
//           });
//       }
//     });
//   }



//   function applyFilters() {
//     const queryParams = new URLSearchParams({
//       sortBy: elements.sortFilter.value ,
//       category: elements.catTypeFilter.value ,
//       size: elements.sizeFilter.value ,
//       minPrice: elements.minPriceInput.value ,
//       maxPrice: elements.maxPriceInput.value ,
//       stockStatus: elements.stockFilter.value 
//     });
  
//     fetch(`/shop/filtered?${queryParams.toString()}`)
//       .then(response =>  response.json())
//       .then(products => {
//         renderProducts(products);
//       })
//       .catch(error => {
//         console.error('Fetch Error:', error);
//       });
//   }
  
//   function renderProducts(products) {
//     if (!products || products.length === 0) {
//       elements.productGrid.innerHTML = '<p>No products found matching your criteria.</p>';
//       return;
//     }
//     productGrid.innerHTML = productsToRender.map(product => `
//       <a href="/product/${product._id}" 
//          class="bg-white rounded-lg overflow-hidden shadow-sm hover:shadow-md transition-all duration-300 relative">
//           <div class="relative aspect-[4/5] overflow-hidden">
//               <img
//                   src="${product.imageUrl[0]}"
//                   alt="${product.productName}"
//                   class="w-full h-full object-cover hover:scale-105 transition-transform duration-300 ${product.stock === 0 ? 'opacity-60' : ''}"
//                   loading="lazy"
//               >
//               ${product.discountPrice < product.price ? `
//                   <div class="absolute top-2 right-2 bg-red-500 text-white px-2 py-0.5 rounded text-xs font-medium">
//                       -${Math.round((product.price - product.discountPrice) / product.price * 100)}%
//                   </div>
//               ` : ''}
//               ${product.stock === 0 ? `
//                   <div class="absolute inset-0 flex items-center justify-center">
//                       <span class="bg-black bg-opacity-75 text-white px-3 py-1.5 rounded-full text-sm font-medium">
//                           Out of Stock
//                       </span>
//                   </div>
//               ` : ''}
//           </div>
//           <div class="p-2">
//               <h2 class="text-gray-800 text-sm font-medium truncate">
//                   ${product.productName}
//               </h2>
//               <div class="flex items-baseline gap-1 mt-1">
//                   <span class="text-base font-bold text-gray-900">₹${product.discountPrice}</span>
//                   ${product.discountPrice < product.price ? `
//                       <span class="text-xs text-gray-500 line-through">₹${product.price}</span>
//                   ` : ''}
//               </div>
//           </div>
//       </a>
//   `).join('');
// }

//   // Event listeners for filters
//   [elements.sortFilter, elements.catTypeFilter, elements.sizeFilter, elements.stockFilter, elements.minPriceInput, elements.maxPriceInput].forEach(filter => {
//     filter.addEventListener('change', applyFilters);
//   });

//   // Reset filters
//   elements.resetButton.addEventListener('click', () => {
//     elements.sortFilter.value = 'default';
//     elements.catTypeFilter.value = 'All';
//     elements.sizeFilter.value = 'All';
//     elements.minPriceInput.value = '';
//     elements.maxPriceInput.value = '';
//     elements.stockFilter.value = 'All';
//     applyFilters();
//   });

//   // Initial load
//   applyFilters();
// });