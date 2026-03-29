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

// Глобальные переменные
let currentColors = [];
let currentJefFiles = []; 
let allPrints = []; 
let editingId = null; 
let isImageLoadedForCanvas = false;
let allStashThreads = []; 

// --- УПРАВЛЕНИЕ ОКНАМИ ---
window.openModal = (id) => { 
    document.getElementById(id).style.display = 'flex'; 
    document.body.classList.add('no-scroll'); 
};

window.closeModal = (id) => { 
    document.getElementById(id).style.display = 'none'; 
    document.body.classList.remove('no-scroll'); 
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

if (localStorage.getItem('hk_vault_theme') === 'true') {
    applyTheme(true);
}

// --- АВТОРИЗАЦИЯ ---
if (localStorage.getItem('hk_vault_auth') === 'true') {
    document.getElementById('auth-screen').style.display = 'none';
    document.getElementById('app-container').style.display = 'block';
    loadPrints(); 
    loadStashToLocals(); 
}

window.checkPassword = async function() {
    const input = document.getElementById('secret-password').value;
    const btn = document.querySelector('.auth-panel button');
    btn.innerHTML = "<i class='ph-fill ph-spinner-gap ph-spin'></i> Проверяем...";

    try {
        const docSnap = await getDoc(doc(db, "settings", "auth"));
        if (docSnap.exists() && input === docSnap.data().password) {
            localStorage.setItem('hk_vault_auth', 'true');
            document.getElementById('auth-screen').style.display = 'none';
            document.getElementById('app-container').style.display = 'block'; 
            loadPrints(); 
            loadStashToLocals();
        } else { 
            alert("Неверный пароль, сладкий 💅"); 
        }
    } catch (e) { 
        console.error(e); 
        alert("Ошибка подключения."); 
    }
    btn.innerHTML = "<i class='ph-fill ph-key'></i> Войти красиво";
}

window.logout = function() { 
    localStorage.removeItem('hk_vault_auth'); 
    location.reload(); 
}

// --- ОТКРЫТИЕ МОДАЛКИ ДИЗАЙНА ---
window.openAddModal = function() {
    editingId = null;
    document.getElementById('modal-title').innerHTML = "Новый шедевр <i class='ph-fill ph-heart'></i>";
    document.getElementById('save-btn').innerHTML = "<i class='ph-fill ph-floppy-disk'></i> Сохранить в базу";
    
    currentColors = []; 
    currentJefFiles = []; 
    renderColors();
    document.getElementById('files-container').innerHTML = '';
    
    document.getElementById('cover-image').value = '';
    document.getElementById('cover-file-name').innerHTML = `Выбери самое красивое фото...`;
    document.getElementById('cover-file-name').removeAttribute('data-url'); 
    document.getElementById('cover-file-name').removeAttribute('data-path'); 
    
    document.getElementById('markers-container').innerHTML = '';
    document.getElementById('photo-for-color').value = '';
    
    const spanC = document.getElementById('photo-for-color').nextElementSibling;
    if(spanC) spanC.innerHTML = `<i class="ph-fill ph-camera"></i> Загрузить фото ниток...`;
    
    document.getElementById('canvas-wrapper').style.display = 'none';
    isImageLoadedForCanvas = false;
    
    fillStashSelect(); 
    window.addJefRow(); 
    window.openModal('add-modal');
}

window.updateFileName = function(input) {
    const fileNameElement = input.nextElementSibling;
    if (input.files && input.files.length > 0) { 
        fileNameElement.innerHTML = `<i class="ph-fill ph-check-circle" style="color: var(--hk-hot-pink);"></i> ${input.files[0].name}`; 
    } else { 
        fileNameElement.innerHTML = `<i class="ph-fill ph-file"></i> Выберите файл...`; 
    }
}

// --- ДОБАВЛЕНИЕ СТРОКИ JEF ---
window.addJefRow = function(existingData = null) {
    const container = document.getElementById('files-container');
    const row = document.createElement('div'); 
    row.className = 'file-row';
    const uniqueId = 'jef-' + Date.now() + Math.floor(Math.random() * 1000);
    
    let fileNameHtml = `<i class="ph-fill ph-file-arrow-up"></i> Загрузить .jef`;
    let dataUrlAttr = "";
    
    if(existingData) {
        fileNameHtml = `<i class="ph-fill ph-file-jef"></i> Оставить старый: ${existingData.name}`;
        dataUrlAttr = `data-url="${existingData.url}" data-path="${existingData.path}" data-name="${existingData.name}"`;
    }

    row.innerHTML = `
        <select class="hoop-size">
            <option value="RE36b (200x360)">RE36b (200x360)</option>
            <option value="SQ20b (200x200)">SQ20b (200x200)</option>
            <option value="RE20b (140x200)">RE20b (140x200)</option>
            <option value="SQ14b (140x140)">SQ14b (140x140)</option>
            <option value="HH10b (100x90)">HH10b (100x90)</option>
            <option value="RE10b (100x40)">RE10b (100x40)</option>
        </select>
        <input type="text" class="emb-size" placeholder="Размер (15x18 см)" value="${existingData ? existingData.size : ''}">
        <label class="custom-file-upload">
            <input type="file" id="${uniqueId}" class="jef-file" accept=".jef" onchange="updateFileName(this)">
            <span class="file-name" ${dataUrlAttr}>${fileNameHtml}</span>
        </label>
        <button class="btn-danger" style="display:flex;" title="Удалить" onclick="this.parentElement.remove()">
            <i class="ph-bold ph-trash" style="font-size: 1.4rem;"></i>
        </button>
    `;
    if(existingData) {
        row.querySelector('.hoop-size').value = existingData.hoop;
    }
    container.appendChild(row);
}


// ==========================================
// --- УМНАЯ ПИПЕТКА (ДЛЯ ФОРМЫ ДИЗАЙНА) ---
// ==========================================
const canvas = document.getElementById('color-canvas');
const ctx = canvas.getContext('2d', { willReadFrequently: true });
const markersContainer = document.getElementById('markers-container');
const manualColorInput = document.getElementById('manual-color');

canvas.addEventListener('click', (e) => {
    if (!isImageLoadedForCanvas) return;
    const rect = canvas.getBoundingClientRect();
    const x = (e.clientX - rect.left) * (canvas.width / rect.width);
    const y = (e.clientY - rect.top) * (canvas.height / rect.height);
    const pixel = ctx.getImageData(x, y, 1, 1).data;
    manualColorInput.value = rgbToHex(pixel[0], pixel[1], pixel[2]); 
    document.getElementById('color-code').focus();
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
            const scale = Math.min(800 / img.width, 1);
            canvas.width = img.width * scale; 
            canvas.height = img.height * scale;
            ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
            isImageLoadedForCanvas = true;
        }
        img.src = event.target.result;
    };
    reader.readAsDataURL(file);
});

