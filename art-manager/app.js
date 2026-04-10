import { initializeApp } from "https://www.gstatic.com/firebasejs/10.8.1/firebase-app.js";
import { getAuth, signInWithEmailAndPassword, onAuthStateChanged, signOut, setPersistence, browserLocalPersistence } from "https://www.gstatic.com/firebasejs/10.8.1/firebase-auth.js";
import { getDatabase, ref, set, onValue } from "https://www.gstatic.com/firebasejs/10.8.1/firebase-database.js";
import { getStorage, ref as storageRef, uploadBytes, getDownloadURL } from "https://www.gstatic.com/firebasejs/10.8.1/firebase-storage.js";

// --- ВСТАВЬ СВОИ ДАННЫЕ ИЗ FIREBASE СЮДА ---
const firebaseConfig = {
    apiKey: "AIzaSyD5XdT5kt_4MPbQat4yxxX49HsNa-SI6Ms",
    authDomain: "sempai-art.firebaseapp.com",
    databaseURL: "https://sempai-art-default-rtdb.europe-west1.firebasedatabase.app",
    projectId: "sempai-art",
    storageBucket: "sempai-art.firebasestorage.app",
    messagingSenderId: "746851856077",
    appId: "1:746851856077:web:7757cc827a68db52424384"
};

const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getDatabase(app);
const storage = getStorage(app);

let products = [];
let activeCategory = 'Все';
let activeGroup = '';
let favoriteCategories = JSON.parse(localStorage.getItem('sempai_fav_cats')) || [];
let savedArts = {};
let currentProduct = null;
let isAppLoaded = false;

// DOM Элементы
const grid = document.getElementById('productsGrid');
const categoryList = document.getElementById('categoryList');
const searchInput = document.getElementById('searchInput');
const groupToggles = document.getElementById('groupToggles');

const loginScreen = document.getElementById('loginScreen');
const appContent = document.getElementById('appContent');
const logoutBtn = document.getElementById('logoutBtn');
const loginBtn = document.getElementById('loginBtn');
const loginError = document.getElementById('loginError');

const mobileMenuBtn = document.getElementById('mobileMenuBtn');
const sidebar = document.getElementById('sidebar');
const mobileOverlay = document.getElementById('mobileOverlay');

// Элементы Модалки
const productModal = document.getElementById('productModal');
const closeModalBtn = document.getElementById('closeModalBtn');
const modalImg = document.getElementById('modalImg');
const modalTitle = document.getElementById('modalTitle');
const modalCategory = document.getElementById('modalCategory');

// Элементы переключателя картинок
const modalImageSwitcher = document.getElementById('modalImageSwitcher');
const btnImgBlack = document.getElementById('btnImgBlack');
const btnImgWhite = document.getElementById('btnImgWhite');

const linkBlack = document.getElementById('linkBlack');
const fileBlack = document.getElementById('fileBlack');
const linkWhite = document.getElementById('linkWhite');
const fileWhite = document.getElementById('fileWhite');

const saveBlackBtn = document.getElementById('saveBlackBtn');
const viewBlackBtn = document.getElementById('viewBlackBtn');
const delBlackBtn = document.getElementById('delBlackBtn');
const saveWhiteBtn = document.getElementById('saveWhiteBtn');
const viewWhiteBtn = document.getElementById('viewWhiteBtn');
const delWhiteBtn = document.getElementById('delWhiteBtn');

// ==========================================
// 1. АВТОРИЗАЦИЯ И СОХРАНЕНИЕ СЕССИИ
// ==========================================
onAuthStateChanged(auth, (user) => {
    if (user) {
        loginScreen.style.display = 'none';
        appContent.style.display = 'flex';
        
        if (!isAppLoaded) {
            loadApp(); 
            isAppLoaded = true;
        }
    } else {
        loginScreen.style.display = 'flex';
        appContent.style.display = 'none';
    }
});

loginBtn.onclick = (e) => {
    e.preventDefault(); 
    const email = document.getElementById('emailInput').value;
    const pass = document.getElementById('passwordInput').value;
    loginError.textContent = "Вход...";
    
    setPersistence(auth, browserLocalPersistence)
        .then(() => {
            return signInWithEmailAndPassword(auth, email, pass);
        })
        .then(() => {
            loginError.textContent = "";
        })
        .catch(error => {
            console.error(error);
            loginError.textContent = "Ошибка: неверный Email/Пароль.";
        });
};

document.getElementById('passwordInput').addEventListener('keypress', function (e) {
    if (e.key === 'Enter') loginBtn.click();
});

logoutBtn.onclick = () => {
    signOut(auth).then(() => {
        isAppLoaded = false; 
    });
};

