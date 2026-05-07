import type { Metadata } from "next";
import { PostForm } from "@/components/post/PostForm";

export const metadata: Metadata = { title: "New post" };

export default function NewPostPage() {
  return (
    <div>
      <h1 className="mb-6 text-xl font-bold">Create post</h1>
      <PostForm />
    </div>
  );
}
