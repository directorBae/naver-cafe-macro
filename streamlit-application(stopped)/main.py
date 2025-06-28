import streamlit as st

st.set_page_config(
    page_title="네이버 카페 매크로",
    page_icon="🟢",
    layout="wide",
    initial_sidebar_state="expanded",
)

st.title("🟢 네이버 멀티 계정 관리 시스템")
st.write("네이버 자동 로그인 및 글쓰기 작업을 수행합니다.")
st.markdown(
    """
## 사용 방법
1. **계정 관리** - 네이버 계정 정보를 등록하고 관리합니다.
2. **로그인 및 글쓰기** - 등록된 계정으로 자동 로그인하고 글을 작성합니다.
3. **관리** - 등록된 계정과 작업 현황을 관리합니다.

왼쪽 사이드바에서 원하는 기능을 선택하세요.
"""
)

# 버튼을 통한 페이지 이동
col1, col2, col3 = st.columns(3)

with col1:
    if st.button("🔐 계정 관리", use_container_width=True):
        st.switch_page("pages/auth.py")

with col2:
    if st.button("📝 글쓰기", use_container_width=True):
        st.switch_page("pages/write.py")

with col3:
    if st.button("⚙️ 관리", use_container_width=True):
        st.switch_page("pages/manage.py")
