import React, { useEffect, useState } from "react";
import { Task, loadTasks, updateTask, deleteTask } from "../utils/dataStorage";
import { useSessionStore } from "../store/sessionStore";

const TasksPage: React.FC = () => {
  const { cafeInfos } = useSessionStore();
  const [tasks, setTasks] = useState<Task[]>([]);
  const [filter, setFilter] = useState<
    "all" | "pending" | "running" | "completed" | "failed"
  >("all");
  const [selectedAccount, setSelectedAccount] = useState<string>("all");
  const [loggedInSlots, setLoggedInSlots] = useState<any[]>([]);
  const [editingTask, setEditingTask] = useState<string | null>(null);
  const [taskSettings, setTaskSettings] = useState<{
    scheduledTime: string;
    delayBetweenTasks: number;
    articleCount: number;
  }>({
    scheduledTime: "",
    delayBetweenTasks: 5,
    articleCount: 1,
  });

  useEffect(() => {
    console.log("📋 TasksPage 초기화 시작");
    loadTasksFromStorage();
    loadLoggedInSlots();
  }, []);

  useEffect(() => {
    console.log("📊 cafeInfos 상태 변경:", {
      keysCount: Object.keys(cafeInfos).length,
      keys: Object.keys(cafeInfos),
      cafeInfos: cafeInfos,
    });
  }, [cafeInfos]);

  const loadTasksFromStorage = () => {
    const loadedTasks = loadTasks();
    setTasks(loadedTasks);
  };

  const loadLoggedInSlots = async () => {
    try {
      const slots = await window.electronAPI?.getLoggedInSlots();
      if (slots) {
        setLoggedInSlots(slots);
      }
    } catch (error) {
      console.error("슬롯 불러오기 오류:", error);
    }
  };

  // 계정별 게시판 ID 가져오기
  const getBoardIdForAccount = (accountId: string): string => {
    console.log("🔍 게시판 ID 검색 시작:", {
      accountId,
      loggedInSlotsCount: loggedInSlots.length,
      cafeInfosKeys: Object.keys(cafeInfos),
      loggedInSlots: loggedInSlots.map((s) => ({
        id: s.id,
        userId: s.userId,
        isLoggedIn: s.isLoggedIn,
      })),
    });

    // 1. 먼저 로그인된 슬롯에서 해당 계정 찾기
    const slot = loggedInSlots.find(
      (s) => s.userId === accountId && s.isLoggedIn
    );
    console.log("🎯 슬롯 검색 결과:", slot ? `찾음 (slot-${slot.id})` : "없음");

    if (slot) {
      const slotKey = `slot-${slot.id}`;
      console.log(
        "🔑 슬롯 키로 cafeInfos 검색:",
        slotKey,
        "존재:",
        !!cafeInfos[slotKey]
      );
      if (cafeInfos[slotKey]) {
        console.log("✅ 게시판 ID 찾음:", cafeInfos[slotKey].boardId);
        return cafeInfos[slotKey].boardId;
      }
    }

    // 2. 직접 계정명으로 매칭 시도
    console.log(
      "🔑 직접 계정명으로 검색:",
      accountId,
      "존재:",
      !!cafeInfos[accountId]
    );
    if (cafeInfos[accountId]) {
      console.log(
        "✅ 직접 매칭으로 게시판 ID 찾음:",
        cafeInfos[accountId].boardId
      );
      return cafeInfos[accountId].boardId;
    }

    // 3. cafeInfos에서 부분 매칭으로 찾기
    console.log("🔍 부분 매칭 검색 시작...");
    for (const [slotKey, cafeInfo] of Object.entries(cafeInfos)) {
      console.log(
        "🔍 부분 매칭 확인:",
        slotKey,
        "포함:",
        slotKey.includes(accountId)
      );
      if (slotKey.includes(accountId)) {
        console.log("✅ 부분 매칭으로 게시판 ID 찾음:", cafeInfo.boardId);
        return cafeInfo.boardId;
      }
    }

    // 4. 기본값 반환 (없으면 "17")
    console.warn(
      `❌ 계정 ${accountId}에 대한 게시판 ID를 찾을 수 없습니다. 기본값 "17"을 사용합니다.`
    );
    console.log("📊 전체 cafeInfos 상태:", cafeInfos);
    return "17";
  };

  const handleStatusChange = (taskId: string, newStatus: Task["status"]) => {
    updateTask(taskId, { status: newStatus });
    loadTasksFromStorage();
  };

  const handleDeleteTask = (taskId: string) => {
    if (window.confirm("정말로 이 작업을 삭제하시겠습니까?")) {
      deleteTask(taskId);
      loadTasksFromStorage();
    }
  };

  const handleEditTask = (task: Task) => {
    setEditingTask(task.id);

    // 서울 시간대 기준으로 현재 시간 + 1분 설정
    const now = new Date();

    // 서울 시간대(Asia/Seoul)로 현재 시간 가져오기
    const seoulTime = new Date(
      now.toLocaleString("en-US", { timeZone: "Asia/Seoul" })
    );
    seoulTime.setMinutes(seoulTime.getMinutes() + 1);

    // datetime-local input에 사용할 형식으로 변환 (YYYY-MM-DDTHH:MM)
    const year = seoulTime.getFullYear();
    const month = String(seoulTime.getMonth() + 1).padStart(2, "0");
    const day = String(seoulTime.getDate()).padStart(2, "0");
    const hours = String(seoulTime.getHours()).padStart(2, "0");
    const minutes = String(seoulTime.getMinutes()).padStart(2, "0");

    const defaultScheduledTime = `${year}-${month}-${day}T${hours}:${minutes}`;

    setTaskSettings({
      scheduledTime: task.scheduledTime || defaultScheduledTime,
      delayBetweenTasks: task.delayBetweenTasks || 5,
      articleCount: task.articleCount || 1,
    });
  };

  const handleSaveTaskSettings = (taskId: string) => {
    const task = tasks.find((t) => t.id === taskId);
    const boardId = task ? getBoardIdForAccount(task.accountId) : "17";

    updateTask(taskId, {
      scheduledTime: taskSettings.scheduledTime,
      delayBetweenTasks: taskSettings.delayBetweenTasks,
      articleCount: taskSettings.articleCount,
      menuId: boardId, // 계정별 게시판 ID 사용
      updatedAt: new Date().toISOString(),
    });
    setEditingTask(null);
    loadTasksFromStorage();
  };

  const handleStartAutomation = async (task: Task) => {
    console.log("🚀 자동화 시작 요청:", {
      taskId: task.id,
      title: task.title,
      scheduledTime: task.scheduledTime,
      articleCount: task.articleCount,
      currentTime: new Date().toISOString(),
    });

    if (!task.scheduledTime || !task.articleCount) {
      console.error("❌ 필수 설정 누락:", {
        scheduledTime: task.scheduledTime,
        articleCount: task.articleCount,
      });
      // alert를 로그로 변경: 자동화 진행에 방해되지 않도록 함
      console.error("❌ 시작 시간과 글감 수를 설정해주세요.");
      return;
    }

    // menuId가 없으면 계정별 게시판 ID 설정
    if (!task.menuId) {
      console.log("🔧 게시판 ID 설정 중...");
      const boardId = getBoardIdForAccount(task.accountId);
      console.log("🔧 설정된 게시판 ID:", boardId);
      updateTask(task.id, { menuId: boardId });
      task.menuId = boardId;
    }

    // 작업 상태를 running으로 변경
    console.log("🔄 작업 상태를 running으로 변경");
    updateTask(task.id, {
      status: "running",
      updatedAt: new Date().toISOString(),
    });
    loadTasksFromStorage();

    try {
      // 스케줄된 시간까지 대기
      const scheduledTime = new Date(task.scheduledTime).getTime();
      const now = Date.now();

      console.log("⏰ 시간 확인:", {
        scheduledTime: new Date(scheduledTime).toISOString(),
        now: new Date(now).toISOString(),
        scheduledTimeMs: scheduledTime,
        nowMs: now,
        waitTime: scheduledTime - now,
      });

      if (scheduledTime > now) {
        const waitTime = scheduledTime - now;
        console.log(
          `⏰ ${Math.round(waitTime / 1000)}초 후 작업을 시작합니다.`
        );
        setTimeout(() => {
          console.log("⏰ 예약된 시간이 되었습니다. 자동화 실행 시작!");
          executeAutomation(task);
        }, waitTime);
        // alert를 로그로 변경: 사용자 개입 없이 자동화가 진행되도록 함
        console.log(
          `📅 작업 "${task.title}"이 예약되었습니다. ${new Date(
            task.scheduledTime
          ).toLocaleString()}에 시작됩니다.`
        );
      } else {
        // 즉시 실행
        console.log("⚡ 즉시 실행 모드");
        await executeAutomation(task);
      }
    } catch (error) {
      console.error("❌ 자동화 시작 실패:", error);
      updateTask(task.id, {
        status: "failed",
        updatedAt: new Date().toISOString(),
      });
      loadTasksFromStorage();
      // alert를 로그로 변경: 자동화 진행에 방해되지 않도록 함
      console.error("❌ 자동화 시작에 실패했습니다:", error);
    }
  };

  const executeAutomation = async (task: Task) => {
    try {
      console.log("🚀 자동화 실행 시작:", {
        taskId: task.id,
        title: task.title,
        accountId: task.accountId,
        cafeId: task.cafeId,
        menuId: task.menuId,
        templateId: task.templateId,
        articleCount: task.articleCount,
        delayBetweenTasks: task.delayBetweenTasks,
      });

      // 슬롯에서 세션 정보 가져오기 - 향상된 매칭 로직
      console.log(
        "🔍 슬롯 검색 중... 로그인된 슬롯:",
        loggedInSlots.map((s) => ({
          id: s.id,
          userId: s.userId,
          isLoggedIn: s.isLoggedIn,
        }))
      );

      // 1차: 정확한 사용자 ID 매칭
      let slot = loggedInSlots.find(
        (slot) => slot.userId === task.accountId && slot.isLoggedIn
      );

      // 2차: 슬롯 ID로 매칭 시도 (task.accountId가 "slot-1" 형태인 경우)
      if (!slot && task.accountId.startsWith("slot-")) {
        const slotId = parseInt(task.accountId.replace("slot-", ""));
        slot = loggedInSlots.find((s) => s.id === slotId && s.isLoggedIn);
        console.log(`🔄 슬롯 ID ${slotId}로 재검색:`, slot ? "찾음" : "없음");
      }

      // 3차: 모든 로그인된 슬롯에서 사용자 ID 부분 매칭
      if (!slot) {
        slot = loggedInSlots.find(
          (s) =>
            s.isLoggedIn &&
            (s.userId.includes(task.accountId) ||
              task.accountId.includes(s.userId))
        );
        console.log("🔄 부분 매칭으로 재검색:", slot ? "찾음" : "없음");
      }

      console.log(
        "🎯 최종 선택된 슬롯:",
        slot
          ? {
              id: slot.id,
              userId: slot.userId,
              isLoggedIn: slot.isLoggedIn,
              hasCookies: !!slot.cookies,
              hasSessionData: !!slot.sessionData,
              sessionDataKeys: slot.sessionData
                ? Object.keys(slot.sessionData)
                : [],
              cookiesInSessionData: slot.sessionData?.cookies
                ? Object.keys(slot.sessionData.cookies)
                : [],
            }
          : "❌ 슬롯을 찾을 수 없음"
      );

      if (!slot || !slot.isLoggedIn) {
        throw new Error(
          `계정 ${task.accountId}의 로그인된 세션을 찾을 수 없습니다. 먼저 해당 계정으로 로그인해주세요.`
        );
      }

      // 세션 데이터에서 쿠키 추출 - 향상된 추출 로직
      let sessionCookies: Record<string, string> = {};

      // 1순위: slot.sessionData.cookies
      if (
        slot.sessionData?.cookies &&
        Object.keys(slot.sessionData.cookies).length > 0
      ) {
        sessionCookies = slot.sessionData.cookies;
        console.log("🍪 세션 데이터에서 쿠키 추출:", {
          source: "sessionData.cookies",
          cookieCount: Object.keys(sessionCookies).length,
          cookieKeys: Object.keys(sessionCookies),
          hasNID_AUT: !!sessionCookies["NID_AUT"],
          hasNID_SES: !!sessionCookies["NID_SES"],
        });
      }
      // 2순위: slot.cookies (직접)
      else if (slot.cookies && Object.keys(slot.cookies).length > 0) {
        sessionCookies = slot.cookies;
        console.log("🍪 슬롯 직접 쿠키 사용:", {
          source: "slot.cookies",
          cookieCount: Object.keys(sessionCookies).length,
          cookieKeys: Object.keys(sessionCookies),
          hasNID_AUT: !!sessionCookies["NID_AUT"],
          hasNID_SES: !!sessionCookies["NID_SES"],
        });
      }
      // 오류: 쿠키 없음
      else {
        console.error("❌ 사용할 수 있는 쿠키가 없습니다!", {
          slotId: slot.id,
          userId: slot.userId,
          hasSessionData: !!slot.sessionData,
          hasDirectCookies: !!slot.cookies,
          sessionDataStructure: slot.sessionData
            ? Object.keys(slot.sessionData)
            : [],
        });
        throw new Error(
          `계정 ${task.accountId} (슬롯 ${slot.id})의 세션 쿠키가 없습니다. 다시 로그인해주세요.`
        );
      }

      // 필수 쿠키 검증
      const requiredCookies = ["NID_AUT", "NID_SES"];
      const missingCookies = requiredCookies.filter(
        (cookie) => !sessionCookies[cookie]
      );
      if (missingCookies.length > 0) {
        console.warn("⚠️ 필수 쿠키 누락:", missingCookies);
        throw new Error(
          `필수 네이버 쿠키가 누락되었습니다: ${missingCookies.join(
            ", "
          )}. 다시 로그인해주세요.`
        );
      }

      console.log("✅ 세션 쿠키 검증 완료:", {
        accountId: task.accountId,
        slotId: slot.id,
        slotUserId: slot.userId,
        cookieCount: Object.keys(sessionCookies).length,
        hasAllRequiredCookies: requiredCookies.every(
          (cookie) => sessionCookies[cookie]
        ),
      });

      // 템플릿 정보 가져오기 - 정확한 사용자 ID 사용
      console.log(`📋 템플릿 로드 중... (사용자: ${slot.userId})`);
      const templateData = await (
        window.electronAPI as any
      )?.loadAccountTemplates(slot.userId); // task.accountId 대신 slot.userId 사용

      console.log("📋 로드된 템플릿 데이터:", {
        requestedUserId: slot.userId,
        templateCount: templateData?.length || 0,
        templateIds: templateData?.map((t: any) => t.id) || [],
      });

      const template = templateData?.find((t: any) => t.id === task.templateId);
      console.log(
        "🎯 선택된 템플릿:",
        template
          ? {
              id: template.id,
              timestamp: template.timestamp,
              userId: template.userId,
              hasRequestBody: !!template.requestBody,
            }
          : "템플릿을 찾을 수 없음"
      );

      if (!template) {
        throw new Error(
          `템플릿을 찾을 수 없습니다. 템플릿 ID: ${task.templateId}, 사용자: ${slot.userId}`
        );
      }

      // 여러 글감 생성 및 전송
      for (let i = 0; i < (task.articleCount || 1); i++) {
        console.log(
          `📝 글감 ${i + 1}/${task.articleCount} 생성 및 전송 시작...`
        );

        try {
          // OpenAI로 컨텐츠 생성 및 템플릿 수정
          const generated = await generateContent(task.prompt, template);
          console.log(
            "✍️ 컨텐츠 생성 완료:",
            generated.content.substring(0, 100) + "..."
          );

          // 네이버 카페 API 호출
          console.log(
            `🌐 네이버 카페 API 호출 시작 (${i + 1}/${task.articleCount})...`
          );
          const result = await postToNaverCafe(
            task,
            generated.modifiedTemplate,
            generated.content,
            slot,
            sessionCookies
          );
          console.log(`✅ 글감 ${i + 1} 업로드 성공:`, result);
        } catch (articleError) {
          console.error(`❌ 글감 ${i + 1} 처리 실패:`, articleError);
          throw articleError; // 개별 글감 실패 시 전체 중단
        }

        // 딜레이 적용 (마지막 글감이 아닌 경우)
        if (i < (task.articleCount || 1) - 1) {
          const delayMs = (task.delayBetweenTasks || 5) * 60 * 1000;
          console.log(
            `⏰ ${task.delayBetweenTasks}분 대기 시작... (${delayMs}ms)`
          );
          await new Promise((resolve) => setTimeout(resolve, delayMs));
          console.log(`⏰ 대기 완료, 다음 글감 처리 시작...`);
        }
      }

      // 작업 완료 처리
      console.log("🎉 모든 글감 처리 완료! 작업 상태를 완료로 변경합니다.");
      updateTask(task.id, {
        status: "completed",
        updatedAt: new Date().toISOString(),
      });
      loadTasksFromStorage();

      console.log("✅ 자동화 작업 완료:", task.title);
      // alert 제거: 로그로 대체하여 사용자 개입 없이 진행되도록 함
      console.log(`✅ 작업 "${task.title}"이 성공적으로 완료되었습니다.`);
    } catch (error) {
      console.error("❌ 자동화 실행 실패:", error);
      console.error(
        "❌ 오류 상세:",
        error instanceof Error ? error.message : "알 수 없는 오류"
      );

      updateTask(task.id, {
        status: "failed",
        updatedAt: new Date().toISOString(),
      });
      loadTasksFromStorage();

      const errorMessage =
        error instanceof Error ? error.message : String(error);
      // alert를 로그로 변경: 사용자 개입 없이 자동화가 진행되도록 함
      console.error(`❌ 자동화 실행에 실패했습니다: ${errorMessage}`);
    }
  };

  const generateContent = async (prompt: string, template: any) => {
    try {
      console.log("🤖 OpenAI로 글감 생성 시작:", prompt);

      // OpenAI API 호출
      const generatedTexts = await (window.electronAPI as any)?.generatePosts(
        prompt,
        1
      );

      if (!generatedTexts || generatedTexts.length === 0) {
        throw new Error("OpenAI API에서 글감을 생성하지 못했습니다.");
      }

      const generatedContentText = generatedTexts[0];
      console.log(
        "✍️ OpenAI 생성 완료:",
        generatedContentText.substring(0, 100) + "..."
      );

      // 글감에서 제목 추출 (첫 줄이나 첫 문장을 제목으로 사용)
      const contentLines = generatedContentText
        .split("\n")
        .filter((line: string) => line.trim());
      const generatedTitle =
        contentLines[0]?.substring(0, 50) || "자동 생성 제목";

      console.log("📝 생성된 제목:", generatedTitle);
      console.log(
        "📄 생성된 내용:",
        generatedContentText.substring(0, 200) + "..."
      );

      // 템플릿 복사 및 수정
      const modifiedTemplate = JSON.parse(JSON.stringify(template));
      const requestBody = JSON.parse(modifiedTemplate.requestBody);

      // 제목 업데이트 (article.subject와 personalTradeDirect.title, specification)
      requestBody.article.subject = generatedTitle;
      if (requestBody.personalTradeDirect) {
        requestBody.personalTradeDirect.title = generatedTitle;
        requestBody.personalTradeDirect.specification = generatedTitle;
      }

      // document 구조에서 텍스트 컴포넌트 찾아서 교체
      const contentJson = JSON.parse(requestBody.article.contentJson);

      // components 배열에서 text 타입 컴포넌트 찾기
      contentJson.document.components.forEach((component: any) => {
        if (component["@ctype"] === "text" && component.value) {
          // text 컴포넌트의 첫 번째 paragraph의 첫 번째 textNode 교체
          if (
            component.value[0] &&
            component.value[0].nodes &&
            component.value[0].nodes[0]
          ) {
            component.value[0].nodes[0].value = generatedContentText;
            console.log("✅ 텍스트 컴포넌트 교체 완료");
          }
        }
      });

      // 수정된 contentJson을 다시 문자열로 변환
      requestBody.article.contentJson = JSON.stringify(contentJson);

      // 수정된 requestBody를 템플릿에 저장
      modifiedTemplate.requestBody = JSON.stringify(requestBody);

      return {
        content: generatedContentText,
        modifiedTemplate: modifiedTemplate,
      };
    } catch (error) {
      console.error("❌ OpenAI 글감 생성 실패:", error);
      // 실패 시 기본 텍스트 반환
      const fallbackContent = `${prompt}에 대한 자동 생성 컨텐츠입니다.`;
      return {
        content: fallbackContent,
        modifiedTemplate: template,
      };
    }
  };

  const postToNaverCafe = async (
    task: Task,
    template: any,
    content: string,
    slot: any,
    sessionCookies: Record<string, string>
  ) => {
    try {
      console.log("🚀 네이버 카페 API 호출 시작:", {
        taskId: task.id,
        taskAccountId: task.accountId,
        actualSlotUserId: slot.userId,
        cafeId: task.cafeId,
        menuId: task.menuId,
        templateId: task.templateId,
        slotInfo: {
          id: slot.id,
          userId: slot.userId,
          isLoggedIn: slot.isLoggedIn,
          hasCookies: !!slot.cookies,
        },
        sessionCookiesInfo: {
          cookieCount: Object.keys(sessionCookies).length,
          hasRequiredCookies: !!(
            sessionCookies["NID_AUT"] && sessionCookies["NID_SES"]
          ),
          cookieKeys: Object.keys(sessionCookies),
          NID_AUT_preview: sessionCookies["NID_AUT"]?.substring(0, 20) + "...",
          NID_SES_preview: sessionCookies["NID_SES"]?.substring(0, 20) + "...",
        },
      });

      // 세션 매칭 검증
      if (
        task.accountId !== slot.userId &&
        !task.accountId.startsWith("slot-")
      ) {
        console.warn("⚠️ 작업 계정 ID와 슬롯 사용자 ID가 다릅니다:", {
          taskAccountId: task.accountId,
          slotUserId: slot.userId,
          slotId: slot.id,
        });
      }

      // 템플릿에서 상품 정보 파싱
      const templateBody = JSON.parse(template.requestBody);
      console.log("📝 템플릿 파싱 완료:", {
        templateUserId: template.userId,
        hasPersonalTradeDirect: !!templateBody.personalTradeDirect,
        subject: templateBody.personalTradeDirect?.subject,
        templateKeys: Object.keys(templateBody),
      });

      // 템플릿 소유자 검증
      if (template.userId !== slot.userId) {
        console.warn("⚠️ 템플릿 소유자와 슬롯 사용자가 다릅니다:", {
          templateOwner: template.userId,
          slotUser: slot.userId,
        });
      }

      // API 요청 구성
      const apiUrl = `https://apis.naver.com/cafe-web/cafe-editor-api/v2.0/cafes/${task.cafeId}/menus/${task.menuId}/articles`;

      const requestBody = {
        article: {
          cafeId: task.cafeId,
          subject: `${
            templateBody.personalTradeDirect?.subject || "상품"
          } - ${content.substring(0, 50)}`,
          content: content,
          // 원본 템플릿의 article 필드들 복사
          ...templateBody.article,
          menuId: task.menuId, // menuId 명시적 설정
        },
        personalTradeDirect: templateBody.personalTradeDirect,
        tradeArticle: true,
        // 원본 템플릿의 추가 필드들 복사
        ...Object.fromEntries(
          Object.entries(templateBody).filter(
            ([key]) => !["article", "personalTradeDirect"].includes(key)
          )
        ),
      };

      console.log("📤 API 요청 구성 완료:", {
        url: apiUrl,
        bodySize: JSON.stringify(requestBody).length,
        subject: requestBody.article.subject,
        cafeId: requestBody.article.cafeId,
        menuId: requestBody.article.menuId,
      });

      console.log("📤 Electron으로 API 호출 요청:", {
        실제사용자: slot.userId,
        작업계정: task.accountId,
        슬롯ID: slot.id,
        쿠키개수: Object.keys(sessionCookies).length,
        URL: apiUrl,
      });

      // Electron을 통해 API 호출
      const result = await (window.electronAPI as any)?.postToNaverCafe({
        url: apiUrl,
        body: requestBody,
        cookies: sessionCookies,
      });

      console.log("📥 Electron API 호출 결과:", {
        success: result.success,
        hasData: !!result.data,
        error: result.error,
      });

      if (!result.success) {
        throw new Error(`Electron API 호출 실패: ${result.error}`);
      }

      console.log("✅ 게시글 업로드 성공:", {
        사용자: slot.userId,
        슬롯: slot.id,
        결과: result.data,
      });
      return result.data;
    } catch (error) {
      console.error("❌ 네이버 카페 API 호출 실패:", {
        error: error,
        사용자: slot?.userId,
        슬롯: slot?.id,
        작업계정: task.accountId,
      });
      console.error(
        "❌ 오류 스택:",
        error instanceof Error ? error.stack : "스택 없음"
      );
      throw error;
    }
  };

  const filteredTasks = tasks.filter((task) => {
    const statusMatch = filter === "all" || task.status === filter;
    const accountMatch =
      selectedAccount === "all" || task.accountId === selectedAccount;
    return statusMatch && accountMatch;
  });

  const getStatusColor = (status: Task["status"]) => {
    switch (status) {
      case "pending":
        return "#ffc107";
      case "running":
        return "#007bff";
      case "completed":
        return "#28a745";
      case "failed":
        return "#dc3545";
      default:
        return "#6c757d";
    }
  };

  const getStatusText = (status: Task["status"]) => {
    switch (status) {
      case "pending":
        return "대기중";
      case "running":
        return "실행중";
      case "completed":
        return "완료";
      case "failed":
        return "실패";
      default:
        return "알 수 없음";
    }
  };

  return (
    <div style={{ padding: "20px", fontFamily: "Arial, sans-serif" }}>
      <h1>📋 작업 관리</h1>

      {/* 디버깅 정보 */}
      {Object.keys(cafeInfos).length > 0 && (
        <div
          style={{
            marginBottom: "20px",
            padding: "15px",
            backgroundColor: "#e7f3ff",
            borderRadius: "5px",
            border: "1px solid #b3d9ff",
          }}
        >
          <h4>🔧 게시판 설정 정보</h4>
          <div style={{ fontSize: "12px", color: "#666" }}>
            {Object.entries(cafeInfos).map(([slotKey, cafeInfo]) => (
              <div key={slotKey} style={{ marginBottom: "5px" }}>
                <strong>{slotKey}:</strong> 게시판 ID {cafeInfo.boardId}
                {cafeInfo.cafeName && ` (${cafeInfo.cafeName})`}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* 필터 섹션 */}
      <div
        style={{
          marginBottom: "20px",
          padding: "15px",
          backgroundColor: "#f8f9fa",
          borderRadius: "5px",
        }}
      >
        <h3>🔍 필터</h3>

        {/* 계정 필터 */}
        <div style={{ marginBottom: "15px" }}>
          <label
            style={{
              fontSize: "14px",
              fontWeight: "bold",
              marginBottom: "8px",
              display: "block",
            }}
          >
            👤 계정별 필터:
          </label>
          <select
            value={selectedAccount}
            onChange={(e) => setSelectedAccount(e.target.value)}
            style={{
              padding: "8px 12px",
              fontSize: "14px",
              border: "1px solid #ddd",
              borderRadius: "4px",
              backgroundColor: "white",
              cursor: "pointer",
              minWidth: "200px",
            }}
          >
            <option value="all">🌐 모든 계정</option>
            {loggedInSlots
              .filter((slot) => slot.isLoggedIn)
              .map((slot) => (
                <option key={slot.id} value={slot.userId}>
                  🔐 {slot.userId}
                </option>
              ))}
          </select>
        </div>

        {/* 상태 필터 */}
        <div>
          <label
            style={{
              fontSize: "14px",
              fontWeight: "bold",
              marginBottom: "8px",
              display: "block",
            }}
          >
            📊 상태별 필터:
          </label>
          <div style={{ display: "flex", gap: "10px", flexWrap: "wrap" }}>
            {(
              ["all", "pending", "running", "completed", "failed"] as const
            ).map((status) => (
              <button
                key={status}
                onClick={() => setFilter(status)}
                style={{
                  padding: "8px 15px",
                  backgroundColor: filter === status ? "#007bff" : "#e9ecef",
                  color: filter === status ? "white" : "#495057",
                  border: "none",
                  borderRadius: "4px",
                  cursor: "pointer",
                }}
              >
                {status === "all" ? "전체" : getStatusText(status)}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* 작업 목록 */}
      <div style={{ marginBottom: "20px" }}>
        <h3>
          📝 작업 목록 ({filteredTasks.length}개)
          {selectedAccount !== "all" && (
            <span style={{ color: "#007bff", fontSize: "16px" }}>
              {" "}
              - {selectedAccount}
            </span>
          )}
          {filter !== "all" && (
            <span style={{ color: "#6c757d", fontSize: "16px" }}>
              {" "}
              - {getStatusText(filter)}만
            </span>
          )}
        </h3>
        {filteredTasks.length === 0 ? (
          <div
            style={{ textAlign: "center", color: "#6c757d", padding: "40px" }}
          >
            {(() => {
              if (filter === "all" && selectedAccount === "all") {
                return "등록된 작업이 없습니다.";
              } else if (filter === "all" && selectedAccount !== "all") {
                return `${selectedAccount} 계정의 작업이 없습니다.`;
              } else if (filter !== "all" && selectedAccount === "all") {
                return `${getStatusText(filter)} 상태의 작업이 없습니다.`;
              } else {
                return `${selectedAccount} 계정의 ${
                  filter !== "all" ? getStatusText(filter) : ""
                } 상태 작업이 없습니다.`;
              }
            })()}
          </div>
        ) : (
          <div style={{ display: "grid", gap: "15px" }}>
            {filteredTasks.map((task) => (
              <div
                key={task.id}
                style={{
                  padding: "15px",
                  backgroundColor: "white",
                  border: "1px solid #dee2e6",
                  borderRadius: "8px",
                  boxShadow: "0 2px 4px rgba(0,0,0,0.1)",
                }}
              >
                <div
                  style={{
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "flex-start",
                    marginBottom: "10px",
                  }}
                >
                  <h4 style={{ margin: "0", color: "#2c3e50" }}>
                    {task.title}
                  </h4>
                  <div
                    style={{
                      display: "flex",
                      gap: "5px",
                      alignItems: "center",
                    }}
                  >
                    <span
                      style={{
                        padding: "4px 8px",
                        backgroundColor: getStatusColor(task.status),
                        color: "white",
                        borderRadius: "12px",
                        fontSize: "12px",
                        fontWeight: "bold",
                      }}
                    >
                      {getStatusText(task.status)}
                    </span>
                    <button
                      onClick={() => handleDeleteTask(task.id)}
                      style={{
                        padding: "4px 8px",
                        backgroundColor: "#dc3545",
                        color: "white",
                        border: "none",
                        borderRadius: "4px",
                        cursor: "pointer",
                        fontSize: "12px",
                      }}
                    >
                      삭제
                    </button>
                  </div>
                </div>

                <div style={{ marginBottom: "10px" }}>
                  <strong>프롬프트:</strong> {task.prompt}
                </div>

                <div
                  style={{
                    display: "grid",
                    gridTemplateColumns: "1fr 1fr",
                    gap: "10px",
                    fontSize: "14px",
                    color: "#6c757d",
                  }}
                >
                  <div>
                    <strong>계정:</strong> {task.accountId}
                  </div>
                  <div>
                    <strong>카페 ID:</strong> {task.cafeId}
                  </div>
                  <div>
                    <strong>템플릿 ID:</strong> {task.templateId}
                  </div>
                  <div>
                    <strong>생성일:</strong>{" "}
                    {new Date(task.createdAt).toLocaleString()}
                  </div>
                </div>

                {task.status === "pending" && (
                  <div
                    style={{ marginTop: "10px", display: "flex", gap: "5px" }}
                  >
                    <button
                      onClick={() => handleStatusChange(task.id, "running")}
                      style={{
                        padding: "6px 12px",
                        backgroundColor: "#007bff",
                        color: "white",
                        border: "none",
                        borderRadius: "4px",
                        cursor: "pointer",
                        fontSize: "12px",
                      }}
                    >
                      시작
                    </button>
                    <button
                      onClick={() => handleStatusChange(task.id, "failed")}
                      style={{
                        padding: "6px 12px",
                        backgroundColor: "#dc3545",
                        color: "white",
                        border: "none",
                        borderRadius: "4px",
                        cursor: "pointer",
                        fontSize: "12px",
                      }}
                    >
                      실패 처리
                    </button>
                  </div>
                )}

                {task.status === "running" && (
                  <div
                    style={{ marginTop: "10px", display: "flex", gap: "5px" }}
                  >
                    <button
                      onClick={() => handleStatusChange(task.id, "completed")}
                      style={{
                        padding: "6px 12px",
                        backgroundColor: "#28a745",
                        color: "white",
                        border: "none",
                        borderRadius: "4px",
                        cursor: "pointer",
                        fontSize: "12px",
                      }}
                    >
                      완료 처리
                    </button>
                    <button
                      onClick={() => handleStatusChange(task.id, "failed")}
                      style={{
                        padding: "6px 12px",
                        backgroundColor: "#dc3545",
                        color: "white",
                        border: "none",
                        borderRadius: "4px",
                        cursor: "pointer",
                        fontSize: "12px",
                      }}
                    >
                      실패 처리
                    </button>
                  </div>
                )}

                {/* 자동화 설정 섹션 */}
                {task.status === "pending" && (
                  <div
                    style={{
                      marginTop: "15px",
                      padding: "15px",
                      backgroundColor: "#f8f9fa",
                      borderRadius: "5px",
                      border: "1px solid #dee2e6",
                    }}
                  >
                    <h5 style={{ margin: "0 0 10px 0", color: "#495057" }}>
                      🤖 자동화 설정
                    </h5>

                    {editingTask === task.id ? (
                      <div style={{ display: "grid", gap: "10px" }}>
                        <div
                          style={{
                            display: "grid",
                            gridTemplateColumns: "1fr 1fr",
                            gap: "10px",
                          }}
                        >
                          <div>
                            <label
                              style={{
                                fontSize: "12px",
                                fontWeight: "bold",
                                display: "block",
                                marginBottom: "4px",
                              }}
                            >
                              시작 시간:
                            </label>
                            <input
                              type="datetime-local"
                              value={taskSettings.scheduledTime}
                              onChange={(e) => {
                                e.preventDefault();
                                e.stopPropagation();
                                setTaskSettings((prev) => ({
                                  ...prev,
                                  scheduledTime: e.target.value,
                                }));
                              }}
                              onKeyDown={(e) => e.stopPropagation()}
                              style={{
                                width: "100%",
                                padding: "6px",
                                fontSize: "12px",
                                border: "1px solid #ddd",
                                borderRadius: "4px",
                                outline: "none",
                              }}
                              onFocus={(e) => {
                                e.target.style.borderColor = "#007bff";
                              }}
                              onBlur={(e) => {
                                e.target.style.borderColor = "#ddd";
                              }}
                            />
                          </div>
                          <div>
                            <label
                              style={{
                                fontSize: "12px",
                                fontWeight: "bold",
                                display: "block",
                                marginBottom: "4px",
                              }}
                            >
                              게시판 ID:
                            </label>
                            <div
                              style={{
                                width: "100%",
                                padding: "6px",
                                fontSize: "12px",
                                border: "1px solid #e9ecef",
                                borderRadius: "4px",
                                backgroundColor: "#f8f9fa",
                                color: "#6c757d",
                              }}
                            >
                              {getBoardIdForAccount(task.accountId)} (계정별
                              설정)
                            </div>
                          </div>
                        </div>

                        <div
                          style={{
                            display: "grid",
                            gridTemplateColumns: "1fr 1fr",
                            gap: "10px",
                          }}
                        >
                          <div>
                            <label
                              style={{
                                fontSize: "12px",
                                fontWeight: "bold",
                                display: "block",
                                marginBottom: "4px",
                              }}
                            >
                              딜레이 (분):
                            </label>
                            <input
                              type="number"
                              min="1"
                              max="60"
                              value={taskSettings.delayBetweenTasks}
                              onChange={(e) => {
                                e.preventDefault();
                                e.stopPropagation();
                                setTaskSettings((prev) => ({
                                  ...prev,
                                  delayBetweenTasks:
                                    parseInt(e.target.value) || 5,
                                }));
                              }}
                              onKeyDown={(e) => e.stopPropagation()}
                              style={{
                                width: "100%",
                                padding: "6px",
                                fontSize: "12px",
                                border: "1px solid #ddd",
                                borderRadius: "4px",
                                outline: "none",
                              }}
                              onFocus={(e) => {
                                e.target.style.borderColor = "#007bff";
                                e.target.select();
                              }}
                              onBlur={(e) => {
                                e.target.style.borderColor = "#ddd";
                              }}
                            />
                          </div>
                          <div>
                            <label
                              style={{
                                fontSize: "12px",
                                fontWeight: "bold",
                                display: "block",
                                marginBottom: "4px",
                              }}
                            >
                              글감 수:
                            </label>
                            <input
                              type="number"
                              min="1"
                              max="20"
                              value={taskSettings.articleCount}
                              onChange={(e) => {
                                e.preventDefault();
                                e.stopPropagation();
                                setTaskSettings((prev) => ({
                                  ...prev,
                                  articleCount: parseInt(e.target.value) || 1,
                                }));
                              }}
                              onKeyDown={(e) => e.stopPropagation()}
                              style={{
                                width: "100%",
                                padding: "6px",
                                fontSize: "12px",
                                border: "1px solid #ddd",
                                borderRadius: "4px",
                                outline: "none",
                              }}
                              onFocus={(e) => {
                                e.target.style.borderColor = "#007bff";
                                e.target.select();
                              }}
                              onBlur={(e) => {
                                e.target.style.borderColor = "#ddd";
                              }}
                            />
                          </div>
                        </div>

                        <div
                          style={{
                            display: "flex",
                            gap: "5px",
                            marginTop: "10px",
                          }}
                        >
                          <button
                            onClick={() => handleSaveTaskSettings(task.id)}
                            style={{
                              padding: "6px 12px",
                              backgroundColor: "#28a745",
                              color: "white",
                              border: "none",
                              borderRadius: "4px",
                              cursor: "pointer",
                              fontSize: "12px",
                            }}
                          >
                            저장
                          </button>
                          <button
                            onClick={() => setEditingTask(null)}
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
                            취소
                          </button>
                        </div>
                      </div>
                    ) : (
                      <div>
                        <div
                          style={{
                            display: "grid",
                            gridTemplateColumns: "1fr 1fr",
                            gap: "10px",
                            fontSize: "12px",
                            marginBottom: "10px",
                          }}
                        >
                          <div>
                            <strong>시작 시간:</strong>{" "}
                            {task.scheduledTime
                              ? new Date(task.scheduledTime).toLocaleString()
                              : "미설정"}
                          </div>
                          <div>
                            <strong>게시판 ID:</strong>{" "}
                            {getBoardIdForAccount(task.accountId)} (계정별 설정)
                          </div>
                          <div>
                            <strong>딜레이:</strong>{" "}
                            {task.delayBetweenTasks || 5}분
                          </div>
                          <div>
                            <strong>글감 수:</strong> {task.articleCount || 1}개
                          </div>
                        </div>

                        <div style={{ display: "flex", gap: "5px" }}>
                          <button
                            onClick={() => handleEditTask(task)}
                            style={{
                              padding: "6px 12px",
                              backgroundColor: "#007bff",
                              color: "white",
                              border: "none",
                              borderRadius: "4px",
                              cursor: "pointer",
                              fontSize: "12px",
                            }}
                          >
                            설정 편집
                          </button>
                          <button
                            onClick={() => handleStartAutomation(task)}
                            disabled={!task.scheduledTime || !task.articleCount}
                            style={{
                              padding: "6px 12px",
                              backgroundColor:
                                !task.scheduledTime || !task.articleCount
                                  ? "#6c757d"
                                  : "#28a745",
                              color: "white",
                              border: "none",
                              borderRadius: "4px",
                              cursor:
                                !task.scheduledTime || !task.articleCount
                                  ? "not-allowed"
                                  : "pointer",
                              fontSize: "12px",
                            }}
                          >
                            🚀 작업 시작
                          </button>
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default TasksPage;
