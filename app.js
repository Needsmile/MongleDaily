/**
 * 초등학교 그림일기장 - 프론트엔드 핵심 인프라 구동 스크립트
 */
const SUPABASE_URL = "https://llkgofkkhuictscodsll.supabase.co"; 
const SUPABASE_ANON_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imxsa2dvZmtraHVpY3RzY29kc2xsIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Nzk3OTA0NDIsImV4cCI6MjA5NTM2NjQ0Mn0.DKymADB196pxaqQnrv6HDW7Ek6xItCWqkrAOOI8xT_s"; 

// 런타임 글로벌 인스턴스 초기화
const _supabase = supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

let currentDate = new Date();
let selectedImageData = ""; 
let currentMode = "photo"; 
let diaryDatabase = {}; 
let childName = "몽글이";
let selectedDiaryDate = getFormattedDate(new Date());
let isDirty = false;
let openedModalDate = "";
let autoSaveTimer = null;
let soundEnabled = true;
let communityChannel = null;

const stampSound = new Audio('stamp.mp3');
let canvas, ctx, isDrawing = false;

// 1. 유저 인증 처리 및 세션 폭파 방지
function handleLogin() {
    const name = document.getElementById('username').value.trim();
    if(!name) return alert('이름을 입력해 주세요!');
    childName = name;
    
    // 타 사용자의 캐시 잔존 현상 차단을 위해 데이터 초기화 보장
    diaryDatabase = {};
    saveUserName(name);
    localStorage.setItem('lastLoggedInUser', name); 
    
    document.getElementById('login-section').style.display = 'none';
    const mainApp = document.getElementById('main-app');
    mainApp.style.display = 'flex';
    mainApp.classList.remove('hidden');
    
    selectedDiaryDate = getFormattedDate(new Date());
    initApp();
}

// 2. 어플리케이션 메인 이니셜라이저
async function initApp() {
    setupCanvas();
    const savedSound = localStorage.getItem('soundEnabled');
    if(savedSound !== null) {
        soundEnabled = savedSound === 'true';
    }
    document.getElementById('sound-toggle').innerText = soundEnabled ? '🔊' : '🔇';
    
    // 자동 저장 리스너 디바운싱 바인딩
    document.getElementById('diary-text').addEventListener('input', () => {
        isDirty = true;
        clearTimeout(autoSaveTimer);
        if(document.getElementById('diary-text').value.length > 5) {
            autoSaveTimer = setTimeout(() => { saveDiary(true); }, 3000);
        }
    });

    document.getElementById('weather').addEventListener('change', () => { isDirty = true; });
    await loadDiariesFromServer();
    renderTodayForm();
    renderCalendar();
    calculateStreak();
    setupRealtimeSync(); 
}

// 3. 서버 데이터베이스 동기화 수신 엔진
async function loadDiariesFromServer() {
    try {
        const { data, error } = await _supabase
            .from('diary_entries')
            .select('*')
            .eq('username', childName);
        if (error) throw error;
        
        diaryDatabase = {};
        if(data) {
            data.forEach(item => {
                diaryDatabase[item.diary_date] = {
                    text: item.diary_text,
                    weather: item.weather,
                    image: item.image_data,
                    name: item.username
                };
            });
        }
    } catch (err) {
        console.error("서버 데이터 로드 실패:", err.message);
    }
}

// 4. 실시간 커뮤니티 주파수 동기화 채널 제어
function setupRealtimeSync() {
    if (communityChannel) {
        _supabase.removeChannel(communityChannel);
    }

    communityChannel = _supabase
        .channel('schema-db-changes')
        .on(
            'postgres_changes',
            { event: '*', pattern: 'public', table: 'diary_entries' },
            (payload) => {
                const box = document.getElementById('community-list');
                if (box && !box.classList.contains('hidden')) {
                    fetchCommunityData();
                }
                if (payload.new && payload.new.username === childName) {
                    loadDiariesFromServer().then(() => {
                        renderCalendar();
                        calculateStreak();
                    });
                }
            }
        )
        .subscribe();
}

