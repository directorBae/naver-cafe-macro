import os
import time
import json
import streamlit as st
import pandas as pd
import datetime
import requests
from pathlib import Path

# 환경 설정
creds_file = "naver_accounts.txt"
logs_dir = "logs"
os.makedirs(logs_dir, exist_ok=True)


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


# 작성 로그 불러오기
def load_logs():
    logs = []
    if os.path.exists(logs_dir):
        for log_file in Path(logs_dir).glob("*.json"):
            try:
                with open(log_file, "r", encoding="utf-8") as f:
                    log_data = json.load(f)
                    logs.append(log_data)
            except Exception as e:
                st.error(f"로그 파일 {log_file} 읽기 오류: {e}")
    return logs


# 로그인된 계정 정보 표시
def display_logged_in_accounts():
    if "account_cookies" in st.session_state and st.session_state.account_cookies:
        st.subheader("현재 로그인된 계정")

        accounts_data = []
        for acc_name, acc_info in st.session_state.account_cookies.items():
            accounts_data.append(
                {
                    "계정명": acc_name,
                    "로그인 시간": acc_info.get("timestamp", "알 수 없음"),
                    "쿠키 수": len(acc_info.get("cookies", {})),
                }
            )

        if accounts_data:
            accounts_df = pd.DataFrame(accounts_data)
            st.dataframe(accounts_df, use_container_width=True)

            # 계정 선택 삭제
            account_to_logout = st.selectbox(
                "로그아웃할 계정 선택", options=[acc["계정명"] for acc in accounts_data]
            )

            if st.button("선택한 계정 로그아웃"):
                if account_to_logout in st.session_state.account_cookies:
                    del st.session_state.account_cookies[account_to_logout]
                    if (
                        "selected_account" in st.session_state
                        and st.session_state.selected_account == account_to_logout
                    ):
                        if st.session_state.account_cookies:
                            st.session_state.selected_account = list(
                                st.session_state.account_cookies.keys()
                            )[0]
                        else:
                            if "selected_account" in st.session_state:
                                del st.session_state.selected_account
                    st.success(f"계정 {account_to_logout} 로그아웃 완료!")
                    st.rerun()
        else:
            st.info("로그인된 계정이 없습니다.")
    else:
        st.info("로그인된 계정이 없습니다.")


# Streamlit UI
st.set_page_config(page_title="계정 및 로그 관리", page_icon="⚙️", layout="wide")

st.title("⚙️ 네이버 계정 및 로그 관리")
st.write("등록된 계정 정보와 작성 로그를 관리합니다.")

# 탭 생성
tab1, tab2 = st.tabs(["📊 계정 관리", "📝 작성 로그"])

# 계정 관리 탭
with tab1:
    account_creds = load_account_creds()

    # 로그인된 계정 정보 표시
    display_logged_in_accounts()

    st.markdown("---")
    st.subheader("등록된 계정 목록")

    if account_creds:

        # 계정 정보를 데이터프레임으로 변환
        accounts_data = []
        for acc_name, info in account_creds.items():
            accounts_data.append(
                {
                    "계정 이름": acc_name,
                    "아이디": info.get("id", ""),
                    "비밀번호": "*" * len(info.get("pw", "")),
                    "상태": "활성",
                }
            )

        if accounts_data:
            accounts_df = pd.DataFrame(accounts_data)
            st.dataframe(accounts_df, use_container_width=True)

            # 계정 삭제 기능
            st.subheader("계정 삭제")
            account_to_delete = st.selectbox(
                "삭제할 계정 선택", options=[acc["계정 이름"] for acc in accounts_data]
            )

            if st.button("선택한 계정 삭제"):
                if account_to_delete in account_creds:
                    del account_creds[account_to_delete]

                    # 계정 정보 파일 업데이트
                    with open(creds_file, "w", encoding="utf-8") as f:
                        for acc in sorted(account_creds):
                            f.write(
                                f"{account_creds[acc]['id']},{account_creds[acc]['pw']}\n"
                            )

                    st.success(f"계정 {account_to_delete}가 삭제되었습니다.")
                    st.rerun()
    else:
        st.info("등록된 계정이 없습니다. 계정 관리 페이지에서 계정을 추가해주세요.")
        if st.button("계정 관리 페이지로 이동"):
            st.switch_page("pages/auth.py")

# 작성 로그 탭
with tab2:
    logs = load_logs()

    if logs:
        st.subheader("작성 로그")

        # 로그 데이터를 데이터프레임으로 변환
        logs_data = []
        for log in logs:
            logs_data.append(
                {
                    "작성 일시": log.get("timestamp", ""),
                    "계정": log.get("account", ""),
                    "제목": log.get("title", ""),
                    "상태": "성공" if log.get("success", False) else "실패",
                    "글 ID": log.get("article_id", ""),
                    "URL": log.get("url", ""),
                }
            )

        if logs_data:
            logs_df = pd.DataFrame(logs_data)

            # 필터링 옵션
            col1, col2 = st.columns(2)
            with col1:
                status_filter = st.multiselect(
                    "상태 필터", options=["성공", "실패"], default=["성공", "실패"]
                )
            with col2:
                account_filter = st.multiselect(
                    "계정 필터",
                    options=list(set([log.get("계정") for log in logs_data])),
                    default=list(set([log.get("계정") for log in logs_data])),
                )

            # 필터링 적용
            filtered_logs = logs_df[
                (logs_df["상태"].isin(status_filter))
                & (logs_df["계정"].isin(account_filter))
            ]

            # 정렬
            filtered_logs = filtered_logs.sort_values(by="작성 일시", ascending=False)

            # 데이터프레임 표시
            st.dataframe(filtered_logs, use_container_width=True)

            # 통계
            st.subheader("통계")
            col1, col2, col3 = st.columns(3)
            with col1:
                st.metric("총 작성 글 수", len(logs_data))
            with col2:
                success_count = len(logs_df[logs_df["상태"] == "성공"])
                st.metric("성공한 글 수", success_count)
            with col3:
                failure_count = len(logs_df[logs_df["상태"] == "실패"])
                st.metric("실패한 글 수", failure_count)
    else:
        st.info("작성 로그가 없습니다. 글쓰기 페이지에서 글을 작성해보세요.")
        if st.button("글쓰기 페이지로 이동"):
            st.switch_page("pages/write.py")

# 추가 기능
st.markdown("---")
st.subheader("추가 기능")

# 다른 페이지로 이동
col1, col2 = st.columns(2)
with col1:
    if st.button("계정 관리 페이지로 이동"):
        st.switch_page("pages/auth.py")
with col2:
    if st.button("글쓰기 페이지로 이동"):
        st.switch_page("pages/write.py")
