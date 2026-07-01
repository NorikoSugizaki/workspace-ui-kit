"use client";

import { useState, useEffect } from "react";

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

type EditCustomerDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  initialName: string;
  initialFurigana: string;
  onSave: (name: string, furigana: string) => void;
};

export function EditCustomerDialog({
  open,
  onOpenChange,
  initialName,
  initialFurigana,
  onSave,
}: EditCustomerDialogProps) {
  const [name, setName] = useState(initialName);
  const [furigana, setFurigana] = useState(initialFurigana);
  const [isComposing, setIsComposing] = useState(false);
  const [furiganaReadOnly, setFuriganaReadOnly] = useState(true);

  const toHiraganaOnly = (value: string) =>
    value.replace(/[^\u3041-\u3096\u309D-\u309F\u30FC\s]/g, "");

  useEffect(() => {
    if (open) {
      setName(initialName);
      setFurigana(initialFurigana);
      setFuriganaReadOnly(true);
    }
  }, [open, initialName, initialFurigana]);

  const canSubmit = name.trim() && furigana.trim();

  const handleSubmit = () => {
    if (!canSubmit) return;
    onSave(name.trim(), furigana.trim());
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-sm">
        <DialogHeader>
          <DialogTitle>企業を編集</DialogTitle>
          <DialogDescription>企業名とふりがなを変更します</DialogDescription>
        </DialogHeader>
        <FieldGroup>
          <Field>
            <FieldLabel htmlFor="edit-customer-name">顧客名</FieldLabel>
            <Input
              id="edit-customer-name"
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
            <FieldLabel htmlFor="edit-customer-furigana">
              ふりがな（ひらがな）
            </FieldLabel>
            <Input
              id="edit-customer-furigana"
              value={furigana}
              autoComplete="new-password"
              readOnly={furiganaReadOnly}
              onFocus={() => setFuriganaReadOnly(false)}
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
            保存
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
