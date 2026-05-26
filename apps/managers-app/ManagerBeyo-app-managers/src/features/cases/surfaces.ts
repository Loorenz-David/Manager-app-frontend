import type { CaseId } from '@/types/common';
import type { SurfaceRegistrations } from '@/providers/SurfaceProvider';
import { lazyWithPreload } from '@/utils/lazy-with-preload';

export const CASE_CONVERSATION_SURFACE_ID = 'case-conversation-slide';

export type CaseConversationSurfaceProps = {
  caseClientId: CaseId;
};

function loadCaseConversationSlidePage() {
  return import('@/pages/cases/CaseConversationSlidePage').then((module) => ({
    default: module.CaseConversationSlidePage,
  }));
}

const caseConversationSlide = lazyWithPreload(loadCaseConversationSlidePage);

export const caseSurfaces: SurfaceRegistrations = {
  [CASE_CONVERSATION_SURFACE_ID]: {
    surface: 'slide',
    component: caseConversationSlide.Component,
  },
};
