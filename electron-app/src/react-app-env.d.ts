/// <reference types="react-scripts" />

declare global {
  interface Window {
    electronAPI?: {
      openNaverLogin: () => Promise<any>;
      onSessionDataCaptured: (callback: (data: any) => void) => void;
      onSessionCaptureError: (callback: (error: string) => void) => void;
      onLoginWindowClosed: (callback: () => void) => void;
      removeAllListeners: (eventName: string) => void;
      getLoggedInSlots: () => Promise<any[]>;
      updateSlot: (slotData: any) => Promise<any>;
      getEnvVariable: (key: string) => Promise<string>;
      setOpenAIKey: (key: string) => Promise<void>;
      loadAccountPosts: (userId: string) => Promise<any[]>;
      loadAccountTemplates: (userId: string) => Promise<any[]>;
      saveAccountPosts: (userId: string, posts: any[]) => Promise<void>;
      generatePosts: (prompt: string, count: number) => Promise<any[]>;
      injectCookies: (cookies: Record<string, string>) => Promise<void>;
      activateTemplateCapture: () => Promise<{
        success: boolean;
        message?: string;
        error?: string;
      }>;
      onTemplateCaptured: (
        callback: (data: {
          userId: string;
          templateId: string;
          cafeId?: string;
          timestamp: string;
        }) => void
      ) => void;
    };
  }
}
