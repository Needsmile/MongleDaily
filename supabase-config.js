// Supabase 프로젝트 주소 및 API 키 설정
const SUPABASE_URL = "https://llkgofkkhuictscodsll.supabase.co"; 
const SUPABASE_ANON_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imxsa2dvZmtraHVpY3RzY29kc2xsIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3OTc5MDQ0MiwiZXhwIjoyMDk1MzY2NDQyfQ.9k0ZfTnMnvjqnbZqya1nOY7d6WO_DKfTZ2ROQSWQkJ0"; // 회원님의 실제 Anon Key를 입력해 주세요.

// 전역에서 사용할 Supabase 클라이언트 초기화
const _supabase = supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

// 세션 공유 변수 정의
let currentUserUid = null;
let childName = "몽글이";