// 5. 커뮤니티 데이터 정밀 파싱 아키텍처
async function toggleCommunity() {
    const box = document.getElementById('community-list');
    if (!box.classList.contains('hidden')) {
        box.classList.add('hidden');
        return;
    }
    box.classList.remove('hidden');
    await fetchCommunityData();
}

async function fetchCommunityData() {
    const box = document.getElementById('community-list');
    box.innerHTML = "<div class='text-center p-2 text-gray-400 font-bold animate-pulse'>⚡ 실시간 전송 주파수 수신 중...</div>";
    
    const { data, error } = await _supabase
        .from('diary_entries')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(20);
        
    if (error) {
        box.innerHTML = "<div class='text-red-500 font-bold text-center'>불러오기 실패</div>";
        return;
    }

    box.innerHTML = "";
    if(data.length === 0) {
        box.innerHTML = "<div class='text-gray-400 text-center py-4'>아직 작성된 친구들 일기가 없어요.</div>";
        return;
    }

    data.forEach(item => {
        const div = document.createElement('div');
        div.className = "border-b border-amber-200 pb-2 last:border-0 hover:bg-amber-50 p-1 rounded transition-colors";
        
        let timeString = "방학 중";
        if(item.created_at) {
            const d = new Date(item.created_at);
            const yyyy = d.getFullYear();
            const mm = String(d.getMonth() + 1).padStart(2, '0');
            const dd = String(d.getDate()).padStart(2, '0');
            const hh = String(d.getHours()).padStart(2, '0');
            const min = String(d.getMinutes()).padStart(2, '0');
            const ss = String(d.getSeconds()).padStart(2, '0');
            timeString = `${yyyy}-${mm}-${dd} ${hh}:${min}:${ss}`;
        }

        div.innerHTML = `
            <div class="flex justify-between items-center">
                <span class="font-bold text-amber-900 text-base">🧒 ${item.username}</span>
                <span class="text-[11px] text-amber-700 bg-amber-100 px-1.5 py-0.5 rounded font-mono">${timeString}</span>
            </div>
            <div class="text-xs text-gray-500 mt-0.5 font-bold">📅 작성일기 지정일: ${item.diary_date} ${item.weather || ''}</div>
            <div class="mt-1 text-amber-950 text-sm font-semibold whitespace-pre-wrap break-all line-clamp-3">${item.diary_text || "그림만 그렸어요 🎨"}</div>
        `;
        box.appendChild(div);
    });
}

// 6. 업로드 모드 스위처
function switchUploadMethod(mode) {
    currentMode = mode;
    const photoTab = document.getElementById('tab-photo-btn');
    const drawTab = document.getElementById('tab-draw-btn');
    const photoContainer = document.getElementById('photo-upload-container');
    const drawContainer = document.getElementById('drawing-board-container');
    const activeClass = "w-1/2 py-2 bg-amber-200 text-black font-bold transition-colors";
    const inactiveClass = "w-1/2 py-2 bg-amber-50 text-gray-500 font-bold transition-colors";
    
    if(mode === 'photo') {
        photoTab.className = activeClass;
        drawTab.className = inactiveClass;
        photoContainer.classList.remove('hidden');
        drawContainer.classList.add('hidden');
    } else {
        drawTab.className = activeClass;
        photoTab.className = inactiveClass;
        drawContainer.classList.remove('hidden');
        photoContainer.classList.add('hidden');
        resizeCanvas();
    }
}

// 7. 스케치 패드(Canvas) 드로잉 컨트롤러
function setupCanvas() {
    canvas = document.getElementById('paintCanvas');
    ctx = canvas.getContext('2d');
    
    canvas.addEventListener('mousedown', startDrawing);
    canvas.addEventListener('mousemove', draw);
    canvas.addEventListener('mouseup', stopDrawing);
    canvas.addEventListener('mouseout', stopDrawing);

    canvas.addEventListener('touchstart', startDrawingTouch);
    canvas.addEventListener('touchmove', drawTouch);
    canvas.addEventListener('touchend', stopDrawing);
}

function resizeCanvas() {
    canvas.width = canvas.parentElement.clientWidth;
    canvas.height = canvas.parentElement.clientHeight - 34;
    ctx.fillStyle = "#ffffff";
    ctx.fillRect(0, 0, canvas.width, canvas.height);
}

