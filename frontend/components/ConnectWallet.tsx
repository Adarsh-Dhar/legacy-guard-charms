"use client";
import { useUnisat } from "@/hooks/useUnisat";

export default function ConnectWallet() {
  const { connectWallet, address, isConnected, network } = useUnisat();

  const formatAddress = (addr: string) => {
    return addr ? `${addr.slice(0, 6)}...${addr.slice(-4)}` : "";
  };

  return (
    <div className="flex gap-4 items-center">
      {isConnected ? (
        <div className="flex items-center gap-3 bg-gray-900 border border-gray-700 rounded-full px-4 py-2">
          {/* Network Indicator */}
          <div className="flex items-center gap-2">
            <span className={`w-2 h-2 rounded-full ${network === 'testnet' ? 'bg-green-500' : 'bg-red-500'}`} />
            <span className="text-xs text-gray-400 uppercase">{network || "Unknown"}</span>
          </div>
          
          {/* Address Display */}
          <span className="font-mono text-white font-bold">
            {formatAddress(address)}
          </span>
        </div>
      ) : (
        <button
          onClick={connectWallet}
          className="bg-orange-500 hover:bg-orange-600 text-white font-bold py-2 px-6 rounded-lg transition-all shadow-lg hover:shadow-orange-500/20"
        >
          Connect UniSat
        </button>
      )}
    </div>
  );
}
