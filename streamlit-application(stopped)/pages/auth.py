import os
import time
import datetime
import streamlit as st
import subprocess
from selenium import webdriver
from selenium.webdriver.chrome.options import Options
from selenium.webdriver.common.by import By
from selenium.webdriver.common.keys import Keys
import os
from dotenv import load_dotenv

# 환경 변수 로드
load_dotenv()
chrome_path = os.getenv("CHROME_PATH", r"C:\Program Files\Google\Chrome\Application\chrome.exe")

if not chrome_path or not os.path.exists(chrome_path):
    st.error("Chrome 경로가 설정되지 않았거나 잘못되었습니다. .env 파일을 확인해주세요.")
    st.stop()

debug_port_start = 9222
profile_base_dir = r"C:\Users\Public\chrome_profiles"
creds_file = "naver_accounts.txt"


# 계정 정보 불러오기
def load_account_creds():
    if not os.path.exists(creds_file):
        return {}
    with open(creds_file, "r", encoding="utf-8") as f:
        lines = f.readlines()
        return {
            f"acc{i+1}": {"id": parts[0].strip(), "pw": parts[1].strip()}
            for i, line in enumerate(lines[:10])
            if (parts := line.strip().split(",")) and len(parts) == 2
        }


# 계정 정보 저장하기
def save_account_creds(account_creds):
    with open(creds_file, "w", encoding="utf-8") as f:
        for acc in sorted(account_creds):
            f.write(f"{account_creds[acc]['id']},{account_creds[acc]['pw']}\n")


# 브라우저 초기화
def initialize_browser(port, profile_path):
    os.makedirs(profile_path, exist_ok=True)

    # 크롬 실행
    subprocess.Popen(
        [
            chrome_path,
            f"--remote-debugging-port={port}",
            f"--user-data-dir={profile_path}",
            "https://nid.naver.com/nidlogin.login",
        ]
    )
    time.sleep(2)

    options = Options()
    options.debugger_address = f"127.0.0.1:{port}"

    if os.path.exists("./chromedriver/chromedriver"):
        driver = webdriver.Chrome(
            executable_path="./chromedriver/chromedriver",
            options=options
        )
    else:
        driver = webdriver.Chrome(
            options=options
        )

    # 셀레니움 연결
    
    return driver


# 로그인 화면 설정
def login_account(driver, account_id, account_pw):
    try:
        driver.get("https://nid.naver.com/nidlogin.login")
        time.sleep(2)
        driver.find_element(By.ID, "id").send_keys(account_id)
        pw_field = driver.find_element(By.ID, "pw")
        pw_field.send_keys(account_pw)
        # 자동 로그인 버튼은 클릭하지 않고 사용자가 직접 클릭하도록 대기
        return True
    except Exception as e:
        st.error(f"로그인 화면 설정 중 오류 발생: {e}")
        return False


# Streamlit UI
st.set_page_config(page_title="계정 관리", page_icon="🔐", layout="wide")

st.title("🔐 네이버 계정 관리")
st.write("최대 10개 계정을 입력하고 관리합니다.")

# 세션 상태 초기화
if "login_started" not in st.session_state:
    st.session_state.login_started = False
if "current_driver" not in st.session_state:
    st.session_state.current_driver = None
if "current_account" not in st.session_state:
    st.session_state.current_account = None
if "drivers" not in st.session_state:
    st.session_state.drivers = {}
if "completed_accounts" not in st.session_state:
    st.session_state.completed_accounts = []

# Load existing credentials
account_creds = load_account_creds()

# Edit account info
for i in range(10):
    acc = f"acc{i+1}"
    with st.expander(f"계정 {i+1}"):
        id_input = st.text_input(
            f"아이디 ({acc})",
            value=account_creds.get(acc, {}).get("id", ""),
            key=f"id_{acc}",
        )
        pw_input = st.text_input(
            f"비밀번호 ({acc})",
            value=account_creds.get(acc, {}).get("pw", ""),
            type="password",
            key=f"pw_{acc}",
        )
        if id_input and pw_input:
            account_creds[acc] = {"id": id_input, "pw": pw_input}

# Save credentials
if st.button("💾 계정 정보 저장"):
    save_account_creds(account_creds)
    st.success("저장 완료!")

