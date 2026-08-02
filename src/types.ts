export interface Site {
  id: string;
  category_id: string;
  name: string;
  url: string;
  icon?: string;
  description?: string;
  sort_order?: number;
}

export interface Category {
  id: string;
  name: string;
  icon?: string;
  sort_order?: number;
}

export interface TodoItem {
  id: string;
  content: string;
  completed: boolean;
  created_at?: string;
}

export type SearchEngineKey = 'google' | 'bing' | 'baidu' | 'github';

export interface SearchEngine {
  key: SearchEngineKey;
  name: string;
  icon: string;
  url: string;
  placeholder: string;
}

export interface WeatherData {
  city: string;
  temp: string;
  condition: string;
  icon: string;
}

export interface HitokotoQuote {
  hitokoto: string;
  from: string;
}

export interface HotListItem {
  title: string;
  url: string;
  hot: string;
}
