export type UploadResponse = {
  documentId: string;
  filename: string;
  contentType: string;
  sizeBytes: number;
  status: "uploaded";
  createdAt: string;
};
