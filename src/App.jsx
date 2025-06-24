import React, { useState, useEffect } from 'react';
import { Wallet, CheckCircle, AlertCircle, Copy, RefreshCw } from 'lucide-react';

const KeplrSignatureApp = () => {
  const [walletAddress, setWalletAddress] = useState('');
  const [isConnected, setIsConnected] = useState(false);
  const [chainId, setChainId] = useState('network');
  const [message, setMessage] = useState('Please sign this message to verify your wallet ownership');
  const [signature, setSignature] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const [verificationResult, setVerificationResult] = useState(null);

  // Check if Keplr is installed
  useEffect(() => {
    if (!window.keplr) {
      setError('Keplr wallet is not installed. Please install Keplr extension.');
    }
  }, []);

  // Connect to Keplr wallet
  const connectWallet = async () => {
    console.log("enter");
    if (!window.keplr) {
      setError('Keplr wallet is not installed');
      return;
    }

    try {
      setIsLoading(true);
      setError('');

      // Enable the chain
      await window.keplr.enable(chainId);

      // Get the offline signer
      const offlineSigner = window.getOfflineSigner(chainId);
      const accounts = await offlineSigner.getAccounts();
      console.log("🚀 ~ connectWal ~ accounts:", accounts)

      if (accounts.length > 0) {
        setWalletAddress(accounts[0].address);
        setIsConnected(true);
      }
    } catch (err) {
      setError(`Failed to connect wallet: ${err.message}`);
    } finally {
      setIsLoading(false);
    }
  };

  // Sign message with Keplr
  const signMessage = async () => {
    if (!window.keplr || !walletAddress) {
      setError('Wallet not connected');
      return;
    }

    try {
      setIsLoading(true);
      setError('');
      setSignature('');
      setVerificationResult(null);

      // Sign arbitrary data
      const signResponse = await window.keplr.signArbitrary(
        chainId,
        walletAddress,
        message
      );

      setSignature(JSON.stringify(signResponse, null, 2));
      
      // Auto-verify the signature
      await verifySignature(signResponse);
      
    } catch (err) {
      setError(`Failed to sign message: ${err.message}`);
    } finally {
      setIsLoading(false);
    }
  };

  // Verify signature (client-side verification)
  const verifySignature = async (signResponse) => {
    try {
      // Import necessary modules for verification
      // Note: In a real app, you might want to do server-side verification
      const { verifyADR36Amino } = await import('@keplr-wallet/cosmos');
      
      const isValid = verifyADR36Amino(
        'cosmos', // prefix
        walletAddress,
        message,
        signResponse.pub_key,
        signResponse.signature
      );

      setVerificationResult({
        isValid,
        publicKey: signResponse.pub_key,
        signature: signResponse.signature
      });
    } catch (err) {
      setError(`Verification failed: ${err.message}`);
    }
  };

  // Copy to clipboard
  const copyToClipboard = (text) => {
    navigator.clipboard.writeText(text);
  };

  // Disconnect wallet
  const disconnectWallet = () => {
    setWalletAddress('');
    setIsConnected(false);
    setSignature('');
    setVerificationResult(null);
    setError('');
  };

  // Change chain
  const changeChain = async (newChainId) => {
    setChainId(newChainId);
    if (isConnected) {
      disconnectWallet();
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-900 via-blue-900 to-indigo-900 p-4">
      <div className="max-w-4xl mx-auto">
        <div className="text-center mb-8">
          <h1 className="text-4xl font-bold text-white mb-2 flex items-center justify-center gap-3">
            <Wallet className="h-10 w-10" />
            Keplr Signature Verifier
          </h1>
          <p className="text-blue-200">Connect your Keplr wallet and sign messages for verification</p>
        </div>

        {error && (
          <div className="bg-red-500/20 border border-red-500 rounded-lg p-4 mb-6 flex items-center gap-3">
            <AlertCircle className="h-5 w-5 text-red-400" />
            <span className="text-red-200">{error}</span>
          </div>
        )}

        <div className="grid gap-6 md:grid-cols-2">
          {/* Connection Panel */}
          <div className="bg-white/10 backdrop-blur-lg rounded-xl p-6 border border-white/20">
            <h2 className="text-xl font-semibold text-white mb-4">Wallet Connection</h2>
            
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  Chain Selection
                </label>
                <select
                  value={chainId}
                  onChange={(e) => changeChain(e.target.value)}
                  className="w-full px-3 py-2 bg-white/10 border border-white/30 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                  disabled={isConnected}
                >
                  <option value="cosmoshub-4">Cosmos Hub</option>
                  <option value="osmosis-1">Osmosis</option>
                  <option value="juno-1">Juno</option>
                  <option value="stargaze-1">Stargaze</option>
                </select>
              </div>

              {!isConnected ? (
                <button
                  onClick={connectWallet}
                  // disabled={isLoading || !window.keplr}
                  className="w-full bg-gradient-to-r from-blue-500 to-purple-600 text-white py-3 px-4 rounded-lg font-medium hover:from-blue-600 hover:to-purple-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                >
                  {isLoading ? (
                    <RefreshCw className="h-4 w-4 animate-spin" />
                  ) : (
                    <Wallet className="h-4 w-4" />
                  )}
                  {isLoading ? 'Connecting...' : 'Connect Keplr Wallet'}
                </button>
              ) : (
                <div className="space-y-3">
                  <div className="flex items-center gap-2 text-green-400">
                    <CheckCircle className="h-4 w-4" />
                    <span className="text-sm">Wallet Connected</span>
                  </div>
                  
                  <div className="bg-white/5 rounded-lg p-3">
                    <p className="text-xs text-gray-400 mb-1">Address:</p>
                    <div className="flex items-center gap-2">
                      <p className="text-white font-mono text-sm break-all">{walletAddress}</p>
                      <button
                        onClick={() => copyToClipboard(walletAddress)}
                        className="text-gray-400 hover:text-white"
                      >
                        <Copy className="h-4 w-4" />
                      </button>
                    </div>
                  </div>

                  <button
                    onClick={disconnectWallet}
                    className="w-full bg-gray-600 text-white py-2 px-4 rounded-lg font-medium hover:bg-gray-700"
                  >
                    Disconnect
                  </button>
                </div>
              )}
            </div>
          </div>

          {/* Signature Panel */}
          <div className="bg-white/10 backdrop-blur-lg rounded-xl p-6 border border-white/20">
            <h2 className="text-xl font-semibold text-white mb-4">Message Signing</h2>
            
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  Message to Sign
                </label>
                <textarea
                  value={message}
                  onChange={(e) => setMessage(e.target.value)}
                  className="w-full px-3 py-2 bg-white/10 border border-white/30 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-blue-500 min-h-[80px]"
                  placeholder="Enter message to sign..."
                />
              </div>

              <button
                onClick={signMessage}
                disabled={!isConnected || isLoading || !message.trim()}
                className="w-full bg-gradient-to-r from-green-500 to-teal-600 text-white py-3 px-4 rounded-lg font-medium hover:from-green-600 hover:to-teal-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
              >
                {isLoading ? (
                  <RefreshCw className="h-4 w-4 animate-spin" />
                ) : (
                  <CheckCircle className="h-4 w-4" />
                )}
                {isLoading ? 'Signing...' : 'Sign Message'}
              </button>
            </div>
          </div>
        </div>

        {/* Signature Results */}
        {signature && (
          <div className="mt-6 bg-white/10 backdrop-blur-lg rounded-xl p-6 border border-white/20">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-xl font-semibold text-white">Signature Result</h2>
              <button
                onClick={() => copyToClipboard(signature)}
                className="text-gray-400 hover:text-white flex items-center gap-2"
              >
                <Copy className="h-4 w-4" />
                Copy
              </button>
            </div>
            
            <div className="bg-black/30 rounded-lg p-4 mb-4">
              <pre className="text-green-400 text-sm overflow-x-auto whitespace-pre-wrap">
                {signature}
              </pre>
            </div>

            {verificationResult && (
              <div className="space-y-3">
                <div className={`flex items-center gap-2 ${verificationResult.isValid ? 'text-green-400' : 'text-red-400'}`}>
                  <CheckCircle className="h-4 w-4" />
                  <span className="font-medium">
                    Verification: {verificationResult.isValid ? 'Valid' : 'Invalid'}
                  </span>
                </div>
                
                <div className="grid gap-2 text-sm">
                  <div>
                    <span className="text-gray-400">Public Key: </span>
                    <span className="text-white font-mono break-all">
                      {JSON.stringify(verificationResult.publicKey)}
                    </span>
                  </div>
                  <div>
                    <span className="text-gray-400">Signature: </span>
                    <span className="text-white font-mono break-all">
                      {verificationResult.signature}
                    </span>
                  </div>
                </div>
              </div>
            )}
          </div>
        )}

        {/* Instructions */}
        <div className="mt-6 bg-white/5 backdrop-blur-lg rounded-xl p-6 border border-white/10">
          <h3 className="text-lg font-semibold text-white mb-3">How to Use</h3>
          <div className="space-y-2 text-gray-300 text-sm">
            <p>1. Make sure you have Keplr wallet extension installed</p>
            <p>2. Select your desired Cosmos chain</p>
            <p>3. Click "Connect Keplr Wallet" and approve the connection</p>
            <p>4. Enter a message you want to sign</p>
            <p>5. Click "Sign Message" and approve in Keplr</p>
            <p>6. The signature will be automatically verified</p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default KeplrSignatureApp;