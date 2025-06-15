import requests

cookies = {
    'NNB': '4PWVUBGRABEWQ',
    'ASID': '3d4cb8c800000177b99ee78f00000052',
    'NFS': '2',
    'tooltipDisplayed': 'true',
    '_ga_4BKHBFKFK0': 'GS1.1.1727466887.3.1.1727466894.53.0.0',
    '_ga': 'GA1.1.1836398570.1692510395',
    '_ga_EFBDNNF91G': 'GS1.1.1733410490.1.0.1733410493.0.0.0',
    '_ga_3X9JZ731KT': 'GS1.1.1733410493.3.1.1733410530.0.0.0',
    'NaverSuggestUse': 'use%26unuse',
    'nstore_session': 'SWPekx9+qjMiHR4XIai6u3hO',
    'nstore_pagesession': 'i8n3BlqrMJuxKwsM2Gl-283362',
    'ba.uuid': 'e24a9910-5595-4d7e-a456-66a3d4b50d9c',
    '_ga_SQ24F7Q7YW': 'GS1.1.1744465072.2.0.1744465075.0.0.0',
    '_ga_K2ECMCJBFQ': 'GS1.1.1744465072.2.0.1744465075.0.0.0',
    'NAC': '0SWmBkAeh21lA',
    'nid_inf': '2017000806',
    'NID_AUT': 'oHYqsmu2cPVX8g4TvfwfpjwE0bod2TWZMSTM71JsqUtbg1P7IZPPsluDaTrleF/Q',
    'NACT': '1',
    'SRT30': '1749614801',
    'NID_SES': 'AAAByqwAu744U+7E4M58cBsWrsTztJ15LHzMgCDUqPzqRt1ct4zujFPQiajbWNuApltSnmKyPnqYUXXrXZGtpBC/gxxy8cVoVpfgFrPOaufPDrepBBxQHu52FD/JfL6F8v/UMLaUJ6A5LFdO8kJchyujO5cPS59aBoJ9BScuDqgkj6L6afH8EjX7ocDimPyvvJoETLEKEOw3CTvifBa4sTjT4igczhStk/HD8oUws7seaRqvPe/pSp6sen5CeggBpNuNO+u4KjHi6nejnRuHNrGoD512QzGfaKZ1iqyvaTvRld8zBod1fPib4MwdRWCJe2Bo14xBzRXGFSnBopHX3LpzkFRSWQzBsfuZ3vaJxcfgThKn0v49SAU8+v9b8PRzJm/DSdouVssI9Pg1rKCw2AICy1WvNMIvi0JOEYF/zMiUs084HwxArilLVJg7j+6rHlECSgiki+oyxQmF8H94ZtKQRVIMZ/NYG6nvyodjLREMAzzBOirKBbKCy3Ue+D3gViou6M/YNgy/bYKDg/trC4w8H4oHlM9vQlL+Uwu51Bfmy+QgTsr4BLK2lXlspmgTKo/WLTwp2064i2nY6/7JD95edbicbnBEPtHnApeeL3aJQvkd',
    'BUC': 'RslUV7XIgpKyBKSugnujuwKF2pKRGO1x5Eo-QdjG8ec=',
}

