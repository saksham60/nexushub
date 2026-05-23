export type ReportResponse = {
  status: "ok";
  report: {
    id: string;
    title: string;
    created_at: string;
  };
};
