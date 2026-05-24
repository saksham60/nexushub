export type MicrosoftStatusResponse = 
  | {
      connected: true;
      provider: "microsoft";
      display_name?: string;
      email?: string;
      scopes: string[];
    }
  | {
      connected: false;
      provider: "microsoft";
      connect_url: string;
    };

export type MicrosoftDisconnectResponse = {
  connected: false;
  provider?: "microsoft";
};
