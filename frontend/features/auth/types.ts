export type MicrosoftStatusResponse = 
  | {
      status: "ok";
      connected: true;
      provider: "microsoft";
      account: { display_name: string; email: string };
      scopes: string[];
      updated_at: string;
    }
  | {
      status: "ok";
      connected: false;
      provider: "microsoft";
      connect_url: string;
    };

export type MicrosoftDisconnectResponse = {
  status: "ok";
  connected: false;
};
