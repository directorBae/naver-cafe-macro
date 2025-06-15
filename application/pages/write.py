import os
import time
import json
import streamlit as st
import requests
import datetime
from selenium import webdriver
from selenium.webdriver.chrome.options import Options

# 환경 설정
write_url = "https://cafe.naver.com/ca-fe/cafes/27433401/menus/17/articles/write"
cafe_id = "27433401"
menu_id = 17
logs_dir = "logs"
os.makedirs(logs_dir, exist_ok=True)


# 로그 저장 함수
def save_log(account, title, success=True, article_id=None, url=None):
    timestamp = datetime.datetime.now().strftime("%Y-%m-%d %H:%M:%S")
    log_data = {
        "timestamp": timestamp,
        "account": account,
        "title": title,
        "success": success,
        "article_id": article_id,
        "url": url,
    }

    filename = f"{timestamp.replace(':', '-').replace(' ', '_')}_{account}.json"
    filepath = os.path.join(logs_dir, filename)

    with open(filepath, "w", encoding="utf-8") as f:
        json.dump(log_data, f, ensure_ascii=False, indent=4)

    return log_data


# 이미지 업로드 함수 (실제 구현은 네이버 API 필요)
def upload_image_to_naver(image_file, cookies):
    """
    이미지를 네이버 서버에 업로드하는 함수 (미구현)
    실제 구현에서는 네이버 이미지 업로드 API를 호출해야 함
    """
    # 이 함수는 실제 구현이 필요합니다
    # 현재는 더미 URL만 반환
    return {
        "url": "https://cafeptthumb-phinf.pstatic.net/example.jpg",
        "path": "/example.jpg",
        "fileSize": len(image_file.getvalue()) if image_file else 0,
        "width": 800,
        "height": 600,
        "fileName": image_file.name if image_file else "image.jpg",
    }


# Streamlit UI
st.set_page_config(page_title="글쓰기", page_icon="📝", layout="wide")

st.title("📝 네이버 카페 글쓰기")
st.write("로그인된 계정으로 네이버 카페에 글을 작성합니다.")

# 세션 상태 확인
if "account_cookies" not in st.session_state or not st.session_state.account_cookies:
    if "cookies" not in st.session_state or "current_account" not in st.session_state:
        st.warning(
            "로그인된 계정이 없습니다. 계정 관리 페이지에서 먼저 로그인해주세요."
        )
        if st.button("계정 관리 페이지로 이동"):
            st.switch_page("pages/auth.py")
    else:
        # 이전 버전과의 호환성을 위해 단일 계정 정보 유지
        st.info(
            f"현재 로그인된 계정: {st.session_state.get('current_account', '알 수 없음')}"
        )
