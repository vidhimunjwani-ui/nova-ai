"use client";

import { useState, type FormEvent } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

export function ImageGenerator() {
  const [prompt, setPrompt] = useState("");
  const [imageUrl, setImageUrl] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    setImageUrl(null);

    const normalizedPrompt = prompt.trim();
    if (!normalizedPrompt) {
      setError("Please enter an image prompt.");
      return;
    }

    setIsLoading(true);

    try {
      const response = await fetch("/api/image", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ prompt: normalizedPrompt }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error ?? data.message ?? "Image generation failed.");
      }

      if (!data.imageUrl) {
        throw new Error("No image URL returned from the API.");
      }

      setImageUrl(data.imageUrl);
    } catch (error) {
      setError(error instanceof Error ? error.message : "Unexpected error");
    } finally {
      setIsLoading(false);
    }
  }

  return (
    <section className="mx-auto mb-6 w-full max-w-4xl rounded-3xl border border-muted/30 bg-card/80 p-6 shadow-lg shadow-black/5 backdrop-blur-sm">
      <div className="flex flex-col gap-4">
        <div>
          <p className="text-sm font-semibold uppercase tracking-[0.24em] text-muted-foreground">
            AI Image Generator
          </p>
          <h2 className="mt-2 text-2xl font-semibold text-foreground">
            Generate an image from text.
          </h2>
          <p className="mt-2 max-w-2xl text-sm leading-6 text-muted-foreground">
            Enter a prompt, click Generate Image, and see the result instantly.
          </p>
        </div>

        <form className="grid gap-3" onSubmit={handleSubmit}>
          <label className="space-y-2">
            <span className="text-sm text-foreground/80">Image prompt</span>
            <Input
              value={prompt}
              onChange={(event) => setPrompt(event.target.value)}
              placeholder="A surreal painting of a student studying under a neon tree"
              aria-label="Image prompt"
            />
          </label>

          <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
            <Button type="submit" disabled={isLoading} className="w-full sm:w-auto">
              {isLoading ? "Generating..." : "Generate Image"}
            </Button>
            <p className="text-sm text-muted-foreground">
              Uses your Cloudflare AI credentials and the project image generation route.
            </p>
          </div>
        </form>

        {error ? (
          <div className="rounded-2xl border border-destructive/30 bg-destructive/10 p-4 text-sm text-destructive">
            {error}
          </div>
        ) : null}

        {imageUrl ? (
          <div className="rounded-3xl border border-border/70 bg-background p-4 shadow-sm">
            <p className="mb-3 font-medium text-foreground">Generated image</p>
            <img
              src={imageUrl}
              alt={prompt}
              className="h-auto w-full rounded-3xl border border-border/50 object-cover"
            />
          </div>
        ) : null}
      </div>
    </section>
  );
}
