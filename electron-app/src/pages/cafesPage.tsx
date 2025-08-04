import React, { useState, useEffect } from "react";
import { useSessionStore } from "../store/sessionStore";

interface LoginSlot {
  id: number;
  isLoggedIn: boolean;
  userId: string;
  sessionKeys: string[];
  timestamp: string;
}

const CafesPage: React.FC = () => {
  const { accounts, cafeInfos, setCafeInfo, removeCafeInfo } =
    useSessionStore();
  const [selectedSlot, setSelectedSlot] = useState<string>("");
  const [cafeUrl, setCafeUrl] = useState<string>("");
  const [cafeName, setCafeName] = useState<string>("");
  const [boardName, setBoardName] = useState<string>("");
  const [error, setError] = useState<string>("");
  const [loginSlots, setLoginSlots] = useState<LoginSlot[]>([]);

  // 로그인된 슬롯 정보 가져오기
  const fetchLoggedInSlots = async () => {
    try {
      if (window.electronAPI?.getLoggedInSlots) {
        const slots = await window.electronAPI.getLoggedInSlots();

        // 슬롯 ID를 1-5 범위로 필터링
        const validSlots = (slots || []).filter(
          (slot: LoginSlot) => slot.id >= 1 && slot.id <= 5
        );
        setLoginSlots(validSlots);
      }
    } catch (error) {
      console.error("Error fetching logged in slots:", error);
    }
  };

  useEffect(() => {
    fetchLoggedInSlots();
  }, []);

  // URL에서 카페ID와 게시판ID를 추출하는 함수
  const extractCafeInfo = (url: string) => {
    // https://cafe.naver.com/f-e/cafes/27433401/menus/17?viewType=T 형태의 URL에서
    // 27433401 (카페ID)와 17 (게시판ID) 추출
    const regex = /cafe\.naver\.com\/f-e\/cafes\/(\d+)\/menus\/(\d+)/;
    const match = url.match(regex);

    if (match) {
      return {
        cafeId: match[1],
        boardId: match[2],
      };
    }
    return null;
  };

  // 슬롯 키로부터 표시명을 가져오는 함수
  const getSlotDisplayName = (slotKey: string) => {
    // 기존 accounts에서 찾기
    if (accounts[slotKey]) {
      return `${slotKey} (${accounts[slotKey].id})`;
    }

    // 로그인된 슬롯에서 찾기
    if (slotKey.startsWith("slot-")) {
      const slotId = parseInt(slotKey.replace("slot-", ""));
      const slot = loginSlots.find((s) => s.id === slotId);
      if (slot) {
        return `슬롯 ${slot.id} (${slot.userId})`;
      }
    }

    return `${slotKey} (계정 정보 없음)`;
  };

  const handleAddCafe = () => {
    setError("");

    if (!selectedSlot) {
      setError("슬롯을 선택해주세요.");
      return;
    }

    if (!cafeUrl) {
      setError("카페 URL을 입력해주세요.");
      return;
    }

    const extractedInfo = extractCafeInfo(cafeUrl);
    if (!extractedInfo) {
      setError(
        "올바른 네이버 카페 게시판 URL을 입력해주세요.\n예: https://cafe.naver.com/f-e/cafes/27433401/menus/17?viewType=T"
      );
      return;
    }

    // 카페 정보 저장
    setCafeInfo(selectedSlot, {
      cafeId: extractedInfo.cafeId,
      boardId: extractedInfo.boardId,
      cafeName: cafeName || undefined,
      boardName: boardName || undefined,
    });

    // 입력 필드 초기화
    setCafeUrl("");
    setCafeName("");
    setBoardName("");
    setSelectedSlot("");
  };

  const handleRemoveCafe = (slotName: string) => {
    removeCafeInfo(slotName);
  };

  const slotNames = Object.keys(accounts);

  // 로그인된 슬롯에서 사용 가능한 슬롯 목록 생성
  const availableSlots = loginSlots
    .filter((slot) => slot.isLoggedIn && slot.userId)
    .map((slot) => ({
      key: `slot-${slot.id}`,
      label: `슬롯 ${slot.id} (${slot.userId})`,
      userId: slot.userId,
    }));

  // 기존 accounts와 로그인된 슬롯을 합쳐서 사용
  const allAvailableSlots = [
    ...slotNames.map((name) => ({
      key: name,
      label: `${name} (${accounts[name].id})`,
      userId: accounts[name].id,
    })),
    ...availableSlots,
  ];

  return (
    <div style={containerStyle}>
      <div style={headerStyle}>
        <h1 style={titleStyle}>카페목록관리</h1>
        <p style={descriptionStyle}>
          각 슬롯(계정)마다 네이버 카페 게시판을 지정할 수 있습니다.
        </p>
        <button onClick={fetchLoggedInSlots} style={refreshButtonStyle}>
          🔄 슬롯 정보 새로고침
        </button>
      </div>

      {/* 카페 추가 폼 */}
      <div style={formContainerStyle}>
        <h2 style={sectionTitleStyle}>새 카페 게시판 추가</h2>

        <div style={formGroupStyle}>
          <label style={labelStyle}>슬롯 선택</label>
          <select
            value={selectedSlot}
            onChange={(e) => setSelectedSlot(e.target.value)}
            style={selectStyle}
          >
            <option value="">슬롯을 선택하세요</option>
            {allAvailableSlots.map((slot) => (
              <option key={slot.key} value={slot.key}>
                {slot.label}
              </option>
            ))}
          </select>
        </div>

        <div style={formGroupStyle}>
          <label style={labelStyle}>카페 게시판 URL</label>
          <input
            type="text"
            value={cafeUrl}
            onChange={(e) => setCafeUrl(e.target.value)}
            placeholder="https://cafe.naver.com/f-e/cafes/27433401/menus/17?viewType=T"
            style={inputStyle}
          />
          <small style={helpTextStyle}>
            네이버 카페 게시판 URL을 입력하세요. (cafes/카페ID/menus/게시판ID
            형태)
          </small>
        </div>

        <div style={formGroupStyle}>
          <label style={labelStyle}>카페명 (선택사항)</label>
          <input
            type="text"
            value={cafeName}
            onChange={(e) => setCafeName(e.target.value)}
            placeholder="카페명을 입력하세요"
            style={inputStyle}
          />
        </div>

        <div style={formGroupStyle}>
          <label style={labelStyle}>게시판명 (선택사항)</label>
          <input
            type="text"
            value={boardName}
            onChange={(e) => setBoardName(e.target.value)}
            placeholder="게시판명을 입력하세요"
            style={inputStyle}
          />
        </div>

        {error && (
          <div style={errorStyle}>
            {error.split("\n").map((line, index) => (
              <div key={index}>{line}</div>
            ))}
          </div>
        )}

        <button onClick={handleAddCafe} style={addButtonStyle}>
          카페 게시판 추가
        </button>
      </div>

      {/* 현재 설정된 카페 목록 */}
      <div style={listContainerStyle}>
        <h2 style={sectionTitleStyle}>설정된 카페 게시판</h2>

        {Object.keys(cafeInfos).length === 0 ? (
          <div style={emptyStateStyle}>아직 설정된 카페 게시판이 없습니다.</div>
        ) : (
          <div style={cafeListStyle}>
            {Object.entries(cafeInfos).map(([slotName, cafeInfo]) => (
              <div key={slotName} style={cafeItemStyle}>
                <div style={cafeItemHeaderStyle}>
                  <h3 style={slotNameStyle}>{getSlotDisplayName(slotName)}</h3>
                  <button
                    onClick={() => handleRemoveCafe(slotName)}
                    style={removeButtonStyle}
                  >
                    삭제
                  </button>
                </div>

                <div style={cafeInfoStyle}>
                  <div style={infoItemStyle}>
                    <strong>카페 ID:</strong> {cafeInfo.cafeId}
                  </div>
                  <div style={infoItemStyle}>
                    <strong>게시판 ID:</strong> {cafeInfo.boardId}
                  </div>
                  {cafeInfo.cafeName && (
                    <div style={infoItemStyle}>
                      <strong>카페명:</strong> {cafeInfo.cafeName}
                    </div>
                  )}
                  {cafeInfo.boardName && (
                    <div style={infoItemStyle}>
                      <strong>게시판명:</strong> {cafeInfo.boardName}
                    </div>
                  )}
                  <div style={infoItemStyle}>
                    <strong>URL:</strong>{" "}
                    <a
                      href={`https://cafe.naver.com/f-e/cafes/${cafeInfo.cafeId}/menus/${cafeInfo.boardId}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      style={linkStyle}
                    >
                      카페 게시판 바로가기
                    </a>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

// 스타일 정의
const containerStyle: React.CSSProperties = {
  padding: "20px",
  maxWidth: "900px",
  margin: "0 auto",
  backgroundColor: "#fff",
  minHeight: "calc(100vh - 80px)",
};

const headerStyle: React.CSSProperties = {
  marginBottom: "30px",
  textAlign: "center",
};

const titleStyle: React.CSSProperties = {
  color: "#333",
  marginBottom: "10px",
  fontSize: "2.5rem",
};

const descriptionStyle: React.CSSProperties = {
  color: "#666",
  fontSize: "1.1rem",
};

const formContainerStyle: React.CSSProperties = {
  backgroundColor: "#f8f9fa",
  padding: "25px",
  borderRadius: "10px",
  border: "1px solid #e9ecef",
  marginBottom: "30px",
};

const sectionTitleStyle: React.CSSProperties = {
  color: "#333",
  marginBottom: "20px",
  fontSize: "1.5rem",
};

const formGroupStyle: React.CSSProperties = {
  marginBottom: "20px",
};

const labelStyle: React.CSSProperties = {
  display: "block",
  marginBottom: "8px",
  fontWeight: "bold",
  color: "#333",
};

const inputStyle: React.CSSProperties = {
  width: "100%",
  padding: "12px",
  border: "1px solid #ddd",
  borderRadius: "5px",
  fontSize: "16px",
  boxSizing: "border-box",
};

const selectStyle: React.CSSProperties = {
  width: "100%",
  padding: "12px",
  border: "1px solid #ddd",
  borderRadius: "5px",
  fontSize: "16px",
  backgroundColor: "white",
  boxSizing: "border-box",
};

const helpTextStyle: React.CSSProperties = {
  color: "#666",
  fontSize: "0.9rem",
  marginTop: "5px",
  display: "block",
};

const errorStyle: React.CSSProperties = {
  color: "#dc3545",
  backgroundColor: "#f8d7da",
  border: "1px solid #f5c6cb",
  borderRadius: "5px",
  padding: "10px",
  marginBottom: "15px",
};

const addButtonStyle: React.CSSProperties = {
  backgroundColor: "#28a745",
  color: "white",
  border: "none",
  padding: "12px 25px",
  borderRadius: "5px",
  fontSize: "16px",
  cursor: "pointer",
  fontWeight: "bold",
};

const refreshButtonStyle: React.CSSProperties = {
  backgroundColor: "#007bff",
  color: "white",
  border: "none",
  padding: "8px 16px",
  borderRadius: "5px",
  fontSize: "14px",
  cursor: "pointer",
  marginTop: "10px",
};

const listContainerStyle: React.CSSProperties = {
  backgroundColor: "#f8f9fa",
  padding: "25px",
  borderRadius: "10px",
  border: "1px solid #e9ecef",
};

const emptyStateStyle: React.CSSProperties = {
  textAlign: "center",
  color: "#666",
  padding: "40px",
  fontSize: "1.1rem",
};

const cafeListStyle: React.CSSProperties = {
  display: "flex",
  flexDirection: "column",
  gap: "15px",
};

const cafeItemStyle: React.CSSProperties = {
  backgroundColor: "white",
  padding: "20px",
  borderRadius: "8px",
  border: "1px solid #e9ecef",
  boxShadow: "0 2px 4px rgba(0,0,0,0.1)",
};

const cafeItemHeaderStyle: React.CSSProperties = {
  display: "flex",
  justifyContent: "space-between",
  alignItems: "center",
  marginBottom: "15px",
};

const slotNameStyle: React.CSSProperties = {
  color: "#333",
  margin: "0",
  fontSize: "1.2rem",
};

const removeButtonStyle: React.CSSProperties = {
  backgroundColor: "#dc3545",
  color: "white",
  border: "none",
  padding: "8px 15px",
  borderRadius: "5px",
  cursor: "pointer",
  fontSize: "14px",
};

const cafeInfoStyle: React.CSSProperties = {
  display: "flex",
  flexDirection: "column",
  gap: "8px",
};

const infoItemStyle: React.CSSProperties = {
  fontSize: "14px",
  color: "#555",
};

const linkStyle: React.CSSProperties = {
  color: "#007bff",
  textDecoration: "none",
};

export default CafesPage;
