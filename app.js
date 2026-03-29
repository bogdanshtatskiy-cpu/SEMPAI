import { initializeApp } from "https://www.gstatic.com/firebasejs/10.8.1/firebase-app.js";
import { getFirestore, collection, addDoc, getDocs, doc, getDoc, updateDoc, deleteDoc, orderBy, query } from "https://www.gstatic.com/firebasejs/10.8.1/firebase-firestore.js";
import { getStorage, ref, uploadBytesResumable, getDownloadURL, deleteObject } from "https://www.gstatic.com/firebasejs/10.8.1/firebase-storage.js";

// !!! ВСТАВЬ СВОИ ДАННЫЕ СЮДА !!!
const firebaseConfig = {
  apiKey: "AIzaSyDhElZXZz6wdjwR6DRIIqyfwfrCdRK-JZc",
  authDomain: "mc550e.firebaseapp.com",
  projectId: "mc550e",
  storageBucket: "mc550e.firebasestorage.app",
  messagingSenderId: "772399307357",
  appId: "1:772399307357:web:b4adec6deed9e1ab96cbb4"
};

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);
const storage = getStorage(app);

let currentColors = [];
let currentJefFiles = []; // Сохраняем ссылки для удаления старых JEF файлов при обновлении
let allPrints = []; 
let editingId = null; 
let isImageLoadedForCanvas = false;
let allStashThreads = []; // Локальный склад

// --- УПРАВЛЕНИЕ ОКНАМИ (С БЛОКИРОВКОЙ СКРОЛЛА) ---
window.openModal = (id) => {
    document.getElementById(id).style.display = 'flex';
    document.body.classList.add('no-scroll'); // Блокируем фон
};
window.closeModal = (id) => {
    document.getElementById(id).style.display = 'none';
    document.body.classList.remove('no-scroll'); // Разблокируем фон
};

// --- ТЕМНАЯ ТЕМА ---
function applyTheme(isDark) {
    if (isDark) {
        document.body.classList.add('dark-theme');
        document.getElementById('theme-icon')?.classList.replace('ph-moon', 'ph-sun');
    } else {
        document.body.classList.remove('dark-theme');
        document.getElementById('theme-icon')?.classList.replace('ph-sun', 'ph-moon');
    }
}

window.toggleTheme = function() {
    const isDarkNow = document.body.classList.contains('dark-theme');
    localStorage.setItem('hk_vault_theme', !isDarkNow);
    applyTheme(!isDarkNow);
}

// Инициализация темы при загрузке
if (localStorage.getItem('hk_vault_theme') === 'true') applyTheme(true);

// --- АВТОРИЗАЦИЯ И ШУТКА ---
if (localStorage.getItem('hk_vault_auth') === 'true') {
    document.getElementById('auth-screen').style.display = 'none';
    document.getElementById('app-container').style.display = 'block';
    loadPrints();
    loadStashToLocals(); // Автозагрузка склада
}

window.checkPassword = async function() {
    const input = document.getElementById('secret-password').value;
    const btn = document.querySelector('.auth-panel button');
    btn.innerHTML = "<i class='ph ph-spinner ph-spin'></i> Проверка...";

    try {
        const docSnap = await getDoc(doc(db, "settings", "auth"));
        if (docSnap.exists() && input === docSnap.data().password) {
            document.getElementById('auth-screen').style.display = 'none';
            window.openModal('joke-modal');
        } else {
            alert("Неверный ключ доступа 💅");
        }
    } catch (e) {
        console.error(e);
        alert("Ошибка подключения. Создан ли документ settings/auth в базе?");
    }
    btn.innerHTML = "Войти";
}

// Кнопка "Да" в шуточном окне (Музыка ВЫРЕЗАНА)
window.confirmJoke = function() {
    localStorage.setItem('hk_vault_auth', 'true');
    window.closeModal('joke-modal');
    document.getElementById('app-container').style.display = 'block';
    loadPrints();
    loadStashToLocals(); // Автозагрузка склада
}

