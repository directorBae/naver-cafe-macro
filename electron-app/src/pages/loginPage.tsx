import React, { useEffect, useState } from "react";

interface SessionData {
  cookies: Record<string, string>;
  localStorage: Record<string, string>;
  sessionStorage: Record<string, string>;
  url: string;
  timestamp: string;
  userId?: string; // 🔍 캡처된 실제 사용자 ID 추가
}

interface LoginSlot {
  id: number;
  isLoggedIn: boolean;
  userId: string;
  sessionKeys: string[];
  timestamp: string;
  sessionData: SessionData | null;
}

declare global {
  interface Window {
    electronAPI?: {
      openNaverLogin: (targetSlotId?: number) => Promise<any>;
      onSessionDataCaptured: (callback: (data: any) => void) => void;
      onSessionCaptureError: (callback: (error: string) => void) => void;
      onLoginWindowClosed: (callback: () => void) => void;
      removeAllListeners: (channel: string) => void;
      getEnvVariable: (key: string) => Promise<string | null>;
      saveAccountPosts: (userId: string, posts: any[]) => Promise<void>;
      loadAccountPosts: (userId: string) => Promise<any[]>;
      getLoggedInSlots: () => Promise<any[]>;
      updateSlot: (slotData: any) => Promise<any>;
      setOpenAIKey: (apiKey: string) => Promise<void>;
      generatePosts: (prompt: string, count: number) => Promise<string[]>;
    };
  }
}

