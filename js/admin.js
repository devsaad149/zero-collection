/* ==========================================================================
   ZERO COLLECTION — Admin Dashboard Logic
   ========================================================================== */

document.addEventListener('DOMContentLoaded', () => {
  initAdminDashboard();
});

// ── STATE MANAGEMENT ──
let adminToken = localStorage.getItem('zero_admin_token') || null;
let products = [];
let orders = [];
let homepageConfig = {};
let currentEditingProductId = null;
let currentUploadedImages = [];

// ── CLIENT-SIDE IMAGE COMPRESSION ──
function compressImage(file, maxDimension = 1200, quality = 0.75) {
  return new Promise((resolve, reject) => {
    if (!file || !file.type.startsWith('image/')) {
      return resolve(file);
    }
    const reader = new FileReader();
    reader.readAsDataURL(file);
    reader.onload = (event) => {
      const img = new Image();
      img.src = event.target.result;
      img.onload = () => {
        const canvas = document.createElement('canvas');
        let width = img.width;
        let height = img.height;

        if (width > maxDimension || height > maxDimension) {
          if (width > height) {
            height = Math.round((height * maxDimension) / width);
            width = maxDimension;
          } else {
            width = Math.round((width * maxDimension) / height);
            height = maxDimension;
          }
        }

        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');
        ctx.drawImage(img, 0, 0, width, height);

        canvas.toBlob((blob) => {
          if (blob) {
            resolve(blob);
          } else {
            resolve(file);
          }
        }, 'image/jpeg', quality);
      };
      img.onerror = () => resolve(file);
    };
    reader.onerror = () => resolve(file);
  });
}

function initAdminDashboard() {
  const loginSection = document.getElementById('loginSection');
  const dashboardSection = document.getElementById('dashboardSection');
  const loginForm = document.getElementById('loginForm');
  const logoutBtn = document.getElementById('logoutBtn');

  // Check initial session
  if (adminToken) {
    showDashboard();
  } else {
    showLogin();
  }

  // Auth Action Listeners
  if (loginForm) {
    loginForm.addEventListener('submit', (e) => {
      e.preventDefault();
      handleLogin();
    });
  }

  if (logoutBtn) {
    logoutBtn.addEventListener('click', () => {
      handleLogout();
    });
  }

  // Dashboard Nav Tabs Switching
  const tabs = document.querySelectorAll('.admin-tab');
  tabs.forEach(tab => {
    tab.addEventListener('click', () => {
      tabs.forEach(t => t.classList.remove('active'));
      tab.classList.add('active');

      const panels = document.querySelectorAll('.admin-panel');
      panels.forEach(p => p.style.display = 'none');

      const targetId = tab.getAttribute('data-target');
      const targetPanel = document.getElementById(targetId);
      if (targetPanel) {
        targetPanel.style.display = 'block';
      }

      // Close open sub-forms when switching panels
      document.getElementById('productFormContainer').style.display = 'none';
      document.getElementById('orderDetailContainer').style.display = 'none';
    });
  });

  // Password Change Listener
  const passwordForm = document.getElementById('passwordForm');
  if (passwordForm) {
    passwordForm.addEventListener('submit', (e) => {
      e.preventDefault();
      handlePasswordChange();
    });
  }
}

/* ==========================================================================
   AUTH ACTIONS
   ========================================================================== */

function showLogin() {
  document.getElementById('loginSection').style.display = 'block';
  document.getElementById('dashboardSection').style.display = 'none';
}

function showDashboard() {
  document.getElementById('loginSection').style.display = 'none';
  document.getElementById('dashboardSection').style.display = 'block';
  loadDashboardData();
}

function handleLogin() {
  const usernameVal = document.getElementById('adminUser').value.trim();
  const passwordVal = document.getElementById('adminPass').value.trim();
  const loginError = document.getElementById('loginError');

  loginError.style.display = 'none';

  fetch('/api/auth/login', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ username: usernameVal, password: passwordVal })
  })
  .then(res => {
    if (!res.ok) {
      return res.json().then(err => { throw new Error(err.error || 'Login failed') });
    }
    return res.json();
  })
  .then(data => {
    adminToken = data.token;
    localStorage.setItem('zero_admin_token', adminToken);
    showDashboard();
  })
  .catch(err => {
    loginError.textContent = err.message;
    loginError.style.display = 'block';
  });
}

