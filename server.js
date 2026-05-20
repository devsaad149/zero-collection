const express = require('express');
const multer = require('multer');
const path = require('path');
const fs = require('fs');

const app = express();
const PORT = process.env.PORT || 8080;

// Configuration
const DATA_DIR = path.join(__dirname, 'data');
const PRODUCTS_FILE = path.join(DATA_DIR, 'products.json');
const ORDERS_FILE = path.join(DATA_DIR, 'orders.json');
const HOMEPAGE_FILE = path.join(DATA_DIR, 'homepage.json');
const ADMIN_TOKEN = 'zero-collection-admin-secure-token-2026';

// Ensure data directory exists
if (!fs.existsSync(DATA_DIR)) {
  fs.mkdirSync(DATA_DIR, { recursive: true });
}

// Middleware
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: true, limit: '50mb' }));

// Auth helper
function requireAdmin(req, res, next) {
  const token = req.headers['authorization'] || req.headers['x-admin-token'];
  if (token === ADMIN_TOKEN || token === `Bearer ${ADMIN_TOKEN}`) {
    next();
  } else {
    res.status(401).json({ error: 'Unauthorized: Admin access required' });
  }
}

// Multer Storage Setup for Product Images
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, path.join(__dirname, 'images'));
  },
  filename: (req, file, cb) => {
    // Generate a unique filename: product-id + timestamp + original ext
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1e9);
    cb(null, 'upload-' + uniqueSuffix + path.extname(file.originalname));
  }
});

const upload = multer({
  storage: storage,
  fileFilter: (req, file, cb) => {
    const filetypes = /jpeg|jpg|png|webp/;
    const extname = filetypes.test(path.extname(file.originalname).toLowerCase());
    const mimetype = filetypes.test(file.mimetype);
    if (mimetype && extname) {
      return cb(null, true);
    }
    cb(new Error('Only images (JPEG, JPG, PNG, WEBP) are allowed'));
  }
});

// Helper functions to read/write JSON files safely
function readJSON(file, defaultVal = []) {
  try {
    if (!fs.existsSync(file)) {
      fs.writeFileSync(file, JSON.stringify(defaultVal, null, 2), 'utf8');
      return defaultVal;
    }
    const data = fs.readFileSync(file, 'utf8');
    return JSON.parse(data);
  } catch (err) {
    console.error(`Error reading file ${file}:`, err);
    return defaultVal;
  }
}

function writeJSON(file, data) {
  try {
    fs.writeFileSync(file, JSON.stringify(data, null, 2), 'utf8');
    return true;
  } catch (err) {
    console.error(`Error writing file ${file}:`, err);
    return false;
  }
}

/* ==========================================================================
   API ENDPOINTS
   ========================================================================== */

// ── AUTHENTICATION ──
app.post('/api/auth/login', (req, res) => {
  const { username, password } = req.body;
  if (username === 'admin' && password === 'admin123') {
    res.json({ success: true, token: ADMIN_TOKEN });
  } else {
    res.status(400).json({ error: 'Invalid username or password' });
  }
});

// ── PRODUCTS API ──

// Get all products
app.get('/api/products', (req, res) => {
  const products = readJSON(PRODUCTS_FILE, []);
  res.json(products);
});

// Add a product (Admin)
app.post('/api/products', requireAdmin, (req, res) => {
  const products = readJSON(PRODUCTS_FILE, []);
  const newProduct = req.body;

  // Simple validation
  if (!newProduct.name || !newProduct.category || !newProduct.price) {
    return res.status(400).json({ error: 'Product name, category, and price are required' });
  }

  // Generate unique product ID based on category and current products
  if (!newProduct.id) {
    const categoryPrefix = newProduct.category.toLowerCase().replace(/[^a-z]/g, '') || 'product';
    const count = products.filter(p => p.category === newProduct.category).length;
    newProduct.id = `${categoryPrefix}-${String(count + 1).padStart(3, '0')}`;
  }

  // Ensure ID is unique
  if (products.some(p => p.id === newProduct.id)) {
    newProduct.id = newProduct.id + '-' + Math.floor(Math.random() * 1000);
  }

  newProduct.price = Number(newProduct.price);
  if (newProduct.salePrice) {
    newProduct.salePrice = Number(newProduct.salePrice);
  }
  newProduct.onSale = !!newProduct.onSale;
  newProduct.featured = !!newProduct.featured;
  newProduct.dateAdded = newProduct.dateAdded || new Date().toISOString().split('T')[0];
  newProduct.images = newProduct.images || [];
  newProduct.sizes = newProduct.sizes || ['S', 'M', 'L', 'XL', 'XXL'];
  newProduct.features = newProduct.features || [];

  products.push(newProduct);
  writeJSON(PRODUCTS_FILE, products);
  res.status(201).json(newProduct);
});

