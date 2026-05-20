/* =============================================
   ZERO COLLECTION — Checkout Page Logic
   ============================================= */

document.addEventListener('DOMContentLoaded', () => {
  initCheckoutPage();
});

let appliedPromo = null;

function initCheckoutPage() {
  const checkoutForm = document.getElementById('checkoutForm');
  if (!checkoutForm) return;

  // Retrieve cart from localStorage
  let currentCart = [];
  try {
    const savedCart = localStorage.getItem('zero_collection_cart');
    if (savedCart) {
      currentCart = JSON.parse(savedCart);
    }
  } catch (e) {
    console.error("Error reading cart in checkout initialization:", e);
  }

  // Redirect if cart is empty
  if (currentCart.length === 0) {
    alert('Your cart is empty. Redirecting to home.');
    window.location.href = 'index.html';
    return;
  }

  // Render initial summary
  renderCheckoutSummary(currentCart);

  // Setup input change event listeners to clear error messages
  const inputs = ['fullName', 'email', 'phone', 'address', 'city'];
  inputs.forEach(id => {
    const el = document.getElementById(id);
    if (el) {
      el.addEventListener('input', () => {
        el.classList.remove('input-error-state');
        const errEl = document.getElementById(`${id}Error`);
        if (errEl) errEl.style.display = 'none';
      });
      if (el.tagName === 'SELECT') {
        el.addEventListener('change', () => {
          el.classList.remove('input-error-state');
          const errEl = document.getElementById(`${id}Error`);
          if (errEl) errEl.style.display = 'none';
        });
      }
    }
  });

  // Promo Code event listeners
  const promoApplyBtn = document.getElementById('promoApplyBtn');
  if (promoApplyBtn) {
    promoApplyBtn.addEventListener('click', () => {
      applyPromoCode(currentCart);
    });
  }

  // Form Submission
  checkoutForm.addEventListener('submit', (e) => {
    e.preventDefault();
    processCheckoutOrder(currentCart);
  });
}

// Calculate cart calculations based on actual cart
function getSummaryTotals(cartItems) {
  const items = cartItems || (typeof cart !== 'undefined' ? cart : []);
  let subtotal = 0;
  items.forEach(item => {
    subtotal += item.price * item.qty;
  });

  let discount = 0;
  if (appliedPromo === 'ZERO10' || appliedPromo === 'VOID') {
    discount = Math.round(subtotal * 0.1);
  }

  const discountedSubtotal = subtotal - discount;
  
  // Free delivery on orders PKR 2,999 or above
  const shipping = subtotal >= 2999 ? 0 : 250;
  const total = discountedSubtotal + shipping;

  return { subtotal, discount, shipping, total };
}

// Render Order Summary
function renderCheckoutSummary(cartItems) {
  const container = document.getElementById('checkoutItemsContainer');
  if (!container) return;

  const items = cartItems || (typeof cart !== 'undefined' ? cart : []);

  container.innerHTML = '';

  items.forEach(item => {
    const itemCard = document.createElement('div');
    itemCard.className = 'checkout-item-card';

    itemCard.innerHTML = `
      <img src="${item.image}" alt="${item.name}" class="checkout-item-img">
      <div class="checkout-item-details">
        <h4 class="checkout-item-name">${item.name}</h4>
        <div class="checkout-item-meta">Size: ${item.size} &middot; Qty: ${item.qty}</div>
      </div>
      <div class="checkout-item-price">PKR ${(item.price * item.qty).toLocaleString()}</div>
    `;

    container.appendChild(itemCard);
  });

  updateTotalsDisplay(items);
}

// Update Financial Totals
function updateTotalsDisplay(cartItems) {
  const subtotalEl = document.getElementById('checkoutSubtotal');
  const discountRow = document.getElementById('discountRow');
  const discountName = document.getElementById('discountName');
  const discountEl = document.getElementById('checkoutDiscount');
  const shippingEl = document.getElementById('checkoutShipping');
  const totalEl = document.getElementById('checkoutTotal');

  const items = cartItems || (typeof cart !== 'undefined' ? cart : []);
  const { subtotal, discount, shipping, total } = getSummaryTotals(items);

  if (subtotalEl) subtotalEl.textContent = `PKR ${subtotal.toLocaleString()}`;
  
  if (discount > 0) {
    if (discountName) discountName.textContent = appliedPromo;
    if (discountEl) discountEl.textContent = `-PKR ${discount.toLocaleString()}`;
    if (discountRow) discountRow.style.display = 'flex';
  } else {
    if (discountRow) discountRow.style.display = 'none';
  }

  if (shippingEl) {
    shippingEl.textContent = shipping === 0 ? 'FREE' : `PKR ${shipping.toLocaleString()}`;
  }
  if (totalEl) totalEl.textContent = `PKR ${total.toLocaleString()}`;
}

