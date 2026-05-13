// --- Fedya Glow Core Logic (French Version) ---

// State Management
const State = {
    categories: JSON.parse(localStorage.getItem('fedya_categories')) || [],
    products: JSON.parse(localStorage.getItem('fedya_products')) || [],
    cart: JSON.parse(localStorage.getItem('fedya_cart')) || [],
    activeCategory: 'all',
    
    save() {
        localStorage.setItem('fedya_categories', JSON.stringify(this.categories));
        localStorage.setItem('fedya_products', JSON.stringify(this.products));
        localStorage.setItem('fedya_cart', JSON.stringify(this.cart));
    },

    async init() {
        try {
            // Force cache refresh to get the latest products
            const response = await fetch('database.json?v=' + Date.now());
            if (response.ok) {
                const data = await response.json();
                
                if (data.products && data.products.length > 0) {
                    this.products = data.products;
                    this.categories = data.categories || [];
                    // We don't necessarily save to localStorage here to avoid 
                    // overwriting admin's local drafts if they are working on them,
                    // but for regular users, this is the data they see.
                    console.log("Données chargées avec succès depuis le serveur.");
                }
            }
        } catch (e) {
            console.log("Mode local : Aucun fichier database.json trouvé.");
        }
    },

    exportData() {
        const data = {
            products: this.products,
            categories: this.categories
        };
        const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = 'database.json';
        a.click();
        URL.revokeObjectURL(url);
    }
};

// --- Utilities ---
function formatPrice(price) {
    return parseFloat(price).toFixed(2) + " €";
}

async function fileToBase64(file) {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => resolve(reader.result);
        reader.onerror = (error) => reject(error);
        reader.readAsDataURL(file);
    });
}

// --- Cart Logic ---
function toggleCart() {
    const sidebar = document.getElementById('cartSidebar');
    const overlay = document.getElementById('overlay');
    sidebar.classList.toggle('active');
    overlay.classList.toggle('active');
    renderCart();
}

function addToCart(productId, sizeIndex) {
    const product = State.products.find(p => p.id == productId);
    if (!product) return;
    
    const size = product.sizes[sizeIndex];
    
    // Add item to cart
    State.cart.push({
        id: Date.now(), // unique instance id
        productId: product.id,
        name: product.name,
        code: size.code || product.code,
        size: size.size,
        price: size.price,
        image: size.image || product.image
    });
    
    State.save();
    updateCartBadge();
    
    // Feedback
    const btn = event.currentTarget;
    const originalText = btn.innerHTML;
    btn.innerHTML = "✅ Ajouté";
    btn.style.background = "#25D366";
    setTimeout(() => {
        btn.innerHTML = originalText;
        btn.style.background = "";
    }, 2000);
}

function removeFromCart(instanceId) {
    State.cart = State.cart.filter(item => item.id !== instanceId);
    State.save();
    renderCart();
    updateCartBadge();
}

function updateCartBadge() {
    const badges = document.querySelectorAll('.cart-count');
    badges.forEach(b => b.innerText = State.cart.length);
}

function renderCart() {
    const container = document.getElementById('cart-items-container');
    if (!container) return;
    
    if (State.cart.length === 0) {
        container.innerHTML = `<div class="text-center py-5"><p>Votre panier est vide</p></div>`;
        document.getElementById('cart-total-amount').innerText = "0.00 €";
        return;
    }
    
    let total = 0;
    container.innerHTML = State.cart.map(item => {
        total += parseFloat(item.price);
        return `
            <div class="cart-item">
                <img src="${item.image}" class="cart-item-img">
                <div class="cart-item-info">
                    <div class="cart-item-title">${item.name}</div>
                    <div class="cart-item-variant">${item.size} | ${item.code}</div>
                    <div class="cart-item-price">${formatPrice(item.price)}</div>
                    <button class="remove-item" onclick="removeFromCart(${item.id})">Supprimer</button>
                </div>
            </div>
        `;
    }).join('');
    
    document.getElementById('cart-total-amount').innerText = formatPrice(total);
}

function sendWhatsApp() {
    if (State.cart.length === 0) return alert("Le panier est vide!");
    
    let message = "Bonjour, je veux commander :\n\n";
    let total = 0;
    
    State.cart.forEach(item => {
        message += `Produit: ${item.name}\n`;
        message += `Code: ${item.code}\n`;
        message += `Taille: ${item.size}\n`;
        message += `Prix: ${formatPrice(item.price)}\n`;
        message += `-------------------\n`;
        total += parseFloat(item.price);
    });
    
    message += `\nTotal: ${formatPrice(total)}`;
    
    const whatsappNumber = "123456789"; 
    const url = `https://wa.me/${whatsappNumber}?text=${encodeURIComponent(message)}`;
    window.open(url, '_blank');
}