window.autoDetectColors = function() {
    if (!isImageLoadedForCanvas) return alert("Сначала загрузи фото ниток!");
    markersContainer.innerHTML = '';
    const step = Math.floor(canvas.width / 20); 
    let detectedColors = [];

    for (let x = step; x < canvas.width; x += step) {
        for (let y = step; y < canvas.height; y += step) {
            if(detectedColors.length >= 12) break;
            
            const pixel = ctx.getImageData(x, y, 1, 1).data;
            const r = pixel[0], g = pixel[1], b = pixel[2];
            const brightness = (r * 299 + g * 587 + b * 114) / 1000;
            
            if (brightness > 35 && brightness < 235) {
                let isTooSimilar = false;
                for (let color of detectedColors) {
                    if (Math.sqrt(Math.pow(r - color.r, 2) + Math.pow(g - color.g, 2) + Math.pow(b - color.b, 2)) < 100) { 
                        isTooSimilar = true; 
                        break; 
                    }
                }
                if (!isTooSimilar) {
                    detectedColors.push({r, g, b});
                    createColorMarker(markersContainer, manualColorInput, 'color-code', (x / canvas.width) * 100, (y / canvas.height) * 100, rgbToHex(r, g, b));
                }
            }
        }
    }
}


// ==========================================
// --- УМНАЯ ПИПЕТКА (ДЛЯ СКЛАДА НИТЕЙ) ---
// ==========================================
let isStashImageLoadedForCanvas = false;
const stashCanvas = document.getElementById('stash-color-canvas');
const stashCtx = stashCanvas ? stashCanvas.getContext('2d', { willReadFrequently: true }) : null;
const stashMarkersContainer = document.getElementById('stash-markers-container');
const stashColorPicker = document.getElementById('stash-color-picker');

