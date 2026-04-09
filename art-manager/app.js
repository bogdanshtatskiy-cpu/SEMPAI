// Подключаем Firebase SDK (Модульный синтаксис v9+)
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
	appId: "1:746851856077:web:7757cc827a68db52424384"};

// Инициализация Firebase
const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getDatabase(app);
const storage = getStorage(app);

// Глобальные переменные приложения
let products = [];
let activeCategory = 'Все';
let activeGroup = '';
let favoriteCategories = JSON.parse(localStorage.getItem('sempai_fav_cats')) || [];
let savedArts = {}; // Здесь хранятся привязанные арты (id_товара: ссылка)
let currentEditingProductId = null;

// Элементы DOM
const grid = document.getElementById('productsGrid');
const categoryList = document.getElementById('categoryList');
const searchInput = document.getElementById('searchInput');
const groupToggles = document.getElementById('groupToggles');

// Элементы Авторизации
const loginScreen = document.getElementById('loginScreen');
const appContent = document.getElementById('appContent');
const emailInput = document.getElementById('emailInput');
const passwordInput = document.getElementById('passwordInput');
const loginBtn = document.getElementById('loginBtn');
const logoutBtn = document.getElementById('logoutBtn');
const loginError = document.getElementById('loginError');

// Элементы Модалки
const artModal = document.getElementById('artModal');
const modalProductName = document.getElementById('modalProductName');
const artLinkInput = document.getElementById('artLinkInput');
const artFileInput = document.getElementById('artFileInput');
const saveArtBtn = document.getElementById('saveArtBtn');
const closeModalBtn = document.getElementById('closeModalBtn');

// ==========================================
// ЛОГИКА АВТОРИЗАЦИИ (ЗАЩИТА БАЗЫ)
// ==========================================

// Следим за статусом пользователя
onAuthStateChanged(auth, (user) => {
    if (user) {
        // Пользователь вошел
        loginScreen.style.display = 'none';
        appContent.style.display = 'flex';
        loadApp(); // Запускаем приложение только после входа
    } else {
        // Нет входа - показываем экран логина
        loginScreen.style.display = 'flex';
        appContent.style.display = 'none';
    }
});

loginBtn.onclick = () => {
    const email = emailInput.value;
    const pass = passwordInput.value;
    signInWithEmailAndPassword(auth, email, pass)
        .catch(error => {
            loginError.textContent = "Ошибка входа. Проверьте данные.";
            console.error(error);
        });
};

logoutBtn.onclick = () => signOut(auth);

// ==========================================
// ИНИЦИАЛИЗАЦИЯ И РЕНДЕР
// ==========================================

async function loadApp() {
    try {
        const response = await fetch('products.json');
        products = await response.json();
        
        // Синхронизация с Firebase Database (слушаем изменения в реальном времени)
        const artsRef = ref(db, 'arts/');
        onValue(artsRef, (snapshot) => {
            savedArts = snapshot.val() || {};
            renderProducts(); // Перерисовываем товары, когда арты загрузились/обновились
        });

        setupGroups();
        setupCategories();
    } catch (error) {
        console.error('Ошибка загрузки products.json', error);
    }
}

// (setupGroups, setupCategories, createCategoryItem, toggleFavorite, selectCategory остаются теми же)
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
        const favHeader = document.createElement('div');
        favHeader.className = 'cat-divider';
        favHeader.textContent = '★ Избранные';
        categoryList.appendChild(favHeader);
        favs.forEach(cat => createCategoryItem(cat, true));
        
        const otherHeader = document.createElement('div');
        otherHeader.className = 'cat-divider';
        otherHeader.textContent = 'Остальные';
        categoryList.appendChild(otherHeader);
    }
    others.forEach(cat => createCategoryItem(cat, false));
}

