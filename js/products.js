/* =============================================
   ZERO COLLECTION — Product Data Store
   ============================================= */

let PRODUCTS = [];
let isProductsLoaded = false;
const loadedCallbacks = [];

function onProductsLoaded(callback) {
  if (isProductsLoaded) {
    callback();
  } else {
    loadedCallbacks.push(callback);
  }
}

// Fetch products from backend API
fetch('/api/products')
  .then(res => {
    if (!res.ok) throw new Error('HTTP error ' + res.status);
    return res.json();
  })
  .then(data => {
    PRODUCTS.length = 0; // Clear array
    PRODUCTS.push(...data);
    isProductsLoaded = true;
    document.dispatchEvent(new CustomEvent('productsLoaded'));
    while (loadedCallbacks.length > 0) {
      const cb = loadedCallbacks.shift();
      try { cb(); } catch (e) { console.error(e); }
    }
  })
  .catch(err => {
    console.error('Error fetching dynamic products:', err);
    // Fallback: try loading from localStorage or static fail
    isProductsLoaded = true;
    document.dispatchEvent(new CustomEvent('productsLoaded'));
  });

/* ── Helper Functions ── */

function getProductById(id) {
  return PRODUCTS.find(p => p.id === id) || null;
}

function getProductsByCategory(category) {
  return PRODUCTS.filter(p => p.category === category);
}

function getSaleProducts() {
  return PRODUCTS.filter(p => p.onSale);
}

function getFeaturedProducts() {
  return PRODUCTS.filter(p => p.featured);
}

function getRelatedProducts(productId, limit = 4) {
  const product = getProductById(productId);
  if (!product) return [];
  return PRODUCTS
    .filter(p => p.id !== productId && p.category === product.category)
    .slice(0, limit)
    .concat(
      PRODUCTS.filter(p => p.id !== productId && p.category !== product.category)
    )
    .slice(0, limit);
}

function formatPrice(price) {
  return 'PKR ' + price.toLocaleString('en-PK');
}

function getDisplayPrice(product) {
  return product.onSale && product.salePrice ? product.salePrice : product.price;
}

function getDiscountPercent(product) {
  if (!product.onSale || !product.salePrice) return 0;
  return Math.round(((product.price - product.salePrice) / product.price) * 100);
}

function sortProducts(products, sortBy) {
  const sorted = [...products];
  switch (sortBy) {
    case 'price-low':
      return sorted.sort((a, b) => getDisplayPrice(a) - getDisplayPrice(b));
    case 'price-high':
      return sorted.sort((a, b) => getDisplayPrice(b) - getDisplayPrice(a));
    case 'newest':
      return sorted.sort((a, b) => new Date(b.dateAdded) - new Date(a.dateAdded));
    case 'featured':
    default:
      return sorted.sort((a, b) => (b.featured ? 1 : 0) - (a.featured ? 1 : 0));
  }
}

function filterBySize(products, size) {
  if (!size || size === 'all') return products;
  return products.filter(p => p.sizes.includes(size));
}
