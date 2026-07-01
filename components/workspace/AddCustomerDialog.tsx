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

type AddCustomerDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onAdd: (name: string, furigana: string) => void;
};

export function AddCustomerDialog({
  open,
  onOpenChange,
  onAdd,
}: AddCustomerDialogProps) {
  const [name, setName] = useState("");
  const [furigana, setFurigana] = useState("");
  const [isComposing, setIsComposing] = useState(false);
  const toHiraganaOnly = (value: string) =>
    value.replace(/[^\u3041-\u3096\u309D-\u309F\u30FC\s]/g, "");

  const canSubmit = name.trim() && furigana.trim();

  const handleSubmit = () => {
    if (!canSubmit) return;
    onAdd(name.trim(), furigana.trim());
    setName("");
    setFurigana("");
    onOpenChange(false);
  };

  const handleOpenChange = (v: boolean) => {
    onOpenChange(v);
    if (!v) {
      setName("");
      setFurigana("");
    }
  };

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="sm:max-w-sm">
        <DialogHeader>
          <DialogTitle>顧客を追加</DialogTitle>
          <DialogDescription>新しい顧客を追加します</DialogDescription>
        </DialogHeader>
        <FieldGroup>
          <Field>
            <FieldLabel htmlFor="customer-name">顧客名</FieldLabel>
            <Input
              id="customer-name"
              autoFocus
              value={name}
              onChange={(e) => setName(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") handleSubmit();
              }}
              placeholder="例: 株式会社〇〇"
            />
          </Field>
          <Field>
            <FieldLabel htmlFor="customer-furigana">ふりがな（ひらがな）</FieldLabel>
            <Input
              id="customer-furigana"
              value={furigana}
              autoComplete="off"
              onChange={(e) => {
                if (!isComposing) setFurigana(toHiraganaOnly(e.target.value));
                else setFurigana(e.target.value);
              }}
              onCompositionStart={() => setIsComposing(true)}
              onCompositionEnd={(e) => {
                setIsComposing(false);
                setFurigana(toHiraganaOnly((e.target as HTMLInputElement).value));
              }}
              onKeyDown={(e) => {
                if (e.key === "Enter") handleSubmit();
              }}
              placeholder="例: まるまる ※会社種別（株式会社等）は除く"
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
