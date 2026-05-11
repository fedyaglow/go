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
            const response = await fetch('database.json');
            if (response.ok) {
                const data = await response.json();
                
                // If localStorage is empty, use file data
                if (this.products.length === 0) {
                    this.products = data.products || [];
                    this.categories = data.categories || [];
                    this.save();
                }
                
                console.log("Données chargées depuis le fichier JSON.");
            }
        } catch (e) {
            console.log("Aucun fichier database.json trouvé ou erreur de chargement. Utilisation du stockage local.");
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
        code: product.code,
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
                    <img src="${defaultSize.image}" class="product-image" id="prod-img-${product.id}">
                </div>
                <div class="product-info">
                    <div class="product-category">${categoryName}</div>
                    <h3 class="product-title">${product.name}</h3>
                    <p class="product-description" style="font-size: 0.85rem; color: #666; margin-bottom: 15px; display: -webkit-box; -webkit-line-clamp: 2; -webkit-box-orient: vertical; overflow: hidden;">${product.description || ''}</p>
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
                        🛒
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
    if (img) img.src = size.image;
    if (price) price.innerText = formatPrice(size.price);
    const container = document.querySelector(`.product-card[data-product-id="${productId}"]`);
    const buttons = container.querySelectorAll('.size-btn');
    buttons.forEach((btn, idx) => btn.classList.toggle('active', idx === sizeIndex));
}

function getSelectedSizeIndex(productId) {
    const container = document.querySelector(`.product-card[data-product-id="${productId}"]`);
    const activeBtn = container.querySelector('.size-btn.active');
    const buttons = Array.from(container.querySelectorAll('.size-btn'));
    return buttons.indexOf(activeBtn);
}

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
function addVariantField(size = '', price = '', image = '') {
    const container = document.getElementById('variants-container');
    const id = ++variantCount;
    const div = document.createElement('div');
    div.className = "variant-row";
    div.id = `variant-${id}`;
    
    // Determine if the initial image is a path or base64
    const isPath = image && !image.startsWith('data:');
    
    div.innerHTML = `
        <div class="row" style="display:grid; grid-template-columns: 1fr 1fr 1fr 1fr auto; gap:10px; align-items:end;">
            <div class="form-group">
                <label class="form-label">Taille</label>
                <input type="text" class="form-control var-size" value="${size}" placeholder="Ex: 50ml">
            </div>
            <div class="form-group">
                <label class="form-label">Prix (€)</label>
                <input type="number" class="form-control var-price" value="${price}" placeholder="0.00">
            </div>
            <div class="form-group">
                <label class="form-label">Upload</label>
                <input type="file" class="form-control var-img" accept="image/*" 
                    onchange="const pathInput = this.closest('.variant-row').querySelector('.var-path'); if(!pathInput.value) pathInput.value = 'products/' + this.files[0].name">
            </div>
            <div class="form-group">
                <label class="form-label">Ou Chemin (Path)</label>
                <input type="text" class="form-control var-path" value="${isPath ? image : ''}" placeholder="Ex: products/prod.jpg">
            </div>
            <button class="btn-primary" style="background:#ff4444; margin-bottom:20px;" onclick="document.getElementById('variant-${id}').remove()">X</button>
        </div>
        ${image ? `<div style="margin-top:10px;"><img src="${image}" style="width:50px; height:50px; object-fit:cover; border-radius:4px;" class="current-var-img"></div>` : ''}
    `;
    container.appendChild(div);
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
        const imgInput = row.querySelector('.var-img');
        const pathInput = row.querySelector('.var-path').value.trim();
        const currentImgElement = row.nextElementSibling?.querySelector('.current-var-img');
        const currentImg = currentImgElement ? currentImgElement.src : '';
        
        let finalImage = pathInput || currentImg;
        
        // If a new file is uploaded, it takes priority
        if (imgInput.files[0]) {
            finalImage = await fileToBase64(imgInput.files[0]);
        }
        
        if (sizeVal && priceVal) {
            sizes.push({ size: sizeVal, price: priceVal, image: finalImage });
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
            product.sizes.forEach(s => addVariantField(s.size, s.price, s.image));
        }
    } else if (document.getElementById('edit-product-title')) {
        adminRenderCategories();
        addVariantField();
    }
});