headers = {
    'accept': 'application/json, text/plain, */*',
    'accept-language': 'ko-KR,ko;q=0.9,en-US;q=0.8,en;q=0.7,ru;q=0.6,de;q=0.5',
    'content-type': 'application/json',
    'origin': 'https://cafe.naver.com',
    'priority': 'u=1, i',
    'referer': 'https://cafe.naver.com/ca-fe/cafes/27433401/menus/17/articles/write',
    'sec-ch-ua': '"Google Chrome";v="137", "Chromium";v="137", "Not/A)Brand";v="24"',
    'sec-ch-ua-mobile': '?0',
    'sec-ch-ua-platform': '"Windows"',
    'sec-fetch-dest': 'empty',
    'sec-fetch-mode': 'cors',
    'sec-fetch-site': 'same-site',
    'user-agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/137.0.0.0 Safari/537.36',
    'x-cafe-product': 'pc',
    # 'cookie': 'NNB=TZ42OOTXQIFWA; ASID=3d4cb8c800000177b99ee78f00000052; NFS=2; tooltipDisplayed=true; _ga_4BKHBFKFK0=GS1.1.1727466887.3.1.1727466894.53.0.0; _ga=GA1.1.1836398570.1692510395; _ga_EFBDNNF91G=GS1.1.1733410490.1.0.1733410493.0.0.0; _ga_3X9JZ731KT=GS1.1.1733410493.3.1.1733410530.0.0.0; NaverSuggestUse=use%26unuse; nstore_session=SWPekx9+qjMiHR4XIai6u3hO; nstore_pagesession=i8n3BlqrMJuxKwsM2Gl-283362; ba.uuid=e24a9910-5595-4d7e-a456-66a3d4b50d9c; _ga_SQ24F7Q7YW=GS1.1.1744465072.2.0.1744465075.0.0.0; _ga_K2ECMCJBFQ=GS1.1.1744465072.2.0.1744465075.0.0.0; NAC=0SWmBkAeh21lA; nid_inf=2017000806; NID_AUT=ixi3OHUOeAtSzOH6TKiF37CDgdkhsCYQvmIhOOdW8MRYhrrQHIcHp4/ayXccATww; NACT=1; SRT30=1749593615; NID_SES=AAAByqwAu744U+7E4M58cBsWrsTztJ15LHzMgCDUqPzqRt1ct4zujFPQiajbWNuApltSnmKyPnqYUXXrXZGtpBC/gxxy8cVoVpfgFrPOaufPDrepBBxQHu52FD/JfL6F8v/UMLaUJ6A5LFdO8kJchyujO5cPS59aBoJ9BScuDqgkj6L6afH8EjX7ocDimPyvvJoETLEKEOw3CTvifBa4sTjT4igczhStk/HD8oUws7seaRqvPe/pSp6sen5CeggBpNuNO+u4KjHi6nejnRuHNrGoD512QzGfaKZ1iqyvaTvRld8zBod1fPib4MwdRWCJe2Bo14xBzRXGFSnBopHX3LpzkFRSWQzBsfuZ3vaJxcfgThKn0v49SAU8+v9b8PRzJm/DSdouVssI9Pg1rKCw2AICy1WvNMIvi0JOEYF/zMiUs084HwxArilLVJg7j+6rHlECSgiki+oyxQmF8H94ZtKQRVIMZ/NYG6nvyodjLREMAzzBOirKBbKCy3Ue+D3gViou6M/YNgy/bYKDg/trC4w8H4oHlM9vQlL+Uwu51Bfmy+QgTsr4BLK2lXlspmgTKo/WLTwp2064i2nY6/7JD95edbicbnBEPtHnApeeL3aJQvkd; BUC=RslUV7XIgpKyBKSugnujuwKF2pKRGO1x5Eo-QdjG8ec=',
}