else:
    # 로그인된 계정 목록
    account_names = list(st.session_state.account_cookies.keys())

    # 계정 선택
    selected_account = st.selectbox(
        "사용할 계정 선택:",
        account_names,
        index=(
            0
            if "selected_account" not in st.session_state
            else (
                account_names.index(st.session_state.selected_account)
                if st.session_state.selected_account in account_names
                else 0
            )
        ),
    )

    # 선택한 계정 정보 저장
    st.session_state.selected_account = selected_account
    st.session_state.cookies = st.session_state.account_cookies[selected_account][
        "cookies"
    ]
    st.session_state.current_account = selected_account

    # 현재 로그인된 계정 표시
    st.info(
        f"현재 선택된 계정: {selected_account} (로그인 시간: {st.session_state.account_cookies[selected_account]['timestamp']})"
    )  # 글쓰기 폼
    with st.form("write_form"):
        title = st.text_input("제목", value="[자동작성] 테스트")
        content = st.text_area(
            "내용", value="테스트 글입니다."
        )  # 이미지 업로드 기능 추가
        uploaded_image = st.file_uploader("이미지 업로드", type=["png", "jpg", "jpeg"])

        # 거래글 작성 옵션
        is_trade_article = st.checkbox("거래글로 작성", value=True)

        # 거래글 관련 필드 (거래글로 작성 선택 시에만 표시)
        trade_options = None
        if is_trade_article:
            st.subheader("거래 정보")
            cost = st.number_input("가격", min_value=0, value=100000000)
            product_condition = st.selectbox(
                "상품 상태", ["새상품", "중고상품"], index=0
            )
            product_condition_map = {"새상품": "N", "중고상품": "U"}

            trade_options = {
                "category1": "50000008",  # 기본 카테고리 설정
                "category2": "50000165",
                "category3": "50001021",
                "cost": cost,
                "deliveryTypes": ["M"],
                "productCondition": product_condition_map[product_condition],
                "tradeRegions": [],
                "watermark": True,
                "paymentCorp": "NONE",
                "npayRemit": True,
                "quantity": 0,
                "menuId": menu_id,
                "title": title,
                "specification": title,
                "openPhoneNo": False,
                "imgUrl": "https://cafeptthumb-phinf.pstatic.net/MjAyNTA2MTFfMjg2/MDAxNzQ5NjAzNjYxMjM2.sdpaf6aHqxwfKPYSZrJmrqiUx2IWGOKlLxMKw7WEoU4g.RzuAceYs9aOYwOXZD0G5hYQe9Vc0y5pAszneDwEuJ0kg.PNG/%EC%A0%9C%EB%AA%A9_%EC%97%86%EC%9D%8C2222222222.png?type=w1600",
                "useOtn": False,
                "channelNo": "",
                "channelProductNo": "",
                "storefarmImgUrl": "",
                "uploadPhoto": {},
            }

        use_auto_source = st.checkbox("출처 자동 사용", value=False)
        enable_comment = st.checkbox("댓글 허용", value=True)
        enable_scrap = st.checkbox("스크랩 허용", value=True)
        enable_copy = st.checkbox("복사 허용", value=True)
        open_setting = st.radio(
            "공개 설정", options=["전체 공개", "회원 공개", "비공개"], index=0
        )

        # 공개 설정에 따른 값 변환
        open_map = {
            "전체 공개": {"open": True, "naverOpen": True, "externalOpen": False},
            "회원 공개": {"open": True, "naverOpen": False, "externalOpen": False},
            "비공개": {"open": False, "naverOpen": False, "externalOpen": False},
        }

        submit_button = st.form_submit_button("글 작성하기")

        if submit_button:
            try:  # 글쓰기 API 요청
                headers = {
                    "accept": "application/json, text/plain, */*",
                    "content-type": "application/json",
                    "origin": "https://cafe.naver.com",
                    "referer": write_url,
                    "user-agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/137.0.0.0 Safari/537.36",
                    "x-cafe-product": "pc",
                }  # 고유 ID 생성
                unique_id = f"{datetime.datetime.now().strftime('%Y%m%d%H%M%S')}"
                text_component_id = f"SE-{unique_id}-text"
                paragraph_id = f"SE-para-{unique_id}"
                node_id = f"SE-node-{unique_id}"
                image_component_id = f"SE-{unique_id}-image"

                content_components = []  # 이미지가 있는 경우 이미지 컴포넌트 추가
                """
                # 이 부분은 현재 하드코딩으로 구현하기 위해 주석 처리합니다
                if uploaded_image is not None:
                    # 실제로 이미지를 업로드하고 결과를 받아서 처리하는 코드
                    image_info = upload_image_to_naver(uploaded_image, st.session_state.cookies)
                    
                    image_component = {
                        "id": image_component_id,
                        "layout": "default",
                        "src": image_info["url"],
                        "internalResource": True,
                        "represent": True,
                        "path": image_info["path"],
                        "domain": "https://cafeptthumb-phinf.pstatic.net",
                        "fileSize": image_info["fileSize"],
                        "width": image_info["width"],
                        "height": image_info["height"],
                        "fileName": image_info["fileName"],
                        "format": "normal",
                        "displayFormat": "normal",
                        "imageLoaded": True,
                        "contentMode": "extend",
                        "origin": {"srcFrom": "local", "@ctype": "imageOrigin"},
                        "ai": False,
                        "@ctype": "image"
                    }
                    content_components.append(image_component)
                """

                # 이미지 컴포넌트 하드코딩 (write_test.py에서 가져옴)
                if uploaded_image is not None:
                    st.info("현재 버전에서는 하드코딩된 이미지 URL을 사용합니다.")

                    image_component = {
                        "id": "SE-fb661891-47e4-412d-a1b8-e4840d63a4b4",
                        "layout": "default",
                        "src": "https://cafeptthumb-phinf.pstatic.net/MjAyNTA2MTFfMjg2/MDAxNzQ5NjAzNjYxMjM2.sdpaf6aHqxwfKPYSZrJmrqiUx2IWGOKlLxMKw7WEoU4g.RzuAceYs9aOYwOXZD0G5hYQe9Vc0y5pAszneDwEuJ0kg.PNG/%EC%A0%9C%EB%AA%A9_%EC%97%86%EC%9D%8C2222222222.png?type=w1600",
                        "internalResource": True,
                        "represent": True,
                        "path": "/MjAyNTA2MTFfMjg2/MDAxNzQ5NjAzNjYxMjM2.sdpaf6aHqxwfKPYSZrJmrqiUx2IWGOKlLxMKw7WEoU4g.RzuAceYs9aOYwOXZD0G5hYQe9Vc0y5pAszneDwEuJ0kg.PNG/%EC%A0%9C%EB%AA%A9_%EC%97%86%EC%9D%8C2222222222.png",
                        "domain": "https://cafeptthumb-phinf.pstatic.net",
                        "fileSize": 97742,
                        "width": 800,
                        "widthPercentage": 0,
                        "height": 435,
                        "originalWidth": 1906,
                        "originalHeight": 1038,
                        "fileName": "제목_없음2222222222.png",
                        "caption": None,
                        "format": "normal",
                        "displayFormat": "normal",
                        "imageLoaded": True,
                        "contentMode": "extend",
                        "origin": {"srcFrom": "local", "@ctype": "imageOrigin"},
                        "ai": False,
                        "@ctype": "image",
                    }
                    content_components.append(image_component)  # 텍스트 컴포넌트 추가
                text_component = {
                    "id": "SE-493fcbdc-2521-4f9c-8f0b-1e16a1eecfaa",
                    "layout": "default",
                    "value": [
                        {
                            "id": "SE-44eac156-44b0-41d4-a149-710fe34a9890",
                            "nodes": [
                                {
                                    "id": "SE-03e99fca-cc27-4453-8e47-55c6776fb90f",
                                    "value": content,
                                    "@ctype": "textNode",
                                }
                            ],
                            "@ctype": "paragraph",
                        }
                    ],
                    "@ctype": "text",
                }
                content_components.append(text_component)

                # write_test.py와 동일하게 content_json 구조 설정
                content_json = {
                    "document": {
                        "version": "2.8.8",
                        "theme": "default",
                        "language": "ko-KR",
                        "id": "01JXE7ZVKVR24Y67QXGESWFT5H",
                        "components": content_components,
                        "di": {
                            "dif": False,
                            "dio": [
                                {"dis": "N", "dia": {"t": 0, "p": 0, "st": 1, "sk": 0}},
                                {
                                    "dis": "N",
                                    "dia": {"t": 0, "p": 0, "st": 104, "sk": 0},
                                },
                            ],
                        },
                    },
                    "documentId": "",
                }

                post_data = {
                    "article": {
                        "cafeId": cafe_id,
                        "contentJson": json.dumps(content_json),
                        "from": "pc",
                        "menuId": menu_id,
                        "subject": title,
                        "tagList": [],
                        "editorVersion": 4,
                        "parentId": 0,
                        "open": open_map[open_setting]["open"],
                        "naverOpen": open_map[open_setting]["naverOpen"],
                        "externalOpen": open_map[open_setting]["externalOpen"],
                        "enableComment": enable_comment,
                        "enableScrap": enable_scrap,
                        "enableCopy": enable_copy,
                        "useAutoSource": use_auto_source,
                        "cclTypes": [],
                        "useCcl": False,
                    },
                    "tradeArticle": is_trade_article,
                }  # 거래글인 경우 거래 정보 추가
                if is_trade_article:
                    # write_test.py에서 복사한 personalTradeDirect 구조 사용
                    post_data["personalTradeDirect"] = {
                        "category1": "50000008",
                        "category2": "50000165",
                        "category3": "50001021",
                        "cost": cost if "cost" in locals() else 111111,
                        "deliveryTypes": ["M"],
                        "productCondition": (
                            product_condition_map[product_condition]
                            if "product_condition" in locals()
                            else "N"
                        ),
                        "tradeRegions": [],
                        "watermark": True,
                        "paymentCorp": "NONE",
                        "npayRemit": True,
                        "quantity": 0,
                        "expireDate": "Invalid date",
                        "allowedPayments": [],
                        "menuId": menu_id,
                        "title": title,
                        "specification": title,
                        "imgUrl": "https://cafeptthumb-phinf.pstatic.net/MjAyNTA2MTFfMjg2/MDAxNzQ5NjAzNjYxMjM2.sdpaf6aHqxwfKPYSZrJmrqiUx2IWGOKlLxMKw7WEoU4g.RzuAceYs9aOYwOXZD0G5hYQe9Vc0y5pAszneDwEuJ0kg.PNG/%EC%A0%9C%EB%AA%A9_%EC%97%86%EC%9D%8C2222222222.png?type=w1600",
                        "openPhoneNo": False,
                        "useOtn": False,
                        "channelNo": "",
                        "channelProductNo": "",
                        "storefarmImgUrl": "",
                        "uploadPhoto": {},
                    }

                # 쿠키 가져오기
                cookies_dict = st.session_state.cookies
                account_name = st.session_state.get(
                    "selected_account",
                    st.session_state.get("current_account", "알 수 없음"),
                )

                # API 요청 보내기
                response = requests.post(
                    f"https://apis.naver.com/cafe-web/cafe-editor-api/v2.0/cafes/{cafe_id}/menus/{menu_id}/articles",
                    cookies=cookies_dict,
                    headers=headers,
                    json=post_data,
                )
                # 응답 처리
                if response.status_code == 200:
                    st.success("글이 성공적으로 작성되었습니다!")

                    # 작성된 글 URL 추출 및 표시
                    response_data = response.json()
                    article_id = None
                    article_url = None

                    if (
                        "result" in response_data
                        and "article" in response_data["result"]
                    ):
                        article_id = response_data["result"]["article"]["id"]
                        article_url = f"https://cafe.naver.com/anycafe/{article_id}"
                        st.markdown(f"작성된 글 보기: [링크]({article_url})")

                    # 로그 저장
                    save_log(
                        account=account_name,
                        title=title,
                        success=True,
                        article_id=article_id,
                        url=article_url,
                    )

                    # 폼 내부에서는 버튼을 사용할 수 없으므로 세션 상태에 성공 플래그 저장
                    st.session_state.post_success = True
                    st.session_state.last_post_data = {
                        "title": title,
                        "content": content,
                        "account": account_name,
                    }
                else:
                    st.error(
                        f"글 작성에 실패했습니다. 상태 코드: {response.status_code}"
                    )
                    st.json(response.json())

                    # 실패 로그 저장
                    save_log(account=account_name, title=title, success=False)
            except Exception as e:
                st.error(f"오류 발생: {e}")

                # 예외 발생 로그 저장
                save_log(
                    account=st.session_state.get("current_account", "알 수 없음"),
                    title=title,
                    success=False,
                )

    # 추가 기능
    st.markdown("---")

    # 글 작성 성공 후 계속 반복 기능
    if "post_success" in st.session_state and st.session_state.post_success:
        if "last_post_data" in st.session_state:
            last_post = st.session_state.last_post_data
            st.info(
                f"마지막 게시글: {last_post['title']} (계정: {last_post['account']})"
            )

        if st.button("계속 반복하시겠습니까?"):
            # 동일한 내용으로 다시 글 작성
            st.session_state.post_success = False
            st.experimental_rerun()

    st.subheader("추가 기능")

    # 다른 페이지로 이동
    col1, col2 = st.columns(2)
    with col1:
        if st.button("계정 관리 페이지로 이동"):
            st.switch_page("pages/auth.py")
    with col2:
        if st.button("관리 페이지로 이동"):
            st.switch_page("pages/manage.py")
