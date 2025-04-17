"use client";


import { useEffect, useState, useRef } from "react";
import { ethers } from "ethers";
import CONTRACT_ABI from "../../abi/AMDG.json";
import Link from "next/link";
import Image from "next/image";
import { AiOutlineLoading } from "react-icons/ai";

const CONTRACT_ADDRESS = "0x789FB401acBA27e8fAeC793CC392536Da43BdB52";

interface Tweet {
  id: number;
  author: string;
  text: string;
  imageUrl: string;
  timestamp: number;
  likeCount: number;
  deleted: boolean;
  username: string;
  comments: Comment[];
  hasLiked: boolean;
}

interface Comment {
  id: number;
  tweetId: number;
  author: string;
  text: string;
  timestamp: number;
  username: string;
}

export default function MainPage() {
  const [__provider, setProvider] =
    useState<ethers.providers.Web3Provider | null>(null);
  const [__signer, setSigner] = useState<ethers.Signer | null>(null);
  const [contracts, setContracts] = useState<ethers.Contract | null>(null);
  const [tweets, setTweets] = useState<Tweet[]>([]);
  const [__comments, __setComments] = useState<Record<number, Comment[]>>({});
  const [tweetText, setTweetText] = useState("");
  const [imageUrl, setImageUrl] = useState("");
  const [wallet, setWallet] = useState("");
  const [darkMode, setDarkMode] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [ commentBlank, setCommentBlank ] = useState<Record<number, boolean>>({});
  const [ tweetBlank, setTweetBlank ] = useState(false);
  const commentInputRefs = useRef<Record<number, HTMLInputElement | null>>({});

  useEffect(() => {
    const savedMode = localStorage.getItem("darkMode") === "true";
    setDarkMode(savedMode);
    document.body.classList.toggle("dark", savedMode);
    const connect = async () => {
      if (!window.ethereum) return alert("Please install MetaMask");
      const p = new ethers.providers.Web3Provider(window.ethereum);
      await p.send("eth_requestAccounts", []);
      const s = p.getSigner();
      const addr = await s.getAddress();
      const c = new ethers.Contract(CONTRACT_ADDRESS, CONTRACT_ABI, s);

      setProvider(p);
      setSigner(s);
      setContracts(c);
      setWallet(addr);
      await loadFeed(c, addr);
    };
    connect();
  }, []);

  const toggleDarkMode = () => {
    const newMode = !darkMode;
    setDarkMode(newMode);
    localStorage.setItem("darkMode", newMode.toString());
    document.body.classList.toggle("dark", newMode);
  };

  const loadFeed = async (c: ethers.Contract, addr: string) => {
    setIsLoading(true); // Loading State untuk Fetch Tweet
    try {
      const tweetCount = await c.tweetCount();
      const allTweets: Tweet[] = [];

      for (let i = tweetCount.toNumber() - 1; i >= 0; i--) {
        const t = await c.tweets(i);
        if (t.deleted) continue;

        const tweetId = t.id.toNumber();
        const [username] = await c.users(t.author);
        const hasLiked = await c.tweetLikes(t.id, addr);
        const comments: Comment[] = [];

        const commentCount = await c.commentCount();

        for (let j = 0; j < commentCount.toNumber(); j++) {
          const comment = await c.comments(j);
          if (comment.tweetId.toNumber() === tweetId) {
            const [commentUsername] = await c.users(comment.author);
            comments.push({
              id: comment.id.toNumber(),
              tweetId: tweetId,
              author: comment.author,
              text: comment.text,
              timestamp: comment.timestamp.toNumber(),
              username: commentUsername,
            });
          }
        }

        allTweets.push({
          id: t.id.toNumber(),
          author: t.author,
          text: t.text,
          imageUrl: t.imageUrl,
          timestamp: t.timestamp.toNumber(),
          likeCount: t.likeCount.toNumber(),
          deleted: t.deleted,
          username,
          comments,
          hasLiked,
        });
      }

      setTweets(allTweets);
    } catch (error) {
      console.error("Error loading tweets:", error);
    } finally {
      setIsLoading(false); // selesai loading
    }
  };

  const postTweet = async () => {
    if (!contracts) return;
    if (!tweetText.trim()) {
      setTweetBlank(true);
      return;
    };
    setTweetBlank(false);
    const tx = await contracts.postTweet(tweetText, imageUrl);
    await tx.wait();
    setTweetText("");
    setImageUrl("");
    await loadFeed(contracts, wallet);
  };

  const deleteTweet = async (id: number) => {
    if (!contracts) return;
    const tx = await contracts.deleteTweet(id);
    await tx.wait();
    await loadFeed(contracts, wallet);
  };

  const likeTweet = async (id: number) => {
    if (!contracts) return;
    try {
      const tx = await contracts.likeTweet(id);
      await tx.wait();
      await loadFeed(contracts, wallet);
    } catch (error) {
      console.error("Error liking tweet:", error);
    }
  };

  const commentTweet = async (id: number, text: string) => {
    if (!contracts) return;
    if (!text.trim()) {
      setCommentBlank((prev) => ({ ...prev, [id]: true }));
      return;
    }
    setCommentBlank((prev) => ({ ...prev, [id]: false }));
    const tx = await contracts.commentTweet(id, text);
    await tx.wait();
    await loadFeed(contracts, wallet);
  };

  const renderTweet = (t: Tweet) => {
    const likeBtnClass = t.hasLiked ? "icon-btn liked" : "icon-btn";

    return (
      <div key={t.id} className="card">
        {t.author.toLowerCase() === wallet.toLowerCase() && (
          <button className="delete-btn" onClick={() => deleteTweet(t.id)}>
            <svg className="icon-trash" viewBox="0 0 24 24">
              <polyline points="3 6 5 6 21 6"></polyline>
              <path
                d="M19 6l-2 14a2 2 0 0 1-2 2H9
                            a2 2 0 0 1-2-2L5 6m3 0V4
                            a2 2 0 0 1 2-2h4
                            a2 2 0 0 1 2 2v2"
              ></path>
            </svg>
          </button>
        )}
        <p>
          <span className="user-name">{t.username}</span>
          <br />
          <span className="tweet-meta">
            {t.author} - {new Date(t.timestamp * 1000).toLocaleString()}
          </span>
        </p>
        <p>{t.text}</p>
        {t.imageUrl && (
          <Image
            src={t.imageUrl}
            alt="Tweet Image"
            style={{ maxWidth: "100%", borderRadius: "8px" }}
          />
        )}
        <p>Likes: {t.likeCount}</p>
        <div className="comment-section">
          <button
            className={likeBtnClass}
            onClick={() => likeTweet(t.id)}
            title="Like"
          >
            <svg className="icon-heart" viewBox="0 0 24 24">
              <path
                d="M20.84 4.61a5.5 5.5 0 0 0-7.78
                                0L12 5.67l-1.06-1.06a5.5 5.5 0
                                0 0-7.78 7.78l1.06 1.06L12
                                21.23l7.78-7.78 1.06-1.06
                                a5.5 5.5 0 0 0 0-7.78z"
              ></path>
            </svg>
          </button>
          <input
            ref={(el) => {
              commentInputRefs.current[t.id] = el;
            }}
            className={`input comment-input ${commentBlank[t.id] ? "comment-blank" : ""}`}
            type="text"
            placeholder="Add a comment"
            onChange={(e) => {
              if (commentBlank[t.id] && e.target.value.trim() !== "") {
                setCommentBlank((prev) => ({ ...prev, [t.id]: false }));
              }
            }}
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                commentTweet(t.id, (e.target as HTMLInputElement).value);
                (e.target as HTMLInputElement).value = "";
              }
            }}
          />
          <button
            className="icon-btn"
            onClick={() => {
              const value = commentInputRefs.current[t.id]?.value;
              if (value) {
                commentTweet(t.id, value);
                commentInputRefs.current[t.id]!.value = "";
              }
            }}
            title="Comment"
          >
            <svg
              className="icon-comment"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <path
                d="M21 15a2 2 0 0 1-2 2H7
                                    l-4 4V5a2 2 0 0 1 2-2h14
                                    a2 2 0 0 1 2 2z"
              ></path>
            </svg>
          </button>
        </div>
        {t.comments.length > 0 && (
          <div className="tweet-comments">
            {t.comments.map((comment) => (
              <p key={comment.id} className="tweet-comment">
                <strong>{comment.username}</strong>
                <br />
                <span className="tweet-meta">
                  {comment.author} -{" "}
                  {new Date(comment.timestamp * 1000).toLocaleString()}
                </span>
                : {comment.text}
              </p>
            ))}
          </div>
        )}
      </div>
    );
  };

  return (
    <>
      <header className="navbar">
        <div className="nav-left">
          <Link href="/main" className="nav-logo">
            AMDG
          </Link>
        </div>
        <div className="nav-right">
          <Link href="/myprofile" className="nav-link">
            Profile
          </Link>
          <label className="switch">
            <input
              type="checkbox"
              checked={darkMode}
              onChange={toggleDarkMode}
            />
            <span className="slider round" />
          </label>
        </div>
      </header>
      <main className="feed-container">
        <section className="new-tweet">
          <textarea
            value={tweetText}
            onChange={(e) => {
              setTweetText(e.target.value);
              if (tweetBlank && e.target.value.trim() !== "") {
                setTweetBlank(false);
              }
            }}
            className={`tweet-input ${tweetBlank ? "tweet-blank" : ""}`}
            placeholder="What's happening?"
          />
          <input
            value={imageUrl}
            onChange={(e) => setImageUrl(e.target.value)}
            className="input"
            placeholder="Image URL (optional)"
          />
          <button className="btn" onClick={postTweet}>
            Tweet
          </button>
        </section>

        {isLoading ? (
          <div style={{ textAlign: "center", padding: "20px" }}>
            <AiOutlineLoading className="loader"></AiOutlineLoading>
            <p>Tweets Incoming!!!</p>
          </div>
        ) : (
          <section className="feed">
            {tweets.length === 0 ? (
              <p>No tweets yet.</p>
            ) : (
              tweets.map(renderTweet)
            )}
          </section>
        )}
      </main>
    </>
  );
}