if (stashCanvas) {
    stashCanvas.addEventListener('click', (e) => {
        if (!isStashImageLoadedForCanvas) return;
        const rect = stashCanvas.getBoundingClientRect();
        const x = (e.clientX - rect.left) * (stashCanvas.width / rect.width);
        const y = (e.clientY - rect.top) * (stashCanvas.height / rect.height);
        const pixel = stashCtx.getImageData(x, y, 1, 1).data;
        stashColorPicker.value = rgbToHex(pixel[0], pixel[1], pixel[2]); 
        document.getElementById('stash-color-code').focus();
    });
}

const stashPhotoInput = document.getElementById('stash-photo-for-color');
if (stashPhotoInput) {
    stashPhotoInput.addEventListener('change', (e) => {
        const file = e.target.files[0];
        if(!file) return;
        stashMarkersContainer.innerHTML = ''; 
        const reader = new FileReader();
        reader.onload = (event) => {
            const img = new Image();
            img.onload = () => {
                document.getElementById('stash-canvas-wrapper').style.display = 'block';
                const scale = Math.min(800 / img.width, 1);
                stashCanvas.width = img.width * scale; 
                stashCanvas.height = img.height * scale;
                stashCtx.drawImage(img, 0, 0, stashCanvas.width, stashCanvas.height);
                isStashImageLoadedForCanvas = true;
            }
            img.src = event.target.result;
        };
        reader.readAsDataURL(file);
    });
}

window.autoDetectStashColors = function() {
    if (!isStashImageLoadedForCanvas) return alert("Сначала загрузи фото катушек!");
    stashMarkersContainer.innerHTML = '';
    const step = Math.floor(stashCanvas.width / 20); 
    let detectedColors = [];

    for (let x = step; x < stashCanvas.width; x += step) {
        for (let y = step; y < stashCanvas.height; y += step) {
            if(detectedColors.length >= 12) break;
            
            const pixel = stashCtx.getImageData(x, y, 1, 1).data;
            const r = pixel[0], g = pixel[1], b = pixel[2];
            const brightness = (r * 299 + g * 587 + b * 114) / 1000;
            
            if (brightness > 35 && brightness < 235) {
                let isTooSimilar = false;
                for (let color of detectedColors) {
                    if (Math.sqrt(Math.pow(r - color.r, 2) + Math.pow(g - color.g, 2) + Math.pow(b - color.b, 2)) < 100) { 
                        isTooSimilar = true; 
                        break; 
                    }
                }
                if (!isTooSimilar) {
                    detectedColors.push({r, g, b});
                    createColorMarker(stashMarkersContainer, stashColorPicker, 'stash-color-code', (x / stashCanvas.width) * 100, (y / stashCanvas.height) * 100, rgbToHex(r, g, b));
                }
            }
        }
    }
}

// Утилиты для цветов
function rgbToHex(r, g, b) { 
    return "#" + ((1 << 24) + (r << 16) + (g << 8) + b).toString(16).slice(1); 
}

function createColorMarker(container, inputElement, codeInputId, percentX, percentY, hex) {
    const marker = document.createElement('div');
    marker.className = 'color-marker';
    marker.style.left = `${percentX}%`; 
    marker.style.top = `${percentY}%`;
    marker.style.backgroundColor = hex;
    
    marker.addEventListener('click', () => {
        inputElement.value = hex;
        document.getElementById(codeInputId).focus();
    });
    container.appendChild(marker);
}


