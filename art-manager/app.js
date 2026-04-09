import { initializeApp } from "https://www.gstatic.com/firebasejs/10.8.1/firebase-app.js";
import { getAuth, signInWithEmailAndPassword, onAuthStateChanged, signOut } from "https://www.gstatic.com/firebasejs/10.8.1/firebase-auth.js";
import { getDatabase, ref, set, onValue } from "https://www.gstatic.com/firebasejs/10.8.1/firebase-database.js";
import { getStorage, ref as storageRef, uploadBytes, getDownloadURL } from "https://www.gstatic.com/firebasejs/10.8.1/firebase-storage.js";

// --- ВСТАВЬ СЮДА СВОИ ДАННЫЕ ИЗ FIREBASE ---
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
let savedArts = {}; // Структура теперь: { id: { black: 'url', white: 'url' } }
let currentProduct = null;

// DOM Элементы
const grid = document.getElementById('productsGrid');
const categoryList = document.getElementById('categoryList');
const searchInput = document.getElementById('searchInput');
const groupToggles = document.getElementById('groupToggles');

const loginScreen = document.getElementById('loginScreen');
const appContent = document.getElementById('appContent');
const logoutBtn = document.getElementById('logoutBtn');

// Элементы Модалки
const productModal = document.getElementById('productModal');
const closeModalBtn = document.getElementById('closeModalBtn');
const modalImg = document.getElementById('modalImg');
const modalTitle = document.getElementById('modalTitle');
const modalCategory = document.getElementById('modalCategory');

// Инпуты модалки
const linkBlack = document.getElementById('linkBlack');
const fileBlack = document.getElementById('fileBlack');
const linkWhite = document.getElementById('linkWhite');
const fileWhite = document.getElementById('fileWhite');

// Кнопки модалки
const saveBlackBtn = document.getElementById('saveBlackBtn');
const viewBlackBtn = document.getElementById('viewBlackBtn');
const delBlackBtn = document.getElementById('delBlackBtn');
const saveWhiteBtn = document.getElementById('saveWhiteBtn');
const viewWhiteBtn = document.getElementById('viewWhiteBtn');
const delWhiteBtn = document.getElementById('delWhiteBtn');

// ==========================================
// АВТОРИЗАЦИЯ
// ==========================================
onAuthStateChanged(auth, (user) => {
    if (user) {
        loginScreen.style.display = 'none';
        appContent.style.display = 'flex';
        loadApp(); 
    } else {
        loginScreen.style.display = 'flex';
        appContent.style.display = 'none';
    }
});

document.getElementById('loginBtn').onclick = () => {
    signInWithEmailAndPassword(auth, document.getElementById('emailInput').value, document.getElementById('passwordInput').value)
        .catch(e => document.getElementById('loginError').textContent = "Ошибка входа.");
};
logoutBtn.onclick = () => signOut(auth);

// ==========================================
// ИНИЦИАЛИЗАЦИЯ
// ==========================================
async function loadApp() {
    try {
        const response = await fetch('products.json');
        products = await response.json();
        
        // Слушаем базу данных (теперь загружаем объекты с цветами)
        onValue(ref(db, 'arts/'), (snapshot) => {
            savedArts = snapshot.val() || {};
            renderProducts(); 
        });

        setupGroups();
        ();
    } catch (error) {
        console.error('Ошибка загрузки', error);
    }
}

