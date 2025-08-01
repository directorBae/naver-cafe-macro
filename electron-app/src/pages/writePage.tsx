import React, { useEffect, useState } from "react";

interface Post {
  id: string;
  content: string;
  createdAt: string;
  accountId: string;
}

interface Account {
  id: string;
  userId: string;
  posts: Post[];
}

const WritePage: React.FC = () => {
  const [apiKey, setApiKey] = useState<string>("");
  const [isApiKeySet, setIsApiKeySet] = useState<boolean>(false);
  const [prompt, setPrompt] = useState<string>("");
  const [postCount, setPostCount] = useState<number>(1);
  const [isGenerating, setIsGenerating] = useState<boolean>(false);
  const [message, setMessage] = useState<string>("");

  // 계정별 글 관리
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [selectedAccount, setSelectedAccount] = useState<string>("");
  const [generatedPosts, setGeneratedPosts] = useState<string[]>([]);

  // 로그인된 슬롯 정보
  const [loggedInSlots, setLoggedInSlots] = useState<any[]>([]);

  useEffect(() => {
    // 환경변수에서 API 키 확인
    checkApiKey();

    // 로그인된 슬롯 정보 불러오기
    loadLoggedInSlots();
  }, []);

  const checkApiKey = async () => {
    try {
      // 환경변수에서 API 키 확인
      const envApiKey = await window.electronAPI?.getEnvVariable(
        "OPENAI_API_KEY"
      );

      if (envApiKey && envApiKey !== "your_openai_api_key_here") {
        setApiKey(envApiKey);
        setIsApiKeySet(true);

        // Electron 메인 프로세스에 API 키 전달
        if (window.electronAPI?.setOpenAIKey) {
          await window.electronAPI.setOpenAIKey(envApiKey);
        }

        setMessage("✅ 환경변수에서 API 키를 불러왔습니다.");
      } else {
        setMessage("⚠️ API 키를 입력해주세요.");
      }
    } catch (error) {
      setMessage("⚠️ API 키를 입력해주세요.");
    }
  };

  const handleApiKeySubmit = async () => {
    if (!apiKey.trim()) {
      setMessage("❌ API 키를 입력해주세요.");
      return;
    }

    try {
      // Electron 메인 프로세스에 API 키 전달
      if (window.electronAPI?.setOpenAIKey) {
        await window.electronAPI.setOpenAIKey(apiKey);
      }

      setIsApiKeySet(true);
      setMessage("✅ API 키가 설정되었습니다.");
    } catch (error) {
      console.error("API 키 설정 오류:", error);
      setMessage("❌ API 키 설정 중 오류가 발생했습니다.");
    }
  };

  const loadLoggedInSlots = async () => {
    try {
      const slots = await window.electronAPI?.getLoggedInSlots();
      if (slots) {
        setLoggedInSlots(slots);

        // 각 계정별로 저장된 글 불러오기
        const accountsData: Account[] = [];
        for (const slot of slots) {
          if (slot.isLoggedIn && slot.userId) {
            const posts =
              (await window.electronAPI?.loadAccountPosts(slot.userId)) || [];
            accountsData.push({
              id: slot.userId,
              userId: slot.userId,
              posts: posts,
            });
          }
        }
        setAccounts(accountsData);
      }
    } catch (error) {
      console.error("슬롯 불러오기 오류:", error);
    }
  };

  const handleGeneratePosts = async () => {
    if (!prompt.trim()) {
      setMessage("❌ 글 생성 요청을 입력해주세요.");
      return;
    }

    if (!isApiKeySet) {
      setMessage("❌ API 키를 먼저 설정해주세요.");
      return;
    }

    setIsGenerating(true);
    setMessage("🔄 글을 생성 중입니다...");

    try {
      // Electron 메인 프로세스를 통해 OpenAI API 호출
      const posts = await window.electronAPI?.generatePosts(prompt, postCount);

      if (posts && posts.length > 0) {
        setGeneratedPosts(posts);
        setMessage(`✅ ${posts.length}개의 글이 생성되었습니다.`);
      } else {
        setMessage("❌ 글 생성에 실패했습니다. API 키를 확인해주세요.");
      }
    } catch (error) {
      console.error("글 생성 오류:", error);
      setMessage(
        `❌ ${
          error instanceof Error
            ? error.message
            : "글 생성 중 오류가 발생했습니다."
        }`
      );
    } finally {
      setIsGenerating(false);
    }
  };

  const handleSaveAllPosts = async () => {
    if (!selectedAccount) {
      setMessage("❌ 계정을 선택해주세요.");
      return;
    }

    if (generatedPosts.length === 0) {
      setMessage("❌ 저장할 글이 없습니다.");
      return;
    }

    try {
      // 생성된 모든 글을 Post 객체로 변환
      const newPosts = generatedPosts.map((postContent, index) => ({
        id: `post_${Date.now()}_${index}_${Math.random()
          .toString(36)
          .substr(2, 9)}`,
        content: postContent,
        createdAt: new Date().toISOString(),
        accountId: selectedAccount,
      }));

      // 기존 계정 글에 새 글들 추가
      const updatedAccounts = accounts.map((account) =>
        account.id === selectedAccount
          ? { ...account, posts: [...account.posts, ...newPosts] }
          : account
      );

      setAccounts(updatedAccounts);

      // 로컬 저장소에 저장
      const account = updatedAccounts.find((acc) => acc.id === selectedAccount);
      if (account) {
        await window.electronAPI?.saveAccountPosts(
          selectedAccount,
          account.posts
        );
        setMessage(
          `✅ ${generatedPosts.length}개의 글이 ${selectedAccount} 계정에 저장되었습니다.`
        );

        // 저장 완료 후 생성된 글 목록 초기화
        setGeneratedPosts([]);
        setSelectedAccount("");
      }
    } catch (error) {
      console.error("전체 글 저장 오류:", error);
      setMessage("❌ 글 저장 중 오류가 발생했습니다.");
    }
  };

  const handleDeletePost = async (accountId: string, postId: string) => {
    const updatedAccounts = accounts.map((account) =>
      account.id === accountId
        ? {
            ...account,
            posts: account.posts.filter((post) => post.id !== postId),
          }
        : account
    );

    setAccounts(updatedAccounts);

    // 로컬 저장소 업데이트
    try {
      const account = updatedAccounts.find((acc) => acc.id === accountId);
      if (account) {
        await window.electronAPI?.saveAccountPosts(accountId, account.posts);
      }
      setMessage("🗑️ 글이 삭제되었습니다.");
    } catch (error) {
      setMessage("❌ 글 삭제 중 오류가 발생했습니다.");
    }
  };

  return (
    <div style={{ padding: "20px", fontFamily: "Arial, sans-serif" }}>
      <h1>✍️ 글 작성 도구</h1>

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

      {/* API 키 설정 섹션 */}
      <div
        style={{
          marginBottom: "20px",
          padding: "15px",
          backgroundColor: "#f8f9fa",
          borderRadius: "5px",
          border: isApiKeySet ? "2px solid #28a745" : "2px solid #dc3545",
        }}
      >
        <h3>🔑 OpenAI API 키 설정</h3>
        {!isApiKeySet ? (
          <div style={{ display: "flex", gap: "10px", alignItems: "center" }}>
            <input
              type="password"
              value={apiKey}
              onChange={(e) => setApiKey(e.target.value)}
              placeholder="OpenAI API 키를 입력하세요"
              style={{
                flex: 1,
                padding: "8px",
                border: "1px solid #ddd",
                borderRadius: "4px",
              }}
            />
            <button
              onClick={handleApiKeySubmit}
              style={{
                padding: "8px 15px",
                backgroundColor: "#007bff",
                color: "white",
                border: "none",
                borderRadius: "4px",
                cursor: "pointer",
              }}
            >
              설정
            </button>
          </div>
        ) : (
          <div style={{ color: "#28a745", fontWeight: "bold" }}>
            ✅ API 키가 설정되었습니다. (키: {apiKey.substring(0, 7)}***)
          </div>
        )}
      </div>

      {/* 글 생성 섹션 */}
      <div
        style={{
          marginBottom: "20px",
          padding: "15px",
          backgroundColor: "#f8f9fa",
          borderRadius: "5px",
        }}
      >
        <h3>🤖 AI 글 생성</h3>
        <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
          <div style={{ display: "flex", gap: "10px", alignItems: "center" }}>
            <input
              type="text"
              value={prompt}
              onChange={(e) => setPrompt(e.target.value)}
              placeholder="글 생성 요청을 입력하세요 (예: 요리 레시피 추천)"
              style={{
                flex: 1,
                padding: "8px",
                border: "1px solid #ddd",
                borderRadius: "4px",
              }}
              disabled={!isApiKeySet}
            />
            <input
              type="number"
              value={postCount}
              onChange={(e) =>
                setPostCount(
                  Math.max(1, Math.min(30, parseInt(e.target.value) || 1))
                )
              }
              min="1"
              max="30"
              style={{
                width: "60px",
                padding: "8px",
                border: "1px solid #ddd",
                borderRadius: "4px",
              }}
              disabled={!isApiKeySet}
            />
            <button
              onClick={handleGeneratePosts}
              disabled={!isApiKeySet || isGenerating}
              style={{
                padding: "8px 15px",
                backgroundColor: isGenerating ? "#6c757d" : "#28a745",
                color: "white",
                border: "none",
                borderRadius: "4px",
                cursor:
                  !isApiKeySet || isGenerating ? "not-allowed" : "pointer",
              }}
            >
              {isGenerating ? "생성 중..." : "생성"}
            </button>
          </div>
        </div>

        {/* 생성된 글 목록 */}
        {generatedPosts.length > 0 && (
          <div style={{ marginTop: "15px" }}>
            <h4>📝 생성된 글 목록</h4>
            {generatedPosts.map((post, index) => (
              <div
                key={index}
                style={{
                  padding: "10px",
                  margin: "5px 0",
                  backgroundColor: "#ffffff",
                  border: "1px solid #ddd",
                  borderRadius: "4px",
                }}
              >
                <span>{post}</span>
              </div>
            ))}

            {/* 전체 저장 버튼 */}
            <div style={{ marginTop: "15px", textAlign: "center" }}>
              <button
                onClick={handleSaveAllPosts}
                disabled={!selectedAccount || generatedPosts.length === 0}
                style={{
                  padding: "10px 20px",
                  backgroundColor:
                    selectedAccount && generatedPosts.length > 0
                      ? "#28a745"
                      : "#6c757d",
                  color: "white",
                  border: "none",
                  borderRadius: "4px",
                  cursor:
                    selectedAccount && generatedPosts.length > 0
                      ? "pointer"
                      : "not-allowed",
                  fontSize: "14px",
                  fontWeight: "bold",
                }}
              >
                💾 전체 글 저장 ({generatedPosts.length}개)
              </button>
            </div>
          </div>
        )}
      </div>

      {/* 계정 선택 섹션 */}
      <div
        style={{
          marginBottom: "20px",
          padding: "20px",
          backgroundColor: "#f8f9fa",
          borderRadius: "10px",
          border: "2px solid #007bff",
        }}
      >
        <h3
          style={{ margin: "0 0 15px 0", color: "#007bff", fontSize: "18px" }}
        >
          🎯 계정 선택
        </h3>
        <div style={{ display: "flex", alignItems: "center", gap: "15px" }}>
          <label
            style={{ fontSize: "16px", fontWeight: "bold", minWidth: "80px" }}
          >
            계정:
          </label>
          <select
            value={selectedAccount}
            onChange={(e) => setSelectedAccount(e.target.value)}
            style={{
              flex: 1,
              padding: "12px 15px",
              fontSize: "16px",
              border: "2px solid #ddd",
              borderRadius: "8px",
              backgroundColor: "white",
              cursor: "pointer",
              outline: "none",
              transition: "border-color 0.3s",
            }}
            onFocus={(e) => (e.target.style.borderColor = "#007bff")}
            onBlur={(e) => (e.target.style.borderColor = "#ddd")}
          >
            <option value="">📋 저장할 계정을 선택하세요</option>
            {loggedInSlots
              .filter((slot) => slot.isLoggedIn)
              .map((slot) => (
                <option key={slot.id} value={slot.userId}>
                  🔐 슬롯 {slot.id}: {slot.userId}
                </option>
              ))}
          </select>
        </div>
        {selectedAccount && (
          <div
            style={{
              marginTop: "10px",
              padding: "10px",
              backgroundColor: "#e6ffe6",
              borderRadius: "5px",
              border: "1px solid #99ff99",
            }}
          >
            <span style={{ color: "#28a745", fontWeight: "bold" }}>
              ✅ 선택된 계정: {selectedAccount}
            </span>
          </div>
        )}
      </div>

      {/* 계정별 저장된 글 관리 */}
      <div
        style={{
          padding: "15px",
          backgroundColor: "#f8f9fa",
          borderRadius: "5px",
        }}
      >
        <h3>📚 저장된 글 관리</h3>
        {accounts.length === 0 ? (
          <div
            style={{ textAlign: "center", color: "#6c757d", padding: "20px" }}
          >
            로그인된 계정이 없습니다. 먼저 로그인 페이지에서 계정에
            로그인해주세요.
          </div>
        ) : (
          accounts.map((account) => (
            <div
              key={account.id}
              style={{
                marginBottom: "15px",
                padding: "10px",
                backgroundColor: "#ffffff",
                border: "1px solid #ddd",
                borderRadius: "4px",
              }}
            >
              <h4 style={{ margin: "0 0 10px 0", color: "#007bff" }}>
                📱 {account.userId} ({account.posts.length}개 글)
              </h4>
              {account.posts.length === 0 ? (
                <p style={{ color: "#6c757d", margin: 0 }}>
                  저장된 글이 없습니다.
                </p>
              ) : (
                <div
                  style={{
                    display: "flex",
                    flexDirection: "column",
                    gap: "5px",
                  }}
                >
                  {account.posts.map((post) => (
                    <div
                      key={post.id}
                      style={{
                        padding: "8px",
                        backgroundColor: "#f8f9fa",
                        border: "1px solid #e9ecef",
                        borderRadius: "3px",
                        display: "flex",
                        justifyContent: "space-between",
                        alignItems: "center",
                      }}
                    >
                      <div style={{ flex: 1 }}>
                        <div style={{ fontSize: "14px" }}>{post.content}</div>
                        <div style={{ fontSize: "11px", color: "#6c757d" }}>
                          {new Date(post.createdAt).toLocaleString()}
                        </div>
                      </div>
                      <button
                        onClick={() => handleDeletePost(account.id, post.id)}
                        style={{
                          padding: "3px 8px",
                          backgroundColor: "#dc3545",
                          color: "white",
                          border: "none",
                          borderRadius: "3px",
                          cursor: "pointer",
                          fontSize: "11px",
                        }}
                      >
                        삭제
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          ))
        )}
      </div>
    </div>
  );
};

export default WritePage;
