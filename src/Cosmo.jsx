import React, { useState } from 'react';
import { Buffer } from 'buffer';
import sha3 from "js-sha3";
import { message } from "antd";
import { arrayify } from "@ethersproject/bytes";
import { serializeSignDoc } from "@cosmjs/launchpad";
import { signatureToPubkey } from "@hanchon/signature-to-pubkey";

const chainId = 'sentinelhub-2'; // use your actual Cosmos chain ID

const KeplrSignComponent = () => {
  const [walletAddress, setWalletAddress] = useState('');
  const [isConnected, setIsConnected] = useState(false);
  const [signatureResult, setSignatureResult] = useState(null);
  const [loading, setLoading] = useState(false);

  window.Buffer=Buffer;

  function messageToAminoTransaction(signer, data) {
    return {
      chain_id: "",
      account_number: "0",
      sequence: "0",
      fee: {
        gas: "0",
        amount: [],
      },
      msgs: [
        {
          type: "sign/MsgSignData",
          value: {
            signer,
            data,
          },
        },
      ],
      memo: "",
    };
  }

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

  const computePubKey = (address, signature, signMessage) => {
    try {
      // Encode the message into amino format
      const aminoEncoded = messageToAminoTransaction(
        address,
        Buffer.from(signMessage).toString("base64")
      );
      const serialized = serializeSignDoc(aminoEncoded);
  
      // Hash the amino message that was signed
      const hashed = sha3.keccak_256(arrayify(serialized));
  
      // Compare signature
      const signatureToCompare = `0x${Buffer.from(signature, "base64").toString(
        "hex"
      )}`;
  
      const pubkeyComputed = signatureToPubkey(
        signatureToCompare,
        Buffer.from(hashed, "hex")
      );
      console.log("🚀 ~ computePubKey ~ pubkeyComputed:", pubkeyComputed)
      return pubkeyComputed;
    } catch (err) {
      console.error("err", err);
      message.error(err?.message);
    }
  };

  const handleSign = async () => {
    try {
      setLoading(true);

      const message = walletAddress; // OR use any unique string, like a nonce
      console.log("🚀 Signing message:", message);
  
      const result = await window.keplr.signArbitrary(
        chainId,
        walletAddress,
        message
      );
      console.log("🚀 ~ handleSign ~ result:", result)
  
      const { signature, pub_key } = result;
  
      // 🔐 Compute the public key from signature
      const pubKeyFromSignature = computePubKey(walletAddress, signature, message);
  
      if (!pubKeyFromSignature) {
        alert("❌ Could not compute public key from signature.");
        return;
      }
  
      // Log or display for dev/debug purposes
      console.log("🔍 Computed PubKey:", pubKeyFromSignature);
  
      // Store the result to show in UI (optional)
      setSignatureResult({
        ...result,
        computed_pubkey: pubKeyFromSignature,
      });
  
      // ✅ Send everything to backend for verification
      await sendToBackend(signature, pub_key, message, pubKeyFromSignature);
    } catch (error) {
      console.error('❌ Signing failed:', error);
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