function handleLogout() {
  adminToken = null;
  localStorage.removeItem('zero_admin_token');
  location.reload();
}

/* ==========================================================================
   DATA LOADING
   ========================================================================== */

function getAdminHeaders() {
  return {
    'Content-Type': 'application/json',
    'x-admin-token': adminToken
  };
}

function loadDashboardData() {
  // Fetch Products
  fetchProducts();

  // Fetch Orders
  fetchOrders();

  // Fetch Homepage config
  fetchHomepage();
}

function fetchProducts() {
  fetch('/api/products')
    .then(res => res.json())
    .then(data => {
      products = data;
      renderProductsTable();
    })
    .catch(err => console.error("Error loading products:", err));
}

function fetchOrders() {
  fetch('/api/orders', {
    headers: getAdminHeaders()
  })
  .then(res => {
    if (res.status === 401) {
      handleLogout();
    }
    return res.json();
  })
  .then(data => {
    orders = data;
    renderOrdersTable();
  })
  .catch(err => console.error("Error loading orders:", err));
}

function fetchHomepage() {
  fetch('/api/homepage?t=' + Date.now())
    .then(res => res.json())
    .then(data => {
      homepageConfig = data;
      populateHomepageForm();
    })
    .catch(err => console.error("Error loading homepage settings:", err));
}

/* ==========================================================================
   PRODUCT PANEL ACTIONS
   ========================================================================== */

function renderProductsTable() {
  const tbody = document.querySelector('#productsTable tbody');
  if (!tbody) return;

  tbody.innerHTML = '';

  products.forEach(p => {
    const tr = document.createElement('tr');
    tr.innerHTML = `
      <td><strong>${p.id}</strong></td>
      <td>${p.name}</td>
      <td><span class="uppercase">${p.category}</span></td>
      <td>PKR ${Number(p.price).toLocaleString()}</td>
      <td>
        ${p.onSale ? `<span style="color:#D32F2F; font-weight:700;">SALE (PKR ${Number(p.salePrice).toLocaleString()})</span>` : 'No'}
      </td>
      <td>
        <button class="btn btn-outline btn-sm" onclick="openProductEditForm('${p.id}')">Edit</button>
        <button class="btn btn-sm" style="border-color:#D32F2F; color:#D32F2F;" onclick="deleteProduct('${p.id}')">Delete</button>
      </td>
    `;
    tbody.appendChild(tr);
  });

  // Setup main "Add New Product" button listener once
  const addBtn = document.getElementById('addProductBtn');
  if (addBtn) {
    addBtn.onclick = () => openProductAddForm();
  }
}

function openProductAddForm() {
  currentEditingProductId = null;
  currentUploadedImages = [];
  renderProductForm('Add New Product', {
    name: '', category: 'tshirts', price: '', onSale: false, salePrice: '',
    featured: false, description: '', sizes: ['S', 'M', 'L', 'XL', 'XXL'], features: [], images: []
  });
}

function openProductEditForm(id) {
  const product = products.find(p => p.id === id);
  if (!product) return;

  currentEditingProductId = id;
  currentUploadedImages = [...(product.images || [])];
  renderProductForm(`Edit Product: ${id}`, product);
}