// ==========================
// --- БД СКЛАД НИТЕЙ ---
// ==========================
async function loadStashToLocals() {
    allStashThreads = [];
    const q = query(collection(db, "stash"), orderBy("code", "asc"));
    const querySnapshot = await getDocs(q);
    querySnapshot.forEach((doc) => {
        allStashThreads.push({ id: doc.id, hex: doc.data().hex, code: doc.data().code });
    });
}

window.openStashModal = function() {
    // Сброс UI пипетки склада перед открытием
    if (document.getElementById('stash-photo-for-color')) {
        document.getElementById('stash-photo-for-color').value = '';
        const span = document.getElementById('stash-photo-for-color').nextElementSibling;
        if(span) span.innerHTML = `<i class="ph-fill ph-camera"></i> Загрузить фото катушек...`;
    }
    if (document.getElementById('stash-canvas-wrapper')) {
        document.getElementById('stash-canvas-wrapper').style.display = 'none';
    }
    if (document.getElementById('stash-markers-container')) {
        document.getElementById('stash-markers-container').innerHTML = '';
    }
    isStashImageLoadedForCanvas = false;

    window.openModal('stash-modal');
    loadStashToModal();
}

window.addThreadToStash = async function() {
    const hex = document.getElementById('stash-color-picker').value;
    const code = document.getElementById('stash-color-code').value.trim();
    
    if(!code) return alert("Введите код нити!");

    const btn = event.target;
    btn.innerHTML = "<i class='ph-fill ph-spinner-gap ph-spin'></i>";
    
    try {
        await addDoc(collection(db, "stash"), { hex, code, addedAt: new Date() });
        document.getElementById('stash-color-code').value = '';
        await loadStashToLocals();
        loadStashToModal(); 
    } catch (e) { 
        console.error(e); 
    }
    btn.innerHTML = '<i class="ph-bold ph-plus"></i>';
}

async function loadStashToModal() {
    const list = document.getElementById('stash-list');
    document.getElementById('stash-loading').style.display = 'block';
    list.innerHTML = '';
    
    allStashThreads.forEach((thread) => {
        list.innerHTML += `
            <div class="color-badge" onclick="deleteStashThread('${thread.id}')" style="cursor:pointer" title="Удалить со склада">
                <div class="color-circle" style="background:${thread.hex}"></div> ${thread.code}
            </div>
        `;
    });
    
    if(list.innerHTML === '') {
        list.innerHTML = '<p style="color:var(--hk-hot-pink); width:100%; text-align:center; font-weight: 700;">Твой склад пока пуст, красавчик.</p>';
    }
    document.getElementById('stash-loading').style.display = 'none';
}

window.deleteStashThread = async function(id) {
    if(confirm("Удалить нить со склада?")) {
        await deleteDoc(doc(db, "stash", id));
        await loadStashToLocals(); 
        loadStashToModal();
    }
}

// --- ВЫБОР ИЗ СКЛАДА В ФОРМЕ ДИЗАЙНА ---
function fillStashSelect() {
    const select = document.getElementById('stash-select');
    select.innerHTML = '<option value="">Взять со Склада...</option>';
    
    allStashThreads.forEach(thread => {
        select.innerHTML += `<option value="${thread.id}" style="color: black; background-color: ${thread.hex};">${thread.code}</option>`;
    });
}

document.getElementById('stash-select').addEventListener('change', (e) => {
    const thread = allStashThreads.find(t => t.id === e.target.value);
    if (!thread) return;
    
    manualColorInput.value = thread.hex;
    document.getElementById('color-code').value = thread.code;
    e.target.value = ''; 
});

window.addDesignColor = function() {
    const hex = manualColorInput.value;
    const code = document.getElementById('color-code').value.trim() || 'Без кода';
    
    currentColors.push({ hex, code }); 
    renderColors();
    document.getElementById('color-code').value = '';
}

function renderColors() {
    document.getElementById('colors-container').innerHTML = currentColors.map((c, i) => `
        <div class="color-badge" onclick="removeColor(${i})" style="cursor:pointer" title="Удалить">
            <div class="color-circle" style="background:${c.hex}"></div> ${c.code}
        </div>
    `).join('');
}