window.logout = function() {
    localStorage.removeItem('hk_vault_auth');
    location.reload();
}

window.openAddModal = function() {
    editingId = null;
    document.getElementById('modal-title').innerText = "Новый дизайн вышивки";
    document.getElementById('save-btn').innerText = "Сохранить в базу";
    
    currentColors = [];
    currentJefFiles = [];
    renderColors();
    document.getElementById('files-container').innerHTML = '';
    
    document.getElementById('cover-image').value = '';
    document.getElementById('cover-file-name').innerHTML = `<i class="ph ph-image"></i> Выберите изображение...`;
    document.getElementById('cover-file-name').removeAttribute('data-url'); 
    document.getElementById('cover-file-name').removeAttribute('data-path'); 
    
    // Сброс зоны определения цветов
    document.getElementById('markers-container').innerHTML = '';
    document.getElementById('photo-for-color').value = '';
    document.getElementById('canvas-wrapper').style.display = 'none';
    isImageLoadedForCanvas = false;
    
    fillStashSelect(); // Обновить Stash select

    window.addJefRow(); 
    window.openModal('add-modal');
}

window.updateFileName = function(input) {
    const fileNameElement = input.nextElementSibling;
    if (input.files && input.files.length > 0) {
        fileNameElement.innerHTML = `<i class="ph ph-check-circle" style="color: green;"></i> ${input.files[0].name}`;
    } else {
        fileNameElement.innerHTML = `<i class="ph ph-file"></i> Выберите файл...`;
    }
}

// Глобальная Jef row функция (Grid)
window.addJefRow = function(existingData = null) {
    const container = document.getElementById('files-container');
    const row = document.createElement('div');
    row.className = 'file-row';
    const uniqueId = 'jef-' + Date.now() + Math.floor(Math.random() * 1000);
    
    let fileNameHtml = `<i class="ph ph-file-arrow-up"></i> Загрузить .jef`;
    let dataUrlAttr = "";
    if(existingData) {
        fileNameHtml = `<i class="ph ph-file-jef"></i> Старый: ${existingData.name}`;
        dataUrlAttr = `data-url="${existingData.url}" data-path="${existingData.path}" data-name="${existingData.name}"`;
    }

    row.innerHTML = `
        <select class="hoop-size" style="text-align: center;">
            <option value="RE36b (200x360)">RE36b (200x360)</option>
            <option value="SQ20b (200x200)">SQ20b (200x200)</option>
            <option value="RE20b (140x200)">RE20b (140x200)</option>
            <option value="SQ14b (140x140)">SQ14b (140x140)</option>
            <option value="HH10b (100x90)">HH10b (100x90)</option>
            <option value="RE10b (100x40)">RE10b (100x40)</option>
        </select>
        <input type="text" class="emb-size" placeholder="Размер (напр. 15x18 см)" value="${existingData ? existingData.size : ''}" style="text-align: center;">
        
        <label class="custom-file-upload">
            <input type="file" id="${uniqueId}" class="jef-file" accept=".jef" onchange="updateFileName(this)">
            <span class="file-name" ${dataUrlAttr} style="text-align: center; width: 100%;">${fileNameHtml}</span>
        </label>
        <button class="btn-danger" style="height:46px; text-align: center; justify-content: center;" title="Удалить" onclick="this.parentElement.remove()"><i class="ph ph-trash"></i></button>
    `;
    if(existingData) row.querySelector('.hoop-size').value = existingData.hoop;
    container.appendChild(row);
}

// --- === УМНАЯ ПИПЕТКА И БД АВТООПРЕДЕЛЕНИЕ (Разброс цвета 100) === ---
const canvas = document.getElementById('color-canvas');
const ctx = canvas.getContext('2d', { willReadFrequently: true });
const markersContainer = document.getElementById('markers-container');
const manualColorInput = document.getElementById('manual-color');

