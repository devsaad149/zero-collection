const express = require('express');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const { MongoClient } = require('mongodb');

const app = express();
const PORT = process.env.PORT || 8080;

// Configuration
const DATA_DIR = path.join(__dirname, 'data');
const PRODUCTS_FILE = path.join(DATA_DIR, 'products.json');
const ORDERS_FILE = path.join(DATA_DIR, 'orders.json');
const HOMEPAGE_FILE = path.join(DATA_DIR, 'homepage.json');
const ADMIN_TOKEN = 'zero-collection-admin-secure-token-2026';

// Cloud Database Configuration
const MONGODB_URI = process.env.MONGODB_URI || null;
let dbClient = null;
let db = null;

let cachedDb = null;
let cachedClient = null;

async function getDatabase() {
  if (cachedDb) {
    return cachedDb;
  }
  if (!MONGODB_URI) {
    return null;
  }
  try {
    console.log('Connecting to cloud MongoDB Atlas (serverless pool)...');
    cachedClient = new MongoClient(MONGODB_URI);
    await cachedClient.connect();
    cachedDb = cachedClient.db('zerocollection');
    console.log('Connected to cloud MongoDB Atlas successfully!');
    await seedDatabase(cachedDb);
    return cachedDb;
  } catch (err) {
    console.error('Failed to connect to MongoDB Atlas in serverless pool:', err);
    return null;
  }
}

async function seedDatabase(database) {
  try {
    const homepageCol = database.collection('homepage');
    const homepageCount = await homepageCol.countDocuments();
    if (homepageCount === 0) {
      const localHomepage = readJSON(HOMEPAGE_FILE, {
        announcementBar: "FREE DELIVERY ON ORDERS PKR 2,999 OR ABOVE · Orders are delivered within 4–5 business days · NEW DROP IS NOW LIVE 🖤 · SHOP NOW",
        heroTitle: "NEW SEASON.\nNEW DROPS.",
        heroSubtitle: "Explore the latest from Zero Collection",
        showSaleSection: true,
        saleTitle: "SALE IS LIVE 🖤",
        saleSubtitle: "UP TO 40% OFF ON SELECTED ITEMS"
      });
      delete localHomepage._id;
      localHomepage.configId = "main";
      await homepageCol.insertOne(localHomepage);
      console.log('Seeded default homepage settings into cloud database.');
    }

    const productsCol = database.collection('products');
    const productsCount = await productsCol.countDocuments();
    if (productsCount === 0) {
      const localProducts = readJSON(PRODUCTS_FILE, []);
      if (localProducts.length > 0) {
        const sanitizedProducts = localProducts.map(p => {
          const clean = { ...p };
          delete clean._id;
          return clean;
        });
        await productsCol.insertMany(sanitizedProducts);
        console.log(`Seeded ${localProducts.length} products into cloud database.`);
      }
    }
  } catch (err) {
    console.error('Error during database seeding:', err);
  }
}

async function useDatabase(req, res, next) {
  try {
    db = await getDatabase();
    next();
  } catch (err) {
    console.error('Database middleware error:', err);
    next();
  }
}

// Ensure local data directory exists (for offline fallback)
if (!fs.existsSync(DATA_DIR)) {
  fs.mkdirSync(DATA_DIR, { recursive: true });
}

// Middleware
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: true, limit: '50mb' }));
app.use(useDatabase);

// API Cache-Control Middleware to prevent browser and CDN caching
app.use('/api', (req, res, next) => {
  res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate');
  res.setHeader('Pragma', 'no-cache');
  res.setHeader('Expires', '0');
  next();
});

// Auth helper
function requireAdmin(req, res, next) {
  const token = req.headers['authorization'] || req.headers['x-admin-token'];
  if (token === ADMIN_TOKEN || token === `Bearer ${ADMIN_TOKEN}`) {
    next();
  } else {
    res.status(401).json({ error: 'Unauthorized: Admin access required' });
  }
}

