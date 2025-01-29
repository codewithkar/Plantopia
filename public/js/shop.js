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
    searchForm: document.getElementById('searchForm')
  };

  
   // Add search form handler
   if (elements.searchForm) {
    elements.searchForm.addEventListener('submit', function(e) {
      e.preventDefault();
      const searchInput = this.querySelector('input[name="q"]');
      const searchQuery = searchInput.value.trim();
      
      if (searchQuery) {
        fetch(`/shop/search?q=${encodeURIComponent(searchQuery)}`)
          .then(response => response.json())
          .then(products => {
            renderProducts(products);
          })
          .catch(error => {
            console.error('Search Error:', error);
            showError('Failed to perform search');
          });
      }
    });
  }



  function applyFilters() {
    const queryParams = new URLSearchParams({
      sortBy: elements.sortFilter.value ,
      category: elements.catTypeFilter.value ,
      size: elements.sizeFilter.value ,
      minPrice: elements.minPriceInput.value ,
      maxPrice: elements.maxPriceInput.value ,
      stockStatus: elements.stockFilter.value 
    });
  
    fetch(`/shop/filtered?${queryParams.toString()}`)
      .then(response =>  response.json())
      .then(products => {
        renderProducts(products);
      })
      .catch(error => {
        console.error('Fetch Error:', error);
      });
  }
  
  function renderProducts(products) {
    if (!products || products.length === 0) {
      elements.productGrid.innerHTML = '<p>No products found matching your criteria.</p>';
      return;
    }
    elements.productGrid.innerHTML = products.map(product => `
      <a href="/product/${product._id}">
        <div class="product-card bg-white p-3 rounded-lg shadow-md animate-slideUp">
          <img src="${product.imageUrl[0]}" alt="${product.productName}" class="product-image w-full h-48 object-cover rounded-md mb-4"/>
          <h3 class="text-lg font-semibold text-gray-800">${product.productName}</h3>
          <p class="text-xl font-bold text-green-600 price-highlight">Price: ₹${product.price}</p>
          <p class="text-lg font-semibold text-gray-800">${product.stock > 0 ? 'In Stock' : 'Out of Stock'}</p>
         
        </div>
      </a>
    `).join(''); 
  }

  // Event listeners for filters
  [elements.sortFilter, elements.catTypeFilter, elements.sizeFilter, elements.stockFilter, elements.minPriceInput, elements.maxPriceInput].forEach(filter => {
    filter.addEventListener('change', applyFilters);
  });

  // Reset filters
  elements.resetButton.addEventListener('click', () => {
    elements.sortFilter.value = 'default';
    elements.catTypeFilter.value = 'All';
    elements.sizeFilter.value = 'All';
    elements.minPriceInput.value = '';
    elements.maxPriceInput.value = '';
    elements.stockFilter.value = 'All';
    applyFilters();
  });

  // Initial load
  applyFilters();
});