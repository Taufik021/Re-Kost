// ============================================================
//  RE-KOST — script.js
//  Single source of truth — no duplicate functions
// ============================================================


// ── PAGE NAVIGATION ──────────────────────────────────────────

var selectedProduct = null;
var lastPage = 'home-page'; // Track previous page for back button

function showPage(pageId) {
    // Hide every page (jangan hide detail-page, itu modal)
    [
    'splash-screen',
    'auth-page',
    'home-page',
    'sell-page',
    'profile-page',
    'all-page',
    'category-page',
    'chat-page',
    'chat-detail-page'
    ]
    .forEach(function(id) {
        var el = document.getElementById(id);
        if (el) el.classList.add('hidden');
    });

        if (pageId === 'home-page') renderProducts();
        if (pageId === 'all-page') renderAllProducts();
        if (pageId === 'chat-page') renderChatList();

    // Track last page for detail-page back navigation
    if (pageId !== 'detail-page' && ['home-page', 'all-page', 'category-page', 'sell-page', 'profile-page'].includes(pageId)) {
        lastPage = pageId;
    }

    // Show the requested page
    var target = document.getElementById(pageId);
    if (target) target.classList.remove('hidden');

    // Bottom nav: show on main pages, hide on splash/auth/detail
    var nav = document.querySelector('.bottom-nav');
    var pagesWithNav = [
    'home-page',
    'sell-page',
    'profile-page',
    'all-page',
    'category-page',
    'chat-page'
    ];
    if (pagesWithNav.includes(pageId)) {
        nav.style.display = 'flex';
        // Update active state
        document.querySelectorAll('.bottom-nav .nav-item').forEach(function(el) {
            el.classList.remove('active');
        });
        var activeBtn = document.querySelector('.bottom-nav .nav-item[data-page="' + pageId + '"]');
        if (activeBtn) activeBtn.classList.add('active');
    } else {
        if (nav) nav.style.display = 'none';
    }
}


// ── REGISTER ─────────────────────────────────────────────────
function registerUser() {
    var name     = document.getElementById('name').value.trim();
    var phone    = document.getElementById('phone').value.trim();
    var campus   = document.getElementById('campus').value.trim();
    var location = document.getElementById('location').value.trim();
    var password = document.getElementById('password').value.trim();

    if (!name || !phone || !campus || !location || !password) {
        alert('Harap isi semua data!');
        return;
    }

    localStorage.setItem('user', JSON.stringify({ name, phone, campus, location, password }));
    alert('Akun berhasil dibuat!');
    showPage('home-page');
    loadUserData();
}


// ── LOAD USER DATA ────────────────────────────────────────────
function loadUserData() {
    var user = JSON.parse(localStorage.getItem('user'));
    if (!user) return;

    var greeting = document.getElementById('greeting');
    if (greeting) greeting.innerText = 'Hai, ' + user.name + ' 👋';

    var nameEl = document.getElementById('profile-name-display');
    var campusEl = document.getElementById('profile-campus-display');
    var locationEl = document.getElementById('profile-location-display');
    if (nameEl)     nameEl.innerText     = user.name;
    if (campusEl)   campusEl.innerText   = user.campus;
    if (locationEl) locationEl.innerText = user.location;

    // Pre-fill edit form fields
    var inputName = document.getElementById('profile-name');
    var inputCampus = document.getElementById('profile-campus');
    var inputLocation = document.getElementById('profile-location');
    if (inputName)     inputName.value     = user.name;
    if (inputCampus)   inputCampus.value   = user.campus;
    if (inputLocation) inputLocation.value = user.location;

    // ✅ LOAD FOTO PROFIL
    var savedImage = localStorage.getItem('profileImage');
    if (savedImage) {
        var img = document.getElementById('profile-image');
        if (img) img.src = savedImage;
}
}


// ── LOGOUT ────────────────────────────────────────────────────
function checkLogin() {
    var user = localStorage.getItem('user');

    if (user) {
        showPage('home-page'); // ✅ nav muncul
        loadUserData();
        if (typeof initNotifications === 'function') initNotifications();
    } else {
        showPage('splash-screen'); // ❌ nav tetap hilang
    }
}

function logout() {
    if (confirm("Apakah Anda yakin ingin keluar dari akun?")) {
        localStorage.removeItem('user');
        localStorage.removeItem('profileImage');
        alert("✅ Berhasil keluar akun.");
        showPage('splash-screen');
    }
}


// ── CATEGORY FILTER ───────────────────────────────────────────
function showCategory(cat) {
    document.getElementById('category-title').textContent = cat;

    var grid = document.getElementById('category-grid');
    grid.innerHTML = '<p style="padding:20px;" class="dynamic-card">Memuat...</p>';

    db.collection("products")
    .where("category", "==", cat)
    .get()
    .then(snapshot => {
        var toRemove = grid.querySelectorAll('.dynamic-card');
        toRemove.forEach(el => el.remove());

        snapshot.forEach(doc => {
            var p = doc.data();
            p.id = doc.id;
            grid.appendChild(createProductCard(p));
        });

        if (grid.children.length === 0) {
            grid.innerHTML = '<p style="padding:20px;">Tidak ada barang</p>';
        }
    }).catch(err => {
        alert("Gagal membaca produk: " + err.message);
        console.error(err);
    });

    showPage('category-page');
}