function renderProductForm(title, data) {
  const formContainer = document.getElementById('productFormContainer');
  formContainer.innerHTML = '';
  formContainer.style.display = 'block';

  // Core Categories List
  const categories = ['tshirts', 'shirts', 'hoodies', 'jackets', 'sale'];
  const catOptions = categories.map(c => 
    `<option value="${c}" ${data.category === c ? 'selected' : ''}>${c.toUpperCase()}</option>`
  ).join('');

  // Sizes List Checklist
  const allSizes = ['S', 'M', 'L', 'XL', 'XXL'];
  const sizeCheckboxes = allSizes.map(s => `
    <label class="checkbox-label">
      <input type="checkbox" name="sizes" value="${s}" ${data.sizes.includes(s) ? 'checked' : ''} />
      ${s}
    </label>
  `).join('');

  formContainer.innerHTML = `
    <div class="admin-form-header">
      <h4>${title}</h4>
      <button class="admin-close-btn" onclick="closeProductForm()">&times;</button>
    </div>
    <form id="productForm" class="admin-form">
      <div style="display:grid; grid-template-columns: 1fr 1fr; gap:20px;">
        <div>
          <label for="pName">Product Name</label>
          <input type="text" id="pName" value="${data.name}" required />
        </div>
        <div>
          <label for="pCategory">Category</label>
          <select id="pCategory">${catOptions}</select>
        </div>
      </div>

      <div style="display:grid; grid-template-columns: 1fr 1fr; gap:20px;">
        <div>
          <label for="pPrice">Base Price (PKR)</label>
          <input type="number" id="pPrice" value="${data.price}" required />
        </div>
        <div>
          <label for="pSalePrice">Sale Price (PKR)</label>
          <input type="number" id="pSalePrice" value="${data.salePrice || ''}" />
        </div>
      </div>

      <div class="checkbox-group">
        <label class="checkbox-label">
          <input type="checkbox" id="pOnSale" ${data.onSale ? 'checked' : ''} />
          On Sale
        </label>
        <label class="checkbox-label">
          <input type="checkbox" id="pFeatured" ${data.featured ? 'checked' : ''} />
          Featured Product
        </label>
      </div>

      <div>
        <label>Available Sizes</label>
        <div class="checkbox-group" style="margin-top:10px;">
          ${sizeCheckboxes}
        </div>
      </div>

      <div>
        <label for="pDescription">Product Description / Features (One per line)</label>
        <textarea id="pDescription" rows="4" placeholder="Premium Heavyweight Cotton&#10;Monochromatic minimal print&#10;Relaxed oversized fit">${(data.features || []).join('\n')}</textarea>
      </div>

      <div>
        <label>Product Images</label>
        <div class="image-upload-wrapper">
          <input type="file" id="pImageUpload" accept="image/*" style="display:none;" onchange="handleProductImageUpload(event)" />
          <button type="button" class="btn btn-outline btn-sm" onclick="document.getElementById('pImageUpload').click()">Upload Image File</button>
          <span style="font-size:0.8rem; color:var(--color-grey);">Or add image URL manually:</span>
          <input type="text" id="pManualImgUrl" style="flex:1; min-width:200px; padding:8px 12px; border:1px solid var(--color-grey-light);" placeholder="images/custom-image.jpg" />
          <button type="button" class="btn btn-sm" onclick="addManualImageUrl()">Add</button>
        </div>
        <div class="image-preview-grid" id="imagePreviewGrid">
          <!-- Render Previews -->
        </div>
      </div>

      <div style="margin-top:24px;">
        <button type="submit" class="btn btn-primary">Save Product</button>
        <button type="button" class="btn btn-outline" onclick="closeProductForm()">Cancel</button>
      </div>
      <p id="productFormError" class="error-message" style="display:none;"></p>
    </form>
  `;

  renderImagePreviews();

  // Attach submit interceptor
  document.getElementById('productForm').addEventListener('submit', (e) => {
    e.preventDefault();
    saveProductData();
  });
}

function closeProductForm() {
  document.getElementById('productFormContainer').style.display = 'none';
  currentEditingProductId = null;
  currentUploadedImages = [];
}

function addManualImageUrl() {
  const manualInput = document.getElementById('pManualImgUrl');
  const url = manualInput.value.trim();
  if (url) {
    currentUploadedImages.push(url);
    manualInput.value = '';
    renderImagePreviews();
  }
}

