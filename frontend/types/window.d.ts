export {};

declare global {
  interface Window {
    unisat: {
      requestAccounts: () => Promise<string[]>;
      getAccounts: () => Promise<string[]>;
      getNetwork: () => Promise<string>;
      switchNetwork: (network: string) => Promise<void>;
      getPublicKey: () => Promise<string>;
      signPsbt: (psbtHex: string, options?: any) => Promise<string>;
      // Add other methods if needed
    };
  }
}