// --- Product Rendering ---
function renderCategories() {
    const container = document.getElementById('category-filters');
    if (!container) return;
    
    let html = `<div class="filter-chip ${State.activeCategory === 'all' ? 'active' : ''}" onclick="filterByCategory('all')">Tout</div>`;
    
    State.categories.forEach(cat => {
        html += `<div class="filter-chip ${State.activeCategory == cat.id ? 'active' : ''}" onclick="filterByCategory(${cat.id})">${cat.name}</div>`;
    });
    
    container.innerHTML = html;
}

function filterByCategory(catId) {
    State.activeCategory = catId;
    renderCategories();
    renderProducts();
}

function renderProducts() {
    const container = document.getElementById('products-grid');
    if (!container) return;
    
    let filtered = State.products;
    if (State.activeCategory !== 'all') {
        filtered = State.products.filter(p => p.categoryId == State.activeCategory);
    }
    
    if (filtered.length === 0) {
        container.innerHTML = `<div class="col-12 text-center py-5"><h4>Aucun produit dans cette catégorie pour le moment.</h4></div>`;
        return;
    }
    
    container.innerHTML = filtered.map(product => {
        const defaultSize = product.sizes[0] || { size: 'N/A', price: 0, image: '' };
        const categoryName = State.categories.find(c => c.id == product.categoryId)?.name || 'Général';
        
        return `
            <div class="product-card" data-product-id="${product.id}">
                <div class="product-image-container">
                    <img src="${defaultSize.image}" class="product-image" id="prod-img-${product.id}" loading="lazy">
                </div>
                <div class="product-info">
                    <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 8px;">
                        <div class="product-category">${categoryName}</div>
                        <div class="product-code" id="prod-code-${product.id}" style="font-size: 0.75rem; background: var(--gray-200); padding: 2px 8px; border-radius: 4px; font-weight: 600; color: var(--gray-600);">${defaultSize.code || product.code}</div>
                    </div>
                    <h3 class="product-title">${product.name}</h3>
                    <p class="product-description">${product.description || ''}</p>
                    <div class="product-price" id="prod-price-${product.id}">${formatPrice(defaultSize.price)}</div>
                    
                    <div class="size-selector">
                        ${product.sizes.map((s, idx) => `
                            <button class="size-btn ${idx === 0 ? 'active' : ''}" 
                                onclick="updateProductDisplay(${product.id}, ${idx})">
                                ${s.size}
                            </button>
                        `).join('')}
                    </div>
                    
                    <button class="add-to-cart-btn" onclick="addToCart(${product.id}, getSelectedSizeIndex(${product.id}))">
                        <span>Ajouter au panier</span>
                        <i class="fa-solid fa-cart-plus"></i>
                    </button>
                </div>
            </div>
        `;
    }).join('');
}

function updateProductDisplay(productId, sizeIndex) {
    const product = State.products.find(p => p.id == productId);
    const size = product.sizes[sizeIndex];
    const img = document.getElementById(`prod-img-${productId}`);
    const price = document.getElementById(`prod-price-${productId}`);
    const code = document.getElementById(`prod-code-${productId}`);
    if (img) img.src = size.image;
    if (price) price.innerText = formatPrice(size.price);
    if (code) code.innerText = size.code || product.code;
    const container = document.querySelector(`.product-card[data-product-id="${productId}"]`);
    const buttons = container.querySelectorAll('.size-btn');
    buttons.forEach((btn, idx) => btn.classList.toggle('active', idx === sizeIndex));
}

function getSelectedSizeIndex(productId) {
    const container = document.querySelector(`.product-card[data-product-id="${productId}"]`);
    if (!container) return 0;
    const activeBtn = container.querySelector('.size-btn.active');
    const buttons = Array.from(container.querySelectorAll('.size-btn'));
    return buttons.indexOf(activeBtn);
}

// Navbar Scroll Effect
window.addEventListener('scroll', () => {
    const navbar = document.querySelector('.navbar');
    if (window.scrollY > 50) {
        navbar.classList.add('scrolled');
    } else {
        navbar.classList.remove('scrolled');
    }
});

// --- Admin Logic ---
function adminRenderCategories() {
    const list = document.getElementById('admin-cats-list');
    const select = document.getElementById('prod-cat');
    if (list) {
        list.innerHTML = State.categories.map(cat => `
            <div class="filter-chip active" style="display:flex; align-items:center; gap:10px;">
                ${cat.name}
                <span style="cursor:pointer; font-weight:bold;" onclick="deleteCategory(${cat.id})">×</span>
            </div>
        `).join('');
    }
    if (select) {
        select.innerHTML = State.categories.map(cat => `<option value="${cat.id}">${cat.name}</option>`).join('');
    }
}

