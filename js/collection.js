/* =============================================
   ZERO COLLECTION — Collection Page Rendering & Filters
   ============================================= */

document.addEventListener('DOMContentLoaded', () => {
  if (typeof onProductsLoaded === 'function') {
    onProductsLoaded(initCollectionPage);
  } else {
    initCollectionPage();
  }
});

function initCollectionPage() {
  const grid = document.getElementById('productGrid');
  if (!grid) return; // Not a collection page

  // Determine current category based on URL or global page attribute
  // E.g., if path is /shirts.html, category is shirts
  const path = window.location.pathname;
  let category = '';
  
  if (path.includes('shirts.html')) category = 'shirts';
  else if (path.includes('hoodies.html')) category = 'hoodies';
  else if (path.includes('jackets.html')) category = 'jackets';
  else if (path.includes('tshirts.html')) category = 'tshirts';
  else if (path.includes('sale.html')) category = 'sale';

  // Get active query parameters
  const urlParams = new URLSearchParams(window.location.search);
  let currentSort = urlParams.get('sort') || 'featured';
  let currentSize = urlParams.get('size') || 'all';
  let searchQuery = urlParams.get('search') || '';

  // Setup UI elements with initial states from URL
  const sortSelect = document.getElementById('sortSelect');
  if (sortSelect) {
    sortSelect.value = currentSort;
    sortSelect.addEventListener('change', (e) => {
      currentSort = e.target.value;
      updateUrlAndRender();
    });
  }

  // Size filters could be a select or a list of buttons
  const sizeSelect = document.getElementById('sizeSelect');
  if (sizeSelect) {
    sizeSelect.value = currentSize;
    sizeSelect.addEventListener('change', (e) => {
      currentSize = e.target.value;
      updateUrlAndRender();
    });
  } else {
    // Check for pill buttons
    const sizePills = document.querySelectorAll('.filter-size-pill');
    sizePills.forEach(pill => {
      if (pill.dataset.size === currentSize) {
        pill.classList.add('active');
      }
      pill.addEventListener('click', () => {
        sizePills.forEach(p => p.classList.remove('active'));
        pill.classList.add('active');
        currentSize = pill.dataset.size;
        updateUrlAndRender();
      });
    });
  }

  // If there was a search parameter, set search input value if visible
  const pageSearchInput = document.getElementById('pageSearchInput');
  if (pageSearchInput && searchQuery) {
    pageSearchInput.value = searchQuery;
    pageSearchInput.addEventListener('input', (e) => {
      searchQuery = e.target.value.trim();
      updateUrlAndRender();
    });
  }

  // Initial render
  renderProducts();

  function updateUrlAndRender() {
    const newParams = new URLSearchParams();
    if (currentSort !== 'featured') newParams.set('sort', currentSort);
    if (currentSize !== 'all') newParams.set('size', currentSize);
    if (searchQuery) newParams.set('search', searchQuery);

    const newSearchString = newParams.toString();
    const newUrl = `${window.location.pathname}${newSearchString ? '?' + newSearchString : ''}`;
    window.history.replaceState({}, '', newUrl);
    
    renderProducts();
  }

  function renderProducts() {
    if (typeof PRODUCTS === 'undefined') {
      grid.innerHTML = '<p class="text-center font-bold">Error loading products.</p>';
      return;
    }

    // Step 1: Base category filtering
    let items = [];
    if (category === 'sale') {
      items = getSaleProducts();
    } else if (category) {
      items = getProductsByCategory(category);
    } else {
      items = [...PRODUCTS]; // All products (default fallback)
    }

    // Step 2: Search Query filtering if active
    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      items = items.filter(item => 
        item.name.toLowerCase().includes(q) ||
        item.category.toLowerCase().includes(q) ||
        (item.description && item.description.toLowerCase().includes(q))
      );
    }

    // Step 3: Size filtering
    if (currentSize !== 'all') {
      items = filterBySize(items, currentSize);
    }

    // Step 4: Sorting
    items = sortProducts(items, currentSort);

    // Update product count label if it exists
    const countLabel = document.getElementById('productCountLabel');
    if (countLabel) {
      countLabel.textContent = `${items.length} ${items.length === 1 ? 'PRODUCT' : 'PRODUCTS'}`;
    }

    // Render Grid HTML
    if (items.length === 0) {
      grid.innerHTML = `
        <div style="grid-column: 1 / -1; text-align: center; padding: 80px 24px;">
          <p class="uppercase font-bold mb-16" style="font-size: 1.2rem; letter-spacing: 0.1em;">No Products Found</p>
          <p style="color: var(--color-grey-dark);">Try adjusting your filter or search terms.</p>
        </div>
      `;
      return;
    }

    let gridHtml = '';
    items.forEach(product => {
      const isSale = product.onSale && product.salePrice;
      const originalPriceFormatted = formatPrice(product.price);
      const displayPriceFormatted = formatPrice(isSale ? product.salePrice : product.price);
      const badgeHtml = isSale ? `<span class="badge badge-sale product-card-badge">SALE</span>` : '';
      
      const priceDisplayHtml = isSale 
        ? `<span class="product-card-compare-price">${originalPriceFormatted}</span>
           <span class="product-card-price">${displayPriceFormatted}</span>`
        : `<span class="product-card-price">${displayPriceFormatted}</span>`;

      // Select default size for quick add
      const defaultSize = product.sizes[0] || 'M';

      gridHtml += `
        <article class="product-card">
          <div class="product-card-image-wrapper img-zoom-container">
            <a href="product.html?id=${product.id}">
              <img src="${product.images[0]}" alt="${product.name}" class="product-card-image" loading="lazy">
            </a>
            ${badgeHtml}
            <div class="product-card-hover-actions">
              <button class="btn btn-primary btn-full btn-sm uppercase" onclick="event.preventDefault(); addToCart('${product.id}', '${defaultSize}', 1)">
                Add To Cart
              </button>
            </div>
          </div>
          <div class="product-card-info">
            <span class="product-card-category">${product.category}</span>
            <h3 class="product-card-title uppercase">
              <a href="product.html?id=${product.id}">${product.name}</a>
            </h3>
            <div class="product-card-price-wrapper">
              ${priceDisplayHtml}
            </div>
            ${product.gsm ? `<div class="product-card-gsm">${product.gsm}</div>` : ''}
          </div>
        </article>
      `;
    });

    grid.innerHTML = gridHtml;
  }
}