// Edit a product (Admin)
app.put('/api/products/:id', requireAdmin, (req, res) => {
  const products = readJSON(PRODUCTS_FILE, []);
  const productId = req.params.id;
  const index = products.findIndex(p => p.id === productId);

  if (index === -1) {
    return res.status(404).json({ error: 'Product not found' });
  }

  const updatedProduct = { ...products[index], ...req.body };
  updatedProduct.price = Number(updatedProduct.price);
  if (updatedProduct.salePrice !== undefined) {
    updatedProduct.salePrice = updatedProduct.salePrice ? Number(updatedProduct.salePrice) : null;
  }
  updatedProduct.onSale = !!updatedProduct.onSale;
  updatedProduct.featured = !!updatedProduct.featured;
  updatedProduct.images = updatedProduct.images || [];
  updatedProduct.sizes = updatedProduct.sizes || [];
  updatedProduct.features = updatedProduct.features || [];

  products[index] = updatedProduct;
  writeJSON(PRODUCTS_FILE, products);
  res.json(updatedProduct);
});

// Delete a product (Admin)
app.delete('/api/products/:id', requireAdmin, (req, res) => {
  const products = readJSON(PRODUCTS_FILE, []);
  const productId = req.params.id;
  const filteredProducts = products.filter(p => p.id !== productId);

  if (products.length === filteredProducts.length) {
    return res.status(404).json({ error: 'Product not found' });
  }

  // Optional: delete associated uploaded images from disk if desired
  const productToDelete = products.find(p => p.id === productId);
  if (productToDelete && productToDelete.images) {
    productToDelete.images.forEach(imgUrl => {
      if (imgUrl.startsWith('images/upload-')) {
        const filePath = path.join(__dirname, imgUrl);
        if (fs.existsSync(filePath)) {
          try {
            fs.unlinkSync(filePath);
          } catch (e) {
            console.error('Failed to delete image file:', filePath, e);
          }
        }
      }
    });
  }

  writeJSON(PRODUCTS_FILE, filteredProducts);
  res.json({ success: true, message: 'Product deleted successfully' });
});

// ── ORDERS API ──

// Submit a new order (Public checkout)
app.post('/api/orders', (req, res) => {
  const orders = readJSON(ORDERS_FILE, []);
  const orderData = req.body;

  if (!orderData.shippingInfo || !orderData.items || orderData.items.length === 0) {
    return res.status(400).json({ error: 'Invalid order structure or empty cart' });
  }

  // Set order defaults
  orderData.orderId = orderData.orderId || '#ZC-' + Math.floor(100000 + Math.random() * 900000);
  orderData.status = 'Pending'; // Pending, Shipped, Delivered, Cancelled
  orderData.date = new Date().toLocaleString();
  orderData.tracking = {
    courier: '',
    trackingNumber: '',
    statusUpdates: [
      { status: 'Pending', details: 'Order received and is pending confirmation.', time: new Date().toLocaleString() }
    ]
  };

  orders.push(orderData);
  writeJSON(ORDERS_FILE, orders);
  res.status(201).json(orderData);
});

// Get all orders (Admin only)
app.get('/api/orders', requireAdmin, (req, res) => {
  const orders = readJSON(ORDERS_FILE, []);
  // Return orders sorted by date (newest first)
  res.json(orders.reverse());
});

// Update order status/tracking (Admin only)
app.put('/api/orders/:id', requireAdmin, (req, res) => {
  const orders = readJSON(ORDERS_FILE, []);
  const orderId = req.params.id; // Can be internal ID or generated orderId e.g. #ZC-123456
  const index = orders.findIndex(o => o.orderId === orderId);

  if (index === -1) {
    return res.status(404).json({ error: 'Order not found' });
  }

  const { status, courier, trackingNumber, statusDetails } = req.body;
  const order = orders[index];

  if (status && status !== order.status) {
    order.status = status;
    order.tracking.statusUpdates.push({
      status: status,
      details: statusDetails || `Order status updated to: ${status}`,
      time: new Date().toLocaleString()
    });
  }

  if (courier !== undefined) order.tracking.courier = courier;
  if (trackingNumber !== undefined) order.tracking.trackingNumber = trackingNumber;

  orders[index] = order;
  writeJSON(ORDERS_FILE, orders);
  res.json(order);
});