function clearCanvas() {
    ctx.fillStyle = "#ffffff";
    ctx.fillRect(0, 0, canvas.width, canvas.height);
}

function startDrawing(e) {
    isDrawing = true;
    ctx.beginPath();
    ctx.moveTo(e.offsetX, e.offsetY);
}

function draw(e) {
    if (!isDrawing) return;
    ctx.lineWidth = document.getElementById('brush-size').value;
    ctx.lineCap = 'round';
    ctx.strokeStyle = document.getElementById('brush-color').value;
    ctx.lineTo(e.offsetX, e.offsetY);
    ctx.stroke();
}

function startDrawingTouch(e) {
    isDrawing = true;
    const touch = e.touches[0];
    const rect = canvas.getBoundingClientRect();
    ctx.beginPath();
    ctx.moveTo(touch.clientX - rect.left, touch.clientY - rect.top);
    e.preventDefault();
}

// 모바일 웹 터치 이벤트 강제 매핑 우회 엔진
function drawTouch(e) {
    if (!isDrawing) return;
    const touch = e.touches[0];
    const rect = canvas.getBoundingClientRect();
    ctx.lineWidth = document.getElementById('brush-size').value;
    ctx.lineCap = 'round';
    ctx.strokeStyle = document.getElementById('brush-color').value;
    ctx.lineTo(touch.clientX - rect.left, touch.clientY - rect.top);
    ctx.stroke();
    e.preventDefault();
}

function stopDrawing() { isDrawing = false; }

// 8. 모바일 고해상도 리사이징 및 Base64 가공 엔진
function previewImage(event) {
    const file = event.target.files[0];
    if (file) {
        const reader = new FileReader();
        reader.onload = function(e) {
            const img = new Image();
            img.src = e.target.result;
            img.onload = function() {
                const compCanvas = document.createElement('canvas');
                const compCtx = compCanvas.getContext('2d');
                const max_width = 500; 
                const scale = max_width / img.width;
                compCanvas.width = max_width;
                compCanvas.height = img.height * scale;
                compCtx.drawImage(img, 0, 0, compCanvas.width, compCanvas.height);
                
                selectedImageData = compCanvas.toDataURL('image/jpeg', 0.7); 
                showFinalPreview(selectedImageData);
            }
        }
        reader.readAsDataURL(file);
    }
}

function showFinalPreview(dataUrl) {
    const preview = document.getElementById('image-preview');
    preview.src = dataUrl;
    preview.classList.remove('hidden');
    document.getElementById('reset-media-btn').classList.remove('hidden');
}

function resetMediaSelection() {
    selectedImageData = "";
    document.getElementById('image-preview').classList.add('hidden');
    document.getElementById('reset-media-btn').classList.add('hidden');
    document.getElementById('image-input').value = "";
    if (canvas) clearCanvas();
}

