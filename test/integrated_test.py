import os
import time
import json
import subprocess
import requests
from selenium import webdriver
from selenium.webdriver.chrome.options import Options
from selenium.webdriver.common.by import By
from selenium.webdriver.common.keys import Keys

# 계정 정보: 계정 이름과 크롬 프로필 경로 지정
accounts = {
    "acc1": r"C:\Users\Public\chrome_profiles\acc1",
    "acc2": r"C:\Users\Public\chrome_profiles\acc2",
}

# 계정 정보 추가
account_creds = {
    "acc1": {"id": "your_id_1", "pw": "your_pw_1"},
    "acc2": {"id": "your_id_2", "pw": "your_pw_2"},
}

chrome_path = r"C:\Program Files\Google\Chrome\Application\chrome.exe"
write_url = "https://cafe.naver.com/ca-fe/cafes/27433401/menus/17/articles/write"
debug_port_start = 9222

# 1. 크롬 창 열기 (계정별 분리된 프로필로)
for i, (acc_name, profile_path) in enumerate(accounts.items()):
    os.makedirs(profile_path, exist_ok=True)
    subprocess.Popen(
        [
            chrome_path,
            f"--remote-debugging-port={debug_port_start + i}",
            f"--user-data-dir={profile_path}",
            "https://nid.naver.com/nidlogin.login",
        ]
    )
    time.sleep(2)

    port = debug_port_start + i
    options = Options()
    options.debugger_address = f"127.0.0.1:{port}"
    driver = webdriver.Chrome(options=options)

    try:
        id_input = driver.find_element(By.ID, "id")
        pw_input = driver.find_element(By.ID, "pw")
        id_input.clear()
        id_input.send_keys(account_creds[acc_name]["id"])
        pw_input.clear()
        pw_input.send_keys(account_creds[acc_name]["pw"])
    except Exception as e:
        print(f"[{acc_name}] 로그인 자동 입력 실패: {e}")

input("✅ 모든 계정 로그인 후 Enter를 누르세요: ")

# 2. 각 창에서 쿠키를 가져와 requests로 글쓰기 요청
for i, (acc_name, _) in enumerate(accounts.items()):
    port = debug_port_start + i
    options = Options()
    options.debugger_address = f"127.0.0.1:{port}"
    driver = webdriver.Chrome(options=options)

    try:
        driver.get(write_url)
        time.sleep(2)
        cookies = driver.get_cookies()
        driver.quit()

        cookies_dict = {c["name"]: c["value"] for c in cookies}

        headers = {
            "accept": "application/json, text/plain, */*",
            "accept-language": "ko-KR,ko;q=0.9",
            "content-type": "application/json",
            "origin": "https://cafe.naver.com",
            "referer": write_url,
            "user-agent": "Mozilla/5.0",
            "x-cafe-product": "pc",
        }

        # 게시글 데이터 구성
        json_data = {
            "article": {
                "cafeId": "27433401",
                "contentJson": '{"document":{"version":"2.8.8","theme":"default","language":"ko-KR","id":"01JXE7ZVKVR24Y67QXGESWFT5H","components":[{"id":"SE-fb661891-47e4-412d-a1b8-e4840d63a4b4","layout":"default","src":"https://cafeptthumb-phinf.pstatic.net/MjAyNTA2MTFfMjg2/MDAxNzQ5NjAzNjYxMjM2.sdpaf6aHqxwfKPYSZrJmrqiUx2IWGOKlLxMKw7WEoU4g.RzuAceYs9aOYwOXZD0G5hYQe9Vc0y5pAszneDwEuJ0kg.PNG/%EC%A0%9C%EB%AA%A9_%EC%97%86%EC%9D%8C2222222222.png?type=w1600","internalResource":true,"represent":true,"path":"/MjAyNTA2MTFfMjg2/MDAxNzQ5NjAzNjYxMjM2.sdpaf6aHqxwfKPYSZrJmrqiUx2IWGOKlLxMKw7WEoU4g.RzuAceYs9aOYwOXZD0G5hYQe9Vc0y5pAszneDwEuJ0kg.PNG/%EC%A0%9C%EB%AA%A9_%EC%97%86%EC%9D%8C2222222222.png","domain":"https://cafeptthumb-phinf.pstatic.net","fileSize":97742,"width":800,"widthPercentage":0,"height":435,"originalWidth":1906,"originalHeight":1038,"fileName":"제목_없음2222222222.png","caption":null,"format":"normal","displayFormat":"normal","imageLoaded":true,"contentMode":"extend","origin":{"srcFrom":"local","@ctype":"imageOrigin"},"ai":false,"@ctype":"image"},{"id":"SE-493fcbdc-2521-4f9c-8f0b-1e16a1eecfaa","layout":"default","value":[{"id":"SE-44eac156-44b0-41d4-a149-710fe34a9890","nodes":[{"id":"SE-03e99fca-cc27-4453-8e47-55c6776fb90f","value":"","@ctype":"textNode"}],"@ctype":"paragraph"}],"@ctype":"text"}],"di":{"dif":false,"dio":[{"dis":"N","dia":{"t":0,"p":0,"st":1,"sk":0}},{"dis":"N","dia":{"t":0,"p":0,"st":104,"sk":0}}]}},"documentId":""}',
                "from": "pc",
                "menuId": 17,
                "subject": "1111",
                "tagList": [],
                "editorVersion": 4,
                "parentId": 0,
                "open": True,
                "naverOpen": True,
                "externalOpen": False,
                "enableComment": True,
                "enableScrap": True,
                "enableCopy": True,
                "useAutoSource": False,
                "cclTypes": [],
                "useCcl": False,
            },
            "personalTradeDirect": {
                "category1": "50000008",
                "category2": "50000165",
                "category3": "50001021",
                "cost": 111111,
                "deliveryTypes": [
                    "M",
                ],
                "productCondition": "N",
                "tradeRegions": [],
                "watermark": True,
                "paymentCorp": "NONE",
                "npayRemit": True,
                "quantity": 0,
                "expireDate": "Invalid date",
                "allowedPayments": [],
                "menuId": 17,
                "title": "1111",
                "specification": "1111",
                "imgUrl": "https://cafeptthumb-phinf.pstatic.net/MjAyNTA2MTFfMjg2/MDAxNzQ5NjAzNjYxMjM2.sdpaf6aHqxwfKPYSZrJmrqiUx2IWGOKlLxMKw7WEoU4g.RzuAceYs9aOYwOXZD0G5hYQe9Vc0y5pAszneDwEuJ0kg.PNG/%EC%A0%9C%EB%AA%A9_%EC%97%86%EC%9D%8C2222222222.png?type=w1600",
                "openPhoneNo": False,
                "useOtn": False,
                "channelNo": "",
                "channelProductNo": "",
                "storefarmImgUrl": "",
                "uploadPhoto": {},
            },
            "tradeArticle": True,
        }

        response = requests.post(
            f"https://apis.naver.com/cafe-web/cafe-editor-api/v2.0/cafes/27433401/menus/17/articles",
            cookies=cookies_dict,
            headers=headers,
            json=json_data,
        )

        print(f"\n[{acc_name}] 상태코드: {response.status_code}")
        print(f"[{acc_name}] 응답 내용: {response.text}")

    except Exception as e:
        print(f"[{acc_name}] 오류 발생: {e}")
