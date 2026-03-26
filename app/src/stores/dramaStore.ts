// ===== Drama Store (Zustand) — with pagination =====
import { create } from 'zustand';
import type { Drama, DramaDetail } from '../types';
import { dramaService } from '../services';

interface DramaState {
  // Home page
  recentDramas: Drama[];
  popularDramas: Drama[];
  genres: string[];
  homePage: number;
  homeHasMore: boolean;

  // Detail page
  currentDrama: DramaDetail | null;

  // Search
  searchResults: Drama[];
  searchKeyword: string;
  searchPage: number;
  searchHasMore: boolean;

  // Genre filter
  genreResults: Drama[];
  genreFilter: string | null;
  genrePage: number;
  genreHasMore: boolean;

  // Loading states
  isLoadingDramas: boolean;
  isLoadingDetail: boolean;
  isLoadingMore: boolean;

  // Actions
  loadHomeData: () => Promise<void>;
  loadMoreHome: () => Promise<void>;
  loadDramaDetail: (id: number) => Promise<void>;
  searchDramas: (keyword: string) => Promise<void>;
  loadMoreSearch: () => Promise<void>;
  clearSearch: () => void;
  filterByGenre: (genre: string | null) => Promise<void>;
  loadMoreGenre: () => Promise<void>;
}

const PAGE_SIZE = 20;

export const useDramaStore = create<DramaState>((set, get) => ({
  recentDramas: [],
  popularDramas: [],
  genres: [],
  homePage: 1,
  homeHasMore: true,

  currentDrama: null,

  searchResults: [],
  searchKeyword: '',
  searchPage: 1,
  searchHasMore: true,

  genreResults: [],
  genreFilter: null,
  genrePage: 1,
  genreHasMore: true,

  isLoadingDramas: false,
  isLoadingDetail: false,
  isLoadingMore: false,

  loadHomeData: async () => {
    set({ isLoadingDramas: true });
    try {
      const [recentDramas, genres] = await Promise.all([
        dramaService.getDramas({ page: 1, pageSize: PAGE_SIZE }),
        dramaService.getGenres(),
      ]);
      set({
        recentDramas: recentDramas.list,
        genres,
        homePage: 1,
        homeHasMore: recentDramas.page < recentDramas.totalPages,
        isLoadingDramas: false,
      });
    } catch {
      set({ isLoadingDramas: false });
    }
  },

  loadMoreHome: async () => {
    const { homePage, homeHasMore, recentDramas, isLoadingMore, isLoadingDramas } = get();
    if (!homeHasMore || isLoadingMore || isLoadingDramas) return;
    set({ isLoadingMore: true });
    try {
      const nextPage = homePage + 1;
      const res = await dramaService.getDramas({ page: nextPage, pageSize: PAGE_SIZE });
      set({
        recentDramas: [...recentDramas, ...res.list],
        homePage: nextPage,
        homeHasMore: nextPage < res.totalPages,
        isLoadingMore: false,
      });
    } catch {
      set({ isLoadingMore: false });
    }
  },

  loadDramaDetail: async (id: number) => {
    set({ isLoadingDetail: true });
    try {
      const drama = await dramaService.getDramaDetail(id);
      set({ currentDrama: drama, isLoadingDetail: false });
    } catch {
      set({ isLoadingDetail: false });
    }
  },

  searchDramas: async (keyword: string) => {
    if (!keyword.trim()) {
      set({ searchResults: [], searchKeyword: '', searchPage: 1, searchHasMore: true });
      return;
    }
    set({ isLoadingDramas: true, searchKeyword: keyword });
    try {
      const res = await dramaService.getDramas({ keyword, page: 1, pageSize: PAGE_SIZE });
      set({
        searchResults: res.list,
        searchPage: 1,
        searchHasMore: 1 < res.totalPages,
        isLoadingDramas: false,
      });
    } catch {
      set({ isLoadingDramas: false });
    }
  },

  loadMoreSearch: async () => {
    const { searchKeyword, searchPage, searchHasMore, searchResults, isLoadingMore, isLoadingDramas } = get();
    if (!searchHasMore || isLoadingMore || isLoadingDramas || !searchKeyword) return;
    set({ isLoadingMore: true });
    try {
      const nextPage = searchPage + 1;
      const res = await dramaService.getDramas({ keyword: searchKeyword, page: nextPage, pageSize: PAGE_SIZE });
      set({
        searchResults: [...searchResults, ...res.list],
        searchPage: nextPage,
        searchHasMore: nextPage < res.totalPages,
        isLoadingMore: false,
      });
    } catch {
      set({ isLoadingMore: false });
    }
  },

  filterByGenre: async (genre: string | null) => {
    if (!genre) {
      set({ genreResults: [], genreFilter: null, genrePage: 1, genreHasMore: true });
      return;
    }
    set({ isLoadingDramas: true, genreFilter: genre });
    try {
      const res = await dramaService.getDramas({ genre, page: 1, pageSize: PAGE_SIZE });
      set({
        genreResults: res.list,
        genrePage: 1,
        genreHasMore: 1 < res.totalPages,
        isLoadingDramas: false,
      });
    } catch {
      set({ isLoadingDramas: false });
    }
  },

  loadMoreGenre: async () => {
    const { genreFilter, genrePage, genreHasMore, genreResults, isLoadingMore, isLoadingDramas } = get();
    if (!genreHasMore || isLoadingMore || isLoadingDramas || !genreFilter) return;
    set({ isLoadingMore: true });
    try {
      const nextPage = genrePage + 1;
      const res = await dramaService.getDramas({ genre: genreFilter, page: nextPage, pageSize: PAGE_SIZE });
      set({
        genreResults: [...genreResults, ...res.list],
        genrePage: nextPage,
        genreHasMore: nextPage < res.totalPages,
        isLoadingMore: false,
      });
    } catch {
      set({ isLoadingMore: false });
    }
  },

  clearSearch: () => set({ searchResults: [], searchKeyword: '', searchPage: 1, searchHasMore: true }),
}));