const LoginPage: React.FC = () => {
  const [message, setMessage] = useState<string>("");
  const [currentLoginSlot, setCurrentLoginSlot] = useState<number | null>(null);

  // 사용자 ID 직접 입력 상태
  const [editingUserId, setEditingUserId] = useState<number | null>(null);
  const [tempUserId, setTempUserId] = useState<string>("");

  // 5개 로그인 슬롯 상태
  const [loginSlots, setLoginSlots] = useState<LoginSlot[]>(() =>
    Array.from({ length: 5 }, (_, i) => ({
      id: i + 1,
      isLoggedIn: false,
      userId: "",
      sessionKeys: [],
      timestamp: "",
      sessionData: null,
    }))
  );

  // 저장된 슬롯 데이터 불러오기
  const loadSavedSlots = async () => {
    try {
      const savedSlots = await window.electronAPI?.getLoggedInSlots();
      if (savedSlots && savedSlots.length > 0) {
        console.log("📋 저장된 슬롯 데이터 불러옴:", savedSlots);

        // 슬롯 ID를 1-5 범위로 필터링
        const validSlots = savedSlots.filter(
          (slot: any) => slot.id >= 1 && slot.id <= 5
        );
        console.log("📋 유효한 슬롯 데이터 (1-5):", validSlots);

        // 저장된 슬롯 데이터를 React 상태에 적용
        setLoginSlots((prev) => {
          const updatedSlots = [...prev];

          validSlots.forEach((savedSlot: any) => {
            const slotIndex = updatedSlots.findIndex(
              (slot) => slot.id === savedSlot.id
            );
            if (slotIndex >= 0) {
              updatedSlots[slotIndex] = {
                id: savedSlot.id,
                isLoggedIn: savedSlot.isLoggedIn,
                userId: savedSlot.userId,
                sessionKeys: Object.keys(savedSlot.sessionData?.cookies || {}),
                timestamp: new Date(savedSlot.timestamp).toLocaleString(),
                sessionData: savedSlot.sessionData,
              };
            }
          });

          return updatedSlots;
        });

        setMessage(
          `📋 ${savedSlots.length}개의 저장된 로그인 세션을 불러왔습니다.`
        );
      } else {
        console.log("📋 저장된 슬롯 데이터가 없습니다.");
      }
    } catch (error) {
      console.error("저장된 슬롯 불러오기 오류:", error);
      setMessage("⚠️ 저장된 로그인 정보를 불러오는 중 오류가 발생했습니다.");
    }
  };

  // 슬롯 데이터를 Electron에 저장
  const saveSlotToElectron = async (slotData: LoginSlot) => {
    try {
      const result = await window.electronAPI?.updateSlot({
        id: slotData.id,
        userId: slotData.userId,
        isLoggedIn: slotData.isLoggedIn,
        timestamp: new Date().toISOString(),
        sessionData: slotData.sessionData,
      });

      if (result?.success) {
        console.log(`💾 슬롯 ${slotData.id} 저장 완료`);
      } else {
        console.error("슬롯 저장 실패:", result?.error);
      }
    } catch (error) {
      console.error("슬롯 저장 오류:", error);
    }
  };

  // 컴포넌트 마운트 시 이벤트 리스너 등록 및 저장된 슬롯 데이터 불러오기
  useEffect(() => {
    // 저장된 슬롯 데이터 불러오기
    loadSavedSlots();

    if (window.electronAPI) {
      // 세션 데이터 캡처 이벤트 리스너
      window.electronAPI.onSessionDataCaptured((data: SessionData) => {
        console.log("✅ Session data received:", data);
        console.log("🍪 Cookies details:", data.cookies);
        console.log("📦 Local Storage:", data.localStorage);
        console.log("🗂️ Session Storage:", data.sessionStorage);

        // 세션 검증
        const hasValidSession = validateSessionData(data);
        if (hasValidSession && currentLoginSlot !== null) {
          // 🔍 사용자 ID 추출 (여러 방법 시도)
          let userId = data.userId;

          // 1차: 전달받은 userId 검증
          if (
            !userId ||
            userId === "Unknown User" ||
            userId.startsWith("user_")
          ) {
            console.log(
              "🔍 전달받은 userId가 유효하지 않음. 대체 방법 시도..."
            );

            // 2차: 쿠키에서 추출 시도
            const naverCookies = data.cookies;
            if (naverCookies["NID_SES"] || naverCookies["NID_AUT"]) {
              // 쿠키값에서 사용자 ID 패턴 찾기
              const cookieString = JSON.stringify(naverCookies);
              const userIdMatch = cookieString.match(/[a-zA-Z0-9]{4,20}/g);
              if (userIdMatch) {
                const possibleId = userIdMatch.find(
                  (id) =>
                    id.length >= 4 &&
                    id.length <= 20 &&
                    !/^[0-9]+$/.test(id) && // 순수 숫자는 제외
                    /^[a-zA-Z]/.test(id) // 영문자로 시작
                );
                if (possibleId) {
                  userId = possibleId;
                  console.log("🍪 쿠키에서 추출된 사용자 ID:", userId);
                }
              }
            }

            // 3차: URL에서 추출 시도
            if (
              !userId ||
              userId === "Unknown User" ||
              userId.startsWith("user_")
            ) {
              const urlMatch = data.url.match(/[?&]u=([^&]+)/);
              if (urlMatch) {
                userId = decodeURIComponent(urlMatch[1]);
                console.log("🌐 URL에서 추출된 사용자 ID:", userId);
              }
            }

            // 4차: 최종 폴백 - 슬롯 기반 ID
            if (
              !userId ||
              userId === "Unknown User" ||
              userId.startsWith("user_")
            ) {
              userId = `슬롯${currentLoginSlot}_${Date.now()
                .toString()
                .slice(-6)}`;
              console.log("⚠️ 대체 ID 생성:", userId);
            }
          }

          console.log("👤 최종 사용자 ID:", userId);

          // 로그인 슬롯 업데이트
          const updatedSlot = {
            id: currentLoginSlot,
            isLoggedIn: true,
            userId: userId,
            sessionKeys: Object.keys(data.cookies),
            timestamp: new Date().toLocaleString(),
            sessionData: data,
          };

          setLoginSlots((prev) =>
            prev.map((slot) =>
              slot.id === currentLoginSlot ? updatedSlot : slot
            )
          );

          // Electron에 슬롯 데이터 저장
          saveSlotToElectron(updatedSlot);

          setMessage(
            `🎉 슬롯 ${currentLoginSlot} 로그인 성공! (사용자: ${userId})`
          );
          setCurrentLoginSlot(null);

          console.log(
            `✅ 슬롯 ${currentLoginSlot} 로그인 완료! 사용자: ${userId}`
          );
        } else {
          setMessage("⚠️ 캡처된 세션 데이터가 유효하지 않습니다.");
        }
      });

      // 세션 캡처 오류 이벤트 리스너
      window.electronAPI.onSessionCaptureError((error: string) => {
        console.error("❌ Session capture error:", error);
        setMessage(`❌ 세션 캡처 오류: ${error}`);
        setCurrentLoginSlot(null);
      });

      // 🔄 로그인 창 닫힘 이벤트 리스너
      window.electronAPI.onLoginWindowClosed(() => {
        console.log("🚪 로그인 창이 닫혔습니다. 상태를 초기화합니다.");
        setCurrentLoginSlot(null);
        setMessage("⚠️ 로그인 창이 닫혔습니다.");
      });
    }

    // 컴포넌트 언마운트 시 리스너 제거
    return () => {
      if (window.electronAPI) {
        window.electronAPI.removeAllListeners("session-data-captured");
        window.electronAPI.removeAllListeners("session-capture-error");
        window.electronAPI.removeAllListeners("login-window-closed"); // 🔄 창 닫힘 리스너 제거
      }
    };
  }, [currentLoginSlot]);

  // 세션 데이터 검증 함수
  const validateSessionData = (data: SessionData): boolean => {
    console.log("🔍 세션 데이터 검증 중...");

    // 필수 쿠키 확인
    const requiredCookies = ["NID_AUT", "NID_SES"];
    const hasRequiredCookies = requiredCookies.some((cookieName) =>
      Object.keys(data.cookies).includes(cookieName)
    );

    console.log("🍪 필수 쿠키 확인:", hasRequiredCookies);
    console.log("🍪 전체 쿠키 목록:", Object.keys(data.cookies));

    // URL 확인
    const isNaverDomain = data.url.includes("naver.com");
    console.log("🌐 네이버 도메인 확인:", isNaverDomain, data.url);

    // 쿠키 개수 확인
    const cookieCount = Object.keys(data.cookies).length;
    const hasEnoughCookies = cookieCount > 5;
    console.log("📊 쿠키 개수:", cookieCount, "충분한가?", hasEnoughCookies);

    const isValid = hasRequiredCookies && isNaverDomain && hasEnoughCookies;
    console.log("✅ 최종 검증 결과:", isValid);

    return isValid;
  };

  // 네이버 로그인 창 열기
  const handleOpenNaverLogin = async (slotId: number) => {
    try {
      setCurrentLoginSlot(slotId);
      const result = await window.electronAPI?.openNaverLogin(slotId);
      console.log("Login window result:", result);
      setMessage(
        `🔓 슬롯 ${slotId} 네이버 로그인 창이 열렸습니다. 로그인을 완료해주세요.`
      );
    } catch (error) {
      console.error("Error opening login window:", error);
      setMessage("❌ 로그인 창 열기 실패");
      setCurrentLoginSlot(null);
    }
  };

  // 슬롯 초기화
  const handleResetSlot = async (slotId: number) => {
    const resetSlotData = {
      id: slotId,
      isLoggedIn: false,
      userId: "",
      sessionKeys: [],
      timestamp: "",
      sessionData: null,
    };

    setLoginSlots((prev) =>
      prev.map((slot) => (slot.id === slotId ? resetSlotData : slot))
    );

    // Electron에도 초기화 반영
    try {
      await window.electronAPI?.updateSlot({
        id: slotId,
        userId: "",
        isLoggedIn: false,
        timestamp: new Date().toISOString(),
        sessionData: null,
      });
      console.log(`💾 슬롯 ${slotId} 초기화 저장 완료`);
    } catch (error) {
      console.error("슬롯 초기화 저장 오류:", error);
    }

    setMessage(`🔄 슬롯 ${slotId}이 초기화되었습니다.`);
  };

  // 모든 슬롯 초기화
  const handleResetAll = async () => {
    const resetSlots = loginSlots.map((slot) => ({
      ...slot,
      isLoggedIn: false,
      userId: "",
      sessionKeys: [],
      timestamp: "",
      sessionData: null,
    }));

    setLoginSlots(resetSlots);

    // 모든 슬롯을 Electron에서도 초기화
    try {
      for (const slot of resetSlots) {
        await window.electronAPI?.updateSlot({
          id: slot.id,
          userId: "",
          isLoggedIn: false,
          timestamp: new Date().toISOString(),
          sessionData: null,
        });
      }
      console.log("💾 모든 슬롯 초기화 저장 완료");
    } catch (error) {
      console.error("전체 슬롯 초기화 저장 오류:", error);
    }

    setMessage("🔄 모든 슬롯이 초기화되었습니다.");
  };

  // 사용자 ID 편집 시작
  const handleStartEditUserId = (slotId: number, currentUserId: string) => {
    setEditingUserId(slotId);
    setTempUserId(currentUserId || "");
  };

  // 사용자 ID 편집 취소
  const handleCancelEditUserId = () => {
    setEditingUserId(null);
    setTempUserId("");
  };

  // 사용자 ID 업데이트
  const handleUpdateUserId = async () => {
    if (editingUserId === null) return;

    const newUserId = tempUserId.trim();
    if (!newUserId) {
      alert("사용자 ID를 입력해주세요.");
      return;
    }

    // 상태 업데이트
    setLoginSlots((prev) =>
      prev.map((slot) =>
        slot.id === editingUserId ? { ...slot, userId: newUserId } : slot
      )
    );

    // Electron에 업데이트된 슬롯 저장
    try {
      const updatedSlot = loginSlots.find((slot) => slot.id === editingUserId);
      if (updatedSlot) {
        await window.electronAPI?.updateSlot({
          id: editingUserId,
          userId: newUserId,
          isLoggedIn: updatedSlot.isLoggedIn,
          timestamp: updatedSlot.timestamp || new Date().toISOString(),
          sessionData: updatedSlot.sessionData,
        });
        console.log(
          `💾 슬롯 ${editingUserId} 사용자 ID 업데이트 완료: ${newUserId}`
        );
      }
    } catch (error) {
      console.error("사용자 ID 업데이트 저장 오류:", error);
    }

    setMessage(
      `✅ 슬롯 ${editingUserId}의 사용자 ID가 "${newUserId}"로 업데이트되었습니다.`
    );
    setEditingUserId(null);
    setTempUserId("");
  };

  return (
    <div style={{ padding: "20px", fontFamily: "Arial, sans-serif" }}>
      <h1>🔐 네이버 계정 로그인 (5개 슬롯)</h1>

      {/* 메시지 표시 */}
      {message && (
        <div
          style={{
            padding: "10px",
            margin: "10px 0",
            backgroundColor: message.startsWith("❌") ? "#ffe6e6" : "#e6ffe6",
            border: `1px solid ${
              message.startsWith("❌") ? "#ff9999" : "#99ff99"
            }`,
            borderRadius: "5px",
          }}
        >
          {message}
        </div>
      )}

      {/* 전체 상태 요약 */}
      <div
        style={{
          marginBottom: "20px",
          padding: "15px",
          backgroundColor: "#f8f9fa",
          borderRadius: "5px",
        }}
      >
        <h3>📊 로그인 상태 요약</h3>
        <p>
          <strong>로그인 완료:</strong>{" "}
          {loginSlots.filter((slot) => slot.isLoggedIn).length} / 5개 슬롯
        </p>
        <button
          onClick={handleResetAll}
          style={{
            padding: "8px 15px",
            backgroundColor: "#dc3545",
            color: "white",
            border: "none",
            borderRadius: "5px",
            cursor: "pointer",
          }}
        >
          🔄 모든 슬롯 초기화
        </button>
      </div>

      {/* 로그인 슬롯들 */}
      <div style={{ display: "grid", gap: "15px" }}>
        {loginSlots.map((slot) => (
          <div
            key={slot.id}
            style={{
              padding: "20px",
              border: slot.isLoggedIn ? "2px solid #28a745" : "2px solid #ddd",
              borderRadius: "10px",
              backgroundColor: slot.isLoggedIn ? "#f0fff0" : "#ffffff",
            }}
          >
            <div
              style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
              }}
            >
              {/* 슬롯 정보 */}
              <div style={{ flex: 1 }}>
                <h3>슬롯 {slot.id}</h3>
                <div
                  style={{
                    display: "grid",
                    gridTemplateColumns: "1fr 1fr",
                    gap: "10px",
                    marginTop: "10px",
                  }}
                >
                  <div>
                    <strong>상태:</strong>
                    <span
                      style={{
                        color: slot.isLoggedIn ? "#28a745" : "#6c757d",
                        marginLeft: "8px",
                        fontWeight: "bold",
                      }}
                    >
                      {slot.isLoggedIn ? "✅ 로그인 완료" : "⏳ 대기 중"}
                    </span>
                  </div>
                  <div>
                    <strong>사용자 ID:</strong>
                    {editingUserId === slot.id ? (
                      <div
                        style={{
                          display: "flex",
                          alignItems: "center",
                          gap: "5px",
                          marginTop: "5px",
                        }}
                      >
                        <input
                          type="text"
                          value={tempUserId}
                          onChange={(e) => setTempUserId(e.target.value)}
                          onKeyDown={(e) => {
                            if (e.key === "Enter") {
                              handleUpdateUserId();
                            } else if (e.key === "Escape") {
                              handleCancelEditUserId();
                            }
                          }}
                          style={{
                            padding: "4px 8px",
                            border: "1px solid #007bff",
                            borderRadius: "3px",
                            fontSize: "12px",
                            width: "120px",
                          }}
                          placeholder="사용자 ID 입력"
                          autoFocus
                        />
                        <button
                          onClick={handleUpdateUserId}
                          style={{
                            padding: "4px 8px",
                            backgroundColor: "#28a745",
                            color: "white",
                            border: "none",
                            borderRadius: "3px",
                            cursor: "pointer",
                            fontSize: "11px",
                          }}
                        >
                          ✓
                        </button>
                        <button
                          onClick={handleCancelEditUserId}
                          style={{
                            padding: "4px 8px",
                            backgroundColor: "#dc3545",
                            color: "white",
                            border: "none",
                            borderRadius: "3px",
                            cursor: "pointer",
                            fontSize: "11px",
                          }}
                        >
                          ✗
                        </button>
                      </div>
                    ) : (
                      <span
                        style={{
                          marginLeft: "8px",
                          color: "#007bff",
                          cursor: "pointer",
                          textDecoration: "underline",
                          userSelect: "none",
                        }}
                        onClick={() =>
                          handleStartEditUserId(slot.id, slot.userId)
                        }
                        title="클릭하여 직접 입력"
                      >
                        {slot.userId === "아이디를 직접 입력하세요" ? (
                          <span
                            style={{ color: "#6c757d", fontStyle: "italic" }}
                          >
                            {slot.userId}
                          </span>
                        ) : (
                          slot.userId || "N/A"
                        )}
                      </span>
                    )}
                  </div>
                  <div>
                    <strong>세션 키 개수:</strong>
                    <span style={{ marginLeft: "8px", color: "#17a2b8" }}>
                      {slot.sessionKeys.length}개
                    </span>
                  </div>
                  <div>
                    <strong>로그인 시간:</strong>
                    <span style={{ marginLeft: "8px", fontSize: "12px" }}>
                      {slot.timestamp || "N/A"}
                    </span>
                  </div>
                </div>

                {/* 주요 쿠키 표시 */}
                {slot.sessionData && (
                  <div style={{ marginTop: "10px" }}>
                    <strong>주요 세션 키:</strong>
                    <div
                      style={{
                        display: "flex",
                        flexWrap: "wrap",
                        gap: "5px",
                        marginTop: "5px",
                      }}
                    >
                      {["NID_AUT", "NID_SES", "NID_JKL"].map((cookieName) => (
                        <span
                          key={cookieName}
                          style={{
                            padding: "3px 8px",
                            backgroundColor: slot.sessionData?.cookies[
                              cookieName
                            ]
                              ? "#28a745"
                              : "#dc3545",
                            color: "white",
                            borderRadius: "12px",
                            fontSize: "11px",
                            fontWeight: "bold",
                          }}
                        >
                          {cookieName}{" "}
                          {slot.sessionData?.cookies[cookieName] ? "✓" : "✗"}
                        </span>
                      ))}
                    </div>
                  </div>
                )}
              </div>

              {/* 버튼들 */}
              <div
                style={{
                  display: "flex",
                  flexDirection: "column",
                  gap: "8px",
                  marginLeft: "20px",
                }}
              >
                <button
                  onClick={() => handleOpenNaverLogin(slot.id)}
                  disabled={currentLoginSlot === slot.id}
                  style={{
                    padding: "10px 15px",
                    backgroundColor:
                      currentLoginSlot === slot.id ? "#6c757d" : "#007bff",
                    color: "white",
                    border: "none",
                    borderRadius: "5px",
                    cursor:
                      currentLoginSlot === slot.id ? "not-allowed" : "pointer",
                    fontWeight: "bold",
                    minWidth: "120px",
                  }}
                >
                  {currentLoginSlot === slot.id
                    ? "🔄 로그인 중..."
                    : "🔓 로그인 창 열기"}
                </button>

                {slot.isLoggedIn && (
                  <button
                    onClick={() => handleResetSlot(slot.id)}
                    style={{
                      padding: "8px 15px",
                      backgroundColor: "#dc3545",
                      color: "white",
                      border: "none",
                      borderRadius: "5px",
                      cursor: "pointer",
                      fontSize: "12px",
                      minWidth: "120px",
                    }}
                  >
                    🗑️ 슬롯 초기화
                  </button>
                )}
              </div>
            </div>

            {/* 상세 세션 정보 */}
            {slot.sessionData && (
              <details style={{ marginTop: "15px" }}>
                <summary style={{ cursor: "pointer", fontWeight: "bold" }}>
                  📄 상세 세션 데이터 보기
                </summary>
                <pre
                  style={{
                    backgroundColor: "#f8f9fa",
                    padding: "10px",
                    borderRadius: "3px",
                    fontSize: "11px",
                    overflow: "auto",
                    maxHeight: "200px",
                    marginTop: "10px",
                  }}
                >
                  {JSON.stringify(slot.sessionData, null, 2)}
                </pre>
              </details>
            )}
          </div>
        ))}
      </div>
    </div>
  );
};

export default LoginPage;
