/* =============================================
   ZERO COLLECTION — Product Detail Page Rendering
   ============================================= */

let currentSelectedSize = '';
let currentSelectedQty = 1;
let activeProduct = null;

document.addEventListener('DOMContentLoaded', () => {
  if (typeof onProductsLoaded === 'function') {
    onProductsLoaded(initProductPage);
  } else {
    initProductPage();
  }
});

function initProductPage() {
  const container = document.getElementById('productDetailPage');
  if (!container) return; // Not on the product detail page

  if (typeof PRODUCTS === 'undefined') {
    container.innerHTML = '<div class="container section text-center font-bold">Error loading database.</div>';
    return;
  }

  // Get product ID from URL
  const urlParams = new URLSearchParams(window.location.search);
  const productId = urlParams.get('id');

  if (!productId) {
    window.location.href = 'index.html';
    return;
  }

  activeProduct = getProductById(productId);

  if (!activeProduct) {
    container.innerHTML = `
      <div class="container section text-center" style="padding: 100px 24px;">
        <h2 class="uppercase mb-24">Product Not Found</h2>
        <p class="mb-32">The product you are looking for does not exist or has been removed.</p>
        <a href="index.html" class="btn btn-primary">Back To Home</a>
      </div>
    `;
    return;
  }

  // Update Page Title and Meta Description for SEO
  document.title = `${activeProduct.name.toUpperCase()} — ZERO COLLECTION`;
  const metaDesc = document.querySelector('meta[name="description"]');
  if (metaDesc) {
    metaDesc.setAttribute('content', activeProduct.description || `Buy ${activeProduct.name} at Zero Collection Pakistan.`);
  }

  renderProductDetails(activeProduct);
  setupGallery(activeProduct);
  setupSizeSelector(activeProduct);
  setupQtySelector();
  setupActionButtons(activeProduct);
  renderRelatedProductsGrid(activeProduct);
}

function renderProductDetails(product) {
  // Populate Breadcrumb
  const categoryLink = document.getElementById('breadcrumbCategory');
  const productTitleBreadcrumb = document.getElementById('breadcrumbProduct');
  if (categoryLink) {
    categoryLink.textContent = product.category;
    categoryLink.setAttribute('href', `${product.category}.html`);
  }
  if (productTitleBreadcrumb) {
    productTitleBreadcrumb.textContent = product.name;
  }

  // Populate Name, Description, Specs
  const titleEl = document.getElementById('productTitle');
  const descEl = document.getElementById('productDescription');
  const fitEl = document.getElementById('productFit');
  const gsmEl = document.getElementById('productGsm');
  
  if (titleEl) titleEl.textContent = product.name;
  if (descEl) descEl.textContent = product.description;
  if (fitEl) fitEl.textContent = product.fit || 'Regular Fit';
  if (gsmEl) gsmEl.textContent = product.gsm || 'Cotton fleece blend';

  // Render Features list
  const featuresList = document.getElementById('productFeaturesList');
  if (featuresList && product.features) {
    featuresList.innerHTML = product.features.map(feat => `<li>${feat}</li>`).join('');
  }

  // Populate Prices
  const priceWrapper = document.getElementById('productPriceWrapper');
  if (priceWrapper) {
    const isSale = product.onSale && product.salePrice;
    const originalPriceFormatted = formatPrice(product.price);
    const displayPriceFormatted = formatPrice(isSale ? product.salePrice : product.price);

    if (isSale) {
      priceWrapper.innerHTML = `
        <span class="compare-price" style="font-size: 1.2rem; text-decoration: line-through; color: var(--color-grey); margin-right: 12px;">${originalPriceFormatted}</span>
        <span class="current-price" style="font-size: 1.8rem; font-weight: 800; color: var(--color-black);">${displayPriceFormatted}</span>
        <span class="sale-percentage-tag" style="background-color: var(--color-black); color: var(--color-white); font-size: 0.75rem; font-weight: 700; padding: 4px 8px; margin-left: 12px; vertical-align: middle; text-transform: uppercase;">
          -${getDiscountPercent(product)}% OFF
        </span>
      `;
    } else {
      priceWrapper.innerHTML = `
        <span class="current-price" style="font-size: 1.8rem; font-weight: 800; color: var(--color-black);">${displayPriceFormatted}</span>
      `;
    }
  }
}

// ── Multi-image Gallery Setup ──
function setupGallery(product) {
  const mainImg = document.getElementById('productMainImage');
  const thumbnailsContainer = document.getElementById('productThumbnails');
  
  if (!mainImg || !thumbnailsContainer) return;

  // Set initial main image
  mainImg.src = product.images[0];
  mainImg.alt = product.name;

  // Render thumbnails
  if (product.images.length > 1) {
    let thumbsHtml = '';
    product.images.forEach((imgSrc, idx) => {
      thumbsHtml += `
        <div class="gallery-thumbnail ${idx === 0 ? 'active' : ''}" data-index="${idx}" style="cursor: pointer; border: 1px solid ${idx === 0 ? 'var(--color-black)' : 'var(--color-grey-light)'}; overflow: hidden; aspect-ratio: 1/1; width: 70px;">
          <img src="${imgSrc}" alt="${product.name} Thumbnail" style="width:100%; height:100%; object-fit:cover;">
        </div>
      `;
    });
    thumbnailsContainer.innerHTML = thumbsHtml;

    // Handle thumbnail clicks
    const thumbs = thumbnailsContainer.querySelectorAll('.gallery-thumbnail');
    thumbs.forEach(thumb => {
      thumb.addEventListener('click', () => {
        thumbs.forEach(t => {
          t.classList.remove('active');
          t.style.borderColor = 'var(--color-grey-light)';
        });
        thumb.classList.add('active');
        thumb.style.borderColor = 'var(--color-black)';
        const index = parseInt(thumb.dataset.index);
        mainImg.src = product.images[index];
      });
    });
  } else {
    thumbnailsContainer.innerHTML = ''; // Hide thumbnails list if only 1 image
  }
}