function handleProductImageUpload(e) {
  const file = e.target.files[0];
  if (!file) return;

  const errorEl = document.getElementById('productFormError');
  if (errorEl) {
    errorEl.textContent = "Compressing and uploading image...";
    errorEl.style.color = "var(--color-black)";
    errorEl.style.display = 'block';
  }

  compressImage(file, 1200, 0.75)
    .then(compressedBlob => {
      const formData = new FormData();
      const originalName = file.name.substring(0, file.name.lastIndexOf('.')) || 'upload';
      formData.append('image', compressedBlob, `${originalName}.jpg`);

      return fetch('/api/upload', {
        method: 'POST',
        headers: {
          'x-admin-token': adminToken
        },
        body: formData
      });
    })
    .then(res => {
      if (!res.ok) {
        return res.json().then(err => { throw new Error(err.error || 'Failed to upload image') });
      }
      return res.json();
    })
    .then(data => {
      currentUploadedImages.push(data.imageUrl);
      renderImagePreviews();
      if (errorEl) errorEl.style.display = 'none';
    })
    .catch(err => {
      console.error("Upload error:", err);
      if (errorEl) {
        errorEl.textContent = err.message;
        errorEl.style.color = "#D32F2F";
        errorEl.style.display = 'block';
      }
    });
}

function removeImageAtIndex(idx) {
  currentUploadedImages.splice(idx, 1);
  renderImagePreviews();
}

function renderImagePreviews() {
  const grid = document.getElementById('imagePreviewGrid');
  if (!grid) return;

  grid.innerHTML = '';

  currentUploadedImages.forEach((img, index) => {
    const item = document.createElement('div');
    item.className = 'image-preview-item';
    item.innerHTML = `
      <img src="${img}" alt="Preview" />
      <button type="button" class="image-remove-btn" onclick="removeImageAtIndex(${index})">&times;</button>
    `;
    grid.appendChild(item);
  });
}

function saveProductData() {
  const name = document.getElementById('pName').value.trim();
  const category = document.getElementById('pCategory').value;
  const price = Number(document.getElementById('pPrice').value);
  const salePriceVal = document.getElementById('pSalePrice').value.trim();
  const onSale = document.getElementById('pOnSale').checked;
  const featured = document.getElementById('pFeatured').checked;
  const descriptionText = document.getElementById('pDescription').value.trim();

  // Gather Sizes
  const sizeEls = document.querySelectorAll('input[name="sizes"]:checked');
  const sizes = Array.from(sizeEls).map(el => el.value);

  // Split description lines into features
  const features = descriptionText ? descriptionText.split('\n').map(line => line.trim()).filter(Boolean) : [];

  const productData = {
    name, category, price,
    salePrice: salePriceVal ? Number(salePriceVal) : null,
    onSale, featured, sizes, features,
    images: currentUploadedImages
  };

  const isEdit = currentEditingProductId !== null;
  const endpoint = isEdit ? `/api/products/${currentEditingProductId}` : '/api/products';
  const method = isEdit ? 'PUT' : 'POST';

  fetch(endpoint, {
    method: method,
    headers: getAdminHeaders(),
    body: JSON.stringify(productData)
  })
  .then(res => {
    if (!res.ok) {
      return res.json().then(err => { throw new Error(err.error || 'Failed to save product') });
    }
    return res.json();
  })
  .then(() => {
    alert('Product saved successfully');
    closeProductForm();
    fetchProducts();
  })
  .catch(err => {
    const errorEl = document.getElementById('productFormError');
    if (errorEl) {
      errorEl.textContent = err.message;
      errorEl.style.display = 'block';
    }
  });
}

function deleteProduct(id) {
  if (!confirm(`Are you absolutely sure you want to delete product "${id}"? This cannot be undone.`)) {
    return;
  }

  fetch(`/api/products/${id}`, {
    method: 'DELETE',
    headers: getAdminHeaders()
  })
  .then(res => {
    if (!res.ok) {
      return res.json().then(err => { throw new Error(err.error || 'Failed to delete product') });
    }
    return res.json();
  })
  .then(() => {
    alert('Product deleted successfully');
    fetchProducts();
  })
  .catch(err => alert(err.message));
}

/* ==========================================================================
   ORDER PANEL ACTIONS
   ========================================================================== */

