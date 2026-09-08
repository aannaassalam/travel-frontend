import AccountLayout from "@/components/account/AccountLayout";
import { isEmail } from "@/lib/format";
import { usePrefs } from "@/lib/prefs";
import { useDeleteAccount, useUpdateProfile } from "@/lib/session";
import type { CustomerSession } from "@/lib/api";
import { Trash2, TriangleAlert } from "lucide-react";
import { useRouter } from "next/router";
import { useState } from "react";
import { toast } from "sonner";

const inputCls =
  "w-full rounded-xl bg-white px-4 py-3 text-base font-semibold shadow-xs ring-1 ring-ink-100 outline-none ring-inset focus:ring-2 focus:ring-brand-500";

/**
 * §11.2 profile.
 *
 * No "active devices" list: there are no server-side sessions to enumerate, so
 * it was hardcoded rows with a revoke button that only fired a toast. §7.3 wants
 * real listable sessions — inventing them tells the customer their account is
 * being watched over when nothing is. Reinstate it against a real session store.
 *
 * Still here: in-app account deletion (§12.4 Apple 5.1.1(v) — built from the
 * start rather than discovered at store submission).
 */
export default function ProfilePage() {
  const { t } = usePrefs();
  return (
    <AccountLayout title={t("account.profile")}>
      {(user) => <ProfileBody user={user} />}
    </AccountLayout>
  );
}

function ProfileBody({ user }: { user: CustomerSession }) {
  const { t, locale } = usePrefs();
  const router = useRouter();
  const [values, setValues] = useState({
    firstName: user.firstName ?? "",
    lastName: user.lastName ?? "",
    email: user.email ?? ""
  });
  const [emailError, setEmailError] = useState("");
  const [confirmDelete, setConfirmDelete] = useState(false);

  const update = useUpdateProfile();
  const remove = useDeleteAccount();

  async function save(e: React.FormEvent) {
    e.preventDefault();
    if (values.email && !isEmail(values.email)) {
      setEmailError(t("err.email"));
      return;
    }
    try {
      // Persisted server-side. This used to write to a localStorage copy that
      // nothing read back, so an edit looked saved and was gone on reload.
      await update.mutateAsync(values);
      toast.success(locale === "fr" ? "Profil enregistré" : "Profile saved");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : t("err.required"));
    }
  }

  return (
    <div className="space-y-6">
      <form onSubmit={save} className="surface p-6">
        <h2 className="mb-4 text-lg font-bold text-brand-900">{t("account.profile")}</h2>
        <div className="grid gap-3 sm:grid-cols-2">
          <label className="block">
            <span className="mb-1 block text-sm font-semibold text-ink-700">
              {t("checkout.firstName")}
            </span>
            <input
              className={inputCls}
              value={values.firstName}
              onChange={(e) => setValues((v) => ({ ...v, firstName: e.target.value }))}
              autoComplete="given-name"
            />
          </label>
          <label className="block">
            <span className="mb-1 block text-sm font-semibold text-ink-700">
              {t("checkout.lastName")}
            </span>
            <input
              className={inputCls}
              value={values.lastName}
              onChange={(e) => setValues((v) => ({ ...v, lastName: e.target.value }))}
              autoComplete="family-name"
            />
          </label>
          <label className="block sm:col-span-2">
            <span className="mb-1 block text-sm font-semibold text-ink-700">
              {t("auth.phone")}
            </span>
            {/* The phone number is the identity (§7.1) — changing it is a
                support operation with re-verification, not a text field. */}
            <input className={`${inputCls} bg-ink-50`} value={user.phone} readOnly />
            <span className="mt-1 block text-xs text-ink-500">
              {locale === "fr"
                ? "Pour changer de numéro, contactez le support : une nouvelle vérification est nécessaire."
                : "To change your number, contact support: it needs re-verification."}
            </span>
          </label>
          <label className="block sm:col-span-2">
            <span className="mb-1 block text-sm font-semibold text-ink-700">
              {t("rtb.email")}
            </span>
            <input
              className={inputCls}
              type="email"
              value={values.email}
              onChange={(e) => {
                setValues((v) => ({ ...v, email: e.target.value }));
                setEmailError("");
              }}
              autoComplete="email"
            />
            {emailError && <p className="mt-1 text-sm text-bad-600">{emailError}</p>}
          </label>
        </div>
        <button
          type="submit"
          className="btn btn-md btn-primary mt-4"
        >
          {t("common.save")}
        </button>
      </form>

      {/* §12.4 Apple 5.1.1(v): in-app account deletion, on web too. */}
      <section className="rounded-card bg-bad-100 p-6 ring-1 ring-bad-600/20 ring-inset">
        <h2 className="flex items-center gap-2 text-lg font-bold text-brand-900">
          <TriangleAlert className="size-5 text-bad-600" />
          {t("account.deleteAccount")}
        </h2>
        <p className="mt-2 text-sm text-ink-700">
          {locale === "fr"
            ? "Votre compte et vos données personnelles sont supprimés. Les réservations déjà payées restent enregistrées pour des raisons comptables et légales ; elles ne sont pas remboursées."
            : "Your account and personal data are deleted. Bookings already paid remain on record for accounting and legal reasons; they are not refunded."}
        </p>
        {confirmDelete ? (
          <div className="mt-4 flex flex-wrap gap-3">
            <button
              type="button"
              onClick={() => {
                // Server-side: the personal data is actually removed. Clearing
                // local state alone deleted nothing at all.
                remove.mutate(undefined, { onSettled: () => router.push("/") });
              }}
              disabled={remove.isPending}
              className="inline-flex items-center gap-2 rounded-md bg-bad-600 px-4 py-2.5 text-sm font-bold text-white"
            >
              <Trash2 className="size-4" />
              {locale === "fr" ? "Confirmer la suppression" : "Confirm deletion"}
            </button>
            <button
              type="button"
              onClick={() => setConfirmDelete(false)}
              className="btn btn-sm btn-outline"
            >
              {t("common.cancel")}
            </button>
          </div>
        ) : (
          <button
            type="button"
            onClick={() => setConfirmDelete(true)}
            className="mt-4 rounded-md border border-bad-600 bg-white px-4 py-2.5 text-sm font-bold text-bad-600"
          >
            {t("account.deleteAccount")}
          </button>
        )}
      </section>
    </div>
  );
}
