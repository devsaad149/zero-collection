/* =============================================
   ZERO COLLECTION — Cart Logic
   ============================================= */

// Initialize Cart State
let cart = [];

// Load cart from localStorage on init
function initCart() {
  const storedCart = localStorage.getItem('zero_collection_cart');
  if (storedCart) {
    try {
      cart = JSON.parse(storedCart);
    } catch (e) {
      console.error('Error parsing cart from localStorage', e);
      cart = [];
    }
  }
  updateCartUI();
}

// Save cart to localStorage
function saveCart() {
  localStorage.setItem('zero_collection_cart', JSON.stringify(cart));
  updateCartUI();
}

// Add item to cart
function addToCart(productId, size, qty = 1) {
  // Get product detail from PRODUCTS array
  if (typeof PRODUCTS === 'undefined') {
    console.error('PRODUCTS database not found');
    return;
  }
  
  const product = PRODUCTS.find(p => p.id === productId);
  if (!product) {
    console.error('Product not found with id: ' + productId);
    return;
  }

  const price = product.onSale && product.salePrice ? product.salePrice : product.price;
  const image = product.images && product.images[0] ? product.images[0] : '';

  // Check if item already exists with same size
  const existingItemIndex = cart.findIndex(item => item.id === productId && item.size === size);

  if (existingItemIndex > -1) {
    cart[existingItemIndex].qty += qty;
  } else {
    cart.push({
      id: productId,
      name: product.name,
      price: price,
      size: size,
      qty: qty,
      image: image,
      category: product.category
    });
  }

  saveCart();
  
  // Open the cart drawer automatically
  openCartDrawer();
  
  // Bounce the cart icon badge
  bounceCartBadge();
}

// Remove item from cart
function removeFromCart(index) {
  if (index >= 0 && index < cart.length) {
    cart.splice(index, 1);
    saveCart();
  }
}

// Update quantity
function updateCartQty(index, newQty) {
  if (index >= 0 && index < cart.length) {
    if (newQty <= 0) {
      removeFromCart(index);
    } else {
      cart[index].qty = newQty;
      saveCart();
    }
  }
}

// Get subtotal
function getCartSubtotal() {
  return cart.reduce((total, item) => total + (item.price * item.qty), 0);
}

// Get shipping (FREE if subtotal >= 2999, else 250 PKR)
function getCartShipping() {
  const subtotal = getCartSubtotal();
  if (subtotal === 0) return 0;
  return subtotal >= 2999 ? 0 : 250;
}

// Get total
function getCartTotal() {
  return getCartSubtotal() + getCartShipping();
}

// Get total item count
function getCartCount() {
  return cart.reduce((count, item) => count + item.qty, 0);
}

// Bounce cart badge
function bounceCartBadge() {
  const badges = document.querySelectorAll('.cart-count');
  badges.forEach(badge => {
    badge.classList.remove('badge-bounce');
    void badge.offsetWidth; // trigger reflow
    badge.classList.add('badge-bounce');
  });
}

// Update Cart Badge and Render Drawer Content
function updateCartUI() {
  // Update badges
  const count = getCartCount();
  const badges = document.querySelectorAll('.cart-count');
  badges.forEach(badge => {
    badge.textContent = count;
  });

  // Render items in drawer
  renderCartDrawerItems();
  
  // Update checkout page if currently on it
  if (window.location.pathname.includes('checkout.html')) {
    if (typeof renderCheckoutSummary === 'function') {
      renderCheckoutSummary();
    }
  }
}

