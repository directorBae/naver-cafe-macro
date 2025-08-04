const { execSync } = require("child_process");
const fs = require("fs");
const path = require("path");

console.log("🚀 네이버 카페 매크로 빌드 시작...");

try {
  // 1. React 앱 빌드
  console.log("📦 React 앱 빌드 중...");
  execSync("npm run build", { stdio: "inherit" });

  // 2. 데이터 디렉토리 확인
  const dataDir = path.join(__dirname, "..", "data");
  if (!fs.existsSync(dataDir)) {
    fs.mkdirSync(dataDir, { recursive: true });
    console.log("📁 데이터 디렉토리 생성됨");
  }

  // 3. Electron 앱 빌드
  console.log("⚡ Electron 앱 빌드 중...");
  execSync("npx electron-builder", { stdio: "inherit" });

  console.log("✅ 빌드 완료! dist 폴더를 확인하세요.");
} catch (error) {
  console.error("❌ 빌드 실패:", error.message);
  process.exit(1);
}
