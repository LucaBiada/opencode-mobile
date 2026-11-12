import { create } from "zustand"
import AsyncStorage from "@react-native-async-storage/async-storage"

// Which workspace the user picked on Home. Chats and secondary tabs are scoped
// to it; Settings is not.
export type Mode = "remote" | "cloud" | "local"

const MODE_KEY = "devmote_mode"

interface ModeState {
  mode: Mode
  loaded: boolean
  load: () => Promise<void>
  setMode: (mode: Mode) => Promise<void>
}

export const useMode = create<ModeState>((set) => ({
  mode: "remote",
  loaded: false,

  load: async () => {
    const stored = await AsyncStorage.getItem(MODE_KEY)
    const mode = stored === "cloud" || stored === "local" || stored === "remote" ? stored : "remote"
    set({ mode, loaded: true })
  },

  setMode: async (mode) => {
    set({ mode })
    await AsyncStorage.setItem(MODE_KEY, mode)
  },
}))
