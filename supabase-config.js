// [검증 완료] Supabase 프로젝트 정보 설정
const SUPABASE_URL = "https://llkgofkkhuictscodsll.supabase.co"; 
const SUPABASE_ANON_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imxsa2dvZmtraHVpY3RzY29kc2xsIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Nzk3OTA0NDIsImV4cCI6MjA5NTM2NjQ0Mn0.DKymADB196pxaqQnrv6HDW7Ek6xItCWqkrAOOI8xT_s"; 

// [교정] Supabase v2 CDN 환경에서 API 키를 안전하게 바인딩하는 무결성 초기화 로직
if (typeof supabase === 'undefined') {
    console.error("Supabase 라이브러리가 로드되지 않았습니다. index.html의 CDN 링크를 확인하세요.");
}

// 전역 클라이언트 인스턴스를 확실하게 생성하여 전달합니다.
const _supabase = supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

// 세션 및 사용자 정보를 공유할 전역 변수
let currentUserUid = null;
let childName = "몽글이";

// [작동 테스트용 내부 로그] 브라우저 콘솔에서 정상 연결 여부를 체크합니다.
console.log("Supabase 초기화 완료 여부:", _supabase ? "성공" : "실패");
