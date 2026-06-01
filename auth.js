// 페이지 로드 시 로그인 상태 체크 및 닉네임 바인딩 최신화
window.onload = async () => {
    const { data: { session } } = await _supabase.auth.getSession();
    
    if (session) {
        currentUserUid = session.user.id;
        
        // 카카오 로그인 유저의 메타데이터와 이메일 가입 유저 처리 통합 교정
        const kakaoName = session.user.user_metadata.full_name || session.user.user_metadata.name;
        const emailName = session.user.user_metadata.display_name;
        childName = kakaoName || emailName || "몽글이";
        
        document.getElementById('login-section').style.display = 'none';
        const mainApp = document.getElementById('main-app');
        mainApp.style.display = 'flex';
        mainApp.classList.remove('hidden');
        
        // app.js에 정의된 어플리케이션 초기화 구동
        if (typeof initApp === "function") {
            initApp();
        }
    }
};

// 이메일 회원가입 함수
async function handleSignUp() {
    const email = document.getElementById('auth-email').value.trim();
    const password = document.getElementById('auth-password').value.trim();
    const username = document.getElementById('username').value.trim();

    if (!email || !password || !username) return alert('모든 빈칸을 다 채워주세요! ✏️');

    const { data, error } = await _supabase.auth.signUp({
        email: email,
        password: password,
        options: { data: { display_name: username } }
    });

    if (error) alert('회원가입 실패: ' + error.message);
    else alert('인증 이메일이 발송되었습니다! 메일함을 확인해주세요. 💌');
}

// 이메일 로그인 함수
async function handleLogin() {
    const email = document.getElementById('auth-email').value.trim();
    const password = document.getElementById('auth-password').value.trim();

    if (!email || !password) return alert('이메일과 비밀번호를 입력해주세요!');

    const { data, error } = await _supabase.auth.signInWithPassword({ email, password });

    if (error) alert('로그인 실패: ' + error.message);
    else window.location.reload();
}

// 최신 연동 카카오 로그인 함수
async function handleKakaoLogin() {
    const { data, error } = await _supabase.auth.signInWithOAuth({
        provider: 'kakao',
        options: { redirectTo: window.location.origin }
    });
    if (error) alert('카카오 로그인 실패: ' + error.message);
}

// 로그아웃 처리 함수
async function handleLogout() {
    await _supabase.auth.signOut();
    window.location.reload();
}
