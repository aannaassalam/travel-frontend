import { intlLocale } from "@/lib/i18n";
import { usePrefs } from "@/lib/prefs";
import { cn } from "@/lib/utils";
import { checkVisaFile, fileSizeLabel, VISA_FILE_ACCEPT } from "@/lib/visa";
import {
  AlertCircle,
  CheckCircle2,
  FileText,
  UploadCloud,
  X
} from "lucide-react";
import { useEffect, useId, useState } from "react";

/**
 * One file, dropped or browsed. The file is checked by its first bytes (as the
 * server checks it) and its size before it is taken, so a .heic photo or a
 * 30 MB scan is refused here, with what to do instead, and not after sending.
 * A taken image shows itself; a PDF shows its name.
 */
export default function DropZone({
  label,
  hint,
  file,
  onChange,
  error,
  optional,
  id: idProp
}: {
  label: string;
  hint?: string;
  file: File | null | undefined;
  onChange: (file: File | null) => void;
  /** The form's own error (a required file missing). The zone adds its own for a refused file. */
  error?: string;
  optional?: boolean;
  id?: string;
}) {
  const { t, locale } = usePrefs();
  const auto = useId();
  const id = idProp ?? auto;
  const [over, setOver] = useState(false);
  const [refused, setRefused] = useState("");
  const [preview, setPreview] = useState<string | null>(null);
  const size = (n: number) => fileSizeLabel(n, intlLocale(locale));

  useEffect(() => {
    if (!file || !file.type.startsWith("image/")) return setPreview(null);
    const url = URL.createObjectURL(file);
    setPreview(url);
    return () => URL.revokeObjectURL(url);
  }, [file]);

  async function take(picked: File | undefined) {
    if (!picked) return;
    const head = new Uint8Array(await picked.slice(0, 16).arrayBuffer());
    const why = checkVisaFile(picked.size, head);
    if (why) {
      setRefused(
        t(`visa.err.${why}`, { name: picked.name, size: size(picked.size) })
      );
      return;
    }
    setRefused("");
    onChange(picked);
  }

  const shownError = refused || error;

  return (
    <div>
      <p className="mb-2 flex flex-wrap items-baseline gap-x-2 text-sm font-semibold text-ink-900">
        {label}
        {optional && (
          <span className="text-xs font-normal text-ink-500">
            ({t("common.optional")})
          </span>
        )}
      </p>

      {/* The input is visually hidden: its keyboard focus rings the zone around it. */}
      <div className="rounded-xl has-[input:focus-visible]:outline-2 has-[input:focus-visible]:outline-offset-2 has-[input:focus-visible]:outline-brand-500">
        {file ? (
          <div className="flex items-center gap-4 rounded-xl bg-ok-100/60 p-3 ring-1 ring-ok-600/25 ring-inset">
            <div className="grid size-16 shrink-0 place-items-center overflow-hidden rounded-lg bg-white ring-1 ring-ink-100">
              {preview ? (
                // An object URL of the visitor's own file: next/image has nothing to optimise.
                // eslint-disable-next-line @next/next/no-img-element
                <img src={preview} alt="" className="size-full object-cover" />
              ) : (
                <FileText
                  className="size-7 text-brand-500"
                  aria-hidden="true"
                />
              )}
            </div>
            <div className="min-w-0 flex-1">
              <p className="truncate font-semibold text-ink-900" dir="auto">
                {file.name}
              </p>
              <p className="flex items-center gap-1.5 text-sm text-ok-600">
                <CheckCircle2 className="size-4 shrink-0" aria-hidden="true" />
                {t("visa.file.ready", { size: size(file.size) })}
              </p>
            </div>
            <div className="flex shrink-0 flex-col items-end gap-1 sm:flex-row sm:items-center sm:gap-2">
              <label
                htmlFor={id}
                className="cursor-pointer text-sm font-semibold text-brand-600 hover:underline"
              >
                {t("visa.file.replace")}
              </label>
              <button
                type="button"
                onClick={() => onChange(null)}
                className="inline-flex items-center gap-1 text-sm font-semibold text-ink-500 hover:text-bad-600"
              >
                <X className="size-4" aria-hidden="true" />
                {t("visa.file.remove")}
              </button>
            </div>
          </div>
        ) : (
          <label
            htmlFor={id}
            onDragOver={(e) => {
              e.preventDefault();
              setOver(true);
            }}
            onDragLeave={() => setOver(false)}
            onDrop={(e) => {
              e.preventDefault();
              setOver(false);
              void take(e.dataTransfer.files[0]);
            }}
            className={cn(
              "flex cursor-pointer flex-col items-center gap-2 rounded-xl border-2 border-dashed px-4 py-6 text-center transition-colors",
              over
                ? "border-brand-500 bg-brand-50"
                : shownError
                  ? "border-bad-600 bg-bad-100/50"
                  : "border-ink-200 bg-paper hover:border-brand-400 hover:bg-brand-50/60"
            )}
          >
            <UploadCloud
              className={cn(
                "size-7",
                over ? "text-brand-600" : "text-brand-400"
              )}
              aria-hidden="true"
            />
            <span className="text-[15px] font-semibold text-ink-900">
              {t("visa.file.drop")}{" "}
              <span className="text-brand-600 underline">
                {t("visa.file.browse")}
              </span>
            </span>
            <span className="text-xs text-ink-500">{t("visa.file.types")}</span>
          </label>
        )}

        <input
          id={id}
          type="file"
          accept={VISA_FILE_ACCEPT}
          className="sr-only"
          aria-invalid={Boolean(shownError)}
          aria-describedby={`${id}-help`}
          onChange={(e) => {
            void take(e.target.files?.[0]);
            // The same file picked again after a removal must still fire a change.
            e.target.value = "";
          }}
        />
      </div>

      <div id={`${id}-help`}>
        {shownError ? (
          <p
            role="alert"
            className="mt-2 flex items-start gap-1.5 text-sm font-medium text-bad-600"
          >
            <AlertCircle
              className="mt-0.5 size-4 shrink-0"
              aria-hidden="true"
            />
            {shownError}
          </p>
        ) : hint ? (
          <p className="mt-2 text-sm text-ink-500">{hint}</p>
        ) : null}
      </div>
    </div>
  );
}