window.removeColor = function(index) { 
    currentColors.splice(index, 1); 
    renderColors(); 
}

// --- УДАЛЕНИЕ ФАЙЛОВ ИЗ FIREBASE STORAGE ---
async function deleteOldFileFromStorage(pathOrUrl) {
    if (!pathOrUrl) return;
    try { 
        await deleteObject(ref(storage, pathOrUrl)); 
    } catch (error) { 
        if (error.code !== 'storage/object-not-found') console.error(error); 
    }
}

// ==========================
// --- СОХРАНЕНИЕ ПРИНТОВ ---
// ==========================
window.savePrint = async function(event) {
    const coverInput = document.getElementById('cover-image');
    const oldCoverUrl = document.getElementById('cover-file-name').getAttribute('data-url');
    const oldCoverPath = document.getElementById('cover-file-name').getAttribute('data-path');
    
    if (!coverInput.files[0] && !oldCoverUrl) return alert("Загрузи обложку, золотце!");

    const btn = event.target;
    btn.innerHTML = "<i class='ph-fill ph-spinner-gap ph-spin'></i> Творим магию..."; 
    btn.disabled = true;

    try {
        const printId = editingId ? editingId : Date.now().toString();
        let coverUrl = oldCoverUrl;
        let newCoverPath = oldCoverPath;
        
        if (coverInput.files[0]) {
            const coverRef = ref(storage, `covers/${printId}_${coverInput.files[0].name}`);
            await uploadBytesResumable(coverRef, coverInput.files[0]);
            coverUrl = await getDownloadURL(coverRef); 
            newCoverPath = coverRef.fullPath;
            if (editingId && oldCoverPath) await deleteOldFileFromStorage(oldCoverPath);
        }

        const fileRows = document.querySelectorAll('.file-row');
        let filesData = [];
        let newJefPaths = [];
        
        for (let row of fileRows) {
            const jefInput = row.querySelector('.jef-file');
            const spanData = row.querySelector('.file-name');
            const oldUrl = spanData.getAttribute('data-url');
            const oldPath = spanData.getAttribute('data-path');
            const oldName = spanData.getAttribute('data-name');
            
            if (jefInput.files[0]) { 
                const fileRef = ref(storage, `jef_files/${printId}_${jefInput.files[0].name}`);
                await uploadBytesResumable(fileRef, jefInput.files[0]);
                filesData.push({ 
                    hoop: row.querySelector('.hoop-size').value, 
                    size: row.querySelector('.emb-size').value.trim() || 'Не указан', 
                    name: jefInput.files[0].name, 
                    url: await getDownloadURL(fileRef), 
                    path: fileRef.fullPath 
                });
                newJefPaths.push(fileRef.fullPath); 
            } else if (oldUrl) { 
                filesData.push({ 
                    hoop: row.querySelector('.hoop-size').value, 
                    size: row.querySelector('.emb-size').value.trim() || 'Не указан', 
                    name: oldName, 
                    url: oldUrl, 
                    path: oldPath 
                });
                newJefPaths.push(oldPath); 
            }
        }

        if (editingId) {
            for (let oldPath of currentJefFiles) { 
                if (!newJefPaths.includes(oldPath)) await deleteOldFileFromStorage(oldPath); 
            }
        }

        const dataToSave = { 
            coverUrl, 
            coverPath: newCoverPath, 
            colors: currentColors, 
            files: filesData, 
            updatedAt: new Date() 
        };

        if (editingId) {
            await updateDoc(doc(db, "prints", editingId), dataToSave);
        } else { 
            dataToSave.createdAt = new Date(); 
            await addDoc(collection(db, "prints"), dataToSave); 
        }

        window.closeModal('add-modal'); 
        loadPrints(); 
    } catch (error) { 
        console.error(error); 
        alert("Ой, что-то пошло не так!"); 
    } finally { 
        btn.innerHTML = "<i class='ph-fill ph-floppy-disk'></i> Сохранить в базу"; 
        btn.disabled = false; 
    }
}