// ── PROFILE: TOGGLE EDIT FORM ─────────────────────────────────
function toggleEditForm() {
    var form = document.getElementById('profile-inline-form');

    form.classList.toggle('hidden');

    // tutup panel lain
    document.getElementById('selling-list').classList.add('hidden');
    document.getElementById('favorite-list').classList.add('hidden');
}


// ── PROFILE: TOGGLE ITEM PANELS ──────────────────────────────
function toggleItemPanel(type) {
    var selling  = document.getElementById('selling-list');
    var favorite = document.getElementById('favorite-list'); // ✅ Ganti ke favorite-list
    
    // Close edit form
    document.getElementById('profile-inline-form').classList.add('hidden');

    if (type === 'selling') {
        selling.classList.toggle('hidden');
        favorite.classList.add('hidden');
        if (!selling.classList.contains('hidden')) {
            loadMyProducts(); 
        }
    } else if (type === 'favorite') {
        favorite.classList.toggle('hidden');
        selling.classList.add('hidden');
        if (!favorite.classList.contains('hidden')) {
            loadFavorites(); // ✅ Load saat dibuka
        }
    }
}

function loadMyProducts() {
    var grid = document.getElementById('selling-grid');
    var user = JSON.parse(localStorage.getItem('user'));
    if (!grid || !user) return;
    
    grid.innerHTML = '<p style="padding:20px; grid-column:span 2;">Memuat...</p>';

    db.collection("products")
    .where("sellerName", "==", user.name)
    .get()
    .then(snapshot => {
        grid.innerHTML = '';
        snapshot.forEach(doc => {
            var p = doc.data();
            p.id = doc.id;
            grid.appendChild(createProductCard(p));
        });
        if (grid.children.length === 0) {
            grid.innerHTML = '<p style="padding:20px; grid-column:span 2; text-align:center;">Belum ada barang yang dijual</p>';
        }
    }).catch(err => {
        alert("Gagal memuat barang Anda: " + err.message);
        console.error(err);
    });
}


// ── INIT ──────────────────────────────────────────────────────
function createProductCard(p) {
    var card = document.createElement('div');
    card.className = 'product-card dynamic-card';
    card.innerHTML = `
        <div class="product-img">
            <img src="${p.image}" style="width:100%;height:100%;object-fit:cover;">
        </div>
        <div class="product-info">
            <p class="product-name">${p.name}</p>
            <p class="price">Rp ${p.price}</p>
            <p class="location">📍 ${p.location}</p>
        </div>
    `;
    card.onclick = () => showDetail(p);
    return card;
}

function renderProducts() {
    renderProductList('#home-grid', 'unsubscribeProducts');
}

function renderProductList(selector, unsubscribeKey) {
    var grid = document.querySelector(selector);
    if (!grid) return;

    if (window[unsubscribeKey]) {
        window[unsubscribeKey](); // hentikan listener lama
    }

    // append loading msg so we don't delete static cards
    var tempMsg = document.createElement('p');
    tempMsg.className = 'dynamic-card';
    tempMsg.style.cssText = 'padding:20px; grid-column:span 2;';
    tempMsg.innerText = 'Memuat...';
    grid.appendChild(tempMsg);

    window[unsubscribeKey] = db.collection("products")
    .orderBy("createdAt", "desc")
    .onSnapshot(snapshot => {
        var dynamics = grid.querySelectorAll('.dynamic-card');
        dynamics.forEach(el => el.remove());
        
        snapshot.forEach(doc => {
            var p = doc.data();
            p.id = doc.id;
            grid.appendChild(createProductCard(p));
        });
    }, error => {
        console.error("Firebase Read Error:", error);
        alert("Gagal memuat daftar barang dari Firebase. Pastikan Rules berstatus 'allow read: if true;'. Error: " + error.message);
    });
}
// ═══════════════════════════════════════════════════════════════
// ✅ FIXED: LOAD FAVORITES YANG BISA DIKLIK
// ═══════════════════════════════════════════════════════════════
function loadFavorites() {
    var favorites = JSON.parse(localStorage.getItem('favorites')) || [];
    var container = document.getElementById('favorite-list'); // Container utama
    
    if (!container) {
        console.error('❌ favorite-list tidak ditemukan!');
        return;
    }
    
    // ✅ CLEAR DULU
    container.innerHTML = '';

    if (favorites.length === 0) {
        container.innerHTML = '<div style="padding:20px;color:#999;text-align:center;font-style:italic;">Belum ada barang favorit</div>';
        return;
    }

    // ✅ HAPUS DUPLIKAT
    var uniqueFavorites = [];
    var seenIds = new Set();
    favorites.forEach(function(item) {
        if (item.id && !seenIds.has(item.id)) {
            seenIds.add(item.id);
            uniqueFavorites.push(item);
        }
    });

    // ✅ BUAT LIST ITEM
    uniqueFavorites.forEach(function(item) {
        var itemDiv = document.createElement('div');
        itemDiv.className = 'favorite-item';
        itemDiv.style.cssText = `
            padding: 15px;
            margin: 5px 0;
            background: rgba(255,255,255,0.1);
            border-radius: 10px;
            display: flex;
            justify-content: space-between;
            align-items: center;
            cursor: pointer;
            transition: all 0.2s;
            border-left: 4px solid #27AE60;
        `;
        
        itemDiv.innerHTML = `
            <div style="flex:1;">
                <div style="font-weight:600;font-size:15px;margin-bottom:4px;">${item.name}</div>
                <div style="font-size:12px;color:#aaa;">Rp ${item.price} • ${item.location}</div>
            </div>
            <button class="remove-fav-btn" data-id="${item.id}" style="
                background: #ff4d6d;
                color: white;
                border: none;
                border-radius: 20px;
                padding: 6px 12px;
                font-size: 12px;
                cursor: pointer;
                min-width: 35px;
                height: 35px;
            ">×</button>
        `;
        
        // ✅ EVENT LISTENER UNTUK LIHAT DETAIL
        itemDiv.addEventListener('click', function(e) {
            var target = e.target;
            // Jangan trigger kalau klik tombol hapus
            if (target.classList.contains('remove-fav-btn') || target.closest('.remove-fav-btn')) {
                return;
            }
            showDetail(item);
        });
        
        // ✅ EVENT LISTENER HAPUS
        var removeBtn = itemDiv.querySelector('.remove-fav-btn');
        removeBtn.addEventListener('click', function() {
            removeFavorite(item.id);
        });
        
        container.appendChild(itemDiv);
    });
}

