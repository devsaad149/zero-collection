/* =============================================
   ZERO COLLECTION — Global UI Logic
   ============================================= */

document.addEventListener('DOMContentLoaded', () => {
  setupHeaderScroll();
  setupMobileMenu();
  setupSearchDropdown();
  setupWhatsApp();
  setupCookieNotice();
  setupAccordions();
  setActiveNavLink();
  loadHomepageConfig();
});

// ── Header Scroll Behavior ──
function setupHeaderScroll() {
  const header = document.getElementById('siteHeader');
  if (!header) return;

  let lastScrollY = window.scrollY;

  window.addEventListener('scroll', () => {
    if (window.scrollY > 50) {
      header.style.boxShadow = '0 4px 20px rgba(0, 0, 0, 0.05)';
    } else {
      header.style.boxShadow = 'none';
    }
    
    // Auto-hide/reveal header on scroll down/up
    if (window.scrollY > lastScrollY && window.scrollY > 150) {
      header.style.transform = 'translateY(-100%)';
    } else {
      header.style.transform = 'translateY(0)';
    }
    lastScrollY = window.scrollY;
  });
}

// ── Mobile Menu Toggle ──
function setupMobileMenu() {
  const menuBtn = document.getElementById('mobileMenuBtn');
  const closeBtn = document.getElementById('mobileMenuClose');
  const menuOverlay = document.getElementById('mobileMenuOverlay');
  const siteOverlay = document.getElementById('siteOverlay');

  if (!menuOverlay || !menuBtn || !closeBtn || !siteOverlay) return;

  menuBtn.addEventListener('click', () => {
    menuOverlay.classList.add('active');
    siteOverlay.classList.add('active');
    document.body.style.overflow = 'hidden';
  });

  const closeMenu = () => {
    menuOverlay.classList.remove('active');
    // Only remove global overlay if cart drawer is not open
    const cartDrawer = document.getElementById('cartDrawer');
    const cartActive = cartDrawer && cartDrawer.classList.contains('active');
    const searchDropdown = document.getElementById('searchDropdown');
    const searchActive = searchDropdown && searchDropdown.classList.contains('active');
    
    if (!cartActive && !searchActive) {
      siteOverlay.classList.remove('active');
      document.body.style.overflow = '';
    }
  };

  closeBtn.addEventListener('click', closeMenu);
  siteOverlay.addEventListener('click', closeMenu);
}

// ── Search Dropdown & Live Search ──
function setupSearchDropdown() {
  const searchToggle = document.getElementById('searchToggleBtn');
  const searchDropdown = document.getElementById('searchDropdown');
  const searchInput = document.getElementById('searchInput');
  const searchResultsPreview = document.getElementById('searchResultsPreview');
  const siteOverlay = document.getElementById('siteOverlay');

  if (!searchToggle || !searchDropdown || !siteOverlay) return;

  searchToggle.addEventListener('click', () => {
    if (searchDropdown.classList.contains('active')) {
      closeSearch();
    } else {
      // Close other things first
      if (typeof closeCartDrawer === 'function') closeCartDrawer();
      const mobileMenu = document.getElementById('mobileMenuOverlay');
      if (mobileMenu) mobileMenu.classList.remove('active');

      searchDropdown.classList.add('active');
      siteOverlay.classList.add('active');
      document.body.style.overflow = 'hidden';
      setTimeout(() => searchInput.focus(), 100);
    }
  });

  const closeSearch = () => {
    searchDropdown.classList.remove('active');
    const cartDrawer = document.getElementById('cartDrawer');
    const cartActive = cartDrawer && cartDrawer.classList.contains('active');
    const mobileMenu = document.getElementById('mobileMenuOverlay');
    const mobileActive = mobileMenu && mobileMenu.classList.contains('active');

    if (!cartActive && !mobileActive) {
      siteOverlay.classList.remove('active');
      document.body.style.overflow = '';
    }
    if (searchInput) searchInput.value = '';
    if (searchResultsPreview) searchResultsPreview.innerHTML = '';
  };

  siteOverlay.addEventListener('click', closeSearch);

  // Live search keyup event
  if (searchInput && searchResultsPreview) {
    const initSearch = (e) => {
      const query = e.target.value.trim().toLowerCase();
      if (query.length < 2) {
        searchResultsPreview.innerHTML = '';
        return;
      }
      const matches = PRODUCTS.filter(p =>
        p.name.toLowerCase().includes(query) ||
        p.category.toLowerCase().includes(query) ||
        (p.description && p.description.toLowerCase().includes(query))
      ).slice(0, 4);

      if (matches.length === 0) {
        searchResultsPreview.innerHTML = `
          <div style="grid-column: 1 / -1; text-align: center; padding: 20px; color: var(--color-grey);">
            NO PRODUCTS FOUND FOR "${query.toUpperCase()}"
          </div>
        `;
        return;
      }

      let html = '';
      matches.forEach(product => {
        const hasSale = product.onSale && product.salePrice;
        const displayPrice = hasSale ? product.salePrice : product.price;
        const formattedPrice = 'PKR ' + displayPrice.toLocaleString('en-PK');
        
        html += `
          <a href="product.html?id=${product.id}" class="search-result-item" style="display: flex; align-items: center; gap: 12px; padding: 8px; border: 1px solid var(--color-grey-light); text-decoration: none;">
            <img src="${product.images[0]}" alt="${product.name}" style="width: 50px; height: 50px; object-fit: cover; background-color: var(--color-grey-light);">
            <div>
              <h5 class="uppercase" style="font-size: 0.8rem; font-weight: 700; color: var(--color-black); margin-bottom: 2px;">${product.name}</h5>
              <span style="font-size: 0.75rem; font-weight: 600; color: var(--color-black);">${formattedPrice}</span>
            </div>
          </a>
        `;
      });
      searchResultsPreview.innerHTML = html;
    });

    // Form submit or enter key
    searchInput.addEventListener('keypress', (e) => {
      if (e.key === 'Enter') {
        const query = searchInput.value.trim();
        if (query.length > 0) {
          window.location.href = `shirts.html?search=${encodeURIComponent(query)}`;
        }
      }
    });
  }
}

