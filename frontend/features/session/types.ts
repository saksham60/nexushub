export type User = {
  id: string;
  email: string;
  display_name: string;
};

export type Workspace = {
  id: string;
  name: string;
};

export type SessionResponse = 
  | { status: "ok"; user: User; workspace: Workspace }
  | { status: "unauthenticated"; error: { code: string; message: string } };