// Ручной клик по картинке (выбор любого цвета)
canvas.addEventListener('click', (e) => {
    if (!isImageLoadedForCanvas) return;
    const rect = canvas.getBoundingClientRect();
    const scaleX = canvas.width / rect.width;
    const scaleY = canvas.height / rect.height;
    
    const x = (e.clientX - rect.left) * scaleX;
    const y = (e.clientY - rect.top) * scaleY;
    
    const pixel = ctx.getImageData(x, y, 1, 1).data;
    const hex = rgbToHex(pixel[0], pixel[1], pixel[2]);
    
    manualColorInput.value = hex; 
    document.getElementById('color-code').focus(); // Фокус на ввод текста
});

document.getElementById('photo-for-color').addEventListener('change', (e) => {
    const file = e.target.files[0];
    if(!file) return;
    
    markersContainer.innerHTML = ''; 
    const reader = new FileReader();
    reader.onload = (event) => {
        const img = new Image();
        img.onload = () => {
            document.getElementById('canvas-wrapper').style.display = 'block';
            
            // Жесткое внутреннее разрешение (для точности расчетов)
            const maxWidth = 800; 
            const scale = Math.min(maxWidth / img.width, 1);
            canvas.width = img.width * scale;
            canvas.height = img.height * scale;
            ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
            isImageLoadedForCanvas = true;
        }
        img.src = event.target.result;
    };
    reader.readAsDataURL(file);
});

// Кнопка Автоопределения (Разброс цвета 100)
window.autoDetectColors = function() {
    if (!isImageLoadedForCanvas) return alert("Сначала загрузи фото ниток!");
    markersContainer.innerHTML = '';
    
    const step = Math.floor(canvas.width / 20); // Сетка сканирования
    let detectedColors = [];

    for (let x = step; x < canvas.width; x += step) {
        for (let y = step; y < canvas.height; y += step) {
            if(detectedColors.length >= 12) break; // Максимум 12 цветов

            const pixel = ctx.getImageData(x, y, 1, 1).data;
            const r = pixel[0], g = pixel[1], b = pixel[2];
            
            // Игнорируем черный и белый фон
            const brightness = (r * 299 + g * 587 + b * 114) / 1000;
            if (brightness > 35 && brightness < 235) {
                
                // Проверка на схожесть с УМНЫМ БОЛЬШИМ разбросом (100)
                let isTooSimilar = false;
                for (let color of detectedColors) {
                    // Евклидово расстояние цветов
                    const dist = Math.sqrt(Math.pow(r - color.r, 2) + Math.pow(g - color.g, 2) + Math.pow(b - color.b, 2));
                    if (dist < 100) { // 100 - БОЛЬШОЙ разброс, чтобы не путать оттенки
                        isTooSimilar = true; 
                        break;
                    }
                }
                
                if (!isTooSimilar) {
                    detectedColors.push({r, g, b});
                    const hex = rgbToHex(r, g, b);
                    // Координаты в процентах для идеальной адаптивности
                    const percentX = (x / canvas.width) * 100;
                    const percentY = (y / canvas.height) * 100;
                    createColorMarker(percentX, percentY, hex);
                }
            }
        }
        if(detectedColors.length >= 12) break;
    }
}

function rgbToHex(r, g, b) {
    return "#" + ((1 << 24) + (r << 16) + (g << 8) + b).toString(16).slice(1);
}

function createColorMarker(percentX, percentY, hex) {
    const marker = document.createElement('div');
    marker.className = 'color-marker';
    marker.style.left = `${percentX}%`;
    marker.style.top = `${percentY}%`;
    marker.style.backgroundColor = hex;
    
    marker.addEventListener('click', () => {
        manualColorInput.value = hex;
        document.getElementById('color-code').focus();
    });
    markersContainer.appendChild(marker);
}

// --- === БД СКЛАД НИТЕЙ === ---
async function loadStashToLocals() {
    allStashThreads = [];
    const q = query(collection(db, "stash"), orderBy("code", "asc"));
    const querySnapshot = await getDocs(q);
    querySnapshot.forEach((doc) => {
        const data = doc.data();
        allStashThreads.push({ id: doc.id, hex: data.hex, code: data.code });
    });
}

