import type { DemoEntry } from '$lib/bricks/DemoRegistry';

export interface GalleryConfig {
  layout: {
    cardsPerRow: string;
    minCardWidth: string;
    maxCardWidth: string;
    gap: string;
    containerMaxWidth: string;
  };
  features: {
    showStats: boolean;
    showFilters: boolean;
    showSearch: boolean;
    groupBySeries: boolean;
    showBrokenDemos: boolean;
    showEmptyGroups: boolean;
  };
  styling: {
    cardStyle: 'flat' | 'elevated' | 'bordered';
    animations: boolean;
    hoverEffects: boolean;
    seriesColors: Record<string, string>;
  };
  routing: {
    basePath: string;
    galleryPath: string;
  };
  text: {
    title: string;
    subtitle: string;
    emptyState: string;
    searchPlaceholder: string;
  };
}

export interface FilterState {
  searchQuery: string;
  selectedSeries: string;
  selectedStatus: string;
  selectedCategory: string;
  sortBy: string;
}

export interface GroupedDemos {
  series: string;
  demos: DemoEntry[];
  color: string;
}