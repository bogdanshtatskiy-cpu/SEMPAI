import { initializeApp } from "https://www.gstatic.com/firebasejs/10.8.1/firebase-app.js";
import { getFirestore, collection, addDoc, getDocs, doc, getDoc, updateDoc, deleteDoc } from "https://www.gstatic.com/firebasejs/10.8.1/firebase-firestore.js";
import { getStorage, ref, uploadBytes, getDownloadURL } from "https://www.gstatic.com/firebasejs/10.8.1/firebase-storage.js";

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
let allPrints = []; 
let editingId = null; 

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

if (localStorage.getItem('hk_vault_theme') === 'true') applyTheme(true);

// --- АВТОРИЗАЦИЯ И ШУТКА ---
if (localStorage.getItem('hk_vault_auth') === 'true') {
    document.getElementById('auth-screen').style.display = 'none';
    document.getElementById('app-container').style.display = 'block';
    loadPrints();
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
            alert("Неверный пароль 💅");
        }
    } catch (e) {
        console.error(e);
        alert("Ошибка подключения.");
    }
    btn.innerHTML = "Войти";
}

window.confirmJoke = function() {
    localStorage.setItem('hk_vault_auth', 'true');
    window.closeModal('joke-modal');
    document.getElementById('app-container').style.display = 'block';
    loadPrints(); // МУЗЫКА ВЫРЕЗАНА
}

window.logout = function() {
    localStorage.removeItem('hk_vault_auth');
    location.reload();
}

// --- УПРАВЛЕНИЕ ОКНАМИ ---
window.openModal = (id) => {
    document.getElementById(id).style.display = 'flex';
    document.body.classList.add('no-scroll'); 
};
window.closeModal = (id) => {
    document.getElementById(id).style.display = 'none';
    document.body.classList.remove('no-scroll'); 
};

