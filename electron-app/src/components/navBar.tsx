import React from "react";
import { useSessionStore } from "../store/sessionStore";

const NavBar: React.FC = () => {
  const { currentPage, setCurrentPage, completedAccounts } = useSessionStore();

  const navItems = [
    { key: "login" as const, label: "로그인", icon: "🔐" },
    { key: "write" as const, label: "글쓰기", icon: "✍️" },
    { key: "settings" as const, label: "설정", icon: "⚙️" },
  ];

  return (
    <nav style={navBarStyle}>
      <div style={logoStyle}>
        <h2>🍃 네이버 카페 매크로</h2>
      </div>

      <div style={navItemsStyle}>
        {navItems.map((item) => (
          <button
            key={item.key}
            onClick={() => setCurrentPage(item.key)}
            style={{
              ...navButtonStyle,
              ...(currentPage === item.key ? activeNavButtonStyle : {}),
            }}
          >
            <span style={iconStyle}>{item.icon}</span>
            {item.label}
            {item.key === "login" && completedAccounts.length > 0 && (
              <span style={badgeStyle}>{completedAccounts.length}</span>
            )}
          </button>
        ))}
      </div>

      <div style={statusStyle}>
        {completedAccounts.length > 0 && (
          <span style={statusTextStyle}>
            ✅ {completedAccounts.length}개 계정 로그인 완료
          </span>
        )}
      </div>
    </nav>
  );
};

// 스타일 정의
const navBarStyle: React.CSSProperties = {
  display: "flex",
  alignItems: "center",
  justifyContent: "space-between",
  padding: "10px 20px",
  backgroundColor: "#2c3e50",
  color: "white",
  borderBottom: "3px solid #3498db",
  boxShadow: "0 2px 4px rgba(0,0,0,0.1)",
};

const logoStyle: React.CSSProperties = {
  margin: 0,
};

const navItemsStyle: React.CSSProperties = {
  display: "flex",
  gap: "15px",
};

const navButtonStyle: React.CSSProperties = {
  display: "flex",
  alignItems: "center",
  gap: "8px",
  padding: "10px 15px",
  backgroundColor: "transparent",
  color: "white",
  border: "2px solid transparent",
  borderRadius: "8px",
  cursor: "pointer",
  transition: "all 0.3s ease",
  fontSize: "14px",
  fontWeight: "500",
  position: "relative",
};

const activeNavButtonStyle: React.CSSProperties = {
  backgroundColor: "#3498db",
  borderColor: "#3498db",
  boxShadow: "0 2px 8px rgba(52, 152, 219, 0.3)",
};

const iconStyle: React.CSSProperties = {
  fontSize: "16px",
};

const badgeStyle: React.CSSProperties = {
  position: "absolute",
  top: "-5px",
  right: "-5px",
  backgroundColor: "#e74c3c",
  color: "white",
  borderRadius: "50%",
  width: "20px",
  height: "20px",
  fontSize: "12px",
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  fontWeight: "bold",
};

const statusStyle: React.CSSProperties = {
  fontSize: "14px",
};

const statusTextStyle: React.CSSProperties = {
  color: "#2ecc71",
  fontWeight: "500",
};

export default NavBar;