function addCategory() {
    const input = document.getElementById('cat-name');
    const name = input.value.trim();
    if (!name) return;
    State.categories.push({ id: Date.now(), name });
    State.save();
    input.value = '';
    adminRenderCategories();
}

function deleteCategory(id) {
    if (confirm('Êtes-vous sûr de vouloir supprimer cette catégorie ? Tous les produits associés seront supprimés.')) {
        State.categories = State.categories.filter(c => c.id != id);
        State.products = State.products.filter(p => p.categoryId != id);
        State.save();
        adminRenderCategories();
        adminRenderProducts();
    }
}

let variantCount = 0;
function addVariantField(size = '', price = '', image = '', code = '') {
    const container = document.getElementById('variants-container');
    const id = ++variantCount;
    const div = document.createElement('div');
    div.className = "variant-row";
    div.id = `variant-${id}`;
    
    // Determine if the initial image is a path or base64
    const isPath = image && !image.startsWith('data:');
    
    div.innerHTML = `
        <button class="remove-variant-btn" onclick="document.getElementById('variant-${id}').remove()">×</button>
        <div class="variant-grid">
            <div class="form-group">
                <label class="form-label">Taille (الحجم)</label>
                <input type="text" class="form-control var-size" value="${size}" placeholder="Ex: 50ml, XL, etc.">
            </div>
            <div class="form-group">
                <label class="form-label">Prix (السعر) €</label>
                <input type="number" step="0.01" class="form-control var-price" value="${price}" placeholder="0.00">
            </div>
            <div class="form-group">
                <label class="form-label">Code / SKU (الرمز)</label>
                <input type="text" class="form-control var-code" value="${code}" placeholder="P001-S">
            </div>
            <div class="form-group">
                <label class="form-label">Image (الصورة)</label>
                <input type="file" class="form-control var-img" accept="image/*" 
                    onchange="previewVariantImage(this, ${id})">
            </div>
            <div class="form-group">
                <label class="form-label">Ou Chemin (أو مسار الصورة)</label>
                <input type="text" class="form-control var-path" value="${isPath ? image : ''}" placeholder="products/prod.jpg">
            </div>
        </div>
        <div id="preview-container-${id}" style="margin-top:10px;">
            ${image ? `<img src="${image}" class="variant-image-preview current-var-img">` : ''}
        </div>
    `;
    container.appendChild(div);
}

function previewVariantImage(input, id) {
    if (input.files && input.files[0]) {
        const reader = new FileReader();
        reader.onload = function(e) {
            const container = document.getElementById(`preview-container-${id}`);
            container.innerHTML = `<img src="${e.target.result}" class="variant-image-preview current-var-img">`;
            
            // Auto-fill path if empty for reference
            const pathInput = input.closest('.variant-row').querySelector('.var-path');
            if(!pathInput.value) pathInput.value = 'products/' + input.files[0].name;
        };
        reader.readAsDataURL(input.files[0]);
    }
}

async function saveProduct() {
    const name = document.getElementById('prod-name').value;
    const code = document.getElementById('prod-code').value;
    const catId = document.getElementById('prod-cat').value;
    const desc = document.getElementById('prod-desc').value;
    
    const variantRows = document.querySelectorAll('.variant-row');
    if (variantRows.length === 0) return alert("Veuillez ajouter au moins une taille.");
    
    let sizes = [];
    for (let row of variantRows) {
        const sizeVal = row.querySelector('.var-size').value;
        const priceVal = row.querySelector('.var-price').value;
        const codeVal = row.querySelector('.var-code').value;
        const imgInput = row.querySelector('.var-img');
        const pathInput = row.querySelector('.var-path').value.trim();
        const currentImgElement = row.querySelector('.current-var-img');
        const currentImg = currentImgElement ? currentImgElement.src : '';
        
        let finalImage = pathInput || currentImg;
        
        // If a new file is uploaded, it takes priority
        if (imgInput.files[0]) {
            finalImage = await fileToBase64(imgInput.files[0]);
        }
        
        if (sizeVal && priceVal) {
            sizes.push({ size: sizeVal, price: priceVal, image: finalImage, code: codeVal });
        }
    }
    if (sizes.length === 0) return alert("Veuillez remplir correctement les données des tailles.");
    const productId = document.getElementById('prod-id')?.value;
    if (productId) {
        const index = State.products.findIndex(p => p.id == productId);
        State.products[index] = { id: productId, name, code, categoryId: catId, description: desc, sizes };
    } else {
        State.products.push({ id: Date.now(), name, code, categoryId: catId, description: desc, sizes });
    }
    State.save();
    alert("Produit enregistré avec succès !");
    window.location.href = 'admin.html';
}

