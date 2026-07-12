import { create } from "zustand";
import type {
  Project,
  MaterialCard,
  Combination,
  Spark,
  ChatMessage,
  Stage,
  Settings,
} from "./types";
import {
  projectsRepo,
  cardsRepo,
  combinationsRepo,
  sparksRepo,
  messagesRepo,
  activeProjectRepo,
  settingsRepo,
  trimMessagesPerProject,
} from "./lib/storage";

function nowIso(): string {
  return new Date().toISOString();
}

function newId(): string {
  return crypto.randomUUID();
}

interface HiramekiState {
  projects: Project[];
  activeProjectId: string | null;
  cards: MaterialCard[];
  combinations: Combination[];
  sparks: Spark[];
  messages: ChatMessage[];
  streaming: boolean;
  settings: Settings;
  // T13: 使い方ガイドモーダルの開閉状態(永続化しない、エフェメラルなUI状態)。
  // ヘッダーの「使い方」ボタン・モバイル下部タブの「使い方」・初回自動表示のいずれからも
  // この共有stateを介してモーダル表示をトリガーする。
  guideOpen: boolean;

  // projects
  createProject: (title: string, question: string) => Project;
  updateProjectStage: (projectId: string, stage: Stage) => void;
  setIncubateUntil: (projectId: string, incubateUntil: string | undefined) => void;
  deleteProject: (projectId: string) => void;
  setActiveProjectId: (projectId: string | null) => void;

  // cards
  addCard: (projectId: string, kind: MaterialCard["kind"], text: string) => MaterialCard;
  updateCard: (cardId: string, text: string) => void;
  deleteCard: (cardId: string) => void;

  // combinations
  addCombination: (projectId: string, cardIds: string[], note: string) => Combination;
  deleteCombination: (combinationId: string) => void;

  // sparks
  addSpark: (projectId: string, text: string) => Spark;
  updateSparkDeveloped: (sparkId: string, developedText: string) => void;
  deleteSpark: (sparkId: string) => void;

  // messages
  addMessage: (
    projectId: string,
    role: ChatMessage["role"],
    content: string,
    stage: Stage,
    options?: { auto?: boolean },
  ) => ChatMessage;
  setStreaming: (streaming: boolean) => void;

  // settings (T9: BYOK)
  updateSettings: (partial: Partial<Settings>) => void;

  // T13: 使い方ガイド
  setGuideOpen: (open: boolean) => void;
}

export const useHiramekiStore = create<HiramekiState>((set, get) => ({
  projects: projectsRepo.load(),
  activeProjectId: activeProjectRepo.load(),
  cards: cardsRepo.load(),
  combinations: combinationsRepo.load(),
  sparks: sparksRepo.load(),
  messages: messagesRepo.load(),
  streaming: false,
  settings: settingsRepo.load(),
  guideOpen: false,

  createProject: (title, question) => {
    const project: Project = {
      id: newId(),
      title,
      question,
      stage: "gather",
      createdAt: nowIso(),
      updatedAt: nowIso(),
    };
    const projects = [...get().projects, project];
    projectsRepo.save(projects);
    activeProjectRepo.save(project.id);
    set({ projects, activeProjectId: project.id });
    return project;
  },

  updateProjectStage: (projectId, stage) => {
    const projects = get().projects.map((p) =>
      p.id === projectId ? { ...p, stage, updatedAt: nowIso() } : p,
    );
    projectsRepo.save(projects);
    set({ projects });
  },

  setIncubateUntil: (projectId, incubateUntil) => {
    const projects = get().projects.map((p) =>
      p.id === projectId ? { ...p, incubateUntil, updatedAt: nowIso() } : p,
    );
    projectsRepo.save(projects);
    set({ projects });
  },

  deleteProject: (projectId) => {
    const projects = get().projects.filter((p) => p.id !== projectId);
    const cards = get().cards.filter((c) => c.projectId !== projectId);
    const combinations = get().combinations.filter((c) => c.projectId !== projectId);
    const sparks = get().sparks.filter((s) => s.projectId !== projectId);
    const messages = get().messages.filter((m) => m.projectId !== projectId);
    const activeProjectId =
      get().activeProjectId === projectId ? null : get().activeProjectId;

    projectsRepo.save(projects);
    cardsRepo.save(cards);
    combinationsRepo.save(combinations);
    sparksRepo.save(sparks);
    messagesRepo.save(messages);
    activeProjectRepo.save(activeProjectId);

    set({ projects, cards, combinations, sparks, messages, activeProjectId });
  },

  setActiveProjectId: (projectId) => {
    activeProjectRepo.save(projectId);
    set({ activeProjectId: projectId });
  },

  addCard: (projectId, kind, text) => {
    const card: MaterialCard = {
      id: newId(),
      projectId,
      kind,
      text,
      createdAt: nowIso(),
    };
    const cards = [...get().cards, card];
    cardsRepo.save(cards);
    set({ cards });
    return card;
  },

  updateCard: (cardId, text) => {
    const cards = get().cards.map((c) => (c.id === cardId ? { ...c, text } : c));
    cardsRepo.save(cards);
    set({ cards });
  },

  deleteCard: (cardId) => {
    const cards = get().cards.filter((c) => c.id !== cardId);
    cardsRepo.save(cards);
    set({ cards });
  },

  addCombination: (projectId, cardIds, note) => {
    const combination: Combination = {
      id: newId(),
      projectId,
      cardIds,
      note,
      createdAt: nowIso(),
    };
    const combinations = [...get().combinations, combination];
    combinationsRepo.save(combinations);
    set({ combinations });
    return combination;
  },

  deleteCombination: (combinationId) => {
    const combinations = get().combinations.filter((c) => c.id !== combinationId);
    combinationsRepo.save(combinations);
    set({ combinations });
  },

  addSpark: (projectId, text) => {
    const spark: Spark = {
      id: newId(),
      projectId,
      text,
      createdAt: nowIso(),
    };
    const sparks = [...get().sparks, spark];
    sparksRepo.save(sparks);
    set({ sparks });
    return spark;
  },

  updateSparkDeveloped: (sparkId, developedText) => {
    const sparks = get().sparks.map((s) =>
      s.id === sparkId ? { ...s, developedText } : s,
    );
    sparksRepo.save(sparks);
    set({ sparks });
  },

  deleteSpark: (sparkId) => {
    const sparks = get().sparks.filter((s) => s.id !== sparkId);
    sparksRepo.save(sparks);
    set({ sparks });
  },

  addMessage: (projectId, role, content, stage, options) => {
    const message: ChatMessage = {
      id: newId(),
      projectId,
      role,
      content,
      stage,
      createdAt: nowIso(),
      ...(options?.auto ? { auto: true } : {}),
    };
    const messages = trimMessagesPerProject([...get().messages, message]);
    messagesRepo.save(messages);
    set({ messages });
    return message;
  },

  setStreaming: (streaming) => set({ streaming }),

  updateSettings: (partial) => {
    const settings = { ...get().settings, ...partial };
    settingsRepo.save(settings);
    set({ settings });
  },

  setGuideOpen: (open) => set({ guideOpen: open }),
}));