# 로그인 시작 버튼
if st.button("🔑 로그인 시작", disabled=st.session_state.login_started):
    valid_accounts = {
        acc: info
        for acc, info in account_creds.items()
        if info.get("id") and info.get("pw")
    }

    if not valid_accounts:
        st.error("저장된 계정이 없습니다. 계정을 먼저 추가해주세요.")
    else:
        st.session_state.login_started = True
        st.session_state.valid_accounts = valid_accounts
        account_names = list(valid_accounts.keys())

        # 계정별 로그인 상태 표시를 위한 영역
        account_status_area = st.empty()
        account_status_dict = {}

        # 모든 계정의 브라우저를 동시에 실행
        for i, acc_name in enumerate(account_names):
            info = valid_accounts[acc_name]
            port = debug_port_start + i
            profile_path = os.path.join(profile_base_dir, acc_name)

            # 브라우저 초기화 및 로그인 화면 설정
            try:
                driver = initialize_browser(port, profile_path)
                success = login_account(driver, info["id"], info["pw"])

                if success:
                    # 드라이버를 세션 상태에 저장
                    st.session_state.drivers[acc_name] = {
                        "driver": driver,
                        "status": "준비됨",
                    }
                    account_status_dict[acc_name] = f"🔄 {acc_name}: 로그인 준비됨"
                else:
                    account_status_dict[acc_name] = (
                        f"❌ {acc_name}: 로그인 화면 설정 실패"
                    )
            except Exception as e:
                account_status_dict[acc_name] = f"❌ {acc_name}: 오류 발생 ({str(e)})"

        # 모든 계정 상태 표시
        status_html = "<h3>계정 로그인 상태</h3>"
        for acc_name, status in account_status_dict.items():
            status_html += f"<p>{status}</p>"

        account_status_area.markdown(status_html, unsafe_allow_html=True)

        if len(st.session_state.drivers) > 0:
            st.success(
                f"{len(st.session_state.drivers)}개 계정의 로그인 화면이 준비되었습니다. 각 브라우저에서 로그인 완료 후 아래 버튼을 클릭해주세요."
            )
        else:
            st.session_state.login_started = False
            st.error("모든 계정 로그인 화면 설정에 실패했습니다.")

# 로그인 완료 버튼 (로그인이 시작된 경우에만 활성화)
if st.session_state.login_started and len(st.session_state.drivers) > 0:
    # 처리할 계정 선택
    account_options = [
        acc
        for acc in st.session_state.drivers.keys()
        if acc not in st.session_state.completed_accounts
    ]

    if account_options:
        selected_account = st.selectbox(
            "로그인 완료 처리할 계정 선택:", account_options
        )

        if st.button(f"✅ '{selected_account}' 로그인 완료"):
            # 로그인이 완료되었으므로 쿠키를 저장
            try:
                driver_info = st.session_state.drivers[selected_account]
                driver = driver_info["driver"]

                # 쿠키 저장
                cookies = driver.get_cookies()

                # 세션 상태에 계정별 쿠키 저장
                if "account_cookies" not in st.session_state:
                    st.session_state.account_cookies = {}

                st.session_state.account_cookies[selected_account] = {
                    "cookies": {c["name"]: c["value"] for c in cookies},
                    "timestamp": datetime.datetime.now().strftime("%Y-%m-%d %H:%M:%S"),
                }

                # 가장 최근 계정의 쿠키를 기본 쿠키로 설정
                st.session_state.cookies = {c["name"]: c["value"] for c in cookies}
                st.session_state.current_account_name = selected_account

                # 드라이버 종료
                driver.quit()

                # 완료된 계정 목록에 추가
                st.session_state.completed_accounts.append(selected_account)

                # 드라이버 목록에서 제거
                del st.session_state.drivers[selected_account]

                # 상태 업데이트
                st.success(f"'{selected_account}' 계정의 로그인이 완료되었습니다!")

                # 모든 계정 로그인이 완료되었는지 확인
                remaining_accounts = len(st.session_state.drivers)
                if remaining_accounts == 0:
                    st.session_state.login_started = False
                    st.success("모든 계정 로그인이 완료되었습니다!")
                    time.sleep(1)
                    st.switch_page("pages/write.py")
                else:
                    st.info(f"남은 계정: {remaining_accounts}개")
                    st.rerun()

            except Exception as e:
                st.error(f"로그인 완료 처리 중 오류 발생: {e}")
                if (
                    selected_account in st.session_state.drivers
                    and st.session_state.drivers[selected_account]["driver"]
                ):
                    try:
                        st.session_state.drivers[selected_account]["driver"].quit()
                    except:
                        pass
                    del st.session_state.drivers[selected_account]
                st.rerun()

    else:
        if len(st.session_state.completed_accounts) > 0:
            st.success("모든 계정 로그인이 완료되었습니다!")
            if st.button("글쓰기 페이지로 이동"):
                st.switch_page("pages/write.py")
        else:
            st.warning(
                "로그인 처리할 계정이 없습니다. 모든 브라우저를 닫고 다시 시도해주세요."
            )
            if st.button("로그인 처리 취소"):
                # 모든 드라이버 종료
                for acc_name, driver_info in st.session_state.drivers.items():
                    try:
                        driver_info["driver"].quit()
                    except:
                        pass

                st.session_state.drivers = {}
                st.session_state.login_started = False
                st.session_state.completed_accounts = []
                st.rerun()
