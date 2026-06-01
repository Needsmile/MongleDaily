window.onload = async () => {
    // 최근 가입 이름표 세팅
    const cachedName = localStorage.getItem('lastLoggedInUser') || "몽글이";
    if (document.getElementById('username')) {
        document.getElementById('username').value = cachedName;
    }

    // 서버 인증 감지
    const { data: { session } } = await _supabase.auth.getSession();
    
    if (session) {
        currentUserUid = session.user.id;
        childName = session.user.user_metadata.display_name || "몽글이";
        
        document.getElementById('login-section').style.display = 'none';
        const mainApp = document.getElementById('main-app');
        mainApp.style.display = 'flex';
        mainApp.classList.remove('hidden');
        
        selectedDiaryDate = getFormattedDate(new Date());
        if (typeof initApp === "function") {
            initApp();
        }
    }
};

async function handleSignUp() {
    const email = document.getElementById('auth-email').value.trim();
    const password = document.getElementById('auth-password').value.trim();
    const username = document.getElementById('username').value.trim();

    if (!email || !password || !username) return alert('빈칸을 채워주세요!');

    const { data, error } = await _supabase.auth.signUp({
        email, password, options: { data: { display_name: username } }
    });

    if (error) alert('등록 실패: ' + error.message);
    else alert('💮 인증 이메일을 보냈습니다. 링크를 꼭 클릭해주세요! 💌');
}

async function handleLogin() {
    const email = document.getElementById('auth-email').value.trim();
    const password = document.getElementById('auth-password').value.trim();
    const username = document.getElementById('username').value.trim();

    if (!email || !password) return alert('이메일과 비밀번호를 채워주세요!');

    const { data, error } = await _supabase.auth.signInWithPassword({ email, password });

    if (error) alert('로그인 실패: ' + error.message);
    else {
        localStorage.setItem('lastLoggedInUser', data.user.user_metadata.display_name || username);
        window.location.reload();
    }
}

async function handleLogout() {
    await _supabase.auth.signOut();
    window.location.reload();
}