// ✅ FUNGSI HAPUS FAVORIT
function removeFavorite(productId) {
    var favorites = JSON.parse(localStorage.getItem('favorites')) || [];
    favorites = favorites.filter(function(f) {
        return f.id !== productId;
    });
    localStorage.setItem('favorites', JSON.stringify(favorites));
    loadFavorites(); // Refresh list
    alert('✅ Dihapus dari favorit');
}

function deleteProduct() {
    if (!selectedProduct) return;

    if (confirm('Yakin ingin menghapus barang ini?')) {
        db.collection("products").doc(selectedProduct.id).delete()
        .then(() => {
            alert('✅ Barang berhasil dihapus!');
            closeDetail();
        })
        .catch(err => {
            console.error(err);
            alert('❌ Gagal hapus');
        });
    }
}

// ── SELL FORM SUBMIT ──
function renderAllProducts() {
    renderProductList('#all-grid', 'unsubscribeAllProducts');
}

function showDetail(product) {
    selectedProduct = product;

    document.getElementById('detail-image').src = product.image;
    document.getElementById('detail-name').innerText = product.name;
    document.getElementById('detail-price').innerText = 'Rp ' + product.price;
    document.getElementById('detail-location').innerText = '📍 ' + product.location;
    document.getElementById('detail-description').innerText = product.description || 'Tidak ada deskripsi';
    
    // Tampilkan info penjual
    // Tampilkan info penjual
    var dSeller = document.getElementById('detail-seller-name');
    var dAvatar = document.getElementById('detail-seller-avatar');
    
    var user = JSON.parse(localStorage.getItem('user'));
    var pName = product.sellerName || 'Tidak diketahui';
    var pImage = product.sellerImage;

    // Jika produk ini milik kita sendiri, ganti tampilan profilnya dengan versi terbaru kita di lokal (otomatis sinkron)
    if (user && product.sellerName === user.name) {
        pName = user.name;
        pImage = localStorage.getItem('profileImage') || pImage;
    }

    if (dSeller) {
        dSeller.innerText = pName;
    }
    if (dAvatar) {
        if (pImage) {
            dAvatar.innerHTML = `<img src="${pImage}" style="width:100%; height:100%; object-fit:cover; border-radius:50%;">`;
        } else {
            dAvatar.innerHTML = '👤';
        }
    }

    var sBox = document.getElementById('detail-seller-box');
    if (sBox) {
        sBox.onclick = function() {
            openSellerProfile(pName, pImage);
        };
    }

    // Tutup menu jika ada
    var menu = document.getElementById('detail-menu');
    if (menu) menu.classList.add('hidden');

    // Tampilkan modal (jangan ganti halaman)
    document.getElementById('detail-modal-backdrop').classList.remove('hidden');
    document.getElementById('detail-page').classList.remove('hidden');
}

function closeDetail() {
    document.getElementById('detail-modal-backdrop').classList.add('hidden');
    document.getElementById('detail-page').classList.add('hidden');
    // Tutup menu saat menutup detail
    var menu = document.getElementById('detail-menu');
    if (menu) menu.classList.add('hidden');
}

function toggleDetailMenu() {
    var menu = document.getElementById('detail-menu');
    if (menu) {
        menu.classList.toggle('hidden');
    }
}

function shareProduct() {
    if (!selectedProduct) return;
    
    var text = 'Halo, lihat barang bekas yang bagus ini!\n\n' +
        selectedProduct.name + '\n' +
        'Harga: Rp ' + selectedProduct.price + '\n' +
        'Lokasi: ' + selectedProduct.location + '\n' +
        'Deskripsi: ' + (selectedProduct.description || '-');
    
    // Jika ada fitur share ke WhatsApp atau media sosial
    var whatsappUrl = 'https://wa.me/?text=' + encodeURIComponent(text);
    window.open(whatsappUrl);
}

function searchProducts(keyword) {
    keyword = keyword.toLowerCase();
    
    // ✅ FIXED: Cari SEMUA product-grid di page aktif
    var grids = document.querySelectorAll('.product-grid');
    
    grids.forEach(function(grid) {
        var cards = grid.querySelectorAll('.product-card');
        cards.forEach(function(card) {
            var name = card.querySelector('.product-name');
            if (name) {
                var text = name.innerText.toLowerCase();
                if (text.includes(keyword) || keyword === '') {
                    card.style.display = '';
                } else {
                    card.style.display = 'none';
                }
            }
        });
    });
}


