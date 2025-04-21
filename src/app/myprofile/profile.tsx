"use client";

import { useEffect, useState } from "react";
import { ethers } from "ethers";
import { useRouter } from "next/navigation";
import CONTRACT_ABI from "../../abi/AMDG.json";
import Image from "next/image";
import Link from "next/link";
import { AiOutlineLoading } from "react-icons/ai";
import { useTheme } from "next-themes";

const CONTRACT_ADDRESS = "0x789FB401acBA27e8fAeC793CC392536Da43BdB52";

interface Tweet {
  id: number;
  author: string;
  text: string;
  imageUrl: string;
  timeStamp: number;
  likeCount: number;
  deleted: boolean;
  username: string;
  comments: Comment[];
}

interface Comment {
  id: number;
  tweetId: number;
  author: string;
  text: string;
  timestamp: number;
  username: string;
}

export default function MyProfilePage() {
  const [__provider, setProvider] =
    useState<ethers.providers.Web3Provider | null>(null);
  const [__signer, setSigner] = useState<ethers.Signer | null>(null);
  const [__contract, setContract] = useState<ethers.Contract | null>(null);
  const [wallet, setWallet] = useState("");
  const [username, setUsername] = useState("");
  const [tweets, setTweets] = useState<Tweet[]>([]);
  const [deletedTweets, setDeletedTweets] = useState<Tweet[]>([]);
  const [myComments, setMyComments] = useState<Comment[]>([]);
  const [commentCount, setCommentCount] = useState(0);
  const { theme, setTheme } = useTheme();
  const [isLoading, setIsLoading] = useState(true);

  const router = useRouter();

  useEffect(() => {
    const initProfile = async () => {
      if (!window.ethereum) return alert("Please install MetaMask");
      const p = new ethers.providers.Web3Provider(window.ethereum);
      const s = p.getSigner();
      const addr = await s.getAddress();
      const c = new ethers.Contract(CONTRACT_ADDRESS, CONTRACT_ABI, s);

      setProvider(p);
      setSigner(s);
      setContract(c);
      setWallet(addr);

      const userInfo = await c.users(addr);
      setUsername(userInfo[0]);

      await loadMyTweets(c, addr);
      await loadMyComments(c, addr);
    };
    initProfile();
  }, []);

  const toggleDarkMode = () => {
    setTheme(theme === "dark" ? "light" : "dark");
  };

  const loadMyTweets = async (c: ethers.Contract, userAddress: string) => {
    setIsLoading(true);
    try {
      const tweetCount = await c.tweetCount();
      const all: Tweet[] = [];
      const deleted: Tweet[] = [];

      for (let i = tweetCount.toNumber() - 1; i >= 0; i--) {
        const t = await c.tweets(i);
        if (t.author.toLowerCase() === userAddress.toLowerCase()) {
          const tweetId = t.id.toNumber();
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

          const [tweetUsername] = await c.users(t.author);
          const tweetObj: Tweet = {
            id: tweetId,
            author: t.author,
            text: t.text,
            imageUrl: t.imageUrl,
            timeStamp: t.timestamp.toNumber(),
            likeCount: t.likeCount.toNumber(),
            deleted: t.deleted,
            username: tweetUsername,
            comments,
          };

          if (t.deleted) {
            deleted.push(tweetObj);
          } else {
            all.push(tweetObj);
          }
        }
      }
      setTweets(all);
      setDeletedTweets(deleted);
    } catch (error) {
      console.error("Error loading tweets:", error);
    } finally {
      setIsLoading(false); // selesai loading
    }
  };
  const loadMyComments = async (c: ethers.Contract, userAddress: string) => {
    setIsLoading(true);
    try {
      const commentCountBN = await c.commentCount();
      const totalComments = commentCountBN.toNumber();
      const comments: Comment[] = [];

      for (let i = 0; i < totalComments; i++) {
        const comment = await c.comments(i);
        if (comment.author.toLowerCase() === userAddress.toLowerCase()) {
          const tweetData = await c.tweets(comment.tweetId);
          const [tweetAuthorUsername] = await c.users(tweetData.author);
          comments.push({
            id: comment.id.toNumber(),
            tweetId: comment.tweetId.toNumber(),
            author: comment.author,
            text: comment.text,
            timestamp: comment.timestamp.toNumber(),
            username: tweetAuthorUsername,
          });
        }
      }
      setMyComments(comments);
      setCommentCount(comments.length);
    } catch (error) {
      console.error("Error loading tweets:", error);
    } finally {
      setIsLoading(false); // selesai loading
    }
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
          <div className="btn-group">
            <Link href="/myprofile" className="nav-link">
              Profile
            </Link>
            <button onClick={() => router.push("/")} className="btn">
              Log Out
            </button>
          </div>
          <label className="switch">
            <input
              type="checkbox"
              checked={theme === "dark"}
              onChange={toggleDarkMode}
            />
            <span className="slider round"></span>
          </label>
        </div>
      </header>
      {isLoading ? (
        <div style={{ textAlign: "center", padding: "20px" }}>
          <AiOutlineLoading className="loader" size={40} />
          <p>Loading data...</p>
        </div>
      ) : (
        <>
          <main className="profile-container">
            <section className="profile-card">
              <h2 className="user-name">
                Username:
                <br /> {username}
              </h2>
              <p id="walletAddress" className="wallet-address">
                Wallet: {wallet}
              </p>
            </section>
            <section className="my-tweets">
              <h3>My Tweets</h3>
              {tweets.map((tweet) => (
                <div key={tweet.id} className="card">
                  <p>
                    <strong>{tweet.username}</strong>
                    <br />
                    <span className="tweet-meta">
                      {tweet.author} -{" "}
                      {new Date(tweet.timeStamp * 1000).toLocaleString()}
                    </span>
                  </p>
                  <p>{tweet.text}</p>
                  {tweet.imageUrl && (
                    <Image
                      src={tweet.imageUrl}
                      alt="Tweet"
                      className="tweet-Image"
                    />
                  )}
                  <p className="tweet-stats">
                    Likes: {tweet.likeCount} | Comments: {tweet.comments.length}
                  </p>
                  <div className="tweet-comments">
                    {tweet.comments.map((comment) => (
                      <p key={comment.id} className="tweet-comment">
                        <strong>{comment.username}</strong>
                        <br />
                        <span className="tweet-meta">
                          {comment.author} -{" "}
                          {new Date(comment.timestamp * 1000).toLocaleString()}
                        </span> 
                        :<br /> {comment.text}
                      </p>
                    ))}
                  </div>
                </div>
              ))}
            </section>

            <section className="my-tweets">
              <h3>Deleted Tweets</h3>
              {deletedTweets.length === 0 ? (
                <p
                  style={{
                    color: "gray",
                    fontStyle: "italic",
                    textAlign: "center",
                    justifyContent: "center",
                  }}
                >
                  No Deleted Tweets
                </p>
              ) : (
                <>
                  {deletedTweets.map((tweet) => (
                    <div key={tweet.id} className="card">
                      <p>
                        <strong>{tweet.username}</strong>
                        <br />
                        <span className="tweet-meta">
                          {tweet.author} -{" "}
                          {new Date(tweet.timeStamp * 1000).toLocaleString()}
                        </span>
                      </p>
                      <p>{tweet.text}</p>
                      {tweet.imageUrl && (
                        <Image
                          src={tweet.imageUrl}
                          alt="Tweet"
                          className="tweet-Image"
                        />
                      )}
                      <p className="tweet-stats">
                        Likes: {tweet.likeCount} | Comments:{" "}
                        {tweet.comments.length}
                      </p>
                      <div className="tweet-comments">
                        {tweet.comments.map((comment) => (
                          <p key={comment.id} className="tweet-comment">
                            <strong>{comment.username}</strong>
                            <br />
                            <span className="tweet-meta">
                              {comment.author} -{" "}
                              {new Date(
                                comment.timestamp * 1000
                              ).toLocaleString()}
                            </span>
                            : {comment.text}
                          </p>
                        ))}
                      </div>
                    </div>
                  ))}
                </>
              )}
            </section>

            <section className="my-comments">
              <div>
                <h3>My Comments</h3>
                {myComments.map((comment) => (
                  <div key={comment.id} className="card">
                    <p>
                      <strong>
                        Comment on {comment.username}&apos;s tweet
                      </strong>
                    </p>
                    <p>{comment.text}</p>
                    <p style={{ fontSize: "0.8em", color: "gray" }}>
                      {new Date(comment.timestamp * 1000).toLocaleString()}
                    </p>
                  </div>
                ))}
                <p id="myCommentCount">Comments Count: {commentCount}</p>
              </div>
            </section>
          </main>
        </>
      )}
    </>
  );
}