// ==========================================
// МОБИЛЬНОЕ МЕНЮ
// ==========================================
function toggleMobileMenu() {
    sidebar.classList.toggle('active');
    mobileOverlay.classList.toggle('active');
}
function closeMobileMenu() {
    sidebar.classList.remove('active');
    mobileOverlay.classList.remove('active');
}
mobileMenuBtn.onclick = toggleMobileMenu;
mobileOverlay.onclick = closeMobileMenu;

// ==========================================
// 2. ИНИЦИАЛИЗАЦИЯ
// ==========================================
async function loadApp() {
    try {
        const response = await fetch('products.json');
        products = await response.json();
        
        onValue(ref(db, 'arts/'), (snapshot) => {
            savedArts = snapshot.val() || {};
            renderProducts(); 
        });

        setupGroups();
        setupCategories();
    } catch (error) {
        console.error('Ошибка загрузки', error);
    }
}

function setupGroups() {
    groupToggles.innerHTML = '';
    const groups = [...new Set(products.map(p => p.group))];
    activeGroup = groups[0] || '';
    groups.forEach(group => {
        const btn = document.createElement('button');
        btn.textContent = group;
        if (group === activeGroup) btn.classList.add('active');
        btn.onclick = () => { 
            document.querySelectorAll('.group-toggles button').forEach(b => b.classList.remove('active')); 
            btn.classList.add('active'); 
            activeGroup = group; 
            activeCategory = 'Все'; 
            setupCategories(); 
            renderProducts(); 
        };
        groupToggles.appendChild(btn);
    });
}

function setupCategories() {
    categoryList.innerHTML = '';
    
    const allLi = document.createElement('li');
    allLi.textContent = 'Все категории';
    if (activeCategory === 'Все') allLi.classList.add('active');
    allLi.onclick = () => selectCategory('Все', allLi);
    categoryList.appendChild(allLi);

    const filteredByGroup = products.filter(p => p.group === activeGroup);
    const categories = [...new Set(filteredByGroup.map(p => p.category))].sort();
    
    const favs = categories.filter(c => favoriteCategories.includes(c));
    const others = categories.filter(c => !favoriteCategories.includes(c));

    if (favs.length > 0) {
        const favDivider = document.createElement('div');
        favDivider.className = 'cat-divider';
        favDivider.textContent = '★ Избранные';
        categoryList.appendChild(favDivider);
        favs.forEach(cat => createCategoryItem(cat, true));
        
        const otherDivider = document.createElement('div');
        otherDivider.className = 'cat-divider';
        otherDivider.textContent = 'Остальные';
        categoryList.appendChild(otherDivider);
    }
    others.forEach(cat => createCategoryItem(cat, false));
}

function createCategoryItem(cat, isFav) {
    const li = document.createElement('li');
    if (activeCategory === cat) li.classList.add('active');
    li.innerHTML = `<span>${cat}</span><span class="fav-star ${isFav ? 'is-fav' : ''}">${isFav ? '★' : '☆'}</span>`;
    
    li.querySelector('.fav-star').onclick = (e) => { 
        e.stopPropagation(); 
        toggleFavorite(cat); 
    };
    li.onclick = () => selectCategory(cat, li);
    categoryList.appendChild(li);
}

function toggleFavorite(cat) {
    if (favoriteCategories.includes(cat)) {
        favoriteCategories = favoriteCategories.filter(c => c !== cat);
    } else {
        favoriteCategories.push(cat);
    }
    localStorage.setItem('sempai_fav_cats', JSON.stringify(favoriteCategories));
    setupCategories(); 
}

function selectCategory(cat, el) { 
    categoryList.querySelectorAll('li').forEach(e => e.classList.remove('active')); 
    el.classList.add('active'); 
    activeCategory = cat; 
    renderProducts(); 
    if(window.innerWidth <= 768) closeMobileMenu();
}

searchInput.addEventListener('input', renderProducts);

