"use client";

import Link from "next/link";
import { useState } from "react";
import { Avatar } from "@/components/ui/Avatar";
import { Button } from "@/components/ui/Button";
import { PostCard } from "@/components/feed/PostCard";
import { FlagIcon } from "@/components/flags/FlagIcon";
import { FollowersModal } from "@/components/social/FollowersModal";

interface User {
  id: string;
  username: string;
  displayName: string;
  avatarUrl?: string | null;
  bio?: string | null;
  visibility: string;
  _count: { posts: number; followers: number; following: number };
}

interface Props {
  user: User;
  viewerId: string | null;
  blockContext: { note: string | null; hashtag: string | null } | null;
}

export function ProfileView({ user, viewerId, blockContext }: Props) {
  const [following, setFollowing] = useState(false);
  const [posts, setPosts] = useState<unknown[]>([]);
  const [loaded, setLoaded] = useState(false);
  const [modalType, setModalType] = useState<"followers" | "following" | null>(null);

  const isOwn = viewerId === user.id;

  async function toggleFollow() {
    const method = following ? "DELETE" : "POST";
    const url = following
      ? `/api/follow?targetUserId=${user.id}`
      : "/api/follow";
    const res = await fetch(url, {
      method,
      headers: { "Content-Type": "application/json" },
      ...(following ? {} : { body: JSON.stringify({ targetUserId: user.id }) }),
    });
    if (res.ok) setFollowing((f) => !f);
  }

  async function loadPosts() {
    if (loaded) return;
    const res = await fetch(`/api/users/${user.username}/posts`);
    const data = await res.json();
    setPosts(data);
    setLoaded(true);
  }

  if (!loaded) loadPosts();

  return (
    <div>
      {/* Block context banner */}
      {blockContext && (
        <div className="mb-4 rounded-xl bg-amber-50 px-4 py-3 text-sm text-amber-800 dark:bg-amber-950 dark:text-amber-300">
          <p className="font-medium">This user has restricted you</p>
          {blockContext.note && <p className="mt-1">{blockContext.note}</p>}
          {blockContext.hashtag && <p className="mt-0.5 text-xs">#{blockContext.hashtag}</p>}
        </div>
      )}

      {/* Header */}
      <div className="mb-6 flex items-start gap-4">
        <Avatar src={user.avatarUrl} username={user.username} size="xl" />
        <div className="flex-1">
          <div className="flex items-center gap-1.5">
            <h1 className="text-xl font-bold">{user.displayName}</h1>
            <FlagIcon targetUserId={user.id} viewerId={viewerId} />
          </div>
          <p className="text-neutral-500">@{user.username}</p>
          {user.bio && <p className="mt-2 text-sm">{user.bio}</p>}

          <div className="mt-3 flex gap-4 text-sm">
            <span><strong>{user._count.posts}</strong> posts</span>
            <button onClick={() => setModalType("followers")} className="hover:underline">
              <strong>{user._count.followers}</strong> followers
            </button>
            <button onClick={() => setModalType("following")} className="hover:underline">
              <strong>{user._count.following}</strong> following
            </button>
          </div>

          {!isOwn && viewerId && (
            <div className="mt-3 flex gap-2">
              <Button size="sm" variant={following ? "secondary" : "primary"} onClick={toggleFollow}>
                {following ? "Following" : "Follow"}
              </Button>
              <Link href={`/${user.username}/activity`}>
                <Button size="sm" variant="secondary">Interactions</Button>
              </Link>
            </div>
          )}
          {isOwn && (
            <div className="mt-3 flex gap-2">
              <Link href="/settings">
                <Button size="sm" variant="secondary">Edit profile</Button>
              </Link>
              <Link href={`/${user.username}/activity`}>
                <Button size="sm" variant="secondary">Activity</Button>
              </Link>
            </div>
          )}
        </div>
      </div>

      {/* Posts grid */}
      <div>
        {(posts as { id: string }[]).map((post) => (
          <PostCard key={(post as { id: string }).id} post={post as Parameters<typeof PostCard>[0]["post"]} viewerId={viewerId} />
        ))}
      </div>

      <FollowersModal
        username={user.username}
        type={modalType ?? "followers"}
        open={modalType !== null}
        onClose={() => setModalType(null)}
      />
    </div>
  );
}