// ── Size Pill Selectors ──
function setupSizeSelector(product) {
  const container = document.getElementById('productSizeSelector');
  if (!container) return;

  let sizeHtml = '';
  product.sizes.forEach(size => {
    sizeHtml += `
      <button class="size-pill-btn" data-size="${size}" style="min-width: 44px; height: 44px; border: 1px solid var(--color-black); background-color: var(--color-white); color: var(--color-black); font-size: 0.85rem; font-weight: 700; transition: all var(--transition-speed); cursor: pointer; display: flex; align-items: center; justify-content: center; padding: 0 12px; margin-right: 8px; margin-bottom: 8px;">
        ${size}
      </button>
    `;
  });
  container.innerHTML = sizeHtml;

  const sizeBtns = container.querySelectorAll('.size-pill-btn');
  sizeBtns.forEach(btn => {
    btn.addEventListener('click', () => {
      sizeBtns.forEach(b => {
        b.style.backgroundColor = 'var(--color-white)';
        b.style.color = 'var(--color-black)';
      });
      btn.style.backgroundColor = 'var(--color-black)';
      btn.style.color = 'var(--color-white)';
      currentSelectedSize = btn.dataset.size;

      // Clear error validation if visible
      const errorMsg = document.getElementById('sizeSelectionError');
      if (errorMsg) errorMsg.style.display = 'none';
    });
  });
}

// ── Quantity Adjuster ──
function setupQtySelector() {
  const minusBtn = document.getElementById('qtyMinusBtn');
  const plusBtn = document.getElementById('qtyPlusBtn');
  const valDisplay = document.getElementById('qtyVal');

  if (!minusBtn || !plusBtn || !valDisplay) return;

  currentSelectedQty = 1;
  valDisplay.textContent = currentSelectedQty;

  minusBtn.addEventListener('click', () => {
    if (currentSelectedQty > 1) {
      currentSelectedQty--;
      valDisplay.textContent = currentSelectedQty;
    }
  });

  plusBtn.addEventListener('click', () => {
    currentSelectedQty++;
    valDisplay.textContent = currentSelectedQty;
  });
}

// ── Cart / checkout Action Button Hooks ──
function setupActionButtons(product) {
  const addBtn = document.getElementById('addToCartDetailBtn');
  const buyBtn = document.getElementById('buyNowDetailBtn');
  const errorMsg = document.getElementById('sizeSelectionError');

  if (addBtn) {
    addBtn.addEventListener('click', () => {
      if (!currentSelectedSize) {
        if (errorMsg) {
          errorMsg.textContent = 'Please select a size before adding to cart.';
          errorMsg.style.display = 'block';
        } else {
          alert('Please select a size.');
        }
        return;
      }
      
      addToCart(product.id, currentSelectedSize, currentSelectedQty);
    });
  }

  if (buyBtn) {
    buyBtn.addEventListener('click', () => {
      if (!currentSelectedSize) {
        if (errorMsg) {
          errorMsg.textContent = 'Please select a size before checking out.';
          errorMsg.style.display = 'block';
        } else {
          alert('Please select a size.');
        }
        return;
      }

      // Add to cart silently (no opening drawer) and redirect to checkout
      if (typeof addToCart === 'function') {
        addToCart(product.id, currentSelectedSize, currentSelectedQty);
        // Delay redirect slightly to ensure state is saved
        setTimeout(() => {
          window.location.href = 'checkout.html';
        }, 100);
      }
    });
  }
}

// ── Related Products Grid ──
function renderRelatedProductsGrid(product) {
  const grid = document.getElementById('relatedProductsGrid');
  if (!grid) return;

  const related = getRelatedProducts(product.id, 4);

  if (related.length === 0) {
    grid.innerHTML = '<p style="grid-column: 1/-1; text-align:center; color: var(--color-grey);">No related products found.</p>';
    return;
  }

  let html = '';
  related.forEach(item => {
    const isSale = item.onSale && item.salePrice;
    const originalPriceFormatted = formatPrice(item.price);
    const displayPriceFormatted = formatPrice(isSale ? item.salePrice : item.price);
    const badgeHtml = isSale ? `<span class="badge badge-sale product-card-badge">SALE</span>` : '';
    
    const priceDisplayHtml = isSale 
      ? `<span class="product-card-compare-price">${originalPriceFormatted}</span>
         <span class="product-card-price">${displayPriceFormatted}</span>`
      : `<span class="product-card-price">${displayPriceFormatted}</span>`;

    html += `
      <article class="product-card">
        <div class="product-card-image-wrapper img-zoom-container">
          <a href="product.html?id=${item.id}">
            <img src="${item.images[0]}" alt="${item.name}" class="product-card-image" loading="lazy">
          </a>
          ${badgeHtml}
        </div>
        <div class="product-card-info">
          <span class="product-card-category">${item.category}</span>
          <h3 class="product-card-title uppercase">
            <a href="product.html?id=${item.id}">${item.name}</a>
          </h3>
          <div class="product-card-price-wrapper">
            ${priceDisplayHtml}
          </div>
          ${item.gsm ? `<div class="product-card-gsm">${item.gsm}</div>` : ''}
        </div>
      </article>
    `;
  });

  grid.innerHTML = html;
}