// ★ [완벽 복구] 스코프 안전성 확보 및 한글 인코딩 에러를 해결한 핵심 저장 엔진
async function saveDiary(silent = false) {
    let imageUrl = "";
    let fileName = ""; 
    
    const dateStr = selectedDiaryDate;
    const text = document.getElementById('diary-text').value;
    const weather = document.getElementById('weather').value;

    if(currentMode === 'draw' && !selectedImageData) {
        const thumbCanvas = document.createElement('canvas');
        const thumbCtx = thumbCanvas.getContext('2d');
        thumbCanvas.width = 300;
        thumbCanvas.height = (300 / canvas.width) * canvas.height;
        thumbCtx.drawImage(canvas, 0, 0, thumbCanvas.width, thumbCanvas.height);
        selectedImageData = thumbCanvas.toDataURL('image/jpeg', 0.5);
    }

    if(!text && !selectedImageData) {
        if(!silent) alert('내용이나 그림을 작성해 주세요!');
        return;
    }

    try {
        if (selectedImageData && selectedImageData.startsWith('data:')) {
            // 한글 유저명을 순수 문자열 토큰으로 분리 치환
            const safeName = childName.replace(/[^a-zA-Z0-9]/g, "");
            fileName = `diary_${safeName}_${Date.now()}.jpg`;

            const base64Data = selectedImageData.split(',')[1];
            const byteCharacters = atob(base64Data);
            const byteNumbers = new Array(byteCharacters.length);
            for (let i = 0; i < byteCharacters.length; i++) {
                byteNumbers[i] = byteCharacters.charCodeAt(i);
            }
            const byteArray = new Uint8Array(byteNumbers);
            const blob = new Blob([byteArray], { type: 'image/jpeg' });

            const { error: uploadError } = await _supabase.storage
                .from('Mongle_Daily')
                .upload(fileName, blob, { contentType: 'image/jpeg', upsert: true });
            if(uploadError) throw uploadError;

            const { data: publicUrlData } = _supabase.storage
                .from('Mongle_Daily')
                .getPublicUrl(fileName);
            imageUrl = publicUrlData.publicUrl;
            
        } else if (selectedImageData) {
            imageUrl = selectedImageData;
        }

        const { error } = await _supabase
            .from('diary_entries')
            .upsert({
                diary_date: dateStr,
                username: childName, 
                weather: weather,
                diary_text: text,
                image_data: imageUrl
            }, { onConflict: 'username,diary_date' });
        if (error) throw error;

        diaryDatabase[dateStr] = {
            text: text,
            weather: weather,
            image: imageUrl,
            name: childName
        };

        if(!silent) {
            if(soundEnabled) {
                stampSound.currentTime = 0;
                stampSound.play().catch(() => {});
            }
            alert('💮 일기를 잘 썼어요!');
        }
        
        await loadDiariesFromServer();
        renderTodayForm();
        renderCalendar();
        calculateStreak();
        
    } catch(err) {
        console.error("저장 에러 상세:", err);
        alert('🚨 서버 전송 중 에러가 발생했습니다: ' + err.message);
    }
}

// 9. UI 렌더링 매핑 모듈
function renderTodayForm() {
    const selected = new Date(selectedDiaryDate);
    const weekdays = ["일요일", "월요일", "화요일", "수요일", "목요일", "금요일", "토요일"];

    document.getElementById('current-date-display').innerText = `${selectedDiaryDate} (${weekdays[selected.getDay()]})`;

    const data = diaryDatabase[selectedDiaryDate];
    document.getElementById('diary-text').value = "";
    document.getElementById('weather').value = "☀️";
    resetMediaSelection();

    if(data) {
        document.getElementById('diary-text').value = data.text || "";
        document.getElementById('weather').value = data.weather || "☀️";
        if(data.image) {
            selectedImageData = data.image;
            showFinalPreview(selectedImageData);
        }
    }
    isDirty = false;
}