window.openAddModal = function() {
    editingId = null;
    document.getElementById('modal-title').innerText = "Новый дизайн вышивки";
    document.getElementById('save-btn').innerText = "Сохранить в базу";
    
    currentColors = [];
    renderColors();
    document.getElementById('files-container').innerHTML = '';
    
    document.getElementById('cover-image').value = '';
    document.getElementById('cover-file-name').innerHTML = `<i class="ph ph-image"></i> Выберите изображение...`;
    document.getElementById('cover-file-name').removeAttribute('data-url'); 
    
    // Сброс зоны определения цветов
    document.getElementById('markers-container').innerHTML = '';
    document.getElementById('color-canvas').style.display = 'none';
    
    window.addFileRow(); 
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

window.addFileRow = function(existingData = null) {
    const container = document.getElementById('files-container');
    const row = document.createElement('div');
    row.className = 'file-row';
    const uniqueId = 'jef-' + Date.now() + Math.floor(Math.random() * 1000);
    
    let fileNameHtml = `<i class="ph ph-file-arrow-up"></i> Загрузить .jef`;
    let dataUrlAttr = "";
    if(existingData) {
        fileNameHtml = `<i class="ph ph-file-jef"></i> Старый: ${existingData.name}`;
        dataUrlAttr = `data-url="${existingData.url}" data-name="${existingData.name}"`;
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
        <input type="text" class="emb-size" placeholder="Размер" value="${existingData ? existingData.size : ''}">
        
        <label class="custom-file-upload">
            <input type="file" id="${uniqueId}" class="jef-file" accept=".jef" onchange="updateFileName(this)">
            <span class="file-name" ${dataUrlAttr}>${fileNameHtml}</span>
        </label>
        <button class="btn-danger" style="height:46px" title="Удалить" onclick="this.parentElement.remove()"><i class="ph ph-trash"></i></button>
    `;
    if(existingData) row.querySelector('.hoop-size').value = existingData.hoop;
    container.appendChild(row);
}

// --- === АЛГОРИТМ РАСПОЗНАВАНИЯ ЦВЕТОВ === ---
const canvas = document.getElementById('color-canvas');
const ctx = canvas.getContext('2d', { willReadFrequently: true });
const markersContainer = document.getElementById('markers-container');

document.getElementById('photo-for-color').addEventListener('change', (e) => {
    const file = e.target.files[0];
    if(!file) return;
    
    // Очищаем старые маркеры
    markersContainer.innerHTML = '';
    
    const reader = new FileReader();
    reader.onload = (event) => {
        const img = new Image();
        img.onload = () => {
            canvas.style.display = 'block';
            const maxWidth = canvas.parentElement.clientWidth;
            const scale = Math.min(maxWidth / img.width, 1);
            canvas.width = img.width * scale;
            canvas.height = img.height * scale;
            ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
            
            // Запускаем алгоритм определения цветов
            detectDominantColors(img, scale);
        }
        img.src = event.target.result;
    };
    reader.readAsDataURL(file);
});

async function detectDominantColors(img, scale) {
    // В реальном приложении здесь был бы код кластеризации (K-means).
    // Для простоты и производительности, мы эмулируем выбор доминирующих цветов,
    // просто беря сетку пикселей и фильтруя их по яркости.
    const step = Math.floor(canvas.width / 5); // 5 точек по ширине
    let detectedCount = 0;

    for (let x = step; x < canvas.width; x += step) {
        for (let y = step; y < canvas.height; y += step) {
            if (detectedCount >= 10) break; // Максимум 10 точек

            const pixel = ctx.getImageData(x, y, 1, 1).data;
            const hex = rgbToHex(pixel[0], pixel[1], pixel[2]);
            
            // Фильтруем слишком темные или слишком белые цвета
            const brightness = (pixel[0] * 299 + pixel[1] * 587 + pixel[2] * 114) / 1000;
            if(brightness > 30 && brightness < 220) {
                 createColorMarker(x, y, hex);
                 detectedCount++;
            }
        }
    }
}

function rgbToHex(r, g, b) {
    return "#" + ((1 << 24) + (r << 16) + (g << 8) + b).toString(16).slice(1);
}

function createColorMarker(x, y, hex) {
    const marker = document.createElement('div');
    marker.className = 'color-marker';
    marker.style.left = `${x}px`;
    marker.style.top = `${y + 10}px`; // +10 сдвиг из-за margin-top у канваса
    marker.style.backgroundColor = hex;
    marker.title = `Кликни, чтобы добавить ${hex}`;
    
    // Клик по маркеру открывает поле кода
    marker.addEventListener('click', () => {
        promptForColorCode(hex);
    });
    
    markersContainer.appendChild(marker);
}

function promptForColorCode(hex) {
    const code = prompt(`Введите код нити для цвета ${hex}:`, "");
    if (code !== null) { // Пользователь не нажал "Отмена"
        const finalCode = code.trim() || 'Без кода';
        currentColors.push({ hex, code: finalCode });
        renderColors();
    }
}

// --- ЦВЕТА (РУЧНОЙ ВЫБОР И УДАЛЕНИЕ) ---
window.addColor = function() {
    const hex = document.getElementById('manual-color').value;
    const code = document.getElementById('color-code').value || 'Без кода';
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

// --- СОХРАНЕНИЕ ---
window.savePrint = async function(event) {
    const coverInput = document.getElementById('cover-image');
    const oldCoverUrl = document.getElementById('cover-file-name').getAttribute('data-url');
    
    if (!coverInput.files[0] && !oldCoverUrl) return alert("Загрузи обложку дизайна!");

    const btn = event.target;
    btn.innerHTML = "<i class='ph ph-spinner ph-spin'></i> Сохраняем...";
    btn.disabled = true;

    try {
        const printId = editingId ? editingId : Date.now().toString();
        
        let coverUrl = oldCoverUrl;
        if (coverInput.files[0]) {
            const coverRef = ref(storage, `covers/${printId}_${coverInput.files[0].name}`);
            await uploadBytes(coverRef, coverInput.files[0]);
            coverUrl = await getDownloadURL(coverRef);
        }

        const fileRows = document.querySelectorAll('.file-row');
        let filesData = [];
        
        for (let row of fileRows) {
            const jefInput = row.querySelector('.jef-file');
            const spanData = row.querySelector('.file-name');
            const oldUrl = spanData.getAttribute('data-url');
            const oldName = spanData.getAttribute('data-name');
            
            if (jefInput.files[0]) { 
                const file = jefInput.files[0];
                const fileRef = ref(storage, `jef_files/${printId}_${file.name}`);
                await uploadBytes(fileRef, file);
                const fileUrl = await getDownloadURL(fileRef);
                filesData.push({ hoop: row.querySelector('.hoop-size').value, size: row.querySelector('.emb-size').value || 'Не указан', name: file.name, url: fileUrl });
            } else if (oldUrl) { 
                filesData.push({ hoop: row.querySelector('.hoop-size').value, size: row.querySelector('.emb-size').value || 'Не указан', name: oldName, url: oldUrl });
            }
        }

        const dataToSave = { coverUrl, colors: currentColors, files: filesData, updatedAt: new Date() };

        if (editingId) await updateDoc(doc(db, "prints", editingId), dataToSave);
        else await addDoc(collection(db, "prints"), dataToSave);

        window.closeModal('add-modal');
        loadPrints(); 
    } catch (error) {
        console.error(error);
        alert("Произошла ошибка!");
    } finally {
        btn.innerHTML = "Сохранить в базу";
        btn.disabled = false;
    }
}

// --- ЗАГРУЗКА ---
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
            tile.onclick = () => showViewModal(print.id); 
            tile.innerHTML = `<img src="${print.coverUrl}">`;
            grid.appendChild(tile);
        });

        if(allPrints.length === 0) grid.innerHTML = '<p style="grid-column: 1/-1; text-align: center;">Дизайнов пока нет.</p>';
    } catch (error) {
        console.error(error);
        grid.innerHTML = '<p style="grid-column: 1/-1; color: red;">Ошибка подключения.</p>';
    }
}

// --- ПРОСМОТР, РЕДАКТИРОВАНИЕ, УДАЛЕНИЕ ---
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

window.deletePrint = async function(id) {
    if (confirm("Удалить дизайн? Восстановить будет невозможно.")) {
        try {
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
    
    document.getElementById('modal-title').innerText = "Редактирование дизайна";
    document.getElementById('save-btn').innerText = "Обновить дизайн";
    
    document.getElementById('cover-file-name').innerHTML = `<i class="ph ph-image"></i> Оставить старую обложку`;
    document.getElementById('cover-file-name').setAttribute('data-url', print.coverUrl);
    
    currentColors = [...(print.colors || [])];
    renderColors();
    
    const filesContainer = document.getElementById('files-container');
    filesContainer.innerHTML = '';
    (print.files || []).forEach(f => window.addFileRow(f));

    window.closeModal('view-modal');
    window.openModal('add-modal');
}