function createCategoryItem(cat, isFav) {
    const li = document.createElement('li');
    if (activeCategory === cat) li.classList.add('active');
    
    const nameSpan = document.createElement('span');
    nameSpan.textContent = cat;
    
    const starSpan = document.createElement('span');
    starSpan.className = `fav-star ${isFav ? 'is-fav' : ''}`;
    starSpan.innerHTML = isFav ? '★' : '☆';
    
    starSpan.onclick = (e) => { e.stopPropagation(); toggleFavorite(cat); };
    li.onclick = () => selectCategory(cat, li);

    li.appendChild(nameSpan);
    li.appendChild(starSpan);
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

function selectCategory(cat, element) {
    categoryList.querySelectorAll('li').forEach(el => el.classList.remove('active'));
    element.classList.add('active');
    activeCategory = cat;
    renderProducts();
}

searchInput.addEventListener('input', renderProducts);

// ==========================================
// ОТРИСОВКА И УПРАВЛЕНИЕ АРТАМИ
// ==========================================

function renderProducts() {
    const query = searchInput.value.toLowerCase();
    
    const filtered = products.filter(p => {
        const matchGroup = p.group === activeGroup;
        const matchCat = activeCategory === 'Все' || p.category === activeCategory;
        const matchSearch = p.nameRu.toLowerCase().includes(query) || p.nameUa.toLowerCase().includes(query);
        return matchGroup && matchCat && matchSearch;
    });

    grid.innerHTML = '';

    filtered.forEach(p => {
        const card = document.createElement('div');
        card.className = 'product-card';

        const img1 = p.images[0] || 'placeholder.jpg';
        const img2 = p.images[1] || img1;
        
        // Проверяем, есть ли сохраненный арт в базе
        const artUrl = savedArts[p.id];

        let html = `
            <div class="image-container">
                ${artUrl ? '<div class="art-badge">Арт загружен</div>' : ''}
                <img src="${img1}" class="img-primary" alt="${p.nameRu}" loading="lazy">
                <img src="${img2}" class="img-secondary" alt="${p.nameRu}" loading="lazy">
            </div>
            <h4 class="product-title">${p.nameRu}</h4>
            <div class="product-category">${p.category}</div>
            <a href="${p.url}" target="_blank" class="prom-link">На Пром</a>
            
            <div class="art-controls">
        `;

        if (artUrl) {
            html += `
                <a href="${artUrl}" target="_blank" class="btn-art btn-art-download">Скачать Арт</a>
                <button class="btn-art btn-art-edit" onclick="openArtModal('${p.id}', '${p.nameRu.replace(/'/g, "")}')">Изменить</button>
            `;
        } else {
            html += `<button class="btn-art btn-art-add" onclick="openArtModal('${p.id}', '${p.nameRu.replace(/'/g, "")}')">+ Добавить Арт</button>`;
        }

        html += `</div>`;
        card.innerHTML = html;
        grid.appendChild(card);
    });
}

// ==========================================
// ЛОГИКА ЗАГРУЗКИ АРТА В FIREBASE
// ==========================================

// Делаем функцию доступной глобально для inline onclick
window.openArtModal = (productId, productName) => {
    currentEditingProductId = productId;
    modalProductName.textContent = productName;
    
    // Очищаем поля
    artLinkInput.value = savedArts[productId] || ''; 
    artFileInput.value = '';
    
    artModal.style.display = 'flex';
};

closeModalBtn.onclick = () => {
    artModal.style.display = 'none';
};

saveArtBtn.onclick = async () => {
    const file = artFileInput.files[0];
    const link = artLinkInput.value.trim();
    let finalUrl = '';

    saveArtBtn.textContent = 'Сохранение...';
    saveArtBtn.disabled = true;

    try {
        if (file) {
            // Если выбран файл - загружаем его в Firebase Storage
            const fileRef = storageRef(storage, `arts/${currentEditingProductId}_${file.name}`);
            await uploadBytes(fileRef, file);
            finalUrl = await getDownloadURL(fileRef); // Получаем публичную ссылку на загруженный файл
        } else if (link) {
            // Если просто вставили ссылку на Диск
            finalUrl = link;
        }

        if (finalUrl) {
            // Сохраняем ссылку в Realtime Database
            await set(ref(db, 'arts/' + currentEditingProductId), finalUrl);
            artModal.style.display = 'none';
        } else {
            // Если пользователь просто стер ссылку (удаление арта)
            await set(ref(db, 'arts/' + currentEditingProductId), null);
            artModal.style.display = 'none';
        }
    } catch (error) {
        console.error("Ошибка при сохранении:", error);
        alert("Произошла ошибка при загрузке. Проверьте консоль.");
    }

    saveArtBtn.textContent = 'Сохранить арт';
    saveArtBtn.disabled = false;
};