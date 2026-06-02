const SUPABASE_URL = "https://llkgofkkhuictscodsll.supabase.co"; 
const SUPABASE_ANON_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imxsa2dvZmtraHVpY3RzY29kc2xsIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Nzk3OTA0NDIsImV4cCI6MjA5NTM2NjQ0Mn0.DKymADB196pxaqQnrv6HDW7Ek6xItCWqkrAOOI8xT_s"; 

const _supabase = supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

// 공통 스토리지 및 데이터 변수
let currentUserUid = null;
let childName = "몽글이";
let selectedDiaryDate = "";

// [오류 해결] 날짜 형식을 YYYY-MM-DD 형태로 예쁘게 변환하는 핵심 전역 함수
function getFormattedDate(dateObj) {
    const y = dateObj.getFullYear();
    const m = String(dateObj.getMonth() + 1).padStart(2, '0');
    const d = String(dateObj.getDate()).padStart(2, '0');
    return `${y}-${m}-${d}`;
}
