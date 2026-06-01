let currentYear, currentMonth;
let uploadMethod = 'photo'; 
let isDrawing = false;
let canvas, ctx;

function initApp() {
    const targetDateDisp = document.getElementById('current-date-display');
    if(targetDateDisp) targetDateDisp.innerText = selectedDiaryDate;

    const today = new Date(selectedDiaryDate);
    currentYear = today.getFullYear();
    currentMonth = today.getMonth();

    initCanvas();
    renderCalendar();
}

// 직접 그리기용 캔버스 초기화 연출
function initCanvas() {
    canvas = document.getElementById('paintCanvas');
    if(!canvas) return;
    ctx = canvas.getContext('2d');
    
    canvas.width = canvas.parentElement.clientWidth;
    canvas.height = canvas.parentElement.clientHeight - 40;

    // 마우스 및 터치 드로잉 액션 바인딩
    canvas.addEventListener('mousedown', () => isDrawing = true);
    canvas.addEventListener('mousemove', draw);
    canvas.addEventListener('mouseup', () => { isDrawing = false; ctx.beginPath(); });
    canvas.addEventListener('touchstart', (e) => { isDrawing = true; draw(e); });
    canvas.addEventListener('touchend', () => { isDrawing = false; ctx.beginPath(); });
    canvas.addEventListener('touchmove', draw);
}

function draw(e) {
    if (!isDrawing) return;
    e.preventDefault();
    const color = document.getElementById('brush-color').value;
    const size = document.getElementById('brush-size').value;

    ctx.lineWidth = size;
    ctx.lineCap = 'round';
    ctx.strokeStyle = color;

    const rect = canvas.getBoundingClientRect();
    const clientX = e.touches ? e.touches[0].clientX : e.clientX;
    const clientY = e.touches ? e.touches[0].clientY : e.clientY;

    ctx.lineTo(clientX - rect.left, clientY - rect.top);
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(clientX - rect.left, clientY - rect.top);

    // 캔버스 상태를 미리보기 이미지에 강제 복사 반영
    const preview = document.getElementById('image-preview');
    preview.src = canvas.toDataURL();
}

function clearCanvas() {
    if(!ctx) return;
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    document.getElementById('image-preview').src = "";
}

function switchUploadMethod(method) {
    uploadMethod = method;
    const photoContainer = document.getElementById('photo-upload-container');
    const drawContainer = document.getElementById('drawing-board-container');
    
    if(method === 'photo') {
        photoContainer.classList.remove('hidden');
        drawContainer.classList.add('hidden');
    } else {
        photoContainer.classList.add('hidden');
        drawContainer.classList.remove('hidden');
        initCanvas();
    }
}

function previewImage(event) {
    const file = event.target.files[0];
    if (file) {
        const reader = new FileReader();
        reader.onload = function(e) {
            const preview = document.getElementById('image-preview');
            preview.src = e.target.result;
            preview.classList.remove('hidden');
            document.getElementById('reset-media-btn').classList.remove('hidden');
        }
        reader.readAsDataURL(file);
    }
}

function resetMediaSelection() {
    document.getElementById('image-input').value = "";
    document.getElementById('image-preview').classList.add('hidden');
    document.getElementById('reset-media-btn').classList.add('hidden');
    clearCanvas();
}

// 참 잘했어요 도장 찍기 DB 적재 함수
async function saveDiary() {
    const text = document.getElementById('diary-text').value.trim();
    const weather = document.getElementById('weather').value;
    const previewSrc = document.getElementById('image-preview').src;
    
    let uploadedUrl = null;

    if(!text && !previewSrc) return alert('내용을 작성하거나 그림을 완성해주세요! ✏️');

    try {
        if(previewSrc && previewSrc.startsWith('data:image')) {
            const fileName = `${currentUserUid}/${Date.now()}.png`;
            const blob = await (await fetch(previewSrc)).blob();
            const { error: uploadErr } = await _supabase.storage.from('Mongle_Daily').upload(fileName, blob, { contentType: 'image/png' });
            if(uploadErr) throw uploadErr;
            uploadedUrl = _supabase.storage.from('Mongle_Daily').getPublicUrl(fileName).data.publicUrl;
        }

        const { error } = await _supabase.from('diary_entries').upsert({
            user_id: currentUserUid, diary_date: selectedDiaryDate, weather, diary_text: text, image_url: uploadedUrl, username: childName
        }, { onConflict: 'user_id,diary_date' });

        if(error) throw error;
        alert('💮 참 잘했어요! 도장이 찍혔습니다.');
        renderCalendar();
    } catch(err) {
        alert('저장 실패: ' + err.message);
    }
}

// 도장판 달력 구현
function renderCalendar() {
    const grid = document.getElementById('calendar-days');
    if(!grid) return;
    grid.innerHTML = "";
    document.getElementById('calendar-month-year').innerText = `${currentYear}년 ${currentMonth + 1}월 월간 도장표`;

    const lastDate = new Date(currentYear, currentMonth + 1, 0).getDate();
    for (let d = 1; d <= lastDate; d++) {
        const dayBox = document.createElement('div');
        dayBox.className = "p-3 border-2 border-amber-800 bg-white bg-opacity-70 rounded-xl font-bold text-center aspect-square flex items-center justify-center cursor-pointer hover:bg-amber-200 transition-colors";
        dayBox.innerText = d;
        dayBox.onclick = () => {
            const targetDateStr = `${currentYear}-${String(currentMonth + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
            openDiaryModal(targetDateStr);
        };
        grid.appendChild(dayBox);
    }
}

function changeMonth(dir) {
    currentMonth += dir;
    if(currentMonth < 0) { currentMonth = 11; currentYear--; }
    if(currentMonth > 11) { currentMonth = 0; currentYear++; }
    renderCalendar();
}

// 모달 상세보기 처리
async function openDiaryModal(dateStr) {
    const { data, error } = await _supabase.from('diary_entries').select('*').eq('user_id', currentUserUid).eq('diary_date', dateStr).maybeSingle();
    
    document.getElementById('modal-date').innerText = dateStr;
    const modal = document.getElementById('diary-modal');
    modal.classList.replace('hidden', 'flex');

    if(data) {
        document.getElementById('modal-weather').innerText = data.weather || "☀️";
        document.getElementById('modal-text').innerText = data.diary_text || "내용이 없습니다.";
        const img = document.getElementById('modal-image');
        if(data.image_url) { img.src = data.image_url; img.classList.remove('hidden'); }
        else { img.classList.add('hidden'); }
    } else {
        document.getElementById('modal-weather').innerText = "☀️";
        document.getElementById('modal-text').innerText = "이날은 일기를 쓰지 않았어요. ✏️";
        document.getElementById('modal-image').classList.add('hidden');
    }
}

function closeModal() {
    document.getElementById('diary-modal').classList.replace('flex', 'hidden');
}

// 커뮤니티 토글 기본 정의
function toggleCommunity() {
    const list = document.getElementById('community-list');
    list.classList.toggle('hidden');
}

// 유튜브 BGM 컨트롤
let bgmOn = false;
function toggleYouTubeBGM() {
    const iframe = document.getElementById('youtube-player');
    const btn = document.getElementById('bgm-btn');
    if(!bgmOn) {
        iframe.src = "https://www.youtube.com/embed/KEu5YL1VzEg?autoplay=1&loop=1&playlist=KEu5YL1VzEg";
        bgmOn = true;
        btn.innerText = "⏸ 음악 끄기";
    } else {
        iframe.src = "";
        bgmOn = false;
        btn.innerText = "🎵 음악 재생";
    }
}
