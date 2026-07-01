"use client";

import { useState } from "react";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { FieldGroup, Field, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";

type AddLinkDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onAdd: (label: string, url: string) => void;
};

export function AddLinkDialog({ open, onOpenChange, onAdd }: AddLinkDialogProps) {
  const [label, setLabel] = useState("");
  const [url, setUrl] = useState("");

  const canSubmit = label.trim() && url.trim();

  const handleSubmit = () => {
    if (!canSubmit) return;
    onAdd(label.trim(), url.trim());
    setLabel("");
    setUrl("");
    onOpenChange(false);
  };

  const handleOpenChange = (v: boolean) => {
    onOpenChange(v);
    if (!v) {
      setLabel("");
      setUrl("");
    }
  };

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="sm:max-w-sm">
        <DialogHeader>
          <DialogTitle>リンクを追加</DialogTitle>
          <DialogDescription>
            顧客に紐づくリンクを追加します
          </DialogDescription>
        </DialogHeader>
        <FieldGroup>
          <Field>
            <FieldLabel htmlFor="link-label">ラベル</FieldLabel>
            <Input
              id="link-label"
              autoFocus
              value={label}
              onChange={(e) => setLabel(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") handleSubmit();
              }}
              placeholder="例: Slack チャンネル"
            />
          </Field>
          <Field>
            <FieldLabel htmlFor="link-url">URL</FieldLabel>
            <Input
              id="link-url"
              value={url}
              onChange={(e) => setUrl(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") handleSubmit();
              }}
              placeholder="https://..."
            />
          </Field>
        </FieldGroup>
        <DialogFooter>
          <DialogClose render={<Button variant="outline">キャンセル</Button>} />
          <Button onClick={handleSubmit} disabled={!canSubmit}>
            追加
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