// Открыть модалку склада
window.openStashModal = function() {
    window.openModal('stash-modal');
    loadStashToModal();
}

window.addThreadToStash = async function() {
    const hex = document.getElementById('stash-color-picker').value;
    const code = document.getElementById('stash-color-code').value.trim();
    if(!code) return alert("Введите код нити!");

    const btn = event.target;
    btn.innerHTML = "<i class='ph ph-spinner ph-spin'></i>";
    
    try {
        await addDoc(collection(db, "stash"), { hex, code, addedAt: new Date() });
        document.getElementById('stash-color-code').value = '';
        await loadStashToLocals(); // Обновить локальный склад
        loadStashToModal(); // Обновить модалку
    } catch (e) { console.error(e); }
    btn.innerHTML = '<i class="ph ph-plus"></i> Добавить';
}

async function loadStashToModal() {
    const list = document.getElementById('stash-list');
    document.getElementById('stash-loading').style.display = 'block';
    list.innerHTML = '';
    
    try {
        // Мы уже загрузили склад в авто-входе/добавлении, просто выводим
        allStashThreads.forEach((thread) => {
            list.innerHTML += `
                <div class="color-badge" onclick="deleteStashThread('${thread.id}')" style="cursor:pointer" title="Удалить со склада">
                    <div class="color-circle" style="background:${thread.hex}"></div> ${thread.code}
                </div>
            `;
        });
        if(list.innerHTML === '') list.innerHTML = '<p style="color:#888; width:100%;">Склад пуст.</p>';
    } catch (e) { console.error(e); }
    document.getElementById('stash-loading').style.display = 'none';
}

window.deleteStashThread = async function(id) {
    if(confirm("Удалить нить со склада?")) {
        await deleteDoc(doc(db, "stash", id));
        await loadStashToLocals();
        loadStashToModal();
    }
}

// --- БД ВЫБОР ИЗ СКЛАДА (Модалка дизайна) ---
function fillStashSelect() {
    const select = document.getElementById('stash-select');
    select.innerHTML = '<option value="">Выбрать из Склада...</option>';
    allStashThreads.forEach(thread => {
        select.innerHTML += `<option value="${thread.id}" style="color: black; background-color: ${thread.hex};">${thread.code}</option>`;
    });
}

// Листенер для автозаполнения полей из склада
document.getElementById('stash-select').addEventListener('change', (e) => {
    const threadId = e.target.value;
    if (!threadId) return;
    
    const thread = allStashThreads.find(t => t.id === threadId);
    if (!thread) return;
    
    manualColorInput.value = thread.hex;
    document.getElementById('color-code').value = thread.code;
    e.target.value = ''; // Сброс селекта
});

// Добавление в палитру дизайна
window.addDesignColor = function() {
    const hex = manualColorInput.value;
    const code = document.getElementById('color-code').value.trim() || 'Без кода';
    currentColors.push({ hex, code });
    renderColors();
    document.getElementById('color-code').value = '';
}

function renderColors() {
    const container = document.getElementById('colors-container');
    container.innerHTML = currentColors.map((c, i) => `
        <div class="color-badge" onclick="removeColor(${i})" style="cursor:pointer" title="Удалить">
            <div class="color-circle" style="background:${c.hex}"></div> ${c.code}
        </div>
    `).join('');
}

window.removeColor = function(index) {
    currentColors.splice(index, 1);
    renderColors();
}

// === УДАЛЕНИЕ СТАРОЙ ОБЛОЖКИ/JEF ПРИ ОБНОВЛЕНИИ ===
async function deleteOldFileFromStorage(path) {
    if (!path) return;
    try {
        const fileRef = ref(storage, path);
        await deleteObject(fileRef);
    } catch (error) {
        if (error.code !== 'storage/object-not-found') {
            console.error('Ошибка удаления файла:', error);
        }
    }
}