json_data = {
    'article': {
        'cafeId': '27433401',
        'contentJson': '{"document":{"version":"2.8.8","theme":"default","language":"ko-KR","id":"01JXE7ZVKVR24Y67QXGESWFT5H","components":[{"id":"SE-fb661891-47e4-412d-a1b8-e4840d63a4b4","layout":"default","src":"https://cafeptthumb-phinf.pstatic.net/MjAyNTA2MTFfMjg2/MDAxNzQ5NjAzNjYxMjM2.sdpaf6aHqxwfKPYSZrJmrqiUx2IWGOKlLxMKw7WEoU4g.RzuAceYs9aOYwOXZD0G5hYQe9Vc0y5pAszneDwEuJ0kg.PNG/%EC%A0%9C%EB%AA%A9_%EC%97%86%EC%9D%8C2222222222.png?type=w1600","internalResource":true,"represent":true,"path":"/MjAyNTA2MTFfMjg2/MDAxNzQ5NjAzNjYxMjM2.sdpaf6aHqxwfKPYSZrJmrqiUx2IWGOKlLxMKw7WEoU4g.RzuAceYs9aOYwOXZD0G5hYQe9Vc0y5pAszneDwEuJ0kg.PNG/%EC%A0%9C%EB%AA%A9_%EC%97%86%EC%9D%8C2222222222.png","domain":"https://cafeptthumb-phinf.pstatic.net","fileSize":97742,"width":800,"widthPercentage":0,"height":435,"originalWidth":1906,"originalHeight":1038,"fileName":"제목_없음2222222222.png","caption":null,"format":"normal","displayFormat":"normal","imageLoaded":true,"contentMode":"extend","origin":{"srcFrom":"local","@ctype":"imageOrigin"},"ai":false,"@ctype":"image"},{"id":"SE-493fcbdc-2521-4f9c-8f0b-1e16a1eecfaa","layout":"default","value":[{"id":"SE-44eac156-44b0-41d4-a149-710fe34a9890","nodes":[{"id":"SE-03e99fca-cc27-4453-8e47-55c6776fb90f","value":"","@ctype":"textNode"}],"@ctype":"paragraph"}],"@ctype":"text"}],"di":{"dif":false,"dio":[{"dis":"N","dia":{"t":0,"p":0,"st":1,"sk":0}},{"dis":"N","dia":{"t":0,"p":0,"st":104,"sk":0}}]}},"documentId":""}',
        'from': 'pc',
        'menuId': 17,
        'subject': '1111',
        'tagList': [],
        'editorVersion': 4,
        'parentId': 0,
        'open': True,
        'naverOpen': True,
        'externalOpen': False,
        'enableComment': True,
        'enableScrap': True,
        'enableCopy': True,
        'useAutoSource': False,
        'cclTypes': [],
        'useCcl': False,
    },
    'personalTradeDirect': {
        'category1': '50000008',
        'category2': '50000165',
        'category3': '50001021',
        'cost': 111111,
        'deliveryTypes': [
            'M',
        ],
        'productCondition': 'N',
        'tradeRegions': [],
        'watermark': True,
        'paymentCorp': 'NONE',
        'npayRemit': True,
        'quantity': 0,
        'expireDate': 'Invalid date',
        'allowedPayments': [],
        'menuId': 17,
        'title': '1111',
        'specification': '1111',
        'imgUrl': 'https://cafeptthumb-phinf.pstatic.net/MjAyNTA2MTFfMjg2/MDAxNzQ5NjAzNjYxMjM2.sdpaf6aHqxwfKPYSZrJmrqiUx2IWGOKlLxMKw7WEoU4g.RzuAceYs9aOYwOXZD0G5hYQe9Vc0y5pAszneDwEuJ0kg.PNG/%EC%A0%9C%EB%AA%A9_%EC%97%86%EC%9D%8C2222222222.png?type=w1600',
        'openPhoneNo': False,
        'useOtn': False,
        'channelNo': '',
        'channelProductNo': '',
        'storefarmImgUrl': '',
        'uploadPhoto': {},
    },
    'tradeArticle': True,
}

response = requests.post(
    'https://apis.naver.com/cafe-web/cafe-editor-api/v2.0/cafes/27433401/menus/17/articles',
    cookies=cookies,
    headers=headers,
    json=json_data,
)

print(response.status_code)
print(response.text)

