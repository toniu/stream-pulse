import { createSlice, type PayloadAction } from '@reduxjs/toolkit';

interface UIState {
  sidebarCollapsed: boolean;
  mobileSidebarOpen: boolean;
  activeArtistId: string | null;
}

const initialState: UIState = {
  sidebarCollapsed: false,
  mobileSidebarOpen: false,
  activeArtistId: null,
};

const uiSlice = createSlice({
  name: 'ui',
  initialState,
  reducers: {
    toggleSidebar(state) {
      state.sidebarCollapsed = !state.sidebarCollapsed;
    },
    setSidebarCollapsed(state, action: PayloadAction<boolean>) {
      state.sidebarCollapsed = action.payload;
    },
    toggleMobileSidebar(state) {
      state.mobileSidebarOpen = !state.mobileSidebarOpen;
    },
    setMobileSidebarOpen(state, action: PayloadAction<boolean>) {
      state.mobileSidebarOpen = action.payload;
    },
    setActiveArtistId(state, action: PayloadAction<string | null>) {
      state.activeArtistId = action.payload;
    },
  },
});

export const { toggleSidebar, setSidebarCollapsed, toggleMobileSidebar, setMobileSidebarOpen, setActiveArtistId } =
  uiSlice.actions;
export default uiSlice.reducer;
