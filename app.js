let currentYear, currentMonth;
let selectedImageData = null;
const savedDiaries = {};

// 앱 최초 로그인 성공 후 구동 함수
function initApp() {
    document.getElementById('current-user-display').innerText = `🧑‍🎨 작성자: ${childName}`;
    
    const today = new Date();
    document.getElementById('diary-date').value = today.toISOString().split('T')[0];
    
    currentYear = today.getFullYear();
    currentMonth = today.getMonth();
    
    setupImageUpload();
    renderCalendar();
}

// 이미지 파일 선택 업로드 연출 세팅
function setupImageUpload() {
    const imageInput = document.getElementById('image-input');
    if(!imageInput) return;

    imageInput.addEventListener('change', function(e) {
        const file = e.target.files[0];
        if (file) {
            const reader = new FileReader();
            reader.onload = function(event) {
                selectedImageData = event.target.result;
                const imgNode = document.getElementById('diary-image');
                imgNode.src = selectedImageData;
                imgNode.classList.remove('hidden');
                document.getElementById('image-placeholder').classList.add('hidden');
                document.getElementById('remove-img-btn').classList.remove('hidden');
            };
            reader.readAsDataURL(file);
        }
    });
}

function removeImage(event) {
    if(event) event.stopPropagation();
    selectedImageData = null;
    document.getElementById('image-input').value = "";
    document.getElementById('diary-image').classList.add('hidden');
    document.getElementById('image-placeholder').classList.remove('hidden');
    document.getElementById('remove-img-btn').classList.add('hidden');
}

// 참 잘했어요 도장 꾹! (데이터베이스 일기 저장 연동)
async function saveDiary() {
    const date = document.getElementById('diary-date').value;
    const weather = document.getElementById('diary-weather').value;
    const text = document.getElementById('diary-text').value.trim();

    if(!text && !selectedImageData) return alert('일기 내용이나 사진 중 하나는 꼭 채워주세요! 📔');

    try {
        let imageUrl = null;

        // Base64 가상 주소를 파일로 변환하여 Supabase Storage에 정교하게 저장 처리
        if (selectedImageData && selectedImageData.startsWith('data:')) {
            const fileName = `${childName}/${Date.now()}.jpg`;
            const blob = await (await fetch(selectedImageData)).blob();

            const { error: uploadError } = await _supabase.storage
                .from('Mongle_Daily')
                .upload(fileName, blob, { contentType: 'image/jpeg' });

            if (uploadError) throw uploadError;

            const { data: urlData } = _supabase.storage.from('Mongle_Daily').getPublicUrl(fileName);
            imageUrl = urlData.publicUrl;
        }

        // 일기 데이터 주입 트랜잭션 시행
        const { error: dbError } = await _supabase
            .from('diary_entries')
            .upsert({
                user_id: currentUserUid,
                diary_date: date,
                weather: weather,
                diary_text: text,
                image_url: imageUrl,
                username: childName
            }, { onConflict: 'user_id,diary_date' });

        if (dbError) throw dbError;

        alert('💮 참 잘했어요! 일기가 안전하게 저장되었습니다.');
        renderCalendar();
    } catch (err) {
        alert('🚨 서버 전송 중 에러가 발생했습니다: ' + err.message);
    }
}

// 레트로 달력 드로잉 엔진 구현
function renderCalendar() {
    const calendarDays = document.getElementById('calendar-days');
    const monthYearHeader = document.getElementById('calendar-month-year');
    if(!calendarDays) return;

    calendarDays.innerHTML = '';
    monthYearHeader.innerText = `${currentYear}년 ${String(currentMonth + 1).padStart(2, '0')}월`;

    const firstDay = new Date(currentYear, currentMonth, 1).getDay();
    const lastDate = new Date(currentYear, currentMonth + 0, 0).getDate();

    // 빈칸 그리기
    for (let i = 0; i < firstDay; i++) {
        const emptyDiv = document.createElement('div');
        calendarDays.appendChild(emptyDiv);
    }

    // 날짜 채우기
    for (let day = 1; day <= lastDate; day++) {
        const dayDiv = document.createElement('div');
        dayDiv.className = "p-2 border border-amber-200 bg-white bg-opacity-40 rounded-lg relative aspect-square flex flex-col items-center justify-between cursor-pointer hover:bg-amber-100";
        dayDiv.innerText = day;
        
        // 주말 색상 부여
        const dayOfWeek = new Date(currentYear, currentMonth, day).getDay();
        if (dayOfWeek === 0) dayDiv.classList.add('text-red-600');
        if (dayOfWeek === 6) dayDiv.classList.add('text-blue-600');

        calendarDays.appendChild(dayDiv);
    }
}

function changeMonth(direction) {
    currentMonth += direction;
    if (currentMonth < 0) { currentMonth = 11; currentYear--; }
    if (currentMonth > 11) { currentMonth = 0; currentYear++; }
    renderCalendar();
}

// 배경음악 연출 토글 기능
let isPlayingBGM = false;
function toggleYouTubeBGM() {
    const btn = document.getElementById('bgm-btn');
    isPlayingBGM = !isPlayingBGM;
    if(isPlayingBGM) {
        btn.innerText = "⏸️ 음악 일시정지";
        btn.className = "mt-3 w-full bg-amber-600 text-white text-xl font-bold py-2 rounded-xl border-2 border-white cursor-pointer";
    } else {
        btn.innerText = "🎵 음악 재생";
        btn.className = "mt-3 w-full bg-red-500 text-white text-xl font-bold py-2 rounded-xl border-2 border-white cursor-pointer";
    }
}
