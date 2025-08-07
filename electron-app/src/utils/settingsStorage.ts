// 설정 데이터 타입
export interface AppSettings {
  openaiApiKey: string;
  globalPrompt: string;
}

// 기본 설정값
const defaultSettings: AppSettings = {
  openaiApiKey: "",
  globalPrompt: `당신은 네이버 카페 글 작성 전문가입니다. 
사용자의 요청에 따라 카페에 올릴 수 있는 자연스럽고 유용한 글 내용을 생성해주세요.

규칙:
1. 각 글은 200-500자 내외로 작성
2. 자연스럽고 읽기 쉬운 내용
3. 카페 분위기에 맞는 톤앤매너
4. 광고성 내용이어도 OK
5. 각 글은 최대한 중복을 피해야 함
6. 제목만 적을 것이며, "제목: ", "내용: " 과 같은 형식 템플릿은 사용하지 않음
7. 오로지 제목 텍스트만 제공할 것

응답 형식: 각 글을 새 줄로 구분하여 제공`,
};

// 설정 저장
export const saveSettings = async (settings: AppSettings): Promise<void> => {
  try {
    if (window.electronAPI && "saveSettings" in window.electronAPI) {
      await (window.electronAPI as any).saveSettings(settings);
    } else {
      console.error("❌ saveSettings API를 찾을 수 없습니다.");
    }
  } catch (error) {
    console.error("❌ 설정 저장 실패:", error);
    throw error;
  }
};

// 설정 불러오기
export const loadSettings = async (): Promise<AppSettings> => {
  try {
    if (window.electronAPI && "loadSettings" in window.electronAPI) {
      const settings = await (window.electronAPI as any).loadSettings();
      return { ...defaultSettings, ...settings };
    } else {
      console.error("❌ loadSettings API를 찾을 수 없습니다.");
      return defaultSettings;
    }
  } catch (error) {
    console.error("❌ 설정 불러오기 실패:", error);
    return defaultSettings;
  }
};

// OpenAI API 키만 저장
export const saveApiKey = async (apiKey: string): Promise<void> => {
  const currentSettings = await loadSettings();
  await saveSettings({ ...currentSettings, openaiApiKey: apiKey });
};

// 글로벌 프롬프트만 저장
export const saveGlobalPrompt = async (prompt: string): Promise<void> => {
  const currentSettings = await loadSettings();
  await saveSettings({ ...currentSettings, globalPrompt: prompt });
};

// API 키가 설정되어 있는지 확인
export const isApiKeyConfigured = async (): Promise<boolean> => {
  const settings = await loadSettings();
  return !!settings.openaiApiKey && settings.openaiApiKey.trim() !== "";
};

// 글로벌 프롬프트 가져오기
export const getGlobalPrompt = async (): Promise<string> => {
  const settings = await loadSettings();
  return settings.globalPrompt || defaultSettings.globalPrompt;
};

// API 키 가져오기
export const getApiKey = async (): Promise<string> => {
  const settings = await loadSettings();
  return settings.openaiApiKey;
};