// Apply Promo Code coupon
function applyPromoCode(cartItems) {
  const promoInput = document.getElementById('promoInput');
  const promoMessage = document.getElementById('promoMessage');
  if (!promoInput || !promoMessage) return;

  const code = promoInput.value.trim().toUpperCase();

  if (!code) {
    promoMessage.textContent = 'Please enter a discount code.';
    promoMessage.style.color = '#D32F2F';
    promoMessage.style.display = 'block';
    return;
  }

  if (code === 'ZERO10' || code === 'VOID') {
    appliedPromo = code;
    promoMessage.textContent = `Discount code "${code}" applied successfully (10% OFF).`;
    promoMessage.style.color = '#000000';
    promoMessage.style.display = 'block';
    updateTotalsDisplay(cartItems);
  } else {
    promoMessage.textContent = 'Invalid discount code.';
    promoMessage.style.color = '#D32F2F';
    promoMessage.style.display = 'block';
  }
}

// Validate fields and handle checkout submission
function processCheckoutOrder(cartItems) {
  let isValid = true;

  // 1. Full name validation
  const fullName = document.getElementById('fullName');
  const fullNameVal = fullName.value.trim();
  if (!fullNameVal) {
    showInputError('fullName');
    isValid = false;
  }

  // 2. Email validation
  const email = document.getElementById('email');
  const emailVal = email.value.trim();
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailVal || !emailRegex.test(emailVal)) {
    showInputError('email');
    isValid = false;
  }

  // 3. Phone validation
  const phone = document.getElementById('phone');
  const phoneVal = phone.value.trim();
  const cleanPhone = phoneVal.replace(/[\s-]/g, '');
  const phoneRegex = /^((\+92)|(0092)|(0))?3\d{9}$/;
  if (!cleanPhone || !phoneRegex.test(cleanPhone)) {
    showInputError('phone');
    isValid = false;
  }

  // 4. Address validation
  const address = document.getElementById('address');
  const addressVal = address.value.trim();
  if (!addressVal) {
    showInputError('address');
    isValid = false;
  }

  // 5. City validation
  const city = document.getElementById('city');
  const cityVal = city.value.trim();
  if (!cityVal) {
    showInputError('city');
    isValid = false;
  }

  if (!isValid) {
    // Focus first input that has error
    const firstErr = document.querySelector('.input-error-state');
    if (firstErr) firstErr.focus();
    return;
  }

  // Disable button and start loading spinner
  const submitBtn = document.getElementById('submitOrderBtn');
  const btnText = document.getElementById('btnText');
  const btnSpinner = document.getElementById('btnSpinner');

  if (submitBtn) submitBtn.disabled = true;
  if (btnText) btnText.textContent = 'Processing Order...';
  if (btnSpinner) btnSpinner.style.display = 'inline-block';

  // Formulate Order receipt object
  const { subtotal, discount, shipping, total } = getSummaryTotals(cartItems);
  const orderId = '#ZC-' + Math.floor(100000 + Math.random() * 900000);

  const orderData = {
    orderId: orderId,
    shippingInfo: {
      fullName: fullNameVal,
      email: emailVal,
      phone: phoneVal,
      address: addressVal,
      city: cityVal
    },
    items: cartItems.map(item => ({
      id: item.id,
      name: item.name,
      size: item.size,
      qty: item.qty,
      price: item.price
    })),
    financials: {
      subtotal: subtotal,
      discount: discount,
      promoCode: appliedPromo,
      shipping: shipping,
      total: total
    },
    date: new Date().toLocaleString()
  };

  // Post order to Express backend API
  fetch('/api/orders', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json'
    },
    body: JSON.stringify(orderData)
  })
  .then(res => {
    if (!res.ok) {
      throw new Error('Failed to submit order to server');
    }
    return res.json();
  })
  .then(savedOrder => {
    // Save to lastOrder (retrieved from backend with tracking details initialized)
    localStorage.setItem('lastOrder', JSON.stringify(savedOrder));

    // Clear cart in localStorage
    localStorage.removeItem('zero_collection_cart');
    
    // Dispatch cart updated event
    document.dispatchEvent(new CustomEvent('cartUpdated'));

    // Redirect to Order Confirm page
    window.location.href = 'order-confirm.html';
  })
  .catch(err => {
    console.warn("Express server offline, falling back to local simulation:", err);
    // Offline / demo fallback
    localStorage.setItem('lastOrder', JSON.stringify(orderData));
    localStorage.removeItem('zero_collection_cart');
    document.dispatchEvent(new CustomEvent('cartUpdated'));
    window.location.href = 'order-confirm.html';
  });
}

// Display Input Error states
function showInputError(id) {
  const el = document.getElementById(id);
  const errEl = document.getElementById(`${id}Error`);
  if (el) el.classList.add('input-error-state');
  if (errEl) errEl.style.display = 'block';
}
