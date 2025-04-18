"use client";

import { useEffect, useState } from "react";
import { ethers } from "ethers";
import { useRouter } from "next/navigation";
import { AiOutlineLoading } from "react-icons/ai";
import CONTRACT_ABI from "../abi/AMDG.json";

const CONTRACT_ADDRESS = "0x789FB401acBA27e8fAeC793CC392536Da43BdB52";

export default function LoginPage() {
  const [wallet, setWallet] = useState<string | null>(null);
  const [username, setUsername] = useState("");
  const [isRegistered, setIsRegistered] = useState<boolean | null>(null);
  const [contract, setContract] = useState<ethers.Contract | null>(null);
  const [connectLoading, setConnectLoading] = useState(false);
  const [darkMode, setDarkMode] = useState(false);

  const router = useRouter();

  useEffect(() => {
    const savedMode = localStorage.getItem("darkMode") === "true";
    setDarkMode(savedMode);
    document.body.classList.toggle("dark", savedMode);
  }, []);

  const toggleDarkMode = () => {
    const newMode = !darkMode;
    setDarkMode(newMode);
    localStorage.setItem("darkMode", newMode.toString());
    document.body.classList.toggle("dark", newMode);
  };

  const connectWallet = async () => {
    if (!window.ethereum) return alert("Please install MetaMask");
    setConnectLoading(true);
    try {
      if (window.ethereum.request) {
        await window.ethereum.request({ method: "eth_requestAccounts" });
      }
      const provider = new ethers.providers.Web3Provider(window.ethereum);
      await provider.send("eth_requestAccounts", []);
      const signer = provider.getSigner();
      const address = await signer.getAddress();
      const contractInstance = new ethers.Contract(
        CONTRACT_ADDRESS,
        CONTRACT_ABI,
        signer
      );

      setWallet(address);
      setContract(contractInstance);

      const user = await contractInstance.users(address);
      setIsRegistered(user[1]);
    } catch (error) {
      console.error("Error connecting to wallet", error);
    } finally {
      setConnectLoading(false);
    }
  };
  const disconnectWallet = () => {
    setWallet(null);
    setIsRegistered(null);
    setContract(null);
  };
  const registerUser = async () => {
    if (!contract || username.trim() === "") return;
    try {
      const tx = await contract.registerUser(username);
      await tx.wait();
      alert("Registration successful");
      setIsRegistered(true);
    } catch (err) {
      console.error("Registration Failed", err);
    }
  };

  const loginUser = () => {
    router.push("/main");
  };

  return (
    <div className="login-container">
      <div className="login-card">
        <h1 className="logo">AMDG</h1>
        <h2>Sign in to your account</h2>

        {!wallet && (
          <button className="btn" onClick={connectWallet} disabled={connectLoading}>
            {connectLoading ? (
              <AiOutlineLoading className="btn-loader" />
            ) : (
              "Connect Wallet"
            )}
          </button>
        )}

        {/* Jika belum teregister */}
        {wallet && isRegistered === false && (
          <div id="registrationSection">
            <input
              type="text"
              className="input"
              placeholder="Username"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
            />
            <button className="btn" onClick={registerUser}>
              Register
            </button>
          </div>
        )}

        {/* Jika sudah teregister */}
        {wallet && isRegistered === true && (
          <div id="loginSection" className="btn-group">
            <button className="btn" onClick={loginUser}>
              Login
            </button>
            <button className="btn" onClick={disconnectWallet}>
              Disconnect Wallet
            </button>
          </div>
        )}

        {/* Dark mode toggle */}
        <div className="toggle-container">
          <label className="switch">
            <input
              type="checkbox"
              checked={darkMode}
              onChange={toggleDarkMode}
            />
            <span className="slider round" />
          </label>
          <span id="modeLabel" className="toggle-label">
            {darkMode ? "Dark Mode" : "Light Mode"}
          </span>
        </div>
      </div>
    </div>
  );
}