function renderCalendar() {
    const year = currentDate.getFullYear();
    const month = currentDate.getMonth();

    document.getElementById('calendar-month-year').innerText = `${year}년 ${month + 1}월 방학 검사표`;

    const firstDayIndex = new Date(year, month, 1).getDay();
    const lastDay = new Date(year, month + 1, 0).getDate();
    const calendarDays = document.getElementById('calendar-days');
    calendarDays.innerHTML = "";
    
    for (let i = 0; i < firstDayIndex; i++) {
        calendarDays.appendChild(document.createElement('div'));
    }

    for (let day = 1; day <= lastDay; day++) {
        const dayDiv = document.createElement('div');
        const currentKey = `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;

        const today = new Date();
        today.setHours(0, 0, 0, 0);
        const targetDate = new Date(year, month, day);
        const isFutureDate = targetDate > today;

        dayDiv.style.border = "2px dashed #8b5a2b";
        dayDiv.style.borderRadius = "0.5rem";
        dayDiv.style.padding = "0.25rem";
        dayDiv.style.height = "4.8rem";
        dayDiv.style.position = "relative";
        dayDiv.style.overflow = "hidden";
        dayDiv.style.display = "flex";
        dayDiv.style.flexDirection = "column";
        dayDiv.style.justifyContent = "space-between";
        dayDiv.style.cursor = "pointer";
        dayDiv.style.backgroundColor = "#ffffff";
        
        if (diaryDatabase[currentKey] && diaryDatabase[currentKey].image) {
            dayDiv.style.backgroundImage = `url(${diaryDatabase[currentKey].image})`;
            dayDiv.style.backgroundSize = 'cover';
            dayDiv.style.backgroundPosition = 'center';
            dayDiv.style.boxShadow = "inset 0 0 0 2000px rgba(255,255,255,0.5)";
        }

        const dayNum = document.createElement('span');
        dayNum.innerText = day;
        dayNum.style.fontWeight = "bold";
        dayNum.style.fontSize = "1.25rem";

        const dayOfWeek = new Date(year, month, day).getDay();
        if (dayOfWeek === 0) dayNum.style.color = "#ef4444";
        if (dayOfWeek === 6) dayNum.style.color = "#3b82f6";

        dayDiv.appendChild(dayNum);
        
        if (isFutureDate) {
            dayDiv.style.opacity = "0.35";
            dayDiv.style.cursor = "not-allowed";
            dayDiv.style.backgroundColor = "#e5e7eb";
            dayDiv.style.filter = "grayscale(0.5)";

            const lock = document.createElement('div');
            lock.innerText = "🔒";
            lock.style.position = "absolute";
            lock.style.bottom = "2px";
            lock.style.right = "4px";
            lock.style.fontSize = "14px";
            dayDiv.appendChild(lock);
            dayDiv.onclick = () => { alert("📅 미래 날짜의 일기는 아직 쓸 수 없어요!"); };
        }
        else if (diaryDatabase[currentKey]) {
            const prevDate = new Date(year, month, day);
            prevDate.setDate(prevDate.getDate() - 1);
            const prevKey = getFormattedDate(prevDate);

            if (diaryDatabase[prevKey]) {
                const line = document.createElement('div');
                line.style.position = "absolute";
                line.style.left = "-8px";
                line.style.top = "50%";
                line.style.width = "16px";
                line.style.height = "4px";
                line.style.background = "#ef4444";
                dayDiv.appendChild(line);
            }

            const icon = document.createElement('span');
            icon.innerText = "💮";
            icon.style.alignSelf = "flex-end";
            icon.style.fontSize = "1.25rem";
            dayDiv.appendChild(icon);

            dayDiv.onclick = () => { openModal(currentKey); };
        }
        else {
            dayDiv.onclick = () => { selectDiaryDate(currentKey); };
        }

        calendarDays.appendChild(dayDiv);
    }
}

function changeMonth(direction) {
    currentDate.setMonth(currentDate.getMonth() + direction);
    renderCalendar();
}

// 10. 도장 상세 보기 모달 윈도우 조작 핸들러
function openModal(key) {
    openedModalDate = key;
    const data = diaryDatabase[key];
    document.getElementById('modal-date').innerText = `📅 검사일: ${key} (${data.name || '어린이'})`;
    document.getElementById('modal-weather').innerText = `날씨: ${data.weather}`;
    document.getElementById('modal-text').innerText = data.text || "";
    
    const mImg = document.getElementById('modal-image');
    if(data.image) {
        mImg.src = data.image;
        mImg.style.display = 'block';
    } else {
        mImg.style.display = 'none';
    }
    document.getElementById('diary-modal').style.display = 'flex';
}

function closeModal() {
    document.getElementById('diary-modal').style.display = 'none';
}

function getFormattedDate(date) {
    const y = date.getFullYear();
    const m = String(date.getMonth() + 1).padStart(2, '0');
    const d = String(date.getDate()).padStart(2, '0');
    return `${y}-${m}-${d}`;
}

async function selectDiaryDate(newDate) {
    if(isDirty) {
        const shouldSave = confirm("입력중인 일기를 저장할까요?");
        if(shouldSave) { await saveDiary(true); }
    }
    selectedDiaryDate = newDate;
    renderTodayForm();

    const diaryInput = document.getElementById('diary-text');
    diaryInput.focus();
    setTimeout(() => {
        diaryInput.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }, 100);
}

// 11. 일기장 레코드 삭제 트랜잭션
async function deleteDiary() {
    if(!confirm('정말 이 일기를 삭제할까요?')) return;
    try {
        const { error } = await _supabase
            .from('diary_entries')
            .delete()
            .eq('diary_date', openedModalDate)
            .eq('username', childName);

        if(error) throw error;

        delete diaryDatabase[openedModalDate];
        closeModal();
        renderCalendar();
        if(selectedDiaryDate === openedModalDate) {
            renderTodayForm();
        }
        alert('🗑️ 일기가 삭제되었습니다.');
    } catch(err) {
        alert('삭제 실패: ' + err.message);
    }
}

// 12. 세션 데이터 정리 및 복구
async function goToHome() {
    if (isDirty) {
        const shouldSave = confirm("작성중인 일기를 저장할까요?");
        if (shouldSave) { await saveDiary(true); }
    }

    const confirmMove = confirm("첫 화면으로 돌아갈까요?");
    if (!confirmMove) return;

    if(communityChannel) {
        _supabase.removeChannel(communityChannel);
        communityChannel = null;
    }

    document.getElementById('main-app').style.display = 'none';
    document.getElementById('login-section').style.display = 'block';
    renderUserList();
}

function saveUserName(name) {
    let users = JSON.parse(localStorage.getItem('diaryUsers') || '[]');
    if (!users.includes(name)) { users.unshift(name); }
    users = users.slice(0, 5);
    localStorage.setItem('diaryUsers', JSON.stringify(users));
    renderUserList();
}

function renderUserList() {
    const container = document.getElementById('recent-users');
    if (!container) return;

    const users = JSON.parse(localStorage.getItem('diaryUsers') || '[]');
    container.innerHTML = "";
    users.forEach(user => {
        const btn = document.createElement('button');
        btn.innerText = `🧒 ${user}`;
        btn.className = "px-3 py-1 bg-amber-100 hover:bg-amber-200 rounded-lg border border-amber-700 text-lg font-bold";
        btn.onclick = () => {
            document.getElementById('username').value = user;
            handleLogin();
        };
        container.appendChild(btn);
    });
}

async function editDiary() {
    closeModal();
    await selectDiaryDate(openedModalDate);
    document.getElementById('diary-text').focus();
}

// 13. 잔디심기 연속 작성 스트릭 연산 로직
function calculateStreak() {
    const keys = Object.keys(diaryDatabase).sort();
    let streak = 0;
    let today = new Date();
    today.setHours(0,0,0,0);
    for(let i = 0; i < 365; i++) {
        const checkDate = new Date(today);
        checkDate.setDate(today.getDate() - i);
        const key = getFormattedDate(checkDate);

        if(keys.includes(key)) { streak++; } 
        else { break; }
    }
    document.getElementById('streak-box').innerText = `💮 ${streak}일 연속 그림일기 작성중!`;
}

function toggleSound() {
    soundEnabled = !soundEnabled;
    localStorage.setItem('soundEnabled', soundEnabled);
    document.getElementById('sound-toggle').innerText = soundEnabled ? '🔊' : '🔇';
}

// 14. 유튜브 오디오 우회 스트리밍 엔진 컨트롤러
let bgmOn = false;
function toggleYouTubeBGM() {
    const iframe = document.getElementById('youtube-player');
    const btn = document.getElementById('bgm-btn');
    const rawUrl = "https://youtu.be/KEu5YL1VzEg?si=gNZ5AYJziHbA6tJi&t=15";
    let videoId = "KEu5YL1VzEg"; 
    
    if(rawUrl.includes("youtu.be/")) {
        videoId = rawUrl.split("youtu.be/")[1].split("?")[0];
    }

    if(!bgmOn) {
        iframe.src = `https://www.youtube.com/embed/${videoId}?autoplay=1&loop=1&playlist=${videoId}&playsinline=1&enablejsapi=1`;
        bgmOn = true;
        btn.innerText = "⏸ 음악 끄기";
        btn.classList.replace('bg-red-500', 'bg-gray-600');
    } else {
        iframe.src = "";
        bgmOn = false;
        btn.innerText = "🎵 음악 재생";
        btn.classList.replace('bg-gray-600', 'bg-red-500');
    }
}

// DOM 인프라 구축 후 자동 복구 세션 웜업 가동
document.addEventListener("DOMContentLoaded", () => {
    renderUserList();
    const autoUser = localStorage.getItem('lastLoggedInUser');
    if (autoUser) {
        document.getElementById('username').value = autoUser;
    }
});