function addToFavorite() {
    if (!selectedProduct) return;

    var favorites = JSON.parse(localStorage.getItem('favorites')) || [];

    // ✅ FIXED: Cek duplikat berdasarkan ID SAJA
    var exists = favorites.some(function(f) {
        return f.id === selectedProduct.id;
    });

    if (!selectedProduct.id) {
        alert('❌ Produk tidak valid');
        return;
    }

    if (!exists) {
        favorites.push(selectedProduct);
        localStorage.setItem('favorites', JSON.stringify(favorites));
        alert('✅ Ditambahkan ke favorit!');
    } else {
        alert('❌ Sudah ada di favorit');
    }
}

function chatSeller() {
    if (!selectedProduct) return;
    
    var user = JSON.parse(localStorage.getItem('user'));
    if (!user || !user.name) {
        alert('Silakan login terlebih dahulu');
        return;
    }

    var partnerName = selectedProduct.sellerName || 'Seller';
    if (partnerName === user.name) {
        alert('Ini adalah barang jualan Anda sendiri!');
        return;
    }
    
    var title = partnerName + ' - ' + selectedProduct.name;
    closeDetail();
    openChat(title);

    // Bantuan pengisian otomatis pesan
    setTimeout(() => {
        var input = document.getElementById('message-input');
        if (input && !input.value) {
            input.value = 'Halo, saya tertarik dengan ' + selectedProduct.name + '. Apakah masih tersedia?';
        }
    }, 500);
}

function buyProduct() {
    if (!selectedProduct) return;
    
    var user = JSON.parse(localStorage.getItem('user'));
    if (!user || !user.name) {
        alert('Silakan login terlebih dahulu');
        return;
    }

    var partnerName = selectedProduct.sellerName || 'Seller';
    if (partnerName === user.name) {
        alert('Ini adalah barang jualan Anda sendiri!');
        return;
    }

    var msgText = document.getElementById('buy-msg-text');
    if (msgText) msgText.innerHTML = `Sistem akan mengirim peringatan kepada <b>${partnerName}</b> bahwa Anda serius ingin membeli <b>${selectedProduct.name}</b> seharga <b>${selectedProduct.price}</b>. Lanjutkan?`;
    
    document.getElementById('buy-modal-backdrop').classList.remove('hidden');
    document.getElementById('buy-modal').classList.remove('hidden');
}

function closeBuyModal() {
    var bg = document.getElementById('buy-modal-backdrop');
    var modal = document.getElementById('buy-modal');
    if(bg) bg.classList.add('hidden');
    if(modal) modal.classList.add('hidden');
}

function confirmBuy() {
    if (!selectedProduct) return;
    var user = JSON.parse(localStorage.getItem('user'));
    var partnerName = selectedProduct.sellerName || 'Seller';
    var now = Date.now();
    var btn = document.getElementById('confirm-buy-btn');
    if (btn) btn.innerHTML = "Mengirim...";

    // 1. Buat Notifikasi di Firebase
    db.collection("notifications").add({
        sellerName: partnerName,
        buyerName: user.name,
        productName: selectedProduct.name,
        price: selectedProduct.price,
        time: now,
        isRead: false
    }).then(() => {
        // 2. Buat pesan otomatis dalam Chat
        var roomId = getChatId(user.name, partnerName);
        var text = `[SISTEM]: Halo! Saya ingin membeli ${selectedProduct.name} Anda seharga ${selectedProduct.price}. Tolong konfirmasi apakah barang bisa segera diambil / COD?`;
        
        db.collection("messages").add({
            roomId: roomId,
            text: text,
            sender: user.name,
            time: now
        });

        db.collection("chats").doc(roomId).set({
            roomId: roomId,
            participants: [user.name, partnerName],
            lastMessage: "Pembeli mengajukan pesanan baru.",
            timestamp: now
        }, { merge: true });

        if (btn) btn.innerHTML = "Kirim Pesanan";
        closeBuyModal();
        closeDetail();
        openChat(partnerName + " - Pembelian");
    }).catch(function(error) {
        alert("Gagal memproses pembelian: " + error.message);
        if (btn) btn.innerHTML = "Kirim Pesanan";
    });
}


