import React, { useState } from 'react';
import { sha256 } from '@noble/hashes/sha256';
import * as secp256k1 from '@noble/secp256k1';
import { bech32 } from 'bech32';

const chainId = "sentinelhub-2"; // use your actual Cosmos chain ID


async function verifySignatureFrontend(message, signatureBase64, pubkeyBase64, expectedAddress, prefix = 'sent') {
    try {
      const pubkey = Uint8Array.from(atob(pubkeyBase64), c => c.charCodeAt(0)); // 33-byte compressed key
      const signature = Uint8Array.from(atob(signatureBase64), c => c.charCodeAt(0)); // 64-byte
  
      const msgHash = sha256(new TextEncoder().encode(message)); // Ensure UTF-8 match
  
      const isValid = secp256k1.verify(signature, msgHash, pubkey);
      if (!isValid) return false;
  
      // Get address from pubkey
      const addressBytes = sha256(pubkey).slice(0, 20);
      const derivedAddress = bech32.encode(prefix, bech32.toWords(addressBytes));
  
      console.log('Derived address:', derivedAddress);
      return derivedAddress === expectedAddress;
    } catch (err) {
      console.error('Verification error:', err);
      return false;
    }
  }
  


const KeplrSignComponent = () => {
  const [walletAddress, setWalletAddress] = useState('');
  const [isConnected, setIsConnected] = useState(false);
  const [signatureResult, setSignatureResult] = useState(null);
  const [loading, setLoading] = useState(false);

  const connectWallet = async () => {
    try {
      setLoading(true);

      if (!window.keplr) {
        alert('Please install Keplr extension');
        return;
      }

      // Enable Keplr for the chain
      await window.keplr.enable(chainId);

      // Get offline signer
      const offlineSigner = window.getOfflineSigner(chainId);
      const accounts = await offlineSigner.getAccounts();

      setWalletAddress(accounts[0].address);
      setIsConnected(true);
    } catch (error) {
      console.error('Connection failed:', error);
      alert('Failed to connect to Keplr: ' + error.message);
    } finally {
      setLoading(false);
    }
  };

  const handleSign = async () => {
    try {
      setLoading(true);
  
      const message = '0123456789' // store exact message
  
      const result = await window.keplr.signArbitrary(chainId, walletAddress, message);
      const { signature, pub_key } = result;
  
      console.log("🔐 Signature:", signature);
      console.log("📬 Pubkey:", pub_key);
      console.log("👛 Wallet Address:", walletAddress);
      console.log("📝 Message:", message);
  
      setSignatureResult(result);
  
      const isFrontendVerified = await verifySignatureFrontend(
        message,
        signature,
        pub_key.value,
        walletAddress,
        'sent'
      );
  
      console.log('✅ Frontend verified:', isFrontendVerified);
  
      if (!isFrontendVerified) {
        alert('❌ Signature is invalid!');
        return;
      }
  
      await sendToBackend(signature, pub_key, message);
  
    } catch (error) {
      console.error('Signing failed:', error);
      alert('Signing failed: ' + error.message);
    } finally {
      setLoading(false);
    }
  };
  

  const sendToBackend = async (signature, pubkey, message) => {
    try {
      const response = await fetch('/api/verify-signature', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message,
          signature,
          pubkey,
          address: walletAddress,
          chainId,
        }),
      });

      const result = await response.json();
      console.log('Backend result:', result);
    } catch (error) {
      console.error('Backend error:', error);
    }
  };

  return (
    <div style={{ padding: '20px', maxWidth: '600px', margin: '0 auto' }}>
      <h2>Keplr Wallet (Sentinel) Signer</h2>

      {!isConnected ? (
        <button
          onClick={connectWallet}
          disabled={loading}
          style={{ padding: '10px 20px', marginBottom: '10px' }}
        >
          {loading ? 'Connecting...' : 'Connect Keplr Wallet'}
        </button>
      ) : (
        <div>
          <p><strong>Connected:</strong> {walletAddress}</p>
          <button
            onClick={handleSign}
            disabled={loading}
            style={{ padding: '10px 20px', marginBottom: '10px' }}
          >
            {loading ? 'Signing...' : 'Sign and Send to Backend'}
          </button>
          <button
            onClick={() => setIsConnected(false)}
            style={{ padding: '10px 20px', marginLeft: '10px' }}
          >
            Disconnect
          </button>
        </div>
      )}

      {signatureResult && (
        <div style={{ marginTop: '20px', padding: '15px', backgroundColor: '#f5f5f5', borderRadius: '5px' }}>
          <h3>Signature Result:</h3>
          <pre style={{ fontSize: '12px', overflow: 'auto' }}>
            {JSON.stringify(signatureResult, null, 2)}
          </pre>
        </div>
      )}
    </div>
  );
};

export default KeplrSignComponent;
