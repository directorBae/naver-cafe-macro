import React, { useEffect, useState, useCallback } from "react";
import SmartEditorBox from "../components/smartEditorBox";
import { Task, addTask } from "../utils/dataStorage";

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

// 템플릿(상품) 인터페이스 추가
interface Template {
  id: string;
  timestamp: string;
  url: string;
  requestBody: string;
  userId: string;
  cafeId?: string;
  title?: string;
  content?: string;
}

interface ProductInfo {
  title: string;
  cost: number;
  specification: string;
  subject: string;
  category1?: string;
  category2?: string;
  category3?: string;
  productCondition?: string;
  deliveryTypes?: string[];
  imageUrl?: string;
}

const WritePage: React.FC = () => {
  const [apiKey, setApiKey] = useState<string>("");
  const [isApiKeySet, setIsApiKeySet] = useState<boolean>(false);
  const [prompt, setPrompt] = useState<string>("");
  const [message, setMessage] = useState<string>("");

  // 계정별 글 관리
  const [accounts, setAccounts] = useState<Account[]>([]);

  // 프롬프트 입력 핸들러 - useCallback으로 안정화
  const handlePromptChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      e.preventDefault();
      e.stopPropagation();
      setPrompt(e.target.value);
    },
    []
  );
  const [selectedAccount, setSelectedAccount] = useState<string>("");

  // 로그인된 슬롯 정보
  const [loggedInSlots, setLoggedInSlots] = useState<any[]>([]);

  // 템플릿(상품) 관리
  const [templates, setTemplates] = useState<Template[]>([]);
  const [selectedTemplate, setSelectedTemplate] = useState<string>("");

  // 템플릿(상품) 정보 불러오기 - 선택된 계정에 따라 필터링
  const loadTemplates = useCallback(async () => {
    try {
      let filteredTemplates: Template[] = [];

      if (selectedAccount) {
        // 선택된 계정만의 템플릿 로드
        const slot = loggedInSlots.find((s) => s.userId === selectedAccount);
        if (slot && slot.isLoggedIn) {
          try {
            const userTemplates = await (
              window.electronAPI as any
            )?.loadAccountTemplates(slot.userId);
            if (userTemplates && userTemplates.length > 0) {
              filteredTemplates = userTemplates;
            }
          } catch (error) {
            console.error(`${selectedAccount} 템플릿 로드 실패:`, error);
          }
        }
      } else {
        // 계정이 선택되지 않은 경우 빈 배열로 설정
        filteredTemplates = [];
      }

      setTemplates(filteredTemplates);
      console.log(
        `${selectedAccount ? `계정 ${selectedAccount}의` : "전체"} ${
          filteredTemplates.length
        }개의 템플릿이 로드되었습니다.`
      );
    } catch (error) {
      console.error("템플릿 불러오기 오류:", error);
    }
  }, [loggedInSlots, selectedAccount]);

  const checkApiKey = useCallback(async () => {
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
  }, []);

  const loadLoggedInSlots = useCallback(async () => {
    try {
      const slots = await window.electronAPI?.getLoggedInSlots();
      if (slots) {
        setLoggedInSlots(slots);

        // 각 계정별로 저장된 글 불러오기
        const accountsData: Account[] = [];
        const processedUserIds = new Set<string>(); // 중복 방지용

        for (const slot of slots) {
          if (
            slot.isLoggedIn &&
            slot.userId &&
            !processedUserIds.has(slot.userId)
          ) {
            processedUserIds.add(slot.userId);
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
  }, []);

  useEffect(() => {
    // 환경변수에서 API 키 확인
    checkApiKey();

    // 로그인된 슬롯 정보 불러오기
    loadLoggedInSlots();

    // 입력 필드 안정성을 위한 전역 이벤트 리스너
    const handleGlobalClick = (e: MouseEvent) => {
      // 입력 필드가 아닌 곳을 클릭했을 때 포커스 해제 방지
      const target = e.target as HTMLElement;
      if (target.tagName === "INPUT" || target.tagName === "TEXTAREA") {
        e.stopPropagation();
      }
    };

    const handleGlobalKeyDown = (e: KeyboardEvent) => {
      // Escape 키로 입력 필드 포커스 해제 방지
      if (e.key === "Escape") {
        const activeElement = document.activeElement as HTMLElement;
        if (
          activeElement &&
          (activeElement.tagName === "INPUT" ||
            activeElement.tagName === "TEXTAREA")
        ) {
          e.preventDefault();
        }
      }
    };

    document.addEventListener("click", handleGlobalClick, { capture: true });
    document.addEventListener("keydown", handleGlobalKeyDown, {
      capture: true,
    });

    // 템플릿 캡처 이벤트 리스너 등록
    if (window.electronAPI && "onTemplateCaptured" in window.electronAPI) {
      const handleTemplateCaptured = (data: {
        userId: string;
        templateId: string;
        cafeId?: string;
        timestamp: string;
        success?: boolean;
      }) => {
        console.log("📝 WritePage: 템플릿 캡처됨:", data);

        if (data.success) {
          // 템플릿 캡처 성공 시 템플릿 목록 다시 로드
          setMessage(
            `✅ 새로운 상품이 캡처되었습니다! (사용자: ${data.userId})`
          );
          setTimeout(() => {
            // loadTemplates를 직접 호출하지 말고 상태를 통해 간접 트리거
            setLoggedInSlots((prev) => [...prev]); // 강제 리렌더링으로 템플릿 로드 트리거
            setMessage(""); // 메시지 제거
          }, 2000); // 파일 저장 완료를 위한 약간의 딜레이
        }
      };

      (window.electronAPI as any).onTemplateCaptured(handleTemplateCaptured);

      // 컴포넌트 언마운트 시 리스너 제거
      return () => {
        // 전역 이벤트 리스너 제거
        document.removeEventListener("click", handleGlobalClick, {
          capture: true,
        });
        document.removeEventListener("keydown", handleGlobalKeyDown, {
          capture: true,
        });

        // Electron API 리스너 제거
        if (window.electronAPI && "removeAllListeners" in window.electronAPI) {
          (window.electronAPI as any).removeAllListeners("template-captured");
        }
      };
    }
  }, [checkApiKey, loadLoggedInSlots]); // 안정화된 함수들을 의존성으로 추가

  // 로그인된 슬롯이 변경되면 템플릿 불러오기
  useEffect(() => {
    if (loggedInSlots.length > 0) {
      loadTemplates();
    }
  }, [loggedInSlots, loadTemplates]);

  const handleApiKeySubmit = useCallback(async () => {
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
  }, [apiKey]);

  // 템플릿에서 상품 정보 추출
  const parseProductInfo = (template: Template): ProductInfo | null => {
    try {
      const requestData = JSON.parse(template.requestBody);
      const article = requestData.article;
      const personalTrade = requestData.personalTradeDirect;

      if (!article || !personalTrade) {
        return null;
      }

      return {
        title: personalTrade.title || article.subject || "제목 없음",
        cost: personalTrade.cost || 0,
        specification: personalTrade.specification || "",
        subject: article.subject || "",
        category1: personalTrade.category1,
        category2: personalTrade.category2,
        category3: personalTrade.category3,
        productCondition: personalTrade.productCondition,
        deliveryTypes: personalTrade.deliveryTypes || [],
        imageUrl: personalTrade.imgUrl || "",
      };
    } catch (error) {
      console.error("상품 정보 파싱 오류:", error);
      return null;
    }
  };

  // 작업 만들기 함수
  const handleCreateTask = () => {
    if (!prompt.trim()) {
      setMessage("❌ 글 생성 요청을 입력해주세요.");
      return;
    }

    if (!selectedTemplate) {
      setMessage("❌ 상품을 먼저 선택해주세요.");
      return;
    }

    if (!selectedAccount) {
      setMessage("❌ 계정을 선택해주세요.");
      return;
    }

    try {
      const selectedTemplateData = templates.find(
        (t) => t.id === selectedTemplate
      );
      if (!selectedTemplateData) {
        setMessage("❌ 선택된 상품을 찾을 수 없습니다.");
        return;
      }

      const productInfo = parseProductInfo(selectedTemplateData);
      if (!productInfo) {
        setMessage("❌ 상품 정보를 파싱할 수 없습니다.");
        return;
      }

      const newTask: Task = {
        id: `task_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        title: `${productInfo.title} - ${prompt}`,
        prompt: prompt,
        accountId: selectedAccount,
        cafeId: selectedTemplateData.cafeId || "",
        templateId: selectedTemplate,
        status: "pending",
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };

      addTask(newTask);
      setMessage(`✅ 작업이 생성되었습니다: ${newTask.title}`);

      // 폼 초기화
      setPrompt("");
      setSelectedTemplate("");
      setSelectedAccount("");
    } catch (error) {
      console.error("작업 생성 오류:", error);
      setMessage("❌ 작업 생성 중 오류가 발생했습니다.");
    }
  };

  return (
    <div style={{ padding: "20px", fontFamily: "Arial, sans-serif" }}>
      <h1>✍️ 글 작성 도구</h1>

      {/* 스마트 에디터 섹션 */}
      <div style={{ marginBottom: "30px" }}>
        <SmartEditorBox />
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
          🎯 계정 선택 및 상품 필터링
        </h3>
        <div style={{ display: "flex", alignItems: "center", gap: "15px" }}>
          <label
            style={{ fontSize: "16px", fontWeight: "bold", minWidth: "80px" }}
          >
            계정:
          </label>
          <select
            value={selectedAccount}
            onChange={(e) => {
              setSelectedAccount(e.target.value);
              setSelectedTemplate(""); // 계정 변경 시 선택된 템플릿 초기화
            }}
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
            <option value="">⚠️ 계정을 선택해주세요 (필수)</option>
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
        {!selectedAccount && (
          <div
            style={{
              marginTop: "10px",
              padding: "10px",
              backgroundColor: "#fff3cd",
              borderRadius: "5px",
              border: "1px solid #ffeaa7",
            }}
          >
            <span style={{ color: "#856404", fontWeight: "bold" }}>
              ⚠️ 계정을 선택해야 상품을 보고 작업을 생성할 수 있습니다
            </span>
          </div>
        )}
      </div>

      {/* 상품 목록 섹션 */}
      {selectedAccount ? (
        templates.length > 0 ? (
          <div
            style={{
              marginBottom: "20px",
              padding: "15px",
              backgroundColor: "#e8f5e8",
              borderRadius: "5px",
              border: "2px solid #28a745",
            }}
          >
            <h3>🛍️ 캡처된 상품 목록 ({selectedAccount})</h3>
            <div
              style={{
                display: "grid",
                gridTemplateColumns: "repeat(auto-fill, minmax(300px, 1fr))",
                gap: "15px",
              }}
            >
              {templates.map((template) => {
                const productInfo = parseProductInfo(template);
                if (!productInfo) return null;

                return (
                  <div
                    key={template.id}
                    style={{
                      padding: "15px",
                      backgroundColor:
                        selectedTemplate === template.id ? "#d4edda" : "white",
                      border:
                        selectedTemplate === template.id
                          ? "2px solid #28a745"
                          : "1px solid #ddd",
                      borderRadius: "8px",
                      cursor: "pointer",
                      transition: "all 0.2s ease",
                    }}
                    onClick={() =>
                      setSelectedTemplate(
                        selectedTemplate === template.id ? "" : template.id
                      )
                    }
                  >
                    <h4 style={{ margin: "0 0 10px 0", color: "#2c3e50" }}>
                      {productInfo.title}
                      {selectedTemplate === template.id && (
                        <span
                          style={{
                            fontSize: "12px",
                            color: "#28a745",
                            marginLeft: "10px",
                          }}
                        >
                          ✓ 선택됨
                        </span>
                      )}
                    </h4>
                    <div style={{ marginBottom: "8px" }}>
                      <strong>가격:</strong> {productInfo.cost.toLocaleString()}
                      원
                    </div>
                    {productInfo.specification && (
                      <div style={{ marginBottom: "8px" }}>
                        <strong>상품 설명:</strong> {productInfo.specification}
                      </div>
                    )}
                    <div style={{ fontSize: "12px", color: "#666" }}>
                      캡처일: {new Date(template.timestamp).toLocaleString()}
                    </div>
                    {selectedTemplate === template.id && (
                      <div
                        style={{
                          marginTop: "10px",
                          padding: "10px",
                          backgroundColor: "#f8f9fa",
                          borderRadius: "4px",
                        }}
                      >
                        <div>
                          <strong>카테고리:</strong> {productInfo.category1}{" "}
                          &gt; {productInfo.category2} &gt;{" "}
                          {productInfo.category3}
                        </div>
                        <div>
                          <strong>상품 상태:</strong>{" "}
                          {productInfo.productCondition}
                        </div>
                        {productInfo.deliveryTypes &&
                          productInfo.deliveryTypes.length > 0 && (
                            <div>
                              <strong>배송 방법:</strong>{" "}
                              {productInfo.deliveryTypes.join(", ")}
                            </div>
                          )}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        ) : (
          <div
            style={{
              marginBottom: "20px",
              padding: "20px",
              backgroundColor: "#fff3cd",
              borderRadius: "5px",
              border: "2px solid #ffeaa7",
              textAlign: "center",
            }}
          >
            <h3 style={{ color: "#856404", margin: "0 0 10px 0" }}>
              📦 상품이 없습니다
            </h3>
            <p style={{ color: "#856404", margin: "0" }}>
              선택한 계정 ({selectedAccount})에 캡처된 상품이 없습니다.
            </p>
          </div>
        )
      ) : (
        <div
          style={{
            marginBottom: "20px",
            padding: "20px",
            backgroundColor: "#f8d7da",
            borderRadius: "5px",
            border: "2px solid #f5c6cb",
            textAlign: "center",
          }}
        >
          <h3 style={{ color: "#721c24", margin: "0 0 10px 0" }}>
            ⚠️ 계정을 선택해주세요
          </h3>
          <p style={{ color: "#721c24", margin: "0" }}>
            상품을 보려면 위에서 계정을 먼저 선택해주세요.
          </p>
        </div>
      )}

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

      {/* 작업 생성 섹션 */}
      {selectedAccount && isApiKeySet ? (
        <div
          style={{
            marginBottom: "20px",
            padding: "15px",
            backgroundColor: "#f8f9fa",
            borderRadius: "5px",
            border: "2px solid #28a745",
          }}
        >
          <h3>📋 상품별 작업 생성 ({selectedAccount})</h3>
          {selectedTemplate && (
            <div
              style={{
                marginBottom: "15px",
                padding: "10px",
                backgroundColor: "#e8f5e8",
                borderRadius: "5px",
              }}
            >
              <strong>선택된 상품:</strong>{" "}
              {(() => {
                const template = templates.find(
                  (t) => t.id === selectedTemplate
                );
                const productInfo = template
                  ? parseProductInfo(template)
                  : null;
                return productInfo?.title || "알 수 없음";
              })()}
            </div>
          )}
          <div
            style={{ display: "flex", flexDirection: "column", gap: "10px" }}
          >
            <div style={{ display: "flex", gap: "10px", alignItems: "center" }}>
              <input
                type="text"
                value={prompt}
                onChange={handlePromptChange}
                onKeyDown={(e) => e.stopPropagation()} // 키 이벤트 전파 방지
                placeholder="글 생성 요청을 입력하세요 (예: 요리 레시피 추천)"
                style={{
                  flex: 1,
                  padding: "8px",
                  border: "1px solid #ddd",
                  borderRadius: "4px",
                  outline: "none", // 포커스 아웃라인 제거로 시각적 혼란 방지
                  transition: "border-color 0.2s ease", // 부드러운 전환 효과
                }}
                onFocus={(e) => {
                  e.target.select(); // 포커스 시 전체 선택으로 입력 보장
                  e.target.style.borderColor = "#007bff"; // 포커스 시 파란 테두리
                }}
                onBlur={(e) => {
                  e.target.style.borderColor = "#ddd"; // 포커스 해제 시 기본 테두리
                }}
              />
              <button
                onClick={handleCreateTask}
                disabled={!selectedTemplate}
                style={{
                  padding: "8px 15px",
                  backgroundColor: !selectedTemplate ? "#6c757d" : "#007bff",
                  color: "white",
                  border: "none",
                  borderRadius: "4px",
                  cursor: !selectedTemplate ? "not-allowed" : "pointer",
                }}
              >
                해당 프롬프트로 작업 만들기
              </button>
            </div>
          </div>
        </div>
      ) : (
        <div
          style={{
            marginBottom: "20px",
            padding: "20px",
            backgroundColor: "#f8d7da",
            borderRadius: "5px",
            border: "2px solid #f5c6cb",
            textAlign: "center",
          }}
        >
          <h3 style={{ color: "#721c24", margin: "0 0 10px 0" }}>
            🔑 작업 생성 준비 필요
          </h3>
          <p style={{ color: "#721c24", margin: "0" }}>
            {!selectedAccount && !isApiKeySet
              ? "계정을 선택하고 API 키를 설정해주세요."
              : !selectedAccount
              ? "계정을 선택해주세요."
              : "API 키를 설정해주세요."}
          </p>
        </div>
      )}

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
