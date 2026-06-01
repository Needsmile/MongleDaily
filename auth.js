// 페이지 로드 시 Supabase 이메일 세션 상태 체크 및 자동 로그인 처리
window.onload = async () => {
    // 로컬 스토리지 최근 유저 목록 렌더링 (기존 기능 보존)
    if (typeof renderUserList === "function") {
        renderUserList();
    }
    const autoUser = localStorage.getItem('lastLoggedInUser');
    if (autoUser && document.getElementById('username')) {
        document.getElementById('username').value = autoUser;
    }

    // Supabase 현재 인증 세션 가져오기
    const { data: { session } } = await _supabase.auth.getSession();
    
    if (session) {
        currentUserUid = session.user.id;
        
        // 이메일 가입 시 유저 메타데이터에 심어둔 display_name을 필명으로 확정
        const emailName = session.user.user_metadata.display_name;
        childName = emailName || "몽글이";
        
        // 화면 전환 효과
        document.getElementById('login-section').style.display = 'none';
        const mainApp = document.getElementById('main-app');
        mainApp.style.display = 'flex';
        mainApp.classList.remove('hidden');
        
        // 메인 어플리케이션(app.js) 초기화 구동
        if (typeof initApp === "function") {
            selectedDiaryDate = getFormattedDate(new Date());
            initApp();
        }
    }
};

// [교정 완료] 이메일 회원가입 및 별명 메타데이터 강제 주입 함수
async function handleSignUp() {
    const email = document.getElementById('auth-email').value.trim();
    const password = document.getElementById('auth-password').value.trim();
    const username = document.getElementById('username').value.trim();

    if (!email || !password || !username) {
        return alert('이메일, 비밀번호, 이름을 모두 올바르게 채워주세요! ✏️');
    }

    const { data, error } = await _supabase.auth.signUp({
        email: email,
        password: password,
        options: { 
            data: { display_name: username } // 별명을 고유 메타데이터 영역에 보관
        }
    });

    if (error) {
        alert('회원등록 실패: ' + error.message);
    } else {
        alert('💮 회원등록 신청 완료! 입력하신 이메일함에서 인증 메일을 확인하고 링크를 눌러주세요. 💌');
    }
}

// [교정 완료] 이메일 로그인 및 세션 동기화 함수
async function handleLogin() {
    const email = document.getElementById('auth-email').value.trim();
    const password = document.getElementById('auth-password').value.trim();
    const username = document.getElementById('username').value.trim();

    if (!email || !password) {
        return alert('이메일과 비밀번호를 입력해주세요!');
    }

    const { data, error } = await _supabase.auth.signInWithPassword({ 
        email: email, 
        password: password 
    });

    if (error) {
        alert('로그인 실패: ' + error.message);
    } else {
        // 로그인 성공 시 사용자가 입력한 이름을 캐시에 보관 (기존 로직 무결성 유지)
        const finalName = data.user.user_metadata.display_name || username;
        if (typeof saveUserName === "function") {
            saveUserName(finalName);
        }
        localStorage.setItem('lastLoggedInUser', finalName);
        window.location.reload();
    }
}

// 로그아웃 처리 함수
async function handleLogout() {
    await _supabase.auth.signOut();
    localStorage.removeItem('lastLoggedInUser');
    window.location.reload();
}