// --- СОХРАНЕНИЕ ПРИНТОВ (БД Редактирование, УДАЛЕНИЕ СТАРЫХ JEF ФАЙЛОВ) ---
window.savePrint = async function(event) {
    const coverInput = document.getElementById('cover-image');
    const oldCoverUrl = document.getElementById('cover-file-name').getAttribute('data-url');
    const oldCoverPath = document.getElementById('cover-file-name').getAttribute('data-path');
    
    if (!coverInput.files[0] && !oldCoverUrl) return alert("Загрузи обложку дизайна!");

    const btn = event.target;
    btn.innerHTML = "<i class='ph ph-spinner ph-spin'></i> Сохраняем...";
    btn.disabled = true;

    try {
        const printId = editingId ? editingId : Date.now().toString();
        
        // 1. Обложка
        let coverUrl = oldCoverUrl;
        let newCoverPath = oldCoverPath;
        if (coverInput.files[0]) {
            const coverRef = ref(storage, `covers/${printId}_${coverInput.files[0].name}`);
            const uploadTask = await uploadBytesResumable(coverRef, coverInput.files[0]);
            coverUrl = await getDownloadURL(coverTask.ref);
            newCoverPath = coverRef.fullPath;
            
            // Если мы редактируем и загрузили новую обложку — удаляем старую
            if (editingId && oldCoverPath) {
                await deleteOldFileFromStorage(oldCoverPath);
            }
        }

        // 2. Файлы .jef
        const fileRows = document.querySelectorAll('.file-row');
        let filesData = [];
        let newJefPaths = [];
        
        for (let row of fileRows) {
            const jefInput = row.querySelector('.jef-file');
            const spanData = row.querySelector('.file-name');
            const oldUrl = spanData.getAttribute('data-url');
            const oldPath = spanData.getAttribute('data-path');
            const oldName = spanData.getAttribute('data-name');
            
            if (jefInput.files[0]) { // Новый файл
                const file = jefInput.files[0];
                const fileRef = ref(storage, `jef_files/${printId}_${file.name}`);
                await uploadBytesResumable(fileRef, file);
                const fileUrl = await getDownloadURL(fileRef);
                
                filesData.push({ hoop: row.querySelector('.hoop-size').value, size: row.querySelector('.emb-size').value.trim() || 'Не указан', name: file.name, url: fileUrl, path: fileRef.fullPath });
                newJefPaths.push(fileRef.fullPath); // Сохраняем путь для сравнения
            } else if (oldUrl) { // Оставляем старый файл
                filesData.push({ hoop: row.querySelector('.hoop-size').value, size: row.querySelector('.emb-size').value.trim() || 'Не указан', name: oldName, url: oldUrl, path: oldPath });
                newJefPaths.push(oldPath); // Сохраняем путь
            }
        }

        // Если мы редактируем — удаляем JEF файлы, которые были удалены из списка
        if (editingId) {
            for (let oldPath of currentJefFiles) {
                if (!newJefPaths.includes(oldPath)) {
                    await deleteOldFileFromStorage(oldPath);
                }
            }
        }

        const dataToSave = { coverUrl, coverPath: newCoverPath, colors: currentColors, files: filesData, updatedAt: new Date() };

        if (editingId) {
            await updateDoc(doc(db, "prints", editingId), dataToSave);
        } else {
            dataToSave.createdAt = new Date(); // createdAt только для новых
            await addDoc(collection(db, "prints"), dataToSave);
        }

        window.closeModal('add-modal');
        loadPrints(); 
    } catch (error) {
        console.error(error); alert("Произошла ошибка! Проверь консоль.");
    } finally {
        btn.innerHTML = "Сохранить в базу"; btn.disabled = false;
    }
}