// Public order tracking
app.get('/api/orders/track/:query', (req, res) => {
  const orders = readJSON(ORDERS_FILE, []);
  const query = req.params.query.trim().toLowerCase();

  // Search by exact orderId or phone number
  const matchingOrder = orders.find(o => 
    o.orderId.toLowerCase() === query || 
    o.orderId.toLowerCase() === '#' + query || 
    o.shippingInfo.phone.replace(/[\s-]/g, '') === query.replace(/[\s-]/g, '')
  );

  if (!matchingOrder) {
    return res.status(404).json({ error: 'No matching order found.' });
  }

  // Return public subset of order details for privacy
  res.json({
    orderId: matchingOrder.orderId,
    status: matchingOrder.status,
    date: matchingOrder.date,
    items: matchingOrder.items.map(i => ({ name: i.name, size: i.size, qty: i.qty })),
    financials: {
      total: matchingOrder.financials.total
    },
    tracking: matchingOrder.tracking
  });
});

// ── HOMEPAGE CONFIG API ──

// Get homepage settings
app.get('/api/homepage', (req, res) => {
  const config = readJSON(HOMEPAGE_FILE, {
    announcementBar: "FREE DELIVERY ON ORDERS PKR 2,999 OR ABOVE · Orders are delivered within 4–5 business days · NEW DROP IS NOW LIVE 🖤 · SHOP NOW",
    heroTitle: "NEW SEASON.\nNEW DROPS.",
    heroSubtitle: "Explore the latest from Zero Collection",
    showSaleSection: true,
    saleTitle: "SALE IS LIVE 🖤",
    saleSubtitle: "UP TO 40% OFF ON SELECTED ITEMS"
  });
  res.json(config);
});

// Update homepage settings (Admin)
app.put('/api/homepage', requireAdmin, (req, res) => {
  const config = req.body;
  writeJSON(HOMEPAGE_FILE, config);
  res.json(config);
});

// ── IMAGE UPLOAD (Admin) ──
app.post('/api/upload', requireAdmin, (req, res) => {
  upload.single('image')(req, res, (err) => {
    if (err) {
      return res.status(400).json({ error: err.message });
    }
    if (!req.file) {
      return res.status(400).json({ error: 'Please select an image file to upload' });
    }
    // Return the relative URL path of the uploaded image
    res.json({ imageUrl: 'images/' + req.file.filename });
  });
});

/* ==========================================================================
   STATIC FILE SERVING
   ========================================================================== */

// Serve static assets (images, CSS, JS)
app.use('/images', express.static(path.join(__dirname, 'images')));
app.use('/css', express.static(path.join(__dirname, 'css')));
app.use('/js', express.static(path.join(__dirname, 'js')));

// Serve main pages
app.get('/', (req, res) => res.sendFile(path.join(__dirname, 'index.html')));
app.get('/index.html', (req, res) => res.sendFile(path.join(__dirname, 'index.html')));
app.get('/product.html', (req, res) => res.sendFile(path.join(__dirname, 'product.html')));
app.get('/sale.html', (req, res) => res.sendFile(path.join(__dirname, 'sale.html')));
app.get('/shirts.html', (req, res) => res.sendFile(path.join(__dirname, 'shirts.html')));
app.get('/hoodies.html', (req, res) => res.sendFile(path.join(__dirname, 'hoodies.html')));
app.get('/jackets.html', (req, res) => res.sendFile(path.join(__dirname, 'jackets.html')));
app.get('/tshirts.html', (req, res) => res.sendFile(path.join(__dirname, 'tshirts.html')));
app.get('/checkout.html', (req, res) => res.sendFile(path.join(__dirname, 'checkout.html')));
app.get('/order-confirm.html', (req, res) => res.sendFile(path.join(__dirname, 'order-confirm.html')));
app.get('/admin.html', (req, res) => res.sendFile(path.join(__dirname, 'admin.html')));
app.get('/track.html', (req, res) => res.sendFile(path.join(__dirname, 'track.html')));

// Catch-all fall back to index
app.get('*', (req, res) => res.sendFile(path.join(__dirname, 'index.html')));

// Error handling middleware
app.use((err, req, res, next) => {
  console.error('Express Error Handler:', err);
  res.status(500).json({ error: 'Internal Server Error' });
});

// Start Server
app.listen(PORT, () => {
  console.log(`ZERO COLLECTION server running at http://localhost:${PORT}`);
});
