import os
import time
import json
import subprocess
from selenium import webdriver
from selenium.webdriver.chrome.options import Options

# 계정 정보: 계정 이름과 프로필 경로 지정
accounts = {
    "acc1": r"C:\Users\Public\chrome_profiles\acc1",
    "acc2": r"C:\Users\Public\chrome_profiles\acc2",
    "acc3": r"C:\Users\Public\chrome_profiles\acc3"
}

# Chrome 실행 경로 (설치된 위치에 따라 조정)
chrome_path = r"C:\Program Files\Google\Chrome\Application\chrome.exe"
start_url = "https://nid.naver.com/nidlogin.login"
debug_port_start = 9222  # 9222, 9223, 9224 ...

# 1. Chrome 인스턴스 실행 (각 계정별 분리된 프로필로)
for i, (acc_name, profile_path) in enumerate(accounts.items()):
    os.makedirs(profile_path, exist_ok=True)
    subprocess.Popen([
        chrome_path,
        f"--remote-debugging-port={debug_port_start + i}",
        f"--user-data-dir={profile_path}",
        start_url
    ])
    time.sleep(1)

print("✅ 모든 브라우저 창이 떴습니다.")
print("각 창에서 네이버에 수동 로그인 해주세요.")
input("모두 로그인하셨습니까? [Enter]")

# 2. Selenium으로 각 브라우저에 연결해 쿠키 수집
cookie_results = {}

for i, (acc_name, _) in enumerate(accounts.items()):
    port = debug_port_start + i
    options = Options()
    options.debugger_address = f"127.0.0.1:{port}"
    driver = webdriver.Chrome(options=options)

    try:
        driver.get("https://www.naver.com")
        time.sleep(2)
        cookies = driver.get_cookies()
        cookie_results[acc_name] = cookies
        print(f"✅ {acc_name} 쿠키 수집 완료.")
    except Exception as e:
        print(f"❌ {acc_name} 에서 쿠키 수집 실패: {e}")
    finally:
        driver.quit()

# 3. JSON 파일로 저장
output_path = os.path.join(os.getcwd(), "naver_account_cookies.json")
with open(output_path, "w", encoding="utf-8") as f:
    json.dump(cookie_results, f, indent=2, ensure_ascii=False)

print(f"\n✅ 모든 계정 쿠키 저장 완료 → {output_path}")