// Render items in Cart Drawer
function renderCartDrawerItems() {
  const container = document.getElementById('cartDrawerItems');
  if (!container) return;

  if (cart.length === 0) {
    container.innerHTML = `
      <div class="cart-empty-message">
        <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
          <circle cx="9" cy="21" r="1"></circle>
          <circle cx="20" cy="21" r="1"></circle>
          <path d="M1 1h4l2.68 13.39a2 2 0 0 0 2 1.61h9.72a2 2 0 0 0 2-1.61L23 6H6"></path>
        </svg>
        <p class="uppercase font-bold mb-16">Your Cart is Empty</p>
        <a href="index.html" class="btn btn-primary btn-sm">Shop Now</a>
      </div>
    `;
    updateCartDrawerSummary(0, 0, 0);
    return;
  }

  let html = '';
  cart.forEach((item, index) => {
    const formattedPrice = 'PKR ' + (item.price * item.qty).toLocaleString('en-PK');
    html += `
      <div class="cart-item">
        <img src="${item.image}" alt="${item.name}" class="cart-item-image">
        <div class="cart-item-details">
          <div>
            <h4 class="cart-item-name uppercase">${item.name}</h4>
            <div class="cart-item-meta">
              <span>SIZE: ${item.size}</span>
            </div>
          </div>
          <div class="flex-between w-full">
            <div class="cart-item-qty-selector">
              <button class="cart-item-qty-btn" onclick="updateCartQty(${index}, ${item.qty - 1})">-</button>
              <div class="cart-item-qty-value">${item.qty}</div>
              <button class="cart-item-qty-btn" onclick="updateCartQty(${index}, ${item.qty + 1})">+</button>
            </div>
            <div class="cart-item-price">${formattedPrice}</div>
          </div>
        </div>
        <button class="cart-item-remove" onclick="removeFromCart(${index})">
          <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <line x1="18" y1="6" x2="6" y2="18"></line>
            <line x1="6" y1="6" x2="18" y2="18"></line>
          </svg>
        </button>
      </div>
    `;
  });

  container.innerHTML = html;

  const subtotal = getCartSubtotal();
  const shipping = getCartShipping();
  const total = getCartTotal();
  updateCartDrawerSummary(subtotal, shipping, total);
}

// Update Cart Drawer Footer Summary
function updateCartDrawerSummary(subtotal, shipping, total) {
  const subtotalEl = document.getElementById('cartDrawerSubtotal');
  const shippingEl = document.getElementById('cartDrawerShipping');
  const totalEl = document.getElementById('cartDrawerTotal');
  const footerEl = document.getElementById('cartDrawerFooter');

  if (cart.length === 0) {
    if (footerEl) footerEl.style.display = 'none';
    return;
  }

  if (footerEl) footerEl.style.display = 'block';

  if (subtotalEl) {
    subtotalEl.textContent = 'PKR ' + subtotal.toLocaleString('en-PK');
  }
  if (shippingEl) {
    shippingEl.textContent = shipping === 0 ? 'FREE' : 'PKR ' + shipping.toLocaleString('en-PK');
  }
  if (totalEl) {
    totalEl.textContent = 'PKR ' + total.toLocaleString('en-PK');
  }
}

// Open/Close Drawer Functions
function openCartDrawer() {
  const drawer = document.getElementById('cartDrawer');
  const overlay = document.getElementById('siteOverlay');
  if (drawer && overlay) {
    drawer.classList.add('active');
    overlay.classList.add('active');
    document.body.style.overflow = 'hidden';
  }
}

function closeCartDrawer() {
  const drawer = document.getElementById('cartDrawer');
  const overlay = document.getElementById('siteOverlay');
  if (drawer && overlay) {
    drawer.classList.remove('active');
    // Keep overlay active if mobile menu or search is open
    const searchDropdown = document.getElementById('searchDropdown');
    const mobileMenu = document.getElementById('mobileMenuOverlay');
    const searchActive = searchDropdown && searchDropdown.classList.contains('active');
    const mobileActive = mobileMenu && mobileMenu.classList.contains('active');
    
    if (!searchActive && !mobileActive) {
      overlay.classList.remove('active');
      document.body.style.overflow = '';
    }
  }
}

// Initialize Cart on page load
document.addEventListener('DOMContentLoaded', () => {
  initCart();
});