// ═══════════════════════════════════════════════════════════════
// ✅ SAVE PROFILE - TAMBAHAN BARU
// ═══════════════════════════════════════════════════════════════
// ═══════════════════════════════════════════════════════════════
// ✅ FIXED UPLOAD - DOMContentLoaded BARU
// ═══════════════════════════════════════════════════════════════
document.addEventListener('DOMContentLoaded', function() {
    console.log('✅ App fully loaded!');
    // AUTO INIT
    checkLogin();

    // ====================================================
    // ✅ IKAT KLIK UNTUK BARANG CONTOH (STATIC)
    // ====================================================
    document.querySelectorAll('.static-card').forEach(function(card) {
        card.onclick = function() {
            var name = card.querySelector('.product-name').innerText;
            var priceStr = card.querySelector('.price').innerText.replace('Rp ', '').replace(/\./g, '');
            var loc = card.querySelector('.location').innerText.replace('📍 ', '');
            var imgSrc = card.querySelector('img').src;
            
            var staticProduct = {
                name: name,
                price: priceStr,
                location: loc,
                description: 'Barang ini adalah contoh bawaan aplikasi. Anda bebas mencoba tombol Beli untuk disimulasikan.',
                sellerName: 'Budi (Penjual Contoh)',
                sellerPhone: '08123456789',
                image: imgSrc,
                isStatic: true
            };
            showDetail(staticProduct);
        };
    });

    var saveBtn = document.getElementById('save-profile-btn');
    if (saveBtn) {
        saveBtn.addEventListener('click', saveProfile);
    }
    
    // ====================================================
    // ✅ FIXED PHOTO UPLOAD
    // ====================================================
    var photoBox = document.getElementById('photo-box');
    var photoInput = document.getElementById('item-photo');
    
    if (photoBox && photoInput) {
        // Photo box click → trigger file input
        photoBox.addEventListener('click', function(e) {
            console.log('📷 Photo box clicked');
            photoInput.click();
        });
        
        // File selected → preview
        photoInput.addEventListener('change', function() {
            console.log('✅ Photo selected');
            var file = this.files[0];
            if (file) {
                var reader = new FileReader();
                reader.onload = function(e) {
                    photoBox.innerHTML = 
                        `<img src="${e.target.result}" style="width:100%;height:180px;object-fit:cover;border-radius:8px;">`;
                };
                reader.readAsDataURL(file);
            }
        });
    }
    
    // ====================================================
    // ✅ FIXED FORM SUBMIT - Z-INDEX SOLVED
    // ====================================================
    var sellForm = document.getElementById('sell-form');
    if (sellForm) {
        sellForm.addEventListener('submit', function(e) {
            e.preventDefault();
            console.log('🚀 UPLOAD BUTTON CLICKED!');
            uploadProduct();
        });
    }
    // ====================================================
    // ✅ UPLOAD FOTO PROFIL
    // ====================================================
    var profilePhotoInput = document.getElementById('profile-photo-input');
    if (profilePhotoInput) {
        profilePhotoInput.addEventListener('change', function() {
            var file = this.files[0];
            if (file) {
                var reader = new FileReader();
                reader.onload = function(e) {
                    var imgData = e.target.result;
                    var profileImg = document.getElementById('profile-image');
                    if (profileImg) {
                        profileImg.src = imgData;
                    }
                    localStorage.setItem('profileImage', imgData);
                    alert("✅ Foto profil berhasil disimpan!");
                    
                    var user = JSON.parse(localStorage.getItem('user'));
                    if (user && user.name && typeof syncProfileToProducts === 'function') {
                        syncProfileToProducts(user.name);
                    }
                };
                reader.readAsDataURL(file);
            }
        });
    }

    // ====================================================
    // ✅ THEME GELAP & TERANG
    // ====================================================
    var themeRadios = document.querySelectorAll('input[name="theme"]');
    var appContainer = document.querySelector('.app-container');
    var savedTheme = localStorage.getItem('theme') || 'light';
    
    // Setel mode saat pertama kali dibuka menurut simpanan di memori HP
    if (savedTheme === 'dark' && appContainer) {
        appContainer.classList.add('dark-mode');
        var opt = document.getElementById('theme-dark');
        if (opt) opt.checked = true;
    } else if (appContainer) {
        appContainer.classList.remove('dark-mode');
        var opt = document.getElementById('theme-light');
        if (opt) opt.checked = true;
    }

    // Pasang alat pendeteksi klik pada radio button tema
    themeRadios.forEach(function(radio) {
        radio.addEventListener('change', function(e) {
            if (!appContainer) return;
            if (e.target.value === 'dark') {
                appContainer.classList.add('dark-mode');
                localStorage.setItem('theme', 'dark');
            } else {
                appContainer.classList.remove('dark-mode');
                localStorage.setItem('theme', 'light');
            }
        });
    });

});

// ✅ FUNGSI CHAT - TAMBAH DI AKHIR
function searchChats(keyword) {
    keyword = keyword.toLowerCase();
    document.querySelectorAll('.chat-item').forEach(item => {
        var name = item.querySelector('.chat-name')?.innerText.toLowerCase() || '';
        item.style.display = name.includes(keyword) ? 'flex' : 'none';
    });
}

function searchProducts(keyword) {
    keyword = keyword.toLowerCase();
    document.querySelectorAll('#home-grid .product-card, #all-grid .product-card').forEach(card => {
        var name = card.querySelector('.product-name')?.innerText.toLowerCase() || '';
        if (name.includes(keyword)) {
            card.style.display = 'block';
        } else {
            card.style.display = 'none';
        }
    });
}

// ── SELLER PUBLIC PROFILE ──
function openSellerProfile(sellerName, sellerImage) {
    if (!sellerName) return;

    var user = JSON.parse(localStorage.getItem('user'));
    if (user && user.name === sellerName) {
        // Jika yang diklik adalah profil lapak sendiri, arahkan ke halaman profil pribadi
        closeDetail();
        showPage('profile-page');
        return;
    }

    window.currentSellerProfile = sellerName;
    
    document.getElementById('seller-page-name').innerText = sellerName;
    
    var avatar = document.getElementById('seller-page-avatar');
    if (avatar) {
        if (sellerImage) {
            avatar.innerHTML = `<img src="${sellerImage}" style="width:100%; height:100%; object-fit:cover; border-radius:50%;">`;
        } else {
            avatar.innerHTML = '👤';
        }
    }
    
    var sPage = document.getElementById('seller-page');
    if (sPage) {
        sPage.classList.remove('hidden');
        sPage.style.position = 'fixed';
        sPage.style.top = '0';
        sPage.style.bottom = '0';
        sPage.style.left = '0';
        sPage.style.right = '0';
        sPage.style.margin = '0 auto';
        sPage.style.maxWidth = '420px';
        sPage.style.width = '100%';
        sPage.style.background = '#fff';
        sPage.style.zIndex = '100000'; // Harus lebih tinggi dari detail-modal (biasanya 9999)
        sPage.style.overflowY = 'auto';
    }
    
    loadSellerProducts(sellerName);
}