// ── Floating WhatsApp Button ──
function setupWhatsApp() {
  const whatsappEl = document.getElementById('whatsappBtn');
  if (!whatsappEl) return;

  whatsappEl.addEventListener('click', () => {
    const phone = '+923000000000'; // Replace with brand phone
    const text = encodeURIComponent("Hi, I'd like to place an order from Zero Collection.");
    const url = `https://wa.me/${phone}?text=${text}`;
    window.open(url, '_blank');
  });
}

// ── Cookie/Privacy Notice Bar ──
function setupCookieNotice() {
  const cookieBar = document.getElementById('cookieNotice');
  const acceptBtn = document.getElementById('cookieAcceptBtn');

  if (!cookieBar || !acceptBtn) return;

  const cookieAccepted = localStorage.getItem('zero_collection_cookies');
  if (!cookieAccepted) {
    setTimeout(() => {
      cookieBar.classList.add('active');
    }, 2000);
  }

  acceptBtn.addEventListener('click', () => {
    localStorage.setItem('zero_collection_cookies', 'true');
    cookieBar.classList.remove('active');
  });
}

// ── Accordion Collapsible System ──
function setupAccordions() {
  const headers = document.querySelectorAll('.accordion-header');
  headers.forEach(header => {
    header.addEventListener('click', () => {
      const parent = header.parentElement;
      const content = header.nextElementSibling;
      const isActive = parent.classList.contains('active');
      
      // Close other accordions in the same container
      const container = parent.parentElement;
      const items = container.querySelectorAll('.accordion-item');
      items.forEach(item => {
        item.classList.remove('active');
        const c = item.querySelector('.accordion-content');
        if (c) c.style.maxHeight = null;
      });

      if (!isActive) {
        parent.classList.add('active');
        content.style.maxHeight = content.scrollHeight + 'px';
      } else {
        parent.classList.remove('active');
        content.style.maxHeight = null;
      }
    });
  });
}

// ── Active Page Underlining ──
function setActiveNavLink() {
  const currentPath = window.location.pathname;
  const navLinks = document.querySelectorAll('.nav-link, .mobile-nav-link');
  
  navLinks.forEach(link => {
    const href = link.getAttribute('href');
    if (!href) return;
    
    // Check match
    const isHome = currentPath === '/' || currentPath.endsWith('index.html');
    const linkIsHome = href === 'index.html';
    
    if (isHome && linkIsHome) {
      link.classList.add('active');
    } else if (!linkIsHome && currentPath.includes(href)) {
      link.classList.add('active');
    } else {
      link.classList.remove('active');
    }
  });
}

