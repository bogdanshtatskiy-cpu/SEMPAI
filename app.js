// Пароль для входа (базовая защита UI)
const SECRET_PASS = "1234"; // ПОМЕНЯЙ ЭТОТ ПАРОЛЬ

// Данные (В будущем будут загружаться из Firebase)
let printsDB = [];
let currentColors = [];

function checkPassword() {
    const input = document.getElementById('secret-password').value;
    if(input === SECRET_PASS) {
        document.getElementById('auth-screen').style.display = 'none';
        document.getElementById('app-container').style.display = 'block';
        renderPrints();
    } else {
        alert("Неверный пароль, сладкий 💅");
    }
}

function openModal(id) { document.getElementById(id).style.display = 'flex'; }
function closeModal(id) { document.getElementById(id).style.display = 'none'; }
function openAddModal() {
    currentColors = []; // сброс цветов
    document.getElementById('colors-container').innerHTML = '';
    document.getElementById('files-container').innerHTML = '';
    addFileRow(); // Добавляем первую пустую строку
    openModal('add-modal');
}

// Добавление строки: Размер пялец | Размер вышивки | Кнопка файла
function addFileRow() {
    const container = document.getElementById('files-container');
    const row = document.createElement('div');
    row.className = 'file-row';
    row.innerHTML = `
        <select class="hoop-size">
            <option value="HH10b (100*90)">HH10b (100*90)</option>
            <option value="RE10b (100*40)">RE10b (100*40)</option>
            <option value="RE20b (140*200)">RE20b (140*200)</option>
            <option value="RE28b (200*280)">RE28b (200*280)</option>
            <option value="RE36b (200*360)">RE36b (200*360)</option>
            <option value="SQ14b (140*140)">SQ14b (140*140)</option>
            <option value="SQ20b (200*200)">SQ20b (200*200)</option>
        </select>
        <input type="text" class="emb-size" placeholder="Размер (напр. 10см*12см)">
        <input type="file" class="jef-file" accept=".jef" style="font-size: 0.8rem;">
        <button class="btn-primary" style="padding: 10px;" onclick="this.parentElement.remove()"><i class="ph ph-trash"></i></button>
    `;
    container.appendChild(row);
}

// --- МАГИЯ ПИПЕТКИ С ФОТО ---
const photoInput = document.getElementById('photo-for-color');
const canvas = document.getElementById('color-canvas');
const ctx = canvas.getContext('2d');
const colorPreview = document.getElementById('picked-color-preview');
const manualColorInput = document.getElementById('manual-color');

photoInput.addEventListener('change', (e) => {
    const file = e.target.files[0];
    if(!file) return;
    const reader = new FileReader();
    reader.onload = (event) => {
        const img = new Image();
        img.onload = () => {
            canvas.style.display = 'block';
            // Подгоняем размер канваса, чтобы не был огромным
            const maxWidth = 400;
            const scale = Math.min(maxWidth / img.width, 1);
            canvas.width = img.width * scale;
            canvas.height = img.height * scale;
            ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
        }
        img.src = event.target.result;
    };
    reader.readAsDataURL(file);
});

// Клик по фото для выбора цвета
canvas.addEventListener('click', (e) => {
    const rect = canvas.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    const pixel = ctx.getImageData(x, y, 1, 1).data;
    // Конвертируем rgb в hex
    const hex = "#" + ("000000" + rgbToHex(pixel[0], pixel[1], pixel[2])).slice(-6);
    manualColorInput.value = hex;
    colorPreview.style.backgroundColor = hex;
});

function rgbToHex(r, g, b) {
    if (r > 255 || g > 255 || b > 255) throw "Invalid color component";
    return ((r << 16) | (g << 8) | b).toString(16);
}

function addColor() {
    const hex = manualColorInput.value;
    const code = document.getElementById('color-code').value || 'Без кода';
    currentColors.push({ hex, code });
    
    const badge = document.createElement('div');
    badge.className = 'color-badge';
    badge.innerHTML = `<div class="color-circle" style="background:${hex}"></div> ${code}`;
    document.getElementById('colors-container').appendChild(badge);
    document.getElementById('color-code').value = '';
}

// --- СОХРАНЕНИЕ И ОТОБРАЖЕНИЕ ---
function savePrint() {
    // В реальном приложении здесь будет загрузка файлов в Firebase Storage
    const printId = Date.now();
    
    // Собираем данные файлов
    const fileRows = document.querySelectorAll('.file-row');
    let filesData = [];
    fileRows.forEach(row => {
        filesData.push({
            hoop: row.querySelector('.hoop-size').value,
            size: row.querySelector('.emb-size').value || 'Не указан',
            fileName: row.querySelector('.jef-file').files[0]?.name || 'Файл не прикреплен'
        });
    });

    const newPrint = {
        id: printId,
        img: 'https://images.unsplash.com/photo-1584824486516-0555a07fc511?w=500', // Временно заглушка картинки
        colors: [...currentColors],
        files: filesData
    };

    printsDB.push(newPrint);
    closeModal('add-modal');
    renderPrints();
}

function renderPrints() {
    const grid = document.getElementById('prints-grid');
    grid.innerHTML = '';
    printsDB.forEach(print => {
        const tile = document.createElement('div');
        tile.className = 'print-tile glass-panel';
        tile.onclick = () => viewPrint(print.id);
        
        tile.innerHTML = `
            <img src="${print.img}" alt="Print">
            <div class="tile-overlay">
                <div>Цветов: ${print.colors.length}</div>
                <div style="font-size: 0.8em; margin-top: 5px;">Размеров: ${print.files.length}</div>
            </div>
        `;
        grid.appendChild(tile);
    });
}

function viewPrint(id) {
    const print = printsDB.find(p => p.id === id);
    if(!print) return;

    document.getElementById('view-image').src = print.img;
    
    const colorsDiv = document.getElementById('view-colors');
    colorsDiv.innerHTML = print.colors.map(c => 
        `<div class="color-badge"><div class="color-circle" style="background:${c.hex}"></div> ${c.code}</div>`
    ).join(' ');

    const filesDiv = document.getElementById('view-files');
    filesDiv.innerHTML = print.files.map(f => `
        <div class="view-row">
            <div><b>${f.hoop}</b> (${f.size})</div>
            <button class="btn-rainbow"><i class="ph ph-download-simple"></i> .jef</button>
        </div>
    `).join('');

    openModal('view-modal');
}