function renderOrdersTable() {
  const tbody = document.querySelector('#ordersTable tbody');
  if (!tbody) return;

  tbody.innerHTML = '';

  if (orders.length === 0) {
    tbody.innerHTML = '<tr><td colspan="6" style="text-align:center;">No orders placed yet.</td></tr>';
    return;
  }

  orders.forEach(o => {
    const statusClass = `admin-badge-${o.status.toLowerCase()}`;
    const dateStr = o.date ? o.date.split(',')[0] : '';
    const fullName = o.shippingInfo ? o.shippingInfo.fullName : 'Customer';
    const city = o.shippingInfo ? o.shippingInfo.city : '';
    const totalVal = o.financials ? o.financials.total : 0;

    const tr = document.createElement('tr');
    tr.innerHTML = `
      <td><strong>${o.orderId}</strong></td>
      <td>${dateStr}</td>
      <td><span class="admin-badge ${statusClass}">${o.status}</span></td>
      <td>${fullName} (${city})</td>
      <td>PKR ${Number(totalVal).toLocaleString()}</td>
      <td>
        <button class="btn btn-outline btn-sm" onclick="viewOrderDetails('${o.orderId}')">Manage</button>
      </td>
    `;
    tbody.appendChild(tr);
  });
}

function viewOrderDetails(orderId) {
  const order = orders.find(o => o.orderId === orderId);
  if (!order) return;

  const detailContainer = document.getElementById('orderDetailContainer');
  detailContainer.innerHTML = '';
  detailContainer.style.display = 'block';

  // Render Cart Items
  const itemsHtml = order.items.map(item => `
    <div style="display:flex; justify-content:space-between; border-bottom:1px solid #E0E0E0; padding:10px 0;">
      <div>
        <strong>${item.name}</strong><br />
        <span style="font-size:0.8rem; color:var(--color-grey);">Size: ${item.size} &middot; Qty: ${item.qty}</span>
      </div>
      <div>
        PKR ${(item.price * item.qty).toLocaleString()}
      </div>
    </div>
  `).join('');

  // Status Select Box Options
  const statuses = ['Pending', 'Shipped', 'Delivered', 'Cancelled'];
  const statusOptions = statuses.map(s => 
    `<option value="${s}" ${order.status === s ? 'selected' : ''}>${s}</option>`
  ).join('');

  // Timeline list
  const timelineUpdates = order.tracking && order.tracking.statusUpdates ? order.tracking.statusUpdates : [];
  const timelineHtml = timelineUpdates.map((update, index) => {
    const isActive = index === timelineUpdates.length - 1;
    return `
      <li class="timeline-item ${isActive ? 'active' : ''}">
        <span class="timeline-time">${update.time}</span>
        <span class="timeline-desc">${update.status} - ${update.details}</span>
      </li>
    `;
  }).reverse().join('');

  detailContainer.innerHTML = `
    <div class="admin-form-header">
      <h4>Order Management: ${order.orderId}</h4>
      <button class="admin-close-btn" onclick="closeOrderDetail()">&times;</button>
    </div>

    <div class="order-detail-grid">
      <!-- Info Left -->
      <div>
        <div style="display:grid; grid-template-columns:1fr 1fr; gap:20px;">
          <div class="order-info-block">
            <h5>Customer Name</h5>
            <p>${order.shippingInfo.fullName}</p>
          </div>
          <div class="order-info-block">
            <h5>Phone Number</h5>
            <p>${order.shippingInfo.phone}</p>
          </div>
        </div>

        <div style="display:grid; grid-template-columns:1fr 1fr; gap:20px;">
          <div class="order-info-block">
            <h5>Email Address</h5>
            <p>${order.shippingInfo.email}</p>
          </div>
          <div class="order-info-block">
            <h5>Date Placed</h5>
            <p>${order.date}</p>
          </div>
        </div>

        <div class="order-info-block">
          <h5>Delivery Address</h5>
          <p>${order.shippingInfo.address}, ${order.shippingInfo.city}</p>
        </div>

        <div style="margin-top:32px;">
          <h5 style="border-bottom:1px solid #000; padding-bottom:6px; margin-bottom:16px;">Items Ordered</h5>
          ${itemsHtml}
          
          <div style="display:flex; justify-content:space-between; margin-top:20px; font-weight:700;">
            <div>Total Financials</div>
            <div>PKR ${Number(order.financials.total).toLocaleString()}</div>
          </div>
          <div style="font-size:0.8rem; color:var(--color-grey); text-align:right; margin-top:6px;">
            Subtotal: PKR ${order.financials.subtotal.toLocaleString()} &middot; 
            Shipping: ${order.financials.shipping === 0 ? 'FREE' : 'PKR ' + order.financials.shipping.toLocaleString()}
            ${order.financials.discount > 0 ? ` &middot; Promo: ${order.financials.promoCode} (-PKR ${order.financials.discount.toLocaleString()})` : ''}
          </div>
        </div>
      </div>

      <!-- Actions/Tracking Right -->
      <div style="border-left:1px solid var(--color-grey-light); padding-left:24px;">
        <h5 style="margin-bottom:16px;">Update Shipping & Logistics</h5>
        <form id="orderStatusForm" class="admin-form" style="gap:14px;">
          <div>
            <label for="oStatus">Order Status</label>
            <select id="oStatus" style="margin-top:6px;">${statusOptions}</select>
          </div>
          <div>
            <label for="oCourier">Courier Service</label>
            <input type="text" id="oCourier" value="${order.tracking?.courier || ''}" style="margin-top:6px;" placeholder="e.g. Leopard, TCS, Trax" />
          </div>
          <div>
            <label for="oTrackingNumber">Tracking ID</label>
            <input type="text" id="oTrackingNumber" value="${order.tracking?.trackingNumber || ''}" style="margin-top:6px;" placeholder="e.g. LE123456789" />
          </div>
          <div>
            <label for="oStatusDetails">Status Note / Timeline Comment</label>
            <input type="text" id="oStatusDetails" style="margin-top:6px;" placeholder="e.g. Shipped from warehouse" />
          </div>
          <button type="submit" class="btn btn-primary btn-sm btn-full" style="margin-top:10px;">Update Tracking</button>
        </form>

        <div style="margin-top:32px;">
          <h5>Status Timeline Logs</h5>
          <ul class="status-timeline">
            ${timelineHtml || '<li style="font-size:0.85rem; color:var(--color-grey);">No tracking logs generated yet.</li>'}
          </ul>
        </div>
      </div>
    </div>
  `;

  document.getElementById('orderStatusForm').addEventListener('submit', (e) => {
    e.preventDefault();
    updateOrderStatus(orderId);
  });
}

