import { InlineSelect } from "@/components/ui/InlineSelect";
import DropZone from "@/components/visa/DropZone";
import { intlLocale } from "@/lib/i18n";
import { usePrefs } from "@/lib/prefs";
import {
  fileSizeLabel,
  uploadVisaDocuments,
  VISA_FILES_PER_REQUEST,
  visaRefusal,
  type VisaDocKind
} from "@/lib/visa";
import { useMutation } from "@tanstack/react-query";
import { CheckCircle2, FileText, X } from "lucide-react";
import { useState } from "react";

const KINDS: VisaDocKind[] = [
  "PASSPORT",
  "HOTEL",
  "INVITATION",
  "PHOTO",
  "OTHER"
];

/**
 * More documents for an application already sent: each file says what it is,
 * up to five at a time. Sending one while the office has asked for more puts
 * the application back in review (the server does that, and e-mails the office).
 */
export default function UploadBox({ reference }: { reference: string }) {
  const { t, locale } = usePrefs();
  const [items, setItems] = useState<{ file: File; kind: VisaDocKind }[]>([]);
  const [sent, setSent] = useState(0);
  const upload = useMutation({
    mutationFn: () => uploadVisaDocuments(reference, items),
    onSuccess: () => {
      setSent(items.length);
      setItems([]);
    }
  });

  return (
    <div className="space-y-3">
      {items.length > 0 && (
        <ul className="space-y-2">
          {items.map((it, i) => (
            <li
              key={i}
              className="flex flex-wrap items-center gap-3 rounded-xl bg-white p-3 ring-1 ring-ink-100 ring-inset"
            >
              <FileText
                className="size-5 shrink-0 text-brand-500"
                aria-hidden="true"
              />
              <span className="min-w-0 flex-1">
                <span
                  className="block truncate text-sm font-semibold text-ink-900"
                  dir="auto"
                >
                  {it.file.name}
                </span>
                <span className="block text-xs text-ink-500">
                  {fileSizeLabel(it.file.size, intlLocale(locale))}
                </span>
              </span>
              <InlineSelect
                ariaLabel={t("visa.upload.kind", { name: it.file.name })}
                value={it.kind}
                onValueChange={(v) =>
                  setItems((list) =>
                    list.map((x, j) =>
                      j === i ? { ...x, kind: v as VisaDocKind } : x
                    )
                  )
                }
                options={KINDS.map((k) => ({
                  value: k,
                  label: t(`visa.kind.${k}`)
                }))}
                triggerClassName="rounded-lg px-3 py-2 ring-1 ring-ink-100"
              />
              <button
                type="button"
                onClick={() =>
                  setItems((list) => list.filter((_, j) => j !== i))
                }
                aria-label={t("visa.file.removeNamed", { name: it.file.name })}
                className="grid size-9 place-items-center rounded-lg text-ink-400 hover:bg-bad-100 hover:text-bad-600"
              >
                <X className="size-4" />
              </button>
            </li>
          ))}
        </ul>
      )}

      {items.length < VISA_FILES_PER_REQUEST && (
        <DropZone
          label={t("visa.upload.add")}
          hint={t("visa.upload.hint")}
          file={null}
          onChange={(file) => {
            if (!file) return;
            setSent(0);
            upload.reset();
            setItems((list) => [...list, { file, kind: "OTHER" }]);
          }}
        />
      )}

      {upload.isError && (
        <p
          role="alert"
          className="rounded-xl bg-bad-100 p-3 text-sm text-bad-600"
        >
          {visaRefusal(upload.error, t)}
        </p>
      )}
      {sent > 0 && (
        <p
          role="status"
          className="flex items-center gap-2 text-sm font-semibold text-ok-600"
        >
          <CheckCircle2 className="size-4" aria-hidden="true" />
          {t("visa.upload.sent", { n: sent })}
        </p>
      )}

      {items.length > 0 && (
        <button
          type="button"
          onClick={() => upload.mutate()}
          disabled={upload.isPending}
          className="btn btn-md btn-dark"
        >
          {upload.isPending
            ? t("common.loading")
            : t("visa.upload.send", { n: items.length })}
        </button>
      )}
    </div>
  );
}
