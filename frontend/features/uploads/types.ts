export type UploadResponse = {
  status: "ok";
  upload: {
    id: string;
    file_name: string;
    mime_type: string;
    size_bytes: number;
    created_at: string;
  };
};