function closeOrderDetail() {
  document.getElementById('orderDetailContainer').style.display = 'none';
}

function updateOrderStatus(orderId) {
  const status = document.getElementById('oStatus').value;
  const courier = document.getElementById('oCourier').value.trim();
  const trackingNumber = document.getElementById('oTrackingNumber').value.trim();
  const statusDetails = document.getElementById('oStatusDetails').value.trim();

  fetch(`/api/orders/${encodeURIComponent(orderId)}`, {
    method: 'PUT',
    headers: getAdminHeaders(),
    body: JSON.stringify({ status, courier, trackingNumber, statusDetails })
  })
  .then(res => {
    if (!res.ok) {
      return res.json().then(err => { throw new Error(err.error || 'Failed to update order') });
    }
    return res.json();
  })
  .then(() => {
    alert(`Order status updated successfully`);
    closeOrderDetail();
    fetchOrders();
  })
  .catch(err => alert(err.message));
}

/* ==========================================================================
   HOMEPAGE PANEL ACTIONS
   ========================================================================== */

function populateHomepageForm() {
  const bar = document.getElementById('announcementBar');
  const title = document.getElementById('heroTitle');
  const subtitle = document.getElementById('heroSubtitle');
  const showSale = document.getElementById('showSaleSection');
  const saleTitle = document.getElementById('saleTitle');
  const saleSubtitle = document.getElementById('saleSubtitle');

  const heroImgUrl = document.getElementById('heroImgUrl');
  const saleImgUrl = document.getElementById('saleImgUrl');
  const shirtsImgUrl = document.getElementById('shirtsImgUrl');
  const hoodiesImgUrl = document.getElementById('hoodiesImgUrl');
  const jacketsImgUrl = document.getElementById('jacketsImgUrl');
  const tshirtsImgUrl = document.getElementById('tshirtsImgUrl');

  if (bar) bar.value = homepageConfig.announcementBar || '';
  if (title) title.value = homepageConfig.heroTitle || '';
  if (subtitle) subtitle.value = homepageConfig.heroSubtitle || '';
  if (showSale) showSale.checked = homepageConfig.showSaleSection !== false;
  if (saleTitle) saleTitle.value = homepageConfig.saleTitle || '';
  if (saleSubtitle) saleSubtitle.value = homepageConfig.saleSubtitle || '';

  if (heroImgUrl) heroImgUrl.value = homepageConfig.heroImg || '';
  if (saleImgUrl) saleImgUrl.value = homepageConfig.saleImg || '';
  if (shirtsImgUrl) shirtsImgUrl.value = homepageConfig.shirtsImg || '';
  if (hoodiesImgUrl) hoodiesImgUrl.value = homepageConfig.hoodiesImg || '';
  if (jacketsImgUrl) jacketsImgUrl.value = homepageConfig.jacketsImg || '';
  if (tshirtsImgUrl) tshirtsImgUrl.value = homepageConfig.tshirtsImg || '';

  const igImg1Url = document.getElementById('igImg1Url');
  const igImg2Url = document.getElementById('igImg2Url');
  const igImg3Url = document.getElementById('igImg3Url');
  const igImg4Url = document.getElementById('igImg4Url');
  const igImg5Url = document.getElementById('igImg5Url');
  const igImg6Url = document.getElementById('igImg6Url');
  
  if (igImg1Url) igImg1Url.value = homepageConfig.igImg1 || '';
  if (igImg2Url) igImg2Url.value = homepageConfig.igImg2 || '';
  if (igImg3Url) igImg3Url.value = homepageConfig.igImg3 || '';
  if (igImg4Url) igImg4Url.value = homepageConfig.igImg4 || '';
  if (igImg5Url) igImg5Url.value = homepageConfig.igImg5 || '';
  if (igImg6Url) igImg6Url.value = homepageConfig.igImg6 || '';

  // Attach submit handler once
  const form = document.getElementById('homepageForm');
  if (form) {
    form.onsubmit = (e) => {
      e.preventDefault();
      saveHomepageConfig();
    };
  }
}

