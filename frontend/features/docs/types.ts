export type RecentFile = {
  id: string;
  name: string;
  web_url?: string;
  last_modified_at?: string;
  size_bytes?: number;
  source?: "onedrive" | "sharepoint" | "upload";
};
