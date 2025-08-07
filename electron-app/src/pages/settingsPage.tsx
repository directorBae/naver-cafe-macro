import React, { useState, useEffect } from "react";
import { useSessionStore } from "../store/sessionStore";
import {
  loadSettings,
  saveApiKey,
  saveGlobalPrompt,
  getGlobalPrompt,
} from "../utils/settingsStorage";

const SettingsPage: React.FC = () => {
  const { resetLoginState } = useSessionStore();

  // 설정 상태
  const [apiKey, setApiKey] = useState<string>("");
  const [globalPrompt, setGlobalPrompt] = useState<string>("");
  const [isApiKeySet, setIsApiKeySet] = useState<boolean>(false);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [message, setMessage] = useState<string>("");

  // 컴포넌트 마운트 시 설정 불러오기
  useEffect(() => {
    loadAppSettings();
  }, []);

  const loadAppSettings = async () => {
    try {
      setIsLoading(true);
      const settings = await loadSettings();

      setApiKey(settings.openaiApiKey || "");
      setIsApiKeySet(
        !!settings.openaiApiKey && settings.openaiApiKey.trim() !== ""
      );
      setGlobalPrompt(settings.globalPrompt || "");

      console.log("✅ 설정 불러오기 완료:", {
        hasApiKey: !!settings.openaiApiKey,
        promptLength: settings.globalPrompt?.length || 0,
      });
    } catch (error) {
      console.error("❌ 설정 불러오기 실패:", error);
      setMessage("❌ 설정을 불러오는데 실패했습니다.");
    } finally {
      setIsLoading(false);
    }
  };

  const handleApiKeySubmit = async () => {
    if (!apiKey.trim()) {
      setMessage("❌ API 키를 입력해주세요.");
      return;
    }

    try {
      // 설정 파일에 저장
      await saveApiKey(apiKey);

      // Electron 메인 프로세스에 API 키 전달
      if (window.electronAPI?.setOpenAIKey) {
        await window.electronAPI.setOpenAIKey(apiKey);
      }

      setIsApiKeySet(true);
      setMessage("✅ API 키가 설정되었습니다.");

      // 메시지 3초 후 제거
      setTimeout(() => setMessage(""), 3000);
    } catch (error) {
      console.error("API 키 설정 오류:", error);
      setMessage("❌ API 키 설정 중 오류가 발생했습니다.");
    }
  };

  const handleGlobalPromptSave = async () => {
    if (!globalPrompt.trim()) {
      setMessage("❌ 글로벌 프롬프트를 입력해주세요.");
      return;
    }

    try {
      await saveGlobalPrompt(globalPrompt);
      setMessage("✅ 글로벌 프롬프트가 저장되었습니다.");

      // 메시지 3초 후 제거
      setTimeout(() => setMessage(""), 3000);
    } catch (error) {
      console.error("글로벌 프롬프트 저장 오류:", error);
      setMessage("❌ 글로벌 프롬프트 저장 중 오류가 발생했습니다.");
    }
  };

  const handleResetApiKey = () => {
    if (window.confirm("API 키를 재설정하시겠습니까?")) {
      setApiKey("");
      setIsApiKeySet(false);
      setMessage("🔄 API 키를 다시 입력해주세요.");
    }
  };

  const handleClearAllData = () => {
    if (window.confirm("모든 데이터를 삭제하시겠습니까?")) {
      resetLoginState();
      alert("모든 데이터가 삭제되었습니다.");
    }
  };

  if (isLoading) {
    return (
      <div style={{ padding: "20px", fontFamily: "Arial, sans-serif" }}>
        <h1>⚙️ 설정</h1>
        <div style={{ textAlign: "center", padding: "40px" }}>
          <p>⏳ 설정을 불러오는 중...</p>
        </div>
      </div>
    );
  }

  return (
    <div style={{ padding: "20px", fontFamily: "Arial, sans-serif" }}>
      <h1>⚙️ 설정</h1>

      {/* 메시지 표시 */}
      {message && (
        <div
          style={{
            padding: "10px",
            marginBottom: "20px",
            backgroundColor: message.includes("❌") ? "#ffe6e6" : "#e6ffe6",
            border: `1px solid ${
              message.includes("❌") ? "#ff9999" : "#99ff99"
            }`,
            borderRadius: "5px",
            color: message.includes("❌") ? "#cc0000" : "#006600",
          }}
        >
          {message}
        </div>
      )}

      {/* OpenAI API 키 설정 */}
      <div
        style={{
          padding: "15px",
          border: "1px solid #ddd",
          borderRadius: "5px",
          marginBottom: "20px",
          backgroundColor: isApiKeySet ? "#f0fff0" : "#fff5f5",
        }}
      >
        <h3>🔑 OpenAI API 키 설정</h3>
        <p style={{ fontSize: "14px", color: "#666", marginBottom: "10px" }}>
          글 생성 기능을 사용하기 위해 OpenAI API 키를 설정해주세요.
        </p>

        {!isApiKeySet ? (
          <div style={{ display: "flex", gap: "10px", alignItems: "center" }}>
            <input
              type="password"
              value={apiKey}
              onChange={(e) => setApiKey(e.target.value)}
              placeholder="OpenAI API 키를 입력하세요 (sk-...)"
              style={{
                flex: 1,
                padding: "8px 12px",
                border: "1px solid #ddd",
                borderRadius: "4px",
                fontSize: "14px",
              }}
              onKeyPress={(e) => {
                if (e.key === "Enter") {
                  handleApiKeySubmit();
                }
              }}
            />
            <button
              onClick={handleApiKeySubmit}
              style={{
                padding: "8px 16px",
                backgroundColor: "#007bff",
                color: "white",
                border: "none",
                borderRadius: "4px",
                cursor: "pointer",
                fontSize: "14px",
              }}
            >
              설정
            </button>
          </div>
        ) : (
          <div>
            <div
              style={{
                color: "#28a745",
                fontWeight: "bold",
                marginBottom: "10px",
              }}
            >
              ✅ API 키가 설정되었습니다. (키: {apiKey.substring(0, 7)}***)
            </div>
            <button
              onClick={handleResetApiKey}
              style={{
                padding: "6px 12px",
                backgroundColor: "#6c757d",
                color: "white",
                border: "none",
                borderRadius: "4px",
                cursor: "pointer",
                fontSize: "12px",
              }}
            >
              🔄 재설정
            </button>
          </div>
        )}
      </div>

      {/* 글로벌 프롬프트 설정 */}
      <div
        style={{
          padding: "15px",
          border: "1px solid #ddd",
          borderRadius: "5px",
          marginBottom: "20px",
        }}
      >
        <h3>� 글로벌 프롬프트 설정</h3>
        <p style={{ fontSize: "14px", color: "#666", marginBottom: "10px" }}>
          AI가 글을 생성할 때 사용할 기본 시스템 프롬프트를 설정합니다.
        </p>

        <textarea
          value={globalPrompt}
          onChange={(e) => setGlobalPrompt(e.target.value)}
          placeholder="시스템 프롬프트를 입력하세요..."
          style={{
            width: "100%",
            height: "200px",
            padding: "10px",
            border: "1px solid #ddd",
            borderRadius: "4px",
            fontSize: "14px",
            resize: "vertical",
            marginBottom: "10px",
          }}
        />

        <div style={{ display: "flex", gap: "10px", alignItems: "center" }}>
          <button
            onClick={handleGlobalPromptSave}
            style={{
              padding: "8px 16px",
              backgroundColor: "#28a745",
              color: "white",
              border: "none",
              borderRadius: "4px",
              cursor: "pointer",
              fontSize: "14px",
            }}
          >
            저장
          </button>
          <span style={{ fontSize: "12px", color: "#666" }}>
            글자 수: {globalPrompt.length}
          </span>
        </div>
      </div>

      {/* 데이터 관리 */}
      <div
        style={{
          padding: "15px",
          border: "1px solid #ddd",
          borderRadius: "5px",
          marginBottom: "20px",
        }}
      >
        <h3>�🗂️ 데이터 관리</h3>
        <button
          onClick={handleClearAllData}
          style={{
            padding: "10px 15px",
            backgroundColor: "#dc3545",
            color: "white",
            border: "none",
            borderRadius: "5px",
            cursor: "pointer",
            margin: "5px",
          }}
        >
          🗑️ 모든 데이터 삭제
        </button>
      </div>

      {/* 앱 정보 */}
      <div
        style={{
          padding: "15px",
          border: "1px solid #ddd",
          borderRadius: "5px",
          marginBottom: "20px",
        }}
      >
        <h3>ℹ️ 앱 정보</h3>
        <p>
          <strong>버전:</strong> 1.0.0
        </p>
        <p>
          <strong>개발자:</strong> 네이버 카페 매크로 팀
        </p>
        <p>
          <strong>설명:</strong> 네이버 카페 자동 글쓰기 도구
        </p>
      </div>

      {/* 개발 중 기능 */}
      <div
        style={{
          padding: "15px",
          border: "1px solid #ddd",
          borderRadius: "5px",
        }}
      >
        <h3>🚧 개발 중...</h3>
        <p>추가 설정 기능은 현재 개발 중입니다.</p>
        <ul>
          <li>자동 로그인 설정</li>
          <li>글쓰기 템플릿 관리</li>
          <li>스케줄링 설정</li>
          <li>로그 관리</li>
        </ul>
      </div>
    </div>
  );
};

export default SettingsPage;