function saveHomepageConfig() {
  const announcementBar = document.getElementById('announcementBar').value.trim();
  const heroTitle = document.getElementById('heroTitle').value.trim();
  const heroSubtitle = document.getElementById('heroSubtitle').value.trim();
  const showSaleSection = document.getElementById('showSaleSection').checked;
  const saleTitle = document.getElementById('saleTitle').value.trim();
  const saleSubtitle = document.getElementById('saleSubtitle').value.trim();

  const heroImg = document.getElementById('heroImgUrl').value.trim();
  const saleImg = document.getElementById('saleImgUrl').value.trim();
  const shirtsImg = document.getElementById('shirtsImgUrl').value.trim();
  const hoodiesImg = document.getElementById('hoodiesImgUrl').value.trim();
  const jacketsImg = document.getElementById('jacketsImgUrl').value.trim();
  const tshirtsImg = document.getElementById('tshirtsImgUrl').value.trim();

  const igImg1 = document.getElementById('igImg1Url').value.trim();
  const igImg2 = document.getElementById('igImg2Url').value.trim();
  const igImg3 = document.getElementById('igImg3Url').value.trim();
  const igImg4 = document.getElementById('igImg4Url').value.trim();
  const igImg5 = document.getElementById('igImg5Url').value.trim();
  const igImg6 = document.getElementById('igImg6Url').value.trim();

  const configData = {
    announcementBar, heroTitle, heroSubtitle,
    showSaleSection, saleTitle, saleSubtitle,
    heroImg, saleImg, shirtsImg, hoodiesImg, jacketsImg, tshirtsImg,
    igImg1, igImg2, igImg3, igImg4, igImg5, igImg6
  };

  fetch('/api/homepage', {
    method: 'PUT',
    headers: getAdminHeaders(),
    body: JSON.stringify(configData)
  })
  .then(res => {
    if (!res.ok) {
      return res.json().then(err => { throw new Error(err.error || 'Failed to update homepage settings') });
    }
    return res.json();
  })
  .then(data => {
    homepageConfig = data;
    populateHomepageForm();
    const msg = document.getElementById('homepageSaveMsg');
    msg.textContent = 'Homepage settings updated successfully';
    msg.style.display = 'block';
    setTimeout(() => {
      msg.style.display = 'none';
    }, 4000);
  })
  .catch(err => alert(err.message));
}