// Multer Storage Setup
let upload;
if (MONGODB_URI) {
  // Cloud Mode: Use memory storage to intercept file buffers and convert them to base64
  upload = multer({
    storage: multer.memoryStorage(),
    limits: { fileSize: 10 * 1024 * 1024 }, // 10MB limit
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
} else {
  // Local Mode: Use disk storage to write files to /images
  const storage = multer.diskStorage({
    destination: (req, file, cb) => {
      cb(null, path.join(__dirname, 'images'));
    },
    filename: (req, file, cb) => {
      const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1e9);
      cb(null, 'upload-' + uniqueSuffix + path.extname(file.originalname));
    }
  });
  upload = multer({
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
}

// Helper functions to read/write JSON files safely (Local Mode Fallback)
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

// Old initDB helper removed (database connections are now managed dynamically per-request)

/* ==========================================================================
   API ENDPOINTS
   ========================================================================== */

// ── DIAGNOSTICS & TESTING ──
app.get('/api/test-db', async (req, res) => {
  const report = {
    timestamp: new Date().toISOString(),
    env: {
      has_mongodb_uri: !!process.env.MONGODB_URI,
      masked_mongodb_uri: process.env.MONGODB_URI 
        ? process.env.MONGODB_URI.replace(/:([^@]+)@/, ':****@') 
        : null,
      node_env: process.env.NODE_ENV || 'not set',
      vercel: !!process.env.VERCEL,
    },
    database: {
      connected: !!db,
      is_fallback_local: !db,
    },
    tests: {
      products_write: 'not run',
      products_read: 'not run',
      products_delete: 'not run',
      homepage_write: 'not run',
      homepage_read: 'not run',
    },
    errors: {}
  };

  if (!db) {
    report.message = "No MongoDB Atlas connection. Running in local fallback mode.";
    return res.json(report);
  }

  try {
    const productsCol = db.collection('products');
    
    // Test write
    const testDoc = { 
      id: 'test-diagnostic-product',
      name: 'Test Diagnostic Product', 
      category: 'tshirts', 
      price: 999, 
      isTest: true,
      timestamp: new Date().toISOString()
    };
    
    report.tests.products_write = 'started';
    const insertResult = await productsCol.insertOne(testDoc);
    report.tests.products_write = `success (insertedId: ${insertResult.insertedId})`;

    // Test read
    report.tests.products_read = 'started';
    const foundDoc = await productsCol.findOne({ id: 'test-diagnostic-product' });
    if (foundDoc) {
      report.tests.products_read = `success (found product with id: ${foundDoc.id})`;
    } else {
      report.tests.products_read = 'failed: product not found after insert';
    }

    // Test delete
    report.tests.products_delete = 'started';
    const deleteResult = await productsCol.deleteOne({ id: 'test-diagnostic-product' });
    report.tests.products_delete = `success (deletedCount: ${deleteResult.deletedCount})`;

  } catch (err) {
    report.tests.products_write = 'failed';
    report.tests.products_write_error = err.message;
    report.errors.products_phase = err.stack;
  }

  try {
    const homepageCol = db.collection('homepage');
    
    // Test read
    report.tests.homepage_read = 'started';
    const homeDoc = await homepageCol.findOne({});
    report.tests.homepage_read = `success (found announcement: ${homeDoc ? homeDoc.announcementBar : 'none'})`;

    // Test write/update (non-destructive test by writing back a diagnostic timestamp)
    if (homeDoc) {
      report.tests.homepage_write = 'started';
      const updateResult = await homepageCol.updateOne(
        { _id: homeDoc._id },
        { $set: { lastDiagnosticCheck: new Date().toISOString() } }
      );
      report.tests.homepage_write = `success (modifiedCount: ${updateResult.modifiedCount})`;
    } else {
      report.tests.homepage_write = 'failed: homepage doc not found to test update';
    }

  } catch (err) {
    report.tests.homepage_write = 'failed';
    report.tests.homepage_write_error = err.message;
    report.errors.homepage_phase = err.stack;
  }

  res.json(report);
});

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
app.get('/api/products', async (req, res) => {
  try {
    if (db) {
      const products = await db.collection('products').find({}).toArray();
      res.json(products);
    } else {
      res.json(readJSON(PRODUCTS_FILE, []));
    }
  } catch (err) {
    console.error('Error fetching products:', err);
    res.status(500).json({ error: 'Failed to retrieve products' });
  }
});

// Add a product (Admin)
app.post('/api/products', requireAdmin, async (req, res) => {
  try {
    let products = [];
    if (db) {
      products = await db.collection('products').find({}).toArray();
    } else {
      products = readJSON(PRODUCTS_FILE, []);
    }
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

    if (db) {
      await db.collection('products').insertOne(newProduct);
    } else {
      products.push(newProduct);
      writeJSON(PRODUCTS_FILE, products);
    }
    res.status(201).json(newProduct);
  } catch (err) {
    console.error('Error adding product:', err);
    res.status(500).json({ error: 'Failed to add product' });
  }
});

// Edit a product (Admin)
app.put('/api/products/:id', requireAdmin, async (req, res) => {
  try {
    const productId = req.params.id;
    let products = [];
    let existingProduct = null;

    if (db) {
      existingProduct = await db.collection('products').findOne({ id: productId });
    } else {
      products = readJSON(PRODUCTS_FILE, []);
      existingProduct = products.find(p => p.id === productId);
    }

    if (!existingProduct) {
      return res.status(404).json({ error: 'Product not found' });
    }

    const updateData = { ...req.body };
    delete updateData._id; // Ensure internal Mongo DB ID is not overwritten

    const updatedProduct = { ...existingProduct, ...updateData };
    delete updatedProduct._id; // Prevent Mongo immutable _id field write exception
    updatedProduct.price = Number(updatedProduct.price);
    if (updatedProduct.salePrice !== undefined) {
      updatedProduct.salePrice = updatedProduct.salePrice ? Number(updatedProduct.salePrice) : null;
    }
    updatedProduct.onSale = !!updatedProduct.onSale;
    updatedProduct.featured = !!updatedProduct.featured;
    updatedProduct.images = updatedProduct.images || [];
    updatedProduct.sizes = updatedProduct.sizes || [];
    updatedProduct.features = updatedProduct.features || [];

    if (db) {
      await db.collection('products').updateOne({ id: productId }, { $set: updatedProduct });
    } else {
      const index = products.findIndex(p => p.id === productId);
      products[index] = updatedProduct;
      writeJSON(PRODUCTS_FILE, products);
    }
    res.json(updatedProduct);
  } catch (err) {
    console.error('Error updating product:', err);
    res.status(500).json({ error: 'Failed to update product' });
  }
});

// Delete a product (Admin)
app.delete('/api/products/:id', requireAdmin, async (req, res) => {
  try {
    const productId = req.params.id;
    let products = [];
    let productToDelete = null;

    if (db) {
      productToDelete = await db.collection('products').findOne({ id: productId });
    } else {
      products = readJSON(PRODUCTS_FILE, []);
      productToDelete = products.find(p => p.id === productId);
    }

    if (!productToDelete) {
      return res.status(404).json({ error: 'Product not found' });
    }

    // Local only: delete associated uploaded images from disk
    if (!db && productToDelete.images) {
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

    if (db) {
      await db.collection('products').deleteOne({ id: productId });
    } else {
      const filteredProducts = products.filter(p => p.id !== productId);
      writeJSON(PRODUCTS_FILE, filteredProducts);
    }
    res.json({ success: true, message: 'Product deleted successfully' });
  } catch (err) {
    console.error('Error deleting product:', err);
    res.status(500).json({ error: 'Failed to delete product' });
  }
});

// ── ORDERS API ──

// Submit a new order (Public checkout)
app.post('/api/orders', async (req, res) => {
  try {
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

    if (db) {
      await db.collection('orders').insertOne(orderData);
    } else {
      const orders = readJSON(ORDERS_FILE, []);
      orders.push(orderData);
      writeJSON(ORDERS_FILE, orders);
    }
    res.status(201).json(orderData);
  } catch (err) {
    console.error('Error submitting order:', err);
    res.status(500).json({ error: 'Failed to place order' });
  }
});

// Get all orders (Admin only)
app.get('/api/orders', requireAdmin, async (req, res) => {
  try {
    if (db) {
      const orders = await db.collection('orders').find({}).toArray();
      res.json(orders.reverse());
    } else {
      const orders = readJSON(ORDERS_FILE, []);
      res.json(orders.reverse());
    }
  } catch (err) {
    console.error('Error loading orders:', err);
    res.status(500).json({ error: 'Failed to load orders' });
  }
});

// Update order status/tracking (Admin only)
app.put('/api/orders/:id', requireAdmin, async (req, res) => {
  try {
    const orderId = req.params.id;
    let orders = [];
    let order = null;

    if (db) {
      order = await db.collection('orders').findOne({ orderId: orderId });
    } else {
      orders = readJSON(ORDERS_FILE, []);
      order = orders.find(o => o.orderId === orderId);
    }

    if (!order) {
      return res.status(404).json({ error: 'Order not found' });
    }

    const { status, courier, trackingNumber, statusDetails } = req.body;

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

    if (db) {
      delete order._id;
      await db.collection('orders').updateOne({ orderId: orderId }, { $set: order });
    } else {
      const index = orders.findIndex(o => o.orderId === orderId);
      orders[index] = order;
      writeJSON(ORDERS_FILE, orders);
    }
    res.json(order);
  } catch (err) {
    console.error('Error updating order status:', err);
    res.status(500).json({ error: 'Failed to update order status' });
  }
});

// Public order tracking
app.get('/api/orders/track/:query', async (req, res) => {
  try {
    const query = req.params.query.trim().toLowerCase();
    let matchingOrder = null;

    if (db) {
      const cleanPhone = query.replace(/[\s-]/g, '');
      const searchOptions = [
        { orderId: { $regex: new RegExp('^' + query.replace('#', '') + '$', 'i') } }
      ];
      if (cleanPhone.length > 5) {
        searchOptions.push({ 'shippingInfo.phone': { $regex: new RegExp(cleanPhone, 'i') } });
      }
      matchingOrder = await db.collection('orders').findOne({ $or: searchOptions });
    } else {
      const orders = readJSON(ORDERS_FILE, []);
      matchingOrder = orders.find(o => 
        o.orderId.toLowerCase() === query || 
        o.orderId.toLowerCase() === '#' + query || 
        o.shippingInfo.phone.replace(/[\s-]/g, '') === query.replace(/[\s-]/g, '')
      );
    }

    if (!matchingOrder) {
      return res.status(404).json({ error: 'No matching order found.' });
    }

    // Return public subset of order details for security/privacy
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
  } catch (err) {
    console.error('Error tracking order:', err);
    res.status(500).json({ error: 'Failed to track order' });
  }
});

// ── HOMEPAGE CONFIG API ──

// Get homepage settings
app.get('/api/homepage', async (req, res) => {
  try {
    if (db) {
      let config = await db.collection('homepage').findOne({ configId: "main" });
      if (!config) {
        config = await db.collection('homepage').findOne({});
        if (config && !config.configId) {
          await db.collection('homepage').updateOne({ _id: config._id }, { $set: { configId: "main" } });
          config.configId = "main";
        }
      }
      if (config) {
        res.json(config);
      } else {
        res.json({
          configId: "main",
          announcementBar: "FREE DELIVERY ON ORDERS PKR 2,999 OR ABOVE · Orders are delivered within 4–5 business days · NEW DROP IS NOW LIVE 🖤 · SHOP NOW",
          heroTitle: "NEW SEASON.\nNEW DROPS.",
          heroSubtitle: "Explore the latest from Zero Collection",
          showSaleSection: true,
          saleTitle: "SALE IS LIVE 🖤",
          saleSubtitle: "UP TO 40% OFF ON SELECTED ITEMS"
        });
      }
    } else {
      const config = readJSON(HOMEPAGE_FILE, {
        configId: "main",
        announcementBar: "FREE DELIVERY ON ORDERS PKR 2,999 OR ABOVE · Orders are delivered within 4–5 business days · NEW DROP IS NOW LIVE 🖤 · SHOP NOW",
        heroTitle: "NEW SEASON.\nNEW DROPS.",
        heroSubtitle: "Explore the latest from Zero Collection",
        showSaleSection: true,
        saleTitle: "SALE IS LIVE 🖤",
        saleSubtitle: "UP TO 40% OFF ON SELECTED ITEMS"
      });
      res.json(config);
    }
  } catch (err) {
    console.error('Error loading homepage config:', err);
    res.status(500).json({ error: 'Failed to load settings' });
  }
});

// Update homepage settings (Admin)
app.put('/api/homepage', requireAdmin, async (req, res) => {
  try {
    const incomingConfig = req.body;
    delete incomingConfig._id;

    const imageFields = ['heroImg', 'saleImg', 'shirtsImg', 'hoodiesImg', 'jacketsImg', 'tshirtsImg'];

    if (db) {
      let existingConfig = await db.collection('homepage').findOne({ configId: "main" });
      if (!existingConfig) {
        existingConfig = await db.collection('homepage').findOne({});
      }

      const mergedConfig = { ...existingConfig, ...incomingConfig, configId: "main" };

      // Preserve existing images if the incoming ones are empty
      imageFields.forEach(field => {
        if (!incomingConfig[field] && existingConfig && existingConfig[field]) {
          mergedConfig[field] = existingConfig[field];
        }
      });

      delete mergedConfig._id; // Prevent Mongo immutable _id field write exception

      await db.collection('homepage').updateOne(
        { configId: "main" },
        { $set: mergedConfig },
        { upsert: true }
      );
      res.json(mergedConfig);
    } else {
      const existingConfig = readJSON(HOMEPAGE_FILE, {});
      const mergedConfig = { ...existingConfig, ...incomingConfig, configId: "main" };

      imageFields.forEach(field => {
        if (!incomingConfig[field] && existingConfig[field]) {
          mergedConfig[field] = existingConfig[field];
        }
      });

      writeJSON(HOMEPAGE_FILE, mergedConfig);
      res.json(mergedConfig);
    }
  } catch (err) {
    console.error('Error saving homepage config:', err);
    res.status(500).json({ error: 'Failed to save settings' });
  }
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

    if (MONGODB_URI) {
      // Memory Upload (Cloud DB): Convert file buffer to base64 Data URL
      const b64 = req.file.buffer.toString('base64');
      const mime = req.file.mimetype;
      const dataUrl = `data:${mime};base64,${b64}`;
      res.json({ imageUrl: dataUrl });
    } else {
      // Local Disk Upload: Return relative path url
      res.json({ imageUrl: 'images/' + req.file.filename });
    }
  });
});

/* ==========================================================================
   STATIC FILE SERVING
   ========================================================================== */

// Serve static assets
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

// Catch-all fallback to index
app.get('*', (req, res) => res.sendFile(path.join(__dirname, 'index.html')));

// Error handling middleware
app.use((err, req, res, next) => {
  console.error('Express Error Handler:', err);
  res.status(500).json({ error: 'Internal Server Error' });
});

// Start Server
async function startServer() {
  if (!process.env.VERCEL) {
    await getDatabase();
    app.listen(PORT, () => {
      console.log(`ZERO COLLECTION server running at http://localhost:${PORT}`);
    });
  }
}
startServer();

module.exports = app;
