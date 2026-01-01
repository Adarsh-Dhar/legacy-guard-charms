"use client";
import { useState, useEffect } from "react";

export function useUnisat() {
  const [address, setAddress] = useState<string>("");
  const [isConnected, setIsConnected] = useState(false);
  const [network, setNetwork] = useState<string>("");
  const [isWalletReady, setIsWalletReady] = useState(false);
  const [publicKey, setPublicKey] = useState<string>("");

  // Wait for UniSat wallet to be injected
  useEffect(() => {
    const checkWallet = () => {
      if (typeof window !== "undefined" && typeof window.unisat !== "undefined") {
        setIsWalletReady(true);
        return true;
      }
      return false;
    };

    // Check immediately
    if (checkWallet()) return;

    // If not found, retry for up to 3 seconds
    let attempts = 0;
    const maxAttempts = 10;
    const interval = setInterval(() => {
      attempts++;
      if (checkWallet() || attempts >= maxAttempts) {
        clearInterval(interval);
      }
    }, 300);

    return () => clearInterval(interval);
  }, []);

  const connectWallet = async () => {
    // Wait a bit for wallet to load if needed
    if (!isWalletReady) {
      await new Promise(resolve => setTimeout(resolve, 500));
    }

    if (typeof window === "undefined" || typeof window.unisat === "undefined") {
      alert("Please install UniSat Wallet!");
      window.open("https://unisat.io/", "_blank");
      return;
    }

    try {
      // 1. Request accounts
      const accounts = await window.unisat.requestAccounts();
      const currentAccount = accounts[0];
      setAddress(currentAccount);
      setIsConnected(true);

      // 2. Get public key
      try {
        const pubkey = await window.unisat.getPublicKey();
        setPublicKey(pubkey);
      } catch (pkError) {
        console.warn("Could not retrieve public key:", pkError);
      }

      // 3. Ensure we are on Testnet (Crucial for Hackathon)
      const currentNetwork = await window.unisat.getNetwork();
      if (currentNetwork !== "testnet") {
        try {
          await window.unisat.switchNetwork("testnet");
          setNetwork("testnet");
        } catch (e) {
          console.error("Failed to switch network:", e);
          alert("Please switch your UniSat wallet to TESTNET manually.");
        }
      } else {
        setNetwork(currentNetwork);
      }
    } catch (e) {
      console.error("Connection failed:", e);
    }
  };

  // Auto-connect if already authorized
  useEffect(() => {
    if (isWalletReady && typeof window.unisat !== "undefined") {
      window.unisat.getAccounts().then((accounts) => {
        if (accounts.length > 0) {
          setAddress(accounts[0]);
          setIsConnected(true);
          window.unisat.getNetwork().then(setNetwork);
          
          // Also get public key
          window.unisat.getPublicKey().then(setPublicKey).catch((err: any) => {
            console.log("Could not auto-retrieve public key:", err);
          });
        }
      }).catch((err) => {
        console.log("Auto-connect not available:", err);
      });
    }
  }, [isWalletReady]);

  return {
    connectWallet,
    address,
    isConnected,
    network,
    publicKey,
    isUnisatInstalled: isWalletReady,
  };
}