// Global hook for uploading homepage assets
window.handleHomepageImageUpload = function(e, key) {
  const file = e.target.files[0];
  if (!file) return;

  const saveMsg = document.getElementById('homepageSaveMsg');
  if (saveMsg) {
    saveMsg.textContent = "Compressing and uploading image...";
    saveMsg.style.color = "var(--color-black)";
    saveMsg.style.display = 'block';
  }

  compressImage(file, 1200, 0.75)
    .then(compressedBlob => {
      const formData = new FormData();
      const originalName = file.name.substring(0, file.name.lastIndexOf('.')) || 'upload';
      formData.append('image', compressedBlob, `${originalName}.jpg`);

      return fetch('/api/upload', {
        method: 'POST',
        headers: {
          'x-admin-token': adminToken
        },
        body: formData
      });
    })
    .then(res => {
      if (!res.ok) {
        return res.json().then(err => { throw new Error(err.error || 'Upload failed') });
      }
      return res.json();
    })
    .then(data => {
      const input = document.getElementById(`${key}Url`);
      if (input) {
        input.value = data.imageUrl;
      }
      if (saveMsg) {
        saveMsg.textContent = "Image uploaded successfully. Remember to click 'Save Settings' at the bottom of the page to apply!";
        saveMsg.style.color = "green";
        setTimeout(() => {
          saveMsg.style.display = 'none';
        }, 8000);
      }
    })
    .catch(err => {
      alert('Failed to upload homepage image: ' + err.message);
      if (saveMsg) saveMsg.style.display = 'none';
    });
};

// Explicitly expose functions to the global window object to support dynamic inline HTML event handlers
window.openProductEditForm = openProductEditForm;
window.deleteProduct = deleteProduct;
window.closeProductForm = closeProductForm;
window.addManualImageUrl = addManualImageUrl;
window.removeImageAtIndex = removeImageAtIndex;
window.viewOrderDetails = viewOrderDetails;
window.closeOrderDetail = closeOrderDetail;
window.handleProductImageUpload = handleProductImageUpload;

// ── SETTINGS / PASSWORD ACTIONS ──
function handlePasswordChange() {
  const currentPassword = document.getElementById('currentPassword').value;
  const newPassword = document.getElementById('newPassword').value;
  const confirmPassword = document.getElementById('confirmPassword').value;
  const errorMsg = document.getElementById('passwordErrorMsg');
  const successMsg = document.getElementById('passwordSaveMsg');
  
  errorMsg.style.display = 'none';
  successMsg.style.display = 'none';

  if (newPassword !== confirmPassword) {
    errorMsg.textContent = "New passwords do not match.";
    errorMsg.style.display = 'block';
    return;
  }

  fetch('/api/auth/password', {
    method: 'PUT',
    headers: getAdminHeaders(),
    body: JSON.stringify({ currentPassword, newPassword })
  })
  .then(res => {
    if (!res.ok) {
      return res.json().then(err => { throw new Error(err.error || 'Failed to update password') });
    }
    return res.json();
  })
  .then(data => {
    successMsg.textContent = "Password changed successfully. Please log in again.";
    successMsg.style.display = 'block';
    document.getElementById('passwordForm').reset();
    setTimeout(() => {
      handleLogout();
    }, 2000);
  })
  .catch(err => {
    errorMsg.textContent = err.message;
    errorMsg.style.display = 'block';
  });
}