// ── Load Dynamic Homepage Config ──
function loadHomepageConfig() {
  fetch('/api/homepage?t=' + Date.now())
    .then(res => res.json())
    .then(config => {
      // 1. Update Announcement Bar (on all pages)
      if (config.announcementBar) {
        const marqueeSpans = document.querySelectorAll('.announcement-bar .marquee-content span');
        marqueeSpans.forEach(span => {
          span.textContent = config.announcementBar;
        });
      }

      // 2. Index Page Specifics
      const isIndex = window.location.pathname === '/' || window.location.pathname.endsWith('index.html') || window.location.pathname.split('/').pop() === '';
      if (isIndex) {
        // Hero Section Title
        const heroTitleEl = document.querySelector('.hero-section h1');
        if (heroTitleEl && config.heroTitle) {
          heroTitleEl.innerHTML = config.heroTitle.replace(/\n/g, '<br>');
        }
        
        // Hero Section Subtitle
        const heroSubtitleEl = document.querySelector('.hero-section p');
        if (heroSubtitleEl && config.heroSubtitle) {
          heroSubtitleEl.textContent = config.heroSubtitle;
        }

        // Hero Section Background
        const heroSection = document.querySelector('.hero-section');
        if (heroSection && config.heroImg) {
          heroSection.style.backgroundImage = `url('${config.heroImg}')`;
          heroSection.style.backgroundSize = 'cover';
          heroSection.style.backgroundPosition = 'center';
        }

        // Category Images
        applyCategoryImage('catShirts', config.shirtsImg);
        applyCategoryImage('catHoodies', config.hoodiesImg);
        applyCategoryImage('catJackets', config.jacketsImg);
        applyCategoryImage('catTshirts', config.tshirtsImg);

        // Sale Section visibility, title, subtitle & background
        const saleSection = document.getElementById('saleSection');
        if (saleSection) {
          if (config.showSaleSection === false) {
            saleSection.style.display = 'none';
          } else {
            saleSection.style.display = 'block';
            
            const saleTitleEl = document.getElementById('saleTitleText');
            if (saleTitleEl && config.saleTitle) {
              saleTitleEl.textContent = config.saleTitle;
            }
            
            const saleSubtitleEl = document.getElementById('saleSubtitleText');
            if (saleSubtitleEl && config.saleSubtitle) {
              saleSubtitleEl.textContent = config.saleSubtitle;
            }

            if (config.saleImg) {
              saleSection.style.backgroundImage = `url('${config.saleImg}')`;
              saleSection.style.backgroundSize = 'cover';
              saleSection.style.backgroundPosition = 'center';
            }
          }
        }

        // Instagram Feed Images
        const igGrid = document.getElementById('instagramFeedGrid');
        if (igGrid) {
          const igImages = [
            config.igImg1, config.igImg2, config.igImg3,
            config.igImg4, config.igImg5, config.igImg6
          ];
          
          let igHtml = '';
          igImages.forEach(imgUrl => {
            if (imgUrl) {
              igHtml += `
                <a href="https://www.instagram.com/zerocollection_?igsh=emFidHg2NDhmYmZ4" target="_blank" class="img-zoom-container" style="display: block; aspect-ratio: 1/1; background-color: var(--color-black); position: relative; border: 1px solid var(--color-black); text-decoration: none;">
                  <img src="${imgUrl}" alt="Instagram Feed Image" style="width: 100%; height: 100%; object-fit: cover;" loading="lazy" />
                  <div class="grain-overlay"></div>
                </a>
              `;
            } else {
              // Fallback blank box if no image uploaded
              igHtml += `
                <a href="https://www.instagram.com/zerocollection_?igsh=emFidHg2NDhmYmZ4" target="_blank" class="img-zoom-container" style="display: block; aspect-ratio: 1/1; background-color: var(--color-black); position: relative; border: 1px solid var(--color-black); text-decoration: none;">
                  <div class="grain-overlay"></div>
                </a>
              `;
            }
          });
          igGrid.innerHTML = igHtml;
        }
      }
    })
    .catch(err => console.error("Error loading dynamic homepage settings:", err));
}

function applyCategoryImage(containerId, imgPath) {
  const container = document.getElementById(containerId);
  if (!container) return;

  if (imgPath) {
    // Check if there is already a custom img tag, else create one
    let img = container.querySelector('.category-bg-img');
    if (!img) {
      img = document.createElement('img');
      img.className = 'category-bg-img';
      img.style.position = 'absolute';
      img.style.top = '0';
      img.style.left = '0';
      img.style.width = '100%';
      img.style.height = '100%';
      img.style.objectFit = 'cover';
      img.style.zIndex = '1';
      img.style.opacity = '0.6';
      img.style.transition = 'transform 0.5s var(--transition-ease)';
      container.appendChild(img);
    }
    img.src = imgPath;
    img.style.display = 'block';
  }
}
