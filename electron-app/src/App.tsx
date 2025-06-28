import React from "react";

declare global {
  interface Window {
    electronAPI?: {
      openNaverLogin: () => void;
    };
  }
}

function App() {
  const handleClick = () => {
    window.electronAPI?.openNaverLogin();
  };

  return (
    <div>
      <h1>Electron + React</h1>
      <button onClick={handleClick}>네이버 로그인 창 열기</button>
    </div>
  );
}

export default App;