function adminRenderProducts() {
    const container = document.getElementById('admin-products-list');
    if (!container) return;
    container.innerHTML = State.products.map(p => `
        <div class="col-md-4 mb-4">
            <div class="admin-card" style="padding:15px;">
                <div style="display:flex; gap:15px;">
                    <img src="${p.sizes[0]?.image}" style="width:70px; height:70px; border-radius:8px; object-fit:cover;">
                    <div style="flex:1">
                        <h5 style="margin-bottom:5px;">${p.name}</h5>
                        <p style="font-size:0.8rem; color:#888;">Code: ${p.code}</p>
                        <div style="display:flex; gap:10px; margin-top:10px;">
                            <a href="edit.html?id=${p.id}" class="btn-primary" style="padding:5px 15px; font-size:0.8rem; text-decoration:none;">Modifier</a>
                            <button class="btn-primary" style="background:#ff4444; padding:5px 15px; font-size:0.8rem;" onclick="deleteProduct(${p.id})">Supprimer</button>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    `).join('');
}

function deleteProduct(id) {
    if (confirm('Êtes-vous sûr de vouloir supprimer ce produit ?')) {
        State.products = State.products.filter(p => p.id != id);
        State.save();
        adminRenderProducts();
    }
}

// --- Initialization ---
document.addEventListener('DOMContentLoaded', async () => {
    // Load data from file first
    await State.init();
    
    updateCartBadge();
    if (document.getElementById('products-grid')) {
        renderCategories();
        renderProducts();
        
        // Search Logic
        const searchInput = document.getElementById('productSearch');
        if (searchInput) {
            searchInput.addEventListener('input', (e) => {
                const searchTerm = e.target.value.toLowerCase();
                const filtered = State.products.filter(p => 
                    p.name.toLowerCase().includes(searchTerm) || 
                    (p.description && p.description.toLowerCase().includes(searchTerm)) ||
                    p.code.toLowerCase().includes(searchTerm)
                );
                renderFilteredProducts(filtered);
            });
        }
    }
    if (document.getElementById('admin-cats-list')) {
        adminRenderCategories();
        adminRenderProducts();
    }
    const urlParams = new URLSearchParams(window.location.search);
    const editId = urlParams.get('id');
    if (editId && document.getElementById('edit-product-title')) {
        const product = State.products.find(p => p.id == editId);
        if (product) {
            document.getElementById('prod-id').value = product.id;
            document.getElementById('prod-name').value = product.name;
            document.getElementById('prod-code').value = product.code;
            document.getElementById('prod-desc').value = product.description || '';
            adminRenderCategories();
            document.getElementById('prod-cat').value = product.categoryId;
            product.sizes.forEach(s => addVariantField(s.size, s.price, s.image, s.code));
        }
    } else if (document.getElementById('edit-product-title')) {
        adminRenderCategories();
        addVariantField();
    }
});

function renderFilteredProducts(filtered) {
    const container = document.getElementById('products-grid');
    if (!container) return;
    
    if (filtered.length === 0) {
        container.innerHTML = `<div class="col-12 text-center py-5"><h4>Aucun produit ne correspond à votre recherche.</h4></div>`;
        return;
    }
    
    container.innerHTML = filtered.map(product => {
        const defaultSize = product.sizes[0] || { size: 'N/A', price: 0, image: '' };
        const categoryName = State.categories.find(c => c.id == product.categoryId)?.name || 'Général';
        
        return `
            <div class="product-card" data-product-id="${product.id}">
                <div class="product-image-container">
                    <img src="${defaultSize.image}" class="product-image" id="prod-img-${product.id}" loading="lazy">
                </div>
                <div class="product-info">
                    <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 8px;">
                        <div class="product-category">${categoryName}</div>
                        <div class="product-code" style="font-size: 0.75rem; background: var(--gray-200); padding: 2px 8px; border-radius: 4px; font-weight: 600; color: var(--gray-600);">${product.code}</div>
                    </div>
                    <h3 class="product-title">${product.name}</h3>
                    <p class="product-description">${product.description || ''}</p>
                    <div class="product-price" id="prod-price-${product.id}">${formatPrice(defaultSize.price)}</div>
                    
                    <div class="size-selector">
                        ${product.sizes.map((s, idx) => `
                            <button class="size-btn ${idx === 0 ? 'active' : ''}" 
                                onclick="updateProductDisplay(${product.id}, ${idx})">
                                ${s.size}
                            </button>
                        `).join('')}
                    </div>
                    
                    <button class="add-to-cart-btn" onclick="addToCart(${product.id}, getSelectedSizeIndex(${product.id}))">
                        <span>Ajouter au panier</span>
                        <i class="fa-solid fa-cart-plus"></i>
                    </button>
                </div>
            </div>
        `;
    }).join('');
}