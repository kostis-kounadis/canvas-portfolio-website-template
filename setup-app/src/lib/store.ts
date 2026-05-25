import { create } from 'zustand';

// Deep Partial helper for updating nested objects
type DeepPartial<T> = T extends object ? {
    [P in keyof T]?: DeepPartial<T[P]>;
} : T;

export interface SiteConfig {
  site: {
    title: string;
    email: string;
    url: string;
    infoText: string;
    author: string;
  };
  seo: {
    metaDescription: string;
    keywords: string[];
    ogImage: string;
    twitterHandle: string;
    canonicalUrl: string;
    schemaType: string;
    jobTitle: string;
    sameAs: string[];
  };
  ui: {
    modules: {
      title: { visible: boolean; position: string; mode: string; text: string; logoFile: string; icon: { enabled: boolean; file: string; position: string } };
      email: { visible: boolean; position: string };
      info: { visible: boolean; position: string };
      categories: { visible: boolean; position: string };
      layouts: { visible: boolean; position: string };
    };
    zoom: { visible: boolean };
    textSize: string;
    fontEmbedCode: string;
  };
  theme: {
    backgroundColor: string;
    textColor: string;
    blendMode: boolean;
    textAnimation: string;
    textAnimationTrigger: string;
    backgroundEffect: string;
    backgroundGradientFrom: string;
    backgroundGradientTo: string;
    noiseGrain: { enabled: boolean; opacity: number };
    imageShadow: { enabled: boolean; opacity: number; blur: number; color: string };
  };
  layouts: {
    available: string[];
    default: string;
    labels: string[];
    random: { scarcity: number; overlapRatio: number; draggable: boolean };
    rows: { rowHeight: number; gap: number };
    stacks: { spacing: number };
  };
  categories: {
    behaviour: string;
    focusEffect: string;
    viewAllLabel: string;
  };
  imageEffects: {
    initialState: string;
    hoverReveal: boolean;
    clickMode: string;
    clickStickyMode: string;
    blurOthersOnClick: boolean;
  };
  imageClick: {
    lightbox: { enabled: boolean; backdropEffect: string };
    canvasExpand: { enabled: boolean };
  };
  info: {
    overlayEffect: string;
    buttonStyle: string;
    closeStyle: string;
  };
  mobile: {
    defaultMode: string;
  };
}

interface ConfigState {
  config: SiteConfig | null;
  isLoading: boolean;
  isSaving: boolean;
  isBuilding: boolean;
  error: string | null;
  isDirty: boolean;
  fetchConfig: () => Promise<void>;
  updateConfig: (updater: (prev: SiteConfig) => void) => void;
  saveConfig: () => Promise<void>;
  buildSite: () => Promise<void>;
  activeSection: string;
  setActiveSection: (section: string) => void;
}

let _guiChannel: BroadcastChannel | null = null;
try {
  _guiChannel = new BroadcastChannel('canvas-portfolio-config');
} catch (_) { /* BroadcastChannel unsupported */ }

export const useConfigStore = create<ConfigState>((set, get) => ({
  config: null,
  isLoading: true,
  isSaving: false,
  isBuilding: false,
  error: null,
  isDirty: false,
  activeSection: 'identity',

  setActiveSection: (section: string) => set({ activeSection: section }),

  fetchConfig: async () => {
    set({ isLoading: true, error: null });
    try {
      const res = await fetch('/api/config');
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = await res.json();
      set({ config: data, isLoading: false, isDirty: false });
    } catch (e: any) {
      set({ error: e.message, isLoading: false });
    }
  },

  updateConfig: (updater) => {
    const prevConfig = get().config;
    if (!prevConfig) return;
    
    // Create a deep copy to safely mutate
    const newConfig = JSON.parse(JSON.stringify(prevConfig));
    updater(newConfig);
    
    set({ config: newConfig, isDirty: true });

    // Hot-reload
    if (_guiChannel) {
      try {
        _guiChannel.postMessage({ type: 'config-update', config: newConfig });
      } catch (_) {}
    }
  },

  saveConfig: async () => {
    const { config } = get();
    if (!config) return;
    
    set({ isSaving: true, error: null });
    try {
      const res = await fetch('/api/config', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(config, null, 2),
      });
      
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || `HTTP ${res.status}`);
      }
      
      set({ isSaving: false, isDirty: false });
      
      // Hot-reload again just in case
      if (_guiChannel) {
        try {
          _guiChannel.postMessage({ type: 'config-update', config });
        } catch (_) {}
      }
    } catch (e: any) {
      set({ error: e.message, isSaving: false });
      throw e;
    }
  },

  buildSite: async () => {
    set({ isBuilding: true, error: null });
    try {
      const res = await fetch('/api/build', { method: 'POST' });
      // Here we could implement the streaming log reader if we want,
      // or just wait for the promise to resolve. 
      // For the UI, we can just await the fetch if the server streams or returns OK.
      if (!res.ok) throw new Error(`Build failed`);
      set({ isBuilding: false });
    } catch (e: any) {
      set({ error: e.message, isBuilding: false });
      throw e;
    }
  }
}));
