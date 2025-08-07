import React, { useState, useEffect, useCallback } from "react";
import { useSessionStore } from "../store/sessionStore";

interface LoginSlot {
  id: number;
  isLoggedIn: boolean;
  userId: string;
  sessionData: string[];
  timestamp: string;
}

// 아직 사용하지 않는 인터페이스
// interface Template {
//   id: string;
//   title: string;
//   content: string;
//   payload: any;
//   createdAt: string;
//   slotId: string;
//   userId: string;
// }

interface CafeInfo {
  cafeId?: string;
  boardId?: string;
}

const SmartEditorBox: React.FC = () => {
  const { cafeInfos, accountSessions, getAccountSessions } = useSessionStore();
  const [selectedSlot, setSelectedSlot] = useState<string>("");
  const [loginSlots, setLoginSlots] = useState<LoginSlot[]>([]);
  const [isEditorOpen, setIsEditorOpen] = useState<boolean>(false);
  const [openedWindow, setOpenedWindow] = useState<Window | null>(null); // 새 창 참조 저장
  // const [savedTemplates, setSavedTemplates] = useState<Template[]>([]);  // 아직 사용하지 않음
  const [message, setMessage] = useState<string>("");

  // 선택된 슬롯 정보 가져오기
  const getSlotInfo = useCallback(
    (slotKey: string) => {
      if (slotKey.startsWith("slot-")) {
        const slotId = slotKey.replace("slot-", "");
        return loginSlots.find((slot) => slot.id.toString() === slotId);
      }
      return null;
    },
    [loginSlots]
  );

  // 카페 정보 가져오기
  const getCafeInfo = useCallback(
    (slotKey: string): CafeInfo | null => {
      return cafeInfos[slotKey] || null;
    },
    [cafeInfos]
  );

  // 로그인된 슬롯 가져오기
  const fetchLoggedInSlots = useCallback(async () => {
    try {
      console.log("슬롯 정보 요청 중...");

      // electronAPI가 정의되어 있는지 확인
      if (window.electronAPI?.getLoggedInSlots) {
        const slots = await window.electronAPI.getLoggedInSlots();
        console.log("받은 슬롯 정보:", slots);

        // 슬롯 ID를 1-5 범위로 필터링
        const validSlots = (slots || []).filter(
          (slot: LoginSlot) => slot.id >= 1 && slot.id <= 5
        );
        console.log("유효한 슬롯 정보 (1-5):", validSlots);

        setLoginSlots(validSlots);
      } else {
        console.warn(
          "electronAPI를 사용할 수 없습니다. 개발 모드에서 실행 중일 수 있습니다."
        );
        setLoginSlots([]); // 슬롯 정보가 없을 때 빈 배열로 초기화
      }
    } catch (error) {
      console.error("슬롯 정보 가져오기 실패:", error);
      setMessage("슬롯 정보를 가져오는데 실패했습니다.");
    }
  }, []);

  // 에디터 수동 닫기 함수
  const closeEditor = () => {
    if (openedWindow && !openedWindow.closed) {
      console.log("사용자 요청으로 에디터 창을 닫습니다.");
      openedWindow.close();
    }
    setOpenedWindow(null);
    setIsEditorOpen(false);
    setMessage("❌ 스마트 에디터가 닫혔습니다.");
  };

  // 저장된 템플릿 불러오기
  const loadSavedTemplates = useCallback(async () => {
    try {
      // getTemplates API가 아직 구현되지 않았으므로 주석 처리
      // if (window.electronAPI?.getTemplates) {
      //   const templates = await window.electronAPI.getTemplates();
      //   setSavedTemplates(templates);
      // }
      console.log("템플릿 불러오기는 아직 구현되지 않았습니다.");
    } catch (error) {
      console.error("템플릿 불러오기 실패:", error);
    }
  }, []);

  // 세션 정보 생성 스크립트 - 현재 사용하지 않음
  // const generateSessionScript = (slotInfo: LoginSlot | null): string => {
  //   if (!slotInfo) return "";

  //   return `
  //     // 슬롯 ${slotInfo.id} (${slotInfo.userId})의 세션 정보 적용
  //     console.log("세션 데이터 적용 시작...");

  //     // 로컬 스토리지에 세션 키 저장
  //     ${slotInfo.sessionKeys
  //       .map(
  //         (key) =>
  //           `localStorage.setItem('sessionKey_${slotInfo.id}', '${key}');`
  //       )
  //       .join("\n      ")}

  //     // 세션 스토리지에도 저장
  //     ${slotInfo.sessionKeys
  //       .map(
  //         (key) =>
  //           `sessionStorage.setItem('sessionKey_${slotInfo.id}', '${key}');`
  //       )
  //       .join("\n      ")}

  //     // 사용자 ID 저장
  //     localStorage.setItem('currentUserId', '${slotInfo.userId}');
  //     sessionStorage.setItem('currentUserId', '${slotInfo.userId}');

  //     // 로그인 상태 저장
  //     localStorage.setItem('isLoggedIn', 'true');
  //     sessionStorage.setItem('isLoggedIn', 'true');

  //     console.log("세션 데이터 적용 완료");
  //   `;
  // };

  // 세션 정보 디버그
  const showSessionDebugInfo = () => {
    const slotInfo = getSlotInfo(selectedSlot);
    const cafeInfo = getCafeInfo(selectedSlot);
    const allAccountSessions = getAccountSessions();

    console.log("=== 세션 디버그 정보 ===");
    console.log("선택된 슬롯:", selectedSlot);
    console.log("슬롯 정보:", slotInfo);
    console.log("카페 정보:", cafeInfo);
    console.log("전체 카페 정보:", cafeInfos);
    console.log("모든 계정 세션:", allAccountSessions);

    // 현재 선택된 슬롯의 세션 정보
    const currentUserSession = slotInfo
      ? accountSessions[slotInfo.userId]
      : null;
    console.log("현재 사용자 세션:", currentUserSession);

    // 키 매칭 디버그
    console.log("🔍 키 매칭 디버그:");
    console.log("  - slotInfo.userId:", slotInfo?.userId);
    console.log("  - accountSessions의 모든 키:", Object.keys(accountSessions));
    console.log(
      "  - 정확히 매칭되는 키:",
      Object.keys(accountSessions).includes(slotInfo?.userId || "")
    );

    alert(`세션 정보:
        슬롯: ${selectedSlot}
        사용자: ${slotInfo?.userId || "없음"}
        카페 ID: ${cafeInfo?.cafeId || "없음"}
        게시판 ID: ${cafeInfo?.boardId || "없음"}
        쿠키 개수: ${
          currentUserSession
            ? Object.keys(currentUserSession.cookies).length
            : 0
        }
        세션 상태: ${currentUserSession?.status || "없음"}
        
        [디버그]
        accountSessions 키들: ${Object.keys(accountSessions).join(", ")}
        매칭 상태: ${
          Object.keys(accountSessions).includes(slotInfo?.userId || "")
            ? "✅ 매칭됨"
            : "❌ 매칭 안됨"
        }`);
  };

  // 스마트 에디터 열기
  const openSmartEditor = async () => {
    console.log("=== openSmartEditor 함수 시작 ===");

    const slotInfo = getSlotInfo(selectedSlot);
    const cafeInfo = getCafeInfo(selectedSlot);

    console.log("선택된 슬롯:", selectedSlot);
    console.log("슬롯 정보:", slotInfo);
    console.log("카페 정보:", cafeInfo);

    if (!slotInfo) {
      console.error("슬롯 정보가 없습니다.");
      setMessage("슬롯 정보를 찾을 수 없습니다.");
      return;
    }

    if (!cafeInfo || !cafeInfo.cafeId || !cafeInfo.boardId) {
      console.error("카페 정보가 없습니다:", cafeInfo);
      setMessage(
        "카페 정보가 설정되지 않았습니다. 카페목록관리에서 설정해주세요."
      );
      return;
    }

    try {
      console.log("try 블록 진입");
      setIsEditorOpen(true);
      setMessage("스마트 에디터를 여는 중...");

      // 쿠키 데이터 가져오기: 우선 Electron 슬롯 데이터 확인
      console.log("🔍 디버깅 정보:");
      console.log("  - slotInfo:", slotInfo);
      console.log("  - slotInfo.sessionData:", slotInfo.sessionData);

      let cookies: Record<string, string> = {};
      let dataSource = "";

      // 1. Electron 슬롯 데이터에서 쿠키 확인
      if (
        slotInfo.sessionData &&
        typeof slotInfo.sessionData === "object" &&
        "cookies" in slotInfo.sessionData
      ) {
        cookies = (slotInfo.sessionData as any).cookies || {};
        dataSource = "Electron 슬롯 데이터";
        console.log(
          "✅ Electron 슬롯 데이터에서 쿠키 발견:",
          Object.keys(cookies).length,
          "개"
        );
      }

      // 2. 세션 스토어에서 쿠키 확인 (백업)
      if (Object.keys(cookies).length === 0) {
        console.log("  - accountSessions 키들:", Object.keys(accountSessions));
        console.log("  - 전체 accountSessions:", accountSessions);

        const userSession = accountSessions[slotInfo.userId];
        if (
          userSession &&
          userSession.cookies &&
          Object.keys(userSession.cookies).length > 0
        ) {
          cookies = userSession.cookies;
          dataSource = "React 세션 스토어";
          console.log(
            "✅ React 세션 스토어에서 쿠키 발견:",
            Object.keys(cookies).length,
            "개"
          );
        }
      }

      // 3. 대체 방법으로 세션 찾기
      if (Object.keys(cookies).length === 0) {
        console.log("🔍 대체 방법으로 세션 찾기 시도...");
        const allSessions = getAccountSessions();
        console.log("모든 세션:", allSessions);

        const foundSession = allSessions.find(
          (session) =>
            session.accountName === slotInfo.userId ||
            session.accountName.includes(slotInfo.userId) ||
            slotInfo.userId.includes(session.accountName)
        );

        if (foundSession && Object.keys(foundSession.cookies).length > 0) {
          cookies = foundSession.cookies;
          dataSource = "대체 방법으로 찾은 세션";
          console.log("✅ 대체 방법으로 찾은 세션:", foundSession);
        }
      }

      console.log(`📦 최종 쿠키 소스: ${dataSource}`);
      console.log("📦 최종 쿠키 데이터:", cookies);

      if (Object.keys(cookies).length === 0) {
        console.warn(`슬롯 ${slotInfo.userId}에 대한 세션 쿠키가 없습니다.`);
        setMessage("세션 쿠키가 없습니다. 먼저 로그인을 진행해주세요.");
        setIsEditorOpen(false);
        return;
      }

      // 중요한 네이버 쿠키 확인
      const importantCookies = ["NID_AUT", "NID_SES", "NID_JKL"];
      importantCookies.forEach((cookieName) => {
        if (cookies[cookieName]) {
          console.log(
            `✅ ${cookieName}: ${cookies[cookieName].substring(0, 20)}...`
          );
        } else {
          console.warn(`❌ ${cookieName}: 없음`);
        }
      });

      const writeUrl = `https://cafe.naver.com/ca-fe/cafes/${cafeInfo.cafeId}/menus/${cafeInfo.boardId}/articles/write/`;
      console.log("생성된 URL:", writeUrl);

      // Electron API를 통해 브라우저 세션에 쿠키 주입
      console.log("Electron을 통한 쿠키 주입 시작...");

      if (window.electronAPI && "injectCookies" in window.electronAPI) {
        const result = await (window.electronAPI as any).injectCookies(cookies);
        console.log("Electron을 통한 쿠키 주입 결과:", result);

        // 템플릿 캡처 강제 활성화
        if (
          window.electronAPI &&
          "activateTemplateCapture" in window.electronAPI
        ) {
          const captureResult = await (
            window.electronAPI as any
          ).activateTemplateCapture();
          console.log("템플릿 캡처 활성화 결과:", captureResult);
        }
      } else {
        console.warn(
          "Electron API를 사용할 수 없습니다. 브라우저 쿠키로 대체합니다."
        );
        // 개발 모드에서는 기존 방식 사용
        Object.entries(cookies).forEach(([name, value]) => {
          document.cookie = `${name}=${value}; domain=.naver.com; path=/; SameSite=Lax`;
          console.log(
            `브라우저 쿠키 설정: ${name} = ${value.substring(0, 20)}...`
          );
        });
      }

      // 사용자 정보 저장 (디버깅용)
      localStorage.setItem("currentUserId", slotInfo.userId);
      localStorage.setItem("currentSlotId", slotInfo.id.toString());
      localStorage.setItem("isLoggedIn", "true");

      console.log("세션 정보 주입 완료");

      // 잠시 대기 후 새 창에서 카페 글쓰기 페이지 열기
      setTimeout(() => {
        const newWindow = window.open(
          writeUrl,
          "_blank",
          "width=1200,height=800,scrollbars=yes,resizable=yes"
        );

        if (newWindow) {
          // 새 창 참조 저장
          setOpenedWindow(newWindow);

          // Electron에 윈도우 정보 등록
          if (
            window.electronAPI &&
            "registerEditorWindow" in window.electronAPI
          ) {
            (window.electronAPI as any).registerEditorWindow({
              userId: slotInfo.userId,
              cafeId: cafeInfo.cafeId,
              boardId: cafeInfo.boardId,
              url: writeUrl,
              timestamp: new Date().toISOString(),
            });
          }

          // 새 창이 닫혔을 때 상태 초기화
          const checkClosed = setInterval(() => {
            if (newWindow.closed) {
              console.log("새 창이 닫혔습니다.");
              setOpenedWindow(null);
              setIsEditorOpen(false);
              setMessage("✅ 스마트 에디터 창이 닫혔습니다.");
              clearInterval(checkClosed);
            }
          }, 1000);

          console.log("새 창에서 카페 글쓰기 페이지를 열었습니다.");
          setMessage(
            `스마트 에디터가 새 창에서 열렸습니다. (슬롯 ${slotInfo.id}, 사용자: ${slotInfo.userId})`
          );
        } else {
          console.warn("팝업이 차단되었을 수 있습니다.");
          setMessage(
            "팝업이 차단되었을 수 있습니다. 팝업 차단을 해제하고 다시 시도해주세요."
          );
          setIsEditorOpen(false);
        }
      }, 1000); // 1초 대기 (쿠키 설정 시간 확보)
    } catch (error) {
      console.error("스마트 에디터 열기 실패:", error);
      setMessage("스마트 에디터를 여는데 실패했습니다.");
      setIsEditorOpen(false);
    }
  };

  // 컴포넌트 마운트 시 슬롯 정보 로드
  useEffect(() => {
    fetchLoggedInSlots();
    loadSavedTemplates();
  }, [fetchLoggedInSlots, loadSavedTemplates]);

  // 템플릿 캡처 이벤트 리스너 등록 (분리)
  useEffect(() => {
    // 템플릿 캡처 알림 리스너 등록
    if (window.electronAPI && "onTemplateCaptured" in window.electronAPI) {
      const handleTemplateCaptured = (data: {
        userId: string;
        templateId: string;
        cafeId?: string;
        timestamp: string;
        success?: boolean;
        error?: string;
        message?: string;
      }) => {
        console.log("📝 템플릿 캡처됨:", data);

        if (data.success) {
          setMessage(
            `✅ 템플릿이 저장되었습니다! 사용자: ${data.userId}, 카페: ${
              data.cafeId || "알 수 없음"
            }`
          );

          // 템플릿 캡처 성공 시 열린 창 자동으로 닫기
          setOpenedWindow((currentWindow) => {
            if (currentWindow && !currentWindow.closed) {
              console.log("템플릿 캡처 완료로 인해 창을 자동으로 닫습니다.");
              currentWindow.close();
              setIsEditorOpen(false);

              // 성공 메시지에 자동 종료 알림 추가
              setMessage(
                `✅ 템플릿이 저장되어 에디터 창을 자동으로 닫았습니다! 사용자: ${
                  data.userId
                }, 카페: ${data.cafeId || "알 수 없음"}`
              );
              return null;
            }
            return currentWindow;
          });
        } else {
          setMessage(`❌ 템플릿 저장 실패: ${data.error || "알 수 없는 오류"}`);
        }

        // 5초 후 메시지 자동 제거
        setTimeout(() => {
          setMessage("");
        }, 5000);
      };

      (window.electronAPI as any).onTemplateCaptured(handleTemplateCaptured);
    }

    // 에디터 윈도우 닫기 이벤트 리스너 등록
    if (window.electronAPI && "onCloseEditorWindows" in window.electronAPI) {
      const handleCloseEditorWindows = (data: {
        userId: string;
        reason?: string;
        timestamp: string;
        templateId?: string;
      }) => {
        console.log("🔄 에디터 윈도우 닫기 이벤트 수신:", data);

        // 현재 열린 창이 있다면 닫기
        setOpenedWindow((currentWindow) => {
          if (currentWindow && !currentWindow.closed) {
            console.log("Electron 신호로 인해 에디터 창을 닫습니다.");
            currentWindow.close();
            setIsEditorOpen(false);

            if (data.reason === "template-captured") {
              setMessage(
                `✅ 임시저장 완료로 에디터 창이 자동으로 닫혔습니다! (사용자: ${data.userId})`
              );
            } else {
              setMessage("🔄 에디터 창이 닫혔습니다.");
            }

            // 5초 후 메시지 자동 제거
            setTimeout(() => {
              setMessage("");
            }, 5000);

            return null;
          }
          return currentWindow;
        });
      };

      (window.electronAPI as any).onCloseEditorWindows(
        handleCloseEditorWindows
      );
    }

    // 컴포넌트 언마운트 시 리스너 제거
    return () => {
      if (window.electronAPI && "removeAllListeners" in window.electronAPI) {
        (window.electronAPI as any).removeAllListeners("template-captured");
        (window.electronAPI as any).removeAllListeners("close-editor-windows");
      }
    };
  }, []); // 의존성 배열을 빈 배열로 변경하여 한 번만 등록

  // 스타일
  const containerStyle: React.CSSProperties = {
    backgroundColor: "#f8f9fa",
    border: "1px solid #dee2e6",
    borderRadius: "8px",
    padding: "20px",
    margin: "10px 0",
  };

  const selectStyle: React.CSSProperties = {
    width: "100%",
    padding: "8px",
    borderRadius: "4px",
    border: "1px solid #ced4da",
    marginBottom: "10px",
  };

  const buttonStyle: React.CSSProperties = {
    backgroundColor: "#007bff",
    color: "white",
    border: "none",
    padding: "10px 20px",
    borderRadius: "4px",
    cursor: "pointer",
    fontSize: "14px",
    margin: "5px",
  };

  const refreshButtonStyle: React.CSSProperties = {
    ...buttonStyle,
    backgroundColor: "#28a745",
    fontSize: "12px",
    padding: "5px 10px",
  };

  const disabledButtonStyle: React.CSSProperties = {
    ...buttonStyle,
    backgroundColor: "#6c757d",
    cursor: "not-allowed",
  };

  const messageStyle: React.CSSProperties = {
    padding: "10px",
    backgroundColor: "#e9ecef",
    borderRadius: "4px",
    margin: "10px 0",
    fontSize: "14px",
  };

  return (
    <div style={containerStyle}>
      <h3>🚀 스마트 에디터</h3>

      {/* 슬롯 선택 */}
      <div style={{ marginBottom: "15px" }}>
        <label
          htmlFor="slot-select"
          style={{ display: "block", marginBottom: "5px", fontWeight: "bold" }}
        >
          슬롯 선택:
        </label>
        <select
          id="slot-select"
          value={selectedSlot}
          onChange={(e) => setSelectedSlot(e.target.value)}
          style={selectStyle}
        >
          <option value="">슬롯을 선택하세요</option>
          {loginSlots.map((slot) => {
            const slotKey = `slot-${slot.id}`;
            const cafeInfo = getCafeInfo(slotKey);
            return (
              <option key={slot.id} value={slotKey}>
                슬롯 {slot.id} - {slot.userId}
                {cafeInfo
                  ? ` (카페: ${cafeInfo.cafeId}, 게시판: ${cafeInfo.boardId})`
                  : " (카페 미설정)"}
              </option>
            );
          })}
        </select>

        <button
          onClick={fetchLoggedInSlots}
          style={refreshButtonStyle}
          disabled={isEditorOpen}
        >
          🔄 슬롯 정보 새로고침
        </button>

        {selectedSlot && (
          <button
            onClick={showSessionDebugInfo}
            style={{
              ...refreshButtonStyle,
              marginLeft: "10px",
              backgroundColor: "#6c757d",
            }}
          >
            🔍 세션 정보 확인
          </button>
        )}
      </div>

      {/* 에디터 열기 버튼 */}
      <div style={{ marginBottom: "15px" }}>
        <button
          onClick={openSmartEditor}
          style={
            selectedSlot && !isEditorOpen ? buttonStyle : disabledButtonStyle
          }
          disabled={!selectedSlot || isEditorOpen}
        >
          {isEditorOpen ? "⏳ 에디터 실행 중..." : "📝 스마트 에디터 열기"}
        </button>

        {isEditorOpen && (
          <button
            onClick={closeEditor}
            style={{
              ...buttonStyle,
              backgroundColor: "#dc3545",
              marginLeft: "10px",
            }}
          >
            ❌ 에디터 닫기
          </button>
        )}
      </div>

      {/* 상태 메시지 */}
      {message && <div style={messageStyle}>{message}</div>}

      {/* 슬롯 상태 표시 */}
      {selectedSlot && (
        <div style={{ marginTop: "15px" }}>
          <h4>선택된 슬롯 정보:</h4>
          {(() => {
            const slotInfo = getSlotInfo(selectedSlot);
            const cafeInfo = getCafeInfo(selectedSlot);
            return (
              <div style={{ fontSize: "14px", color: "#495057" }}>
                <p>
                  <strong>슬롯 ID:</strong> {slotInfo?.id}
                </p>
                <p>
                  <strong>사용자:</strong> {slotInfo?.userId}
                </p>
                <p>
                  <strong>로그인 상태:</strong>{" "}
                  {slotInfo?.isLoggedIn ? "✅ 로그인됨" : "❌ 로그아웃됨"}
                </p>
                <p>
                  <strong>카페 ID:</strong> {cafeInfo?.cafeId || "❌ 미설정"}
                </p>
                <p>
                  <strong>게시판 ID:</strong> {cafeInfo?.boardId || "❌ 미설정"}
                </p>
                <p>
                  <strong>마지막 업데이트:</strong>{" "}
                  {slotInfo?.timestamp
                    ? new Date(slotInfo.timestamp).toLocaleString()
                    : "없음"}
                </p>
              </div>
            );
          })()}
        </div>
      )}

      {/* 세션 스토어 정보 표시 */}
      <div style={{ marginTop: "20px" }}>
        <h4>🗄️ 세션 스토어 정보:</h4>
        {(() => {
          const allAccountSessions = getAccountSessions();
          return (
            <div style={{ fontSize: "14px", color: "#495057" }}>
              <p>
                <strong>총 계정 세션 수:</strong> {allAccountSessions.length}
              </p>
              {allAccountSessions.length > 0 && (
                <div style={{ maxHeight: "200px", overflowY: "auto" }}>
                  {allAccountSessions.map((session) => (
                    <div
                      key={session.accountName}
                      style={{
                        padding: "8px",
                        border: "1px solid #dee2e6",
                        borderRadius: "4px",
                        margin: "5px 0",
                        backgroundColor:
                          session.status === "completed"
                            ? "#e7f5e7"
                            : "#fff3cd",
                      }}
                    >
                      <strong>계정:</strong> {session.accountName} <br />
                      <strong>상태:</strong> {session.status} <br />
                      <strong>쿠키 수:</strong>{" "}
                      {Object.keys(session.cookies).length} <br />
                      <strong>타임스탬프:</strong>{" "}
                      {session.timestamp
                        ? new Date(session.timestamp).toLocaleString()
                        : "없음"}
                    </div>
                  ))}
                </div>
              )}
            </div>
          );
        })()}
      </div>

      {/* 저장된 템플릿 목록 - 아직 구현되지 않음 */}
      {/* {savedTemplates.length > 0 && (
        <div style={{ marginTop: "20px" }}>
          <h4>📋 저장된 템플릿:</h4>
          <div style={{ maxHeight: "200px", overflowY: "auto" }}>
            {savedTemplates.map((template) => (
              <div
                key={template.id}
                style={{
                  padding: "8px",
                  border: "1px solid #dee2e6",
                  borderRadius: "4px",
                  margin: "5px 0",
                  backgroundColor: "white",
                }}
              >
                <strong>{template.title}</strong>
                <br />
                <small style={{ color: "#6c757d" }}>
                  슬롯: {template.slotId} | 생성일:{" "}
                  {new Date(template.createdAt).toLocaleDateString()}
                </small>
              </div>
            ))}
          </div>
        </div>
      )} */}
    </div>
  );
};

export default SmartEditorBox;