// ==========================================
// 3. ОТРИСОВКА КАРТОЧЕК
// ==========================================
function renderProducts() {
    const query = searchInput.value.toLowerCase();
    const filtered = products.filter(p => p.group === activeGroup && (activeCategory === 'Все' || p.category === activeCategory) && (p.nameRu.toLowerCase().includes(query) || p.nameUa.toLowerCase().includes(query)));

    grid.innerHTML = '';

    filtered.forEach(p => {
        const card = document.createElement('div');
        card.className = 'product-card';
        card.onclick = () => openProductModal(p);

        const img1 = p.images[0] || 'placeholder.jpg';
        const img2 = p.images[1] || img1;
        
        const hasBlack = savedArts[p.id] && savedArts[p.id].black;
        const hasWhite = savedArts[p.id] && savedArts[p.id].white;

        let indicatorsHtml = '';
        if (hasBlack || hasWhite) {
            indicatorsHtml = `<div class="art-indicators">
                ${hasBlack ? '<div class="indicator ind-black"></div>' : ''}
                ${hasWhite ? '<div class="indicator ind-white"></div>' : ''}
            </div>`;
        }

        card.innerHTML = `
            <div class="image-container">
                <a href="${p.url}" target="_blank" class="prom-link" onclick="event.stopPropagation()">На Пром</a>
                ${indicatorsHtml}
                <img src="${img1}" class="img-primary" alt="${p.nameRu}" loading="lazy">
                <img src="${img2}" class="img-secondary" alt="${p.nameRu}" loading="lazy">
            </div>
            <h4 class="product-title">${p.nameRu}</h4>
            <div class="product-category">${p.category}</div>
        `;
        grid.appendChild(card);
    });
}

// ==========================================
// 4. ОКНО ТОВАРА И СОХРАНЕНИЕ
// ==========================================
function openProductModal(product) {
    currentProduct = product;
    
    // По умолчанию показываем первую картинку
    modalImg.src = product.images[0] || 'placeholder.jpg';
    modalTitle.textContent = product.nameRu;
    modalCategory.textContent = product.category;

    // Логика переключателя картинок
    if (product.images.length > 1) {
        modalImageSwitcher.style.display = 'flex';
        btnImgBlack.classList.add('active');
        btnImgWhite.classList.remove('active');
        
        btnImgBlack.onclick = () => {
            modalImg.src = product.images[0];
            btnImgBlack.classList.add('active');
            btnImgWhite.classList.remove('active');
        };
        
        btnImgWhite.onclick = () => {
            modalImg.src = product.images[1];
            btnImgWhite.classList.add('active');
            btnImgBlack.classList.remove('active');
        };
    } else {
        // Если картинка только одна - прячем переключатель
        modalImageSwitcher.style.display = 'none';
    }

    linkBlack.value = ''; fileBlack.value = '';
    linkWhite.value = ''; fileWhite.value = '';

    const blackUrl = savedArts[product.id]?.black;
    if (blackUrl) {
        linkBlack.style.display = 'none'; fileBlack.style.display = 'none'; saveBlackBtn.style.display = 'none';
        viewBlackBtn.style.display = 'flex'; viewBlackBtn.href = blackUrl; delBlackBtn.style.display = 'block';
    } else {
        linkBlack.style.display = 'block'; fileBlack.style.display = 'block'; saveBlackBtn.style.display = 'flex';
        viewBlackBtn.style.display = 'none'; delBlackBtn.style.display = 'none';
    }

    const whiteUrl = savedArts[product.id]?.white;
    if (whiteUrl) {
        linkWhite.style.display = 'none'; fileWhite.style.display = 'none'; saveWhiteBtn.style.display = 'none';
        viewWhiteBtn.style.display = 'flex'; viewWhiteBtn.href = whiteUrl; delWhiteBtn.style.display = 'block';
    } else {
        linkWhite.style.display = 'block'; fileWhite.style.display = 'block'; saveWhiteBtn.style.display = 'flex';
        viewWhiteBtn.style.display = 'none'; delWhiteBtn.style.display = 'none';
    }

    productModal.style.display = 'flex';
}

closeModalBtn.onclick = () => productModal.style.display = 'none';

async function saveVariant(variant, fileInput, linkInput, btn) {
    const file = fileInput.files[0];
    const link = linkInput.value.trim();
    let finalUrl = '';

    btn.textContent = '...'; btn.disabled = true;

    try {
        if (file) {
            const fileRef = storageRef(storage, `arts/${currentProduct.id}_${variant}_${file.name}`);
            await uploadBytes(fileRef, file);
            finalUrl = await getDownloadURL(fileRef);
        } else if (link) {
            finalUrl = link;
        }

        if (finalUrl) {
            await set(ref(db, `arts/${currentProduct.id}/${variant}`), finalUrl);
            openProductModal(currentProduct); 
        }
    } catch (error) {
        alert("Ошибка при сохранении.");
    }
    btn.textContent = 'Сохранить'; btn.disabled = false;
}

async function deleteVariant(variant) {
    if(confirm('Удалить этот арт?')) {
        await set(ref(db, `arts/${currentProduct.id}/${variant}`), null);
        openProductModal(currentProduct);
    }
}

saveBlackBtn.onclick = () => saveVariant('black', fileBlack, linkBlack, saveBlackBtn);
saveWhiteBtn.onclick = () => saveVariant('white', fileWhite, linkWhite, saveWhiteBtn);
delBlackBtn.onclick = () => deleteVariant('black');
delWhiteBtn.onclick = () => deleteVariant('white');