function closeSellerProfile() {
    var sPage = document.getElementById('seller-page');
    if (sPage) sPage.classList.add('hidden');
}

function chatFromSellerPage() {
    if (!window.currentSellerProfile) return;
    var user = JSON.parse(localStorage.getItem('user'));
    if (!user || !user.name) {
        alert('Silakan login terlebih dahulu');
        return;
    }
    if (window.currentSellerProfile === user.name) {
        alert('Ini adalah profil Anda sendiri!');
        return;
    }
    
    closeSellerProfile();
    closeDetail();
    openChat(window.currentSellerProfile + ' - Tawar Barang');
}

function loadSellerProducts(sellerName) {
    var grid = document.getElementById('seller-product-grid');
    if (!grid) return;
    grid.innerHTML = '<p style="padding:20px; grid-column:span 2; text-align:center;">Memuat etalase...</p>';

    db.collection("products")
    .where("sellerName", "==", sellerName)
    .get()
    .then(snapshot => {
        grid.innerHTML = '';
        snapshot.forEach(doc => {
            var p = doc.data();
            p.id = doc.id;
            grid.appendChild(createProductCard(p));
        });
        if (grid.children.length === 0) {
            grid.innerHTML = '<p style="padding:40px 20px; grid-column:span 2; text-align:center; color:#999;">Toko ini belum memiliki barang jualan lain.</p>';
        }
    }).catch(err => {
        grid.innerHTML = '<p style="padding:20px; color:red; text-align:center;">Gagal memuat barang toko.</p>';
        console.error(err);
    });
}

// ✅ DINAMISASI DAFTAR CHAT
function renderChatList() {
    var container = document.getElementById('chat-list-container');
    var user = JSON.parse(localStorage.getItem('user'));
    
    if (!container || !user || !user.name) return;

    if (window.unsubscribeChats) window.unsubscribeChats();

    container.innerHTML = '<p style="text-align:center; padding: 20px; color:#999;">Memuat ruang obrolan...</p>';

    window.unsubscribeChats = db.collection("chats")
    .where("participants", "array-contains", user.name)
    .orderBy("timestamp", "desc")
    .onSnapshot(snapshot => {
        container.innerHTML = '';
        if (snapshot.empty) {
            container.innerHTML = '<p style="text-align:center; padding: 20px; color:#999;">Belum ada percakapan dengan siapapun.</p>';
            return;
        }

        snapshot.forEach(doc => {
            var chatData = doc.data();
            var partnerName = chatData.participants.find(p => p !== user.name) || user.name;
            var date = new Date(chatData.timestamp);
            var timeStr = ('0'+date.getHours()).slice(-2) + ':' + ('0'+date.getMinutes()).slice(-2);

            var div = document.createElement('div');
            div.className = 'chat-item';
            div.style.cssText = 'display:flex; align-items:center; padding: 15px; border-bottom:1px solid #eee; cursor:pointer; background: #fff; border-radius:10px; margin-bottom:10px; box-shadow: 0 1px 2px rgba(0,0,0,0.05);';
            
            div.innerHTML = `
                <div class="chat-avatar" style="font-size:24px; margin-right:15px; background:#e0f2fe; border-radius:50%; width:45px; height:45px; display:flex; align-items:center; justify-content:center;">👤</div>
                <div class="chat-info" style="flex:1; overflow:hidden;">
                    <div class="chat-name" style="font-weight:700; font-size:15px; margin-bottom:4px; color:#333;">${partnerName}</div>
                    <div class="chat-preview" style="color:#666; font-size:13px; white-space:nowrap; overflow:hidden; text-overflow:ellipsis;">${chatData.lastMessage}</div>
                </div>
                <div class="chat-time" style="font-size:12px; color:#999; margin-left:10px;">${timeStr}</div>
            `;
            div.onclick = () => openChat(partnerName + ' - Buka kembali');
            container.appendChild(div);
        });
    }, error => {
        console.error("Chats Error:", error);
        container.innerHTML = '<p style="text-align:center; color:red;">Gagal memuat kontak chat.</p>';
    });
}

// ✅ GANTI openChat() 
function openChat(chatTitle) {
    window.currentChat = {
        title: chatTitle,
        product: chatTitle.split(' - ')[1] || 'Barang',
        partner: chatTitle.split(' - ')[0] || 'Seller'
    };
    
    document.getElementById('chat-detail-title').innerText = window.currentChat.partner;
    loadChatMessages();
    
    showPage('chat-detail-page');  // ← LANGSUNG KE CHAT DETAIL
}

// ✅ CHAT SYSTEM - TAMBAH SEMUA DI AKHIR

// Simpan chat history per user
function getChatId(user1, user2) {
    if (!user1 || !user2) return '';
    var arr = [user1, user2].sort();
    return arr[0] + '_' + arr[1];
}