# Note: json_data will not be serialized by requests
# exactly as it was in the original request.
#data = '{"article":{"cafeId":"27433401","contentJson":"{\\"document\\":{\\"version\\":\\"2.8.8\\",\\"theme\\":\\"default\\",\\"language\\":\\"ko-KR\\",\\"id\\":\\"01JXE7ZVKVR24Y67QXGESWFT5H\\",\\"components\\":[{\\"id\\":\\"SE-fb661891-47e4-412d-a1b8-e4840d63a4b4\\",\\"layout\\":\\"default\\",\\"src\\":\\"https://cafeptthumb-phinf.pstatic.net/MjAyNTA2MTFfMjg2/MDAxNzQ5NjAzNjYxMjM2.sdpaf6aHqxwfKPYSZrJmrqiUx2IWGOKlLxMKw7WEoU4g.RzuAceYs9aOYwOXZD0G5hYQe9Vc0y5pAszneDwEuJ0kg.PNG/%EC%A0%9C%EB%AA%A9_%EC%97%86%EC%9D%8C2222222222.png?type=w1600\\",\\"internalResource\\":true,\\"represent\\":true,\\"path\\":\\"/MjAyNTA2MTFfMjg2/MDAxNzQ5NjAzNjYxMjM2.sdpaf6aHqxwfKPYSZrJmrqiUx2IWGOKlLxMKw7WEoU4g.RzuAceYs9aOYwOXZD0G5hYQe9Vc0y5pAszneDwEuJ0kg.PNG/%EC%A0%9C%EB%AA%A9_%EC%97%86%EC%9D%8C2222222222.png\\",\\"domain\\":\\"https://cafeptthumb-phinf.pstatic.net\\",\\"fileSize\\":97742,\\"width\\":800,\\"widthPercentage\\":0,\\"height\\":435,\\"originalWidth\\":1906,\\"originalHeight\\":1038,\\"fileName\\":\\"제목_없음2222222222.png\\",\\"caption\\":null,\\"format\\":\\"normal\\",\\"displayFormat\\":\\"normal\\",\\"imageLoaded\\":true,\\"contentMode\\":\\"extend\\",\\"origin\\":{\\"srcFrom\\":\\"local\\",\\"@ctype\\":\\"imageOrigin\\"},\\"ai\\":false,\\"@ctype\\":\\"image\\"},{\\"id\\":\\"SE-493fcbdc-2521-4f9c-8f0b-1e16a1eecfaa\\",\\"layout\\":\\"default\\",\\"value\\":[{\\"id\\":\\"SE-44eac156-44b0-41d4-a149-710fe34a9890\\",\\"nodes\\":[{\\"id\\":\\"SE-03e99fca-cc27-4453-8e47-55c6776fb90f\\",\\"value\\":\\"\\",\\"@ctype\\":\\"textNode\\"}],\\"@ctype\\":\\"paragraph\\"}],\\"@ctype\\":\\"text\\"}],\\"di\\":{\\"dif\\":false,\\"dio\\":[{\\"dis\\":\\"N\\",\\"dia\\":{\\"t\\":0,\\"p\\":0,\\"st\\":1,\\"sk\\":0}},{\\"dis\\":\\"N\\",\\"dia\\":{\\"t\\":0,\\"p\\":0,\\"st\\":104,\\"sk\\":0}}]}},\\"documentId\\":\\"\\"}","from":"pc","menuId":17,"subject":"1111","tagList":[],"editorVersion":4,"parentId":0,"open":true,"naverOpen":true,"externalOpen":false,"enableComment":true,"enableScrap":true,"enableCopy":true,"useAutoSource":false,"cclTypes":[],"useCcl":false},"personalTradeDirect":{"category1":"50000008","category2":"50000165","category3":"50001021","cost":111111,"deliveryTypes":["M"],"productCondition":"N","tradeRegions":[],"watermark":true,"paymentCorp":"NONE","npayRemit":true,"quantity":0,"expireDate":"Invalid date","allowedPayments":[],"menuId":17,"title":"1111","specification":"1111","imgUrl":"https://cafeptthumb-phinf.pstatic.net/MjAyNTA2MTFfMjg2/MDAxNzQ5NjAzNjYxMjM2.sdpaf6aHqxwfKPYSZrJmrqiUx2IWGOKlLxMKw7WEoU4g.RzuAceYs9aOYwOXZD0G5hYQe9Vc0y5pAszneDwEuJ0kg.PNG/%EC%A0%9C%EB%AA%A9_%EC%97%86%EC%9D%8C2222222222.png?type=w1600","openPhoneNo":false,"useOtn":false,"channelNo":"","channelProductNo":"","storefarmImgUrl":"","uploadPhoto":{}},"tradeArticle":true}'.encode()
#response = requests.post(
#    'https://apis.naver.com/cafe-web/cafe-editor-api/v2.0/cafes/27433401/menus/17/articles',
#    cookies=cookies,
#    headers=headers,
#    data=data,
#)