// --- ЗАГРУЗКА И ВЫВОД ПРИНТОВ (2 колонки, ТОЛЬКО КАРТИНКИ) ---
async function loadPrints() {
    const grid = document.getElementById('prints-grid');
    grid.innerHTML = '<p style="grid-column: 1/-1; text-align: center;"><i class="ph ph-spinner ph-spin" style="font-size: 2rem; color: var(--hk-hot-pink);"></i></p>';
    
    try {
        const querySnapshot = await getDocs(collection(db, "prints"));
        grid.innerHTML = '';
        allPrints = []; 
        
        querySnapshot.forEach((document) => {
            const print = document.data();
            print.id = document.id; 
            allPrints.push(print);
            
            const tile = window.document.createElement('div');
            tile.className = 'print-tile';
            tile.onclick = () => showViewModal(print.id); // Клик открывает модалку просмотра
            tile.innerHTML = `<img src="${print.coverUrl}">`;
            grid.appendChild(tile);
        });

        if(allPrints.length === 0) grid.innerHTML = '<p style="grid-column: 1/-1; text-align: center;">Дизайнов пока нет.</p>';
    } catch (error) {
        console.error(error); grid.innerHTML = '<p style="grid-column: 1/-1; color: red;">Ошибка подключения.</p>';
    }
}

// --- ПРОСМОТР ---
window.showViewModal = function(id) {
    const print = allPrints.find(p => p.id === id);
    if(!print) return;

    document.getElementById('view-image').src = print.coverUrl;
    
    document.getElementById('view-colors').innerHTML = (print.colors || []).map(c => 
        `<div class="color-badge"><div class="color-circle" style="background:${c.hex}"></div> ${c.code}</div>`
    ).join(' ');

    document.getElementById('view-files').innerHTML = (print.files || []).map(f => `
        <div class="file-view-item">
            <div class="file-view-info"><strong>${f.hoop}</strong> <span>Размер: ${f.size}</span></div>
            <a href="${f.url}" target="_blank" download class="btn-download"><i class="ph ph-download-simple"></i> .jef</a>
        </div>
    `).join('');

    document.getElementById('btn-edit-print').onclick = () => editPrint(id);
    document.getElementById('btn-delete-print').onclick = () => deletePrint(id);

    window.openModal('view-modal');
}

// === БД УДАЛЕНИЕ ДИЗАЙНА (УДАЛЕНИЕ ФАЙЛОВ ИЗ STORAGE) ===
window.deletePrint = async function(id) {
    if (confirm("Удалить дизайн? Восстановить будет невозможно.")) {
        const print = allPrints.find(p => p.id === id);
        if(!print) return alert("Дизайн не найден!");

        try {
            // Удаляем обложку
            await deleteOldFileFromStorage(print.coverPath);
            
            // Удаляем JEF файлы
            if (print.files) {
                for (let f of print.files) {
                    await deleteOldFileFromStorage(f.path);
                }
            }
            
            // Удаляем документ Firestore
            await deleteDoc(doc(db, "prints", id));
            
            window.closeModal('view-modal');
            loadPrints(); 
        } catch (error) { console.error(error); alert("Не удалось удалить."); }
    }
}

// --- БД РЕДАКТИРОВАНИЕ (Автозаполнение) ---
window.editPrint = function(id) {
    editingId = id;
    const print = allPrints.find(p => p.id === id);
    
    document.getElementById('modal-title').innerText = "Редактирование дизайна";
    document.getElementById('modal-title').style.textAlign = 'center';
    document.getElementById('save-btn').innerText = "Обновить дизайн";
    document.getElementById('save-btn').style.textAlign = 'center';
    
    // Подгружаем обложку
    document.getElementById('cover-file-name').innerHTML = `<i class="ph ph-image"></i> Оставить старую обложку`;
    document.getElementById('cover-file-name').setAttribute('data-url', print.coverUrl);
    document.getElementById('cover-file-name').setAttribute('data-path', print.coverPath);
    
    // Подгружаем цвета
    currentColors = [...(print.colors || [])];
    renderColors();
    
    // Подгружаем файлы JEF (с сохранением путей)
    const filesContainer = document.getElementById('files-container');
    filesContainer.innerHTML = '';
    currentJefFiles = []; // Сброс старых путей JEF
    (print.files || []).forEach(f => {
        window.addJefRow(f);
        if(f.path) currentJefFiles.push(f.path); // Сохраняем путь для сравнения
    });

    fillStashSelect(); // Обновить Stash select

    window.closeModal('view-modal');
    window.openModal('add-modal');
}