function loadChatMessages() {
    var partner = window.currentChat?.partner;
    var user = JSON.parse(localStorage.getItem('user') || '{}');
    if (!partner || !user.name) return;

    var container = document.getElementById('chat-messages');
    var roomId = getChatId(user.name, partner);

    db.collection("messages")
    .where("roomId", "==", roomId)
    .orderBy("time", "asc")
    .onSnapshot(snapshot => {
        container.innerHTML = '';

        snapshot.forEach(doc => {
            var msg = doc.data();
            var div = document.createElement('div');
            var isMe = msg.sender === user.name;
            
            div.className = isMe ? 'msg-bubble me' : 'msg-bubble partner';
            div.style.padding = '10px';
            div.style.margin = '5px 0';
            div.style.borderRadius = '10px';
            div.style.maxWidth = '80%';
            div.style.backgroundColor = isMe ? '#dcf8c6' : '#fff';
            div.style.alignSelf = isMe ? 'flex-end' : 'flex-start';
            div.style.boxShadow = '0 1px 3px rgba(0,0,0,0.1)';
            div.innerText = msg.text;
            
            container.appendChild(div);
        });

        setTimeout(() => { container.scrollTop = container.scrollHeight; }, 100);
    });
}

function sendMessage() {
    var input = document.getElementById('message-input');
    var text = input.value.trim();

    var user = JSON.parse(localStorage.getItem('user') || '{}');
    if (!text || !window.currentChat || !user.name) return;

    var partner = window.currentChat.partner;
    var roomId = getChatId(user.name, partner);
    var now = Date.now();
    
    // Simpan pesan
    db.collection("messages").add({
        roomId: roomId,
        text: text,
        sender: user.name,
        time: now
    });

    // Simpan riwayat room ke "chats"
    db.collection("chats").doc(roomId).set({
        roomId: roomId,
        participants: [user.name, partner],
        lastMessage: text,
        timestamp: now
    }, { merge: true });

    input.value = '';
}

function handleKeypress(event) {
    if (event.key === 'Enter') {
        event.preventDefault();
        sendMessage();
    }
}

function saveProfile() {
    var name = document.getElementById('profile-name').value.trim();
    var campus = document.getElementById('profile-campus').value.trim();
    var location = document.getElementById('profile-location').value.trim();

    if (!name || !campus || !location) {
        alert('❌ Semua field harus diisi!');
        return;
    }

    // Ambil data lama
    var user = JSON.parse(localStorage.getItem('user')) || {};
    var oldName = user.name;

    // Update data
    user.name = name;
    user.campus = campus;
    user.location = location;

    // Simpan lagi
    localStorage.setItem('user', JSON.stringify(user));

    alert('✅ Profil berhasil disimpan!');

    if (typeof syncProfileToProducts === 'function') {
        syncProfileToProducts(oldName);
    }

    // Refresh tampilan
    loadUserData();

    // Tutup form edit
    document.getElementById('profile-inline-form').classList.add('hidden');
}

function syncProfileToProducts(oldName) {
    var user = JSON.parse(localStorage.getItem('user'));
    var newImage = localStorage.getItem('profileImage');
    if (!user || !user.name) return;
    
    // Cari semua barang yang dijual oleh nama lama dan perbarui namanya + fotonya
    db.collection("products").where("sellerName", "==", oldName || user.name).get()
    .then(snapshot => {
        var batch = db.batch();
        snapshot.forEach(doc => {
            batch.update(doc.ref, { 
                sellerName: user.name,
                sellerImage: newImage || '' 
            });
        });
        return batch.commit();
    }).then(() => {
        console.log("Semua produk milik " + user.name + " berhasil disinkronkan fotonya.");
    }).catch(err => {
        console.error("Gagal sinkronisasi produk: ", err);
    });
}