// (setupGroups, , createCategoryItem, toggleFavorite, selectCategory - без изменений)
function setupGroups() {
    groupToggles.innerHTML = '';
    const groups = [...new Set(products.map(p => p.group))];
    activeGroup = groups[0] || '';
    groups.forEach(group => {
        const btn = document.createElement('button');
        btn.textContent = group;
        if (group === activeGroup) btn.classList.add('active');
        btn.onclick = () => { document.querySelectorAll('.group-toggles button').forEach(b => b.classList.remove('active')); btn.classList.add('active'); activeGroup = group; activeCategory = 'Все'; setupCategories(); renderProducts(); };
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
        // Создаем разделители правильно, не ломая события кликов
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
    li.querySelector('.fav-star').onclick = (e) => { e.stopPropagation(); toggleFavorite(cat); };
    li.onclick = () => selectCategory(cat, li);
    categoryList.appendChild(li);
}
function toggleFavorite(cat) {
    favoriteCategories.includes(cat) ? favoriteCategories = favoriteCategories.filter(c => c !== cat) : favoriteCategories.push(cat);
    localStorage.setItem('sempai_fav_cats', JSON.stringify(favoriteCategories));
    setupCategories(); 
}
function selectCategory(cat, el) { categoryList.querySelectorAll('li').forEach(e => e.classList.remove('active')); el.classList.add('active'); activeCategory = cat; renderProducts(); }
searchInput.addEventListener('input', renderProducts);

// ==========================================
// ОТРИСОВКА КАРТОЧЕК
// ==========================================
function renderProducts() {
    const query = searchInput.value.toLowerCase();
    const filtered = products.filter(p => p.group === activeGroup && (activeCategory === 'Все' || p.category === activeCategory) && (p.nameRu.toLowerCase().includes(query) || p.nameUa.toLowerCase().includes(query)));

    grid.innerHTML = '';

    filtered.forEach(p => {
        const card = document.createElement('div');
        card.className = 'product-card';
        // Клик по карточке открывает модалку
        card.onclick = () => openProductModal(p);

        const img1 = p.images[0] || 'placeholder.jpg';
        const img2 = p.images[1] || img1;
        
        // Проверяем наличие артов
        const hasBlack = savedArts[p.id] && savedArts[p.id].black;
        const hasWhite = savedArts[p.id] && savedArts[p.id].white;

        // Генерация индикаторов, если арты есть
        let indicatorsHtml = '';
        if (hasBlack || hasWhite) {
            indicatorsHtml = `<div class="art-indicators">
                ${hasBlack ? '<div class="indicator ind-black" title="Загружен арт для черной"></div>' : ''}
                ${hasWhite ? '<div class="indicator ind-white" title="Загружен арт для белой"></div>' : ''}
            </div>`;
        }

        // Обрати внимание: ссылка на пром перенесена внутрь image-container, а кнопки убраны
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
// ЛОГИКА ПОЛНОЦЕННОГО ОКНА ТОВАРА
// ==========================================
function openProductModal(product) {
    currentProduct = product;
    
    // Заполняем левую часть
    modalImg.src = product.images[0] || 'placeholder.jpg';
    modalTitle.textContent = product.nameRu;
    modalCategory.textContent = product.category;

    // Сброс инпутов
    linkBlack.value = ''; fileBlack.value = '';
    linkWhite.value = ''; fileWhite.value = '';

    // Настройка интерфейса для Черной футболки
    const blackUrl = savedArts[product.id]?.black;
    if (blackUrl) {
        linkBlack.style.display = 'none'; fileBlack.style.display = 'none'; saveBlackBtn.style.display = 'none';
        viewBlackBtn.style.display = 'flex'; viewBlackBtn.href = blackUrl;
        delBlackBtn.style.display = 'block';
    } else {
        linkBlack.style.display = 'block'; fileBlack.style.display = 'block'; saveBlackBtn.style.display = 'flex';
        viewBlackBtn.style.display = 'none'; delBlackBtn.style.display = 'none';
    }

    // Настройка интерфейса для Белой футболки
    const whiteUrl = savedArts[product.id]?.white;
    if (whiteUrl) {
        linkWhite.style.display = 'none'; fileWhite.style.display = 'none'; saveWhiteBtn.style.display = 'none';
        viewWhiteBtn.style.display = 'flex'; viewWhiteBtn.href = whiteUrl;
        delWhiteBtn.style.display = 'block';
    } else {
        linkWhite.style.display = 'block'; fileWhite.style.display = 'block'; saveWhiteBtn.style.display = 'flex';
        viewWhiteBtn.style.display = 'none'; delWhiteBtn.style.display = 'none';
    }

    productModal.style.display = 'flex';
}

closeModalBtn.onclick = () => productModal.style.display = 'none';

// ==========================================
// СОХРАНЕНИЕ И УДАЛЕНИЕ
// ==========================================
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
            // Сохраняем конкретный цвет в БД
            await set(ref(db, `arts/${currentProduct.id}/${variant}`), finalUrl);
            openProductModal(currentProduct); // Обновляем окно
        }
    } catch (error) {
        console.error("Ошибка:", error);
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

// Привязка кнопок
saveBlackBtn.onclick = () => saveVariant('black', fileBlack, linkBlack, saveBlackBtn);
saveWhiteBtn.onclick = () => saveVariant('white', fileWhite, linkWhite, saveWhiteBtn);
delBlackBtn.onclick = () => deleteVariant('black');
delWhiteBtn.onclick = () => deleteVariant('white');
