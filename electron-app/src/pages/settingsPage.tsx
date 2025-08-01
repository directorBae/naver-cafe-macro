import React from "react";
import { useSessionStore } from "../store/sessionStore";

const SettingsPage: React.FC = () => {
  const { resetLoginState } = useSessionStore();

  const handleClearAllData = () => {
    if (window.confirm("모든 데이터를 삭제하시겠습니까?")) {
      resetLoginState();
      alert("모든 데이터가 삭제되었습니다.");
    }
  };

  return (
    <div style={{ padding: "20px", fontFamily: "Arial, sans-serif" }}>
      <h1>⚙️ 설정</h1>

      <div
        style={{
          padding: "15px",
          border: "1px solid #ddd",
          borderRadius: "5px",
          marginBottom: "20px",
        }}
      >
        <h3>🗂️ 데이터 관리</h3>
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
