import React from "react";
import { useSessionStore } from "./store/sessionStore";
import NavBar from "./components/navBar";
import LoginPage from "./pages/loginPage";
import CafesPage from "./pages/cafesPage";
import WritePage from "./pages/writePage";
import TasksPage from "./pages/tasksPage";
import SettingsPage from "./pages/settingsPage";

function App() {
  const { currentPage } = useSessionStore();

  // 현재 페이지에 따라 컴포넌트 렌더링
  const renderCurrentPage = () => {
    switch (currentPage) {
      case "login":
        return <LoginPage />;
      case "cafes":
        return <CafesPage />;
      case "write":
        return <WritePage />;
      case "tasks":
        return <TasksPage />;
      case "settings":
        return <SettingsPage />;
      default:
        return <LoginPage />;
    }
  };

  return (
    <div
      style={{
        fontFamily: "Arial, sans-serif",
        minHeight: "100vh",
        backgroundColor: "#f8f9fa",
      }}
    >
      <NavBar />
      <main>{renderCurrentPage()}</main>
    </div>
  );
}

export default App;