// ==========================
// --- ЗАГРУЗКА ПРИНТОВ ---
// ==========================
async function loadPrints() {
    const grid = document.getElementById('prints-grid');
    grid.innerHTML = '<p style="grid-column: 1/-1; text-align: center;"><i class="ph-fill ph-spinner-gap ph-spin" style="font-size: 3rem; color: var(--hk-hot-pink);"></i></p>';
    
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
            tile.onclick = () => showViewModal(print.id); 
            tile.innerHTML = `<img src="${print.coverUrl}">`; 
            grid.appendChild(tile);
        });

        if(allPrints.length === 0) {
            grid.innerHTML = '<p style="grid-column: 1/-1; text-align: center; font-size: 1.2rem; font-weight: 800; color: var(--hk-hot-pink);">Тут пока пусто. Добавь первый шедевр!</p>';
        }
    } catch (error) { 
        console.error(error); 
        grid.innerHTML = '<p style="grid-column: 1/-1; color: red;">Ошибка подключения.</p>'; 
    }
}

// ==========================
// --- ПРОСМОТР, УДАЛЕНИЕ, РЕДАКТИРОВАНИЕ ---
// ==========================
window.showViewModal = function(id) {
    const print = allPrints.find(p => p.id === id); 
    if(!print) return;
    
    document.getElementById('view-image').src = print.coverUrl;
    
    document.getElementById('view-colors').innerHTML = (print.colors || []).map(c => 
        `<div class="color-badge"><div class="color-circle" style="background:${c.hex}"></div> ${c.code}</div>`
    ).join(' ');
    
    document.getElementById('view-files').innerHTML = (print.files || []).map(f => 
        `<div class="file-view-item"><div class="file-view-info"><strong>${f.hoop}</strong> <span>Размер: ${f.size}</span></div><a href="${f.url}" target="_blank" download class="btn-download"><i class="ph-fill ph-download-simple"></i> .jef</a></div>`
    ).join('');
    
    document.getElementById('btn-edit-print').onclick = () => editPrint(id);
    document.getElementById('btn-delete-print').onclick = () => deletePrint(id);
    
    window.openModal('view-modal');
}

window.deletePrint = async function(id) {
    if (confirm("Точно удалить этот шедевр?")) {
        const print = allPrints.find(p => p.id === id); 
        if(!print) return;
        
        try {
            if (print.coverPath) await deleteOldFileFromStorage(print.coverPath);
            else if (print.coverUrl) await deleteOldFileFromStorage(print.coverUrl); 
            
            if (print.files) {
                for (let f of print.files) { 
                    if (f.path) await deleteOldFileFromStorage(f.path); 
                    else if (f.url) await deleteOldFileFromStorage(f.url); 
                }
            }
            
            await deleteDoc(doc(db, "prints", id));
            window.closeModal('view-modal'); 
            loadPrints(); 
        } catch (error) { 
            console.error(error); 
            alert("Не удалось удалить."); 
        }
    }
}

window.editPrint = function(id) {
    editingId = id; 
    const print = allPrints.find(p => p.id === id);
    
    document.getElementById('modal-title').innerHTML = "Редактирование <i class='ph-fill ph-pencil-simple'></i>";
    document.getElementById('save-btn').innerHTML = "<i class='ph-fill ph-check-circle'></i> Обновить дизайн";
    
    document.getElementById('cover-file-name').innerHTML = `Оставить старую обложку`;
    document.getElementById('cover-file-name').setAttribute('data-url', print.coverUrl);
    document.getElementById('cover-file-name').setAttribute('data-path', print.coverPath || '');
    
    currentColors = [...(print.colors || [])]; 
    renderColors();
    
    const filesContainer = document.getElementById('files-container');
    filesContainer.innerHTML = ''; 
    currentJefFiles = []; 
    
    (print.files || []).forEach(f => { 
        window.addJefRow(f); 
        if(f.path) currentJefFiles.push(f.path); 
    });

    fillStashSelect(); 
    window.closeModal('view-modal'); 
    window.openModal('add-modal');
}