function uploadProduct() {
    try {
        var name = document.getElementById('item-name').value;
        var category = document.getElementById('item-category').value;
        var price = document.getElementById('item-price').value;
        var descEl = document.getElementById('item-desc');
        var desc = descEl ? descEl.value : '';
        var location = document.getElementById('item-location').value;
        var photoInput = document.getElementById('item-photo');
        var submitBtn = document.querySelector('#sell-form button[type="submit"]');

        var user = JSON.parse(localStorage.getItem('user'));
        if (!user) user = {}; // Fallback

        if (!name || !category || !price || !location || !photoInput.files[0]) {
            alert('❌ Lengkapi semua otomatis sebelum Upload!');
            return;
        }

        if (submitBtn) {
            submitBtn.disabled = true;
            submitBtn.innerText = 'Memproses Foto (Mohon Tunggu)...';
        }

        var file = photoInput.files[0];
        var reader = new FileReader();

        reader.onerror = function() {
            alert('❌ Gagal membaca foto dari laptop.');
            if (submitBtn) { submitBtn.disabled = false; submitBtn.innerText = 'Upload / Posting Barang'; }
        };

        reader.onload = function(e) {
            try {
                if (submitBtn) submitBtn.innerText = 'Mengirim ke Server Firestore...';

                var img = new Image();
                img.onerror = function() {
                    alert('❌ Foto bermasalah atau format tidak didukung.');
                    if (submitBtn) { submitBtn.disabled = false; submitBtn.innerText = 'Upload / Posting Barang'; }
                };
                
                img.onload = function() {
                    try {
                        var canvas = document.createElement('canvas');
                        var MAX_WIDTH = 600; 
                        var scale = MAX_WIDTH / img.width;
                        if (scale > 1) scale = 1;
                        
                        canvas.width = img.width * scale;
                        canvas.height = img.height * scale;
                        var ctx = canvas.getContext("2d");
                        ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
                        
                        var compressedBase64 = canvas.toDataURL("image/jpeg", 0.7);

                        // Promise Firebase
                        var storedProfile = localStorage.getItem('profileImage');
                        db.collection("products").add({
                            name: name,
                            category: category,
                            price: price,
                            description: desc,
                            location: location,
                            image: compressedBase64,
                            sellerName: user.name ? user.name : 'Unknown User',
                            sellerPhone: user.phone ? user.phone : '',
                            sellerImage: storedProfile || '',
                            createdAt: Date.now()
                        }).then(() => {
                            alert('✅ Sukses! Barang berhasil diposting ke database.');
                            document.getElementById('sell-form').reset();
                            var photoBox = document.getElementById('photo-box');
                            if (photoBox) photoBox.innerHTML = '<div class="photo-placeholder">📷<br><span class="photo-text">+ Klik untuk tambah foto</span></div>';
                            showPage('home-page');
                        }).catch(err => {
                            console.error("Firebase Error:", err);
                            alert('❌ SERVER MENOLAK!\nBuka Firebase -> Database -> ubah Rules jadi "allow read, write: if true;"\n\nDetail error: ' + err.message);
                        }).finally(() => {
                            if (submitBtn) {
                                submitBtn.disabled = false;
                                submitBtn.innerText = 'Upload / Posting Barang';
                            }
                        });

                    } catch (e2) {
                        alert("❌ Error pembuatan format foto: " + e2.message);
                        if (submitBtn) { submitBtn.disabled = false; submitBtn.innerText = 'Upload / Posting Barang'; }
                    }
                };
                img.src = e.target.result;

            } catch (e1) {
                alert("❌ Gagal inisialisasi foto: " + e1.message);
                if (submitBtn) { submitBtn.disabled = false; submitBtn.innerText = 'Upload / Posting Barang'; }
            }
        };
        reader.readAsDataURL(file);

    } catch (e) {
        alert("❌ ERROR SISTEM DI JAVASCRIPT: " + e.message);
        var resBtn = document.querySelector('#sell-form button[type="submit"]');
        if (resBtn) { resBtn.disabled = false; resBtn.innerText = 'Upload / Posting Barang'; }
    }
}

// ==========================================
// SISTEM NOTIFIKASI REAL-TIME
// ==========================================

function toggleNotifPanel() {
    var panel = document.getElementById('notif-panel');
    if (panel) {
        panel.classList.toggle('hidden');
    }
}

function initNotifications() {
    var user = JSON.parse(localStorage.getItem('user'));
    if (!user || !user.name) return;

    if (window.unsubscribeNotifs) {
        window.unsubscribeNotifs();
    }

    // Dengarkan notifikasi yang masuk ke penjual ini (query berdasarkan nama penjual)
    window.unsubscribeNotifs = db.collection("notifications")
        .where("sellerName", "==", user.name)
        .orderBy("time", "desc")
        .onSnapshot(function(snapshot) {
            var badge = document.getElementById('notif-badge');
            var listContainer = document.getElementById('notif-list-container');
            
            var unreadCount = 0;
            var html = '';

            if (snapshot.empty) {
                if (listContainer) listContainer.innerHTML = '<p style="text-align:center; padding:15px; color:#999;font-size:13px;">Belum ada pesanan masuk.</p>';
                if (badge) badge.classList.add('hidden');
                return;
            }

            snapshot.docChanges().forEach(function(change) {
                if (change.type === "added") {
                    var data = change.doc.data();
                    var age = Date.now() - data.time;
                    // Munculkan popup gantung jika usianya < 3 detik (berarti pesan baru masuk saat user on)
                    if (data.isRead === false && age < 3000) {
                        showNotifPopup(data.buyerName, data.productName);
                    }
                }
            });

            snapshot.forEach(function(doc) {
                var data = doc.data();
                if (!data.isRead) unreadCount++;

                var date = new Date(data.time);
                var timeStr = ('0'+date.getHours()).slice(-2) + ':' + ('0'+date.getMinutes()).slice(-2);
                
                var unreadClass = data.isRead ? '' : 'unread';

                html += `
                    <div class="notif-item ${unreadClass}" onclick="readNotification('${doc.id}', '${data.buyerName}', '${data.productName}')">
                        <div style="font-weight:bold; margin-bottom:3px; color: ${data.isRead ? '#666' : '#27AE60'}">${data.buyerName}</div>
                        <div style="font-size:12px; color:#666;">Ingin membeli ${data.productName}</div>
                        <div style="font-size:10px; color:#aaa; margin-top:5px;">${timeStr}</div>
                    </div>
                `;
            });

            if (listContainer) listContainer.innerHTML = html;

            if (badge) {
                if (unreadCount > 0) {
                    badge.classList.remove('hidden');
                } else {
                    badge.classList.add('hidden');
                }
            }
        });
}

function showNotifPopup(buyerName, productName) {
    var popup = document.getElementById('notif-popup');
    var textElem = document.getElementById('notif-popup-text');
    if(popup && textElem) {
        textElem.innerHTML = `Membeli <b>${productName}</b>!`;
        document.getElementById('notif-popup-title').innerHTML = buyerName;
        popup.classList.remove('hidden');
        
        setTimeout(() => {
            popup.classList.add('hidden');
        }, 4000);
    }
}

function readNotification(docId, buyerName, productName) {
    db.collection("notifications").doc(docId).update({
        isRead: true
    }).then(() => {
        var panel = document.getElementById('notif-panel');
        if (panel) panel.classList.add('hidden');
        
        openChat(buyerName + " - " + productName);
    });
}